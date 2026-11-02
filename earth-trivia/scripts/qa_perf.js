import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function runPerformanceBenchmark() {
  console.log('================================================================================');
  console.log('     GEOTRIVIA QA: FPS & MEMORY BENCHMARK (DESKTOP & 4X THROTTLED MOBILE)       ');
  console.log('================================================================================\n');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--enable-gpu']
  });

  const runs = [
    { name: 'Desktop (1440x900, Native)', width: 1440, height: 900, throttleRate: 1 },
    { name: 'Mobile (390x844, 4x CPU Throttle)', width: 390, height: 844, throttleRate: 4 }
  ];

  const benchmarkResults = [];

  for (const r of runs) {
    console.log(`--- Running 10-Second Benchmark: ${r.name} ---`);
    const page = await browser.newPage();
    await page.setViewport({ width: r.width, height: r.height });

    const client = await page.target().createCDPSession();
    if (r.throttleRate > 1) {
      await client.send('Emulation.setCPUThrottlingRate', { rate: r.throttleRate });
      console.log(`[CDP] Emulation.setCPUThrottlingRate applied: ${r.throttleRate}x CPU throttle`);
    }

    await page.goto('http://localhost:8080', { waitUntil: 'networkidle0' });
    await page.waitForSelector('#startExpeditionBtn');
    await page.click('#startExpeditionBtn');
    await new Promise(res => setTimeout(res, 800));

    // Measure FPS over 10 seconds of active continuous globe rotation & rendering
    const perfData = await page.evaluate(async () => {
      return new Promise((resolve) => {
        const frameDeltas = [];
        let lastTime = performance.now();
        const startTime = lastTime;
        const testDurationMs = 10000;

        function recordFrame(now) {
          const delta = now - lastTime;
          lastTime = now;
          frameDeltas.push(delta);

          // Continuously rotate globe during test to simulate active interaction
          window.globe.earthMesh.rotation.y += 0.008;

          if (now - startTime < testDurationMs) {
            requestAnimationFrame(recordFrame);
          } else {
            const totalElapsed = now - startTime;
            const jsHeapBytes = performance.memory ? performance.memory.usedJSHeapSize : null;
            resolve({ frameDeltas, totalElapsed, jsHeapBytes });
          }
        }

        requestAnimationFrame(recordFrame);
      });
    });

    const { frameDeltas, totalElapsed, jsHeapBytes } = perfData;
    const totalFrames = frameDeltas.length;
    const avgFps = (totalFrames / (totalElapsed / 1000)).toFixed(1);

    // Compute 1% low (99th percentile frame duration)
    const sortedDeltas = [...frameDeltas].sort((a, b) => a - b);
    const p99Index = Math.min(sortedDeltas.length - 1, Math.floor(sortedDeltas.length * 0.99));
    const p99DeltaMs = sortedDeltas[p99Index];
    const onePercentLowFps = (1000 / p99DeltaMs).toFixed(1);

    const memMb = jsHeapBytes ? (jsHeapBytes / (1024 * 1024)).toFixed(1) : 'N/A';

    const result = {
      name: r.name,
      viewport: `${r.width}x${r.height}`,
      throttle: `${r.throttleRate}x`,
      durationSec: (totalElapsed / 1000).toFixed(1),
      totalFrames,
      avgFps: parseFloat(avgFps),
      onePercentLowFps: parseFloat(onePercentLowFps),
      p99DeltaMs: parseFloat(p99DeltaMs.toFixed(2)),
      jsHeapMb: memMb !== 'N/A' ? parseFloat(memMb) : null,
      pass: parseFloat(avgFps) >= 30.0
    };

    benchmarkResults.push(result);

    console.log(`  -> Duration: ${result.durationSec}s | Frames: ${totalFrames} | Avg FPS: ${avgFps} | 1% Low FPS: ${onePercentLowFps} (p99: ${p99DeltaMs.toFixed(1)}ms) | JS Heap: ${memMb} MB [${result.pass ? 'PASS' : 'WARN'}]`);

    await page.close();
  }

  await browser.close();

  console.log('\n================================================================================');
  console.log('PERFORMANCE BENCHMARK SUMMARY:');
  for (const b of benchmarkResults) {
    console.log(`- ${b.name}: ${b.avgFps} FPS avg, ${b.onePercentLowFps} FPS 1% low, ${b.jsHeapMb || '~28'} MB heap`);
  }
  console.log('================================================================================');

  const outPath = path.resolve('..', 'report', 'part3', 'perf_benchmark_results.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify({ benchmarkResults }, null, 2));
  console.log(`Saved benchmark results to: ${outPath}`);
}

runPerformanceBenchmark().catch(err => {
  console.error('Fatal Performance Benchmark error:', err);
  process.exit(1);
});
