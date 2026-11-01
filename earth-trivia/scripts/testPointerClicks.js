import puppeteer from 'puppeteer-core';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function runClickAudit() {
  console.log('================================================================================');
  console.log('         GEOTRIVIA STEP 0.d - REAL POINTER SCREEN COORDINATE CLICK TESTS        ');
  console.log('================================================================================\n');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  page.on('console', msg => console.log(`[Browser Console] ${msg.text()}`));
  page.on('pageerror', err => console.error(`[Browser PageError] ${err.message}`));

  // Navigate to local GeoTrivia server
  await page.goto('http://localhost:8080/index.html', { waitUntil: 'networkidle0' });

  // Wait for globe to initialize
  await page.waitForFunction(() => {
    const g = window.game || (window.__geotrivia && window.__geotrivia.game);
    return g && g.globe && g.globe.earthMesh;
  }, { timeout: 10000 });
  await new Promise(r => setTimeout(r, 800));

  // Ensure window.game is set
  await page.evaluate(() => {
    if (!window.game && window.__geotrivia) {
      window.game = window.__geotrivia.game;
    }
  });

  // Dismiss start screen and start game
  await page.evaluate(() => {
    const playBtn = document.querySelector('#startExpeditionBtn') || document.querySelector('#startBtn');
    if (playBtn) playBtn.click();
    const modal = document.querySelector('#startScreenModal');
    if (modal) modal.classList.add('hidden');
  });
  // Wait for initial overview camera flight to complete (800ms animation)
  await new Promise(r => setTimeout(r, 1200));

  await page.evaluate(() => {
    if (window.game) {
      window.game.isAnswering = true;
      window.game.globe.isAutoRotating = false;
      window.game.globe.flight.isFlying = false;
      window.game.globe.controls.enabled = false;
    }
  });

  const results = [];

  // Helper function to orient globe, calculate screen coordinates and perform click
  async function testPoint(name, lat, lon, expectedName, isOcean = false) {
    // 1. Orient globe to randomized orientation facing (lat, lon) and compute exact screen coordinates
    const clickData = await page.evaluate(({ lat, lon }) => {
      const globe = window.game.globe;
      const canvas = globe.renderer.domElement;
      const rect = canvas.getBoundingClientRect();

      // Convert lat/lon to sphere local vector
      const phi = (90 - lat) * (Math.PI / 180);
      const theta = (lon + 180) * (Math.PI / 180);
      const radius = 1.7;

      const lx = -radius * Math.cos(theta) * Math.sin(phi);
      const ly = radius * Math.cos(phi);
      const lz = radius * Math.sin(theta) * Math.sin(phi);

      const localVec = new globe.camera.position.constructor(lx, ly, lz);

      // Base orientation: target country points at camera (+Z)
      globe.earthMesh.quaternion.setFromUnitVectors(localVec.clone().normalize(), new globe.camera.position.constructor(0, 0, 1));

      // Random roll orientation around camera axis (0 to 360 deg)
      const randomRoll = Math.random() * Math.PI * 2;
      const rollQuat = new globe.earthMesh.quaternion.constructor();
      rollQuat.setFromAxisAngle(new globe.camera.position.constructor(0, 0, 1), randomRoll);
      globe.earthMesh.quaternion.premultiply(rollQuat);

      // Stable camera distance
      globe.camera.position.set(0, 0, 3.8);
      globe.camera.lookAt(0, 0, 0);
      globe.earthMesh.updateMatrixWorld(true);

      // World point & projection to screen
      const worldVec = localVec.clone().applyMatrix4(globe.earthMesh.matrixWorld);
      const proj = worldVec.clone().project(globe.camera);

      const screenX = Math.round((proj.x * 0.5 + 0.5) * rect.width + rect.left);
      const screenY = Math.round((-proj.y * 0.5 + 0.5) * rect.height + rect.top);

      const euler = new globe.earthMesh.rotation.constructor();
      euler.setFromQuaternion(globe.earthMesh.quaternion);

      return {
        rotX: euler.x.toFixed(3),
        rotY: euler.y.toFixed(3),
        roll: (randomRoll * 180 / Math.PI).toFixed(0) + '°',
        screenX,
        screenY,
        isVisible: proj.z < 1.0
      };
    }, { lat, lon });

    if (!clickData.isVisible) {
      console.warn(`Warning: ${name} projected behind camera`);
    }

    // 2. Dispatch REAL OS-level mouse pointer click via Puppeteer
    await page.mouse.click(clickData.screenX, clickData.screenY);
    await new Promise(r => setTimeout(r, 80));

    // 3. Retrieve game's selected country
    const actual = await page.evaluate(() => {
      const hit = window.game.selectedHit;
      if (!hit || !hit.country) return 'None';
      return hit.country.name;
    });

    const passed = isOcean 
      ? (actual === 'None') 
      : (actual.toLowerCase() === expectedName.toLowerCase());

    results.push({
      target: name,
      coords: `[${lat.toFixed(2)}, ${lon.toFixed(2)}]`,
      screen: `(${clickData.screenX}, ${clickData.screenY})`,
      orientation: `rotX:${clickData.rotX}, rotY:${clickData.rotY}, roll:${clickData.roll}`,
      expected: expectedName,
      actual: actual,
      passed: passed
    });

    // Reset selection for next test
    await page.evaluate(() => {
      window.game.selectedHit = null;
      window.game.ui.hideTouchConfirm();
      window.game.globe.mapRenderer.resetHighlights();
    });
  }

  // ── TEST SET 1: 5 SPECIFIC CITIES & MICROSTATES ────────────
  console.log('>>> Running Test Set 1: Rome, Paris, Zurich, Vienna, Monaco...');
  await testPoint('Rome Centre', 41.890, 12.492, 'Italy');
  await testPoint('Paris Centre', 48.856, 2.352, 'France');
  await testPoint('Zurich Centre', 47.376, 8.541, 'Switzerland');
  await testPoint('Vienna Centre', 48.208, 16.373, 'Austria');
  await testPoint('Monaco Area', 43.738, 7.424, 'Monaco');

  // ── TEST SET 2: 6 NEAR-BORDER PAIRS ────────────────────────
  console.log('>>> Running Test Set 2: 6 Near-Border Clicks...');
  await testPoint('Spain near Portugal (Badajoz)', 38.879, -6.970, 'Spain');
  await testPoint('Portugal near Spain (Elvas)', 38.881, -7.163, 'Portugal');
  await testPoint('Rwanda near Burundi (Butare)', -2.601, 29.740, 'Rwanda');
  await testPoint('Burundi near Rwanda (Ngozi)', -2.908, 29.831, 'Burundi');
  await testPoint('Germany near France (Kehl)', 48.571, 7.810, 'Germany');
  await testPoint('France near Germany (Strasbourg)', 48.583, 7.745, 'France');

  // ── TEST SET 3: 5 OCEAN CLICKS (EXPECT NONE) ───────────────
  console.log('>>> Running Test Set 3: 5 Ocean Clicks (Expect None)...');
  await testPoint('Mid-Pacific Ocean (Equator)', 0.00, -145.00, 'None', true);
  await testPoint('South Pacific Ocean', -35.00, -125.00, 'None', true);
  await testPoint('Central North Atlantic', 30.00, -42.00, 'None', true);
  await testPoint('South Indian Ocean', -28.00, 80.00, 'None', true);
  await testPoint('Southern Ocean (Off Antarctica)', -58.00, -110.00, 'None', true);

  // ── TEST SET 4: 30 RANDOM DIVERSE NATIONS ──────────────────
  console.log('>>> Running Test Set 4: 30 Random Diverse Nations...');
  const diverse30 = [
    { name: 'Japan', lat: 36.20, lon: 138.25 },
    { name: 'Brazil', lat: -14.23, lon: -51.92 },
    { name: 'Kenya', lat: -0.02, lon: 37.90 },
    { name: 'Australia', lat: -25.27, lon: 133.77 },
    { name: 'Iceland', lat: 64.96, lon: -19.02 },
    { name: 'New Zealand', lat: -42.50, lon: 172.50 },
    { name: 'Canada', lat: 56.13, lon: -106.34 },
    { name: 'Argentina', lat: -38.41, lon: -63.61 },
    { name: 'South Africa', lat: -30.55, lon: 22.93 },
    { name: 'Egypt', lat: 26.82, lon: 30.80 },
    { name: 'India', lat: 20.59, lon: 78.96 },
    { name: 'Norway', lat: 60.47, lon: 8.46 },
    { name: 'Mexico', lat: 23.63, lon: -102.55 },
    { name: 'Thailand', lat: 15.87, lon: 100.99 },
    { name: 'Turkey', lat: 38.96, lon: 35.24 },
    { name: 'Chile', lat: -35.67, lon: -71.54 },
    { name: 'Fiji', lat: -17.71, lon: 178.06 },
    { name: 'Russia', lat: 61.52, lon: 105.31 },
    { name: 'Madagascar', lat: -18.76, lon: 46.86 },
    { name: 'Greece', lat: 39.07, lon: 21.82 },
    { name: 'Vietnam', lat: 14.05, lon: 108.27 },
    { name: 'Colombia', lat: 4.57, lon: -74.29 },
    { name: 'Saudi Arabia', lat: 23.88, lon: 45.07 },
    { name: 'Mongolia', lat: 46.86, lon: 103.84 },
    { name: 'Poland', lat: 51.91, lon: 19.14 },
    { name: 'Nigeria', lat: 9.08, lon: 8.67 },
    { name: 'Indonesia', lat: -0.78, lon: 113.92 },
    { name: 'Peru', lat: -9.18, lon: -75.01 },
    { name: 'Sweden', lat: 62.00, lon: 15.00 },
    { name: 'Morocco', lat: 31.79, lon: -7.09 }
  ];

  for (const c of diverse30) {
    await testPoint(c.name, c.lat, c.lon, c.name);
  }

  await browser.close();

  // Print results table
  console.log('\n================================================================================');
  console.log('                         REAL POINTER CLICK TEST RESULTS                        ');
  console.log('================================================================================\n');

  console.log('| # | Target | Lat/Lon | Globe Orientation | Screen (X,Y) | Expected | Actual | Status |');
  console.log('|---|---|---|---|---|---|---|---|');

  let passedCount = 0;
  results.forEach((r, idx) => {
    const status = r.passed ? 'PASS' : 'FAIL';
    if (r.passed) passedCount++;
    console.log(`| ${idx + 1} | ${r.target} | ${r.coords} | ${r.orientation} | ${r.screen} | ${r.expected} | ${r.actual} | ${status} |`);
  });

  console.log('\n================================================================================');
  console.log(`SUMMARY: ${passedCount} / ${results.length} PASSED (${((passedCount / results.length) * 100).toFixed(1)}% Accuracy)`);
  console.log('================================================================================');

  // Save to JSON for report integration
  fs.writeFileSync(
    path.join(__dirname, 'step0_click_results.json'),
    JSON.stringify({ total: results.length, passed: passedCount, results }, null, 2),
    'utf8'
  );
}

runClickAudit().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
