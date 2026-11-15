#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import countries from '../data/countries.json' with { type: 'json' };

console.log('================================================================================');
console.log('                   TIER COMPOSITION & CHAIN INTEGRITY TESTS                     ');
console.log('================================================================================\n');

console.log(`✓ PASS: Loaded single source of truth data/countries.json (${countries.length} nations).`);

// 2. Exact continent counts for Easy (42)
const expectedEasy = {
  'Asia': 11,
  'Africa': 9,
  'Europe': 10,
  'North America': 5,
  'South America': 4,
  'Oceania': 3
};

const easyCountries = countries.filter(c => c.tier === 'easy');
if (easyCountries.length !== 42) {
  console.error(`FAIL: Easy tier total count is ${easyCountries.length}, expected 42`);
  process.exit(1);
}

const easyCounts = {};
for (const c of easyCountries) {
  const cont = c.continent || c.region;
  easyCounts[cont] = (easyCounts[cont] || 0) + 1;
}

for (const [cont, exp] of Object.entries(expectedEasy)) {
  const actual = easyCounts[cont] || 0;
  if (actual !== exp) {
    console.error(`FAIL: Easy ${cont} count is ${actual}, expected ${exp}`);
    process.exit(1);
  }
}
console.log('✓ PASS: Easy tier continent counts verified (Asia: 11, Africa: 9, Europe: 10, NA: 5, SA: 4, Oceania: 3).');

// 3. Easy has <= 10 Europeans
if ((easyCounts['Europe'] || 0) > 10) {
  console.error(`FAIL: Easy Europeans count ${easyCounts['Europe']} > 10`);
  process.exit(1);
}
console.log(`✓ PASS: Easy Europeans count is ${easyCounts['Europe']} <= 10.`);

// 4. Exact continent counts for Medium (100)
// Medium = Easy + Medium-only (Navigator tier in game)
const expectedMedium = {
  'Asia': 26,
  'Africa': 26,
  'Europe': 24,
  'North America': 11,
  'South America': 8,
  'Oceania': 5
};

const mediumCountries = countries.filter(c => c.tier === 'easy' || c.tier === 'medium');
if (mediumCountries.length !== 100) {
  console.error(`FAIL: Medium tier total count is ${mediumCountries.length}, expected 100`);
  process.exit(1);
}

const mediumCounts = {};
for (const c of mediumCountries) {
  const cont = c.continent || c.region;
  mediumCounts[cont] = (mediumCounts[cont] || 0) + 1;
}

for (const [cont, exp] of Object.entries(expectedMedium)) {
  const actual = mediumCounts[cont] || 0;
  if (actual !== exp) {
    console.error(`FAIL: Medium ${cont} count is ${actual}, expected ${exp}`);
    process.exit(1);
  }
}
console.log('✓ PASS: Medium tier continent counts verified (Asia: 26, Africa: 26, Europe: 24, NA: 11, SA: 8, Oceania: 5).');

// 5. Subset chain: Easy (42) ⊂ Medium (100) ⊂ Hard (195)
const hardCountries = countries;
if (hardCountries.length !== 195) {
  console.error(`FAIL: Hard tier total count is ${hardCountries.length}, expected 195`);
  process.exit(1);
}

const easyCodes = new Set(easyCountries.map(c => c.code));
const mediumCodes = new Set(mediumCountries.map(c => c.code));
const hardCodes = new Set(hardCountries.map(c => c.code));

for (const code of easyCodes) {
  if (!mediumCodes.has(code)) {
    console.error(`FAIL: Easy nation ${code} not in Medium tier`);
    process.exit(1);
  }
}

for (const code of mediumCodes) {
  if (!hardCodes.has(code)) {
    console.error(`FAIL: Medium nation ${code} not in Hard tier`);
    process.exit(1);
  }
}
console.log('✓ PASS: Strict subset chain Easy (42) ⊂ Medium (100) ⊂ Hard (195) verified.');

console.log('\n================================================================================');
console.log('✓ ALL TIER COMPOSITION & CHAIN TESTS PASSED');
console.log('================================================================================\n');
