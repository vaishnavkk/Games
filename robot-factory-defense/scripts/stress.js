import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'vite';
import puppeteer from 'puppeteer-core';
import { launchOptions } from './chrome.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

export async function runStressTest(options = {}) {
  const enemyCount = options.enemies || 150;
  const projectileCount = options.projectiles || 50;
  const sampleFrames = options.frames || 200;
  const cpuThrottleRate = options.throttle || 4;
  const verbose = options.verbose ?? true;

  if (verbose) {
    console.log(`Starting Robot Factory Defense stress test...`);
    console.log(`Configuration: ${enemyCount} enemies, ${projectileCount} projectiles, ${cpuThrottleRate}x CPU throttle, ${sampleFrames} sample frames`);
  }

  // 1. Start Vite server
  const server = await createServer({
    root: projectRoot,
    server: { port: 0 }
  });
  await server.listen();
  const port = server.httpServer.address().port;
  const baseUrl = `http://localhost:${port}/`;

  // 2. Launch Puppeteer
  const browser = await puppeteer.launch(launchOptions({
    headless: true
  }));

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });

    // Enable CDP 4x CPU throttling
    const client = await page.createCDPSession();
    await client.send('Emulation.setCPUThrottlingRate', { rate: cpuThrottleRate });
    if (verbose) console.log(`[stress] CDP 4x CPU throttling engaged.`);

    await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });

    // Ensure __rfd is ready
    await page.waitForFunction(() => typeof window.__rfd !== 'undefined', { timeout: 5000 });

    // Click play if title screen is present
    await page.evaluate(() => {
      const btnPlay = document.getElementById('btnPlay') || document.querySelector('[data-testid="btn-play"]');
      if (btnPlay) btnPlay.click();
    });

    // Inject 150 enemies and 50 projectiles into simulation
    if (verbose) console.log(`[stress] Populating state with ${enemyCount} enemies and ${projectileCount} projectiles...`);

    const setupResult = await page.evaluate((targetEnemies, targetProjectiles) => {
      const state = window.__rfd.state;
      if (!state) return { success: false, error: 'No state object found on window.__rfd' };

      const enemyTypes = ['glitchbot', 'rust_walker', 'spark_drone', 'crusher_tank'];

      // Populate enemies along track
      state.enemies = [];
      for (let i = 0; i < targetEnemies; i++) {
        const type = enemyTypes[i % enemyTypes.length];
        const dist = (i / targetEnemies) * 35; // distributed along the 39-cell path
        state.enemies.push({
          id: `stress_enemy_${i + 1}`,
          type,
          hp: 80,
          maxHp: 80,
          speed: 1.5,
          distance: dist,
          armour: type === 'crusher_tank' ? 6 : (type === 'rust_walker' ? 2 : 0),
          scrapReward: 10,
          isBoss: i === targetEnemies - 1,
          slowTimer: i % 3 === 0 ? 1.5 : 0
        });
      }

      // Populate projectiles
      state.projectiles = [];
      for (let j = 0; j < targetProjectiles; j++) {
        state.projectiles.push({
          id: `stress_proj_${j + 1}`,
          type: j % 2 === 0 ? 'pulse' : 'rocket',
          x: (j % 16) * 48 + 24,
          y: (j % 9) * 48 + 24,
          targetX: (j % 16) * 48 + 48,
          targetY: (j % 9) * 48 + 48,
          progress: (j / targetProjectiles),
          speed: 8
        });
      }

      state.waveState = 'active';
      state.speed = 2; // Run at 2x to test peak simulation load

      return {
        success: true,
        enemies: state.enemies.length,
        projectiles: state.projectiles.length
      };
    }, enemyCount, projectileCount);

    if (!setupResult.success) {
      throw new Error(`Failed to initialize stress state: ${setupResult.error}`);
    }

    if (verbose) console.log(`[stress] Active entities: ${setupResult.enemies} enemies, ${setupResult.projectiles} projectiles.`);
    if (verbose) console.log(`[stress] Measuring ${sampleFrames} frames under 4x CPU throttle...`);

    // Measure frame durations
    const metrics = await page.evaluate(async (framesToMeasure) => {
      return new Promise((resolve) => {
        const durations = [];
        let framesCollected = 0;

        function measureFrame() {
          const t0 = performance.now();

          // Step simulation tick
          if (window.__rfd && window.__rfd.step && window.__rfd.state) {
            window.__rfd.step(window.__rfd.state, 16.666);
            // Snapshot
            if (window.__rfd.snapshot) {
              window.__rfd.snapshot();
            }
          }

          const t1 = performance.now();
          const frameDuration = t1 - t0;
          durations.push(frameDuration);
          framesCollected++;

          if (framesCollected < framesToMeasure) {
            requestAnimationFrame(measureFrame);
          } else {
            resolve(durations);
          }
        }

        requestAnimationFrame(measureFrame);
      });
    }, sampleFrames);

    // Calculate percentiles
    metrics.sort((a, b) => a - b);
    const sum = metrics.reduce((acc, v) => acc + v, 0);
    const mean = sum / metrics.length;
    const median = metrics[Math.floor(metrics.length * 0.50)];
    const p90 = metrics[Math.floor(metrics.length * 0.90)];
    const p95 = metrics[Math.floor(metrics.length * 0.95)];
    const p99 = metrics[Math.floor(metrics.length * 0.99)];
    const max = metrics[metrics.length - 1];
    const min = metrics[0];

    const fpsEquivalent = 1000 / (p95 > 0 ? p95 : 16.66);

    if (verbose) {
      console.log(`\n======================================================`);
      console.log(`[stress] PERFORMANCE & STRESS RESULTS (4x CPU THROTTLE):`);
      console.log(`- Frames Sampled: ${metrics.length}`);
      console.log(`- Min Frame Time: ${min.toFixed(2)} ms`);
      console.log(`- Mean Frame Time: ${mean.toFixed(2)} ms`);
      console.log(`- Median (p50): ${median.toFixed(2)} ms`);
      console.log(`- 90th Percentile (p90): ${p90.toFixed(2)} ms`);
      console.log(`- 95th Percentile (p95): ${p95.toFixed(2)} ms (Gate threshold <= 20.00 ms)`);
      console.log(`- 99th Percentile (p99): ${p99.toFixed(2)} ms`);
      console.log(`- Max Frame Time: ${max.toFixed(2)} ms`);
      console.log(`- Est. Processing Throughput: ~${Math.round(fpsEquivalent)} ticks/sec under throttle`);
      console.log(`======================================================\n`);
    }

    const passed = p95 <= 20.0;
    if (!passed) {
      console.error(`[stress] GATE FAILED: p95 frame processing duration (${p95.toFixed(2)} ms) exceeds 20.00 ms budget!`);
      return { success: false, p95, mean, max };
    }

    if (verbose) {
      console.log(`[stress] GATE PASSED: p95 (${p95.toFixed(2)} ms) <= 20.00 ms!`);
    }

    return { success: true, p95, mean, max };

  } finally {
    await browser.close();
    await server.close();
  }
}

// Standalone execution
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  runStressTest()
    .then(res => {
      process.exit(res.success ? 0 : 1);
    })
    .catch(err => {
      console.error('[stress] Fatal execution error:', err);
      process.exit(1);
    });
}
