import mapData from '../data/map.json' with { type: 'json' };
import towersData from '../data/towers.json' with { type: 'json' };
import enemiesData from '../data/enemies.json' with { type: 'json' };
import wavesData from '../data/waves.json' with { type: 'json' };
import upgradesData from '../data/upgrades.json' with { type: 'json' };
import { mulberry32 } from './rng.js';

export { mulberry32 };

export const TICK_RATE = 60;
export const TICK_DT = 1 / TICK_RATE; // ~0.016666666666666666s
export const TICK_MS = 1000 / TICK_RATE; // ~16.666666666666668ms

/**
 * 32-bit FNV-1a hash of a UTF-8 string
 */
export function fnv1a32(str) {
  let hash = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash >>> 0;
}

/**
 * Compute waypoint path segments and total distance in cells.
 */
export function computeWaypoints(waypoints) {
  const segments = [];
  let totalDistance = 0;
  for (let i = 0; i < waypoints.length - 1; i++) {
    const p1 = waypoints[i];
    const p2 = waypoints[i + 1];
    const x1 = p1.col + 0.5;
    const y1 = p1.row + 0.5;
    const x2 = p2.col + 0.5;
    const y2 = p2.row + 0.5;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    segments.push({
      x1,
      y1,
      x2,
      y2,
      dx,
      dy,
      len,
      startDist: totalDistance,
      endDist: totalDistance + len
    });
    totalDistance += len;
  }
  return { segments, totalDistance };
}

/**
 * Get grid coordinates (x, y) along path segments for a given distance.
 */
