import assert from 'node:assert/strict';
import puzzlesData from '../src/data/puzzles.json' with { type: 'json' };
import { GameManager, shufflePuzzleItems, createRng, LEVELS } from '../src/engine/game.js';
import { calculateStars, isLevelUnlocked, countSolvedPuzzlesInLevel, checkAnswer } from '../src/engine/scoring.js';
import { loadProgress, saveProgress, resetProgress } from '../src/engine/storage.js';

console.log('=== TRICKY MEADOW DYNAMIC GAMEPLAY & SCENARIOS TEST SUITE ===');
console.log(`Loaded ${puzzlesData.length} puzzles across ${LEVELS.length} levels.`);

let totalPassed = 0;
function test(name, fn) {
  try {
    fn();
    totalPassed++;
    console.log(`  ✔ ${name}`);
  } catch (err) {
    console.error(`  ✖ FAIL: ${name}`);
    console.error(err);
    process.exit(1);
  }
}

// -------------------------------------------------------------
// SECTION 1: ALL 72 PUZZLES DATA INTEGRITY & WIN/LOSS SIMULATION
// -------------------------------------------------------------
console.log('\n--- Section 1: Win/Loss States & Puzzle Completion across all 72 Puzzles ---');

test('all 72 puzzles have valid schema, items, answers, and facts', () => {
  assert.equal(puzzlesData.length, 72, 'Must have exactly 72 puzzles');
  const levelCounts = { 1: 0, 2: 0, 3: 0 };

  for (const p of puzzlesData) {
    assert.ok(p.id, `Puzzle missing id: ${JSON.stringify(p)}`);
    assert.ok(p.level >= 1 && p.level <= 3, `Invalid level ${p.level} in ${p.id}`);
    levelCounts[p.level]++;
    assert.ok(['pick', 'tapall', 'order'].includes(p.type), `Invalid type ${p.type} in ${p.id}`);
    assert.ok(p.prompt && p.prompt.length > 5, `Prompt missing or too short in ${p.id}`);
    assert.ok(p.fact && p.fact.text && p.fact.text.length > 10, `Fact text missing or too short in ${p.id}`);
    assert.ok(Array.isArray(p.items) && p.items.length >= 3, `Items array must have >= 3 items in ${p.id}`);

    const itemIds = new Set(p.items.map(i => i.id));
    assert.equal(itemIds.size, p.items.length, `Duplicate item IDs in ${p.id}`);

    if (p.type === 'pick') {
      assert.ok(itemIds.has(p.answer), `Answer ${p.answer} not in items for pick puzzle ${p.id}`);
    } else if (p.type === 'tapall') {
      assert.ok(Array.isArray(p.answer), `Answer must be array for tapall ${p.id}`);
      assert.ok(p.answer.length >= 1 && p.answer.length < p.items.length, `tapall answer length invalid in ${p.id}`);
      for (const ansId of p.answer) {
        assert.ok(itemIds.has(ansId), `Answer item ${ansId} not in items for ${p.id}`);
      }
    } else if (p.type === 'order') {
      assert.ok(Array.isArray(p.answer), `Answer must be array for order ${p.id}`);
      assert.equal(p.answer.length, p.items.length, `Order answer must match items length in ${p.id}`);
      for (const ansId of p.answer) {
        assert.ok(itemIds.has(ansId), `Answer item ${ansId} not in items for ${p.id}`);
      }
    }
  }

  assert.deepEqual(levelCounts, { 1: 24, 2: 24, 3: 24 });
});

test('perfect play across all 72 puzzles awards exactly 3 stars each', () => {
  resetProgress();
  const game = new GameManager({ puzzles: puzzlesData });

  for (let lvl = 1; lvl <= 3; lvl++) {
    game.startLevel(lvl);
    const levelPuzzles = game.getLevelPuzzles(lvl);

    for (let i = 0; i < levelPuzzles.length; i++) {
      const p = levelPuzzles[i];
      assert.equal(game.puzzleId, p.id);
      assert.equal(game.screen, 'puzzle');

      // Solve correctly
      if (p.type === 'pick') {
        game.submitPick(p.answer);
      } else if (p.type === 'tapall') {
        for (const ansId of p.answer) game.toggleTapAll(ansId);
        game.submitTapAll();
      } else if (p.type === 'order') {
        for (const ansId of p.answer) game.tapOrderItem(ansId);
      }

      assert.equal(game.screen, 'fact', `Should transition to fact for ${p.id}`);
      assert.equal(game.stars, 3, `Expected 3 stars for ${p.id}`);
      assert.equal(game.getStarsForPuzzle(p.id), 3);

      game.nextAfterFact();
      if (i < levelPuzzles.length - 1) {
        assert.equal(game.screen, 'puzzle');
      } else {
        assert.equal(game.screen, 'level_done');
      }
    }

    assert.equal(game.getTotalStarsForLevel(lvl), 24 * 3);
  }
});

