import puppeteer from 'puppeteer-core';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const REPORT_DIR = path.resolve(__dirname, '../../report/part4');
const SCREENS_DIR = path.resolve(REPORT_DIR, 'screens');

fs.mkdirSync(SCREENS_DIR, { recursive: true });

console.log('================================================================================');
console.log('         CAPTURING PART 4 "AFTER" PRODUCTION SCREENSHOTS & AUDIT DATA            ');
console.log('================================================================================\n');

function sha256Prefix(filePath) {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buf).digest('hex').slice(0, 8);
}

const capturedMetadata = {};

async function snap(page, filename, desc, expectedAssertions = {}) {
  const filePath = path.join(SCREENS_DIR, filename);
  await page.screenshot({ path: filePath, type: 'png' });

  const hash = sha256Prefix(filePath);
  const state = await page.evaluate(() => {
    return window.__geotrivia?.getState ? window.__geotrivia.getState() : null;
  });

  const cardText = await page.evaluate(() => {
    const vault = document.getElementById('memoryVault');
    const nameEl = document.getElementById('vaultName');
    const distEl = document.getElementById('vaultDistance');
    return {
      name: nameEl ? nameEl.textContent : '',
      distanceText: distEl ? distEl.textContent : '',
      isVisible: vault && !vault.classList.contains('hidden')
    };
  });

  const cameraDistance = await page.evaluate(() => {
    return window.globe?.camera?.position?.z ? window.globe.camera.position.z.toFixed(2) : '—';
  });

  const freeAreaPercent = state?.targetFreeAreaPercent || '—';

  // Enforce assertions
  if (expectedAssertions.expectedPhase && state?.phase !== expectedAssertions.expectedPhase) {
    throw new Error(`State mismatch for ${filename}: expected ${expectedAssertions.expectedPhase}, got ${state?.phase}`);
  }
  if (expectedAssertions.expectedCountry && !cardText.name.toLowerCase().includes(expectedAssertions.expectedCountry.toLowerCase())) {
    throw new Error(`Card text mismatch for ${filename}: expected country ${expectedAssertions.expectedCountry}, got ${cardText.name}`);
  }
  if (expectedAssertions.expectedGuess && !cardText.distanceText.toLowerCase().includes(expectedAssertions.expectedGuess.toLowerCase())) {
    throw new Error(`Guess text mismatch for ${filename}: expected guess ${expectedAssertions.expectedGuess}, got ${cardText.distanceText}`);
  }

  capturedMetadata[filename] = {
    filename,
    desc,
    hash,
    state,
    cameraDistance,
    freeAreaPercent,
    targetCountry: cardText.name || expectedAssertions.expectedCountry || '—',
    guessCountry: expectedAssertions.expectedGuess || cardText.name || '—'
  };

  console.log(`[CAPTURED] ${filename.padEnd(38)} Hash:${hash} | Dist:${cameraDistance} | FreeArea:${freeAreaPercent}`);
}

