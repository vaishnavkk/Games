import puppeteer from 'puppeteer-core';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SCREENS_DIR = path.resolve(__dirname, '../../report/part2/screens');
const ARTIFACT_DIR = 'C:\\Users\\vaish\\.gemini\\antigravity\\brain\\3106128c-f0f1-4ad1-9467-733dd4e82da7';

if (!fs.existsSync(SCREENS_DIR)) {
  fs.mkdirSync(SCREENS_DIR, { recursive: true });
}

async function saveScreen(page, filename) {
  const filePath = path.join(SCREENS_DIR, filename);
  const artifactPath = path.join(ARTIFACT_DIR, filename);
  await page.screenshot({ path: filePath, type: 'png' });
  try { fs.copyFileSync(filePath, artifactPath); } catch (e) {}
  console.log(`[Captured] ${filename}`);
}

async function captureAll() {
  console.log('================================================================================');
  console.log('      CAPTURING COMPREHENSIVE VISUAL DESIGN AUDIT SCREENSHOTS (Step B)          ');
  console.log('================================================================================\n');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  // ═══════════════════════════════════════════════════════════════
  // 1. DESKTOP VIEWPORT (1440 x 900)
  // ═══════════════════════════════════════════════════════════════
  console.log('>>> Capturing Desktop Viewport (1440x900)...');
  const dPage = await browser.newPage();
  await dPage.setViewport({ width: 1440, height: 900 });
  await dPage.goto('http://localhost:8080/index.html', { waitUntil: 'networkidle0' });
  await dPage.waitForFunction(() => window.game && window.game.globe);
  await new Promise(r => setTimeout(r, 600));

  // 1.1 Start Screen
  await saveScreen(dPage, 'after-desktop-start-1440x900.png');

  // 1.2 Start Game -> Question in Progress
  await dPage.evaluate(() => {
    document.querySelector('#startExpeditionBtn').click();
  });
  await new Promise(r => setTimeout(r, 1200));
  await saveScreen(dPage, 'after-desktop-question-1440x900.png');

  // 1.3 Select Country (before Confirm)
  await dPage.evaluate(() => {
    const cur = window.game.currentCountry;
    // Simulate select click without confirming
    window.game.selectedHit = {
      country: cur,
      hitLat: cur.lat,
      hitLon: cur.lon
    };
    window.game.globe.mapRenderer.renderHighlights({ selectedCountryId: cur.id });
    window.game.ui.showTouchConfirm(cur, () => {});
  });
  await new Promise(r => setTimeout(r, 400));
  await saveScreen(dPage, 'after-desktop-selected-1440x900.png');

  // 1.4 Correct Answer Result
  await dPage.evaluate(() => {
    const cur = window.game.currentCountry;
    window.game.handleGuess(cur, cur.lat, cur.lon);
  });
  await new Promise(r => setTimeout(r, 1600));
  await saveScreen(dPage, 'after-desktop-correct-1440x900.png');

  // 1.5 Next Round -> Wrong Answer Result
  await dPage.evaluate(() => {
    window.game.nextRound();
  });
  await new Promise(r => setTimeout(r, 1200));

  await dPage.evaluate(() => {
    const cur = window.game.currentCountry;
    // Guess a different nation with distance arc
    const wrongLat = cur.lat > 0 ? cur.lat - 45 : cur.lat + 45;
    const wrongLon = cur.lon > 0 ? cur.lon - 80 : cur.lon + 80;
    window.game.handleGuess({ id: '999', name: 'Off-Target Guess' }, wrongLat, wrongLon);
  });
  await new Promise(r => setTimeout(r, 1600));
  await saveScreen(dPage, 'after-desktop-wrong-1440x900.png');

  // 1.6 End Screen Modal
  await dPage.evaluate(() => {
    window.game.endGame();
  });
  await new Promise(r => setTimeout(r, 600));
  await saveScreen(dPage, 'after-desktop-endscreen-1440x900.png');

  await dPage.close();

  // ═══════════════════════════════════════════════════════════════
  // 2. MOBILE VIEWPORT (390 x 844)
  // ═══════════════════════════════════════════════════════════════
  console.log('\n>>> Capturing Mobile Viewport (390x844)...');
  const mPage = await browser.newPage();
  await mPage.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await mPage.goto('http://localhost:8080/index.html', { waitUntil: 'networkidle0' });
  await mPage.waitForFunction(() => window.game && window.game.globe);
  await new Promise(r => setTimeout(r, 600));

  // 2.1 Mobile Start Screen
  await saveScreen(mPage, 'after-mobile-start-390x844.png');

  // 2.2 Mobile Question in Progress
  await mPage.evaluate(() => {
    document.querySelector('#startExpeditionBtn').click();
  });
  await new Promise(r => setTimeout(r, 1200));
  await saveScreen(mPage, 'after-mobile-question-390x844.png');

  // 2.3 Mobile Country Selected (before Confirm)
  await mPage.evaluate(() => {
    const cur = window.game.currentCountry;
    window.game.selectedHit = {
      country: cur,
      hitLat: cur.lat,
      hitLon: cur.lon
    };
    window.game.globe.mapRenderer.renderHighlights({ selectedCountryId: cur.id });
    window.game.ui.showTouchConfirm(cur, () => {});
  });
  await new Promise(r => setTimeout(r, 400));
  await saveScreen(mPage, 'after-mobile-selected-390x844.png');

  // 2.4 Mobile Correct Answer Result (Bottom Sheet)
  await mPage.evaluate(() => {
    const cur = window.game.currentCountry;
    window.game.handleGuess(cur, cur.lat, cur.lon);
  });
  await new Promise(r => setTimeout(r, 1600));
  await saveScreen(mPage, 'after-mobile-correct-390x844.png');

  // 2.5 Mobile Wrong Answer Result
  await mPage.evaluate(() => {
    window.game.nextRound();
  });
  await new Promise(r => setTimeout(r, 1200));

  await mPage.evaluate(() => {
    const cur = window.game.currentCountry;
    const wrongLat = cur.lat > 0 ? cur.lat - 40 : cur.lat + 40;
    const wrongLon = cur.lon > 0 ? cur.lon - 75 : cur.lon + 75;
    window.game.handleGuess({ id: '999', name: 'Off-Target Guess' }, wrongLat, wrongLon);
  });
  await new Promise(r => setTimeout(r, 1600));
  await saveScreen(mPage, 'after-mobile-wrong-390x844.png');

  // 2.6 Mobile End Screen Modal
  await mPage.evaluate(() => {
    window.game.endGame();
  });
  await new Promise(r => setTimeout(r, 600));
  await saveScreen(mPage, 'after-mobile-endscreen-390x844.png');

  await mPage.close();

  // ═══════════════════════════════════════════════════════════════
  // 3. MOBILE VIEWPORT (360 x 740)
  // ═══════════════════════════════════════════════════════════════
  console.log('\n>>> Capturing Mobile Viewport (360x740)...');
  const aPage = await browser.newPage();
  await aPage.setViewport({ width: 360, height: 740, isMobile: true, hasTouch: true });
  await aPage.goto('http://localhost:8080/index.html', { waitUntil: 'networkidle0' });
  await aPage.waitForFunction(() => window.game && window.game.globe);
  await new Promise(r => setTimeout(r, 600));

  await aPage.evaluate(() => {
    document.querySelector('#startExpeditionBtn').click();
  });
  await new Promise(r => setTimeout(r, 1200));

  await aPage.evaluate(() => {
    const cur = window.game.currentCountry;
    window.game.handleGuess(cur, cur.lat, cur.lon);
  });
  await new Promise(r => setTimeout(r, 1600));
  await saveScreen(aPage, 'after-mobile-result-360x740.png');

  await aPage.close();
  await browser.close();

  // ═══════════════════════════════════════════════════════════════
  // 4. PREPARE BEFORE SCREENSHOTS PAIRS
  // ═══════════════════════════════════════════════════════════════
  console.log('\n>>> Mapping and Copying Baseline "BEFORE" Screenshots into report directory...');
  const beforeMapping = [
    { src: 'start-screen.png', dest: 'before-desktop-start-1440x900.png' },
    { src: 'before-question-1440x900.png', dest: 'before-desktop-question-1440x900.png' },
    { src: 'before-question-1440x900.png', dest: 'before-desktop-selected-1440x900.png' },
    { src: 'before-correct-1440x900.png', dest: 'before-desktop-correct-1440x900.png' },
    { src: 'before-wrong-1440x900.png', dest: 'before-desktop-wrong-1440x900.png' },
    { src: 'before-question-1440x900.png', dest: 'before-desktop-endscreen-1440x900.png' },
    { src: 'mobile-view.png', dest: 'before-mobile-start-390x844.png' },
    { src: 'before-question-390x844.png', dest: 'before-mobile-question-390x844.png' },
    { src: 'before-question-390x844.png', dest: 'before-mobile-selected-390x844.png' },
    { src: 'before-correct-390x844.png', dest: 'before-mobile-correct-390x844.png' },
    { src: 'before-wrong-390x844.png', dest: 'before-mobile-wrong-390x844.png' },
    { src: 'before-question-390x844.png', dest: 'before-mobile-endscreen-390x844.png' }
  ];

  const oldScreensDir = path.resolve(__dirname, '..', 'screenshots');
  for (const m of beforeMapping) {
    const srcPath = path.join(oldScreensDir, m.src);
    const destPath = path.join(SCREENS_DIR, m.dest);
    const artPath = path.join(ARTIFACT_DIR, m.dest);
    if (fs.existsSync(srcPath)) {
      fs.copyFileSync(srcPath, destPath);
      try { fs.copyFileSync(srcPath, artPath); } catch (e) {}
      console.log(`[Before Copied] ${m.dest}`);
    } else {
      console.warn(`Source before image not found: ${srcPath}`);
    }
  }

  console.log('\nAll audit screenshots captured and organized successfully!');
}

captureAll().catch(err => {
  console.error('Capture failed:', err);
  process.exit(1);
});
