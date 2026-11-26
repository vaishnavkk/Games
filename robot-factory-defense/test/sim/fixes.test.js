import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import upgradesData from '../../src/data/upgrades.json' with { type: 'json' };
import towersData from '../../src/data/towers.json' with { type: 'json' };
import {
  createGame,
  step,
  place,
  upgrade,
  sell,
  startWave,
  buyUpgrade,
  setTowerTargetMode,
  killEnemy,
  serialize,
  deserialize,
  hashState,
  computeWaypoints,
  getPositionAlongPath,
  TICK_MS
} from '../../src/sim/index.js';

describe('Simulation Bug Fixes & Guards', () => {
  it('buyUpgrade is rejected when waveState is won or lost', () => {
    for (const terminalState of ['won', 'lost']) {
      const state = createGame({}, 101);
      state.circuits = 100;
      state.waveState = terminalState;

      assert.equal(buyUpgrade(state, 'unlock_arc'), false);
      assert.equal(buyUpgrade(state, 'overclock'), false);
      assert.equal(buyUpgrade(state, 'repair_bay'), false);
      assert.equal(state.circuits, 100);
      assert.equal(state.unlockedTowers.includes('arc'), false);
      assert.equal(state.purchasedUpgrades.length, 0);
      assert.equal(state.maxCoreHp, 20);
      assert.equal(state.coreHp, 20);
    }
  });

  it('step guards against Infinity, NaN, <= 0 dtMs, and non-finite speed/accumulatorMs', () => {
    const state = createGame({}, 102);
    const tickBefore = state.tick;

    step(state, Infinity);
    step(state, -Infinity);
    step(state, NaN);
    step(state, 0);
    step(state, -10);
    assert.equal(state.tick, tickBefore);
    assert.equal(state.accumulatorMs, 0);

    // Non-finite state.speed must fall back safely without poisoning accumulatorMs
    state.speed = Infinity;
    step(state, TICK_MS);
    assert.ok(Number.isFinite(state.accumulatorMs));
    assert.equal(state.tick, 1);

    state.speed = NaN;
    state.accumulatorMs = NaN;
    step(state, TICK_MS);
    assert.ok(Number.isFinite(state.accumulatorMs));
    assert.equal(state.tick, 2);
  });

  it('upgrade guards against invalid tower.level and non-finite/non-positive upgradeCost', () => {
    const state = createGame({}, 103);
    state.scrap = 500;
    const tower = place(state, { col: 1, row: 1 }, 'pulse');
    assert.ok(tower);

    // Invalid tower levels
    tower.level = 0;
    assert.equal(upgrade(state, tower.id), false);
    tower.level = -2;
    assert.equal(upgrade(state, tower.id), false);
    tower.level = 1;

    // Non-finite upgradeCost in custom tower config
    const customTowers = JSON.parse(JSON.stringify(towersData));
    customTowers.towers.pulse.levels[0].upgradeCost = NaN;
    const sNan = createGame({ towers: customTowers }, 104);
    const tNan = place(sNan, { col: 1, row: 1 }, 'pulse');
    const scrapBefore = sNan.scrap;
    assert.equal(upgrade(sNan, tNan.id), false);
    assert.equal(sNan.scrap, scrapBefore);
    assert.equal(tNan.level, 1);
    assert.ok(Number.isFinite(tNan.investedScrap));

    customTowers.towers.pulse.levels[0].upgradeCost = undefined;
    const sUndef = createGame({ towers: customTowers }, 105);
    const tUndef = place(sUndef, { col: 1, row: 1 }, 'pulse');
    assert.equal(upgrade(sUndef, tUndef.id), false);

    customTowers.towers.pulse.levels[0].upgradeCost = -10;
    const sNeg = createGame({ towers: customTowers }, 106);
    const tNeg = place(sNeg, { col: 1, row: 1 }, 'pulse');
    assert.equal(upgrade(sNeg, tNeg.id), false);
  });

  it('computeWaypoints and getPositionAlongPath handle empty and zero-length paths without NaN', () => {
    assert.deepEqual(computeWaypoints(null), { segments: [], totalDistance: 0 });
    assert.deepEqual(computeWaypoints([]), { segments: [], totalDistance: 0 });
    assert.deepEqual(computeWaypoints([{ col: 2, row: 3 }]), { segments: [], totalDistance: 0 });
    assert.deepEqual(
      computeWaypoints([{ col: 2, row: 3 }, { col: 2, row: 3 }]),
      { segments: [], totalDistance: 0 }
    );

    const zeroSegs = [{ x1: 2.5, y1: 3.5, x2: 2.5, y2: 3.5, dx: 0, dy: 0, len: 0, startDist: 0, endDist: 0 }];
    const posZero = getPositionAlongPath(0, zeroSegs, 0);
    assert.deepEqual(posZero, { x: 2.5, y: 3.5 });

    const mixedSegs = [
      { x1: 1.5, y1: 1.5, x2: 1.5, y2: 1.5, dx: 0, dy: 0, len: 0, startDist: 0, endDist: 0 },
      { x1: 1.5, y1: 1.5, x2: 3.5, y2: 1.5, dx: 2, dy: 0, len: 2, startDist: 0, endDist: 2 }
    ];
    const posAtZero = getPositionAlongPath(0, mixedSegs, 2);
    assert.ok(Number.isFinite(posAtZero.x) && Number.isFinite(posAtZero.y));
    const posNan = getPositionAlongPath(NaN, mixedSegs, 2);
    assert.deepEqual(posNan, { x: 1.5, y: 1.5 });
    assert.deepEqual(getPositionAlongPath(5, [], 0), { x: 0, y: 0 });
  });

  it('serialize and deserialize preserve complete state and deterministic continuation', () => {
    const state = createGame({ scrapMultiplier: 1.1, hpMultiplier: 0.9 }, 777);
    state.circuits = 100;
    state.scrap = 600;
    buyUpgrade(state, 'unlock_arc');
    buyUpgrade(state, 'unlock_rocket');
    buyUpgrade(state, 'overclock');

    const p1 = place(state, { col: 1, row: 1 }, 'pulse');
    upgrade(state, p1.id);
    setTowerTargetMode(state, p1.id, 'nearest');
    place(state, { col: 3, row: 1 }, 'fabricator');
    place(state, { col: 5, row: 1 }, 'rocket');
    startWave(state);

    for (let i = 0; i < 180; i++) {
      step(state, TICK_MS);
    }

    const json = serialize(state);
    const restored = deserialize(json);
    assert.ok(restored);
    assert.equal(serialize(restored), json);
    assert.equal(hashState(restored), hashState(state));
    assert.equal(restored.scrapMultiplier, 1.1);
    assert.equal(restored.hpMultiplier, 0.9);
    assert.equal(restored.towers[0].targetMode, 'nearest');
    assert.equal(restored.towers[0].investedScrap, p1.investedScrap);

    // Step both original and restored forward 300 ticks and verify identical state
    for (let i = 0; i < 300; i++) {
      step(state, TICK_MS);
      step(restored, TICK_MS);
    }
    assert.equal(hashState(restored), hashState(state));
    assert.equal(serialize(restored), serialize(state));

    // Invalid payloads return null safely
    assert.equal(deserialize(null), null);
    assert.equal(deserialize('not valid json'), null);
    assert.equal(deserialize('[]'), null);
    assert.equal(deserialize('{}'), null);
  });

  it('reads Workshop global upgrade effects dynamically from config with safe fallbacks', () => {
    const customUpgrades = JSON.parse(JSON.stringify(upgradesData));
    const findUp = id => customUpgrades.workshop.globalUpgrades.find(g => g.id === id);
    findUp('overclock').effect.fireRateMultiplier = 2.0; // pulse 1.5 * 2.0 = 3.0 -> cooldown 1/3
    findUp('hardened_rounds').effect.damageMultiplier = 2.0; // pulse 12 * 2.0 = 24
    findUp('long_barrels').effect.rangeMultiplier = 1.5; // pulse 2.5 * 1.5 = 3.75
    findUp('scrap_magnet').effect.scrapMultiplier = 2.5; // 10 * 2.5 = 25
    findUp('fast_assembly').effect.costDiscountRatio = 0.25; // floor(60 * 0.75) = 45
    findUp('repair_bay').effect.coreHpBonus = 12; // 20 + 12 = 32

    const state = createGame({ upgrades: customUpgrades }, 202);
    state.circuits = 500;
    state.scrap = 500;

    for (const id of ['overclock', 'hardened_rounds', 'long_barrels', 'scrap_magnet', 'fast_assembly', 'repair_bay']) {
      assert.equal(buyUpgrade(state, id), true);
    }

    assert.equal(state.maxCoreHp, 32);
    assert.equal(state.coreHp, 32);

    // Fast Assembly 25% discount: 60 -> 45
    const tower = place(state, { col: 1, row: 1 }, 'pulse');
    assert.ok(tower);
    assert.equal(tower.investedScrap, 45);
    assert.equal(state.scrap, 455);

    // Enemy at distance 3.5 cells from tower (outside base 2.5, inside 3.75 from 1.5x Long Barrels)
    state.enemies = [{
      id: 'dyn_enemy',
      type: 'glitchbot',
      hp: 24,
      maxHp: 24,
      speed: 0,
      armour: 0,
      scrap: 10,
      leakDamage: 1,
      distance: 1.0,
      x: 1.5,
      y: 5.0, // 3.5 cells from (1.5, 1.5)
      slowTimer: 0,
      slowRatio: 0,
      isDead: false
    }];

    step(state, TICK_MS);
    const hit = state.events.find(e => e.type === 'hit');
    assert.ok(hit, 'Long Barrels 1.5x range must reach enemy at 3.5 cells');
    assert.equal(hit.damage, 24, 'Hardened Rounds 2.0x damage must deal 24');
    assert.ok(Math.abs(tower.cooldown - 1 / 3) < 1e-9, 'Overclock 2.0x fireRate must set cooldown to 1/3');

    const killed = state.events.find(e => e.type === 'killed');
    assert.ok(killed);
    assert.equal(killed.scrapReward, 25, 'Scrap Magnet 2.5x must award 25 scrap');

    // Fallback test when effect objects are omitted
    const emptyEffectUpgrades = JSON.parse(JSON.stringify(upgradesData));
    for (const g of emptyEffectUpgrades.workshop.globalUpgrades) {
      delete g.effect;
    }
    const fallbackState = createGame({ upgrades: emptyEffectUpgrades }, 203);
    fallbackState.circuits = 500;
    buyUpgrade(fallbackState, 'repair_bay');
    buyUpgrade(fallbackState, 'scrap_magnet');
    assert.equal(fallbackState.maxCoreHp, 25);
    killEnemy(fallbackState, { id: 'fb_e', scrap: 10, isDead: false });
    assert.equal(fallbackState.events.find(e => e.type === 'killed').scrapReward, 12);
  });

  it('handles slowRatio ?? 0.5, Arc Coil targetMode hops, rocket dead-target cleanup, and finite guards', () => {
    // 1. slowRatio: explicit 0 vs undefined fallback 0.5
    const sSlow = createGame({}, 301);
    sSlow.enemies = [
      {
        id: 'e_zero_slow',
        type: 'glitchbot',
        hp: 100,
        maxHp: 100,
        speed: 6.0,
        armour: 0,
        scrap: 5,
        leakDamage: 1,
        distance: 1.0,
        x: 1.5,
        y: 2.5,
        slowTimer: 1.0,
        slowRatio: 0,
        isDead: false
      },
      {
        id: 'e_undef_slow',
        type: 'glitchbot',
        hp: 100,
        maxHp: 100,
        speed: 6.0,
        armour: 0,
        scrap: 5,
        leakDamage: 1,
        distance: 1.0,
        x: 1.5,
        y: 2.5,
        slowTimer: 1.0,
        slowRatio: undefined,
        isDead: false
      }
    ];
    step(sSlow, TICK_MS);
    assert.ok(Math.abs(sSlow.enemies[0].distance - 1.1) < 1e-6, 'Explicit slowRatio=0 must not be overridden');
    assert.ok(Math.abs(sSlow.enemies[1].distance - 1.05) < 1e-6, 'Undefined slowRatio must fall back to 0.5');

    // 2. Arc Coil chain hops respect targetMode ('nearest' vs 'first')
    const sArc = createGame({}, 302);
    sArc.circuits = 50;
    sArc.scrap = 300;
    buyUpgrade(sArc, 'unlock_arc');
    const arc = place(sArc, { col: 1, row: 1 }, 'arc');
    setTowerTargetMode(sArc, arc.id, 'nearest');
    // Custom arc with chainTargets = 2 so we observe exact 1st hop choice
    const arcCustomTowers = JSON.parse(JSON.stringify(towersData));
    arcCustomTowers.towers.arc.levels[0].chainTargets = 2;
    sArc.config.towers = arcCustomTowers;
    sArc.enemies = [
      { id: 'p_near', type: 'glitchbot', hp: 50, maxHp: 50, speed: 0, armour: 0, scrap: 5, leakDamage: 1, distance: 1.0, x: 1.5, y: 2.5, slowTimer: 0, slowRatio: 0, isDead: false },
      { id: 'hop_nearest', type: 'glitchbot', hp: 50, maxHp: 50, speed: 0, armour: 0, scrap: 5, leakDamage: 1, distance: 1.2, x: 2.0, y: 2.5, slowTimer: 0, slowRatio: 0, isDead: false },
      { id: 'hop_first', type: 'glitchbot', hp: 50, maxHp: 50, speed: 0, armour: 0, scrap: 5, leakDamage: 1, distance: 5.0, x: 2.8, y: 2.5, slowTimer: 0, slowRatio: 0, isDead: false }
    ];
    step(sArc, TICK_MS);
    const arcHits = sArc.events.filter(e => e.type === 'hit').map(e => e.enemyId);
    assert.deepEqual(arcHits, ['p_near', 'hop_nearest']);

    // 3. Rocket clears targetId when target is killed mid-flight and detonates without NaN
    const sRocket = createGame({}, 303);
    sRocket.circuits = 50;
    sRocket.scrap = 300;
    buyUpgrade(sRocket, 'unlock_rocket');
    place(sRocket, { col: 1, row: 1 }, 'rocket');
    sRocket.enemies = [
      { id: 'r_target', type: 'glitchbot', hp: 10, maxHp: 10, speed: 0, armour: 0, scrap: 5, leakDamage: 1, distance: 3.0, x: 3.5, y: 2.5, slowTimer: 0, slowRatio: 0, isDead: false }
    ];
    step(sRocket, TICK_MS);
    assert.equal(sRocket.projectiles.length, 1);
    assert.equal(sRocket.projectiles[0].targetId, 'r_target');
    // Kill target externally before rocket arrives
    killEnemy(sRocket, sRocket.enemies[0]);
    step(sRocket, TICK_MS);
    assert.equal(sRocket.projectiles[0].targetId, null);
    for (let i = 0; i < 30; i++) step(sRocket, TICK_MS);
    assert.equal(sRocket.projectiles.length, 0);
    assert.ok(Number.isFinite(sRocket.coreHp));

    // 4. Non-finite spawner interval, enemy leakDamage/scrap, baseFireRate, proj.speed do not stall or NaN
    const sEdge = createGame({}, 304);
    sEdge.wave = 1;
    sEdge.waveState = 'spawning';
    sEdge.spawner = [{ type: 'glitchbot', count: 2, spawned: 0, interval: NaN, timer: 0 }];
    step(sEdge, TICK_MS);
    step(sEdge, TICK_MS);
    assert.equal(sEdge.spawner[0].spawned, 2);

    sEdge.enemies = [{
      id: 'bad_enemy',
      type: 'glitchbot',
      hp: 10,
      maxHp: 10,
      speed: 1,
      armour: NaN,
      scrap: NaN,
      leakDamage: NaN,
      distance: 100,
      x: 0,
      y: 0,
      slowTimer: 0,
      slowRatio: 0,
      isDead: false
    }];
    step(sEdge, TICK_MS);
    assert.equal(sEdge.coreHp, 19);
    assert.ok(Number.isFinite(sEdge.scrap));

    // sell handles non-finite investedScrap safely
    const tSell = place(sEdge, { col: 1, row: 1 }, 'pulse');
    tSell.investedScrap = NaN;
    assert.equal(sell(sEdge, tSell.id), true);
    assert.ok(Number.isFinite(sEdge.scrap));
  });
});
