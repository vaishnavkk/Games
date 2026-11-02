import {
  SCORING,
  calculateRoundScore,
  getRevealClueCost,
  getRevealClueButtonText
} from '../src/scoring.js';
import { COUNTRIES_DB } from '../data/countries.js';

console.log('================================================================================');
console.log('                 STEP 2: SCORING UNIT TESTS & CONSTANT VERIFICATION             ');
console.log('================================================================================\n');

const testCases = [
  {
    name: 'Case 01: Clue mode, Clue 1, timer OFF, streak 1',
    input: { isCorrect: true, mode: 'clue', clueIndex: 0, hasTimer: false, streak: 1 },
    expected: { points: 800, base: 500, clueBonus: 300, speedBonus: 0, mult: 1.0 }
  },
  {
    name: 'Case 02: Clue mode, Clue 2, timer OFF, streak 1',
    input: { isCorrect: true, mode: 'clue', clueIndex: 1, hasTimer: false, streak: 1 },
    expected: { points: 650, base: 500, clueBonus: 150, speedBonus: 0, mult: 1.0 }
  },
  {
    name: 'Case 03: Clue mode, Clue 3, timer OFF, streak 1',
    input: { isCorrect: true, mode: 'clue', clueIndex: 2, hasTimer: false, streak: 1 },
    expected: { points: 500, base: 500, clueBonus: 0, speedBonus: 0, mult: 1.0 }
  },
  {
    name: 'Case 04: Name mode, timer OFF, streak 1',
    input: { isCorrect: true, mode: 'name', clueIndex: 0, hasTimer: false, streak: 1 },
    expected: { points: 800, base: 500, clueBonus: 300, speedBonus: 0, mult: 1.0 }
  },
  {
    name: 'Case 05: Flag mode, timer OFF, streak 1',
    input: { isCorrect: true, mode: 'flag', clueIndex: 0, hasTimer: false, streak: 1 },
    expected: { points: 800, base: 500, clueBonus: 300, speedBonus: 0, mult: 1.0 }
  },
  {
    name: 'Case 06: Clue mode, Clue 1, timer ON (100% time left), streak 1',
    input: { isCorrect: true, mode: 'clue', clueIndex: 0, hasTimer: true, timerDuration: 25, timerRemaining: 25, streak: 1 },
    expected: { points: 1000, base: 500, clueBonus: 300, speedBonus: 200, mult: 1.0 }
  },
  {
    name: 'Case 07: Clue mode, Clue 1, timer ON (50% time left), streak 1',
    input: { isCorrect: true, mode: 'clue', clueIndex: 0, hasTimer: true, timerDuration: 25, timerRemaining: 12.5, streak: 1 },
    expected: { points: 900, base: 500, clueBonus: 300, speedBonus: 100, mult: 1.0 }
  },
  {
    name: 'Case 08: Clue mode, Clue 1, timer OFF, streak 3 (1.2x)',
    input: { isCorrect: true, mode: 'clue', clueIndex: 0, hasTimer: false, streak: 3 },
    expected: { points: 960, base: 500, clueBonus: 300, speedBonus: 0, mult: 1.2 }
  },
  {
    name: 'Case 09: Clue mode, Clue 1, timer OFF, streak 6 (1.5x cap check)',
    input: { isCorrect: true, mode: 'clue', clueIndex: 0, hasTimer: false, streak: 6 },
    expected: { points: 1000, base: 500, clueBonus: 300, speedBonus: 0, mult: 1.5 } // 800 * 1.5 = 1200 -> capped at 1000
  },
  {
    name: 'Case 10: Name mode, timer ON (100%), streak 4 (1.3x cap check)',
    input: { isCorrect: true, mode: 'name', clueIndex: 0, hasTimer: true, timerDuration: 25, timerRemaining: 25, streak: 4 },
    expected: { points: 1000, base: 500, clueBonus: 300, speedBonus: 200, mult: 1.3 } // 1000 * 1.3 = 1300 -> capped at 1000
  },
  {
    name: 'Case 11: Wrong answer, 0 km distance (border hit, partial cap check)',
    input: { isCorrect: false, distanceKm: 0 },
    expected: { points: 300, base: 0, clueBonus: 0, speedBonus: 0, mult: 1.0 } // 400 capped at 300
  },
  {
    name: 'Case 12: Wrong answer, 1,250 km distance',
    input: { isCorrect: false, distanceKm: 1250 },
    expected: { points: 300, base: 0, clueBonus: 0, speedBonus: 0, mult: 1.0 } // 400 * 0.75 = 300
  },
  {
    name: 'Case 13: Wrong answer, 2,500 km distance',
    input: { isCorrect: false, distanceKm: 2500 },
    expected: { points: 200, base: 0, clueBonus: 0, speedBonus: 0, mult: 1.0 } // 400 * 0.50 = 200
  },
  {
    name: 'Case 14: Wrong answer, 4,000 km distance',
    input: { isCorrect: false, distanceKm: 4000 },
    expected: { points: 80, base: 0, clueBonus: 0, speedBonus: 0, mult: 1.0 } // 400 * 0.20 = 80
  },
  {
    name: 'Case 15: Wrong answer, 5,500 km distance (> 5,000 km threshold)',
    input: { isCorrect: false, distanceKm: 5500 },
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
  const pass = result.points === tc.expected.points &&
               result.base === tc.expected.base &&
               result.clueBonus === tc.expected.clueBonus &&
               result.speedBonus === tc.expected.speedBonus &&
               result.streakMultiplier === tc.expected.mult;

  if (!pass) allPassed = false;

  const num = String(idx + 1).padStart(2, '0');
  const desc = tc.name.padEnd(56);
  const expPts = String(tc.expected.points).padStart(12);
  const actPts = String(result.points).padStart(10);
  const mult = `${result.streakMultiplier}x`.padStart(10);
  const status = pass ? ' PASS ' : ' FAIL ';

  console.log(`| ${num} | ${desc} | ${expPts} | ${actPts} | ${mult} | ${status} |`);
});
console.log('------------------------------------------------------------------------------------------------------------------------\n');

// Verify Reveal button text and cost formula
console.log('--- Reveal Clue Cost & Button Text Verification ---');
const clue2Cost = getRevealClueCost(2);
const clue3Cost = getRevealClueCost(3);
const btnText0 = getRevealClueButtonText(0);
const btnText1 = getRevealClueButtonText(1);

console.log(`Clue 2 cost: ${clue2Cost} pts (expected: 150) | Button: "${btnText0}"`);
console.log(`Clue 3 cost: ${clue3Cost} pts (expected: 150) | Button: "${btnText1}"`);

if (clue2Cost !== 150 || clue3Cost !== 150 || btnText0 !== 'Reveal Clue 2 (-150 pts)' || btnText1 !== 'Reveal Clue 3 (-150 pts)') {
  console.log('✗ Reveal clue cost check FAILED');
  allPassed = false;
} else {
  console.log('✓ Reveal clue cost check PASSED');
}

// Verify Tier catalog count matches real dataset
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
  console.log('✗ Tier pool size check FAILED');
  allPassed = false;
} else {
  console.log('✓ Tier pool size check PASSED');
}

console.log('\n================================================================================');
if (allPassed) {
  console.log('                 STEP 2 SCORING TESTS: ALL 16 CASES PASSED                     ');
} else {
  console.log('                 STEP 2 SCORING TESTS: FAILED                                  ');
  process.exit(1);
}
console.log('================================================================================');
