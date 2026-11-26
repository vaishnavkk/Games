/**
 * GeoTrivia Scoring - Single Source of Truth
 *
 * Scoring Rules:
 * - Flat base correct answer: 800 pts (clues are 100% free, no clue bonus / penalty)
 * - Timer speed bonus: Up to +200 pts proportional to remaining time (timer ON only)
 * - Streak multiplier: 1.0x to 1.5x (+0.1x per consecutive correct answer before current)
 * - Max round score: 1,000 pts (hard cap)
 * - Reveal Clue cost: 0 pts (free)
 * - Wrong answer partial credit: round(300 * max(0, 1 - d / 5000))
 * - Practice mode: score unrecorded (0 pts)
 */

export const BASE_POINTS = 800;
export const MAX_ROUND_POINTS = 1000;
export const STREAK_STEP = 0.1;
export const STREAK_MAX = 1.5;
const PARTIAL_MAX_KM = 5000;
const PARTIAL_MAX_POINTS = 300;

export const streakMultiplierIfCorrect = (streakBefore) =>
  Math.min(STREAK_MAX, 1 + STREAK_STEP * (streakBefore || 0));

export function pointsIfCorrect({ streakBefore = 0, speedBonus = 0 } = {}) {
  const mult = streakMultiplierIfCorrect(streakBefore);
  return Math.min(MAX_ROUND_POINTS, Math.round((BASE_POINTS + speedBonus) * mult));
}

export function breakdownText({ speedBonus = 0, streakBefore = 0 } = {}) {
  const mult = streakMultiplierIfCorrect(streakBefore);
  const raw = BASE_POINTS + speedBonus;
  const total = Math.min(MAX_ROUND_POINTS, Math.round(raw * mult));
  return `Base ${BASE_POINTS} + speed ${speedBonus} = ${raw} × streak ${mult.toFixed(1)} = ${total}` +
    (raw * mult > MAX_ROUND_POINTS ? ' (capped at 1,000)' : '');
}

export function calculatePartialCredit(d) {
  const dist = typeof d === 'number' && !isNaN(d) ? Math.max(0, d) : 0;
  return Math.round(PARTIAL_MAX_POINTS * Math.max(0, 1 - dist / PARTIAL_MAX_KM));
}

export function parseBestScore(raw) {
  const parsed = parseInt(raw || '0', 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

export const SCORING = {
  BASE_POINTS,
  NAME_FLAG_BONUS: 0,
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

export function calculateRoundScore({
  isCorrect,
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
    const points = pointsIfCorrect({ streakBefore: sBefore, speedBonus });
    const bText = breakdownText({ speedBonus, streakBefore: sBefore });

    return {
      isCorrect: true,
      base: BASE_POINTS,
      clueBonus: 0,
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

export function calculateAccuracy(correct, roundsAnswered) {
  if (!roundsAnswered || roundsAnswered <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((correct / roundsAnswered) * 100)));
}

export function buildExpeditionSummary({
  correct = 0,
  wrong = 0,
  score = 0,
  bestStreak = 0,
  missedCountries = [],
  isPractice = false,
  mode = 'clue',
  tier = 'easy'
} = {}) {
  const c = typeof correct === 'number' && !isNaN(correct) ? Math.max(0, correct) : 0;
  const w = typeof wrong === 'number' && !isNaN(wrong) ? Math.max(0, wrong) : 0;
  const answered = c + w;

  if (answered === 0) {
    return {
      answered: 0,
      correct: 0,
      wrong: 0,
      accuracy: 0,
      hasSummary: false,
      isFlawless: false,
      flawlessBanner: null,
      score: isPractice ? 0 : score,
      bestStreak: 0,
      missedCountries: [],
      isPractice,
      mode,
      tier
    };
  }

  const accuracy = calculateAccuracy(c, answered);
  const isFlawless = (w === 0 && answered >= 1);
  const flawlessBanner = isFlawless ? 'Flawless Expedition — 100% Identification Accuracy!' : null;

  return {
    answered,
    correct: c,
    wrong: w,
    accuracy,
    hasSummary: true,
    isFlawless,
    flawlessBanner,
    score: isPractice ? 0 : score,
    bestStreak,
    missedCountries,
    isPractice,
    mode,
    tier
  };
}
