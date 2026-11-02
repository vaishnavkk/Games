import fs from 'fs';

const data = JSON.parse(fs.readFileSync('data/countries.json', 'utf8'));

const HARD_PATTERNS = [
  { name: 'border*', regex: /\bborder[a-z]*/i },
  { name: 'neighbo(u)r*', regex: /\bneighbou?r[a-z]*/i },
  { name: 'america*', regex: /\bamerica[a-z]*/i },
  { name: 'counterpart*', regex: /\bcounterpart[a-z]*/i },
  { name: 'cardinal/compass', regex: /\b(north|south|east|west|northeast|northwest|southeast|southwest)(ern|ward|bound|erly)?\b/i },
  { name: 'continent/region', regex: /\b(africa[a-z]*|asia[a-z]*|europe[a-z]*|oceania[a-z]*|antarcti[a-z]*|nordic|scandinav[a-z]*|baltic[a-z]*|balkan[a-z]*|caribbean|mediterranean|middle east[a-z]*|sub-saharan|levant[a-z]*|polynesi[a-z]*|melanesi[a-z]*)\b/i },
  { name: 'ocean/sea', regex: /\b(pacific|atlantic|arctic|caspian|red sea|black sea|persian gulf|arabian sea|coral sea|tasman sea|bering sea|adriatic|aegean)\b/i },
  { name: 'mountains', regex: /\b(andes|andean|himalaya[a-z]*|alps|alpine|pyrenees|pyrenean|appalachia[a-z]*|caucas[a-z]*|urals?|carpathia[a-z]*|karakoram|hindu kush|zagros|ring of fire|great rift valley)\b/i },
  { name: 'hemisphere/equator', regex: /\b(hemisphere|equator(ial)?|tropic of cancer|tropic of capricorn|prime meridian)\b/i }
];

const WARN_PATTERNS = [
  { name: 'ocean', regex: /\boceans?\b/i },
  { name: 'sea', regex: /\bseas?\b/i },
  { name: 'strait', regex: /\bstraits?\b/i },
  { name: 'peninsula', regex: /\bpeninsul(a|ar|as)?\b/i },
  { name: 'landlocked', regex: /\blandlocked\b/i },
  { name: 'island(s)', regex: /\bislands?\b/i },
  { name: 'coast*', regex: /\bcoast[a-z]*/i },
  { name: 'its waters', regex: /\bits waters\b/i }
];

const hardFails = [];
const warnings = [];

for (const c of data) {
  c.clues.forEach((clue, idx) => {
    for (const hp of HARD_PATTERNS) {
      const m = clue.match(hp.regex);
      if (m) {
        hardFails.push({ country: c.name, clueIdx: idx + 1, pattern: hp.name, match: m[0], text: clue });
      }
    }
    for (const wp of WARN_PATTERNS) {
      const m = clue.match(wp.regex);
      if (m) {
        warnings.push({ country: c.name, clueIdx: idx + 1, pattern: wp.name, match: m[0], text: clue });
      }
    }
  });
}

console.log('HARD FAILS FOUND:', hardFails.length);
hardFails.forEach(f => {
  console.log(`[HARD FAIL] ${f.country} (Clue ${f.clueIdx}) [${f.pattern} -> "${f.match}"]: "${f.text}"`);
});

console.log('\nWARNINGS FOUND:', warnings.length);
warnings.forEach(w => {
  console.log(`[WARN] ${w.country} (Clue ${w.clueIdx}) [${w.pattern} -> "${w.match}"]: "${w.text}"`);
});
