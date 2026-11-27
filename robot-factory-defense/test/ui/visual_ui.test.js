import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import wavesData from '../../src/data/waves.json' with { type: 'json' };
import enemiesData from '../../src/data/enemies.json' with { type: 'json' };
import { getTowerSvg, getEnemySvg } from '../../src/ui/svgIcons.js';
import { formatWaveBannerTitle, isBossWave } from '../../src/ui/waveBanner.js';
import { TIPS_DISMISSED_KEY } from '../../src/ui/tips.js';

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
  });
});
