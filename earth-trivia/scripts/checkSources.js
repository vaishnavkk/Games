import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const cluesPath = path.resolve(__dirname, '../data/clues.json');
const cachePath = path.resolve(__dirname, '../.cache/sources.json');

const clues = JSON.parse(fs.readFileSync(cluesPath, 'utf8'));

// 7-day TTL in milliseconds
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// Load existing cache if present
let cache = {};
if (fs.existsSync(cachePath)) {
  try {
    cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
  } catch (e) {
    cache = {};
  }
}

// Group clues by unique source URL
const urlToClues = new Map();
for (const clue of clues) {
  const url = clue.source;
  if (!urlToClues.has(url)) {
    urlToClues.set(url, []);
  }
  urlToClues.get(url).push(clue);
}

const uniqueUrls = Array.from(urlToClues.keys());

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
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    return html.replace(/<[^>]+>/g, ' ').toLowerCase();
  } finally {
    clearTimeout(timer);
  }
}

let cacheDirty = false;

function saveCache() {
  if (!cacheDirty) return;
  try {
    fs.mkdirSync(path.dirname(cachePath), { recursive: true });
    fs.writeFileSync(cachePath, JSON.stringify(cache), 'utf8');
    cacheDirty = false;
  } catch (e) {
    // Ignore intermittent cache write errors
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
  saveCache();
}

async function main() {
  let okCount = 0;
  let failedCount = 0;
  let unreachableCount = 0;
  const failedDetails = [];
  let cacheHits = 0;

  const now = Date.now();

  await runPool(uniqueUrls, 8, async (url) => {
    const urlClues = urlToClues.get(url);
    let pageText = null;
    let isUnreachable = false;

    const cached = cache[url];
    if (cached && cached.timestamp && (now - cached.timestamp < CACHE_TTL_MS)) {
      cacheHits++;
      if (cached.unreachable) {
        isUnreachable = true;
      } else {
        pageText = cached.pageText;
      }
    } else {
      try {
        pageText = await fetchWithTimeout(url, 10000);
        cache[url] = {
          timestamp: Date.now(),
          pageText,
          unreachable: false
        };
        cacheDirty = true;
      } catch (err) {
        isUnreachable = true;
        cache[url] = {
          timestamp: Date.now(),
          unreachable: true,
          error: err.message
        };
        cacheDirty = true;
      }
    }

    if (isUnreachable || !pageText) {
      unreachableCount += urlClues.length;
      return;
    }

    for (const clue of urlClues) {
      const missingTerms = [];
      for (const term of clue.evidence) {
        if (!pageText.includes(term.toLowerCase())) {
          missingTerms.push(term);
        }
      }

      if (missingTerms.length === 0) {
        okCount++;
      } else {
        failedCount++;
        failedDetails.push({ id: clue.id, missingTerms, url });
      }
    }
  });

  saveCache();

  const totalClues = clues.length;
  const unreachablePercent = (unreachableCount / totalClues) * 100;
  const isFail = failedCount > 0 || unreachablePercent > 10;

  console.log(`check:sources: ${uniqueUrls.length} URLs checked across ${totalClues} clues (cache hits: ${cacheHits}/${uniqueUrls.length}).`);
  console.log(`Counts: OK: ${okCount}, Failed: ${failedCount}, Unreachable: ${unreachableCount} (${unreachablePercent.toFixed(1)}%).`);

  if (failedDetails.length > 0) {
    console.error(`Failed items:`, failedDetails.slice(0, 10));
  }

  if (isFail) {
    console.error(`Result: FAILED`);
    process.exit(1);
  } else {
    console.log(`Result: PASSED`);
  }
}

main().catch(err => {
  console.error('Fatal error in check:sources:', err);
  process.exit(1);
});
