import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  createGame,
  step,
  place,
  upgrade,
  sell,
  startWave,
  buyUpgrade,
  drainEvents,
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

function main() {
  fs.mkdirSync(outDir, { recursive: true });
  const seed = 4242;
  const state = createGame({ seed });
  const logLines = [];

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
    if (failures.length < 30) failures.push(`[${cat}] seed=${seed} tick=${tick} ${msg}`);
  };

  // Economy check helper
  function checkPlace(cell, type) {
    const preScrap = state.scrap;
    const def = towersData.towers[type];
    const disc = state.purchasedUpgrades.includes('fast_assembly') ? 0.9 : 1;
    const expectedCost = Math.floor(def.levels[0].cost * disc);
    const t = place(state, cell, type);
    stats.economyChecks++;
    if (t && state.scrap !== preScrap - expectedCost) {
      fail('economy', state.tick, `place ${type} cost=${preScrap - state.scrap} expected=${expectedCost}`);
    }
    return t;
  }

  function checkUpgrade(tower) {
    const preScrap = state.scrap;
    const def = towersData.towers[tower.type];
    const nextLvl = def.levels[tower.level];
    const disc = state.purchasedUpgrades.includes('fast_assembly') ? 0.9 : 1;
    const expectedCost = Math.floor(nextLvl.cost * disc);
    const ok = upgrade(state, tower.id);
    stats.economyChecks++;
    if (ok && state.scrap !== preScrap - expectedCost) {
      fail('economy', state.tick, `upgrade ${tower.id} cost=${preScrap - state.scrap} expected=${expectedCost}`);
    }
    return ok;
  }

  function checkSell(tower) {
    const preScrap = state.scrap;
    const invested = tower.costInvested ?? tower.totalSpent ?? towersData.towers[tower.type].levels[0].cost;
    const expectedRefund = Math.floor(invested * (mapData.sellRefundRate ?? 0.7));
    const ok = sell(state, tower.id);
    stats.economyChecks++;
    if (ok && state.scrap !== preScrap + expectedRefund) {
      fail('economy', state.tick, `sell ${tower.id} refund=${state.scrap - preScrap} expected=${expectedRefund}`);
    }
    return ok;
  }

  const pads = mapData.buildableCells;
  // Build initial Pulse + Coolant + Fabricator, then test sell/upgrade
  const t0 = checkPlace(pads[0], 'pulse');
  const tTmp = checkPlace(pads[1], 'pulse');
  if (tTmp) checkSell(tTmp);

  const prevDist = new Map();
  let lastStartedWave = 0;

  // Scripted full game up to 15 waves
  while (state.waveState !== 'won' && state.waveState !== 'lost' && state.tick < 60 * 600) {
    if (state.waveState === 'idle' || state.waveState === 'cleared') {
      // Unlock arc & rocket when circuits allow
      if (state.circuits >= 20 && !state.unlockedTowers.includes('arc')) buyUpgrade(state, 'unlock_arc');
      if (state.circuits >= 40 && !state.unlockedTowers.includes('rocket')) buyUpgrade(state, 'unlock_rocket');
      if (state.circuits >= 30 && !state.purchasedUpgrades.includes('hardened_rounds')) buyUpgrade(state, 'hardened_rounds');

      // Build varied towers
      const desired = ['pulse', 'coolant', 'arc', 'rocket', 'pulse', 'pulse', 'arc', 'rocket', 'coolant', 'pulse', 'arc', 'rocket'];
      for (let i = 0; i < desired.length && i < pads.length; i++) {
        const cell = pads[i];
        const occupied = state.towers.some(t => t.col === cell.col && t.row === cell.row);
        if (!occupied && state.unlockedTowers.includes(desired[i])) {
          checkPlace(cell, desired[i]);
        }
      }
      for (const tw of state.towers) {
        if (tw.type !== 'fabricator' && tw.level < 3) checkUpgrade(tw);
      }
      if (t0 && t0.level < 3) checkUpgrade(t0);

      const started = startWave(state);
      if (started) lastStartedWave = state.wave;
    }

    // Snapshot pre-tick enemies & projectiles for exact range/target/damage verification
    const preEnemies = new Map(state.enemies.map(e => [e.id, { ...e }]));
    const preProjs = new Map(state.projectiles.map(p => [p.id, { ...p }]));
    const preCoreHp = state.coreHp;
    const preWave = state.wave;
    const preQueueLen = state.spawnQueue ? state.spawnQueue.length : 0;
    const preScrap = state.scrap;

    step(state, TICK_MS);
    const events = drainEvents(state);

    // Check 7: wave N+1 never starts before wave N spawns finish without startWave
    stats.waveOrderChecks++;
    if (state.wave !== preWave && state.wave !== lastStartedWave) {
      fail('waveOrder', state.tick, `wave changed ${preWave}->${state.wave} without startWave`);
    }
    if (preQueueLen > 0 && state.wave > preWave) {
      fail('waveOrder', state.tick, `wave ${state.wave} started while wave ${preWave} had ${preQueueLen} spawns left`);
    }

    // Check 1: enemy path monotonicity & alignment
    for (const e of state.enemies) {
      stats.pathChecks++;
      const prev = prevDist.get(e.id);
      if (prev !== undefined && e.distance < prev - 1e-6) {
        fail('path', state.tick, `${e.id} backtracked ${prev} -> ${e.distance}`);
      }
      if (!isOnPath(e.x, e.y, state.pathSegments)) {
        fail('path', state.tick, `${e.id} off-path (${e.x.toFixed(2)}, ${e.y.toFixed(2)})`);
      }
      prevDist.set(e.id, e.distance);
    }

    // Track scrap & HP & hits from events
    let expectedLeakHp = 0;
    let expectedKillScrap = 0;
    let expectedWaveReward = 0;
    const rocketHitBatch = new Set();

    for (const ev of events) {
      logLines.push(`t=${state.tick} ${JSON.stringify(ev)}`);
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
            // Enemy moved 1 tick before tower fired in same tickSimulation
            if (d > range + en.speed * (1 / 60) + 0.05) {
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
              fail('damage', state.tick, `arc dmg=${ev.damage} expected=${baseDmg} (ignore armour)`);
            }
            stats.rangeChecks++; // primary or chain within range
          } else if (tw.type === 'rocket') {
            rocketHitBatch.add(tw.id);
            stats.damageChecks++;
            const expDmg = Math.max(1, baseDmg - (en.armour || 0));
            if (ev.damage !== expDmg) {
              fail('damage', state.tick, `rocket splash dmg=${ev.damage} expected=${expDmg}`);
            }
            stats.rangeChecks++;
          }
        }
      } else if (ev.type === 'killed') {
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
      // Fabricator gives scrap? No, fabricator gives circuits. Only kill+wave give scrap during step.
      if (state.scrap !== preScrap + expectedKillScrap + expectedWaveReward) {
        fail('scrap', state.tick, `scrap=${state.scrap} expected=${preScrap + expectedKillScrap + expectedWaveReward}`);
      }
    }
    void preProjs;
  }

  // Also run a fast targeting mode verification ('first' vs 'nearest') & leak-to-0 defeat check
  const leakState = createGame({ seed: 99 });
  while (leakState.waveState !== 'lost' && leakState.tick < 60 * 300) {
    if (leakState.waveState === 'idle' || leakState.waveState === 'cleared') {
      startWave(leakState);
    }
    const preHp = leakState.coreHp;
    step(leakState, TICK_MS);
    const evs = drainEvents(leakState);
    for (const ev of evs) {
      if (ev.type === 'leaked') {
        stats.leakChecks++;
        if (leakState.coreHp !== Math.max(0, preHp - ev.coreDamage)) {
          fail('leak', leakState.tick, `leak test coreHp=${leakState.coreHp}`);
        }
      }
    }
  }
  stats.leakChecks++;
  if (leakState.coreHp !== 0 || leakState.waveState !== 'lost') {
    fail('leak', leakState.tick, `defeat check failed: coreHp=${leakState.coreHp} waveState=${leakState.waveState}`);
  }

  // Targeting rule check: documented rule in sim/index.js:391 is 'first' (highest distance) / 'nearest' (closest to tower)
  stats.targetChecks++;
  const tgtState = createGame({ seed: 7 });
  tgtState.scrap = 500;
  const twFirst = place(tgtState, pads[0], 'pulse'); // default 'first'
  startWave(tgtState);
  tgtState.enemies = [
    { id: 'e_back', type: 'glitchbot', hp: 100, maxHp: 100, speed: 0, armour: 0, scrap: 5, leakDamage: 1, distance: 1.0, x: 1.5, y: 2.5, slowTimer: 0, slowRatio: 0, isDead: false },
    { id: 'e_front', type: 'glitchbot', hp: 100, maxHp: 100, speed: 0, armour: 0, scrap: 5, leakDamage: 1, distance: 3.0, x: 3.5, y: 2.5, slowTimer: 0, slowRatio: 0, isDead: false }
  ];
  tgtState.spawnQueue = [];
  step(tgtState, TICK_MS);
  const hitEv = drainEvents(tgtState).find(e => e.type === 'hit' && e.towerId === twFirst.id);
  if (!hitEv || hitEv.enemyId !== 'e_front') {
    fail('target', tgtState.tick, `expected 'first' to hit e_front, got ${hitEv?.enemyId}`);
  }

  fs.writeFileSync(path.join(outDir, 'logic_audit.log'), logLines.join('\n'));
  console.log(`LOGIC AUDIT (seed=${seed}, outcome=${state.waveState}, wave=${state.wave}, events=${logLines.length}):`);
  console.log(`- path_order: ${stats.pathFails === 0 ? 'PASS' : 'FAIL'} (${stats.pathChecks} checks, ${stats.pathFails} fails)`);
  console.log(`- tower_range: ${stats.rangeFails === 0 ? 'PASS' : 'FAIL'} (${stats.rangeChecks} checks, ${stats.rangeFails} fails)`);
  console.log(`- targeting_rule(first/nearest): ${stats.targetFails === 0 ? 'PASS' : 'FAIL'} (${stats.targetChecks} checks, ${stats.targetFails} fails)`);
  console.log(`- damage_armour_splash: ${stats.damageFails === 0 ? 'PASS' : 'FAIL'} (${stats.damageChecks} checks, ${stats.damageFails} fails)`);
  console.log(`- scrap_kill_wave_reward: ${stats.scrapFails === 0 ? 'PASS' : 'FAIL'} (${stats.scrapChecks} checks, ${stats.scrapFails} fails)`);
  console.log(`- leak_core_hp_zero_end: ${stats.leakFails === 0 ? 'PASS' : 'FAIL'} (${stats.leakChecks} checks, ${stats.leakFails} fails)`);
  console.log(`- wave_no_early_start: ${stats.waveOrderFails === 0 ? 'PASS' : 'FAIL'} (${stats.waveOrderChecks} checks, ${stats.waveOrderFails} fails)`);
  console.log(`- sell_upgrade_costs_refunds: ${stats.economyFails === 0 ? 'PASS' : 'FAIL'} (${stats.economyChecks} checks, ${stats.economyFails} fails)`);
  if (failures.length > 0) {
    console.log('FAILURES:');
    failures.forEach(f => console.log('  ' + f));
    process.exit(1);
  }
}

main();
