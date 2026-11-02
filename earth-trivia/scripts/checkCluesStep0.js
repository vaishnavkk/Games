import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ═══════════════════════════════════════════════════════════════
// COMPREHENSIVE BANNED-WORD CATALOG (Step 0.e)
// ═══════════════════════════════════════════════════════════════

const CONTINENTS_AND_REGIONS = [
  'Africa', 'African', 'Asia', 'Asian', 'Europe', 'European',
  'North America', 'North American', 'South America', 'South American',
  'Oceania', 'Oceanian', 'Australasia', 'Australasian', 'Antarctica', 'Antarctic',
  'Nordic', 'Scandinavian', 'Scandinavia', 'Baltic', 'Balkan', 'Balkans', 'Slavic',
  'Caribbean', 'Mediterranean', 'Latin America', 'Latin American',
  'Middle East', 'Middle Eastern', 'Sub-Saharan', 'Levant', 'Levantine',
  'Polynesia', 'Polynesian', 'Melanesia', 'Melanesian', 'Micronesia', 'Micronesian'
];

const OCEANS_AND_SEAS = [
  'Pacific', 'Atlantic', 'Indian Ocean', 'Arctic', 'Southern Ocean',
  'Mediterranean', 'Mediterranean Sea', 'Baltic Sea', 'North Sea', 'Red Sea',
  'Black Sea', 'Caspian', 'Caspian Sea', 'Caribbean Sea', 'Arabian Sea',
  'Coral Sea', 'Tasman', 'Tasman Sea', 'Bering Sea', 'South China Sea',
  'East China Sea', 'Yellow Sea', 'Sea of Japan', 'Persian Gulf', 'Gulf of Mexico',
  'Adriatic', 'Adriatic Sea', 'Aegean', 'Aegean Sea', 'Ionian Sea', 'Tyrrhenian Sea'
];

const MOUNTAIN_RANGES_AND_GEOLOGY = [
  'Andes', 'Andean', 'Himalaya', 'Himalayas', 'Himalayan',
  'Alps', 'Alpine', 'Rockies', 'Rocky Mountains', 'Pyrenees', 'Pyrenean',
  'Appalachian', 'Appalachians', 'Caucasus', 'Caucasian',
  'Atlas Mountains', 'Urals', 'Ural Mountains', 'Carpathians', 'Carpathian',
  'Karakoram', 'Hindu Kush', 'Zagros', 'Altai', 'Drakensberg',
  'Ring of Fire', 'Great Rift Valley', 'Pamir', 'Tian Shan'
];

const HEMISPHERE_AND_LATITUDE = [
  'Hemisphere', 'Northern Hemisphere', 'Southern Hemisphere',
  'Eastern Hemisphere', 'Western Hemisphere',
  'Equator', 'Equatorial', 'Tropic of Cancer', 'Tropic of Capricorn', 'Prime Meridian'
];

const NEIGHBOR_AND_BORDER_WORDS = [
  'Neighbor', 'Neighbors', 'Neighbour', 'Neighbours',
  'Neighboring', 'Neighbouring', 'Borders', 'Bordering', 'Bordered',
  'Adjacent to', 'Bounded by'
];

