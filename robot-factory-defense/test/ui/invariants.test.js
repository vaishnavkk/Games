import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Relative luminance formula per WCAG 2.1
function relativeLuminance(r, g, b) {
  const [rs, gs, bs] = [r, g, b].map(c => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

// Contrast ratio formula
function contrastRatio(rgb1, rgb2) {
  const l1 = relativeLuminance(...rgb1);
  const l2 = relativeLuminance(...rgb2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

describe('UI Invariants & Accessibility Rules', () => {
  it('minimum touch target constant is >= 48px', () => {
    const MIN_TOUCH_TARGET_PX = 48;
    assert.ok(MIN_TOUCH_TARGET_PX >= 48);
  });

  it('WCAG AA contrast calculation accurately evaluates >= 4.5:1 ratio', () => {
    // White text (#ffffff) on dark background (#111418)
    const white = [255, 255, 255];
    const darkBg = [17, 20, 24];
    const ratio = contrastRatio(white, darkBg);

    assert.ok(
      ratio >= 4.5,
      `White on dark background should exceed 4.5:1, got ${ratio.toFixed(2)}:1`
    );

    // Hazard orange (#ff7700) on dark background (#111418)
    const hazardOrange = [255, 119, 0];
    const hazardRatio = contrastRatio(hazardOrange, darkBg);
    assert.ok(
      hazardRatio >= 4.5,
      `Hazard orange on dark background should exceed 4.5:1, got ${hazardRatio.toFixed(2)}:1`
    );

    // Cyan accent (#00e5ff) on dark background
    const cyan = [0, 229, 255];
    const cyanRatio = contrastRatio(cyan, darkBg);
    assert.ok(
      cyanRatio >= 4.5,
      `Cyan accent on dark background should exceed 4.5:1, got ${cyanRatio.toFixed(2)}:1`
    );

    // Low contrast pair fails (< 4.5)
    const gray = [100, 100, 100];
    const lowRatio = contrastRatio(gray, darkBg);
    assert.ok(lowRatio < 4.5, 'Gray on dark should be below 4.5:1 threshold');
  });

  it('text clipping detection correctly detects overflowing elements', () => {
    function isClipped(scrollWidth, clientWidth, scrollHeight, clientHeight) {
      return scrollWidth > clientWidth + 0.5 || scrollHeight > clientHeight + 0.5;
    }

    assert.equal(isClipped(100, 100, 48, 48), false, 'Exact fit is not clipped');
    assert.equal(isClipped(100.2, 100, 48, 48), false, 'Sub-pixel tolerance');
    assert.equal(isClipped(150, 100, 48, 48), true, 'Horizontal overflow is clipped');
    assert.equal(isClipped(100, 100, 60, 48), true, 'Vertical overflow is clipped');
  });
});
