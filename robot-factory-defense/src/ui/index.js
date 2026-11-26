import {
  getStoredData,
  setStoredData,
  getBestWave,
  updateBestWave,
  getWins,
  incrementWins
} from './storage.js';
import { createHUD } from './hud.js';
import { createBuildBar } from './buildBar.js';
import { createInspectCard } from './inspectCard.js';
import { createWorkshopModal } from './workshopModal.js';
import { createScreens } from './screens.js';
import { createTipsBanner } from './tips.js';

export {
  getStoredData,
  setStoredData,
  getBestWave,
  updateBestWave,
  getWins,
  incrementWins
};

/**
 * Main UI Controller for Robot Factory Defense
 */
export function createUI(container, callbacks = {}) {
  let selectedCell = null;
  let selectedTower = null;
  let recordedEndGame = false;

  const playArea = document.createElement('div');
  playArea.className = 'play-area';
  playArea.id = 'playArea';

  const canvasStage = document.createElement('div');
  canvasStage.className = 'canvas-stage';
  canvasStage.id = 'canvasStage';

  // Sub-components
  const hud = createHUD({
    onStartWave: () => callbacks.onStartWave && callbacks.onStartWave(),
    onToggleSpeed: () => callbacks.onToggleSpeed && callbacks.onToggleSpeed(),
    onTogglePause: () => callbacks.onTogglePause && callbacks.onTogglePause(),
    onOpenWorkshop: () => workshop.show()
  });

  const tipsBanner = createTipsBanner();

  const buildBar = createBuildBar({
    getUpgradesConfig: callbacks.getUpgradesConfig,
    onPreviewTower: (type) => callbacks.onPreviewTower && callbacks.onPreviewTower(type),
    onBuildTower: (type) => {
      if (selectedCell && callbacks.onBuild) {
        callbacks.onBuild(selectedCell, type);
      }
    },
    onCancel: () => clearSelection()
  });

  const inspectCard = createInspectCard({
    getUpgradesConfig: callbacks.getUpgradesConfig,
    onUpgradeTower: (towerId) => callbacks.onUpgrade && callbacks.onUpgrade(towerId),
    onSellTower: (towerId) => {
      if (callbacks.onSell) {
        callbacks.onSell(towerId);
        clearSelection();
      }
    },
    onClose: () => clearSelection()
  });

  playArea.appendChild(canvasStage);
  playArea.appendChild(inspectCard.element);

  const backgroundNodes = [hud.element, tipsBanner.element, playArea, buildBar.element];

  function syncBackgroundInert() {
    const titleVisible = screens.titleScreen.style.display !== 'none';
    const endVisible = screens.endScreen.style.display !== 'none';
    const isModalOpen = titleVisible || endVisible || workshop.isOpen();
    for (const node of backgroundNodes) {
      node.inert = isModalOpen;
      if (isModalOpen) {
        node.setAttribute('aria-hidden', 'true');
      } else {
        node.removeAttribute('aria-hidden');
      }
    }
  }

  const workshop = createWorkshopModal({
    onBuyUpgrade: (id) => callbacks.onBuyUpgrade && callbacks.onBuyUpgrade(id),
    onClose: () => workshop.hide(),
    onVisibilityChange: () => syncBackgroundInert()
  });

  const screens = createScreens({
    onScreenChange: () => syncBackgroundInert(),
    onStartGame: () => {
      if (callbacks.onStartGame) callbacks.onStartGame();
    },
    onRetry: () => {
      recordedEndGame = false;
      clearSelection();
      if (callbacks.onRetry) callbacks.onRetry();
    }
  });

  // Assemble DOM tree
  if (container) {
    container.innerHTML = '';
    container.appendChild(hud.element);
    container.appendChild(tipsBanner.element);
    container.appendChild(playArea);
    container.appendChild(buildBar.element);
    container.appendChild(workshop.element);
    container.appendChild(screens.titleScreen);
    container.appendChild(screens.endScreen);
  }

  syncBackgroundInert();

  function clearSelection() {
    selectedCell = null;
    selectedTower = null;
    buildBar.hide();
    inspectCard.hide();
    if (callbacks.onSelectCell) callbacks.onSelectCell(null);
    if (callbacks.onSelectTower) callbacks.onSelectTower(null);
  }

  function selectCell(cell) {
    selectedTower = null;
    inspectCard.hide();
    selectedCell = cell;
    if (callbacks.onSelectCell) callbacks.onSelectCell(cell);
  }

  function selectTower(tower) {
    selectedCell = null;
    buildBar.hide();
    selectedTower = tower;
    if (callbacks.onSelectTower) callbacks.onSelectTower(tower);
  }

  function renderHUD(snap) {
    if (!snap) return;

    // Update HUD
    hud.update(snap);

    // Track best wave
    if (snap.wave > 0) {
      updateBestWave(snap.wave);
    }

    // Check Win/Loss screens
    if (snap.waveState === 'won' && !recordedEndGame) {
      recordedEndGame = true;
      incrementWins();
      updateBestWave(snap.wave);
      if (workshop.isOpen()) workshop.hide();
      screens.showVictory(snap);
      clearSelection();
    } else if (snap.waveState === 'lost' && !recordedEndGame) {
      recordedEndGame = true;
      updateBestWave(snap.wave);
      if (workshop.isOpen()) workshop.hide();
      screens.showDefeat(snap);
      clearSelection();
    }

    // Update build bar if active
    if (selectedCell) {
      buildBar.update(snap, selectedCell);
    }

    // Update inspect card if active
    if (selectedTower) {
      const liveTower = snap.towers.find(t => t.id === selectedTower.id);
      if (liveTower) {
        inspectCard.update(snap, liveTower);
      } else {
        clearSelection();
      }
    }

    // Update workshop modal if open
    if (workshop.isOpen()) {
      workshop.update(snap);
    }
  }

  return {
    renderHUD,
    selectCell,
    selectTower,
    clearSelection,
    callbacks
  };
}
