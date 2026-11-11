const KEY = 'geotrivia_seen_v1';
let seen = null;
const load = () => { if (seen) return seen;
  try { seen = JSON.parse(localStorage.getItem(KEY)) || {}; } catch { seen = {}; } return seen; };
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(seen)); } catch {} };
export const resetHistory = () => { seen = {}; save(); };
export const _reload = () => { seen = null; };

// Pick one item not yet seen in `bucket`; when the pool is used up, restart only that bucket.
function drawFresh(bucket, pool, avoid = () => false) {
  const s = new Set(load()[bucket] || []);
  let fresh = pool.filter((x) => !s.has(x.id));
  if (!fresh.length) { s.clear(); fresh = pool.slice(); }
  const good = fresh.filter((x) => !avoid(x));
  const list = good.length ? good : fresh;
  const pick = list[Math.floor(Math.random() * list.length)];
  s.add(pick.id);
  load()[bucket] = [...s];
  return pick;
}

export function buildLibrary(items) {
  const byCountry = {};
  for (const it of items) ((byCountry[it.iso] ??= {})[it.level] ??= []).push(it);
  return { byCountry, size: items.length };
}

// Countries for one game: the whole tier is used before any country comes back.
export function pickCountries(tier, isoList, n) {
  const pool = isoList.map((id) => (typeof id === 'object' && id !== null ? (id.code ? { id: id.code, ...id } : id) : { id })), chosen = new Set(), out = [];
  while (out.length < Math.min(n, pool.length)) {
    const p = drawFresh(`c:${tier}`, pool, (x) => chosen.has(x.id));
    chosen.add(p.id); out.push(p.id);
  }
  save();
  return out;
}

// 3 clues (level 1, 2, 3) for one country: no repeats until its items are exhausted, no two on the same topic.
export function pickClueSet(iso, library) {
  const lib = library && library.byCountry ? library : buildLibrary(library || []);
  const levels = (lib.byCountry && lib.byCountry[iso]) || {}, used = new Set(), topics = new Set(), set = [];
  for (const lv of [1, 2, 3]) {
    let pool = (levels[lv] || []).filter((x) => !used.has(x.id));
    if (!pool.length) pool = [1, 2, 3].flatMap((l) => levels[l] || []).filter((x) => !used.has(x.id));
    if (!pool.length) continue;
    const it = drawFresh(`q:${iso}:${lv}`, pool, (x) => topics.has(x.topic));
    if (it) {
      used.add(it.id); topics.add(it.topic); set.push(it);
    }
  }
  save();
  return set;
}

export const questionBag = {
  buildLibrary,
  pickCountries,
  pickClueSet,
  resetHistory
};

export default questionBag;
