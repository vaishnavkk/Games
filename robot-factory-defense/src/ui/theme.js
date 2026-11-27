import { THEME_IDS, THEME_LABELS, normalizeThemeId, setActiveTheme } from '../render/palette.js';

export const THEME_STORAGE_KEY = 'rfd:theme';

const listeners = new Set();

export function getSavedTheme() {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(THEME_STORAGE_KEY);
      if (raw) return normalizeThemeId(raw);
    }
  } catch (_e) {
    // Fallback gracefully on SecurityError / unavailable storage
  }
  return 'neon';
}

export function saveTheme(themeId) {
  const id = normalizeThemeId(themeId);
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(THEME_STORAGE_KEY, id);
    }
  } catch (_e) {
    // Ignore QuotaExceededError / SecurityError
  }
  return id;
}

export function applyTheme(themeId) {
  const id = saveTheme(themeId);
  setActiveTheme(id);
  if (typeof document !== 'undefined' && document.documentElement) {
    document.documentElement.setAttribute('data-theme', id);
  }
  for (const fn of listeners) {
    try {
      fn(id);
    } catch (_e) {
      // Ignore listener errors
    }
  }
  return id;
}

export function subscribeTheme(fn) {
  if (typeof fn === 'function') listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * Create an accessible Theme Picker (<select> >= 48px) synchronized across UI locations.
 */
export function createThemePicker(idPrefix = 'theme') {
  const wrap = document.createElement('label');
  wrap.className = 'theme-picker';
  wrap.setAttribute('for', `${idPrefix}Select`);

  const label = document.createElement('span');
  label.className = 'theme-picker-label';
  label.textContent = 'THEME';

  const select = document.createElement('select');
  select.className = 'interactive theme-select';
  select.id = `${idPrefix}Select`;
  select.setAttribute('data-testid', `${idPrefix}-theme-select`);
  select.setAttribute('aria-label', 'Color Theme');

  for (const id of THEME_IDS) {
    const opt = document.createElement('option');
    opt.value = id;
    opt.textContent = THEME_LABELS[id];
    select.appendChild(opt);
  }

  select.value = getSavedTheme();
  select.addEventListener('change', (e) => {
    applyTheme(e.target.value);
  });

  subscribeTheme((newId) => {
    if (select.value !== newId) select.value = newId;
  });

  wrap.appendChild(label);
  wrap.appendChild(select);
  return wrap;
}
