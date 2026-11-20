/**
 * LocalStorage handler with rfd: prefix and graceful error handling.
 */
export const STORAGE_PREFIX = 'rfd:';

export function getStoredData(key, fallback = null) {
  try {
    if (typeof localStorage === 'undefined') return fallback;
    const val = localStorage.getItem(STORAGE_PREFIX + key);
    return val !== null ? JSON.parse(val) : fallback;
  } catch (_e) {
    return fallback;
  }
}

export function setStoredData(key, value) {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch (_e) {
    // Graceful fallback for quota / disabled storage / security exceptions
  }
}

export function getBestWave() {
  const val = getStoredData('best_wave', 0);
  return typeof val === 'number' && !isNaN(val) ? val : 0;
}

export function updateBestWave(wave) {
  const current = getBestWave();
  if (wave > current) {
    setStoredData('best_wave', wave);
    return wave;
  }
  return current;
}

export function getWins() {
  const val = getStoredData('wins', 0);
  return typeof val === 'number' && !isNaN(val) ? val : 0;
}

export function incrementWins() {
  const current = getWins();
  const next = current + 1;
  setStoredData('wins', next);
  return next;
}
