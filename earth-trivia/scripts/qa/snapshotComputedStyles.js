import puppeteer from 'puppeteer-core';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

const CHROME_PATH = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let p = path.join(rootDir, req.url.split('?')[0]);
      if (p.endsWith('/') || p.endsWith('\\')) p += 'index.html';
      if (!fs.existsSync(p)) { res.writeHead(404); return res.end(); }
      const ext = path.extname(p);
      const ct = ext === '.html' ? 'text/html' : (ext === '.js' ? 'application/javascript' : (ext === '.css' ? 'text/css' : 'application/octet-stream'));
      res.writeHead(200, { 'Content-Type': ct });
      fs.createReadStream(p).pipe(res);
    });
    server.listen(0, () => resolve(server));
  });
}

export async function capturePhaseStyles(page, phaseName, vpName) {
  return await page.evaluate((phase, vp) => {
    const relevantProperties = [
      'display', 'position', 'top', 'bottom', 'left', 'right',
      'width', 'height', 'min-width', 'max-width', 'min-height', 'max-height',
      'margin', 'padding', 'box-sizing', 'overflow', 'overflow-x', 'overflow-y',
      'flex-direction', 'flex-wrap', 'align-items', 'justify-content', 'gap',
      'color', 'background-color', 'font-family', 'font-size', 'font-weight', 'line-height',
      'border-radius', 'opacity', 'visibility', 'z-index'
    ];

    const elements = Array.from(document.querySelectorAll('body, body *'));
    const snapshot = {};

    elements.forEach((el, idx) => {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') return;
      if (rect.width === 0 && rect.height === 0) return;

      const tag = el.tagName.toLowerCase();
      const id = el.id ? `#${el.id}` : '';
      const cls = el.className && typeof el.className === 'string' ? `.${el.className.trim().split(/\s+/).join('.')}` : '';
      const key = `${tag}${id}${cls}__idx_${idx}`;

      const propMap = {};
      relevantProperties.forEach(prop => {
        propMap[prop] = style.getPropertyValue(prop);
      });
      snapshot[key] = propMap;
    });

    return snapshot;
  }, phaseName, vpName);
}

export async function takeFullSnapshot() {
  const server = await startServer();
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/index.html?fast=1`;

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const viewports = [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'mobile', width: 390, height: 844 }
  ];

  const fullSnapshot = {};

  for (const vp of viewports) {
    fullSnapshot[vp.name] = {};
    const page = await browser.newPage();
    await page.setViewport({ width: vp.width, height: vp.height });
    await page.goto(baseUrl, { waitUntil: 'load' });
    await page.waitForSelector('#startScreen');
    await page.waitForFunction(() => {
      const ls = document.getElementById('loadingScreen');
      return (!ls || ls.style.display === 'none' || window.getComputedStyle(ls).display === 'none') && !!window.game;
    });
    // Wait for CSS modalFadeIn animation to finish completely
    await new Promise(r => setTimeout(r, 400));

    // 1. START phase
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    fullSnapshot[vp.name]['start'] = await capturePhaseStyles(page, 'start', vp.name);

    // Start expedition (10 rounds, easy, clue mode) with fixed first country for deterministic styles
    await page.evaluate(() => {
      window.game.startExpedition({ mode: 'clue', tier: 'easy', rounds: 10 });
      // Fix currentCountry to France so country name, flag, metrics, and text are identical
      const france = window.game.fullDatabase.find(c => c.name === 'France') || window.game.currentCountry;
      window.game.currentCountry = france;
      window.game.roundQueue = [france];
      window.game.ui.showQuestion(1, 10, [{ level: 1, text: 'Clue 1' }], 'clue', france);
    });
    await page.waitForFunction(() => window.game.phase === 'question');

    // 2. QUESTION phase
    fullSnapshot[vp.name]['question'] = await capturePhaseStyles(page, 'question', vp.name);

    // 3. SELECTED phase
    await page.evaluate(() => {
      const country = window.game.currentCountry;
      window.game.selectedHit = { country, hitLat: 0, hitLon: 0 };
      window.game.phase = 'selected';
      window.game.ui.showTouchConfirm(country, () => {}, window.game.mode);
    });
    await new Promise(r => setTimeout(r, 100));
    fullSnapshot[vp.name]['selected'] = await capturePhaseStyles(page, 'selected', vp.name);

    // 4. RESULT phase
    await page.evaluate(() => {
      window.game.handleGuess(window.game.currentCountry, 46.2, 2.2);
    });
    await page.waitForFunction(() => {
      const mv = document.getElementById('memoryVault');
      return mv && !mv.classList.contains('hidden');
    }, { timeout: 10000 });
    await new Promise(r => setTimeout(r, 600));
    await page.evaluate(() => {
      if (window.game.ui.scoreAnimationId) cancelAnimationFrame(window.game.ui.scoreAnimationId);
      document.getElementById('scoreVal').textContent = '1,000';
    });
    fullSnapshot[vp.name]['result'] = await capturePhaseStyles(page, 'result', vp.name);

    // 5. END phase
    await page.evaluate(() => {
      window.game.endGame();
    });
    await page.waitForFunction(() => {
      const es = document.getElementById('endScreen');
      return es && !es.classList.contains('hidden');
    }, { timeout: 10000 });
    fullSnapshot[vp.name]['end'] = await capturePhaseStyles(page, 'end', vp.name);

    await page.close();
  }

  await browser.close();
  server.close();
  return fullSnapshot;
}

if (process.argv[1] && process.argv[1].endsWith('snapshotComputedStyles.js')) {
  takeFullSnapshot().then(snapshot => {
    const outDir = path.resolve(rootDir, '../report/cleanup');
    fs.mkdirSync(outDir, { recursive: true });
    const outFile = path.join(outDir, 'computed_styles_baseline.json');
    fs.writeFileSync(outFile, JSON.stringify(snapshot, null, 2), 'utf8');

    let totalElements = 0;
    for (const vp in snapshot) {
      for (const ph in snapshot[vp]) {
        totalElements += Object.keys(snapshot[vp][ph]).length;
      }
    }
    console.log(`[ComputedStyleSnapshot] Captured ${totalElements} elements across 5 phases and 2 viewports.`);
    console.log(`Saved baseline to ${outFile}`);
  }).catch(err => {
    console.error(err);
    process.exit(1);
  });
}