async function runCapture() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  // ═══════════════════════════════════════════════════════════════
  // 1. DESKTOP CAPTURE (1440 x 900)
  // ═══════════════════════════════════════════════════════════════
  console.log('\n>>> Capturing Desktop After Screens (1440x900)...');
  const dPage = await browser.newPage();
  await dPage.setViewport({ width: 1440, height: 900 });
  await dPage.goto('http://localhost:8080', { waitUntil: 'networkidle0' });
  await dPage.waitForSelector('#startScreen');
  await new Promise(r => setTimeout(r, 600));

  // 1. Start Screen
  await snap(dPage, 'after-start-1440x900.png', 'Desktop Start Screen (2-Column Atlas Instrument)', {
    expectedPhase: 'start'
  });

  // Start expedition (Clue mode)
  await dPage.evaluate(() => document.getElementById('startExpeditionBtn').click());
  await new Promise(r => setTimeout(r, 1200));

  // 2. Question in progress (Clue mode)
  await snap(dPage, 'after-question-1440x900.png', 'Desktop Question in Progress (Clue Mode)', {
    expectedPhase: 'question'
  });
  await snap(dPage, 'after-mode-clue-1440x900.png', 'Desktop Clue Mode Expedition HUD', {
    expectedPhase: 'question'
  });

  // 3. Selected State
  await dPage.evaluate(() => {
    const cur = window.game.currentCountry;
    window.game.selectedHit = { country: cur, hitLat: cur.lat, hitLon: cur.lon };
    window.game.phase = 'selected';
    window.game.globe.mapRenderer.renderHighlights({ selectedCountryId: cur.id });
    window.game.ui.showTouchConfirm(cur);
  });
  await new Promise(r => setTimeout(r, 400));
  await snap(dPage, 'after-selected-1440x900.png', 'Desktop Country Selected with Confirm Bar', {
    expectedPhase: 'selected'
  });

  // 4. Correct Russia (Large Country)
  await dPage.evaluate(() => {
    document.getElementById('memoryVault').classList.add('hidden');
    const rus = window.game.fullDatabase.find(c => c.name === 'Russia' || c.code === 'RUS');
    window.game.currentCountry = rus;
    window.game.phase = 'question';
    window.game.isAnswering = true;
    window.game.handleGuess(rus);
  });
  await dPage.waitForFunction(() => {
    const el = document.getElementById('vaultName');
    return el && el.textContent.includes('Russia');
  }, { timeout: 6000 });
  await new Promise(r => setTimeout(r, 600));
  await snap(dPage, 'after-correct-russia-1440x900.png', 'Desktop Correct: Large Country (Russia, Bounding Box Framed <=60%)', {
    expectedPhase: 'result',
    expectedCountry: 'Russia'
  });

  // 5. Correct Malta (Microstate Ring)
  await dPage.evaluate(() => {
    document.getElementById('memoryVault').classList.add('hidden');
    const mlt = window.game.fullDatabase.find(c => c.name === 'Malta' || c.code === 'MLT');
    window.game.currentCountry = mlt;
    window.game.phase = 'question';
    window.game.isAnswering = true;
    window.game.handleGuess(mlt);
  });
  await dPage.waitForFunction(() => {
    const el = document.getElementById('vaultName');
    return el && el.textContent.includes('Malta');
  }, { timeout: 6000 });
  await new Promise(r => setTimeout(r, 600));
  await snap(dPage, 'after-correct-malta-1440x900.png', 'Desktop Correct: Microstate (Malta, Unfilled 3D Vector Ring)', {
    expectedPhase: 'result',
    expectedCountry: 'Malta'
  });

  // 6. Correct Hungary (Medium Country)
  await dPage.evaluate(() => {
    document.getElementById('memoryVault').classList.add('hidden');
    const hun = window.game.fullDatabase.find(c => c.name === 'Hungary' || c.code === 'HUN');
    window.game.currentCountry = hun;
    window.game.phase = 'question';
    window.game.isAnswering = true;
    window.game.handleGuess(hun);
  });
  await dPage.waitForFunction(() => {
    const el = document.getElementById('vaultName');
    return el && el.textContent.includes('Hungary');
  }, { timeout: 6000 });
  await new Promise(r => setTimeout(r, 600));
  await snap(dPage, 'after-correct-hungary-1440x900.png', 'Desktop Correct: Medium Country (Hungary, 3D Line2 Outline)', {
    expectedPhase: 'result',
    expectedCountry: 'Hungary'
  });

  // 7. Wrong Spain - Morocco (Short Arc)
  await dPage.evaluate(() => {
    document.getElementById('memoryVault').classList.add('hidden');
    const mor = window.game.fullDatabase.find(c => c.name === 'Morocco' || c.code === 'MAR');
    const esp = window.game.fullDatabase.find(c => c.name === 'Spain' || c.code === 'ESP');
    window.game.currentCountry = mor;
    window.game.phase = 'question';
    window.game.isAnswering = true;
    window.game.handleGuess(esp);
  });
  await dPage.waitForFunction(() => {
    const el = document.getElementById('vaultName');
    const distEl = document.getElementById('vaultDistance');
    return el && el.textContent.includes('Morocco') && distEl && distEl.textContent.includes('Spain');
  }, { timeout: 6000 });
  await new Promise(r => setTimeout(r, 600));
  await snap(dPage, 'after-wrong-spain-morocco-1440x900.png', 'Desktop Wrong: Clicked Spain, Target Morocco (Geodesic Arc + km Badge)', {
    expectedPhase: 'result',
    expectedCountry: 'Morocco',
    expectedGuess: 'Spain'
  });

  // 8. Wrong Australia - Iceland (Long Arc)
  await dPage.evaluate(() => {
    document.getElementById('memoryVault').classList.add('hidden');
    const isl = window.game.fullDatabase.find(c => c.name === 'Iceland' || c.code === 'ISL');
    const aus = window.game.fullDatabase.find(c => c.name === 'Australia' || c.code === 'AUS');
    window.game.currentCountry = isl;
    window.game.phase = 'question';
    window.game.isAnswering = true;
    window.game.handleGuess(aus);
  });
  await dPage.waitForFunction(() => {
    const el = document.getElementById('vaultName');
    const distEl = document.getElementById('vaultDistance');
    return el && el.textContent.includes('Iceland') && distEl && distEl.textContent.includes('Australia');
  }, { timeout: 6000 });
  await new Promise(r => setTimeout(r, 600));
  await snap(dPage, 'after-wrong-longdist-1440x900.png', 'Desktop Wrong: Clicked Australia, Target Iceland (Global Trans-Hemispheric Arc)', {
    expectedPhase: 'result',
    expectedCountry: 'Iceland',
    expectedGuess: 'Australia'
  });

  // 9. End Screen
  await dPage.evaluate(() => window.game.endGame());
  await dPage.waitForSelector('#endScreen:not(.hidden)', { timeout: 4000 });
  await new Promise(r => setTimeout(r, 500));
  await snap(dPage, 'after-endscreen-1440x900.png', 'Desktop End Expedition Summary', {
    expectedPhase: 'end'
  });

  // 10. Mode Name
  await dPage.evaluate(() => {
    window.game.startExpedition({ mode: 'name', tier: 'easy' });
  });
  await new Promise(r => setTimeout(r, 800));
  await snap(dPage, 'after-mode-name-1440x900.png', 'Desktop Name Mode Prompt', {
    expectedPhase: 'question'
  });

  // 11. Mode Flag
  await dPage.evaluate(() => {
    window.game.startExpedition({ mode: 'flag', tier: 'easy' });
  });
  await new Promise(r => setTimeout(r, 800));
  await snap(dPage, 'after-mode-flag-1440x900.png', 'Desktop Flag Mode Prompt', {
    expectedPhase: 'question'
  });

  // ═══════════════════════════════════════════════════════════════
  // 2. MOBILE CAPTURE (390 x 844)
  // ═══════════════════════════════════════════════════════════════
  console.log('\n>>> Capturing Mobile After Screens (390x844)...');
  const mPage = await browser.newPage();
  await mPage.setViewport({ width: 390, height: 844 });
  await mPage.goto('http://localhost:8080', { waitUntil: 'networkidle0' });
  await mPage.waitForSelector('#startScreen');
  await new Promise(r => setTimeout(r, 600));

  // 1. Mobile Start Screen
  await snap(mPage, 'after-start-390x844.png', 'Mobile Start Screen (Pinned CTA Visible on First Paint)', {
    expectedPhase: 'start'
  });

  // Start expedition (Clue mode)
  await mPage.evaluate(() => document.getElementById('startExpeditionBtn').click());
  await new Promise(r => setTimeout(r, 1200));

  // 2. Mobile Question (Clue mode)
  await snap(mPage, 'after-question-390x844.png', 'Mobile Question: Compact 1-line HUD + Slim Clue Bar (Globe >= 75%)', {
    expectedPhase: 'question'
  });
  await snap(mPage, 'after-mode-clue-390x844.png', 'Mobile Clue Mode in Play', {
    expectedPhase: 'question'
  });

  // 3. Mobile Selected
  await mPage.evaluate(() => {
    const cur = window.game.currentCountry;
    window.game.selectedHit = { country: cur, hitLat: cur.lat, hitLon: cur.lon };
    window.game.phase = 'selected';
    window.game.globe.mapRenderer.renderHighlights({ selectedCountryId: cur.id });
    window.game.ui.showTouchConfirm(cur);
  });
  await new Promise(r => setTimeout(r, 400));
  await snap(mPage, 'after-selected-390x844.png', 'Mobile Country Selected with Bottom Confirm Pill', {
    expectedPhase: 'selected'
  });

  // 4. Mobile Correct Russia
  await mPage.evaluate(() => {
    document.getElementById('memoryVault').classList.add('hidden');
    const rus = window.game.fullDatabase.find(c => c.name === 'Russia' || c.code === 'RUS');
    window.game.currentCountry = rus;
    window.game.phase = 'question';
    window.game.isAnswering = true;
    window.game.handleGuess(rus);
  });
  await mPage.waitForFunction(() => {
    const el = document.getElementById('vaultName');
    return el && el.textContent.includes('Russia');
  }, { timeout: 6000 });
  await new Promise(r => setTimeout(r, 600));
  await snap(mPage, 'after-correct-russia-390x844.png', 'Mobile Correct: Russia (Target in Free Area Above Sheet <=60%)', {
    expectedPhase: 'result',
    expectedCountry: 'Russia'
  });

  // 5. Mobile Correct Malta
  await mPage.evaluate(() => {
    document.getElementById('memoryVault').classList.add('hidden');
    const mlt = window.game.fullDatabase.find(c => c.name === 'Malta' || c.code === 'MLT');
    window.game.currentCountry = mlt;
    window.game.phase = 'question';
    window.game.isAnswering = true;
    window.game.handleGuess(mlt);
  });
  await mPage.waitForFunction(() => {
    const el = document.getElementById('vaultName');
    return el && el.textContent.includes('Malta');
  }, { timeout: 6000 });
  await new Promise(r => setTimeout(r, 600));
  await snap(mPage, 'after-correct-malta-390x844.png', 'Mobile Correct: Malta (Microstate Vector Ring in Free Area)', {
    expectedPhase: 'result',
    expectedCountry: 'Malta'
  });

  // 6. Mobile Correct Hungary
  await mPage.evaluate(() => {
    document.getElementById('memoryVault').classList.add('hidden');
    const hun = window.game.fullDatabase.find(c => c.name === 'Hungary' || c.code === 'HUN');
    window.game.currentCountry = hun;
    window.game.phase = 'question';
    window.game.isAnswering = true;
    window.game.handleGuess(hun);
  });
  await mPage.waitForFunction(() => {
    const el = document.getElementById('vaultName');
    return el && el.textContent.includes('Hungary');
  }, { timeout: 6000 });
  await new Promise(r => setTimeout(r, 600));
  await snap(mPage, 'after-correct-hungary-390x844.png', 'Mobile Correct: Hungary (Bottom Sheet <= 30vh)', {
    expectedPhase: 'result',
    expectedCountry: 'Hungary'
  });

  // 7. Mobile Wrong Spain - Morocco
  await mPage.evaluate(() => {
    document.getElementById('memoryVault').classList.add('hidden');
    const mor = window.game.fullDatabase.find(c => c.name === 'Morocco' || c.code === 'MAR');
    const esp = window.game.fullDatabase.find(c => c.name === 'Spain' || c.code === 'ESP');
    window.game.currentCountry = mor;
    window.game.phase = 'question';
    window.game.isAnswering = true;
    window.game.handleGuess(esp);
  });
  await mPage.waitForFunction(() => {
    const el = document.getElementById('vaultName');
    const distEl = document.getElementById('vaultDistance');
    return el && el.textContent.includes('Morocco') && distEl && distEl.textContent.includes('Spain');
  }, { timeout: 6000 });
  await new Promise(r => setTimeout(r, 600));
  await snap(mPage, 'after-wrong-spain-morocco-390x844.png', 'Mobile Wrong: Spain to Morocco Arc', {
    expectedPhase: 'result',
    expectedCountry: 'Morocco',
    expectedGuess: 'Spain'
  });

  // 8. Mobile Wrong Australia - Iceland
  await mPage.evaluate(() => {
    document.getElementById('memoryVault').classList.add('hidden');
    const isl = window.game.fullDatabase.find(c => c.name === 'Iceland' || c.code === 'ISL');
    const aus = window.game.fullDatabase.find(c => c.name === 'Australia' || c.code === 'AUS');
    window.game.currentCountry = isl;
    window.game.phase = 'question';
    window.game.isAnswering = true;
    window.game.handleGuess(aus);
  });
  await mPage.waitForFunction(() => {
    const el = document.getElementById('vaultName');
    const distEl = document.getElementById('vaultDistance');
    return el && el.textContent.includes('Iceland') && distEl && distEl.textContent.includes('Australia');
  }, { timeout: 6000 });
  await new Promise(r => setTimeout(r, 600));
  await snap(mPage, 'after-wrong-longdist-390x844.png', 'Mobile Wrong: Australia to Iceland Arc', {
    expectedPhase: 'result',
    expectedCountry: 'Iceland',
    expectedGuess: 'Australia'
  });

  // 9. Mobile End Screen
  await mPage.evaluate(() => window.game.endGame());
  await mPage.waitForSelector('#endScreen:not(.hidden)', { timeout: 4000 });
  await new Promise(r => setTimeout(r, 500));
  await snap(mPage, 'after-endscreen-390x844.png', 'Mobile End Summary', {
    expectedPhase: 'end'
  });

  // 10. Mobile Mode Name
  await mPage.evaluate(() => {
    window.game.startExpedition({ mode: 'name', tier: 'easy' });
  });
  await new Promise(r => setTimeout(r, 800));
  await snap(mPage, 'after-mode-name-390x844.png', 'Mobile Name Mode Prompt', {
    expectedPhase: 'question'
  });

  // 11. Mobile Mode Flag
  await mPage.evaluate(() => {
    window.game.startExpedition({ mode: 'flag', tier: 'easy' });
  });
  await new Promise(r => setTimeout(r, 800));
  await snap(mPage, 'after-mode-flag-390x844.png', 'Mobile Flag Mode Prompt', {
    expectedPhase: 'question'
  });

  await browser.close();

  // ═══════════════════════════════════════════════════════════════
  // 3. IMAGE HASH UNIQUENESS AUDIT
  // ═══════════════════════════════════════════════════════════════
  console.log('\n================================================================================');
  console.log('              IMAGE HASH UNIQUENESS AUDIT (Step 6 Assertion)                    ');
  console.log('================================================================================\n');

  const desktopHashes = new Map();
  const mobileHashes = new Map();
  let duplicates = 0;

  for (const [fn, meta] of Object.entries(capturedMetadata)) {
    const isDesktop = fn.includes('1440x900');
    const map = isDesktop ? desktopHashes : mobileHashes;
    const vp = isDesktop ? 'Desktop' : 'Mobile';

    if (map.has(meta.hash)) {
      console.error(`[HASH COLLISION] ${fn} has IDENTICAL hash ${meta.hash} to ${map.get(meta.hash)}`);
      duplicates++;
    } else {
      map.set(meta.hash, fn);
      console.log(`[UNIQUE] ${vp.padEnd(8)} ${meta.hash} -> ${fn}`);
    }
  }

  if (duplicates > 0) {
    console.error(`\nHASH AUDIT FAILED: ${duplicates} duplicate screenshot(s) found!`);
    process.exit(1);
  } else {
    console.log(`\nHASH AUDIT PASSED: All screenshots have 100% distinct 8-character image hashes.`);
  }

  const metaPath = path.resolve(REPORT_DIR, 'screenshots_metadata.json');
  fs.writeFileSync(metaPath, JSON.stringify(capturedMetadata, null, 2), 'utf8');
  console.log(`Saved screenshot metadata to: ${metaPath}`);
}

runCapture();
