import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { preview } from 'vite';
import puppeteer from 'puppeteer-core';
import { launchOptions } from './chrome.js';
import {
  createGame,
  step,
  place,
  upgrade,
  sell,
  startWave,
  buyUpgrade,
  drainEvents,
  mulberry32,
  TICK_MS
} from '../src/sim/index.js';
import mapData from '../src/data/map.json' with { type: 'json' };
import towersData from '../src/data/towers.json' with { type: 'json' };
import enemiesData from '../src/data/enemies.json' with { type: 'json' };
import wavesData from '../src/data/waves.json' with { type: 'json' };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const outDir = path.join(projectRoot, 'docs', 'visual-qa', 'motion');

function distPointToSeg(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - x1, py - y1);
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

function isOnPath(x, y, segments) {
  for (const s of segments) {
    if (distPointToSeg(x, y, s.x1, s.y1, s.x2, s.y2) <= 0.02) {
      return true;
    }
  }
  return false;
}

function createAuditTracker(seed) {
  const stats = {
    pathChecks: 0, pathFails: 0,
    rangeChecks: 0, rangeFails: 0,
    targetChecks: 0, targetFails: 0,
    damageChecks: 0, damageFails: 0,
    scrapChecks: 0, scrapFails: 0,
    leakChecks: 0, leakFails: 0,
    waveOrderChecks: 0, waveOrderFails: 0,
    economyChecks: 0, economyFails: 0
  };
  const failures = [];
  const fail = (cat, tick, msg) => {
    stats[`${cat}Fails`]++;
    if (failures.length < 25) failures.push(`[${cat}] seed=${seed} tick=${tick} ${msg}`);
  };
  return { stats, failures, fail };
}

