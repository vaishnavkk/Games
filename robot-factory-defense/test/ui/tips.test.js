import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { FIRST_RUN_TIPS } from '../../src/ui/tips.js';

describe('First-Run Tips Specification', () => {
  it('contains exactly 3 first-run tips', () => {
    assert.equal(FIRST_RUN_TIPS.length, 3);
  });

  it('all tips satisfy the strict <= 12 words gate', () => {
    FIRST_RUN_TIPS.forEach((tip, idx) => {
      const words = tip.trim().split(/\s+/).filter(Boolean);
      assert.ok(
        words.length <= 12,
        `Tip ${idx + 1} ("${tip}") has ${words.length} words (max allowed: 12)`
      );
    });
  });

  it('tips cover essential gameplay progression mechanics', () => {
    // Tip 1: basic building
    assert.equal(FIRST_RUN_TIPS[0], 'Tap a highlighted pad, then choose a turret.');
    // Tip 2: fabricators and circuits
    assert.match(FIRST_RUN_TIPS[1], /Fabricators/i);
    assert.match(FIRST_RUN_TIPS[1], /Circuits/i);
    // Tip 3: armored enemies and counters
    assert.match(FIRST_RUN_TIPS[2], /Armored/i);
    assert.match(FIRST_RUN_TIPS[2], /Arc Coils/i);
    assert.match(FIRST_RUN_TIPS[2], /Rockets/i);
  });
});
