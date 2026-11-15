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
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
    '.png': 'image/png',
    '.woff2': 'font/woff2'
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

async function capture() {
  const server = await startServer(0);
  const port = server.address().port;
  const url = `http://127.0.0.1:${port}/index.html`;

  const outDir = path.join(rootDir, 'docs', 'img');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-gpu',
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--window-size=1440,900'
    ]
  });

  try {
    const page = await browser.newPage();

    // 1. Start Screen (1440x900)
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForSelector('#startScreen');
    await page.waitForFunction(() => {
      const ls = document.getElementById('loadingScreen');
      const isGone = !ls || ls.style.display === 'none' || window.getComputedStyle(ls).display === 'none';
      return isGone && !!window.game && !!window.game.ui;
    }, { timeout: 15000 });
    await new Promise(r => setTimeout(r, 1200));

    const startPath = path.join(outDir, 'start-screen.webp');
    await page.screenshot({ path: startPath, type: 'webp', quality: 85 });
    console.log(`Saved start screen: ${startPath} (${(fs.statSync(startPath).size / 1024).toFixed(1)} KB)`);

    // 2. Question Screen (1440x900)
    await page.evaluate(() => {
      document.getElementById('startExpeditionBtn')?.click();
    });
    await page.waitForFunction(() => window.game && window.game.isAnswering, { timeout: 10000 });
    await new Promise(r => setTimeout(r, 1500));

    const qPath = path.join(outDir, 'question.webp');
    await page.screenshot({ path: qPath, type: 'webp', quality: 85 });
    console.log(`Saved question screen: ${qPath} (${(fs.statSync(qPath).size / 1024).toFixed(1)} KB)`);

    // 3. Close-miss Result Screen (1440x900)
    await page.evaluate(() => {
      const g = window.game;
      const target = g.currentCountry;
      const db = g.fullDatabase;
      // find a country in same continent ~500-1500 km away
      let guess = db.find(c => c.id !== target.id && c.continent === target.continent && Math.hypot(c.lat - target.lat, c.lon - target.lon) > 4 && Math.hypot(c.lat - target.lat, c.lon - target.lon) < 18);
      if (!guess) {
        guess = db.find(c => c.id !== target.id);
      }
      g.handleGuess(guess, guess.lat, guess.lon);
    });

    await page.waitForFunction(() => window.game && window.game.phase === 'result', { timeout: 10000 });
    await new Promise(r => setTimeout(r, 2000));

    const missPath = path.join(outDir, 'close-miss.webp');
    await page.screenshot({ path: missPath, type: 'webp', quality: 85 });
    console.log(`Saved close-miss screen: ${missPath} (${(fs.statSync(missPath).size / 1024).toFixed(1)} KB)`);

    // 4. Mobile Screen (390x844)
    const mobilePage = await browser.newPage();
    await mobilePage.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    await mobilePage.goto(url, { waitUntil: 'load' });
    await mobilePage.waitForSelector('#startScreen');
    await mobilePage.waitForFunction(() => {
      const ls = document.getElementById('loadingScreen');
      const isGone = !ls || ls.style.display === 'none' || window.getComputedStyle(ls).display === 'none';
      return isGone && !!window.game && !!window.game.ui;
    }, { timeout: 15000 });
    await mobilePage.evaluate(() => {
      document.getElementById('startExpeditionBtn')?.click();
    });
    await mobilePage.waitForFunction(() => window.game && window.game.isAnswering, { timeout: 10000 });
    await new Promise(r => setTimeout(r, 1500));

    const mobilePath = path.join(outDir, 'mobile.webp');
    await mobilePage.screenshot({ path: mobilePath, type: 'webp', quality: 85 });
    console.log(`Saved mobile screen: ${mobilePath} (${(fs.statSync(mobilePath).size / 1024).toFixed(1)} KB)`);
    await mobilePage.close();

    // 5. Social Preview (1280x640 PNG)
    const socialPage = await browser.newPage();
    await socialPage.setViewport({ width: 1280, height: 640, deviceScaleFactor: 1 });
    await socialPage.goto(url, { waitUntil: 'load' });
    await socialPage.waitForSelector('#startScreen');
    await socialPage.waitForFunction(() => {
      const ls = document.getElementById('loadingScreen');
      const isGone = !ls || ls.style.display === 'none' || window.getComputedStyle(ls).display === 'none';
      return isGone && !!window.game && !!window.game.ui;
    }, { timeout: 15000 });
    await socialPage.evaluate(() => {
      document.getElementById('startExpeditionBtn')?.click();
    });
    await socialPage.waitForFunction(() => window.game && window.game.isAnswering, { timeout: 10000 });
    await new Promise(r => setTimeout(r, 1500));

    const socialPath = path.join(rootDir, 'docs', 'social-preview.png');
    await socialPage.screenshot({ path: socialPath, type: 'png' });
    console.log(`Saved social preview: ${socialPath} (${(fs.statSync(socialPath).size / 1024).toFixed(1)} KB)`);
    await socialPage.close();

  } finally {
    await browser.close();
    server.close();
  }
}

capture().catch(err => {
  console.error(err);
  process.exit(1);
});
