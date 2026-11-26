import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import COUNTRIES_DB from '../data/countries.json' with { type: 'json' };
import { WORLD_COUNTRIES } from '../data/world-50m.js';
import { distanceToCountryWithNearest, haversineDistanceKm } from '../src/frame_union.js';
import { parseBestScore, calculatePartialCredit } from '../src/scoring.js';
import { pickCountries, pickClueSet, _reload, resetHistory } from '../src/questionBag.js';
import { UIManager, escapeHtml } from '../src/ui.js';
import { GameManager } from '../src/game.js';
import { sound } from '../src/audio.js';
import * as THREE from 'three';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('================================================================================');
console.log('                 REGRESSION TEST SUITE (CLEANUP & BUG FIXES)                    ');
console.log('================================================================================\n');

// Minimal DOM helpers for Node-based UIManager / GameManager checks
function makeElement(id = '') {
  const classes = new Set();
  return {
    id,
    tagName: 'DIV',
    style: {},
    textContent: '',
    _innerHTML: '',
    get innerHTML() { return this._innerHTML; },
    set innerHTML(val) { this._innerHTML = String(val); },
    children: [],
    appendChild(child) { this.children.push(child); },
    setAttribute() {},
    focus() {},
    clickCalled: 0,
    click() { this.clickCalled++; if (this.onclick) this.onclick(); },
    classList: {
      add: (...c) => c.forEach(x => classes.add(x)),
      remove: (...c) => c.forEach(x => classes.delete(x)),
      contains: (c) => classes.has(c)
    }
  };
}

function withDomEnv(fn) {
  const prevWindow = globalThis.window;
  const prevDocument = globalThis.document;
  const prevRaf = globalThis.requestAnimationFrame;
  const prevCancelRaf = globalThis.cancelAnimationFrame;
  const prevStorage = globalThis.localStorage;

  const elements = new Map();
  const getEl = (id) => {
    if (!elements.has(id)) elements.set(id, makeElement(id));
    return elements.get(id);
  };
  const listeners = {};
  const storageMap = new Map();

  globalThis.localStorage = {
    getItem: (k) => (storageMap.has(k) ? storageMap.get(k) : null),
    setItem: (k, v) => storageMap.set(k, String(v)),
    removeItem: (k) => storageMap.delete(k),
    clear: () => storageMap.clear()
  };

  globalThis.document = {
    getElementById: (id) => getEl(id),
    createElement: (tag) => ({
      ...makeElement(),
      tagName: tag.toUpperCase()
    })
  };

  globalThis.window = {
    innerWidth: 1440,
    innerHeight: 900,
    location: { search: '' },
    addEventListener: (ev, handler) => {
      (listeners[ev] ??= []).push(handler);
    },
    dispatchEvent: (ev) => {
      for (const h of listeners[ev.type] || []) h(ev);
    }
  };

  const rafQueue = [];
  globalThis.requestAnimationFrame = (cb) => {
    rafQueue.push(cb);
    return rafQueue.length;
  };
  globalThis.cancelAnimationFrame = () => {};

  const flushRaf = () => {
    while (rafQueue.length > 0) {
      const cb = rafQueue.shift();
      cb(performance.now());
    }
  };

  return Promise.resolve()
    .then(() => fn({ getEl, storageMap, listeners, flushRaf }))
    .finally(() => {
      globalThis.window = prevWindow;
      globalThis.document = prevDocument;
      globalThis.requestAnimationFrame = prevRaf;
      globalThis.cancelAnimationFrame = prevCancelRaf;
      globalThis.localStorage = prevStorage;
    });
}

// 1. Tuvalu (TUV, id 798) missing polygon distance fallback
console.log('1. Testing Tuvalu missing-geometry distance fallback...');
const tuvalu = COUNTRIES_DB.find(c => c.code === 'TUV' || String(c.id).padStart(3, '0') === '798');
const fiji = COUNTRIES_DB.find(c => c.code === 'FJI');
assert.ok(tuvalu, 'Tuvalu must exist in countries.json');
assert.ok(fiji, 'Fiji must exist in countries.json');
const tuvaluWc = WORLD_COUNTRIES.find(c => String(c.id).padStart(3, '0') === '798');
assert.ok(!tuvaluWc?.geometry?.coordinates, 'Tuvalu has no polygon geometry in world-50m.js');

