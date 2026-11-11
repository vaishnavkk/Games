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
// Current/incident items must have a year 2000-2026 that appears in the text
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

// 5. Tier-based checks
let tierQuotaViolations = 0;
let currentIncidentPctViolations = 0;

if (chosenTier !== 'none') {
  // Explorer (easy): 5/5/5
  // Navigator-only (medium): 3/3/3
  // Global-only (hard): 2/2/2
  for (const c of countries) {
    const isExplorer = c.tier === 'easy';
    const isNavigatorOnly = c.tier === 'medium';
    const isGlobalOnly = c.tier === 'hard';

    let req = null;
    if ((chosenTier === 'easy' || chosenTier === 'all') && isExplorer) req = [5, 5, 5];
    else if ((chosenTier === 'medium' || chosenTier === 'all') && isNavigatorOnly) req = [3, 3, 3];
    else if ((chosenTier === 'hard' || chosenTier === 'all') && isGlobalOnly) req = [2, 2, 2];

    if (req) {
      const items = cluesByIso.get(c.code) || [];
      const c1 = items.filter(i => Number(i.level) === 1).length;
      const c2 = items.filter(i => Number(i.level) === 2).length;
      const c3 = items.filter(i => Number(i.level) === 3).length;
      if (c1 < req[0] || c2 < req[1] || c3 < req[2]) {
        tierQuotaViolations++;
      }
    }
  }

  // 40% current/incident on level 3 items (enforced only once that tier's content exists)
  const tiersToCheck = chosenTier === 'all' ? ['easy', 'medium', 'hard'] : [chosenTier];
  for (const t of tiersToCheck) {
    const tierCountries = countries.filter(c => c.tier === t);
    const tierIsos = new Set(tierCountries.map(c => c.code));
    const tierL3Items = clues.filter(i => tierIsos.has(i.iso) && Number(i.level) === 3);
    const currentOrIncidentCount = tierL3Items.filter(i => i.kind === 'current' || i.kind === 'incident').length;

    // "enforced once that tier's content exists": if content has current/incident items
    if (tierL3Items.length > tierCountries.length && currentOrIncidentCount > 0) {
      const pct = (currentOrIncidentCount / tierL3Items.length) * 100;
      if (pct < 40) {
        currentIncidentPctViolations++;
      }
    }
  }
}

const hasErrors =
  duplicateIds > 0 ||
  countriesMissingLevels > 0 ||
  jaccardViolations > 0 ||
  invalidCurrentOrIncident > 0 ||
  tierQuotaViolations > 0 ||
  currentIncidentPctViolations > 0;

console.log(`check:library [--tier ${chosenTier}]: ${clues.length} items across ${countries.length} nations.`);
console.log(`Counts: Unique IDs: ${idCounts.size}/${clues.length} (duplicates: ${duplicateIds}), Levels Complete: ${countries.length - countriesMissingLevels}/${countries.length}, Jaccard >0.6: ${jaccardViolations}/${totalPairsChecked}, Current/Incident Valid: ${totalCurrentOrIncident - invalidCurrentOrIncident}/${totalCurrentOrIncident}.`);
if (chosenTier !== 'none') {
  console.log(`Tier Quotas Violations: ${tierQuotaViolations}, Current/Incident <40% Violations: ${currentIncidentPctViolations}.`);
}

if (hasErrors) {
  console.error(`Result: FAILED`);
  process.exit(1);
} else {
  console.log(`Result: PASSED`);
}
