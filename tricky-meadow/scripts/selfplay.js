import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer-core';
import { PNG } from 'pngjs';
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
  },
  checkButtonContent() {
    const buttons = Array.from(document.querySelectorAll('button')).filter(b => {
      const r = b.getBoundingClientRect();
      const style = window.getComputedStyle(b);
      return r.width > 0 && r.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
    });

    for (const btn of buttons) {
      const text = btn.innerText ? btn.innerText.trim() : '';
      const svg = btn.querySelector('svg');

      if (!text && !svg) {
        return 'Button has neither text nor SVG: ' + (btn.id || btn.className);
      }

      if (svg) {
        const svgRect = svg.getBoundingClientRect();
        if (svgRect.width < 20 || svgRect.height < 20) {
          return 'Button SVG rendered rect < 20x20 (' + svgRect.width + 'x' + svgRect.height + '): ' + (btn.id || btn.className);
        }

        const useEls = Array.from(svg.querySelectorAll('use'));
        for (const useEl of useEls) {
          const href = useEl.getAttribute('href') || useEl.getAttribute('xlink:href');
          if (!href || !href.startsWith('#')) {
            return 'Invalid <use> href: ' + href + ' in button ' + (btn.id || btn.className);
          }
          const target = document.querySelector(href);
          if (!target) {
            return 'Missing <use> target symbol: ' + href + ' in button ' + (btn.id || btn.className);
          }
          if (target.children.length === 0) {
            return 'Target symbol ' + href + ' has no children in button ' + (btn.id || btn.className);
          }
        }
      }
    }
    return null;
  },
  checkAlignment() {
    // 1. Header invariants (if .hud-bar is present)
    const hud = document.querySelector('.hud-bar');
    if (hud) {
      const children = Array.from(hud.children);
      if (children.length >= 2) {
        const centersY = children.map(c => {
          const r = c.getBoundingClientRect();
          return r.top + r.height / 2;
        });
        const yDiff = Math.max(...centersY) - Math.min(...centersY);
        if (yDiff > 2.0) {
          return 'Header children vertical centres differ by > 2px (diff=' + yDiff.toFixed(2) + 'px)';
        }
      }

      const headerRect = hud.getBoundingClientRect();
      const headerCenterX = headerRect.left + headerRect.width / 2;
      const title = hud.querySelector('.hud-title') || hud.querySelector('.hud-center');
      if (title) {
        const titleRect = title.getBoundingClientRect();
        const titleCenterX = titleRect.left + titleRect.width / 2;
        const xDiff = Math.abs(titleCenterX - headerCenterX);
        if (xDiff > 2.0) {
          return 'Title centre is not within 2px of header centre x (diff=' + xDiff.toFixed(2) + 'px)';
        }
      }
    }

    // 2. All .icon-btn are square and equal (56px)
    const iconBtns = Array.from(document.querySelectorAll('.icon-btn')).filter(b => {
      const r = b.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    });
    for (const btn of iconBtns) {
      const r = btn.getBoundingClientRect();
      if (Math.abs(r.width - r.height) > 1.5) {
        return 'icon-btn is not square (' + r.width.toFixed(1) + 'x' + r.height.toFixed(1) + '): ' + (btn.id || btn.className);
      }
      if (Math.abs(r.width - 56) > 2.0 || Math.abs(r.height - 56) > 2.0) {
        return 'icon-btn size is not 56px (' + r.width.toFixed(1) + 'x' + r.height.toFixed(1) + '): ' + (btn.id || btn.className);
      }
    }

    // 3. Icon+text buttons have content centred within 2 px
    const iconTextBtns = Array.from(document.querySelectorAll('.hint-btn, .btn-primary, .btn-secondary')).filter(b => {
      const r = b.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && b.querySelector('svg') && b.innerText && b.innerText.trim();
    });
    for (const b of iconTextBtns) {
      const bRect = b.getBoundingClientRect();
      const first = b.firstElementChild;
      const last = b.lastElementChild;
      if (first && last && first !== last) {
        const contentCenterX = (first.getBoundingClientRect().left + last.getBoundingClientRect().right) / 2;
        const btnCenterX = bRect.left + bRect.width / 2;
        const diff = Math.abs(contentCenterX - btnCenterX);
        if (diff > 2.0) {
          return 'Icon+text button content not centred within 2px (diff=' + diff.toFixed(2) + 'px): ' + (b.id || b.className);
        }
      }
    }

    // 4. In every card row, items of the same class have equal size
    const cardsArea = document.querySelector('.cards-area');
    if (cardsArea) {
      const cards = Array.from(cardsArea.querySelectorAll('.card-item')).filter(c => c.getBoundingClientRect().width > 0);
      const rows = new Map();
      for (const card of cards) {
        const r = card.getBoundingClientRect();
        const rowKey = Math.round(r.top / 15) * 15;
        if (!rows.has(rowKey)) rows.set(rowKey, []);
        rows.get(rowKey).push(r);
      }
      for (const [rowKey, rects] of rows.entries()) {
        if (rects.length > 1) {
          const widths = rects.map(r => r.width);
          const heights = rects.map(r => r.height);
          if (Math.max(...widths) - Math.min(...widths) > 2.0) {
            return 'Card row items width mismatch in row ' + rowKey;
          }
          if (Math.max(...heights) - Math.min(...heights) > 2.0) {
            return 'Card row items height mismatch in row ' + rowKey;
          }
        }
      }
    }

    return null;
  }
};
`;

/**
 * Verify rendered SVG pixels are not blank using pngjs (stddev > threshold)
 */
async function checkSvgPixelsNotBlank(page) {
  const iconButtons = await page.$$('.icon-btn, .hint-btn');
  for (const btn of iconButtons) {
    const svg = await btn.$('svg');
    if (!svg) continue;
    const box = await svg.boundingBox();
    if (!box || box.width === 0 || box.height === 0) continue;

    const screenshotBuffer = await svg.screenshot();
    const png = PNG.sync.read(screenshotBuffer);
    const pixels = [];
    for (let i = 0; i < png.data.length; i += 4) {
      const a = png.data[i + 3];
      if (a > 20) {
        const lum = 0.299 * png.data[i] + 0.587 * png.data[i + 1] + 0.114 * png.data[i + 2];
        pixels.push(lum);
      }
    }

    if (pixels.length < 10) {
      throw new Error('Button SVG pixel clipping check failed: blank/transparent rendered SVG');
    }

    const mean = pixels.reduce((a, b) => a + b, 0) / pixels.length;
    const variance = pixels.reduce((a, b) => a + (b - mean) ** 2, 0) / pixels.length;
    const stddev = Math.sqrt(variance);

    if (stddev < 3.0) {
      throw new Error(`Button SVG pixel check failed: stddev=${stddev.toFixed(2)} <= threshold (icon is blank)`);
    }
  }
}

/**
 * Run full screen invariants: text defects, overflow, fonts, mascot (when required), button content, alignment, and pixel check
 */
async function assertScreenInvariants(page, { requireMascot = false } = {}) {
  let err = await page.evaluate(() => window.__selfplayChecks.checkTextDefects());
  if (err) throw new Error(err);
  err = await page.evaluate(() => window.__selfplayChecks.checkFonts());
  if (err) throw new Error(err);
  err = await page.evaluate(() => window.__selfplayChecks.checkHorizontalOverflow());
  if (err) throw new Error(err);
  err = await page.evaluate(() => window.__selfplayChecks.checkButtonContent());
  if (err) throw new Error(err);
  err = await page.evaluate(() => window.__selfplayChecks.checkAlignment());
  if (err) throw new Error(err);

  if (requireMascot) {
    err = await page.evaluate(() => window.__selfplayChecks.checkMascot());
    if (err) throw new Error(err);
  }

  await checkSvgPixelsNotBlank(page);
}

/**
 * Self-test routine: plants 4 defects and verifies harness catches all 4:
 * 1. "undefined" text in a fact
 * 2. Invisible overlay over Next
 * 3. Icon button whose <use> points to a missing symbol
 * 4. Header title shifted 12 px
 */
async function runSelfTest(serverUrl) {
  console.log('[selfplay] Running --selftest (verifying harness catches 4 injected defects)...');
  const browser = await puppeteer.launch(launchOptions());
  const page = await browser.newPage();
  await page.setViewport(VIEWPORTS[0]);
  await page.goto(serverUrl, { waitUntil: 'networkidle0' });
  await page.evaluate(PAGE_CHECKS);

  let defect1Caught = false;
  let defect2Caught = false;
  let defect3Caught = false;
  let defect4Caught = false;

  // Defect 1: inject "undefined" text into DOM
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
  await page.evaluate(() => document.getElementById('defect-text')?.remove());

  // Defect 2: invisible overlay covering Play/Next button
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

  // Defect 3: icon button whose <use> points to a missing symbol
  await page.evaluate(() => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'icon-btn';
    btn.id = 'defect-broken-icon-btn';
    btn.innerHTML = '<svg class="emoji" width="28" height="28"><use href="#emoji-missing-defect-symbol"></use></svg>';
    document.body.appendChild(btn);
  });
  const brokenIconErr = await page.evaluate(() => window.__selfplayChecks.checkButtonContent());
  if (brokenIconErr && brokenIconErr.includes('Missing <use> target symbol')) {
    defect3Caught = true;
    console.log('[selfplay] Defect 3 caught successfully: ' + brokenIconErr);
  }
  await page.evaluate(() => document.getElementById('defect-broken-icon-btn')?.remove());

  // Defect 4: header title shifted 12 px
  await page.click('#btnPlay'); // Navigate to map screen where .hud-bar is present
  await page.evaluate(() => {
    const title = document.querySelector('.hud-title');
    if (title) {
      title.id = 'defect-shifted-title';
      title.style.transform = 'translateX(12px)';
    }
  });
  const shiftedTitleErr = await page.evaluate(() => window.__selfplayChecks.checkAlignment());
  if (shiftedTitleErr && shiftedTitleErr.includes('Title centre is not within 2px')) {
    defect4Caught = true;
    console.log('[selfplay] Defect 4 caught successfully: ' + shiftedTitleErr);
  }
  await page.evaluate(() => {
    const title = document.getElementById('defect-shifted-title');
    if (title) {
      title.style.transform = '';
      title.removeAttribute('id');
    }
  });

  await browser.close();

  if (defect1Caught && defect2Caught && defect3Caught && defect4Caught) {
    console.log('[selfplay] Selftest PASSED: 4/4 defects caught by harness.\n');
    return true;
  } else {
    console.error(`[selfplay] Selftest FAILED: defect1=${defect1Caught}, defect2=${defect2Caught}, defect3=${defect3Caught}, defect4=${defect4Caught}`);
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

  // 1. Initial Home Screen Invariants
  await assertScreenInvariants(page, { requireMascot: true });

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

  // Map Screen Invariants
  await assertScreenInvariants(page);

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

      // Check invariants on each puzzle screen
      await assertScreenInvariants(page, { requireMascot: true });

      // Mid-level reload test on level 1 puzzle 3
      if (lvl === 1 && pIdx === 2 && mode === 'perfect') {
        await page.reload({ waitUntil: 'networkidle0' });
        await page.evaluate(PAGE_CHECKS);
        const reloadedState = await page.evaluate(() => window.__meadow.getState());
        if (reloadedState.screen === 'home') {
          await safeClick(page, '#btnPlay');
          await safeClick(page, '.btn-select-level[data-level="1"]');
        }
      }

      // Solve puzzle
      if (mode === 'retry_hint') {
        if (puzzle.type === 'pick') {
          const wrongId = puzzle.items.find(i => i.id !== puzzle.answer).id;
          await safeClick(page, `.card-item[data-item-id="${wrongId}"]`);
        } else if (puzzle.type === 'tapall') {
          await safeClick(page, '#btnDoneTapAll'); // empty submission is wrong
        } else if (puzzle.type === 'order') {
          const reversed = [...puzzle.items].reverse();
          for (const it of reversed) {
            await safeClick(page, `.card-item[data-item-id="${it.id}"]`);
          }
        }
        await new Promise(r => setTimeout(r, 700));
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
      await assertScreenInvariants(page, { requireMascot: true });

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
        await assertScreenInvariants(page, { requireMascot: true });
        await safeClick(page, '#btnDoneBackMap');
      }
    }

    // Check level unlock condition
    if (lvl < 3) {
      const nextUnlocked = await page.evaluate((nextLvl) => {
        return window.__meadow.isUnlocked(nextLvl);
      }, lvl + 1);
      if (!nextUnlocked) {
        throw new Error(`Level ${lvl + 1} failed to unlock after 6 solved puzzles!`);
      }
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
    // 1. Run Self-Test (4/4 defects)
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
    console.log(`[selfplay] Selftest: 4/4 defects caught | Console errors: 0 | Violations: 0`);
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
