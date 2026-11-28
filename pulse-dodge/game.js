import { isMuted, toggleMute, sfxCollect, sfxGraze, sfxBlast, sfxGameOver } from './audio.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const stage = document.getElementById('stage');

const hudScore = document.getElementById('hudScore');
const hudCombo = document.getElementById('hudCombo');
const hudBest = document.getElementById('hudBest');
const hudCharge = document.getElementById('hudCharge');
const btnMute = document.getElementById('btnMute');
const btnPause = document.getElementById('btnPause');

const titleOverlay = document.getElementById('titleOverlay');
const pauseOverlay = document.getElementById('pauseOverlay');
const gameOverOverlay = document.getElementById('gameOverOverlay');
const titleBest = document.getElementById('titleBest');
const titleBestCombo = document.getElementById('titleBestCombo');
const overScore = document.getElementById('overScore');
const overBest = document.getElementById('overBest');
const overCombo = document.getElementById('overCombo');

const btnStart = document.getElementById('btnStart');
const btnResume = document.getElementById('btnResume');
const btnRetry = document.getElementById('btnRetry');

const MAX_PARTICLES = 180;
const TRAIL_LEN = 14;

function loadNum(key, fallback = 0) {
  try {
    const v = parseInt(localStorage.getItem(key) || '', 10);
    return Number.isFinite(v) && v >= 0 ? v : fallback;
  } catch (_e) {
    return fallback;
  }
}

function saveNum(key, val) {
  try {
    localStorage.setItem(key, String(Math.floor(val)));
  } catch (_e) {
    // Ignore QuotaExceededError / SecurityError
  }
}

let width = 960;
let height = 540;
let dpr = 1;

const player = {
  x: 480,
  y: 270,
  vx: 0,
  vy: 0,
  r: 13,
  targetX: null,
  targetY: null,
  invuln: 0,
  trail: Array.from({ length: TRAIL_LEN }, () => ({ x: 480, y: 270 }))
};

const keys = new Set();
const cores = [];
const drones = [];
const rings = [];
const floatingTexts = [];
const particles = [];
const freeParticles = Array.from({ length: MAX_PARTICLES }, () => ({
  x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 2, color: '#00dcff'
}));

let mode = 'title'; // 'title' | 'playing' | 'paused' | 'gameover'
let score = 0;
let combo = 1;
let maxCombo = 1;
let comboTimer = 0;
let charge = 0;
let bestScore = loadNum('pd:best_score', 0);
let bestCombo = Math.max(1, loadNum('pd:best_combo', 1));
let elapsed = 0;
let spawnTimer = 0;
let shakeTimer = 0;
let shakeMag = 0;
let lastTapTime = 0;

function syncHud() {
  hudScore.textContent = String(score);
  hudCombo.textContent = `x${combo}`;
  hudBest.textContent = String(bestScore);
  hudCharge.style.width = `${Math.min(100, Math.round(charge))}%`;
  titleBest.textContent = String(bestScore);
  titleBestCombo.textContent = `x${bestCombo}`;
  btnMute.textContent = isMuted() ? '🔇' : '🔊';
}

function spawnParticle(x, y, vx, vy, color, life, size) {
  if (particles.length >= MAX_PARTICLES || freeParticles.length === 0) return;
  const p = freeParticles.pop();
  p.x = x;
  p.y = y;
  p.vx = vx;
  p.vy = vy;
  p.color = color;
  p.life = life;
  p.maxLife = life;
  p.size = size;
  particles.push(p);
}

function spawnBurst(x, y, color, count, speed = 160) {
  for (let i = 0; i < count; i++) {
    const a = (Math.PI * 2 * i) / count + Math.random() * 0.4;
    const sp = speed * (0.45 + Math.random() * 0.75);
    spawnParticle(x, y, Math.cos(a) * sp, Math.sin(a) * sp, color, 0.35 + Math.random() * 0.25, 2.6);
  }
}

function addFloatText(x, y, text, color) {
  floatingTexts.push({ x, y, text, color, life: 0.65, maxLife: 0.65 });
}

function spawnCore() {
  const pad = 42;
  const x = pad + Math.random() * Math.max(40, width - pad * 2);
  const y = pad + Math.random() * Math.max(40, height - pad * 2);
  cores.push({ x, y, r: 9, pulse: Math.random() * Math.PI * 2 });
}