test('retry with hint across all 72 puzzles awards exactly 2 stars each', () => {
  resetProgress();
  const game = new GameManager({ puzzles: puzzlesData });

  for (const p of puzzlesData) {
    game.startPuzzle(p.id);
    game.useHint();
    assert.equal(game.hintUsed, true);

    // Make 1 wrong attempt
    if (p.type === 'pick') {
      const wrongId = p.items.find(i => i.id !== p.answer).id;
      game.submitPick(wrongId);
    } else if (p.type === 'tapall') {
      game.submitTapAll(); // empty
    } else if (p.type === 'order') {
      const wrongOrder = [...p.items].reverse();
      for (const it of wrongOrder) game.tapOrderItem(it.id);
    }

    assert.equal(game.tries, 1, `Tries should be 1 for ${p.id}`);
    assert.equal(game.screen, 'puzzle');

    // Solve correctly
    if (p.type === 'pick') {
      game.submitPick(p.answer);
    } else if (p.type === 'tapall') {
      for (const ansId of p.answer) game.toggleTapAll(ansId);
      game.submitTapAll();
    } else if (p.type === 'order') {
      // Clear or wait
      game.orderSelection = [];
      for (const ansId of p.answer) game.tapOrderItem(ansId);
    }

    assert.equal(game.screen, 'fact');
    assert.equal(game.stars, 2, `Expected 2 stars for ${p.id} with hint & 1 retry`);
  }
});

test('two consecutive wrong attempts force completion with 1 star', () => {
  resetProgress();
  const game = new GameManager({ puzzles: puzzlesData });

  for (const p of puzzlesData) {
    game.startPuzzle(p.id);

    // 1st wrong attempt
    if (p.type === 'pick') {
      const wrongId = p.items.find(i => i.id !== p.answer).id;
      game.submitPick(wrongId);
    } else if (p.type === 'tapall') {
      game.submitTapAll();
    } else if (p.type === 'order') {
      const wrongOrder = [...p.items].reverse();
      for (const it of wrongOrder) game.tapOrderItem(it.id);
    }

    assert.equal(game.tries, 1);
    assert.equal(game.screen, 'puzzle');
    assert.equal(game.isShaking, true);
    assert.equal(game.feedback, 'Try again!');

    // 2nd wrong attempt
    if (p.type === 'pick') {
      const wrongId = p.items.find(i => i.id !== p.answer).id;
      game.submitPick(wrongId);
    } else if (p.type === 'tapall') {
      game.submitTapAll();
    } else if (p.type === 'order') {
      game.orderSelection = [];
      const wrongOrder = [...p.items].reverse();
      for (const it of wrongOrder) game.tapOrderItem(it.id);
    }

    assert.equal(game.tries, 2);
    assert.equal(game.screen, 'fact', `Should advance to fact after 2 wrong attempts on ${p.id}`);
    assert.equal(game.stars, 1, `Should receive 1 star on 2 wrong attempts on ${p.id}`);
    assert.equal(game.getStarsForPuzzle(p.id), 1);
  }
});

// -------------------------------------------------------------
// SECTION 2: SCORING, PROGRESSION & PERSISTENCE
// -------------------------------------------------------------
console.log('\n--- Section 2: Scoring, Progression & Persistence ---');

test('star formula matches requirements for all combinations', () => {
  assert.equal(calculateStars({ tries: 0, hintUsed: false }), 3);
  assert.equal(calculateStars({ tries: 0, hintUsed: true }), 2);
  assert.equal(calculateStars({ tries: 1, hintUsed: false }), 2);
  assert.equal(calculateStars({ tries: 1, hintUsed: true }), 2);
  assert.equal(calculateStars({ tries: 2, hintUsed: false }), 1);
  assert.equal(calculateStars({ tries: 2, hintUsed: true }), 1);
  assert.equal(calculateStars({ tries: 3, hintUsed: false }), 1);
  assert.equal(calculateStars({ tries: 10, hintUsed: true }), 1);
});

