import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import mapData from '../../src/data/map.json' with { type: 'json' };
import towersData from '../../src/data/towers.json' with { type: 'json' };
import enemiesData from '../../src/data/enemies.json' with { type: 'json' };
import wavesData from '../../src/data/waves.json' with { type: 'json' };
import upgradesData from '../../src/data/upgrades.json' with { type: 'json' };

describe('Data Specifications & Balance Invariants', () => {
  it('map.json matches 16x9 grid and has 24-30 buildable cells', () => {
    assert.equal(mapData.grid.cols, 16);
    assert.equal(mapData.grid.rows, 9);
    assert.equal(mapData.core.hp, 20);
    assert.equal(mapData.startScrap, 150);
    assert.ok(
      mapData.buildableCells.length >= 24 && mapData.buildableCells.length <= 30,
      `Expected 24-30 buildable cells, got ${mapData.buildableCells.length}`
    );
  });

  it('towers.json defines 4 combat towers with 3 levels each + fabricator', () => {
    assert.equal(towersData.sellRefundRatio, 0.70);
    const towers = towersData.towers;
    assert.ok(towers.pulse && towers.coolant && towers.arc && towers.rocket && towers.fabricator);

    ['pulse', 'coolant', 'arc', 'rocket'].forEach(id => {
      assert.equal(towers[id].levels.length, 3, `Tower ${id} must have 3 levels`);
      assert.ok(towers[id].levels[0].cost > 0);
      assert.ok(towers[id].levels[0].damage > 0);
      assert.ok(towers[id].levels[0].range > 0);
    });

    assert.equal(towers.fabricator.levels[0].circuitInterval, 10.0);
  });

  it('enemies.json defines Glitchbot, Rust Walker, Spark Drone, Crusher Tank, mini-boss, boss', () => {
    const enemies = enemiesData.enemies;
    assert.ok(enemies.glitchbot, 'Glitchbot must exist');
    assert.ok(enemies.rust_walker, 'Rust Walker must exist');
    assert.ok(enemies.spark_drone, 'Spark Drone must exist');
    assert.ok(enemies.crusher_tank, 'Crusher Tank must exist');
    assert.ok(enemies.iron_sentry, 'Iron Sentry mini-boss must exist');
    assert.ok(enemies.mega_mixer, 'Mega Mixer boss must exist');

    assert.ok(enemies.crusher_tank.armour > 0, 'Crusher Tank must have flat armour');
    assert.equal(enemies.iron_sentry.isBoss, true);
    assert.equal(enemies.mega_mixer.isBoss, true);
  });

  it('waves.json defines exactly 15 waves with mini-boss at wave 10 and boss at wave 15', () => {
    assert.equal(wavesData.totalWaves, 15);
    assert.equal(wavesData.waves.length, 15);

    const wave10 = wavesData.waves[9];
    assert.ok(wave10.spawns.some(s => s.type === 'iron_sentry'), 'Wave 10 must contain mini-boss');

    const wave15 = wavesData.waves[14];
    assert.ok(wave15.spawns.some(s => s.type === 'mega_mixer'), 'Wave 15 must contain Mega Mixer boss');
  });

  it('upgrades.json defines 6 global upgrades and 2 tower unlocks', () => {
    const workshop = upgradesData.workshop;
    assert.equal(workshop.unlocks.length, 2);
    assert.ok(workshop.unlocks.some(u => u.target === 'arc'));
    assert.ok(workshop.unlocks.some(u => u.target === 'rocket'));

    assert.equal(workshop.globalUpgrades.length, 6);
    const expectedUpgrades = [
      'overclock',
      'hardened_rounds',
      'long_barrels',
      'scrap_magnet',
      'repair_bay',
      'fast_assembly'
    ];
    expectedUpgrades.forEach(id => {
      assert.ok(workshop.globalUpgrades.some(g => g.id === id), `Missing upgrade ${id}`);
    });
  });
});
