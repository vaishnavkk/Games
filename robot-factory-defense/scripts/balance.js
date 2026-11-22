/**
 * Robot Factory Defense — Headless Automated Simulation Bots & Balance Verification Suite
 *
 * Runs 300 seeds across multiple bot strategies:
 *  - Idle Bot: Verifies loss on or before Wave 3 (lossWave <= 3)
 *  - Random Bot: Verifies median wave between 3 and 7 (3 <= medianWave <= 7)
 *  - Monoculture Bots (Pulse, Coolant, Arc, Rocket): Verifies win rate <= 50%
 *  - Competent Bot: Verifies 60-85% win rate, median core HP 3-14, 40-75s wave duration
 *  - Tower Viability (No Dead Towers): Removing any one tower drops win rate by >= 5 points
 *  - Circuit Economy: 2 fabs <= 80% workshop by W15, 4 fabs >= 100%, 1 fab unlocks Arc by W6
 *  - Armour Relevance: Pulse L1 effective dmg against Crusher <= 50% nominal
 */

import {
  createGame,
  step,
  place,
  upgrade,
  startWave,
  buyUpgrade,
  setTowerTargetMode,
  TICK_MS
} from '../src/sim/index.js';

import mapData from '../src/data/map.json' with { type: 'json' };
import towersData from '../src/data/towers.json' with { type: 'json' };
import enemiesData from '../src/data/enemies.json' with { type: 'json' };
import wavesData from '../src/data/waves.json' with { type: 'json' };
import upgradesData from '../src/data/upgrades.json' with { type: 'json' };

export const SEED_COUNT = 300;
const TICK_DELTA_MS = TICK_MS || (1000 / 60);

// Helper for seeded pseudo-random within bot decisions
export function botRng(seed) {
  let s = (seed + 9999) >>> 0;
  return function() {
    s = (s * 1664525 + 1013904223) >>> 0;
    return (s >>> 0) / 4294967296;
  };
}