test('level unlocks require exactly 4 solved puzzles from previous level', () => {
  const pList = puzzlesData;
  const stars = {};

  assert.equal(isLevelUnlocked(1, stars, pList), true);
  assert.equal(isLevelUnlocked(2, stars, pList), false);
  assert.equal(isLevelUnlocked(3, stars, pList), false);

  // Solve 3 in Level 1
  stars['garden-01'] = 3;
  stars['garden-02'] = 2;
  stars['garden-03'] = 1;
  assert.equal(countSolvedPuzzlesInLevel(1, stars, pList), 3);
  assert.equal(isLevelUnlocked(2, stars, pList), false);

  // Solve 4th in Level 1
  stars['garden-04'] = 1;
  assert.equal(countSolvedPuzzlesInLevel(1, stars, pList), 4);
  assert.equal(isLevelUnlocked(2, stars, pList), true);
  assert.equal(isLevelUnlocked(3, stars, pList), false);

  // Solve 3 in Level 2
  stars['sky-01'] = 3;
  stars['sky-02'] = 3;
  stars['sky-03'] = 3;
  assert.equal(countSolvedPuzzlesInLevel(2, stars, pList), 3);
  assert.equal(isLevelUnlocked(3, stars, pList), false);

  // Solve 4th in Level 2
  stars['sky-04'] = 2;
  assert.equal(countSolvedPuzzlesInLevel(2, stars, pList), 4);
  assert.equal(isLevelUnlocked(3, stars, pList), true);
});

test('replaying a puzzle and scoring fewer stars does not downgrade progress', () => {
  resetProgress();
  const game = new GameManager({ puzzles: puzzlesData });

  // First attempt: perfect 3 stars
  game.startPuzzle('garden-01');
  game.submitPick(game.getCurrentPuzzle().answer);
  assert.equal(game.getStarsForPuzzle('garden-01'), 3);

  // Replay: 2 wrong tries -> 1 star
  game.startPuzzle('garden-01');
  const wrongId = game.getCurrentPuzzle().items.find(i => i.id !== game.getCurrentPuzzle().answer).id;
  game.submitPick(wrongId);
  game.submitPick(wrongId);
  assert.equal(game.stars, 1);
  // Persisted stars must remain 3!
  assert.equal(game.getStarsForPuzzle('garden-01'), 3);
});

test('startLevel picks the first unsolved puzzle in the level', () => {
  resetProgress();
  const game = new GameManager({ puzzles: puzzlesData });
  game.startLevel(1);
  assert.equal(game.puzzleId, 'garden-01');

  // Mark garden-01 and garden-02 as solved
  game.recordStars('garden-01', 3);
  game.recordStars('garden-02', 2);

  game.startLevel(1);
  assert.equal(game.puzzleId, 'garden-03');

  // If all solved in level, restarts at first puzzle
  const l1Puzzles = game.getLevelPuzzles(1);
  for (const p of l1Puzzles) game.recordStars(p.id, 3);
  game.startLevel(1);
  assert.equal(game.puzzleId, 'garden-01');
});

// -------------------------------------------------------------
// SECTION 3: CONTROLS, RAPID TAPPING & EDGE CASES
// -------------------------------------------------------------
console.log('\n--- Section 3: Controls & Input Handling Edge Cases ---');

test('rapid spam clicks on wrong answer do not exceed 2 tries or cause NaN', () => {
  resetProgress();
  const game = new GameManager({ puzzles: puzzlesData });
  game.startPuzzle('garden-01');
  const wrongId = game.getCurrentPuzzle().items.find(i => i.id !== game.getCurrentPuzzle().answer).id;

  // Spam 20 clicks
  for (let i = 0; i < 20; i++) {
    game.submitPick(wrongId);
  }

  assert.equal(game.screen, 'fact');
  assert.equal(game.stars, 1);
});

