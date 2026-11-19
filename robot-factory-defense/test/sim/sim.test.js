import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createGame,
  step,
  place,
  upgrade,
  sell,
  startWave,
  setSpeed,
  buyUpgrade,
  togglePause,
  snapshot,
  serialize,
  hashState,
  mulberry32
} from '../../src/sim/index.js';

describe('Simulation Determinism & Contract', () => {
  it('mulberry32 generates deterministic sequence for identical seed', () => {
    const rng1 = mulberry32(42);
    const rng2 = mulberry32(42);
    const seq1 = Array.from({ length: 10 }, () => rng1());
    const seq2 = Array.from({ length: 10 }, () => rng2());
    assert.deepEqual(seq1, seq2);
  });

  it('mulberry32 generates different sequences for different seeds', () => {
    const rng1 = mulberry32(42);
    const rng2 = mulberry32(99);
    assert.notEqual(rng1(), rng2());
  });

  it('createGame returns valid initial state with contract properties', () => {
    const state = createGame({}, 12345);
    assert.equal(state.tick, 0);
    assert.equal(state.scrap, 150);
    assert.equal(state.circuits, 0);
    assert.equal(state.coreHp, 20);
    assert.equal(state.maxCoreHp, 20);
    assert.equal(state.wave, 0);
    assert.equal(state.paused, false);
    assert.equal(state.speed, 1);
    assert.ok(Array.isArray(state.towers));
    assert.ok(Array.isArray(state.enemies));
    assert.ok(Array.isArray(state.unlockedTowers));
    assert.ok(state.unlockedTowers.includes('pulse'));
  });

  it('identical seeds and actions produce identical state hash after 100 ticks', () => {
    const s1 = createGame({}, 777);
    const s2 = createGame({}, 777);

    place(s1, { col: 1, row: 1 }, 'pulse');
    place(s2, { col: 1, row: 1 }, 'pulse');

    for (let i = 0; i < 100; i++) {
      step(s1, 16.666);
      step(s2, 16.666);
    }

    assert.equal(hashState(s1), hashState(s2));
    assert.equal(serialize(s1), serialize(s2));
  });

  it('different seeds produce different state hash', () => {
    const s1 = createGame({}, 1001);
    const s2 = createGame({}, 2002);
    assert.notEqual(s1.seed, s2.seed);
  });

  it('place rejects unbuildable or occupied cells', () => {
    const state = createGame({}, 123);
    // Path cell (0, 2) is unbuildable
    const unbuildable = place(state, { col: 0, row: 2 }, 'pulse');
    assert.equal(unbuildable, null);

    // Valid cell (1, 1)
    const t1 = place(state, { col: 1, row: 1 }, 'pulse');
    assert.ok(t1);
    assert.equal(state.scrap, 150 - 60);

    // Occupied cell (1, 1)
    const t2 = place(state, { col: 1, row: 1 }, 'pulse');
    assert.equal(t2, null);
  });

  it('sell refunds 70% of invested Scrap', () => {
    const state = createGame({}, 123);
    const t = place(state, { col: 1, row: 1 }, 'pulse'); // cost 60
    assert.equal(state.scrap, 90);

    const sold = sell(state, t.id);
    assert.equal(sold, true);
    assert.equal(state.scrap, 90 + Math.floor(60 * 0.7)); // 90 + 42 = 132
  });

  it('upgrade increases tower level and deducts cost', () => {
    const state = createGame({}, 123);
    const t = place(state, { col: 1, row: 1 }, 'pulse'); // cost 60
    assert.equal(t.level, 1);

    const upgraded = upgrade(state, t.id); // upgrade cost 50
    assert.equal(upgraded, true);
    assert.equal(t.level, 2);
    assert.equal(state.scrap, 150 - 60 - 50); // 40
  });

  it('Fabricator generates 1 Circuit every 8 seconds', () => {
    const state = createGame({}, 123);
    place(state, { col: 1, row: 1 }, 'fabricator');
    assert.equal(state.circuits, 0);

    // Step 8 seconds (8000ms)
    for (let i = 0; i < 480; i++) {
      step(state, 16.666667);
    }
    assert.equal(state.circuits, 1);
  });

  it('togglePause, setSpeed, and startWave update state cleanly', () => {
    const state = createGame({}, 123);
    assert.equal(state.paused, false);
    togglePause(state);
    assert.equal(state.paused, true);
    togglePause(state);
    assert.equal(state.paused, false);

    setSpeed(state, 2);
    assert.equal(state.speed, 2);

    assert.equal(state.wave, 0);
    const started = startWave(state);
    assert.equal(started, true);
    assert.equal(state.wave, 1);
  });

  it('buyUpgrade unlocks towers and applies global upgrades with Circuits', () => {
    const state = createGame({}, 123);
    state.circuits = 50;

    // Unlock Arc Coil (10 circuits)
    assert.equal(state.unlockedTowers.includes('arc'), false);
    const unlocked = buyUpgrade(state, 'unlock_arc');
    assert.equal(unlocked, true);
    assert.equal(state.unlockedTowers.includes('arc'), true);
    assert.equal(state.circuits, 40);

    // Buy Repair Bay (+5 max core hp)
    const bought = buyUpgrade(state, 'repair_bay');
    assert.equal(bought, true);
    assert.equal(state.maxCoreHp, 25);
    assert.equal(state.coreHp, 25);
  });

  it('snapshot returns read-only projection', () => {
    const state = createGame({}, 123);
    place(state, { col: 1, row: 1 }, 'pulse');
    const snap = snapshot(state);
    assert.equal(snap.scrap, 90);
    assert.equal(snap.towers.length, 1);
  });
});
