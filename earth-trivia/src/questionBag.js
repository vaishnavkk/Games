import { rng, shuffle } from './rng.js';
import { COUNTRIES_DB } from '../data/countries.js';

const KEY = 'geotrivia_seen_v1';
let memoryStore = {};
let seen = null;
let onCycleCompleteHook = null;

export function setOnCycleCompleteHook(fn) {
  onCycleCompleteHook = fn;
}

const load = () => {
  if (seen) return seen;
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) : null;
    seen = raw ? JSON.parse(raw) : memoryStore;
    if (!seen || typeof seen !== 'object') seen = {};
  } catch {
    seen = memoryStore;
  }
  return seen;
};

const save = () => {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(KEY, JSON.stringify(seen || memoryStore));
    }
  } catch {
    memoryStore = seen || memoryStore;
  }
};

export const resetHistory = () => {
  seen = {};
  memoryStore = {};
  save();
};

export const _reload = () => {
  seen = null;
};

export function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

const dbMap = new Map();
if (Array.isArray(COUNTRIES_DB)) {
  for (const c of COUNTRIES_DB) {
    if (c.code) dbMap.set(c.code, c);
    if (c.id) dbMap.set(String(c.id), c);
    if (c.name) dbMap.set(c.name.toLowerCase(), c);
  }
}

function resolveCountry(item) {
  if (typeof item === 'object' && item !== null) {
    const id = item.code || String(item.id || item.name || '');
    const meta = dbMap.get(id) || dbMap.get(item.code) || dbMap.get(String(item.id)) || item;
    return {
      id,
      code: item.code || meta.code || id,
      name: item.name || meta.name || id,
      continent: item.continent || meta.continent || 'Unknown',
      subregion: item.subregion || meta.subregion || 'Unknown',
      lat: (typeof item.lat === 'number') ? item.lat : (typeof meta.lat === 'number' ? meta.lat : 0),
      lon: (typeof item.lon === 'number') ? item.lon : (typeof meta.lon === 'number' ? meta.lon : 0),
      raw: item
    };
  }
  const idStr = String(item);
  const meta = dbMap.get(idStr) || dbMap.get(idStr.toLowerCase());
  if (meta) {
    return {
      id: meta.code || idStr,
      code: meta.code || idStr,
      name: meta.name || idStr,
      continent: meta.continent || 'Unknown',
      subregion: meta.subregion || 'Unknown',
      lat: meta.lat ?? 0,
      lon: meta.lon ?? 0,
      raw: item
    };
  }
  return {
    id: idStr,
    code: idStr,
    name: idStr,
    continent: 'Unknown',
    subregion: 'Unknown',
    lat: 0,
    lon: 0,
    raw: item
  };
}

// Draw fresh item from bucket (for clues and generic items)
function drawFresh(bucket, pool, avoid = () => false, customRng = rng) {
  const storeObj = load();
  const s = new Set(storeObj[bucket] || []);
  let fresh = pool.filter((x) => !s.has(x.id));
  if (!fresh.length) {
    s.clear();
    fresh = pool.slice();
  }
  const good = fresh.filter((x) => !avoid(x));
  const list = good.length ? good : fresh;
  const pick = list[Math.floor(customRng() * list.length)];
  s.add(pick.id);
  storeObj[bucket] = [...s];
  return pick;
}

export function buildLibrary(items) {
  const byCountry = {};
  for (const it of items) ((byCountry[it.iso] ??= {})[it.level] ??= []).push(it);
  return { byCountry, size: items.length };
}

/**
 * Constrained ordering of N candidate countries
 */
export function orderCountriesForGame(candidates, customRng = rng) {
  const remaining = [...candidates];
  const ordered = [];

  while (remaining.length > 0) {
    if (ordered.length === 0) {
      const idx = Math.floor(customRng() * remaining.length);
      ordered.push(remaining.splice(idx, 1)[0]);
      continue;
    }

    const prev = ordered[ordered.length - 1];
    const prev2 = ordered.length >= 2 ? ordered[ordered.length - 2] : null;
    const window3 = ordered.slice(-3);

    const t0 = []; // All constraints satisfied + avoids A-B-A
    const t1 = []; // All constraints satisfied
    const t2 = []; // Relax distance
    const t3 = []; // Relax continent window
    const t4 = []; // Relax subregion

    for (const cand of remaining) {
      const subOK = (cand.subregion === 'Unknown' || prev.subregion === 'Unknown' || cand.subregion !== prev.subregion);
      const contCount = (cand.continent === 'Unknown') ? 0 : window3.filter(w => w.continent === cand.continent).length;
      const contOK = (cand.continent === 'Unknown' || contCount < 2);
      const dist = haversineDistanceKm(cand.lat, cand.lon, prev.lat, prev.lon);
      const distOK = (cand.lat === 0 && cand.lon === 0) || dist >= 2000;
      const abaOK = (!prev2 || cand.continent === 'Unknown' || cand.continent !== prev2.continent);

      if (subOK && contOK && distOK && abaOK) t0.push(cand);
      else if (subOK && contOK && distOK) t1.push(cand);
      else if (subOK && contOK) t2.push(cand);
      else if (subOK) t3.push(cand);
      else t4.push(cand);
    }

    let chosenList = t0;
    if (!chosenList.length) chosenList = t1;
    if (!chosenList.length) chosenList = t2;
    if (!chosenList.length) chosenList = t3;
    if (!chosenList.length) chosenList = t4;

    const pick = chosenList[Math.floor(customRng() * chosenList.length)];
    const idx = remaining.indexOf(pick);
    remaining.splice(idx, 1);
    ordered.push(pick);
  }

  // Reverse 50% of the time for symmetric position fairness across all countries
  if (customRng() < 0.5) {
    ordered.reverse();
  }

  return ordered;
}

