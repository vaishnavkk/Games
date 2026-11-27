import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { preview } from 'vite';
import puppeteer from 'puppeteer-core';
import { launchOptions } from './chrome.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const outDir = path.join(projectRoot, 'docs', 'visual-qa', 'motion');

function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

function summarize(samples) {
  const s = [...samples].sort((a, b) => a - b);
  return {
    p50: percentile(s, 50),
    p95: percentile(s, 95),
    p99: percentile(s, 99),
    max: s[s.length - 1] || 0,
    over33: samples.filter(v => v > 33).length
  };
}

async function setupW6Fight(page, speed = 1) {
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(page.__baseUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof window.__rfd !== 'undefined', { timeout: 5000 });
  const btnPlay = await page.$('#btnPlay');
  if (btnPlay) await btnPlay.click();

  await page.evaluate((spd) => {
    const rfd = window.__rfd;
    rfd.ui?.dismissTips?.();
    const s = rfd.state;
    s.scrap = 3000;
    s.circuits = 80;
    s.unlockedTowers = ['pulse', 'coolant', 'arc', 'rocket', 'fabricator'];
    const pads = s.config.map.buildableCells;
    const types = ['pulse', 'coolant', 'arc', 'rocket', 'pulse', 'coolant', 'arc', 'rocket'];
    for (let i = 0; i < types.length && i < pads.length; i++) {
      rfd.place(pads[i], types[i]);
    }
    s.wave = 5; // startWave() advances to Wave 6
    s.waveState = 'idle';
    rfd.startWave();
    rfd.setSpeed(spd);
  }, speed);
}

