import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const cluesPath = path.resolve(__dirname, '../data/clues.json');
const clues = JSON.parse(fs.readFileSync(cluesPath, 'utf8'));

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
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
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
  let okCount = 0;
  let failedCount = 0;
  let unreachableCount = 0;
  const failedDetails = [];

  await runPool(uniqueUrls, 8, async (url) => {
    const urlClues = urlToClues.get(url);
    let pageText = null;

    try {
      pageText = await fetchWithTimeout(url, 10000);
    } catch (err) {
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

  const totalClues = clues.length;
  const unreachablePercent = (unreachableCount / totalClues) * 100;
  const isFail = failedCount > 0 || unreachablePercent > 10;

  console.log(`check:sources: ${uniqueUrls.length} URLs checked across ${totalClues} clues.`);
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
