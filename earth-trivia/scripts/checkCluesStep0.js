import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const jsonPath = path.resolve(__dirname, '../data/countries.json');
const countries = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

// ═══════════════════════════════════════════════════════════════
// 1. HARD FAIL PATTERNS (Word Boundaries & Stems)
// ═══════════════════════════════════════════════════════════════

const HARD_PATTERNS = [
  { name: 'border*', regex: /\bborder[a-z]*\b/i },
  { name: 'neighbo(u)r*', regex: /\bneighbou?r[a-z]*\b/i },
  { name: 'america*', regex: /\bamerica[a-z]*\b/i },
  { name: 'counterpart*', regex: /\bcounterpart[a-z]*\b/i },
  {
    name: 'cardinal/compass (-ern forms)',
    regex: /\b(north|south|east|west|northeast|northwest|southeast|southwest)(ern|ward|bound|erly|wards)?\b/i
  },
  {
    name: 'continents & regions',
    regex: /\b(africa|african|asia|asian|europe|european|oceania|oceanian|australasia|australasian|antarctica|antarctic|nordic|scandinavia|scandinavian|baltic|balt|balkan|balkans|caribbean|mediterranean|middle east|sub-saharan|levant|levantine|polynesia|polynesian|melanesia|melanesian|micronesia|micronesian|latin america|latin american)\b/i
  },
  {
    name: 'oceans & specific seas',
    regex: /\b(pacific|atlantic|indian ocean|arctic|southern ocean|baltic sea|north sea|red sea|black sea|caspian|caribbean sea|arabian sea|coral sea|tasman sea|bering sea|south china sea|east china sea|yellow sea|sea of japan|persian gulf|gulf of mexico|adriatic|aegean|ionian sea|tyrrhenian sea)\b/i
  },
  {
    name: 'mountain ranges & geological structures',
    regex: /\b(andes|andean|himalaya|himalayas|himalayan|alps|alpine|rockies|rocky mountains|pyrenees|pyrenean|appalachian|appalachians|caucasus|caucasian|atlas mountains|urals?|ural mountains|carpathians?|carpathian|karakoram|hindu kush|zagros|altai|drakensberg|ring of fire|great rift valley|pamir|tian shan)\b/i
  },
  {
    name: 'hemispheres & global parallels',
    regex: /\b(hemisphere|equator\b|equatorial|tropic of cancer|tropic of capricorn|prime meridian)\b/i
  }
];

// Temporal forbidden words
const TEMPORAL_PATTERN = {
  name: 'temporal (recent/recently/currently/now/today)',
  regex: /\b(recent|recently|currently|now|today)\b/i
};

// All sovereign nation names and demonyms (excluding the country's own name and demonym)
const SOVEREIGN_CATALOG = countries.map(c => ({
  name: c.name,
  code: c.code,
  demonym: c.demonym || c.name
}));

// ═══════════════════════════════════════════════════════════════
// 2. WARNING PATTERNS (Geographical Features)
// ═══════════════════════════════════════════════════════════════

const WARN_PATTERNS = [
  { name: 'ocean', regex: /\boceans?\b/i },
  { name: 'sea', regex: /\bseas?\b/i },
  { name: 'strait', regex: /\bstraits?\b/i },
  { name: 'peninsula', regex: /\bpeninsul(a|ar|as)?\b/i },
  { name: 'landlocked', regex: /\blandlocked\b/i },
  { name: 'island(s)', regex: /\bislands?\b/i },
  { name: 'coast*', regex: /\bcoast[a-z]*\b/i },
  { name: 'its waters', regex: /\bits waters\b/i }
];

// Run Scan
const hardFails = [];
let warningCount = 0;
let wordCountValid = 0;
let totalClues = 0;

