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

  function getEnemyCoords(enemy, cellSize) {
    if (typeof enemy.x === 'number' && typeof enemy.y === 'number') {
      const ex = enemy.x <= 16 ? (enemy.x + 0.5) * cellSize : enemy.x;
      const ey = enemy.y <= 9 ? (enemy.y + 0.5) * cellSize : enemy.y;
      return { x: ex, y: ey };
    }

    if (typeof enemy.col === 'number' && typeof enemy.row === 'number') {
      return {
        x: (enemy.col + 0.5) * cellSize,
        y: (enemy.row + 0.5) * cellSize
      };
    }

    const dist = typeof enemy.distance === 'number' ? enemy.distance : 0;
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      if (dist >= seg.startDist && dist <= seg.endDist) {
        const t = seg.len > 0 ? (dist - seg.startDist) / seg.len : 0;
        const col = seg.x1 + seg.dx * t;
        const row = seg.y1 + seg.dy * t;
        return {
          x: (col + 0.5) * cellSize,
          y: (row + 0.5) * cellSize
        };
      }
    }

    return {
      x: (waypoints[0].col + 0.5) * cellSize,
      y: (waypoints[0].row + 0.5) * cellSize
    };
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

    // 3. Precompute Enemy Coordinates (ONCE per frame)
    const enemies = snap.enemies || [];
    const enemyPositions = new Array(enemies.length);
    for (let i = 0; i < enemies.length; i++) {
      enemyPositions[i] = getEnemyCoords(enemies[i], cellSize);
    }

    // 4. Draw Placed Towers
    const towers = snap.towers || [];
    for (let tIdx = 0; tIdx < towers.length; tIdx++) {
      const tower = towers[tIdx];
      const tx = (tower.col + 0.5) * cellSize;
      const ty = (tower.row + 0.5) * cellSize;

      let angle = 0;
      if (tower.type !== 'fabricator' && enemyPositions.length > 0) {
        let minDistSq = Infinity;
        let targetPos = null;
        for (let i = 0; i < enemyPositions.length; i++) {
          const ep = enemyPositions[i];
          const dsq = (ep.x - tx) * (ep.x - tx) + (ep.y - ty) * (ep.y - ty);
          if (dsq < minDistSq) {
            minDistSq = dsq;
            targetPos = ep;
          }
        }
        if (targetPos) {
          angle = Math.atan2(targetPos.y - ty, targetPos.x - tx);
        }
      }

      drawTowerIcon(ctx, tower.type, tx, ty, cellSize, tower.level, angle, totalAnimTime);
    }

    // 5. Draw Enemies along Path
    for (let i = 0; i < enemies.length; i++) {
      const enemy = enemies[i];
      const pos = enemyPositions[i];
      const enemyDef = enemiesData.enemies[enemy.type] || {};
      const maxHp = enemy.maxHp || enemyDef.hp || 30;
      const hpRatio = Math.max(0, enemy.hp / maxHp);
      const slowed = Boolean(enemy.slowTimer > 0 || enemy.slowed);

      drawEnemyIcon(ctx, enemy, pos.x, pos.y, cellSize, hpRatio, slowed);
    }

    // 6. Draw Projectiles if present in snapshot
    if (snap.projectiles && snap.projectiles.length > 0) {
      ctx.save();
      for (let i = 0; i < snap.projectiles.length; i++) {
        const proj = snap.projectiles[i];
        const px = proj.x <= 16 ? (proj.x + 0.5) * cellSize : proj.x;
        const py = proj.y <= 9 ? (proj.y + 0.5) * cellSize : proj.y;

        ctx.fillStyle = proj.type === 'rocket' ? '#ff793f' : '#00d2d3';
        ctx.beginPath();
        ctx.arc(px, py, proj.type === 'rocket' ? 4 : 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
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
