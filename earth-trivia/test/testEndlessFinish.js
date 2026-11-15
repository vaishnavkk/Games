import puppeteer from 'puppeteer-core';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const CHROME_PATH = process.env.CHROME_BIN || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

function startServer(port = 0) {
  const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.svg': 'image/svg+xml'
  };

  const server = http.createServer((req, res) => {
    let reqPath = decodeURI(req.url.split('?')[0]);
    if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
    const filePath = path.join(rootDir, reqPath);
    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      res.writeHead(404);
      res.end('Not Found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
      'Access-Control-Allow-Origin': '*'
    });
    fs.createReadStream(filePath).pipe(res);
  });

  return new Promise((resolve, reject) => {
    server.listen(port, '127.0.0.1', () => resolve(server));
    server.on('error', reject);
  });
}

async function run() {
  console.log('================================================================================');
  console.log('              ENDLESS MODE FINISH CONTROL & CONFIRMATION TEST                   ');
  console.log('================================================================================\n');

  const server = await startServer(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/index.html?fast=1`;

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    // Test on mobile viewport
    await page.setViewport({ width: 390, height: 844 });
    await page.goto(baseUrl, { waitUntil: 'load' });
    await page.waitForSelector('#startScreen');

    console.log('1. Checking hidden state on initial start screen (10 rounds default)...');
    const initFinishHidden = await page.evaluate(() => {
      const btn = document.getElementById('finishEndlessBtn');
      return btn.classList.contains('hidden') || window.getComputedStyle(btn).display === 'none';
    });
    if (!initFinishHidden) throw new Error('finishEndlessBtn should be hidden on start screen before game launches');
    console.log('   [PASS] finishEndlessBtn is hidden on start screen.');

    console.log('2. Starting Endless Expedition (data-rounds="endless")...');
    await page.evaluate(() => {
      document.querySelectorAll('.round-btn').forEach(b => {
        if (b.dataset.rounds === 'endless') b.click();
      });
      document.getElementById('startExpeditionBtn').click();
    });

    await page.waitForFunction(() => window.game && window.game.phase === 'question');

    console.log('3. Validating finishEndlessBtn visibility and dimensions...');
    const btnRect = await page.evaluate(() => {
      const btn = document.getElementById('finishEndlessBtn');
      const r = btn.getBoundingClientRect();
      const style = window.getComputedStyle(btn);
      return {
        visible: !btn.classList.contains('hidden') && style.display !== 'none',
        width: r.width,
        height: r.height,
        top: r.top,
        bottom: r.bottom
      };
    });

    if (!btnRect.visible) throw new Error('finishEndlessBtn must be visible in endless mode');
    console.log(`   [PASS] Visible: dimensions = ${btnRect.width.toFixed(1)}px x ${btnRect.height.toFixed(1)}px`);

    if (btnRect.height < 43.5) {
      throw new Error(`Touch target height must be >= 44px, was ${btnRect.height}px`);
    }
    console.log('   [PASS] Touch target height >= 44px verified.');

    console.log('4. Checking that HUD controls do not overlap floating clue card...');
    const noOverlap = await page.evaluate(() => {
      const btn = document.getElementById('finishEndlessBtn');
      const card = document.getElementById('clueCard');
      const br = btn.getBoundingClientRect();
      const cr = card.getBoundingClientRect();
      return br.bottom <= cr.top;
    });
    if (!noOverlap) throw new Error('finishEndlessBtn in top HUD overlaps clue card');
    console.log('   [PASS] No panel overlap verified.');

    console.log('5. SCENARIO 1: Endless finish at 0 answers...');
    console.log('   Clicking Finish button -> checking confirmation modal opens...');
    await page.click('#finishEndlessBtn');
    await page.waitForSelector('#finishConfirmModal:not(.hidden)');
    console.log('   [PASS] Confirmation modal opened.');

    const modalAtZero = await page.evaluate(() => {
      const desc = document.getElementById('finishModalDesc')?.textContent?.trim() || '';
      const cancel = document.getElementById('cancelFinishBtn')?.textContent?.trim() || '';
      const confirm = document.getElementById('confirmFinishBtn')?.textContent?.trim() || '';
      return { desc, cancel, confirm };
    });

    if (!modalAtZero.desc.includes("You haven't answered anything yet. Leave this expedition?")) {
      throw new Error(`Expected description to contain "You haven't answered anything yet. Leave this expedition?", got "${modalAtZero.desc}"`);
    }
    if (!modalAtZero.cancel.toLowerCase().includes('keep playing')) {
      throw new Error(`Expected cancel button "Keep playing", got "${modalAtZero.cancel}"`);
    }
    if (modalAtZero.confirm.trim() !== 'Leave') {
      throw new Error(`Expected confirm button "Leave", got "${modalAtZero.confirm}"`);
    }
    console.log('   [PASS] Modal at 0 correctly shows "Leave" prompt and buttons.');

    console.log('6. Clicking "Keep Playing" -> checking modal closes and game continues...');
    await page.click('#cancelFinishBtn');
    await page.waitForSelector('#finishConfirmModal.hidden');
    const phaseAfterCancel = await page.evaluate(() => window.game.phase);
    if (phaseAfterCancel !== 'question') {
      throw new Error(`Expected phase to remain 'question', got '${phaseAfterCancel}'`);
    }
    console.log('   [PASS] Modal dismissed; expedition continues.');

    console.log('7. Clicking Finish -> Confirming "Leave" at 0 answers...');
    await page.click('#finishEndlessBtn');
    await page.waitForSelector('#finishConfirmModal:not(.hidden)');
    await page.click('#confirmFinishBtn');

    // Should return to start screen and NOT show end screen
    await page.waitForFunction(() => {
      const start = document.getElementById('startScreen');
      const end = document.getElementById('endScreen');
      return start && !start.classList.contains('hidden') && end && end.classList.contains('hidden');
    }, { timeout: 5000 });

    const localCheck = await page.evaluate(() => {
      const keys = Object.keys(localStorage);
      return keys.filter(k => k.startsWith('geotrivia_best_'));
    });
    if (localCheck.length > 0) {
      throw new Error(`Expected no best score saved on leave at 0, found: ${localCheck.join(', ')}`);
    }
    console.log('   [PASS] Leave at 0 returned to start screen with no best score saved.');

    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n8. SCENARIO 2: Endless finish after 1 correct answer...');
    // Start endless game again
    await page.evaluate(() => {
      document.querySelectorAll('.round-btn').forEach(b => {
        if (b.dataset.rounds === 'endless') b.click();
      });
      document.getElementById('startExpeditionBtn').click();
    });
    await page.waitForFunction(() => window.game && window.game.phase === 'question' && window.game.currentCountry);

    // Answer 1 question correctly
    await page.evaluate(() => {
      const g = window.game;
      const c = g.currentCountry;
      const lat = c.lat !== undefined ? c.lat : (c.centroid ? c.centroid[1] : 0);
      const lon = c.lon !== undefined ? c.lon : (c.centroid ? c.centroid[0] : 0);
      g.handleGuess(c, lat, lon);
    });

    // Wait for result / memory vault
    await page.waitForFunction(() => {
      const vault = document.getElementById('memoryVault');
      return vault && !vault.classList.contains('hidden');
    }, { timeout: 5000 });

    // Click finish in endless
    await page.click('#finishEndlessBtn');
    await page.waitForSelector('#finishConfirmModal:not(.hidden)');

    const modalAfter1Correct = await page.evaluate(() => {
      const desc = document.getElementById('finishModalDesc')?.textContent?.trim() || '';
      const cancel = document.getElementById('cancelFinishBtn')?.textContent?.trim() || '';
      const confirm = document.getElementById('confirmFinishBtn')?.textContent?.trim() || '';
      return { desc, cancel, confirm };
    });

    if (!modalAfter1Correct.desc.includes('Wrap up your endless run and review your final score summary?')) {
      throw new Error(`Expected summary desc after 1 correct, got "${modalAfter1Correct.desc}"`);
    }
    if (modalAfter1Correct.confirm.trim() !== 'Finish & Review') {
      throw new Error(`Expected confirm button "Finish & Review", got "${modalAfter1Correct.confirm}"`);
    }

    await page.click('#confirmFinishBtn');
    await page.waitForFunction(() => {
      const end = document.getElementById('endScreen');
      return end && !end.classList.contains('hidden') && window.game.phase === 'end';
    }, { timeout: 5000 });

    const endScreenCorrect = await page.evaluate(() => {
      const accText = document.getElementById('endAccuracy')?.textContent?.trim() || '';
      const perfectNotice = document.querySelector('.perfect-notice')?.textContent?.trim() || '';
      const missedCount = document.querySelectorAll('#missedList .missed-item').length;
      return { accText, perfectNotice, missedCount };
    });

    if (endScreenCorrect.accText !== '100%') {
      throw new Error(`Expected accuracy 100% after 1 correct, got "${endScreenCorrect.accText}"`);
    }
    if (!endScreenCorrect.perfectNotice.includes('Flawless Expedition — 100% Identification Accuracy!')) {
      throw new Error(`Expected Flawless banner after 1 correct, got "${endScreenCorrect.perfectNotice}"`);
    }
    if (endScreenCorrect.missedCount !== 0) {
      throw new Error(`Expected 0 missed items, got ${endScreenCorrect.missedCount}`);
    }
    console.log('   [PASS] 1 correct answer produced 100% accuracy and Flawless banner.');

    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n9. SCENARIO 3: Endless finish after 1 wrong answer...');
    // Return to start
    await page.click('#restartBtn');
    await page.waitForSelector('#startScreen:not(.hidden)');

    // Start endless game again
    await page.evaluate(() => {
      document.querySelectorAll('.round-btn').forEach(b => {
        if (b.dataset.rounds === 'endless') b.click();
      });
      document.getElementById('startExpeditionBtn').click();
    });
    await page.waitForFunction(() => window.game && window.game.phase === 'question' && window.game.currentCountry);

    // Answer 1 question wrongly (timeout with no selection)
    await page.evaluate(() => {
      window.game.handleGuess(null, null, null, true);
    });

    await page.waitForFunction(() => {
      const vault = document.getElementById('memoryVault');
      return vault && !vault.classList.contains('hidden');
    }, { timeout: 5000 });

    // Click finish in endless
    await page.click('#finishEndlessBtn');
    await page.waitForSelector('#finishConfirmModal:not(.hidden)');
    await page.click('#confirmFinishBtn');

    await page.waitForFunction(() => {
      const end = document.getElementById('endScreen');
      return end && !end.classList.contains('hidden') && window.game.phase === 'end';
    }, { timeout: 5000 });

    const endScreenWrong = await page.evaluate(() => {
      const endEl = document.getElementById('endScreen');
      const text = endEl ? endEl.textContent : '';
      const accText = document.getElementById('endAccuracy')?.textContent?.trim() || '';
      const missedCount = document.querySelectorAll('#missedList .missed-item').length;
      return { text, accText, missedCount };
    });

    if (endScreenWrong.accText !== '0%') {
      throw new Error(`Expected accuracy 0% after 1 wrong, got "${endScreenWrong.accText}"`);
    }
    if (endScreenWrong.text.includes('Flawless')) {
      throw new Error(`"Flawless" banner should NOT appear after 1 wrong answer`);
    }
    if (endScreenWrong.text.includes('100%')) {
      throw new Error(`"100%" should NOT appear after 1 wrong answer (accuracy is 0%)`);
    }
    if (endScreenWrong.missedCount !== 1) {
      throw new Error(`Expected 1 missed item after 1 wrong, got ${endScreenWrong.missedCount}`);
    }
    console.log('   [PASS] 1 wrong answer produced 0% accuracy, study-missed list, and NO Flawless banner.');

    console.log('\n================================================================================');
    console.log('✓ ALL ENDLESS FINISH TESTS PASSED');
    console.log('================================================================================');
  } finally {
    await browser.close();
    server.close();
  }
}

run().catch(err => {
  console.error('\n[FAIL] Test failed:', err);
  process.exit(1);
});
