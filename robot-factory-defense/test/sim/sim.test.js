import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createGame,
  step,
  place,
  upgrade,
  sell,
  startWave,
  setSpeed,
  buyUpgrade,
  togglePause,
  setTowerTargetMode,
  snapshot,
  serialize,
  hashState,
  mulberry32,
  drainEvents,
  killEnemy,
  TICK_RATE,
  TICK_MS
} from '../../src/sim/index.js';

describe('Simulation Determinism & Contract', () => {
  it('mulberry32 generates deterministic sequence for identical seed', () => {
    const rng1 = mulberry32(42);
    const rng2 = mulberry32(42);
    const seq1 = Array.from({ length: 10 }, () => rng1());
    const seq2 = Array.from({ length: 10 }, () => rng2());
    assert.deepEqual(seq1, seq2);
  });

  it('mulberry32 generates different sequences for different seeds', () => {
    const rng1 = mulberry32(42);
    const rng2 = mulberry32(99);
    assert.notEqual(rng1(), rng2());
  });

  it('createGame returns valid initial state with contract properties', () => {
    const state = createGame({}, 12345);
    assert.equal(state.tick, 0);
    assert.equal(state.scrap, 150);
    assert.equal(state.circuits, 0);
    assert.equal(state.coreHp, 20);
    assert.equal(state.maxCoreHp, 20);
    assert.equal(state.wave, 0);
    assert.equal(state.paused, false);
    assert.equal(state.speed, 1);
    assert.ok(Array.isArray(state.towers));
    assert.ok(Array.isArray(state.enemies));
    assert.ok(Array.isArray(state.unlockedTowers));
    assert.ok(state.unlockedTowers.includes('pulse'));
  });

  it('identical seeds and actions produce identical state hash after 100 ticks', () => {
    const s1 = createGame({}, 777);
    const s2 = createGame({}, 777);

    place(s1, { col: 1, row: 1 }, 'pulse');
    place(s2, { col: 1, row: 1 }, 'pulse');

    for (let i = 0; i < 100; i++) {
      step(s1, 16.666667);
      step(s2, 16.666667);
    }

    assert.equal(hashState(s1), hashState(s2));
    assert.equal(serialize(s1), serialize(s2));
  });

  it('different seeds produce different state hash', () => {
    const s1 = createGame({}, 1001);
    const s2 = createGame({}, 2002);
    assert.notEqual(s1.seed, s2.seed);
    assert.notEqual(hashState(s1), hashState(s2));
  });

  it('place rejects unbuildable or occupied cells', () => {
    const state = createGame({}, 123);
    // Path cell (0, 2) is unbuildable
    const unbuildable = place(state, { col: 0, row: 2 }, 'pulse');
    assert.equal(unbuildable, null);

    // Valid cell (1, 1)
    const t1 = place(state, { col: 1, row: 1 }, 'pulse');
    assert.ok(t1);
    assert.equal(state.scrap, 150 - 60);

    // Occupied cell (1, 1)
    const t2 = place(state, { col: 1, row: 1 }, 'pulse');
    assert.equal(t2, null);
  });

  it('sell refunds 70% of invested Scrap', () => {
    const state = createGame({}, 123);
    const t = place(state, { col: 1, row: 1 }, 'pulse'); // cost 60
    assert.equal(state.scrap, 90);

    const sold = sell(state, t.id);
    assert.equal(sold, true);
    assert.equal(state.scrap, 90 + Math.floor(60 * 0.7)); // 90 + 42 = 132
  });

  it('upgrade increases tower level and deducts cost', () => {
    const state = createGame({}, 123);
    const t = place(state, { col: 1, row: 1 }, 'pulse'); // cost 60
    assert.equal(t.level, 1);

    const upgraded = upgrade(state, t.id); // upgrade cost 50
    assert.equal(upgraded, true);
    assert.equal(t.level, 2);
    assert.equal(state.scrap, 150 - 60 - 50); // 40
  });

  it('Fabricator generates 1 Circuit every 10 seconds', () => {
    const state = createGame({}, 123);
    place(state, { col: 1, row: 1 }, 'fabricator');
    assert.equal(state.circuits, 0);

    // Step 10 seconds (600 ticks of ~16.666667ms = 10000ms)
    for (let i = 0; i < 600; i++) {
      step(state, TICK_MS);
    }
    assert.equal(state.circuits, 1);
  });

  it('togglePause, setSpeed, and startWave update state cleanly', () => {
    const state = createGame({}, 123);
    assert.equal(state.paused, false);
    togglePause(state);
    assert.equal(state.paused, true);
    togglePause(state);
    assert.equal(state.paused, false);

    setSpeed(state, 2);
    assert.equal(state.speed, 2);

    assert.equal(state.wave, 0);
    const started = startWave(state);
    assert.equal(started, true);
    assert.equal(state.wave, 1);
  });

  it('buyUpgrade unlocks towers and applies global upgrades with Circuits', () => {
    const state = createGame({}, 123);
    state.circuits = 50;

    // Unlock Arc Coil (20 circuits)
    assert.equal(state.unlockedTowers.includes('arc'), false);
    const unlocked = buyUpgrade(state, 'unlock_arc');
    assert.equal(unlocked, true);
    assert.equal(state.unlockedTowers.includes('arc'), true);
    assert.equal(state.circuits, 30);

    // Buy Repair Bay (+5 max core hp)
    const bought = buyUpgrade(state, 'repair_bay');
    assert.equal(bought, true);
    assert.equal(state.maxCoreHp, 25);
    assert.equal(state.coreHp, 25);
  });

  it('snapshot returns read-only projection', () => {
    const state = createGame({}, 123);
    place(state, { col: 1, row: 1 }, 'pulse');
    const snap = snapshot(state);
    assert.equal(snap.scrap, 90);
    assert.equal(snap.towers.length, 1);
    assert.ok(Array.isArray(snap.events));
    assert.ok(Array.isArray(snap.projectiles));
  });
});

