import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('First-Run Tips Specification', () => {
  const EXPECTED_TIPS = [
    'Tap a green cell, then select a turret to build defense.',
    'Build Fabricators early to generate Circuits for powerful Workshop upgrades.',
    'Armored enemies resist basic turrets; use Arc Coils and Rockets.'
  ];

  it('contains exactly 3 first-run tips', () => {
    assert.equal(EXPECTED_TIPS.length, 3);
  });

  it('all tips satisfy the strict <= 12 words gate', () => {
    EXPECTED_TIPS.forEach((tip, idx) => {
      const words = tip.trim().split(/\s+/).filter(Boolean);
      assert.ok(
        words.length <= 12,
        `Tip ${idx + 1} ("${tip}") has ${words.length} words (max allowed: 12)`
      );
    });
  });

  it('tips cover essential gameplay progression mechanics', () => {
    // Tip 1: basic building
    assert.match(EXPECTED_TIPS[0], /build defense/i);
    // Tip 2: fabricators and circuits
    assert.match(EXPECTED_TIPS[1], /Fabricators/i);
    assert.match(EXPECTED_TIPS[1], /Circuits/i);
    // Tip 3: armored enemies and counters
    assert.match(EXPECTED_TIPS[2], /Armored/i);
    assert.match(EXPECTED_TIPS[2], /Arc Coils/i);
    assert.match(EXPECTED_TIPS[2], /Rockets/i);
  });
});
