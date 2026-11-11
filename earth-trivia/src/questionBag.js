// Question Bag Engine: Non-repeating Country Drawer and Clue Set Picker with Persistent History
// Supports localStorage with fallback to memory when storage is blocked (e.g. SecurityError)

const STORAGE_PREFIX = 'geotrivia_';
const memoryFallback = new Map();

/**
 * Safe localStorage wrapper that catches SecurityError or storage disabled exceptions
 */
function getStorageItem(key) {
  try {
    const storage = (typeof window !== 'undefined' && window.localStorage) ||
                    (typeof globalThis !== 'undefined' && globalThis.localStorage);
    if (storage) {
      const val = storage.getItem(key);
      if (val !== null && val !== undefined) return val;
    }
  } catch (err) {
    // Fall back to memory storage on blocked localStorage
  }
  return memoryFallback.get(key) || null;
}

function setStorageItem(key, value) {
  try {
    const storage = (typeof window !== 'undefined' && window.localStorage) ||
                    (typeof globalThis !== 'undefined' && globalThis.localStorage);
    if (storage) {
      storage.setItem(key, value);
    }
  } catch (err) {
    // Fall back to memory storage on blocked localStorage
  }
  memoryFallback.set(key, value);
}

function removeStorageItem(key) {
  try {
    const storage = (typeof window !== 'undefined' && window.localStorage) ||
                    (typeof globalThis !== 'undefined' && globalThis.localStorage);
    if (storage) {
      storage.removeItem(key);
    }
  } catch (err) {}
  memoryFallback.delete(key);
}

function clearStoragePrefix(prefix) {
  try {
    const storage = (typeof window !== 'undefined' && window.localStorage) ||
                    (typeof globalThis !== 'undefined' && globalThis.localStorage);
    if (storage) {
      const toRemove = [];
      for (let i = 0; i < storage.length; i++) {
        const k = storage.key(i);
        if (k && k.startsWith(prefix)) {
          toRemove.push(k);
        }
      }
      toRemove.forEach(k => storage.removeItem(k));
    }
  } catch (err) {}
  for (const k of Array.from(memoryFallback.keys())) {
    if (k.startsWith(prefix)) {
      memoryFallback.delete(k);
    }
  }
}

/**
 * Fisher-Yates array shuffle helper
 */
