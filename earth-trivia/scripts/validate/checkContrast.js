import puppeteer from 'puppeteer-core';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '../..');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

function startServer() {
  const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.woff2': 'font/woff2',
    '.woff': 'font/woff',
    '.ttf': 'font/ttf'
  };

  const server = http.createServer((req, res) => {
    let reqPath = decodeURI(req.url.split('?')[0]);
    if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
    const filePath = path.join(root, reqPath);
    if (!filePath.startsWith(root) || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('File Not Found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType, 'Access-Control-Allow-Origin': '*' });
    fs.createReadStream(filePath).pipe(res);
  });

  return new Promise((resolve) => {
    server.listen(8080, '127.0.0.1', () => resolve(server));
    server.on('error', () => {
      // Port already in use, reuse existing server
      resolve(null);
    });
  });
}

console.log('================================================================================');
console.log('         WCAG AA CONTRAST AUDIT ACROSS ALL 6 STATES & 2 RESOLUTIONS (Step 4e)    ');
console.log('================================================================================\n');

async function runContrastAudit() {
  const server = await startServer();
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  let totalViolations = 0;
  const auditResults = [];

  async function checkState(stateName, resolution) {
    const issues = await page.evaluate(() => {
      function parseRgb(colorStr) {
        if (!colorStr || colorStr === 'transparent') return null;
        const m = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
        if (!m) return null;
        return {
          r: parseInt(m[1], 10),
          g: parseInt(m[2], 10),
          b: parseInt(m[3], 10),
          a: m[4] !== undefined ? parseFloat(m[4]) : 1.0
        };
      }

      function composite(fg, bg) {
        const a = fg.a;
        return {
          r: Math.round(fg.r * a + bg.r * (1 - a)),
          g: Math.round(fg.g * a + bg.g * (1 - a)),
          b: Math.round(fg.b * a + bg.b * (1 - a)),
          a: 1.0
        };
      }

      function getLuminance(rgb) {
        const sRGB = [rgb.r / 255, rgb.g / 255, rgb.b / 255];
        const linear = sRGB.map(c => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
        return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
      }

      function getContrast(rgb1, rgb2) {
        const l1 = getLuminance(rgb1);
        const l2 = getLuminance(rgb2);
        return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
      }

      function getEffectiveBg(el) {
        let curr = el;
        let colors = [];
        while (curr && curr !== document) {
          const style = window.getComputedStyle(curr);
          const bg = parseRgb(style.backgroundColor);
          if (bg && bg.a > 0) {
            colors.unshift(bg);
            if (bg.a === 1.0) break;
          }
          curr = curr.parentElement;
        }
        // Base solid canvas background
        let comp = { r: 6, g: 22, b: 31, a: 1.0 };
        for (const c of colors) comp = composite(c, comp);
        return comp;
      }

      const issues = [];
      const all = document.querySelectorAll('*');
      for (const el of all) {
        if (el.offsetParent === null && el.tagName !== 'BODY') continue;
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        const style = window.getComputedStyle(el);
        if (style.visibility === 'hidden' || style.display === 'none' || parseFloat(style.opacity) === 0) continue;

        let text = '';
        for (const n of el.childNodes) {
          if (n.nodeType === Node.TEXT_NODE) text += n.textContent;
        }
        text = text.trim();
        if (!text) continue;
        if (['SCRIPT', 'STYLE', 'SVG', 'PATH', 'CIRCLE', 'POLYGON'].includes(el.tagName)) continue;

        const fg = parseRgb(style.color);
        if (!fg) continue;
        const bg = getEffectiveBg(el);
        const finalFg = fg.a < 1.0 ? composite(fg, bg) : fg;
        const ratio = getContrast(finalFg, bg);
        const fs = parseFloat(style.fontSize);
        const fw = parseInt(style.fontWeight, 10) || 400;
        // Large text: >= 24px (18pt) or (>= 18.66px (14pt) and bold >= 700)
        const isLarge = fs >= 24 || (fs >= 18.66 && fw >= 700);
        const req = isLarge ? 3.0 : 4.5;

        if (ratio < req) {
          issues.push({
            tag: el.tagName.toLowerCase(),
            cls: el.className,
            text: text.slice(0, 32),
            fontSize: fs + 'px',
            fontWeight: fw,
            ratio: ratio.toFixed(2),
            req: req.toFixed(1)
          });
        }
      }
      return issues;
    });

    if (issues.length > 0) {
      console.error(`  [FAIL] ${resolution} ${stateName.toUpperCase()}: ${issues.length} violation(s)`);
      for (const iss of issues) {
        console.error(`         <${iss.tag}.${iss.cls}> "${iss.text}" ratio ${iss.ratio}:1 < required ${iss.req}:1`);
      }
      totalViolations += issues.length;
      auditResults.push({ resolution, state: stateName, status: 'FAIL', count: issues.length });
    } else {
      console.log(`  [PASS] ${resolution} ${stateName.toUpperCase()}: All text satisfies WCAG AA`);
      auditResults.push({ resolution, state: stateName, status: 'PASS', count: 0 });
    }
  }

  const viewports = [
    { w: 1440, h: 900, label: '1440x900 (Desktop)' },
    { w: 390, h: 844, label: '390x844 (Mobile)' }
  ];

  for (const vp of viewports) {
    console.log(`\nTesting Viewport: ${vp.label}...`);
    await page.setViewport({ width: vp.w, height: vp.h });
    await page.goto('http://localhost:8080', { waitUntil: 'networkidle0' });
    await page.waitForSelector('#startScreen');
    await new Promise(r => setTimeout(r, 600));

    // State 1: Start
    await checkState('start', vp.label);

    // State 2: Question (Clue mode)
    await page.evaluate(() => window.game.startExpedition({ mode: 'clue', tier: 'easy' }));
    await new Promise(r => setTimeout(r, 500));
    await checkState('question', vp.label);

    // State 3: Selected
    await page.evaluate(() => {
      const g = window.game;
      g.selectedHit = { country: g.currentCountry, point: { x: 0, y: 0, z: 0 } };
      g.ui.showTouchConfirm(g.currentCountry);
      g.phase = 'selected';
    });
    await new Promise(r => setTimeout(r, 200));
    await checkState('selected', vp.label);

    // State 4: Correct Result
    await page.evaluate(() => {
      const g = window.game;
      g.handleGuess(g.currentCountry);
    });
    await new Promise(r => setTimeout(r, 500));
    await checkState('correct', vp.label);

    // State 5: Wrong Result
    await page.evaluate(() => {
      const g = window.game;
      g.phase = 'question';
      g.isAnswering = true;
      const wrong = g.fullDatabase.find(c => c.name !== g.currentCountry.name);
      g.handleGuess(wrong);
    });
    await new Promise(r => setTimeout(r, 500));
    await checkState('wrong', vp.label);

    // State 6: End Screen
    await page.evaluate(() => window.game.endGame());
    await new Promise(r => setTimeout(r, 500));
    await checkState('endscreen', vp.label);
  }

  await browser.close();
  if (server) server.close();

  console.log('\n--------------------------------------------------------------------------------');
  console.log(`Contrast audit complete across ${viewports.length * 6} state/resolution configurations.`);
  if (totalViolations > 0) {
    console.error(`CONTRAST CHECK FAILED: ${totalViolations} WCAG AA violation(s) found!`);
    process.exit(1);
  } else {
    console.log('CONTRAST CHECK PASSED: 0 violations found. All text meets WCAG AA standards.');
    process.exit(0);
  }
}

runContrastAudit();
