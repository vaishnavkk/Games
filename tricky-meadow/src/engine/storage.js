// Tricky Meadow — Safe LocalStorage Handler with In-Memory Fallback

const STORAGE_KEY = 'tricky_meadow_save_v1';

let memoryFallback = {
  stars: {}
};

export function loadProgress() {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          if (!parsed.stars || typeof parsed.stars !== 'object' || Array.isArray(parsed.stars)) {
            parsed.stars = {};
          }
          return {
            stars: parsed.stars
          };
        }
      }
    }
  } catch (e) {
    console.warn('[storage] localStorage read blocked, using memory fallback:', e.message);
  }
  return { stars: { ...memoryFallback.stars } };
}

export function saveProgress(progress) {
  const safeData = {
    stars: progress?.stars || {}
  };
  memoryFallback = { stars: { ...safeData.stars } };

  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(safeData));
    }
  } catch (e) {
    console.warn('[storage] localStorage write blocked, progress kept in memory:', e.message);
  }
}

export function resetProgress() {
  memoryFallback = { stars: {} };
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch (e) {
    console.warn('[storage] localStorage clear failed:', e.message);
  }
  return { stars: {} };
}
