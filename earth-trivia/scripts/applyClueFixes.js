import fs from 'fs';
import path from 'path';

const jsonPath = path.resolve('data/countries.json');
const jsPath = path.resolve('data/countries.js');
const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

// Exact rewrites for all identified hard fails and positional warning clues
const REWRITES = {
  'Chile': {
    clueIdx: 1, // Clue 2 (0-indexed 1)
    newText: "The crystal-clear dry atmosphere of the high Atacama desert plateaus hosts the world's most powerful optical telescope observatories."
  },
  'Ecuador': {
    clueIdx: 0, // Clue 1
    newText: "Named directly after the mathematical zero-degree latitude line that bisects its sovereign territory."
  },
  'Finland': {
    clueIdx: 2, // Clue 3
    newText: "Famous for dark bitter salty licorice candies, rye crust rice pies, and expansive boreal reindeer wilderness."
  },
  'Pakistan': {
    clueIdx: 1, // Clue 2
    newText: "Features the second-highest mountain peak on Earth, towering over glaciated alpine valleys."
  },
  'Bangladesh': {
    clueIdx: 0, // Clue 1
    newText: "Formed across the vast fertile delta of three mighty river systems emptying into tidal mangrove estuaries."
  },
  'Burundi': {
    clueIdx: 0, // Clue 1
    newText: "Framed along its shoreline by one of the deepest and longest ancient freshwater rift lakes on planet Earth."
  },
  'Cameroon': {
    clueIdx: 1, // Clue 2
    newText: "Home to Mount Fako, an active volcanic giant and the highest peak in its coastal landmass, which last erupted in 2000."
  },
  'Central African Republic': {
    clueIdx: 1, // Clue 2
    newText: "Dzanga Bai, a renowned forest clearing, attracts hundreds of rare forest elephants to lick essential mineral salts."
  },
  'Niger': {
    clueIdx: 0, // Clue 1
    newText: "A vast territory named after the great crescent river that flows through its capital city."
  },
  'Saint Kitts and Nevis': [
    {
      clueIdx: 0, // Clue 1
      newText: "A twin-island sovereign nation comprising two verdant volcanic peaks separated by a shallow three-kilometer channel."
    },
    {
      clueIdx: 1, // Clue 2
      newText: "Features the massive 17th-century Brimstone Hill volcanic stone fortress, engineered as a monumental hillside citadel."
    }
  ],
  'Sudan': {
    clueIdx: 0, // Clue 1
    newText: "Preserves more than two hundred steep-sided ancient royal funerary pyramids built by the Kingdom of Kush at Meroë."
  },
  'Suriname': {
    clueIdx: 0, // Clue 1
    newText: "The only sovereign state on its continental landmass where Nederlands serves as the official administrative and educational language."
  },
  'Benin': {
    clueIdx: 1, // Clue 2
    newText: "Lake Nokoué preserves the historic stilt village of Ganvié, where tens of thousands reside in wooden dwellings above the water."
  },
  'Dominican Republic': {
    clueIdx: 1, // Clue 2
    newText: "Its historic colonial zone in Santo Domingo features the oldest continuously inhabited colonial cathedral founded in the early 1500s."
  },
  'Paraguay': {
    clueIdx: 1, // Clue 2
    newText: "Jointly operates the monumental Itaipu Dam on the Paraná River, verified as one of the largest hydroelectric clean energy generators on Earth."
  },
  'Zimbabwe': {
    clueIdx: 2, // Clue 3
    newText: "Famous for the thunderous spray of Victoria Falls known locally as Mosi-oa-Tunya, and hearty sadza maize meal."
  },
  'São Tomé and Príncipe': {
    clueIdx: 0, // Clue 1
    newText: "A lush volcanic two-island nation famous for Obo National Park's dramatic volcanic plug needle rising over dense cloud forests."
  },
  'Fiji': {
    clueIdx: 0, // Clue 1
    newText: "An archipelago of over 300 volcanic islands famous for the traditional kava ceremonial drink prepared from crushed yaqona roots."
  }
};

let appliedCount = 0;
for (const [countryName, fix] of Object.entries(REWRITES)) {
  const country = data.find(c => c.name.toLowerCase() === countryName.toLowerCase());
  if (!country) {
    console.warn('Country not found:', countryName);
    continue;
  }
  if (Array.isArray(fix)) {
    for (const subFix of fix) {
      console.log(`Rewriting ${countryName} Clue ${subFix.clueIdx + 1}:`);
      console.log(`  OLD: "${country.clues[subFix.clueIdx]}"`);
      console.log(`  NEW: "${subFix.newText}"`);
      country.clues[subFix.clueIdx] = subFix.newText;
      appliedCount++;
    }
  } else {
    console.log(`Rewriting ${countryName} Clue ${fix.clueIdx + 1}:`);
    console.log(`  OLD: "${country.clues[fix.clueIdx]}"`);
    console.log(`  NEW: "${fix.newText}"`);
    country.clues[fix.clueIdx] = fix.newText;
    appliedCount++;
  }
}

// Reword the 5 audited facts in countries.json
const FACT_UPDATES = {
  'Norway': 'Its Government Pension Fund Global surpassed 17 trillion kroner in assets in 2024, funded by petroleum revenue.',
  'Kenya': 'Generates over 45% of its total annual electricity generation from geothermal power plants in the Great Rift Valley.',
  'Chile': 'Accounts for roughly 34% of global mined lithium production and holds 9.3 million metric tons of identified lithium reserves according to USGS (2024).',
  'China': 'The Forbidden City imperial palace complex contains 980 surviving buildings with an estimated 8,886 architectural room bays, traditionally mythologized as 9,999 rooms.',
  'New Zealand': 'Became the first self-governing country in the world to grant all adult women the right to vote in national parliamentary elections in 1893.'
};

for (const [countryName, newFact] of Object.entries(FACT_UPDATES)) {
  const country = data.find(c => c.name.toLowerCase() === countryName.toLowerCase());
  if (country) {
    if (!country.memoryAnchors) country.memoryAnchors = [];
    console.log(`Updating Fact for ${countryName}: "${newFact}"`);
    country.memoryAnchors[0] = newFact;
  }
}

// Write back formatted JSON and JS
fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2) + '\n', 'utf8');
const jsContent = `export const COUNTRIES_DB = ${JSON.stringify(data, null, 2)};\n`;
fs.writeFileSync(jsPath, jsContent, 'utf8');

console.log(`\nSuccessfully applied ${appliedCount} clue rewrites and 5 fact updates.`);
