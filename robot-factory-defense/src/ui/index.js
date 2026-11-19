/**
 * DOM UI Controller & Storage Handler for Robot Factory Defense
 */
const STORAGE_PREFIX = 'rfd:';

export function getStoredData(key, fallback = null) {
  try {
    const val = localStorage.getItem(STORAGE_PREFIX + key);
    return val !== null ? JSON.parse(val) : fallback;
  } catch (_e) {
    return fallback;
  }
}

export function setStoredData(key, value) {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch (_e) {
    // Graceful fallback for quota / private browsing exceptions
  }
}

export function createUI(container, callbacks = {}) {
  let selectedCell = null;

  function renderHUD(_snapshot) {
    // HUD update logic
    if (!container) return;
  }

  return {
    renderHUD,
    getSelectedCell: () => selectedCell,
    selectCell: (cell) => { selectedCell = cell; },
    callbacks
  };
}
