import { GlobeApp } from './globe.js';
import { UIManager } from './ui.js';
import { GameManager } from './game.js';
import { sound } from './audio.js';

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('webgl-container');
  const loadingScreen = document.getElementById('loadingScreen');

  // Initialize 3D Globe & Subsystems
  const globeApp = new GlobeApp(container);
  const ui = new UIManager();
  const game = new GameManager(globeApp, ui);

  // Expose for testing and verification
  window.__geotrivia = { globeApp, ui, game };

  // Sound Button
  const soundBtn = document.getElementById('soundBtn');
  const updateSoundIcon = () => {
    if (soundBtn) {
      soundBtn.textContent = sound.isMuted() ? '🔇' : '🔊';
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
      clueBody.classList.toggle('collapsed');
      toggleClueBtn.textContent = clueBody.classList.contains('collapsed') ? '➕' : '➖';
    });
  }

  // Start Screen Mode Selection
  let selectedMode = 'clue';
  let selectedTier = 'easy';
  let selectedRounds = 10;
  let isSurvival = false;
  let hasTimer = false;

  const modeButtons = document.querySelectorAll('.mode-btn');
  modeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      sound.playClick();
      modeButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedMode = btn.dataset.mode;
    });
  });

  const tierButtons = document.querySelectorAll('.tier-btn');
  tierButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      sound.playClick();
      tierButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedTier = btn.dataset.tier;
    });
  });

  const roundButtons = document.querySelectorAll('.round-btn');
  roundButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      sound.playClick();
      roundButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const val = btn.dataset.rounds;
      selectedRounds = val === 'endless' ? Infinity : parseInt(val, 10);
    });
  });

  const timerToggle = document.getElementById('timerToggle');
  if (timerToggle) {
    timerToggle.addEventListener('change', () => {
      hasTimer = timerToggle.checked;
      sound.playClick();
    });
  }

  const survivalToggle = document.getElementById('survivalToggle');
  if (survivalToggle) {
    survivalToggle.addEventListener('change', () => {
      isSurvival = survivalToggle.checked;
      sound.playClick();
    });
  }

  // Start Game Button
  const startBtn = document.getElementById('startExpeditionBtn');
  if (startBtn) {
    startBtn.addEventListener('click', () => {
      sound.playClick();
      game.startExpedition({
        mode: selectedMode,
        tier: selectedTier,
        rounds: selectedRounds,
        isSurvival,
        hasTimer
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
