import mapData from '../data/map.json' with { type: 'json' };
import towersData from '../data/towers.json' with { type: 'json' };
import enemiesData from '../data/enemies.json' with { type: 'json' };
import wavesData from '../data/waves.json' with { type: 'json' };
import upgradesData from '../data/upgrades.json' with { type: 'json' };
import { mulberry32 } from './rng.js';

export { mulberry32 };

export const TICK_RATE = 60;
export const TICK_DT = 1 / TICK_RATE; // ~0.016666s
export const TICK_MS = 1000 / TICK_RATE; // ~16.666ms

/**
 * 32-bit FNV-1a hash of a UTF-8 string
 */
export function fnv1a32(str) {
  let hash = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash;
}

/**
 * Initialize a new simulation state.
 */
export function createGame(config = {}, seed = 12345) {
  const map = config.map || mapData;
  const towersConfig = config.towers || towersData;
  const enemiesConfig = config.enemies || enemiesData;
  const wavesConfig = config.waves || wavesData;
  const upgradesConfig = config.upgrades || upgradesData;

  const rng = mulberry32(seed);

  const unlockedTowers = [];
  for (const [id, t] of Object.entries(towersConfig.towers)) {
    if (t.unlockedByDefault) {
      unlockedTowers.push(id);
    }
  }

  return {
    tick: 0,
    simTime: 0,
    seed: seed >>> 0,
    rngSeedState: seed >>> 0,
    rng,
    scrap: map.startScrap,
    circuits: map.startCircuits,
    coreHp: map.core.hp,
    maxCoreHp: map.core.hp,
    wave: 0,
    waveState: 'idle', // 'idle' | 'spawning' | 'active' | 'cleared' | 'won' | 'lost'
    speed: 1,
    paused: false,
    accumulatorMs: 0,
    towers: [],
    enemies: [],
    projectiles: [],
    unlockedTowers,
    purchasedUpgrades: [],
    fabricatorCount: 0,
    events: [],
    stats: {
      enemiesKilled: 0,
      enemiesLeaked: 0,
      scrapEarned: 0,
      circuitsEarned: 0,
      towersBuilt: 0
    },
    config: {
      map,
      towers: towersConfig,
      enemies: enemiesConfig,
      waves: wavesConfig,
      upgrades: upgradesConfig
    }
  };
}

/**
 * Executes a single discrete 1/60s simulation tick.
 */
function tickSimulation(state) {
  state.tick++;
  state.simTime += TICK_DT;
  state.events = [];

  // 1. Process Fabricators
  for (const tower of state.towers) {
    if (tower.type === 'fabricator') {
      tower.circuitTicks = (tower.circuitTicks || 0) + 1;
      const intervalTicks = Math.round(8.0 * TICK_RATE); // 480 ticks = 8.0s
      if (tower.circuitTicks >= intervalTicks) {
        tower.circuitTicks -= intervalTicks;
        state.circuits += 1;
        state.stats.circuitsEarned += 1;
      }
    }
  }

  // 2. Check wave completion or win/loss
  if (state.coreHp <= 0 && state.waveState !== 'lost') {
    state.coreHp = 0;
    state.waveState = 'lost';
    state.events.push({ type: 'lost', wave: state.wave, coreHp: 0 });
  }
}

/**
 * Advances simulation by real-world delta time `dtMs`.
 */
export function step(state, dtMs) {
  if (state.paused || state.waveState === 'won' || state.waveState === 'lost') {
    return;
  }

  state.accumulatorMs += dtMs * state.speed;
  const maxSubSteps = 10;
  let subSteps = 0;

  while (state.accumulatorMs >= TICK_MS && subSteps < maxSubSteps) {
    state.accumulatorMs -= TICK_MS;
    tickSimulation(state);
    subSteps++;
  }
}

/**
 * Place a tower on a buildable cell.
 */
export function place(state, cell, towerType) {
  if (state.waveState === 'won' || state.waveState === 'lost') return null;

  const map = state.config.map;
  const isBuildable = map.buildableCells.some(c => c.col === cell.col && c.row === cell.row);
  if (!isBuildable) return null;

  const isOccupied = state.towers.some(t => t.col === cell.col && t.row === cell.row);
  if (isOccupied) return null;

  if (!state.unlockedTowers.includes(towerType)) return null;

  const def = state.config.towers.towers[towerType];
  if (!def) return null;

  const l1 = def.levels[0];
  let cost = l1.cost;
  if (state.purchasedUpgrades.includes('fast_assembly')) {
    cost = Math.floor(cost * 0.90);
  }

  if (state.scrap < cost) return null;

  if (towerType === 'fabricator') {
    if (state.fabricatorCount >= (map.maxFabricators || 4)) return null;
    state.fabricatorCount++;
  }

  state.scrap -= cost;
  state.stats.towersBuilt++;

  const towerId = `tower_${state.towers.length + 1}_${cell.col}_${cell.row}`;
  const tower = {
    id: towerId,
    type: towerType,
    col: cell.col,
    row: cell.row,
    level: 1,
    investedScrap: cost,
    cooldown: 0,
    circuitTimer: 0
  };

  state.towers.push(tower);
  state.events.push({ type: 'built', towerId, cell, towerType });
  return tower;
}

