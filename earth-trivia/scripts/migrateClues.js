import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const countriesPath = path.resolve(__dirname, '../data/countries.json');
const cluesOutPath = path.resolve(__dirname, '../data/clues.json');

const countries = JSON.parse(fs.readFileSync(countriesPath, 'utf8'));

// Common function words to avoid when choosing evidence terms
const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'from', 'that', 'this', 'into', 'over', 'near',
  'after', 'before', 'where', 'when', 'under', 'their', 'across', 'using',
  'famous', 'features', 'known', 'celebrated', 'home', 'capital',
  'nations', 'sovereign', 'world', 'largest', 'oldest', 'only',
  'most', 'built', 'making', 'such', 'more', 'both', 'some', 'than', 'them',
  'are', 'was', 'were', 'been', 'has', 'have', 'had', 'who', 'its', 'all'
]);

async function fetchWithTimeout(url, timeoutMs = 10000) {
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
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const html = await res.text();
    return html.replace(/<[^>]+>/g, ' ').toLowerCase();
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

async function runPool(items, concurrency, fn) {
  let idx = 0;
  const workers = Array.from({ length: concurrency }, async () => {
    while (idx < items.length) {
      const current = idx++;
      await fn(items[current], current);
    }
  });
  await Promise.all(workers);
}

async function main() {
  console.log(`Fetching Wikipedia pages for ${countries.length} countries (concurrency 8, timeout 10s)...`);
  const pageCache = new Map();

  await runPool(countries, 8, async (c, index) => {
    try {
      const text = await fetchWithTimeout(c.sourceUrl, 10000);
      pageCache.set(c.sourceUrl, text);
    } catch (err) {
      console.warn(`[WARN] Page fetch failed for ${c.name} (${c.sourceUrl}): ${err.message}`);
      pageCache.set(c.sourceUrl, null);
    }
  });

  console.log(`Total pages cached: ${pageCache.size}`);
  const library = [];
  let fullyMatched = 0;
  let fallbackCount = 0;

  for (const c of countries) {
    const pageText = pageCache.get(c.sourceUrl) || '';

    c.clues.forEach((text, clueIdx) => {
      const level = clueIdx + 1;
      const id = `${c.code}-${level}-001`;
      const topic = level === 1 ? 'heritage' : (level === 2 ? 'landmark' : 'iconic landmark');
      const isCulture = /culture|tradition|culinary|food|bread|wine|dance|music|dish|stew|festival|pottery|craft|pastry|sausage|tea|coffee|ceremon/i.test(text);
      const kind = isCulture ? 'culture' : 'history';

      // Clean words from clue text
      const rawWords = text
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, ' ')
        .split(/\s+/)
        .map(w => w.trim())
        .filter(Boolean);

      // Prioritize substantial words
      const candidateTokens = rawWords.filter(w => w.length >= 4 && !STOP_WORDS.has(w));
      const verifiedTerms = [];

      for (const token of candidateTokens) {
        if (pageText.includes(token)) {
          if (!verifiedTerms.includes(token)) {
            verifiedTerms.push(token);
            if (verifiedTerms.length === 2) break;
          }
        }
      }

      // If needed, check words with length >= 3
      if (verifiedTerms.length < 2) {
        const shorterCandidates = rawWords.filter(w => w.length >= 3 && !STOP_WORDS.has(w));
        for (const token of shorterCandidates) {
          if (pageText.includes(token) && !verifiedTerms.includes(token)) {
            verifiedTerms.push(token);
            if (verifiedTerms.length === 2) break;
          }
        }
      }

      // If still < 2, check any words in clue that appear in page
      if (verifiedTerms.length < 2) {
        for (const token of rawWords) {
          if (token.length >= 3 && pageText.includes(token) && !verifiedTerms.includes(token)) {
            verifiedTerms.push(token);
            if (verifiedTerms.length === 2) break;
          }
        }
      }

      if (verifiedTerms.length >= 2) {
        fullyMatched++;
      } else {
        fallbackCount++;
        console.warn(`[WARN] Not enough verified terms for ${c.name} Level ${level}: [${verifiedTerms.join(', ')}] in "${text}"`);
      }

      library.push({
        id,
        iso: c.code,
        level,
        topic,
        kind,
        text,
        source: c.sourceUrl,
        evidence: verifiedTerms.slice(0, 2),
        checked: '2026-11-11'
      });
    });
  }

  console.log(`\nMigration completed: ${library.length} clue items built.`);
  console.log(`  2 evidence terms verified in source: ${fullyMatched}`);
  console.log(`  Items with < 2 terms: ${fallbackCount}`);

  fs.writeFileSync(cluesOutPath, JSON.stringify(library, null, 2), 'utf8');
  console.log(`Wrote library to ${cluesOutPath}`);
}

main().catch(err => {
  console.error('Fatal error during migration:', err);
  process.exit(1);
});
