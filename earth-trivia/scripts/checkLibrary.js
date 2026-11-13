import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const cluesPath = path.resolve(__dirname, '../data/clues.json');
const countriesPath = path.resolve(__dirname, '../data/countries.json');

const clues = JSON.parse(fs.readFileSync(cluesPath, 'utf8'));
const countries = JSON.parse(fs.readFileSync(countriesPath, 'utf8'));

// Parse CLI flag: --tier easy|medium|hard|all|none
let chosenTier = 'none';
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--tier' && args[i + 1]) {
    chosenTier = args[i + 1].toLowerCase();
    i++;
  } else if (args[i].startsWith('--tier=')) {
    chosenTier = args[i].split('=')[1].toLowerCase();
  }
}

// Build country metadata map
const countryByIso = new Map();
countries.forEach(c => {
  countryByIso.set(c.code, c);
});

// 1. ID Uniqueness
const idCounts = new Map();
let duplicateIds = 0;
for (const item of clues) {
  const count = (idCounts.get(item.id) || 0) + 1;
  idCounts.set(item.id, count);
  if (count === 2) duplicateIds++;
}

// 2. All 3 levels per country
const countryLevels = new Map();
for (const item of clues) {
  if (!countryLevels.has(item.iso)) {
    countryLevels.set(item.iso, new Set());
  }
  countryLevels.get(item.iso).add(Number(item.level));
}

let countriesMissingLevels = 0;
for (const c of countries) {
  const levels = countryLevels.get(c.code);
  if (!levels || !levels.has(1) || !levels.has(2) || !levels.has(3)) {
    countriesMissingLevels++;
  }
}

// 3. Jaccard word overlap > 0.6 for any two items of one country
function getWordSet(text) {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .trim()
      .split(/\s+/)
      .filter(w => w.length > 0)
  );
}

function jaccard(setA, setB) {
  let intersection = 0;
  for (const w of setA) {
    if (setB.has(w)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

const cluesByIso = new Map();
for (const item of clues) {
  if (!cluesByIso.has(item.iso)) {
    cluesByIso.set(item.iso, []);
  }
  cluesByIso.get(item.iso).push(item);
}

let jaccardViolations = 0;
let totalPairsChecked = 0;
for (const [iso, items] of cluesByIso.entries()) {
  const wordSets = items.map(it => getWordSet(it.text));
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      totalPairsChecked++;
      const sim = jaccard(wordSets[i], wordSets[j]);
      if (sim > 0.6) {
        jaccardViolations++;
      }
    }
  }
}

// 4. Current / Incident year requirement
let invalidCurrentOrIncident = 0;
let totalCurrentOrIncident = 0;

for (const item of clues) {
  if (item.kind === 'current' || item.kind === 'incident') {
    totalCurrentOrIncident++;
    const y = Number(item.year);
    if (!y || y < 2000 || y > 2026) {
      invalidCurrentOrIncident++;
    } else if (!item.text.includes(String(y))) {
      invalidCurrentOrIncident++;
    }
  }
}

// 5. Tier Targets:
// Easy (Explorer): 15 = 5/5/5
// Medium (Navigator-only): 9 = 3/3/3
// Hard (Global-only): 6 = 2/2/2
const TIER_DEFS = {
  easy: { name: 'Easy', target: [5, 5, 5], totalTarget: 15, key: 'easy' },
  medium: { name: 'Navigator-only (Medium)', target: [3, 3, 3], totalTarget: 9, key: 'medium' },
  hard: { name: 'Global-only (Hard)', target: [2, 2, 2], totalTarget: 6, key: 'hard' }
};

function evaluateTier(tierKey) {
  const def = TIER_DEFS[tierKey];
  const tierCountries = countries.filter(c => c.tier === def.key);
  let belowTargetCount = 0;
  let totalShortage = 0;
  const counts = [];

  for (const c of tierCountries) {
    const items = cluesByIso.get(c.code) || [];
    const c1 = items.filter(i => Number(i.level) === 1).length;
    const c2 = items.filter(i => Number(i.level) === 2).length;
    const c3 = items.filter(i => Number(i.level) === 3).length;
    counts.push(items.length);

    const s1 = Math.max(0, def.target[0] - c1);
    const s2 = Math.max(0, def.target[1] - c2);
    const s3 = Math.max(0, def.target[2] - c3);
    const s = s1 + s2 + s3;
    if (s > 0) {
      belowTargetCount++;
      totalShortage += s;
    }
  }

  const min = counts.length > 0 ? Math.min(...counts) : 0;
  const max = counts.length > 0 ? Math.max(...counts) : 0;
  const avg = counts.length > 0 ? (counts.reduce((a, b) => a + b, 0) / counts.length).toFixed(1) : '0.0';

  return {
    tierKey,
    name: def.name,
    min,
    avg,
    max,
    totalCountries: tierCountries.length,
    belowTargetCount,
    totalShortage
  };
}

const tierStats = {
  easy: evaluateTier('easy'),
  medium: evaluateTier('medium'),
  hard: evaluateTier('hard')
};

console.log(`check:library [--tier ${chosenTier}]: ${clues.length} items across ${countries.length} nations.`);
console.log(`Counts: Unique IDs: ${idCounts.size}/${clues.length} (duplicates: ${duplicateIds}), Levels Complete: ${countries.length - countriesMissingLevels}/${countries.length}, Jaccard >0.6: ${jaccardViolations}/${totalPairsChecked}, Current/Incident Valid: ${totalCurrentOrIncident - invalidCurrentOrIncident}/${totalCurrentOrIncident}.`);

// Print per tier items per country (min/avg/max), countries below target, and total shortage
for (const t of ['easy', 'medium', 'hard']) {
  const s = tierStats[t];
  console.log(`  Tier [${s.name}]: items/country: min=${s.min}, avg=${s.avg}, max=${s.max} | Below target: ${s.belowTargetCount}/${s.totalCountries} | Total shortage: ${s.totalShortage} clues`);
}

// Fails only when tier is requested
let requestedTierFailure = false;
if (chosenTier !== 'none') {
  const tiersToCheck = chosenTier === 'all' ? ['easy', 'medium', 'hard'] : [chosenTier];
  for (const t of tiersToCheck) {
    const s = tierStats[t];
    if (s && s.totalShortage > 0) {
      requestedTierFailure = true;
      console.error(`  [FAIL] Requested tier "${t}" has shortage of ${s.totalShortage} clues (${s.belowTargetCount} countries below target).`);
    }
  }
}

const hasErrors =
  duplicateIds > 0 ||
  countriesMissingLevels > 0 ||
  jaccardViolations > 0 ||
  invalidCurrentOrIncident > 0 ||
  requestedTierFailure;

if (hasErrors) {
  console.error(`Result: FAILED`);
  process.exit(1);
} else {
  console.log(`Result: PASSED`);
}
