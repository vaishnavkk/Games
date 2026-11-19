import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('HUD & Formatting Contract', () => {
  function formatCoreHp(hp, maxHp) {
    const safeHp = Number.isFinite(hp) ? Math.max(0, hp) : 0;
    const safeMax = Number.isFinite(maxHp) ? maxHp : 20;
    return `${safeHp} / ${safeMax}`;
  }

  function formatScrap(scrap) {
    if (!Number.isFinite(scrap)) return '0';
    return `${Math.max(0, Math.floor(scrap))}`;
  }

  function formatCircuits(circuits) {
    if (!Number.isFinite(circuits)) return '0';
    return `${Math.max(0, Math.floor(circuits))}`;
  }

  function formatWave(wave, totalWaves = 15) {
    const safeWave = Number.isFinite(wave) ? Math.max(0, wave) : 0;
    return `${safeWave} / ${totalWaves}`;
  }

  it('formats HUD core HP cleanly and suppresses negative or NaN values', () => {
    assert.equal(formatCoreHp(20, 20), '20 / 20');
    assert.equal(formatCoreHp(5, 20), '5 / 20');
    assert.equal(formatCoreHp(0, 20), '0 / 20');
    assert.equal(formatCoreHp(-3, 20), '0 / 20');
    assert.equal(formatCoreHp(NaN, 20), '0 / 20');
    assert.ok(!formatCoreHp(NaN, 20).includes('NaN'));
  });

  it('formats Scrap and Circuits preventing negative or NaN display', () => {
    assert.equal(formatScrap(150), '150');
    assert.equal(formatScrap(0), '0');
    assert.equal(formatScrap(-50), '0');
    assert.equal(formatScrap(NaN), '0');
    assert.ok(!formatScrap(NaN).includes('NaN'));

    assert.equal(formatCircuits(40), '40');
    assert.equal(formatCircuits(0), '0');
    assert.equal(formatCircuits(-10), '0');
    assert.equal(formatCircuits(NaN), '0');
    assert.ok(!formatCircuits(NaN).includes('NaN'));
  });

  it('formats wave numbers accurately', () => {
    assert.equal(formatWave(0, 15), '0 / 15');
    assert.equal(formatWave(1, 15), '1 / 15');
    assert.equal(formatWave(15, 15), '15 / 15');
    assert.equal(formatWave(NaN, 15), '0 / 15');
  });
});