function spawnDrone() {
  const edge = Math.floor(Math.random() * 4);
  const pad = 28;
  let x = width * 0.5;
  let y = height * 0.5;
  if (edge === 0) { x = pad + Math.random() * (width - pad * 2); y = pad; }
  else if (edge === 1) { x = width - pad; y = pad + Math.random() * (height - pad * 2); }
  else if (edge === 2) { x = pad + Math.random() * (width - pad * 2); y = height - pad; }
  else { x = pad; y = pad + Math.random() * (height - pad * 2); }

  const angle = Math.atan2(player.y - y, player.x - x) + (Math.random() - 0.5) * 0.6;
  const speed = 115 + Math.min(180, elapsed * 3.2) + Math.random() * 45;
  const isChaser = elapsed > 12 && Math.random() < 0.28;
  drones.push({
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    r: isChaser ? 13 : 11,
    speed,
    isChaser,
    warmup: 0.75, // telegraph ring before active collision
    grazed: false
  });
}

function triggerBlast() {
  if (mode !== 'playing' || charge < 100) return;
  charge = 0;
  player.invuln = 0.65;
  shakeTimer = 0.22;
  shakeMag = 7;
  const blastR = Math.min(width, height) * 0.36;
  rings.push({ x: player.x, y: player.y, maxR: blastR, life: 0.32, maxLife: 0.32, color: '#00dcff' });
  sfxBlast();

  let cleared = 0;
  for (let i = drones.length - 1; i >= 0; i--) {
    const d = drones[i];
    if (Math.hypot(d.x - player.x, d.y - player.y) <= blastR) {
      spawnBurst(d.x, d.y, '#ff6b81', 12, 220);
      drones.splice(i, 1);
      cleared++;
    }
  }
  if (cleared > 0) {
    const bonus = cleared * 50 * combo;
    score += bonus;
    addFloatText(player.x, player.y - 24, `BLAST +${bonus}`, '#2ed573');
  }
  syncHud();
}

function startGame() {
  mode = 'playing';
  score = 0;
  combo = 1;
  maxCombo = 1;
  comboTimer = 0;
  charge = 35;
  elapsed = 0;
  spawnTimer = 0.6;
  shakeTimer = 0;

  player.x = width / 2;
  player.y = height / 2;
  player.vx = 0;
  player.vy = 0;
  player.targetX = null;
  player.targetY = null;
  player.invuln = 1.0;
  for (const pt of player.trail) { pt.x = player.x; pt.y = player.y; }

  cores.length = 0;
  drones.length = 0;
  rings.length = 0;
  floatingTexts.length = 0;
  while (particles.length > 0) freeParticles.push(particles.pop());

  for (let i = 0; i < 3; i++) spawnCore();
  for (let i = 0; i < 3; i++) spawnDrone();

  titleOverlay.classList.add('hidden');
  pauseOverlay.classList.add('hidden');
  gameOverOverlay.classList.add('hidden');
  syncHud();
}

function endGame() {
  mode = 'gameover';
  shakeTimer = 0.3;
  shakeMag = 10;
  spawnBurst(player.x, player.y, '#ff4757', 24, 240);
  sfxGameOver();

  if (score > bestScore) {
    bestScore = score;
    saveNum('pd:best_score', bestScore);
  }
  if (maxCombo > bestCombo) {
    bestCombo = maxCombo;
    saveNum('pd:best_combo', bestCombo);
  }

  overScore.textContent = String(score);
  overBest.textContent = String(bestScore);
  overCombo.textContent = `x${maxCombo}`;
  gameOverOverlay.classList.remove('hidden');
  syncHud();
}

