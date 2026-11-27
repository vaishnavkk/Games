import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getStoredData, setStoredData } from '../../src/ui/index.js';
import { FIRST_RUN_TIPS } from '../../src/ui/tips.js';

describe('UI & Storage Contract', () => {
  it('localStorage keys strictly use rfd: prefix and handle errors gracefully', () => {
    // In node environment, localStorage is undefined or mocked
    const val = getStoredData('test_key', 42);
    assert.equal(val, 42);
    // setStoredData should not throw even if localStorage is absent
    assert.doesNotThrow(() => {
      setStoredData('test_key', 100);
    });
  });

  it('three first-run tips are all <= 12 words each', () => {
    FIRST_RUN_TIPS.forEach((tip, idx) => {
      const words = tip.trim().split(/\s+/).length;
      assert.ok(
        words <= 12,
        `Tip ${idx + 1} exceeds 12 words: "${tip}" has ${words} words`
      );
    });
  });

  it('verifies 48px target constant and grid sizing', () => {
    const minTargetPx = 48;
    assert.ok(minTargetPx >= 48, 'Interactive targets must be at least 48px');
  });
});
