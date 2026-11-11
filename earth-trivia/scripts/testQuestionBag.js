import assert from 'assert';
import { pickCountries, pickClueSet, resetHistory, questionBag } from '../src/questionBag.js';

console.log('================================================================================');
console.log('                 QUESTION BAG & NO-REPEAT ENGINE UNIT TESTS                     ');
console.log('================================================================================\n');

// ═══════════════════════════════════════════════════════════════
// Test 1: 200 simulated plays of one country with 15 items never repeat before all 15 are seen
// ═══════════════════════════════════════════════════════════════
console.log('TEST 1: 200 simulated plays of one country with 15 items...');
resetHistory();

const mock15Library = [];
for (let i = 1; i <= 5; i++) {
  const pad = String(i).padStart(3, '0');
  mock15Library.push({ id: `TST-1-${pad}`, iso: 'TST', level: 1, text: `Vague clue ${i}` });
  mock15Library.push({ id: `TST-2-${pad}`, iso: 'TST', level: 2, text: `Specific clue ${i}` });
  mock15Library.push({ id: `TST-3-${pad}`, iso: 'TST', level: 3, text: `Iconic landmark clue ${i}` });
}
assert.strictEqual(mock15Library.length, 15, 'Mock library must contain 15 items');

const totalPlays = 200;
const cycleSize = 5; // 5 plays * 3 clues = 15 clues per cycle
const totalCycles = totalPlays / cycleSize;

for (let cycle = 0; cycle < totalCycles; cycle++) {
  const seenClueIdsInCycle = new Set();

  for (let play = 0; play < cycleSize; play++) {
    const clueSet = pickClueSet('TST', mock15Library);
    assert.strictEqual(clueSet.length, 3, `Play must return 3 clues, got ${clueSet.length}`);

    // Verify level order: 1, 2, 3
    assert.strictEqual(clueSet[0].level, 1, 'First clue must be level 1');
    assert.strictEqual(clueSet[1].level, 2, 'Second clue must be level 2');
    assert.strictEqual(clueSet[2].level, 3, 'Third clue must be level 3');

    // Verify none of these clues have been seen in this cycle
    for (const clue of clueSet) {
      assert.ok(
        !seenClueIdsInCycle.has(clue.id),
        `Cycle ${cycle}: Clue ${clue.id} repeated before all 15 items were seen!`
      );
      seenClueIdsInCycle.add(clue.id);
    }
  }

  // After 5 plays, all 15 items must have been seen
  assert.strictEqual(
    seenClueIdsInCycle.size,
    15,
    `Cycle ${cycle}: Expected all 15 distinct clue items to be seen, got ${seenClueIdsInCycle.size}`
  );
}
console.log('✓ PASS: 200 plays across 40 cycles verified. Zero repeats before all 15 items seen.');

// ═══════════════════════════════════════════════════════════════
// Test 1b: Learning loop re-queued country gets a DIFFERENT clue set
// ═══════════════════════════════════════════════════════════════
console.log('\nTEST 1b: Learning loop re-queued country receives a different clue set...');
resetHistory();
const firstSet = pickClueSet('TST', mock15Library);
const firstIds = firstSet.map(c => c.id);
const reQueuedSet = pickClueSet('TST', mock15Library, { excludeClueIds: firstIds });
const reQueuedIds = reQueuedSet.map(c => c.id);

assert.strictEqual(reQueuedSet.length, 3, 'Re-queued country must receive 3 clues');
for (const id of reQueuedIds) {
  assert.ok(!firstIds.includes(id), `Re-queued country got same clue ${id} as previous round`);
}
console.log('✓ PASS: Re-queued country received a distinct clue set.');

// ═══════════════════════════════════════════════════════════════
// Test 2: Every country of a 42-country tier appears once before any repeats
// ═══════════════════════════════════════════════════════════════
console.log('\nTEST 2: Every country of a 42-country tier appears once before any repeats...');
resetHistory();

const tier42 = Array.from({ length: 42 }, (_, i) => `ISO_${String(i + 1).padStart(2, '0')}`);

// Test drawing 1 by 1 for 42 times
const singleDraws = [];
for (let i = 0; i < 42; i++) {
  const drawn = pickCountries('test_tier', tier42, 1);
  assert.strictEqual(drawn.length, 1);
  assert.ok(
    !singleDraws.includes(drawn[0]),
    `Country ${drawn[0]} repeated before all 42 countries were drawn! (Draw ${i + 1})`
  );
  singleDraws.push(drawn[0]);
}
assert.strictEqual(new Set(singleDraws).size, 42, 'All 42 countries must appear exactly once');

