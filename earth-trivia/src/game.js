import { COUNTRIES_DB } from '../data/countries.js';
import { haversineDistanceKm } from './cameraFlight.js';
import { sound } from './audio.js';
import confetti from 'canvas-confetti';

export class GameManager {
  constructor(globeApp, ui) {
    this.globe = globeApp;
    this.ui = ui;

    // Game Configuration Options
    this.mode = 'clue';       // 'clue' | 'name' | 'flag'
    this.tier = 'easy';       // 'easy' (~40) | 'medium' (100) | 'hard' (all 193 UN)
    this.totalRounds = 10;    // 10 | 20 | Infinity
    this.hasTimer = false;    // Optional toggle (default off)
    this.isPractice = false;  // Practice mode: no timer, no score kept

    // Runtime State
    this.score = 0;
    this.streak = 0;
    this.bestStreak = 0;
    this.round = 0;
    this.correctCount = 0;
    this.phase = 'start';     // 'start' | 'question' | 'selected' | 'result' | 'end'

    // Country Pools
    this.fullDatabase = COUNTRIES_DB;
    this.roundQueue = [];
    this.missedCountries = [];
    this.currentCountry = null;
    this.selectedHit = null;
    this.lastGuessCountry = null;
    this.lastRoundBreakdown = null;
    this.clueIndex = 0;
    this.isAnswering = false;

    // Timer (25 seconds)
    this.timerDuration = 25000;
    this.timerRemaining = 25000;
    this.timerInterval = null;
    this.roundStartTime = 0;

    this.bindEvents();
  }

  // Filter countries by tier
  getTierPool(tier) {
    if (tier === 'easy') {
      // About 40 well-known major countries (42 iconic nations)
      return this.fullDatabase.filter(c => c.tier === 'easy');
    } else if (tier === 'medium') {
      // About 100 diverse countries
      const pool = this.fullDatabase.filter(c => c.tier === 'easy' || c.tier === 'medium');
      return pool.slice(0, 100);
    } else {
      // Hard: all 193 UN member states + observers (195 total)
      return [...this.fullDatabase];
    }
  }

  startExpedition({ mode = 'clue', tier = 'easy', rounds = 10, hasTimer = false, isPractice = false }) {
    this.mode = mode;
    this.tier = tier;
    this.totalRounds = rounds;
    this.hasTimer = isPractice ? false : hasTimer;
    this.isPractice = isPractice;

    this.score = 0;
    this.streak = 0;
    this.bestStreak = 0;
    this.round = 0;
    this.correctCount = 0;
    this.missedCountries = [];
    this.phase = 'start';
    this.lastRoundBreakdown = null;

    // Shuffle pool
    const pool = this.getTierPool(tier);
    this.roundQueue = this.shuffle([...pool]);

    this.ui.showGameHUD(this.totalRounds, this.hasTimer, this.isPractice);
    this.nextRound();
  }

  shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  nextRound() {
    this.stopTimer();

    // Check completion
    if (this.round >= this.totalRounds || this.roundQueue.length === 0) {
      this.endGame();
      return;
    }

    this.round++;
    this.currentCountry = this.roundQueue.shift();
    this.clueIndex = 0;
    this.isAnswering = true;
    this.phase = 'question';
    this.selectedHit = null;
    this.lastGuessCountry = null;
    this.ui.hideTouchConfirm();
    this.roundStartTime = performance.now();

    // Reset visual map and camera (clears all markers, arcs, and highlights)
    this.globe.flight.resetToOverview({ duration: 800 });
    this.globe.mapRenderer.resetHighlights();

    // Display clue/prompt based on mode
    this.ui.showQuestion({
      mode: this.mode,
      country: this.currentCountry,
      clueIndex: this.clueIndex,
      clueText: this.currentCountry.clues[0],
      availableCluesCount: 3
    });

    this.updateHUD();

    if (this.hasTimer) {
      this.startTimer();
    }
  }

  revealNextClue() {
    if (this.clueIndex < 2) {
      sound.playClick();
      this.clueIndex++;
      this.ui.showQuestion({
        mode: this.mode,
        country: this.currentCountry,
        clueIndex: this.clueIndex,
        clueText: this.currentCountry.clues[this.clueIndex],
        availableCluesCount: 3
      });
    }
  }