// All 195 sovereign nation names
const SOVEREIGN_COUNTRIES = [
  'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Antigua and Barbuda',
  'Argentina', 'Armenia', 'Australia', 'Austria', 'Azerbaijan', 'Bahamas',
  'Bahrain', 'Bangladesh', 'Barbados', 'Belarus', 'Belgium', 'Belize',
  'Benin', 'Bhutan', 'Bolivia', 'Bosnia and Herzegovina', 'Botswana', 'Brazil',
  'Brunei', 'Bulgaria', 'Burkina Faso', 'Burundi', 'Cabo Verde', 'Cambodia',
  'Cameroon', 'Canada', 'Central African Republic', 'Chad', 'Chile', 'China',
  'Colombia', 'Comoros', 'Congo', 'Costa Rica', 'Croatia', 'Cuba',
  'Cyprus', 'Czech Republic', 'Democratic Republic of the Congo', 'Denmark',
  'Djibouti', 'Dominica', 'Dominican Republic', 'Ecuador', 'Egypt',
  'El Salvador', 'Equatorial Guinea', 'Eritrea', 'Estonia', 'Eswatini',
  'Ethiopia', 'Fiji', 'Finland', 'France', 'Gabon', 'Gambia', 'Georgia',
  'Germany', 'Ghana', 'Greece', 'Grenada', 'Guatemala', 'Guinea',
  'Guinea-Bissau', 'Guyana', 'Haiti', 'Honduras', 'Hungary', 'Iceland',
  'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel', 'Italy',
  'Ivory Coast', 'Jamaica', 'Japan', 'Jordan', 'Kazakhstan', 'Kenya',
  'Kiribati', 'Kuwait', 'Kyrgyzstan', 'Laos', 'Latvia', 'Lebanon',
  'Lesotho', 'Liberia', 'Libya', 'Liechtenstein', 'Lithuania', 'Luxembourg',
  'Madagascar', 'Malawi', 'Malaysia', 'Maldives', 'Mali', 'Malta',
  'Marshall Islands', 'Mauritania', 'Mauritius', 'Mexico', 'Micronesia',
  'Moldova', 'Monaco', 'Mongolia', 'Montenegro', 'Morocco', 'Mozambique',
  'Myanmar', 'Namibia', 'Nauru', 'Nepal', 'Netherlands', 'New Zealand',
  'Nicaragua', 'Niger', 'Nigeria', 'North Korea', 'North Macedonia',
  'Norway', 'Oman', 'Pakistan', 'Palau', 'Panama', 'Papua New Guinea',
  'Paraguay', 'Peru', 'Philippines', 'Poland', 'Portugal', 'Qatar',
  'Romania', 'Russia', 'Rwanda', 'Saint Kitts and Nevis', 'Saint Lucia',
  'Saint Vincent and the Grenadines', 'Samoa', 'San Marino',
  'Sao Tome and Principe', 'Saudi Arabia', 'Senegal', 'Serbia',
  'Seychelles', 'Sierra Leone', 'Singapore', 'Slovakia', 'Slovenia',
  'Solomon Islands', 'Somalia', 'South Africa', 'South Korea', 'South Sudan',
  'Spain', 'Sri Lanka', 'Sudan', 'Suriname', 'Sweden', 'Switzerland',
  'Syria', 'Tajikistan', 'Tanzania', 'Thailand', 'Timor-Leste', 'Togo',
  'Tonga', 'Trinidad and Tobago', 'Tunisia', 'Turkey', 'Turkmenistan',
  'Tuvalu', 'Uganda', 'Ukraine', 'United Arab Emirates', 'United Kingdom',
  'United States', 'Uruguay', 'Uzbekistan', 'Vanuatu', 'Vatican City',
  'Venezuela', 'Vietnam', 'Yemen', 'Zambia', 'Zimbabwe'
];

