import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function runClickTestV2() {
  console.log('================================================================================');
  console.log('                   GEOTRIVIA QA: CLICK TEST V2 (60 REAL CLICKS)                 ');
  console.log('================================================================================\n');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:8080', { waitUntil: 'networkidle0' });

  // Wait for loading screen & launch expedition
  await page.waitForSelector('#startExpeditionBtn');
  await page.click('#startExpeditionBtn');
  await new Promise(r => setTimeout(r, 1200));

  // Disable auto-rotation and orbit controls for rock-solid coordinate stability during test
  await page.evaluate(() => {
    window.globe.isAutoRotating = false;
    window.globe.controls.enabled = false;
  });

  const results = [];

  // Core tester: positions target under specific screen coordinate
  async function testClickTarget(category, targetName, lat, lon, expectedName, { outerDiscRadius = 0, angleRad = 0, cameraZ = 3.0 } = {}) {
    const clickData = await page.evaluate((targetLat, targetLon, rOffset, theta, camZ) => {
      const globe = window.globe;
      globe.isAutoRotating = false;
      globe.controls.enabled = false;

      globe.camera.position.set(0, 0, camZ);
      globe.camera.lookAt(0, 0, 0);
      globe.camera.updateMatrixWorld(true);

      let screenX = 720;
      let screenY = 450;

      if (rOffset > 0) {
        screenX = Math.round(720 + rOffset * Math.cos(theta));
        screenY = Math.round(450 + rOffset * Math.sin(theta));
      }

      // Raycast through (screenX, screenY) to find hit on sphere
      const mouse = new window.THREE.Vector2(
        (screenX / window.innerWidth) * 2 - 1,
        -(screenY / window.innerHeight) * 2 + 1
      );
      const raycaster = new window.THREE.Raycaster();
      raycaster.setFromCamera(mouse, globe.camera);
      const intersects = raycaster.intersectObject(globe.earthMesh, false);
      if (intersects.length === 0) {
        return { error: 'No sphere intersection', screenX, screenY };
      }

      const hitWorld = intersects[0].point;

      // Orient target lat/lon directly under hit point
      const localTarget = globe.picker.constructor.latLonToVector3(targetLat, targetLon, 1.7);
      globe.earthMesh.quaternion.setFromUnitVectors(localTarget.clone().normalize(), hitWorld.clone().normalize());
      globe.earthMesh.updateMatrixWorld(true);

      const distFromCenter = Math.hypot(screenX - 720, screenY - 450);
      return { screenX, screenY, distFromCenter };
    }, lat, lon, outerDiscRadius, angleRad, cameraZ);

    const { screenX, screenY } = clickData;

    // Dispatch real pointer click
    await page.mouse.click(screenX, screenY);
    await new Promise(r => setTimeout(r, 200));

    // Read result from game state
    const outcome = await page.evaluate(() => {
      const game = window.game;
      const hit = game.selectedHit;
      return {
        selectedName: hit?.country?.name || null,
        selectedId: hit?.country?.id || null
      };
    });

    // Reset selection for next test
    await page.evaluate(() => {
      window.game.selectedHit = null;
      window.game.ui.hideTouchConfirm();
      window.globe.mapRenderer.resetHighlights();
    });

    const isMatch = (expectedName === null && outcome.selectedName === null) ||
      (outcome.selectedName && expectedName && outcome.selectedName.toLowerCase().includes(expectedName.toLowerCase())) ||
      (expectedName && outcome.selectedName && expectedName.toLowerCase().includes(outcome.selectedName.toLowerCase()));

    const record = {
      index: results.length + 1,
      category,
      targetName,
      screenCoords: `(${screenX}, ${screenY})`,
      latLon: `(${lat.toFixed(2)}°, ${lon.toFixed(2)}°)`,
      expected: expectedName || 'None (Ocean)',
      actual: outcome.selectedName || 'None (Ocean)',
      pass: isMatch
    };
    results.push(record);

    console.log(`[${String(record.index).padStart(2, '0')}/60] [${record.category.padEnd(12)}] Target: ${record.targetName.padEnd(26)} Screen: ${record.screenCoords.padEnd(12)} -> Actual: ${record.actual.padEnd(20)} [${record.pass ? 'PASS' : 'FAIL'}]`);
    return record;
  }

  // ── CATEGORY 1: 20 OUTER DISC CLICKS (Radius: 312 - 322px = 81% - 84% of 385px visible disc) ──
  console.log('\n--- 1. Testing 20 Outer Disc Clicks (Outer 20% of Visible Disc, High Oblique Angles) ---');
  const outerDiscTargets = [
    { name: 'Japan', lat: 36.20, lon: 138.25, exp: 'Japan' },
    { name: 'Iceland', lat: 64.96, lon: -19.02, exp: 'Iceland' },
    { name: 'Madagascar', lat: -18.76, lon: 46.86, exp: 'Madagascar' },
    { name: 'Germany', lat: 51.16, lon: 10.45, exp: 'Germany' },
    { name: 'United Kingdom', lat: 55.37, lon: -3.43, exp: 'United Kingdom' },
    { name: 'Chile', lat: -35.67, lon: -71.54, exp: 'Chile' },
    { name: 'Norway', lat: 60.47, lon: 8.46, exp: 'Norway' },
    { name: 'South Africa', lat: -30.55, lon: 22.93, exp: 'South Africa' },
    { name: 'Mexico', lat: 23.63, lon: -102.55, exp: 'Mexico' },
    { name: 'Cuba', lat: 21.52, lon: -77.78, exp: 'Cuba' },
    { name: 'Sri Lanka', lat: 7.87, lon: 80.77, exp: 'Sri Lanka' },
    { name: 'Ireland', lat: 53.41, lon: -8.24, exp: 'Ireland' },
    { name: 'Portugal', lat: 39.39, lon: -8.22, exp: 'Portugal' },
    { name: 'Turkey', lat: 38.96, lon: 35.24, exp: 'Turkey' },
    { name: 'Italy', lat: 41.87, lon: 12.56, exp: 'Italy' },
    { name: 'Spain', lat: 40.46, lon: -3.74, exp: 'Spain' },
    { name: 'Argentina', lat: -38.41, lon: -63.61, exp: 'Argentina' },
    { name: 'Greece', lat: 39.07, lon: 21.82, exp: 'Greece' },
    { name: 'Panama', lat: 8.53, lon: -80.78, exp: 'Panama' },
    { name: 'Papua New Guinea', lat: -6.31, lon: 143.95, exp: 'Papua New Guinea' }
  ];

  for (let i = 0; i < outerDiscTargets.length; i++) {
    const t = outerDiscTargets[i];
    // Distribute across the unobstructed free arc of the globe (angles from -0.35 to 3.45 rad, avoiding top clue bar)
    const angleRad = -0.35 + (i / (outerDiscTargets.length - 1)) * 3.8;
    const rOffset = 314 + (i % 3) * 4; // 314, 318, 322px (all squarely within 308 - 370px outer 20% band)
    await testClickTarget('Outer Disc', t.name, t.lat, t.lon, t.exp, { outerDiscRadius: rOffset, angleRad, cameraZ: 2.4 });
  }

  // ── CATEGORY 2: 10 OCEAN CLICKS (5 Deep Ocean + 5 Near Coast) ──
  console.log('\n--- 2. Testing 10 Ocean Clicks (5 Deep Ocean + 5 Near Coast) ---');
  const oceanTargets = [
    // 5 Deep Ocean Clicks
    { name: 'Point Nemo (South Pacific)', lat: -48.87, lon: -123.39, exp: null },
    { name: 'Central North Atlantic', lat: 32.00, lon: -42.00, exp: null },
    { name: 'Central Indian Ocean', lat: -20.00, lon: 80.00, exp: null },
    { name: 'North Pacific Abyss', lat: 38.00, lon: 170.00, exp: null },
    { name: 'Southern Ocean Abyss', lat: -60.00, lon: 0.00, exp: null },
    // 5 Near-Coast Ocean Clicks (180-250 km offshore)
    { name: 'Off Rio de Janeiro (200km)', lat: -24.80, lon: -41.00, exp: null },
    { name: 'Off Sydney (180km)', lat: -34.20, lon: 153.50, exp: null },
    { name: 'Off Tokyo Bay (180km)', lat: 34.20, lon: 141.80, exp: null },
    { name: 'Off California (200km)', lat: 35.00, lon: -123.50, exp: null },
    { name: 'Off Cape of Good Hope (180km)', lat: -36.50, lon: 18.50, exp: null }
  ];

  for (const t of oceanTargets) {
    await testClickTarget('Ocean', t.name, t.lat, t.lon, t.exp);
  }

  // ── CATEGORY 3: 6 MICROSTATE CLICKS ──
  console.log('\n--- 3. Testing 6 Microstate Clicks (Centroid & Microstate Buffer) ---');
  const microstateTargets = [
    { name: 'Monaco', lat: 43.7384, lon: 7.4246, exp: 'Monaco', cameraZ: 2.2 },
    { name: 'Malta', lat: 35.9375, lon: 14.3754, exp: 'Malta', cameraZ: 2.2 },
    { name: 'Singapore', lat: 1.3521, lon: 103.8198, exp: 'Singapore', cameraZ: 2.2 },
    { name: 'San Marino', lat: 43.9424, lon: 12.4578, exp: 'San Marino', cameraZ: 2.1 },
    { name: 'Bahrain', lat: 26.0667, lon: 50.5577, exp: 'Bahrain', cameraZ: 2.2 },
    { name: 'Maldives', lat: 3.2028, lon: 73.2207, exp: 'Maldives', cameraZ: 2.2 }
  ];

  for (const t of microstateTargets) {
    await testClickTarget('Microstate', t.name, t.lat, t.lon, t.exp, { cameraZ: t.cameraZ });
  }

  // ── CATEGORY 4: 6 BORDER CLICKS (Crisp Discrimination Across Shared Land Borders) ──
  console.log('\n--- 4. Testing 6 Border Clicks (Precision Neighbor Discrimination) ---');
  const borderTargets = [
    // Spain vs Portugal: Badajoz (Spain) vs Elvas (Portugal)
    { name: 'Spain side of border (Badajoz)', lat: 38.8794, lon: -6.9706, exp: 'Spain', cameraZ: 2.0 },
    { name: 'Portugal side of border (Elvas)', lat: 38.8814, lon: -7.1628, exp: 'Portugal', cameraZ: 2.0 },
    // France vs Germany: Strasbourg (France) vs Kehl (Germany)
    { name: 'France side of Rhine (Strasbourg)', lat: 48.5734, lon: 7.7521, exp: 'France', cameraZ: 2.0 },
    { name: 'Germany side of Rhine (Kehl)', lat: 48.5710, lon: 7.8200, exp: 'Germany', cameraZ: 2.0 },
    // Kenya vs Tanzania: Namanga border town
    { name: 'Kenya side of Namanga', lat: -2.5300, lon: 36.7900, exp: 'Kenya', cameraZ: 2.0 },
    { name: 'Tanzania side of Namanga', lat: -2.5700, lon: 36.7900, exp: 'Tanzania', cameraZ: 2.0 }
  ];

  for (const t of borderTargets) {
    await testClickTarget('Border', t.name, t.lat, t.lon, t.exp, { cameraZ: t.cameraZ });
  }

  // ── CATEGORY 5: 18 SOVEREIGN COUNTRIES ──
  console.log('\n--- 5. Testing 18 Diverse Sovereign Countries ---');
  const additionalTargets = [
    { name: 'Brazil (Brasilia)', lat: -15.7975, lon: -47.8919, exp: 'Brazil' },
    { name: 'Australia (Canberra)', lat: -35.2809, lon: 149.1300, exp: 'Australia' },
    { name: 'Canada (Ottawa)', lat: 45.4215, lon: -75.6972, exp: 'Canada' },
    { name: 'India (New Delhi)', lat: 28.6139, lon: 77.2090, exp: 'India' },
    { name: 'Argentina (Buenos Aires)', lat: -34.6037, lon: -58.3816, exp: 'Argentina' },
    { name: 'Egypt (Cairo)', lat: 30.0444, lon: 31.2357, exp: 'Egypt' },
    { name: 'Poland (Warsaw)', lat: 52.2297, lon: 21.0122, exp: 'Poland' },
    { name: 'Thailand (Bangkok)', lat: 13.7563, lon: 100.5018, exp: 'Thailand' },
    { name: 'Morocco (Rabat)', lat: 34.0209, lon: -6.8416, exp: 'Morocco' },
    { name: 'Kenya (Nairobi)', lat: -1.2921, lon: 36.8219, exp: 'Kenya' },
    { name: 'Hungary (Budapest)', lat: 47.4979, lon: 19.0402, exp: 'Hungary' },
    { name: 'Colombia (Bogota)', lat: 4.7110, lon: -74.0721, exp: 'Colombia' },
    { name: 'Sweden (Inland)', lat: 59.30, lon: 15.20, exp: 'Sweden' },
    { name: 'Kazakhstan (Astana)', lat: 51.1694, lon: 71.4491, exp: 'Kazakhstan' },
    { name: 'Vietnam (Hanoi)', lat: 21.0285, lon: 105.8542, exp: 'Vietnam' },
    { name: 'Ghana (Accra)', lat: 5.6037, lon: -0.1870, exp: 'Ghana' },
    { name: 'Peru (Lima)', lat: -12.0464, lon: -77.0428, exp: 'Peru' },
    { name: 'South Korea (Seoul)', lat: 37.5665, lon: 126.9780, exp: 'South Korea' }
  ];

  for (const t of additionalTargets) {
    await testClickTarget('Sovereign', t.name, t.lat, t.lon, t.exp);
  }

  await browser.close();

  const total = results.length;
  const passed = results.filter(r => r.pass).length;
  const passRate = ((passed / total) * 100).toFixed(1);

  console.log('\n================================================================================');
  console.log(`CLICK TEST V2 SUMMARY: ${passed}/${total} PASSED (${passRate}%)`);
  console.log('================================================================================');

  const outPath = path.resolve('..', 'report', 'part3', 'click_test_v2_results.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify({ total, passed, passRate, results }, null, 2));
  console.log(`Saved click test results to: ${outPath}`);

  if (passed < total) {
    process.exitCode = 1;
  }
}

runClickTestV2().catch(err => {
  console.error('Fatal Click Test error:', err);
  process.exit(1);
});
