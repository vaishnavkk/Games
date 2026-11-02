import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const csvOutputPath = path.resolve(__dirname, '../../report/part4/click_test_v3.csv');

console.log('================================================================================');
console.log('            GEOTRIVIA QA: CLICK TEST V3 (60 REAL POINTER CLICKS)                ');
console.log('================================================================================\n');

async function runClickTestV3() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:8080', { waitUntil: 'networkidle0' });

  // Launch expedition via evaluate click to reliably trigger game
  await page.waitForSelector('#startExpeditionBtn');
  await page.evaluate(() => document.getElementById('startExpeditionBtn').click());
  await new Promise(r => setTimeout(r, 1200));

  // Disable auto-rotation, flight tweens, and orbit controls for rock-solid click testing
  await page.evaluate(() => {
    window.globe.isAutoRotating = false;
    window.globe.lastInteractionTime = performance.now() + 10000000;
    window.globe.controls.enabled = false;
    window.globe.flight.isFlying = false;
  });

  const records = [];

  async function testClick(category, name, lat, lon, expectedName, { discRadiusPct = 0, angleRad = 0, cameraZ = 4.4 } = {}) {
    // 1. Prepare game state and orient sphere
    const data = await page.evaluate((tLat, tLon, rPct, theta, camZ) => {
      const globe = window.globe;
      const game = window.game;

      // Ensure game is actively accepting answers
      game.isAnswering = true;
      game.phase = 'question';
      game.selectedHit = null;
      globe.flight.isFlying = false;
      globe.isAutoRotating = false;
      globe.lastInteractionTime = performance.now() + 10000000;
      globe.controls.enabled = false;

      globe.camera.position.set(0, 0, camZ);
      globe.camera.lookAt(0, 0, 0);
      globe.camera.updateMatrixWorld(true);

      const sphereRadius = 1.7;
      const vFovRad = (globe.camera.fov * Math.PI) / 180;
      const visibleDiscRadius = (sphereRadius / (Math.tan(vFovRad / 2) * camZ)) * (window.innerHeight / 2);

      let screenX = 720;
      let screenY = 450;
      let distPct = 0;

      if (rPct > 0) {
        const offsetPx = (rPct / 100) * visibleDiscRadius;
        screenX = Math.round(720 + offsetPx * Math.cos(theta));
        screenY = Math.round(450 + offsetPx * Math.sin(theta));
        distPct = rPct;
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
        return { error: 'No sphere intersection', screenX, screenY, distPct };
      }

      const hitWorld = intersects[0].point;

      // Orient target lat/lon directly under hit point
      const localTarget = globe.picker.constructor.latLonToVector3(tLat, tLon, 1.7);
      globe.earthMesh.quaternion.setFromUnitVectors(localTarget.clone().normalize(), hitWorld.clone().normalize());
      globe.earthMesh.updateMatrixWorld(true);

      const actualDistPct = (Math.hypot(screenX - 720, screenY - 450) / visibleDiscRadius) * 100;
      return { screenX, screenY, distPct: actualDistPct.toFixed(1) };
    }, lat, lon, discRadiusPct, angleRad, cameraZ);

    const { screenX, screenY, distPct } = data;

    // 2. Dispatch real OS-level mouse click via Puppeteer
    await page.mouse.click(screenX, screenY);
    await new Promise(r => setTimeout(r, 180));

    // 3. Read outcome
    const outcome = await page.evaluate(() => {
      const g = window.game;
      const hit = g.selectedHit;
      return {
        name: hit?.country?.name || null
      };
    });

    // 4. Reset selection visuals
    await page.evaluate(() => {
      window.game.selectedHit = null;
      window.game.ui.hideTouchConfirm();
      window.globe.mapRenderer.resetHighlights();
    });

    const isMatch = (expectedName === null && outcome.name === null) ||
      (outcome.name && expectedName && outcome.name.toLowerCase().includes(expectedName.toLowerCase())) ||
      (expectedName && outcome.name && expectedName.toLowerCase().includes(outcome.name.toLowerCase()));

    const record = {
      index: records.length + 1,
      category,
      targetName: name,
      x: screenX,
      y: screenY,
      disc_dist_pct: distPct,
      lat: lat.toFixed(4),
      lon: lon.toFixed(4),
      expected: expectedName || 'None',
      actual: outcome.name || 'None',
      pass: isMatch ? 'PASS' : 'FAIL'
    };

    records.push(record);
    console.log(`[${String(record.index).padStart(2, '0')}/60] [${category.padEnd(12)}] ${name.padEnd(28)} Edge:${(distPct + '%').padEnd(7)} (${record.x},${record.y}) -> ${record.actual.padEnd(20)} [${record.pass}]`);
    return record;
  }

  // ── 1. 26 LIMB / EDGE CLICKS (92% - 99% radius) ──────────────────────────
  console.log('--- 1. Testing 26 Limb / Edge Clicks (92% - 99% of Visible Globe Disc) ---');
  const limbTargets = [
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
    { name: 'Papua New Guinea', lat: -6.31, lon: 143.95, exp: 'Papua New Guinea' },
    { name: 'Brazil', lat: -14.23, lon: -51.92, exp: 'Brazil' },
    { name: 'Australia', lat: -25.27, lon: 133.77, exp: 'Australia' },
    { name: 'Egypt', lat: 26.82, lon: 30.80, exp: 'Egypt' },
    { name: 'New Zealand', lat: -39.50, lon: 176.00, exp: 'New Zealand' },
    { name: 'Canada', lat: 56.13, lon: -106.34, exp: 'Canada' },
    { name: 'India', lat: 20.59, lon: 78.96, exp: 'India' }
  ];

  for (let i = 0; i < limbTargets.length; i++) {
    const t = limbTargets[i];
    // Distribute angles in unobstructed bottom/side arc (avoiding HUD at top: 0.25 rad to 2.9 rad)
    const angleRad = 0.25 + (i / (limbTargets.length - 1)) * 2.65;
    // Disperse between 92.5% and 98.5% radius
    const discRadiusPct = 92.5 + ((i * 1.7) % 6.0);
    await testClick('Limb Edge', t.name, t.lat, t.lon, t.exp, { discRadiusPct, angleRad, cameraZ: 4.4 });
  }

  // ── 2. 10 OCEAN CLICKS (5 Near Coast <= 3° + 5 Deep Ocean) ───────────────
  console.log('\n--- 2. Testing 10 Ocean Clicks (5 Near Coast <=3° + 5 Deep Ocean) ---');
  const oceanTargets = [
    // 5 Near-Coast <= 3 degrees
    { name: 'Bay of Biscay (off France/Spain)', lat: 45.50, lon: -4.00, exp: null },
    { name: 'Red Sea (off Saudi/Sudan)', lat: 20.00, lon: 38.50, exp: null },
    { name: 'Persian Gulf (off Qatar/Iran)', lat: 27.00, lon: 51.00, exp: null },
    { name: 'Gulf of Mexico (off US/Mexico)', lat: 25.00, lon: -90.00, exp: null },
    { name: 'Sea of Japan (off Japan/Korea)', lat: 40.00, lon: 134.00, exp: null },
    // 5 Deep Ocean Abyss
    { name: 'Point Nemo (South Pacific)', lat: -48.87, lon: -123.39, exp: null },
    { name: 'Central North Atlantic', lat: 32.00, lon: -42.00, exp: null },
    { name: 'Central Indian Ocean', lat: -20.00, lon: 80.00, exp: null },
    { name: 'North Pacific Abyss', lat: 38.00, lon: 170.00, exp: null },
    { name: 'Southern Ocean Abyss', lat: -60.00, lon: 0.00, exp: null }
  ];

  for (const t of oceanTargets) {
    await testClick('Ocean', t.name, t.lat, t.lon, t.exp, { cameraZ: 3.5 });
  }

  // ── 3. 6 MICROSTATE PAIRS (12 CLICKS) ────────────────────────────────────
  console.log('\n--- 3. Testing 6 Microstate Pairs (12 Clicks: Microstate vs Neighbor 50km away) ---');
  const microstatePairs = [
    // Pair 1: Monaco vs France
    { name: 'Monaco (microstate center)', lat: 43.7384, lon: 7.4246, exp: 'Monaco' },
    { name: 'France (50km north of Monaco)', lat: 43.9500, lon: 7.3000, exp: 'France' },
    // Pair 2: San Marino vs Italy
    { name: 'San Marino (microstate center)', lat: 43.9424, lon: 12.4578, exp: 'San Marino' },
    { name: 'Italy (50km west of San Marino)', lat: 43.9000, lon: 11.8500, exp: 'Italy' },
    // Pair 3: Vatican City vs Italy
    { name: 'Vatican City (microstate center)', lat: 41.9029, lon: 12.4534, exp: 'Vatican City' },
    { name: 'Italy (Rome outskirts 30km east)', lat: 41.9000, lon: 12.8000, exp: 'Italy' },
    // Pair 4: Liechtenstein vs Switzerland
    { name: 'Liechtenstein (microstate center)', lat: 47.1660, lon: 9.5554, exp: 'Liechtenstein' },
    { name: 'Switzerland (50km west of Vaduz)', lat: 47.1500, lon: 8.9000, exp: 'Switzerland' },
    // Pair 5: Andorra vs Spain
    { name: 'Andorra (microstate center)', lat: 42.5063, lon: 1.5218, exp: 'Andorra' },
    { name: 'Spain (50km south of Andorra)', lat: 42.1000, lon: 1.5000, exp: 'Spain' },
    // Pair 6: Singapore vs Malaysia
    { name: 'Singapore (island center)', lat: 1.3521, lon: 103.8198, exp: 'Singapore' },
    { name: 'Malaysia (50km north in Johor)', lat: 1.7500, lon: 103.7500, exp: 'Malaysia' }
  ];

  for (const t of microstatePairs) {
    await testClick('Microstate', t.name, t.lat, t.lon, t.exp, { cameraZ: 2.2 });
  }

  // ── 4. 6 BORDER CLICKS (12 CLICKS) ───────────────────────────────────────
  console.log('\n--- 4. Testing 6 Border Pairs (12 Clicks: Precision Shared Border Discrimination) ---');
  const borderPairs = [
    // Pair 1: Spain vs Portugal
    { name: 'Spain (Badajoz border post)', lat: 38.8794, lon: -6.9706, exp: 'Spain' },
    { name: 'Portugal (Elvas border post)', lat: 38.8814, lon: -7.1628, exp: 'Portugal' },
    // Pair 2: Belgium vs Netherlands
    { name: 'Belgium (Baarle-Hertog)', lat: 51.4400, lon: 4.9300, exp: 'Belgium' },
    { name: 'Netherlands (Baarle-Nassau)', lat: 51.4500, lon: 4.9400, exp: 'Netherlands' },
    // Pair 3: Rwanda vs Burundi
    { name: 'Rwanda (Nemba border)', lat: -2.3500, lon: 30.2000, exp: 'Rwanda' },
    { name: 'Burundi (Gasenyi border)', lat: -2.4500, lon: 30.2000, exp: 'Burundi' },
    // Pair 4: Sudan vs South Sudan
    { name: 'Sudan (Abyei north sector)', lat: 10.1500, lon: 28.4000, exp: 'Sudan' },
    { name: 'South Sudan (Abyei south sector)', lat: 9.8500, lon: 28.4000, exp: 'South Sudan' },
    // Pair 5: Chile vs Argentina
    { name: 'Chile (Paso Los Libertadores)', lat: -32.8300, lon: -70.0800, exp: 'Chile' },
    { name: 'Argentina (Las Cuevas border)', lat: -32.8100, lon: -69.9500, exp: 'Argentina' },
    // Pair 6: North Korea vs South Korea
    { name: 'North Korea (Panmunjom north)', lat: 37.9600, lon: 126.6700, exp: 'North Korea' },
    { name: 'South Korea (Panmunjom south)', lat: 37.9500, lon: 126.6800, exp: 'South Korea' }
  ];

  for (const t of borderPairs) {
    await testClick('Border', t.name, t.lat, t.lon, t.exp, { cameraZ: 2.0 });
  }

  await browser.close();

  // ── CSV EXPORT ──────────────────────────────────────────────────────────
  const csvLines = [
    'x,y,disc_dist_pct,lat,lon,expected_country,actual_country,pass'
  ];

  let passCount = 0;
  for (const r of records) {
    if (r.pass === 'PASS') passCount++;
    csvLines.push(`${r.x},${r.y},${r.disc_dist_pct},${r.lat},${r.lon},"${r.expected}","${r.actual}",${r.pass}`);
  }

  fs.mkdirSync(path.dirname(csvOutputPath), { recursive: true });
  fs.writeFileSync(csvOutputPath, csvLines.join('\n'), 'utf8');

  console.log('\n================================================================================');
  console.log(`CLICK TEST V3 SUMMARY: ${passCount} / ${records.length} PASSED (${((passCount / records.length) * 100).toFixed(1)}%)`);
  console.log(`Saved CSV report to: ${csvOutputPath}`);
  console.log('================================================================================');

  if (passCount !== records.length) {
    console.warn(`WARNING: ${records.length - passCount} clicks did not pass.`);
  }
}

runClickTestV3();