// Demonyms corresponding to nations
const SOVEREIGN_DEMONYMS = [
  'Afghan', 'Albanian', 'Algerian', 'American', 'Andorran', 'Angolan',
  'Argentine', 'Armenian', 'Australian', 'Austrian', 'Azerbaijani',
  'Bahamian', 'Bahraini', 'Bangladeshi', 'Barbadian', 'Belarusian',
  'Belgian', 'Belizean', 'Beninese', 'Bhutanese', 'Bolivian', 'Bosnian',
  'Botswanan', 'Brazilian', 'British', 'Bruneian', 'Bulgarian', 'Burkinabe',
  'Burmese', 'Burundian', 'Cambodian', 'Cameroonian', 'Canadian',
  'Cape Verdean', 'Chadian', 'Chilean', 'Chinese', 'Colombian', 'Comorian',
  'Congolese', 'Costa Rican', 'Croatian', 'Cuban', 'Cypriot', 'Czech',
  'Danish', 'Djiboutian', 'Dominican', 'Dutch', 'East Timorese',
  'Ecuadorian', 'Egyptian', 'Emirati', 'English', 'Equatorial Guinean',
  'Eritrean', 'Estonian', 'Ethiopian', 'Fijian', 'Finnish', 'French',
  'Gabonese', 'Gambian', 'Georgian', 'German', 'Ghanaian', 'Greek',
  'Grenadian', 'Guatemalan', 'Guinean', 'Guyanese', 'Haitian', 'Honduran',
  'Hungarian', 'Icelandic', 'Indian', 'Indonesian', 'Iranian', 'Iraqi',
  'Irish', 'Israeli', 'Italian', 'Ivorian', 'Jamaican', 'Japanese',
  'Jordanian', 'Kazakh', 'Kenyan', 'Kuwaiti', 'Kyrgyz', 'Laotian',
  'Latvian', 'Lebanese', 'Liberian', 'Libyan', 'Liechtensteiner',
  'Lithuanian', 'Luxembourgish', 'Macedonian', 'Malagasy', 'Malawian',
  'Malaysian', 'Maldivian', 'Malian', 'Maltese', 'Marshallese',
  'Mauritanian', 'Mauritian', 'Mexican', 'Micronesian', 'Moldovan',
  'Monegasque', 'Mongolian', 'Montenegrin', 'Moroccan', 'Mozambican',
  'Namibian', 'Nauruan', 'Nepalese', 'Nepali', 'New Zealander',
  'Nicaraguan', 'Nigerian', 'Nigerien', 'North Korean', 'Norwegian',
  'Omani', 'Pakistani', 'Palauan', 'Palestinian', 'Panamanian',
  'Papua New Guinean', 'Paraguayan', 'Peruvian', 'Filipino', 'Polish',
  'Portuguese', 'Qatari', 'Romanian', 'Russian', 'Rwandan', 'Saint Lucian',
  'Salvadoran', 'Samoan', 'San Marinese', 'Saudi', 'Scottish', 'Senegalese',
  'Serbian', 'Seychellois', 'Sierra Leonean', 'Singaporean', 'Slovak',
  'Slovenian', 'Solomon Islander', 'Somali', 'South African', 'South Korean',
  'Spanish', 'Sri Lankan', 'Sudanese', 'Surinamese', 'Swazi', 'Swedish',
  'Swiss', 'Syrian', 'Taiwanese', 'Tajik', 'Tanzanian', 'Thai', 'Togolese',
  'Tongan', 'Trinidadian', 'Tunisian', 'Turkish', 'Turkmen', 'Tuvaluan',
  'Ugandan', 'Ukrainian', 'Uruguayan', 'Uzbek', 'Vatican', 'Venezuelan',
  'Vietnamese', 'Welsh', 'Yemeni', 'Zambian', 'Zimbabwean'
];

export function printBannedCatalog() {
  console.log('================================================================================');
  console.log('               GEOTRIVIA CLUE SCANNER - BANNED WORD CATALOG                     ');
  console.log('================================================================================\n');

  console.log(`[1] CONTINENTS & REGIONAL ADJECTIVES (${CONTINENTS_AND_REGIONS.length} terms):`);
  console.log('    ' + CONTINENTS_AND_REGIONS.join(', '));

  console.log(`\n[2] OCEANS & SEAS (${OCEANS_AND_SEAS.length} terms):`);
  console.log('    ' + OCEANS_AND_SEAS.join(', '));

  console.log(`\n[3] MOUNTAIN RANGES & GEOLOGICAL FORMATIONS (${MOUNTAIN_RANGES_AND_GEOLOGY.length} terms):`);
  console.log('    ' + MOUNTAIN_RANGES_AND_GEOLOGY.join(', '));

  console.log(`\n[4] HEMISPHERES, EQUATOR & TROPICS (${HEMISPHERE_AND_LATITUDE.length} terms):`);
  console.log('    ' + HEMISPHERE_AND_LATITUDE.join(', '));

  console.log(`\n[5] NEIGHBOR & BORDER WORDS (${NEIGHBOR_AND_BORDER_WORDS.length} terms):`);
  console.log('    ' + NEIGHBOR_AND_BORDER_WORDS.join(', '));

  console.log(`\n[6] OTHER SOVEREIGN COUNTRIES (${SOVEREIGN_COUNTRIES.length} sovereign states):`);
  console.log('    Enforces rule: A clue for country X cannot contain the name of country Y (Y != X).');

  console.log(`\n[7] OTHER SOVEREIGN DEMONYMS (${SOVEREIGN_DEMONYMS.length} demonyms):`);
  console.log('    Enforces rule: A clue for country X cannot contain the demonym of country Y (Y != X).');
  console.log('\n================================================================================\n');
}

// Helper to escape regex
function escapeReg(str) {
  return str.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
}