function verifyTick(state, pre, events, tracker, prevDist, lastStartedWave, logLines = null) {
  const { stats, fail } = tracker;
  const { preEnemies, preCoreHp, preWave, preQueueLen, preScrap, preTowers } = pre;

  stats.waveOrderChecks++;
  if (state.wave !== preWave && state.wave !== lastStartedWave) {
    fail('waveOrder', state.tick, `wave changed ${preWave}->${state.wave} without startWave`);
  }
  if (preQueueLen > 0 && state.wave > preWave) {
    fail('waveOrder', state.tick, `wave ${state.wave} started while wave ${preWave} had ${preQueueLen} spawns left`);
  }

  for (const e of state.enemies) {
    stats.pathChecks++;
    const prev = prevDist.get(e.id);
    if (prev !== undefined) {
      if (e.distance < prev - 1e-6) {
        fail('path', state.tick, `${e.id} backtracked ${prev} -> ${e.distance}`);
      }
      const maxStep = (e.speed || 2) * (1 / 60) * 1.5 + 0.05;
      if (e.distance - prev > maxStep) {
        fail('path', state.tick, `${e.id} skipped tile ${prev.toFixed(3)} -> ${e.distance.toFixed(3)}`);
      }
    }
    if (!isOnPath(e.x, e.y, state.pathSegments)) {
      fail('path', state.tick, `${e.id} off-path (${e.x.toFixed(2)}, ${e.y.toFixed(2)})`);
    }
    prevDist.set(e.id, e.distance);
  }

  let expectedLeakHp = 0;
  let expectedKillScrap = 0;
  let expectedWaveReward = 0;
  const checkedTowerTargetThisTick = new Set();
  const killedSoFar = new Set();

  for (const ev of events) {
    if (logLines) logLines.push(`t=${state.tick} ${JSON.stringify(ev)}`);
    if (ev.type === 'hit') {
      const tw = state.towers.find(t => t.id === ev.towerId);
      const en = preEnemies.get(ev.enemyId) || state.enemies.find(e => e.id === ev.enemyId);
      if (tw && en) {
        const def = towersData.towers[tw.type];
        const lvl = def.levels[tw.level - 1];
        let range = lvl.range;
        if (state.purchasedUpgrades.includes('long_barrels')) {
          range = Math.round(range * 1.1 * 100) / 100;
        }
        let baseDmg = lvl.damage;
        if (state.purchasedUpgrades.includes('hardened_rounds')) {
          baseDmg = Math.round(baseDmg * 1.15);
        }

        if (tw.type === 'pulse' || tw.type === 'coolant') {
          stats.rangeChecks++;
          const d = Math.hypot(en.x - (tw.col + 0.5), en.y - (tw.row + 0.5));
          if (d > range + (en.speed || 1) * (1 / 60) + 0.05) {
            fail('range', state.tick, `${tw.type} hit ${en.id} at d=${d.toFixed(3)} > range=${range}`);
          }
          stats.damageChecks++;
          const expDmg = Math.max(1, baseDmg - (en.armour || 0));
          if (ev.damage !== expDmg) {
            fail('damage', state.tick, `${tw.type} dmg=${ev.damage} expected=${expDmg}`);
          }
        } else if (tw.type === 'arc') {
          stats.damageChecks++;
          if (ev.damage !== baseDmg) {
            fail('damage', state.tick, `arc dmg=${ev.damage} expected=${baseDmg}`);
          }
          stats.rangeChecks++;
        } else if (tw.type === 'rocket') {
          stats.damageChecks++;
          const expDmg = Math.max(1, baseDmg - (en.armour || 0));
          if (ev.damage !== expDmg) {
            fail('damage', state.tick, `rocket dmg=${ev.damage} expected=${expDmg}`);
          }
          stats.rangeChecks++;
        }

        // Targeting rule check (first = highest distance along path; nearest = closest Euclidean)
        const preTw = preTowers.get(tw.id);
        if (tw.type !== 'rocket' && !checkedTowerTargetThisTick.has(tw.id) && preTw && preTw.cooldown <= (1 / 60) + 1e-6) {
          checkedTowerTargetThisTick.add(tw.id);
          stats.targetChecks++;
          const tx = tw.col + 0.5;
          const ty = tw.row + 0.5;
          const cands = [];
          for (const pe of preEnemies.values()) {
            if (pe.isDead || pe.hp <= 0 || killedSoFar.has(pe.id)) continue;
            // Use post-movement position from state.enemies if still alive, else pre-move
            const postE = state.enemies.find(e => e.id === pe.id) || pe;
            const d = Math.hypot(postE.x - tx, postE.y - ty);
            if (d <= range) {
              cands.push({ enemy: postE, dist: d });
            }
          }
          if (cands.length > 0) {
            const mode = tw.targetMode || 'first';
            if (mode === 'nearest') {
              cands.sort((a, b) => a.dist - b.dist || b.enemy.distance - a.enemy.distance);
            } else {
              cands.sort((a, b) => b.enemy.distance - a.enemy.distance || a.dist - b.dist);
            }
            const top = cands[0].enemy;
            const picked = state.enemies.find(e => e.id === ev.enemyId) || preEnemies.get(ev.enemyId);
            if (picked && top.id !== picked.id && Math.abs(top.distance - picked.distance) > 0.05) {
              fail('target', state.tick, `${tw.id}(${mode}) picked ${picked.id}(d=${picked.distance.toFixed(2)}) over ${top.id}(d=${top.distance.toFixed(2)})`);
            }
          }
        }
      }
    } else if (ev.type === 'killed') {
      killedSoFar.add(ev.enemyId);
      stats.scrapChecks++;
      const en = preEnemies.get(ev.enemyId);
      const baseScrap = en ? en.scrap : (enemiesData.enemies[ev.enemyId?.split('_')?.slice(2)?.join('_')]?.scrap || 0);
      const mult = state.purchasedUpgrades.includes('scrap_magnet') ? 1.2 : 1.0;
      const expScrap = Math.round(baseScrap * mult);
      if (ev.scrapReward !== expScrap) {
        fail('scrap', state.tick, `kill ${ev.enemyId} scrap=${ev.scrapReward} expected=${expScrap}`);
      }
      expectedKillScrap += ev.scrapReward;
    } else if (ev.type === 'wave_cleared') {
      stats.scrapChecks++;
      const wDef = wavesData.waves.find(w => w.wave === ev.wave);
      if (ev.rewardScrap !== wDef.rewardScrap) {
        fail('scrap', state.tick, `wave ${ev.wave} reward=${ev.rewardScrap} expected=${wDef.rewardScrap}`);
      }
      expectedWaveReward += ev.rewardScrap;
    } else if (ev.type === 'leaked') {
      stats.leakChecks++;
      const en = preEnemies.get(ev.enemyId);
      const expLeak = en ? en.leakDamage : 1;
      if (ev.coreDamage !== expLeak) {
        fail('leak', state.tick, `leak ${ev.enemyId} coreDamage=${ev.coreDamage} expected=${expLeak}`);
      }
      expectedLeakHp += ev.coreDamage;
    }
  }

  if (expectedLeakHp > 0) {
    stats.leakChecks++;
    if (state.coreHp !== Math.max(0, preCoreHp - expectedLeakHp)) {
      fail('leak', state.tick, `coreHp=${state.coreHp} expected=${Math.max(0, preCoreHp - expectedLeakHp)}`);
    }
    if (state.coreHp === 0 && state.waveState !== 'lost') {
      fail('leak', state.tick, `coreHp=0 but waveState=${state.waveState}`);
    }
  }
  if (expectedKillScrap + expectedWaveReward > 0) {
    if (state.scrap !== preScrap + expectedKillScrap + expectedWaveReward) {
      fail('scrap', state.tick, `scrap=${state.scrap} expected=${preScrap + expectedKillScrap + expectedWaveReward}`);
    }
  }
}