function shuffleArray(arr) {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Extract ISO string from either a string or an object with code/iso/id
 */
function getIsoCode(item) {
  if (!item) return '';
  if (typeof item === 'string') return item;
  return item.code || item.iso || item.id || item.name || '';
}

/**
 * Pick `n` countries from `isoList` for given `tier` without repeats across runs
 * until all countries in the tier have appeared once.
 * 
 * @param {string} tier - Difficulty tier identifier (e.g. 'easy', 'medium', 'hard', 'all')
 * @param {Array<string|object>} isoList - Available countries or ISO strings
 * @param {number} n - Number of countries to draw
 * @returns {Array<string|object>} Picked countries (matching input format)
 */
export function pickCountries(tier, isoList, n = 10) {
  if (!isoList || isoList.length === 0) return [];
  if (n <= 0) return [];

  const tierKey = `${STORAGE_PREFIX}seen_countries_${tier || 'default'}`;
  let seenArray = [];
  try {
    const raw = getStorageItem(tierKey);
    if (raw) seenArray = JSON.parse(raw);
  } catch (e) {
    seenArray = [];
  }

  const seenSet = new Set(seenArray);
  const isInputObjects = typeof isoList[0] === 'object' && isoList[0] !== null;

  // Build lookup map for objects if needed
  const itemMap = new Map();
  const allIsos = [];
  for (const item of isoList) {
    const iso = getIsoCode(item);
    if (!itemMap.has(iso)) {
      itemMap.set(iso, item);
      allIsos.push(iso);
    }
  }

  let unseenIsos = allIsos.filter(iso => !seenSet.has(iso));

  // If all countries in the tier have been seen, reset the seen set for a new cycle
  if (unseenIsos.length === 0) {
    seenSet.clear();
    unseenIsos = [...allIsos];
  }

  const pickedIsos = [];

  if (unseenIsos.length >= n) {
    // Draw n items from unseen
    const shuffledUnseen = shuffleArray(unseenIsos);
    for (let i = 0; i < n; i++) {
      const chosen = shuffledUnseen[i];
      pickedIsos.push(chosen);
      seenSet.add(chosen);
    }
  } else {
    // Draw all remaining unseen items first
    const shuffledUnseen = shuffleArray(unseenIsos);
    pickedIsos.push(...shuffledUnseen);
    shuffledUnseen.forEach(iso => seenSet.add(iso));

    const remainingNeeded = n - pickedIsos.length;
    // Reset pool for the next cycle
    seenSet.clear();

    // From the refreshed pool, exclude the ones we just picked in this draw to avoid duplicates within this batch
    const refreshedCandidates = allIsos.filter(iso => !pickedIsos.includes(iso));
    const shuffledRefreshed = shuffleArray(refreshedCandidates.length > 0 ? refreshedCandidates : allIsos);

    const extraCount = Math.min(remainingNeeded, shuffledRefreshed.length);
    for (let i = 0; i < extraCount; i++) {
      const chosen = shuffledRefreshed[i];
      pickedIsos.push(chosen);
      seenSet.add(chosen);
    }
  }

  // If all countries have now been seen, we can clear seenSet so next draw starts fresh cycle
  if (seenSet.size >= allIsos.length) {
    seenSet.clear();
  }

  // Persist updated seen history
  setStorageItem(tierKey, JSON.stringify(Array.from(seenSet)));

  // Return formatted array matching input type
  if (isInputObjects) {
    return pickedIsos.map(iso => itemMap.get(iso)).filter(Boolean);
  }
  return pickedIsos;
}

/**
 * Group library items for a given country ISO into 3-clue sets (levels 1, 2, 3)
 */
function buildClueSets(items) {
  const l1 = items.filter(i => Number(i.level) === 1).sort((a, b) => (a.id || '').localeCompare(b.id || ''));
  const l2 = items.filter(i => Number(i.level) === 2).sort((a, b) => (a.id || '').localeCompare(b.id || ''));
  const l3 = items.filter(i => Number(i.level) === 3).sort((a, b) => (a.id || '').localeCompare(b.id || ''));

  const count = Math.max(l1.length, l2.length, l3.length);
  const sets = [];

  for (let i = 0; i < count; i++) {
    const item1 = l1[i % (l1.length || 1)] || null;
    const item2 = l2[i % (l2.length || 1)] || null;
    const item3 = l3[i % (l3.length || 1)] || null;

    const clueSet = [item1, item2, item3].filter(Boolean);
    clueSet.sort((a, b) => Number(a.level) - Number(b.level));

    const setId = `set_${i}_${clueSet.map(c => c.id).join('_')}`;
    sets.push({ setId, clues: clueSet, clueIds: clueSet.map(c => c.id) });
  }

  return sets;
}

/**
 * Pick a clue set for a given country ISO without repeats until all sets have been seen.
 * When countries are re-queued in the learning loop, picks a DIFFERENT clue set if one exists.
 * 
 * @param {string} iso - 3-letter country ISO code
 * @param {Array<object>} library - Clue items library (or clues.json)
 * @param {object} [options] - Options: { excludeClueIds: Array<string> }
 * @returns {Array<object>} Clue set array of 3 items in level order [L1, L2, L3]
 */
export function pickClueSet(iso, library = [], options = {}) {
  const cleanIso = getIsoCode(iso);
  const countryItems = library.filter(item => getIsoCode(item) === cleanIso);

  if (countryItems.length === 0) {
    return [];
  }

  const allSets = buildClueSets(countryItems);
  if (allSets.length === 0) return [];

  const clueStorageKey = `${STORAGE_PREFIX}seen_clues_${cleanIso}`;
  let seenSetIds = [];
  try {
    const raw = getStorageItem(clueStorageKey);
    if (raw) seenSetIds = JSON.parse(raw);
  } catch (e) {
    seenSetIds = [];
  }

  const seenSet = new Set(seenSetIds);
  const excludeIds = new Set(options.excludeClueIds || []);

  // Filter available sets: unseen in current cycle
  let availableSets = allSets.filter(s => !seenSet.has(s.setId));

  // If a learning-loop exclusion was requested and other sets exist, filter out excluded
  if (excludeIds.size > 0 && allSets.length > 1) {
    const withoutExcluded = availableSets.filter(s => !s.clueIds.some(id => excludeIds.has(id)));
    if (withoutExcluded.length > 0) {
      availableSets = withoutExcluded;
    }
  }

  // If all sets have been seen in this cycle, reset seen set
  if (availableSets.length === 0) {
    seenSet.clear();
    availableSets = [...allSets];

    // Again respect learning loop exclusion if possible
    if (excludeIds.size > 0 && allSets.length > 1) {
      const withoutExcluded = availableSets.filter(s => !s.clueIds.some(id => excludeIds.has(id)));
      if (withoutExcluded.length > 0) {
        availableSets = withoutExcluded;
      }
    }
  }

  // Pick the first available set (or next in line)
  const chosenSet = availableSets[0];
  seenSet.add(chosenSet.setId);

  // If all sets have now been seen, reset seenSet so next draw starts a fresh cycle
  if (seenSet.size >= allSets.length) {
    seenSet.clear();
  }

  // Persist seen sets
  setStorageItem(clueStorageKey, JSON.stringify(Array.from(seenSet)));

  // Return the clues sorted in level order
  return [...chosenSet.clues].sort((a, b) => Number(a.level) - Number(b.level));
}

/**
 * Reset all question and country history from storage
 */
export function resetHistory() {
  clearStoragePrefix(STORAGE_PREFIX);
}

export const questionBag = {
  pickCountries,
  pickClueSet,
  resetHistory
};

export default questionBag;
