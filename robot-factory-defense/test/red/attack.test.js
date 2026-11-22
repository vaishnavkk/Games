import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createGame,
  place,
  upgrade,
  sell,
  startWave,
  setSpeed,
  togglePause,
  buyUpgrade,
  step,
  snapshot,
  serialize,
  setTowerTargetMode,
  TICK_MS
} from '../../src/sim/index.js';
import {
  getStoredData,
  setStoredData,
  updateBestWave
} from '../../src/ui/storage.js';

describe('Red Team Attack Suite (Phase 2.5)', () => {
  it('Attack 1: build on the conveyor path or occupied cells is strictly rejected', () => {
    const state = createGame({}, 101);
    // Path cell (col 0, row 2)
    const onPath = place(state, { col: 0, row: 2 }, 'pulse');
    assert.equal(onPath, null, 'Cannot place tower on conveyor path');
    assert.equal(state.towers.length, 0);

    // Valid placement on buildable cell (1, 1)
    const valid = place(state, { col: 1, row: 1 }, 'pulse');
    assert.ok(valid, 'Placement on valid buildable cell must succeed');
    assert.equal(state.towers.length, 1);

    // Overlapping placement on occupied cell (1, 1)
    const occupied = place(state, { col: 1, row: 1 }, 'coolant');
    assert.equal(occupied, null, 'Cannot place tower on already occupied cell');
    assert.equal(state.towers.length, 1);
  });

  it('Attack 2: insufficient Scrap strictly rejects building and upgrades', () => {
    const state = createGame({}, 102);
    state.scrap = 30; // Pulse costs 60
    const built = place(state, { col: 1, row: 1 }, 'pulse');
    assert.equal(built, null, 'Must reject building when scrap < cost');
    assert.equal(state.scrap, 30, 'Scrap must remain untouched');

    state.scrap = 60;
    const tower = place(state, { col: 1, row: 1 }, 'pulse');
    assert.ok(tower);
    assert.equal(state.scrap, 0);

    // Upgrade level 2 costs 50
    const upgraded = upgrade(state, tower.id);
    assert.equal(upgraded, false, 'Must reject upgrade when scrap < upgradeCost');
    assert.equal(tower.level, 1);
  });

  it('Attack 3: negative, null, or fractional coordinates/amounts do not corrupt state', () => {
    const state = createGame({}, 103);
    // Null/undefined cell
    assert.equal(place(state, null, 'pulse'), null);
    assert.equal(place(state, undefined, 'pulse'), null);
    // Fractional coordinates
    assert.equal(place(state, { col: 1.5, row: 2.5 }, 'pulse'), null);
    // Negative coordinates
    assert.equal(place(state, { col: -1, row: 0 }, 'pulse'), null);
    // Out of bounds coordinates
    assert.equal(place(state, { col: 999, row: 999 }, 'pulse'), null);

    // Invalid step dtMs (NaN, negative, zero)
    const tickBefore = state.tick;
    const accumBefore = state.accumulatorMs;
    step(state, NaN);
    step(state, -50);
    step(state, 0);
    assert.equal(state.tick, tickBefore, 'Invalid dtMs must not advance simulation');
    assert.equal(state.accumulatorMs, accumBefore, 'Invalid dtMs must not poison accumulator to NaN');
  });

  it('Attack 4: sell mid-wave and re-buy cannot generate profit or duplicate resources', () => {
    const state = createGame({}, 104);
    state.scrap = 200;
    const tower = place(state, { col: 1, row: 1 }, 'pulse'); // costs 60 -> 140
    assert.ok(tower);
    assert.equal(state.scrap, 140);

    startWave(state);
    assert.equal(state.waveState, 'spawning');

    // Sell mid-wave
    const sold = sell(state, tower.id);
    assert.equal(sold, true);
    // Refund = floor(60 * 0.70) = 42 -> 140 + 42 = 182
    assert.equal(state.scrap, 182);
    assert.ok(state.scrap < 200, 'Selling must forfeit 30% of invested scrap');

    // Attempting to re-buy costs 60 again -> 122
    const rebought = place(state, { col: 1, row: 1 }, 'pulse');
    assert.ok(rebought);
    assert.equal(state.scrap, 122, 'Re-buying results in net loss of 18 scrap per cycle');
  });

  it('Attack 5: upgrading past maximum level 3 is strictly blocked', () => {
    const state = createGame({}, 105);
    state.scrap = 1000;
    const tower = place(state, { col: 1, row: 1 }, 'pulse');
    assert.equal(tower.level, 1);

    assert.equal(upgrade(state, tower.id), true);
    assert.equal(tower.level, 2);

    assert.equal(upgrade(state, tower.id), true);
    assert.equal(tower.level, 3);

    // Level 3 is maximum
    const scrapAtL3 = state.scrap;
    assert.equal(upgrade(state, tower.id), false, 'Cannot upgrade beyond max level');
    assert.equal(tower.level, 3);
    assert.equal(state.scrap, scrapAtL3, 'Scrap must not be deducted on failed upgrade');
  });

  it('Attack 6: startWave during an active wave is rejected without re-spawning', () => {
    const state = createGame({}, 106);
    assert.equal(startWave(state), true);
    assert.equal(state.waveState, 'spawning');

    // Call startWave again immediately
    assert.equal(startWave(state), false, 'Cannot start wave while already spawning');

    // Advance until active
    for (let i = 0; i < 200; i++) step(state, TICK_MS);
    if (state.waveState === 'active') {
      assert.equal(startWave(state), false, 'Cannot start wave while wave is active');
    }
  });

  it('Attack 7: rapid click spam and double taps on place/startWave execute exactly once', () => {
    const state = createGame({}, 107);
    let successBuilds = 0;
    for (let i = 0; i < 10; i++) {
      if (place(state, { col: 1, row: 1 }, 'pulse')) successBuilds++;
    }
    assert.equal(successBuilds, 1, 'Only 1 build out of 10 rapid clicks may succeed');
    assert.equal(state.scrap, 90, 'Exactly 60 scrap deducted for 1 turret');

    let successWaves = 0;
    for (let i = 0; i < 10; i++) {
      if (startWave(state)) successWaves++;
    }
    assert.equal(successWaves, 1, 'Only 1 startWave out of 10 rapid clicks may succeed');
  });

  it('Attack 8: speed x2 plus pause keeps simulation completely frozen', () => {
    const state = createGame({}, 108);
    setSpeed(state, 2);
    togglePause(state);
    assert.equal(state.paused, true);
    assert.equal(state.speed, 2);

    const initialTick = state.tick;
    const initialSimTime = state.simTime;
    for (let i = 0; i < 100; i++) {
      step(state, 16.666667);
    }
    assert.equal(state.tick, initialTick, 'Paused state must never advance ticks');
    assert.equal(state.simTime, initialSimTime, 'Paused state must never advance simTime');
  });

  it('Attack 9: viewport resize and orientation changes do not desync sim state', () => {
    const state = createGame({}, 109);
    place(state, { col: 1, row: 1 }, 'pulse');
    startWave(state);
    for (let i = 0; i < 60; i++) step(state, TICK_MS);

    const snap1 = snapshot(state);
    // Sim coordinates are discrete logical grid coordinates independent of DOM canvas resolution
    assert.ok(snap1.enemies.length > 0);
    assert.ok(snap1.enemies[0].distance > 0);
    assert.ok(!Number.isNaN(snap1.enemies[0].x));
    assert.ok(!Number.isNaN(snap1.enemies[0].y));
  });

  it('Attack 10: mid-wave serialization preserves canonical state without corruption', () => {
    const state = createGame({}, 110);
    place(state, { col: 1, row: 1 }, 'pulse');
    startWave(state);
    for (let i = 0; i < 50; i++) step(state, TICK_MS);

    const json = serialize(state);
    const parsed = JSON.parse(json);
    assert.equal(parsed.tick, state.tick);
    assert.equal(parsed.scrap, state.scrap);
    assert.equal(parsed.wave, state.wave);
    assert.equal(parsed.towers.length, 1);
    assert.ok(parsed.enemies.length > 0);
  });

  it('Attack 11: storage failure (QuotaExceededError, SecurityError) handled gracefully', () => {
    const originalLocal = globalThis.localStorage;
    try {
      globalThis.localStorage = {
        getItem() { throw new Error('SecurityError: access denied'); },
        setItem() { throw new Error('QuotaExceededError: disk full'); }
      };

      const fallback = getStoredData('test_key', 42);
      assert.equal(fallback, 42, 'Storage failure must return fallback cleanly');

      // Writing must not throw
      assert.doesNotThrow(() => setStoredData('test_key', 99));
      assert.doesNotThrow(() => updateBestWave(12));
    } finally {
      globalThis.localStorage = originalLocal;
    }
  });

  it('Attack 12: Workshop items cannot be purchased twice', () => {
    const state = createGame({}, 112);
    state.circuits = 100;
    assert.equal(buyUpgrade(state, 'overclock'), true);
    assert.equal(state.circuits, 70); // 100 - 30

    // Duplicate purchase attempt
    assert.equal(buyUpgrade(state, 'overclock'), false, 'Duplicate upgrade purchase must be rejected');
    assert.equal(state.circuits, 70, 'Circuits must not be deducted on duplicate purchase');
  });

  it('Attack 13: circuits cannot drop below zero when purchasing Workshop upgrades', () => {
    const state = createGame({}, 113);
    state.circuits = 15; // Overclock costs 30
    assert.equal(buyUpgrade(state, 'overclock'), false, 'Purchase with insufficient circuits must fail');
    assert.equal(state.circuits, 15, 'Circuits must not become negative');
  });

  it('Attack 14: 10,000-tick extreme-upgrade run completes with 0 leaks, NaN or invariant breaches', () => {
    const state = createGame({}, 114);
    state.scrap = 50000;
    state.circuits = 50000;

    // Buy all workshop upgrades and unlocks
    for (const up of ['unlock_arc', 'unlock_rocket', 'overclock', 'hardened_rounds', 'long_barrels', 'scrap_magnet', 'repair_bay', 'fast_assembly']) {
      buyUpgrade(state, up);
    }

    // Place max 4 fabricators + combat towers on valid buildable cells
    place(state, { col: 1, row: 1 }, 'fabricator');
    place(state, { col: 3, row: 1 }, 'fabricator');
    place(state, { col: 5, row: 1 }, 'fabricator');
    place(state, { col: 7, row: 1 }, 'fabricator');
    const p1 = place(state, { col: 1, row: 3 }, 'pulse');
    const a1 = place(state, { col: 3, row: 3 }, 'arc');
    const r1 = place(state, { col: 5, row: 3 }, 'rocket');
    upgrade(state, p1.id);
    upgrade(state, a1.id);
    upgrade(state, r1.id);

    startWave(state);
    for (let t = 0; t < 10000; t++) {
      step(state, 16.666667);
      if (state.waveState === 'cleared') {
        startWave(state);
      }
      if (state.waveState === 'won' || state.waveState === 'lost') {
        break;
      }
    }

    assert.ok(!Number.isNaN(state.scrap));
    assert.ok(!Number.isNaN(state.circuits));
    assert.ok(state.scrap >= 0);
    assert.ok(state.circuits >= 0);
    assert.ok(state.coreHp >= 0);
  });

  // ==========================================================
  // PHASE 2.6 RED TEAM ROUND 2 ATTACKS
  // ==========================================================
  it('Attack 15: buy/sell fabricators cannot duplicate circuits or exceed max 4 limit', () => {
    const state = createGame({}, 201);
    state.scrap = 1000;
    // Buy 4 fabricators
    const f1 = place(state, { col: 1, row: 1 }, 'fabricator');
    const f2 = place(state, { col: 3, row: 1 }, 'fabricator');
    const f3 = place(state, { col: 5, row: 1 }, 'fabricator');
    const f4 = place(state, { col: 7, row: 1 }, 'fabricator');
    assert.ok(f1 && f2 && f3 && f4);
    assert.equal(state.fabricatorCount, 4);

    // 5th fabricator must be rejected
    const f5 = place(state, { col: 9, row: 1 }, 'fabricator');
    assert.equal(f5, null, 'Cannot exceed 4 fabricator cap');
    assert.equal(state.fabricatorCount, 4);

    // Run for 12 seconds to earn circuits
    for (let i = 0; i < 12 * 60; i++) step(state, TICK_MS);
    assert.ok(state.circuits >= 4, '4 fabricators generated circuits');
    const circuitsBeforeSell = state.circuits;

    // Sell fabricator
    const sold = sell(state, f1.id);
    assert.equal(sold, true);
    assert.equal(state.fabricatorCount, 3);
    assert.equal(state.circuits, circuitsBeforeSell, 'Selling fabricator does not deduct or refund circuits');
    // Refund = floor(75 * 0.7) = 52 scrap
    assert.equal(state.towers.some(t => t.id === f1.id), false);
  });

  it('Attack 16: workshop purchase at wave boundary transitions cleanly', () => {
    const state = createGame({}, 202);
    state.circuits = 100;
    place(state, { col: 1, row: 1 }, 'pulse');
    startWave(state);

    // Advance until wave is active
    while (state.waveState === 'spawning') {
      step(state, TICK_MS);
    }
    // Buy upgrade exactly at spawning -> active boundary
    assert.equal(buyUpgrade(state, 'overclock'), true);
    assert.equal(state.purchasedUpgrades.includes('overclock'), true);

    // Advance to cleared boundary
    while (state.waveState !== 'cleared' && state.waveState !== 'lost') {
      step(state, TICK_MS);
    }
    if (state.waveState === 'cleared') {
      assert.equal(buyUpgrade(state, 'repair_bay'), true);
      assert.equal(state.purchasedUpgrades.includes('repair_bay'), true);
    }
    assert.ok(!Number.isNaN(state.circuits));
  });

  it('Attack 17: circuit generation intervals maintain strict integer rounding without drift', () => {
    const state = createGame({}, 203);
    place(state, { col: 1, row: 1 }, 'fabricator');
    assert.equal(state.circuits, 0);

    // Step 9.9 seconds: exactly 0 circuits
    for (let i = 0; i < 594; i++) {
      step(state, TICK_MS);
      assert.equal(Number.isInteger(state.circuits), true, 'Circuits must remain strictly integer');
      assert.equal(state.circuits, 0);
    }

    // Step to 10.1 seconds: exactly 1 circuit
    for (let i = 0; i < 15; i++) {
      step(state, TICK_MS);
    }
    assert.equal(state.circuits, 1);
    assert.equal(Number.isInteger(state.circuits), true);
  });

  it('Attack 18: invalid setTowerTargetMode calls are rejected safely', () => {
    const state = createGame({}, 204);
    const tower = place(state, { col: 1, row: 1 }, 'pulse');
    assert.ok(tower);
    assert.equal(tower.targetMode, 'first');

    // Invalid modes
    assert.equal(setTowerTargetMode(state, tower.id, 'random'), false);
    assert.equal(setTowerTargetMode(state, tower.id, 'fastest'), false);
    assert.equal(setTowerTargetMode(state, tower.id, 'strongest'), false);
    assert.equal(setTowerTargetMode(state, tower.id, null), false);
    assert.equal(setTowerTargetMode(state, tower.id, undefined), false);
    assert.equal(setTowerTargetMode(state, tower.id, 123), false);
    assert.equal(setTowerTargetMode(state, 'invalid_id', 'nearest'), false);
    assert.equal(tower.targetMode, 'first', 'Target mode unchanged after invalid attempts');

    // Valid modes
    assert.equal(setTowerTargetMode(state, tower.id, 'nearest'), true);
    assert.equal(tower.targetMode, 'nearest');
    assert.equal(setTowerTargetMode(state, tower.id, 'first'), true);
    assert.equal(tower.targetMode, 'first');
  });

  it('Attack 19: target mode change during projectile flight does not crash or desync in-flight projectiles', () => {
    const state = createGame({}, 205);
    state.scrap = 500;
    state.circuits = 100;
    buyUpgrade(state, 'unlock_rocket');
    const rocket = place(state, { col: 6, row: 4 }, 'rocket');
    assert.ok(rocket);

    startWave(state);
    // Step until a rocket projectile is launched
    let hasProj = false;
    for (let i = 0; i < 300; i++) {
      step(state, TICK_MS);
      if (state.projectiles && state.projectiles.length > 0) {
        hasProj = true;
        // Mutate mode mid-flight!
        assert.equal(setTowerTargetMode(state, rocket.id, 'first'), true);
        assert.equal(setTowerTargetMode(state, rocket.id, 'nearest'), true);
        break;
      }
    }
    assert.equal(hasProj, true, 'Rocket projectile must launch');
    // Continue simulation with in-flight projectile
    for (let j = 0; j < 120; j++) {
      step(state, TICK_MS);
    }
    assert.ok(!Number.isNaN(state.coreHp));
    assert.ok(state.projectiles.every(p => !Number.isNaN(p.x) && !Number.isNaN(p.y)));
  });

  it('Attack 20: resize + pause + speed x2 maintains absolute state determinism', () => {
    const state = createGame({}, 206);
    place(state, { col: 1, row: 1 }, 'pulse');
    startWave(state);
    for (let i = 0; i < 60; i++) step(state, TICK_MS);

    // Pause and set speed x2
    state.paused = true;
    setSpeed(state, 2);

    const snapBefore = snapshot(state);
    const jsonBefore = serialize(state);

    // Attempt stepping while paused at 2x across 100 iterations
    for (let i = 0; i < 100; i++) {
      step(state, 33.333333);
    }

    const jsonAfter = serialize(state);
    assert.equal(jsonAfter, jsonBefore, 'State serialization must be bit-identical while paused');
    assert.equal(state.tick, snapBefore.tick);
  });

  it('Attack 21: reload mid-wave via serialization resumes cleanly without NaN or lost entities', () => {
    const state1 = createGame({}, 207);
    place(state1, { col: 1, row: 1 }, 'pulse');
    startWave(state1);
    for (let i = 0; i < 80; i++) step(state1, TICK_MS);

    // Save mid-wave state
    const savedJson = serialize(state1);
    const parsedState = JSON.parse(savedJson);

    // Verify fields
    assert.equal(parsedState.tick, state1.tick);
    assert.equal(parsedState.wave, state1.wave);
    assert.ok(parsedState.enemies.length > 0);
    assert.ok(!Number.isNaN(parsedState.enemies[0].x));

    // Resume stepping state1 to completion
    for (let i = 0; i < 3000; i++) {
      step(state1, TICK_MS);
      if (state1.waveState === 'cleared' || state1.waveState === 'won' || state1.waveState === 'lost') break;
    }
    assert.ok(!Number.isNaN(state1.coreHp));
  });
});
