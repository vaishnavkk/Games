import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'vite';
import puppeteer from 'puppeteer-core';
import { launchOptions } from './chrome.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const VIEWPORTS = [
  { name: '320x568 (iPhone SE)', width: 320, height: 568 },
  { name: '360x740 (Galaxy S8)', width: 360, height: 740 },
  { name: '390x844 (iPhone 12/13)', width: 390, height: 844 },
  { name: '412x915 (Pixel 7)', width: 412, height: 915 },
  { name: '568x320 (Mobile Landscape)', width: 568, height: 320 },
  { name: '768x1024 (iPad Portrait)', width: 768, height: 1024 },
  { name: '1024x768 (iPad Landscape)', width: 1024, height: 768 },
  { name: '1440x900 (Desktop HD)', width: 1440, height: 900 }
];

async function auditDomInvariants(page, vp, stateLabel) {
  return page.evaluate((vpInfo, label) => {
    const issues = [];

    const docScrollW = document.documentElement.scrollWidth;
    if (docScrollW > vpInfo.width + 1.5) {
      issues.push({
        type: 'horizontal_overflow',
        state: label,
        msg: `[${label}] Page scrollWidth (${docScrollW}px) exceeds viewport width (${vpInfo.width}px)`
      });
    }

    function parseRgb(colorStr) {
      const match = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
      if (!match) return [255, 255, 255, 1];
      return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3]), match[4] !== undefined ? parseFloat(match[4]) : 1];
    }

    function relLuminance(r, g, b) {
      const [rs, gs, bs] = [r, g, b].map(c => {
        const s = c / 255;
        return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
    }

    function contrast(c1, c2) {
      const l1 = relLuminance(c1[0], c1[1], c1[2]);
      const l2 = relLuminance(c2[0], c2[1], c2[2]);
      const lighter = Math.max(l1, l2);
      const darker = Math.min(l1, l2);
      return (lighter + 0.05) / (darker + 0.05);
    }

    function getEffectiveBg(el) {
      let curr = el;
      while (curr && curr !== document) {
        const bg = window.getComputedStyle(curr).backgroundColor;
        const [r, g, b, a] = parseRgb(bg);
        if (a > 0.3) return [r, g, b, a];
        curr = curr.parentElement;
      }
      return [17, 20, 24, 1];
    }

    const interactives = Array.from(document.querySelectorAll('button, [role="button"], .interactive, [data-action], [data-tower], input, select'));
    for (const el of interactives) {
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') continue;
      if (el.closest('[inert]') || el.inert) continue;

      const rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) continue;

      if (rect.width < 47.5 || rect.height < 47.5) {
        issues.push({
          type: 'touch_target_too_small',
          state: label,
          id: el.id || el.getAttribute('data-testid') || el.className,
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          msg: `[${label}] Target ${el.id || el.className} is ${Math.round(rect.width)}x${Math.round(rect.height)}px (min 48x48 required)`
        });
      }

      if (el.scrollWidth > el.clientWidth + 1.5 || el.scrollHeight > el.clientHeight + 1.5) {
        if (!el.classList.contains('modal-content')) {
          issues.push({
            type: 'text_clipping',
            state: label,
            id: el.id || el.className,
            msg: `[${label}] Interactive element ${el.id || el.className} has text overflow/clipping (${el.scrollWidth}x${el.scrollHeight} vs ${el.clientWidth}x${el.clientHeight})`
          });
        }
      }
    }

    const textNodes = Array.from(document.querySelectorAll('span, p, h1, h2, h3, div.hud-stat-val, div.hud-stat-label, button.btn'));
    for (const el of textNodes) {
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') continue;
      if (el.closest('[inert]') || el.inert) continue;
      if (!el.textContent.trim()) continue;

      if (el.scrollWidth > el.clientWidth + 2.5 && style.overflow === 'hidden') {
        issues.push({
          type: 'text_clipping',
          state: label,
          id: el.id || el.className,
          text: el.textContent.trim().slice(0, 20),
          msg: `[${label}] Text element ${el.id || el.className} (${el.textContent.trim().slice(0, 20)}) clipped`
        });
      }

      const isLeafText = el.tagName === 'BUTTON' ? el.children.length === 0 : true;
      if (isLeafText && el.textContent.trim().length > 1 && !el.closest(':disabled')) {
        const fg = parseRgb(style.color);
        const bg = getEffectiveBg(el);
        const cr = contrast(fg, bg);
        const fontSize = parseFloat(style.fontSize);
        const minContrast = fontSize >= 18 ? 3.0 : 4.5;
        if (cr < minContrast - 0.1) {
          issues.push({
            type: 'low_contrast',
            state: label,
            id: el.id || el.className,
            ratio: cr.toFixed(2),
            msg: `[${label}] Low contrast ratio ${cr.toFixed(2)}:1 on ${el.id || el.className} (need >= ${minContrast}:1)`
          });
        }
      }
    }

    return issues;
  }, vp, stateLabel);
}