countries.forEach(country => {
  const ownNameRegex = new RegExp(`\\b${country.name.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i');
  const ownCapRegex = country.capital ? new RegExp(`\\b${country.capital.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i') : null;
  const ownDemRegex = country.demonym ? new RegExp(`\\b${country.demonym.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i') : null;

  country.clues.forEach((clue, idx) => {
    totalClues++;
    const clueNum = idx + 1;

    // Check Word Count (12 - 30 words)
    const words = clue.trim().split(/\s+/).length;
    if (words < 12 || words > 30) {
      hardFails.push({
        country: country.name,
        clueNum,
        type: `word count (${words} words; must be 12-30)`,
        match: `${words} words`,
        clueText: clue
      });
    } else {
      wordCountValid++;
    }

    // Check Country's Own Name
    if (ownNameRegex.test(clue)) {
      hardFails.push({
        country: country.name,
        clueNum,
        type: 'own country name mention',
        match: country.name,
        clueText: clue
      });
    }

    // Check Country's Capital
    if (ownCapRegex && ownCapRegex.test(clue)) {
      hardFails.push({
        country: country.name,
        clueNum,
        type: 'capital mention',
        match: country.capital,
        clueText: clue
      });
    }

    // Check Country's Demonym
    if (ownDemRegex && ownDemRegex.test(clue)) {
      hardFails.push({
        country: country.name,
        clueNum,
        type: 'demonym mention',
        match: country.demonym,
        clueText: clue
      });
    }

    // Check Temporal Words (recent/recently/currently/now/today)
    const tempMatch = clue.match(TEMPORAL_PATTERN.regex);
    if (tempMatch) {
      hardFails.push({
        country: country.name,
        clueNum,
        type: TEMPORAL_PATTERN.name,
        match: tempMatch[0],
        clueText: clue
      });
    }

    // Check Hard Patterns
    for (const hp of HARD_PATTERNS) {
      const match = clue.match(hp.regex);
      if (match) {
        hardFails.push({
          country: country.name,
          clueNum,
          type: hp.name,
          match: match[0],
          clueText: clue
        });
      }
    }

    // Check Sovereign Cross-Mentions
    for (const other of SOVEREIGN_CATALOG) {
      if (other.name.toLowerCase() === country.name.toLowerCase()) continue;
      const escName = other.name.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
      const otherRegex = new RegExp(`\\b${escName}\\b`, 'i');
      const m = clue.match(otherRegex);
      if (m) {
        if (country.name.toLowerCase().includes(other.name.toLowerCase())) continue;
        hardFails.push({
          country: country.name,
          clueNum,
          type: 'other sovereign country name',
          match: m[0],
          clueText: clue
        });
      }
    }

    // Check Warning Patterns
    for (const wp of WARN_PATTERNS) {
      const match = clue.match(wp.regex);
      if (match) {
        warningCount++;
      }
    }
  });
});

// Schema and landmark duplication check
let schemaErrors = 0;
const landmarkMap = new Map();
countries.forEach(c => {
  if (!c.name || !c.capital || !c.clues || c.clues.length !== 3 || !c.landmark || !c.cultureFood || !c.memoryAnchors || c.memoryAnchors.length < 2 || !c.sourceUrl) {
    schemaErrors++;
  }
  const lk = c.landmark.toLowerCase().trim();
  if (landmarkMap.has(lk)) {
    schemaErrors++;
  } else {
    landmarkMap.set(lk, c.name);
  }
});

// Print Counts Only
console.log(`check:clues: ${totalClues} clues checked across ${countries.length} sovereign nations.`);
console.log(`Counts: Hard Fails: ${hardFails.length}, Warnings: ${warningCount}, Word Count [12-30] Valid: ${wordCountValid}/${totalClues}, Schema Errors: ${schemaErrors}.`);

if (hardFails.length > 0 || schemaErrors > 0) {
  if (hardFails.length > 0) {
    console.error('Hard Fail Samples:');
    hardFails.slice(0, 5).forEach(f => {
      console.error(`  [${f.country} Clue ${f.clueNum}] ${f.type} -> "${f.match}"`);
    });
  }
  console.error(`Result: FAILED`);
  process.exit(1);
} else {
  console.log(`Result: PASSED`);
}