// Compute median of a numeric array
export function median(values) {
  if (!values || values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// Compute mean of a numeric array
export function mean(values) {
  if (!values || values.length === 0) return 0;
  const sum = values.reduce((a, b) => a + b, 0);
  return sum / values.length;
}

// Compute 95% Confidence Interval half-width
export function calcCI(p, n = SEED_COUNT) {
  const z = 1.96;
  const pNorm = p / 100;
  return z * Math.sqrt((pNorm * (1 - pNorm)) / n) * 100;
}

/**
 * Step until current wave finishes, core dies, game won/lost, or timeout
 */
export function stepUntilWaveComplete(state, maxSimSeconds = 180) {
  const maxTicks = maxSimSeconds * 60;
  let ticks = 0;
  const startSimTime = state.simTime || 0;

  while (
    state.waveState !== 'won' &&
    state.waveState !== 'lost' &&
    state.waveState !== 'cleared' &&
    ticks < maxTicks
  ) {
    step(state, TICK_DELTA_MS);
    ticks++;
  }

  const waveDuration = (state.simTime || 0) - startSimTime;
  return { ticks, waveDuration };
}

// ==========================================
// 1. IDLE BOT
// ==========================================
export function simulateIdleBot(seed) {
  const state = createGame({ map: mapData, towers: towersData, enemies: enemiesData, waves: wavesData, upgrades: upgradesData }, seed);
  const waveDurations = [];

  while (state.waveState !== 'won' && state.waveState !== 'lost' && state.wave < state.config.waves.totalWaves) {
    const started = startWave(state);
    if (!started && (state.waveState === 'won' || state.waveState === 'lost')) break;

    const { waveDuration } = stepUntilWaveComplete(state);
    waveDurations.push(waveDuration);
  }

  return {
    seed,
    won: state.waveState === 'won',
    finalWave: state.wave,
    lossWave: state.waveState === 'lost' ? state.wave : null,
    finalCoreHp: state.coreHp,
    waveDurations,
    stats: state.stats
  };
}

// ==========================================
// 2. RANDOM BOT
// ==========================================
export function simulateRandomBot(seed) {
  const state = createGame({ map: mapData, towers: towersData, enemies: enemiesData, waves: wavesData, upgrades: upgradesData }, seed);
  const rng = botRng(seed);
  const waveDurations = [];

  while (state.waveState !== 'won' && state.waveState !== 'lost' && state.wave < state.config.waves.totalWaves) {
    const map = state.config.map;
    const availableCells = map.buildableCells.filter(
      cell => !state.towers.some(t => t.col === cell.col && t.row === cell.row)
    );

    // Maybe try to buy a workshop upgrade
    if (rng() < 0.4 && state.circuits >= 20) {
      const candidates = ['unlock_arc', 'unlock_rocket', 'overclock', 'hardened_rounds', 'long_barrels', 'scrap_magnet', 'repair_bay', 'fast_assembly'];
      buyUpgrade(state, candidates[Math.floor(rng() * candidates.length)]);
    }

    // Try placing 1-3 random towers
    const placeAttempts = Math.floor(rng() * 3) + 1;
    for (let i = 0; i < placeAttempts && availableCells.length > 0; i++) {
      const cellIdx = Math.floor(rng() * availableCells.length);
      const cell = availableCells[cellIdx];
      const towerType = state.unlockedTowers[Math.floor(rng() * state.unlockedTowers.length)];
      if (towerType) {
        const placed = place(state, cell, towerType);
        if (placed) {
          availableCells.splice(cellIdx, 1);
        }
      }
    }

    // Try upgrading existing towers
    if (state.towers.length > 0 && rng() < 0.6) {
      const targetTower = state.towers[Math.floor(rng() * state.towers.length)];
      upgrade(state, targetTower.id);
    }

    const started = startWave(state);
    if (!started && (state.waveState === 'won' || state.waveState === 'lost')) break;

    const { waveDuration } = stepUntilWaveComplete(state);
    waveDurations.push(waveDuration);
  }

  return {
    seed,
    won: state.waveState === 'won',
    finalWave: state.wave,
    lossWave: state.waveState === 'lost' ? state.wave : null,
    finalCoreHp: state.coreHp,
    waveDurations,
    stats: state.stats
  };
}

// ==========================================
// 3. MONOCULTURE (SINGLE-TOWER) BOTS
// ==========================================
export function simulateSingleTowerBot(seed, towerType) {
  const state = createGame({ map: mapData, towers: towersData, enemies: enemiesData, waves: wavesData, upgrades: upgradesData }, seed);
  const rng = botRng(seed);
  const waveDurations = [];

  // For arc or rocket, grant unlock if locked by default to evaluate single-tower viability
  if (!state.unlockedTowers.includes(towerType)) {
    state.unlockedTowers.push(towerType);
  }

  const map = state.config.map;

  while (state.waveState !== 'won' && state.waveState !== 'lost' && state.wave < state.config.waves.totalWaves) {
    const availableCells = map.buildableCells.filter(
      cell => !state.towers.some(t => t.col === cell.col && t.row === cell.row)
    );

    // Place as many of this towerType as affordable
    let built = true;
    while (built && availableCells.length > 0) {
      const cellIdx = Math.floor(rng() * availableCells.length);
      const cell = availableCells[cellIdx];
      const res = place(state, cell, towerType);
      if (res) {
        availableCells.splice(cellIdx, 1);
      } else {
        built = false;
      }
    }

    // Upgrade existing towers
    for (const t of state.towers) {
      if (t.type === towerType && t.level < 3) {
        upgrade(state, t.id);
      }
    }

    const started = startWave(state);
    if (!started && (state.waveState === 'won' || state.waveState === 'lost')) break;

    const { waveDuration } = stepUntilWaveComplete(state);
    waveDurations.push(waveDuration);
  }

  return {
    seed,
    towerType,
    won: state.waveState === 'won',
    finalWave: state.wave,
    lossWave: state.waveState === 'lost' ? state.wave : null,
    finalCoreHp: state.coreHp,
    waveDurations,
    stats: state.stats
  };
}

// ==========================================
// 4. COMPETENT BOT
// ==========================================

const UTILITY_PADS = [
  { col: 1, row: 1 }, { col: 3, row: 1 }, { col: 5, row: 1 }, { col: 7, row: 1 }, { col: 9, row: 1 }, { col: 11, row: 1 }
];

const COOLANT_PADS = [
  { col: 11, row: 3 }, { col: 4, row: 6 }, { col: 13, row: 3 }, { col: 2, row: 6 }
];

const HEAVY_PADS = [
  { col: 6, row: 4 }, { col: 8, row: 4 }, { col: 6, row: 6 }, { col: 8, row: 6 },
  { col: 4, row: 4 }, { col: 10, row: 4 }, { col: 10, row: 6 }
];

const COMBAT_PADS = [
  { col: 3, row: 3 }, { col: 5, row: 3 }, { col: 7, row: 3 }, { col: 9, row: 3 },
  { col: 1, row: 3 }, { col: 13, row: 4 },
  { col: 5, row: 8 }, { col: 7, row: 8 }, { col: 9, row: 8 }, { col: 11, row: 8 }, { col: 13, row: 8 }
];

export function simulateCompetentBot(seed, excludedTower = null, options = {}) {
  const variationLevel = options.variationLevel ?? 0.25;
  const targeting = options.targeting ?? 'first';
  const workshopMode = options.workshopMode ?? 'all';
  const scrapScale = options.scrapScale ?? 1.0;
  const hpScale = options.hpScale ?? 1.0;

  const state = createGame({
    scrapMultiplier: scrapScale,
    hpMultiplier: hpScale,
    removedTower: excludedTower,
    workshopMode
  }, seed);

  const rng = botRng(seed);
  const waveDurations = [];
  const usedTowers = new Set();

  function canBuild(type) {
    if (excludedTower && type === excludedTower) return false;
    return state.unlockedTowers.includes(type);
  }

  function pickPad(pads) {
    const avail = pads.filter(c => !state.towers.some(t => t.col === c.col && t.row === c.row));
    if (avail.length === 0) return null;
    if (avail.length > 1 && rng() < variationLevel) {
      return avail[1];
    }
    return avail[0];
  }

  while (state.waveState !== 'won' && state.waveState !== 'lost' && state.wave < state.config.waves.totalWaves) {
    const nextWave = state.wave + 1;

    // Workshop purchases
    if (workshopMode === 'all') {
      if (!canBuild('arc') && excludedTower !== 'arc') {
        if (nextWave >= 5 && state.circuits >= 20) buyUpgrade(state, 'unlock_arc');
      } else if (!canBuild('rocket') && excludedTower !== 'rocket') {
        if (nextWave >= 7 && state.circuits >= 40) buyUpgrade(state, 'unlock_rocket');
      } else {
        if (state.circuits >= 30) buyUpgrade(state, 'fast_assembly');
        if (state.circuits >= 30) buyUpgrade(state, 'overclock');
        if (state.circuits >= 35) buyUpgrade(state, 'hardened_rounds');
        if (state.circuits >= 20) buyUpgrade(state, 'repair_bay');
        if (state.circuits >= 25) buyUpgrade(state, 'long_barrels');
        if (state.circuits >= 20) buyUpgrade(state, 'scrap_magnet');
      }
    } else if (workshopMode === 'none') {
      if (!canBuild('arc') && excludedTower !== 'arc') {
        if (nextWave >= 5 && state.circuits >= 20) buyUpgrade(state, 'unlock_arc');
      } else if (!canBuild('rocket') && excludedTower !== 'rocket') {
        if (nextWave >= 7 && state.circuits >= 40) buyUpgrade(state, 'unlock_rocket');
      }
    } else if (typeof workshopMode === 'string') {
      if (!canBuild('arc') && excludedTower !== 'arc') {
        if (nextWave >= 5 && state.circuits >= 20) buyUpgrade(state, 'unlock_arc');
      } else if (!canBuild('rocket') && excludedTower !== 'rocket') {
        if (nextWave >= 7 && state.circuits >= 40) buyUpgrade(state, 'unlock_rocket');
      } else {
        const u = state.config.upgrades.workshop.globalUpgrades.find(x => x.id === workshopMode);
        if (u && state.circuits >= u.cost) {
          buyUpgrade(state, workshopMode);
        }
      }
    }

    // 1. Initial Pulse Defense (W1): maintain 2
    if (nextWave === 1 && canBuild('pulse')) {
      while (state.towers.filter(t => t.type === 'pulse').length < 2 && state.scrap >= 60) {
        const p = pickPad(COMBAT_PADS) || pickPad(HEAVY_PADS);
        if (p && place(state, p, 'pulse')) usedTowers.add('pulse');
        else break;
      }
    }

    // 2. Fabricators (Economy): 1 on W2, 2 on W4, 3 on W6, 4 on W8
    const maxFabs = nextWave <= 1 ? 0 : (nextWave <= 3 ? 1 : (nextWave <= 5 ? 2 : (nextWave <= 7 ? 3 : 4)));
    if (canBuild('fabricator') && state.fabricatorCount < maxFabs && state.scrap >= 75) {
      while (state.fabricatorCount < maxFabs && state.scrap >= 75) {
        const p = pickPad(UTILITY_PADS) || pickPad(COMBAT_PADS);
        if (p && place(state, p, 'fabricator')) usedTowers.add('fabricator');
        else break;
      }
    }

    // 3. Coolant slow: 1 on W3, 2nd by W7
    const coolantTarget = nextWave >= 7 ? 2 : (nextWave >= 3 ? 1 : 0);
    if (canBuild('coolant') && state.towers.filter(t => t.type === 'coolant').length < coolantTarget && state.scrap >= 80) {
      const p = pickPad(COOLANT_PADS) || pickPad(COMBAT_PADS);
      if (p && place(state, p, 'coolant')) usedTowers.add('coolant');
    }

    // 4. Arc Coil: 2 starting W6
    if (nextWave >= 6 && canBuild('arc') && state.towers.filter(t => t.type === 'arc').length < 2 && state.scrap >= 100) {
      while (state.towers.filter(t => t.type === 'arc').length < 2 && state.scrap >= 100) {
        const p = pickPad(HEAVY_PADS) || pickPad(COMBAT_PADS);
        if (p) {
          const t = place(state, p, 'arc');
          if (t) {
            usedTowers.add('arc');
            if (targeting === 'nearest') setTowerTargetMode(state, t.id, 'nearest');
          } else break;
        } else break;
      }
    }

    // 5. Rocket Rack: 2 starting W8
    const rocketCost = state.config.towers.towers.rocket.levels[0].cost || 110;
    if (nextWave >= 8 && canBuild('rocket') && state.towers.filter(t => t.type === 'rocket').length < 2 && state.scrap >= rocketCost) {
      while (state.towers.filter(t => t.type === 'rocket').length < 2 && state.scrap >= rocketCost) {
        const p = pickPad(HEAVY_PADS) || pickPad(COMBAT_PADS);
        if (p) {
          const t = place(state, p, 'rocket');
          if (t) {
            usedTowers.add('rocket');
            if (targeting === 'nearest') setTowerTargetMode(state, t.id, 'nearest');
          } else break;
        } else break;
      }
    }

    // 6. Upgrades & Surplus (defer to W6+ to preserve early economy)
    if (nextWave >= 6) {
      for (const t of state.towers) {
        if (t.type === 'arc' && t.level < 3) upgrade(state, t.id);
        if (t.type === 'rocket' && t.level < 3) upgrade(state, t.id);
        if (t.type === 'pulse' && t.level < 3) upgrade(state, t.id);
        if (t.type === 'coolant' && t.level < 2) upgrade(state, t.id);
      }

      // 7. Honest Re-planning / Surplus
      if (excludedTower === 'rocket') {
        // S1: 4 Arcs, 4 Pulses (4th Pulse on W8+)
        while (state.scrap >= 100 && canBuild('arc') && state.towers.filter(t => t.type === 'arc').length < 4) {
          const p = pickPad(HEAVY_PADS) || pickPad(COMBAT_PADS);
          if (p) {
            const t = place(state, p, 'arc');
            if (t) {
              usedTowers.add('arc');
              if (targeting === 'nearest') setTowerTargetMode(state, t.id, 'nearest');
            } else break;
          } else break;
        }
        const maxP = nextWave >= 8 ? 4 : 3;
        while (state.scrap >= 60 && canBuild('pulse') && state.towers.filter(t => t.type === 'pulse').length < maxP) {
          const p = pickPad(COMBAT_PADS) || pickPad(UTILITY_PADS);
          if (p && place(state, p, 'pulse')) usedTowers.add('pulse');
          else break;
        }
      } else if (excludedTower === 'arc') {
        // S3: 4 Rockets (4th Rocket on W14+), 3 Pulses
        const maxR = nextWave >= 14 ? 4 : 3;
        while (state.scrap >= rocketCost && canBuild('rocket') && state.towers.filter(t => t.type === 'rocket').length < maxR) {
          const p = pickPad(HEAVY_PADS) || pickPad(COMBAT_PADS);
          if (p) {
            const t = place(state, p, 'rocket');
            if (t) {
              usedTowers.add('rocket');
              if (targeting === 'nearest') setTowerTargetMode(state, t.id, 'nearest');
            } else break;
          } else break;
        }
        while (nextWave >= 10 && state.scrap >= 60 && canBuild('pulse') && state.towers.filter(t => t.type === 'pulse').length < 3) {
          const p = pickPad(COMBAT_PADS) || pickPad(UTILITY_PADS);
          if (p && place(state, p, 'pulse')) usedTowers.add('pulse');
          else break;
        }
      } else if (excludedTower === 'coolant') {
        // S2: 3 Arcs, 2-3 Rockets, 3 Pulses
        const maxR = nextWave >= 10 ? 3 : 2;
        while (state.scrap >= rocketCost && canBuild('rocket') && state.towers.filter(t => t.type === 'rocket').length < maxR) {
          const p = pickPad(HEAVY_PADS) || pickPad(COMBAT_PADS);
          if (p) {
            const t = place(state, p, 'rocket');
            if (t) {
              usedTowers.add('rocket');
              if (targeting === 'nearest') setTowerTargetMode(state, t.id, 'nearest');
            } else break;
          } else break;
        }
        while (state.scrap >= 100 && canBuild('arc') && state.towers.filter(t => t.type === 'arc').length < 3) {
          const p = pickPad(HEAVY_PADS) || pickPad(COMBAT_PADS);
          if (p) {
            const t = place(state, p, 'arc');
            if (t) {
              usedTowers.add('arc');
              if (targeting === 'nearest') setTowerTargetMode(state, t.id, 'nearest');
            } else break;
          } else break;
        }
        while (nextWave >= 10 && state.scrap >= 60 && canBuild('pulse') && state.towers.filter(t => t.type === 'pulse').length < 3) {
          const p = pickPad(COMBAT_PADS) || pickPad(UTILITY_PADS);
          if (p && place(state, p, 'pulse')) usedTowers.add('pulse');
          else break;
        }
      } else if (excludedTower === 'pulse') {
        while (state.scrap >= 80 && canBuild('coolant') && state.towers.filter(t => t.type === 'coolant').length < 2) {
          const p = pickPad(COOLANT_PADS) || pickPad(COMBAT_PADS);
          if (p && place(state, p, 'coolant')) usedTowers.add('coolant');
          else break;
        }
      } else if (excludedTower === 'fabricator') {
        while (state.scrap >= 60 && canBuild('pulse') && state.towers.filter(t => t.type === 'pulse').length < 5) {
          const p = pickPad(COMBAT_PADS) || pickPad(HEAVY_PADS);
          if (p && place(state, p, 'pulse')) usedTowers.add('pulse');
          else break;
        }
      } else {
        // Default surplus: 3rd Arc, 3rd Pulse
        while (state.scrap >= 100 && canBuild('arc') && state.towers.filter(t => t.type === 'arc').length < 3) {
          const p = pickPad(HEAVY_PADS) || pickPad(COMBAT_PADS);
          if (p) {
            const t = place(state, p, 'arc');
            if (t) {
              usedTowers.add('arc');
              if (targeting === 'nearest') setTowerTargetMode(state, t.id, 'nearest');
            } else break;
          } else break;
        }
        while (nextWave >= 10 && state.scrap >= 60 && canBuild('pulse') && state.towers.filter(t => t.type === 'pulse').length < 3) {
          const p = pickPad(COMBAT_PADS) || pickPad(UTILITY_PADS);
          if (p && place(state, p, 'pulse')) usedTowers.add('pulse');
          else break;
        }
      }
    }

    state.towers.forEach(t => usedTowers.add(t.type));
    const started = startWave(state);
    if (!started && (state.waveState === 'won' || state.waveState === 'lost')) break;

    const { waveDuration } = stepUntilWaveComplete(state);
    waveDurations.push(waveDuration);
  }

  return {
    seed,
    excludedTower,
    won: state.waveState === 'won',
    finalWave: state.wave,
    lossWave: state.waveState === 'lost' ? state.wave : null,
    finalCoreHp: state.coreHp,
    waveDurations,
    towers: state.towers.map(t => ({ id: t.id, type: t.type, level: t.level, col: t.col, row: t.row })),
    purchasedUpgrades: [...state.purchasedUpgrades],
    usedTowers: Array.from(usedTowers),
    stats: state.stats
  };
}

// ==========================================
// 5. CIRCUIT ECONOMY & INVARIANTS CHECKS
// ==========================================
export function verifyCircuitEconomy(avgWaveDuration = 48) {
  const totalWorkshop = 220; // 160 upgrades + 60 unlocks

  // 1 Fabricator on Wave 1: can it unlock Arc Coil (20 circuits) on or before W6?
  const timeByW6 = 6 * avgWaveDuration;
  const circuitsByW6_1Fab = Math.floor(timeByW6 / 10);
  const w6Check = circuitsByW6_1Fab >= 20;

  // 2 Fabricators by W15: affords <= 80% of total Workshop (176 circuits)
  const totalGameTime = 15 * avgWaveDuration;
  const circuits_2Fabs = Math.floor((2 * totalGameTime) / 10);
  const twoFabsCheck = circuits_2Fabs <= 0.80 * totalWorkshop;

  // 4 Fabricators by W15: affords >= 100% of total Workshop (220 circuits)
  const circuits_4Fabs = Math.floor((4 * totalGameTime) / 10);
  const fourFabsCheck = circuits_4Fabs >= totalWorkshop;

  return {
    w6Check,
    circuitsByW6_1Fab,
    twoFabsCheck,
    circuits_2Fabs,
    fourFabsCheck,
    circuits_4Fabs,
    totalWorkshop
  };
}

export function verifyArmourRelevance() {
  const pulseL1Damage = towersData.towers.pulse.levels[0].damage; // 12
  const crusherArmour = enemiesData.enemies.crusher_tank.armour; // 6
  const effectiveDamage = Math.max(1, pulseL1Damage - crusherArmour); // 6
  const damageRatio = effectiveDamage / pulseL1Damage; // 0.50 (50%)
  const passes = damageRatio <= 0.50;

  return {
    pulseL1Damage,
    crusherArmour,
    effectiveDamage,
    damageRatio,
    passes
  };
}

// ==========================================
// 6. MAIN VERIFICATION RUNNER
// ==========================================
export function runBalanceVerificationSuite(seedCount = SEED_COUNT) {
  console.log('=======================================================');
  console.log(`ROBOT FACTORY DEFENSE — AUTOMATED BALANCE MATRIX (${seedCount} SEEDS)`);
  console.log('=======================================================\n');

  const seeds = Array.from({ length: seedCount }, (_, i) => 1000 + i);

  // 1. Idle Bot
  console.log(`[1/8] Simulating Idle Bot (${seedCount} seeds)...`);
  const idleResults = seeds.map(s => simulateIdleBot(s));
  const idleLossWaves = idleResults.map(r => r.lossWave || 15);
  const maxIdleLossWave = Math.max(...idleLossWaves);
  const idleMedianLossWave = median(idleLossWaves);

  // 2. Random Bot
  console.log(`[2/8] Simulating Random Bot (${seedCount} seeds)...`);
  const randomResults = seeds.map(s => simulateRandomBot(s));
  const randomFinalWaves = randomResults.map(r => r.finalWave);
  const randomMedianWave = median(randomFinalWaves);
  const randomWinRate = (randomResults.filter(r => r.won).length / seedCount) * 100;

  // 3. Monoculture Bots
  console.log('[3/8] Simulating Monoculture Bots (Pulse, Coolant, Arc, Rocket)...');
  const monocultureTypes = ['pulse', 'coolant', 'arc', 'rocket'];
  const monoStats = {};
  for (const t of monocultureTypes) {
    const runs = seeds.map(s => simulateSingleTowerBot(s, t));
    const wins = runs.filter(r => r.won).length;
    monoStats[t] = {
      winRate: (wins / seedCount) * 100,
      medianWave: median(runs.map(r => r.finalWave))
    };
  }

  // 4. Competent Bot (Bot v1 'first' default)
  console.log(`[4/8] Simulating Competent Bot v1 (first targeting, ${seedCount} seeds)...`);
  const competentRuns = seeds.map(s => simulateCompetentBot(s, null, { targeting: 'first' }));
  const compWins = competentRuns.filter(r => r.won);
  const compWinRate = (compWins.length / seedCount) * 100;
  const compCI = calcCI(compWinRate, seedCount);
  const compMedianFinalHp = median(compWins.map(r => r.finalCoreHp));

  // Bot v2 comparison ('nearest' targeting)
  console.log(`[5/8] Simulating Competent Bot v2 (nearest targeting, ${seedCount} seeds)...`);
  const v2Runs = seeds.map(s => simulateCompetentBot(s, null, { targeting: 'nearest' }));
  const v2Wins = v2Runs.filter(r => r.won);
  const v2WinRate = (v2Wins.length / seedCount) * 100;
  const v2CI = calcCI(v2WinRate, seedCount);

  const allWaveDurations = compWins.flatMap(r => r.waveDurations);
  const meanWaveDur = mean(allWaveDurations);
  const medianWaveDur = median(allWaveDurations);
  const gameDurationsMinutes = compWins.map(r => r.waveDurations.reduce((a, b) => a + b, 0) / 60);
  const meanGameDurMin = mean(gameDurationsMinutes);

  const usedTowersSet = new Set();
  compWins.forEach(r => r.usedTowers.forEach(t => usedTowersSet.add(t)));
  const allTowersUsed = ['pulse', 'coolant', 'arc', 'rocket', 'fabricator'].every(t => usedTowersSet.has(t));

  // 5. Honest Tower Viability & Re-planning Ablation
  console.log('[6/8] Simulating Honest Tower Removal & Re-planning (Pulse, Coolant, Arc, Rocket, Fabricator)...');
  const exclusions = ['pulse', 'coolant', 'arc', 'rocket', 'fabricator'];
  const exclusionStats = {};
  for (const exc of exclusions) {
    const runs = seeds.map(s => simulateCompetentBot(s, exc, { targeting: 'first' }));
    const wins = runs.filter(r => r.won).length;
    const rate = (wins / seedCount) * 100;
    const rateCI = calcCI(rate, seedCount);
    const drop = compWinRate - rate;
    const medWave = median(runs.map(r => r.finalWave));
    exclusionStats[exc] = {
      winRate: rate,
      ci: rateCI,
      drop,
      medWave
    };
  }

  // Viable Subsets S1, S2, S3 assertions
  const s1Rate = exclusionStats.rocket.winRate; // Pulse+Coolant+Arc+Fab
  const s2Rate = exclusionStats.coolant.winRate; // Pulse+Arc+Rocket+Fab
  const s3Rate = exclusionStats.arc.winRate; // Pulse+Coolant+Rocket+Fab

  // 6. Sensitivity Matrix
  console.log('[7/8] Simulating Sensitivity Matrix (Scrap 0.8-1.2, HP 0.9-1.2)...');
  const scrapSteps = [0.8, 1.0, 1.2];
  const scrapRates = {};
  for (const ss of scrapSteps) {
    const runs = seeds.map(s => simulateCompetentBot(s, null, { targeting: 'first', scrapScale: ss }));
    scrapRates[ss] = (runs.filter(r => r.won).length / seedCount) * 100;
  }
  const scrapMaxDelta = Math.max(
    Math.abs(scrapRates[1.0] - scrapRates[0.8]),
    Math.abs(scrapRates[1.2] - scrapRates[1.0])
  );

  const hpSteps = [0.9, 1.0, 1.1, 1.2];
  const hpRates = {};
  for (const hs of hpSteps) {
    const runs = seeds.map(s => simulateCompetentBot(s, null, { targeting: 'first', hpScale: hs }));
    hpRates[hs] = (runs.filter(r => r.won).length / seedCount) * 100;
  }
  const hpMaxDelta = Math.max(
    Math.abs(hpRates[1.0] - hpRates[0.9]),
    Math.abs(hpRates[1.1] - hpRates[1.0]),
    Math.abs(hpRates[1.2] - hpRates[1.1])
  );

  // 7. Workshop Upgrades Matrix
  console.log('[8/8] Simulating Workshop Upgrades Matrix (None vs Single)...');
  const noUpgradesRuns = seeds.map(s => simulateCompetentBot(s, null, { targeting: 'first', workshopMode: 'none' }));
  const noUpgradesRate = (noUpgradesRuns.filter(r => r.won).length / seedCount) * 100;
  const noUpgradesMedWave = median(noUpgradesRuns.map(r => r.finalWave));

  const singleUpgrades = ['overclock', 'hardened_rounds', 'long_barrels', 'scrap_magnet', 'repair_bay', 'fast_assembly'];
  const singleUpgradeStats = {};
  let maxSingleGain = 0;
  for (const u of singleUpgrades) {
    const runs = seeds.map(s => simulateCompetentBot(s, null, { targeting: 'first', workshopMode: u }));
    const rate = (runs.filter(r => r.won).length / seedCount) * 100;
    const gain = rate - noUpgradesRate;
    if (gain > maxSingleGain) maxSingleGain = gain;
    singleUpgradeStats[u] = { rate, gain };
  }

  // Economy & Armour
  const economy = verifyCircuitEconomy(meanWaveDur);
  const armour = verifyArmourRelevance();

  // Verification Gates
  const gates = [
    {
      name: 'Idle Bot loss on/before W3',
      target: 'maxLossWave <= 3',
      actual: `maxLossWave = ${maxIdleLossWave}`,
      pass: maxIdleLossWave <= 3
    },
    {
      name: 'Random Bot median wave 3-7',
      target: '3 <= medianWave <= 7',
      actual: `medianWave = ${randomMedianWave}`,
      pass: randomMedianWave >= 3 && randomMedianWave <= 7
    },
    {
      name: 'Pulse-Only win rate <= 50%',
      target: '<= 50%',
      actual: `${monoStats.pulse.winRate.toFixed(1)}%`,
      pass: monoStats.pulse.winRate <= 50
    },
    {
      name: 'Coolant-Only win rate <= 50%',
      target: '<= 50%',
      actual: `${monoStats.coolant.winRate.toFixed(1)}%`,
      pass: monoStats.coolant.winRate <= 50
    },
    {
      name: 'Arc-Only win rate <= 50%',
      target: '<= 50%',
      actual: `${monoStats.arc.winRate.toFixed(1)}%`,
      pass: monoStats.arc.winRate <= 50
    },
    {
      name: 'Rocket-Only win rate <= 50%',
      target: '<= 50%',
      actual: `${monoStats.rocket.winRate.toFixed(1)}%`,
      pass: monoStats.rocket.winRate <= 50
    },
    {
      name: 'Competent Bot win rate 60-85%',
      target: '60% - 85%',
      actual: `${compWinRate.toFixed(1)}% ± ${compCI.toFixed(1)}%`,
      pass: compWinRate >= 60 && compWinRate <= 85 && compCI <= 6.0
    },
    {
      name: 'Competent Bot median winning Core HP 3-14',
      target: '3 <= HP <= 14',
      actual: `HP = ${compMedianFinalHp}`,
      pass: compMedianFinalHp >= 3 && compMedianFinalHp <= 14
    },
    {
      name: 'Mean wave duration 40-75s',
      target: '40s - 75s',
      actual: `${meanWaveDur.toFixed(1)}s`,
      pass: meanWaveDur >= 40 && meanWaveDur <= 75
    },
    {
      name: 'All 5 towers utilized in winning runs',
      target: 'true',
      actual: String(allTowersUsed),
      pass: allTowersUsed
    },
    {
      name: 'Viability: Remove Pulse drops win rate >= 5 pts',
      target: 'drop >= 5.0 pts',
      actual: `drop = ${exclusionStats.pulse.drop.toFixed(1)} pts`,
      pass: exclusionStats.pulse.drop >= 5.0
    },
    {
      name: 'Viability: Remove Coolant drops win rate >= 5 pts',
      target: 'drop >= 5.0 pts',
      actual: `drop = ${exclusionStats.coolant.drop.toFixed(1)} pts`,
      pass: exclusionStats.coolant.drop >= 5.0
    },
    {
      name: 'Viability: Remove Arc drops win rate >= 5 pts',
      target: 'drop >= 5.0 pts',
      actual: `drop = ${exclusionStats.arc.drop.toFixed(1)} pts`,
      pass: exclusionStats.arc.drop >= 5.0
    },
    {
      name: 'Viability: Remove Rocket drops win rate >= 5 pts',
      target: 'drop >= 5.0 pts',
      actual: `drop = ${exclusionStats.rocket.drop.toFixed(1)} pts`,
      pass: exclusionStats.rocket.drop >= 5.0
    },
    {
      name: 'Viability: Remove Fabricator drops win rate >= 5 pts',
      target: 'drop >= 5.0 pts',
      actual: `drop = ${exclusionStats.fabricator.drop.toFixed(1)} pts`,
      pass: exclusionStats.fabricator.drop >= 5.0
    },
    {
      name: 'Viable strategies S1-S3 win rate >= 30%',
      target: 'S1, S2, S3 >= 30%',
      actual: `S1=${s1Rate.toFixed(1)}%, S2=${s2Rate.toFixed(1)}%, S3=${s3Rate.toFixed(1)}%`,
      pass: s1Rate >= 30 && s2Rate >= 30 && s3Rate >= 30
    },
    {
      name: 'Sensitivity: max scrap delta <= 30 pts',
      target: '<= 30.0 pts',
      actual: `maxDelta = ${scrapMaxDelta.toFixed(1)} pts`,
      pass: scrapMaxDelta <= 30.0
    },
    {
      name: 'Sensitivity: max HP delta <= 30 pts',
      target: '<= 30.0 pts',
      actual: `maxDelta = ${hpMaxDelta.toFixed(1)} pts`,
      pass: hpMaxDelta <= 30.0
    },
    {
      name: 'Workshop: no single upgrade alone gains > 60 pts',
      target: '<= 60.0 pts',
      actual: `maxGain = ${maxSingleGain.toFixed(1)} pts`,
      pass: maxSingleGain <= 60.0
    },
    {
      name: 'Armour: Pulse L1 dmg vs Crusher <= 50% nominal',
      target: '<= 50%',
      actual: `${(armour.damageRatio * 100).toFixed(1)}% (${armour.effectiveDamage}/${armour.pulseL1Damage})`,
      pass: armour.passes
    },
    {
      name: 'Economy: 1 Fab unlocks Arc by W6',
      target: '>= 20 circuits',
      actual: `${economy.circuitsByW6_1Fab} circuits`,
      pass: economy.w6Check
    },
    {
      name: 'Economy: 2 Fabs by W15 affords <= 80% workshop',
      target: '<= 80% (176 circuits)',
      actual: `${economy.circuits_2Fabs} circuits (${((economy.circuits_2Fabs / economy.totalWorkshop) * 100).toFixed(0)}%)`,
      pass: economy.twoFabsCheck
    },
    {
      name: 'Economy: 4 Fabs by W15 affords >= 100% workshop',
      target: '>= 100% (220 circuits)',
      actual: `${economy.circuits_4Fabs} circuits (${((economy.circuits_4Fabs / economy.totalWorkshop) * 100).toFixed(0)}%)`,
      pass: economy.fourFabsCheck
    }
  ];

  console.log('\n=======================================================');
  console.log('SIMULATION RESULTS SUMMARY');
  console.log('=======================================================');
  console.log('| Bot Strategy        | Win Rate (%) | Median Wave | Median Core HP | Target Gate | Result |');
  console.log('|---------------------|--------------|-------------|----------------|-------------|--------|');
  console.log(`| Idle Bot            | ${'0.0%'.padStart(12)} | ${String(idleMedianLossWave).padStart(11)} | ${'N/A'.padStart(14)} | Wave <= 3   | ${maxIdleLossWave <= 3 ? 'PASS' : 'FAIL'}   |`);
  console.log(`| Random Bot          | ${(randomWinRate.toFixed(1) + '%').padStart(12)} | ${String(randomMedianWave).padStart(11)} | ${'N/A'.padStart(14)} | Wave 3-7    | ${randomMedianWave >= 3 && randomMedianWave <= 7 ? 'PASS' : 'FAIL'}   |`);
  console.log(`| Pulse-Only Bot      | ${(monoStats.pulse.winRate.toFixed(1) + '%').padStart(12)} | ${String(monoStats.pulse.medianWave).padStart(11)} | ${'N/A'.padStart(14)} | Win <= 50%  | ${monoStats.pulse.winRate <= 50 ? 'PASS' : 'FAIL'}   |`);
  console.log(`| Coolant-Only Bot    | ${(monoStats.coolant.winRate.toFixed(1) + '%').padStart(12)} | ${String(monoStats.coolant.medianWave).padStart(11)} | ${'N/A'.padStart(14)} | Win <= 50%  | ${monoStats.coolant.winRate <= 50 ? 'PASS' : 'FAIL'}   |`);
  console.log(`| Arc-Only Bot        | ${(monoStats.arc.winRate.toFixed(1) + '%').padStart(12)} | ${String(monoStats.arc.medianWave).padStart(11)} | ${'N/A'.padStart(14)} | Win <= 50%  | ${monoStats.arc.winRate <= 50 ? 'PASS' : 'FAIL'}   |`);
  console.log(`| Rocket-Only Bot     | ${(monoStats.rocket.winRate.toFixed(1) + '%').padStart(12)} | ${String(monoStats.rocket.medianWave).padStart(11)} | ${'N/A'.padStart(14)} | Win <= 50%  | ${monoStats.rocket.winRate <= 50 ? 'PASS' : 'FAIL'}   |`);
  console.log(`| Competent Bot v1    | ${(compWinRate.toFixed(1) + '%').padStart(12)} | ${'15'.padStart(11)} | ${String(compMedianFinalHp).padStart(14)} | 60-85% win  | ${compWinRate >= 60 && compWinRate <= 85 ? 'PASS' : 'FAIL'}   |`);
  console.log(`| Competent Bot v2    | ${(v2WinRate.toFixed(1) + '%').padStart(12)} | ${'15'.padStart(11)} | ${'N/A'.padStart(14)} | Comparison  | INFO   |`);

  console.log('\n--- Tower Viability & Honest Re-planning Ablation ---');
  console.log(`Competent Full Win Rate:      ${compWinRate.toFixed(1)}% ± ${compCI.toFixed(1)}%`);
  for (const exc of exclusions) {
    const s = exclusionStats[exc];
    console.log(`Excluding ${exc.padEnd(10)} Win Rate: ${s.winRate.toFixed(1).padStart(5)}% (Drop: -${s.drop.toFixed(1)} pts, Med Wave: ${s.medWave}) -> ${s.drop >= 5.0 ? 'PASS' : 'FAIL'}`);
  }
  console.log(`Subset S1 (No Rocket):  ${s1Rate.toFixed(1)}% (Target >= 30%) -> ${s1Rate >= 30 ? 'PASS' : 'FAIL'}`);
  console.log(`Subset S2 (No Coolant): ${s2Rate.toFixed(1)}% (Target >= 30%) -> ${s2Rate >= 30 ? 'PASS' : 'FAIL'}`);
  console.log(`Subset S3 (No Arc):     ${s3Rate.toFixed(1)}% (Target >= 30%) -> ${s3Rate >= 30 ? 'PASS' : 'FAIL'}`);

  console.log('\n--- Sensitivity Matrix ---');
  console.log(`Start Scrap x0.8: ${scrapRates[0.8].toFixed(1)}% | x1.0: ${scrapRates[1.0].toFixed(1)}% | x1.2: ${scrapRates[1.2].toFixed(1)}% (Max Delta: ${scrapMaxDelta.toFixed(1)} pts <= 30) -> ${scrapMaxDelta <= 30 ? 'PASS' : 'FAIL'}`);
  console.log(`Enemy HP x0.9: ${hpRates[0.9].toFixed(1)}% | x1.0: ${hpRates[1.0].toFixed(1)}% | x1.1: ${hpRates[1.1].toFixed(1)}% | x1.2: ${hpRates[1.2].toFixed(1)}% (Max Delta: ${hpMaxDelta.toFixed(1)} pts <= 30) -> ${hpMaxDelta <= 30 ? 'PASS' : 'FAIL'}`);

  console.log('\n--- Workshop Upgrades Matrix ---');
  console.log(`No Upgrades Bot: ${noUpgradesRate.toFixed(1)}% (Median Wave: ${noUpgradesMedWave})`);
  for (const u of singleUpgrades) {
    const s = singleUpgradeStats[u];
    console.log(`Single ${u.padEnd(16)}: ${s.rate.toFixed(1)}% (Gain vs None: +${s.gain.toFixed(1)} pts)`);
  }

  console.log('\n--- Wave & Game Durations ---');
  console.log(`Mean Wave Duration:           ${meanWaveDur.toFixed(1)}s (Target: 40-75s) -> ${meanWaveDur >= 40 && meanWaveDur <= 75 ? 'PASS' : 'FAIL'}`);
  console.log(`Median Wave Duration:         ${medianWaveDur.toFixed(1)}s`);
  console.log(`Mean Game Duration:           ${meanGameDurMin.toFixed(1)} min (Target: 12-20 min) -> ${Number(meanGameDurMin.toFixed(1)) >= 12 && Number(meanGameDurMin.toFixed(1)) <= 20 ? 'PASS' : 'FAIL'}`);
  console.log(`All Towers Utilized in Wins:  ${allTowersUsed ? 'YES (PASS)' : 'NO (FAIL)'}`);

  console.log('\n--- Circuit Economy & Armour Relevance ---');
  console.log(`1 Fab unlocks Arc by W6:      ${economy.circuitsByW6_1Fab} circuits (Target >= 20) -> ${economy.w6Check ? 'PASS' : 'FAIL'}`);
  console.log(`2 Fabs by W15 affords <=80%:  ${economy.circuits_2Fabs} circuits (${((economy.circuits_2Fabs / economy.totalWorkshop) * 100).toFixed(0)}% <= 80%) -> ${economy.twoFabsCheck ? 'PASS' : 'FAIL'}`);
  console.log(`4 Fabs by W15 affords >=100%: ${economy.circuits_4Fabs} circuits (${((economy.circuits_4Fabs / economy.totalWorkshop) * 100).toFixed(0)}% >= 100%) -> ${economy.fourFabsCheck ? 'PASS' : 'FAIL'}`);
  console.log(`Pulse L1 vs Crusher Armour:   ${armour.effectiveDamage} dmg (${(armour.damageRatio * 100).toFixed(0)}% of nominal <= 50%) -> ${armour.passes ? 'PASS' : 'FAIL'}`);

  console.log('\n=======================================================');
  console.log('ALL INVARIANT GATES VERIFICATION');
  console.log('=======================================================');
  let allPassed = true;
  for (const g of gates) {
    const status = g.pass ? '[PASS]' : '[FAIL]';
    if (!g.pass) allPassed = false;
    console.log(`${status.padEnd(7)} ${g.name.padEnd(50)} | Target: ${g.target.padEnd(24)} | Actual: ${g.actual}`);
  }

  console.log('=======================================================');
  console.log(`OVERALL STATUS: ${allPassed ? 'ALL GATES PASSED (100% OK)' : 'FAILURES DETECTED'}`);
  console.log('=======================================================\n');

  return {
    allPassed,
    gates,
    compWinRate,
    compCI,
    v2WinRate,
    v2CI,
    compMedianFinalHp,
    meanWaveDur,
    meanGameDurMin,
    exclusionStats,
    monoStats,
    idleMedianLossWave,
    maxIdleLossWave,
    randomMedianWave,
    scrapRates,
    hpRates,
    noUpgradesRate,
    singleUpgradeStats,
    economy,
    armour
  };
}

// Execute when invoked directly
if (process.argv[1] && (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}` || import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/')))) {
  const result = runBalanceVerificationSuite(SEED_COUNT);
  if (!result.allPassed) {
    process.exit(1);
  }
}
