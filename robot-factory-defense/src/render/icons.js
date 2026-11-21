/**
 * Procedural Canvas2D Monoline Vector Icons for Towers and Enemies.
 * No external sprite images are used (0 external assets).
 * Purely drawn with Canvas primitives in code, with internal procedural offscreen caches
 * to guarantee ultra-fast 60+ FPS (p95 <= 20ms) under 4x CPU throttle.
 */

// Helper to draw a regular polygon
function drawPolygon(ctx, x, y, radius, sides, rotation = 0) {
  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const angle = rotation + (i * 2 * Math.PI) / sides;
    const px = x + radius * Math.cos(angle);
    const py = y + radius * Math.sin(angle);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

/**
 * Procedural Enemy Sprite Caches (Generated purely in code with Canvas primitives)
 */
const enemyCache = {};

function getEnemySprite(type, size) {
  const key = `${type}_${size}`;
  if (enemyCache[key]) return enemyCache[key];

  const canvas = document.createElement('canvas');
  const dim = Math.ceil(size * 1.6);
  canvas.width = dim;
  canvas.height = dim;
  const ctx = canvas.getContext('2d');
  const cx = dim / 2;
  const cy = dim / 2;
  const r = size * 0.38;

  switch (type) {
    case 'glitchbot': {
      // Shape: Diamond (#e056fd)
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#e056fd';
      ctx.fillStyle = '#2e1236';
      ctx.beginPath();
      ctx.moveTo(cx, cy - r);
      ctx.lineTo(cx + r, cy);
      ctx.lineTo(cx, cy + r);
      ctx.lineTo(cx - r, cy);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Slit eye
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.45, cy);
      ctx.lineTo(cx + r * 0.45, cy);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
      break;
    }

    case 'rust_walker': {
      // Shape: Square (#f0932b)
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#f0932b';
      ctx.fillStyle = '#362110';
      const half = r * 0.75;
      ctx.fillRect(cx - half, cy - half, half * 2, half * 2);
      ctx.strokeRect(cx - half, cy - half, half * 2, half * 2);

      // Mechanical grill visor
      ctx.strokeStyle = '#ffa801';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx - 4, cy - half * 0.6);
      ctx.lineTo(cx - 4, cy + half * 0.6);
      ctx.moveTo(cx, cy - half * 0.6);
      ctx.lineTo(cx, cy + half * 0.6);
      ctx.moveTo(cx + 4, cy - half * 0.6);
      ctx.lineTo(cx + 4, cy + half * 0.6);
      ctx.stroke();
      break;
    }

    case 'spark_drone': {
      // Shape: 4-pointed Cross (#f9ca24)
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#f9ca24';
      ctx.fillStyle = '#332b0e';

      const armW = r * 0.35;
      ctx.beginPath();
      ctx.moveTo(cx - armW, cy - r);
      ctx.lineTo(cx + armW, cy - r);
      ctx.lineTo(cx + armW, cy - armW);
      ctx.lineTo(cx + r, cy - armW);
      ctx.lineTo(cx + r, cy + armW);
      ctx.lineTo(cx + armW, cy + armW);
      ctx.lineTo(cx + armW, cy + r);
      ctx.lineTo(cx - armW, cy + r);
      ctx.lineTo(cx - armW, cy + armW);
      ctx.lineTo(cx - r, cy + armW);
      ctx.lineTo(cx - r, cy - armW);
      ctx.lineTo(cx - armW, cy - armW);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Central core dot
      ctx.beginPath();
      ctx.arc(cx, cy, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      break;
    }

    case 'crusher_tank': {
      // Shape: Wide Rectangle Chassis (#eb4d4b)
      const w = r * 1.35;
      const h = r * 0.85;
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#eb4d4b';
      ctx.fillStyle = '#361111';
      ctx.fillRect(cx - w, cy - h, w * 2, h * 2);
      ctx.strokeRect(cx - w, cy - h, w * 2, h * 2);

      // Dual treads
      ctx.fillStyle = '#1a0808';
      ctx.strokeStyle = '#ff7979';
      ctx.lineWidth = 1.5;
      ctx.fillRect(cx - w - 3, cy - h, 3, h * 2);
      ctx.strokeRect(cx - w - 3, cy - h, 3, h * 2);
      ctx.fillRect(cx + w, cy - h, 3, h * 2);
      ctx.strokeRect(cx + w, cy - h, 3, h * 2);
      break;
    }

    case 'iron_sentry': {
      // Shape: Octagon (Wave 10 Mini-Boss) (#6ab04c)
      const bossR = r * 1.35;
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#6ab04c';
      ctx.fillStyle = '#162913';
      drawPolygon(ctx, cx, cy, bossR, 8);
      ctx.fill();
      ctx.stroke();

      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#badc58';
      drawPolygon(ctx, cx, cy, bossR * 0.65, 8);
      ctx.stroke();
      break;
    }

    case 'mega_mixer': {
      // Shape: Spiked Cog (Wave 15 Boss) (#c0392b)
      const bossR = r * 1.5;
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#c0392b';
      ctx.fillStyle = '#360909';

      const spikes = 8;
      ctx.beginPath();
      for (let i = 0; i < spikes; i++) {
        const a1 = (i * 2 * Math.PI) / spikes;
        const a2 = a1 + Math.PI / spikes;
        ctx.lineTo(cx + Math.cos(a1) * (bossR * 0.7), cy + Math.sin(a1) * (bossR * 0.7));
        ctx.lineTo(cx + Math.cos(a2) * bossR, cy + Math.sin(a2) * bossR);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx, cy, bossR * 0.35, 0, Math.PI * 2);
      ctx.fillStyle = '#eb4d4b';
      ctx.fill();
      break;
    }

    default: {
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#e056fd';
      ctx.fillStyle = '#2e1236';
      drawPolygon(ctx, cx, cy, r, 4);
      ctx.fill();
      ctx.stroke();
    }
  }

  enemyCache[key] = { canvas, dim, offset: dim / 2 };
  return enemyCache[key];
}

