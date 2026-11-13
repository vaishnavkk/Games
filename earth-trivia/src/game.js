import { COUNTRIES_DB } from '../data/countries.js';
import { CLUES_LIBRARY } from '../data/clues.js';
import { buildLibrary, pickCountries, pickClueSet, findReinsertIndex } from './questionBag.js';
import { rng, shuffle } from './rng.js';
import { getCountryAngularDiameter, getTargetCameraDir, getFreeRect, isHiddenByUi, cancelAnswerFlight } from './cameraFlight.js';
import { distanceToCountryWithNearest, planCloseWrongFlight, latLonToVector3, getLargestLandmassCornerDirs, getLargestLandmassBox, getCountryBoundingBox } from './frame_union.js';
import { WORLD_COUNTRIES } from '../data/world-50m.js';
import { sound } from './audio.js';
import confetti from 'canvas-confetti';
import { calculateRoundScore } from './scoring.js';

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
    this.cluesLibrary = buildLibrary(CLUES_LIBRARY || []);
    this.currentClues = [];
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
    this.currentCountry = null;
    this.correctCount = 0;
    this.missedCountries = [];
    this.playedCountryIds = new Set();
    this.phase = 'start';
    this.lastRoundBreakdown = null;

    // Use custom pool if provided (e.g. replay missed session), otherwise draw from tier pool
    const pool = customPool && customPool.length > 0 ? customPool : this.getTierPool(tier);
    const count = (rounds === 'endless' || rounds === Infinity) ? 10 : rounds;
    if (customPool) {
      this.roundQueue = shuffle([...pool]);
    } else {
      const isoList = pool.map(c => c.code || String(c.id));
      const pickedIsos = pickCountries(tier, isoList, count);
      const countryMap = new Map(pool.map(c => [c.code || String(c.id), c]));
      this.roundQueue = pickedIsos.map(iso => countryMap.get(iso)).filter(Boolean);
    }
    // Deduplicate roundQueue so every country in this game is unique
    const seenInQueue = new Set();
    this.roundQueue = this.roundQueue.filter(c => {
      const key = c.code || String(c.id);
      if (seenInQueue.has(key)) return false;
      seenInQueue.add(key);
      return true;
    });

    this.ui.showGameHUD(this.totalRounds, this.hasTimer, this.isPractice);
    this.nextRound();
  }

  getUniqueMissedCountries() {
    return Array.from(new Map(this.missedCountries.map(c => [c.id || c.name, c])).values());
  }

  shuffle(arr) {
    return shuffle(arr);
  }

  nextRound() {
    this.stopTimer();

    const isEndless = this.totalRounds === Infinity || this.totalRounds === 'endless';

    // In Endless mode: continuously replenish the queue so rounds continue indefinitely
    if (isEndless) {
      if (!this.roundQueue || this.roundQueue.length <= 1) {
        const pool = this.getTierPool(this.tier);
        const isoList = pool.map(c => c.code || String(c.id));
        const nextBatchIsos = pickCountries(this.tier, isoList, 10);
        const countryMap = new Map(pool.map(c => [c.code || String(c.id), c]));
        const nextBatch = nextBatchIsos.map(iso => countryMap.get(iso)).filter(Boolean);
        this.roundQueue = (this.roundQueue || []).concat(nextBatch);
      }
    } else {
      // Deduplicate next candidate so no country played earlier in this game ever repeats
      while (this.roundQueue && this.roundQueue.length > 0) {
        const peek = this.roundQueue[0];
        const peekKey = typeof peek === 'string' ? peek : (peek.code || String(peek.id));
        if (!this.playedCountryIds.has(peekKey)) {
          break;
        }
        this.roundQueue.shift();
      }

      // Finite modes (10 / 20 rounds): check completion
      if (this.round >= this.totalRounds || this.roundQueue.length === 0) {
        this.endGame();
        return;
      }
    }

    const previousCountry = this.currentCountry;
    this.round++;
    this.currentCountry = this.roundQueue.shift();
    if (typeof this.currentCountry === 'string') {
      const found = this.fullDatabase.find(c => c.code === this.currentCountry || String(c.id) === this.currentCountry);
      if (found) this.currentCountry = found;
    }
    const currentKey = this.currentCountry ? (this.currentCountry.code || String(this.currentCountry.id)) : null;
    if (currentKey) this.playedCountryIds.add(currentKey);
    this.clueIndex = 0;

    // Pick clue set via questionBag (shown in level order)
    const excludeIds = this.currentCountry.forcedExcludeClueIds || [];
    const pickedClues = pickClueSet(this.currentCountry.code, this.cluesLibrary);
    if (pickedClues && pickedClues.length === 3) {
      this.currentClues = pickedClues;
    } else {
      this.currentClues = (this.currentCountry.clues || []).map((text, idx) => ({
        level: idx + 1,
        text
      }));
    }
    this.isAnswering = true;
    this.isFlightComplete = false;
    this.phase = 'question';
    this.selectedHit = null;
    this.lastGuessCountry = null;
    this.ui.hideTouchConfirm();
    this.roundStartTime = performance.now();

    cancelAnswerFlight();
    this.globe.flight.cancelAnswerFlight();
    // Reset visual map and camera (clears all markers, arcs, and highlights)
    if (previousCountry) {
      this.globe.flight.zoomOutToOverview({
        targetCountry: previousCountry,
        duration: 600,
        onComplete: () => {
          this.globe.isAutoRotating = true;
          this.globe.lastInteractionTime = performance.now();
        }
      });
      this.globe.isAutoRotating = true;
      this.globe.lastInteractionTime = performance.now();
    } else {
      this.globe.flight.resetToOverview({
        duration: 800,
        onComplete: () => {
          this.globe.isAutoRotating = true;
          this.globe.lastInteractionTime = performance.now();
        }
      });
      this.globe.isAutoRotating = true;
      this.globe.lastInteractionTime = performance.now();
    }
    this.globe.setMicrostateTarget(this.currentCountry);
    this.globe.mapRenderer.resetHighlights();

    // Display clue/prompt based on mode
    this.ui.showQuestion({
      mode: this.mode,
      country: this.currentCountry,
      clueIndex: this.clueIndex,
      clueText: this.currentClues[0]?.text || this.currentCountry?.clues?.[0] || '',
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
        clueText: this.currentClues[this.clueIndex]?.text || this.currentCountry?.clues?.[this.clueIndex] || '',
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
    if (this.selectedHit && this.selectedHit.country) {
      this.handleGuess(this.selectedHit.country, this.selectedHit.lat, this.selectedHit.lon, true);
    } else {
      this.handleGuess(null, null, null, true);
    }
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

  async handleGuess(guessCountry, hitLat, hitLon, isTimeout = false) {
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
    let fromCoords = (hitLat !== null && hitLat !== undefined && hitLon !== null && hitLon !== undefined)
      ? { lat: hitLat, lon: hitLon }
      : null;
    let toCoords = target ? { lat: target.lat, lon: target.lon } : null;

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
      // ── INCORRECT GUESS / TIMEOUT ─────────────────────────
      sound.playWrong();
      this.streak = 0;

      let isAdjacent = false;
      let nearestPoint = null;

      if (fromCoords && !isTimeout) {
        // Expose { km, nearestLatLon } = distance from the CLICK POINT to nearest point of target country
        const distRes = distanceToCountryWithNearest(fromCoords.lat, fromCoords.lon, targetWc.geometry);
        distanceKm = distRes.km;
        nearestPoint = distRes.nearestLatLon;
        toCoords = nearestPoint;
        isAdjacent = (distanceKm === 0);
      } else if (guessCountry) {
        const cLat = guessCountry.lat || (guessCountry.centroid ? guessCountry.centroid[1] : 0);
        const cLon = guessCountry.lon || (guessCountry.centroid ? guessCountry.centroid[0] : 0);
        fromCoords = { lat: cLat, lon: cLon };
        const distRes = distanceToCountryWithNearest(cLat, cLon, targetWc.geometry);
        distanceKm = distRes.km;
        nearestPoint = distRes.nearestLatLon;
        toCoords = nearestPoint;
        isAdjacent = (distanceKm === 0);
      } else {
        // Timeout with nothing selected: distance is 0 / not required
        distanceKm = 0;
        isAdjacent = false;
        fromCoords = null;
        toCoords = null;
      }

      this.lastDistanceKm = distanceKm;
      this.lastIsAdjacent = isAdjacent;

      // Plan close wrong flight
      let plan = null;
      if (fromCoords && !isTimeout) {
        const freeRect = getFreeRect();
        const W = this.globe.renderer?.domElement?.clientWidth || window.innerWidth;
        const H = this.globe.renderer?.domElement?.clientHeight || window.innerHeight;
        const renderer = this.globe.renderer || { domElement: { clientWidth: W, clientHeight: H } };

        const clickDir = latLonToVector3(fromCoords.lat, fromCoords.lon, 1.0);
        if (this.globe.earthMesh) {
          this.globe.earthMesh.updateMatrixWorld(true);
          clickDir.applyMatrix4(this.globe.earthMesh.matrixWorld);
        }
        clickDir.normalize();

        const nearestDir = latLonToVector3(nearestPoint.lat, nearestPoint.lon, 1.0);
        if (this.globe.earthMesh) {
          nearestDir.applyMatrix4(this.globe.earthMesh.matrixWorld);
        }
        nearestDir.normalize();

        const cornerDirs = getLargestLandmassCornerDirs(targetWc, this.globe.earthMesh);

        plan = planCloseWrongFlight({
          clickDir,
          nearestDir,
          cornerDirs,
          camera: this.globe.camera,
          renderer,
          freeRect,
          R: 1.7,
          minD: this.globe.controls?.minDistance || 2.52,
          maxD: this.globe.controls?.maxDistance || 5.5
        });

        if (plan) {
          plan.km = distanceKm;
          plan.nearestPoint = nearestPoint;
          plan.clickPoint = fromCoords;
          plan.bbox = getLargestLandmassBox(targetWc);
        }
      }
      this.lastPlan = plan;

      // Scoring formula calculated from single source of truth (scoring.js)
      this.lastRoundBreakdown = calculateRoundScore({
        isCorrect: false,
        distanceKm: (isTimeout && !guessCountry) ? 99999 : distanceKm,
        isPractice: this.isPractice
      });
      if (isTimeout && !guessCountry) {
        this.lastRoundBreakdown.points = 0;
      }

      roundPoints = this.lastRoundBreakdown.points;
      if (!this.isPractice) {
        this.score += roundPoints;
      }

      // Track missed country once for end-of-game review & "Replay Missed" feature
      // Note: do not reinsert into active roundQueue so no country repeats within one game
      if (!this.missedCountries.some(c => (c.id && c.id === target.id) || c.name === target.name)) {
        this.missedCountries.push(target);
      }

      // Visuals: Translucent red fill on guess (if any), green on target; sharp 3D Line2 outlines
      const guessId = guessCountry ? guessCountry.id : null;
      this.globe.mapRenderer.renderHighlights({
        correctCountryId: target.id,
        guessCountryId: guessId
      });

      const isCompact = plan ? plan.compact : false;
      const targetBBoxSpan = plan?.bbox?.spanDeg;

      // Target outline (+ unfilled ring if target bbox < 3 deg)
      this.globe.flight.drawCountryOutline(targetWc, true, { bboxSpanDeg: targetBBoxSpan });
      if (guessWc) {
        this.globe.flight.drawCountryOutline(guessWc, false);
      }

      // 6 px click dot in screen space
      if (fromCoords) {
        this.globe.flight.drawClickDot(fromCoords.lat, fromCoords.lon);
      }

      // Arc and badge:
      // compact: no arc, no map badge
      // otherwise: 2 px arc + badge (max 96 px, offset from midpoint)
      if (fromCoords && !isCompact && toCoords) {
        this.globe.flight.drawGreatCircleArc(fromCoords.lat, fromCoords.lon, toCoords.lat, toCoords.lon, distanceKm, false);
      }
    }

    // Freeze OrbitControls immediately and kill damping inertia to eliminate flight jitter
    this.globe.controls.enabled = false;
    if (this.globe.controls.sphericalDelta) this.globe.controls.sphericalDelta.set(0, 0, 0);
    if (this.globe.controls.panOffset) this.globe.controls.panOffset.set(0, 0, 0);
    this.globe.isAutoRotating = false;

    const showCard = () => {
      this.globe.flight.computeTargetFreeAreaPercent(targetWc);
      requestAnimationFrame(() => {
        this.ui.showMemoryVault({
          isCorrect,
          isTimeout: Boolean(isTimeout && !guessCountry),
          targetCountry: target,
          guessCountry: isCorrect ? target : (guessCountry || (isTimeout ? null : { name: 'Open Ocean / Off-target' })),
          distanceKm: (isCorrect || (isTimeout && !guessCountry)) ? 0 : distanceKm,
          isAdjacent: isCorrect ? false : (this.lastIsAdjacent || distanceKm === 0),
          hitCoords: isCorrect ? { lat: hitLat, lon: hitLon } : fromCoords,
          targetCoords: isCorrect ? { lat: target.lat, lon: target.lon } : toCoords,
          breakdown: this.lastRoundBreakdown,
          isPractice: this.isPractice,
          isCompact: Boolean(this.lastPlan && this.lastPlan.compact),
          onNext: () => this.nextRound()
        });
      });
    };

    let flightOpts;
    if (!isCorrect && this.lastPlan) {
      flightOpts = {
        wasCorrect: false,
        ...this.lastPlan, // spreads targetDir, endDist, clickPoint, nearestPoint, compact, pixelGap, km
        targetHiddenByUi: false
      };
    } else {
      const angularSpan = getCountryAngularDiameter(targetWc) || target.angularSpan || 10;
      const isMobile = window.innerWidth <= 640 || (window.innerWidth <= 900 && window.innerHeight > window.innerWidth);
      const fitDistance = this.globe.flight.computeTargetDistance(angularSpan, isMobile);
      const targetDir = getTargetCameraDir(targetWc || target, this.globe.earthMesh);
      const freeRect = getFreeRect();
      const targetHiddenByUi = isHiddenByUi(targetDir, this.globe.camera, this.globe.renderer, freeRect, 1.7);
      flightOpts = {
        wasCorrect: isCorrect,
        targetDir,
        fitDistance,
        targetHiddenByUi
      };
    }

    sound.playSwoosh();
    this.isFlightComplete = false;
    await this.globe.flight.animateAfterAnswer(flightOpts);
    this.isFlightComplete = true;

    showCard();

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
