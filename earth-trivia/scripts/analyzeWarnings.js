import fs from 'fs';

const data = JSON.parse(fs.readFileSync('data/countries.json', 'utf8'));

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

const posWords = /\b(latitude|longitude|meridian|crossroads|border|north|south|east|west|flank|bounded|adjacent)\b/i;

const warnings = [];
for (const c of data) {
  c.clues.forEach((clue, idx) => {
    for (const wp of WARN_PATTERNS) {
      if (wp.regex.test(clue)) {
        const hasPos = posWords.test(clue);
        warnings.push({ country: c.name, clueIdx: idx + 1, pattern: wp.name, hasPos, text: clue });
        break;
      }
    }
  });
}

console.log('Total clues with warnings:', warnings.length);
const posWarnings = warnings.filter(w => w.hasPos);
console.log('Warnings with positional terms:', posWarnings.length);
posWarnings.forEach(w => {
  console.log(`[POS-WARN] ${w.country} (Clue ${w.clueIdx}) [${w.pattern}]: "${w.text}"`);
});
