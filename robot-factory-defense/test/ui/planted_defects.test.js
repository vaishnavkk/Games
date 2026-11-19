import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('6 Planted Defect Verifiers', () => {
  // Defect 1: NaN in HUD
  it('detects NaN in HUD values or DOM text', () => {
    function checkHUDNaN(textOrValues) {
      for (const item of textOrValues) {
        if (typeof item === 'number' && Number.isNaN(item)) return true;
        if (typeof item === 'string' && (/\bNaN\b/i.test(item) || /\bundefined\b/i.test(item))) return true;
      }
      return false;
    }

    assert.equal(checkHUDNaN(['20 / 20', '150', '0', '1 / 15']), false);
    assert.equal(checkHUDNaN(['NaN / 20', '150']), true);
    assert.equal(checkHUDNaN([NaN, 150]), true);
  });

  // Defect 2: Invisible overlay covering buttons
  it('detects when an overlay obscures interactive buttons', () => {
    function isElementCovered(targetRect, overlayRect) {
      // Overlap calculation
      const xOverlap = Math.max(0, Math.min(targetRect.right, overlayRect.right) - Math.max(targetRect.left, overlayRect.left));
      const yOverlap = Math.max(0, Math.min(targetRect.bottom, overlayRect.bottom) - Math.max(targetRect.top, overlayRect.top));
      const overlapArea = xOverlap * yOverlap;
      const targetArea = (targetRect.right - targetRect.left) * (targetRect.bottom - targetRect.top);
      return overlapArea > 0.5 * targetArea;
    }

    const buttonRect = { left: 100, right: 200, top: 10, bottom: 58 };
    const overlayCovering = { left: 0, right: 1000, top: 0, bottom: 1000 };
    const overlayElsewhere = { left: 500, right: 700, top: 500, bottom: 600 };

    assert.equal(isElementCovered(buttonRect, overlayCovering), true);
    assert.equal(isElementCovered(buttonRect, overlayElsewhere), false);
  });

  // Defect 3: Missing tower sprite / icon
  it('detects missing or invalid tower sprites/icons', () => {
    const validIcons = {
      pulse: () => true,
      coolant: () => true,
      arc: () => true,
      rocket: () => true,
      fabricator: () => true
    };

    function validateTowerIcons(iconRegistry) {
      const required = ['pulse', 'coolant', 'arc', 'rocket', 'fabricator'];
      const missing = [];
      for (const req of required) {
        if (typeof iconRegistry[req] !== 'function') {
          missing.push(req);
        }
      }
      return missing;
    }

    assert.deepEqual(validateTowerIcons(validIcons), []);
    assert.deepEqual(
      validateTowerIcons({ ...validIcons, pulse: null }),
      ['pulse']
    );
  });

  // Defect 4: Clipped label or text overflow
  it('detects clipped text or layout overflow', () => {
    function hasOverflow(el) {
      return el.scrollWidth > el.clientWidth + 0.5 || el.scrollHeight > el.clientHeight + 0.5;
    }

    assert.equal(hasOverflow({ scrollWidth: 80, clientWidth: 100, scrollHeight: 48, clientHeight: 48 }), false);
    assert.equal(hasOverflow({ scrollWidth: 120, clientWidth: 80, scrollHeight: 48, clientHeight: 48 }), true);
  });

  // Defect 5: Resources going negative
  it('detects negative resources in state', () => {
    function checkResourceInvariants(scrap, circuits) {
      if (typeof scrap === 'number' && scrap < 0) return false;
      if (typeof circuits === 'number' && circuits < 0) return false;
      return true;
    }

    assert.equal(checkResourceInvariants(150, 0), true);
    assert.equal(checkResourceInvariants(0, 10), true);
    assert.equal(checkResourceInvariants(-1, 0), false);
    assert.equal(checkResourceInvariants(100, -5), false);
  });

  // Defect 6: Hash-breaking non-deterministic random call
  it('detects hash divergence in deterministic simulation', () => {
    function verifyHashDeterminism(hashes) {
      const [first, ...rest] = hashes;
      return rest.every(h => h === first);
    }

    assert.equal(verifyHashDeterminism([0x1234abcd, 0x1234abcd, 0x1234abcd]), true);
    assert.equal(verifyHashDeterminism([0x1234abcd, 0x5678ef01]), false);
  });
});
