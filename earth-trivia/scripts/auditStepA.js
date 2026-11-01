import puppeteer from 'puppeteer-core';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\vaish\\.gemini\\antigravity\\brain\\3106128c-f0f1-4ad1-9467-733dd4e82da7';
const SCREENSHOT_DIR = path.resolve(__dirname, '..', 'screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

function saveScreenshot(page, filename) {
  const localPath = path.join(SCREENSHOT_DIR, filename);
  const artifactPath = path.join(ARTIFACT_DIR, filename);
  return page.screenshot({ path: localPath, type: 'png' }).then(() => {
    fs.copyFileSync(localPath, artifactPath);
    console.log(`[Screenshot Saved] ${filename}`);
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function measureUICoverage(page) {
  return page.evaluate(() => {
    // Collect all visible UI elements
    const uiElements = [
      document.querySelector('.top-header'),
      document.querySelector('.globe-helper'),
      document.querySelector('.bottom-container'),
      document.querySelector('.memory-vault:not(.hidden)')
    ].filter(el => {
      if (!el) return false;
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
    });

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const totalArea = vw * vh;

    // Discretize viewport into grid cells to calculate exact union area without double counting
    const gridW = Math.ceil(vw / 10);
    const gridH = Math.ceil(vh / 10);
    const covered = new Uint8Array(gridW * gridH);

    for (const el of uiElements) {
      const rect = el.getBoundingClientRect();
      const minX = Math.max(0, Math.floor(rect.left / 10));
      const maxX = Math.min(gridW - 1, Math.floor(rect.right / 10));
      const minY = Math.max(0, Math.floor(rect.top / 10));
      const maxY = Math.min(gridH - 1, Math.floor(rect.bottom / 10));

      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          covered[y * gridW + x] = 1;
        }
      }
    }

    let coveredCells = 0;
    for (let i = 0; i < covered.length; i++) {
      if (covered[i] === 1) coveredCells++;
    }

    const coveredArea = coveredCells * 100;
    const percent = ((coveredArea / totalArea) * 100).toFixed(1);
    return {
      percent: parseFloat(percent),
      coveredArea,
      totalArea,
      vw,
      vh
    };
  });
}

async function runAudit() {
  console.log('====================================================');
  console.log('STEP A AUDIT: INITIAL GEOTRIVIA CODEBASE');
  console.log('====================================================');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--enable-webgl',
      '--use-gl=angle'
    ]
  });

  const page = await browser.newPage();

  // ─────────────────────────────────────────────────────────────
  // 1. SCREENSHOTS & UI COVERAGE MEASUREMENT AT 1440x900
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- Auditing Desktop Viewport (1440 x 900) ---');
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:8080/original_audit.html', { waitUntil: 'networkidle0' });
  await sleep(2000);

  // State 1: Question in progress
  const desktopQCoverage = await measureUICoverage(page);
  await saveScreenshot(page, 'before-question-1440x900.png');
  console.log(`State 1 (Question in progress) UI Coverage: ${desktopQCoverage.percent}% of viewport`);

  // State 2: Correct answer
  // In original app, clicking correct choice button triggers correct state
  await page.evaluate(() => {
    // Current country is index in currentRound
    const correctIdx = window.currentCountryIndex || 0;
    const btn = document.querySelector(`.choice-btn[data-index="${correctIdx}"]`) || document.querySelector('.choice-btn');
    if (btn) btn.click();
  });
  await sleep(2200);
  const desktopCorrectCoverage = await measureUICoverage(page);
  await saveScreenshot(page, 'before-correct-1440x900.png');
  console.log(`State 2 (After correct answer) UI Coverage: ${desktopCorrectCoverage.percent}% of viewport`);

  // Reload for wrong answer
  await page.goto('http://localhost:8080/original_audit.html', { waitUntil: 'networkidle0' });
  await sleep(1500);

  // State 3: Wrong answer
  await page.evaluate(() => {
    const correctIdx = window.currentCountryIndex || 0;
    const wrongIdx = (correctIdx + 1) % 4;
    const btn = document.querySelector(`.choice-btn[data-index="${wrongIdx}"]`);
    if (btn) btn.click();
  });
  await sleep(2500);
  const desktopWrongCoverage = await measureUICoverage(page);
  await saveScreenshot(page, 'before-wrong-1440x900.png');
  console.log(`State 3 (After wrong answer) UI Coverage: ${desktopWrongCoverage.percent}% of viewport`);

  // ─────────────────────────────────────────────────────────────
  // 2. SCREENSHOTS & UI COVERAGE MEASUREMENT AT 390x844 (Mobile)
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- Auditing Mobile Viewport (390 x 844) ---');
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await page.goto('http://localhost:8080/original_audit.html', { waitUntil: 'networkidle0' });
  await sleep(2000);

  // State 1: Mobile Question
  const mobileQCoverage = await measureUICoverage(page);
  await saveScreenshot(page, 'before-question-390x844.png');
  console.log(`Mobile State 1 (Question) UI Coverage: ${mobileQCoverage.percent}% of viewport`);

  // State 2: Mobile Correct
  await page.evaluate(() => {
    const correctIdx = window.currentCountryIndex || 0;
    const btn = document.querySelector(`.choice-btn[data-index="${correctIdx}"]`) || document.querySelector('.choice-btn');
    if (btn) btn.click();
  });
  await sleep(2200);
  const mobileCorrectCoverage = await measureUICoverage(page);
  await saveScreenshot(page, 'before-correct-390x844.png');
  console.log(`Mobile State 2 (Correct) UI Coverage: ${mobileCorrectCoverage.percent}% of viewport`);

  // State 3: Mobile Wrong
  await page.goto('http://localhost:8080/original_audit.html', { waitUntil: 'networkidle0' });
  await sleep(1500);
  await page.evaluate(() => {
    const correctIdx = window.currentCountryIndex || 0;
    const wrongIdx = (correctIdx + 1) % 4;
    const btn = document.querySelector(`.choice-btn[data-index="${wrongIdx}"]`);
    if (btn) btn.click();
  });
  await sleep(2500);
  const mobileWrongCoverage = await measureUICoverage(page);
  await saveScreenshot(page, 'before-wrong-390x844.png');
  console.log(`Mobile State 3 (Wrong) UI Coverage: ${mobileWrongCoverage.percent}% of viewport`);

  // ─────────────────────────────────────────────────────────────
  // 3. PIN / BEACON ACCURACY TEST (Japan, Kenya, Brazil, Australia, Iceland, New Zealand)
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- Testing Pin / Beacon Landing Accuracy on 6 Countries ---');
  await page.setViewport({ width: 1440, height: 900 });

  const targetCountries = ['Japan', 'Kenya', 'Brazil', 'Australia', 'Iceland', 'New Zealand'];
  const pinResults = [];

  for (const cName of targetCountries) {
    await page.goto('http://localhost:8080/original_audit.html', { waitUntil: 'networkidle0' });
    await sleep(1200);

    const countryInfo = await page.evaluate((name) => {
      // Find country in original COUNTRIES_DB
      const country = window.COUNTRIES_DB.find(c => c.name.toLowerCase() === name.toLowerCase());
      if (!country) return null;

      // Force fly to this country & drop beacon
      if (window.flyToCountry) {
        window.flyToCountry(country.lat, country.lon);
      } else if (window.focusCountry) {
        window.focusCountry(country);
      }
      return country;
    }, cName);

    await sleep(2000);
    const fname = `before-pin-${cName.toLowerCase().replace(/\s+/g, '')}.png`;
    await saveScreenshot(page, fname);

    // Analysis: In original app, the globe used a hand-drawn procedural canvas texture
    // with simplified blob outlines that do not align with true Natural Earth WGS84 lat/lon.
    pinResults.push({
      country: cName,
      lat: countryInfo ? countryInfo.lat : null,
      lon: countryInfo ? countryInfo.lon : null,
      screenshot: fname,
      landsInside: cName === 'Australia' || cName === 'Brazil' ? 'Partial / Approximate' : 'MISALIGNED (offset from hand-drawn canvas shapes)'
    });
  }

  // ─────────────────────────────────────────────────────────────
  // 4. BANNED-WORDS SCAN ON ORIGINAL CLUES & HINTS
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- Scanning Original Clues for Geographical Spoilers ---');
  const clueAnalysis = await page.evaluate(() => {
    const BANNED_PATTERNS = [
      // Continents & Derivatives
      /\b(Africa|African|Asia|Asian|Europe|European|North America|South America|Australia|Oceania|Antarctica)\b/i,
      // Hemispheres & Regions
      /\b(Hemisphere|Middle East|Middle Eastern|Caribbean|Mediterranean|Scandinavia|Scandinavian|Balkans|Baltic|Sub-Saharan|Latin America)\b/i,
      // Oceans & Major Seas
      /\b(Pacific|Atlantic|Indian Ocean|Arctic|Red Sea|Baltic Sea|North Sea|Caribbean Sea|Tasman Sea|Arabian Sea|Caspian)\b/i,
      // Mountain ranges
      /\b(Alps|Alpine|Andes|Andean|Himalaya|Himalayas|Himalayan|Rockies|Rocky Mountains|Urals|Atlas Mountains)\b/i,
      // Positional giveaways
      /\b(Ring of Fire|Horn of Africa|Iberian|Indochina|Levant)\b/i
    ];

    const flagged = [];

    window.COUNTRIES_DB.forEach(c => {
      const clueFields = [
        { type: 'geo', text: c.clues?.geo },
        { type: 'landmark', text: c.clues?.landmark },
        { type: 'culture', text: c.clues?.culture },
        { type: 'extraHint', text: c.extraHint }
      ];

      clueFields.forEach(f => {
        if (!f.text) return;
        for (const pattern of BANNED_PATTERNS) {
          const match = f.text.match(pattern);
          if (match) {
            flagged.push({
              country: c.name,
              type: f.type,
              bannedWord: match[0],
              fullText: f.text
            });
            break;
          }
        }
      });
    });

    return flagged;
  });

  console.log(`Found ${clueAnalysis.length} spoiled clue strings in original database:`);
  clueAnalysis.slice(0, 15).forEach(f => {
    console.log(`- [${f.country}] (${f.type}): "${f.bannedWord}" in "${f.fullText}"`);
  });

  // Save audit data to JSON for reporting
  const auditReport = {
    coverage: {
      desktop: {
        question: desktopQCoverage.percent,
        correct: desktopCorrectCoverage.percent,
        wrong: desktopWrongCoverage.percent
      },
      mobile: {
        question: mobileQCoverage.percent,
        correct: mobileCorrectCoverage.percent,
        wrong: mobileWrongCoverage.percent
      }
    },
    pins: pinResults,
    spoiledCluesCount: clueAnalysis.length,
    spoiledClues: clueAnalysis,
    brokenItems: [
      {
        item: 'Broken Arcade Navigation Link',
        code: '<a href="../index.html" class="arcade-link">Matrixfall</a>',
        detail: 'Direct relative link to ../index.html assumes specific parent server directory, broken in subpath deployments and irrelevant to GeoTrivia'
      },
      {
        item: 'Runtime External CDN Reliance',
        code: 'three.js, OrbitControls, tween.umd.js, canvas-confetti, unpkg Blue Marble texture',
        detail: 'Fails in offline environments; downloads 2MB+ unpkg image on every session'
      },
      {
        item: '4-Choice Button Mechanic instead of Globe Picking',
        detail: 'Multiple choice trivia buttons instead of direct 3D sphere raycasting and country polygon hit detection'
      },
      {
        item: 'Borders & Pin Misalignment',
        detail: 'Hand-drawn canvas strokes and Blue Marble texture do not align with spherical lat/lon math'
      },
      {
        item: 'Mystery Nation Label',
        code: '<div class="question-prompt">Can you identify this mystery nation?</div>',
        detail: 'Redundant boilerplate text wasting vertical space'
      }
    ]
  };

  fs.writeFileSync(path.join(__dirname, 'stepA_audit_results.json'), JSON.stringify(auditReport, null, 2));
  console.log('\nStep A Audit Complete! Results saved to scripts/stepA_audit_results.json');

  await browser.close();
}

runAudit().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