function resize() {
  const rect = stage.getBoundingClientRect();
  width = Math.max(240, Math.floor(rect.width));
  height = Math.max(180, Math.floor(rect.height));
  dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function update(dt) {
  if (shakeTimer > 0) shakeTimer = Math.max(0, shakeTimer - dt);

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    if (p.life <= 0) {
      const last = particles.length - 1;
      if (i !== last) particles[i] = particles[last];
      particles.pop();
      freeParticles.push(p);
      continue;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.94;
    p.vy *= 0.94;
  }

  for (let i = rings.length - 1; i >= 0; i--) {
    rings[i].life -= dt;
    if (rings[i].life <= 0) rings.splice(i, 1);
  }

  for (let i = floatingTexts.length - 1; i >= 0; i--) {
    floatingTexts[i].life -= dt;
    floatingTexts[i].y -= 34 * dt;
    if (floatingTexts[i].life <= 0) floatingTexts.splice(i, 1);
  }

  if (mode !== 'playing') return;

  elapsed += dt;
  if (player.invuln > 0) player.invuln = Math.max(0, player.invuln - dt);

  if (combo > 1) {
    comboTimer -= dt;
    if (comboTimer <= 0) {
      combo = 1;
      syncHud();
    }
  }

  // Player movement: keyboard OR pointer follow
  let ax = 0;
  let ay = 0;
  if (keys.has('ArrowLeft') || keys.has('KeyA')) ax -= 1;
  if (keys.has('ArrowRight') || keys.has('KeyD')) ax += 1;
  if (keys.has('ArrowUp') || keys.has('KeyW')) ay -= 1;
  if (keys.has('ArrowDown') || keys.has('KeyS')) ay += 1;

  const moveSpeed = 360;
  if (ax !== 0 || ay !== 0) {
    const len = Math.hypot(ax, ay);
    player.vx = (ax / len) * moveSpeed;
    player.vy = (ay / len) * moveSpeed;
    player.targetX = null;
    player.targetY = null;
  } else if (player.targetX !== null && player.targetY !== null) {
    const dx = player.targetX - player.x;
    const dy = player.targetY - player.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 4) {
      const sp = Math.min(moveSpeed * 1.15, dist * 10);
      player.vx = (dx / dist) * sp;
      player.vy = (dy / dist) * sp;
    } else {
      player.vx *= 0.7;
      player.vy *= 0.7;
    }
  } else {
    player.vx *= 0.84;
    player.vy *= 0.84;
  }

  player.x = Math.max(player.r, Math.min(width - player.r, player.x + player.vx * dt));
  player.y = Math.max(player.r, Math.min(height - player.r, player.y + player.vy * dt));

  for (let i = player.trail.length - 1; i > 0; i--) {
    player.trail[i].x = player.trail[i - 1].x;
    player.trail[i].y = player.trail[i - 1].y;
  }
  player.trail[0].x = player.x;
  player.trail[0].y = player.y;

  // Collect energy cores
  for (let i = cores.length - 1; i >= 0; i--) {
    const c = cores[i];
    c.pulse += dt * 4;
    if (Math.hypot(player.x - c.x, player.y - c.y) <= player.r + c.r + 4) {
      cores.splice(i, 1);
      const pts = 25 * combo;
      score += pts;
      combo = Math.min(12, combo + 1);
      if (combo > maxCombo) maxCombo = combo;
      comboTimer = 3.2;
      charge = Math.min(100, charge + 18);
      spawnBurst(c.x, c.y, '#00dcff', 10, 150);
      addFloatText(c.x, c.y - 10, `+${pts}`, '#00dcff');
      sfxCollect(combo);
      spawnCore();
      syncHud();
    }
  }

  // Spawn drones smoothly up to cap
  spawnTimer -= dt;
  const maxDrones = Math.min(18, 4 + Math.floor(elapsed / 6));
  if (spawnTimer <= 0 && drones.length < maxDrones) {
    spawnDrone();
    spawnTimer = Math.max(0.85, 2.3 - elapsed * 0.03);
  }

  // Update drones
  for (let i = 0; i < drones.length; i++) {
    const d = drones[i];
    if (d.warmup > 0) {
      d.warmup = Math.max(0, d.warmup - dt);
      continue;
    }

    if (d.isChaser) {
      const dx = player.x - d.x;
      const dy = player.y - d.y;
      const len = Math.hypot(dx, dy) || 1;
      const desiredVx = (dx / len) * d.speed * 0.85;
      const desiredVy = (dy / len) * d.speed * 0.85;
      d.vx += (desiredVx - d.vx) * Math.min(1, dt * 1.8);
      d.vy += (desiredVy - d.vy) * Math.min(1, dt * 1.8);
    }

    d.x += d.vx * dt;
    d.y += d.vy * dt;

    if (d.x < d.r) { d.x = d.r; d.vx = Math.abs(d.vx); d.grazed = false; }
    if (d.x > width - d.r) { d.x = width - d.r; d.vx = -Math.abs(d.vx); d.grazed = false; }
    if (d.y < d.r) { d.y = d.r; d.vy = Math.abs(d.vy); d.grazed = false; }
    if (d.y > height - d.r) { d.y = height - d.r; d.vy = -Math.abs(d.vy); d.grazed = false; }

    const dist = Math.hypot(player.x - d.x, player.y - d.y);
    if (dist < player.r + d.r - 2) {
      if (player.invuln <= 0) {
        endGame();
        return;
      }
    } else if (!d.grazed && dist < player.r + d.r + 20) {
      d.grazed = true;
      const grazePts = 15 * combo;
      score += grazePts;
      charge = Math.min(100, charge + 8);
      addFloatText(player.x, player.y - 18, `GRAZE +${grazePts}`, '#feca57');
      sfxGraze();
      syncHud();
    }
  }
}