// Next draw starts next cycle
const draw43 = pickCountries('test_tier', tier42, 1);
assert.strictEqual(draw43.length, 1);
assert.ok(tier42.includes(draw43[0]), '43rd draw must be a valid country from pool');

// Test batch draws (e.g. 10, 10, 10, 10, 2)
resetHistory();
const batchPicks = [];
const batchSizes = [10, 10, 10, 10, 2];
for (const size of batchSizes) {
  const batch = pickCountries('batch_tier', tier42, size);
  assert.strictEqual(batch.length, size);
  for (const c of batch) {
    assert.ok(
      !batchPicks.includes(c),
      `Country ${c} repeated in batch before all 42 countries were drawn!`
    );
    batchPicks.push(c);
  }
}
assert.strictEqual(new Set(batchPicks).size, 42, 'All 42 countries must appear across batches');
console.log('✓ PASS: All 42 countries appeared once before any repeats in both single and batch draws.');

// ═══════════════════════════════════════════════════════════════
// Test 3: History survives reload (mock localStorage)
// ═══════════════════════════════════════════════════════════════
console.log('\nTEST 3: History survives reload via mock localStorage...');
const mockStorageMap = new Map();
const mockLocalStorage = {
  getItem: (key) => mockStorageMap.get(key) || null,
  setItem: (key, val) => mockStorageMap.set(key, String(val)),
  removeItem: (key) => mockStorageMap.delete(key),
  clear: () => mockStorageMap.clear(),
  get length() { return mockStorageMap.size; },
  key: (i) => Array.from(mockStorageMap.keys())[i] || null
};

// Install mock
const originalLocalStorage = globalThis.localStorage;
globalThis.localStorage = mockLocalStorage;

resetHistory();
// Pick 20 countries
const run1 = pickCountries('reload_tier', tier42, 20);
assert.strictEqual(run1.length, 20);

// Verify state was saved to mock storage
const rawStored = mockLocalStorage.getItem('geotrivia_seen_countries_reload_tier');
assert.ok(rawStored, 'State must be written to localStorage');
const parsedStored = JSON.parse(rawStored);
assert.strictEqual(parsedStored.length, 20);

// Simulate "reload": call pickCountries again, should pick from remaining 22 countries
const run2 = pickCountries('reload_tier', tier42, 22);
assert.strictEqual(run2.length, 22);
for (const c of run2) {
  assert.ok(!run1.includes(c), `Country ${c} was picked in run1 and repeated before all 42 drawn!`);
}
console.log('✓ PASS: History persisted across simulated reload in localStorage.');

// ═══════════════════════════════════════════════════════════════
// Test 4: Blocked localStorage does not crash
// ═══════════════════════════════════════════════════════════════
console.log('\nTEST 4: Blocked localStorage resilience (SecurityError fallback)...');

const blockedStorage = {
  getItem: () => { throw new Error('SecurityError: The operation is insecure.'); },
  setItem: () => { throw new Error('SecurityError: The operation is insecure.'); },
  removeItem: () => { throw new Error('SecurityError: The operation is insecure.'); },
  clear: () => { throw new Error('SecurityError: The operation is insecure.'); },
  get length() { throw new Error('SecurityError'); },
  key: () => { throw new Error('SecurityError'); }
};

globalThis.localStorage = blockedStorage;

// Must not throw
let blockedPicks = null;
let blockedClues = null;
assert.doesNotThrow(() => {
  blockedPicks = pickCountries('blocked_tier', tier42, 5);
}, 'pickCountries must not throw when localStorage is blocked');

assert.doesNotThrow(() => {
  blockedClues = pickClueSet('TST', mock15Library);
}, 'pickClueSet must not throw when localStorage is blocked');

assert.doesNotThrow(() => {
  resetHistory();
}, 'resetHistory must not throw when localStorage is blocked');

assert.strictEqual(blockedPicks.length, 5, 'pickCountries returned valid items during storage block');
assert.strictEqual(blockedClues.length, 3, 'pickClueSet returned valid clues during storage block');
console.log('✓ PASS: All methods operated gracefully without throwing when storage is blocked.');

// Restore environment
if (originalLocalStorage !== undefined) {
  globalThis.localStorage = originalLocalStorage;
} else {
  delete globalThis.localStorage;
}

console.log('\n================================================================================');
console.log('                      ALL QUESTION BAG TESTS PASSED                             ');
console.log('================================================================================');
