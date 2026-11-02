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

const beforeStates = {};

async function snap(page, filename, desc) {
  const filePath = path.join(SCREENS_DIR, filename);
  await page.screenshot({ path: filePath, type: 'png' });
  const state = await page.evaluate(() => window.__geotrivia?.getState ? window.__geotrivia.getState() : null);
  beforeStates[filename] = { filename, desc, state };
  console.log(`[BEFORE CAPTURED] ${filename} | State: ${JSON.stringify(state)}`);
}

async function runBeforeCapture() {
  console.log('================================================================================');
  console.log('      CAPTURING GENUINE PART 2 "BEFORE" BASELINE SCREENSHOTS (1440x900 & 390x844) ');
  console.log('================================================================================\n');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  // ═══════════════════════════════════════════════════════════════
  // 1. DESKTOP (1440 x 900)
  // ═══════════════════════════════════════════════════════════════
  console.log('>>> Capturing Desktop Before Screens (1440x900)...');
  const dPage = await browser.newPage();
  await dPage.setViewport({ width: 1440, height: 900 });
  await dPage.goto('http://localhost:8080/index.html', { waitUntil: 'networkidle0' });
  await dPage.waitForFunction(() => window.game && window.game.globe);
  await new Promise(r => setTimeout(r, 600));

  // 1. Start Screen
  await snap(dPage, 'before-start-1440x900.png', 'Desktop Start Screen');

  // Start expedition
  await dPage.evaluate(() => {
    document.querySelector('#startExpeditionBtn').click();
  });
  await new Promise(r => setTimeout(r, 1200));

  // 2. Question in Progress (Clue Mode)
  await snap(dPage, 'before-question-1440x900.png', 'Desktop Question in Progress (Clue Mode)');
  await snap(dPage, 'before-mode-clue-1440x900.png', 'Desktop Clue Mode in Play');

  // 3. Country Selected (Highlight + Confirm bar)
  await dPage.evaluate(() => {
    const cur = window.game.currentCountry;
    window.game.selectedHit = { country: cur, hitLat: cur.lat, hitLon: cur.lon };
    window.game.phase = 'selected';
    window.game.globe.mapRenderer.renderHighlights({ selectedCountryId: cur.id });
    window.game.ui.showTouchConfirm(cur, () => {});
  });
  await new Promise(r => setTimeout(r, 400));
  await snap(dPage, 'before-selected-1440x900.png', 'Desktop Country Selected with Confirm Bar');

  // 4. Correct Answer on Large Country: Russia (RUS, id 643)
  await dPage.evaluate(() => {
    const rus = window.game.fullDatabase.find(c => c.code === 'RUS' || c.id === '643');
    window.game.currentCountry = rus;
    window.game.handleGuess(rus, rus.lat, rus.lon);
  });
  await new Promise(r => setTimeout(r, 1800));
  await snap(dPage, 'before-correct-russia-1440x900.png', 'Desktop Correct Answer: Large Country (Russia)');

  // 5. Correct Answer on Small Country: Malta (MLT, id 470)
  await dPage.evaluate(() => {
    const mlt = window.game.fullDatabase.find(c => c.code === 'MLT' || c.id === '470');
    window.game.currentCountry = mlt;
    window.game.isAnswering = true;
    window.game.handleGuess(mlt, mlt.lat, mlt.lon);
  });
  await new Promise(r => setTimeout(r, 1800));
  await snap(dPage, 'before-correct-malta-1440x900.png', 'Desktop Correct Answer: Small Country (Malta)');

  // 6. Correct Answer on Medium Country: Hungary (HUN, id 348)
  await dPage.evaluate(() => {
    const hun = window.game.fullDatabase.find(c => c.code === 'HUN' || c.id === '348');
    window.game.currentCountry = hun;
    window.game.isAnswering = true;
    window.game.handleGuess(hun, hun.lat, hun.lon);
  });
  await new Promise(r => setTimeout(r, 1800));
  await snap(dPage, 'before-correct-hungary-1440x900.png', 'Desktop Correct Answer: Medium Country (Hungary)');

  // 7. Wrong Answer with Arc: Spain (ESP, 724) guessed for Morocco (MAR, 504)
  await dPage.evaluate(() => {
    const mar = window.game.fullDatabase.find(c => c.code === 'MAR' || c.id === '504');
    const esp = window.game.fullDatabase.find(c => c.code === 'ESP' || c.id === '724');
    window.game.currentCountry = mar;
    window.game.isAnswering = true;
    window.game.handleGuess(esp, esp.lat, esp.lon);
  });
  await new Promise(r => setTimeout(r, 1800));
  await snap(dPage, 'before-wrong-spain-morocco-1440x900.png', 'Desktop Wrong Answer: Spain Guessed for Morocco');

  // 8. Long-Distance Wrong Answer: Australia (AUS, 036) guessed for Iceland (ISL, 352)
  await dPage.evaluate(() => {
    const isl = window.game.fullDatabase.find(c => c.code === 'ISL' || c.id === '352');
    const aus = window.game.fullDatabase.find(c => c.code === 'AUS' || c.id === '036');
    window.game.currentCountry = isl;
    window.game.isAnswering = true;
    window.game.handleGuess(aus, aus.lat, aus.lon);
  });
  await new Promise(r => setTimeout(r, 1800));
  await snap(dPage, 'before-wrong-longdist-1440x900.png', 'Desktop Long-Distance Wrong Answer: Australia for Iceland');

  // 9. Name Mode in play
  await dPage.evaluate(() => {
    window.game.mode = 'name';
    window.game.nextRound();
  });
  await new Promise(r => setTimeout(r, 1200));
  await snap(dPage, 'before-mode-name-1440x900.png', 'Desktop Name Mode in Play');

  // 10. Flag Mode in play
  await dPage.evaluate(() => {
    window.game.mode = 'flag';
    window.game.nextRound();
  });
  await new Promise(r => setTimeout(r, 1200));
  await snap(dPage, 'before-mode-flag-1440x900.png', 'Desktop Flag Mode in Play');

  // 11. End Screen
  await dPage.evaluate(() => {
    window.game.endGame();
  });
  await new Promise(r => setTimeout(r, 600));
  await snap(dPage, 'before-endscreen-1440x900.png', 'Desktop End Expedition Screen');

  await dPage.close();

  // ═══════════════════════════════════════════════════════════════
  // 2. MOBILE (390 x 844)
  // ═══════════════════════════════════════════════════════════════
  console.log('\n>>> Capturing Mobile Before Screens (390x844)...');
  const mPage = await browser.newPage();
  await mPage.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await mPage.goto('http://localhost:8080/index.html', { waitUntil: 'networkidle0' });
  await mPage.waitForFunction(() => window.game && window.game.globe);
  await new Promise(r => setTimeout(r, 600));

  // 1. Mobile Start Screen
  await snap(mPage, 'before-start-390x844.png', 'Mobile Start Screen');

  // Start expedition
  await mPage.evaluate(() => {
    document.querySelector('#startExpeditionBtn').click();
  });
  await new Promise(r => setTimeout(r, 1200));

  // 2. Mobile Question in Progress
  await snap(mPage, 'before-question-390x844.png', 'Mobile Question in Progress (Clue Mode)');
  await snap(mPage, 'before-mode-clue-390x844.png', 'Mobile Clue Mode in Play');

  // 3. Mobile Country Selected
  await mPage.evaluate(() => {
    const cur = window.game.currentCountry;
    window.game.selectedHit = { country: cur, hitLat: cur.lat, hitLon: cur.lon };
    window.game.phase = 'selected';
    window.game.globe.mapRenderer.renderHighlights({ selectedCountryId: cur.id });
    window.game.ui.showTouchConfirm(cur, () => {});
  });
  await new Promise(r => setTimeout(r, 400));
  await snap(mPage, 'before-selected-390x844.png', 'Mobile Country Selected with Confirm Bar');

  // 4. Mobile Correct Large (Russia)
  await mPage.evaluate(() => {
    const rus = window.game.fullDatabase.find(c => c.code === 'RUS' || c.id === '643');
    window.game.currentCountry = rus;
    window.game.handleGuess(rus, rus.lat, rus.lon);
  });
  await new Promise(r => setTimeout(r, 1800));
  await snap(mPage, 'before-correct-russia-390x844.png', 'Mobile Correct Answer: Large Country (Russia)');

  // 5. Mobile Correct Small (Malta)
  await mPage.evaluate(() => {
    const mlt = window.game.fullDatabase.find(c => c.code === 'MLT' || c.id === '470');
    window.game.currentCountry = mlt;
    window.game.isAnswering = true;
    window.game.handleGuess(mlt, mlt.lat, mlt.lon);
  });
  await new Promise(r => setTimeout(r, 1800));
  await snap(mPage, 'before-correct-malta-390x844.png', 'Mobile Correct Answer: Small Country (Malta)');

  // 6. Mobile Correct Medium (Hungary)
  await mPage.evaluate(() => {
    const hun = window.game.fullDatabase.find(c => c.code === 'HUN' || c.id === '348');
    window.game.currentCountry = hun;
    window.game.isAnswering = true;
    window.game.handleGuess(hun, hun.lat, hun.lon);
  });
  await new Promise(r => setTimeout(r, 1800));
  await snap(mPage, 'before-correct-hungary-390x844.png', 'Mobile Correct Answer: Medium Country (Hungary)');

  // 7. Mobile Wrong: Spain for Morocco
  await mPage.evaluate(() => {
    const mar = window.game.fullDatabase.find(c => c.code === 'MAR' || c.id === '504');
    const esp = window.game.fullDatabase.find(c => c.code === 'ESP' || c.id === '724');
    window.game.currentCountry = mar;
    window.game.isAnswering = true;
    window.game.handleGuess(esp, esp.lat, esp.lon);
  });
  await new Promise(r => setTimeout(r, 1800));
  await snap(mPage, 'before-wrong-spain-morocco-390x844.png', 'Mobile Wrong Answer: Spain Guessed for Morocco');

  // 8. Mobile Wrong Long-Distance: Australia for Iceland
  await mPage.evaluate(() => {
    const isl = window.game.fullDatabase.find(c => c.code === 'ISL' || c.id === '352');
    const aus = window.game.fullDatabase.find(c => c.code === 'AUS' || c.id === '036');
    window.game.currentCountry = isl;
    window.game.isAnswering = true;
    window.game.handleGuess(aus, aus.lat, aus.lon);
  });
  await new Promise(r => setTimeout(r, 1800));
  await snap(mPage, 'before-wrong-longdist-390x844.png', 'Mobile Long-Distance Wrong Answer: Australia for Iceland');

  // 9. Mobile Name Mode in play
  await mPage.evaluate(() => {
    window.game.mode = 'name';
    window.game.nextRound();
  });
  await new Promise(r => setTimeout(r, 1200));
  await snap(mPage, 'before-mode-name-390x844.png', 'Mobile Name Mode in Play');

  // 10. Mobile Flag Mode in play
  await mPage.evaluate(() => {
    window.game.mode = 'flag';
    window.game.nextRound();
  });
  await new Promise(r => setTimeout(r, 1200));
  await snap(mPage, 'before-mode-flag-390x844.png', 'Mobile Flag Mode in Play');

  // 11. Mobile End Screen
  await mPage.evaluate(() => {
    window.game.endGame();
  });
  await new Promise(r => setTimeout(r, 600));
  await snap(mPage, 'before-endscreen-390x844.png', 'Mobile End Expedition Screen');

  await mPage.close();
  await browser.close();

  fs.writeFileSync(path.join(REPORT_DIR, 'before_states.json'), JSON.stringify(beforeStates, null, 2));
  console.log('\n>>> All BEFORE screenshots and state JSONs recorded successfully!');
}

runBeforeCapture().catch(err => {
  console.error('Before capture failed:', err);
  process.exit(1);
});
