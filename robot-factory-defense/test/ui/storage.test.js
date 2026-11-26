import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getStoredData, setStoredData, getBestWave, updateBestWave, getWins } from '../../src/ui/index.js';

describe('Storage Invariant & Resilience Tests', () => {
  it('strictly isolates keys under rfd: prefix', () => {
    const memory = new Map();
    const mockStorage = {
      getItem: (k) => memory.get(k) || null,
      setItem: (k, v) => memory.set(k, String(v))
    };

    // Override global localStorage with mock
    const original = globalThis.localStorage;
    globalThis.localStorage = mockStorage;

    try {
      setStoredData('test_key', { wave: 5 });
      assert.ok(memory.has('rfd:test_key'), 'Key must start with rfd:');
      assert.ok(!memory.has('test_key'), 'Raw key must not exist');

      const retrieved = getStoredData('test_key');
      assert.deepEqual(retrieved, { wave: 5 });
    } finally {
      globalThis.localStorage = original;
    }
  });

  it('handles QuotaExceededError and SecurityError without throwing', () => {
    const original = globalThis.localStorage;

    // Simulate quota exceeded
    globalThis.localStorage = {
      getItem: () => { throw new Error('SecurityError: access denied'); },
      setItem: () => { throw new Error('QuotaExceededError: quota reached'); }
    };

    try {
      assert.doesNotThrow(() => {
        setStoredData('crash_test', { highscore: 999 });
      });

      const fallback = getStoredData('crash_test', 42);
      assert.equal(fallback, 42, 'Returns fallback when storage throws');
    } finally {
      globalThis.localStorage = original;
    }
  });

  it('gracefully recovers from corrupted JSON values', () => {
    const original = globalThis.localStorage;

    globalThis.localStorage = {
      getItem: (k) => (k === 'rfd:corrupt' ? '{invalid json' : null),
      setItem: () => {}
    };

    try {
      const val = getStoredData('corrupt', 'safe_default');
      assert.equal(val, 'safe_default');
    } finally {
      globalThis.localStorage = original;
    }
  });

  it('clamps negative, NaN, and non-finite values in getBestWave/updateBestWave/getWins', () => {
    const original = globalThis.localStorage;
    const memory = new Map([
      ['rfd:best_wave', '-5'],
      ['rfd:wins', '-12']
    ]);
    globalThis.localStorage = {
      getItem: (k) => (memory.has(k) ? memory.get(k) : null),
      setItem: (k, v) => memory.set(k, String(v))
    };

    try {
      assert.equal(getBestWave(), 0, 'Negative stored best_wave must clamp to 0');
      assert.equal(getWins(), 0, 'Negative stored wins must clamp to 0');
      assert.equal(updateBestWave(-3), 0, 'Negative wave update must clamp to 0');
      assert.equal(updateBestWave(NaN), 0, 'NaN wave update must not corrupt storage');
      assert.equal(updateBestWave(Infinity), 0, 'Infinity wave update must not corrupt storage');
      assert.equal(updateBestWave(7.9), 7, 'Valid wave floors cleanly to integer');
      assert.equal(getBestWave(), 7);
    } finally {
      globalThis.localStorage = original;
    }
  });
});
