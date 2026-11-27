import { getPalette } from './palette.js';

/**
 * Visual Combat Effects and Range Circles for Robot Factory Defense.
 * Respects prefers-reduced-motion: reduces particle density and disables screen shake.
 */

export function isReducedMotion() {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Draw Tower Attack Range Circle.
 */
export function drawRangeCircle(ctx, x, y, rangeCells, cellSize) {
  const r = rangeCells * cellSize;
  const pal = getPalette();

  ctx.save();
  // Soft blueprint fill
  ctx.fillStyle = pal.rangeFill;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();

  // Dashed boundary
  ctx.strokeStyle = pal.rangeStroke;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 4]);
  ctx.stroke();

  ctx.restore();
}

/**
 * Visual Effects Manager: manages projectiles, beams, explosions, and hit sparks.
 */
export function createEffectsManager() {
  const particles = [];
  const beams = [];

  function addBeam(x1, y1, x2, y2, color = '#00d2d3', width = 2, duration = 0.15) {
    if (isReducedMotion()) {
      beams.push({ x1, y1, x2, y2, color, width, life: 0.06, maxLife: 0.06 });
      return;
    }
    beams.push({ x1, y1, x2, y2, color, width, life: duration, maxLife: duration });
  }

  function addExplosion(x, y, radius, color = '#ff793f', duration = 0.3) {
    if (isReducedMotion()) {
      // Just a faint static circle for reduced motion
      beams.push({ x1: x, y1: y, x2: x, y2: y, color, width: 3, life: 0.1, maxLife: 0.1, isRing: true, radius });
      return;
    }

    beams.push({ x1: x, y1: y, x2: x, y2: y, color, width: 3, life: duration, maxLife: duration, isRing: true, radius });

    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4;
      const speed = 40 + Math.random() * 60;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        life: 0.25,
        maxLife: 0.25,
        size: 3
      });
    }
  }

  function addSparks(x, y, color = '#feca57', count = 4) {
    if (isReducedMotion()) return;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 30 + Math.random() * 50;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        life: 0.2,
        maxLife: 0.2,
        size: 2
      });
    }
  }

  function updateAndDraw(ctx, dt) {
    // 1. Draw and update beams/rings
    for (let i = beams.length - 1; i >= 0; i--) {
      const b = beams[i];
      b.life -= dt;
      if (b.life <= 0) {
        beams.splice(i, 1);
        continue;
      }

      const alpha = Math.max(0, b.life / b.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = b.color;
      ctx.lineWidth = b.width;

      if (b.isRing) {
        const ringProgress = 1 - b.life / b.maxLife;
        const currentR = b.radius * (0.3 + ringProgress * 0.7);
        ctx.beginPath();
        ctx.arc(b.x1, b.y1, currentR, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(b.x1, b.y1);
        ctx.lineTo(b.x2, b.y2);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 2. Draw and update particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        particles.splice(i, 1);
        continue;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;

      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  return {
    addBeam,
    addExplosion,
    addSparks,
    updateAndDraw,
    clear: () => {
      particles.length = 0;
      beams.length = 0;
    }
  };
}