/**
 * Pick N countries for a game respecting persistent cycle and ordering constraints
 */
export function pickCountries(tier, rawPool, n, customRng = rng) {
  if (!rawPool || rawPool.length === 0) return [];
  const pool = rawPool.map(resolveCountry);
  const targetCount = Math.min(n, pool.length);

  const bucket = `c:${tier}`;
  const storeObj = load();
  const seenIds = new Set(storeObj[bucket] || []);

  const fresh = pool.filter(c => !seenIds.has(c.id));
  let chosen = [];

  if (fresh.length >= targetCount) {
    // Pick targetCount fresh countries
    const shuffledFresh = shuffle(fresh, customRng);
    chosen = shuffledFresh.slice(0, targetCount);
    for (const c of chosen) seenIds.add(c.id);
    if (seenIds.size === pool.length) {
      if (onCycleCompleteHook) onCycleCompleteHook(Array.from(seenIds), tier);
      seenIds.clear();
    }
  } else {
    // Take all remaining fresh ones
    chosen = [...fresh];
    const completedCycle = [...seenIds, ...fresh.map(c => c.id)];
    if (onCycleCompleteHook) onCycleCompleteHook(completedCycle, tier);
    // Reset cycle
    seenIds.clear();
    const remainingNeeded = targetCount - chosen.length;
    const chosenIds = new Set(chosen.map(c => c.id));
    const newCycleFresh = pool.filter(c => !chosenIds.has(c.id));
    const extra = shuffle(newCycleFresh, customRng).slice(0, remainingNeeded);
    for (const c of extra) seenIds.add(c.id);
    chosen.push(...extra);
  }

  storeObj[bucket] = Array.from(seenIds);
  save();

  // Order countries inside this game
  const ordered = orderCountriesForGame(chosen, customRng);
  return ordered.map(c => (typeof c.raw === 'string' ? c.raw : (c.raw?.code || c.id)));
}

/**
 * Find best position to re-insert a missed country respecting constraints
 */
export function findReinsertIndex(roundQueue, targetCountry, customRng = rng) {
  if (!roundQueue || roundQueue.length === 0) return 0;
  const target = resolveCountry(targetCountry);
  const resolvedQueue = roundQueue.map(resolveCountry);

  const candidates = [];
  // Prefer reinserting at index >= 2 so it doesn't appear immediately next round
  const minIdx = Math.min(2, roundQueue.length);
  const maxIdx = roundQueue.length;

  for (let i = minIdx; i <= maxIdx; i++) {
    const prev = i > 0 ? resolvedQueue[i - 1] : null;
    const next = i < resolvedQueue.length ? resolvedQueue[i] : null;

    const subOKPrev = !prev || prev.subregion === 'Unknown' || target.subregion === 'Unknown' || prev.subregion !== target.subregion;
    const subOKNext = !next || next.subregion === 'Unknown' || target.subregion === 'Unknown' || next.subregion !== target.subregion;
    const subOK = subOKPrev && subOKNext;

    const distOKPrev = !prev || (prev.lat === 0 && prev.lon === 0) || haversineDistanceKm(target.lat, target.lon, prev.lat, prev.lon) >= 2000;
    const distOKNext = !next || (next.lat === 0 && next.lon === 0) || haversineDistanceKm(target.lat, target.lon, next.lat, next.lon) >= 2000;
    const distOK = distOKPrev && distOKNext;

    // Check continent in local window
    const windowStart = Math.max(0, i - 2);
    const windowEnd = Math.min(resolvedQueue.length, i + 2);
    const windowSlice = resolvedQueue.slice(windowStart, windowEnd);
    const contCount = (target.continent === 'Unknown') ? 0 : windowSlice.filter(w => w.continent === target.continent).length;
    const contOK = (target.continent === 'Unknown' || contCount < 2);

    let score = 0;
    if (subOK) score += 4;
    if (contOK) score += 2;
    if (distOK) score += 1;
    candidates.push({ index: i, score });
  }

  const maxScore = Math.max(...candidates.map(c => c.score));
  const best = candidates.filter(c => c.score === maxScore);
  const picked = best[Math.floor(customRng() * best.length)];
  return picked ? picked.index : Math.min(roundQueue.length, 2 + Math.floor(customRng() * 3));
}

// 3 clues (level 1, 2, 3) for one country
export function pickClueSet(iso, library, customRng = rng) {
  const lib = library && library.byCountry ? library : buildLibrary(library || []);
  const levels = (lib.byCountry && lib.byCountry[iso]) || {};
  const used = new Set();
  const topics = new Set();
  const set = [];

  for (const lv of [1, 2, 3]) {
    let pool = (levels[lv] || []).filter((x) => !used.has(x.id));
    if (!pool.length) pool = [1, 2, 3].flatMap((l) => levels[l] || []).filter((x) => !used.has(x.id));
    if (!pool.length) continue;
    const it = drawFresh(`q:${iso}:${lv}`, pool, (x) => topics.has(x.topic), customRng);
    if (it) {
      used.add(it.id);
      topics.add(it.topic);
      set.push(it);
    }
  }
  save();
  return set;
}

export const questionBag = {
  buildLibrary,
  pickCountries,
  pickClueSet,
  resetHistory,
  orderCountriesForGame,
  findReinsertIndex,
  haversineDistanceKm,
  setOnCycleCompleteHook
};

export default questionBag;