describe('Simulation Combat & Mechanic Rules', () => {
  it('targeting logic: first along path vs nearest', () => {
    const state = createGame({}, 42);
    // Tower at cell (3, 3). Center is (3.5, 3.5).
    const tower = place(state, { col: 3, row: 3 }, 'pulse');
    assert.ok(tower);

    // Spawn two dummy glitchbots manually to test targeting logic
    state.enemies = [
      {
        id: 'enemy_near',
        type: 'glitchbot',
        hp: 30,
        maxHp: 30,
        speed: 2.2,
        armour: 0,
        scrap: 6,
        leakDamage: 1,
        distance: 2.0, // closer to start, lower path distance
        x: 3.5,
        y: 2.5, // distance to tower (3.5, 3.5) = 1.0 cell
        slowTimer: 0,
        slowRatio: 0,
        isDead: false
      },
      {
        id: 'enemy_far',
        type: 'glitchbot',
        hp: 30,
        maxHp: 30,
        speed: 2.2,
        armour: 0,
        scrap: 6,
        leakDamage: 1,
        distance: 5.0, // further along path
        x: 4.5,
        y: 2.5, // distance to tower = sqrt(1^2 + 1^2) = 1.414 cells (still within range 2.5)
        slowTimer: 0,
        slowRatio: 0,
        isDead: false
      }
    ];

    // By default, targetMode is 'first' (furthest along path, i.e., enemy_far)
    step(state, TICK_MS);
    const hitEvent1 = state.events.find(e => e.type === 'hit');
    assert.ok(hitEvent1);
    assert.equal(hitEvent1.enemyId, 'enemy_far');

    // Reset cooldown and switch targeting mode to 'nearest'
    tower.cooldown = 0;
    setTowerTargetMode(state, tower.id, 'nearest');

    step(state, TICK_MS);
    const hitEvent2 = state.events.find(e => e.type === 'hit');
    assert.ok(hitEvent2);
    assert.equal(hitEvent2.enemyId, 'enemy_near');
  });

  it('armour reduction rule: max(1, damage - armour)', () => {
    const state = createGame({}, 42);
    // Pulse Turret level 1 nominal damage = 12
    const tower = place(state, { col: 1, row: 1 }, 'pulse');

    // Crusher Tank has flat armour = 6
    state.enemies = [
      {
        id: 'tank_1',
        type: 'crusher_tank',
        hp: 180,
        maxHp: 180,
        speed: 0.9,
        armour: 6,
        scrap: 20,
        leakDamage: 3,
        distance: 1.0,
        x: 1.5,
        y: 2.5,
        slowTimer: 0,
        slowRatio: 0,
        isDead: false
      }
    ];

    step(state, TICK_MS);
    const hit = state.events.find(e => e.type === 'hit');
    assert.ok(hit);
    // Effective damage = 12 - 6 = 6 (exactly <= 50% of nominal 12)
    assert.equal(hit.damage, 6);
    assert.equal(state.enemies[0].hp, 180 - 6);

    // When damage <= armour, minimum 1 damage is dealt
    tower.cooldown = 0;
    state.enemies[0].armour = 20; // armour exceeds 12
    step(state, TICK_MS);
    const hitMin = state.events.find(e => e.type === 'hit');
    assert.ok(hitMin);
    assert.equal(hitMin.damage, 1);
  });

  it('cryogenic slow: 50% speed reduction for 2.0s without stacking', () => {
    const state = createGame({}, 42);
    state.scrap = 300;
    place(state, { col: 1, row: 1 }, 'coolant'); // range 2.2, slow 50% for 2s

    const enemy = {
      id: 'runner_1',
      type: 'glitchbot',
      hp: 100,
      maxHp: 100,
      speed: 2.0, // 2.0 cells / sec
      armour: 0,
      scrap: 6,
      leakDamage: 1,
      distance: 1.0,
      x: 1.5,
      y: 2.5,
      slowTimer: 0,
      slowRatio: 0,
      isDead: false
    };
    state.enemies = [enemy];

    // Tick 1: Coolant fires and applies slow
    step(state, TICK_MS);
    assert.ok(enemy.slowTimer > 1.9);
    assert.equal(enemy.slowRatio, 0.5);

    // Tick 2: Enemy moves with slow active (50% speed = 1.0 cells/s)
    const distBefore = enemy.distance;
    step(state, TICK_MS);
    const distStep = enemy.distance - distBefore;
    const expectedDistStep = (2.0 * 0.5) * (1 / TICK_RATE);
    assert.ok(Math.abs(distStep - expectedDistStep) < 0.001);

    // Non-stacking: Hit again with second coolant; slowRatio stays 0.5
    enemy.slowTimer = 1.0;
    const tower2 = place(state, { col: 1, row: 3 }, 'coolant');
    assert.ok(tower2);
    tower2.cooldown = 0;
    step(state, TICK_MS);
    assert.equal(enemy.slowRatio, 0.5, 'Slow ratio must remain 0.5 (non-stacking)');
    assert.ok(enemy.slowTimer >= 1.9, 'Slow duration refreshed to 2.0s');

    // Sell coolants so enemy is not continually re-sprayed, then verify slow expires
    sell(state, state.towers[0].id);
    sell(state, state.towers[0].id);

    // Advance 2.5s (150 ticks); slowTimer should expire and speed return to 100%
    for (let i = 0; i < 150; i++) {
      step(state, TICK_MS);
    }
    assert.equal(enemy.slowTimer, 0);
  });

  it('Arc Coil chaining: 3 targets within 1.5 cells, completely ignores armour', () => {
    const state = createGame({}, 42);
    state.circuits = 50;
    buyUpgrade(state, 'unlock_arc');
    state.scrap = 200;

    // Place Arc Coil at (1, 1). Arc Coil Level 1 damage = 8
    place(state, { col: 1, row: 1 }, 'arc');

    // 4 enemies with heavy armour (8): 3 clustered within 1.5 cells, 1 far away
    state.enemies = [
      {
        id: 'arc_target_1',
        type: 'crusher_tank',
        hp: 50,
        maxHp: 50,
        speed: 0.9,
        armour: 8,
        scrap: 20,
        leakDamage: 3,
        distance: 1.0,
        x: 1.5,
        y: 2.5,
        slowTimer: 0,
        slowRatio: 0,
        isDead: false
      },
      {
        id: 'arc_target_2',
        type: 'crusher_tank',
        hp: 50,
        maxHp: 50,
        speed: 0.9,
        armour: 8,
        scrap: 20,
        leakDamage: 3,
        distance: 1.8,
        x: 2.3, // distance to target 1 is 0.8 cells (<= 1.5)
        y: 2.5,
        slowTimer: 0,
        slowRatio: 0,
        isDead: false
      },
      {
        id: 'arc_target_3',
        type: 'crusher_tank',
        hp: 50,
        maxHp: 50,
        speed: 0.9,
        armour: 8,
        scrap: 20,
        leakDamage: 3,
        distance: 2.5,
        x: 3.0, // distance to target 2 is 0.7 cells (<= 1.5)
        y: 2.5,
        slowTimer: 0,
        slowRatio: 0,
        isDead: false
      },
      {
        id: 'arc_target_4_far',
        type: 'crusher_tank',
        hp: 50,
        maxHp: 50,
        speed: 0.9,
        armour: 8,
        scrap: 20,
        leakDamage: 3,
        distance: 6.0,
        x: 6.5, // > 1.5 cells away
        y: 2.5,
        slowTimer: 0,
        slowRatio: 0,
        isDead: false
      }
    ];

    step(state, TICK_MS);
    const hits = state.events.filter(e => e.type === 'hit');
    // Exactly 3 targets hit
    assert.equal(hits.length, 3);
    // Every target took full 8 damage (armour 8 ignored!)
    hits.forEach(h => {
      assert.equal(h.damage, 8, 'Arc Coil must deal 8 damage, ignoring armour');
    });

    const hitEnemyIds = hits.map(h => h.enemyId);
    assert.ok(hitEnemyIds.includes('arc_target_1'));
    assert.ok(hitEnemyIds.includes('arc_target_2'));
    assert.ok(hitEnemyIds.includes('arc_target_3'));
    assert.ok(!hitEnemyIds.includes('arc_target_4_far'), 'Far enemy must not be hit');
  });

  it('Rocket Rack: projectile launch, flight, and area splash damage', () => {
    const state = createGame({}, 42);
    state.circuits = 50;
    buyUpgrade(state, 'unlock_rocket');
    state.scrap = 200;

    // Rocket Rack Level 1: damage 35, splash 1.2 cells
    const rocketTower = place(state, { col: 1, row: 1 }, 'rocket');
    setTowerTargetMode(state, rocketTower.id, 'nearest');

    state.enemies = [
      {
        id: 'rocket_target',
        type: 'rust_walker',
        hp: 60,
        maxHp: 60,
        speed: 0,
        armour: 2,
        scrap: 8,
        leakDamage: 1,
        distance: 1.0,
        x: 1.5,
        y: 2.5,
        slowTimer: 0,
        slowRatio: 0,
        isDead: false
      },
      {
        id: 'rocket_splash_near',
        type: 'rust_walker',
        hp: 60,
        maxHp: 60,
        speed: 0,
        armour: 2,
        scrap: 8,
        leakDamage: 1,
        distance: 1.5,
        x: 2.0, // distance to target is 0.5 cells (<= 1.2 splash radius)
        y: 2.5,
        slowTimer: 0,
        slowRatio: 0,
        isDead: false
      },
      {
        id: 'rocket_splash_outside',
        type: 'rust_walker',
        hp: 60,
        maxHp: 60,
        speed: 0,
        armour: 2,
        scrap: 8,
        leakDamage: 1,
        distance: 3.5,
        x: 4.0, // distance to target is 2.5 cells (> 1.2 splash radius)
        y: 2.5,
        slowTimer: 0,
        slowRatio: 0,
        isDead: false
      }
    ];

    // Tick 1: Rocket Rack fires projectile
    step(state, TICK_MS);
    assert.equal(state.projectiles.length, 1);
    assert.equal(state.projectiles[0].type, 'rocket');

    // Step until projectile reaches target (travels distance 1.0 cell at speed 8.0 = ~8 ticks)
    let detonateEvents = [];
    for (let i = 0; i < 15; i++) {
      step(state, TICK_MS);
      if (state.events.some(e => e.type === 'hit')) {
        detonateEvents = state.events.filter(e => e.type === 'hit');
        break;
      }
    }

    assert.equal(state.projectiles.length, 0, 'Projectile must detonate and clear');
    assert.equal(detonateEvents.length, 2, 'Primary target and near enemy within splash radius must be hit');

    // Damage = 35 - 2 (armour) = 33
    detonateEvents.forEach(h => {
      assert.equal(h.damage, 33);
    });

    const outside = state.enemies.find(e => e.id === 'rocket_splash_outside');
    assert.equal(outside.hp, 60, 'Outside enemy must take 0 damage');
  });

  it('leak damage: discrete core damage per enemy type', () => {
    const leakSpecs = [
      { type: 'glitchbot', expectedLeakDmg: 1 },
      { type: 'rust_walker', expectedLeakDmg: 1 },
      { type: 'spark_drone', expectedLeakDmg: 1 },
      { type: 'crusher_tank', expectedLeakDmg: 3 },
      { type: 'iron_sentry', expectedLeakDmg: 5 },
      { type: 'mega_mixer', expectedLeakDmg: 10 }
    ];

    for (const spec of leakSpecs) {
      const state = createGame({}, 123);
      const enemyDef = state.config.enemies.enemies[spec.type];
      state.enemies = [
        {
          id: `test_${spec.type}`,
          type: spec.type,
          hp: enemyDef.hp,
          maxHp: enemyDef.hp,
          speed: enemyDef.speed,
          armour: enemyDef.armour,
          scrap: enemyDef.scrap,
          leakDamage: enemyDef.leakDamage,
          distance: state.totalPathDistance - 0.001, // directly at core exit
          x: 15.5,
          y: 7.5,
          slowTimer: 0,
          slowRatio: 0,
          isDead: false
        }
      ];

      const initialCoreHp = state.coreHp;
      let leakEvent = null;
      for (let i = 0; i < 5; i++) {
        step(state, TICK_MS);
        leakEvent = state.events.find(e => e.type === 'leaked');
        if (leakEvent) break;
      }

      assert.ok(leakEvent, `Expected leaked event for ${spec.type}`);
      assert.equal(leakEvent.coreDamage, spec.expectedLeakDmg);
      assert.equal(state.coreHp, initialCoreHp - spec.expectedLeakDmg);
      assert.equal(state.stats.enemiesLeaked, 1);
      assert.equal(state.enemies.length, 0, 'Leaked enemy must be removed');
    }
  });

  it('economy & fabricator limit: max 4 fabricators at 75 scrap', () => {
    const state = createGame({}, 123);
    state.scrap = 500;

    // Place 4 Fabricators
    const f1 = place(state, { col: 1, row: 1 }, 'fabricator');
    const f2 = place(state, { col: 3, row: 1 }, 'fabricator');
    const f3 = place(state, { col: 5, row: 1 }, 'fabricator');
    const f4 = place(state, { col: 7, row: 1 }, 'fabricator');

    assert.ok(f1 && f2 && f3 && f4);
    assert.equal(state.fabricatorCount, 4);
    assert.equal(state.scrap, 500 - 4 * 75); // 200

    // Attempting 5th fabricator must be rejected
    const f5 = place(state, { col: 9, row: 1 }, 'fabricator');
    assert.equal(f5, null);
    assert.equal(state.fabricatorCount, 4);

    // Selling one allows building another
    sell(state, f1.id);
    assert.equal(state.fabricatorCount, 3);
    const fNew = place(state, { col: 9, row: 1 }, 'fabricator');
    assert.ok(fNew);
    assert.equal(state.fabricatorCount, 4);
  });

  it('sell refund and Fast Assembly: affects only future purchases', () => {
    const state = createGame({}, 123);
    state.circuits = 50;

    // Tower 1 bought at full price: 60 scrap
    const t1 = place(state, { col: 1, row: 1 }, 'pulse');
    assert.equal(t1.investedScrap, 60);

    // Buy Fast Assembly (-10% cost)
    buyUpgrade(state, 'fast_assembly');

    // Tower 2 bought with 10% discount: floor(60 * 0.9) = 54 scrap
    const t2 = place(state, { col: 3, row: 1 }, 'pulse');
    assert.equal(t2.investedScrap, 54);

    // Tower 1 refund: floor(60 * 0.70) = 42
    const scrapBeforeT1 = state.scrap;
    sell(state, t1.id);
    assert.equal(state.scrap - scrapBeforeT1, 42);

    // Tower 2 refund: floor(54 * 0.70) = 37
    const scrapBeforeT2 = state.scrap;
    sell(state, t2.id);
    assert.equal(state.scrap - scrapBeforeT2, 37);
  });

  it('Workshop upgrades: Overclock, Hardened Rounds, Long Barrels, Scrap Magnet', () => {
    const state = createGame({}, 123);
    state.circuits = 150;
    state.scrap = 200;

    const t = place(state, { col: 1, row: 1 }, 'pulse'); // lvl 1: dmg 12, fireRate 1.5, range 2.5

    // Overclock (+15% fire rate)
    buyUpgrade(state, 'overclock');
    assert.ok(state.purchasedUpgrades.includes('overclock'));

    // Hardened Rounds (+15% damage)
    buyUpgrade(state, 'hardened_rounds');
    assert.ok(state.purchasedUpgrades.includes('hardened_rounds'));

    // Long Barrels (+10% range)
    buyUpgrade(state, 'long_barrels');
    assert.ok(state.purchasedUpgrades.includes('long_barrels'));

    // Scrap Magnet (+20% scrap reward)
    buyUpgrade(state, 'scrap_magnet');
    assert.ok(state.purchasedUpgrades.includes('scrap_magnet'));

    // Spawn an enemy to test boosted kill reward and boosted damage
    state.enemies = [
      {
        id: 'target_upgraded',
        type: 'glitchbot',
        hp: 30,
        maxHp: 30,
        speed: 0,
        armour: 0,
        scrap: 10,
        leakDamage: 1,
        distance: 1.0,
        x: 1.5,
        y: 2.5,
        slowTimer: 0,
        slowRatio: 0,
        isDead: false
      }
    ];

    const scrapBefore = state.scrap;
    step(state, TICK_MS);
    const hit = state.events.find(e => e.type === 'hit');
    // Hardened Rounds deals Math.round(12 * 1.15) = 14 damage
    assert.equal(hit.damage, 14);

    // Finish kill
    t.cooldown = 0;
    step(state, TICK_MS);
    t.cooldown = 0;
    step(state, TICK_MS);

    const killEvent = state.events.find(e => e.type === 'killed');
    assert.ok(killEvent);
    // Scrap Magnet: Math.round(10 * 1.20) = 12 scrap
    assert.equal(killEvent.scrapReward, 12);
    assert.equal(state.scrap - scrapBefore, 12);
  });

  it('win and loss conditions transition waveState cleanly', () => {
    // Loss condition: coreHp drops to 0
    const stateLoss = createGame({}, 123);
    stateLoss.enemies = [
      {
        id: 'boss_leak',
        type: 'mega_mixer',
        hp: 3500,
        maxHp: 3500,
        speed: 0.5,
        armour: 10,
        scrap: 200,
        leakDamage: 25, // exceeds 20 coreHp
        distance: stateLoss.totalPathDistance - 0.001,
        x: 15.5,
        y: 7.5,
        slowTimer: 0,
        slowRatio: 0,
        isDead: false
      }
    ];
    for (let i = 0; i < 5; i++) {
      step(stateLoss, TICK_MS);
      if (stateLoss.waveState === 'lost') break;
    }
    assert.equal(stateLoss.coreHp, 0);
    assert.equal(stateLoss.waveState, 'lost');
    assert.ok(stateLoss.events.some(e => e.type === 'lost'));

    // Step does not advance when lost
    const tickLost = stateLoss.tick;
    step(stateLoss, 100);
    assert.equal(stateLoss.tick, tickLost);

    // Win condition: Wave 15 cleared
    const stateWin = createGame({}, 123);
    stateWin.wave = 15;
    stateWin.waveState = 'active';
    stateWin.enemies = []; // no enemies left
    step(stateWin, TICK_MS);
    assert.equal(stateWin.waveState, 'won');
    const wonEvent = stateWin.events.find(e => e.type === 'won');
    assert.ok(wonEvent);
    assert.equal(wonEvent.remainingHp, 20);
    assert.ok(wonEvent.score > 0);
  });
});