const expectedKm = Math.round(haversineDistanceKm(fiji.lat, fiji.lon, tuvalu.lat, tuvalu.lon));
const tuvDist = distanceToCountryWithNearest(fiji.lat, fiji.lon, tuvaluWc?.geometry, { lat: tuvalu.lat, lon: tuvalu.lon });
assert.strictEqual(tuvDist.km, expectedKm, `Expected Haversine fallback ${expectedKm} km, got ${tuvDist.km}`);
assert.ok(tuvDist.km > 500, 'Tuvalu distance from Fiji must not collapse to 0 km');
assert.strictEqual(tuvDist.hasGeometry, false, 'hasGeometry must be false when polygon is absent');
assert.deepStrictEqual(tuvDist.nearestLatLon, { lat: tuvalu.lat, lon: tuvalu.lon });
console.log(`   [PASS] Tuvalu missing-geometry Haversine fallback returned ${tuvDist.km} km (hasGeometry=false).`);

// 2. Corrupted localStorage best-score & questionBag resilience
console.log('2. Testing corrupted localStorage best-score & questionBag sanitization...');
assert.strictEqual(parseBestScore('not-a-number'), 0);
assert.strictEqual(parseBestScore('NaN'), 0);
assert.strictEqual(parseBestScore('-42'), 0);
assert.strictEqual(parseBestScore(null), 0);
assert.strictEqual(parseBestScore('1250'), 1250);

await withDomEnv(async ({ storageMap }) => {
  const pool = ['IND', 'FRA', 'JPN', 'BRA', 'CAN'];
  const lib = [
    { id: 'IND-1-001', iso: 'IND', level: 1, topic: 't1', text: 'Clue 1' },
    { id: 'IND-2-001', iso: 'IND', level: 2, topic: 't2', text: 'Clue 2' },
    { id: 'IND-3-001', iso: 'IND', level: 3, topic: 't3', text: 'Clue 3' }
  ];

  const badPayloads = ['null', '123', '["IND"]', '{bad json', JSON.stringify({ 'c:easy': 42, 'q:IND:1': 'not-an-array' })];
  for (const payload of badPayloads) {
    storageMap.set('geotrivia_seen_v1', payload);
    _reload();
    const picked = pickCountries('easy', pool, 3);
    assert.strictEqual(picked.length, 3, `pickCountries failed on payload ${payload}`);
    const clues = pickClueSet('IND', lib);
    assert.strictEqual(clues.length, 3, `pickClueSet failed on payload ${payload}`);
  }
  resetHistory();
  _reload();
});
console.log('   [PASS] Corrupted best scores & questionBag payloads handled without NaN or TypeError.');

// 3. escapeHtml & missing capital handling in UIManager
console.log('3. Testing escapeHtml & missing capital safety in UIManager...');
assert.strictEqual(
  escapeHtml(`<img src=x onerror="alert('xss')">&`),
  '&lt;img src=x onerror=&quot;alert(&#39;xss&#39;)&quot;&gt;&amp;'
);

await withDomEnv(async ({ getEl }) => {
  const ui = new UIManager();
  const xssTarget = {
    id: '999',
    name: '<script>alert(1)</script>',
    flag: '🇮🇳',
    capital: undefined,
    clues: ['<b>clue</b>'],
    memoryAnchors: ['<svg onload=alert(1)>'],
    landmark: 'Test',
    cultureFood: 'Test',
    region: 'Test'
  };
  const xssGuess = { name: '<img src=x onerror=alert(2)>', lat: 10, lon: 20 };

  ui.showQuestion({ mode: 'name', country: xssTarget, clueIndex: 0, clueText: '', availableCluesCount: 3 });
  assert.ok(!getEl('clueText').innerHTML.includes('<script>'), 'Name spotlight must escape HTML');
  assert.ok(getEl('clueText').innerHTML.includes('&lt;script&gt;'), 'Escaped name must appear in spotlight');

  ui.showMemoryVault({
    isCorrect: false,
    isTimeout: false,
    targetCountry: xssTarget,
    guessCountry: xssGuess,
    distanceKm: 0,
    isAdjacent: false,
    hasBorderPolygon: false,
    hitCoords: { lat: 10, lon: 20 },
    targetCoords: { lat: 30, lon: 40 },
    breakdown: { points: 0 },
    isPractice: false,
    onNext: () => {}
  });
  const distHtml = getEl('vaultDistance').innerHTML;
  assert.ok(!distHtml.includes('<img') && !distHtml.includes('<script>'), 'Memory Vault distance box must escape HTML');
  assert.ok(!distHtml.includes('Shared Sovereign Border'), 'Must NOT display Shared Sovereign Border when hasBorderPolygon=false');
  assert.strictEqual(getEl('vaultCapital').textContent, 'Capital: —', 'Missing capital must fall back to —');

  ui.showEndScreen({
    score: 100,
    accuracy: 0,
    bestStreak: 0,
    missedCountries: [xssTarget],
    isPractice: false,
    mode: 'clue',
    tier: 'easy',
    correct: 0,
    wrong: 1,
    answered: 1
  });
  const missedHtml = getEl('missedList').children[0].innerHTML;
  assert.ok(!missedHtml.includes('<script>') && !missedHtml.includes('<svg'), 'End screen missed list must escape HTML');
  assert.ok(missedHtml.includes('Capital: —') && !missedHtml.includes('undefined'), 'End screen missed capital must not render undefined');
});
console.log('   [PASS] XSS escaping, missing capital fallback, and no-border distance label verified.');

