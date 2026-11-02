import fs from 'fs';

const data = JSON.parse(fs.readFileSync('data/countries.json', 'utf8'));

// Seeded random sample of 20 countries
function shuffle(array) {
  let m = array.length, t, i;
  while (m) {
    i = Math.floor(Math.random() * m--);
    t = array[m];
    array[m] = array[i];
    array[i] = t;
  }
  return array;
}

const sampled = shuffle([...data]).slice(0, 20);

console.log('================================================================================');
console.log('                     20 UNEDITED SAMPLE CLUE SETS (STEP 3)                      ');
console.log('================================================================================\n');

sampled.forEach((c, idx) => {
  console.log(`${idx + 1}. ${c.name} (${c.code}) - Capital: ${c.capital} [Tier: ${c.tier}]`);
  console.log(`   • Clue 1: "${c.clues[0]}"`);
  console.log(`   • Clue 2: "${c.clues[1]}"`);
  console.log(`   • Clue 3: "${c.clues[2]}"`);
  console.log(`   • Source: ${c.sourceUrl}\n`);
});
