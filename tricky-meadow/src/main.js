import '@fontsource/fredoka';
import '@fontsource/patrick-hand';
import './style.css';
import { initSprite } from './sprite.js';
import { GameManager } from './engine/game.js';
import { renderApp } from './ui/screens.js';

// Initialize SVG sprite in DOM
initSprite();

const app = document.getElementById('app');
const game = new GameManager();

let resetHoldTimer = null;
let resetHoldStart = 0;
let holdAnimFrame = null;
let previousScreen = 'home';

function cancelSpeech() {
  if (typeof window !== 'undefined' && window.speechSynthesis?.cancel) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // ignore
    }
  }
}

function cancelHold() {
  if (resetHoldTimer) {
    clearTimeout(resetHoldTimer);
    resetHoldTimer = null;
  }
  if (holdAnimFrame) {
    cancelAnimationFrame(holdAnimFrame);
    holdAnimFrame = null;
  }
  const bar = document.getElementById('holdProgress');
  if (bar) {
    bar.style.width = '0%';
  }
  const textEl = document.querySelector('#btnResetProgress .btn-text');
  if (textEl && textEl.textContent === 'Resetting...') {
    textEl.textContent = 'Hold to Reset (2s)';
  }
}

function setupResetButton(container) {
  const btnReset = container.querySelector('#btnResetProgress');
  const bar = container.querySelector('#holdProgress');
  const textEl = container.querySelector('.btn-text');
  if (!btnReset || !bar) return;

  const startHold = (e) => {
    e.preventDefault();
    cancelHold();
    resetHoldStart = performance.now();
    bar.style.width = '0%';

    const updateBar = (now) => {
      const elapsed = now - resetHoldStart;
      const pct = Math.min(100, (elapsed / 2000) * 100);
      bar.style.width = `${pct}%`;
      if (pct < 100) {
        holdAnimFrame = requestAnimationFrame(updateBar);
      }
    };
    holdAnimFrame = requestAnimationFrame(updateBar);

    resetHoldTimer = setTimeout(() => {
      cancelAnimationFrame(holdAnimFrame);
      holdAnimFrame = null;
      resetHoldTimer = null;
      bar.style.width = '100%';
      if (textEl) textEl.textContent = 'Resetting...';
      game.resetAllProgress();
      setTimeout(() => {
        game.goToHome();
      }, 400);
    }, 2000);
  };

  btnReset.addEventListener('pointerdown', startHold);
  btnReset.addEventListener('pointerup', cancelHold);
  btnReset.addEventListener('pointerleave', cancelHold);
  btnReset.addEventListener('pointercancel', cancelHold);
}

function attachEvents(container) {
  container.addEventListener('click', (e) => {
    const target = e.target.closest('button, .card-item, .level-card');
    if (!target) return;

    // Navigation buttons
    if (target.id === 'btnPlay') {
      cancelSpeech();
      game.goToMap();
      return;
    }
    if (target.id === 'btnSettings') {
      cancelSpeech();
      previousScreen = game.screen || 'home';
      if (typeof game.openSettings === 'function') {
        game.openSettings();
      } else if (typeof game.goToSettings === 'function') {
        game.goToSettings();
      } else {
        game.screen = 'settings';
        game.notify();
      }
      return;
    }
    if (target.id === 'btnBackHome') {
      cancelSpeech();
      game.goToHome();
      return;
    }
    if (target.id === 'btnBackMap' || target.id === 'btnDoneBackMap') {
      cancelSpeech();
      game.goToMap();
      return;
    }
    if (target.id === 'btnCloseSettings' || target.id === 'btnDismissSettings') {
      cancelHold();
      cancelSpeech();
      if (previousScreen === 'home') {
        game.goToHome();
      } else if (previousScreen === 'puzzle' && game.puzzleId) {
        game.screen = 'puzzle';
        game.notify();
      } else if (previousScreen === 'fact' && game.puzzleId) {
        game.screen = 'fact';
        game.notify();
      } else if (previousScreen === 'level_done') {
        game.screen = 'level_done';
        game.notify();
      } else {
        game.goToMap();
      }
      return;
    }

    // Map level selection
    if (target.classList.contains('btn-select-level') || target.classList.contains('level-card')) {
      const lvl = target.dataset.level || target.closest('[data-level]')?.dataset.level;
      if (lvl) {
        cancelSpeech();
        game.startLevel(Number(lvl));
      }
      return;
    }

    // Read aloud button
    if (target.id === 'btnReadAloud' || target.closest('#btnReadAloud')) {
      const current = game.getCurrentPuzzle();
      if (current && typeof window !== 'undefined' && 'speechSynthesis' in window) {
        cancelSpeech();
        const text = `${current.prompt}. ${current.items.map(i => i.label).join(', ')}`;
        const utterance = new window.SpeechSynthesisUtterance(text);
        utterance.rate = 0.9;
        window.speechSynthesis.speak(utterance);
      }
      return;
    }

    // Puzzle hint
    if (target.id === 'btnHint') {
      game.useHint();
      return;
    }

    // Puzzle tapall submission
    if (target.id === 'btnDoneTapAll') {
      game.submitTapAll();
      return;
    }

    // Next after fact card
    if (target.id === 'btnNextFact') {
      cancelSpeech();
      game.nextAfterFact();
      return;
    }

    // Puzzle item cards
    if (target.classList.contains('card-item')) {
      const itemId = target.dataset.itemId;
      const current = game.getCurrentPuzzle();
      if (!current) return;

      if (current.type === 'pick') {
        game.submitPick(itemId);
      } else if (current.type === 'tapall') {
        game.toggleTapAll(itemId);
      } else if (current.type === 'order') {
        game.tapOrderItem(itemId);
      }
    }
  });

  // Global listeners to cancel hold when unmounting or clicking outside
  document.addEventListener('pointerdown', (e) => {
    if (!e.target.closest('#btnResetProgress')) {
      cancelHold();
    }
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#btnResetProgress')) {
      cancelHold();
    }
  });
  window.addEventListener('pointerup', cancelHold);
  window.addEventListener('pointercancel', cancelHold);
  window.addEventListener('blur', cancelHold);
  window.addEventListener('pagehide', () => {
    cancelHold();
    cancelSpeech();
  });
  window.addEventListener('beforeunload', () => {
    cancelHold();
    cancelSpeech();
  });

  setupResetButton(container);
}

function mount() {
  if (!app) return;
  cancelHold();
  app.innerHTML = renderApp(game);
  setupResetButton(app);
}

if (app) {
  attachEvents(app);
  mount();
  let lastScreen = game.screen;
  game.subscribe(() => {
    if (game.screen !== lastScreen) {
      cancelSpeech();
      cancelHold();
      lastScreen = game.screen;
    }
    mount();
  });
}
