import test from 'node:test';
import assert from 'node:assert/strict';
import { GameManager, shufflePuzzleItems } from '../src/engine/game.js';
import puzzlesData from '../src/data/puzzles.json' with { type: 'json' };

test('shuffle: uniformity of the correct position across repeated shuffles', () => {
  const items = [
    { id: 'a', label: 'Item A' },
    { id: 'b', label: 'Item B' },
    { id: 'c', label: 'Item C' }
  ];
  const counts = [0, 0, 0];
  const N = 3000;

  for (let i = 0; i < N; i++) {
    const shuffled = shufflePuzzleItems(items, 'pick', 'a');
    const idx = shuffled.findIndex(it => it.id === 'a');
    counts[idx]++;
  }

  // Expected 1000 per slot; verify each slot is within [800, 1200]
  counts.forEach((c, idx) => {
    assert.ok(c > 800 && c < 1200, `Slot ${idx} count ${c} outside expected range [800, 1200]`);
  });
});

test('shuffle: order puzzles displayed order NEVER equals answer order', () => {
  const items3 = [
    { id: 'a', label: 'First' },
    { id: 'b', label: 'Second' },
    { id: 'c', label: 'Third' }
  ];
  const ans3 = ['a', 'b', 'c'];
  const N = 1000;

  for (let i = 0; i < N; i++) {
    const shuffled = shufflePuzzleItems(items3, 'order', ans3);
    const isIdentical = shuffled.every((it, idx) => it.id === ans3[idx]);
    assert.strictEqual(isIdentical, false, `Order shuffle produced identical answer order at trial ${i}`);
  }

  const items4 = [
    { id: 'a', label: '1' },
    { id: 'b', label: '2' },
    { id: 'c', label: '3' },
    { id: 'd', label: '4' }
  ];
  const ans4 = ['a', 'b', 'c', 'd'];
  for (let i = 0; i < N; i++) {
    const shuffled = shufflePuzzleItems(items4, 'order', ans4);
    const isIdentical = shuffled.every((it, idx) => it.id === ans4[idx]);
    assert.strictEqual(isIdentical, false, `Order shuffle (4 items) produced identical answer order at trial ${i}`);
  }
});

test('shuffle: order stays stable during one attempt on wrong answer', () => {
  const game = new GameManager({ puzzles: puzzlesData });
  game.startPuzzle('garden-01');
  const initialOrder = game.getCurrentDisplayedItems().map(it => it.id);

  // Trigger wrong answer attempt
  game.handleWrongAnswer();
  const orderAfterWrong = game.getCurrentDisplayedItems().map(it => it.id);
  assert.deepStrictEqual(orderAfterWrong, initialOrder, 'Displayed items changed during same attempt after wrong answer');

  game.handleWrongAnswer();
  const orderAfterWrong2 = game.getCurrentDisplayedItems().map(it => it.id);
  assert.deepStrictEqual(orderAfterWrong2, initialOrder, 'Displayed items changed during second retry of attempt');
});

test('shuffle: changes order across distinct puzzle starts', () => {
  const game = new GameManager({ puzzles: puzzlesData });
  const observedOrders = new Set();
  const starts = 50;

  for (let i = 0; i < starts; i++) {
    game.startPuzzle('garden-01');
    observedOrders.add(game.getCurrentDisplayedItems().map(it => it.id).join(','));
  }

  // 3-item puzzle has 6 permutations. Over 50 starts, we should observe at least 4 distinct permutations.
  assert.ok(observedOrders.size >= 4, `Expected >= 4 permutations over 50 starts, got ${observedOrders.size}`);
});
