import test from 'node:test';
import assert from 'node:assert/strict';
import { GameManager } from '../../src/engine/game.js';
import { checkAnswer } from '../../src/engine/scoring.js';
import { loadProgress, resetProgress } from '../../src/engine/storage.js';
import { renderApp } from '../../src/ui/screens.js';
import { renderMascot } from '../../src/ui/mascot.js';
import { escapeHtml } from '../../src/ui/escape.js';
import { readPuzzleAloud } from '../../src/ui/speech.js';

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
test('regression (c): UI input methods (submitPick, toggleTapAll, submitTapAll, tapOrderItem) reject input during isShaking', () => {
  resetProgress();
  const game = new GameManager();

  // 1. Pick puzzle
  const pickPuzzle = game.puzzles.find(p => p.type === 'pick');
  game.startPuzzle(pickPuzzle.id);
  const wrongPick = pickPuzzle.items.find(i => i.id !== pickPuzzle.answer).id;

  game.submitPick(wrongPick);
  assert.equal(game.isShaking, true);
  assert.equal(game.tries, 1);

  // Blocked while shaking
  game.submitPick(wrongPick);
  game.submitPick(pickPuzzle.answer);
  assert.equal(game.tries, 1, 'submitPick must be rejected when isShaking is true');
  assert.equal(game.screen, 'puzzle', 'Screen must remain on puzzle during isShaking');

  game.clearTimers();
  game.isShaking = false;
  game.submitPick(pickPuzzle.answer);
  assert.equal(game.screen, 'fact', 'submitPick should succeed once isShaking is false');

  // 2. TapAll puzzle
  const tapAllPuzzle = game.puzzles.find(p => p.type === 'tapall');
  game.startPuzzle(tapAllPuzzle.id);
  game.isShaking = true;
  game.toggleTapAll(tapAllPuzzle.items[0].id);
  assert.equal(game.tapAllSelection.size, 0, 'toggleTapAll must be rejected when isShaking is true');
  game.submitTapAll();
  assert.equal(game.tries, 0, 'submitTapAll must be rejected when isShaking is true');

  // 3. Order puzzle
  const orderPuzzle = game.puzzles.find(p => p.type === 'order');
  game.startPuzzle(orderPuzzle.id);
  game.isShaking = true;
  game.tapOrderItem(orderPuzzle.items[0].id);
  assert.equal(game.orderSelection.length, 0, 'tapOrderItem must be rejected when isShaking is true');
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
  assert.equal(game.screen, 'map', 'screen must be reset to map');
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

// --- (g) Storage keys: tricky-meadow: prefix & foreign key protection ---
test('regression (g): storage requires tricky-meadow: prefix and leaves foreign keys untouched', () => {
  const originalLocalStorage = globalThis.localStorage;
  const store = new Map();
  store.set('geotrivia_seen_v1', JSON.stringify({ seen: ['france', 'japan'] }));
  store.set('earth_trivia_score', '999');
  store.set('tricky-meadow:save_v1', 'corrupted_json{{{');

  globalThis.localStorage = {
    get length() {
      return store.size;
    },
    key(i) {
      return Array.from(store.keys())[i];
    },
    getItem(k) {
      return store.has(k) ? store.get(k) : null;
    },
    setItem(k, v) {
      store.set(k, String(v));
    },
    removeItem(k) {
      store.delete(k);
    },
    clear() {
      store.clear();
    }
  };

  try {
    // 1. Loading corrupted data must not touch foreign keys
    resetProgress();
    const progress = loadProgress();
    assert.deepEqual(progress.stars, {}, 'corrupted tricky-meadow data defaults to empty stars');
    assert.equal(store.get('geotrivia_seen_v1'), JSON.stringify({ seen: ['france', 'japan'] }));
    assert.equal(store.get('earth_trivia_score'), '999');

    // 2. Saving progress uses tricky-meadow: prefix only
    const game = new GameManager();
    game.recordStars('garden-01', 3);
    assert.ok(store.has('tricky-meadow:save_v1'), 'progress must be saved under tricky-meadow:save_v1');
    assert.equal(store.get('geotrivia_seen_v1'), JSON.stringify({ seen: ['france', 'japan'] }));

    // 3. Resetting progress removes ONLY tricky-meadow: keys without touching foreign keys
    game.resetAllProgress();
    assert.equal(store.has('tricky-meadow:save_v1'), false, 'tricky-meadow: key must be removed');
    assert.equal(store.get('geotrivia_seen_v1'), JSON.stringify({ seen: ['france', 'japan'] }),
      'geotrivia_seen_v1 must remain intact after resetAllProgress');
    assert.equal(store.get('earth_trivia_score'), '999',
      'earth_trivia_score must remain intact after resetAllProgress');
  } finally {
    if (originalLocalStorage) {
      globalThis.localStorage = originalLocalStorage;
    } else {
      delete globalThis.localStorage;
    }
  }
});

// --- (h) Settings edge: open from puzzle, fact, level_done, map; hold-reset; lands on Map ---
test('regression (h): settings reset from puzzle, fact, level_done and map always lands on Map screen', () => {
  const originScreens = ['puzzle', 'fact', 'level_done', 'map'];

  for (const origin of originScreens) {
    const game = new GameManager();
    game.startLevel(1);

    if (origin === 'puzzle') {
      game.screen = 'puzzle';
    } else if (origin === 'fact') {
      game.screen = 'fact';
    } else if (origin === 'level_done') {
      game.screen = 'level_done';
    } else if (origin === 'map') {
      game.goToMap();
    }

    // Open settings
    game.openSettings();
    assert.equal(game.screen, 'settings', `Must open settings from ${origin}`);

    // Perform hold-to-reset
    game.resetAllProgress();

    // Verify app landed on Map
    assert.equal(game.screen, 'map', `After reset from ${origin}, app must land on Map`);
    assert.equal(game.puzzleId, null, `puzzleId must be null after reset from ${origin}`);
  }
});


// --- (i) orderResetTimer & shakeTimer cancellation on navigation/restart/solve/reset ---
test('regression (i): shakeTimer and orderResetTimer are cleared on startPuzzle, goToMap, handleCorrectAnswer, resetAllProgress', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  resetProgress();
  const game = new GameManager();
  const orderPuzzles = game.puzzles.filter(p => p.type === 'order');
  assert.ok(orderPuzzles.length >= 2);
  const firstOrder = orderPuzzles[0];
  const secondOrder = orderPuzzles[1];

  const triggerWrongOrder = () => {
    const wrongSeq = [...firstOrder.items].reverse().map(i => i.id);
    if (wrongSeq.every((id, idx) => id === firstOrder.answer[idx])) {
      [wrongSeq[0], wrongSeq[1]] = [wrongSeq[1], wrongSeq[0]];
    }
    for (const id of wrongSeq) game.tapOrderItem(id);
    assert.equal(game.tries, 1);
    assert.ok(game.shakeTimer !== null, 'shakeTimer must be tracked');
    assert.ok(game.orderResetTimer !== null, 'orderResetTimer must be tracked');
  };

  // 1. startPuzzle cancels pending timers so new puzzle selection is not wiped
  game.startPuzzle(firstOrder.id);
  triggerWrongOrder();
  game.startPuzzle(secondOrder.id);
  assert.equal(game.shakeTimer, null);
  assert.equal(game.orderResetTimer, null);
  game.tapOrderItem(secondOrder.items[0].id);
  t.mock.timers.tick(650);
  assert.deepEqual(game.orderSelection, [secondOrder.items[0].id],
    'Old orderResetTimer must not wipe new puzzle orderSelection');

  // 2. goToMap cancels pending timers
  game.startPuzzle(firstOrder.id);
  triggerWrongOrder();
  game.goToMap();
  assert.equal(game.shakeTimer, null);
  assert.equal(game.orderResetTimer, null);
  assert.equal(game.isShaking, false);
  let notifications = 0;
  const unsub = game.subscribe(() => { notifications++; });
  t.mock.timers.tick(650);
  assert.equal(notifications, 0, 'Cleared timers must not fire after goToMap');
  unsub();

  // 3. handleCorrectAnswer cancels pending timers
  game.startPuzzle(firstOrder.id);
  triggerWrongOrder();
  game.handleCorrectAnswer();
  assert.equal(game.shakeTimer, null);
  assert.equal(game.orderResetTimer, null);
  assert.equal(game.screen, 'fact');
  t.mock.timers.tick(650);
  assert.equal(game.screen, 'fact');

  // 4. resetAllProgress cancels pending timers
  game.startPuzzle(firstOrder.id);
  triggerWrongOrder();
  game.resetAllProgress();
  assert.equal(game.shakeTimer, null);
  assert.equal(game.orderResetTimer, null);
  assert.equal(game.screen, 'map');
  t.mock.timers.tick(650);
  assert.equal(game.screen, 'map');
});

// --- (j) Sanitize non-integer / out-of-range star values in storage & aggregation ---
test('regression (j): loadProgress and star aggregation reject non-integer and out-of-range star values', () => {
  const originalLocalStorage = globalThis.localStorage;
  globalThis.localStorage = {
    getItem() {
      return JSON.stringify({
        stars: {
          'garden-01': 'bad',
          'garden-02': 0,
          'garden-03': 4,
          'garden-04': 2.5,
          'garden-05': -1,
          'garden-06': true,
          'garden-07': 3,
          'sky-01': 2
        }
      });
    },
    setItem() {},
    removeItem() {}
  };

  try {
    const loaded = loadProgress();
    assert.deepEqual(loaded.stars, { 'garden-07': 3, 'sky-01': 2 });

    const game = new GameManager();
    assert.equal(game.getTotalStarsForLevel(1), 3);
    assert.equal(game.getTotalStarsForLevel(2), 2);

    // Corrupted key 'garden-01' was sanitized out so recording valid stars succeeds
    game.recordStars('garden-01', 2);
    assert.equal(game.getStarsForPuzzle('garden-01'), 2);

    // Invalid star values cannot be recorded
    game.recordStars('garden-02', 0);
    game.recordStars('garden-02', 4);
    game.recordStars('garden-02', 1.5);
    game.recordStars('garden-02', 'bad');
    assert.equal(game.getStarsForPuzzle('garden-02'), 0);

    // Even if progress.stars is polluted in memory, map rendering sums only 1..3 integers
    game.progress.stars['garden-03'] = 'corrupt';
    game.progress.stars['garden-04'] = 99;
    game.screen = 'map';
    const mapHtml = renderApp(game);
    assert.ok(mapHtml.includes('7 Stars'), `Expected '7 Stars' in map HTML, got: ${mapHtml}`);
    assert.ok(mapHtml.includes('5/72'), `Expected '5/72' for Level 1 in map HTML, got: ${mapHtml}`);
  } finally {
    if (originalLocalStorage) {
      globalThis.localStorage = originalLocalStorage;
    } else {
      delete globalThis.localStorage;
    }
  }
});

// --- (k) escapeHtml in screens.js and mascot.js without breaking SVG markup ---
test('regression (k): dynamic HTML interpolation is escaped in screens and mascot without breaking SVGs', () => {
  assert.equal(escapeHtml('<script>"a" & \'b\'</script>'), '&lt;script&gt;&quot;a&quot; &amp; &#39;b&#39;&lt;/script&gt;');

  const mascotHtml = renderMascot('neutral', '<img src=x onerror="alert(1)"> & friends', 64);
  assert.ok(mascotHtml.includes('<svg class="moss-sprite moss-neutral"'), 'Mascot SVG markup must remain intact');
  assert.ok(mascotHtml.includes('&lt;img src=x onerror=&quot;alert(1)&quot;&gt; &amp; friends'));
  assert.equal(mascotHtml.includes('<img '), false);

  const customPuzzles = [
    {
      id: 'xss-1',
      level: 1,
      type: 'pick',
      prompt: 'Which <script>alert(1)</script> is safe?',
      hint: 'Check <b>hint</b> & "more"',
      items: [
        { id: 'a"b', label: '<svg onload=1>', emoji: '🌱' },
        { id: 'b', label: 'Safe & Sound', emoji: '🐝' },
        { id: 'c', label: 'Rock', emoji: '🪨' }
      ],
      answer: 'b',
      fact: {
        text: 'Facts <escape> HTML & "quotes".',
        evidence: ['<tag>', 'safe & clean']
      }
    }
  ];

  const game = new GameManager({ puzzles: customPuzzles, disableShuffle: true });
  game.startPuzzle('xss-1');
  game.useHint();
  const puzzleHtml = renderApp(game);
  assert.ok(puzzleHtml.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
  assert.ok(puzzleHtml.includes('Hint: Check &lt;b&gt;hint&lt;/b&gt; &amp; &quot;more&quot;'));
  assert.ok(puzzleHtml.includes('data-item-id="a&quot;b"'));
  assert.ok(puzzleHtml.includes('&lt;svg onload=1&gt;'));
  assert.ok(puzzleHtml.includes('<use href="#emoji-'));
  assert.equal(puzzleHtml.includes('<script>'), false);

  game.submitPick('b');
  const factHtml = renderApp(game);
  assert.ok(factHtml.includes('Facts &lt;escape&gt; HTML &amp; &quot;quotes&quot;.'));
  assert.ok(factHtml.includes('<span class="pill">&lt;tag&gt;</span>'));
  assert.ok(factHtml.includes('<span class="pill">safe &amp; clean</span>'));
});

// --- (l) SpeechSynthesisUtterance & speechSynthesis.speak guards ---
test('regression (l): readPuzzleAloud guards missing SpeechSynthesisUtterance and throwing speak()', () => {
  const samplePuzzle = { prompt: 'Test prompt', items: [{ label: 'One' }, { label: 'Two' }] };

  // 1. Missing window or SpeechSynthesisUtterance
  assert.equal(readPuzzleAloud(samplePuzzle, undefined), false);
  assert.equal(readPuzzleAloud(samplePuzzle, { speechSynthesis: { speak() {} } }), false);
  assert.equal(readPuzzleAloud(samplePuzzle, { SpeechSynthesisUtterance: function () {} }), false);

  // 2. Constructor throws
  assert.equal(
    readPuzzleAloud(samplePuzzle, {
      SpeechSynthesisUtterance: function () {
        throw new Error('Unsupported');
      },
      speechSynthesis: { speak() {}, cancel() {} }
    }),
    false
  );

  // 3. speak() throws
  assert.equal(
    readPuzzleAloud(samplePuzzle, {
      SpeechSynthesisUtterance: function (t) {
        this.text = t;
      },
      speechSynthesis: {
        cancel() {},
        speak() {
          throw new Error('Blocked');
        }
      }
    }),
    false
  );

  // 4. Valid invocation
  let spoken = null;
  let cancelled = false;
  const ok = readPuzzleAloud(samplePuzzle, {
    SpeechSynthesisUtterance: function (t) {
      this.text = t;
    },
    speechSynthesis: {
      cancel() {
        cancelled = true;
      },
      speak(u) {
        spoken = u;
      }
    }
  });
  assert.equal(ok, true);
  assert.equal(cancelled, true);
  assert.equal(spoken.text, 'Test prompt. One, Two');
  assert.equal(spoken.rate, 0.9);
});

// --- (m) No duplicate DOM IDs across screens & custom puzzle counts ---
test('regression (m): all screens have unique DOM IDs, settings has no external links, and counts reflect game.puzzles', () => {
  resetProgress();
  const customPuzzles = [
    {
      id: 'c1',
      level: 1,
      type: 'pick',
      prompt: 'Pick one?',
      hint: 'Hint',
      items: [
        { id: 'a', label: 'Ant', emoji: '🐜' },
        { id: 'b', label: 'Bee', emoji: '🐝' },
        { id: 'c', label: 'Spider', emoji: '🕷️' }
      ],
      answer: 'c',
      fact: { text: 'Spiders have eight legs.', evidence: ['eight'] }
    },
    {
      id: 'c2',
      level: 1,
      type: 'pick',
      prompt: 'Pick two?',
      hint: 'Hint',
      items: [
        { id: 'a', label: 'Ant', emoji: '🐜' },
        { id: 'b', label: 'Bee', emoji: '🐝' },
        { id: 'c', label: 'Spider', emoji: '🕷️' }
      ],
      answer: 'b',
      fact: { text: 'Bees make honey.', evidence: ['honey'] }
    }
  ];

  const game = new GameManager({ puzzles: customPuzzles });
  const screens = ['home', 'map', 'puzzle', 'fact', 'level_done', 'settings'];
  game.startPuzzle('c1');

  for (const s of screens) {
    game.screen = s;
    const html = renderApp(game);
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
    const unique = new Set(ids);
    assert.equal(ids.length, unique.size, `Duplicate DOM ID found on '${s}' screen: ${ids.join(', ')}`);
  }

  game.screen = 'map';
  const mapHtml = renderApp(game);
  assert.ok(mapHtml.includes('0/6'), `Map should show 0/6 max stars for 2-puzzle level, got: ${mapHtml}`);

  game.screen = 'level_done';
  const doneHtml = renderApp(game);
  assert.ok(doneHtml.includes('0 / 6 Stars'), `Level done should show 0 / 6 Stars for 2-puzzle level, got: ${doneHtml}`);

  game.screen = 'settings';
  const settingsHtml = renderApp(game);
  assert.equal(/<a\s+href=/i.test(settingsHtml), false, 'Settings & Credits must not contain external hyperlinks');
  assert.ok(settingsHtml.includes('Twemoji') && settingsHtml.includes('CC-BY 4.0'));
});
