/**
 * Procedural Canvas2D Visual Effects System for Robot Factory Defense.
 * Zero external assets, strictly READ-ONLY on sim state, respects prefers-reduced-motion.
 */

export const MAX_PARTICLES = 300;

const HIT_FLASH_DURATION = 0.1;
const TOWER_RECOIL_DURATION = 0.12;
const CORE_FLASH_DURATION = 0.35;
const SHAKE_DURATION = 0.25;

export function isReducedMotion() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function getTowerSplashRadius(state, tower) {
  const towersMap = state?.config?.towers?.towers || state?.config?.towers;
  const def = towersMap?.rocket;
  if (def && Array.isArray(def.levels)) {
    const idx = Math.max(0, (tower?.level || 1) - 1);
    const lvlCfg = def.levels[idx] || def.levels[0];
    if (Number.isFinite(lvlCfg?.splashRadius) && lvlCfg.splashRadius > 0) {
      return lvlCfg.splashRadius;
    }
  }
  return 1.2;
}

function getCorePixelPos(state, cellSize) {
  const pos = state?.config?.map?.core?.position;
  const col = Number.isFinite(pos?.col) ? pos.col : 15;
  const row = Number.isFinite(pos?.row) ? pos.row : 7;
  return {
    x: (col + 0.5) * cellSize,
    y: (row + 0.5) * cellSize
  };
}

function toPixelCoords(pos, cellSize, state) {
  if (!pos) return null;
  const cols = state?.config?.map?.grid?.cols || 16;
  const rows = state?.config?.map?.grid?.rows || 9;
  const x = pos.x <= cols ? (pos.x + 0.5) * cellSize : pos.x;
  const y = pos.y <= rows ? (pos.y + 0.5) * cellSize : pos.y;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { x, y };
}

function resolveEnemyPixelPos(enemyId, state, cellSize, enemyPosCache) {
  if (enemyPosCache && typeof enemyPosCache.get === 'function') {
    const cached = enemyPosCache.get(enemyId);
    if (cached) {
      const px = toPixelCoords(cached, cellSize, state);
      if (px) return px;
    }
  }
  const enemies = state?.enemies;
  if (Array.isArray(enemies)) {
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (e.id === enemyId) {
        return toPixelCoords(e, cellSize, state);
      }
    }
  }
  return null;
}

function resolveTower(towerId, state) {
  const towers = state?.towers;
  if (!Array.isArray(towers)) return null;
  for (let i = 0; i < towers.length; i++) {
    if (towers[i].id === towerId) return towers[i];
  }
  return null;
}

/**
 * Create the procedural FX system.
 */