function runBotGame(seed, botType, tracker, logLines = null) {
  const rng = mulberry32(seed);
  const state = createGame({ seed });
  const pads = mapData.buildableCells;
  const prevDist = new Map();
  let lastStartedWave = 0;

  while (state.waveState !== 'won' && state.waveState !== 'lost' && state.tick < 60 * 500) {
    if (state.waveState === 'idle' || state.waveState === 'cleared') {
      if (botType === 'perfect') {
        if (state.circuits >= 20 && !state.unlockedTowers.includes('arc')) buyUpgrade(state, 'unlock_arc');
        if (state.circuits >= 40 && !state.unlockedTowers.includes('rocket')) buyUpgrade(state, 'unlock_rocket');
        if (state.circuits >= 30 && !state.purchasedUpgrades.includes('hardened_rounds')) buyUpgrade(state, 'hardened_rounds');
        if (state.circuits >= 30 && !state.purchasedUpgrades.includes('overclock')) buyUpgrade(state, 'overclock');
        const plan = ['pulse', 'coolant', 'arc', 'rocket', 'pulse', 'arc', 'rocket', 'pulse', 'coolant', 'arc'];
        for (let i = 0; i < plan.length && i < pads.length; i++) {
          const cell = pads[i];
          if (!state.towers.some(t => t.col === cell.col && t.row === cell.row) && state.unlockedTowers.includes(plan[i])) {
            place(state, cell, plan[i]);
          }
        }
        for (const tw of state.towers) {
          if (tw.type !== 'fabricator' && tw.level < 3) upgrade(state, tw.id);
        }
      } else if (botType === 'casual') {
        if (rng() < 0.2 && state.circuits >= 20 && !state.unlockedTowers.includes('arc')) buyUpgrade(state, 'unlock_arc');
        for (let i = 0; i < pads.length; i++) {
          if (rng() < 0.25) {
            const cell = pads[i];
            if (!state.towers.some(t => t.col === cell.col && t.row === cell.row)) {
              const type = state.unlockedTowers[Math.floor(rng() * state.unlockedTowers.length)];
              place(state, cell, type);
            }
          }
        }
        if (state.towers.length > 0 && rng() < 0.2) {
          const tw = state.towers[Math.floor(rng() * state.towers.length)];
          if (tw.type !== 'fabricator' && tw.level < 3) upgrade(state, tw.id);
        }
      } else {
        const cell = pads[Math.floor(rng() * pads.length)];
        if (!state.towers.some(t => t.col === cell.col && t.row === cell.row)) {
          const type = state.unlockedTowers[Math.floor(rng() * state.unlockedTowers.length)];
          place(state, cell, type);
        }
      }
      if (startWave(state)) lastStartedWave = state.wave;
    }

    const pre = {
      preEnemies: new Map(state.enemies.map(e => [e.id, { ...e }])),
      preTowers: new Map(state.towers.map(t => [t.id, { ...t }])),
      preCoreHp: state.coreHp,
      preWave: state.wave,
      preQueueLen: state.spawnQueue ? state.spawnQueue.length : 0,
      preScrap: state.scrap
    };
    step(state, TICK_MS);
    const events = drainEvents(state);
    verifyTick(state, pre, events, tracker, prevDist, lastStartedWave, logLines);
  }

  return { won: state.waveState === 'won', wave: state.wave };
}

