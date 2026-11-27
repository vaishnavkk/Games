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
  togglePause,
  drainEvents
} from './sim/index.js';
import { createRenderer } from './render/index.js';
import { createUI } from './ui/index.js';
import { findNearestBuildablePad } from './ui/utils.js';
import mapData from './data/map.json' with { type: 'json' };

const canvas = document.getElementById('gameCanvas');
const uiRoot = document.getElementById('uiRoot');

let state = createGame();
let renderer = null;
let ui = null;
let gameStarted = false;
const enemyPosCache = new Map();

function getEnemyCanvasCoords(pos, cellSize) {
  const ex = pos.x <= mapData.grid.cols ? pos.x * cellSize : pos.x;
  const ey = pos.y <= mapData.grid.rows ? pos.y * cellSize : pos.y;
  return { ex, ey };
}

function processEvents(events) {
  if (!renderer || !canvas || !events || events.length === 0) return;
  const cellSize = canvas.width / mapData.grid.cols;

  if (renderer.fx && typeof renderer.fx.handleEvents === 'function') {
    renderer.fx.handleEvents(events, state, cellSize, enemyPosCache);
    return;
  }

  if (!renderer.effects) return;

  for (const ev of events) {
    if (ev.type === 'hit') {
      const tower = state.towers.find(t => t.id === ev.towerId);
      const pos = enemyPosCache.get(ev.enemyId);
      if (tower && pos) {
        const tx = (tower.col + 0.5) * cellSize;
        const ty = (tower.row + 0.5) * cellSize;
        const { ex, ey } = getEnemyCanvasCoords(pos, cellSize);
        if (tower.type === 'arc') {
          renderer.effects.addBeam(tx, ty, ex, ey, '#a55eea', 2.5, 0.15);
          renderer.effects.addSparks(ex, ey, '#d6a2e8', 3);
        } else if (tower.type === 'coolant') {
          renderer.effects.addBeam(tx, ty, ex, ey, '#48dbfb', 2, 0.12);
          renderer.effects.addSparks(ex, ey, '#00d2d3', 3);
        } else if (tower.type === 'rocket') {
          renderer.effects.addExplosion(ex, ey, cellSize * 0.85, '#ff793f', 0.28);
        } else {
          renderer.effects.addBeam(tx, ty, ex, ey, '#00d2d3', 1.8, 0.1);
          renderer.effects.addSparks(ex, ey, '#feca57', 3);
        }
      }
    } else if (ev.type === 'killed') {
      const pos = enemyPosCache.get(ev.enemyId);
      if (pos) {
        const { ex, ey } = getEnemyCanvasCoords(pos, cellSize);
        renderer.effects.addExplosion(ex, ey, cellSize * 0.6, '#feca57', 0.25);
      }
    } else if (ev.type === 'leaked') {
      const cx = (mapData.core.position.col + 0.5) * cellSize;
      const cy = (mapData.core.position.row + 0.5) * cellSize;
      renderer.effects.addExplosion(cx, cy, cellSize * 0.8, '#ff4757', 0.3);
    } else if (ev.type === 'built' && ev.cell) {
      const bx = (ev.cell.col + 0.5) * cellSize;
      const by = (ev.cell.row + 0.5) * cellSize;
      renderer.effects.addSparks(bx, by, '#2ed573', 4);
    } else if (ev.type === 'upgraded') {
      const tower = state.towers.find(t => t.id === ev.towerId);
      if (tower) {
        const ux = (tower.col + 0.5) * cellSize;
        const uy = (tower.row + 0.5) * cellSize;
        renderer.effects.addSparks(ux, uy, '#00d2d3', 5);
      }
    }
  }
}

function onCanvasClick(e) {
  if (!renderer || !ui) return;
  const cell = renderer.screenToCell(e.clientX, e.clientY);
  if (!cell) {
    ui.clearSelection();
    renderer.setSelectedCell(null);
    renderer.setSelectedTower(null);
    renderer.setPreviewTowerType('pulse');
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
    return;
  }

  // Pad snapping: snap within 0.5 * cellSize of an unoccupied buildable pad
  const rect = canvas.getBoundingClientRect();
  let snappedPad = null;
  if (rect.width > 0 && rect.height > 0) {
    const gx = ((e.clientX - rect.left) / rect.width) * mapData.grid.cols;
    const gy = ((e.clientY - rect.top) / rect.height) * mapData.grid.rows;
    snappedPad = findNearestBuildablePad(gx, gy, mapData.buildableCells, state.towers, 0.5);
  }

  if (snappedPad) {
    ui.selectCell(snappedPad);
    renderer.setSelectedCell(snappedPad);
    renderer.setSelectedTower(null);
  } else {
    ui.clearSelection();
    renderer.setSelectedCell(null);
    renderer.setSelectedTower(null);
    renderer.setPreviewTowerType('pulse');
  }
}

