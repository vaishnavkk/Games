import test from 'node:test';
import assert from 'node:assert/strict';
import puzzlesData from '../src/data/puzzles.json' with { type: 'json' };
import { GameManager, shufflePuzzleItems, createRng, LEVELS } from '../src/engine/game.js';
import { calculateStars, isLevelUnlocked, countSolvedPuzzlesInLevel, checkAnswer } from '../src/engine/scoring.js';
import { resetProgress } from '../src/engine/storage.js';

// --- Win/Loss & Completion across all 72 Puzzles ---

test('gameplay: all 72 puzzles valid schema, types and answers', () => {
  assert.equal(puzzlesData.length, 72);
  const byLevel = { 1: 0, 2: 0, 3: 0 };
  for (const p of puzzlesData) {
    byLevel[p.level]++;
    const ids = p.items.map(i => i.id);
    if (p.type === 'pick') {
      assert.ok(ids.includes(p.answer), `Pick answer missing in items: ${p.id}`);
    } else if (p.type === 'tapall') {
      assert.ok(Array.isArray(p.answer));
      assert.ok(p.answer.every(id => ids.includes(id)), `Tapall answer missing in items: ${p.id}`);
    } else if (p.type === 'order') {
      assert.ok(Array.isArray(p.answer));
      assert.equal(p.answer.length, p.items.length);
      assert.ok(p.answer.every(id => ids.includes(id)), `Order answer missing in items: ${p.id}`);
    }
  }
  assert.deepEqual(byLevel, { 1: 24, 2: 24, 3: 24 });
});

test('gameplay: perfect play yields 3 stars and unlocks next levels sequentially', () => {
  resetProgress();
  const game = new GameManager({ puzzles: puzzlesData });

  for (let lvl = 1; lvl <= 3; lvl++) {
    assert.ok(game.isUnlocked(lvl), `Level ${lvl} should be unlocked`);
    game.startLevel(lvl);
    const puzzles = game.getLevelPuzzles(lvl);

    for (let i = 0; i < puzzles.length; i++) {
      const p = puzzles[i];
      assert.equal(game.puzzleId, p.id);

      if (p.type === 'pick') {
        game.submitPick(p.answer);
      } else if (p.type === 'tapall') {
        for (const id of p.answer) game.toggleTapAll(id);
        game.submitTapAll();
      } else if (p.type === 'order') {
        for (const id of p.answer) game.tapOrderItem(id);
      }

      assert.equal(game.screen, 'fact');
      assert.equal(game.stars, 3);
      assert.equal(game.getStarsForPuzzle(p.id), 3);

      game.nextAfterFact();
      if (i < puzzles.length - 1) {
        assert.equal(game.screen, 'puzzle');
      } else {
        assert.equal(game.screen, 'level_done');
      }
    }
  }
});

test('gameplay: 2 wrong tries triggers 1 star and fact transition across all puzzles', () => {
  resetProgress();
  const game = new GameManager({ puzzles: puzzlesData });

  for (const p of puzzlesData) {
    game.startPuzzle(p.id);

    // Wrong try 1
    if (p.type === 'pick') {
      const wrong = p.items.find(i => i.id !== p.answer).id;
      game.submitPick(wrong);
    } else if (p.type === 'tapall') {
      game.submitTapAll(); // empty is wrong
    } else if (p.type === 'order') {
      const wrong = [...p.items].reverse();
      for (const it of wrong) game.tapOrderItem(it.id);
    }

    assert.equal(game.tries, 1);
    assert.equal(game.screen, 'puzzle');
    assert.equal(game.feedback, 'Try again!');

    // Wrong try 2
    if (p.type === 'pick') {
      const wrong = p.items.find(i => i.id !== p.answer).id;
      game.submitPick(wrong);
    } else if (p.type === 'tapall') {
      game.submitTapAll();
    } else if (p.type === 'order') {
      game.orderSelection = [];
      const wrong = [...p.items].reverse();
      for (const it of wrong) game.tapOrderItem(it.id);
    }

    assert.equal(game.tries, 2);
    assert.equal(game.screen, 'fact');
    assert.equal(game.stars, 1);
  }
});

// --- Controls, Rapid Tapping & Edge Cases ---

test('controls: rapid tapping wrong answers caps at 2 tries without exception', () => {
  resetProgress();
  const game = new GameManager({ puzzles: puzzlesData });
  game.startPuzzle('garden-01');
  const wrong = game.getCurrentPuzzle().items.find(i => i.id !== game.getCurrentPuzzle().answer).id;

  for (let i = 0; i < 15; i++) {
    game.submitPick(wrong);
  }

  assert.equal(game.screen, 'fact');
  assert.equal(game.stars, 1);
});

