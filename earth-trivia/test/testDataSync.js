#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { generateWorld50mJs } from '../scripts/build/bundleMapData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('================================================================================');
console.log('                  DATA SYNCHRONIZATION & DRIFT TEST                             ');
console.log('================================================================================\n');

// 1. Assert no obsolete dual-format files exist
const obsoleteFiles = [
  'data/clues.js',
  'data/countries.js',
  'data/tiny-countries.json',
  'data/world-50m.json'
];

for (const file of obsoleteFiles) {
  const fullPath = path.join(rootDir, file);
  if (fs.existsSync(fullPath)) {
    console.error(`FAIL: Obsolete file still exists: ${file}. Only single source of truth should be tracked.`);
    process.exit(1);
  }
}
console.log('✓ PASS: All obsolete duplicate data files removed.');

// 2. Validate single source of truth files
const countriesPath = path.join(rootDir, 'data/countries.json');
const cluesPath = path.join(rootDir, 'data/clues.json');
const tinyPath = path.join(rootDir, 'data/tiny-countries.js');
const worldPath = path.join(rootDir, 'data/world-50m.js');

const countries = JSON.parse(fs.readFileSync(countriesPath, 'utf8'));
if (countries.length !== 195) {
  console.error(`FAIL: countries.json expected 195 nations, got ${countries.length}`);
  process.exit(1);
}
console.log(`✓ PASS: countries.json verified (${countries.length} nations).`);

const clues = JSON.parse(fs.readFileSync(cluesPath, 'utf8'));
if (clues.length !== 1089) {
  console.error(`FAIL: clues.json expected 1089 clues, got ${clues.length}`);
  process.exit(1);
}
console.log(`✓ PASS: clues.json verified (${clues.length} clues).`);

const { TINY_COUNTRIES } = await import('../data/tiny-countries.js');
if (TINY_COUNTRIES.length !== 31) {
  console.error(`FAIL: tiny-countries.js expected 31 items, got ${TINY_COUNTRIES.length}`);
  process.exit(1);
}
console.log(`✓ PASS: tiny-countries.js verified (${TINY_COUNTRIES.length} nations).`);

// 3. Regenerate world-50m.js in memory and assert hash equals tracked file
console.log('Regenerating world-50m.js in memory from world-atlas + soi-boundaries.js...');
const generatedJs = generateWorld50mJs();
const onDiskJs = fs.readFileSync(worldPath, 'utf8');

const genHash = crypto.createHash('sha256').update(generatedJs).digest('hex');
const diskHash = crypto.createHash('sha256').update(onDiskJs).digest('hex');

if (genHash !== diskHash) {
  console.error(`FAIL: world-50m.js drift detected!`);
  console.error(`  Generated sha256: ${genHash}`);
  console.error(`  Tracked   sha256: ${diskHash}`);
  console.error(`Run "npm run build:data" to re-synchronize tracked map data.`);
  process.exit(1);
}
console.log(`✓ PASS: world-50m.js is in exact byte-for-byte sync (sha256: ${diskHash.slice(0, 16)}...).`);

console.log('\n================================================================================');
console.log('✓ ALL DATA SYNC CHECKS PASSED');
console.log('================================================================================');
