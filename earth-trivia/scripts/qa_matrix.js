import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function runMatrixTest() {
  console.log('================================================================================');
  console.log('         GEOTRIVIA QA: MATRIX TEST (3 MODES × 3 TIERS × 2 VIEWPORTS)            ');
  console.log('================================================================================\n');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const modes = ['clue', 'name', 'flag'];
  const tiers = ['easy', 'medium', 'hard'];
  const viewports = [
    { name: 'Desktop', width: 1440, height: 900 },
    { name: 'Mobile', width: 390, height: 844 }
  ];

  const matrixResults = [];

  for (const vp of viewports) {
    console.log(`\n--- Testing Viewport: ${vp.name} (${vp.width}x${vp.height}) ---`);

    const page = await browser.newPage();
    await page.setViewport({ width: vp.width, height: vp.height });
    await page.goto('http://localhost:8080', { waitUntil: 'networkidle0' });

    // Wait for initial asset loading overlay to disappear
    await page.waitForFunction(() => {
      const loader = document.getElementById('loadingScreen');
      return !loader || loader.style.display === 'none' || loader.style.opacity === '0';
    });
    await new Promise(r => setTimeout(r, 600));

    // Disable auto-rotation
    await page.evaluate(() => {
      window.globe.isAutoRotating = false;
      window.globe.controls.enabled = false;
    });

    for (const mode of modes) {
      for (const tier of tiers) {
        // Start expedition with this mode & tier
        await page.evaluate((m, t) => {
          window.game.startExpedition({ mode: m, tier: t, rounds: 10 });
        }, mode, tier);

        await new Promise(r => setTimeout(r, 250));

        // Evaluate state
        const state = await page.evaluate((expectedTier) => {
          const game = window.game;
          const cluePrompt = document.getElementById('cluePrompt')?.textContent || '';
          const clueText = document.getElementById('clueText')?.innerHTML || '';
          const clueProgression = document.getElementById('clueProgression')?.style.display !== 'none';
          const nextClueBtn = document.getElementById('nextClueBtn')?.style.display !== 'none';
          const pool = game.getTierPool(expectedTier);

          return {
            mode: game.mode,
            tier: game.tier,
            round: game.round,
            phase: game.phase,
            poolSize: pool.length,
            targetCountry: game.currentCountry?.name || '',
            cluePrompt,
            clueTextPreview: clueText.replace(/<[^>]+>/g, '').trim().slice(0, 40),
            hasFlagIcon: clueText.includes('fi fi-') || clueText.includes('svg') || clueText.includes('target-flag'),
            clueProgression,
            nextClueBtn
          };
        }, tier);

        // Verify pool size constraints
        const poolExpected = tier === 'easy' ? 42 : (tier === 'medium' ? 100 : 195);
        const poolOk = state.poolSize === poolExpected;

        // Verify mode prompt formatting
        let modePromptOk = false;
        if (mode === 'clue') {
          modePromptOk = state.cluePrompt.includes('Click nation') && state.clueProgression;
        } else if (mode === 'name') {
          modePromptOk = state.cluePrompt.includes('Locate') && state.clueTextPreview.length > 0;
        } else if (mode === 'flag') {
          modePromptOk = state.cluePrompt.includes('flag') && state.hasFlagIcon;
        }

        const hasTarget = state.targetCountry.length > 0;
        const pass = state.mode === mode && state.tier === tier && poolOk && modePromptOk && hasTarget;

        const record = {
          viewport: vp.name,
          mode,
          tier,
          poolSize: state.poolSize,
          poolExpected,
          target: state.targetCountry,
          prompt: state.cluePrompt,
          preview: state.clueTextPreview,
          pass
        };
        matrixResults.push(record);

        console.log(`[${vp.name.padEnd(7)}] Mode: ${mode.padEnd(5)} | Tier: ${tier.padEnd(6)} | Pool: ${String(state.poolSize).padStart(3)} (Exp: ${poolExpected}) | Target: ${(state.targetCountry || '').padEnd(18)} [${pass ? 'PASS' : 'FAIL'}]`);
      }
    }

    await page.close();
  }

  await browser.close();

  const total = matrixResults.length;
  const passed = matrixResults.filter(r => r.pass).length;
  const passRate = ((passed / total) * 100).toFixed(1);

  console.log('\n================================================================================');
  console.log(`MATRIX TEST BENCHMARK SUMMARY: ${passed}/${total} PASSED (${passRate}%)`);
  console.log('================================================================================');

  const outPath = path.resolve('..', 'report', 'part3', 'matrix_test_results.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify({ matrixResults, total, passed, passRate }, null, 2));
  console.log(`Saved matrix test results to: ${outPath}`);

  if (passed < total) {
    process.exitCode = 1;
  }
}

runMatrixTest().catch(err => {
  console.error('Fatal Matrix Test error:', err);
  process.exit(1);
});