// 4. Mid-flight cancellation race & corrupted best score overwrite in GameManager
console.log('4. Testing mid-flight cancellation race & open finishConfirmModal keyboard guard...');
await withDomEnv(async ({ getEl, storageMap, listeners, flushRaf }) => {
  let resolveFlight;
  let showVaultCalls = 0;
  const mockCamera = new THREE.PerspectiveCamera(45, 1440 / 900, 0.1, 1000);
  mockCamera.position.set(0, 0, 4);
  mockCamera.lookAt(0, 0, 0);
  mockCamera.updateMatrixWorld(true);
  const mockGlobe = {
    width: 1000,
    height: 800,
    camera: mockCamera,
    renderer: { domElement: { style: {}, addEventListener() {} } },
    controls: { enabled: true },
    mapRenderer: { renderHighlights() {}, resetHighlights() {} },
    flight: {
      isFlying: false,
      clearVisuals() {},
      drawCountryOutline() {},
      drawClickDot() {},
      drawGreatCircleArc() {},
      computeTargetDistance() { return 3.0; },
      computeTargetFreeAreaPercent() { return 10; },
      resetToOverview() {},
      zoomOutToOverview() {},
      cancelAnswerFlight() {
        if (resolveFlight) resolveFlight('cancelled');
      },
      animateAfterAnswer() {
        return new Promise((res) => { resolveFlight = res; });
      }
    }
  };
  const ui = new UIManager();
  const origShowVault = ui.showMemoryVault.bind(ui);
  ui.showMemoryVault = (opts) => {
    showVaultCalls++;
    return origShowVault(opts);
  };

  // Seed corrupted best score to verify GameManager overwrites it instead of failing (score > NaN)
  storageMap.set('geotrivia_best_clue_easy', 'corrupted_nan');

  const game = new GameManager(mockGlobe, ui);
  game.startExpedition({ mode: 'clue', tier: 'easy', rounds: 10 });
  game.currentCountry = tuvalu;
  game.correctCount = 1;
  game.score = 800;

  // Start guess flight (do not await yet)
  const guessPromise = game.handleGuess(fiji, fiji.lat, fiji.lon, false);
  // Cancel via endGame() mid-flight
  game.endGame();
  await guessPromise;
  flushRaf();

  assert.strictEqual(showVaultCalls, 0, 'Memory Vault must NOT open after endGame() cancelled flight');
  assert.strictEqual(game.phase, 'end');
  assert.strictEqual(game.lastIsAdjacent, false, 'Tuvalu without geometry must not be marked adjacent');
  assert.strictEqual(game.lastRoundBreakdown.points, calculatePartialCredit(expectedKm), 'Tuvalu miss must award Haversine partial credit, not 300');
  assert.strictEqual(storageMap.get('geotrivia_best_clue_easy'), String(800 + calculatePartialCredit(expectedKm)), 'Corrupted best score must be overwritten with new score');
  assert.ok(!getEl('endBestScore').textContent.includes('NaN'), 'endBestScore must never display NaN');

  // Also test returnToMainMenu() mid-flight cancellation even if flight resolves 'done' after menu return
  game.startExpedition({ mode: 'clue', tier: 'easy', rounds: 10 });
  let resolveDone;
  mockGlobe.flight.animateAfterAnswer = () => new Promise((res) => { resolveDone = res; });
  mockGlobe.flight.cancelAnswerFlight = () => {};
  const p2 = game.handleGuess(fiji, fiji.lat, fiji.lon, false);
  game.returnToMainMenu();
  resolveDone('done');
  await p2;
  flushRaf();
  assert.strictEqual(showVaultCalls, 0, 'Memory Vault must NOT open after returnToMainMenu()');

  // Keyboard guard while finishConfirmModal is open
  game.startExpedition({ mode: 'clue', tier: 'easy', rounds: Infinity });
  const initialClueIndex = game.clueIndex;
  const finishModal = getEl('finishConfirmModal');
  finishModal.classList.remove('hidden');
  const nextClueBtn = getEl('nextClueBtn');
  nextClueBtn.style.display = 'inline-flex';
  const confirmBtn = getEl('touchConfirmBtn');
  confirmBtn.classList.remove('hidden');
  game.selectedHit = { country: fiji };

  for (const h of listeners.keydown || []) {
    h({ key: ' ', target: { tagName: 'BODY' }, preventDefault() {} });
    h({ key: 'Enter', target: { tagName: 'BODY' }, preventDefault() {} });
  }
  assert.strictEqual(game.clueIndex, initialClueIndex, 'Space must NOT reveal clue while finishConfirmModal is open');
  assert.strictEqual(confirmBtn.clickCalled, 0, 'Enter must NOT submit selection while finishConfirmModal is open');

  for (const h of listeners.keydown || []) {
    h({ key: 'Escape', target: { tagName: 'BODY' }, preventDefault() {} });
  }
  assert.ok(finishModal.classList.contains('hidden'), 'Escape must close finishConfirmModal');
  assert.strictEqual(game.phase, 'question', 'Escape on finishConfirmModal must keep game active');
});
console.log('   [PASS] Mid-flight cancellation & finishConfirmModal keyboard guard verified.');

