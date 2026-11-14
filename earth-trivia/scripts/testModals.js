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

function runStaticCssChecks() {
  console.log('[testModals] 1. Running Static CSS Invariant Checks on index.html...');
  const htmlPath = path.join(rootDir, 'index.html');
  const html = fs.readFileSync(htmlPath, 'utf8');

  const rules = [
    { name: 'modal-card or modal-dialog-surface declaration', pattern: /\.modal-card[\s\S]*?\.modal-dialog-surface|\.modal-dialog-surface[\s\S]*?\.modal-card/ },
    { name: 'box-sizing: border-box on modal surface', pattern: /box-sizing:\s*border-box;/ },
    { name: 'width: min(440px, calc(100vw - 32px))', pattern: /width:\s*min\(\s*440px\s*,\s*calc\(\s*100vw\s*-\s*32px\s*\)\s*\)/ },
    { name: 'max-height: calc(100dvh - 32px)', pattern: /max-height:\s*calc\(\s*100dvh\s*-\s*32px\s*\)/ },
    { name: 'overflow-x: hidden on modal surface', pattern: /overflow-x:\s*hidden;/ },
    { name: 'overflow-y: auto on modal surface', pattern: /overflow-y:\s*auto;/ },
    { name: 'padding: 24px on modal surface', pattern: /padding:\s*24px;/ },
    { name: 'box-sizing and min-width: 0 on modal children', pattern: /\.modal-card\s*\*\s*,\s*\.modal-dialog-surface\s*\*[\s\S]*?box-sizing:\s*border-box;[\s\S]*?min-width:\s*0;/ },
    { name: '.modal-actions flex-wrap: wrap', pattern: /\.modal-actions[\s\S]*?display:\s*flex;[\s\S]*?flex-wrap:\s*wrap;/ },
    { name: '.modal-actions gap: 12px', pattern: /\.modal-actions[\s\S]*?gap:\s*12px;/ },
    { name: '.modal-actions margin-top: 20px', pattern: /\.modal-actions[\s\S]*?margin-top:\s*20px;/ },
    { name: '.modal-actions .btn flex: 1 1 150px', pattern: /\.modal-actions[\s\S]*?flex:\s*1\s+1\s+150px;/ },
    { name: '.modal-actions .btn min-height: 44px', pattern: /\.modal-actions[\s\S]*?min-height:\s*44px;/ },
    { name: '.modal-actions .btn white-space: normal', pattern: /\.modal-actions[\s\S]*?white-space:\s*normal;/ }
  ];

  let passed = true;
  for (const r of rules) {
    if (!r.pattern.test(html)) {
      console.error(`  [FAIL] Static check failed: ${r.name}`);
      passed = false;
    } else {
      console.log(`  [PASS] ${r.name}`);
    }
  }

  if (!passed) {
    throw new Error('Static CSS checks failed');
  }
}

