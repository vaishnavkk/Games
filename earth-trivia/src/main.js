import * as THREE from 'three';
import { GlobeApp } from './globe.js';
import { UIManager } from './ui.js';
import { GameManager } from './game.js';
import { questionBag } from './questionBag.js';
import { sound } from './audio.js';
import { ICONS } from './icons.js';

window.THREE = THREE;

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('webgl-container');
  const loadingScreen = document.getElementById('loadingScreen');

  // Initialize 3D Globe & Subsystems
  const globeApp = new GlobeApp(container);
  const ui = new UIManager();
  const game = new GameManager(globeApp, ui);
  ui.showStartScreen();

  // Expose for automated testing and verification
  window.game = game;
  window.globe = globeApp;
  window.ui = ui;
  window.__geotrivia = {
    globeApp,
    ui,
    game,
    questionBag,
    startGame: (opts) => game.startExpedition(opts || {}),
    getState: () => ({
      queue: [
        ...(game.currentCountry ? [game.currentCountry.code || String(game.currentCountry.id)] : []),
        ...(game.roundQueue || []).map(c => (typeof c === 'string' ? c : (c.code || String(c.id))))
      ],
      mode: game.mode,
      tier: game.tier,
      round: game.round,
      phase: game.phase || (game.isAnswering ? (game.selectedHit ? 'selected' : 'question') : 'result'),
      targetIso: game.currentCountry ? (game.currentCountry.code || String(game.currentCountry.id).padStart(3, '0')) : null,
      guessIso: game.lastGuessCountry ? (game.lastGuessCountry.code || String(game.lastGuessCountry.id).padStart(3, '0')) : (game.selectedHit?.country ? (game.selectedHit.country.code || String(game.selectedHit.country.id).padStart(3, '0')) : null),
      distanceKm: game.lastDistanceKm !== undefined ? game.lastDistanceKm : 0,
      isAdjacent: game.lastIsAdjacent || false,
      partialPoints: game.lastRoundBreakdown?.points || 0,
      targetFreeAreaPercent: globeApp.flight.targetFreeAreaPercent !== null && globeApp.flight.targetFreeAreaPercent !== undefined ? `${globeApp.flight.targetFreeAreaPercent}%` : null
    })
  };

  // Sound Button
  const soundBtn = document.getElementById('soundBtn');
  const updateSoundIcon = () => {
    if (soundBtn) {
      soundBtn.innerHTML = sound.isMuted() ? ICONS.volumeX : ICONS.volume2;
      soundBtn.title = sound.isMuted() ? 'Unmute Sound' : 'Mute Sound';
    }
  };
  updateSoundIcon();

  if (soundBtn) {
    soundBtn.addEventListener('click', () => {
      sound.toggleMute();
      updateSoundIcon();
      sound.playClick();
    });
  }

  // Clue Card Collapse / Expand Toggle
  const toggleClueBtn = document.getElementById('toggleClueBtn');
  const clueBody = document.getElementById('clueBody');
  if (toggleClueBtn && clueBody) {
    toggleClueBtn.addEventListener('click', () => {
      const isCollapsed = clueBody.classList.toggle('collapsed');
      toggleClueBtn.innerHTML = isCollapsed ? ICONS.chevronDown : ICONS.chevronUp;
      toggleClueBtn.setAttribute('aria-expanded', !isCollapsed);
    });
  }

  // Start Screen Selection State
  let selectedMode = 'clue';
  let selectedTier = 'easy';
  let selectedRounds = 10;
  let hasTimer = false;
  let isPractice = false;

  const updateBestScoreDisplay = () => {
    const bestEl = document.getElementById('startBestScore');
    if (bestEl) {
      try {
        const val = localStorage.getItem(`geotrivia_best_${selectedMode}_${selectedTier}`) || '0';
        bestEl.textContent = `${parseInt(val, 10).toLocaleString()} pts`;
      } catch (e) {
        bestEl.textContent = '0 pts';
      }
    }
  };

  function bindButtonGroup(selector, onSelect) {
    const buttons = document.querySelectorAll(selector);
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        sound.playClick();
        buttons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        onSelect(btn);
      });
    });
  }

  bindButtonGroup('.mode-btn', btn => {
    selectedMode = btn.dataset.mode;
    updateBestScoreDisplay();
  });

  bindButtonGroup('.tier-btn', btn => {
    selectedTier = btn.dataset.tier;
    updateBestScoreDisplay();
  });

  bindButtonGroup('.round-btn', btn => {
    const val = btn.dataset.rounds;
    selectedRounds = val === 'endless' ? Infinity : parseInt(val, 10);
  });

  const timerToggle = document.getElementById('timerToggle');
  if (timerToggle) {
    timerToggle.addEventListener('change', () => {
      hasTimer = timerToggle.checked;
      sound.playClick();
    });
  }

  const practiceToggle = document.getElementById('practiceToggle');
  if (practiceToggle) {
    practiceToggle.addEventListener('change', () => {
      isPractice = practiceToggle.checked;
      if (isPractice && timerToggle) {
        timerToggle.checked = false;
        hasTimer = false;
        timerToggle.disabled = true;
      } else if (timerToggle) {
        timerToggle.disabled = false;
      }
      sound.playClick();
    });
  }

  updateBestScoreDisplay();
  window.__updateBestScoreDisplay = updateBestScoreDisplay;

  // Start Game Button
  // Reset Question History Button
  const resetHistoryBtn = document.getElementById('resetQuestionHistoryBtn');
  const resetToast = document.getElementById('resetHistoryToast');
  if (resetHistoryBtn) {
    resetHistoryBtn.addEventListener('click', () => {
      sound.playClick();
      questionBag.resetHistory();
      if (resetToast) {
        resetToast.style.display = 'block';
        setTimeout(() => {
          resetToast.style.display = 'none';
        }, 2000);
      }
    });
  }

  const startBtn = document.getElementById('startExpeditionBtn');
  if (startBtn) {
    startBtn.addEventListener('click', () => {
      sound.playClick();
      game.startExpedition({
        mode: selectedMode,
        tier: selectedTier,
        rounds: selectedRounds,
        hasTimer,
        isPractice
      });
    });
  }

  // Hide initial loading screen with smooth fade
  if (loadingScreen) {
    setTimeout(() => {
      loadingScreen.style.opacity = '0';
      setTimeout(() => {
        loadingScreen.style.display = 'none';
      }, 500);
    }, 400);
  }
});