export function createFxSystem() {
  const particles = [];
  const bolts = [];
  const beams = [];
  const rings = [];
  const floatingTexts = [];
  const hitFlashes = new Map();
  const towerRecoils = new Map();

  let coreFlashTimer = 0;
  let shakeTimer = 0;
  let shakeMagnitude = 0;
  let rocketSmokeAccum = 0;
  let cachedFontCs = 0;
  let cachedFontStr = '';

  function removeAt(arr, i) {
    const last = arr.length - 1;
    if (i !== last) arr[i] = arr[last];
    arr.pop();
  }

  function spawnParticle(x, y, vx, vy, color, life, size, drag = 0.94) {
    if (particles.length >= MAX_PARTICLES) return false;
    particles.push({
      x,
      y,
      vx,
      vy,
      color,
      life,
      maxLife: life,
      size,
      drag
    });
    return true;
  }

  function spawnBurst(x, y, color, count, speedMin, speedMax, life, size) {
    const reduced = isReducedMotion();
    const actualCount = reduced ? Math.min(2, count) : count;
    for (let i = 0; i < actualCount; i++) {
      if (particles.length >= MAX_PARTICLES) break;
      const angle = (Math.PI * 2 * i) / actualCount + (Math.random() - 0.5) * 0.5;
      const speed = reduced ? speedMin * 0.35 : speedMin + Math.random() * (speedMax - speedMin);
      spawnParticle(
        x,
        y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        color,
        reduced ? life * 0.5 : life,
        size
      );
    }
  }

  function addJaggedBeam(x1, y1, x2, y2, color, width, duration, segments = 5, jitter = 8) {
    const reduced = isReducedMotion();
    const pts = [{ x: x1, y: y1 }];
    if (!reduced && segments > 1) {
      const dx = x2 - x1;
      const dy = y2 - y1;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;
      for (let i = 1; i < segments; i++) {
        const t = i / segments;
        const offset = (Math.random() * 2 - 1) * jitter;
        pts.push({
          x: x1 + dx * t + nx * offset,
          y: y1 + dy * t + ny * offset
        });
      }
    }
    pts.push({ x: x2, y: y2 });
    beams.push({
      points: pts,
      color,
      width,
      life: reduced ? Math.min(0.08, duration) : duration,
      maxLife: reduced ? Math.min(0.08, duration) : duration
    });
  }

  function addRing(x, y, maxRadius, color, width, duration, startRatio = 0.2) {
    const reduced = isReducedMotion();
    const dur = reduced ? Math.min(0.12, duration) : duration;
    rings.push({
      x,
      y,
      maxRadius,
      startRatio: reduced ? 0.85 : startRatio,
      color,
      width,
      life: dur,
      maxLife: dur
    });
  }

  function addFloatingText(x, y, text, color = '#feca57', duration = 0.75) {
    const reduced = isReducedMotion();
    floatingTexts.push({
      x,
      y,
      text,
      color,
      vy: reduced ? -8 : -28,
      life: reduced ? 0.45 : duration,
      maxLife: reduced ? 0.45 : duration
    });
  }

  function clear() {
    particles.length = 0;
    bolts.length = 0;
    beams.length = 0;
    rings.length = 0;
    floatingTexts.length = 0;
    hitFlashes.clear();
    towerRecoils.clear();
    coreFlashTimer = 0;
    shakeTimer = 0;
    shakeMagnitude = 0;
    rocketSmokeAccum = 0;
  }

  function handleEvents(events, state, cellSize, enemyPosCache) {
    if (!Array.isArray(events) || events.length === 0) return;
    const cs = Number.isFinite(cellSize) && cellSize > 0 ? cellSize : 60;
    const reduced = isReducedMotion();

    // Track per-batch state for multi-hit towers (arc chain hops, rocket splash dedupe)
    const arcChainOrigins = new Map();
    const rocketSplashDone = new Set();

    for (let i = 0; i < events.length; i++) {
      const ev = events[i];
      if (!ev || !ev.type) continue;

      if (ev.type === 'hit') {
        if (ev.enemyId) {
          hitFlashes.set(ev.enemyId, HIT_FLASH_DURATION);
        }
        if (ev.towerId) {
          towerRecoils.set(ev.towerId, TOWER_RECOIL_DURATION);
        }

        const tower = resolveTower(ev.towerId, state);
        const enemyPos = resolveEnemyPixelPos(ev.enemyId, state, cs, enemyPosCache);

        if (tower && enemyPos) {
          const tx = (tower.col + 0.5) * cs;
          const ty = (tower.row + 0.5) * cs;
          const ex = enemyPos.x;
          const ey = enemyPos.y;

          if (tower.type === 'pulse') {
            bolts.push({
              x1: tx,
              y1: ty,
              x2: ex,
              y2: ey,
              color: '#00d2d3',
              coreColor: '#ffffff',
              life: reduced ? 0.05 : 0.09,
              maxLife: reduced ? 0.05 : 0.09
            });
            spawnBurst(ex, ey, '#feca57', 4, cs * 0.6, cs * 1.4, 0.18, 2);
          } else if (tower.type === 'coolant') {
            const dx = ex - tx;
            const dy = ey - ty;
            const dist = Math.hypot(dx, dy) || 1;
            const ux = dx / dist;
            const uy = dy / dist;
            const sprayCount = reduced ? 2 : 7;
            for (let s = 0; s < sprayCount; s++) {
              if (particles.length >= MAX_PARTICLES) break;
              const spread = (Math.random() - 0.5) * 0.45;
              const cos = Math.cos(spread);
              const sin = Math.sin(spread);
              const vxDir = ux * cos - uy * sin;
              const vyDir = ux * sin + uy * cos;
              const speed = (dist / 0.22) * (0.65 + Math.random() * 0.5);
              const spawnFrac = Math.random() * 0.3;
              spawnParticle(
                tx + dx * spawnFrac,
                ty + dy * spawnFrac,
                vxDir * speed,
                vyDir * speed,
                s % 2 === 0 ? '#48dbfb' : '#dff9fb',
                reduced ? 0.1 : 0.22,
                2.5 + Math.random() * 1.5,
                0.9
              );
            }
            addJaggedBeam(tx, ty, ex, ey, 'rgba(72, 219, 251, 0.45)', 3, 0.1, 2, 2);
          } else if (tower.type === 'arc') {
            const origin = arcChainOrigins.get(tower.id) || { x: tx, y: ty };
            addJaggedBeam(origin.x, origin.y, ex, ey, '#a55eea', 2.6, 0.16, 5, cs * 0.14);
            addJaggedBeam(origin.x, origin.y, ex, ey, '#f3e5ff', 1.1, 0.12, 5, cs * 0.08);
            arcChainOrigins.set(tower.id, { x: ex, y: ey });
            spawnBurst(ex, ey, '#d6a2e8', 4, cs * 0.5, cs * 1.3, 0.18, 2);
          } else if (tower.type === 'rocket') {
            if (!rocketSplashDone.has(tower.id)) {
              rocketSplashDone.add(tower.id);
              const splashRadius = getTowerSplashRadius(state, tower);
              const radiusPx = splashRadius * cs;
              addRing(ex, ey, radiusPx, '#ff793f', 3, 0.32, 0.15);
              addRing(ex, ey, radiusPx * 0.65, '#feca57', 2, 0.22, 0.2);
              spawnBurst(ex, ey, '#ff793f', 10, cs * 0.8, cs * 2.2, 0.3, 3.2);
              spawnBurst(ex, ey, '#b2bec3', 6, cs * 0.3, cs * 1.0, 0.38, 4.0);
            }
          }
        }
      } else if (ev.type === 'killed') {
        const enemyPos = resolveEnemyPixelPos(ev.enemyId, state, cs, enemyPosCache);
        if (enemyPos) {
          spawnBurst(enemyPos.x, enemyPos.y, '#feca57', 8, cs * 0.7, cs * 2.0, 0.28, 2.8);
          spawnBurst(enemyPos.x, enemyPos.y, '#ff6b6b', 4, cs * 0.4, cs * 1.2, 0.24, 2.2);
          const scrap = ev.scrap ?? ev.scrapReward ?? 0;
          if (Number.isFinite(scrap) && scrap > 0) {
            addFloatingText(enemyPos.x, enemyPos.y - cs * 0.25, `+${scrap}`, '#feca57', 0.75);
          }
        }
      } else if (ev.type === 'leaked') {
        const corePos = getCorePixelPos(state, cs);
        addRing(corePos.x, corePos.y, cs * 0.9, '#ff4757', 3, 0.32, 0.2);
        spawnBurst(corePos.x, corePos.y, '#ff4757', 10, cs * 0.6, cs * 1.8, 0.3, 3);
        coreFlashTimer = CORE_FLASH_DURATION;
        if (!reduced) {
          shakeTimer = SHAKE_DURATION;
          shakeMagnitude = Math.max(shakeMagnitude, Math.max(3, cs * 0.08));
        }
      } else if (ev.type === 'built' && ev.cell) {
        const bx = (ev.cell.col + 0.5) * cs;
        const by = (ev.cell.row + 0.5) * cs;
        addRing(bx, by, cs * 0.6, '#2ed573', 2, 0.24, 0.25);
        spawnBurst(bx, by, '#2ed573', 8, cs * 0.5, cs * 1.5, 0.24, 2.4);
      } else if (ev.type === 'upgraded') {
        const tower = resolveTower(ev.towerId, state);
        if (tower) {
          const ux = (tower.col + 0.5) * cs;
          const uy = (tower.row + 0.5) * cs;
          addRing(ux, uy, cs * 0.7, '#00d2d3', 2.5, 0.26, 0.25);
          spawnBurst(ux, uy, '#feca57', 8, cs * 0.6, cs * 1.6, 0.26, 2.5);
        }
      }
    }
  }

  function update(dtSec, state, cellSize) {
    if (!Number.isFinite(dtSec) || dtSec <= 0) return;
    const dt = Math.min(dtSec, 0.1);
    const cs = Number.isFinite(cellSize) && cellSize > 0 ? cellSize : 60;
    const reduced = isReducedMotion();

    // Emit smoke trail particles for active in-flight rockets (throttled for 4x CPU budget)
    if (!reduced && Array.isArray(state?.projectiles) && state.projectiles.length > 0) {
      rocketSmokeAccum += dt;
      if (rocketSmokeAccum >= 0.04) {
        rocketSmokeAccum = 0;
        let emitted = 0;
        for (let i = 0; i < state.projectiles.length && emitted < 8; i++) {
          const proj = state.projectiles[i];
          if (proj.type === 'rocket' && particles.length < MAX_PARTICLES) {
            const px = toPixelCoords(proj, cs, state);
            if (px) {
              spawnParticle(
                px.x + (Math.random() - 0.5) * 3,
                px.y + (Math.random() - 0.5) * 3,
                (Math.random() - 0.5) * 14,
                (Math.random() - 0.5) * 14,
                '#95a5a6',
                0.24,
                2.8,
                0.92
              );
              emitted++;
            }
          }
        }
      }
    }

    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        removeAt(particles, i);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= p.drag;
      p.vy *= p.drag;
    }

    // Update pulse bolts
    for (let i = bolts.length - 1; i >= 0; i--) {
      bolts[i].life -= dt;
      if (bolts[i].life <= 0) {
        removeAt(bolts, i);
      }
    }

    // Update beams
    for (let i = beams.length - 1; i >= 0; i--) {
      beams[i].life -= dt;
      if (beams[i].life <= 0) {
        removeAt(beams, i);
      }
    }

    // Update rings
    for (let i = rings.length - 1; i >= 0; i--) {
      rings[i].life -= dt;
      if (rings[i].life <= 0) {
        removeAt(rings, i);
      }
    }

    // Update floating texts
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
      const ft = floatingTexts[i];
      ft.life -= dt;
      if (ft.life <= 0) {
        removeAt(floatingTexts, i);
        continue;
      }
      ft.y += ft.vy * dt;
    }

    // Update hit flashes
    for (const [id, timer] of hitFlashes) {
      const next = timer - dt;
      if (next <= 0) hitFlashes.delete(id);
      else hitFlashes.set(id, next);
    }

    // Update tower recoils
    for (const [id, timer] of towerRecoils) {
      const next = timer - dt;
      if (next <= 0) towerRecoils.delete(id);
      else towerRecoils.set(id, next);
    }

    // Update core flash & shake
    if (coreFlashTimer > 0) {
      coreFlashTimer = Math.max(0, coreFlashTimer - dt);
    }
    if (shakeTimer > 0) {
      shakeTimer = Math.max(0, shakeTimer - dt);
      if (shakeTimer === 0) shakeMagnitude = 0;
    }
  }

  function render(ctx, cellSize, _state) {
    if (!ctx) return;
    const cs = Number.isFinite(cellSize) && cellSize > 0 ? cellSize : 60;
    const prevAlpha = ctx.globalAlpha;

    // 1. Expanding Rings
    for (let i = 0; i < rings.length; i++) {
      const r = rings[i];
      const progress = 1 - r.life / r.maxLife;
      const currentR = r.maxRadius * (r.startRatio + progress * (1 - r.startRatio));
      ctx.globalAlpha = Math.max(0, r.life / r.maxLife);
      ctx.strokeStyle = r.color;
      ctx.lineWidth = r.width;
      ctx.beginPath();
      ctx.arc(r.x, r.y, Math.max(1, currentR), 0, Math.PI * 2);
      ctx.stroke();
    }

    // 2. Jagged Beams (Arc lightning / Coolant mist)
    for (let i = 0; i < beams.length; i++) {
      const b = beams[i];
      const pts = b.points;
      if (pts.length < 2) continue;
      ctx.globalAlpha = Math.max(0, b.life / b.maxLife);
      ctx.strokeStyle = b.color;
      ctx.lineWidth = b.width;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let j = 1; j < pts.length; j++) {
        ctx.lineTo(pts[j].x, pts[j].y);
      }
      ctx.stroke();
    }

    // 3. Pulse Bolts (Fast glowing bolt + short trail)
    for (let i = 0; i < bolts.length; i++) {
      const b = bolts[i];
      const progress = 1 - b.life / b.maxLife;
      const headX = b.x1 + (b.x2 - b.x1) * Math.min(1, progress * 1.15);
      const headY = b.y1 + (b.y2 - b.y1) * Math.min(1, progress * 1.15);
      const tailProgress = Math.max(0, progress - 0.35);
      const tailX = b.x1 + (b.x2 - b.x1) * tailProgress;
      const tailY = b.y1 + (b.y2 - b.y1) * tailProgress;

      ctx.globalAlpha = Math.max(0, b.life / b.maxLife);
      ctx.strokeStyle = b.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(headX, headY);
      ctx.stroke();

      ctx.fillStyle = b.coreColor;
      ctx.beginPath();
      ctx.arc(headX, headY, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // 4. Particles (fillRect avoids 300x beginPath+arc overhead per frame)
    let lastColor = '';
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const s = p.size;
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      if (p.color !== lastColor) {
        lastColor = p.color;
        ctx.fillStyle = lastColor;
      }
      ctx.fillRect(p.x - s, p.y - s, s * 2, s * 2);
    }

    // 5. Floating "+N" Scrap Texts
    if (floatingTexts.length > 0) {
      if (cachedFontCs !== cs) {
        cachedFontCs = cs;
        cachedFontStr = `bold ${Math.max(11, Math.round(cs * 0.22))}px "Space Mono", monospace`;
      }
      ctx.font = cachedFontStr;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (let i = 0; i < floatingTexts.length; i++) {
        const ft = floatingTexts[i];
        ctx.globalAlpha = Math.max(0, ft.life / ft.maxLife);
        ctx.fillStyle = '#000000';
        ctx.fillText(ft.text, ft.x + 1, ft.y + 1);
        ctx.fillStyle = ft.color;
        ctx.fillText(ft.text, ft.x, ft.y);
      }
    }

    ctx.globalAlpha = prevAlpha;
  }

  function hasHitFlash(enemyId) {
    return (hitFlashes.get(enemyId) || 0) > 0;
  }

  function getTowerRecoil(towerId) {
    const timer = towerRecoils.get(towerId) || 0;
    return timer > 0 ? Math.min(1, timer / TOWER_RECOIL_DURATION) : 0;
  }

  function getCoreFlashAlpha() {
    return coreFlashTimer > 0 ? Math.min(1, coreFlashTimer / CORE_FLASH_DURATION) : 0;
  }

  function getShakeOffset() {
    if (shakeTimer <= 0 || isReducedMotion()) {
      return { x: 0, y: 0 };
    }
    const factor = shakeTimer / SHAKE_DURATION;
    const amp = shakeMagnitude * factor;
    return {
      x: (Math.random() * 2 - 1) * amp,
      y: (Math.random() * 2 - 1) * amp
    };
  }

  function getParticleCount() {
    return particles.length;
  }

  return {
    clear,
    handleEvents,
    update,
    render,
    hasHitFlash,
    getTowerRecoil,
    getCoreFlashAlpha,
    getShakeOffset,
    getParticleCount
  };
}