describe('Phase 0.5 Stricter Gates: Real Simulation (5,000 Ticks, >= 20 Actions)', () => {
  it('executes 5,000 continuous ticks with >= 20 actions and satisfies all invariant gates', () => {
    function runSim(seed) {
      const state = createGame({}, seed);
      let actionCount = 0;

      // Initial defense: 2 Pulse turrets (60 + 60 = 120 scrap)
      const t1 = place(state, { col: 1, row: 1 }, 'pulse'); if (t1) actionCount++;
      const t2 = place(state, { col: 3, row: 1 }, 'pulse'); if (t2) actionCount++;
      if (startWave(state)) actionCount++;

      let maxEnemiesSeen = 0;
      let maxProjectilesSeen = 0;

      // Step simulation across 5,000 ticks
      for (let t = 0; t < 5000; t++) {
        // When wave clears, advance next wave
        if (state.waveState === 'cleared') {
          if (startWave(state)) actionCount++;
        }

        // Place fabricators up to 4
        if (state.scrap >= 75 && state.fabricatorCount < 4) {
          const pad = state.config.map.buildableCells.find(c => !state.towers.some(x => x.col === c.col && x.row === c.row));
          if (pad && place(state, pad, 'fabricator')) actionCount++;
        }

        // Place combat turrets (pulse) across open pads
        if (state.scrap >= 60 && state.towers.filter(x => x.type === 'pulse').length < 6) {
          const pad = state.config.map.buildableCells.find(c => !state.towers.some(x => x.col === c.col && x.row === c.row));
          if (pad && place(state, pad, 'pulse')) actionCount++;
        }

        // Upgrade turrets
        const upgradable = state.towers.find(x => x.type === 'pulse' && x.level < 3 && state.scrap >= (x.level === 1 ? 50 : 80));
        if (upgradable) {
          if (upgrade(state, upgradable.id)) actionCount++;
        }

        // Workshop unlocks and global upgrades
        if (state.circuits >= 20 && !state.unlockedTowers.includes('arc')) {
          if (buyUpgrade(state, 'unlock_arc')) actionCount++;
        }
        if (state.circuits >= 20 && !state.purchasedUpgrades.includes('scrap_magnet')) {
          if (buyUpgrade(state, 'scrap_magnet')) actionCount++;
        }
        if (state.circuits >= 20 && !state.purchasedUpgrades.includes('repair_bay')) {
          if (buyUpgrade(state, 'repair_bay')) actionCount++;
        }
        if (state.circuits >= 30 && !state.purchasedUpgrades.includes('fast_assembly')) {
          if (buyUpgrade(state, 'fast_assembly')) actionCount++;
        }
        if (state.circuits >= 30 && !state.purchasedUpgrades.includes('overclock')) {
          if (buyUpgrade(state, 'overclock')) actionCount++;
        }
        if (state.circuits >= 25 && !state.purchasedUpgrades.includes('long_barrels')) {
          if (buyUpgrade(state, 'long_barrels')) actionCount++;
        }
        if (state.circuits >= 35 && !state.purchasedUpgrades.includes('hardened_rounds')) {
          if (buyUpgrade(state, 'hardened_rounds')) actionCount++;
        }
        if (state.circuits >= 40 && !state.unlockedTowers.includes('rocket')) {
          if (buyUpgrade(state, 'unlock_rocket')) actionCount++;
        }

        // Build Arc and Rocket towers once unlocked
        if (state.unlockedTowers.includes('arc') && state.scrap >= 100 && state.towers.filter(x => x.type === 'arc').length < 2) {
          const pad = state.config.map.buildableCells.find(c => !state.towers.some(x => x.col === c.col && x.row === c.row));
          if (pad && place(state, pad, 'arc')) actionCount++;
        }
        if (state.unlockedTowers.includes('rocket') && state.scrap >= 120 && !state.towers.some(x => x.type === 'rocket')) {
          const pad = state.config.map.buildableCells.find(c => !state.towers.some(x => x.col === c.col && x.row === c.row));
          if (pad && place(state, pad, 'rocket')) actionCount++;
        }

        // Test sell action
        if (t === 2500) {
          const fab = state.towers.find(x => x.type === 'fabricator');
          if (fab && sell(state, fab.id)) actionCount++;
        }
        if (t === 3500) {
          const fab = state.towers.find(x => x.type === 'fabricator');
          if (fab && sell(state, fab.id)) actionCount++;
        }

        step(state, TICK_MS);

        // Invariant 1: Resource Floor
        assert.ok(state.scrap >= 0, `Scrap dropped below 0 at tick ${t}: ${state.scrap}`);
        assert.ok(state.circuits >= 0, `Circuits dropped below 0 at tick ${t}: ${state.circuits}`);

        // Invariant 2: Core HP Bounds
        assert.ok(state.coreHp >= 0 && state.coreHp <= state.maxCoreHp, `Core HP invalid at tick ${t}: ${state.coreHp}`);

        // Invariant 3: No NaN / Infinity
        assert.ok(!Number.isNaN(state.coreHp));
        assert.ok(!Number.isNaN(state.scrap));
        assert.ok(!Number.isNaN(state.circuits));
        for (const e of state.enemies) {
          assert.ok(!Number.isNaN(e.x), `Enemy x is NaN at tick ${t}`);
          assert.ok(!Number.isNaN(e.y), `Enemy y is NaN at tick ${t}`);
          assert.ok(!Number.isNaN(e.hp), `Enemy hp is NaN at tick ${t}`);
          assert.ok(!Number.isNaN(e.distance), `Enemy distance is NaN at tick ${t}`);
        }
        for (const p of state.projectiles) {
          assert.ok(!Number.isNaN(p.x), `Projectile x is NaN at tick ${t}`);
          assert.ok(!Number.isNaN(p.y), `Projectile y is NaN at tick ${t}`);
        }

        if (state.enemies.length > maxEnemiesSeen) maxEnemiesSeen = state.enemies.length;
        if (state.projectiles.length > maxProjectilesSeen) maxProjectilesSeen = state.projectiles.length;
      }

      // Invariant 5: Entity Bounding
      assert.ok(maxEnemiesSeen < 200, `Enemy explosion leak detected: ${maxEnemiesSeen}`);
      assert.ok(maxProjectilesSeen < 100, `Projectile explosion leak detected: ${maxProjectilesSeen}`);

      // Invariant 4: Enemy Lifecycle Invariant
      assert.ok(state.stats.enemiesKilled + state.stats.enemiesLeaked > 0, 'Simulation must engage enemies');

      return {
        state,
        actionCount,
        hash: hashState(state),
        serialized: serialize(state)
      };
    }

    // Run 1 on Seed 1337
    const run1 = runSim(1337);
    assert.ok(run1.actionCount >= 20, `Must execute >= 20 actions, got ${run1.actionCount}`);
    assert.equal(run1.state.tick, 5000, 'Must execute exactly 5,000 ticks');

    // Run 2 on Seed 1337: Must yield identical state hash and byte-for-byte serialization
    const run2 = runSim(1337);
    assert.equal(run1.hash, run2.hash, 'Identical seed and actions must produce identical hash');
    assert.equal(run1.serialized, run2.serialized, 'Identical seed and actions must produce identical serialized state');

    // Run 3 on Seed 9999: Different seed must yield distinct state hash
    const run3 = runSim(9999);
    assert.notEqual(run1.hash, run3.hash, 'Different seeds must produce distinct state hash');
  });
});

