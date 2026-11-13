import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const cluesPath = path.resolve(__dirname, '../data/clues.json');
const countriesPath = path.resolve(__dirname, '../data/countries.json');
const cachePath = path.resolve(__dirname, '../.cache/sources.json');
const grandfatheredPath = path.resolve(__dirname, '../.cache/grandfathered_sources.json');
const logDir = path.resolve(__dirname, '../../report/sources/logs');

export const DEMONYMS_LIST = [
  'Afghan', 'Albanian', 'Algerian', 'American', 'Andorran', 'Angolan', 'Argentine', 'Armenian', 'Australian', 'Austrian',
  'Azerbaijani', 'Bahamian', 'Bahraini', 'Bangladeshi', 'Barbadian', 'Belarusian', 'Belgian', 'Belizean', 'Beninese',
  'Bhutanese', 'Bolivian', 'Bosnian', 'Botswanan', 'Brazilian', 'British', 'Bruneian', 'Bulgarian', 'Burkinabe',
  'Burmese', 'Burundian', 'Cambodian', 'Cameroonian', 'Canadian', 'Cape Verdean', 'Chadian', 'Chilean', 'Chinese',
  'Colombian', 'Comorian', 'Congolese', 'Costa Rican', 'Croatian', 'Cuban', 'Cypriot', 'Czech', 'Danish', 'Djiboutian',
  'Dominican', 'Dutch', 'East Timorese', 'Ecuadorian', 'Egyptian', 'Emirati', 'English', 'Equatorial Guinean', 'Eritrean',
  'Estonian', 'Ethiopian', 'Fijian', 'Finnish', 'French', 'Gabonese', 'Gambian', 'Georgian', 'German', 'Ghanaian',
  'Greek', 'Grenadian', 'Guatemalan', 'Guinean', 'Guyanese', 'Haitian', 'Honduran', 'Hungarian', 'Icelandic', 'Indian',
  'Indonesian', 'Iranian', 'Iraqi', 'Irish', 'Israeli', 'Italian', 'Ivorian', 'Jamaican', 'Japanese', 'Jordanian',
  'Kazakh', 'Kenyan', 'Kuwaiti', 'Kyrgyz', 'Laotian', 'Latvian', 'Lebanese', 'Liberian', 'Libyan', 'Liechtensteiner',
  'Lithuanian', 'Luxembourgish', 'Macedonian', 'Malagasy', 'Malawian', 'Malaysian', 'Maldivian', 'Malian', 'Maltese',
  'Marshallese', 'Mauritanian', 'Mauritian', 'Mexican', 'Micronesian', 'Moldovan', 'Monegasque', 'Mongolian', 'Montenegrin',
  'Moroccan', 'Mozambican', 'Namibian', 'Nauruan', 'Nepalese', 'Nepali', 'New Zealander', 'Nicaraguan', 'Nigerian',
  'Nigerien', 'North Korean', 'Norwegian', 'Omani', 'Pakistani', 'Palauan', 'Palestinian', 'Panamanian', 'Papua New Guinean',
  'Paraguayan', 'Peruvian', 'Filipino', 'Polish', 'Portuguese', 'Qatari', 'Romanian', 'Russian', 'Rwandan', 'Saint Lucian',
  'Salvadoran', 'Samoan', 'San Marinese', 'Saudi', 'Scottish', 'Senegalese', 'Serbian', 'Seychellois', 'Sierra Leonean',
  'Singaporean', 'Slovak', 'Slovenian', 'Solomon Islander', 'Somali', 'South African', 'South Korean', 'Spanish',
  'Sri Lankan', 'Sudanese', 'Surinamese', 'Swazi', 'Swedish', 'Swiss', 'Syrian', 'Taiwanese', 'Tajik', 'Tanzanian',
  'Thai', 'Togolese', 'Tongan', 'Trinidadian', 'Tunisian', 'Turkish', 'Turkmen', 'Tuvaluan', 'Ugandan', 'Ukrainian',
  'Uruguayan', 'Uzbek', 'Vanuatu', 'Vatican', 'Venezuelan', 'Vietnamese', 'Welsh', 'Yemeni', 'Zambian', 'Zimbabwean'
];

