import mapData from '../data/map.json' with { type: 'json' };
import towersData from '../data/towers.json' with { type: 'json' };
import enemiesData from '../data/enemies.json' with { type: 'json' };
import { drawGridAndMap } from './grid.js';
import { drawTowerIcon, drawEnemyIcon } from './icons.js';
import { drawRangeCircle, createEffectsManager } from './effects.js';

/**
 * Canvas2D Procedural Renderer for Robot Factory Defense.
 * Reads strictly from snapshot(state).
 * Highly optimized for p95 frame processing <= 20ms under 4x CPU throttle.
 */
export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const effects = createEffectsManager();

  let selectedCell = null;
  let selectedTower = null;
  let previewTowerType = 'pulse';
  let lastTime = performance.now();
  let totalAnimTime = 0;
  let enemyX = new Float32Array(256);
  let enemyY = new Float32Array(256);

  // Waypoints for distance-to-position projection
  const waypoints = mapData.waypoints;
  const segments = [];
  let totalPathCells = 0;

  for (let i = 0; i < waypoints.length - 1; i++) {
    const w1 = waypoints[i];
    const w2 = waypoints[i + 1];
    const dx = w2.col - w1.col;
    const dy = w2.row - w1.row;
    const len = Math.hypot(dx, dy);
    segments.push({
      x1: w1.col,
      y1: w1.row,
      x2: w2.col,
      y2: w2.row,
      dx,
      dy,
      len,
      startDist: totalPathCells,
      endDist: totalPathCells + len
    });
    totalPathCells += len;
  }

  function getEnemyCoordsInto(enemy, cellSize, idx) {
    if (typeof enemy.x === 'number' && typeof enemy.y === 'number') {
      enemyX[idx] = enemy.x <= 16 ? (enemy.x + 0.5) * cellSize : enemy.x;
      enemyY[idx] = enemy.y <= 9 ? (enemy.y + 0.5) * cellSize : enemy.y;
      return;
    }

    if (typeof enemy.col === 'number' && typeof enemy.row === 'number') {
      enemyX[idx] = (enemy.col + 0.5) * cellSize;
      enemyY[idx] = (enemy.row + 0.5) * cellSize;
      return;
    }

    const dist = typeof enemy.distance === 'number' ? enemy.distance : 0;
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      if (dist >= seg.startDist && dist <= seg.endDist) {
        const t = seg.len > 0 ? (dist - seg.startDist) / seg.len : 0;
        const col = seg.x1 + seg.dx * t;
        const row = seg.y1 + seg.dy * t;
        enemyX[idx] = (col + 0.5) * cellSize;
        enemyY[idx] = (row + 0.5) * cellSize;
        return;
      }
    }

    enemyX[idx] = (waypoints[0].col + 0.5) * cellSize;
    enemyY[idx] = (waypoints[0].row + 0.5) * cellSize;
  }

  function render(snap) {
    if (!ctx || !canvas) return;

    const now = performance.now();
    const dt = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;
    if (!snap.paused) {
      totalAnimTime += dt * (snap.speed || 1);
    }

    const width = canvas.width;
    const height = canvas.height;
    const cellSize = width / mapData.grid.cols; // 60px at 960x540

    // 1. Draw Factory Grid & Conveyor Path
    drawGridAndMap(ctx, width, height, cellSize, totalAnimTime, selectedCell);

    // 2. Draw Range Circles for Selected Cell or Tower
    if (selectedTower) {
      const def = towersData.towers[selectedTower.type];
      if (def && def.levels) {
        const lvlCfg = def.levels[selectedTower.level - 1] || def.levels[0];
        let range = lvlCfg.range || 0;
        if (snap.purchasedUpgrades && snap.purchasedUpgrades.includes('long_barrels')) {
          range *= 1.10;
        }
        if (range > 0) {
          const tx = (selectedTower.col + 0.5) * cellSize;
          const ty = (selectedTower.row + 0.5) * cellSize;
          drawRangeCircle(ctx, tx, ty, range, cellSize);
        }
      }
    } else if (selectedCell) {
      const def = towersData.towers[previewTowerType || 'pulse'];
      if (def && def.levels && def.levels[0].range > 0) {
        let range = def.levels[0].range;
        if (snap.purchasedUpgrades && snap.purchasedUpgrades.includes('long_barrels')) {
          range *= 1.10;
        }
        const cx = (selectedCell.col + 0.5) * cellSize;
        const cy = (selectedCell.row + 0.5) * cellSize;
        drawRangeCircle(ctx, cx, cy, range, cellSize);
      }
    }

    // 3. Precompute Enemy Coordinates (Zero-allocation flat buffers)
    const enemies = snap.enemies || [];
    const enemyCount = enemies.length;
    if (enemyX.length < enemyCount) {
      enemyX = new Float32Array(Math.max(enemyCount, 256));
      enemyY = new Float32Array(Math.max(enemyCount, 256));
    }
    for (let i = 0; i < enemyCount; i++) {
      getEnemyCoordsInto(enemies[i], cellSize, i);
    }

    // 4. Draw Placed Towers
    const towers = snap.towers || [];
    for (let tIdx = 0; tIdx < towers.length; tIdx++) {
      const tower = towers[tIdx];
      const tx = (tower.col + 0.5) * cellSize;
      const ty = (tower.row + 0.5) * cellSize;

      let angle = 0;
      if (tower.type !== 'fabricator' && enemyCount > 0) {
        let minDistSq = Infinity;
        let bestX = 0;
        let bestY = 0;
        for (let i = 0; i < enemyCount; i++) {
          const ex = enemyX[i];
          const ey = enemyY[i];
          const dsq = (ex - tx) * (ex - tx) + (ey - ty) * (ey - ty);
          if (dsq < minDistSq) {
            minDistSq = dsq;
            bestX = ex;
            bestY = ey;
          }
        }
        angle = Math.atan2(bestY - ty, bestX - tx);
      }

      drawTowerIcon(ctx, tower.type, tx, ty, cellSize, tower.level, angle, totalAnimTime);
    }

    // 5. Draw Enemies along Path (Sprites + Batched Overlays, Zero Garbage Allocation)
    if (enemyCount > 0) {
      // 5a. Draw procedural sprites
      for (let i = 0; i < enemyCount; i++) {
        drawEnemyIcon(ctx, enemies[i], enemyX[i], enemyY[i], cellSize, 1, false, false);
      }

      // 5b. Batched Slowed Frost Rings
      ctx.strokeStyle = '#00d2d3';
      ctx.lineWidth = 2;
      ctx.beginPath();
      let hasSlowed = false;
      const frostRadius = cellSize * 0.38 * 1.35;
      for (let i = 0; i < enemyCount; i++) {
        const enemy = enemies[i];
        if (enemy.slowTimer > 0 || enemy.slowed) {
          hasSlowed = true;
          const ex = enemyX[i];
          const ey = enemyY[i];
          ctx.moveTo(ex + frostRadius, ey);
          ctx.arc(ex, ey, frostRadius, 0, Math.PI * 2);
        }
      }
      if (hasSlowed) ctx.stroke();

      // 5c. Batched Health Bars (Backgrounds)
      const r = cellSize * 0.38;
      const barW = Math.max(r * 2.2, 28);
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      for (let i = 0; i < enemyCount; i++) {
        const enemy = enemies[i];
        const ex = enemyX[i];
        const ey = enemyY[i];
        const barH = enemy.isBoss ? 5 : 3.5;
        const barY = ey - r * (enemy.isBoss ? 1.6 : 1.35) - 6;
        ctx.rect(ex - barW / 2 - 1, barY - 1, barW + 2, barH + 2);
      }
      ctx.fill();

      // 5d. Health Bar Fills (Batched in-place by threshold without object allocations)
      // Green (> 50%)
      ctx.fillStyle = '#2ed573';
      ctx.beginPath();
      let hasGreen = false;
      for (let i = 0; i < enemyCount; i++) {
        const enemy = enemies[i];
        const enemyDef = enemiesData.enemies[enemy.type] || {};
        const maxHp = enemy.maxHp || enemyDef.hp || 30;
        const hpRatio = Math.max(0, enemy.hp / maxHp);
        if (hpRatio > 0.5) {
          hasGreen = true;
          const ex = enemyX[i];
          const ey = enemyY[i];
          const fillW = Math.min(1, hpRatio) * barW;
          const barH = enemy.isBoss ? 5 : 3.5;
          const barY = ey - r * (enemy.isBoss ? 1.6 : 1.35) - 6;
          ctx.rect(ex - barW / 2, barY, fillW, barH);
        }
      }
      if (hasGreen) ctx.fill();

      // Yellow (25% - 50%)
      ctx.fillStyle = '#feca57';
      ctx.beginPath();
      let hasYellow = false;
      for (let i = 0; i < enemyCount; i++) {
        const enemy = enemies[i];
        const enemyDef = enemiesData.enemies[enemy.type] || {};
        const maxHp = enemy.maxHp || enemyDef.hp || 30;
        const hpRatio = Math.max(0, enemy.hp / maxHp);
        if (hpRatio <= 0.5 && hpRatio > 0.25) {
          hasYellow = true;
          const ex = enemyX[i];
          const ey = enemyY[i];
          const fillW = hpRatio * barW;
          const barH = enemy.isBoss ? 5 : 3.5;
          const barY = ey - r * (enemy.isBoss ? 1.6 : 1.35) - 6;
          ctx.rect(ex - barW / 2, barY, fillW, barH);
        }
      }
      if (hasYellow) ctx.fill();

      // Red (<= 25%)
      ctx.fillStyle = '#ff4757';
      ctx.beginPath();
      let hasRed = false;
      for (let i = 0; i < enemyCount; i++) {
        const enemy = enemies[i];
        const enemyDef = enemiesData.enemies[enemy.type] || {};
        const maxHp = enemy.maxHp || enemyDef.hp || 30;
        const hpRatio = Math.max(0, enemy.hp / maxHp);
        if (hpRatio <= 0.25) {
          hasRed = true;
          const ex = enemyX[i];
          const ey = enemyY[i];
          const fillW = hpRatio * barW;
          const barH = enemy.isBoss ? 5 : 3.5;
          const barY = ey - r * (enemy.isBoss ? 1.6 : 1.35) - 6;
          ctx.rect(ex - barW / 2, barY, fillW, barH);
        }
      }
      if (hasRed) ctx.fill();
    }

    // 6. Draw Projectiles (Batched by munition type)
    if (snap.projectiles && snap.projectiles.length > 0) {
      const projs = snap.projectiles;

      // 6a. Rockets
      ctx.fillStyle = '#ff793f';
      ctx.beginPath();
      let hasRockets = false;
      for (let i = 0; i < projs.length; i++) {
        if (projs[i].type === 'rocket') {
          hasRockets = true;
          const px = projs[i].x <= 16 ? (projs[i].x + 0.5) * cellSize : projs[i].x;
          const py = projs[i].y <= 9 ? (projs[i].y + 0.5) * cellSize : projs[i].y;
          ctx.moveTo(px + 4, py);
          ctx.arc(px, py, 4, 0, Math.PI * 2);
        }
      }
      if (hasRockets) ctx.fill();

      // 6b. Pulse / Kinetic
      ctx.fillStyle = '#00d2d3';
      ctx.beginPath();
      let hasKinetic = false;
      for (let i = 0; i < projs.length; i++) {
        if (projs[i].type !== 'rocket') {
          hasKinetic = true;
          const px = projs[i].x <= 16 ? (projs[i].x + 0.5) * cellSize : projs[i].x;
          const py = projs[i].y <= 9 ? (projs[i].y + 0.5) * cellSize : projs[i].y;
          ctx.moveTo(px + 2.5, py);
          ctx.arc(px, py, 2.5, 0, Math.PI * 2);
        }
      }
      if (hasKinetic) ctx.fill();
    }

    // 7. Draw Visual Effects (Beams, Sparks, Explosions)
    effects.updateAndDraw(ctx, dt);
  }

  function resize(width, height) {
    canvas.width = width;
    canvas.height = height;
  }

  function screenToCell(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const canvasX = (clientX - rect.left) * scaleX;
    const canvasY = (clientY - rect.top) * scaleY;

    const cols = mapData.grid.cols; // 16
    const rows = mapData.grid.rows; // 9
    const cellSize = canvas.width / cols;

    const col = Math.floor(canvasX / cellSize);
    const row = Math.floor(canvasY / cellSize);

    if (col >= 0 && col < cols && row >= 0 && row < rows) {
      return { col, row };
    }
    return null;
  }

  return {
    render,
    resize,
    screenToCell,
    setSelectedCell: (cell) => { selectedCell = cell; },
    setSelectedTower: (tower) => { selectedTower = tower; },
    setPreviewTowerType: (type) => { previewTowerType = type; },
    effects,
    getContext: () => ctx
  };
}