function render() {
  ctx.clearRect(0, 0, width, height);

  ctx.save();
  if (shakeTimer > 0) {
    const mag = shakeMag * (shakeTimer / 0.3);
    ctx.translate((Math.random() * 2 - 1) * mag, (Math.random() * 2 - 1) * mag);
  }

  // Subtle arena grid
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  const step = 48;
  for (let x = step; x < width; x += step) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
  }
  for (let y = step; y < height; y += step) {
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
  }
  ctx.stroke();

  // Blast rings
  for (const r of rings) {
    const p = 1 - r.life / r.maxLife;
    ctx.globalAlpha = Math.max(0, r.life / r.maxLife);
    ctx.strokeStyle = r.color;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(r.x, r.y, r.maxR * p, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Energy cores
  for (const c of cores) {
    const pr = c.r + Math.sin(c.pulse) * 2.2;
    ctx.fillStyle = 'rgba(0, 220, 255, 0.2)';
    ctx.beginPath();
    ctx.arc(c.x, c.y, pr + 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#00dcff';
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.r * 0.75, 0, Math.PI * 2);
    ctx.fill();
  }

  // Drones
  for (const d of drones) {
    if (d.warmup > 0) {
      ctx.strokeStyle = 'rgba(255, 159, 67, 0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r + d.warmup * 18, 0, Math.PI * 2);
      ctx.stroke();
      continue;
    }

    ctx.fillStyle = d.isChaser ? '#ff9f43' : '#ff4757';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (d.isChaser) {
      ctx.moveTo(d.x, d.y - d.r);
      ctx.lineTo(d.x + d.r, d.y);
      ctx.lineTo(d.x, d.y + d.r);
      ctx.lineTo(d.x - d.r, d.y);
      ctx.closePath();
    } else {
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.stroke();
  }

  // Player trail & orb
  if (mode !== 'gameover') {
    for (let i = player.trail.length - 1; i >= 0; i--) {
      const pt = player.trail[i];
      const frac = 1 - i / player.trail.length;
      ctx.globalAlpha = frac * 0.35;
      ctx.fillStyle = charge >= 100 ? '#2ed573' : '#00dcff';
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, player.r * frac * 0.85, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = player.invuln > 0 ? 0.55 + 0.45 * Math.sin(elapsed * 28) : 1;
    ctx.fillStyle = charge >= 100 ? '#2ed573' : '#00dcff';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // Particles
  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.size, p.y - p.size, p.size * 2, p.size * 2);
  }
  ctx.globalAlpha = 1;

  // Floating texts
  ctx.font = '700 13px ui-monospace, monospace';
  ctx.textAlign = 'center';
  for (const ft of floatingTexts) {
    ctx.globalAlpha = Math.max(0, ft.life / ft.maxLife);
    ctx.fillStyle = ft.color;
    ctx.fillText(ft.text, ft.x, ft.y);
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

let lastTime = performance.now();
function loop(now) {
  const dt = Math.min(Math.max(0, (now - lastTime) / 1000), 0.05);
  lastTime = now;
  update(dt);
  render();
  requestAnimationFrame(loop);
}

// Controls
function setPointerTarget(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  player.targetX = clientX - rect.left;
  player.targetY = clientY - rect.top;
}

canvas.addEventListener('pointerdown', (e) => {
  if (mode !== 'playing') return;
  const now = performance.now();
  if (now - lastTapTime < 280) {
    triggerBlast();
  }
  lastTapTime = now;
  setPointerTarget(e.clientX, e.clientY);
});

canvas.addEventListener('pointermove', (e) => {
  if (mode !== 'playing') return;
  if (e.buttons > 0 || e.pointerType === 'mouse') {
    setPointerTarget(e.clientX, e.clientY);
  }
});

window.addEventListener('keydown', (e) => {
  keys.add(e.code);
  if (e.code === 'Space' && mode === 'playing') {
    e.preventDefault();
    triggerBlast();
  } else if (e.code === 'Escape' || e.code === 'KeyP') {
    if (mode === 'playing') {
      mode = 'paused';
      pauseOverlay.classList.remove('hidden');
    } else if (mode === 'paused') {
      mode = 'playing';
      pauseOverlay.classList.add('hidden');
    }
  }
});

window.addEventListener('keyup', (e) => keys.delete(e.code));

btnStart.addEventListener('click', startGame);
btnRetry.addEventListener('click', startGame);
btnResume.addEventListener('click', () => {
  if (mode === 'paused') {
    mode = 'playing';
    pauseOverlay.classList.add('hidden');
  }
});

btnPause.addEventListener('click', () => {
  if (mode === 'playing') {
    mode = 'paused';
    pauseOverlay.classList.remove('hidden');
  } else if (mode === 'paused') {
    mode = 'playing';
    pauseOverlay.classList.add('hidden');
  }
});

btnMute.addEventListener('click', () => {
  toggleMute();
  syncHud();
});

window.addEventListener('resize', resize);
resize();
syncHud();
requestAnimationFrame(loop);