describe('Phase 2.5 Event Fix: Speed-x2 Event Accumulation and Single Emission', () => {
  it('same seed + same actions produce identical cumulative event counts at x1 and x2', () => {
    function runGameEvents(seed, speed) {
      const state = createGame({}, seed);
      state.speed = speed;
      place(state, { col: 3, row: 1 }, 'pulse');
      place(state, { col: 3, row: 3 }, 'pulse');
      startWave(state);

      let totalEvents = 0;
      const counts = {};

      // Run until wave clears or 564 ticks
      while (state.tick < 564) {
        step(state, 16.666667);
        const evs = drainEvents(state);
        totalEvents += evs.length;
        for (const ev of evs) {
          counts[ev.type] = (counts[ev.type] || 0) + 1;
        }
      }
      return { totalEvents, counts, waveState: state.waveState, tick: state.tick };
    }

    const res1 = runGameEvents(42, 1);
    const res2 = runGameEvents(42, 2);

    assert.equal(res1.totalEvents, res2.totalEvents, `Total events must match at x1 (${res1.totalEvents}) and x2 (${res2.totalEvents})`);
    assert.deepEqual(res1.counts, res2.counts, 'Per-type event counts must be identical between x1 and x2');
    assert.equal(res1.waveState, 'cleared');
    assert.equal(res2.waveState, 'cleared');
  });

  it('won, lost, and wave_cleared fire exactly once at x2', () => {
    // 1. Won fires exactly once at x2
    const stateWon = createGame({}, 123);
    stateWon.speed = 2;
    stateWon.wave = 15;
    stateWon.waveState = 'active';
    stateWon.enemies = [];
    step(stateWon, 16.666667);
    const wonEvents = drainEvents(stateWon).filter(e => e.type === 'won');
    assert.equal(wonEvents.length, 1, 'Won event must fire exactly once at x2');
    assert.equal(stateWon.waveState, 'won');

    // Subsequent steps while won must not emit won event again
    step(stateWon, 16.666667);
    const wonEvents2 = drainEvents(stateWon).filter(e => e.type === 'won');
    assert.equal(wonEvents2.length, 0, 'Won event must not re-fire on subsequent steps');

    // 2. Lost fires exactly once at x2
    const stateLost = createGame({}, 123);
    stateLost.speed = 2;
    stateLost.waveState = 'active';
    stateLost.coreHp = 1;
    stateLost.enemies = [{
      id: 'e1',
      type: 'glitchbot',
      hp: 10,
      maxHp: 10,
      speed: 1,
      armour: 0,
      scrapReward: 5,
      leakDamage: 2,
      distance: 1000,
      x: 0,
      y: 0,
      slowTimer: 0,
      slowRatio: 0,
      isDead: false
    }];
    step(stateLost, 16.666667);
    const lostEvents = drainEvents(stateLost).filter(e => e.type === 'lost');
    assert.equal(lostEvents.length, 1, 'Lost event must fire exactly once at x2');
    assert.equal(stateLost.waveState, 'lost');

    // Subsequent steps while lost must not emit lost event again
    step(stateLost, 16.666667);
    const lostEvents2 = drainEvents(stateLost).filter(e => e.type === 'lost');
    assert.equal(lostEvents2.length, 0, 'Lost event must not re-fire on subsequent steps');

    // 3. Wave_cleared fires exactly once at x2
    const stateClear = createGame({}, 123);
    stateClear.speed = 2;
    stateClear.wave = 1;
    stateClear.waveState = 'active';
    stateClear.enemies = [];
    step(stateClear, 16.666667);
    const clearEvents = drainEvents(stateClear).filter(e => e.type === 'wave_cleared');
    assert.equal(clearEvents.length, 1, 'Wave_cleared event must fire exactly once at x2');
    assert.equal(stateClear.waveState, 'cleared');

    // Subsequent step in cleared state must not emit wave_cleared again
    step(stateClear, 16.666667);
    const clearEvents2 = drainEvents(stateClear).filter(e => e.type === 'wave_cleared');
    assert.equal(clearEvents2.length, 0, 'Wave_cleared event must not re-fire while waiting for next wave');
  });
});

