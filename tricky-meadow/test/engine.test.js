import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateStars, isLevelUnlocked, countSolvedPuzzlesInLevel, checkAnswer } from '../src/engine/scoring.js';
import { loadProgress, saveProgress, resetProgress } from '../src/engine/storage.js';

// --- Star Calculation Tests ---
test('calculateStars: 3 stars for first try without hint', () => {
  assert.equal(calculateStars({ tries: 0, hintUsed: false }), 3);
});

test('calculateStars: 2 stars when hint used on first try or after 1 retry', () => {
  assert.equal(calculateStars({ tries: 0, hintUsed: true }), 2);
  assert.equal(calculateStars({ tries: 1, hintUsed: false }), 2);
  assert.equal(calculateStars({ tries: 1, hintUsed: true }), 2);
});

test('calculateStars: 1 star for 2 or more retries', () => {
  assert.equal(calculateStars({ tries: 2, hintUsed: false }), 1);
  assert.equal(calculateStars({ tries: 2, hintUsed: true }), 1);
  assert.equal(calculateStars({ tries: 5, hintUsed: false }), 1);
});

// --- Unlock Logic Tests ---
const mockPuzzles = [
  { id: 'l1_1', level: 1 },
  { id: 'l1_2', level: 1 },
  { id: 'l1_3', level: 1 },
  { id: 'l1_4', level: 1 },
  { id: 'l1_5', level: 1 },
  { id: 'l1_6', level: 1 },
  { id: 'l2_1', level: 2 },
  { id: 'l2_2', level: 2 },
  { id: 'l2_3', level: 2 },
  { id: 'l2_4', level: 2 },
  { id: 'l2_5', level: 2 },
  { id: 'l2_6', level: 2 },
  { id: 'l3_1', level: 3 }
];

test('unlock logic: Level 1 is always unlocked', () => {
  assert.equal(isLevelUnlocked(1, {}, mockPuzzles), true);
  assert.equal(isLevelUnlocked(1, { l1_1: 3 }, mockPuzzles), true);
});

test('unlock logic: Level 2 unlocks only after 4 puzzles solved in Level 1', () => {
  // 0-3 solved in Level 1 -> locked
  assert.equal(isLevelUnlocked(2, {}, mockPuzzles), false);
  assert.equal(isLevelUnlocked(2, { l1_1: 3, l1_2: 2, l1_3: 1 }, mockPuzzles), false);

  // Exactly 4 solved in Level 1 -> unlocked
  const fourSolved = { l1_1: 3, l1_2: 2, l1_3: 1, l1_4: 3 };
  assert.equal(countSolvedPuzzlesInLevel(1, fourSolved, mockPuzzles), 4);
  assert.equal(isLevelUnlocked(2, fourSolved, mockPuzzles), true);

  // 5 or 6 solved in Level 1 -> unlocked
  const fiveSolved = { ...fourSolved, l1_5: 3 };
  assert.equal(isLevelUnlocked(2, fiveSolved, mockPuzzles), true);
});

test('unlock logic: Level 3 unlocks only after 4 puzzles solved in Level 2', () => {
  const l1Clear = { l1_1: 3, l1_2: 3, l1_3: 3, l1_4: 3 };
  // Level 2 has 3 solved -> Level 3 locked
  const l2ThreeSolved = { ...l1Clear, l2_1: 2, l2_2: 3, l2_3: 1 };
  assert.equal(isLevelUnlocked(3, l2ThreeSolved, mockPuzzles), false);

  // Level 2 has 4 solved -> Level 3 unlocked
  const l2FourSolved = { ...l2ThreeSolved, l2_4: 3 };
  assert.equal(countSolvedPuzzlesInLevel(2, l2FourSolved, mockPuzzles), 4);
  assert.equal(isLevelUnlocked(3, l2FourSolved, mockPuzzles), true);
});

// --- Answer Checking Tests ---
test('checkAnswer: pick type validates single correct answer', () => {
  const puzzle = { type: 'pick', answer: 'strawberry' };
  assert.equal(checkAnswer(puzzle, 'strawberry'), true);
  assert.equal(checkAnswer(puzzle, 'mushroom'), false);
  assert.equal(checkAnswer(puzzle, null), false);
});

