import fs from 'fs';
import { scanCountry } from './checkCluesStep0.js';

const currentCountries = JSON.parse(fs.readFileSync('./data/countries.json', 'utf8'));
let count = 0;
for (const c of currentCountries) {
  const v = scanCountry(c, currentCountries);
  for (const item of v) {
    count++;
    console.log(`[${count}] [${item.country}] Clue ${item.clueIndex} | [${item.category}] | Matched: "${item.matchedTerm}"`);
    console.log(`    "${item.clueText}"`);
  }
}