/**
 * Draw enemy icon using cached procedural offscreen canvas.
 */
export function drawEnemyIcon(ctx, enemy, x, y, size, hpRatio = 1, slowed = false, drawBars = false) {
  const type = enemy.type || 'glitchbot';
  const sprite = getEnemySprite(type, size);

  // Blit procedural icon in 1 hardware-accelerated call
  ctx.drawImage(sprite.canvas, x - sprite.offset, y - sprite.offset);

  // Slowed Frost Ring
  if (slowed) {
    const r = size * 0.38;
    ctx.strokeStyle = '#00d2d3';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, r * 1.35, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Health Bar (only when standalone drawing is requested)
  if (drawBars) {
    const r = size * 0.38;
    const barW = Math.max(r * 2.2, 28);
    const barH = enemy.isBoss ? 5 : 3.5;
    const barY = y - r * (enemy.isBoss ? 1.6 : 1.35) - 6;

    // Background
    ctx.fillStyle = '#000000';
    ctx.fillRect(x - barW / 2 - 1, barY - 1, barW + 2, barH + 2);

    // Fill
    const fillW = Math.max(0, Math.min(1, hpRatio)) * barW;
    ctx.fillStyle = hpRatio > 0.5 ? '#2ed573' : hpRatio > 0.25 ? '#feca57' : '#ff4757';
    ctx.fillRect(x - barW / 2, barY, fillW, barH);
  }
}

/**
 * Procedural Tower Drawing Functions
 */
export function drawPulseTurret(ctx, x, y, size, level = 1, angle = 0) {
  const r = size * 0.42;

  ctx.save();
  ctx.translate(x, y);

  ctx.lineWidth = 2;
  ctx.strokeStyle = '#2e4a6e';
  ctx.fillStyle = '#14202e';
  drawPolygon(ctx, 0, 0, r, 8);
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, 0, r * 0.65, 0, Math.PI * 2);
  ctx.strokeStyle = '#00d2d3';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.save();
  ctx.rotate(angle);

  const bLen = r * 1.1;
  const bW = r * 0.22;
  const bSep = r * 0.25;

  ctx.fillStyle = '#233a57';
  ctx.strokeStyle = '#48dbfb';
  ctx.lineWidth = 1.5;

  ctx.fillRect(0, -bSep - bW / 2, bLen, bW);
  ctx.strokeRect(0, -bSep - bW / 2, bLen, bW);
  ctx.fillRect(0, bSep - bW / 2, bLen, bW);
  ctx.strokeRect(0, bSep - bW / 2, bLen, bW);

  ctx.fillStyle = '#ff793f';
  ctx.fillRect(bLen - 3, -bSep - bW / 2, 4, bW);
  ctx.fillRect(bLen - 3, bSep - bW / 2, 4, bW);

  ctx.fillStyle = '#1b2c40';
  ctx.strokeStyle = '#00d2d3';
  ctx.lineWidth = 2;
  drawPolygon(ctx, 0, 0, r * 0.5, 6);
  ctx.fill();
  ctx.stroke();

  ctx.restore();

  for (let i = 0; i < level; i++) {
    const pipAngle = -Math.PI / 2 + (i - (level - 1) / 2) * 0.35;
    const px = Math.cos(pipAngle) * (r * 0.88);
    const py = Math.sin(pipAngle) * (r * 0.88);
    ctx.beginPath();
    ctx.arc(px, py, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = '#feca57';
    ctx.fill();
  }

  ctx.restore();
}

export function drawCoolantSprayer(ctx, x, y, size, level = 1, angle = 0) {
  const r = size * 0.42;

  ctx.save();
  ctx.translate(x, y);

  ctx.lineWidth = 2;
  ctx.strokeStyle = '#0abde3';
  ctx.fillStyle = '#102235';
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = 'rgba(72, 219, 251, 0.4)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * (r * 0.8), Math.sin(a) * (r * 0.8));
    ctx.stroke();
  }

  ctx.save();
  ctx.rotate(angle);

  ctx.beginPath();
  ctx.moveTo(0, -r * 0.2);
  ctx.lineTo(r * 0.9, -r * 0.55);
  ctx.lineTo(r * 0.9, r * 0.55);
  ctx.lineTo(0, r * 0.2);
  ctx.closePath();
  ctx.fillStyle = '#1c3d5a';
  ctx.fill();
  ctx.strokeStyle = '#48dbfb';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(r * 0.9, 0, r * 0.55, -Math.PI / 4, Math.PI / 4);
  ctx.strokeStyle = '#00d2d3';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.restore();

  for (let i = 0; i < level; i++) {
    const px = (i - (level - 1) / 2) * 7;
    const py = r * 0.75;
    ctx.beginPath();
    ctx.arc(px, py, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = '#48dbfb';
    ctx.fill();
  }

  ctx.restore();
}

export function drawArcCoil(ctx, x, y, size, level = 1, _angle = 0) {
  const r = size * 0.42;

  ctx.save();
  ctx.translate(x, y);

  ctx.lineWidth = 2;
  ctx.strokeStyle = '#a55eea';
  ctx.fillStyle = '#1a182e';
  drawPolygon(ctx, 0, 0, r, 4, Math.PI / 4);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = '#706fd3';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.7, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, 0, r * 0.45, 0, Math.PI * 2);
  ctx.strokeStyle = '#a55eea';
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, 0, r * 0.25, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.strokeStyle = '#d6a2e8';
  ctx.lineWidth = 2;
  ctx.stroke();

  for (let i = 0; i < level; i++) {
    const px = (i - (level - 1) / 2) * 7;
    const py = r * 0.78;
    ctx.beginPath();
    ctx.arc(px, py, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = '#a55eea';
    ctx.fill();
  }

  ctx.restore();
}

export function drawRocketRack(ctx, x, y, size, level = 1, angle = 0) {
  const r = size * 0.42;

  ctx.save();
  ctx.translate(x, y);

  ctx.lineWidth = 2;
  ctx.strokeStyle = '#ff793f';
  ctx.fillStyle = '#221915';
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.save();
  ctx.rotate(angle);

  const podW = r * 1.3;
  const podH = r * 1.0;
  ctx.fillStyle = '#2d1e18';
  ctx.strokeStyle = '#ff9f43';
  ctx.lineWidth = 2;
  ctx.fillRect(-podW / 2, -podH / 2, podW, podH);
  ctx.strokeRect(-podW / 2, -podH / 2, podW, podH);

  const tubeR = podH * 0.18;
  const offsetX = podW * 0.22;
  const offsetY = podH * 0.22;

  const tubes = [
    [-offsetX, -offsetY],
    [offsetX, -offsetY],
    [-offsetX, offsetY],
    [offsetX, offsetY]
  ];

  tubes.forEach(([tx, ty]) => {
    ctx.beginPath();
    ctx.arc(tx, ty, tubeR, 0, Math.PI * 2);
    ctx.fillStyle = '#0d0d0e';
    ctx.fill();
    ctx.strokeStyle = '#ff793f';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(tx, ty, tubeR * 0.5, 0, Math.PI * 2);
    ctx.fillStyle = '#ff793f';
    ctx.fill();
  });

  ctx.restore();

  for (let i = 0; i < level; i++) {
    const px = (i - (level - 1) / 2) * 8;
    const py = r * 0.8;
    ctx.beginPath();
    ctx.arc(px, py, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = '#ff9f43';
    ctx.fill();
  }

  ctx.restore();
}

export function drawFabricator(ctx, x, y, size, rotation = 0) {
  const r = size * 0.42;

  ctx.save();
  ctx.translate(x, y);

  ctx.lineWidth = 2;
  ctx.strokeStyle = '#2ed573';
  ctx.fillStyle = '#12261b';
  ctx.fillRect(-r, -r, r * 2, r * 2);
  ctx.strokeRect(-r, -r, r * 2, r * 2);

  ctx.save();
  ctx.rotate(rotation);

  ctx.strokeStyle = '#2ed573';
  ctx.fillStyle = '#1e3d2b';
  ctx.lineWidth = 2;

  const teeth = 6;
  ctx.beginPath();
  for (let i = 0; i < teeth; i++) {
    const a1 = (i * 2 * Math.PI) / teeth;
    const a2 = a1 + Math.PI / teeth;
    const innerR = r * 0.55;
    const outerR = r * 0.8;

    ctx.lineTo(Math.cos(a1) * innerR, Math.sin(a1) * innerR);
    ctx.lineTo(Math.cos(a1 + 0.15) * outerR, Math.sin(a1 + 0.15) * outerR);
    ctx.lineTo(Math.cos(a2 - 0.15) * outerR, Math.sin(a2 - 0.15) * outerR);
    ctx.lineTo(Math.cos(a2) * innerR, Math.sin(a2) * innerR);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, 0, r * 0.3, 0, Math.PI * 2);
  ctx.fillStyle = '#00d2d3';
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.restore();
  ctx.restore();
}

export function drawTowerIcon(ctx, type, x, y, size, level = 1, angle = 0, animTime = 0) {
  switch (type) {
    case 'pulse':
      drawPulseTurret(ctx, x, y, size, level, angle);
      break;
    case 'coolant':
      drawCoolantSprayer(ctx, x, y, size, level, angle);
      break;
    case 'arc':
      drawArcCoil(ctx, x, y, size, level, angle);
      break;
    case 'rocket':
      drawRocketRack(ctx, x, y, size, level, angle);
      break;
    case 'fabricator':
      drawFabricator(ctx, x, y, size, animTime * 0.8);
      break;
    default:
      drawPulseTurret(ctx, x, y, size, level, angle);
  }
}
