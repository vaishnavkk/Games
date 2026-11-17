import {
  SCORING,
  calculateRoundScore,
  calculatePartialCredit,
  pointsIfCorrect,
  breakdownText
} from '../src/scoring.js';
import COUNTRIES_DB from '../data/countries.json' with { type: 'json' };

console.log('================================================================================');
console.log('                 STEP 2 & 3: SCORING & PARTIAL CREDIT UNIT TESTS                ');
console.log('================================================================================\n');

const testCases = [
  {
    name: 'Case 01: Clue mode, Clue 1, timer OFF, streak 1',
    input: { isCorrect: true, mode: 'clue', clueIndex: 0, hasTimer: false, streak: 1 },
    expected: { points: 800, base: 800, clueBonus: 0, speedBonus: 0, mult: 1.0 }
  },
  {
    name: 'Case 02: Clue mode, Clue 2, timer OFF, streak 1',
    input: { isCorrect: true, mode: 'clue', clueIndex: 1, hasTimer: false, streak: 1 },
    expected: { points: 800, base: 800, clueBonus: 0, speedBonus: 0, mult: 1.0 }
  },
  {
    name: 'Case 03: Clue mode, Clue 3, timer OFF, streak 1',
    input: { isCorrect: true, mode: 'clue', clueIndex: 2, hasTimer: false, streak: 1 },
    expected: { points: 800, base: 800, clueBonus: 0, speedBonus: 0, mult: 1.0 }
  },
  {
    name: 'Case 04: Name mode, timer OFF, streak 1',
    input: { isCorrect: true, mode: 'name', clueIndex: 0, hasTimer: false, streak: 1 },
    expected: { points: 800, base: 800, clueBonus: 0, speedBonus: 0, mult: 1.0 }
  },
  {
    name: 'Case 05: Flag mode, timer OFF, streak 1',
    input: { isCorrect: true, mode: 'flag', clueIndex: 0, hasTimer: false, streak: 1 },
    expected: { points: 800, base: 800, clueBonus: 0, speedBonus: 0, mult: 1.0 }
  },
  {
    name: 'Case 06: Clue mode, Clue 1, timer ON (100% time left), streak 1',
    input: { isCorrect: true, mode: 'clue', clueIndex: 0, hasTimer: true, timerDuration: 25, timerRemaining: 25, streak: 1 },
    expected: { points: 1000, base: 800, clueBonus: 0, speedBonus: 200, mult: 1.0 }
  },
  {
    name: 'Case 07: Clue mode, Clue 1, timer ON (50% time left), streak 1',
    input: { isCorrect: true, mode: 'clue', clueIndex: 0, hasTimer: true, timerDuration: 25, timerRemaining: 12.5, streak: 1 },
    expected: { points: 900, base: 800, clueBonus: 0, speedBonus: 100, mult: 1.0 }
  },
  {
    name: 'Case 08: Clue mode, Clue 1, timer OFF, streak 3 (1.2x)',
    input: { isCorrect: true, mode: 'clue', clueIndex: 0, hasTimer: false, streak: 3 },
    expected: { points: 960, base: 800, clueBonus: 0, speedBonus: 0, mult: 1.2 }
  },
  {
    name: 'Case 09: Clue mode, Clue 1, timer OFF, streak 6 (1.5x cap check)',
    input: { isCorrect: true, mode: 'clue', clueIndex: 0, hasTimer: false, streak: 6 },
    expected: { points: 1000, base: 800, clueBonus: 0, speedBonus: 0, mult: 1.5 } // 800 * 1.5 = 1200 -> capped at 1000
  },
  {
    name: 'Case 10: Name mode, timer ON (100%), streak 4 (1.3x cap check)',
    input: { isCorrect: true, mode: 'name', clueIndex: 0, hasTimer: true, timerDuration: 25, timerRemaining: 25, streak: 4 },
    expected: { points: 1000, base: 800, clueBonus: 0, speedBonus: 200, mult: 1.3 } // 1000 * 1.3 = 1300 -> capped at 1000
  },
  {
    name: 'Case 11: Wrong answer, 0 km distance (d = 0)',
    input: { isCorrect: false, distanceKm: 0 },
    expected: { points: 300, base: 0, clueBonus: 0, speedBonus: 0, mult: 1.0 }
  },
  {
    name: 'Case 12: Wrong answer, 14 km distance (d = 14)',
    input: { isCorrect: false, distanceKm: 14 },
    expected: { points: 299, base: 0, clueBonus: 0, speedBonus: 0, mult: 1.0 }
  },
  {
    name: 'Case 13: Wrong answer, 524 km distance (d = 524)',
    input: { isCorrect: false, distanceKm: 524 },
    expected: { points: 269, base: 0, clueBonus: 0, speedBonus: 0, mult: 1.0 }
  },
  {
    name: 'Case 14: Wrong answer, 2,000 km distance (d = 2000)',
    input: { isCorrect: false, distanceKm: 2000 },
    expected: { points: 180, base: 0, clueBonus: 0, speedBonus: 0, mult: 1.0 }
  },
  {
    name: 'Case 14b: Wrong answer, 5,000 km distance (d = 5000, cutoff)',
    input: { isCorrect: false, distanceKm: 5000 },
    expected: { points: 0, base: 0, clueBonus: 0, speedBonus: 0, mult: 1.0 }
  },
  {
    name: 'Case 15: Wrong answer, 14,944 km distance (d = 14944)',
    input: { isCorrect: false, distanceKm: 14944 },
    expected: { points: 0, base: 0, clueBonus: 0, speedBonus: 0, mult: 1.0 }
  },
  {
    name: 'Case 16: Practice mode (scores unrecorded)',
    input: { isCorrect: true, mode: 'clue', clueIndex: 0, streak: 5, isPractice: true },
    expected: { points: 0, base: 0, clueBonus: 0, speedBonus: 0, mult: 1.0 }
  }
];

