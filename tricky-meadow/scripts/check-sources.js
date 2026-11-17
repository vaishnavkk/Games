import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PUZZLES_PATH = path.resolve(__dirname, '../src/data/puzzles.json');
const CACHE_DIR = path.resolve(__dirname, '../.cache');
const REPORT_DIR = path.resolve(__dirname, '../report/content');
const SUPPORT_FILE = path.join(REPORT_DIR, 'support.txt');

if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
if (!fs.existsSync(REPORT_DIR)) fs.mkdirSync(REPORT_DIR, { recursive: true });

const puzzles = JSON.parse(fs.readFileSync(PUZZLES_PATH, 'utf8'));

function sanitizeFilename(url) {
  return url.replace(/[^a-zA-Z0-9-_]/g, '_').substring(0, 100) + '.txt';
}

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,text/plain'
      },
      timeout: 10000
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        let redirectUrl = res.headers.location;
        if (!redirectUrl.startsWith('http')) {
          const u = new URL(url);
          redirectUrl = new URL(redirectUrl, u.origin).href;
        }
        return fetchUrl(redirectUrl).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve(data));
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
    req.on('error', reject);
  });
}

function cleanHtmlToText(html) {
  // Strip scripts, styles, svg
  let text = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ');
  text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ');
  text = text.replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, ' ');
  // Strip HTML tags
  text = text.replace(/<[^>]+>/g, ' ');
  // Decode common HTML entities
  text = text.replace(/&nbsp;/g, ' ')
             .replace(/&amp;/g, '&')
             .replace(/&lt;/g, '<')
             .replace(/&gt;/g, '>')
             .replace(/&quot;/g, '"')
             .replace(/&#39;/g, "'")
             .replace(/&rsquo;/g, "'")
             .replace(/&ldquo;/g, '"')
             .replace(/&rdquo;/g, '"');
  // Collapse whitespace
  return text.replace(/\s+/g, ' ').trim();
}

function splitIntoSentences(text) {
  // Split on sentence terminators (. ! ?) followed by space or end
  return text
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 10);
}

export async function checkSources() {
  console.log(`[check:sources] Validating sources for ${puzzles.length} puzzles...`);
  const supportLines = [];
  let warnCount = 0;
  let failCount = 0;
  let okCount = 0;

  for (const puzzle of puzzles) {
    const { id, fact } = puzzle;
    const sourceList = Array.isArray(fact?.sources) && fact.sources.length > 0
      ? fact.sources.slice(0, 2)
      : (fact?.source && fact?.evidence ? [{ url: fact.source, evidence: fact.evidence }] : []);

    if (sourceList.length === 0) {
      console.error(`[check:sources] FAIL: Puzzle ${id} missing fact.source or fact.sources`);
      failCount++;
      continue;
    }

    let allSourcesOk = true;

    for (let sIdx = 0; sIdx < sourceList.length; sIdx++) {
      const src = sourceList[sIdx];
      const sourceUrl = src.url;
      const evidenceTerms = (src.evidence || []).map(e => e.toLowerCase().trim());

      const cacheFile = path.join(CACHE_DIR, sanitizeFilename(sourceUrl));
      let rawText = '';

      if (fs.existsSync(cacheFile)) {
        rawText = fs.readFileSync(cacheFile, 'utf8');
      } else {
        try {
          const rawHtml = await fetchUrl(sourceUrl);
          rawText = cleanHtmlToText(rawHtml);
          fs.writeFileSync(cacheFile, rawText, 'utf8');
        } catch (err) {
          console.error(`[check:sources] FAIL: [${id}] Unreachable source ${sourceUrl} (${err.message})`);
          failCount++;
          allSourcesOk = false;
          supportLines.push(`${id} | FAIL | Unreachable: ${err.message}`);
          continue;
        }
      }

      const sentences = splitIntoSentences(rawText);
      let matchedSentence = null;
      for (const sentence of sentences) {
        const lower = sentence.toLowerCase();
        const allFound = evidenceTerms.every(term => lower.includes(term));
        if (allFound) {
          matchedSentence = sentence;
          break;
        }
      }

      if (matchedSentence) {
        console.log(`[check:sources] OK [${id}${sourceList.length > 1 ? ` #${sIdx + 1}` : ''}]: Evidence matched in 1 sentence.`);
        let supportingSentence = matchedSentence.trim();
        const words = supportingSentence.split(/\s+/);
        if (words.length > 15) {
          const lowerWords = words.map(w => w.toLowerCase());
          const firstEvToken = (evidenceTerms[0] || '').split(/\s+/)[0];
          let idx = lowerWords.findIndex(w => w.includes(firstEvToken));
          if (idx < 0) idx = 0;
          let start = Math.max(0, idx - 4);
          let end = Math.min(words.length, start + 15);
          if (end - start < 15 && start > 0) {
            start = Math.max(0, end - 15);
          }
          supportingSentence = words.slice(start, end).join(' ');
        }
        supportLines.push(`${id}${sourceList.length > 1 ? `-${sIdx + 1}` : ''} | OK | ${supportingSentence}`);
      } else {
        console.error(`[check:sources] FAIL [${id}${sourceList.length > 1 ? ` #${sIdx + 1}` : ''}]: Missing evidence terms [${evidenceTerms.join(', ')}] in any single sentence.`);
        failCount++;
        allSourcesOk = false;
        supportLines.push(`${id}${sourceList.length > 1 ? `-${sIdx + 1}` : ''} | FAIL | Terms missing: [${evidenceTerms.join(', ')}]`);
      }
    }

    if (allSourcesOk) {
      okCount++;
    }
  }

  fs.writeFileSync(SUPPORT_FILE, supportLines.join('\n') + '\n', 'utf8');
  console.log(`[check:sources] Summary: OK=${okCount}, WARN=${warnCount}, FAIL=${failCount}`);
  console.log(`[check:sources] Support sentences written to ${SUPPORT_FILE}`);

  if (failCount > 0 || warnCount > 0) {
    process.exit(1);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  checkSources().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
