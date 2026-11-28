/**
 * Procedural Web Audio synthesizer for Pulse Dodge (zero external audio files).
 */
let audioCtx = null;
let muted = false;

try {
  muted = localStorage.getItem('pd:muted') === '1';
} catch (_e) {
  muted = false;
}

function ensureCtx() {
  if (muted || typeof window === 'undefined') return null;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  if (!audioCtx) audioCtx = new Ctx();
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

function tone(freq, endFreq, dur, type = 'sine', gainVal = 0.08) {
  const ctx = ensureCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  osc.frequency.exponentialRampToValueAtTime(Math.max(40, endFreq), now + dur);
  gain.gain.setValueAtTime(gainVal, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + dur);
}

export function isMuted() {
  return muted;
}

export function toggleMute() {
  muted = !muted;
  try {
    localStorage.setItem('pd:muted', muted ? '1' : '0');
  } catch (_e) {
    // Ignore storage errors
  }
  return muted;
}

export function sfxCollect(combo = 1) {
  const base = 520 + Math.min(combo, 10) * 45;
  tone(base, base * 1.35, 0.11, 'sine', 0.08);
}

export function sfxGraze() {
  tone(880, 1320, 0.07, 'triangle', 0.05);
}

export function sfxBlast() {
  tone(220, 65, 0.28, 'sawtooth', 0.11);
  tone(660, 180, 0.22, 'sine', 0.08);
}

export function sfxGameOver() {
  tone(260, 70, 0.38, 'sawtooth', 0.12);
}
