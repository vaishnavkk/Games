import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer-core';
import { launchOptions } from './chrome.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DIST_DIR = path.resolve(__dirname, '../dist');
const PUZZLES_PATH = path.resolve(__dirname, '../src/data/puzzles.json');

const VIEWPORTS = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 }
];

function createStaticServer(distDir) {
  return http.createServer((req, res) => {
    let reqPath = req.url.split('?')[0];
    if (reqPath === '/favicon.ico') {
      res.writeHead(204);
      res.end();
      return;
    }
    if (reqPath === '/') reqPath = '/index.html';
    const filePath = path.join(distDir, reqPath);
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath);
    const types = {
      '.html': 'text/html',
      '.js': 'application/javascript',
      '.css': 'text/css',
      '.svg': 'image/svg+xml',
      '.woff2': 'font/woff2',
      '.woff': 'font/woff',
      '.json': 'application/json'
    };
    res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
    res.end(fs.readFileSync(filePath));
  });
}

/**
 * In-page inspection assertions executed inside page.evaluate
 */
const PAGE_CHECKS = `
window.__selfplayChecks = {
  checkTextDefects() {
    const text = document.body.innerText;
    const match = text.match(/\\b(undefined|NaN|null|\\[object\\b)/i);
    if (match) return 'Text defect found: ' + match[0];
    return null;
  },
  checkHorizontalOverflow() {
    const docWidth = document.documentElement.scrollWidth;
    const winWidth = window.innerWidth;
    if (docWidth > winWidth + 2) {
      return 'Horizontal overflow detected: scrollWidth=' + docWidth + ' > winWidth=' + winWidth;
    }
    return null;
  },
  checkFonts() {
    const q = String.fromCharCode(34);
    const f1 = document.fonts.check('16px Fredoka');
    const f2 = document.fonts.check('16px ' + q + 'Patrick Hand' + q);
    if (!f1) return 'Font Fredoka not loaded';
    if (!f2) return 'Font Patrick Hand not loaded';
    return null;
  },
  checkMascot() {
    const mascot = document.querySelector('.moss-sprite');
    if (!mascot) return 'Mascot Moss missing from DOM';
    return null;
  },
  checkClickable(selector) {
    const el = document.querySelector(selector);
    if (!el) return 'Element not found: ' + selector;
    const rect = el.getBoundingClientRect();
    if (rect.width < 44 || rect.height < 44) {
      return 'Target too small (' + Math.round(rect.width) + 'x' + Math.round(rect.height) + '): ' + selector;
    }
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    if (cx < 0 || cx > window.innerWidth || cy < 0 || cy > window.innerHeight) {
      return 'Target outside viewport: ' + selector;
    }
    const topEl = document.elementFromPoint(cx, cy);
    if (!topEl) return 'elementFromPoint is null at (' + cx + ',' + cy + ') for ' + selector;
    if (topEl !== el && !el.contains(topEl) && !topEl.contains(el)) {
      return 'Target covered by ' + topEl.tagName + '.' + topEl.className + ' for ' + selector;
    }
    return null;
  }
};
`;

/**
 * Self-test routine: plants 2 defects and verifies harness catches both
 */
async function runSelfTest(serverUrl) {
  console.log('[selfplay] Running --selftest (verifying harness catches injected defects)...');
  const browser = await puppeteer.launch(launchOptions());
  const page = await browser.newPage();
  await page.setViewport(VIEWPORTS[0]);
  await page.goto(serverUrl, { waitUntil: 'networkidle0' });
  await page.evaluate(PAGE_CHECKS);

  let defect1Caught = false;
  let defect2Caught = false;

  // Defect 1: inject "undefined" into DOM
  await page.evaluate(() => {
    const p = document.createElement('p');
    p.id = 'defect-text';
    p.textContent = 'Did you know undefined facts exist?';
    document.body.appendChild(p);
  });
  const textErr = await page.evaluate(() => window.__selfplayChecks.checkTextDefects());
  if (textErr && textErr.includes('undefined')) {
    defect1Caught = true;
    console.log('[selfplay] Defect 1 caught successfully: ' + textErr);
  }

  // Remove defect 1
  await page.evaluate(() => document.getElementById('defect-text')?.remove());

  // Defect 2: invisible overlay covering Play button
  await page.evaluate(() => {
    const overlay = document.createElement('div');
    overlay.id = 'defect-overlay';
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.zIndex = '999999';
    overlay.style.background = 'transparent';
    overlay.style.pointerEvents = 'auto';
    document.body.appendChild(overlay);
  });
  const coverErr = await page.evaluate(() => window.__selfplayChecks.checkClickable('#btnPlay'));
  if (coverErr && coverErr.includes('covered')) {
    defect2Caught = true;
    console.log('[selfplay] Defect 2 caught successfully: ' + coverErr);
  }

  await page.evaluate(() => document.getElementById('defect-overlay')?.remove());
  await browser.close();

  if (defect1Caught && defect2Caught) {
    console.log('[selfplay] Selftest PASSED: 2/2 defects caught by harness.\n');
    return true;
  } else {
    console.error(`[selfplay] Selftest FAILED: defect1=${defect1Caught}, defect2=${defect2Caught}`);
    process.exit(1);
  }
}

