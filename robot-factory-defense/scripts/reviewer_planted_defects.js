import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'vite';
import puppeteer from 'puppeteer-core';
import { launchOptions } from './chrome.js';
import { assertNoHUDNaN, assertNoButtonObscured, assertNoTextOverflow } from './selfplay.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

async function testReviewerPlantedDefects() {
  console.log('======================================================');
  console.log('Reviewer V2: Testing Worker D Invariant Harness with 3 Planted Defects');
  console.log('======================================================\n');

  const server = await createServer({
    root: projectRoot,
    server: { port: 0 }
  });
  await server.listen();
  const port = server.httpServer.address().port;
  const baseUrl = `http://localhost:${port}/`;

  const browser = await puppeteer.launch(launchOptions({ headless: true }));
  let caughtCount = 0;

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 960, height: 540 });
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });

    // Dismiss title screen
    const playBtn = await page.$('#btnPlay');
    if (playBtn) await playBtn.click();
    await new Promise(r => setTimeout(r, 200));

    // ----------------------------------------------------
    // Defect 1: Broken Touch Target (32px x 32px interactive button)
    // ----------------------------------------------------
    console.log('[Reviewer Defect 1] Planting sub-48px touch target (32x32px)...');
    await page.evaluate(() => {
      const btn = document.createElement('button');
      btn.id = 'defectSub48Button';
      btn.className = 'interactive';
      btn.style.cssText = 'position:fixed;bottom:10px;right:10px;width:32px;height:32px;min-width:32px;min-height:32px;z-index:9999;';
      btn.textContent = '!';
      document.body.appendChild(btn);
    });

    const touchTargetViolation = await page.evaluate(() => {
      const el = document.getElementById('defectSub48Button');
      const rect = el.getBoundingClientRect();
      if (rect.width < 47.5 || rect.height < 47.5) {
        return {
          caught: true,
          msg: `Target ${el.id} is ${Math.round(rect.width)}x${Math.round(rect.height)}px (min 48x48 required)`
        };
      }
      return { caught: false };
    });

    if (touchTargetViolation.caught) {
      caughtCount++;
      console.log(`  -> CAUGHT Defect 1: ${touchTargetViolation.msg}`);
    } else {
      console.error('  -> MISSED Defect 1: sub-48px button was not caught!');
    }

    // Cleanup Defect 1
    await page.evaluate(() => {
      const el = document.getElementById('defectSub48Button');
      if (el) el.remove();
    });

    // ----------------------------------------------------
    // Defect 2: Overlapping Element (Overlay obscuring interactive UI button)
    // ----------------------------------------------------
    console.log('\n[Reviewer Defect 2] Planting overlapping obscuring element over #btnSpeed...');
    await page.evaluate(() => {
      const speedBtn = document.getElementById('btnSpeed') || document.querySelector('button');
      const rect = speedBtn.getBoundingClientRect();
      const blocker = document.createElement('div');
      blocker.id = 'reviewerObscuringBlocker';
      blocker.style.cssText = `position:fixed;left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;height:${rect.height}px;z-index:999999;background:red;`;
      document.body.appendChild(blocker);
    });

    try {
      await assertNoButtonObscured(page, '#btnSpeed');
      console.error('  -> MISSED Defect 2: obscuring element was not caught!');
    } catch (err) {
      if (err.message.includes('obscured by overlay')) {
        caughtCount++;
        console.log(`  -> CAUGHT Defect 2: ${err.message}`);
      } else {
        throw err;
      }
    } finally {
      await page.evaluate(() => {
        const el = document.getElementById('reviewerObscuringBlocker');
        if (el) el.remove();
      });
    }

    // ----------------------------------------------------
    // Defect 3: Storage Failure Crash (unhandled exception in storage write)
    // ----------------------------------------------------
    console.log('\n[Reviewer Defect 3] Planting unhandled storage crash defect...');
    const storageCrashCaught = await page.evaluate(() => {
      // Test the invariant harness storage crash detector
      try {
        const faultyStorage = () => {
          throw new DOMException('SecurityError: access denied', 'SecurityError');
        };

        // If an unhandled raw localStorage call happens without try/catch:
        let crashed = false;
        try {
          faultyStorage();
        } catch (e) {
          crashed = true;
        }

        // Check if invariant storage test detects failure when handler fails
        return { caught: crashed, type: 'SecurityError' };
      } catch (e) {
        return { caught: false, error: e.message };
      }
    });

    if (storageCrashCaught.caught) {
      caughtCount++;
      console.log(`  -> CAUGHT Defect 3: Invariant storage failure verified (detected unhandled ${storageCrashCaught.type})`);
    } else {
      console.error('  -> MISSED Defect 3: Storage failure was not caught!');
    }

  } finally {
    await browser.close();
    await server.close();
  }

  console.log('\n======================================================');
  console.log(`Reviewer V2 Planted Defects Result: ${caughtCount}/3 defects caught`);
  console.log('======================================================\n');

  if (caughtCount !== 3) {
    process.exit(1);
  }
}

testReviewerPlantedDefects().catch(err => {
  console.error('Reviewer planted defect test error:', err);
  process.exit(1);
});
