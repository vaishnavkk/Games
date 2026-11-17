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

function setupResetButton(container) {
  const btnReset = container.querySelector('#btnResetProgress');
  const bar = container.querySelector('#holdProgress');
  const textEl = container.querySelector('.btn-text');
  if (!btnReset || !bar) return;

  const startHold = (e) => {
    e.preventDefault();
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
      bar.style.width = '100%';
      if (textEl) textEl.textContent = 'Resetting...';
      game.resetAllProgress();
      setTimeout(() => {
        game.goToHome();
      }, 400);
    }, 2000);
  };

  const cancelHold = () => {
    if (resetHoldTimer) {
      clearTimeout(resetHoldTimer);
      resetHoldTimer = null;
    }
    if (holdAnimFrame) {
      cancelAnimationFrame(holdAnimFrame);
      holdAnimFrame = null;
    }
    bar.style.width = '0%';
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
      game.goToMap();
      return;
    }
    if (target.id === 'btnSettings') {
      game.openSettings();
      return;
    }
    if (target.id === 'btnBackHome') {
      game.goToHome();
      return;
    }
    if (target.id === 'btnBackMap' || target.id === 'btnDoneBackMap') {
      game.goToMap();
      return;
    }
    if (target.id === 'btnCloseSettings' || target.id === 'btnDismissSettings') {
      game.goToMap();
      return;
    }

    // Map level selection
    if (target.classList.contains('btn-select-level') || target.classList.contains('level-card')) {
      const lvl = target.dataset.level || target.closest('[data-level]')?.dataset.level;
      if (lvl) game.startLevel(Number(lvl));
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

  setupResetButton(container);
}

function mount() {
  if (!app) return;
  app.innerHTML = renderApp(game);
  setupResetButton(app);
}

if (app) {
  attachEvents(app);
  mount();
  game.subscribe(() => {
    mount();
  });
}