test('tapall rapid toggling, deselection, and empty submission', () => {
  resetProgress();
  const game = new GameManager({ puzzles: puzzlesData });
  // Find a tapall puzzle
  const tapallP = puzzlesData.find(p => p.type === 'tapall');
  game.startPuzzle(tapallP.id);

  // 1. Empty submit -> counts as wrong try
  game.submitTapAll();
  assert.equal(game.tries, 1);
  assert.equal(game.screen, 'puzzle');

  // 2. Rapid toggle an item 5 times (odd = selected, even = unselected)
  const item0 = tapallP.items[0].id;
  game.toggleTapAll(item0);
  assert.ok(game.tapAllSelection.has(item0));
  game.toggleTapAll(item0);
  assert.ok(!game.tapAllSelection.has(item0));
  game.toggleTapAll(item0);
  assert.ok(game.tapAllSelection.has(item0));
  game.toggleTapAll(item0);
  assert.ok(!game.tapAllSelection.has(item0));
  game.toggleTapAll(item0);
  assert.ok(game.tapAllSelection.has(item0));

  // Deselect it
  game.toggleTapAll(item0);
  assert.equal(game.tapAllSelection.size, 0);

  // 3. Select correct set and submit
  for (const ansId of tapallP.answer) {
    game.toggleTapAll(ansId);
  }
  game.submitTapAll();
  assert.equal(game.screen, 'fact');
  assert.equal(game.stars, 2); // 1 wrong earlier -> 2 stars
});

test('order puzzle item selection and undo mechanics', () => {
  resetProgress();
  const game = new GameManager({ puzzles: puzzlesData });
  const orderP = puzzlesData.find(p => p.type === 'order');
  game.startPuzzle(orderP.id);

  const items = orderP.items;
  // Select first item
  game.tapOrderItem(items[0].id);
  assert.deepEqual(game.orderSelection, [items[0].id]);

  // Select second item
  game.tapOrderItem(items[1].id);
  assert.deepEqual(game.orderSelection, [items[0].id, items[1].id]);

  // Tap first item again to undo
  game.tapOrderItem(items[0].id);
  assert.deepEqual(game.orderSelection, [items[1].id]);

  // Tap second item again to undo
  game.tapOrderItem(items[1].id);
  assert.deepEqual(game.orderSelection, []);

  // Now tap full correct sequence
  for (const ansId of orderP.answer) {
    game.tapOrderItem(ansId);
  }
  assert.equal(game.screen, 'fact');
  assert.equal(game.stars, 3);
});

test('invalid inputs: null, undefined, bogus IDs are handled safely', () => {
  const game = new GameManager({ puzzles: puzzlesData });
  game.startPuzzle('garden-01');

  // Submit bogus pick
  game.submitPick('non_existent_id');
  assert.equal(game.tries, 1);

  // Wrong puzzle type calls
  game.submitTapAll(); // Current is pick, so tapall should be ignored
  assert.equal(game.tries, 1);
  game.tapOrderItem('item_x'); // Order call ignored
  assert.equal(game.tries, 1);

  // checkAnswer robustness
  assert.equal(checkAnswer(null, 'foo'), false);
  assert.equal(checkAnswer({}, null), false);
  assert.equal(checkAnswer({ type: 'unknown' }, 'foo'), false);
  assert.equal(checkAnswer({ type: 'order', answer: [1, 2] }, null), false);
  assert.equal(checkAnswer({ type: 'tapall', answer: [1, 2] }, 'not-array'), false);
});

// -------------------------------------------------------------
// SECTION 4: PAUSE / RESUME / RESTART FLOW
// -------------------------------------------------------------
console.log('\n--- Section 4: Pause/Resume, Restart & Navigation Flow ---');

test('mid-puzzle restart resets puzzle state cleanly', () => {
  const game = new GameManager({ puzzles: puzzlesData });
  game.startPuzzle('garden-01');
  game.useHint();
  game.submitPick('wrong-id');
  assert.equal(game.tries, 1);
  assert.equal(game.hintUsed, true);

  // Restart mid-puzzle
  game.startPuzzle('garden-01');
  assert.equal(game.tries, 0);
  assert.equal(game.hintUsed, false);
  assert.equal(game.screen, 'puzzle');
  assert.equal(game.feedback, null);
  assert.equal(game.isShaking, false);
});

test('navigating back to map and re-entering retains progress', () => {
  resetProgress();
  const game = new GameManager({ puzzles: puzzlesData });
  game.startLevel(1);
  game.submitPick(game.getCurrentPuzzle().answer); // Solve puzzle 1
  game.nextAfterFact(); // moves to puzzle 2
  assert.equal(game.puzzleId, 'garden-02');

  // Back to map
  game.goToMap();
  assert.equal(game.screen, 'map');

  // Re-enter level 1
  game.startLevel(1);
  assert.equal(game.screen, 'puzzle');
  assert.equal(game.puzzleId, 'garden-02'); // Resumes at unsolved garden-02!
});