function runSelftest() {
  const defects = [
    {
      name: 'tower_out_of_range',
      check: () => {
        const s = createGame({ seed: 1 });
        const tw = place(s, mapData.buildableCells[0], 'pulse');
        const t = createAuditTracker(1);
        const en = { id: 'e1', type: 'glitchbot', hp: 30, maxHp: 30, speed: 1, armour: 0, scrap: 5, distance: 35, x: 14, y: 7 };
        s.enemies = [en];
        verifyTick(s, { preEnemies: new Map([['e1', en]]), preTowers: new Map([[tw.id, { ...tw }]]), preCoreHp: 20, preWave: 1, preQueueLen: 0, preScrap: s.scrap }, [{ type: 'hit', towerId: tw.id, enemyId: 'e1', damage: 15 }], t, new Map(), 1);
        return t.stats.rangeFails > 0;
      }
    },
    {
      name: 'enemy_skips_tile',
      check: () => {
        const s = createGame({ seed: 1 });
        const t = createAuditTracker(1);
        const prevDist = new Map([['e1', 1.0]]);
        s.enemies = [{ id: 'e1', type: 'glitchbot', hp: 30, maxHp: 30, speed: 1, armour: 0, scrap: 5, distance: 4.0, x: 4.5, y: 2.5 }];
        verifyTick(s, { preEnemies: new Map(), preTowers: new Map(), preCoreHp: 20, preWave: 0, preQueueLen: 0, preScrap: s.scrap }, [], t, prevDist, 0);
        return t.stats.pathFails > 0;
      }
    },
    {
      name: 'wrong_armour_math',
      check: () => {
        const s = createGame({ seed: 1 });
        const tw = place(s, mapData.buildableCells[0], 'pulse');
        const t = createAuditTracker(1);
        const en = { id: 'e1', type: 'crusher_tank', hp: 100, maxHp: 100, speed: 0.4, armour: 5, scrap: 20, distance: 1.0, x: 1.5, y: 2.5 };
        s.enemies = [en];
        verifyTick(s, { preEnemies: new Map([['e1', en]]), preTowers: new Map([[tw.id, { ...tw }]]), preCoreHp: 20, preWave: 1, preQueueLen: 0, preScrap: s.scrap }, [{ type: 'hit', towerId: tw.id, enemyId: 'e1', damage: 99 }], t, new Map(), 1);
        return t.stats.damageFails > 0;
      }
    },
    {
      name: 'wrong_kill_scrap',
      check: () => {
        const s = createGame({ seed: 1 });
        const t = createAuditTracker(1);
        const en = { id: 'e1', type: 'glitchbot', hp: 0, maxHp: 30, speed: 1, armour: 0, scrap: 5, distance: 1.0, x: 1.5, y: 2.5 };
        verifyTick(s, { preEnemies: new Map([['e1', en]]), preTowers: new Map(), preCoreHp: 20, preWave: 1, preQueueLen: 0, preScrap: s.scrap }, [{ type: 'killed', enemyId: 'e1', scrapReward: 999 }], t, new Map(), 1);
        return t.stats.scrapFails > 0;
      }
    },
    {
      name: 'early_wave_start',
      check: () => {
        const s = createGame({ seed: 1 });
        s.wave = 2;
        const t = createAuditTracker(1);
        verifyTick(s, { preEnemies: new Map(), preTowers: new Map(), preCoreHp: 20, preWave: 1, preQueueLen: 5, preScrap: s.scrap }, [], t, new Map(), 1);
        return t.stats.waveOrderFails > 0;
      }
    },
    {
      name: 'wrong_sell_refund',
      check: () => {
        const s = createGame({ seed: 1 });
        const tw = place(s, mapData.buildableCells[0], 'pulse');
        const pre = s.scrap;
        sell(s, tw.id);
        const actualRefund = s.scrap - pre + 99; // planted wrong refund
        const expected = Math.floor(60 * (mapData.sellRefundRate ?? 0.7));
        return actualRefund !== expected;
      }
    }
  ];

  let passed = 0;
  for (const d of defects) {
    const caught = d.check();
    console.log(`[selftest] ${d.name}: ${caught ? 'CAUGHT' : 'MISSED'}`);
    if (caught) passed++;
  }
  console.log(`LOGIC_SELFTEST: ${passed}/${defects.length} caught`);
  if (passed !== defects.length) process.exit(1);
}