// 5. CSS token integrity check
console.log('5. Testing CSS custom property definitions (--duration-slow & --font-ui)...');
const tokensCss = fs.readFileSync(path.join(rootDir, 'src/styles/tokens.css'), 'utf8');
const componentsCss = fs.readFileSync(path.join(rootDir, 'src/styles/components.css'), 'utf8');
const modalsCss = fs.readFileSync(path.join(rootDir, 'src/styles/modals.css'), 'utf8');

assert.ok(/--duration-slow:\s*\d+ms;/.test(tokensCss), '--duration-slow must be defined in tokens.css');
assert.ok(/--font-ui:/.test(tokensCss), '--font-ui must be defined in tokens.css');
assert.ok(!componentsCss.includes('--font-body'), 'Undefined --font-body must not be referenced in components.css');
assert.ok(!componentsCss.includes('--radius-sm'), 'Undefined --radius-sm must not be referenced in components.css');
assert.ok(modalsCss.includes('var(--duration-slow)'), 'modals.css uses --duration-slow');
console.log('   [PASS] CSS custom properties verified.');

// 6. AudioContext failure / unavailable resilience
console.log('6. Testing AudioContext unavailable & setTimeout safety...');
await withDomEnv(async () => {
  globalThis.window.AudioContext = function() {
    throw new Error('AudioContext blocked');
  };
  sound.ctx = null;
  sound.muted = false;
  assert.doesNotThrow(() => {
    sound.playClick();
    sound.playSwoosh();
    sound.playCorrect();
    sound.playWrong();
  }, 'SoundManager must not throw when AudioContext constructor fails');

  // Simulate ctx disappearing before playCorrect setTimeout fires
  sound.ctx = {
    state: 'running',
    createOscillator: () => { throw new Error('closed'); },
    createGain: () => ({ gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }),
    currentTime: 0,
    destination: {}
  };
  sound.playCorrect();
  sound.ctx = null;
  await new Promise(r => setTimeout(r, 260));
});
console.log('   [PASS] SoundManager AudioContext guards verified.');

console.log('\n================================================================================');
console.log('✓ ALL REGRESSION TESTS PASSED');
console.log('================================================================================');
