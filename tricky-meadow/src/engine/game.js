import confetti from 'canvas-confetti';
import puzzlesData from '../data/puzzles.json' with { type: 'json' };
import { calculateStars, isLevelUnlocked, checkAnswer } from './scoring.js';
import { loadProgress, saveProgress, resetProgress as storageReset } from './storage.js';

export function createRng(seed) {
  let s = (seed !== undefined && seed !== null
    ? seed
    : (typeof globalThis !== 'undefined' && globalThis.crypto?.getRandomValues
        ? globalThis.crypto.getRandomValues(new Uint32Array(1))[0]
        : (Math.random() * 0xFFFFFFFF >>> 0))) >>> 0;
  return function next() {
    s |= 0;
    s = s + 0x6D2B79F5 | 0;
    let t = Math.imul(s ^ s >>> 15, 1 | s);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export function shuffleArray(arr, rng) {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function shufflePuzzleItems(items, puzzleType, answer, seed = null) {
  if (!items || items.length <= 1) return items ? [...items] : [];
  const rng = createRng(seed);

  if (puzzleType === 'order') {
    const answerOrder = Array.isArray(answer) ? answer : [];
    let shuffled;
    let attempts = 0;
    do {
      shuffled = shuffleArray(items, rng);
      attempts++;
    } while (
      attempts < 100 &&
      shuffled.every((item, idx) => item.id === answerOrder[idx])
    );
    return shuffled;
  }

  return shuffleArray(items, rng);
}

export const LEVELS = [
  { id: 1, name: 'Garden & Animals', emoji: '🌱' },
  { id: 2, name: 'Sky & Space', emoji: '🪐' },
  { id: 3, name: 'Me & My Body', emoji: '🧠' }
].map(lvl => ({
  ...lvl,
  get totalPuzzles() {
    return puzzlesData.filter(p => p.level === lvl.id).length || 6;
  }
}));

export class GameManager {
  constructor(options = {}) {
    this.puzzles = options.puzzles || puzzlesData;
    this.progress = loadProgress();
    this.screen = 'home';
    this.level = 1;
    this.puzzleId = null;
    this.tries = 0;
    this.hintUsed = false;
    this.stars = 0;
    this.orderSelection = [];
    this.tapAllSelection = new Set();
    this.feedback = null;
    this.isShaking = false;
    this.displayedItems = [];
    this.disableShuffle = options.disableShuffle || false;
    this.listeners = new Set();

    this.bindDebugHook();
  }

  bindDebugHook() {
    if (typeof window !== 'undefined') {
      window.__meadow = {
        getState: () => this.getState(),
        setScreen: (s) => { this.screen = s; this.notify(); },
        startLevel: (lvl) => this.startLevel(lvl),
        startPuzzle: (id) => this.startPuzzle(id),
        isUnlocked: (lvl) => this.isUnlocked(lvl),
        getDisplayedItems: () => this.getCurrentDisplayedItems(),
        setDisableShuffle: (val) => { this.disableShuffle = val; },
        puzzles: this.puzzles,
        useHint: () => this.useHint(),
        solveCurrentPuzzle: () => this.solveCurrentPuzzle(),
        resetProgress: () => this.resetAllProgress()
      };
    }
  }

  getState() {
    return {
      screen: this.screen,
      level: this.level,
      puzzleId: this.puzzleId,
      tries: this.tries,
      hintUsed: this.hintUsed,
      stars: this.stars
    };
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notify() {
    for (const cb of this.listeners) {
      try { cb(this.getState()); } catch (e) { console.error(e); }
    }
  }

  getCurrentPuzzle() {
    return this.puzzles.find(p => p.id === this.puzzleId) || null;
  }

  getCurrentDisplayedItems() {
    if (this.displayedItems && this.displayedItems.length > 0) {
      return this.displayedItems;
    }
    const current = this.getCurrentPuzzle();
    return current ? current.items : [];
  }

  getLevelPuzzles(level = this.level) {
    return this.puzzles.filter(p => p.level === level);
  }

  isUnlocked(level) {
    return isLevelUnlocked(level, this.progress.stars, this.puzzles);
  }

  getStarsForPuzzle(id) {
    return this.progress.stars[id] || 0;
  }

  getTotalStarsForLevel(level) {
    const list = this.getLevelPuzzles(level);
    return list.reduce((sum, p) => sum + (this.progress.stars[p.id] || 0), 0);
  }

  goToHome() {
    this.screen = 'home';
    this.notify();
  }

  goToMap() {
    this.screen = 'map';
    this.feedback = null;
    this.notify();
  }

  openSettings() {
    this.screen = 'settings';
    this.notify();
  }

  startLevel(lvl) {
    if (!this.isUnlocked(lvl)) return;
    this.level = lvl;
    const levelPuzzles = this.getLevelPuzzles(lvl);
    if (levelPuzzles.length > 0) {
      // Find first unsolved or start with first
      const nextUnsolved = levelPuzzles.find(p => !this.progress.stars[p.id]);
      this.startPuzzle((nextUnsolved || levelPuzzles[0]).id);
    } else {
      this.goToMap();
    }
  }

  startPuzzle(pId) {
    const puzzle = this.puzzles.find(p => p.id === pId);
    if (!puzzle) return;
    this.level = puzzle.level;
    this.puzzleId = puzzle.id;
    this.tries = 0;
    this.hintUsed = false;
    this.stars = 0;
    this.orderSelection = [];
    this.tapAllSelection = new Set();
    this.feedback = null;
    this.isShaking = false;
    this.displayedItems = this.disableShuffle
      ? [...puzzle.items]
      : shufflePuzzleItems(puzzle.items, puzzle.type, puzzle.answer);
    this.screen = 'puzzle';
    this.notify();
  }

  useHint() {
    if (this.hintUsed) return;
    this.hintUsed = true;
    this.notify();
  }

  handleWrongAnswer() {
    this.tries++;
    this.isShaking = true;
    this.feedback = 'Try again!';
    this.notify();

    setTimeout(() => {
      this.isShaking = false;
      this.notify();
    }, 600);

    // After 2 wrong tries, show answer and fact card
    if (this.tries >= 2) {
      this.stars = 1;
      this.recordStars(this.puzzleId, this.stars);
      this.screen = 'fact';
      this.notify();
    }
  }

  handleCorrectAnswer() {
    this.stars = calculateStars({ tries: this.tries, hintUsed: this.hintUsed });
    this.recordStars(this.puzzleId, this.stars);
    this.feedback = null;
    this.screen = 'fact';
    this.notify();
  }

  solveCurrentPuzzle() {
    this.handleCorrectAnswer();
  }

  recordStars(pId, starsCount) {
    const existing = this.progress.stars[pId] || 0;
    if (starsCount > existing) {
      this.progress.stars[pId] = starsCount;
      saveProgress(this.progress);
    }
  }

  submitPick(itemId) {
    const puzzle = this.getCurrentPuzzle();
    if (!puzzle || puzzle.type !== 'pick') return;
    if (checkAnswer(puzzle, itemId)) {
      this.handleCorrectAnswer();
    } else {
      this.handleWrongAnswer();
    }
  }

  toggleTapAll(itemId) {
    const puzzle = this.getCurrentPuzzle();
    if (!puzzle || puzzle.type !== 'tapall') return;
    if (this.tapAllSelection.has(itemId)) {
      this.tapAllSelection.delete(itemId);
    } else {
      this.tapAllSelection.add(itemId);
    }
    this.notify();
  }

  submitTapAll() {
    const puzzle = this.getCurrentPuzzle();
    if (!puzzle || puzzle.type !== 'tapall') return;
    const choice = Array.from(this.tapAllSelection);
    if (checkAnswer(puzzle, choice)) {
      this.handleCorrectAnswer();
    } else {
      this.handleWrongAnswer();
    }
  }

  tapOrderItem(itemId) {
    const puzzle = this.getCurrentPuzzle();
    if (!puzzle || puzzle.type !== 'order') return;

    const idx = this.orderSelection.indexOf(itemId);
    if (idx !== -1) {
      // Tap again to undo!
      this.orderSelection.splice(idx, 1);
      this.notify();
      return;
    }

    this.orderSelection.push(itemId);
    this.notify();

    // If all items ordered, evaluate automatically
    if (this.orderSelection.length === puzzle.items.length) {
      if (checkAnswer(puzzle, this.orderSelection)) {
        this.handleCorrectAnswer();
      } else {
        this.handleWrongAnswer();
        // Reset order for retry
        setTimeout(() => {
          this.orderSelection = [];
          this.notify();
        }, 600);
      }
    }
  }

  nextAfterFact() {
    const levelPuzzles = this.getLevelPuzzles(this.level);
    const currentIndex = levelPuzzles.findIndex(p => p.id === this.puzzleId);

    if (currentIndex >= 0 && currentIndex < levelPuzzles.length - 1) {
      // Next puzzle in level
      this.startPuzzle(levelPuzzles[currentIndex + 1].id);
    } else {
      // Level Done screen with celebration!
      this.screen = 'level_done';
      this.triggerConfetti();
      this.notify();
    }
  }

  triggerConfetti() {
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 }
      });
    } catch {
      // safe fallback if canvas is unavailable in headless
    }
  }

  resetAllProgress() {
    this.progress = storageReset();
    this.level = 1;
    this.puzzleId = null;
    this.tries = 0;
    this.hintUsed = false;
    this.stars = 0;
    this.screen = 'home';
    this.notify();
  }
}