test('settings screen navigation and progress reset', () => {
  resetProgress();
  const game = new GameManager({ puzzles: puzzlesData });
  game.recordStars('garden-01', 3);
  game.recordStars('garden-02', 3);
  assert.equal(game.getTotalStarsForLevel(1), 6);

  game.openSettings();
  assert.equal(game.screen, 'settings');

  // Reset progress
  game.resetAllProgress();
  assert.equal(game.screen, 'home');
  assert.equal(game.getTotalStarsForLevel(1), 0);
  assert.equal(game.isUnlocked(2), false);
});

// -------------------------------------------------------------
// SECTION 5: SHUFFLE & RANDOMNESS INTEGRITY
// -------------------------------------------------------------
console.log('\n--- Section 5: Shuffle & Randomness Integrity ---');

test('crypto RNG seed reproducibility and non-triviality', () => {
  const rng1 = createRng(123456789);
  const rng2 = createRng(123456789);
  for (let i = 0; i < 50; i++) {
    assert.equal(rng1(), rng2(), 'Seeded RNG must produce identical sequences');
  }

  // Without seed, successive values must be distinct
  const rngCrypto = createRng();
  const val1 = rngCrypto();
  const val2 = rngCrypto();
  assert.notEqual(val1, val2);
});

test('pick puzzles: correct answer is uniformly distributed across card slots', () => {
  const pickPuzzles = puzzlesData.filter(p => p.type === 'pick');
  assert.ok(pickPuzzles.length > 0);

  // Across all pick puzzles, each started 100 times, check slot distribution
  const slotCounts = { 0: 0, 1: 0, 2: 0, 3: 0 };
  let totalStarts = 0;

  for (const p of pickPuzzles) {
    for (let s = 0; s < 100; s++) {
      const shuffled = shufflePuzzleItems(p.items, p.type, p.answer);
      const slot = shuffled.findIndex(it => it.id === p.answer);
      assert.ok(slot >= 0, `Answer not found in shuffled items for ${p.id}`);
      slotCounts[slot] = (slotCounts[slot] || 0) + 1;
      totalStarts++;
    }
  }

  console.log(`    Total pick starts: ${totalStarts}, Distribution by slot:`, slotCounts);
  // Slot 0 should not have > 50% of the total (naive player check)
  const slot0Ratio = slotCounts[0] / totalStarts;
  assert.ok(slot0Ratio < 0.40, `Slot 0 ratio ${slot0Ratio} is too high (must be < 40%)`);
});

test('tapall puzzles: target answers are distributed across slots', () => {
  const tapallPuzzles = puzzlesData.filter(p => p.type === 'tapall');
  assert.ok(tapallPuzzles.length > 0);

  // Verify that target answers are not always in the first k positions
  let firstKMatches = 0;
  let totalTrials = 0;

  for (const p of tapallPuzzles) {
    const k = p.answer.length;
    const ansSet = new Set(p.answer);
    for (let s = 0; s < 50; s++) {
      const shuffled = shufflePuzzleItems(p.items, p.type, p.answer);
      const firstK = shuffled.slice(0, k).map(it => it.id);
      if (firstK.every(id => ansSet.has(id))) {
        firstKMatches++;
      }
      totalTrials++;
    }
  }

  const firstKRatio = firstKMatches / totalTrials;
  console.log(`    Total tapall starts: ${totalTrials}, first-k match ratio: ${(firstKRatio * 100).toFixed(1)}%`);
  assert.ok(firstKRatio < 0.35, `first-k match ratio ${firstKRatio} too high`);
});

test('order puzzles: displayed order is NEVER pre-solved across 10,000 trials', () => {
  const orderPuzzles = puzzlesData.filter(p => p.type === 'order');
  assert.ok(orderPuzzles.length > 0);

  let preSolvedCount = 0;
  let totalTrials = 0;

  for (const p of orderPuzzles) {
    for (let s = 0; s < 500; s++) {
      const shuffled = shufflePuzzleItems(p.items, p.type, p.answer);
      const isPreSolved = shuffled.every((it, idx) => it.id === p.answer[idx]);
      if (isPreSolved) {
        preSolvedCount++;
      }
      totalTrials++;
    }
  }

  assert.equal(preSolvedCount, 0, `Order puzzles were pre-solved ${preSolvedCount} times out of ${totalTrials}`);
});

console.log(`\n======================================================`);
console.log(`ALL ${totalPassed} DYNAMIC GAMEPLAY & SCENARIOS TESTS PASSED!`);
console.log(`======================================================\n`);