function init() {
  if (canvas) {
    renderer = createRenderer(canvas);
    canvas.addEventListener('click', onCanvasClick);
  }

  if (uiRoot) {
    ui = createUI(uiRoot, {
      getUpgradesConfig: () => state.config.upgrades,
      getWavesConfig: () => state.config.waves,
      getEnemiesConfig: () => state.config.enemies,
      onStartWave: () => {
        const prevWave = state.wave;
        const started = startWave(state);
        if (started && state.wave > prevWave && ui) {
          ui.showWaveBanner(state.wave);
        }
        return started;
      },
      onToggleSpeed: () => setSpeed(state, state.speed === 1 ? 2 : 1),
      onTogglePause: () => togglePause(state),
      onBuild: (cell, type) => {
        const t = place(state, cell, type);
        if (t) {
          ui.dismissTips?.();
          ui.clearSelection();
          if (renderer) {
            renderer.setSelectedCell(null);
            renderer.setSelectedTower(null);
            renderer.setPreviewTowerType('pulse');
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
        if (renderer) {
          renderer.setSelectedCell(cell);
          if (!cell) renderer.setPreviewTowerType('pulse');
        }
      },
      onSelectTower: (tower) => {
        if (renderer) renderer.setSelectedTower(tower);
      },
      onPreviewTower: (type) => {
        if (renderer) renderer.setPreviewTowerType(type);
      }
    });

    const canvasStage = document.getElementById('canvasStage');
    if (canvasStage && canvas) {
      canvasStage.appendChild(canvas);
    }
  }

  // Resize handling
  function handleResize() {
    if (!canvas || !renderer) return;
    const stage = document.getElementById('canvasStage') || document.getElementById('gameContainer');
    if (!stage) return;

    const contW = stage.clientWidth || window.innerWidth;
    const contH = stage.clientHeight || window.innerHeight;
    const targetAspect = mapData.grid.cols / mapData.grid.rows;

    let w = contW;
    let h = contW / targetAspect;

    if (h > contH) {
      h = contH;
      w = contH * targetAspect;
    }

    const cssW = Math.max(16, Math.floor(w));
    const cssH = Math.max(9, Math.floor(h));
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    renderer.resize(cssW, cssH, window.devicePixelRatio || 1);
    ui?.syncViewport?.();
  }

  window.addEventListener('resize', handleResize);
  const canvasStage = document.getElementById('canvasStage');
  if (canvasStage && typeof window.ResizeObserver === 'function') {
    const observer = new window.ResizeObserver(() => handleResize());
    observer.observe(canvasStage);
  }
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
    drainEvents: () => drainEvents(state),
    resetGame,
    ui,
    renderer
  };
}

function resetGame() {
  state = createGame();
  drainEvents(state);
  enemyPosCache.clear();
  if (renderer) {
    renderer.setSelectedCell(null);
    renderer.setSelectedTower(null);
    renderer.setPreviewTowerType('pulse');
    renderer.fx?.clear?.();
    renderer.effects?.clear?.();
  }
  if (ui) {
    ui.clearSelection();
    ui.hideWaveBanner?.();
  }
}

let lastTime = performance.now();

function gameLoop(time) {
  const dt = time - lastTime;
  lastTime = time;

  // Advance simulation if game has started
  if (gameStarted) {
    for (const e of state.enemies) {
      enemyPosCache.set(e.id, { x: e.x, y: e.y });
    }
    processEvents(drainEvents(state));
    step(state, dt);
    for (const e of state.enemies) {
      enemyPosCache.set(e.id, { x: e.x, y: e.y });
    }
    processEvents(drainEvents(state));

    const aliveIds = new Set(state.enemies.map(e => e.id));
    for (const id of enemyPosCache.keys()) {
      if (!aliveIds.has(id)) enemyPosCache.delete(id);
    }
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
