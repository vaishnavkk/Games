import test from 'node:test';
import assert from 'node:assert/strict';
import { GameManager } from '../../src/engine/game.js';
import { checkAnswer } from '../../src/engine/scoring.js';
import { loadProgress, resetProgress } from '../../src/engine/storage.js';

// --- (a) Corrupted / Primitive localStorage stars recovery ---
test('regression (a): corrupted / primitive localStorage stars recovery handles malformed data gracefully', () => {
  const originalLocalStorage = globalThis.localStorage;

  const testCases = [
    { name: 'syntax error string', raw: 'corrupted' },
    { name: 'primitive number JSON', raw: '123' },
    { name: 'primitive null JSON', raw: 'null' },
    { name: 'primitive array JSON', raw: '[]' },
    { name: 'corrupted string stars property', raw: JSON.stringify({ stars: 'corrupted' }) },
    { name: 'number stars property', raw: JSON.stringify({ stars: 123 }) },
    { name: 'null stars property', raw: JSON.stringify({ stars: null }) },
    { name: 'array stars property', raw: JSON.stringify({ stars: ['star1', 'star2'] }) },
    { name: 'boolean stars property', raw: JSON.stringify({ stars: true }) }
  ];

  for (const tc of testCases) {
    globalThis.localStorage = {
      getItem() {
        return tc.raw;
      },
      setItem() {},
      removeItem() {}
    };

    try {
      const progress = loadProgress();
      assert.ok(progress && typeof progress === 'object', `progress must be object for ${tc.name}`);
      assert.ok(progress.stars && typeof progress.stars === 'object' && !Array.isArray(progress.stars),
        `progress.stars must be a valid non-array object for ${tc.name}`);
      assert.deepEqual(progress.stars, {}, `progress.stars should default to empty object for ${tc.name}`);

      // GameManager instantiation must succeed without throwing
      const game = new GameManager();
      assert.ok(game.progress.stars && typeof game.progress.stars === 'object' && !Array.isArray(game.progress.stars),
        `game.progress.stars must be valid object for ${tc.name}`);
      assert.deepEqual(game.progress.stars, {}, `game.progress.stars must be empty for ${tc.name}`);
    } finally {
      if (originalLocalStorage) {
        globalThis.localStorage = originalLocalStorage;
      } else {
        delete globalThis.localStorage;
      }
    }
  }
});

// --- (b) Duplicate items in tapall answers ---
test('regression (b): duplicate items in tapall answers fail validation', () => {
  const puzzle = {
    type: 'tapall',
    answer: ['earth', 'jupiter', 'saturn']
  };

  // Duplicates filling correct length
  assert.equal(checkAnswer(puzzle, ['earth', 'earth', 'earth']), false,
    "['earth', 'earth', 'earth'] must fail against distinct 3-item answer");
  assert.equal(checkAnswer(puzzle, ['earth', 'earth', 'jupiter']), false,
    "['earth', 'earth', 'jupiter'] must fail against 3 distinct items");
  assert.equal(checkAnswer(puzzle, ['saturn', 'saturn', 'saturn']), false,
    "['saturn', 'saturn', 'saturn'] must fail");

  // Duplicate with extra length
  assert.equal(checkAnswer(puzzle, ['earth', 'jupiter', 'saturn', 'earth']), false,
    'Duplicate with extra length must fail');

  // Correct unique set in any order
  assert.equal(checkAnswer(puzzle, ['earth', 'jupiter', 'saturn']), true,
    'Exact match must pass');
  assert.equal(checkAnswer(puzzle, ['saturn', 'earth', 'jupiter']), true,
    'Order-independent match must pass');
  assert.equal(checkAnswer(puzzle, ['jupiter', 'saturn', 'earth']), true,
    'Order-independent match must pass');
});

