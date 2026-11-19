import { createGame, step, snapshot } from './sim/index.js';
import { createRenderer } from './render/index.js';
import { createUI } from './ui/index.js';

const canvas = document.getElementById('gameCanvas');
const uiRoot = document.getElementById('uiRoot');

const state = createGame();
const renderer = canvas ? createRenderer(canvas) : null;
const ui = uiRoot ? createUI(uiRoot) : null;

let lastTime = performance.now();

function gameLoop(time) {
  const dt = time - lastTime;
  lastTime = time;

  step(state, dt);

  const snap = snapshot(state);
  if (renderer) renderer.render(snap);
  if (ui) ui.renderHUD(snap);

  requestAnimationFrame(gameLoop);
}

if (canvas) {
  requestAnimationFrame(gameLoop);
}

// Expose debug hook for QA automation
window.__rfd = {
  state,
  step,
  snapshot: () => snapshot(state)
};