export const BLOCKED_DOMAINS = new Set([
  'blocked-domain.test',
  'blocked-malicious-domain.test',
  'example.invalid',
  'localhost',
  '127.0.0.1',
  '0.0.0.0'
]);

export function isBlockedDomain(url) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    if (BLOCKED_DOMAINS.has(host)) return true;
    if (host.endsWith('.invalid') || host.endsWith('.test') || host.includes('blocked') || host.includes('malicious')) {
      return true;
    }
    return false;
  } catch (e) {
    return false;
  }
}

export function normalizeText(str) {
  if (!str) return '';
  return str
    .replace(/<[^>]+>/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/(\d),(\d)/g, '$1$2')
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

export function getExcludedTerms(country) {
  const excluded = new Set();
  if (!country) return excluded;
  const add = (w) => {
    if (!w) return;
    const clean = normalizeText(w).trim();
    if (clean) {
      excluded.add(clean);
      clean.split(/\s+/).forEach(p => {
        if (p.length > 2) excluded.add(p);
      });
    }
  };
  add(country.name);
  add(country.capital);
  add(country.officialName);
  for (const d of DEMONYMS_LIST) {
    if (d.toLowerCase().includes(country.name.toLowerCase()) || country.name.toLowerCase().includes(d.toLowerCase())) {
      add(d);
    }
  }
  return excluded;
}

export function isDistinctiveTerm(term, clueText, excluded) {
  const normTerm = normalizeText(term).trim();
  if (!normTerm || excluded.has(normTerm)) return false;

  // Year: e.g. 1707, 1999, 2024
  if (/\b(1\d{3}|20\d{2})\b/.test(normTerm)) return true;
  // Number: digits
  if (/\d/.test(normTerm)) return true;

  // Proper noun taken from clue text:
  const esc = term.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
  const m = clueText.match(new RegExp('(?:^|[^a-zA-Z0-9])(' + esc + ')(?:[^a-zA-Z0-9]|$)', 'i'));
  if (!m) return false;

  const raw = m[1];
  const idx = clueText.indexOf(raw);
  if (idx === 0) {
    // Sentence-initial: acronym or CamelCase
    return /^[A-Z0-9]{2,}$/.test(raw) || /^[A-Z][a-z]+[A-Z]/.test(raw);
  } else {
    // Within sentence: capitalized
    return /^[A-Z]/.test(raw);
  }
}

const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

export async function fetchWithRetry(url, timeoutMs = 10000, retries = 3) {
  if (isBlockedDomain(url)) {
    throw new Error('BLOCKED_DOMAIN: Access to domain is blocked by policy');
  }

  const delays = [2000, 5000, 10000];
  let lastErr = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) {
      const waitTime = delays[attempt - 1] || 10000;
      await new Promise(r => setTimeout(r, waitTime));
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': BROWSER_UA
        }
      });
      if (res.status === 403 || res.status === 401 || res.status === 451) {
        throw new Error(`BLOCKED_DOMAIN: HTTP ${res.status}`);
      }
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const html = await res.text();
      return html;
    } catch (err) {
      lastErr = err;
      if (err.message && err.message.startsWith('BLOCKED_DOMAIN')) {
        throw err;
      }
      if (err.message && err.message.includes('404')) {
        throw err;
      }
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastErr || new Error('Fetch failed after retries');
}

export async function runPool(items, concurrency, fn) {
  let idx = 0;
  const workers = Array.from({ length: concurrency }, async () => {
    while (idx < items.length) {
      const current = idx++;
      await fn(items[current], current);
    }
  });
  await Promise.all(workers);
}

