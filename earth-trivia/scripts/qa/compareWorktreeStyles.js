import puppeteer from 'puppeteer-core';
import { launchOptions } from './chrome.js';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


function startServer(rootDir) {
  const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.woff2': 'font/woff2',
    '.woff': 'font/woff',
    '.ttf': 'font/ttf'
  };

  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let reqPath = decodeURI(req.url.split('?')[0]);
      let p = path.join(rootDir, reqPath);
      if (p.endsWith('/') || p.endsWith('\\')) p += 'index.html';
      if (!fs.existsSync(p)) { res.writeHead(404); return res.end(); }
      const ext = path.extname(p).toLowerCase();
      const ct = MIME_TYPES[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': ct });
      fs.createReadStream(p).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

const relevantProperties = [
  'display', 'position', 'top', 'bottom', 'left', 'right',
  'width', 'height', 'min-width', 'max-width', 'min-height', 'max-height',
  'margin', 'padding', 'box-sizing', 'overflow', 'overflow-x', 'overflow-y',
  'flex-direction', 'flex-wrap', 'align-items', 'justify-content', 'gap',
  'color', 'background-color', 'font-family', 'font-size', 'font-weight', 'line-height',
  'border-radius', 'opacity', 'visibility', 'z-index'
];

async function capturePhaseStyles(page, phaseName, vpName) {
  return await page.evaluate((props, phase, vp) => {
    function getCssSelector(el) {
      if (el.id) return `#${el.id}`;
      let path = [];
      while (el && el.nodeType === Node.ELEMENT_NODE && el.tagName !== 'BODY') {
        let selector = el.tagName.toLowerCase();
        if (el.id) {
          selector += `#${el.id}`;
          path.unshift(selector);
          break;
        } else {
          let sib = el, nth = 1;
          while (sib = sib.previousElementSibling) {
            if (sib.tagName.toLowerCase() === selector) nth++;
          }
          selector += `:nth-of-type(${nth})`;
        }
        path.unshift(selector);
        el = el.parentElement;
      }
      return path.join(' > ');
    }

    const elements = Array.from(document.querySelectorAll('body, body *'));
    const snapshot = {};

    elements.forEach((el) => {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') return;
      if (rect.width === 0 && rect.height === 0) return;

      const sel = getCssSelector(el);
      const propMap = {};
      props.forEach(prop => {
        propMap[prop] = style.getPropertyValue(prop);
      });
      snapshot[sel] = propMap;
    });

    return snapshot;
  }, relevantProperties, phaseName, vpName);
}

async function snapshotTarget(targetDir) {
  const server = await startServer(targetDir);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/index.html?fast=1`;

  const browser = await puppeteer.launch(launchOptions({
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }));

  const viewports = [
    { name: '1440x900', width: 1440, height: 900 },
    { name: '390x844', width: 390, height: 844 },
    { name: '360x740', width: 360, height: 740 }
  ];

  const fullSnapshot = {};

  for (const vp of viewports) {
    fullSnapshot[vp.name] = {};
    const page = await browser.newPage();
    await page.setViewport({ width: vp.width, height: vp.height });

    // 1. START phase
    await page.goto(baseUrl, { waitUntil: 'load' });
    await page.waitForSelector('#startScreen');
    await page.waitForFunction(() => {
      const ls = document.getElementById('loadingScreen');
      return (!ls || ls.style.display === 'none' || window.getComputedStyle(ls).display === 'none') && !!window.game;
    });
    await page.evaluate(async () => { await document.fonts.ready; });
    await new Promise(r => setTimeout(r, 400));
    fullSnapshot[vp.name]['start'] = await capturePhaseStyles(page, 'start', vp.name);

    // 2. FINISH MODAL phase
    await page.evaluate(() => {
      window.game.startExpedition({ mode: 'endless', tier: 'easy', rounds: 10 });
      if (window.game.ui.finishEndlessBtn) {
        window.game.ui.finishEndlessBtn.click();
      }
    });
    await page.waitForFunction(() => {
      const fm = document.getElementById('finishConfirmModal');
      return fm && !fm.classList.contains('hidden');
    });
    await new Promise(r => setTimeout(r, 400));
    fullSnapshot[vp.name]['finish_modal'] = await capturePhaseStyles(page, 'finish_modal', vp.name);

    // 3. QUESTION phase
    await page.evaluate(() => {
      if (window.game.ui.cancelFinishBtn) window.game.ui.cancelFinishBtn.click();
      window.game.startExpedition({ mode: 'clue', tier: 'easy', rounds: 10 });
      const france = window.game.fullDatabase.find(c => c.name === 'France') || window.game.currentCountry;
      window.game.currentCountry = france;
      window.game.roundQueue = [france];
      window.game.ui.showQuestion(1, 10, [{ level: 1, text: 'Clue 1' }], 'clue', france);
    });
    await page.waitForFunction(() => window.game.phase === 'question');
    await new Promise(r => setTimeout(r, 200));
    fullSnapshot[vp.name]['question'] = await capturePhaseStyles(page, 'question', vp.name);

    // 4. SELECTED phase
    await page.evaluate(() => {
      const country = window.game.currentCountry;
      window.game.selectedHit = { country, hitLat: 0, hitLon: 0 };
      window.game.phase = 'selected';
      window.game.ui.showTouchConfirm(country, () => {}, window.game.mode);
    });
    await new Promise(r => setTimeout(r, 200));
    fullSnapshot[vp.name]['selected'] = await capturePhaseStyles(page, 'selected', vp.name);

    // 5. CORRECT RESULT phase
    await page.evaluate(() => {
      window.game.handleGuess(window.game.currentCountry, 46.2, 2.2);
    });
    await page.waitForFunction(() => {
      const mv = document.getElementById('memoryVault');
      return mv && !mv.classList.contains('hidden');
    });
    await new Promise(r => setTimeout(r, 500));
    await page.evaluate(() => {
      if (window.game.ui.scoreAnimationId) cancelAnimationFrame(window.game.ui.scoreAnimationId);
      document.getElementById('scoreVal').textContent = '1,000';
    });
    fullSnapshot[vp.name]['correct_result'] = await capturePhaseStyles(page, 'correct_result', vp.name);

    // 6. WRONG RESULT phase
    await page.evaluate(() => {
      window.game.startExpedition({ mode: 'clue', tier: 'easy', rounds: 10 });
      const france = window.game.fullDatabase.find(c => c.name === 'France') || window.game.currentCountry;
      const japan = window.game.fullDatabase.find(c => c.name === 'Japan');
      window.game.currentCountry = france;
      window.game.roundQueue = [france];
      window.game.ui.showQuestion(1, 10, [{ level: 1, text: 'Clue 1' }], 'clue', france);
      window.game.handleGuess(japan, 36.2, 138.2);
    });
    await page.waitForFunction(() => {
      const mv = document.getElementById('memoryVault');
      return mv && !mv.classList.contains('hidden');
    });
    await new Promise(r => setTimeout(r, 500));
    await page.evaluate(() => {
      if (window.game.ui.scoreAnimationId) cancelAnimationFrame(window.game.ui.scoreAnimationId);
      document.getElementById('scoreVal').textContent = '0';
    });
    fullSnapshot[vp.name]['wrong_result'] = await capturePhaseStyles(page, 'wrong_result', vp.name);

    // 7. END SUMMARY phase
    await page.evaluate(() => {
      window.game.endGame();
    });
    await page.waitForFunction(() => {
      const es = document.getElementById('endScreen');
      return es && !es.classList.contains('hidden');
    });
    await new Promise(r => setTimeout(r, 400));
    fullSnapshot[vp.name]['end_summary'] = await capturePhaseStyles(page, 'end_summary', vp.name);

    await page.close();
  }

  await browser.close();
  server.close();
  return fullSnapshot;
}

async function main() {
  const baseDir = path.resolve(__dirname, '../../../../pre-cleanup-wt/earth-trivia');
  const headDir = path.resolve(__dirname, '../..');

  console.log(`[CompareStyles] Taking baseline snapshot from pre-cleanup (${baseDir})...`);
  const baseSnapshot = await snapshotTarget(baseDir);

  console.log(`[CompareStyles] Taking current snapshot from HEAD (${headDir})...`);
  const headSnapshot = await snapshotTarget(headDir);

  let diffCount = 0;
  const diffs = [];

  for (const vp in baseSnapshot) {
    for (const phase in baseSnapshot[vp]) {
      const baseElements = baseSnapshot[vp][phase];
      const headElements = headSnapshot[vp]?.[phase] || {};

      for (const sel in baseElements) {
        if (!headElements[sel]) {
          diffCount++;
          diffs.push(`[${vp}][${phase}] Element missing in HEAD: ${sel}`);
          continue;
        }

        const bProps = baseElements[sel];
        const hProps = headElements[sel];

        for (const prop in bProps) {
          const bVal = bProps[prop];
          const hVal = hProps[prop];

          if (bVal !== hVal) {
            // Tolerances: sub-pixel (< 0.6px)
            const bNum = parseFloat(bVal);
            const hNum = parseFloat(hVal);
            if (!isNaN(bNum) && !isNaN(hNum) && bVal.endsWith('px') && hVal.endsWith('px')) {
              if (Math.abs(bNum - hNum) < 0.6) continue;
            }
            diffCount++;
            diffs.push(`[${vp}][${phase}][${sel}] ${prop}: base='${bVal}' vs head='${hVal}'`);
          }
        }
      }
    }
  }

  console.log('================================================================================');
  console.log(`[CompareStyles] Total Differences Found: ${diffCount}`);
  if (diffCount > 0) {
    console.log(`First 10 Element/Property Differences:`);
    diffs.slice(0, 10).forEach((d, i) => console.log(`  ${i + 1}. ${d}`));
  } else {
    console.log('[PASS] Exact 0 computed style differences between pre-cleanup and HEAD across all phases and viewports!');
  }
  console.log('================================================================================');

  const outDir = path.resolve(__dirname, '../../../report/cleanup');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'computed_styles_diff.json'), JSON.stringify({ diffCount, diffs }, null, 2), 'utf8');
}

main().catch(err => {
  console.error('Fatal in compareWorktreeStyles:', err);
  process.exit(1);
});
