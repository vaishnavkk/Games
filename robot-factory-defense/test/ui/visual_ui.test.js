import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import wavesData from '../../src/data/waves.json' with { type: 'json' };
import enemiesData from '../../src/data/enemies.json' with { type: 'json' };
import { getTowerSvg, getEnemySvg } from '../../src/ui/svgIcons.js';
import { formatWaveBannerTitle, isBossWave } from '../../src/ui/waveBanner.js';
import { TIPS_DISMISSED_KEY, FIRST_RUN_TIPS, createTipsBanner } from '../../src/ui/tips.js';
import { findNearestBuildablePad } from '../../src/ui/utils.js';

describe('Visual UI Components & Procedural SVGs', () => {
  it('generates procedural inline SVGs for all tower and enemy types with zero external URLs', () => {
    const towerTypes = ['pulse', 'coolant', 'arc', 'rocket', 'fabricator'];
    for (const t of towerTypes) {
      const svg = getTowerSvg(t);
      assert.ok(svg.startsWith('<svg') && svg.includes('</svg>'), `Missing SVG for tower ${t}`);
      assert.ok(!svg.includes('http://') && !svg.includes('https://'), `External URL in tower SVG ${t}`);
    }

    const enemyTypes = Object.keys(enemiesData.enemies);
    for (const e of enemyTypes) {
      const svg = getEnemySvg(e, enemiesData);
      assert.ok(svg.startsWith('<svg') && svg.includes('</svg>'), `Missing SVG for enemy ${e}`);
      assert.ok(!svg.includes('http://') && !svg.includes('https://'), `External URL in enemy SVG ${e}`);
    }
  });

  it('derives wave banner titles and boss flags accurately from wave composition', () => {
    const wave1 = wavesData.waves.find(w => w.wave === 1);
    const wave6 = wavesData.waves.find(w => w.wave === 6);
    const wave10 = wavesData.waves.find(w => w.wave === 10);
    const wave15 = wavesData.waves.find(w => w.wave === 15);

    assert.equal(isBossWave(1, wave1, enemiesData), false);
    assert.equal(isBossWave(6, wave6, enemiesData), false);
    assert.equal(isBossWave(10, wave10, enemiesData), true);
    assert.equal(isBossWave(15, wave15, enemiesData), true);

    assert.equal(formatWaveBannerTitle(1, wave1, enemiesData), 'WAVE 1: Glitchbots');
    assert.equal(formatWaveBannerTitle(6, wave6, enemiesData), 'WAVE 6: Crusher Tanks');
    assert.equal(formatWaveBannerTitle(10, wave10, enemiesData), 'BOSS WAVE 10: Iron Sentry');
    assert.equal(formatWaveBannerTitle(15, wave15, enemiesData), 'BOSS WAVE 15: Mega Mixer');
  });

  it('uses rfd:-compatible tips_dismissed storage key', () => {
    assert.equal(TIPS_DISMISSED_KEY, 'tips_dismissed');
    assert.equal(FIRST_RUN_TIPS[0], 'Tap a highlighted pad, then choose a turret.');
  });

  it('generates enemy SVGs at >= 16px dimensions', () => {
    const enemyTypes = Object.keys(enemiesData.enemies);
    for (const e of enemyTypes) {
      const svg = getEnemySvg(e, enemiesData);
      assert.match(svg, /width="16"/, `Expected width="16" for enemy ${e}`);
      assert.match(svg, /height="16"/, `Expected height="16" for enemy ${e}`);
    }
  });

  it('dismisses tips banner and persists rfd:tips_dismissed in localStorage', () => {
    const store = new Map();
    const origDoc = globalThis.document;
    const origStorage = globalThis.localStorage;

    const makeEl = (tag) => ({
      tagName: tag.toUpperCase(),
      className: '',
      id: '',
      textContent: '',
      style: {},
      attributes: {},
      children: [],
      setAttribute(k, v) { this.attributes[k] = String(v); },
      addEventListener() {},
      appendChild(child) { this.children.push(child); }
    });

    globalThis.document = { createElement: makeEl };
    globalThis.localStorage = {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => { store.set(k, String(v)); }
    };

    try {
      const first = createTipsBanner();
      assert.notEqual(first.element.style.display, 'none');
      first.dismiss();
      assert.equal(first.element.style.display, 'none');
      assert.equal(store.get('rfd:tips_dismissed'), 'true');

      const second = createTipsBanner();
      assert.equal(second.element.style.display, 'none');
    } finally {
      globalThis.document = origDoc;
      globalThis.localStorage = origStorage;
    }
  });

  it('snaps taps within 0.5 cellSize to the nearest unoccupied buildable pad', () => {
    const pads = [
      { col: 2, row: 2 },
      { col: 5, row: 4 }
    ];
    // Inside pad (2,2)
    assert.deepEqual(findNearestBuildablePad(2.4, 2.6, pads, [], 0.5), { col: 2, row: 2 });
    // Just outside pad (2,2) within 0.5 cells (0.3 cells left of col=2)
    assert.deepEqual(findNearestBuildablePad(1.7, 2.5, pads, [], 0.5), { col: 2, row: 2 });
    // Outside 0.5 cells (0.6 cells left of col=2)
    assert.equal(findNearestBuildablePad(1.4, 2.5, pads, [], 0.5), null);
    // Skips occupied pad (2,2)
    assert.equal(findNearestBuildablePad(1.7, 2.5, pads, [{ col: 2, row: 2 }], 0.5), null);
    // Snaps to (5,4) when within 0.5 cells diagonally (dx=0.3, dy=0.3 -> ~0.424 <= 0.5)
    assert.deepEqual(findNearestBuildablePad(4.7, 3.7, pads, [], 0.5), { col: 5, row: 4 });
    // Does not snap diagonally when hypot(0.4, 0.4) = ~0.566 > 0.5
    assert.equal(findNearestBuildablePad(4.6, 3.6, pads, [], 0.5), null);
  });
});