describe('Phase 3 Parameterized Simulation: scrapMultiplier, hpMultiplier, removedTower, workshopMode', () => {
  it('scrapMultiplier scales starting scrap, enemy kill scrap, and wave_cleared reward scrap', () => {
    // 1. Starting scrap scaling
    const s08 = createGame({ scrapMultiplier: 0.8 }, 123);
    assert.equal(s08.scrap, Math.round(150 * 0.8)); // 120
    assert.equal(s08.scrapMultiplier, 0.8);

    const s12 = createGame({ scrapMultiplier: 1.2 }, 123);
    assert.equal(s12.scrap, Math.round(150 * 1.2)); // 180

    // Also supports scrapScale alias
    const sScale = createGame({ scrapScale: 0.8 }, 123);
    assert.equal(sScale.scrap, 120);

    // 2. Enemy kill scrap scaling
    const state = createGame({ scrapMultiplier: 0.8 }, 123);
    const initialScrap = state.scrap;
    const dummyEnemy = {
      id: 'e_test',
      type: 'spark_drone',
      scrap: 10,
      hp: 10,
      isDead: false
    };
    killEnemy(state, dummyEnemy);
    // Math.round(10 * 0.8) = 8
    assert.equal(state.scrap - initialScrap, 8);
    const killEvent = state.events.find(e => e.type === 'killed');
    assert.ok(killEvent);
    assert.equal(killEvent.scrapReward, 8);

    // 3. Wave clear reward scrap scaling
    state.wave = 1;
    state.waveState = 'active';
    state.enemies = [];
    const scrapBeforeClear = state.scrap;
    step(state, 16.666667);
    const clearEvent = state.events.find(e => e.type === 'wave_cleared');
    assert.ok(clearEvent);
    // Wave 1 reward is scaled by scrapMultiplier: Math.round(wave1Reward * 0.8)
    const expectedWave1Reward = Math.round(state.config.waves.waves[0].rewardScrap * 0.8);
    assert.equal(clearEvent.rewardScrap, expectedWave1Reward);
    assert.equal(state.scrap - scrapBeforeClear, expectedWave1Reward);
  });

  it('hpMultiplier scales spawned enemy hp and maxHp', () => {
    const sHighHp = createGame({ hpMultiplier: 1.1 }, 123);
    startWave(sHighHp); // wave 1 spawns glitchbots (base hp 30)
    // Step 1 tick to spawn glitchbot
    step(sHighHp, 16.666667);
    const e1 = sHighHp.enemies[0];
    assert.ok(e1);
    // Math.max(1, Math.round(30 * 1.1)) = 33
    assert.equal(e1.hp, 33);
    assert.equal(e1.maxHp, 33);

    const sLowHp = createGame({ hpMultiplier: 0.9 }, 123);
    startWave(sLowHp);
    step(sLowHp, 16.666667);
    const e2 = sLowHp.enemies[0];
    assert.ok(e2);
    // Math.max(1, Math.round(30 * 0.9)) = 27
    assert.equal(e2.hp, 27);
    assert.equal(e2.maxHp, 27);
  });

  it('removedTower blocks building and unlock of removed tower type', () => {
    // 1. Removed Pulse
    const sNoPulse = createGame({ removedTower: 'pulse' }, 123);
    assert.equal(sNoPulse.unlockedTowers.includes('pulse'), false);
    const p1 = place(sNoPulse, { col: 1, row: 1 }, 'pulse');
    assert.equal(p1, null);

    // 2. Removed Arc: buyUpgrade('unlock_arc') must be rejected
    const sNoArc = createGame({ removedTower: 'arc' }, 123);
    sNoArc.circuits = 100;
    const boughtArc = buyUpgrade(sNoArc, 'unlock_arc');
    assert.equal(boughtArc, false);
    assert.equal(sNoArc.unlockedTowers.includes('arc'), false);

    // 3. Other unlocked towers still buildable
    const pCool = place(sNoPulse, { col: 1, row: 1 }, 'coolant');
    assert.ok(pCool);
  });

  it('createGame preserves workshopMode on state', () => {
    const sNone = createGame({ workshopMode: 'none' }, 123);
    assert.equal(sNone.workshopMode, 'none');

    const sOverclock = createGame({ workshopMode: 'overclock' }, 123);
    assert.equal(sOverclock.workshopMode, 'overclock');
  });
});