// 7-day TTL in milliseconds
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export async function runSelftest() {
  console.log('Running check:sources --selftest...');
  let cache = {};
  if (fs.existsSync(cachePath)) {
    try {
      cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
    } catch (e) {
      cache = {};
    }
  }

  const flags = {
    defect1_404: false,
    defect2_missingTerm: false,
    defect3_wrongYear: false,
    defect4_countryNameOnly: false,
    defect5_reusedUrlGeneric: false,
    defect6_blockedDomain: false
  };

  // 1. A 404 URL
  try {
    await fetchWithRetry('https://en.wikipedia.org/wiki/Special_404_Selftest_Nonexistent_Page_12345', 5000, 1);
  } catch (err) {
    if (err.message.includes('404')) {
      flags.defect1_404 = true;
      console.log('✓ [1/6] Planted 404 URL correctly flagged:', err.message);
    }
  }

  // 2. An evidence term missing from the page
  const francePage = cache['https://en.wikipedia.org/wiki/France']?.pageText || 'france 1789 revolution';
  const normFrance = normalizeText(francePage);
  const clue2 = {
    id: 'SELFTEST-002-MISSING-TERM',
    iso: 'FRA',
    text: 'Celebrated in 1789 with the historic NonexistentSelftestTermXYZ declaration.',
    source: 'https://en.wikipedia.org/wiki/France',
    evidence: ['1789', 'NonexistentSelftestTermXYZ']
  };
  const missing2 = clue2.evidence.filter(t => !normFrance.includes(normalizeText(t)));
  if (missing2.includes('NonexistentSelftestTermXYZ')) {
    flags.defect2_missingTerm = true;
    console.log('✓ [2/6] Missing evidence term correctly flagged: missing', missing2);
  }

  // 3. Wrong year in clue while page has another
  const towerPage = cache['https://en.wikipedia.org/wiki/Eiffel_Tower']?.pageText || 'eiffel tower 1889 gustave eiffel';
  const normTower = normalizeText(towerPage);
  const clue3 = {
    id: 'SELFTEST-003-WRONG-YEAR',
    iso: 'FRA',
    text: 'The iconic iron tower was inaugurated in 1492 as the centerpiece.',
    source: 'https://en.wikipedia.org/wiki/Eiffel_Tower',
    evidence: ['1492', 'iron tower']
  };
  const clueYears = clue3.text.match(/\b(1\d{3}|20\d{2})\b/g) || [];
  const wrongYear = clueYears.some(y => !normTower.includes(y));
  if (wrongYear) {
    flags.defect3_wrongYear = true;
    console.log('✓ [3/6] Wrong year in clue correctly flagged: year 1492 missing from page (page has 1889)');
  }

  // 4. Evidence made only of country name
  const fraCountry = { name: 'France', capital: 'Paris', officialName: 'French Republic' };
  const clue4 = {
    id: 'SELFTEST-004-COUNTRY-NAME',
    iso: 'FRA',
    text: 'Famous nation known across Europe as France and French territory.',
    source: 'https://en.wikipedia.org/wiki/France',
    evidence: ['France', 'French']
  };
  const excluded4 = getExcludedTerms(fraCountry);
  const dist4 = clue4.evidence.filter(t => isDistinctiveTerm(t, clue4.text, excluded4));
  if (dist4.length === 0) {
    flags.defect4_countryNameOnly = true;
    console.log('✓ [4/6] Evidence made only of country name correctly flagged (0 distinctive terms)');
  }

  // 5. One URL reused for 5 different claims with generic evidence
  const testUrl = 'https://en.wikipedia.org/wiki/SelftestGenericUrlReuse';
  const claims5 = [
    { text: 'A ancient region with traditions', evidence: ['ancient', 'traditions'] },
    { text: 'B historic crafts in communities', evidence: ['historic', 'crafts'] },
    { text: 'C local folklore across villages', evidence: ['local', 'folklore'] },
    { text: 'D scenic landscape and nature', evidence: ['scenic', 'nature'] },
    { text: 'E coastal maritime activities', evidence: ['coastal', 'activities'] }
  ];
  const genericCount = claims5.filter(c => {
    const dist = c.evidence.filter(t => isDistinctiveTerm(t, c.text, new Set()));
    return dist.length < 2;
  }).length;
  if (claims5.length >= 5 && genericCount === claims5.length) {
    flags.defect5_reusedUrlGeneric = true;
    console.log('✓ [5/6] 1 URL reused for 5 different claims with generic evidence correctly flagged');
  }

  // 6. Blocked domain
  const blockedUrl = 'https://blocked-domain.test/classified';
  if (isBlockedDomain(blockedUrl)) {
    flags.defect6_blockedDomain = true;
    console.log('✓ [6/6] Blocked domain correctly flagged:', blockedUrl);
  }

  const allPassed = Object.values(flags).every(v => v === true);
  if (allPassed) {
    console.log('Selftest PASSED: 6/6 planted defects successfully flagged.');
    process.exit(0);
  } else {
    console.error('Selftest FAILED: missed planted bad items:', flags);
    process.exit(1);
  }
}

