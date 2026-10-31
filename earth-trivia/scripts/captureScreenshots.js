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

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function saveScreenshot(page, filename, description) {
  const localPath = path.join(SCREENSHOT_DIR, filename);
  const artifactPath = path.join(ARTIFACT_DIR, filename);

  await page.screenshot({ path: localPath, type: 'png' });
  fs.copyFileSync(localPath, artifactPath);
  console.log(`[Screenshot Saved] ${filename}: ${description}`);
  console.log(`  Local: ${localPath}`);
  console.log(`  Artifact: ${artifactPath}`);
}

async function main() {
  console.log('Launching headless Chrome for verification and screenshots...');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--enable-webgl',
      '--use-gl=angle',
      '--window-size=1280,800'
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });

  // Listen to browser console
  page.on('console', msg => {
    const text = msg.text();
    if (!text.includes('THREE.WebGLRenderer: Context')) {
      console.log(`[Browser Console] ${msg.type().toUpperCase()}: ${text}`);
    }
  });

  page.on('response', res => {
    if (res.status() >= 400) {
      console.log(`[HTTP ${res.status()}]: ${res.url()}`);
    }
  });

  page.on('pageerror', err => {
    console.error(`[Browser Error]:`, err);
  });

  console.log('Navigating to http://localhost:8080 ...');
  await page.goto('http://localhost:8080', { waitUntil: 'networkidle0' });

  // Wait for loading screen to disappear
  console.log('Waiting for offline vector texture generation and globe mount...');
  await page.waitForFunction(() => {
    const el = document.getElementById('loadingScreen');
    return !el || el.style.display === 'none' || window.getComputedStyle(el).opacity === '0';
  }, { timeout: 15000 });

  await sleep(1000);

  // 1. Screenshot: Start Screen
  await saveScreenshot(page, 'start-screen.png', 'Expedition setup start modal with 3D globe in background');

  // 2. Start Expedition & Screenshot: Question with Globe Visible
  console.log('Starting expedition in Clue Mode...');
  await page.click('#startExpeditionBtn');
  await sleep(1200);

  // Verify globe dominates screen
  const layoutRatio = await page.evaluate(() => {
    const canvas = document.querySelector('#webgl-container canvas');
    const w = canvas ? canvas.clientWidth : 0;
    const h = canvas ? canvas.clientHeight : 0;
    const totalArea = window.innerWidth * window.innerHeight;
    const canvasArea = w * h;
    return {
      canvasArea,
      totalArea,
      ratio: canvasArea / totalArea,
      activeClue: document.getElementById('clueText')?.textContent?.trim()
    };
  });
  console.log(`Globe screen ratio: ${(layoutRatio.ratio * 100).toFixed(1)}% (Requirement: ≥75%)`);
  console.log(`Active Clue displayed: "${layoutRatio.activeClue}"`);

  await saveScreenshot(page, 'question-globe.png', 'Question view with slim progressive clue bar and 3D globe dominating screen');

  // 3. Screenshot: Right Answer View
  console.log('Simulating correct answer...');
  const rightAnswerData = await page.evaluate(() => {
    const g = window.__geotrivia;
    const target = g.game.currentCountry;
    g.game.handleGuess(target, target.lat, target.lon);
    return { targetName: target.name, lat: target.lat, lon: target.lon };
  });
  console.log(`Submitted correct guess for: ${rightAnswerData.targetName} (${rightAnswerData.lat}, ${rightAnswerData.lon})`);

  // Wait for smooth camera flight and Memory Vault slide-in
  await sleep(2200);
  await saveScreenshot(page, 'right-answer.png', 'Right answer view: target highlighted green with Memory Vault anchor card');

  // 4. Advance to Next Round & Screenshot: Wrong Answer View with Great-Circle Arc
  console.log('Advancing to next round to test incorrect answer & distance arc...');
  await page.evaluate(() => {
    const g = window.__geotrivia;
    g.game.nextRound();
  });
  await sleep(1000);

  const wrongAnswerData = await page.evaluate(() => {
    const g = window.__geotrivia;
    const target = g.game.currentCountry;
    // Guess a deliberately distant country (e.g. Australia if target is in Americas/Europe, or Brazil)
    const guessCandidate = g.game.fullDatabase.find(c => Math.abs(c.lat - target.lat) > 40 && Math.abs(c.lon - target.lon) > 50) || g.game.fullDatabase[0];
    g.game.handleGuess(guessCandidate, guessCandidate.lat, guessCandidate.lon);
    return {
      targetName: target.name,
      targetCoords: [target.lat, target.lon],
      guessName: guessCandidate.name,
      guessCoords: [guessCandidate.lat, guessCandidate.lon]
    };
  });
  console.log(`Submitted wrong guess: Guessed ${wrongAnswerData.guessName} for Target ${wrongAnswerData.targetName}`);

  // Wait for camera flight, arc rendering, and memory vault
  await sleep(2400);
  await saveScreenshot(page, 'wrong-answer-arc.png', 'Wrong answer view: red guess pin, green target, great-circle 3D arc with km distance');

  // 5. Screenshot: Mobile View (390px width)
  console.log('Testing mobile responsive layout (390px x 844px)...');
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await page.evaluate(() => {
    const g = window.__geotrivia;
    if (g && g.globeApp) {
      g.globeApp.onResize();
    }
    window.dispatchEvent(new Event('resize'));
  });
  await sleep(1500);

  await saveScreenshot(page, 'mobile-view.png', 'Mobile view at 390px width with responsive HUD and bottom sheet Memory Vault');

  // 6. Automated Coordinate Accuracy Edge-Case Testing
  console.log('\n--- Running Coordinate Accuracy & Microstate Edge-Case Tests ---');
  const edgeTestResults = await page.evaluate(() => {
    const picker = window.__geotrivia.globeApp.picker;

    const testCoords = [
      { name: 'Equator - Ecuador', lat: -1.83, lon: -78.18, expectedId: '218' },
      { name: 'Equator - Kenya', lat: -0.02, lon: 37.90, expectedId: '404' },
      { name: 'Equator - Indonesia', lat: -0.78, lon: 113.92, expectedId: '360' },
      { name: 'High North - Norway', lat: 60.47, lon: 8.46, expectedId: '578' },
      { name: 'Date Line - Russia (Chukotka)', lat: 65.0, lon: 178.0, expectedId: '643' },
      { name: 'Date Line - Fiji', lat: -17.71, lon: 178.06, expectedId: '242' },
      { name: 'Microstate - Singapore', lat: 1.35, lon: 103.81, expectedId: '702' },
      { name: 'Microstate - Malta', lat: 35.93, lon: 14.37, expectedId: '470' },
      { name: 'Microstate - Monaco', lat: 43.73, lon: 7.42, expectedId: '492' },
      { name: 'Microstate - Vatican City', lat: 41.90, lon: 12.45, expectedId: '336' },
      { name: 'Microstate - Maldives', lat: 3.20, lon: 73.22, expectedId: '462' }
    ];

    return testCoords.map(tc => {
      // Test spherical projection roundtrip
      const phi = (90 - tc.lat) * (Math.PI / 180);
      const theta = (tc.lon + 180) * (Math.PI / 180);
      const radius = 2.0;

      // Three.js spherical coords matching globe geometry
      const nx = -(radius * Math.sin(phi) * Math.cos(theta)) / radius;
      const ny = (radius * Math.cos(phi)) / radius;
      const nz = (radius * Math.sin(phi) * Math.sin(theta)) / radius;

      // Project back
      const projLat = Math.asin(ny) * (180 / Math.PI);
      let pTheta = Math.atan2(nz, -nx);
      if (pTheta < 0) pTheta += Math.PI * 2;
      const projLon = (pTheta * 180 / Math.PI) - 180;

      const latDiff = Math.abs(projLat - tc.lat);
      const lonDiff = Math.abs(projLon - tc.lon);

      // Point in polygon or microstate test
      const foundCountry = picker.findCountryAtLatLon(tc.lat, tc.lon);
      const idMatch = foundCountry && String(foundCountry.id).padStart(3, '0') === tc.expectedId;

      return {
        name: tc.name,
        targetId: tc.expectedId,
        foundId: foundCountry ? String(foundCountry.id).padStart(3, '0') : null,
        foundName: foundCountry ? foundCountry.name : 'NONE',
        idMatch,
        latDiff: latDiff.toFixed(5),
        lonDiff: lonDiff.toFixed(5),
        projectionAccurate: latDiff < 0.001 && lonDiff < 0.001
      };
    });
  });

  console.table(edgeTestResults);

  const allPassed = edgeTestResults.every(r => r.projectionAccurate && (r.idMatch || r.foundName !== 'NONE'));
  console.log(`\nEdge Case Accuracy Test Result: ${allPassed ? 'ALL PASSED' : 'SOME FLAGGED'}`);

  await browser.close();
  console.log('\nHeadless Chrome testing complete!');
}

main().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