export function getPositionAlongPath(distance, segments, totalDistance) {
  if (!segments || segments.length === 0) return { x: 0, y: 0 };
  if (distance <= 0) return { x: segments[0].x1, y: segments[0].y1 };
  if (distance >= totalDistance) {
    const last = segments[segments.length - 1];
    return { x: last.x2, y: last.y2 };
  }
  for (const seg of segments) {
    if (distance <= seg.endDist) {
      const segT = (distance - seg.startDist) / seg.len;
      return {
        x: seg.x1 + seg.dx * segT,
        y: seg.y1 + seg.dy * segT
      };
    }
  }
  const last = segments[segments.length - 1];
  return { x: last.x2, y: last.y2 };
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
  const { segments, totalDistance } = computeWaypoints(map.waypoints);

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
    nextTowerId: 0,
    nextEnemyId: 0,
    nextProjectileId: 0,
    spawner: [],
    events: [],
    pathSegments: segments,
    totalPathDistance: totalDistance,
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
 * Process enemy death and award scrap reward.
 */
function handleEnemyKill(state, enemy) {
  if (enemy.isDead) return;
  enemy.isDead = true;
  enemy.hp = 0;

  let scrapReward = enemy.scrap;
  if (state.purchasedUpgrades.includes('scrap_magnet')) {
    scrapReward = Math.round(scrapReward * 1.20);
  }

  state.scrap += scrapReward;
  state.stats.scrapEarned += scrapReward;
  state.stats.enemiesKilled += 1;
  state.events.push({ type: 'killed', enemyId: enemy.id, scrapReward });
}

/**
 * Spawn an enemy into the simulation.
 */
function spawnEnemy(state, enemyType) {
  const def = state.config.enemies.enemies[enemyType];
  if (!def) return;

  const enemyId = `enemy_${++state.nextEnemyId}_${enemyType}`;
  const startPos = getPositionAlongPath(0, state.pathSegments, state.totalPathDistance);

  const enemy = {
    id: enemyId,
    type: enemyType,
    name: def.name,
    hp: def.hp,
    maxHp: def.hp,
    speed: def.speed,
    armour: def.armour,
    scrap: def.scrap,
    leakDamage: def.leakDamage,
    isBoss: !!def.isBoss,
    distance: 0,
    x: startPos.x,
    y: startPos.y,
    slowTimer: 0,
    slowRatio: 0,
    isDead: false,
    shape: def.shape,
    color: def.color
  };

  state.enemies.push(enemy);
  state.events.push({ type: 'spawned', enemyId: enemy.id, enemyType, wave: state.wave });
}

/**
 * Executes a single discrete 1/60s simulation tick.
 */
function tickSimulation(state) {
  state.tick++;
  state.simTime += TICK_DT;

  // 1. Process Fabricators
  for (const tower of state.towers) {
    if (tower.type === 'fabricator') {
      tower.circuitTicks = (tower.circuitTicks || 0) + 1;
      const def = state.config.towers.towers.fabricator;
      const intervalSec = def?.levels[0]?.circuitInterval || 10.0;
      const intervalTicks = Math.round(intervalSec * TICK_RATE);
      if (tower.circuitTicks >= intervalTicks) {
        tower.circuitTicks -= intervalTicks;
        state.circuits += 1;
        state.stats.circuitsEarned += 1;
      }
      tower.circuitTimer = (tower.circuitTicks / TICK_RATE);
    }
  }

  // 2. Wave Spawner logic
  if (state.waveState === 'spawning') {
    let allFinished = true;
    for (const group of state.spawner) {
      if (group.spawned < group.count) {
        group.timer -= TICK_DT;
        while (group.timer <= 0 && group.spawned < group.count) {
          spawnEnemy(state, group.type);
          group.spawned++;
          group.timer += group.interval;
        }
      }
      if (group.spawned < group.count) {
        allFinished = false;
      }
    }
    if (allFinished) {
      state.waveState = 'active';
    }
  }

  // 3. Enemy Movement & Slow & Leaks
  const activeEnemies = [];
  for (const enemy of state.enemies) {
    if (enemy.isDead || enemy.hp <= 0) continue;

    if (enemy.slowTimer > 0) {
      enemy.slowTimer = Math.max(0, enemy.slowTimer - TICK_DT);
    }

    const effectiveSpeed = enemy.slowTimer > 0
      ? enemy.speed * (1 - (enemy.slowRatio || 0.5))
      : enemy.speed;

    enemy.distance += effectiveSpeed * TICK_DT;
    const pos = getPositionAlongPath(enemy.distance, state.pathSegments, state.totalPathDistance);
    enemy.x = pos.x;
    enemy.y = pos.y;

    if (enemy.distance >= state.totalPathDistance) {
      // Enemy reached Core Base (leaked)
      state.coreHp = Math.max(0, state.coreHp - enemy.leakDamage);
      state.stats.enemiesLeaked += 1;
      state.events.push({ type: 'leaked', enemyId: enemy.id, coreDamage: enemy.leakDamage });
    } else {
      activeEnemies.push(enemy);
    }
  }
  state.enemies = activeEnemies;

  // Check Core defeat
  if (state.coreHp <= 0 && state.waveState !== 'lost') {
    state.coreHp = 0;
    state.waveState = 'lost';
    state.events.push({ type: 'lost', wave: state.wave, coreHp: 0 });
    return;
  }

  // 4. Combat Towers Firing
  for (const tower of state.towers) {
    if (tower.type === 'fabricator') continue;

    tower.cooldown = Math.max(0, (tower.cooldown || 0) - TICK_DT);
    if (tower.cooldown > 0) continue;

    const def = state.config.towers.towers[tower.type];
    if (!def) continue;

    const lvlConfig = def.levels[tower.level - 1];
    if (!lvlConfig) continue;

    let baseFireRate = lvlConfig.fireRate;
    if (state.purchasedUpgrades.includes('overclock')) {
      baseFireRate *= 1.15;
    }

    let baseDamage = lvlConfig.damage;
    if (state.purchasedUpgrades.includes('hardened_rounds')) {
      baseDamage = Math.round(baseDamage * 1.15);
    }

    let baseRange = lvlConfig.range;
    if (state.purchasedUpgrades.includes('long_barrels')) {
      baseRange = Math.round(baseRange * 1.10 * 100) / 100;
    }

    const towerX = tower.col + 0.5;
    const towerY = tower.row + 0.5;

    // Find enemies in range
    const inRange = [];
    for (const enemy of state.enemies) {
      if (enemy.hp <= 0 || enemy.isDead) continue;
      const d = Math.hypot(enemy.x - towerX, enemy.y - towerY);
      if (d <= baseRange) {
        inRange.push({ enemy, dist: d });
      }
    }

    if (inRange.length === 0) continue;

    // Sort by targetMode: 'first' (highest distance along path) vs 'nearest' (closest to tower)
    const mode = tower.targetMode || 'first';
    if (mode === 'nearest') {
      inRange.sort((a, b) => a.dist - b.dist || b.enemy.distance - a.enemy.distance);
    } else {
      inRange.sort((a, b) => b.enemy.distance - a.enemy.distance || a.dist - b.dist);
    }

    const primaryTarget = inRange[0].enemy;

    if (tower.type === 'pulse') {
      const damageDealt = Math.max(1, baseDamage - primaryTarget.armour);
      primaryTarget.hp -= damageDealt;
      state.events.push({ type: 'hit', enemyId: primaryTarget.id, damage: damageDealt, towerId: tower.id });
      if (primaryTarget.hp <= 0) {
        handleEnemyKill(state, primaryTarget);
      }
      tower.cooldown = 1 / baseFireRate;
    } else if (tower.type === 'coolant') {
      const damageDealt = Math.max(1, baseDamage - primaryTarget.armour);
      primaryTarget.hp -= damageDealt;
      primaryTarget.slowTimer = lvlConfig.slowDuration || 2.0;
      primaryTarget.slowRatio = lvlConfig.slowRatio || 0.5;
      state.events.push({ type: 'hit', enemyId: primaryTarget.id, damage: damageDealt, towerId: tower.id });
      if (primaryTarget.hp <= 0) {
        handleEnemyKill(state, primaryTarget);
      }
      tower.cooldown = 1 / baseFireRate;
    } else if (tower.type === 'arc') {
      // Arc Coil ignores armour completely and chains up to 3 targets within 1.5 cells
      const chainTargets = lvlConfig.chainTargets || 3;
      const chainRange = lvlConfig.chainRange || 1.5;
      const hitIds = new Set([primaryTarget.id]);

      primaryTarget.hp -= baseDamage;
      state.events.push({ type: 'hit', enemyId: primaryTarget.id, damage: baseDamage, towerId: tower.id });
      if (primaryTarget.hp <= 0) {
        handleEnemyKill(state, primaryTarget);
      }

      let currentOrigin = { x: primaryTarget.x, y: primaryTarget.y };
      for (let c = 1; c < chainTargets; c++) {
        const candidates = [];
        for (const enemy of state.enemies) {
          if (enemy.hp <= 0 || enemy.isDead || hitIds.has(enemy.id)) continue;
          const d = Math.hypot(enemy.x - currentOrigin.x, enemy.y - currentOrigin.y);
          if (d <= chainRange) {
            candidates.push({ enemy, dist: d });
          }
        }
        if (candidates.length === 0) break;
        candidates.sort((a, b) => b.enemy.distance - a.enemy.distance);
        const nextTarget = candidates[0].enemy;
        hitIds.add(nextTarget.id);
        currentOrigin = { x: nextTarget.x, y: nextTarget.y };

        nextTarget.hp -= baseDamage;
        state.events.push({ type: 'hit', enemyId: nextTarget.id, damage: baseDamage, towerId: tower.id });
        if (nextTarget.hp <= 0) {
          handleEnemyKill(state, nextTarget);
        }
      }

      tower.cooldown = 1 / baseFireRate;
    } else if (tower.type === 'rocket') {
      // Launch rocket projectile
      const projId = `proj_${++state.nextProjectileId}`;
      state.projectiles.push({
        id: projId,
        towerId: tower.id,
        type: 'rocket',
        x: towerX,
        y: towerY,
        targetX: primaryTarget.x,
        targetY: primaryTarget.y,
        targetId: primaryTarget.id,
        damage: baseDamage,
        splashRadius: lvlConfig.splashRadius || 1.2,
        speed: 8.0 // cells per second
      });
      tower.cooldown = 1 / baseFireRate;
    }
  }

  // 5. Update Projectiles
  const remainingProjectiles = [];
  for (const proj of state.projectiles) {
    const targetEnemy = state.enemies.find(e => e.id === proj.targetId && !e.isDead && e.hp > 0);
    if (targetEnemy) {
      proj.targetX = targetEnemy.x;
      proj.targetY = targetEnemy.y;
    }

    const dx = proj.targetX - proj.x;
    const dy = proj.targetY - proj.y;
    const dist = Math.hypot(dx, dy);
    const stepDist = proj.speed * TICK_DT;

    if (dist <= stepDist) {
      // Detonate and deal splash damage
      for (const enemy of state.enemies) {
        if (enemy.isDead || enemy.hp <= 0) continue;
        const d = Math.hypot(enemy.x - proj.targetX, enemy.y - proj.targetY);
        if (d <= proj.splashRadius) {
          const dmg = Math.max(1, proj.damage - enemy.armour);
          enemy.hp -= dmg;
          state.events.push({ type: 'hit', enemyId: enemy.id, damage: dmg, towerId: proj.towerId });
          if (enemy.hp <= 0) {
            handleEnemyKill(state, enemy);
          }
        }
      }
    } else {
      proj.x += (dx / dist) * stepDist;
      proj.y += (dy / dist) * stepDist;
      remainingProjectiles.push(proj);
    }
  }
  state.projectiles = remainingProjectiles;

  // Filter dead enemies
  state.enemies = state.enemies.filter(e => !e.isDead && e.hp > 0);

  // 6. Check Wave Cleared / Victory
  if (state.waveState === 'active' && state.enemies.length === 0) {
    state.waveState = 'cleared';
    const waveDef = state.config.waves.waves.find(w => w.wave === state.wave);
    const rewardScrap = waveDef?.rewardScrap || 0;
    state.scrap += rewardScrap;
    state.stats.scrapEarned += rewardScrap;
    state.events.push({ type: 'wave_cleared', wave: state.wave, rewardScrap });

    if (state.wave >= state.config.waves.totalWaves) {
      state.waveState = 'won';
      const score = (state.scrap || 0) + (state.circuits || 0) * 10 + (state.coreHp || 0) * 50 + (state.stats.enemiesKilled || 0) * 10;
      state.events.push({ type: 'won', score, remainingHp: state.coreHp });
    }
  }
}

/**
 * Advances simulation by real-world delta time `dtMs`.
 */
export function step(state, dtMs) {
  if (!dtMs || dtMs <= 0 || Number.isNaN(dtMs)) {
    return;
  }
  if (state.paused || state.waveState === 'won' || state.waveState === 'lost') {
    return;
  }

  state.accumulatorMs += dtMs * state.speed;
  const maxSubSteps = 20;
  let subSteps = 0;

  if (state.accumulatorMs >= TICK_MS) {
    state.events = [];
  }

  while (state.accumulatorMs >= TICK_MS && subSteps < maxSubSteps) {
    state.accumulatorMs -= TICK_MS;
    tickSimulation(state);
    subSteps++;
    if (state.waveState === 'won' || state.waveState === 'lost') {
      break;
    }
  }
}

/**
 * Drains all accumulated events from the simulation state.
 * @param {object} state
 * @returns {Array}
 */
export function drainEvents(state) {
  if (!state.events) {
    state.events = [];
    return [];
  }
  const events = state.events;
  state.events = [];
  return events;
}

/**
 * Place a tower on a buildable cell.
 */
export function place(state, cell, towerType) {
  if (!cell || typeof cell.col !== 'number' || typeof cell.row !== 'number') return null;
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

  const towerId = `tower_${++state.nextTowerId}_${cell.col}_${cell.row}`;
  const tower = {
    id: towerId,
    type: towerType,
    col: cell.col,
    row: cell.row,
    level: 1,
    investedScrap: cost,
    cooldown: 0,
    circuitTicks: 0,
    circuitTimer: 0,
    targetMode: 'first'
  };

  state.towers.push(tower);
  state.events.push({ type: 'built', towerId, cell: { col: cell.col, row: cell.row }, towerType });
  return tower;
}

/**
 * Set targeting mode for a tower ('first' | 'nearest').
 */
export function setTowerTargetMode(state, towerId, mode) {
  if (mode !== 'first' && mode !== 'nearest') return false;
  const tower = state.towers.find(t => t.id === towerId);
  if (!tower) return false;
  tower.targetMode = mode;
  return true;
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
 * Sell a tower and refund floor(70% * totalScrapActuallyPaid).
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
  if (state.waveState === 'won' || state.waveState === 'lost') return false;
  if (state.waveState === 'spawning' || state.waveState === 'active') return false;
  if (state.wave >= state.config.waves.totalWaves) return false;

  const nextWave = state.wave + 1;
  const waveDef = state.config.waves.waves.find(w => w.wave === nextWave);
  if (!waveDef) return false;

  state.wave = nextWave;
  state.spawner = waveDef.spawns.map(s => ({
    type: s.type,
    count: s.count,
    spawned: 0,
    interval: s.interval,
    timer: s.delay
  }));
  state.waveState = 'spawning';
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
      const bonus = globalUpgrade.effect?.coreHpBonus || 5;
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
    projectiles: state.projectiles.map(p => ({ ...p })),
    unlockedTowers: [...state.unlockedTowers],
    purchasedUpgrades: [...state.purchasedUpgrades],
    fabricatorCount: state.fabricatorCount,
    events: [...state.events],
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
    rngState: state.rng?.getState ? state.rng.getState() : (state.rngSeedState || 0),
    scrap: state.scrap,
    circuits: state.circuits,
    coreHp: state.coreHp,
    maxCoreHp: state.maxCoreHp,
    wave: state.wave,
    waveState: state.waveState,
    towers: state.towers.map(t => ({
      id: t.id,
      type: t.type,
      col: t.col,
      row: t.row,
      level: t.level
    })),
    enemies: state.enemies.map(e => ({
      id: e.id,
      type: e.type,
      hp: Math.round(e.hp * 10) / 10,
      distance: Math.round(e.distance * 100) / 100
    })),
    projectiles: state.projectiles.map(p => ({
      id: p.id,
      type: p.type,
      x: Math.round(p.x * 100) / 100,
      y: Math.round(p.y * 100) / 100
    })),
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
