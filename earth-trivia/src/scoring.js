/**
 * GeoTrivia Scoring - Single Source of Truth
 *
 * Scoring Rules:
 * - Base correct answer: 500 pts
 * - Fewer-clues bonus:
 *     - Clue 1 (idx 0): +300 pts
 *     - Clue 2 (idx 1): +150 pts
 *     - Clue 3 (idx 2): +0 pts
 *     - Name/Flag modes: +300 pts
 * - Timer speed bonus: Up to +200 pts proportional to remaining time (timer ON only)
 * - Streak multiplier: 1.0x to 1.5x (+0.1x per consecutive correct answer before current)
 * - Max round score: 1,000 pts (hard cap)
 * - Reveal Clue cost: pointsIfCorrect(clue N) - pointsIfCorrect(clue N+1)
 * - Wrong answer partial credit: round(300 * max(0, 1 - d / 2000))
 * - Practice mode: score unrecorded (0 pts)
 */

export const BASE_POINTS = 500;
export const CLUE_BONUSES = [300, 150, 0];
export const MAX_ROUND_POINTS = 1000;
export const STREAK_STEP = 0.1;
export const STREAK_MAX = 1.5;
export const PARTIAL_MAX_KM = 2000;
export const PARTIAL_MAX_POINTS = 300;

export const streakMultiplierIfCorrect = (streakBefore) =>
  Math.min(STREAK_MAX, 1 + STREAK_STEP * (streakBefore || 0));

export function pointsIfCorrect({ clueIndex = 0, streakBefore = 0, speedBonus = 0, mode = 'clue' }) {
  const clueBonus = mode === 'clue' ? (CLUE_BONUSES[clueIndex] !== undefined ? CLUE_BONUSES[clueIndex] : 0) : CLUE_BONUSES[0];
  const mult = streakMultiplierIfCorrect(streakBefore);
  return Math.min(MAX_ROUND_POINTS, Math.round((BASE_POINTS + clueBonus + speedBonus) * mult));
}

export function revealCost({ clueIndex = 0, streakBefore = 0, speedBonus = 0 }) {
  if (clueIndex >= CLUE_BONUSES.length - 1) return null; // last clue: nothing left to reveal
  const now = pointsIfCorrect({ clueIndex, streakBefore, speedBonus });
  const next = pointsIfCorrect({ clueIndex: clueIndex + 1, streakBefore, speedBonus });
  return { now, next, cost: now - next };
}

export function breakdownText({ clueIndex = 0, speedBonus = 0, streakBefore = 0, mode = 'clue' }) {
  const mult = streakMultiplierIfCorrect(streakBefore);
  const clue = mode === 'clue' ? (CLUE_BONUSES[clueIndex] !== undefined ? CLUE_BONUSES[clueIndex] : 0) : CLUE_BONUSES[0];
  const raw = BASE_POINTS + clue + speedBonus;
  const total = Math.min(MAX_ROUND_POINTS, Math.round(raw * mult));
  return `Base ${BASE_POINTS} + clue ${clue} + speed ${speedBonus} = ${raw} × streak ${mult.toFixed(1)} = ${total}` +
    (raw * mult > MAX_ROUND_POINTS ? ' (capped at 1,000)' : '');
}

export function calculatePartialCredit(d) {
  const dist = typeof d === 'number' && !isNaN(d) ? Math.max(0, d) : 0;
  return Math.round(PARTIAL_MAX_POINTS * Math.max(0, 1 - dist / PARTIAL_MAX_KM));
}

export const SCORING = {
  BASE_POINTS,
  CLUE_BONUSES,
  NAME_FLAG_BONUS: 300,
  MAX_SPEED_BONUS: 200,
  MAX_ROUND_POINTS,
  MAX_PARTIAL_CREDIT: PARTIAL_MAX_POINTS,
  PARTIAL_CREDIT_MAX_DISTANCE_KM: PARTIAL_MAX_KM,
  MAX_STREAK_MULTIPLIER: STREAK_MAX,
  TIMER_DURATION_SECONDS: 25,

  TIERS: {
    easy: {
      id: 'easy',
      name: 'Easy',
      count: 42,
      label: 'Easy (42 nations)',
      description: 'Major global powers & iconic nations'
    },
    medium: {
      id: 'medium',
      name: 'Medium',
      count: 100,
      label: 'Medium (100 nations)',
      description: 'Well-known sovereign nations'
    },
    hard: {
      id: 'hard',
      name: 'Hard',
      count: 195,
      label: 'Hard (195 nations)',
      description: '193 UN members + Vatican City + Palestine'
    }
  }
};

export function getRevealClueCost(targetClueNumber) {
  const prevBonus = CLUE_BONUSES[targetClueNumber - 2] ?? 300;
  const newBonus = CLUE_BONUSES[targetClueNumber - 1] ?? 0;
  return Math.max(0, prevBonus - newBonus);
}