let allPassed = true;

console.log('Table of Scoring Test Cases:');
console.log('------------------------------------------------------------------------------------------------------------------------');
console.log(`| #  | Test Case Description                                    | Expected Pts | Actual Pts | Multiplier | Status |`);
console.log('------------------------------------------------------------------------------------------------------------------------');

testCases.forEach((tc, idx) => {
  const result = calculateRoundScore(tc.input);
  const num = String(idx + 1).padStart(2, '0');
  const ptsPass = result.points === tc.expected.points;
  const multPass = result.streakMultiplier === tc.expected.mult;
  const pass = ptsPass && multPass;

  if (!pass) allPassed = false;

  console.log(
    `| ${num} | ${tc.name.padEnd(56)} | ${String(tc.expected.points).padStart(12)} | ${String(result.points).padStart(10)} | ${String(result.streakMultiplier + 'x').padStart(10)} |  ${pass ? 'PASS' : 'FAIL'}  |`
  );
});

console.log('------------------------------------------------------------------------------------------------------------------------\n');

// Verify Partial Credit Function specifically for required distances
console.log('--- Step 3b Partial Credit Function Verification (d = 0, 14, 524, 2000, 5000, 14944) ---');
const distTests = [
  { d: 0, exp: 300 },
  { d: 14, exp: 299 },
  { d: 524, exp: 269 },
  { d: 2000, exp: 180 },
  { d: 5000, exp: 0 },
  { d: 14944, exp: 0 }
];
for (const dt of distTests) {
  const pts = calculatePartialCredit(dt.d);
  const p = pts === dt.exp;
  if (!p) allPassed = false;
  console.log(`  d = ${String(dt.d).padEnd(5)} km -> ${pts} pts (expected: ${dt.exp}) [${p ? 'PASS' : 'FAIL'}]`);
}

// Verify Real Country DB Pools vs SCORING.TIERS
console.log('\n--- Real Dataset Pool Sizes vs SCORING.TIERS ---');
import { GameManager } from '../src/game.js';
const game = new GameManager({}, {});
const easyPool = game.getTierPool('easy');
const medPool = game.getTierPool('medium');
const hardPool = game.getTierPool('hard');

console.log(`Easy:   SCORING=${SCORING.TIERS.easy.count}   | Pool=${easyPool.length}`);
console.log(`Medium: SCORING=${SCORING.TIERS.medium.count} | Pool=${medPool.length}`);
console.log(`Hard:   SCORING=${SCORING.TIERS.hard.count}   | Pool=${hardPool.length} (193 UN members + Vatican City + Palestine)`);

if (easyPool.length !== SCORING.TIERS.easy.count || medPool.length !== SCORING.TIERS.medium.count || hardPool.length !== SCORING.TIERS.hard.count) {
  console.error('✗ Tier pool size mismatch between dataset and SCORING.TIERS');
  allPassed = false;
} else {
  console.log('✓ Tier pool size check PASSED');
}

console.log('\n================================================================================');
if (allPassed) {
  console.log('                 STEP 2 & 3 SCORING TESTS: ALL PASSED                           ');
  console.log('================================================================================\n');
  process.exit(0);
} else {
  console.error('                 STEP 2 & 3 SCORING TESTS: FAILED                               ');
  console.log('================================================================================\n');
  process.exit(1);
}