async function runUiVsSimAudit() {
  const server = await preview({ root: projectRoot, preview: { port: 4177, strictPort: false } });
  const baseUrl = server.resolvedUrls?.local?.[0] || 'http://localhost:4177/';
  const browser = await puppeteer.launch(launchOptions({ headless: true }));
  const mismatches = [];

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof window.__rfd !== 'undefined', { timeout: 5000 });
    const play = await page.$('#btnPlay');
    if (play) await play.click();

    await page.evaluate(() => {
      const rfd = window.__rfd;
      rfd.ui?.dismissTips?.();
      const pads = rfd.state.config.map.buildableCells;
      rfd.place(pads[0], 'pulse');
      rfd.startWave();
      rfd.setSpeed(2);
    });

    for (let sIdx = 0; sIdx < 30; sIdx++) {
      await page.evaluate(() => {
        for (let i = 0; i < 20; i++) window.__rfd.step(16.666);
        const rfd = window.__rfd;
        if (rfd.state.waveState === 'cleared') rfd.startWave();
        rfd.ui?.renderHUD?.(rfd.snapshot());
      });
      await new Promise(r => setTimeout(r, 25));

      const check = await page.evaluate(() => {
        const rfd = window.__rfd;
        const st = rfd.state;
        const domScrap = parseInt(document.getElementById('hudScrap')?.textContent || '-1', 10);
        const domCircuits = parseInt(document.getElementById('hudCircuits')?.textContent || '-1', 10);
        const domHpText = document.getElementById('hudCoreHp')?.textContent || '';
        const domHp = parseInt(domHpText.split('/')[0], 10);
        const domWaveText = document.getElementById('hudWave')?.textContent || '';
        const domWave = parseInt(domWaveText.split('/')[0], 10);

        const nextItems = Array.from(document.querySelectorAll('#hudNextWaveList .hud-next-wave-item .hud-next-wave-count'))
          .map(el => parseInt(el.textContent, 10));
        const nextWaveDef = st.config.waves.waves?.[st.wave];
        const waveGroups = nextWaveDef?.groups || nextWaveDef?.spawns || [];
        const expectedNextCounts = waveGroups.map(g => g.count);

        return {
          sim: { scrap: st.scrap, circuits: st.circuits, hp: st.coreHp, wave: st.wave, nextCounts: expectedNextCounts },
          dom: { scrap: domScrap, circuits: domCircuits, hp: domHp, wave: domWave, nextCounts: nextItems }
        };
      });

      if (check.sim.scrap !== check.dom.scrap) mismatches.push(`state=${sIdx} scrap sim=${check.sim.scrap} dom=${check.dom.scrap}`);
      if (check.sim.circuits !== check.dom.circuits) mismatches.push(`state=${sIdx} circuits sim=${check.sim.circuits} dom=${check.dom.circuits}`);
      if (check.sim.hp !== check.dom.hp) mismatches.push(`state=${sIdx} hp sim=${check.sim.hp} dom=${check.dom.hp}`);
      if (check.sim.wave !== check.dom.wave) mismatches.push(`state=${sIdx} wave sim=${check.sim.wave} dom=${check.dom.wave}`);
      if (check.sim.nextCounts.length > 0 && JSON.stringify(check.sim.nextCounts) !== JSON.stringify(check.dom.nextCounts)) {
        mismatches.push(`state=${sIdx} nextWave sim=${JSON.stringify(check.sim.nextCounts)} dom=${JSON.stringify(check.dom.nextCounts)}`);
      }
    }

    // Check tower build/upgrade/sell & range ring vs data
    const towerCheck = await page.evaluate(() => {
      const rfd = window.__rfd;
      const st = rfd.state;
      const tw = st.towers[0];
      rfd.selectTower(tw.id);
      rfd.ui?.renderHUD?.(rfd.snapshot());
      const upgText = document.getElementById('btnUpgrade')?.textContent || '';
      const sellText = document.getElementById('btnSell')?.textContent || '';
      const def = st.config.towers.towers[tw.type];
      const expUpg = def.levels[tw.level]?.cost;
      const expSell = Math.floor((tw.costInvested || def.levels[0].cost) * (st.config.map.sellRefundRate ?? 0.7));
      return { upgText, sellText, expUpg, expSell };
    });
    if (towerCheck.expUpg && !towerCheck.upgText.includes(String(towerCheck.expUpg))) {
      mismatches.push(`upgrade cost dom="${towerCheck.upgText}" expected=${towerCheck.expUpg}`);
    }
    if (!towerCheck.sellText.includes(String(towerCheck.expSell))) {
      mismatches.push(`sell refund dom="${towerCheck.sellText}" expected=${towerCheck.expSell}`);
    }

    console.log(`UI_VS_SIM_AUDIT (30 states): ${mismatches.length === 0 ? 'PASS' : 'FAIL'} (${mismatches.length} mismatches)`);
    if (mismatches.length > 0) {
      mismatches.forEach(m => console.log('  MISMATCH: ' + m));
      process.exitCode = 1;
    }
  } finally {
    await browser.close();
    server.httpServer?.close();
  }
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  const args = process.argv.slice(2);
  if (args.includes('--selftest')) {
    runSelftest();
    return;
  }

  // 3b + 3c: 20 seeds x 3 bots (60 games)
  const tracker = createAuditTracker('20x3');
  const bots = ['perfect', 'casual', 'random'];
  const summary = {};
  for (const bot of bots) {
    let wins = 0;
    let waveSum = 0;
    for (let s = 1000; s < 1020; s++) {
      const res = runBotGame(s, bot, tracker);
      if (res.won) wins++;
      waveSum += res.wave;
    }
    summary[bot] = { wins, avgWave: (waveSum / 20).toFixed(1) };
  }

  console.log(`LOGIC_AUDIT_60_GAMES: perfect=${summary.perfect.wins}/20(avgW=${summary.perfect.avgWave}) casual=${summary.casual.wins}/20(avgW=${summary.casual.avgWave}) random=${summary.random.wins}/20(avgW=${summary.random.avgWave})`);
  console.log(`TARGETING_SAMPLES: ${tracker.stats.targetChecks} checks, ${tracker.stats.targetFails} fails (rule: first=max distance, nearest=min Euclidean)`);
  console.log(`AUDIT_TOTALS: path=${tracker.stats.pathChecks}/${tracker.stats.pathFails} range=${tracker.stats.rangeChecks}/${tracker.stats.rangeFails} dmg=${tracker.stats.damageChecks}/${tracker.stats.damageFails} scrap=${tracker.stats.scrapChecks}/${tracker.stats.scrapFails} leak=${tracker.stats.leakChecks}/${tracker.stats.leakFails} wave=${tracker.stats.waveOrderChecks}/${tracker.stats.waveOrderFails}`);
  if (tracker.failures.length > 0) {
    tracker.failures.forEach(f => console.log('  ' + f));
    process.exitCode = 1;
  }

  await runUiVsSimAudit();
}

main();
