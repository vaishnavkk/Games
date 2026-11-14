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

    console.log('5. Clicking Finish button -> checking confirmation modal opens...');
    await page.click('#finishEndlessBtn');
    await page.waitForSelector('#finishConfirmModal:not(.hidden)');
    console.log('   [PASS] Confirmation modal opened.');

    console.log('6. Clicking "Keep Playing" -> checking modal closes and game continues...');
    await page.click('#cancelFinishBtn');
    await page.waitForSelector('#finishConfirmModal.hidden');
    const phaseAfterCancel = await page.evaluate(() => window.game.phase);
    if (phaseAfterCancel !== 'question') {
      throw new Error(`Expected phase to remain 'question', got '${phaseAfterCancel}'`);
    }
    console.log('   [PASS] Modal dismissed; expedition continues.');

    console.log('7. Clicking Finish button -> Confirming finish...');
    await page.click('#finishEndlessBtn');
    await page.waitForSelector('#finishConfirmModal:not(.hidden)');
    await page.click('#confirmFinishBtn');

    await page.waitForFunction(() => {
      const end = document.getElementById('endScreen');
      return end && !end.classList.contains('hidden') && window.game.phase === 'end';
    }, { timeout: 5000 });

    const endScreenData = await page.evaluate(() => ({
      score: parseInt(document.getElementById('endScore')?.textContent || '0', 10),
      gameScore: window.game.score,
      finishBtnHidden: document.getElementById('finishEndlessBtn').classList.contains('hidden')
    }));

    if (endScreenData.finishBtnHidden !== true) {
      throw new Error('finishEndlessBtn should be hidden on end summary screen');
    }
    console.log(`   [PASS] Expedition ended cleanly! Final Score: ${endScreenData.score} pts.`);

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