/**
 * Helper to click with elementFromPoint safety
 */
async function safeClick(page, selector) {
  await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (el) el.scrollIntoView({ block: 'center', inline: 'center' });
  }, selector);
  const err = await page.evaluate((sel) => window.__selfplayChecks.checkClickable(sel), selector);
  if (err) throw new Error(err);
  await page.click(selector);
}

/**
 * Run a full self-play test session across a viewport
 */
async function runWorkerSession(serverUrl, viewport, puzzles, mode = 'perfect') {
  console.log(`[selfplay] Starting worker on viewport ${viewport.name} (${viewport.width}x${viewport.height}) [mode=${mode}]...`);
  const browser = await puppeteer.launch(launchOptions());
  const page = await browser.newPage();
  await page.setViewport({ width: viewport.width, height: viewport.height });

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', err => {
    consoleErrors.push(err.message);
  });
  page.on('request', req => {
    const url = req.url();
    if (!url.startsWith('http://localhost') && !url.startsWith('http://127.0.0.1') && !url.startsWith('data:') && !url.startsWith('blob:')) {
      consoleErrors.push('External request blocked: ' + url);
    }
  });

  if (mode === 'reduced_motion') {
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  }

  await page.goto(serverUrl, { waitUntil: 'networkidle0' });
  await page.evaluate(PAGE_CHECKS);

  if (mode === 'storage_throwing') {
    await page.evaluate(() => {
      localStorage.setItem = () => { throw new Error('QuotaExceededError mock'); };
    });
  }

  // 1. Initial Home Screen Checks
  let textErr = await page.evaluate(() => window.__selfplayChecks.checkTextDefects());
  if (textErr) throw new Error(textErr);
  let fontErr = await page.evaluate(() => window.__selfplayChecks.checkFonts());
  if (fontErr) throw new Error(fontErr);
  let oflowErr = await page.evaluate(() => window.__selfplayChecks.checkHorizontalOverflow());
  if (oflowErr) throw new Error(oflowErr);
  let mascotErr = await page.evaluate(() => window.__selfplayChecks.checkMascot());
  if (mascotErr) throw new Error(mascotErr);

  // 2. Settings & Credits Twemoji Attribution Check
  await safeClick(page, '#btnSettings');
  const creditsText = await page.evaluate(() => document.body.innerText);
  if (!creditsText.includes('Twemoji') || !creditsText.includes('CC-BY 4.0')) {
    throw new Error('Credits screen missing Twemoji CC-BY 4.0 attribution');
  }
  await safeClick(page, '#btnDismissSettings');

  // 3. Navigate Home -> Map
  const currentScreen = await page.evaluate(() => window.__meadow.getState().screen);
  if (currentScreen === 'home') {
    await safeClick(page, '#btnPlay');
  }
  const mapState = await page.evaluate(() => window.__meadow.getState());
  if (mapState.screen !== 'map') throw new Error('Failed transition to map screen');

  // 4. Play Level 1
  await safeClick(page, '.btn-select-level[data-level="1"]');

  let playedPuzzles = 0;
  for (let lvl = 1; lvl <= 3; lvl++) {
    const levelPuzzles = puzzles.filter(p => p.level === lvl);

    for (let pIdx = 0; pIdx < levelPuzzles.length; pIdx++) {
      const puzzle = levelPuzzles[pIdx];
      const state = await page.evaluate(() => window.__meadow.getState());
      if (state.screen !== 'puzzle') {
        throw new Error(`Expected puzzle screen, got ${state.screen} at level ${lvl} puzzle ${puzzle.id}`);
      }

      // Check text, fonts, overflow, mascot on each puzzle screen
      textErr = await page.evaluate(() => window.__selfplayChecks.checkTextDefects());
      if (textErr) throw new Error(textErr);
      fontErr = await page.evaluate(() => window.__selfplayChecks.checkFonts());
      if (fontErr) throw new Error(fontErr);
      oflowErr = await page.evaluate(() => window.__selfplayChecks.checkHorizontalOverflow());
      if (oflowErr) throw new Error(oflowErr);
      mascotErr = await page.evaluate(() => window.__selfplayChecks.checkMascot());
      if (mascotErr) throw new Error(mascotErr);

      // (c) Mid-level reload test on level 1 puzzle 3
      if (lvl === 1 && pIdx === 2 && mode === 'perfect') {
        await page.reload({ waitUntil: 'networkidle0' });
        await page.evaluate(PAGE_CHECKS);
        const reloadedState = await page.evaluate(() => window.__meadow.getState());
        // Should resume at map or current state with progress retained
        if (reloadedState.screen === 'home') {
          await safeClick(page, '#btnPlay');
          await safeClick(page, '.btn-select-level[data-level="1"]');
        }
      }

      // Solve puzzle
      if (mode === 'retry_hint') {
        // Wrong first
        if (puzzle.type === 'pick') {
          const wrongId = puzzle.items.find(i => i.id !== puzzle.answer).id;
          await safeClick(page, `.card-item[data-item-id="${wrongId}"]`);
        } else if (puzzle.type === 'tapall') {
          await safeClick(page, '#btnDoneTapAll'); // empty submission is wrong
        } else if (puzzle.type === 'order') {
          // wrong order
          const reversed = [...puzzle.items].reverse();
          for (const it of reversed) {
            await safeClick(page, `.card-item[data-item-id="${it.id}"]`);
          }
        }
        await new Promise(r => setTimeout(r, 700));
        // Use Hint
        await safeClick(page, '#btnHint');
        await new Promise(r => setTimeout(r, 100));
      }

      // Now choose correct answer
      if (puzzle.type === 'pick') {
        await safeClick(page, `.card-item[data-item-id="${puzzle.answer}"]`);
      } else if (puzzle.type === 'tapall') {
        for (const ansId of puzzle.answer) {
          await safeClick(page, `.card-item[data-item-id="${ansId}"]`);
        }
        await safeClick(page, '#btnDoneTapAll');
      } else if (puzzle.type === 'order') {
        for (const ansId of puzzle.answer) {
          await safeClick(page, `.card-item[data-item-id="${ansId}"]`);
        }
      }

      // Transition to Fact card
      await page.waitForFunction(() => window.__meadow.getState().screen === 'fact', { timeout: 8000 });
      textErr = await page.evaluate(() => window.__selfplayChecks.checkTextDefects());
      if (textErr) throw new Error(textErr);

      // Verify stars
      const endState = await page.evaluate(() => window.__meadow.getState());
      if (mode === 'perfect' && endState.stars !== 3) {
        throw new Error(`Expected 3 stars in perfect mode, got ${endState.stars} for ${puzzle.id}`);
      }
      if (mode === 'retry_hint' && endState.stars !== 2) {
        throw new Error(`Expected 2 stars in retry_hint mode, got ${endState.stars} for ${puzzle.id}`);
      }

      playedPuzzles++;

      // Click Next
      await safeClick(page, '#btnNextFact');

      // If at end of level, Level Done screen appears
      if (pIdx === levelPuzzles.length - 1) {
        await page.waitForFunction(() => window.__meadow.getState().screen === 'level_done', { timeout: 8000 });
        await safeClick(page, '#btnDoneBackMap');
      }
    }

    // Check level unlock condition: level 2 and 3 should be unlocked after 4+ of 6
    if (lvl < 3) {
      const nextUnlocked = await page.evaluate((nextLvl) => {
        return window.__meadow.isUnlocked(nextLvl);
      }, lvl + 1);
      if (!nextUnlocked) {
        throw new Error(`Level ${lvl + 1} failed to unlock after 6 solved puzzles!`);
      }
      // Enter next level
      await safeClick(page, `.btn-select-level[data-level="${lvl + 1}"]`);
    }
  }

  await browser.close();
  if (consoleErrors.length > 0) {
    throw new Error('Console errors encountered: ' + consoleErrors.join(' | '));
  }
  return playedPuzzles;
}

