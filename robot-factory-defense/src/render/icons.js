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
 * Procedural Enemy Sprite Caches (Generated purely in code with Canvas primitives).
 * All sprites face +X (angle = 0) so rotating by travel angle points them forward.
 */
const enemyCache = {};

function createTintVariant(sourceCanvas, fillStyle) {
  const tinted = document.createElement('canvas');
  tinted.width = sourceCanvas.width;
  tinted.height = sourceCanvas.height;
  const tctx = tinted.getContext('2d');
  tctx.drawImage(sourceCanvas, 0, 0);
  tctx.globalCompositeOperation = 'source-atop';
  tctx.fillStyle = fillStyle;
  tctx.fillRect(0, 0, tinted.width, tinted.height);
  return tinted;
}

/**
 * Draw a small 6-spoke procedural snowflake pip centered at (x, y).
 */
export function drawSnowflakePip(ctx, x, y, radius = 4.5) {
  ctx.beginPath();
  for (let i = 0; i < 3; i++) {
    const a = (i * Math.PI) / 3;
    const dx = Math.cos(a) * radius;
    const dy = Math.sin(a) * radius;
    ctx.moveTo(x - dx, y - dy);
    ctx.lineTo(x + dx, y + dy);
  }
  ctx.stroke();
}

export function getEnemySprite(type, size) {
  const key = `${type}_${size}`;
  if (enemyCache[key]) return enemyCache[key];

  const isBoss = type === 'iron_sentry' || type === 'mega_mixer';
  const canvas = document.createElement('canvas');
  const dim = Math.ceil(size * (isBoss ? 2.4 : 1.9));
  canvas.width = dim;
  canvas.height = dim;
  const ctx = canvas.getContext('2d');
  const cx = dim / 2;
  const cy = dim / 2;
  const r = size * 0.36;

  switch (type) {
    case 'glitchbot': {
      // Shape: Sleek Arrowhead / Diamond (#e056fd) facing +X
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#e056fd';
      ctx.fillStyle = '#2e1236';
      ctx.beginPath();
      ctx.moveTo(cx + r * 1.15, cy);
      ctx.lineTo(cx - r * 0.2, cy - r * 0.85);
      ctx.lineTo(cx - r * 0.9, cy);
      ctx.lineTo(cx - r * 0.2, cy + r * 0.85);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Forward visor slit
      ctx.beginPath();
      ctx.moveTo(cx + r * 0.15, cy - r * 0.35);
      ctx.lineTo(cx + r * 0.65, cy);
      ctx.lineTo(cx + r * 0.15, cy + r * 0.35);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
      break;
    }

    case 'rust_walker': {
      // Shape: Industrial Square Chassis (#f0932b) facing +X
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#f0932b';
      ctx.fillStyle = '#362110';
      const half = r * 0.78;
      ctx.fillRect(cx - half, cy - half, half * 2, half * 2);
      ctx.strokeRect(cx - half, cy - half, half * 2, half * 2);

      // Forward grill visor on +X face
      ctx.strokeStyle = '#ffa801';
      ctx.lineWidth = 1.75;
      ctx.beginPath();
      ctx.moveTo(cx + half * 0.35, cy - half * 0.55);
      ctx.lineTo(cx + half * 0.35, cy + half * 0.55);
      ctx.moveTo(cx + half * 0.65, cy - half * 0.45);
      ctx.lineTo(cx + half * 0.65, cy + half * 0.45);
      ctx.stroke();

      // Shoulder rivets
      ctx.fillStyle = '#f0932b';
      ctx.fillRect(cx - half * 0.7, cy - half * 0.7, 3, 3);
      ctx.fillRect(cx - half * 0.7, cy + half * 0.7 - 3, 3, 3);
      break;
    }

    case 'spark_drone': {
      // Shape: Diagonal X-frame Quad-Rotor Drone (#f9ca24) facing +X
      const armReach = r * 0.88;
      const rotorR = r * 0.3;

      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#f9ca24';
      ctx.beginPath();
      ctx.moveTo(cx - armReach, cy - armReach);
      ctx.lineTo(cx + armReach, cy + armReach);
      ctx.moveTo(cx - armReach, cy + armReach);
      ctx.lineTo(cx + armReach, cy - armReach);
      ctx.stroke();

      // 4 rotor rings at diagonal arm tips
      const rotors = [
        [-armReach, -armReach],
        [armReach, -armReach],
        [-armReach, armReach],
        [armReach, armReach]
      ];
      ctx.fillStyle = '#332b0e';
      ctx.lineWidth = 1.75;
      for (let i = 0; i < rotors.length; i++) {
        ctx.beginPath();
        ctx.arc(cx + rotors[i][0], cy + rotors[i][1], rotorR, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      // Central fuselage pod + forward spark
      ctx.fillStyle = '#332b0e';
      ctx.strokeStyle = '#fff200';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.42, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx + r * 0.25, cy, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      break;
    }

    case 'crusher_tank': {
      // Shape: Heavy Rectangular Tank (#eb4d4b) with top/bottom treads facing +X
      const w = r * 1.15;
      const h = r * 0.78;
      // Dual horizontal treads (top & bottom)
      ctx.fillStyle = '#1a0808';
      ctx.strokeStyle = '#ff7979';
      ctx.lineWidth = 1.5;
      ctx.fillRect(cx - w, cy - h - 4, w * 2, 4);
      ctx.strokeRect(cx - w, cy - h - 4, w * 2, 4);
      ctx.fillRect(cx - w, cy + h, w * 2, 4);
      ctx.strokeRect(cx - w, cy + h, w * 2, 4);

      // Armored hull
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#eb4d4b';
      ctx.fillStyle = '#361111';
      ctx.fillRect(cx - w, cy - h, w * 2, h * 2);
      ctx.strokeRect(cx - w, cy - h, w * 2, h * 2);

      // Forward ram & turret barrel (+X)
      ctx.fillStyle = '#ff7979';
      ctx.fillRect(cx + w * 0.2, cy - 2.5, w * 0.95, 5);
      break;
    }

    case 'iron_sentry': {
      // Shape: Heavy Armored Octagon Siege Mini-Boss (#6ab04c) facing +X
      const bossR = r * 1.85;
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = '#6ab04c';
      ctx.fillStyle = '#162913';
      drawPolygon(ctx, cx, cy, bossR, 8);
      ctx.fill();
      ctx.stroke();

      // Angled shoulder armor plates
      ctx.fillStyle = '#24421f';
      ctx.strokeStyle = '#badc58';
      ctx.lineWidth = 2;
      drawPolygon(ctx, cx, cy, bossR * 0.68, 8);
      ctx.fill();
      ctx.stroke();

      // Twin forward siege cannons (+X)
      ctx.fillStyle = '#badc58';
      ctx.fillRect(cx + bossR * 0.45, cy - bossR * 0.34, bossR * 0.52, bossR * 0.18);
      ctx.fillRect(cx + bossR * 0.45, cy + bossR * 0.16, bossR * 0.52, bossR * 0.18);

      // Central reactor core
      ctx.beginPath();
      ctx.arc(cx, cy, bossR * 0.24, 0, Math.PI * 2);
      ctx.fillStyle = '#badc58';
      ctx.fill();
      break;
    }

    case 'mega_mixer': {
      // Shape: Colossal 10-Tooth Spiked Saw-Cog Boss (#c0392b) facing +X
      const bossR = r * 2.15;
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = '#ff4757';
      ctx.fillStyle = '#360909';

      const spikes = 10;
      ctx.beginPath();
      for (let i = 0; i < spikes; i++) {
        const a1 = (i * 2 * Math.PI) / spikes;
        const a2 = a1 + Math.PI / spikes;
        ctx.lineTo(cx + Math.cos(a1) * (bossR * 0.68), cy + Math.sin(a1) * (bossR * 0.68));
        ctx.lineTo(cx + Math.cos(a2) * bossR, cy + Math.sin(a2) * bossR);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Heavy inner armor ring
      ctx.beginPath();
      ctx.arc(cx, cy, bossR * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = '#521010';
      ctx.fill();
      ctx.strokeStyle = '#ff7979';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Twin forward grinder mandibles (+X)
      ctx.fillStyle = '#feca57';
      ctx.fillRect(cx + bossR * 0.48, cy - bossR * 0.28, bossR * 0.48, bossR * 0.16);
      ctx.fillRect(cx + bossR * 0.48, cy + bossR * 0.12, bossR * 0.48, bossR * 0.16);

      // Glowing molten core
      ctx.beginPath();
      ctx.arc(cx, cy, bossR * 0.24, 0, Math.PI * 2);
      ctx.fillStyle = '#ff6b6b';
      ctx.fill();
      ctx.strokeStyle = '#feca57';
      ctx.lineWidth = 2;
      ctx.stroke();
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

  const flashCanvas = createTintVariant(canvas, 'rgba(255, 255, 255, 0.72)');
  const slowCanvas = createTintVariant(canvas, 'rgba(72, 219, 251, 0.45)');
  enemyCache[key] = { canvas, flashCanvas, slowCanvas, dim, offset: dim / 2 };
  return enemyCache[key];
}

/**
 * Draw enemy icon using cached procedural offscreen canvas.
 */
export function drawEnemyIcon(ctx, enemy, x, y, size, hpRatio = 1, slowed = false, drawBars = false, options = {}) {
  const type = enemy.type || 'glitchbot';
  const sprite = getEnemySprite(type, size);
  const { angle = 0, bobOffset = 0, wobble = 0, hitFlash = false } = options;
  const isSlowed = slowed || Boolean(options.slowed) || (enemy.slowTimer > 0);
  const img = hitFlash ? sprite.flashCanvas : (isSlowed ? sprite.slowCanvas : sprite.canvas);

  if (angle !== 0 || bobOffset !== 0 || wobble !== 0) {
    ctx.save();
    ctx.translate(x, y + bobOffset);
    ctx.rotate(angle + wobble);
    ctx.drawImage(img, -sprite.offset, -sprite.offset);
    ctx.restore();
  } else {
    ctx.drawImage(img, x - sprite.offset, y - sprite.offset);
  }

  // Standalone Slowed Frost Ring + Snowflake Pip
  if (slowed) {
    const r = size * 0.38 * (enemy.isBoss ? 1.85 : 1);
    const frostRadius = r * 1.3;
    ctx.strokeStyle = '#00d2d3';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, frostRadius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#dff9fb';
    ctx.lineWidth = 1.5;
    drawSnowflakePip(ctx, x + frostRadius * 0.72, y - frostRadius * 0.72, Math.max(4, size * 0.08));
  }

  // Health Bar (only when standalone drawing is requested and damaged)
  if (drawBars && hpRatio < 1) {
    const r = size * 0.38;
    const barW = Math.max(r * 2.2, 28);
    const barH = enemy.isBoss ? 5 : 3.5;
    const barY = y - r * (enemy.isBoss ? 1.65 : 1.35) - 6;

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
function drawPulseTurret(ctx, x, y, size, level = 1, angle = 0, recoil = 0) {
  const scale = 1 + (level - 1) * 0.05;
  const r = size * 0.4 * scale;

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
  const kick = -recoil * r * 0.26;
  ctx.translate(kick, 0);

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
    const pipAngle = -Math.PI / 2 + (i - (level - 1) / 2) * 0.38;
    const px = Math.cos(pipAngle) * (r * 0.88);
    const py = Math.sin(pipAngle) * (r * 0.88);
    ctx.beginPath();
    ctx.arc(px, py, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = '#feca57';
    ctx.fill();
  }

  ctx.restore();
}

function drawCoolantSprayer(ctx, x, y, size, level = 1, angle = 0, recoil = 0) {
  const scale = 1 + (level - 1) * 0.05;
  const r = size * 0.4 * scale;

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
  ctx.translate(-recoil * r * 0.18, 0);

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
    const py = r * 0.78;
    ctx.beginPath();
    ctx.arc(px, py, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = '#48dbfb';
    ctx.fill();
  }

  ctx.restore();
}

function drawArcCoil(ctx, x, y, size, level = 1, angle = 0, recoil = 0) {
  const scale = 1 + (level - 1) * 0.05;
  const r = size * 0.4 * scale;

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

  // Directional discharge prong
  ctx.save();
  ctx.rotate(angle);
  ctx.strokeStyle = '#d6a2e8';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(r * 0.25, 0);
  ctx.lineTo(r * (0.78 - recoil * 0.15), 0);
  ctx.stroke();
  ctx.restore();

  ctx.beginPath();
  ctx.arc(0, 0, r * (0.25 + recoil * 0.08), 0, Math.PI * 2);
  ctx.fillStyle = recoil > 0.2 ? '#ffffff' : '#e0ccff';
  ctx.fill();
  ctx.strokeStyle = '#d6a2e8';
  ctx.lineWidth = 2;
  ctx.stroke();

  for (let i = 0; i < level; i++) {
    const px = (i - (level - 1) / 2) * 7;
    const py = r * 0.8;
    ctx.beginPath();
    ctx.arc(px, py, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = '#a55eea';
    ctx.fill();
  }

  ctx.restore();
}

function drawRocketRack(ctx, x, y, size, level = 1, angle = 0, recoil = 0) {
  const scale = 1 + (level - 1) * 0.05;
  const r = size * 0.4 * scale;

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
  ctx.translate(-recoil * r * 0.22, 0);

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
    const py = r * 0.82;
    ctx.beginPath();
    ctx.arc(px, py, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = '#ff9f43';
    ctx.fill();
  }

  ctx.restore();
}

function drawFabricator(ctx, x, y, size, rotation = 0) {
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

export function drawTowerIcon(ctx, type, x, y, size, level = 1, angle = 0, animTime = 0, recoil = 0) {
  switch (type) {
    case 'pulse':
      drawPulseTurret(ctx, x, y, size, level, angle, recoil);
      break;
    case 'coolant':
      drawCoolantSprayer(ctx, x, y, size, level, angle, recoil);
      break;
    case 'arc':
      drawArcCoil(ctx, x, y, size, level, angle, recoil);
      break;
    case 'rocket':
      drawRocketRack(ctx, x, y, size, level, angle, recoil);
      break;
    case 'fabricator':
      drawFabricator(ctx, x, y, size, animTime * 0.8);
      break;
    default:
      drawPulseTurret(ctx, x, y, size, level, angle, recoil);
  }
}
