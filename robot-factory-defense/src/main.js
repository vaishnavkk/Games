import './style/main.css';
import {
  createGame,
  step,
  snapshot,
  place,
  upgrade,
  sell,
  startWave,
  setSpeed,
  buyUpgrade,
  togglePause
} from './sim/index.js';
import { createRenderer } from './render/index.js';
import { createUI } from './ui/index.js';
import mapData from './data/map.json' with { type: 'json' };

const canvas = document.getElementById('gameCanvas');
const uiRoot = document.getElementById('uiRoot');

let state = createGame();
let renderer = null;
let ui = null;
let gameStarted = false;

function onCanvasClick(e) {
  if (!renderer || !ui) return;
  const cell = renderer.screenToCell(e.clientX, e.clientY);
  if (!cell) {
    ui.clearSelection();
    renderer.setSelectedCell(null);
    renderer.setSelectedTower(null);
    return;
  }

  // Check if a tower is on this cell
  const existingTower = state.towers.find(t => t.col === cell.col && t.row === cell.row);
  if (existingTower) {
    ui.selectTower(existingTower);
    renderer.setSelectedTower(existingTower);
    renderer.setSelectedCell(null);
    return;
  }

  // Check if cell is buildable
  const isBuildable = mapData.buildableCells.some(c => c.col === cell.col && c.row === cell.row);
  if (isBuildable) {
    ui.selectCell(cell);
    renderer.setSelectedCell(cell);
    renderer.setSelectedTower(null);
  } else {
    ui.clearSelection();
    renderer.setSelectedCell(null);
    renderer.setSelectedTower(null);
  }
}

function init() {
  if (canvas) {
    renderer = createRenderer(canvas);
    canvas.addEventListener('click', onCanvasClick);
  }

  if (uiRoot) {
    ui = createUI(uiRoot, {
      onStartWave: () => startWave(state),
      onToggleSpeed: () => setSpeed(state, state.speed === 1 ? 2 : 1),
      onTogglePause: () => togglePause(state),
      onBuild: (cell, type) => {
        const t = place(state, cell, type);
        if (t) {
          ui.clearSelection();
          if (renderer) {
            renderer.setSelectedCell(null);
            renderer.setSelectedTower(null);
          }
        }
      },
      onUpgrade: (towerId) => upgrade(state, towerId),
      onSell: (towerId) => sell(state, towerId),
      onBuyUpgrade: (id) => buyUpgrade(state, id),
      onStartGame: () => {
        gameStarted = true;
      },
      onRetry: () => {
        resetGame();
      },
      onSelectCell: (cell) => {
        if (renderer) renderer.setSelectedCell(cell);
      },
      onSelectTower: (tower) => {
        if (renderer) renderer.setSelectedTower(tower);
      }
    });
  }

  // Resize handling
  function handleResize() {
    if (!canvas || !renderer) return;
    const container = document.getElementById('gameContainer');
    if (!container) return;

    const contW = container.clientWidth || window.innerWidth;
    const contH = container.clientHeight || window.innerHeight;
    const targetAspect = 16 / 9;

    let w = contW;
    let h = contW / targetAspect;

    if (h > contH) {
      h = contH;
      w = contH * targetAspect;
    }

    canvas.style.width = `${Math.floor(w)}px`;
    canvas.style.height = `${Math.floor(h)}px`;
  }

  window.addEventListener('resize', handleResize);
  handleResize();

  // Expose debug hook for QA automation
  window.__rfd = {
    get state() { return state; },
    step: (dt) => step(state, dt),
    snapshot: () => snapshot(state),
    place: (cell, type) => place(state, cell, type),
    upgrade: (towerId) => upgrade(state, towerId),
    sell: (towerId) => sell(state, towerId),
    startWave: () => startWave(state),
    setSpeed: (spd) => setSpeed(state, spd),
    togglePause: () => togglePause(state),
    buyUpgrade: (id) => buyUpgrade(state, id),
    selectCell: (cell) => {
      if (ui) ui.selectCell(cell);
      if (renderer) renderer.setSelectedCell(cell);
    },
    selectTower: (towerId) => {
      const tower = state.towers.find(t => t.id === towerId);
      if (tower) {
        if (ui) ui.selectTower(tower);
        if (renderer) renderer.setSelectedTower(tower);
      }
    },
    resetGame,
    ui,
    renderer
  };
}

function resetGame() {
  state = createGame();
  if (renderer) {
    renderer.setSelectedCell(null);
    renderer.setSelectedTower(null);
  }
  if (ui) {
    ui.clearSelection();
  }
}

let lastTime = performance.now();

function gameLoop(time) {
  const dt = time - lastTime;
  lastTime = time;

  // Advance simulation if game has started
  if (gameStarted) {
    step(state, dt);
  }

  const snap = snapshot(state);
  if (renderer) renderer.render(snap);
  if (ui) ui.renderHUD(snap);

  requestAnimationFrame(gameLoop);
}

init();
if (canvas) {
  requestAnimationFrame(gameLoop);
}
