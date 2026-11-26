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

const VALID_WAVE_STATES = new Set(['idle', 'spawning', 'active', 'cleared', 'won', 'lost']);

/**
 * Look up a global Workshop upgrade's effect object from state config.
 */
function getGlobalUpgradeEffect(state, id) {
  const list = state.config?.upgrades?.workshop?.globalUpgrades;
  if (!Array.isArray(list)) return null;
  return list.find(g => g.id === id)?.effect || null;
}

/**
 * Apply Fast Assembly cost discount if purchased.
 */
function applyCostDiscount(state, cost) {
  if (!state.purchasedUpgrades.includes('fast_assembly')) return cost;
  const ratio = getGlobalUpgradeEffect(state, 'fast_assembly')?.costDiscountRatio;
  const discount = (Number.isFinite(ratio) && ratio >= 0 && ratio < 1) ? ratio : 0.1;
  return Math.floor(cost * (1 - discount));
}

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
  if (!Array.isArray(waypoints) || waypoints.length < 2) {
    return { segments: [], totalDistance: 0 };
  }
  const segments = [];
  let totalDistance = 0;
  for (let i = 0; i < waypoints.length - 1; i++) {
    const p1 = waypoints[i];
    const p2 = waypoints[i + 1];
    if (!p1 || !p2 || !Number.isFinite(p1.col) || !Number.isFinite(p1.row) || !Number.isFinite(p2.col) || !Number.isFinite(p2.row)) {
      continue;
    }
    const x1 = p1.col + 0.5;
    const y1 = p1.row + 0.5;
    const x2 = p2.col + 0.5;
    const y2 = p2.row + 0.5;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    if (len <= 0) continue;
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
  if (!Number.isFinite(totalDistance) || totalDistance <= 0) {
    return { x: segments[0].x1, y: segments[0].y1 };
  }
  if (!Number.isFinite(distance) || distance <= 0) {
    return { x: segments[0].x1, y: segments[0].y1 };
  }
  if (distance >= totalDistance) {
    const last = segments[segments.length - 1];
    return { x: last.x2, y: last.y2 };
  }
  for (const seg of segments) {
    if (distance <= seg.endDist) {
      if (!Number.isFinite(seg.len) || seg.len <= 0) {
        return { x: seg.x1, y: seg.y1 };
      }
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

  const scrapMultiplier = config.scrapMultiplier ?? config.scrapScale ?? 1.0;
  const hpMultiplier = config.hpMultiplier ?? config.hpScale ?? 1.0;
  const removedTower = config.removedTower ?? config.excludedTower ?? null;
  const workshopMode = config.workshopMode ?? 'all';

  const rng = mulberry32(seed);
  const { segments, totalDistance } = computeWaypoints(map.waypoints);

  const unlockedTowers = [];
  for (const [id, t] of Object.entries(towersConfig.towers)) {
    if (t.unlockedByDefault && (!removedTower || id !== removedTower)) {
      unlockedTowers.push(id);
    }
  }

  return {
    tick: 0,
    simTime: 0,
    seed: seed >>> 0,
    rngSeedState: seed >>> 0,
    rng,
    scrap: Math.round(map.startScrap * scrapMultiplier),
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
    scrapMultiplier,
    hpMultiplier,
    removedTower,
    workshopMode,
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
export function killEnemy(state, enemy) {
  if (enemy.isDead) return;
  enemy.isDead = true;
  enemy.hp = 0;

  const baseScrap = Number.isFinite(enemy.scrap) ? enemy.scrap : 0;
  const mult = Number.isFinite(state.scrapMultiplier) ? state.scrapMultiplier : 1.0;
  let scrapReward = Math.max(0, Math.round(baseScrap * mult));
  if (state.purchasedUpgrades.includes('scrap_magnet')) {
    const magnetMult = getGlobalUpgradeEffect(state, 'scrap_magnet')?.scrapMultiplier;
    const factor = (Number.isFinite(magnetMult) && magnetMult > 0) ? magnetMult : 1.2;
    scrapReward = Math.max(0, Math.round(scrapReward * factor));
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

  const hpScale = Number.isFinite(state.hpMultiplier) ? state.hpMultiplier : 1.0;
  const currentWaveDef = state.config.waves.waves?.[state.wave - 1];
  const waveHpMult = Number.isFinite(currentWaveDef?.hpMult) ? currentWaveDef.hpMult : 1.0;
  const scaledHp = Math.max(1, Math.round(def.hp * hpScale * waveHpMult));

  const enemy = {
    id: enemyId,
    type: enemyType,
    name: def.name,
    hp: scaledHp,
    maxHp: scaledHp,
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
        if (!Number.isFinite(group.timer)) {
          group.timer = 0;
        }
        group.timer -= TICK_DT;
        const interval = (Number.isFinite(group.interval) && group.interval > 0) ? group.interval : TICK_DT;
        while (group.timer <= 0 && group.spawned < group.count) {
          spawnEnemy(state, group.type);
          group.spawned++;
          group.timer += interval;
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

    const enemySpeed = Number.isFinite(enemy.speed) ? enemy.speed : 0;
    const slowRatio = Number.isFinite(enemy.slowRatio) ? enemy.slowRatio : 0.5;
    const effectiveSpeed = enemy.slowTimer > 0
      ? enemySpeed * (1 - slowRatio)
      : enemySpeed;

    enemy.distance = (Number.isFinite(enemy.distance) ? enemy.distance : 0) + effectiveSpeed * TICK_DT;
    const pos = getPositionAlongPath(enemy.distance, state.pathSegments, state.totalPathDistance);
    enemy.x = pos.x;
    enemy.y = pos.y;

    if (enemy.distance >= state.totalPathDistance) {
      // Enemy reached Core Base (leaked)
      const leakDmg = (Number.isFinite(enemy.leakDamage) && enemy.leakDamage >= 0) ? enemy.leakDamage : 1;
      state.coreHp = Math.max(0, state.coreHp - leakDmg);
      state.stats.enemiesLeaked += 1;
      state.events.push({ type: 'leaked', enemyId: enemy.id, coreDamage: leakDmg });
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

    tower.cooldown = Math.max(0, (Number.isFinite(tower.cooldown) ? tower.cooldown : 0) - TICK_DT);
    if (tower.cooldown > 0) continue;

    const def = state.config.towers.towers[tower.type];
    if (!def) continue;

    const lvlConfig = def.levels[tower.level - 1];
    if (!lvlConfig) continue;

    let baseFireRate = lvlConfig.fireRate;
    if (state.purchasedUpgrades.includes('overclock')) {
      const mult = getGlobalUpgradeEffect(state, 'overclock')?.fireRateMultiplier;
      baseFireRate *= (Number.isFinite(mult) && mult > 0) ? mult : 1.1;
    }
    if (!Number.isFinite(baseFireRate) || baseFireRate <= 0) continue;

    let baseDamage = lvlConfig.damage;
    if (state.purchasedUpgrades.includes('hardened_rounds')) {
      const mult = getGlobalUpgradeEffect(state, 'hardened_rounds')?.damageMultiplier;
      baseDamage = Math.round(baseDamage * ((Number.isFinite(mult) && mult > 0) ? mult : 1.1));
    }
    if (!Number.isFinite(baseDamage)) continue;

    let baseRange = lvlConfig.range;
    if (state.purchasedUpgrades.includes('long_barrels')) {
      const mult = getGlobalUpgradeEffect(state, 'long_barrels')?.rangeMultiplier;
      baseRange = Math.round(baseRange * ((Number.isFinite(mult) && mult > 0) ? mult : 1.1) * 100) / 100;
    }
    if (!Number.isFinite(baseRange) || baseRange <= 0) continue;

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
      const armour = Number.isFinite(primaryTarget.armour) ? primaryTarget.armour : 0;
      const damageDealt = Math.max(1, baseDamage - armour);
      primaryTarget.hp -= damageDealt;
      state.events.push({ type: 'hit', enemyId: primaryTarget.id, damage: damageDealt, towerId: tower.id });
      if (primaryTarget.hp <= 0) {
        killEnemy(state, primaryTarget);
      }
      tower.cooldown = 1 / baseFireRate;
    } else if (tower.type === 'coolant') {
      const armour = Number.isFinite(primaryTarget.armour) ? primaryTarget.armour : 0;
      const damageDealt = Math.max(1, baseDamage - armour);
      primaryTarget.hp -= damageDealt;
      primaryTarget.slowTimer = Number.isFinite(lvlConfig.slowDuration) ? lvlConfig.slowDuration : 2.0;
      primaryTarget.slowRatio = Number.isFinite(lvlConfig.slowRatio) ? lvlConfig.slowRatio : 0.5;
      state.events.push({ type: 'hit', enemyId: primaryTarget.id, damage: damageDealt, towerId: tower.id });
      if (primaryTarget.hp <= 0) {
        killEnemy(state, primaryTarget);
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
        killEnemy(state, primaryTarget);
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
        if (mode === 'nearest') {
          candidates.sort((a, b) => a.dist - b.dist || b.enemy.distance - a.enemy.distance);
        } else {
          candidates.sort((a, b) => b.enemy.distance - a.enemy.distance || a.dist - b.dist);
        }
        const nextTarget = candidates[0].enemy;
        hitIds.add(nextTarget.id);
        currentOrigin = { x: nextTarget.x, y: nextTarget.y };

        nextTarget.hp -= baseDamage;
        state.events.push({ type: 'hit', enemyId: nextTarget.id, damage: baseDamage, towerId: tower.id });
        if (nextTarget.hp <= 0) {
          killEnemy(state, nextTarget);
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
    const targetEnemy = proj.targetId
      ? state.enemies.find(e => e.id === proj.targetId && !e.isDead && e.hp > 0)
      : null;
    if (targetEnemy) {
      proj.targetX = targetEnemy.x;
      proj.targetY = targetEnemy.y;
    } else if (proj.targetId) {
      proj.targetId = null;
    }

    if (!Number.isFinite(proj.x) || !Number.isFinite(proj.y) || !Number.isFinite(proj.targetX) || !Number.isFinite(proj.targetY)) {
      continue;
    }

    const speed = (Number.isFinite(proj.speed) && proj.speed > 0) ? proj.speed : 8.0;
    const splashRadius = (Number.isFinite(proj.splashRadius) && proj.splashRadius >= 0) ? proj.splashRadius : 1.2;
    const projDamage = Number.isFinite(proj.damage) ? proj.damage : 0;

    const dx = proj.targetX - proj.x;
    const dy = proj.targetY - proj.y;
    const dist = Math.hypot(dx, dy);
    const stepDist = speed * TICK_DT;

    if (dist <= stepDist || dist === 0) {
      // Detonate and deal splash damage
      for (const enemy of state.enemies) {
        if (enemy.isDead || enemy.hp <= 0) continue;
        const d = Math.hypot(enemy.x - proj.targetX, enemy.y - proj.targetY);
        if (d <= splashRadius) {
          const armour = Number.isFinite(enemy.armour) ? enemy.armour : 0;
          const dmg = Math.max(1, projDamage - armour);
          enemy.hp -= dmg;
          state.events.push({ type: 'hit', enemyId: enemy.id, damage: dmg, towerId: proj.towerId });
          if (enemy.hp <= 0) {
            killEnemy(state, enemy);
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
    const baseReward = Number.isFinite(waveDef?.rewardScrap) ? waveDef.rewardScrap : 0;
    const mult = Number.isFinite(state.scrapMultiplier) ? state.scrapMultiplier : 1.0;
    const rewardScrap = Math.max(0, Math.round(baseReward * mult));
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
  if (!Number.isFinite(dtMs) || dtMs <= 0) {
    return;
  }
  if (state.paused || state.waveState === 'won' || state.waveState === 'lost') {
    return;
  }

  const speed = (Number.isFinite(state.speed) && state.speed > 0) ? state.speed : 1;
  if (!Number.isFinite(state.accumulatorMs)) {
    state.accumulatorMs = 0;
  }

  state.accumulatorMs += dtMs * speed;
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

  if (state.removedTower && state.removedTower === towerType) return null;
  if (!state.unlockedTowers.includes(towerType)) return null;

  const def = state.config.towers.towers[towerType];
  if (!def || !Array.isArray(def.levels) || !def.levels[0]) return null;

  const l1 = def.levels[0];
  let cost = l1.cost;
  if (!Number.isFinite(cost) || cost < 0) return null;

  cost = applyCostDiscount(state, cost);
  if (!Number.isFinite(cost) || cost < 0) return null;

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
  if (!def || !Array.isArray(def.levels) || tower.level >= def.levels.length) return false;

  const currentLvlConfig = def.levels[tower.level - 1];
  if (!currentLvlConfig) return false;

  let upgradeCost = currentLvlConfig.upgradeCost;
  if (!Number.isFinite(upgradeCost) || upgradeCost <= 0) return false;

  upgradeCost = applyCostDiscount(state, upgradeCost);
  if (!Number.isFinite(upgradeCost) || upgradeCost < 0) return false;

  if (state.scrap < upgradeCost) return false;

  state.scrap -= upgradeCost;
  tower.investedScrap = (Number.isFinite(tower.investedScrap) ? tower.investedScrap : 0) + upgradeCost;
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
  const rawRatio = state.config.towers.sellRefundRatio;
  const refundRatio = (Number.isFinite(rawRatio) && rawRatio >= 0) ? rawRatio : 0.70;
  const invested = Number.isFinite(tower.investedScrap) ? tower.investedScrap : 0;
  const refund = Math.max(0, Math.floor(invested * refundRatio));

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
    count: (Number.isFinite(s.count) && s.count > 0) ? s.count : 0,
    spawned: 0,
    interval: (Number.isFinite(s.interval) && s.interval > 0) ? s.interval : TICK_DT,
    timer: Number.isFinite(s.delay) ? s.delay : 0
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
  if (state.waveState === 'won' || state.waveState === 'lost') return false;

  const workshop = state.config?.upgrades?.workshop;
  if (!workshop) return false;

  // Check tower unlocks
  const unlockItem = Array.isArray(workshop.unlocks)
    ? workshop.unlocks.find(u => u.id === id)
    : null;
  if (unlockItem) {
    if (state.removedTower && state.removedTower === unlockItem.target) return false;
    if (state.unlockedTowers.includes(unlockItem.target)) return false;
    if (!Number.isFinite(unlockItem.cost) || unlockItem.cost < 0) return false;
    if (state.circuits < unlockItem.cost) return false;

    state.circuits -= unlockItem.cost;
    state.unlockedTowers.push(unlockItem.target);
    return true;
  }

  // Check global upgrades
  const globalUpgrade = Array.isArray(workshop.globalUpgrades)
    ? workshop.globalUpgrades.find(g => g.id === id)
    : null;
  if (globalUpgrade) {
    if (state.purchasedUpgrades.includes(id)) return false;
    if (!Number.isFinite(globalUpgrade.cost) || globalUpgrade.cost < 0) return false;
    if (state.circuits < globalUpgrade.cost) return false;

    state.circuits -= globalUpgrade.cost;
    state.purchasedUpgrades.push(id);

    if (id === 'repair_bay') {
      const rawBonus = globalUpgrade.effect?.coreHpBonus;
      const bonus = (Number.isFinite(rawBonus) && rawBonus > 0) ? rawBonus : 5;
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
    simTime: state.simTime,
    seed: state.seed,
    rngState: state.rng?.getState ? state.rng.getState() : (state.rngSeedState || 0),
    scrap: state.scrap,
    circuits: state.circuits,
    coreHp: state.coreHp,
    maxCoreHp: state.maxCoreHp,
    wave: state.wave,
    waveState: state.waveState,
    speed: state.speed,
    paused: !!state.paused,
    accumulatorMs: state.accumulatorMs,
    fabricatorCount: state.fabricatorCount,
    nextTowerId: state.nextTowerId,
    nextEnemyId: state.nextEnemyId,
    nextProjectileId: state.nextProjectileId,
    scrapMultiplier: state.scrapMultiplier,
    hpMultiplier: state.hpMultiplier,
    removedTower: state.removedTower ?? null,
    workshopMode: state.workshopMode ?? 'all',
    spawner: (state.spawner || []).map(g => ({
      type: g.type,
      count: g.count,
      spawned: g.spawned,
      interval: g.interval,
      timer: g.timer
    })),
    stats: {
      enemiesKilled: state.stats?.enemiesKilled || 0,
      enemiesLeaked: state.stats?.enemiesLeaked || 0,
      scrapEarned: state.stats?.scrapEarned || 0,
      circuitsEarned: state.stats?.circuitsEarned || 0,
      towersBuilt: state.stats?.towersBuilt || 0
    },
    towers: (state.towers || []).map(t => ({
      id: t.id,
      type: t.type,
      col: t.col,
      row: t.row,
      level: t.level,
      investedScrap: t.investedScrap,
      cooldown: t.cooldown || 0,
      circuitTicks: t.circuitTicks || 0,
      circuitTimer: t.circuitTimer || 0,
      targetMode: t.targetMode || 'first'
    })),
    enemies: (state.enemies || []).map(e => ({
      id: e.id,
      type: e.type,
      name: e.name,
      hp: e.hp,
      maxHp: e.maxHp,
      speed: e.speed,
      armour: e.armour,
      scrap: e.scrap,
      leakDamage: e.leakDamage,
      isBoss: !!e.isBoss,
      distance: e.distance,
      x: e.x,
      y: e.y,
      slowTimer: e.slowTimer || 0,
      slowRatio: e.slowRatio ?? 0,
      isDead: !!e.isDead,
      shape: e.shape,
      color: e.color
    })),
    projectiles: (state.projectiles || []).map(p => ({
      id: p.id,
      towerId: p.towerId,
      type: p.type,
      x: p.x,
      y: p.y,
      targetX: p.targetX,
      targetY: p.targetY,
      targetId: p.targetId ?? null,
      damage: p.damage,
      splashRadius: p.splashRadius,
      speed: p.speed
    })),
    unlockedTowers: [...(state.unlockedTowers || [])].sort(),
    purchasedUpgrades: [...(state.purchasedUpgrades || [])].sort()
  });
}

/**
 * Restore a simulation state from a serialized JSON string (or object).
 * Returns null if the payload is malformed or invalid.
 */
export function deserialize(json, config = {}) {
  let parsed;
  if (typeof json === 'string') {
    try {
      parsed = JSON.parse(json);
    } catch (_e) {
      return null;
    }
  } else {
    parsed = json;
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return null;
  }
  if (!Number.isFinite(parsed.tick) || parsed.tick < 0) {
    return null;
  }

  const seed = Number.isFinite(parsed.seed) ? (parsed.seed >>> 0) : 12345;
  const mergedConfig = {
    ...config,
    scrapMultiplier: Number.isFinite(parsed.scrapMultiplier) ? parsed.scrapMultiplier : config.scrapMultiplier,
    hpMultiplier: Number.isFinite(parsed.hpMultiplier) ? parsed.hpMultiplier : config.hpMultiplier,
    removedTower: parsed.removedTower !== undefined ? parsed.removedTower : config.removedTower,
    workshopMode: parsed.workshopMode !== undefined ? parsed.workshopMode : config.workshopMode
  };

  const state = createGame(mergedConfig, seed);
  const rngSeedState = Number.isFinite(parsed.rngState) ? (parsed.rngState >>> 0) : seed;
  state.rngSeedState = rngSeedState;
  state.rng = mulberry32(rngSeedState);

  state.tick = Math.floor(parsed.tick);
  state.simTime = Number.isFinite(parsed.simTime) ? parsed.simTime : state.tick * TICK_DT;
  state.scrap = Number.isFinite(parsed.scrap) ? parsed.scrap : state.scrap;
  state.circuits = Number.isFinite(parsed.circuits) ? parsed.circuits : state.circuits;
  state.coreHp = Number.isFinite(parsed.coreHp) ? parsed.coreHp : state.coreHp;
  state.maxCoreHp = Number.isFinite(parsed.maxCoreHp) ? parsed.maxCoreHp : state.maxCoreHp;
  state.wave = Number.isFinite(parsed.wave) ? parsed.wave : 0;
  state.waveState = VALID_WAVE_STATES.has(parsed.waveState) ? parsed.waveState : 'idle';
  state.speed = parsed.speed === 2 ? 2 : 1;
  state.paused = Boolean(parsed.paused);
  state.accumulatorMs = Number.isFinite(parsed.accumulatorMs) ? parsed.accumulatorMs : 0;
  state.nextTowerId = Number.isFinite(parsed.nextTowerId) ? parsed.nextTowerId : 0;
  state.nextEnemyId = Number.isFinite(parsed.nextEnemyId) ? parsed.nextEnemyId : 0;
  state.nextProjectileId = Number.isFinite(parsed.nextProjectileId) ? parsed.nextProjectileId : 0;

  if (Array.isArray(parsed.unlockedTowers)) {
    state.unlockedTowers = [...parsed.unlockedTowers];
  }
  if (Array.isArray(parsed.purchasedUpgrades)) {
    state.purchasedUpgrades = [...parsed.purchasedUpgrades];
  }

  if (Array.isArray(parsed.spawner)) {
    state.spawner = parsed.spawner.map(g => ({
      type: g.type,
      count: Number.isFinite(g.count) ? g.count : 0,
      spawned: Number.isFinite(g.spawned) ? g.spawned : 0,
      interval: (Number.isFinite(g.interval) && g.interval > 0) ? g.interval : TICK_DT,
      timer: Number.isFinite(g.timer) ? g.timer : 0
    }));
  }

  if (parsed.stats && typeof parsed.stats === 'object') {
    state.stats = {
      enemiesKilled: Number.isFinite(parsed.stats.enemiesKilled) ? parsed.stats.enemiesKilled : 0,
      enemiesLeaked: Number.isFinite(parsed.stats.enemiesLeaked) ? parsed.stats.enemiesLeaked : 0,
      scrapEarned: Number.isFinite(parsed.stats.scrapEarned) ? parsed.stats.scrapEarned : 0,
      circuitsEarned: Number.isFinite(parsed.stats.circuitsEarned) ? parsed.stats.circuitsEarned : 0,
      towersBuilt: Number.isFinite(parsed.stats.towersBuilt) ? parsed.stats.towersBuilt : 0
    };
  }

  if (Array.isArray(parsed.towers)) {
    state.towers = parsed.towers.map(t => {
      const def = state.config.towers.towers[t.type];
      const fallbackCost = def?.levels?.[0]?.cost ?? 0;
      return {
        id: t.id,
        type: t.type,
        col: t.col,
        row: t.row,
        level: Number.isFinite(t.level) ? t.level : 1,
        investedScrap: Number.isFinite(t.investedScrap) ? t.investedScrap : fallbackCost,
        cooldown: Number.isFinite(t.cooldown) ? t.cooldown : 0,
        circuitTicks: Number.isFinite(t.circuitTicks) ? t.circuitTicks : 0,
        circuitTimer: Number.isFinite(t.circuitTimer) ? t.circuitTimer : 0,
        targetMode: t.targetMode === 'nearest' ? 'nearest' : 'first'
      };
    });
  }

  state.fabricatorCount = Number.isFinite(parsed.fabricatorCount)
    ? parsed.fabricatorCount
    : state.towers.filter(t => t.type === 'fabricator').length;

  if (Array.isArray(parsed.enemies)) {
    state.enemies = parsed.enemies.map(e => {
      const def = state.config.enemies.enemies[e.type];
      const distance = Number.isFinite(e.distance) ? e.distance : 0;
      const pos = getPositionAlongPath(distance, state.pathSegments, state.totalPathDistance);
      return {
        id: e.id,
        type: e.type,
        name: e.name ?? def?.name,
        hp: Number.isFinite(e.hp) ? e.hp : (def?.hp ?? 1),
        maxHp: Number.isFinite(e.maxHp) ? e.maxHp : (def?.hp ?? 1),
        speed: Number.isFinite(e.speed) ? e.speed : (def?.speed ?? 1),
        armour: Number.isFinite(e.armour) ? e.armour : (def?.armour ?? 0),
        scrap: Number.isFinite(e.scrap) ? e.scrap : (def?.scrap ?? 0),
        leakDamage: Number.isFinite(e.leakDamage) ? e.leakDamage : (def?.leakDamage ?? 1),
        isBoss: e.isBoss !== undefined ? !!e.isBoss : !!def?.isBoss,
        distance,
        x: Number.isFinite(e.x) ? e.x : pos.x,
        y: Number.isFinite(e.y) ? e.y : pos.y,
        slowTimer: Number.isFinite(e.slowTimer) ? e.slowTimer : 0,
        slowRatio: Number.isFinite(e.slowRatio) ? e.slowRatio : 0,
        isDead: !!e.isDead,
        shape: e.shape ?? def?.shape,
        color: e.color ?? def?.color
      };
    });
  }

  if (Array.isArray(parsed.projectiles)) {
    state.projectiles = parsed.projectiles.map(p => ({
      id: p.id,
      towerId: p.towerId ?? null,
      type: p.type ?? 'rocket',
      x: Number.isFinite(p.x) ? p.x : 0,
      y: Number.isFinite(p.y) ? p.y : 0,
      targetX: Number.isFinite(p.targetX) ? p.targetX : 0,
      targetY: Number.isFinite(p.targetY) ? p.targetY : 0,
      targetId: p.targetId ?? null,
      damage: Number.isFinite(p.damage) ? p.damage : 0,
      splashRadius: Number.isFinite(p.splashRadius) ? p.splashRadius : 1.2,
      speed: Number.isFinite(p.speed) ? p.speed : 8.0
    }));
  }

  return state;
}

/**
 * Deterministic 32-bit hash of simulation state.
 */
export function hashState(state) {
  return fnv1a32(serialize(state));
}
