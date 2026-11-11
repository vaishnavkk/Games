import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const countriesPath = path.resolve(__dirname, '../data/countries.json');
const countries = JSON.parse(fs.readFileSync(countriesPath, 'utf8'));

export const HARD_PATTERNS = [
  { name: 'border*', regex: /\bborder[a-z]*\b/i },
  { name: 'neighbo(u)r*', regex: /\bneighbou?r[a-z]*\b/i },
  { name: 'america*', regex: /\bamerica[a-z]*\b/i },
  { name: 'counterpart*', regex: /\bcounterpart[a-z]*\b/i },
  {
    name: 'cardinal/compass (-ern forms)',
    regex: /\b(north|south|east|west|northeast|northwest|southeast|southwest)(ern|ward|bound|erly|wards)?\b/i
  },
  {
    name: 'continents & regions',
    regex: /\b(africa|african|asia|asian|europe|european|oceania|oceanian|australasia|australasian|antarctica|antarctic|nordic|scandinavia|scandinavian|baltic|balt|balkan|balkans|caribbean|mediterranean|middle east|sub-saharan|levant|levantine|polynesia|polynesian|melanesia|melanesian|micronesia|micronesian|latin america|latin american)\b/i
  },
  {
    name: 'oceans & specific seas',
    regex: /\b(pacific|atlantic|indian ocean|arctic|southern ocean|baltic sea|north sea|red sea|black sea|caspian|caribbean sea|arabian sea|coral sea|tasman sea|bering sea|south china sea|east china sea|yellow sea|sea of japan|persian gulf|gulf of mexico|adriatic|aegean|ionian sea|tyrrhenian sea)\b/i
  },
  {
    name: 'mountain ranges & geological structures',
    regex: /\b(andes|andean|himalaya|himalayas|himalayan|alps|alpine|rockies|rocky mountains|pyrenees|pyrenean|appalachian|appalachians|caucasus|caucasian|atlas mountains|urals?|ural mountains|carpathians?|carpathian|karakoram|hindu kush|zagros|altai|drakensberg|ring of fire|great rift valley|pamir|tian shan)\b/i
  },
  {
    name: 'hemispheres & global parallels',
    regex: /\b(hemisphere|equator\b|equatorial|tropic of cancer|tropic of capricorn|prime meridian)\b/i
  }
];

export const TEMPORAL_REGEX = /\b(recent|recently|currently|now|today)\b/i;

export const SOVEREIGN_CATALOG = countries.map(c => ({
  name: c.name,
  code: c.code,
  capital: c.capital,
  demonym: c.demonym || c.name
}));

const countryMap = new Map();
countries.forEach(c => countryMap.set(c.code, c));

function getWordSet(text) {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .trim()
      .split(/\s+/)
      .filter(w => w.length > 0)
  );
}

function jaccard(setA, setB) {
  let intersection = 0;
  for (const w of setA) {
    if (setB.has(w)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export function validateItemSync(item, existingCluesForIso = []) {
  const errors = [];
  const country = countryMap.get(item.iso);
  if (!country) {
    errors.push(`Unknown ISO: ${item.iso}`);
    return errors;
  }

  // Word count: 12 - 30 words
  const words = item.text.trim().split(/\s+/).length;
  if (words < 12 || words > 30) {
    errors.push(`Word count ${words} outside [12, 30] in "${item.text}"`);
  }

  // Own country name, capital, demonym
  const ownNameRegex = new RegExp(`\\b${country.name.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i');
  if (ownNameRegex.test(item.text)) {
    errors.push(`Mentions own country name "${country.name}"`);
  }

  if (country.capital) {
    const ownCapRegex = new RegExp(`\\b${country.capital.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i');
    if (ownCapRegex.test(item.text)) {
      errors.push(`Mentions capital "${country.capital}"`);
    }
  }

  if (country.demonym) {
    const ownDemRegex = new RegExp(`\\b${country.demonym.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i');
    if (ownDemRegex.test(item.text)) {
      errors.push(`Mentions demonym "${country.demonym}"`);
    }
  }

  // Other sovereign country names & demonyms
  for (const other of SOVEREIGN_CATALOG) {
    if (other.code === item.iso) continue;
    const escName = other.name.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    const escDem = (other.demonym || '').replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');

    const nameRegex = new RegExp(`\\b${escName}\\b`, 'i');
    if (nameRegex.test(item.text)) {
      // False positives e.g. Guinea in Guinea-Bissau, Niger in Nigeria
      if (!country.name.toLowerCase().includes(other.name.toLowerCase())) {
        errors.push(`Mentions foreign sovereign country "${other.name}"`);
      }
    }

    if (escDem && escDem.length > 3) {
      const demRegex = new RegExp(`\\b${escDem}\\b`, 'i');
      if (demRegex.test(item.text) && !country.name.toLowerCase().includes(other.demonym.toLowerCase())) {
        errors.push(`Mentions foreign demonym "${other.demonym}"`);
      }
    }
  }

  // Temporal forbidden words
  const tempMatch = item.text.match(TEMPORAL_REGEX);
  if (tempMatch) {
    errors.push(`Forbidden temporal word "${tempMatch[0]}"`);
  }

  // Hard patterns
  for (const hp of HARD_PATTERNS) {
    const match = item.text.match(hp.regex);
    if (match) {
      errors.push(`Hard pattern match [${hp.name}]: "${match[0]}"`);
    }
  }

  // Current / Incident constraints
  if (item.kind === 'current' || item.kind === 'incident') {
    const y = Number(item.year);
    if (!y || y < 2000 || y > 2026) {
      errors.push(`Current/incident must have year 2000-2026, got: ${item.year}`);
    } else if (!item.text.includes(String(y))) {
      errors.push(`Year "${y}" does not appear in text: "${item.text}"`);
    }
  }

  // Jaccard similarity <= 0.6 against existing clues of this country
  const newSet = getWordSet(item.text);
  for (const prev of existingCluesForIso) {
    if (prev.id === item.id) continue;
    const prevSet = getWordSet(prev.text);
    const sim = jaccard(newSet, prevSet);
    if (sim > 0.6) {
      errors.push(`Jaccard similarity ${sim.toFixed(2)} > 0.6 with ${prev.id}`);
    }
  }

  // Evidence format check
  if (!Array.isArray(item.evidence) || item.evidence.length < 2) {
    errors.push(`Item must have at least 2 evidence terms`);
  }

  return errors;
}

export async function verifySourceUrl(url, evidenceTerms, timeoutMs = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'GeoTriviaClueValidator/1.0 (educational geography trivia bot)'
      }
    });
    clearTimeout(timer);
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    const html = await res.text();
    const clean = html.replace(/<[^>]+>/g, ' ').toLowerCase();

    const missing = [];
    for (const term of evidenceTerms) {
      if (!clean.includes(term.toLowerCase())) {
        missing.push(term);
      }
    }
    if (missing.length > 0) {
      return { ok: false, error: `Missing terms in page: ${missing.join(', ')}` };
    }
    return { ok: true };
  } catch (err) {
    clearTimeout(timer);
    return { ok: false, error: err.message };
  }
}
