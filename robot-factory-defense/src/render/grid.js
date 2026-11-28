import mapData from '../data/map.json' with { type: 'json' };
import { getPalette, getActiveTheme } from './palette.js';

/**
 * Grid, Conveyor Path, and Buildable Cell Rendering.
 * Uses offscreen canvas caching for extreme 60+ FPS performance under CPU throttling.
 */
let cachedBgCanvas = null;
let cachedWidth = 0;
let cachedHeight = 0;
let cachedTheme = '';
let cachedGlowTheme = '';
let cachedGlowCellSize = 0;
let cachedSpawnGlow = null;
let cachedCoreGlow = null;

// Precompute cell lookup sets and exact waypoint travel directions for every path cell.
const pathCellKeySet = new Set(mapData.pathCells.map(c => `${c.col},${c.row}`));
const buildableKeySet = new Set(mapData.buildableCells.map(c => `${c.col},${c.row}`));

const pathCellDirections = (() => {
  const dirMap = new Map();
  const wps = mapData.waypoints;
  for (let i = 0; i < wps.length - 1; i++) {
    const w1 = wps[i];
    const w2 = wps[i + 1];
    const dx = Math.sign(w2.col - w1.col);
    const dy = Math.sign(w2.row - w1.row);
    const angle = Math.atan2(dy, dx);
    let c = w1.col;
    let r = w1.row;
    while (true) {
      const key = `${c},${r}`;
      // On corner cells, prefer the outgoing direction of the next segment
      if (c === w2.col && r === w2.row && i < wps.length - 2) {
        const nw = wps[i + 2];
        const ndx = Math.sign(nw.col - w2.col);
        const ndy = Math.sign(nw.row - w2.row);
        dirMap.set(key, { col: c, row: r, dx: ndx, dy: ndy, angle: Math.atan2(ndy, ndx) });
      } else if (!dirMap.has(key)) {
        dirMap.set(key, { col: c, row: r, dx, dy, angle });
      }
      if (c === w2.col && r === w2.row) break;
      c += dx;
      r += dy;
    }
  }
  return mapData.pathCells.map(c => dirMap.get(`${c.col},${c.row}`) || { col: c.col, row: c.row, dx: 1, dy: 0, angle: 0 });
})();

function cellHash(col, row) {
  let h = (col * 374761393 + row * 668265263) ^ 0x5bf03635;
  h = ((h ^ (h >>> 13)) * 1274126177) >>> 0;
  return h ^ (h >>> 16);
}