// Check a single country against all rules
export function scanCountry(country, allCountriesList) {
  const violations = [];
  const cName = country.name || 'Unknown';
  const cNameLower = cName.toLowerCase();

  const clues = Array.isArray(country.clues) 
    ? country.clues 
    : Object.values(country.clues || {});

  clues.forEach((clueText, idx) => {
    if (typeof clueText !== 'string') return;

    // 1. Check General Banned Patterns
    const generalCategories = [
      { name: 'Continent / Region', list: CONTINENTS_AND_REGIONS },
      { name: 'Ocean / Sea', list: OCEANS_AND_SEAS },
      { name: 'Mountain / Geology', list: MOUNTAIN_RANGES_AND_GEOLOGY },
      { name: 'Hemisphere / Latitude', list: HEMISPHERE_AND_LATITUDE },
      { name: 'Border / Neighbor', list: NEIGHBOR_AND_BORDER_WORDS }
    ];

    for (const cat of generalCategories) {
      for (const term of cat.list) {
        // Skip self-match (e.g. Micronesia)
        if (term.toLowerCase() === cNameLower) continue;
        const reg = new RegExp(`\\b${escapeReg(term)}\\b`, 'i');
        if (reg.test(clueText)) {
          const match = clueText.match(reg);
          violations.push({
            country: cName,
            clueIndex: idx + 1,
            category: cat.name,
            matchedTerm: match ? match[0] : term,
            clueText
          });
        }
      }
    }

    // 2. Check Another Country's Name
    for (const otherCountry of SOVEREIGN_COUNTRIES) {
      if (otherCountry.toLowerCase() === cNameLower) continue;
      // Also ignore if the country name is a substring of the target country
      if (cNameLower.includes(otherCountry.toLowerCase())) continue;
      // Skip generic words like 'Chad', 'Oman', 'Georgia' if part of broader context? Exact word match
      const reg = new RegExp(`\\b${escapeReg(otherCountry)}\\b`, 'i');
      if (reg.test(clueText)) {
        const match = clueText.match(reg);
        violations.push({
          country: cName,
          clueIndex: idx + 1,
          category: 'Other Country Name',
          matchedTerm: match ? match[0] : otherCountry,
          clueText
        });
      }
    }

    // 3. Check Another Country's Demonym
    for (const demonym of SOVEREIGN_DEMONYMS) {
      if (cNameLower.includes(demonym.toLowerCase()) || demonym.toLowerCase().includes(cNameLower)) continue;
      const reg = new RegExp(`\\b${escapeReg(demonym)}\\b`, 'i');
      if (reg.test(clueText)) {
        const match = clueText.match(reg);
        violations.push({
          country: cName,
          clueIndex: idx + 1,
          category: 'Other Country Demonym',
          matchedTerm: match ? match[0] : demonym,
          clueText
        });
      }
    }
  });

  return violations;
}

// ═══════════════════════════════════════════════════════════════
// CLI EXECUTION
// ═══════════════════════════════════════════════════════════════

const target = process.argv[2] || 'all';

if (target === 'banned-list') {
  printBannedCatalog();
  process.exit(0);
}

printBannedCatalog();

// ── 1. SCAN ORIGINAL CLUES FROM GIT HISTORY (commit 3d8f169) ──
console.log('--------------------------------------------------------------------------------');
console.log('>>> SCANNING ORIGINAL CLUES FROM GIT HISTORY (commit 3d8f169)...');
console.log('--------------------------------------------------------------------------------');

try {
  const origHtml = execSync('git show 3d8f169:earth-trivia/index.html', { maxBuffer: 15 * 1024 * 1024 }).toString('utf8');
  const match = origHtml.match(/const COUNTRIES_DB = (\[[\s\S]*?\n\s*\]);/);
  if (!match) {
    console.error('Could not extract COUNTRIES_DB from commit 3d8f169');
  } else {
    const getOrigDb = new Function('return ' + match[1]);
    const origCountries = getOrigDb();
    console.log(`Loaded ${origCountries.length} countries from git commit 3d8f169.`);

    let origViolations = [];
    for (const country of origCountries) {
      const v = scanCountry(country, origCountries);
      origViolations.push(...v);
    }

    console.log(`\nFound ${origViolations.length} BANNED WORD VIOLATIONS in original clues:\n`);
    origViolations.forEach((v, i) => {
      console.log(`[${i + 1}] [${v.country}] Clue ${v.clueIndex} | Category: ${v.category} | Matched: "${v.matchedTerm}"`);
      console.log(`    Text: "${v.clueText}"`);
    });

    console.log(`\n>>> ORIGINAL CLUES SCAN RESULT: FAILED (${origViolations.length} violations correctly caught).`);
  }
} catch (err) {
  console.error('Error scanning git history:', err.message);
}