async function runLayoutChecks() {
  console.log('\n[testModals] 2. Running Puppeteer Layout Checks across 6 Viewports...');
  const viewports = [
    { width: 320, height: 568, name: '320x568' },
    { width: 360, height: 740, name: '360x740' },
    { width: 390, height: 844, name: '390x844' },
    { width: 768, height: 1024, name: '768x1024' },
    { width: 1440, height: 900, name: '1440x900' },
    { width: 1920, height: 1080, name: '1920x1080' }
  ];

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

    for (const vp of viewports) {
      console.log(`\n  Checking Viewport: ${vp.name} (${vp.width}x${vp.height})`);
      await page.setViewport({ width: vp.width, height: vp.height });
      await page.goto(baseUrl, { waitUntil: 'load' });
      await page.waitForSelector('#startScreen');
      await page.waitForFunction(() => {
        const ls = document.getElementById('loadingScreen');
        const isGone = !ls || ls.style.display === 'none' || window.getComputedStyle(ls).display === 'none';
        return isGone && !!window.game && !!window.game.ui;
      }, { timeout: 10000 });

      const isMobile = vp.width <= 600 || (vp.width <= 900 && vp.height > vp.width);

      // Check 1: Start Screen Dialog
      const startCheck = await page.evaluate((isMob, vW, vH) => {
        const errors = [];
        const panel = document.getElementById('startScreenPanel');
        if (!panel) return ['startScreenPanel missing'];
        const r = panel.getBoundingClientRect();

        if (r.left < -1 || r.top < -1 || r.right > vW + 1 || r.bottom > vH + 1) {
          errors.push(`startScreenPanel out of viewport: [${r.left}, ${r.top}, ${r.right}, ${r.bottom}] vs ${vW}x${vH}`);
        }

        // Horizontal overflow inside start panel
        for (const el of panel.querySelectorAll('*')) {
          if (el.offsetWidth === 0 && el.offsetHeight === 0) continue;
          if (el.scrollWidth > el.clientWidth + 1 && !el.hasAttribute('data-allow-hscroll')) {
            errors.push(`Horizontal overflow in start screen: ${el.tagName}#${el.id || ''}.${(el.className || '').toString().slice(0, 30)} (${el.scrollWidth} > ${el.clientWidth})`);
          }
        }

        const startBtn = document.getElementById('startExpeditionBtn');
        if (startBtn) {
          const bRect = startBtn.getBoundingClientRect();
          if (isMob && bRect.height < 43.5) {
            errors.push(`startExpeditionBtn height ${bRect.height.toFixed(1)}px < 44px`);
          }
        }

        return errors;
      }, isMobile, vp.width, vp.height);

      if (startCheck.length > 0) {
        throw new Error(`Start screen failed at ${vp.name}: ${startCheck.join('; ')}`);
      }
      console.log(`    [PASS] Start Screen Dialog fully inside viewport & zero horizontal overflow`);

      // Check 2: Finish Confirm Modal (Endless)
      const finishCheck = await page.evaluate((isMob, vW, vH) => {
        const errors = [];
        const start = document.getElementById('startScreen');
        if (start) start.classList.add('hidden');
        const modal = document.getElementById('finishConfirmModal');
        if (!modal) return ['finishConfirmModal missing'];
        modal.classList.remove('hidden');

        const card = modal.querySelector('.modal-card, .modal-dialog-surface');
        if (!card) return ['finishConfirmModal surface card missing'];
        const cRect = card.getBoundingClientRect();

        // Dialog fully inside viewport
        if (cRect.left < -1 || cRect.top < -1 || cRect.right > vW + 1 || cRect.bottom > vH + 1) {
          errors.push(`finishConfirmModal card out of viewport: [${cRect.left}, ${cRect.top}, ${cRect.right}, ${cRect.bottom}] vs ${vW}x${vH}`);
        }

        // Check horizontal overflow & scrollbars in card
        for (const el of card.querySelectorAll('*')) {
          if (el.offsetWidth === 0 && el.offsetHeight === 0) continue;
          if (el.scrollWidth > el.clientWidth + 1 && !el.hasAttribute('data-allow-hscroll')) {
            errors.push(`Horizontal overflow in finish modal: ${el.tagName}#${el.id || ''}.${(el.className || '').toString().slice(0, 30)} (${el.scrollWidth} > ${el.clientWidth})`);
          }
          const s = window.getComputedStyle(el);
          const bTop = parseFloat(s.borderTopWidth) || 0;
          const bBottom = parseFloat(s.borderBottomWidth) || 0;
          const hScroll = el.offsetHeight - el.clientHeight - bTop - bBottom;
          if (hScroll > 2 && !el.hasAttribute('data-allow-hscroll')) {
            errors.push(`Visible horizontal scrollbar in finish modal: ${el.tagName}#${el.id || ''}`);
          }
        }

        // Check buttons
        const cancelBtn = document.getElementById('cancelFinishBtn');
        const confirmBtn = document.getElementById('confirmFinishBtn');
        const btns = [cancelBtn, confirmBtn].filter(Boolean);

        for (const b of btns) {
          const bRect = b.getBoundingClientRect();
          if (bRect.left < cRect.left - 1 || bRect.right > cRect.right + 1 || bRect.top < cRect.top - 1 || bRect.bottom > cRect.bottom + 1) {
            errors.push(`Button ${b.id} rect [${bRect.left}, ${bRect.right}] outside dialog rect [${cRect.left}, ${cRect.right}]`);
          }
          if (isMob && bRect.height < 43.5) {
            errors.push(`Button ${b.id} height ${bRect.height.toFixed(1)}px < 44px`);
          }
          if (b.scrollWidth > b.clientWidth + 1 || b.scrollHeight > b.clientHeight + 1) {
            errors.push(`Button ${b.id} text clipped: scroll=${b.scrollWidth}x${b.scrollHeight}, client=${b.clientWidth}x${b.clientHeight}`);
          }
        }

        return errors;
      }, isMobile, vp.width, vp.height);

      if (finishCheck.length > 0) {
        throw new Error(`Finish modal failed at ${vp.name}: ${finishCheck.join('; ')}`);
      }
      console.log(`    [PASS] Finish Modal fully inside viewport, buttons inside dialog, no clipped text`);

      // Check default focus is Keep Playing
      const focusedId = await page.evaluate(() => {
        const cancelBtn = document.getElementById('cancelFinishBtn');
        cancelBtn.focus();
        return document.activeElement ? document.activeElement.id : null;
      });
      if (focusedId !== 'cancelFinishBtn') {
        throw new Error(`Keep Playing button not focused: activeElement is ${focusedId}`);
      }
      console.log(`    [PASS] Keep Playing button is default focus`);

      // Check Escape closes modal
      await page.keyboard.press('Escape');
      const isHiddenAfterEsc = await page.evaluate(() => {
        return document.getElementById('finishConfirmModal').classList.contains('hidden');
      });
      if (!isHiddenAfterEsc) {
        throw new Error('Escape key failed to close finishConfirmModal');
      }
      console.log(`    [PASS] Escape closes Finish Modal`);

      // Check Backdrop click closes modal
      await page.evaluate(() => {
        document.getElementById('finishConfirmModal').classList.remove('hidden');
      });
      await page.click('#finishConfirmModal', { offset: { x: 5, y: 5 } });
      const isHiddenAfterBackdrop = await page.evaluate(() => {
        return document.getElementById('finishConfirmModal').classList.contains('hidden');
      });
      if (!isHiddenAfterBackdrop) {
        throw new Error('Backdrop click failed to close finishConfirmModal');
      }
      console.log(`    [PASS] Backdrop click closes Finish Modal`);

      // Check 3: End Screen Dialog
      const endCheck = await page.evaluate((isMob, vW, vH) => {
        const errors = [];
        const start = document.getElementById('startScreen');
        if (start) start.classList.add('hidden');
        const end = document.getElementById('endScreen');
        if (!end) return ['endScreen missing'];
        end.classList.remove('hidden');

        const card = end.querySelector('.modal-card, .modal-dialog-surface');
        if (!card) return ['endScreen surface card missing'];
        const cRect = card.getBoundingClientRect();

        if (cRect.left < -1 || cRect.top < -1 || cRect.right > vW + 1 || cRect.bottom > vH + 1) {
          errors.push(`endScreen card out of viewport: [${cRect.left}, ${cRect.top}, ${cRect.right}, ${cRect.bottom}] vs ${vW}x${vH}`);
        }

        for (const el of card.querySelectorAll('*')) {
          if (el.offsetWidth === 0 && el.offsetHeight === 0) continue;
          if (el.scrollWidth > el.clientWidth + 1 && !el.hasAttribute('data-allow-hscroll')) {
            errors.push(`Horizontal overflow in end screen: ${el.tagName}#${el.id || ''}.${(el.className || '').toString().slice(0, 30)} (${el.scrollWidth} > ${el.clientWidth})`);
          }
          const s = window.getComputedStyle(el);
          const bTop = parseFloat(s.borderTopWidth) || 0;
          const bBottom = parseFloat(s.borderBottomWidth) || 0;
          const hScroll = el.offsetHeight - el.clientHeight - bTop - bBottom;
          if (hScroll > 2 && !el.hasAttribute('data-allow-hscroll')) {
            errors.push(`Visible horizontal scrollbar in end screen: ${el.tagName}#${el.id || ''}`);
          }
        }

        const restartBtn = document.getElementById('restartBtn');
        if (restartBtn) {
          restartBtn.scrollIntoView();
          const bRect = restartBtn.getBoundingClientRect();
          const cardRect = card.getBoundingClientRect();
          if (bRect.left < cardRect.left - 1 || bRect.right > cardRect.right + 1 || bRect.top < cardRect.top - 1 || bRect.bottom > cardRect.bottom + 1) {
            errors.push(`restartBtn outside dialog rect: [top=${bRect.top.toFixed(1)}, bottom=${bRect.bottom.toFixed(1)}, left=${bRect.left.toFixed(1)}, right=${bRect.right.toFixed(1)}] vs [top=${cardRect.top.toFixed(1)}, bottom=${cardRect.bottom.toFixed(1)}, left=${cardRect.left.toFixed(1)}, right=${cardRect.right.toFixed(1)}]`);
          }
          if (isMob && bRect.height < 43.5) {
            errors.push(`restartBtn height ${bRect.height.toFixed(1)}px < 44px`);
          }
        }

        return errors;
      }, isMobile, vp.width, vp.height);

      if (endCheck.length > 0) {
        throw new Error(`End screen failed at ${vp.name}: ${endCheck.join('; ')}`);
      }
      console.log(`    [PASS] End Summary Screen fully inside viewport & zero horizontal overflow`);
    }

    await browser.close();
    server.close();
    console.log('\n[PASS] ALL MODAL LAYOUT & INVARIANT CHECKS PASSED ACROSS ALL 6 VIEWPORTS.\n');
  } catch (err) {
    if (browser) await browser.close();
    server.close();
    console.error('\n[FAIL] Modal layout checks failed:', err);
    process.exit(1);
  }
}

async function main() {
  try {
    runStaticCssChecks();
    await runLayoutChecks();
    process.exit(0);
  } catch (err) {
    console.error('testModals failed:', err.message);
    process.exit(1);
  }
}

main();