/**
 * Upgrade an existing tower.
 */
export function upgrade(state, towerId) {
  if (state.waveState === 'won' || state.waveState === 'lost') return false;

  const tower = state.towers.find(t => t.id === towerId);
  if (!tower) return false;

  const def = state.config.towers.towers[tower.type];
  if (!def || tower.level >= def.levels.length) return false;

  const currentLvlConfig = def.levels[tower.level - 1];
  let upgradeCost = currentLvlConfig.upgradeCost;
  if (upgradeCost <= 0) return false;

  if (state.purchasedUpgrades.includes('fast_assembly')) {
    upgradeCost = Math.floor(upgradeCost * 0.90);
  }

  if (state.scrap < upgradeCost) return false;

  state.scrap -= upgradeCost;
  tower.investedScrap += upgradeCost;
  tower.level += 1;

  state.events.push({ type: 'upgraded', towerId, newLevel: tower.level });
  return true;
}

/**
 * Sell a tower and refund 70% of invested Scrap.
 */
export function sell(state, towerId) {
  if (state.waveState === 'won' || state.waveState === 'lost') return false;

  const index = state.towers.findIndex(t => t.id === towerId);
  if (index === -1) return false;

  const tower = state.towers[index];
  const refundRatio = state.config.towers.sellRefundRatio || 0.70;
  const refund = Math.floor(tower.investedScrap * refundRatio);

  if (tower.type === 'fabricator') {
    state.fabricatorCount = Math.max(0, state.fabricatorCount - 1);
  }

  state.scrap += refund;
  state.towers.splice(index, 1);

  state.events.push({ type: 'sold', towerId, refundScrap: refund });
  return true;
}

/**
 * Trigger start of the next wave.
 */
export function startWave(state) {
  if (state.waveState === 'spawning' || state.waveState === 'active') return false;
  if (state.wave >= state.config.waves.totalWaves) return false;

  state.wave += 1;
  state.waveState = 'active';
  return true;
}

/**
 * Set simulation speed (1 or 2).
 */
export function setSpeed(state, n) {
  state.speed = n === 2 ? 2 : 1;
}

/**
 * Toggle simulation pause.
 */
export function togglePause(state) {
  state.paused = !state.paused;
}

/**
 * Purchase a Workshop upgrade or tower unlock.
 */
export function buyUpgrade(state, id) {
  const workshop = state.config.upgrades.workshop;

  // Check tower unlocks
  const unlockItem = workshop.unlocks.find(u => u.id === id);
  if (unlockItem) {
    if (state.unlockedTowers.includes(unlockItem.target)) return false;
    if (state.circuits < unlockItem.cost) return false;

    state.circuits -= unlockItem.cost;
    state.unlockedTowers.push(unlockItem.target);
    return true;
  }

  // Check global upgrades
  const globalUpgrade = workshop.globalUpgrades.find(g => g.id === id);
  if (globalUpgrade) {
    if (state.purchasedUpgrades.includes(id)) return false;
    if (state.circuits < globalUpgrade.cost) return false;

    state.circuits -= globalUpgrade.cost;
    state.purchasedUpgrades.push(id);

    if (id === 'repair_bay') {
      const bonus = globalUpgrade.effect.coreHpBonus || 5;
      state.maxCoreHp += bonus;
      state.coreHp = Math.min(state.coreHp + bonus, state.maxCoreHp);
    }
    return true;
  }

  return false;
}

/**
 * Read-only snapshot of current simulation state.
 */
export function snapshot(state) {
  return {
    tick: state.tick,
    simTime: state.simTime,
    scrap: state.scrap,
    circuits: state.circuits,
    coreHp: state.coreHp,
    maxCoreHp: state.maxCoreHp,
    wave: state.wave,
    totalWaves: state.config.waves.totalWaves,
    waveState: state.waveState,
    speed: state.speed,
    paused: state.paused,
    towers: state.towers.map(t => ({ ...t })),
    enemies: state.enemies.map(e => ({ ...e })),
    unlockedTowers: [...state.unlockedTowers],
    purchasedUpgrades: [...state.purchasedUpgrades],
    fabricatorCount: state.fabricatorCount,
    stats: { ...state.stats }
  };
}

/**
 * Deterministic JSON serialization of canonical state.
 */
export function serialize(state) {
  return JSON.stringify({
    tick: state.tick,
    seed: state.seed,
    scrap: state.scrap,
    circuits: state.circuits,
    coreHp: state.coreHp,
    maxCoreHp: state.maxCoreHp,
    wave: state.wave,
    waveState: state.waveState,
    towers: state.towers.map(t => ({ id: t.id, type: t.type, col: t.col, row: t.row, level: t.level })),
    enemies: state.enemies.map(e => ({ id: e.id, type: e.type, hp: e.hp, distance: e.distance })),
    unlockedTowers: [...state.unlockedTowers].sort(),
    purchasedUpgrades: [...state.purchasedUpgrades].sort()
  });
}

/**
 * Deterministic 32-bit hash of simulation state.
 */
export function hashState(state) {
  return fnv1a32(serialize(state));
}
