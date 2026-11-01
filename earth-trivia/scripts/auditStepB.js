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

async function measureStepBUICoverage(page) {
  return page.evaluate(() => {
    // Collect all visible UI elements (excluding the 3D globe canvas itself)
    const uiElements = [
      document.querySelector('#topHud:not(.hidden)'),
      document.querySelector('#clueCard:not(.hidden)'),
      document.querySelector('#memoryVault:not(.hidden)'),
      document.querySelector('#touchConfirmBtn:not(.hidden)')
    ].filter(el => {
      if (!el) return false;
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
    });

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const totalArea = vw * vh;

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
    const globePercent = (100 - parseFloat(percent)).toFixed(1);

    return {
      uiPercent: parseFloat(percent),
      globePercent: parseFloat(globePercent),
      coveredArea,
      totalArea,
      vw,
      vh
    };
  });
}

async function runStepBAudit() {
  console.log('====================================================');
  console.log('STEP B AUDIT: REBUILT GEOTRIVIA 3D GLOBE GAME');
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
  // 1. DESKTOP 1440x900 MEASUREMENTS & SCREENSHOTS
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- Auditing Desktop Viewport (1440 x 900) ---');
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:8080/index.html', { waitUntil: 'networkidle0' });
  await sleep(1500);

  // Start expedition in Clue mode
  await page.click('#startExpeditionBtn');
  await sleep(1500);

  // State 1: Question in progress
  const desktopQCoverage = await measureStepBUICoverage(page);
  await saveScreenshot(page, 'after-question-1440x900.png');
  console.log(`State 1 (Question) UI Coverage: ${desktopQCoverage.uiPercent}% (Globe: ${desktopQCoverage.globePercent}%)`);

  // State 2: Correct answer
  await page.evaluate(() => {
    const g = window.__geotrivia;
    const target = g.game.currentCountry;
    g.game.handleGuess(target, target.lat, target.lon);
  });
  await sleep(2500);
  const desktopCorrectCoverage = await measureStepBUICoverage(page);
  await saveScreenshot(page, 'after-correct-1440x900.png');
  console.log(`State 2 (Correct) UI Coverage: ${desktopCorrectCoverage.uiPercent}% (Globe: ${desktopCorrectCoverage.globePercent}%)`);

  // State 3: Wrong answer
  await page.evaluate(() => {
    const g = window.__geotrivia;
    g.game.nextRound();
  });
  await sleep(1000);
  await page.evaluate(() => {
    const g = window.__geotrivia;
    const target = g.game.currentCountry;
    const wrong = g.game.fullDatabase.find(c => Math.abs(c.lat - target.lat) > 40 && Math.abs(c.lon - target.lon) > 50) || g.game.fullDatabase[0];
    g.game.handleGuess(wrong, wrong.lat, wrong.lon);
  });
  await sleep(2500);
  const desktopWrongCoverage = await measureStepBUICoverage(page);
  await saveScreenshot(page, 'after-wrong-1440x900.png');
  console.log(`State 3 (Wrong) UI Coverage: ${desktopWrongCoverage.uiPercent}% (Globe: ${desktopWrongCoverage.globePercent}%)`);

  // ─────────────────────────────────────────────────────────────
  // 2. MOBILE 390x844 MEASUREMENTS & SCREENSHOTS
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- Auditing Mobile Viewport (390 x 844) ---');
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await page.goto('http://localhost:8080/index.html', { waitUntil: 'networkidle0' });
  await sleep(1500);
  await page.click('#startExpeditionBtn');
  await sleep(1500);

  // State 1: Mobile Question
  const mobileQCoverage = await measureStepBUICoverage(page);
  await saveScreenshot(page, 'after-question-390x844.png');
  console.log(`Mobile State 1 (Question) UI Coverage: ${mobileQCoverage.uiPercent}% (Globe: ${mobileQCoverage.globePercent}%)`);

  // State 2: Mobile Correct
  await page.evaluate(() => {
    const g = window.__geotrivia;
    const target = g.game.currentCountry;
    g.game.handleGuess(target, target.lat, target.lon);
  });
  await sleep(2500);
  const mobileCorrectCoverage = await measureStepBUICoverage(page);
  await saveScreenshot(page, 'after-correct-390x844.png');
  console.log(`Mobile State 2 (Correct) UI Coverage: ${mobileCorrectCoverage.uiPercent}% (Globe: ${mobileCorrectCoverage.globePercent}%)`);

  // State 3: Mobile Wrong
  await page.evaluate(() => {
    const g = window.__geotrivia;
    g.game.nextRound();
  });
  await sleep(1000);
  await page.evaluate(() => {
    const g = window.__geotrivia;
    const target = g.game.currentCountry;
    const wrong = g.game.fullDatabase.find(c => Math.abs(c.lat - target.lat) > 40 && Math.abs(c.lon - target.lon) > 50) || g.game.fullDatabase[0];
    g.game.handleGuess(wrong, wrong.lat, wrong.lon);
  });
  await sleep(2500);
  const mobileWrongCoverage = await measureStepBUICoverage(page);
  await saveScreenshot(page, 'after-wrong-390x844.png');
  console.log(`Mobile State 3 (Wrong) UI Coverage: ${mobileWrongCoverage.uiPercent}% (Globe: ${mobileWrongCoverage.globePercent}%)`);

  // ─────────────────────────────────────────────────────────────
  // 3. PIN / BEACON ACCURACY TEST ON 6 COUNTRIES (Japan, Kenya, Brazil, Australia, Iceland, New Zealand)
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- Testing Natural Earth Pin Landing on 6 Countries ---');
  await page.setViewport({ width: 1440, height: 900 });

  const targetCountries = ['Japan', 'Kenya', 'Brazil', 'Australia', 'Iceland', 'New Zealand'];
  const pinResults = [];

  for (const cName of targetCountries) {
    await page.goto('http://localhost:8080/index.html', { waitUntil: 'networkidle0' });
    await sleep(1000);
    await page.click('#startExpeditionBtn');
    await sleep(1000);

    const res = await page.evaluate((name) => {
      const g = window.__geotrivia;
      const country = g.game.fullDatabase.find(c => c.name.toLowerCase() === name.toLowerCase());
      if (!country) return null;

      // Render highlight on country
      g.globeApp.mapRenderer.renderHighlights({ correctCountryId: country.id });
      // Create glowing pin
      g.globeApp.flight.createPinMarker(country.lat, country.lon, 0x10b981);
      // Fly to country
      g.globeApp.flight.flyToCountry(country.lat, country.lon, { duration: 600, isDesktopOffset: false });

      // Verify point in polygon at lat/lon
      const picked = g.globeApp.picker.findCountryAtLatLon(country.lat, country.lon);
      const isInside = picked && (picked.id === country.id || String(picked.id).padStart(3, '0') === String(country.id).padStart(3, '0'));

      return {
        country: country.name,
        lat: country.lat,
        lon: country.lon,
        isInside: Boolean(isInside),
        pickedName: picked ? picked.name : 'NONE'
      };
    }, cName);

    await sleep(1500);
    const fname = `after-pin-${cName.toLowerCase().replace(/\s+/g, '')}.png`;
    await saveScreenshot(page, fname);

    pinResults.push({
      country: cName,
      lat: res?.lat,
      lon: res?.lon,
      screenshot: fname,
      landsInside: res?.isInside ? 'EXACT MATCH (Confirmed via Natural Earth polygon)' : 'FAIL'
    });
  }

  // ─────────────────────────────────────────────────────────────
  // 4. CLICK ACCURACY TEST FOR 8+ DIVERSE COUNTRIES
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- Testing Click Accuracy for 8+ Countries ---');
  const clickTestCountries = [
    { name: 'Russia (Date Line / Siberia)', lat: 65.0, lon: 178.0, id: '643' },
    { name: 'Fiji (Date Line Crosser)', lat: -17.71, lon: 178.06, id: '242' },
    { name: 'Norway (High Latitude Fjords)', lat: 60.47, lon: 8.46, id: '578' },
    { name: 'Chile (Long Narrow Pacific Spine)', lat: -35.67, lon: -71.54, id: '152' },
    { name: 'Brazil (Equator & Tropical Basin)', lat: -14.23, lon: -51.92, id: '076' },
    { name: 'Japan (Narrow Archipelagic Arc)', lat: 36.20, lon: 138.25, id: '392' },
    { name: 'Kenya (Equatorial Rift)', lat: -0.02, lon: 37.90, id: '404' },
    { name: 'Tuvalu (Isolated Microstate)', lat: -7.10, lon: 177.64, id: '798' },
    { name: 'Singapore (Small Island State)', lat: 1.35, lon: 103.81, id: '702' },
    { name: 'Vatican City (Landlocked Micro-enclave)', lat: 41.90, lon: 12.45, id: '336' }
  ];

  const clickResults = await page.evaluate((testList) => {
    const g = window.__geotrivia;
    const picker = g.globeApp.picker;

    return testList.map(item => {
      const found = picker.findCountryAtLatLon(item.lat, item.lon);
      const targetIdPadded = String(item.id).padStart(3, '0');
      const foundIdPadded = found ? String(found.id).padStart(3, '0') : null;
      const passed = found && (foundIdPadded === targetIdPadded || found.name.toLowerCase().includes(item.name.split(' ')[0].toLowerCase()));

      return {
        name: item.name,
        targetId: item.id,
        foundName: found ? found.name : 'NONE',
        foundId: foundIdPadded,
        pass: Boolean(passed)
      };
    });
  }, clickTestCountries);

  console.table(clickResults);

  const stepBReport = {
    coverage: {
      desktop: {
        question: desktopQCoverage.uiPercent,
        globe: desktopQCoverage.globePercent,
        correct: desktopCorrectCoverage.uiPercent,
        wrong: desktopWrongCoverage.uiPercent
      },
      mobile: {
        question: mobileQCoverage.uiPercent,
        globe: mobileQCoverage.globePercent,
        correct: mobileCorrectCoverage.uiPercent,
        wrong: mobileWrongCoverage.uiPercent
      }
    },
    pins: pinResults,
    clickAccuracy: clickResults
  };

  fs.writeFileSync(path.join(__dirname, 'stepB_audit_results.json'), JSON.stringify(stepBReport, null, 2));
  console.log('\nStep B Audit Complete! Results saved to scripts/stepB_audit_results.json');

  await browser.close();
}

runStepBAudit().catch(err => {
  console.error('Step B Audit failed:', err);
  process.exit(1);
});