export function getRevealClueButtonText(currentClueIndex) {
  const targetClueNum = currentClueIndex + 2;
  const cost = getRevealClueCost(targetClueNum);
  return `Reveal Clue ${targetClueNum} (-${cost} pts)`;
}

export function calculateRoundScore({
  isCorrect,
  mode = 'clue',
  clueIndex = 0,
  hasTimer = false,
  timerRemaining = 0,
  timerDuration = SCORING.TIMER_DURATION_SECONDS,
  streak = 1,
  streakBefore,
  distanceKm = 0,
  isPractice = false
} = {}) {
  if (isPractice) {
    return {
      isCorrect,
      base: 0,
      clueBonus: 0,
      speedBonus: 0,
      streakMultiplier: 1.0,
      points: 0,
      distanceKm: isCorrect ? 0 : distanceKm,
      breakdownText: 'Practice mode: scores unrecorded'
    };
  }

  const sBefore = streakBefore !== undefined ? streakBefore : Math.max(0, streak - 1);
  let speedBonus = 0;
  if (hasTimer && timerDuration > 0 && timerRemaining > 0) {
    const frac = Math.max(0, Math.min(1, timerRemaining / timerDuration));
    speedBonus = Math.round(SCORING.MAX_SPEED_BONUS * frac);
  }

  if (isCorrect) {
    const mult = streakMultiplierIfCorrect(sBefore);
    const clueBonus = mode === 'clue' ? (CLUE_BONUSES[clueIndex] !== undefined ? CLUE_BONUSES[clueIndex] : 0) : CLUE_BONUSES[0];
    const points = pointsIfCorrect({ clueIndex, streakBefore: sBefore, speedBonus, mode });
    const bText = breakdownText({ clueIndex, speedBonus, streakBefore: sBefore, mode });

    return {
      isCorrect: true,
      base: BASE_POINTS,
      clueBonus,
      speedBonus,
      streakMultiplier: Math.round(mult * 10) / 10,
      points,
      distanceKm: 0,
      breakdownText: bText
    };
  } else {
    const partialPoints = calculatePartialCredit(distanceKm);
    const bText = partialPoints > 0
      ? `Proximity within ${PARTIAL_MAX_KM.toLocaleString()} km: +${partialPoints} pts`
      : `Over ${PARTIAL_MAX_KM.toLocaleString()} km: 0 pts`;

    return {
      isCorrect: false,
      base: 0,
      clueBonus: 0,
      speedBonus: 0,
      streakMultiplier: 1.0,
      points: partialPoints,
      distanceKm,
      breakdownText: bText
    };
  }
}

const fmt = (n) => (typeof n === 'number' ? n.toLocaleString('en-US') : n);

export function countTo(el, from, to, ms = 450) {
  if (!el) return;
  if (typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches) {
    el.textContent = fmt(to);
    return;
  }
  const t0 = performance.now();
  const step = (now) => {
    const k = Math.min(1, (now - t0) / ms);
    el.textContent = fmt(Math.round(from + (to - from) * k));
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// Call on round start (prev = null) and after every reveal (prev = value before reveal).
export function renderClueWorth({ clueIndex = 0, streak = 0, speedBonus = 0, mode = 'clue', prev = null }) {
  const worth = pointsIfCorrect({ clueIndex, streakBefore: streak, speedBonus, mode });
  const valueEl = document.getElementById('cwValue');
  const dropEl = document.getElementById('cwDrop');
  if (valueEl) {
    if (prev !== null && prev !== worth) {
      countTo(valueEl, prev, worth);
      if (dropEl) {
        dropEl.textContent = `−${fmt(prev - worth)}`;
        dropEl.hidden = false;
        setTimeout(() => { dropEl.hidden = true; }, 1700);
      }
    } else {
      valueEl.textContent = fmt(worth);
      if (dropEl) dropEl.hidden = true;
    }
  }

  const btn = document.getElementById('revealBtn');
  if (btn) {
    if (mode !== 'clue') {
      btn.hidden = true;
      return worth;
    }
    const r = revealCost({ clueIndex, streakBefore: streak, speedBonus });
    if (!r) {
      btn.hidden = true;
      return worth;
    }
    btn.hidden = false;
    const label = btn.querySelector('.rv-label');
    if (label) label.textContent = `Reveal clue ${clueIndex + 2}:`;
    const rvNow = document.getElementById('rvNow');
    const rvNext = document.getElementById('rvNext');
    if (rvNow) rvNow.textContent = fmt(r.now);
    if (rvNext) rvNext.textContent = fmt(r.next);
    btn.setAttribute('aria-label', `Reveal clue ${clueIndex + 2}. This round drops from ${r.now} to ${r.next} points.`);
  }
  return worth;
}
