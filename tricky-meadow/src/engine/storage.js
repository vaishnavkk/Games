// Tricky Meadow — Safe LocalStorage Handler with In-Memory Fallback

const STORAGE_KEY = 'tricky-meadow:save_v1';
const STORAGE_PREFIX = 'tricky-meadow:';

let memoryFallback = {
  stars: {}
};

export function sanitizeStarsMap(rawStars) {
  if (!rawStars || typeof rawStars !== 'object' || Array.isArray(rawStars)) {
    return {};
  }
  const clean = {};
  for (const [id, val] of Object.entries(rawStars)) {
    if (typeof val === 'number' && Number.isInteger(val) && val >= 1 && val <= 3) {
      clean[id] = val;
    }
  }
  return clean;
}

export function loadProgress() {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          return {
            stars: sanitizeStarsMap(parsed.stars)
          };
        }
      }
    }
  } catch (e) {
    console.warn('[storage] localStorage read blocked, using memory fallback:', e.message);
  }
  return { stars: sanitizeStarsMap(memoryFallback.stars) };
}

export function saveProgress(progress) {
  const safeData = {
    stars: sanitizeStarsMap(progress?.stars)
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
      const keysToRemove = [];
      if (typeof localStorage.length === 'number') {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith(STORAGE_PREFIX)) {
            keysToRemove.push(k);
          }
        }
      } else {
        keysToRemove.push(STORAGE_KEY);
      }
      for (const k of keysToRemove) {
        localStorage.removeItem(k);
      }
    }
  } catch (e) {
    console.warn('[storage] localStorage reset failed:', e.message);
  }
  return { stars: {} };
}