test('controls: tapall rapid toggle and empty submission edge cases', () => {
  resetProgress();
  const game = new GameManager({ puzzles: puzzlesData });
  const tapall = puzzlesData.find(p => p.type === 'tapall');
  game.startPuzzle(tapall.id);

  // Empty submit fails
  game.submitTapAll();
  assert.equal(game.tries, 1);

  // Toggle same item twice
  const firstId = tapall.items[0].id;
  game.toggleTapAll(firstId);
  assert.ok(game.tapAllSelection.has(firstId));
  game.toggleTapAll(firstId);
  assert.ok(!game.tapAllSelection.has(firstId));

  // Correct selection
  for (const id of tapall.answer) game.toggleTapAll(id);
  game.submitTapAll();
  assert.equal(game.screen, 'fact');
  assert.equal(game.stars, 2); // 1 wrong try earlier -> 2 stars
});

test('controls: order puzzle undo and re-order mechanics', () => {
  resetProgress();
  const game = new GameManager({ puzzles: puzzlesData });
  const orderP = puzzlesData.find(p => p.type === 'order');
  game.startPuzzle(orderP.id);

  const items = orderP.items;
  game.tapOrderItem(items[0].id);
  game.tapOrderItem(items[1].id);
  assert.equal(game.orderSelection.length, 2);

  // Undo first item
  game.tapOrderItem(items[0].id);
  assert.deepEqual(game.orderSelection, [items[1].id]);

  // Undo second item
  game.tapOrderItem(items[1].id);
  assert.deepEqual(game.orderSelection, []);

  // Correct order
  for (const id of orderP.answer) game.tapOrderItem(id);
  assert.equal(game.screen, 'fact');
  assert.equal(game.stars, 3);
});

test('controls: non-existent item IDs or malformed checks do not throw', () => {
  const game = new GameManager({ puzzles: puzzlesData });
  game.startPuzzle('garden-01');
  assert.doesNotThrow(() => game.submitPick('bogus_id'));
  assert.doesNotThrow(() => game.toggleTapAll('bogus_id'));
  assert.doesNotThrow(() => game.tapOrderItem('bogus_id'));
  assert.equal(checkAnswer(null, null), false);
  assert.equal(checkAnswer({ type: 'pick' }, null), false);
});

// --- Pause/Resume & Navigation Flow ---

test('flow: mid-puzzle restart and navigation retains state cleanly', () => {
  resetProgress();
  const game = new GameManager({ puzzles: puzzlesData });
  game.startLevel(1);
  game.submitPick(game.getCurrentPuzzle().answer);
  game.nextAfterFact();
  assert.equal(game.puzzleId, 'garden-02');

  // Go to map
  game.goToMap();
  assert.equal(game.screen, 'map');

  // Go to home
  game.goToHome();
  assert.equal(game.screen, 'home');

  // Re-enter level 1 -> picks first unsolved (garden-02)
  game.startLevel(1);
  assert.equal(game.screen, 'puzzle');
  assert.equal(game.puzzleId, 'garden-02');
});

test('flow: replay cannot downgrade star progress', () => {
  resetProgress();
  const game = new GameManager({ puzzles: puzzlesData });
  game.recordStars('garden-01', 3);
  assert.equal(game.getStarsForPuzzle('garden-01'), 3);

  // Record 1 star on replay
  game.recordStars('garden-01', 1);
  assert.equal(game.getStarsForPuzzle('garden-01'), 3);
});

// --- Shuffle & Randomness Integrity ---

test('shuffle: order answers are never pre-solved across 10,000 trials', () => {
  const orderPuzzles = puzzlesData.filter(p => p.type === 'order');
  assert.ok(orderPuzzles.length > 0);

  for (const p of orderPuzzles) {
    for (let i = 0; i < 500; i++) {
      const shuffled = shufflePuzzleItems(p.items, p.type, p.answer);
      const isIdentical = shuffled.every((it, idx) => it.id === p.answer[idx]);
      assert.equal(isIdentical, false, `Order puzzle ${p.id} was pre-solved at trial ${i}`);
    }
  }
});

test('shuffle: pick correct answers are evenly spread across positions', () => {
  const pickPuzzles = puzzlesData.filter(p => p.type === 'pick');
  const slotCounts = [0, 0, 0];
  let total = 0;

  for (const p of pickPuzzles) {
    for (let i = 0; i < 50; i++) {
      const shuffled = shufflePuzzleItems(p.items, p.type, p.answer);
      const idx = shuffled.findIndex(it => it.id === p.answer);
      slotCounts[idx]++;
      total++;
    }
  }

  // Each slot should have between 20% and 45% of total
  slotCounts.forEach((c, idx) => {
    const ratio = c / total;
    assert.ok(ratio > 0.20 && ratio < 0.45, `Slot ${idx} ratio ${ratio} out of bounds`);
  });
});
