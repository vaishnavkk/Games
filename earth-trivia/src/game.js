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
    this.tier = 'easy';       // 'easy' | 'medium' | 'hard'
    this.totalRounds = 10;    // 10 | 20 | Infinity
    this.isSurvival = false;  // 3 lives vs Practice
    this.hasTimer = false;

    // Runtime State
    this.score = 0;
    this.streak = 0;
    this.bestStreak = 0;
    this.round = 0;
    this.lives = 3;
    this.correctCount = 0;

    // Country Pools
    this.fullDatabase = COUNTRIES_DB;
    this.roundQueue = [];
    this.missedCountries = [];
    this.currentCountry = null;
    this.clueIndex = 0;
    this.isAnswering = false;

    // Timer
    this.timerDuration = 25000; // 25s per round
    this.timerRemaining = 25000;
    this.timerInterval = null;
    this.roundStartTime = 0;

    this.bindEvents();
  }

  // Filter countries by tier
  getTierPool(tier) {
    if (tier === 'easy') {
      return this.fullDatabase.filter(c => c.tier === 'easy');
    } else if (tier === 'medium') {
      return this.fullDatabase.filter(c => c.tier === 'easy' || c.tier === 'medium');
    } else {
      // Hard: all 195 nations
      return [...this.fullDatabase];
    }
  }

  startExpedition({ mode, tier, rounds, isSurvival, hasTimer }) {
    this.mode = mode;
    this.tier = tier;
    this.totalRounds = rounds;
    this.isSurvival = isSurvival;
    this.hasTimer = hasTimer;

    this.score = 0;
    this.streak = 0;
    this.bestStreak = 0;
    this.round = 0;
    this.correctCount = 0;
    this.lives = isSurvival ? 3 : null;
    this.missedCountries = [];

    // Shuffle pool
    const pool = this.getTierPool(tier);
    this.roundQueue = this.shuffle([...pool]);

    this.ui.showGameHUD(this.totalRounds, this.lives, this.hasTimer);
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

    if (this.isSurvival && this.lives <= 0) {
      this.endGame();
      return;
    }

    this.round++;
    this.currentCountry = this.roundQueue.shift();
    this.clueIndex = 0;
    this.isAnswering = true;
    this.roundStartTime = performance.now();

    // Reset visual map and camera
    this.globe.flight.resetToOverview({ duration: 800 });
    this.globe.mapRenderer.resetHighlights();

    // Display clue
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
    // Timeout is treated as a miss with max distance
    this.handleGuess(null, this.currentCountry.lat + 45, this.currentCountry.lon + 90);
  }

  // Handle user click on globe
  handleGlobeClick(clientX, clientY) {
    if (!this.isAnswering) return;

    const hitResult = this.globe.picker.pickCountry(
      clientX,
      clientY,
      this.globe.width,
      this.globe.height
    );

    if (!hitResult) return;

    sound.playClick();
    this.handleGuess(hitResult.country, hitResult.hitLat, hitResult.hitLon);
  }

  handleGuess(guessCountry, hitLat, hitLon) {
    if (!this.isAnswering) return;
    this.isAnswering = false;
    this.stopTimer();

    const target = this.currentCountry;
    const isCorrect = guessCountry && guessCountry.id === target.id;

    if (isCorrect) {
      // ── CORRECT GUESS ──────────────────────────────────────
      sound.playCorrect();
      this.correctCount++;
      this.streak++;
      if (this.streak > this.bestStreak) this.bestStreak = this.streak;

      // Score calculation
      const elapsedSec = (performance.now() - this.roundStartTime) / 1000;
      const speedBonus = Math.max(0, Math.round((20 - elapsedSec) * 20));
      const clueBonus = (3 - this.clueIndex) * 250;
      const streakMultiplier = Math.min(3, 1 + (this.streak - 1) * 0.25);
      const points = Math.round((1000 + speedBonus + clueBonus) * streakMultiplier);

      this.score += points;

      // Confetti celebratory burst on milestones
      if (this.streak >= 3) {
        try {
          confetti({
            particleCount: 50 + this.streak * 10,
            spread: 60,
            origin: { y: 0.7 }
          });
        } catch (e) {}
      }

      // Visual feedback: green fill & glowing pin
      this.globe.mapRenderer.renderHighlights({ correctCountryId: target.id });
      this.globe.flight.createPinMarker(target.lat, target.lon, 0x10b981);

      // Camera flight to target country
      sound.playSwoosh();
      this.globe.flight.flyToCountry(target.lat, target.lon, {
        isDesktopOffset: true,
        onComplete: () => {
          this.ui.showMemoryVault({
            isCorrect: true,
            targetCountry: target,
            guessCountry: target,
            distanceKm: 0,
            onNext: () => this.nextRound()
          });
        }
      });

    } else {
      // ── INCORRECT GUESS ────────────────────────────────────
      sound.playWrong();
      this.streak = 0;

      if (this.isSurvival) {
        this.lives--;
      }

      // Distance error
      const distanceKm = haversineDistanceKm(hitLat, hitLon, target.lat, target.lon);

      // Partial credit if close (under 1200 km)
      if (distanceKm < 1200) {
        const partial = Math.max(50, Math.round(500 * (1 - distanceKm / 1200)));
        this.score += partial;
      }

      // Re-queue missed country later in session (spaced repetition!)
      this.missedCountries.push(target);
      const reinsertIndex = Math.min(this.roundQueue.length, 3 + Math.floor(Math.random() * 3));
      this.roundQueue.splice(reinsertIndex, 0, target);

      // Visuals: Red fill on guess, Green fill on target, arc & markers
      const guessId = guessCountry ? guessCountry.id : null;
      this.globe.mapRenderer.renderHighlights({
        correctCountryId: target.id,
        guessCountryId: guessId
      });

      this.globe.flight.createPinMarker(target.lat, target.lon, 0x10b981);
      if (guessCountry) {
        this.globe.flight.createPinMarker(hitLat, hitLon, 0xef4444);
      }
      this.globe.flight.drawGreatCircleArc(hitLat, hitLon, target.lat, target.lon);

      // Camera flight to target country
      sound.playSwoosh();
      this.globe.flight.flyToCountry(target.lat, target.lon, {
        isDesktopOffset: true,
        onComplete: () => {
          this.ui.showMemoryVault({
            isCorrect: false,
            targetCountry: target,
            guessCountry,
            distanceKm,
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
      lives: this.lives
    });
  }

  endGame() {
    this.stopTimer();
    this.isAnswering = false;

    // Save high score to localStorage
    const savedHigh = parseInt(localStorage.getItem('geotrivia_highscore') || '0', 10);
    if (this.score > savedHigh) {
      localStorage.setItem('geotrivia_highscore', String(this.score));
    }

    const accuracy = this.round > 0 ? Math.round((this.correctCount / this.round) * 100) : 0;

    this.ui.showEndScreen({
      score: this.score,
      accuracy,
      bestStreak: this.bestStreak,
      missedCountries: this.missedCountries,
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
      isSurvival: false,
      hasTimer: false
    });
    this.roundQueue = this.shuffle(missed);
  }

  bindEvents() {
    const canvas = this.globe.renderer.domElement;

    // Track mouse drag vs click
    let downX = 0, downY = 0, downTime = 0;

    canvas.addEventListener('pointerdown', (e) => {
      downX = e.clientX;
      downY = e.clientY;
      downTime = performance.now();
    });

    canvas.addEventListener('pointerup', (e) => {
      const dist = Math.hypot(e.clientX - downX, e.clientY - downY);
      const time = performance.now() - downTime;
      // If minimal movement and quick press, treat as click selection!
      if (dist < 6 && time < 400) {
        this.handleGlobeClick(e.clientX, e.clientY);
      }
    });

    // Reveal clue button
    if (this.ui.nextClueBtn) {
      this.ui.nextClueBtn.onclick = () => this.revealNextClue();
    }
  }
}
