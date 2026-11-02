import puppeteer from 'puppeteer-core';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const REPORT_DIR = path.resolve(__dirname, '../../report/part3');
const SCREENS_DIR = path.resolve(REPORT_DIR, 'screens');

if (!fs.existsSync(SCREENS_DIR)) {
  fs.mkdirSync(SCREENS_DIR, { recursive: true });
}

const afterStates = {};

async function snap(page, filename, desc) {
  const filePath = path.join(SCREENS_DIR, filename);
  await page.screenshot({ path: filePath, type: 'png' });
  const state = await page.evaluate(() => window.__geotrivia?.getState ? window.__geotrivia.getState() : null);
  afterStates[filename] = { filename, desc, state };
  console.log(`[AFTER CAPTURED] ${filename} | State: ${JSON.stringify(state)}`);
}

async function runAfterCapture() {
  console.log('================================================================================');
  console.log('      CAPTURING POLISHED PART 3 "AFTER" SCREENSHOTS (1440x900 & 390x844)       ');
  console.log('================================================================================\n');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const viewports = [
    { name: '1440x900', width: 1440, height: 900, isDesktop: true },
    { name: '390x844', width: 390, height: 844, isDesktop: false }
  ];

  for (const vp of viewports) {
    console.log(`\n>>> Capturing Viewport: ${vp.name} <<<`);
    const page = await browser.newPage();
    await page.setViewport({ width: vp.width, height: vp.height });
    await page.goto('http://localhost:8080', { waitUntil: 'networkidle0' });

    // Wait for initial loader to hide
    await page.waitForFunction(() => {
      const loader = document.getElementById('loadingScreen');
      return !loader || loader.style.display === 'none' || loader.style.opacity === '0';
    });
    await new Promise(r => setTimeout(r, 600));

    // 1. Start Screen
    await snap(page, `after-start-${vp.name}.png`, `${vp.isDesktop ? 'Desktop' : 'Mobile'} Start Screen`);

    // 2. Launch Expedition in Clue Mode
    await page.evaluate(() => {
      window.game.startExpedition({ mode: 'clue', tier: 'easy', rounds: 10, hasTimer: false });
      window.globe.isAutoRotating = false;
    });
    await new Promise(r => setTimeout(r, 600));

    // Force deterministic country for consistency
    const targetIso = vp.isDesktop ? 'SAU' : 'JPN';
    await page.evaluate((iso) => {
      const db = window.game.fullDatabase;
      const c = db.find(x => x.code === iso) || db[0];
      window.game.currentCountry = c;
      window.game.clueIndex = 0;
      window.game.phase = 'question';
      window.ui.showQuestion({
        mode: 'clue',
        country: c,
        clueIndex: 0,
        clueText: c.clues[0],
        availableCluesCount: 3
      });
      window.globe.flight.resetToOverview({ duration: 100 });
    }, targetIso);
    await new Promise(r => setTimeout(r, 400));

    // 2 & 3. Question & Mode Clue
    await snap(page, `after-question-${vp.name}.png`, `${vp.isDesktop ? 'Desktop' : 'Mobile'} Question in Progress (Clue Mode)`);
    await snap(page, `after-mode-clue-${vp.name}.png`, `${vp.isDesktop ? 'Desktop' : 'Mobile'} Clue Mode in Play`);

    // 4. Selected Country with Confirm Bar
    await page.evaluate((iso) => {
      const db = window.game.fullDatabase;
      const c = db.find(x => x.code === iso) || db[0];
      window.game.selectedHit = { country: c, hitLat: c.lat, hitLon: c.lon };
      window.game.phase = 'selected';
      window.globe.mapRenderer.renderHighlights({ selectedCountryId: c.id });
      window.ui.showTouchConfirm(c, () => {});
    }, targetIso);
    await new Promise(r => setTimeout(r, 400));
    await snap(page, `after-selected-${vp.name}.png`, `${vp.isDesktop ? 'Desktop' : 'Mobile'} Country Selected with Confirm Bar`);

    // 5. Correct on Large Country: Russia
    await page.evaluate(() => {
      const db = window.game.fullDatabase;
      const rus = db.find(x => x.code === 'RUS');
      window.game.currentCountry = rus;
      window.game.lastGuessCountry = rus;
      window.game.handleGuess(rus, rus.lat, rus.lon);
    });
    await new Promise(r => setTimeout(r, 1600));
    await snap(page, `after-correct-russia-${vp.name}.png`, `${vp.isDesktop ? 'Desktop' : 'Mobile'} Correct Answer: Large Country (Russia)`);

    // 6. Correct on Small Country: Malta
    await page.evaluate(() => {
      const db = window.game.fullDatabase;
      const mlt = db.find(x => x.code === 'MLT');
      window.game.currentCountry = mlt;
      window.game.lastGuessCountry = mlt;
      window.game.handleGuess(mlt, mlt.lat, mlt.lon);
    });
    await new Promise(r => setTimeout(r, 1600));
    await snap(page, `after-correct-malta-${vp.name}.png`, `${vp.isDesktop ? 'Desktop' : 'Mobile'} Correct Answer: Small Country (Malta)`);

    // 7. Correct on Medium Country: Hungary
    await page.evaluate(() => {
      const db = window.game.fullDatabase;
      const hun = db.find(x => x.code === 'HUN');
      window.game.currentCountry = hun;
      window.game.lastGuessCountry = hun;
      window.game.handleGuess(hun, hun.lat, hun.lon);
    });
    await new Promise(r => setTimeout(r, 1600));
    await snap(page, `after-correct-hungary-${vp.name}.png`, `${vp.isDesktop ? 'Desktop' : 'Mobile'} Correct Answer: Medium Country (Hungary)`);

    // 8. Wrong Answer: Spain Guessed for Morocco
    await page.evaluate(() => {
      const db = window.game.fullDatabase;
      const mar = db.find(x => x.code === 'MAR');
      const esp = db.find(x => x.code === 'ESP');
      window.game.currentCountry = mar;
      window.game.lastGuessCountry = esp;
      window.game.handleGuess(esp, esp.lat, esp.lon);
    });
    await new Promise(r => setTimeout(r, 1600));
    await snap(page, `after-wrong-spain-morocco-${vp.name}.png`, `${vp.isDesktop ? 'Desktop' : 'Mobile'} Wrong Answer: Spain Guessed for Morocco`);

    // 9. Long-Distance Wrong Answer: Australia for Iceland
    await page.evaluate(() => {
      const db = window.game.fullDatabase;
      const isl = db.find(x => x.code === 'ISL');
      const aus = db.find(x => x.code === 'AUS');
      window.game.currentCountry = isl;
      window.game.lastGuessCountry = aus;
      window.game.handleGuess(aus, aus.lat, aus.lon);
    });
    await new Promise(r => setTimeout(r, 1600));
    await snap(page, `after-wrong-longdist-${vp.name}.png`, `${vp.isDesktop ? 'Desktop' : 'Mobile'} Long-Distance Wrong Answer: Australia for Iceland`);

    // 10. Name Mode in Progress
    const nameIso = vp.isDesktop ? 'CHE' : 'SWE';
    await page.evaluate((iso) => {
      const db = window.game.fullDatabase;
      const c = db.find(x => x.code === iso) || db[0];
      window.game.mode = 'name';
      window.game.round = 2;
      window.game.currentCountry = c;
      window.game.phase = 'question';
      window.game.selectedHit = null;
      window.game.lastGuessCountry = null;
      window.globe.flight.resetToOverview({ duration: 100 });
      window.ui.showQuestion({
        mode: 'name',
        country: c,
        clueIndex: 0,
        clueText: '',
        availableCluesCount: 3
      });
    }, nameIso);
    await new Promise(r => setTimeout(r, 400));
    await snap(page, `after-mode-name-${vp.name}.png`, `${vp.isDesktop ? 'Desktop' : 'Mobile'} Name Mode in Play`);

    // 11. Flag Mode in Progress
    const flagIso = vp.isDesktop ? 'CZE' : 'EGY';
    await page.evaluate((iso) => {
      const db = window.game.fullDatabase;
      const c = db.find(x => x.code === iso) || db[0];
      window.game.mode = 'flag';
      window.game.round = 3;
      window.game.currentCountry = c;
      window.game.phase = 'question';
      window.game.selectedHit = null;
      window.game.lastGuessCountry = null;
      window.globe.flight.resetToOverview({ duration: 100 });
      window.ui.showQuestion({
        mode: 'flag',
        country: c,
        clueIndex: 0,
        clueText: '',
        availableCluesCount: 3
      });
    }, flagIso);
    await new Promise(r => setTimeout(r, 400));
    await snap(page, `after-mode-flag-${vp.name}.png`, `${vp.isDesktop ? 'Desktop' : 'Mobile'} Flag Mode in Play`);

    // 12. End Expedition Summary Screen
    await page.evaluate(() => {
      const db = window.game.fullDatabase;
      const missed1 = db.find(x => x.code === 'MAR') || db[1];
      const missed2 = db.find(x => x.code === 'ISL') || db[2];
      window.game.missedCountries = [missed1, missed2];
      window.game.score = 2450;
      window.game.correctCount = 4;
      window.game.round = 6;
      window.game.bestStreak = 3;
      window.game.endGame();
    });
    await new Promise(r => setTimeout(r, 400));
    await snap(page, `after-endscreen-${vp.name}.png`, `${vp.isDesktop ? 'Desktop' : 'Mobile'} End Expedition Screen`);

    await page.close();
  }

  await browser.close();

  // Save JSON metadata
  const jsonPath = path.join(REPORT_DIR, 'after_states.json');
  fs.writeFileSync(jsonPath, JSON.stringify(afterStates, null, 2));
  console.log(`\nSaved After states metadata to: ${jsonPath}`);
  console.log(`Total After Screenshots captured: ${Object.keys(afterStates).length}/24`);
}

runAfterCapture().catch(err => {
  console.error('Fatal After capture error:', err);
  process.exit(1);
});
