import { buildExpeditionSummary, calculateAccuracy } from '../src/scoring.js';

console.log('================================================================================');
console.log('           EXPEDITION SUMMARY BUILDER & ACCURACY UNIT TESTS                     ');
console.log('================================================================================\n');

let allPassed = true;

const testCases = [
  {
    name: 'answered 0 (correct: 0, wrong: 0)',
    input: { correct: 0, wrong: 0, score: 0 },
    expected: {
      answered: 0,
      accuracy: 0,
      hasSummary: false,
      isFlawless: false,
      flawlessBanner: null
    }
  },
  {
    name: '1 correct (correct: 1, wrong: 0)',
    input: { correct: 1, wrong: 0, score: 800 },
    expected: {
      answered: 1,
      accuracy: 100,
      hasSummary: true,
      isFlawless: true,
      flawlessBanner: 'Flawless Expedition — 100% Identification Accuracy!'
    }
  },
  {
    name: '1 wrong (correct: 0, wrong: 1)',
    input: { correct: 0, wrong: 1, score: 0 },
    expected: {
      answered: 1,
      accuracy: 0,
      hasSummary: true,
      isFlawless: false,
      flawlessBanner: null
    }
  },
  {
    name: '5/10 (correct: 5, wrong: 5)',
    input: { correct: 5, wrong: 5, score: 4000 },
    expected: {
      answered: 10,
      accuracy: 50,
      hasSummary: true,
      isFlawless: false,
      flawlessBanner: null
    }
  },
  {
    name: '10/10 (correct: 10, wrong: 0)',
    input: { correct: 10, wrong: 0, score: 9200 },
    expected: {
      answered: 10,
      accuracy: 100,
      hasSummary: true,
      isFlawless: true,
      flawlessBanner: 'Flawless Expedition — 100% Identification Accuracy!'
    }
  }
];

for (const tc of testCases) {
  const result = buildExpeditionSummary(tc.input);
  const matchAnswered = result.answered === tc.expected.answered;
  const matchAccuracy = result.accuracy === tc.expected.accuracy;
  const matchHasSummary = result.hasSummary === tc.expected.hasSummary;
  const matchIsFlawless = result.isFlawless === tc.expected.isFlawless;
  const matchBanner = result.flawlessBanner === tc.expected.flawlessBanner;

  const pass = matchAnswered && matchAccuracy && matchHasSummary && matchIsFlawless && matchBanner;
  if (!pass) allPassed = false;

  console.log(`[${pass ? 'PASS' : 'FAIL'}] ${tc.name}`);
  console.log(`       answered=${result.answered} (exp: ${tc.expected.answered}), accuracy=${result.accuracy}% (exp: ${tc.expected.accuracy}%), hasSummary=${result.hasSummary}, isFlawless=${result.isFlawless}`);
  if (result.flawlessBanner) {
    console.log(`       banner="${result.flawlessBanner}"`);
  }
}

if (!allPassed) {
  console.error('\nFAILED: One or more summary builder unit tests failed.');
  process.exit(1);
}

console.log('\n================================================================================');
console.log('✓ ALL SUMMARY BUILDER UNIT TESTS PASSED (5/5)');
console.log('================================================================================');