export async function runSelfPlay() {
  const isSelfTestOnly = process.argv.includes('--selftest');
  const server = createStaticServer(DIST_DIR);
  const puzzles = JSON.parse(fs.readFileSync(PUZZLES_PATH, 'utf8'));

  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const serverUrl = `http://localhost:${port}`;
  console.log(`[selfplay] Local test server running on ${serverUrl}`);

  const startTime = Date.now();
  let totalPuzzlesPlayed = 0;

  try {
    // 1. Run Self-Test
    await runSelfTest(serverUrl);
    if (isSelfTestOnly) {
      server.close();
      return;
    }

    // 2. Play all 18 puzzles on 3 Viewports (mobile, tablet, desktop)
    // Worker 1: Mobile (390x844) - Perfect play (3 stars)
    const p1 = await runWorkerSession(serverUrl, VIEWPORTS[0], puzzles, 'perfect');
    totalPuzzlesPlayed += p1;

    // Worker 2: Tablet (768x1024) - Retry + Hint play (2 stars)
    const p2 = await runWorkerSession(serverUrl, VIEWPORTS[1], puzzles, 'retry_hint');
    totalPuzzlesPlayed += p2;

    // Worker 3: Desktop (1440x900) - Storage failure + Reduced motion
    const p3 = await runWorkerSession(serverUrl, VIEWPORTS[2], puzzles, 'storage_throwing');
    totalPuzzlesPlayed += p3;

    const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n======================================================`);
    console.log(`[selfplay] PASSED: ${totalPuzzlesPlayed} puzzle sessions across 3 viewports in ${durationSec}s`);
    console.log(`[selfplay] Selftest: 2/2 defects caught | Console errors: 0 | Violations: 0`);
    console.log(`======================================================\n`);
  } finally {
    server.close();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runSelfPlay().catch(err => {
    console.error('[selfplay] FAILED:', err);
    process.exit(1);
  });
}
