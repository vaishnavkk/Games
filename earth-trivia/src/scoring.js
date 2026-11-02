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
 * - Streak multiplier: 1.0x to 1.5x (+0.1x per consecutive correct answer)
 * - Max round score: 1,000 pts (hard cap)
 * - Reveal Clue N cost: bonus(clue N-1) - bonus(clue N) = 150 pts
 * - Wrong answer partial credit: proximity within 5,000 km, capped strictly at 300 pts
 * - Practice mode: score unrecorded (0 pts)
 */

export const SCORING = {
  BASE_POINTS: 500,
  CLUE_BONUSES: [300, 150, 0],
  NAME_FLAG_BONUS: 300,
  MAX_SPEED_BONUS: 200,
  MAX_ROUND_POINTS: 1000,
  MAX_PARTIAL_CREDIT: 300,
  PARTIAL_CREDIT_MAX_DISTANCE_KM: 5000,
  MAX_STREAK_MULTIPLIER: 1.5,
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

/**
 * Reveal Clue N cost = bonus(clue N-1) minus bonus(clue N)
 * e.g., revealing Clue 2 (idx 1) costs 300 - 150 = 150 pts
 *       revealing Clue 3 (idx 2) costs 150 - 0 = 150 pts
 */
export function getRevealClueCost(targetClueNumber) {
  const prevBonus = SCORING.CLUE_BONUSES[targetClueNumber - 2] ?? 300;
  const newBonus = SCORING.CLUE_BONUSES[targetClueNumber - 1] ?? 0;
  return Math.max(0, prevBonus - newBonus);
}

export function getRevealClueButtonText(currentClueIndex) {
  const targetClueNum = currentClueIndex + 2; // e.g. from clue 1 (idx 0), next is clue 2
  const cost = getRevealClueCost(targetClueNum);
  return `Reveal Clue ${targetClueNum} (-${cost} pts)`;
}

/**
 * Calculate round score and itemized breakdown
 */
export function calculateRoundScore({
  isCorrect,
  mode = 'clue',
  clueIndex = 0,
  hasTimer = false,
  timerRemaining = 0,
  timerDuration = SCORING.TIMER_DURATION_SECONDS,
  streak = 1,
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
      distanceKm: isCorrect ? 0 : distanceKm
    };
  }

  if (isCorrect) {
    const base = SCORING.BASE_POINTS;
    let clueBonus = 0;
    if (mode === 'name' || mode === 'flag') {
      clueBonus = SCORING.NAME_FLAG_BONUS;
    } else {
      clueBonus = SCORING.CLUE_BONUSES[clueIndex] !== undefined
        ? SCORING.CLUE_BONUSES[clueIndex]
        : 0;
    }

    let speedBonus = 0;
    if (hasTimer && timerDuration > 0 && timerRemaining > 0) {
      const frac = Math.max(0, Math.min(1, timerRemaining / timerDuration));
      speedBonus = Math.round(SCORING.MAX_SPEED_BONUS * frac);
    }

    const streakMultiplier = Math.min(
      SCORING.MAX_STREAK_MULTIPLIER,
      1.0 + Math.max(0, streak - 1) * 0.1
    );

    const rawSubtotal = (base + clueBonus + speedBonus) * streakMultiplier;
    const points = Math.min(SCORING.MAX_ROUND_POINTS, Math.round(rawSubtotal));

    return {
      isCorrect: true,
      base,
      clueBonus,
      speedBonus,
      streakMultiplier: Math.round(streakMultiplier * 10) / 10,
      points,
      distanceKm: 0
    };
  } else {
    let partialCredit = 0;
    if (distanceKm < SCORING.PARTIAL_CREDIT_MAX_DISTANCE_KM) {
      const proximityFrac = 1 - distanceKm / SCORING.PARTIAL_CREDIT_MAX_DISTANCE_KM;
      const raw = Math.round(400 * proximityFrac);
      partialCredit = Math.max(0, Math.min(SCORING.MAX_PARTIAL_CREDIT, raw));
    }

    return {
      isCorrect: false,
      base: 0,
      clueBonus: 0,
      speedBonus: 0,
      streakMultiplier: 1.0,
      points: partialCredit,
      distanceKm
    };
  }
}