function drawDeadCellDecor(ctx, x, y, cellSize, col, row, pal) {
  const h = cellHash(col, row);
  const variant = h % 5;
  const pad = cellSize * 0.16;

  if (variant === 0) {
    // Louvered floor vent
    const vx = x + pad;
    const vy = y + pad * 1.1;
    const vw = cellSize - pad * 2;
    const vh = cellSize - pad * 2.2;
    ctx.fillStyle = pal.deadVentBg;
    ctx.fillRect(vx, vy, vw, vh);
    ctx.strokeStyle = pal.deadVentStroke;
    ctx.lineWidth = 1;
    ctx.strokeRect(vx, vy, vw, vh);
    ctx.beginPath();
    for (let i = 1; i <= 3; i++) {
      const ly = vy + (vh * i) / 4;
      ctx.moveTo(vx + 3, ly);
      ctx.lineTo(vx + vw - 3, ly);
    }
    ctx.strokeStyle = pal.deadVentLouver;
    ctx.stroke();
  } else if (variant === 1) {
    // Sub-floor conduit pipe
    const horizontal = (h & 8) === 0;
    ctx.strokeStyle = pal.deadPipe;
    ctx.lineWidth = Math.max(3, cellSize * 0.09);
    ctx.beginPath();
    if (horizontal) {
      const py = y + cellSize * 0.5;
      ctx.moveTo(x + 2, py);
      ctx.lineTo(x + cellSize - 2, py);
    } else {
      const px = x + cellSize * 0.5;
      ctx.moveTo(px, y + 2);
      ctx.lineTo(px, y + cellSize - 2);
    }
    ctx.stroke();
    ctx.strokeStyle = pal.deadPipeHighlight;
    ctx.lineWidth = 1;
    ctx.stroke();
  } else if (variant === 2) {
    // Corner rivets on dark steel plate
    const inset = cellSize * 0.16;
    ctx.fillStyle = pal.deadRivet;
    const pts = [
      [x + inset, y + inset],
      [x + cellSize - inset, y + inset],
      [x + inset, y + cellSize - inset],
      [x + cellSize - inset, y + cellSize - inset]
    ];
    for (let i = 0; i < pts.length; i++) {
      ctx.beginPath();
      ctx.arc(pts[i][0], pts[i][1], 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function createStaticBackground(width, height, cellSize) {
  const pal = getPalette();
  const bg = document.createElement('canvas');
  bg.width = width;
  bg.height = height;
  const ctx = bg.getContext('2d');
  const cols = mapData.grid.cols; // 16
  const rows = mapData.grid.rows; // 9

  // 1. Factory Dead-Cell Background
  ctx.fillStyle = pal.deadBg;
  ctx.fillRect(0, 0, width, height);

  // Subtle steel grid lines (single batched path)
  ctx.lineWidth = 1;
  ctx.strokeStyle = pal.deadGridLine;
  ctx.beginPath();
  for (let c = 0; c <= cols; c++) {
    const x = c * cellSize;
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
  }
  for (let r = 0; r <= rows; r++) {
    const y = r * cellSize;
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
  }
  ctx.stroke();

  // Procedural decor on dead cells (vents, pipes, rivets)
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const key = `${c},${r}`;
      if (!pathCellKeySet.has(key) && !buildableKeySet.has(key)) {
        drawDeadCellDecor(ctx, c * cellSize, r * cellSize, cellSize, c, r, pal);
      }
    }
  }

  // 2. Conveyor Belt Track (clearly distinct from dead & buildable cells)
  const railInset = Math.max(2, cellSize * 0.06);
  mapData.pathCells.forEach(({ col, row }) => {
    const x = col * cellSize;
    const y = row * cellSize;
    ctx.fillStyle = pal.pathCenterLine;
    ctx.fillRect(x, y, cellSize, cellSize);

    // Inner belt bed
    ctx.fillStyle = pal.pathFill;
    ctx.fillRect(x + railInset, y + railInset, cellSize - railInset * 2, cellSize - railInset * 2);
  });

  // Track metal guide rails on exposed edges
  ctx.strokeStyle = pal.pathBorder;
  ctx.lineWidth = 2;
  ctx.beginPath();
  mapData.pathCells.forEach(({ col, row }) => {
    const x = col * cellSize;
    const y = row * cellSize;
    if (!pathCellKeySet.has(`${col},${row - 1}`)) {
      ctx.moveTo(x, y + 1);
      ctx.lineTo(x + cellSize, y + 1);
    }
    if (!pathCellKeySet.has(`${col},${row + 1}`)) {
      ctx.moveTo(x, y + cellSize - 1);
      ctx.lineTo(x + cellSize, y + cellSize - 1);
    }
    if (!pathCellKeySet.has(`${col - 1},${row}`)) {
      ctx.moveTo(x + 1, y);
      ctx.lineTo(x + 1, y + cellSize);
    }
    if (!pathCellKeySet.has(`${col + 1},${row}`)) {
      ctx.moveTo(x + cellSize - 1, y);
      ctx.lineTo(x + cellSize - 1, y + cellSize);
    }
  });
  ctx.stroke();

  // 3. Entrance Spawn Bay (col: 0, row: 2)
  const entX = mapData.waypoints[0].col * cellSize;
  const entY = mapData.waypoints[0].row * cellSize;
  ctx.fillStyle = pal.spawnBg;
  ctx.fillRect(entX, entY, cellSize, cellSize);
  // Hazard caution stripes clipped to entrance cell
  ctx.save();
  ctx.beginPath();
  ctx.rect(entX, entY, cellSize, cellSize);
  ctx.clip();
  ctx.strokeStyle = pal.spawnGlow;
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let i = -cellSize; i < cellSize * 2; i += 10) {
    ctx.moveTo(entX, entY + i);
    ctx.lineTo(entX + cellSize, entY + i - cellSize);
  }
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = pal.spawnCore;
  ctx.lineWidth = 2.5;
  ctx.strokeRect(entX + 1.5, entY + 1.5, cellSize - 3, cellSize - 3);

  // 4. Buildable Assembly Pads (distinct plated pads)
  const padInset = Math.max(3, cellSize * 0.08);
  mapData.buildableCells.forEach(({ col, row }) => {
    const bx = col * cellSize;
    const by = row * cellSize;

    // Outer pad base
    ctx.fillStyle = pal.padSocket;
    ctx.fillRect(bx + 1, by + 1, cellSize - 2, cellSize - 2);

    // Raised inner steel plate
    ctx.fillStyle = pal.padFill;
    ctx.fillRect(bx + padInset, by + padInset, cellSize - padInset * 2, cellSize - padInset * 2);

    ctx.strokeStyle = pal.padBorder;
    ctx.lineWidth = 1;
    ctx.strokeRect(bx + padInset, by + padInset, cellSize - padInset * 2, cellSize - padInset * 2);

    // Center mounting socket
    ctx.beginPath();
    ctx.arc(bx + cellSize / 2, by + cellSize / 2, cellSize * 0.1, 0, Math.PI * 2);
    ctx.strokeStyle = pal.padCorner;
    ctx.globalAlpha = 0.35;
    ctx.stroke();
    ctx.globalAlpha = 1;
  });

  // Corner brackets (batched)
  ctx.strokeStyle = pal.padCorner;
  ctx.lineWidth = 1.75;
  const bLen = Math.max(5, cellSize * 0.14);
  ctx.beginPath();
  mapData.buildableCells.forEach(({ col, row }) => {
    const bx = col * cellSize + 2;
    const by = row * cellSize + 2;
    const bw = cellSize - 4;
    const bh = cellSize - 4;

    // Top-Left
    ctx.moveTo(bx, by + bLen);
    ctx.lineTo(bx, by);
    ctx.lineTo(bx + bLen, by);

    // Top-Right
    ctx.moveTo(bx + bw - bLen, by);
    ctx.lineTo(bx + bw, by);
    ctx.lineTo(bx + bw, by + bLen);

    // Bottom-Left
    ctx.moveTo(bx, by + bh - bLen);
    ctx.lineTo(bx, by + bh);
    ctx.lineTo(bx + bLen, by + bh);

    // Bottom-Right
    ctx.moveTo(bx + bw - bLen, by + bh);
    ctx.lineTo(bx + bw, by + bh);
    ctx.lineTo(bx + bw, by + bh - bLen);
  });
  ctx.stroke();

  return bg;
}

function getGlowSprites(cellSize, theme, pal) {
  if (cachedSpawnGlow && cachedCoreGlow && cachedGlowTheme === theme && cachedGlowCellSize === cellSize) {
    return { spawn: cachedSpawnGlow, core: cachedCoreGlow };
  }
  const sSize = Math.ceil(cellSize * 0.9);
  const sc = document.createElement('canvas');
  sc.width = sSize;
  sc.height = sSize;
  const sctx = sc.getContext('2d');
  const sr = cellSize * 0.3;
  sctx.fillStyle = pal.spawnGlow;
  sctx.globalAlpha = 0.28;
  sctx.beginPath();
  sctx.arc(sSize / 2, sSize / 2, sr, 0, Math.PI * 2);
  sctx.fill();
  sctx.strokeStyle = pal.spawnCore;
  sctx.globalAlpha = 0.85;
  sctx.lineWidth = 2;
  sctx.stroke();
  sctx.fillStyle = pal.spawnCore;
  sctx.globalAlpha = 1;
  sctx.beginPath();
  sctx.arc(sSize / 2, sSize / 2, cellSize * 0.12, 0, Math.PI * 2);
  sctx.fill();

  const cSize = Math.ceil(cellSize);
  const cc = document.createElement('canvas');
  cc.width = cSize;
  cc.height = cSize;
  const cctx = cc.getContext('2d');
  const cr = cellSize * 0.42;
  cctx.fillStyle = pal.coreFill;
  cctx.fillRect(0, 0, cSize, cSize);
  cctx.strokeStyle = pal.coreGlow;
  cctx.lineWidth = 2.5;
  cctx.beginPath();
  cctx.arc(cSize / 2, cSize / 2, cr, 0, Math.PI * 2);
  cctx.stroke();
  cctx.fillStyle = pal.coreGlow;
  cctx.beginPath();
  cctx.arc(cSize / 2, cSize / 2, cr * 0.3, 0, Math.PI * 2);
  cctx.fill();

  cachedSpawnGlow = sc;
  cachedCoreGlow = cc;
  cachedGlowTheme = theme;
  cachedGlowCellSize = cellSize;
  return { spawn: sc, core: cc };
}

export function drawGridAndMap(ctx, width, height, cellSize, animTime = 0, selectedCell = null, coreFlashAlpha = 0) {
  const theme = getActiveTheme();
  const pal = getPalette(theme);
  // Check or build cached static background (redraws only on resize or theme change)
  if (!cachedBgCanvas || cachedWidth !== width || cachedHeight !== height || cachedTheme !== theme) {
    cachedBgCanvas = createStaticBackground(width, height, cellSize);
    cachedWidth = width;
    cachedHeight = height;
    cachedTheme = theme;
  }

  // Blit static background in 1 call
  ctx.drawImage(cachedBgCanvas, 0, 0);
  const glows = getGlowSprites(cellSize, theme, pal);

  // Animated conveyor chevrons scrolling in exact waypoint travel direction (batched, no per-cell clip)
  const step = cellSize * 0.5;
  const scroll = (animTime * cellSize * 0.45) % step;
  const chevSize = cellSize * 0.16;
  const maxOx = cellSize * 0.5 - chevSize * 0.65 - 2;

  ctx.strokeStyle = pal.pathChevron;
  ctx.globalAlpha = 0.65;
  ctx.lineWidth = Math.max(1.5, cellSize * 0.035);
  ctx.beginPath();
  for (let i = 0; i < pathCellDirections.length; i++) {
    const cell = pathCellDirections[i];
    const cx = (cell.col + 0.5) * cellSize;
    const cy = (cell.row + 0.5) * cellSize;
    const ux = cell.dx;
    const uy = cell.dy;
    const vx = -uy;
    const vy = ux;

    for (let ox = -step + scroll; ox <= maxOx; ox += step) {
      if (ox < -maxOx) continue;
      const tipX = cx + ux * (ox + chevSize * 0.5);
      const tipY = cy + uy * (ox + chevSize * 0.5);
      const backX = cx + ux * (ox - chevSize * 0.55);
      const backY = cy + uy * (ox - chevSize * 0.55);
      ctx.moveTo(backX + vx * chevSize, backY + vy * chevSize);
      ctx.lineTo(tipX, tipY);
      ctx.lineTo(backX - vx * chevSize, backY - vy * chevSize);
    }
  }
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Animated Spawn Portal at Entrance (waypoints[0]) using pre-rendered glow sprite
  const spX = (mapData.waypoints[0].col + 0.5) * cellSize;
  const spY = (mapData.waypoints[0].row + 0.5) * cellSize;
  const spScale = 0.92 + 0.14 * (0.5 + 0.5 * Math.sin(animTime * 4));
  const sw = glows.spawn.width * spScale;
  ctx.drawImage(glows.spawn, spX - sw / 2, spY - sw / 2, sw, sw);

  // Core Base at Exit (col: 15, row: 7) using pre-rendered glow sprite + rotating hex
  const coreX = mapData.core.position.col * cellSize;
  const coreY = mapData.core.position.row * cellSize;
  const cx = coreX + cellSize / 2;
  const cy = coreY + cellSize / 2;
  const cr = cellSize * 0.42;

  ctx.drawImage(glows.core, coreX, coreY);

  ctx.fillStyle = pal.coreFill;
  ctx.strokeStyle = pal.coreGlow;
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3 + animTime * 0.4;
    const px = cx + cr * 0.65 * Math.cos(a);
    const py = cy + cr * 0.65 * Math.sin(a);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, cr * 0.3, 0, Math.PI * 2);
  ctx.fillStyle = pal.coreGlow;
  ctx.fill();

  // Core Damage Flash
  if (coreFlashAlpha > 0) {
    ctx.fillStyle = pal.coreFlash;
    ctx.globalAlpha = Math.min(0.85, coreFlashAlpha);
    ctx.fillRect(coreX, coreY, cellSize, cellSize);
    ctx.strokeStyle = '#ffffff';
    ctx.globalAlpha = Math.min(1, coreFlashAlpha);
    ctx.lineWidth = 2.5;
    ctx.strokeRect(coreX + 1.5, coreY + 1.5, cellSize - 3, cellSize - 3);
    ctx.globalAlpha = 1;
  }

  // Selected Cell Highlight
  if (selectedCell) {
    const sx = selectedCell.col * cellSize;
    const sy = selectedCell.row * cellSize;

    ctx.strokeStyle = pal.selectedCellStroke;
    ctx.lineWidth = 2.5;
    ctx.strokeRect(sx + 1, sy + 1, cellSize - 2, cellSize - 2);

    ctx.fillStyle = pal.selectedCellBg;
    ctx.fillRect(sx, sy, cellSize, cellSize);
  }
}
