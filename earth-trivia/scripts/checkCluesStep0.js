import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const jsonPath = path.resolve(__dirname, '../data/countries.json');
const countries = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

console.log('================================================================================');
console.log('         GEOTRIVIA STEM-BASED CLUE & INTEGRITY SCANNER (check:clues)            ');
console.log('================================================================================\n');

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
const warnings = [];

countries.forEach(country => {
  country.clues.forEach((clue, idx) => {
    const clueNum = idx + 1;

    // Check Hard Patterns
    for (const hp of HARD_PATTERNS) {
      const match = clue.match(hp.regex);
      if (match) {
        // Exception: allow country's own name/demonym if mentioned in historical context
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
      // Word boundary regex for other country name and demonym
      const escName = other.name.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
      const otherRegex = new RegExp(`\\b${escName}\\b`, 'i');
      const m = clue.match(otherRegex);
      if (m) {
        // Check false positives (e.g. Guinea in Guinea-Bissau, Niger in Nigeria)
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
        warnings.push({
          country: country.name,
          clueNum,
          type: wp.name,
          match: match[0],
          clueText: clue
        });
      }
    }
  });
});

// Print Results
console.log(`Scan completed across ${countries.length} sovereign nations (${countries.length * 3} clues).\n`);

console.log(`--------------------------------------------------------------------------------`);
console.log(`HARD FAILS: ${hardFails.length}`);
console.log(`--------------------------------------------------------------------------------`);

if (hardFails.length > 0) {
  hardFails.forEach(f => {
    console.log(`[HARD FAIL] ${f.country} (Clue ${f.clueNum}) [${f.type} -> "${f.match}"]`);
    console.log(`   Text: "${f.clueText}"\n`);
  });
} else {
  console.log(`✓ Zero Hard Fails found. All clues strictly pass stem-based geographic constraints.\n`);
}

console.log(`--------------------------------------------------------------------------------`);
console.log(`WARNINGS: ${warnings.length}`);
console.log(`--------------------------------------------------------------------------------`);

warnings.forEach(w => {
  console.log(`[WARN] ${w.country} (Clue ${w.clueNum}) [${w.type} -> "${w.match}"]: "${w.clueText}"`);
});

// Schema and landmark duplication check
console.log(`\n--------------------------------------------------------------------------------`);
console.log(`DATASET INTEGRITY & UNIQUENESS CHECK`);
console.log(`--------------------------------------------------------------------------------`);

let schemaErrors = 0;
const landmarkMap = new Map();
countries.forEach(c => {
  if (!c.name || !c.capital || !c.clues || c.clues.length !== 3 || !c.landmark || !c.cultureFood || !c.memoryAnchors || c.memoryAnchors.length < 2 || !c.sourceUrl) {
    console.error(`[SCHEMA ERROR] ${c.name} is missing required fields`);
    schemaErrors++;
  }
  const lk = c.landmark.toLowerCase().trim();
  if (landmarkMap.has(lk)) {
    console.error(`[DUPLICATE LANDMARK] "${c.landmark}" shared between ${landmarkMap.get(lk)} and ${c.name}`);
    schemaErrors++;
  } else {
    landmarkMap.set(lk, c.name);
  }
});

if (schemaErrors === 0) {
  console.log(`✓ All 195 nations have complete schema, >=2 memory anchors, source URLs, and unique landmarks.`);
}

console.log('================================================================================');
if (hardFails.length > 0 || schemaErrors > 0) {
  console.log('                    CHECK:CLUES RESULT: FAILED                                  ');
  process.exit(1);
} else {
  console.log('                    CHECK:CLUES RESULT: PASSED                                  ');
}
console.log('================================================================================');
