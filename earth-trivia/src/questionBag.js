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
  if (!candidates || candidates.length <= 1) return candidates || [];
  const n = candidates.length;

  function evaluateCycle(p) {
    const n = p.length;
    // Strictly forbid 3 in a row of the same continent circularly
    for (let i = 0; i < n; i++) {
      const c1 = p[i].continent;
      const c2 = p[(i + 1) % n].continent;
      const c3 = p[(i + 2) % n].continent;
      if (c1 !== 'Unknown' && c1 === c2 && c2 === c3) return Infinity;
    }

    let cost = 0;
    for (let i = 0; i < n; i++) {
      const c1 = p[i];
      const c2 = p[(i + 1) % n];
      if (c1.subregion !== 'Unknown' && c1.subregion === c2.subregion) cost += 100000;
      const d = haversineDistanceKm(c1.lat, c1.lon, c2.lat, c2.lon);
      if ((c1.lat !== 0 || c1.lon !== 0) && (c2.lat !== 0 || c2.lon !== 0) && d < 2000) {
        cost += 100 + (2000 - d);
      }
      const c3 = p[(i + 2) % n];
      if (c1.continent !== 'Unknown' && c1.continent === c3.continent && c1.continent !== c2.continent) cost += 50;
    }
    for (let i = 0; i < n; i++) {
      const contCounts = {};
      for (let j = 0; j < 4; j++) {
        const cont = p[(i + j) % n].continent;
        if (cont && cont !== 'Unknown') contCounts[cont] = (contCounts[cont] || 0) + 1;
      }
      for (const cnt of Object.values(contCounts)) {
        if (cnt > 2) cost += 500 * (cnt - 2);
      }
    }
    return cost;
  }

  let best = null;
  let bestCost = Infinity;
  for (let trial = 0; trial < 250; trial++) {
    const p = shuffle([...candidates], customRng);
    const cost = evaluateCycle(p);
    if (cost === 0) { best = p; bestCost = 0; break; }
    if (cost < bestCost) { bestCost = cost; best = p; }
  }

  if (best && bestCost < Infinity) {
    const shift = Math.floor(customRng() * n);
    const ordered = [...best.slice(shift), ...best.slice(0, shift)];
    if (customRng() < 0.5) ordered.reverse();
    return ordered;
  }

  // Fallback: linear search for permutation with no run of 3 from same continent
  for (let trial = 0; trial < 250; trial++) {
    const p = shuffle([...candidates], customRng);
    let run = false;
    for (let i = 0; i < p.length - 2; i++) {
      if (p[i].continent !== 'Unknown' && p[i].continent === p[i + 1].continent && p[i + 1].continent === p[i + 2].continent) {
        run = true;
        break;
      }
    }
    if (!run) return p;
  }
  return candidates;
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

  const CONT_WEIGHTS = {
    'Asia': 1.084,
    'Europe': 1.036,
    'Africa': 1.000,
    'North America': 0.953,
    'South America': 0.951,
    'Oceania': 0.941
  };

  const OTHER_W = { 'Asia': 1.055, 'Africa': 1.000, 'North America': 0.965, 'South America': 0.965, 'Oceania': 0.965 };

  function pickOtherEasy(availOther, count, chosenBefore = []) {
    if (availOther.length <= count) return [...availOther];
    for (let att = 0; att < 50; att++) {
      let p = [...availOther];
      const cand = [];
      while (cand.length < count && p.length > 0) {
        const totalW = p.reduce((sum, c) => sum + (OTHER_W[c.continent] || 1), 0);
        let rand = customRng() * totalW;
        let pickIdx = 0;
        for (let i = 0; i < p.length; i++) {
          rand -= (OTHER_W[p[i].continent] || 1);
          if (rand <= 0) { pickIdx = i; break; }
        }
        cand.push(p.splice(pickIdx, 1)[0]);
      }
      const combined = [...chosenBefore, ...cand];
      const cMap = {};
      combined.forEach(c => cMap[c.continent] = (cMap[c.continent] || 0) + 1);
      if (Object.values(cMap).every(cnt => cnt < 5)) return cand;
    }
    return shuffle(availOther, customRng).slice(0, count);
  }

  function drawFairSubset(available, count) {
    if (available.length <= count) return [...available];
    if (tier === 'easy' && count === 10) {
      const availEuro = available.filter(c => c.continent === 'Europe');
      const availOther = available.filter(c => c.continent !== 'Europe');
      let targetEuro = customRng() < (13 / 21) ? 2 : 3;
      targetEuro = Math.min(targetEuro, availEuro.length);
      targetEuro = Math.max(targetEuro, count - availOther.length);
      targetEuro = Math.min(targetEuro, 4);
      const targetOther = count - targetEuro;
      const chosenE = shuffle(availEuro, customRng).slice(0, targetEuro);
      const chosenO = pickOtherEasy(availOther, targetOther, chosenE);
      return shuffle([...chosenE, ...chosenO], customRng);
    }
    for (let attempt = 0; attempt < 50; attempt++) {
      let pool = [...available];
      const chosen = [];
      while (chosen.length < count && pool.length > 0) {
        const totalW = pool.reduce((sum, c) => sum + (CONT_WEIGHTS[c.continent] || 1), 0);
        let rand = customRng() * totalW;
        let pickIdx = 0;
        for (let i = 0; i < pool.length; i++) {
          rand -= (CONT_WEIGHTS[pool[i].continent] || 1);
          if (rand <= 0) { pickIdx = i; break; }
        }
        chosen.push(pool.splice(pickIdx, 1)[0]);
      }
      const counts = {};
      chosen.forEach(c => counts[c.continent] = (counts[c.continent] || 0) + 1);
      if (Object.values(counts).every(cnt => cnt < 5)) return chosen;
    }
    return shuffle(available, customRng).slice(0, count);
  }

  if (fresh.length >= targetCount) {
    chosen = drawFairSubset(fresh, targetCount);
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
    
    // Draw extra ensuring combined chosen + extra has no continent >= 5
    let extra = null;
    if (tier === 'easy') {
      const euroInChosen = chosen.filter(c => c.continent === 'Europe').length;
      const maxExtraEuro = Math.max(0, 4 - euroInChosen);
      const availEuro = newCycleFresh.filter(c => c.continent === 'Europe');
      const availOther = newCycleFresh.filter(c => c.continent !== 'Europe');
      let targetEuro = customRng() < (13 / 21) ? 2 : 3;
      targetEuro = Math.min(targetEuro, remainingNeeded);
      targetEuro = Math.min(targetEuro, maxExtraEuro);
      targetEuro = Math.max(0, remainingNeeded - availOther.length);
      const targetOther = remainingNeeded - targetEuro;
      const chosenE = shuffle(availEuro, customRng).slice(0, targetEuro);
      const chosenO = pickOtherEasy(availOther, targetOther, [...chosen, ...chosenE]);
      extra = shuffle([...chosenE, ...chosenO], customRng);
    } else {
      for (let attempt = 0; attempt < 50; attempt++) {
        let p = [...newCycleFresh];
        const cand = [];
        while (cand.length < remainingNeeded && p.length > 0) {
          const totalW = p.reduce((sum, c) => sum + (CONT_WEIGHTS[c.continent] || 1), 0);
          let rand = customRng() * totalW;
          let pickIdx = 0;
          for (let i = 0; i < p.length; i++) {
            rand -= (CONT_WEIGHTS[p[i].continent] || 1);
            if (rand <= 0) { pickIdx = i; break; }
          }
          cand.push(p.splice(pickIdx, 1)[0]);
        }
        const combined = [...chosen, ...cand];
        const counts = {};
        combined.forEach(c => counts[c.continent] = (counts[c.continent] || 0) + 1);
        if (Object.values(counts).every(cnt => cnt < 5)) {
          extra = cand;
          break;
        }
      }
    }
    if (!extra) extra = shuffle(newCycleFresh, customRng).slice(0, remainingNeeded);

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
