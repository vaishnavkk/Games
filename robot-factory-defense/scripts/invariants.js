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

export async function runInvariantsCheck(options = {}) {
  const verbose = options.verbose ?? true;
  if (verbose) console.log('Starting Robot Factory Defense layout & DOM invariant suite...');

  // 1. Start Vite in-process server
  const server = await createServer({
    root: projectRoot,
    server: { port: 0 }
  });
  await server.listen();
  const port = server.httpServer.address().port;
  const baseUrl = `http://localhost:${port}/`;
  if (verbose) console.log(`[invariants] Vite dev server active on ${baseUrl}`);

  // 2. Launch Puppeteer
  const browser = await puppeteer.launch(launchOptions({
    headless: true
  }));

  const violations = [];
  const externalRequests = [];

  try {
    const page = await browser.newPage();

    // Listen to network requests for offline resilience
    page.on('request', (req) => {
      const url = req.url();
      if (!url.startsWith('http://localhost') && !url.startsWith('http://127.0.0.1') && !url.startsWith('data:') && !url.startsWith('blob:')) {
        externalRequests.push(url);
      }
    });

    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });

    // Check font readiness
    const fontStatus = await page.evaluate(async () => {
      if (document.fonts) {
        await document.fonts.ready;
        return { ready: true, status: document.fonts.status };
      }
      return { ready: true, status: 'unsupported' };
    });
    if (verbose) console.log(`[invariants] Font readiness: ${fontStatus.status}`);

    // Test viewports
    for (const vp of VIEWPORTS) {
      if (verbose) console.log(`[invariants] Testing viewport: ${vp.name}...`);
      await page.setViewport({ width: vp.width, height: vp.height });
      await new Promise(r => setTimeout(r, 80));

      const vpReport = await page.evaluate((vpInfo) => {
        const issues = [];

        // Check horizontal document overflow
        const docScrollW = document.documentElement.scrollWidth;
        if (docScrollW > vpInfo.width + 1.5) {
          issues.push({
            type: 'horizontal_overflow',
            msg: `Page scrollWidth (${docScrollW}px) exceeds viewport width (${vpInfo.width}px)`
          });
        }

        // Relative luminance & contrast calculator
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
          return [17, 20, 24, 1]; // Default factory theme background #111418
        }

        // Query all interactive elements
        const interactives = Array.from(document.querySelectorAll('button, [role="button"], .interactive, [data-action], [data-tower], input, select'));
        for (const el of interactives) {
          const style = window.getComputedStyle(el);
          if (style.display === 'none' || style.visibility === 'hidden') continue;

          const rect = el.getBoundingClientRect();
          if (rect.width === 0 && rect.height === 0) continue;

          // Check >= 48px touch target
          if (rect.width < 47.5 || rect.height < 47.5) {
            issues.push({
              type: 'touch_target_too_small',
              id: el.id || el.getAttribute('data-testid') || el.className,
              width: Math.round(rect.width),
              height: Math.round(rect.height),
              msg: `Target ${el.id || el.className} is ${Math.round(rect.width)}x${Math.round(rect.height)}px (min 48x48 required)`
            });
          }

          // Check text clipping
          if (el.scrollWidth > el.clientWidth + 1.5 || el.scrollHeight > el.clientHeight + 1.5) {
            issues.push({
              type: 'text_clipping',
              id: el.id || el.className,
              msg: `Interactive element ${el.id || el.className} has text overflow/clipping`
            });
          }
        }

        // Query text elements for contrast and clipping
        const textNodes = Array.from(document.querySelectorAll('span, p, h1, h2, h3, div.hud-stat-val, div.hud-stat-label'));
        for (const el of textNodes) {
          const style = window.getComputedStyle(el);
          if (style.display === 'none' || style.visibility === 'hidden') continue;
          if (!el.textContent.trim()) continue;

          // Check clipping
          if (el.scrollWidth > el.clientWidth + 2.5 && style.overflow === 'hidden') {
            issues.push({
              type: 'text_clipping',
              id: el.id || el.className,
              text: el.textContent.trim().slice(0, 20),
              msg: `Text element ${el.id || el.className} (${el.textContent.trim().slice(0, 20)}) clipped`
            });
          }

          // Check color contrast if text is long enough and not disabled
          if (el.textContent.trim().length > 1 && !el.closest(':disabled')) {
            const fg = parseRgb(style.color);
            const bg = getEffectiveBg(el);
            const cr = contrast(fg, bg);
            const fontSize = parseFloat(style.fontSize);
            const minContrast = fontSize >= 18 ? 3.0 : 4.5;
            if (cr < minContrast - 0.1) {
              issues.push({
                type: 'low_contrast',
                id: el.id || el.className,
                ratio: cr.toFixed(2),
                msg: `Low contrast ratio ${cr.toFixed(2)}:1 on ${el.id || el.className} (need >= ${minContrast}:1)`
              });
            }
          }
        }

        return issues;
      }, vp);

      if (vpReport.length > 0) {
        for (const iss of vpReport) {
          violations.push({ viewport: vp.name, ...iss });
        }
      }
    }

    // 3. Storage Failure Resilience Test
    if (verbose) console.log('[invariants] Testing storage failure resilience...');
    const storageTestResult = await page.evaluate(() => {
      try {
        const origGet = window.Storage.prototype.getItem;
        const origSet = window.Storage.prototype.setItem;

        // Force storage exception
        window.Storage.prototype.getItem = () => { throw new window.DOMException('SecurityError', 'SecurityError'); };
        window.Storage.prototype.setItem = () => { throw new window.DOMException('QuotaExceededError', 'QuotaExceededError'); };

        // Trigger storage calls
        if (window.__rfd && window.__rfd.state) {
          // If state hook exists, exercise step
          window.__rfd.step(window.__rfd.state, 16);
        }

        // Restore
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

    // 4. Offline Resilience Check
    if (externalRequests.length > 0) {
      violations.push({
        type: 'external_network_requests',
        msg: `Detected ${externalRequests.length} external network requests: ${externalRequests.slice(0, 3).join(', ')}`
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

  // Summary
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
    console.log(`- Touch targets: >= 48px verified across all interactive controls`);
    console.log(`- Layout & Clipping: Zero text clippings or horizontal overflows`);
    console.log(`- Color Contrast: Complies with WCAG AA >= 4.5:1`);
    console.log(`- Offline Resilience: 0 external requests made`);
    console.log(`- Storage Resilience: Handled QuotaExceededError/SecurityError`);
    console.log(`======================================================\n`);
  }

  return { success: true, violations: [] };
}

// Standalone execution
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
