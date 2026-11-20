import mapData from '../data/map.json' with { type: 'json' };

/**
 * Grid, Conveyor Path, and Buildable Cell Rendering for Blueprint-on-Steel Theme.
 * Uses offscreen canvas caching for extreme 60+ FPS performance under CPU throttling.
 */
let cachedBgCanvas = null;
let cachedWidth = 0;
let cachedHeight = 0;

function createStaticBackground(width, height, cellSize) {
  const bg = document.createElement('canvas');
  bg.width = width;
  bg.height = height;
  const ctx = bg.getContext('2d');
  const cols = mapData.grid.cols; // 16
  const rows = mapData.grid.rows; // 9

  // 1. Factory Steel Blueprint Background
  ctx.fillStyle = '#0d141e';
  ctx.fillRect(0, 0, width, height);

  // Subtle steel grid lines (single batched path)
  ctx.lineWidth = 1;
  ctx.strokeStyle = '#182738';
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

  // Major accent lines every 4 cells
  ctx.strokeStyle = '#223850';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let c = 0; c <= cols; c += 4) {
    const x = c * cellSize;
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
  }
  for (let r = 0; r <= rows; r += 3) {
    const y = r * cellSize;
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
  }
  ctx.stroke();

  // 2. Conveyor Belt Track (39 Path Cells)
  ctx.fillStyle = '#152130';
  mapData.pathCells.forEach(({ col, row }) => {
    ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
  });

  // Track metal guide rails
  ctx.strokeStyle = '#2b4769';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  mapData.pathCells.forEach(({ col, row }) => {
    const x = col * cellSize;
    const y = row * cellSize;
    ctx.rect(x, y, cellSize, cellSize);
  });
  ctx.stroke();

  // 3. Entrance Spawn Bay (col: 0, row: 2)
  const entX = 0;
  const entY = 2 * cellSize;
  ctx.fillStyle = '#221915';
  ctx.fillRect(entX, entY, cellSize, cellSize);
  // Hazard caution stripes
  ctx.strokeStyle = '#ff9f43';
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let i = -cellSize; i < cellSize * 2; i += 12) {
    ctx.moveTo(entX, entY + i);
    ctx.lineTo(entX + cellSize, entY + i - cellSize);
  }
  ctx.stroke();
  ctx.strokeStyle = '#ff793f';
  ctx.lineWidth = 3;
  ctx.strokeRect(entX, entY, cellSize, cellSize);

  // 4. Buildable Assembly Pads (28 dedicated cells)
  ctx.fillStyle = 'rgba(46, 213, 115, 0.05)';
  mapData.buildableCells.forEach(({ col, row }) => {
    ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
  });

  // Corner brackets (batched)
  ctx.strokeStyle = '#2e4a6e';
  ctx.lineWidth = 1.5;
  const bLen = 6;
  ctx.beginPath();
  mapData.buildableCells.forEach(({ col, row }) => {
    const bx = col * cellSize;
    const by = row * cellSize;

    // Top-Left
    ctx.moveTo(bx, by + bLen);
    ctx.lineTo(bx, by);
    ctx.lineTo(bx + bLen, by);

    // Top-Right
    ctx.moveTo(bx + cellSize - bLen, by);
    ctx.lineTo(bx + cellSize, by);
    ctx.lineTo(bx + cellSize, by + bLen);

    // Bottom-Left
    ctx.moveTo(bx, by + cellSize - bLen);
    ctx.lineTo(bx, by + cellSize);
    ctx.lineTo(bx + bLen, by + cellSize);

    // Bottom-Right
    ctx.moveTo(bx + cellSize - bLen, by + cellSize);
    ctx.lineTo(bx + cellSize, by + cellSize);
    ctx.lineTo(bx + cellSize, by + cellSize - bLen);
  });
  ctx.stroke();

  return bg;
}

export function drawGridAndMap(ctx, width, height, cellSize, animTime = 0, selectedCell = null) {
  // Check or build cached static background
  if (!cachedBgCanvas || cachedWidth !== width || cachedHeight !== height) {
    cachedBgCanvas = createStaticBackground(width, height, cellSize);
    cachedWidth = width;
    cachedHeight = height;
  }

  // Blit static background in 1 call
  ctx.drawImage(cachedBgCanvas, 0, 0);

  // Animated chevrons along path (batched)
  const chevronOffset = (animTime * 20) % (cellSize * 0.5);
  ctx.strokeStyle = 'rgba(72, 219, 251, 0.15)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  mapData.pathCells.forEach(({ col, row }) => {
    const x = col * cellSize;
    const y = row * cellSize;
    ctx.moveTo(x + cellSize * 0.35 + chevronOffset, y + cellSize * 0.3);
    ctx.lineTo(x + cellSize * 0.5 + chevronOffset, y + cellSize * 0.5);
    ctx.lineTo(x + cellSize * 0.35 + chevronOffset, y + cellSize * 0.7);
  });
  ctx.stroke();

  // Core Base at Exit (col: 15, row: 7)
  const coreX = mapData.core.position.col * cellSize;
  const coreY = mapData.core.position.row * cellSize;
  const cx = coreX + cellSize / 2;
  const cy = coreY + cellSize / 2;
  const cr = cellSize * 0.42;

  ctx.fillStyle = '#11291f';
  ctx.fillRect(coreX, coreY, cellSize, cellSize);

  const pulse = Math.sin(animTime * 3) * 0.15 + 0.85;
  ctx.strokeStyle = `rgba(46, 213, 115, ${pulse})`;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, cr, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#1c4d36';
  ctx.strokeStyle = '#2ed573';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3;
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
