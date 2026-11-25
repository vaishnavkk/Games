import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, startWave } from '../../src/sim/index.js';
import {
  stepUntilWaveComplete,
  simulateIdleBot,
  simulateRandomBot,
  simulateSingleTowerBot,
  simulateCompetentBot,
  MAX_SIM_TICKS_PER_WAVE,
  MAX_WAVE_LOOP_ITERATIONS,
  MAX_PURCHASE_ITERATIONS
} from '../../scripts/balance.js';

describe('Max-Iteration & Simulation Timeout Guards', () => {
  it('exports valid guard constants', () => {
    assert.equal(typeof MAX_SIM_TICKS_PER_WAVE, 'number');
    assert.equal(MAX_SIM_TICKS_PER_WAVE, 180 * 60);
    assert.equal(typeof MAX_WAVE_LOOP_ITERATIONS, 'number');
    assert.ok(MAX_WAVE_LOOP_ITERATIONS >= 15);
    assert.equal(typeof MAX_PURCHASE_ITERATIONS, 'number');
    assert.ok(MAX_PURCHASE_ITERATIONS >= 20);
  });

  it('stepUntilWaveComplete halts at maxSimSeconds and marks state lost', () => {
    const state = createGame({}, 1000);
    const started = startWave(state);
    assert.equal(started, true);

    // Call with a small timeout (0.1 sim seconds = 6 ticks)
    const { ticks, waveDuration, timedOut } = stepUntilWaveComplete(state, 0.1);

    assert.equal(timedOut, true);
    assert.equal(ticks, 6);
    assert.ok(waveDuration >= 0);
    assert.equal(state.waveState, 'lost');
  });

  it('simulateIdleBot honors maxWaveIterations guard and terminates cleanly', () => {
    const res = simulateIdleBot(1000, { maxWaveIterations: 2 });
    assert.equal(typeof res.won, 'boolean');
    assert.ok(res.waveDurations.length <= 2);
  });

  it('simulateRandomBot honors maxWaveIterations guard and terminates cleanly', () => {
    const res = simulateRandomBot(1000, { maxWaveIterations: 2 });
    assert.equal(typeof res.won, 'boolean');
    assert.ok(res.waveDurations.length <= 2);
  });

  it('simulateSingleTowerBot honors maxWaveIterations and maxPurchaseIterations guards', () => {
    const res = simulateSingleTowerBot(1000, 'pulse', {
      maxWaveIterations: 2,
      maxPurchaseIterations: 3
    });
    assert.equal(typeof res.won, 'boolean');
    assert.ok(res.waveDurations.length <= 2);
  });

  it('simulateCompetentBot honors maxWaveIterations and maxPurchaseIterations guards', () => {
    const res = simulateCompetentBot(1000, null, {
      maxWaveIterations: 2,
      maxPurchaseIterations: 5
    });
    assert.equal(typeof res.won, 'boolean');
    assert.ok(res.waveDurations.length <= 2);
  });

  it('PID 1208 edge case: unprogressed/failed startWave terminates loop immediately without hang', () => {
    const state = createGame({}, 1000);
    // Intentionally set state into an invalid active state where startWave fails
    state.waveState = 'active';

    let loopIterations = 0;
    const maxIterations = 10;
    while (state.waveState !== 'won' && state.waveState !== 'lost' && state.wave < state.config.waves.totalWaves) {
      if (++loopIterations > maxIterations) break;

      const started = startWave(state);
      // Guard: must break if startWave fails rather than spin
      if (!started) break;
    }

    assert.equal(loopIterations, 1, 'Loop must terminate on iteration 1 when startWave fails');
  });
});