async function checkNonOverlappingRects(page, vp, label, pairs) {
  return page.evaluate((vpInfo, stateLabel, rectPairs) => {
    const issues = [];
    for (const [selA, selB] of rectPairs) {
      const a = document.querySelector(selA);
      const b = document.querySelector(selB);
      if (!a || !b) continue;
      const sa = window.getComputedStyle(a);
      const sb = window.getComputedStyle(b);
      if (sa.display === 'none' || sb.display === 'none') continue;
      const ra = a.getBoundingClientRect();
      const rb = b.getBoundingClientRect();
      const xOverlap = Math.max(0, Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left));
      const yOverlap = Math.max(0, Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top));
      if (xOverlap > 1 && yOverlap > 1) {
        issues.push({
          type: 'element_overlap',
          state: stateLabel,
          msg: `[${stateLabel}] ${selA} overlaps ${selB} by ${Math.round(xOverlap)}x${Math.round(yOverlap)}px`
        });
      }
    }
    return issues;
  }, vp, label, pairs);
}

export async function runInvariantsCheck(options = {}) {
  const verbose = options.verbose ?? true;
  if (verbose) console.log('Starting Robot Factory Defense layout & DOM invariant suite...');

  const nmPath = path.join(projectRoot, 'node_modules');
  const fsAllow = [projectRoot];
  if (fs.existsSync(nmPath)) {
    fsAllow.push(fs.realpathSync(nmPath));
  }

  const server = await createServer({
    root: projectRoot,
    server: { port: 0, fs: { allow: fsAllow } }
  });
  await server.listen();
  const port = server.httpServer.address().port;
  const baseUrl = `http://localhost:${port}/`;
  if (verbose) console.log(`[invariants] Vite dev server active on ${baseUrl}`);

  const browser = await puppeteer.launch(launchOptions({
    headless: true
  }));

  const violations = [];
  const externalRequests = [];
  const failedResponses = [];

  try {
    const page = await browser.newPage();

    page.on('request', (req) => {
      const url = req.url();
      if (!url.startsWith('http://localhost') && !url.startsWith('http://127.0.0.1') && !url.startsWith('data:') && !url.startsWith('blob:')) {
        externalRequests.push(url);
      }
    });

    page.on('response', (res) => {
      if (res.status() >= 400) {
        failedResponses.push(`${res.status()} ${res.url()}`);
      }
    });

    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof window.__rfd !== 'undefined', { timeout: 5000 });

    const fontStatus = await page.evaluate(async () => {
      if (document.fonts) {
        await document.fonts.ready;
        return { ready: true, status: document.fonts.status };
      }
      return { ready: true, status: 'unsupported' };
    });
    if (verbose) console.log(`[invariants] Font readiness: ${fontStatus.status}`);

    // Phase A: Title Screen across all 8 viewports
    for (const vp of VIEWPORTS) {
      if (verbose) console.log(`[invariants] Testing titleScreen viewport: ${vp.name}...`);
      await page.setViewport({ width: vp.width, height: vp.height });
      await new Promise(r => setTimeout(r, 80));

      const titleIssues = await auditDomInvariants(page, vp, 'titleScreen');
      const playReachable = await page.evaluate(() => {
        const btn = document.getElementById('btnPlay');
        if (!btn) return { ok: false, reason: 'missing #btnPlay' };
        btn.scrollIntoView({ block: 'nearest' });
        const r = btn.getBoundingClientRect();
        const topEl = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        const ok = r.top >= 0 && r.bottom <= window.innerHeight + 1 && (topEl === btn || btn.contains(topEl));
        return { ok, top: r.top, bottom: r.bottom, vh: window.innerHeight };
      });
      if (!playReachable.ok) {
        titleIssues.push({
          type: 'button_unreachable',
          state: 'titleScreen',
          msg: `[titleScreen] #btnPlay unreachable at ${vp.name} (${JSON.stringify(playReachable)})`
        });
      }
      for (const iss of titleIssues) violations.push({ viewport: vp.name, ...iss });
    }

    // Dismiss Title Screen to test live gameplay views across all 8 viewports
    await page.click('#btnPlay');
    await new Promise(r => setTimeout(r, 80));

    for (const vp of VIEWPORTS) {
      if (verbose) console.log(`[invariants] Testing gameplay/buildBar/inspectCard/workshopModal at ${vp.name}...`);
      await page.setViewport({ width: vp.width, height: vp.height });
      await page.evaluate(() => {
        if (window.__rfd) {
          window.__rfd.resetGame();
          window.__rfd.state.scrap = 300;
        }
      });
      await new Promise(r => setTimeout(r, 120));

      // 1. Live gameplay HUD + Canvas view
      violations.push(
        ...(await auditDomInvariants(page, vp, 'gameplay')).map(iss => ({ viewport: vp.name, ...iss })),
        ...(await checkNonOverlappingRects(page, vp, 'gameplay', [
          ['#hudBar', '#gameCanvas'],
          ['#tipsBanner', '#gameCanvas']
        ])).map(iss => ({ viewport: vp.name, ...iss }))
      );

      // Verify clicking buildable cell (1,1) hits #gameCanvas and opens #buildBar
      const cell11Pos = await page.evaluate(() => {
        const canvas = document.getElementById('gameCanvas');
        if (!canvas) return null;
        const r = canvas.getBoundingClientRect();
        const x = r.left + 1.5 * (r.width / 16);
        const y = r.top + 1.5 * (r.height / 9);
        const hit = document.elementFromPoint(x, y);
        return { x, y, hitsCanvas: hit === canvas };
      });

      if (!cell11Pos || !cell11Pos.hitsCanvas) {
        violations.push({
          viewport: vp.name,
          type: 'canvas_cell_obscured',
          state: 'gameplay',
          msg: `[gameplay] Cell (1,1) on #gameCanvas is obscured at ${vp.name}`
        });
      } else {
        await page.mouse.click(cell11Pos.x, cell11Pos.y);
        await new Promise(r => setTimeout(r, 100));

        // 2. Build Bar view
        const buildBarVisible = await page.evaluate(() => {
          const el = document.getElementById('buildBar');
          return el && window.getComputedStyle(el).display !== 'none';
        });
        if (!buildBarVisible) {
          violations.push({
            viewport: vp.name,
            type: 'build_bar_not_opened',
            state: 'buildBar',
            msg: `[buildBar] Clicking (1,1) did not open #buildBar at ${vp.name}`
          });
        } else {
          violations.push(
            ...(await auditDomInvariants(page, vp, 'buildBar')).map(iss => ({ viewport: vp.name, ...iss })),
            ...(await checkNonOverlappingRects(page, vp, 'buildBar', [
              ['#buildBar', '#gameCanvas'],
              ['#hudBar', '#gameCanvas'],
              ['#hudBar', '#buildBar']
            ])).map(iss => ({ viewport: vp.name, ...iss }))
          );

          // Build Pulse Turret on (1,1), then click (1,1) to open Inspect Card
          await page.click('[data-testid="build-pulse"]');
          await new Promise(r => setTimeout(r, 100));

          const towerCellPos = await page.evaluate(() => {
            const canvas = document.getElementById('gameCanvas');
            const r = canvas.getBoundingClientRect();
            return { x: r.left + 1.5 * (r.width / 16), y: r.top + 1.5 * (r.height / 9) };
          });
          await page.mouse.click(towerCellPos.x, towerCellPos.y);
          await new Promise(r => setTimeout(r, 120));

          // 3. Inspect Card view
          const inspectVisible = await page.evaluate(() => {
            const el = document.getElementById('inspectCard');
            return el && window.getComputedStyle(el).display !== 'none';
          });
          if (!inspectVisible) {
            violations.push({
              viewport: vp.name,
              type: 'inspect_card_not_opened',
              state: 'inspectCard',
              msg: `[inspectCard] Clicking built tower at (1,1) did not open #inspectCard at ${vp.name}`
            });
          } else {
            violations.push(
              ...(await auditDomInvariants(page, vp, 'inspectCard')).map(iss => ({ viewport: vp.name, ...iss })),
              ...(await checkNonOverlappingRects(page, vp, 'inspectCard', [
                ['#inspectCard', '#gameCanvas'],
                ['#inspectCard', '#hudBar'],
                ['#hudBar', '#gameCanvas']
              ])).map(iss => ({ viewport: vp.name, ...iss }))
            );
            await page.click('#btnCloseInspect');
            await new Promise(r => setTimeout(r, 80));
          }
        }
      }

      // 4. Workshop Modal view
      await page.click('#btnWorkshop');
      await new Promise(r => setTimeout(r, 100));

      const workshopCheck = await page.evaluate((vpInfo) => {
        const modal = document.getElementById('workshopModal');
        if (!modal || window.getComputedStyle(modal).display === 'none') {
          return { ok: false, reason: 'modal not visible' };
        }
        const content = modal.querySelector('.modal-content');
        const r = content.getBoundingClientRect();
        const fits = r.left >= -1 && r.top >= -1 && r.right <= vpInfo.width + 1.5 && r.bottom <= vpInfo.height + 1.5;
        const roleOk = modal.getAttribute('role') === 'dialog' && modal.getAttribute('aria-modal') === 'true';
        return { ok: fits && roleOk, fits, roleOk, rect: { left: r.left, top: r.top, right: r.right, bottom: r.bottom } };
      }, vp);

      if (!workshopCheck.ok) {
        violations.push({
          viewport: vp.name,
          type: 'workshop_modal_invalid',
          state: 'workshopModal',
          msg: `[workshopModal] Invalid bounds or ARIA at ${vp.name}: ${JSON.stringify(workshopCheck)}`
        });
      }

      violations.push(
        ...(await auditDomInvariants(page, vp, 'workshopModal')).map(iss => ({ viewport: vp.name, ...iss }))
      );

      // Verify Escape closes workshopModal
      await page.keyboard.press('Escape');
      await new Promise(r => setTimeout(r, 80));
      const stillOpen = await page.evaluate(() => {
        const modal = document.getElementById('workshopModal');
        return modal && window.getComputedStyle(modal).display !== 'none';
      });
      if (stillOpen) {
        violations.push({
          viewport: vp.name,
          type: 'escape_did_not_close_modal',
          state: 'workshopModal',
          msg: `[workshopModal] Pressing Escape did not close #workshopModal at ${vp.name}`
        });
        await page.click('#btnCloseWorkshop');
      }
    }

    // 3. Storage Failure Resilience Test
    if (verbose) console.log('[invariants] Testing storage failure resilience...');
    const storageTestResult = await page.evaluate(() => {
      try {
        const origGet = window.Storage.prototype.getItem;
        const origSet = window.Storage.prototype.setItem;

        window.Storage.prototype.getItem = () => { throw new window.DOMException('SecurityError', 'SecurityError'); };
        window.Storage.prototype.setItem = () => { throw new window.DOMException('QuotaExceededError', 'QuotaExceededError'); };

        if (window.__rfd && window.__rfd.state) {
          window.__rfd.step(window.__rfd.state, 16);
        }

        window.Storage.prototype.getItem = origGet;
        window.Storage.prototype.setItem = origSet;
        return { success: true };
      } catch (err) {
        return { success: false, error: err.message };
      }
    });

    if (!storageTestResult.success) {
      violations.push({
        type: 'storage_resilience_failure',
        msg: `Storage failure crashed app: ${storageTestResult.error}`
      });
    }

    if (externalRequests.length > 0) {
      violations.push({
        type: 'external_network_requests',
        msg: `Detected ${externalRequests.length} external network requests: ${externalRequests.slice(0, 3).join(', ')}`
      });
    }

    if (failedResponses.length > 0) {
      violations.push({
        type: 'http_error_responses',
        msg: `Detected HTTP >= 400 responses: ${failedResponses.join(', ')}`
      });
    }

    if (pageErrors.length > 0) {
      violations.push({
        type: 'page_runtime_errors',
        msg: `Encountered runtime errors: ${pageErrors.join('; ')}`
      });
    }

  } finally {
    await browser.close();
    await server.close();
  }

  if (violations.length > 0) {
    console.error(`\n[invariants] FAILED with ${violations.length} violation(s):`);
    violations.forEach((v, i) => {
      console.error(`  [${i + 1}] [${v.viewport || 'Global'}] ${v.type}: ${v.msg}`);
    });
    return { success: false, violations };
  }

  if (verbose) {
    console.log(`\n======================================================`);
    console.log(`[invariants] ALL 8 VIEWPORTS AND INVARIANT CHECKS PASSED!`);
    console.log(`- Views checked: titleScreen, gameplay, buildBar, inspectCard, workshopModal`);
    console.log(`- Touch targets: >= 48px verified across all interactive controls`);
    console.log(`- Layout & Overlap: Zero canvas/HUD/inspect overlaps or text clippings`);
    console.log(`- Color Contrast: Complies with WCAG AA >= 4.5:1`);
    console.log(`- Offline & HTTP: 0 external requests, 0 404/error responses`);
    console.log(`- Storage Resilience: Handled QuotaExceededError/SecurityError`);
    console.log(`======================================================\n`);
  }

  return { success: true, violations: [] };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  runInvariantsCheck()
    .then(res => {
      process.exit(res.success ? 0 : 1);
    })
    .catch(err => {
      console.error('[invariants] Fatal execution error:', err);
      process.exit(1);
    });
}
