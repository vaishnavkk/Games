import puppeteer from 'puppeteer-core';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const REPORT_SCREENS_DIR = path.resolve(__dirname, '../../report/part2/screens');
const ARTIFACT_DIR = 'C:\\Users\\vaish\\.gemini\\antigravity\\brain\\3106128c-f0f1-4ad1-9467-733dd4e82da7';

if (!fs.existsSync(REPORT_SCREENS_DIR)) {
  fs.mkdirSync(REPORT_SCREENS_DIR, { recursive: true });
}

function saveScreenshot(page, filename) {
  const localPath = path.join(REPORT_SCREENS_DIR, filename);
  const artifactPath = path.join(ARTIFACT_DIR, filename);
  return page.screenshot({ path: localPath, type: 'png' }).then(() => {
    try { fs.copyFileSync(localPath, artifactPath); } catch (e) {}
    console.log(`[Screenshot Saved] ${filename}`);
  });
}

async function measureMobileMetrics(page) {
  return page.evaluate(() => {
    const vh = window.innerHeight;
    const vw = window.innerWidth;
    const totalArea = vw * vh;

    const vaultEl = document.querySelector('#memoryVault:not(.hidden)');
    const hudEl = document.querySelector('#topHud:not(.hidden)');

    let vaultHeightPercent = 0;
    let vaultRect = null;
    if (vaultEl) {
      vaultRect = vaultEl.getBoundingClientRect();
      vaultHeightPercent = (vaultRect.height / vh) * 100;
    }

    // Grid union area for total UI coverage
    const elements = [hudEl, vaultEl].filter(Boolean);
    const gridW = Math.ceil(vw / 10);
    const gridH = Math.ceil(vh / 10);
    const covered = new Uint8Array(gridW * gridH);

    for (const el of elements) {
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

    let coveredCount = 0;
    for (let i = 0; i < covered.length; i++) {
      if (covered[i] === 1) coveredCount++;
    }

    const totalUIPercent = ((coveredCount * 100) / totalArea) * 100;

    // Projected position of target country on screen
    let countryScreenY = null;
    let countryRatioY = null;
    const game = window.game;
    if (game && game.currentCountry && game.globe) {
      const target = game.currentCountry;
      const globe = game.globe;
      const phi = (90 - target.lat) * (Math.PI / 180);
      const theta = (target.lon + 180) * (Math.PI / 180);
      const radius = 1.7;

      const lx = -radius * Math.cos(theta) * Math.sin(phi);
      const ly = radius * Math.cos(phi);
      const lz = radius * Math.sin(theta) * Math.sin(phi);

      const localVec = new globe.camera.position.constructor(lx, ly, lz);
      const worldVec = localVec.clone().applyMatrix4(globe.earthMesh.matrixWorld);
      const proj = worldVec.clone().project(globe.camera);

      countryScreenY = Math.round((-proj.y * 0.5 + 0.5) * vh);
      countryRatioY = (countryScreenY / vh);
    }

    return {
      vw,
      vh,
      vaultHeightPx: vaultRect ? Math.round(vaultRect.height) : 0,
      vaultHeightPercent: parseFloat(vaultHeightPercent.toFixed(1)),
      totalUIPercent: parseFloat(totalUIPercent.toFixed(1)),
      globePercent: parseFloat((100 - totalUIPercent).toFixed(1)),
      countryScreenY,
      countryRatioY: countryRatioY ? parseFloat(countryRatioY.toFixed(3)) : null,
      vaultTopY: vaultRect ? Math.round(vaultRect.top) : vh,
      isCountryAboveSheet: countryScreenY !== null && vaultRect !== null ? (countryScreenY < vaultRect.top) : false
    };
  });
}

async function runMobileAudit() {
  console.log('================================================================================');
  console.log('       STEP 0.c - MOBILE RESULT LAYOUT AUDIT (390x844 and 360x740)              ');
  console.log('================================================================================\n');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const auditResults = {};

  // ── AUDIT 1: 390x844 (iPhone 12/13/14) ──────────────────────
  console.log('>>> Testing viewport: 390x844...');
  const page1 = await browser.newPage();
  await page1.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await page1.goto('http://localhost:8080/index.html', { waitUntil: 'networkidle0' });

  // Start game
  await page1.waitForFunction(() => window.game && window.game.globe);
  await page1.evaluate(() => {
    document.querySelector('#startExpeditionBtn').click();
  });
  await new Promise(r => setTimeout(r, 1200));

  // Correct answer trigger
  await page1.evaluate(() => {
    const cur = window.game.currentCountry;
    window.game.handleGuess(cur, cur.lat, cur.lon);
  });
  await new Promise(r => setTimeout(r, 1600)); // wait for camera flight

  const metrics390Correct = await measureMobileMetrics(page1);
  await saveScreenshot(page1, 'after-mobile-correct-390x844.png');

  // Trigger next round & wrong answer
  await page1.evaluate(() => {
    window.game.nextRound();
  });
  await new Promise(r => setTimeout(r, 1200));

  await page1.evaluate(() => {
    const cur = window.game.currentCountry;
    // Guess wrong country or offset
    window.game.handleGuess({ id: '999', name: 'Wrong Nation' }, cur.lat + 35, cur.lon + 50);
  });
  await new Promise(r => setTimeout(r, 1600));

  const metrics390Wrong = await measureMobileMetrics(page1);
  await saveScreenshot(page1, 'after-mobile-wrong-390x844.png');

  auditResults['390x844'] = {
    correct: metrics390Correct,
    wrong: metrics390Wrong
  };

  await page1.close();

  // ── AUDIT 2: 360x740 (Standard Android / Galaxy S8) ────────
  console.log('\n>>> Testing viewport: 360x740...');
  const page2 = await browser.newPage();
  await page2.setViewport({ width: 360, height: 740, isMobile: true, hasTouch: true });
  await page2.goto('http://localhost:8080/index.html', { waitUntil: 'networkidle0' });

  await page2.waitForFunction(() => window.game && window.game.globe);
  await page2.evaluate(() => {
    document.querySelector('#startExpeditionBtn').click();
  });
  await new Promise(r => setTimeout(r, 1200));

  // Correct answer trigger
  await page2.evaluate(() => {
    const cur = window.game.currentCountry;
    window.game.handleGuess(cur, cur.lat, cur.lon);
  });
  await new Promise(r => setTimeout(r, 1600));

  const metrics360Correct = await measureMobileMetrics(page2);
  await saveScreenshot(page2, 'after-mobile-result-360x740.png');

  auditResults['360x740'] = {
    correct: metrics360Correct
  };

  await page2.close();
  await browser.close();

  // Print Summary Table
  console.log('\n================================================================================');
  console.log('                    MOBILE RESULT VIEWPORT AUDIT TABLE                          ');
  console.log('================================================================================\n');

  console.log('| Viewport | State | Fact Sheet Height | Fact Sheet % | Total UI % | Globe % | Target Y | Sheet Top Y | Country Above Sheet? | Status |');
  console.log('|---|---|---|---|---|---|---|---|---|---|');

  const printRow = (vp, state, m) => {
    const sheetPass = m.vaultHeightPercent <= 35.0;
    const uiPass = m.totalUIPercent <= 40.0;
    const status = (sheetPass && uiPass && m.isCountryAboveSheet) ? 'PASS' : 'FAIL';
    console.log(`| ${vp} | ${state} | ${m.vaultHeightPx}px | ${m.vaultHeightPercent}% (≤35%) | ${m.totalUIPercent}% (≤40%) | ${m.globePercent}% | Y=${m.countryScreenY}px (${(m.countryRatioY*100).toFixed(0)}%H) | Y=${m.vaultTopY}px | ${m.isCountryAboveSheet ? 'Yes' : 'No'} | ${status} |`);
  };

  printRow('390x844', 'Correct Result', metrics390Correct);
  printRow('390x844', 'Wrong Result', metrics390Wrong);
  printRow('360x740', 'Correct Result', metrics360Correct);

  fs.writeFileSync(
    path.join(__dirname, 'step0_mobile_metrics.json'),
    JSON.stringify(auditResults, null, 2),
    'utf8'
  );
}

runMobileAudit().catch(err => {
  console.error('Mobile audit failed:', err);
  process.exit(1);
});
