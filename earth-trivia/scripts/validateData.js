import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Running Data Validator on data/countries.json...');

const dataPath = path.join(__dirname, '../data/countries.json');
if (!fs.existsSync(dataPath)) {
  console.error('FAIL: data/countries.json does not exist!');
  process.exit(1);
}

const countries = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

console.log(`Found ${countries.length} countries in dataset.`);

// Banned words list: continents, regions, hemispheres, oceans, seas, mountain ranges, directional giveaways
const BANNED_PATTERNS = [
  // Continents
  /\bafrica\b/i, /\bafrican\b/i,
  /\basia\b/i, /\basian\b/i,
  /\beurope\b/i, /\beuropean\b/i,
  /\bnorth america\b/i, /\bsouth america\b/i,
  /\boceania\b/i, /\baustralasia\b/i, /\bantarctica\b/i,
  // Hemispheres & broad directional regions
  /\bhemisphere\b/i,
  /\bmiddle east\b/i, /\bmiddle eastern\b/i,
  /\bcaribbean\b/i,
  /\bscandinavia\b/i, /\bscandinavian\b/i,
  /\bbalkan\b/i, /\bbalkans\b/i,
  /\bbaltic\b/i,
  /\bnordic\b/i,
  /\blatin america\b/i,
  /\bsub-saharan\b/i,
  // Oceans & Seas
  /\bpacific\b/i,
  /\batlantic\b/i,
  /\bindian ocean\b/i,
  /\barctic\b/i,
  /\bmediterranean\b/i,
  /\bbaltic sea\b/i,
  /\bnorth sea\b/i,
  /\bred sea\b/i,
  /\bblack sea\b/i,
  /\bcaspian\b/i,
  /\barabian sea\b/i,
  /\bcoral sea\b/i,
  /\btasman\b/i,
  // Mountain ranges & geological location giveaways
  /\bandes\b/i, /\bandean\b/i,
  /\bhimalaya\b/i, /\bhimalayas\b/i, /\bhimalayan\b/i,
  /\balps\b/i,
  /\brockies\b/i, /\brockey mountains\b/i,
  /\bpyrenees\b/i,
  /\bappalachian\b/i,
  /\bcaucasus\b/i,
  /\bring of fire\b/i,
  /\bgreat rift valley\b/i
];

let errors = 0;
const seenLandmarks = new Map();
const seenIds = new Set();
const seenNames = new Set();

countries.forEach((country, idx) => {
  const prefix = `[#${idx + 1} ${country.name || 'Unnamed'}]`;

  // Required fields check
  const required = ['id', 'name', 'flag', 'capital', 'clues', 'memoryAnchors', 'landmark', 'cultureFood', 'tier', 'lat', 'lon'];
  for (const field of required) {
    if (country[field] === undefined || country[field] === null || country[field] === '') {
      console.error(`${prefix} Missing required field: "${field}"`);
      errors++;
    }
  }

  // Duplicate ID check
  if (country.id) {
    if (seenIds.has(country.id)) {
      console.error(`${prefix} Duplicate ID detected: "${country.id}"`);
      errors++;
    }
    seenIds.add(country.id);
  }

  // Duplicate Name check
  if (country.name) {
    if (seenNames.has(country.name.toLowerCase())) {
      console.error(`${prefix} Duplicate Name detected: "${country.name}"`);
      errors++;
    }
    seenNames.add(country.name.toLowerCase());
  }

  // 3 Clues check
  if (Array.isArray(country.clues)) {
    if (country.clues.length !== 3) {
      console.error(`${prefix} Must have exactly 3 clues, found ${country.clues.length}`);
      errors++;
    }
    country.clues.forEach((clue, cIdx) => {
      BANNED_PATTERNS.forEach(pat => {
        if (pat.test(clue)) {
          const match = clue.match(pat);
          console.error(`${prefix} Clue ${cIdx + 1} contains BANNED WORD "${match[0]}": "${clue}"`);
          errors++;
        }
      });
    });
  } else {
    console.error(`${prefix} "clues" is not an array`);
    errors++;
  }

  // 3 Memory Anchors check
  if (Array.isArray(country.memoryAnchors)) {
    if (country.memoryAnchors.length < 3) {
      console.error(`${prefix} Should have at least 3 memoryAnchors, found ${country.memoryAnchors.length}`);
      errors++;
    }
  } else {
    console.error(`${prefix} "memoryAnchors" is not an array`);
    errors++;
  }

  // Duplicate Landmark check across countries
  if (country.landmark) {
    const lmkKey = country.landmark.trim().toLowerCase();
    if (seenLandmarks.has(lmkKey)) {
      console.error(`${prefix} Duplicate Landmark "${country.landmark}" also used in ${seenLandmarks.get(lmkKey)}!`);
      errors++;
    } else {
      seenLandmarks.set(lmkKey, country.name);
    }
  }

  // Tier check
  if (!['easy', 'medium', 'hard'].includes(country.tier)) {
    console.error(`${prefix} Invalid tier: "${country.tier}" (must be easy, medium, or hard)`);
    errors++;
  }
});

console.log('--------------------------------------------------');
if (errors > 0) {
  console.error(`Validation FAILED with ${errors} error(s). Please fix before deployment!`);
  process.exit(1);
} else {
  console.log(`Validation PASSED! All ${countries.length} countries passed check:`);
  console.log('✓ Zero banned words in clues');
  console.log('✓ Zero duplicate landmarks');
  console.log('✓ All required fields, coordinates, and memory anchors verified');
  process.exit(0);
}
