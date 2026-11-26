/**
 * LocalStorage handler with rfd: prefix and graceful error handling.
 */
const STORAGE_PREFIX = 'rfd:';

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

function clampNonNegativeInt(val) {
  return typeof val === 'number' && Number.isFinite(val) ? Math.max(0, Math.floor(val)) : 0;
}

export function getBestWave() {
  return clampNonNegativeInt(getStoredData('best_wave', 0));
}

export function updateBestWave(wave) {
  const current = getBestWave();
  if (typeof wave !== 'number' || !Number.isFinite(wave)) return current;
  const safeWave = Math.max(0, Math.floor(wave));
  if (safeWave > current) {
    setStoredData('best_wave', safeWave);
    return safeWave;
  }
  return current;
}

export function getWins() {
  return clampNonNegativeInt(getStoredData('wins', 0));
}

export function incrementWins() {
  const current = getWins();
  const next = current + 1;
  setStoredData('wins', next);
  return next;
}
