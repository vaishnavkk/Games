import { COUNTRIES_DB } from '../data/countries.js';
import { haversineDistanceKm, distanceToCountryKm, areCountriesAdjacent, getShortestDistanceBetweenCountries, getCountryAngularDiameter, getTargetCameraDir, getFreeRect, isHiddenByUi, cancelAnswerFlight } from './cameraFlight.js';
import { WORLD_COUNTRIES } from '../data/world-50m.js';
import { sound } from './audio.js';
import confetti from 'canvas-confetti';
import { calculateRoundScore, pointsIfCorrect } from './scoring.js';

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

  startExpedition({ mode = 'clue', tier = 'easy', rounds = 10, hasTimer = false, isPractice = false, customPool = null }) {
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

    // Use custom pool if provided (e.g. replay missed session), otherwise draw from tier pool
    const pool = customPool && customPool.length > 0 ? customPool : this.getTierPool(tier);
    this.roundQueue = this.shuffle([...pool]);

    this.ui.showGameHUD(this.totalRounds, this.hasTimer, this.isPractice);
    this.nextRound();
  }

  getUniqueMissedCountries() {
    return Array.from(new Map(this.missedCountries.map(c => [c.id || c.name, c])).values());
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

    cancelAnswerFlight();
    this.globe.flight.cancelAnswerFlight();
    // Reset visual map and camera (clears all markers, arcs, and highlights)
    this.globe.flight.resetToOverview({ duration: 800 });
    this.globe.setMicrostateTarget(this.currentCountry);
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
    }, this.mode);
  }

  async handleGuess(guessCountry, hitLat, hitLon) {
    if (!this.isAnswering && this.phase !== 'question' && this.phase !== 'selected') return;
    if (hitLat === undefined && guessCountry) {
      hitLat = guessCountry.lat || (guessCountry.centroid ? guessCountry.centroid[1] : 0);
      hitLon = guessCountry.lon || (guessCountry.centroid ? guessCountry.centroid[0] : 0);
    }
    this.isAnswering = false;
    this.phase = 'result';
    this.lastGuessCountry = guessCountry;
    this.stopTimer();
    this.ui.hideTouchConfirm();
    this.selectedHit = null;
    this.currentHoveredId = null;
    this.globe.renderer.domElement.style.cursor = 'grab';

    // Clear previous visual markers and outlines
    this.globe.flight.clearVisuals();
    this.globe.setMicrostateTarget(null);

    const target = this.currentCountry;
    const isCorrect = guessCountry && (
      guessCountry.id === target.id ||
      String(guessCountry.id).padStart(3, '0') === String(target.id).padStart(3, '0') ||
      (guessCountry.code && target.code && guessCountry.code === target.code)
    );

    // Resolve GeoJSON features from WORLD_COUNTRIES
    const targetWc = WORLD_COUNTRIES.find(c => String(c.id).padStart(3, '0') === String(target.id).padStart(3, '0')) || target;
    const guessWc = guessCountry ? (WORLD_COUNTRIES.find(c => String(c.id).padStart(3, '0') === String(guessCountry.id).padStart(3, '0')) || guessCountry) : null;

    let roundPoints = 0;
    let distanceKm = 0;

    if (isCorrect) {
      // ── CORRECT GUESS ──────────────────────────────────────
      sound.playCorrect();
      this.correctCount++;
      this.streak++;
      if (this.streak > this.bestStreak) this.bestStreak = this.streak;

      // Scoring formula calculated from single source of truth (scoring.js)
      this.lastRoundBreakdown = calculateRoundScore({
        isCorrect: true,
        mode: this.mode,
        clueIndex: this.clueIndex,
        hasTimer: this.hasTimer,
        timerRemaining: this.timerRemaining,
        timerDuration: this.timerDuration,
        streak: this.streak,
        isPractice: this.isPractice
      });

      roundPoints = this.lastRoundBreakdown.points;
      if (!this.isPractice) {
        this.score += roundPoints;
      }

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

      // Visual feedback: Translucent green texture fill + sharp 3D Line2 outline
      this.globe.mapRenderer.renderHighlights({ correctCountryId: target.id });
      this.globe.flight.drawCountryOutline(targetWc, true);

    } else {
      // ── INCORRECT GUESS ────────────────────────────────────
      sound.playWrong();
      this.streak = 0;

      let isAdjacent = false;
      let fromCoords = { lat: hitLat, lon: hitLon };
      let toCoords = { lat: target.lat, lon: target.lon };

      if (guessCountry) {
        // Calculate shortest distance between the two countries (not pointer click position)
        const shortest = getShortestDistanceBetweenCountries(guessWc || guessCountry, targetWc || target);
        distanceKm = shortest.distanceKm;
        isAdjacent = shortest.isAdjacent;
        fromCoords = shortest.closestA;
        toCoords = shortest.closestB;
      } else {
        // Ocean / off-target click fallback
        distanceKm = distanceToCountryKm(hitLat, hitLon, targetWc.geometry);
        isAdjacent = false;
      }

      this.lastDistanceKm = distanceKm;
      this.lastIsAdjacent = isAdjacent;

      // Scoring formula calculated from single source of truth (scoring.js)
      this.lastRoundBreakdown = calculateRoundScore({
        isCorrect: false,
        distanceKm,
        isPractice: this.isPractice
      });

      roundPoints = this.lastRoundBreakdown.points;
      if (!this.isPractice) {
        this.score += roundPoints;
      }

      // Spaced repetition: requeue missed country once later in session (deduplicated by ID)
      if (!this.missedCountries.some(c => (c.id && c.id === target.id) || c.name === target.name)) {
        this.missedCountries.push(target);
      }
      const reinsertIndex = Math.min(this.roundQueue.length, 2 + Math.floor(Math.random() * 3));
      this.roundQueue.splice(reinsertIndex, 0, target);

      // Visuals: Translucent red fill on guess, green on target; sharp 3D Line2 outlines
      const guessId = guessCountry ? guessCountry.id : null;
      this.globe.mapRenderer.renderHighlights({
        correctCountryId: target.id,
        guessCountryId: guessId
      });
      this.globe.flight.drawCountryOutline(targetWc, true);
      if (guessWc) {
        this.globe.flight.drawCountryOutline(guessWc, false);
      }

      // 2px neutral great-circle geodesic arc with km distance at midpoint (or closest boundary points)
      this.globe.flight.drawGreatCircleArc(fromCoords.lat, fromCoords.lon, toCoords.lat, toCoords.lon, distanceKm);
    }

    // Freeze OrbitControls immediately and kill damping inertia to eliminate flight jitter
    this.globe.controls.enabled = false;
    if (this.globe.controls.sphericalDelta) this.globe.controls.sphericalDelta.set(0, 0, 0);
    if (this.globe.controls.panOffset) this.globe.controls.panOffset.set(0, 0, 0);
    this.globe.isAutoRotating = false;

    const angularSpan = getCountryAngularDiameter(targetWc) || target.angularSpan || 10;
    const isMobile = window.innerWidth <= 640 || (window.innerWidth <= 900 && window.innerHeight > window.innerWidth);
    const fitDistance = this.globe.flight.computeTargetDistance(angularSpan, isMobile);
    const targetDir = getTargetCameraDir(targetWc || target, this.globe.earthMesh);
    const freeRect = getFreeRect();
    const targetHiddenByUi = isHiddenByUi(targetDir, this.globe.camera, this.globe.renderer, freeRect, 1.7);

    sound.playSwoosh();
    const flightStatus = await this.globe.flight.animateAfterAnswer({
      wasCorrect: isCorrect,
      targetDir,
      fitDistance,
      targetHiddenByUi
    });

    if (flightStatus === 'done') {
      this.globe.flight.computeTargetFreeAreaPercent(targetWc);
      requestAnimationFrame(() => {
        this.ui.showMemoryVault({
          isCorrect,
          targetCountry: target,
          guessCountry: isCorrect ? target : (guessCountry || { name: 'Open Ocean / Off-target' }),
          distanceKm: isCorrect ? 0 : distanceKm,
          isAdjacent: isCorrect ? false : (this.lastIsAdjacent || false),
          hitCoords: isCorrect ? { lat: hitLat, lon: hitLon } : fromCoords,
          targetCoords: isCorrect ? { lat: target.lat, lon: target.lon } : toCoords,
          breakdown: this.lastRoundBreakdown,
          isPractice: this.isPractice,
          onNext: () => this.nextRound()
        });
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

  returnToMainMenu() {
    this.stopTimer();
    this.isAnswering = false;
    this.phase = 'start';
    this.score = 0;
    this.streak = 0;
    this.bestStreak = 0;
    this.round = 0;
    this.roundQueue = [];
    this.missedCountries = [];
    this.selectedHit = null;
    this.currentCountry = null;
    this.lastGuessCountry = null;
    this.currentHoveredId = null;

    cancelAnswerFlight();
    this.globe.flight.cancelAnswerFlight();
    this.globe.flight.clearVisuals();
    this.globe.flight.resetToOverview({ duration: 600 });
    this.globe.setMicrostateTarget(null);
    this.globe.mapRenderer.resetHighlights();
    this.globe.controls.enabled = true;
    this.globe.isAutoRotating = true;

    this.ui.hideTouchConfirm();
    this.ui.showStartScreen();
    if (typeof window !== 'undefined' && window.__updateBestScoreDisplay) {
      window.__updateBestScoreDisplay();
    }
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

    const accuracy = Math.min(100, Math.max(0, this.round > 0 ? Math.round((this.correctCount / this.round) * 100) : 0));

    this.ui.showEndScreen({
      score: this.score,
      accuracy,
      bestStreak: this.bestStreak,
      missedCountries: this.getUniqueMissedCountries(),
      isPractice: this.isPractice,
      mode: this.mode,
      tier: this.tier,
      onRestart: () => {
        this.ui.showStartScreen();
        if (typeof window !== 'undefined' && window.__updateBestScoreDisplay) {
          window.__updateBestScoreDisplay();
        }
      },
      onReplayMissed: () => this.replayMissedSession()
    });
  }

  replayMissedSession() {
    if (this.missedCountries.length === 0) return;
    const missed = this.getUniqueMissedCountries();
    this.startExpedition({
      mode: this.mode,
      tier: this.tier,
      rounds: missed.length,
      hasTimer: false,
      isPractice: this.isPractice,
      customPool: missed
    });
  }

  bindEvents() {
    if (!this.globe || !this.globe.renderer || !this.globe.renderer.domElement) return;
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

    canvas.addEventListener('pointercancel', () => {
      downTime = 0;
    });

    // Keyboard accessibility: Enter submits selected country or advances result; Space reveals next clue or advances result
    window.addEventListener('keydown', (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      if (e.key === 'Enter') {
        const confirmBtn = document.getElementById('touchConfirmBtn');
        if (confirmBtn && !confirmBtn.classList.contains('hidden') && this.selectedHit) {
          e.preventDefault();
          confirmBtn.click();
        } else if (this.phase === 'result') {
          const vaultNextBtn = document.getElementById('vaultNextBtn');
          if (vaultNextBtn && this.ui.memoryVault && !this.ui.memoryVault.classList.contains('hidden')) {
            e.preventDefault();
            vaultNextBtn.click();
          }
        }
      } else if (e.key === 'Escape') {
        if (this.phase === 'question' || this.phase === 'selected' || this.phase === 'result') {
          e.preventDefault();
          this.returnToMainMenu();
        }
      } else if (e.key === ' ') {
        if (this.isAnswering && this.mode === 'clue') {
          // Space reveals next clue if clue button is active
          const nextClueBtn = document.getElementById('nextClueBtn');
          if (nextClueBtn && nextClueBtn.style.display !== 'none') {
            e.preventDefault();
            this.revealNextClue();
          }
        } else if (this.phase === 'result') {
          const vaultNextBtn = document.getElementById('vaultNextBtn');
          if (vaultNextBtn && this.ui.memoryVault && !this.ui.memoryVault.classList.contains('hidden')) {
            e.preventDefault();
            vaultNextBtn.click();
          }
        }
      }
    });

    // Next Clue Button click
    if (this.ui.nextClueBtn) {
      this.ui.nextClueBtn.onclick = () => this.revealNextClue();
    }

    // Main Menu Navigation (quit in-between and restart fresh)
    if (this.ui.mainMenuBtn) {
      this.ui.mainMenuBtn.onclick = () => this.returnToMainMenu();
    }
  }
}