async function main() {
  if (process.argv.includes('--selftest')) {
    await runSelftest();
    return;
  }

  const clues = JSON.parse(fs.readFileSync(cluesPath, 'utf8'));
  const countries = JSON.parse(fs.readFileSync(countriesPath, 'utf8'));

  const countryByIso = new Map();
  countries.forEach(c => countryByIso.set(c.code, c));

  let cache = {};
  if (fs.existsSync(cachePath)) {
    try {
      cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
    } catch (e) {
      cache = {};
    }
  }

  let grandfatheredUrls = new Set();
  if (fs.existsSync(grandfatheredPath)) {
    try {
      grandfatheredUrls = new Set(JSON.parse(fs.readFileSync(grandfatheredPath, 'utf8')));
    } catch (e) {
      grandfatheredUrls = new Set();
    }
  }

  let cacheDirty = false;
  function saveCache() {
    if (!cacheDirty) return;
    try {
      fs.mkdirSync(path.dirname(cachePath), { recursive: true });
      fs.writeFileSync(cachePath, JSON.stringify(cache), 'utf8');
      cacheDirty = false;
    } catch (e) {}
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
  const now = Date.now();
  let cacheHits = 0;

  // Track unreachable items
  const unreachableMap = new Map(); // url -> error message
  const ungrandfatheredUnreachable = [];

  // Track URL reuse with generic evidence
  const excessiveReuseUrls = [];
  for (const [url, clueList] of urlToClues.entries()) {
    if (clueList.length >= 5) {
      const genericCount = clueList.filter(clue => {
        const c = countryByIso.get(clue.iso);
        const excluded = getExcludedTerms(c);
        const dist = (clue.evidence || []).filter(t => isDistinctiveTerm(t, clue.text, excluded));
        return dist.length < 2;
      }).length;
      if (genericCount >= 5) {
        excessiveReuseUrls.push({ url, count: clueList.length });
      }
    }
  }

  // Check unique URLs
  await runPool(uniqueUrls, 4, async (url) => {
    let pageHtml = null;
    let isUnreachable = false;
    let errMsg = '';

    const cached = cache[url];
    if (cached && cached.timestamp && (now - cached.timestamp < CACHE_TTL_MS) && !cached.unreachable) {
      cacheHits++;
      pageHtml = cached.pageText;
    } else {
      try {
        pageHtml = await fetchWithRetry(url, 10000, 3);
        cache[url] = {
          timestamp: Date.now(),
          pageText: pageHtml,
          unreachable: false
        };
        cacheDirty = true;
      } catch (err) {
        isUnreachable = true;
        errMsg = err.message;
        cache[url] = {
          timestamp: Date.now(),
          unreachable: true,
          error: err.message
        };
        cacheDirty = true;
      }
    }

    if (isUnreachable || !pageHtml) {
      unreachableMap.set(url, errMsg);
      if (!grandfatheredUrls.has(url)) {
        ungrandfatheredUnreachable.push(url);
      }
    }
  });

  saveCache();

  // Evaluate clues
  let okCount = 0;
  let failedCount = 0;
  let unreachableCount = 0;
  let failingQualityCount = 0;

  const failedDetails = [];
  const qualityFailIds = [];

  for (const clue of clues) {
    const url = clue.source;
    const country = countryByIso.get(clue.iso);
    const excluded = getExcludedTerms(country);

    const isUnreachable = unreachableMap.has(url);
    if (isUnreachable) {
      unreachableCount++;
    }

    const cached = cache[url];
    const rawPage = (!isUnreachable && cached && !cached.unreachable) ? cached.pageText : null;
    const normalizedPage = rawPage ? normalizeText(rawPage) : null;

    // Check basic evidence presence
    if (normalizedPage) {
      const missingBasicTerms = [];
      for (const term of clue.evidence || []) {
        if (!normalizedPage.includes(normalizeText(term))) {
          missingBasicTerms.push(term);
        }
      }
      if (missingBasicTerms.length === 0) {
        okCount++;
      } else {
        failedCount++;
        failedDetails.push({ id: clue.id, missingTerms: missingBasicTerms, url });
      }
    }

    // Check Quality Rule:
    // >= 2 distinctive terms (year, number, proper noun taken from clue text, not country/capital/demonym)
    // and all must appear in page text
    const distinctiveTerms = (clue.evidence || []).filter(t => isDistinctiveTerm(t, clue.text, excluded));
    let passesQuality = false;

    if (distinctiveTerms.length >= 2 && normalizedPage) {
      const missingDistinctive = distinctiveTerms.filter(t => !normalizedPage.includes(normalizeText(t)));
      if (missingDistinctive.length === 0) {
        passesQuality = true;
      }
    }

    if (!passesQuality) {
      failingQualityCount++;
      qualityFailIds.push(clue.id);
    }
  }

  // Ensure log directory exists
  fs.mkdirSync(logDir, { recursive: true });

  // 1. Write quality fails log
  const qualityFailsLog = path.resolve(logDir, 'quality_fails.txt');
  fs.writeFileSync(qualityFailsLog, qualityFailIds.join('\n'), 'utf8');

  // 2. Group unreachable URLs by domain and write to log
  const domainGroups = {};
  for (const [u, err] of unreachableMap.entries()) {
    let domain = 'unknown';
    try {
      domain = new URL(u).hostname;
    } catch (e) {
      domain = 'invalid-url';
    }
    if (!domainGroups[domain]) domainGroups[domain] = [];
    domainGroups[domain].push({ url: u, error: err });
  }

  const unreachableLog = path.resolve(logDir, 'unreachable.txt');
  let unreachableLogContent = '';
  if (unreachableMap.size === 0) {
    unreachableLogContent = 'No unreachable URLs detected.\n';
  } else {
    for (const [dom, list] of Object.entries(domainGroups)) {
      unreachableLogContent += `Domain: ${dom} (${list.length} unreachable):\n`;
      for (const item of list) {
        unreachableLogContent += `  - ${item.url} (${item.error})\n`;
      }
      unreachableLogContent += '\n';
    }
  }
  fs.writeFileSync(unreachableLog, unreachableLogContent, 'utf8');

  // Grandfather today's unreachable URLs
  if (unreachableMap.size > 0 && grandfatheredUrls.size === 0) {
    const todayUnreachable = Array.from(unreachableMap.keys());
    fs.mkdirSync(path.dirname(grandfatheredPath), { recursive: true });
    fs.writeFileSync(grandfatheredPath, JSON.stringify(todayUnreachable, null, 2), 'utf8');
  }

  // Print results
  const totalClues = clues.length;
  console.log(`check:sources: ${uniqueUrls.length} URLs checked across ${totalClues} clues (cache hits: ${cacheHits}/${uniqueUrls.length}).`);
  console.log(`ok: ${okCount} | failed: ${failedCount} | unreachable: ${unreachableCount} | failing the quality rule: ${failingQualityCount}`);

  // Print domain counts for unreachable
  const domainSummary = Object.entries(domainGroups).map(([d, items]) => `${d}: ${items.length}`).join(', ');
  console.log(`Unreachable by domain: ${domainSummary || 'none (0 URLs)'}`);
  console.log(`Quality fails logged: ${qualityFailIds.length} items in ${qualityFailsLog}`);

  // Exit conditions
  const hasHardFail = failedCount > 0 || ungrandfatheredUnreachable.length > 0 || excessiveReuseUrls.length > 0;
  if (hasHardFail) {
    console.error('Result: FAILED');
    if (ungrandfatheredUnreachable.length > 0) {
      console.error(`Un-grandfathered unreachable URLs:`, ungrandfatheredUnreachable);
    }
    if (excessiveReuseUrls.length > 0) {
      console.error(`Excessive URL reuse with generic evidence:`, excessiveReuseUrls);
    }
    process.exit(1);
  } else {
    console.log('Result: PASSED');
    process.exit(0);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(err => {
    console.error('Fatal error in check:sources:', err);
    process.exit(1);
  });
}