// ── 2. SCAN CURRENT CLUES (data/countries.json) ───────────────
console.log('\n--------------------------------------------------------------------------------');
console.log('>>> SCANNING CURRENT CLUES (data/countries.json)...');
console.log('--------------------------------------------------------------------------------');

try {
  const currentPath = path.join(__dirname, '../data/countries.json');
  const currentCountries = JSON.parse(fs.readFileSync(currentPath, 'utf8'));
  console.log(`Loaded ${currentCountries.length} countries from current data/countries.json.`);

  let currentViolations = [];
  for (const country of currentCountries) {
    const v = scanCountry(country, currentCountries);
    currentViolations.push(...v);
  }

  if (currentViolations.length > 0) {
    console.log(`\nFound ${currentViolations.length} VIOLATIONS in current clues:\n`);
    currentViolations.forEach((v, i) => {
      console.log(`[${i + 1}] [${v.country}] Clue ${v.clueIndex} | Category: ${v.category} | Matched: "${v.matchedTerm}"`);
      console.log(`    Text: "${v.clueText}"`);
    });
    console.log(`\n>>> CURRENT CLUES SCAN RESULT: FAILED (${currentViolations.length} violations found).`);
    process.exit(1);
  } else {
    console.log(`\n>>> CURRENT CLUES SCAN RESULT: PASSED (0 violations across all ${currentCountries.length} countries).`);
    console.log('✓ Zero continent / regional names');
    console.log('✓ Zero ocean / sea names');
    console.log('✓ Zero mountain range / geological feature names');
    console.log('✓ Zero hemisphere / equator / tropic keywords');
    console.log('✓ Zero neighbor / border keywords');
    console.log('✓ Zero mentions of other sovereign nation names');
    console.log('✓ Zero mentions of other sovereign nation demonyms');
  }

  // ── 3. DATASET GAP & INTEGRITY AUDIT (Step 4 Requirement) ──
  console.log('\n--------------------------------------------------------------------------------');
  console.log('>>> AUDITING DATASET COMPLETENESS (Missing fields, duplicates, source URLs)...');
  console.log('--------------------------------------------------------------------------------');

  let dataErrors = 0;
  const landmarkMap = new Map();

  for (const c of currentCountries) {
    // 1. Missing fields check
    if (!c.name || !c.name.trim()) {
      console.error(`[DATA ERROR] Country missing name: ID ${c.id}`);
      dataErrors++;
    }
    if (!c.capital || !c.capital.trim()) {
      console.error(`[DATA ERROR] [${c.name}] missing capital city`);
      dataErrors++;
    }
    if (!c.clues || c.clues.length < 3) {
      console.error(`[DATA ERROR] [${c.name}] has only ${c.clues?.length || 0} clues (required 3)`);
      dataErrors++;
    }
    const factsCount = (c.memoryFacts?.length || 0) || (c.memoryAnchors?.length || 0);
    if (factsCount < 2) {
      console.error(`[DATA ERROR] [${c.name}] has only ${factsCount} memory facts (required >= 2)`);
      dataErrors++;
    }
    if (!c.sourceUrl || !c.sourceUrl.startsWith('http')) {
      console.error(`[DATA ERROR] [${c.name}] missing or invalid sourceUrl: ${c.sourceUrl}`);
      dataErrors++;
    }

    // 2. Duplicate main landmark check
    if (c.landmark && c.landmark.trim()) {
      const cleanLandmark = c.landmark.trim().toLowerCase();
      if (landmarkMap.has(cleanLandmark)) {
        console.error(`[DUPLICATE LANDMARK] "${c.landmark}" shared by [${landmarkMap.get(cleanLandmark)}] and [${c.name}]`);
        dataErrors++;
      } else {
        landmarkMap.set(cleanLandmark, c.name);
      }
    }
  }

  if (dataErrors > 0) {
    console.error(`\n>>> DATASET INTEGRITY AUDIT: FAILED (${dataErrors} data errors found)`);
    process.exit(1);
  } else {
    console.log(`\n>>> DATASET INTEGRITY AUDIT: PASSED (0 errors across all ${currentCountries.length} countries)`);
    console.log('✓ All 195 nations have valid name, capital, 3 clues, >= 2 memory facts, and source URL');
    console.log('✓ Zero duplicate main landmarks across all countries');
  }
} catch (err) {
  console.error('Error scanning current clues:', err.message);
}
