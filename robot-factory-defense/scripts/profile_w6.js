import path from 'path';
import { fileURLToPath } from 'url';
import { preview } from 'vite';
import puppeteer from 'puppeteer-core';
import { launchOptions } from './chrome.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

async function main() {
  const server = await preview({ root: projectRoot, preview: { port: 4176, strictPort: false } });
  const baseUrl = server.resolvedUrls?.local?.[0] || 'http://localhost:4176/';
  const browser = await puppeteer.launch(launchOptions({ headless: true }));

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof window.__rfd !== 'undefined', { timeout: 5000 });
    const btnPlay = await page.$('#btnPlay');
    if (btnPlay) await btnPlay.click();

    await page.evaluate(() => {
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
      s.wave = 5;
      s.waveState = 'idle';
      rfd.startWave();
      rfd.setSpeed(2);
    });

    const cdp = await page.createCDPSession();
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await cdp.send('Profiler.enable');
    await cdp.send('Profiler.setSamplingInterval', { interval: 100 });
    await cdp.send('Profiler.start');

    const frames = await page.evaluate(() => new Promise((resolve) => {
      let count = 0;
      function tick() {
        count++;
        if (count >= 180) resolve(count);
        else requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    }));

    const { profile } = await cdp.send('Profiler.stop');
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });

    // Compute self time per node using hitCount * sampling interval (or timeDeltas)
    const nodeMap = new Map();
    for (const n of profile.nodes) {
      nodeMap.set(n.id, n);
    }
    const selfUs = new Map();
    if (Array.isArray(profile.samples) && Array.isArray(profile.timeDeltas)) {
      for (let i = 0; i < profile.samples.length; i++) {
        const nid = profile.samples[i];
        const dtUs = profile.timeDeltas[i] || 0;
        selfUs.set(nid, (selfUs.get(nid) || 0) + dtUs);
      }
    }

    const byFn = new Map();
    for (const [nid, us] of selfUs.entries()) {
      const node = nodeMap.get(nid);
      if (!node || !node.callFrame) continue;
      const cf = node.callFrame;
      const fn = cf.functionName || '(anonymous)';
      if (fn === '(idle)' || fn === '(program)') continue;
      const file = cf.url ? cf.url.split('/').pop().split('?')[0] : 'native';
      const key = `${fn} (${file}:${cf.lineNumber + 1})`;
      byFn.set(key, (byFn.get(key) || 0) + us);
    }

    const top8 = [...byFn.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);

    console.log(`CHROME_PROFILE_W6_4XCPU (frames=${frames}, samples=${profile.samples?.length || 0}):`);
    top8.forEach(([name, us], idx) => {
      const msPerFrame = (us / 1000) / frames;
      console.log(`  ${idx + 1}. ${name}: ${(us / 1000).toFixed(2)}ms total (${msPerFrame.toFixed(3)} ms/frame)`);
    });
  } finally {
    await browser.close();
    server.httpServer?.close();
  }
}

main().catch((err) => {
  console.error('[profile_w6] Fatal:', err);
  process.exit(1);
});