// --- (c) Rapid click / submission lock during isShaking ---
test('regression (c): rapid click / submission lock during isShaking rejects input', () => {
  resetProgress();
  const game = new GameManager();
  game.startLevel(1);
  const puzzle = game.getCurrentPuzzle();
  assert.ok(puzzle, 'Current puzzle should be active');

  // Put game into shaking state
  game.isShaking = true;
  const initialTries = game.tries;
  const initialScreen = game.screen;

  // Attempt wrong submission during isShaking
  const wrongAnswer = puzzle.items.find(i => i.id !== puzzle.answer)?.id || 'wrong_choice';
  game.submitAnswer(wrongAnswer);
  assert.equal(game.tries, initialTries, 'submitAnswer must be rejected when isShaking is true');
  assert.equal(game.screen, initialScreen, 'Screen must remain on puzzle during isShaking');

  // Attempt correct submission during isShaking
  game.submitAnswer(puzzle.answer);
  assert.equal(game.tries, initialTries, 'Correct submitAnswer must be rejected when isShaking is true');
  assert.equal(game.screen, initialScreen, 'Screen must not transition during isShaking');

  // Once isShaking is false, submission proceeds normally
  game.isShaking = false;
  game.submitAnswer(puzzle.answer);
  assert.equal(game.screen, 'fact', 'submitAnswer should succeed once isShaking is false');
});

// --- (d) resetAllProgress() full state cleanup ---
test('regression (d): resetAllProgress() full state cleanup resets selections, feedback and shake', () => {
  resetProgress();
  const game = new GameManager();
  game.startLevel(1);

  // Pollute state with active gameplay data
  game.orderSelection = ['item_a', 'item_b'];
  game.tapAllSelection.add('item_c');
  game.feedback = 'Try again!';
  game.isShaking = true;
  game.tries = 1;
  game.hintUsed = true;
  game.stars = 2;
  game.level = 2;

  // Execute full reset
  game.resetAllProgress();

  assert.deepEqual(game.orderSelection, [], 'orderSelection must be reset to empty array');
  assert.equal(game.tapAllSelection.size, 0, 'tapAllSelection must be reset to empty set');
  assert.equal(game.feedback, null, 'feedback must be reset to null');
  assert.equal(game.isShaking, false, 'isShaking must be reset to false');
  assert.equal(game.tries, 0, 'tries must be reset to 0');
  assert.equal(game.hintUsed, false, 'hintUsed must be reset to false');
  assert.equal(game.stars, 0, 'stars must be reset to 0');
  assert.equal(game.level, 1, 'level must be reset to 1');
  assert.equal(game.puzzleId, null, 'puzzleId must be reset to null');
  assert.equal(game.screen, 'home', 'screen must be reset to home');
  assert.deepEqual(game.progress.stars, {}, 'saved progress stars must be empty');
});

// --- (e) Shallow copy safety in getCurrentDisplayedItems() ---
test('regression (e): shallow copy safety in getCurrentDisplayedItems() prevents internal state mutation', () => {
  const game = new GameManager();
  game.startLevel(1);

  // Scenario 1: displayedItems is explicitly set
  game.displayedItems = [{ id: 'item_1', name: 'One' }, { id: 'item_2', name: 'Two' }];
  const items1 = game.getCurrentDisplayedItems();
  assert.equal(items1.length, 2);

  // Mutating the returned array (push, pop, reverse)
  items1.push({ id: 'item_3', name: 'Three' });
  items1.reverse();
  assert.equal(game.displayedItems.length, 2, 'Internal displayedItems length must not change');
  assert.equal(game.displayedItems[0].id, 'item_1', 'Internal displayedItems order must not change');

  // Scenario 2: displayedItems is empty/fallback to puzzle.items
  game.displayedItems = [];
  const currentPuzzle = game.getCurrentPuzzle();
  const originalPuzzleItemsCount = currentPuzzle.items.length;
  const firstItemId = currentPuzzle.items[0].id;

  const items2 = game.getCurrentDisplayedItems();
  assert.equal(items2.length, originalPuzzleItemsCount);

  // Mutate returned array
  items2.pop();
  items2.reverse();
  assert.equal(currentPuzzle.items.length, originalPuzzleItemsCount,
    'currentPuzzle.items length must remain unaffected');
  assert.equal(currentPuzzle.items[0].id, firstItemId,
    'currentPuzzle.items original order must remain unaffected');
});

// --- (f) nextAfterFact() unknown puzzle ID guard ---
test('regression (f): nextAfterFact() unknown puzzle ID guard falls back to map screen', () => {
  const game = new GameManager();
  game.startLevel(1);

  // Set unknown/invalid puzzle ID
  game.puzzleId = 'unknown_puzzle_xyz_999';
  game.screen = 'fact';

  // Advance from fact screen
  game.nextAfterFact();

  // Must safely fall back to 'map' instead of falling through to 'level_done'
  assert.equal(game.screen, 'map',
    "Unknown puzzle ID must fall back to 'map' screen, never 'level_done'");
});