  startTimer() {
    this.timerRemaining = this.timerDuration;
    const intervalMs = 100;
    this.timerInterval = setInterval(() => {
      this.timerRemaining -= intervalMs;
      const percent = (this.timerRemaining / this.timerDuration) * 100;
      this.ui.updateHUD({ timePercent: percent });

      if (this.timerRemaining <= 0) {
        this.stopTimer();
        this.handleTimeout();
      }
    }, intervalMs);
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  handleTimeout() {
    if (!this.isAnswering) return;
    this.handleGuess(null, this.currentCountry.lat + 45, this.currentCountry.lon + 90);
  }

  // Handle user click on globe
  handleGlobeClick(clientX, clientY, pointerType = 'mouse') {
    if (!this.isAnswering || this.globe.flight.isFlying) return;

    const hitResult = this.globe.picker.pickCountry(
      clientX,
      clientY,
      this.globe.width,
      this.globe.height
    );

    if (!hitResult || !hitResult.country) {
      this.selectedHit = null;
      this.phase = 'question';
      this.ui.hideTouchConfirm();
      this.globe.mapRenderer.resetHighlights();
      return;
    }

    sound.playClick();

    // Both desktop and touch: click selects (highlight) and Confirm button / Enter submits
    this.selectedHit = hitResult;
    this.phase = 'selected';
    const countryId = String(hitResult.country.id).padStart(3, '0');
    this.globe.mapRenderer.renderHighlights({ selectedCountryId: countryId });

    this.ui.showTouchConfirm(hitResult.country, () => {
      sound.playClick();
      this.ui.hideTouchConfirm();
      const hit = this.selectedHit;
      this.selectedHit = null;
      if (hit) {
        this.handleGuess(hit.country, hit.hitLat, hit.hitLon);
      }
    });
  }

  handleGuess(guessCountry, hitLat, hitLon) {
    if (!this.isAnswering) return;
    this.isAnswering = false;
    this.phase = 'result';
    this.lastGuessCountry = guessCountry;
    this.stopTimer();
    this.ui.hideTouchConfirm();
    this.selectedHit = null;
    this.currentHoveredId = null;
    this.globe.renderer.domElement.style.cursor = 'grab';

    const target = this.currentCountry;
    const isCorrect = guessCountry && (
      guessCountry.id === target.id ||
      String(guessCountry.id).padStart(3, '0') === String(target.id).padStart(3, '0') ||
      (guessCountry.code && target.code && guessCountry.code === target.code)
    );

    let roundPoints = 0;
    let distanceKm = 0;

    if (isCorrect) {
      // ── CORRECT GUESS ──────────────────────────────────────
      sound.playCorrect();
      this.correctCount++;
      this.streak++;
      if (this.streak > this.bestStreak) this.bestStreak = this.streak;

      // Scoring formula: maximum 1,000 per round
      // Base: 500
      // Fewer-clues bonus: Clue 1: +300, Clue 2: +150, Clue 3: 0 (or +300 in name/flag mode)
      const base = 500;
      let clueBonus = 0;
      if (this.mode === 'name' || this.mode === 'flag') {
        clueBonus = 300;
      } else {
        clueBonus = this.clueIndex === 0 ? 300 : (this.clueIndex === 1 ? 150 : 0);
      }

      // Speed bonus: up to +200 only when timer is ON
      let speedBonus = 0;
      if (this.hasTimer && this.timerDuration > 0) {
        const timeFraction = Math.max(0, this.timerRemaining / this.timerDuration);
        speedBonus = Math.round(200 * timeFraction);
      }

      // Streak multiplier: 1.0x, 1.1x, 1.2x... max 1.5x
      const streakMultiplier = Math.min(1.5, 1.0 + Math.max(0, this.streak - 1) * 0.1);

      if (!this.isPractice) {
        roundPoints = Math.min(1000, Math.round((base + clueBonus + speedBonus) * streakMultiplier));
        this.score += roundPoints;
      }

      this.lastRoundBreakdown = {
        isCorrect: true,
        base,
        clueBonus,
        speedBonus,
        streakMultiplier,
        points: roundPoints,
        distanceKm: 0
      };

      // Confetti burst on streaks
      if (this.streak >= 3) {
        try {
          confetti({
            particleCount: 40 + this.streak * 10,
            spread: 55,
            origin: { y: 0.75 }
          });
        } catch (e) {}
      }

      // Visual feedback: Texture fill + 2px outline (NO pin or beam beacon!)
      this.globe.mapRenderer.renderHighlights({ correctCountryId: target.id });

      // Camera flight: frame country so it fills 50-60% of free area
      sound.playSwoosh();
      const angularSpan = target.angularSpan || 10;
      this.globe.flight.flyToCountry(target.lat, target.lon, {
        isDesktopOffset: true,
        angularSpan,
        onComplete: () => {
          this.ui.showMemoryVault({
            isCorrect: true,
            targetCountry: target,
            guessCountry: target,
            distanceKm: 0,
            breakdown: this.lastRoundBreakdown,
            isPractice: this.isPractice,
            onNext: () => this.nextRound()
          });
        }
      });

    } else {
      // ── INCORRECT GUESS ────────────────────────────────────
      sound.playWrong();
      this.streak = 0;

      // Distance error
      distanceKm = haversineDistanceKm(hitLat, hitLon, target.lat, target.lon);

      // Partial credit by distance: up to 400 pts if within 5000 km
      if (!this.isPractice && distanceKm < 5000) {
        const partial = Math.max(0, Math.round(400 * (1 - distanceKm / 5000)));
        roundPoints = partial;
        this.score += partial;
      }

      this.lastRoundBreakdown = {
        isCorrect: false,
        base: 0,
        clueBonus: 0,
        speedBonus: 0,
        streakMultiplier: 1.0,
        points: roundPoints,
        distanceKm
      };

      // Spaced repetition: requeue missed country once later in session
      this.missedCountries.push(target);
      const reinsertIndex = Math.min(this.roundQueue.length, 2 + Math.floor(Math.random() * 3));
      this.roundQueue.splice(reinsertIndex, 0, target);

      // Visuals: Red fill on guess, Green fill on target (NO interior pin or beam)
      const guessId = guessCountry ? guessCountry.id : null;
      this.globe.mapRenderer.renderHighlights({
        correctCountryId: target.id,
        guessCountryId: guessId
      });

      // 2px neutral great-circle geodesic arc (white at 70%) with km distance at midpoint
      this.globe.flight.drawGreatCircleArc(hitLat, hitLon, target.lat, target.lon);

      // Camera flight: frame both if both fit with target >= 25% free area; otherwise frame target
      sound.playSwoosh();
      const angularSpan = target.angularSpan || 10;
      this.globe.flight.flyToCountry(target.lat, target.lon, {
        isDesktopOffset: true,
        angularSpan,
        guessLat: hitLat,
        guessLon: hitLon,
        onComplete: () => {
          this.ui.showMemoryVault({
            isCorrect: false,
            targetCountry: target,
            guessCountry: guessCountry || { name: 'Open Ocean / Off-target' },
            distanceKm,
            breakdown: this.lastRoundBreakdown,
            isPractice: this.isPractice,
            onNext: () => this.nextRound()
          });
        }
      });
    }

    this.updateHUD();
  }

  updateHUD() {
    this.ui.updateHUD({
      score: this.score,
      streak: this.streak,
      round: this.round,
      totalRounds: this.totalRounds,
      isPractice: this.isPractice
    });
  }

  endGame() {
    this.stopTimer();
    this.isAnswering = false;
    this.phase = 'end';
    this.currentHoveredId = null;
    this.globe.renderer.domElement.style.cursor = 'default';

    // Reset visual map and clear arcs on end screen
    this.globe.flight.clearVisuals();
    this.globe.mapRenderer.resetHighlights();

    // Save best score per mode and tier in localStorage inside try/catch
    if (!this.isPractice) {
      try {
        const key = `geotrivia_best_${this.mode}_${this.tier}`;
        const savedHigh = parseInt(localStorage.getItem(key) || '0', 10);
        if (this.score > savedHigh) {
          localStorage.setItem(key, String(this.score));
        }
        // Also keep legacy global highscore for backwards compatibility
        const legacyHigh = parseInt(localStorage.getItem('geotrivia_highscore') || '0', 10);
        if (this.score > legacyHigh) {
          localStorage.setItem('geotrivia_highscore', String(this.score));
        }
      } catch (e) {
        console.warn('localStorage access failed:', e);
      }
    }

    const accuracy = this.round > 0 ? Math.round((this.correctCount / this.round) * 100) : 0;

    this.ui.showEndScreen({
      score: this.score,
      accuracy,
      bestStreak: this.bestStreak,
      missedCountries: this.missedCountries,
      isPractice: this.isPractice,
      mode: this.mode,
      tier: this.tier,
      onRestart: () => this.ui.showStartScreen(),
      onReplayMissed: () => this.replayMissedSession()
    });
  }

  replayMissedSession() {
    if (this.missedCountries.length === 0) return;
    const missed = [...this.missedCountries];
    this.startExpedition({
      mode: this.mode,
      tier: this.tier,
      rounds: missed.length,
      hasTimer: false,
      isPractice: this.isPractice
    });
    this.roundQueue = this.shuffle(missed);
  }

  bindEvents() {
    const canvas = this.globe.renderer.domElement;
    this.currentHoveredId = null;

    // Track mouse drag vs click: pointer-up is a click only if moved < 6px and < 350ms elapsed
    let downX = 0, downY = 0, downTime = 0;

    canvas.addEventListener('pointerdown', (e) => {
      downX = e.clientX;
      downY = e.clientY;
      downTime = performance.now();
    });

    canvas.addEventListener('pointerup', (e) => {
      const dist = Math.hypot(e.clientX - downX, e.clientY - downY);
      const elapsed = performance.now() - downTime;
      if (dist < 6 && elapsed < 350) {
        this.handleGlobeClick(e.clientX, e.clientY, e.pointerType);
      }
    });

    // Keyboard accessibility: Enter submits selected country; Space reveals next clue
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const confirmBtn = document.getElementById('touchConfirmBtn');
        if (confirmBtn && !confirmBtn.classList.contains('hidden') && this.selectedHit) {
          e.preventDefault();
          confirmBtn.click();
        }
      } else if (e.key === ' ' && this.isAnswering && this.mode === 'clue') {
        // Space reveals next clue if clue button is active
        const nextClueBtn = document.getElementById('nextClueBtn');
        if (nextClueBtn && nextClueBtn.style.display !== 'none') {
          e.preventDefault();
          this.revealNextClue();
        }
      }
    });

    // Next Clue Button click
    if (this.ui.nextClueBtn) {
      this.ui.nextClueBtn.onclick = () => this.revealNextClue();
    }
  }
}
