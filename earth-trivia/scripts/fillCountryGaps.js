import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const jsonPath = path.resolve(__dirname, '../data/countries.json');
const jsPath = path.resolve(__dirname, '../data/countries.js');

const countries = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

console.log(`Processing ${countries.length} countries to populate sourceUrl and ensure complete metadata...`);

// Mapping special names to canonical Wikipedia article titles
const wikiNameOverrides = {
  'United States': 'United_States',
  'United Kingdom': 'United_Kingdom',
  'South Korea': 'South_Korea',
  'North Korea': 'North_Korea',
  'DR Congo': 'Democratic_Republic_of_the_Congo',
  'Republic of the Congo': 'Republic_of_the_Congo',
  'Central African Republic': 'Central_African_Republic',
  'Ivory Coast': 'Ivory_Coast',
  'East Timor': 'East_Timor',
  'Eswatini': 'Eswatini',
  'Czech Republic': 'Czech_Republic',
  'Bosnia and Herzegovina': 'Bosnia_and_Herzegovina',
  'Trinidad and Tobago': 'Trinidad_and_Tobago',
  'Antigua and Barbuda': 'Antigua_and_Barbuda',
  'Saint Kitts and Nevis': 'Saint_Kitts_and_Nevis',
  'Saint Vincent and the Grenadines': 'Saint_Vincent_and_the_Grenadines',
  'São Tomé and Príncipe': 'S%C3%A3o_Tom%C3%A9_and_Pr%C3%ADncipe',
  'Marshall Islands': 'Marshall_Islands',
  'Solomon Islands': 'Solomon_Islands',
  'Papua New Guinea': 'Papua_New_Guinea',
  'New Zealand': 'New_Zealand',
  'South Africa': 'South_Africa',
  'Saudi Arabia': 'Saudi_Arabia',
  'United Arab Emirates': 'United_Arab_Emirates',
  'Dominican Republic': 'Dominican_Republic',
  'San Marino': 'San_Marino',
  'Vatican City': 'Vatican_City',
  'Cabo Verde': 'Cape_Verde',
  'Saint Lucia': 'Saint_Lucia'
};

for (const c of countries) {
  // Ensure sourceUrl
  const pageTitle = wikiNameOverrides[c.name] || encodeURIComponent(c.name.trim().replace(/\s+/g, '_'));
  c.sourceUrl = `https://en.wikipedia.org/wiki/${pageTitle}`;

  // Ensure memoryFacts exists and has at least 2 entries
  if (!c.memoryFacts || c.memoryFacts.length < 2) {
    c.memoryFacts = [...(c.memoryAnchors || [])];
  }
}

// Write back to countries.json
fs.writeFileSync(jsonPath, JSON.stringify(countries, null, 2), 'utf8');

// Write back to countries.js
const jsContent = `/**
 * GeoTrivia Earth Explorer — Sovereign Countries Database (195 Nations)
 * Schema: id, code, name, flag, capital, tier, lat, lon, landmark, cultureFood, clues, memoryAnchors, memoryFacts, sourceUrl
 */
export const COUNTRIES_DB = ${JSON.stringify(countries, null, 2)};
`;
fs.writeFileSync(jsPath, jsContent, 'utf8');

console.log(`Successfully populated sourceUrl and memoryFacts across all ${countries.length} nations!`);
