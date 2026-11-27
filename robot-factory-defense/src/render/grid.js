import mapData from '../data/map.json' with { type: 'json' };

/**
 * Grid, Conveyor Path, and Buildable Cell Rendering for Blueprint-on-Steel Theme.
 * Uses offscreen canvas caching for extreme 60+ FPS performance under CPU throttling.
 */
let cachedBgCanvas = null;
let cachedWidth = 0;
let cachedHeight = 0;

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

function drawDeadCellDecor(ctx, x, y, cellSize, col, row) {
  const h = cellHash(col, row);
  const variant = h % 5;
  const pad = cellSize * 0.16;

  if (variant === 0) {
    // Louvered floor vent
    const vx = x + pad;
    const vy = y + pad * 1.1;
    const vw = cellSize - pad * 2;
    const vh = cellSize - pad * 2.2;
    ctx.fillStyle = '#070b11';
    ctx.fillRect(vx, vy, vw, vh);
    ctx.strokeStyle = '#182433';
    ctx.lineWidth = 1;
    ctx.strokeRect(vx, vy, vw, vh);
    ctx.beginPath();
    for (let i = 1; i <= 3; i++) {
      const ly = vy + (vh * i) / 4;
      ctx.moveTo(vx + 3, ly);
      ctx.lineTo(vx + vw - 3, ly);
    }
    ctx.strokeStyle = '#1a293a';
    ctx.stroke();
  } else if (variant === 1) {
    // Sub-floor conduit pipe
    const horizontal = (h & 8) === 0;
    ctx.strokeStyle = '#162231';
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
    ctx.strokeStyle = '#1e3044';
    ctx.lineWidth = 1;
    ctx.stroke();
  } else if (variant === 2) {
    // Corner rivets on dark steel plate
    const inset = cellSize * 0.16;
    ctx.fillStyle = '#1b2b3d';
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
  const bg = document.createElement('canvas');
  bg.width = width;
  bg.height = height;
  const ctx = bg.getContext('2d');
  const cols = mapData.grid.cols; // 16
  const rows = mapData.grid.rows; // 9

  // 1. Dark Factory Dead-Cell Steel Background
  ctx.fillStyle = '#090e15';
  ctx.fillRect(0, 0, width, height);

  // Subtle steel grid lines (single batched path)
  ctx.lineWidth = 1;
  ctx.strokeStyle = '#121d2b';
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
        drawDeadCellDecor(ctx, c * cellSize, r * cellSize, cellSize, c, r);
      }
    }
  }

  // 2. Conveyor Belt Track (clearly lighter than dead & buildable cells)
  const railInset = Math.max(2, cellSize * 0.06);
  mapData.pathCells.forEach(({ col, row }) => {
    const x = col * cellSize;
    const y = row * cellSize;
    ctx.fillStyle = '#26394f';
    ctx.fillRect(x, y, cellSize, cellSize);

    // Inner belt bed
    ctx.fillStyle = '#2d435c';
    ctx.fillRect(x + railInset, y + railInset, cellSize - railInset * 2, cellSize - railInset * 2);
  });

  // Track metal guide rails on exposed edges
  ctx.strokeStyle = '#53789e';
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
  ctx.fillStyle = '#241812';
  ctx.fillRect(entX, entY, cellSize, cellSize);
  // Hazard caution stripes clipped to entrance cell
  ctx.save();
  ctx.beginPath();
  ctx.rect(entX, entY, cellSize, cellSize);
  ctx.clip();
  ctx.strokeStyle = 'rgba(255, 159, 67, 0.55)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let i = -cellSize; i < cellSize * 2; i += 10) {
    ctx.moveTo(entX, entY + i);
    ctx.lineTo(entX + cellSize, entY + i - cellSize);
  }
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = '#ff9f43';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(entX + 1.5, entY + 1.5, cellSize - 3, cellSize - 3);

  // 4. Buildable Assembly Pads (distinct plated pads)
  const padInset = Math.max(3, cellSize * 0.08);
  mapData.buildableCells.forEach(({ col, row }) => {
    const bx = col * cellSize;
    const by = row * cellSize;

    // Outer pad base
    ctx.fillStyle = '#132030';
    ctx.fillRect(bx + 1, by + 1, cellSize - 2, cellSize - 2);

    // Raised inner steel plate
    ctx.fillStyle = '#1b2e44';
    ctx.fillRect(bx + padInset, by + padInset, cellSize - padInset * 2, cellSize - padInset * 2);

    ctx.strokeStyle = '#2f4f73';
    ctx.lineWidth = 1;
    ctx.strokeRect(bx + padInset, by + padInset, cellSize - padInset * 2, cellSize - padInset * 2);

    // Center mounting socket
    ctx.beginPath();
    ctx.arc(bx + cellSize / 2, by + cellSize / 2, cellSize * 0.1, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(72, 219, 251, 0.25)';
    ctx.stroke();
  });

  // Corner brackets (batched)
  ctx.strokeStyle = '#48a9c5';
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

export function drawGridAndMap(ctx, width, height, cellSize, animTime = 0, selectedCell = null, coreFlashAlpha = 0) {
  // Check or build cached static background
  if (!cachedBgCanvas || cachedWidth !== width || cachedHeight !== height) {
    cachedBgCanvas = createStaticBackground(width, height, cellSize);
    cachedWidth = width;
    cachedHeight = height;
  }

  // Blit static background in 1 call
  ctx.drawImage(cachedBgCanvas, 0, 0);

  // Animated conveyor chevrons scrolling in exact waypoint travel direction
  const halfCell = cellSize * 0.5;
  const step = cellSize * 0.5;
  const scroll = (animTime * cellSize * 0.45) % step;
  const chevSize = cellSize * 0.18;

  ctx.strokeStyle = 'rgba(116, 224, 255, 0.35)';
  ctx.lineWidth = Math.max(1.5, cellSize * 0.035);
  for (let i = 0; i < pathCellDirections.length; i++) {
    const cell = pathCellDirections[i];
    const cx = (cell.col + 0.5) * cellSize;
    const cy = (cell.row + 0.5) * cellSize;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(cell.angle);
    ctx.beginPath();
    ctx.rect(-halfCell + 2, -halfCell + 2, cellSize - 4, cellSize - 4);
    ctx.clip();

    ctx.beginPath();
    for (let ox = -step + scroll; ox <= halfCell + chevSize; ox += step) {
      ctx.moveTo(ox - chevSize * 0.6, -chevSize);
      ctx.lineTo(ox + chevSize * 0.5, 0);
      ctx.lineTo(ox - chevSize * 0.6, chevSize);
    }
    ctx.stroke();
    ctx.restore();
  }

  // Animated Spawn Portal at Entrance (waypoints[0])
  const spX = (mapData.waypoints[0].col + 0.5) * cellSize;
  const spY = (mapData.waypoints[0].row + 0.5) * cellSize;
  const spPulse = 0.5 + 0.5 * Math.sin(animTime * 4);
  const spR = cellSize * (0.24 + spPulse * 0.06);

  ctx.save();
  ctx.beginPath();
  ctx.arc(spX, spY, spR, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(255, 159, 67, ${0.2 + spPulse * 0.25})`;
  ctx.fill();
  ctx.strokeStyle = `rgba(255, 121, 63, ${0.7 + spPulse * 0.3})`;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(spX, spY, cellSize * 0.12, 0, Math.PI * 2);
  ctx.fillStyle = '#ff9f43';
  ctx.fill();
  ctx.restore();

  // Core Base at Exit (col: 15, row: 7)
  const coreX = mapData.core.position.col * cellSize;
  const coreY = mapData.core.position.row * cellSize;
  const cx = coreX + cellSize / 2;
  const cy = coreY + cellSize / 2;
  const cr = cellSize * 0.42;

  ctx.fillStyle = '#0f241b';
  ctx.fillRect(coreX, coreY, cellSize, cellSize);

  const pulse = Math.sin(animTime * 3.5) * 0.2 + 0.8;
  ctx.strokeStyle = `rgba(46, 213, 115, ${pulse})`;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(cx, cy, cr * (0.95 + Math.sin(animTime * 3.5) * 0.05), 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#1c4d36';
  ctx.strokeStyle = '#2ed573';
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
  ctx.fillStyle = '#2ed573';
  ctx.fill();

  // Core Damage Flash
  if (coreFlashAlpha > 0) {
    ctx.save();
    ctx.fillStyle = `rgba(255, 71, 87, ${Math.min(0.85, coreFlashAlpha)})`;
    ctx.fillRect(coreX, coreY, cellSize, cellSize);
    ctx.strokeStyle = `rgba(255, 255, 255, ${Math.min(1, coreFlashAlpha)})`;
    ctx.lineWidth = 2.5;
    ctx.strokeRect(coreX + 1.5, coreY + 1.5, cellSize - 3, cellSize - 3);
    ctx.restore();
  }

  // Selected Cell Highlight
  if (selectedCell) {
    const sx = selectedCell.col * cellSize;
    const sy = selectedCell.row * cellSize;

    ctx.strokeStyle = '#ff793f';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(sx + 1, sy + 1, cellSize - 2, cellSize - 2);

    ctx.fillStyle = 'rgba(255, 121, 63, 0.15)';
    ctx.fillRect(sx, sy, cellSize, cellSize);
  }
}
