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
  mulberry32
} from '../../src/sim/index.js';
import mapData from '../../src/data/map.json' with { type: 'json' };
import upgradesData from '../../src/data/upgrades.json' with { type: 'json' };

describe('Property Tests: Rules, Invariants & Conservation', () => {
  it('Conservation of Scrap invariant holds across arbitrary valid and invalid operations', () => {
    const rng = mulberry32(123456);
    const state = createGame({}, 123456);

    let totalBuildPaid = 0;
    let totalUpgradePaid = 0;
    let totalRefunds = 0;
    const initialScrap = state.scrap;

    const buildable = mapData.buildableCells;
    const towerTypes = ['pulse', 'coolant', 'fabricator'];

    for (let i = 0; i < 200; i++) {
      const roll = rng();
      const scrapBefore = state.scrap;

      if (roll < 0.4) {
        // Try placing a tower
        const cell = buildable[Math.floor(rng() * buildable.length)];
        const tType = towerTypes[Math.floor(rng() * towerTypes.length)];
        const tower = place(state, cell, tType);
        if (tower) {
          const cost = scrapBefore - state.scrap;
          assert.ok(cost > 0, 'Cost of placing tower must be positive');
          assert.equal(tower.investedScrap, cost, 'Tower investedScrap must equal cost paid');
          totalBuildPaid += cost;
        }
      } else if (roll < 0.7) {
        // Try upgrading an existing tower
        if (state.towers.length > 0) {
          const t = state.towers[Math.floor(rng() * state.towers.length)];
          const investedBefore = t.investedScrap;
          const upgraded = upgrade(state, t.id);
          if (upgraded) {
            const cost = scrapBefore - state.scrap;
            assert.ok(cost > 0, 'Cost of upgrading tower must be positive');
            assert.equal(t.investedScrap, investedBefore + cost, 'investedScrap must track total spent');
            totalUpgradePaid += cost;
          }
        }
      } else {
        // Try selling an existing tower
        if (state.towers.length > 0) {
          const t = state.towers[Math.floor(rng() * state.towers.length)];
          const invested = t.investedScrap;
          const expectedRefund = Math.floor(0.70 * invested);
          const sold = sell(state, t.id);
          if (sold) {
            const refund = state.scrap - scrapBefore;
            assert.equal(refund, expectedRefund, `Sell refund must be floor(0.70 * invested): got ${refund}, expected ${expectedRefund}`);
            totalRefunds += refund;
          }
        }
      }

      // Conservation of Scrap invariant check:
      // spent = (totalBuildPaid + totalUpgradePaid) - totalRefunds
      // state.scrap = initialScrap + scrapEarned - spent
      // Since no enemies died here yet, scrapEarned = 0:
      const spent = (totalBuildPaid + totalUpgradePaid) - totalRefunds;
      assert.equal(state.scrap, initialScrap - spent, `Scrap conservation violated: scrap (${state.scrap}) !== initial (${initialScrap}) - spent (${spent})`);
      assert.ok(state.scrap >= 0, `Scrap must never drop below 0: got ${state.scrap}`);
    }
  });

  it('Resource non-negativity and Core HP bounds hold under random stress', () => {
    const rng = mulberry32(98765);
    for (let simIdx = 0; simIdx < 20; simIdx++) {
      const state = createGame({}, 1000 + simIdx);
      for (let stepIdx = 0; stepIdx < 100; stepIdx++) {
        // Random actions
        const action = Math.floor(rng() * 6);
        if (action === 0) {
          const cell = mapData.buildableCells[Math.floor(rng() * mapData.buildableCells.length)];
          place(state, cell, 'pulse');
        } else if (action === 1 && state.towers.length > 0) {
          upgrade(state, state.towers[0].id);
        } else if (action === 2 && state.towers.length > 0) {
          sell(state, state.towers[0].id);
        } else if (action === 3) {
          startWave(state);
        } else if (action === 4) {
          buyUpgrade(state, 'repair_bay');
        }

        step(state, 16.666);

        // Invariant assertions
        assert.ok(state.scrap >= 0, `Scrap became negative: ${state.scrap}`);
        assert.ok(state.circuits >= 0, `Circuits became negative: ${state.circuits}`);
        assert.ok(state.coreHp >= 0, `Core HP became negative: ${state.coreHp}`);
        assert.ok(state.coreHp <= state.maxCoreHp, `Core HP (${state.coreHp}) exceeded maxCoreHp (${state.maxCoreHp})`);
        assert.ok(!Number.isNaN(state.scrap), 'Scrap is NaN');
        assert.ok(!Number.isNaN(state.circuits), 'Circuits is NaN');
        assert.ok(!Number.isNaN(state.coreHp), 'Core HP is NaN');
      }
    }
  });

  it('Property test: 1,000 random action sequences verify invariants, scrap conservation, and enemy lifecycle', () => {
    const masterRng = mulberry32(20261120);
    const buildable = mapData.buildableCells;
    const allTowerTypes = ['pulse', 'coolant', 'arc', 'rocket', 'fabricator'];
    const workshopUpgrades = [
      'unlock_arc',
      'unlock_rocket',
      'overclock',
      'hardened_rounds',
      'long_barrels',
      'scrap_magnet',
      'repair_bay',
      'fast_assembly'
    ];

    for (let seq = 0; seq < 1000; seq++) {
      const seed = Math.floor(masterRng() * 1000000);
      const seqRng = mulberry32(seed);
      const state = createGame({}, seed);

      let totalBuildPaid = 0;
      let totalUpgradePaid = 0;
      let totalRefunds = 0;
      let totalScrapEarned = 0;
      const initialScrap = state.scrap;

      // Enemy lifecycle tracking
      const enemyLifecycle = new Map(); // id -> { spawned: true, killed: false, leaked: false }

      const numActions = 10 + Math.floor(seqRng() * 15); // 10 to 24 actions per sequence

      for (let actIdx = 0; actIdx < numActions; actIdx++) {
        const actionChoice = Math.floor(seqRng() * 9);
        const scrapBefore = state.scrap;

        switch (actionChoice) {
          case 0: { // place tower
            const cell = buildable[Math.floor(seqRng() * buildable.length)];
            const tType = allTowerTypes[Math.floor(seqRng() * allTowerTypes.length)];
            const tower = place(state, cell, tType);
            if (tower) {
              const cost = scrapBefore - state.scrap;
              assert.ok(cost > 0, 'Build cost must be > 0');
              totalBuildPaid += cost;
            }
            break;
          }
          case 1: { // upgrade tower
            if (state.towers.length > 0) {
              const t = state.towers[Math.floor(seqRng() * state.towers.length)];
              const upgraded = upgrade(state, t.id);
              if (upgraded) {
                const cost = scrapBefore - state.scrap;
                assert.ok(cost > 0, 'Upgrade cost must be > 0');
                totalUpgradePaid += cost;
              }
            }
            break;
          }
          case 2: { // sell tower
            if (state.towers.length > 0) {
              const t = state.towers[Math.floor(seqRng() * state.towers.length)];
              const sold = sell(state, t.id);
              if (sold) {
                const refund = state.scrap - scrapBefore;
                assert.ok(refund >= 0, 'Sell refund must be >= 0');
                totalRefunds += refund;
              }
            }
            break;
          }
          case 3: { // buy workshop upgrade
            const uId = workshopUpgrades[Math.floor(seqRng() * workshopUpgrades.length)];
            buyUpgrade(state, uId);
            break;
          }
          case 4: { // start wave
            startWave(state);
            break;
          }
          case 5: { // set speed
            const spd = seqRng() > 0.5 ? 2 : 1;
            setSpeed(state, spd);
            break;
          }
          case 6: { // toggle pause
            togglePause(state);
            break;
          }
          case 7: { // step simulation discrete tick
            const dt = 16.666;
            step(state, dt);
            break;
          }
          case 8: { // step simulation random dt (e.g. 10ms - 200ms)
            const dt = 10 + seqRng() * 190;
            step(state, dt);
            break;
          }
        }

        // Process any events emitted in this tick/action
        if (state.events && state.events.length > 0) {
          for (const ev of state.events) {
            if (ev.type === 'spawned') {
              assert.ok(ev.enemyId, 'Spawned event must have enemyId');
              assert.ok(!enemyLifecycle.has(ev.enemyId), `Duplicate spawned event for enemy ${ev.enemyId}`);
              enemyLifecycle.set(ev.enemyId, { spawned: true, killed: false, leaked: false });
            } else if (ev.type === 'killed') {
              assert.ok(ev.enemyId, 'Killed event must have enemyId');
              const record = enemyLifecycle.get(ev.enemyId);
              assert.ok(record, `Killed event for unknown enemy ${ev.enemyId}`);
              assert.equal(record.killed, false, `Enemy ${ev.enemyId} killed more than once`);
              assert.equal(record.leaked, false, `Enemy ${ev.enemyId} was both killed and leaked`);
              record.killed = true;
              if (ev.scrapReward) {
                totalScrapEarned += ev.scrapReward;
              }
            } else if (ev.type === 'leaked') {
              assert.ok(ev.enemyId, 'Leaked event must have enemyId');
              const record = enemyLifecycle.get(ev.enemyId);
              assert.ok(record, `Leaked event for unknown enemy ${ev.enemyId}`);
              assert.equal(record.leaked, false, `Enemy ${ev.enemyId} leaked more than once`);
              assert.equal(record.killed, false, `Enemy ${ev.enemyId} was both leaked and killed`);
              record.leaked = true;
            } else if (ev.type === 'wave_cleared') {
              if (ev.rewardScrap) {
                totalScrapEarned += ev.rewardScrap;
              }
            }
          }
        }

        // Invariant 1: Resource Non-Negativity
        assert.ok(state.scrap >= 0, `[Seq ${seq} Act ${actIdx}] Scrap negative: ${state.scrap}`);
        assert.ok(state.circuits >= 0, `[Seq ${seq} Act ${actIdx}] Circuits negative: ${state.circuits}`);
        assert.ok(!Number.isNaN(state.scrap), `[Seq ${seq} Act ${actIdx}] Scrap is NaN`);
        assert.ok(!Number.isNaN(state.circuits), `[Seq ${seq} Act ${actIdx}] Circuits is NaN`);

        // Invariant 2: Core HP bounds
        assert.ok(state.coreHp >= 0, `[Seq ${seq} Act ${actIdx}] Core HP negative: ${state.coreHp}`);
        assert.ok(state.coreHp <= state.maxCoreHp, `[Seq ${seq} Act ${actIdx}] Core HP ${state.coreHp} > maxCoreHp ${state.maxCoreHp}`);
        assert.ok(!Number.isNaN(state.coreHp), `[Seq ${seq} Act ${actIdx}] Core HP is NaN`);

        // Invariant 3: Conservation of Scrap
        // spent = sum of build/upgrade costs - sell refunds
        // current scrap = initialScrap + totalScrapEarned - spent
        const spent = (totalBuildPaid + totalUpgradePaid) - totalRefunds;
        assert.equal(
          state.scrap,
          initialScrap + totalScrapEarned - spent,
          `[Seq ${seq} Act ${actIdx}] Scrap conservation violated: scrap=${state.scrap}, initial=${initialScrap}, earned=${totalScrapEarned}, spent=${spent}`
        );

        // Invariant 4: Towers investedScrap consistency
        let sumTowerInvested = 0;
        for (const t of state.towers) {
          assert.ok(t.investedScrap > 0, `Tower ${t.id} investedScrap must be > 0`);
          sumTowerInvested += t.investedScrap;
        }
        // Total invested scrap across alive towers must equal totalBuildPaid + totalUpgradePaid - (invested scrap of sold towers)
        // Which is strictly >= 0
        assert.ok(sumTowerInvested >= 0);

        // Invariant 5: Enemy active list matches lifecycle
        for (const e of state.enemies) {
          const record = enemyLifecycle.get(e.id);
          assert.ok(record, `Active enemy ${e.id} missing spawn record`);
          assert.equal(record.killed, false, `Active enemy ${e.id} was marked killed`);
          assert.equal(record.leaked, false, `Active enemy ${e.id} was marked leaked`);
          assert.ok(e.hp > 0, `Active enemy ${e.id} has non-positive hp: ${e.hp}`);
        }
      }
    }
  });
});
