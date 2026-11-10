import {
  BASE_POINTS,
  CLUE_BONUSES,
  MAX_ROUND_POINTS,
  STREAK_STEP,
  STREAK_MAX,
  streakMultiplierIfCorrect,
  pointsIfCorrect,
  revealCost,
  breakdownText,
  calculateRoundScore
} from '../src/scoring.js';

console.log('================================================================================');
console.log('                 STEP 2: CLUE POINTS & SCORING ADDITIONS UNIT TESTS            ');
console.log('================================================================================\n');

let allPassed = true;

const testCases = [
  // 1. Base points and clue progression with streak 0 (mult 1.0)
  {
    desc: 'Clue 1 (idx 0), streak 0 (mult 1.0x)',
    fn: () => pointsIfCorrect({ clueIndex: 0, streakBefore: 0, speedBonus: 0, mode: 'clue' }),
    expected: 800
  },
  {
    desc: 'Clue 2 (idx 1), streak 0 (mult 1.0x)',
    fn: () => pointsIfCorrect({ clueIndex: 1, streakBefore: 0, speedBonus: 0, mode: 'clue' }),
    expected: 650
  },
  {
    desc: 'Clue 3 (idx 2), streak 0 (mult 1.0x)',
    fn: () => pointsIfCorrect({ clueIndex: 2, streakBefore: 0, speedBonus: 0, mode: 'clue' }),
    expected: 500
  },

  // 2. Reveal cost countdown
  {
    desc: 'Reveal Clue 2 cost from Clue 1 (streak 0): 800 -> 650 (cost 150)',
    fn: () => revealCost({ clueIndex: 0, streakBefore: 0, speedBonus: 0 }),
    verify: (r) => r && r.now === 800 && r.next === 650 && r.cost === 150
  },
  {
    desc: 'Reveal Clue 3 cost from Clue 2 (streak 0): 650 -> 500 (cost 150)',
    fn: () => revealCost({ clueIndex: 1, streakBefore: 0, speedBonus: 0 }),
    verify: (r) => r && r.now === 650 && r.next === 500 && r.cost === 150
  },
  {
    desc: 'Reveal cost from Clue 3 (idx 2): null (nothing left to reveal)',
    fn: () => revealCost({ clueIndex: 2, streakBefore: 0, speedBonus: 0 }),
    expected: null
  },

  // 3. Streak multiplier and 1,000 pt cap integration
  {
    desc: 'Clue 1, streak 2 (mult 1.2x): 800 * 1.2 = 960 pts',
    fn: () => pointsIfCorrect({ clueIndex: 0, streakBefore: 2, speedBonus: 0 }),
    expected: 960
  },
  {
    desc: 'Reveal Clue 2 cost at streak 2 (mult 1.2x): 960 -> 780 (cost 180)',
    fn: () => revealCost({ clueIndex: 0, streakBefore: 2, speedBonus: 0 }),
    verify: (r) => r && r.now === 960 && r.next === 780 && r.cost === 180
  },
  {
    desc: 'Clue 1, streak 5 (mult 1.5x cap): 800 * 1.5 = 1200 -> capped at 1000 pts',
    fn: () => pointsIfCorrect({ clueIndex: 0, streakBefore: 5, speedBonus: 0 }),
    expected: 1000
  },
  {
    desc: 'Reveal Clue 2 cost at streak 5 (cap interaction): 1000 -> 975 (cost 25)',
    fn: () => revealCost({ clueIndex: 0, streakBefore: 5, speedBonus: 0 }),
    verify: (r) => r && r.now === 1000 && r.next === 975 && r.cost === 25
  },

  // 4. Result breakdown formatting
  {
    desc: 'breakdownText() standard uncapped (clue 0, streak 0)',
    fn: () => breakdownText({ clueIndex: 0, speedBonus: 0, streakBefore: 0, mode: 'clue' }),
    expected: 'Base 500 + clue 300 + speed 0 = 800 × streak 1.0 = 800'
  },
  {
    desc: 'breakdownText() with speed bonus and streak 2',
    fn: () => breakdownText({ clueIndex: 1, speedBonus: 50, streakBefore: 2, mode: 'clue' }),
    expected: 'Base 500 + clue 150 + speed 50 = 700 × streak 1.2 = 840'
  },
  {
    desc: 'breakdownText() capped at 1,000 (clue 0, streak 5)',
    fn: () => breakdownText({ clueIndex: 0, speedBonus: 0, streakBefore: 5, mode: 'clue' }),
    expected: 'Base 500 + clue 300 + speed 0 = 800 × streak 1.5 = 1000 (capped at 1,000)'
  }
];

console.log('| #  | Test Case Description                                            | Result   | Status |');
console.log('|----|------------------------------------------------------------------|----------|--------|');

testCases.forEach((tc, idx) => {
  const num = String(idx + 1).padStart(2, '0');
  const res = tc.fn();
  let pass = false;
  if (tc.verify) {
    pass = tc.verify(res);
  } else {
    pass = JSON.stringify(res) === JSON.stringify(tc.expected);
  }
  if (!pass) allPassed = false;
  const status = pass ? 'PASS' : 'FAIL';
  const displayRes = typeof res === 'object' ? JSON.stringify(res) : String(res);
  console.log(`| ${num} | ${tc.desc.padEnd(64)} | ${displayRes.padEnd(8)} | ${status.padEnd(6)} |`);
});

console.log('--------------------------------------------------------------------------------\n');
if (allPassed) {
  console.log('✓ STEP 2 CLUE POINTS & SCORING TESTS: ALL PASSED');
  process.exit(0);
} else {
  console.error('✗ STEP 2 CLUE POINTS & SCORING TESTS: FAILED');
  process.exit(1);
}