async function measureFrames(page, count = 180) {
  return page.evaluate((n) => new Promise((resolve) => {
    const times = [];
    let last = performance.now();
    function tick(now) {
      times.push(now - last);
      last = now;
      if (times.length >= n) {
        resolve(times.slice(1)); // drop initial transition frame
      } else {
        requestAnimationFrame(tick);
      }
    }
    requestAnimationFrame(tick);
  }), count + 1);
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  const server = await preview({ root: projectRoot, preview: { port: 4175, strictPort: false } });
  const baseUrl = server.resolvedUrls?.local?.[0] || 'http://localhost:4175/';
  const browser = await puppeteer.launch(launchOptions({ headless: true }));

  try {
    const page = await browser.newPage();
    page.__baseUrl = baseUrl;

    // 1d. Normal speed 1x & 2x over W6 fight
    await setupW6Fight(page, 1);
    const frames1x = await measureFrames(page, 180);
    await setupW6Fight(page, 2);
    const frames2x = await measureFrames(page, 180);

    // 1d. 4x CPU throttle 1x & 2x over W6 fight
    const cdp = await page.createCDPSession();
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await setupW6Fight(page, 1);
    const frames1xThrottled = await measureFrames(page, 180);
    await setupW6Fight(page, 2);
    const frames2xThrottled = await measureFrames(page, 180);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });

    fs.writeFileSync(path.join(outDir, 'frame_times_1x.csv'), 'frame,normal_ms,throttled4x_ms\n' + frames1x.map((v, i) => `${i + 1},${v.toFixed(3)},${(frames1xThrottled[i] ?? 0).toFixed(3)}`).join('\n'));
    fs.writeFileSync(path.join(outDir, 'frame_times_2x.csv'), 'frame,normal_ms,throttled4x_ms\n' + frames2x.map((v, i) => `${i + 1},${v.toFixed(3)},${(frames2xThrottled[i] ?? 0).toFixed(3)}`).join('\n'));

    const s1 = summarize(frames1x);
    const s2 = summarize(frames2x);
    const s1t = summarize(frames1xThrottled);
    const s2t = summarize(frames2xThrottled);
    console.log(`W6_1X_NORMAL: p50=${s1.p50.toFixed(2)} p95=${s1.p95.toFixed(2)} p99=${s1.p99.toFixed(2)} max=${s1.max.toFixed(2)} over33=${s1.over33}`);
    console.log(`W6_2X_NORMAL: p50=${s2.p50.toFixed(2)} p95=${s2.p95.toFixed(2)} p99=${s2.p99.toFixed(2)} max=${s2.max.toFixed(2)} over33=${s2.over33}`);
    console.log(`W6_1X_4XCPU: p50=${s1t.p50.toFixed(2)} p95=${s1t.p95.toFixed(2)} p99=${s1t.p99.toFixed(2)} max=${s1t.max.toFixed(2)} over33=${s1t.over33}`);
    console.log(`W6_2X_4XCPU: p50=${s2t.p50.toFixed(2)} p95=${s2t.p95.toFixed(2)} p99=${s2t.p99.toFixed(2)} max=${s2t.max.toFixed(2)} over33=${s2t.over33}`);

    // 1e. Motion test: track one Glitchbot on straight segment (x: 1..10, y: 2.5)
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof window.__rfd !== 'undefined', { timeout: 5000 });
    const play2 = await page.$('#btnPlay');
    if (play2) await play2.click();

    const motionStats = await page.evaluate(() => new Promise((resolve) => {
      const rfd = window.__rfd;
      const s = rfd.state;
      s.towers = [];
      s.enemies = [];
      s.wave = 0;
      s.waveState = 'idle';
      rfd.startWave();
      s.spawnQueue = [];
      s.enemies.push({
        id: 'track_glitchbot', type: 'glitchbot', name: 'Glitchbot',
        hp: 1000, maxHp: 1000, speed: 2.0, armour: 0, scrap: 5, leakDamage: 1,
        isBoss: false, distance: 1.0, x: 1.5, y: 2.5, slowTimer: 0, slowRatio: 0, isDead: false
      });

      const steps = [];
      let prevX = null;
      let frames = 0;
      function tick() {
        const e = s.enemies[0];
        if (!e || frames >= 60 || e.distance >= 9.0) {
          const sorted = [...steps].sort((a, b) => a - b);
          const median = sorted[Math.floor(sorted.length / 2)] || 1;
          const maxStep = sorted[sorted.length - 1] || 0;
          resolve({ count: steps.length, median, maxStep, ratio: maxStep / median });
          return;
        }
        // Rendered interpolated x in cells matching renderer lerp(prev, curr, alpha)
        const alpha = (s.accumulatorMs || 0) / (1000 / 60);
        const renderX = e.x - (1 - alpha) * (e.speed / 60);
        if (prevX !== null) {
          const dx = renderX - prevX;
          if (dx > 0) steps.push(dx);
        }
        prevX = renderX;
        frames++;
        requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    }));
    console.log(`MOTION_TEST: samples=${motionStats.count} median=${motionStats.median.toFixed(4)} max=${motionStats.maxStep.toFixed(4)} ratio=${motionStats.ratio.toFixed(3)}`);

    // 3. Theme screenshots (neon, daylight, terminal) at 1440x900 and 844x390
    for (const themeId of ['neon', 'daylight', 'terminal']) {
      for (const vp of [{ name: '1440', w: 1440, h: 900 }, { name: '844x390', w: 844, h: 390 }]) {
        await page.setViewport({ width: vp.w, height: vp.h });
        await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => typeof window.__rfd !== 'undefined', { timeout: 5000 });
        const bp = await page.$('#btnPlay');
        if (bp) await bp.click();

        await page.evaluate((t) => {
          document.documentElement.setAttribute('data-theme', t);
          const rfd = window.__rfd;
          rfd.renderer?.setTheme?.(t);
          rfd.ui?.dismissTips?.();
          const s = rfd.state;
          s.paused = true;
          s.scrap = 450;
          s.circuits = 60;
          s.wave = 6;
          s.waveState = 'active';
          s.unlockedTowers = ['pulse', 'coolant', 'arc', 'rocket', 'fabricator'];
          const pads = s.config.map.buildableCells;
          rfd.place(pads[0], 'pulse');
          rfd.place(pads[1], 'coolant');
          rfd.place(pads[2], 'arc');
          rfd.place(pads[3], 'rocket');
          rfd.place(pads[4], 'fabricator');
          s.enemies = [
            { id: 'e1', type: 'glitchbot', hp: 30, maxHp: 30, distance: 2.0, x: 2.5, y: 2.5, speed: 1, slowTimer: 0 },
            { id: 'e2', type: 'rust_walker', hp: 50, maxHp: 60, distance: 3.5, x: 4.0, y: 2.5, speed: 0.8, slowTimer: 1.5 },
            { id: 'e3', type: 'spark_drone', hp: 40, maxHp: 40, distance: 5.0, x: 5.5, y: 2.5, speed: 1.4, slowTimer: 0 },
            { id: 'e4', type: 'crusher_tank', hp: 160, maxHp: 200, distance: 6.5, x: 7.0, y: 2.5, speed: 0.4, slowTimer: 0 }
          ];
          rfd.drainEvents();
          rfd.ui?.renderHUD?.(rfd.snapshot());
        }, themeId);
        await new Promise(r => setTimeout(r, 80));
        await page.screenshot({ path: path.join(outDir, `theme_${themeId}_${vp.name}.png`) });
      }
    }
    console.log('[motion_audit] Theme screenshots saved to docs/visual-qa/motion/');
  } finally {
    await browser.close();
    server.httpServer?.close();
  }
}

main().catch((err) => {
  console.error('[motion_audit] Fatal:', err);
  process.exit(1);
});