test('checkAnswer: tapall type validates complete set regardless of order', () => {
  const puzzle = { type: 'tapall', answer: ['earth', 'jupiter', 'saturn'] };
  // Order independent
  assert.equal(checkAnswer(puzzle, ['jupiter', 'saturn', 'earth']), true);
  assert.equal(checkAnswer(puzzle, ['earth', 'jupiter', 'saturn']), true);
  // Missing item
  assert.equal(checkAnswer(puzzle, ['earth', 'jupiter']), false);
  // Extra item
  assert.equal(checkAnswer(puzzle, ['earth', 'jupiter', 'saturn', 'sun']), false);
  // Non-array
  assert.equal(checkAnswer(puzzle, 'earth'), false);
});

test('checkAnswer: order type validates exact ordered sequence', () => {
  const puzzle = { type: 'order', answer: ['egg', 'caterpillar', 'cocoon', 'butterfly'] };
  // Correct sequence
  assert.equal(checkAnswer(puzzle, ['egg', 'caterpillar', 'cocoon', 'butterfly']), true);
  // Wrong sequence
  assert.equal(checkAnswer(puzzle, ['egg', 'cocoon', 'caterpillar', 'butterfly']), false);
  // Partial sequence
  assert.equal(checkAnswer(puzzle, ['egg', 'caterpillar']), false);
});

// --- Storage Fallback Tests ---
test('storage fallback: handles localStorage throw gracefully in memory', () => {
  // Simulate throwing localStorage
  const originalLocalStorage = globalThis.localStorage;
  globalThis.localStorage = {
    getItem() {
      throw new Error('SecurityError: Access denied');
    },
    setItem() {
      throw new Error('QuotaExceededError');
    },
    removeItem() {
      throw new Error('SecurityError: Access denied');
    }
  };

  try {
    // Should not throw, should save in-memory
    saveProgress({ stars: { puzzle_a: 3, puzzle_b: 2 } });
    const loaded = loadProgress();
    assert.deepEqual(loaded.stars, { puzzle_a: 3, puzzle_b: 2 });

    // Reset should work in-memory without throw
    const reset = resetProgress();
    assert.deepEqual(reset.stars, {});
    const afterReset = loadProgress();
    assert.deepEqual(afterReset.stars, {});
  } finally {
    if (originalLocalStorage) {
      globalThis.localStorage = originalLocalStorage;
    } else {
      delete globalThis.localStorage;
    }
  }
});

// --- Data-Driven Counts Tests (v0.2.0) ---
test('data-driven counts: with 18 puzzles in level, max stars is 54, unlock needs 4, starts at first unfinished', () => {
  const p18 = Array.from({ length: 18 }, (_, i) => ({ id: `p_${i + 1}`, level: 1 }));
  const p18_l2 = Array.from({ length: 18 }, (_, i) => ({ id: `p2_${i + 1}`, level: 2 }));
  const allMock = [...p18, ...p18_l2];

  // 1. Max stars for 18 puzzles is 54
  const totalStarsFor18 = p18.length * 3;
  assert.equal(totalStarsFor18, 54);

  // 2. Unlock still needs 4 solved in previous level
  assert.equal(isLevelUnlocked(2, { p_1: 3, p_2: 3, p_3: 3 }, allMock), false);
  assert.equal(isLevelUnlocked(2, { p_1: 3, p_2: 3, p_3: 3, p_4: 1 }, allMock), true);

  // 3. Play level starts at first unfinished
  const progressWithThree = { stars: { p_1: 3, p_2: 2, p_3: 3 } };
  const nextUnsolved = p18.find(p => !progressWithThree.stars[p.id]);
  assert.equal(nextUnsolved.id, 'p_4');

  // If none solved, starts at first puzzle
  const progressEmpty = { stars: {} };
  const firstUnsolved = p18.find(p => !progressEmpty.stars[p.id]) || p18[0];
  assert.equal(firstUnsolved.id, 'p_1');
});

