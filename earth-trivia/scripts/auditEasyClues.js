import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { verifySourceUrl } from './clueTool.js';
import { pickClueSet, buildLibrary } from '../src/questionBag.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const cluesPath = path.resolve(__dirname, '../data/clues.json');
const countriesPath = path.resolve(__dirname, '../data/countries.json');

const clues = JSON.parse(fs.readFileSync(cluesPath, 'utf8'));
const countries = JSON.parse(fs.readFileSync(countriesPath, 'utf8'));

const EASY_TIER_ISOS = [
  'JPN', 'EGY', 'BRA', 'AUS', 'ITA', 'IND', 'PER', 'CAN', 'FRA', 'KEN',
  'ISL', 'MEX', 'NOR', 'GRC', 'ZAF', 'NZL', 'MAR', 'CHE', 'THA', 'ARG',
  'GBR', 'DEU', 'ESP', 'USA', 'CHN', 'RUS', 'TUR', 'VNM', 'KOR', 'NLD',
  'SWE', 'PRT', 'IDN', 'COL', 'CHL', 'AUT', 'IRL', 'POL', 'SGP', 'SAU',
  'ARE', 'NGA'
];

async function main() {
  console.log('Starting Audit for EASY Tier Clues...');

  const easyClues = clues.filter(c => EASY_TIER_ISOS.includes(c.iso));
  const newEasyClues = easyClues.filter(c => !c.id.endsWith('-001'));
  console.log(`Total Easy items: ${easyClues.length}, New items: ${newEasyClues.length}`);

  // 1. Min / Max per-country counts
  const countByIso = {};
  for (const iso of EASY_TIER_ISOS) {
    countByIso[iso] = easyClues.filter(c => c.iso === iso).length;
  }
  const minCount = Math.min(...Object.values(countByIso));
  const maxCount = Math.max(...Object.values(countByIso));
  console.log(`Per-country counts: Min=${minCount}, Max=${maxCount} (Expected: exactly 15)`);

  // 2. Level distribution
  const levelDist = { 1: 0, 2: 0, 3: 0 };
  easyClues.forEach(c => levelDist[c.level]++);
  console.log('Level distribution:', levelDist);

  // 3. Kind distribution
  const kindDist = {};
  easyClues.forEach(c => kindDist[c.kind] = (kindDist[c.kind] || 0) + 1);
  console.log('Kind distribution:', kindDist);

  // Level 3 Current/Incident distribution
  const level3Items = easyClues.filter(c => c.level === 3);
  const level3CurrentIncident = level3Items.filter(c => c.kind === 'current' || c.kind === 'incident');
  const level3Pct = (level3CurrentIncident.length / level3Items.length * 100).toFixed(1);
  console.log(`Level 3 Current/Incident: ${level3CurrentIncident.length}/${level3Items.length} (${level3Pct}%)`);

  // 4. Sample 30 random NEW items (deterministic seeded or random across unique countries)
  // Let's sample 30 items spread across 30 different countries
  const shuffledIsos = [...EASY_TIER_ISOS].sort(() => Math.random() - 0.5).slice(0, 30);
  const sampledItems = [];
  for (const iso of shuffledIsos) {
    const itemsForCountry = newEasyClues.filter(c => c.iso === iso);
    const chosen = itemsForCountry[Math.floor(Math.random() * itemsForCountry.length)];
    sampledItems.push(chosen);
  }

  console.log(`\nAuditing 30 Random NEW Items (Re-fetching URLs & confirming claims)...`);
  const auditResults = [];
  let failures = 0;

  for (let i = 0; i < sampledItems.length; i++) {
    const it = sampledItems[i];
    process.stdout.write(`[${i + 1}/30] ${it.id}... `);
    const res = await verifySourceUrl(it.source, it.evidence);
    if (res.ok) {
      console.log('OK');
      auditResults.push({
        id: it.id,
        text: it.text,
        source: it.source,
        result: 'ok'
      });
    } else {
      console.log(`WRONG (${res.error})`);
      auditResults.push({
        id: it.id,
        text: it.text,
        source: it.source,
        result: `wrong: ${res.error}`
      });
      failures++;
    }
  }

  console.log(`\n30-Item Audit Completed: ${30 - failures}/30 OK, ${failures} Failed.`);
  if (failures > 0) {
    console.error('Audit has failures!');
    process.exit(1);
  }

  // 5. Generate 5 sample clue sets using questionBag
  const library = buildLibrary(clues);
  const sampleIsos = ['JPN', 'FRA', 'EGY', 'BRA', 'NOR'];
  const sampleClueSets = [];

  for (const iso of sampleIsos) {
    const country = countries.find(c => c.code === iso);
    const clueSet = pickClueSet(iso, library);
    sampleClueSets.push({
      country: country.name,
      iso,
      clues: clueSet.map(c => ({
        level: c.level,
        id: c.id,
        kind: c.kind,
        year: c.year || null,
        text: c.text
      }))
    });
  }

  const reportData = {
    summary: {
      tier: 'EASY',
      totalCountries: EASY_TIER_ISOS.length,
      itemsPerCountry: { min: minCount, max: maxCount },
      totalItemsInTier: easyClues.length,
      newItemsWritten: newEasyClues.length,
      totalLibraryItems: clues.length,
      levelDistribution: levelDist,
      kindDistribution: kindDist,
      level3CurrentIncident: {
        count: level3CurrentIncident.length,
        totalLevel3: level3Items.length,
        percentage: `${level3Pct}%`
      }
    },
    auditTable: auditResults,
    sampleClueSets
  };

  const logsDir = path.resolve(__dirname, '../../report/clues-easy/logs');
  fs.mkdirSync(logsDir, { recursive: true });
  fs.writeFileSync(path.join(logsDir, 'audit.log'), JSON.stringify(reportData, null, 2), 'utf8');
  console.log(`Saved audit log to ${path.join(logsDir, 'audit.log')}`);
}

main().catch(err => {
  console.error('Fatal audit error:', err);
  process.exit(1);
});
