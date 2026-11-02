import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function runDragTest() {
  console.log('================================================================================');
  console.log('           GEOTRIVIA QA: DRAG VS CLICK DISCRIMINATION BENCHMARK                 ');
  console.log('================================================================================\n');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:8080', { waitUntil: 'networkidle0' });

  await page.waitForSelector('#startExpeditionBtn');
  await page.click('#startExpeditionBtn');
  await new Promise(r => setTimeout(r, 1200));

  await page.evaluate(() => {
    window.globe.isAutoRotating = false;
  });

  const dragResults = [];
  const clickResults = [];

  console.log('--- PART 1: 10 Rotational Drags (>40px or >350ms) -> Must NEVER select ---');

  const dragScenarios = [
    { id: 1, desc: 'Horizontal drag right (120px)', from: [650, 450], to: [770, 450], steps: 10, waitMs: 50 },
    { id: 2, desc: 'Vertical drag down (100px)', from: [720, 400], to: [720, 500], steps: 10, waitMs: 50 },
    { id: 3, desc: 'Diagonal drag southeast (90px)', from: [680, 400], to: [750, 470], steps: 10, waitMs: 50 },
    { id: 4, desc: 'Long duration hold & tiny move (500ms, >350ms limit)', from: [720, 450], to: [723, 450], steps: 2, waitMs: 500 },
    { id: 5, desc: 'Horizontal drag left (140px)', from: [780, 450], to: [640, 450], steps: 12, waitMs: 40 },
    { id: 6, desc: 'Moderate drag right (55px, >40px limit)', from: [700, 450], to: [755, 450], steps: 6, waitMs: 60 },
    { id: 7, desc: 'Long press stationary (600ms hold, >350ms limit)', from: [720, 450], to: [721, 451], steps: 1, waitMs: 600 },
    { id: 8, desc: 'Vertical drag up (110px)', from: [720, 520], to: [720, 410], steps: 10, waitMs: 50 },
    { id: 9, desc: 'Rapid fling swipe (80px in 100ms)', from: [680, 450], to: [760, 450], steps: 4, waitMs: 20 },
    { id: 10, desc: 'Diagonal drag northwest (100px)', from: [760, 500], to: [690, 430], steps: 10, waitMs: 50 }
  ];

  for (const s of dragScenarios) {
    // Clear any selection state
    await page.evaluate(() => {
      window.game.selectedHit = null;
      window.game.ui.hideTouchConfirm();
      window.globe.mapRenderer.resetHighlights();
    });

    const [x1, y1] = s.from;
    const [x2, y2] = s.to;

    await page.mouse.move(x1, y1);
    await page.mouse.down();
    if (s.waitMs) await new Promise(r => setTimeout(r, s.waitMs));

    // Move in intermediate steps to simulate real finger/mouse gesture
    const steps = s.steps || 5;
    for (let st = 1; st <= steps; st++) {
      const curX = Math.round(x1 + (x2 - x1) * (st / steps));
      const curY = Math.round(y1 + (y2 - y1) * (st / steps));
      await page.mouse.move(curX, curY);
      await new Promise(r => setTimeout(r, 15));
    }

    await page.mouse.up();
    await new Promise(r => setTimeout(r, 100));

    // Check if anything was accidentally selected
    const state = await page.evaluate(() => ({
      selected: window.game.selectedHit?.country?.name || null,
      confirmVisible: !document.getElementById('touchConfirmBtn').classList.contains('hidden')
    }));

    const pass = state.selected === null && !state.confirmVisible;
    const rec = { ...s, selected: state.selected, pass };
    dragResults.push(rec);

    console.log(`[DRAG ${String(s.id).padStart(2, '0')}/10] ${s.desc.padEnd(52)} -> Selected: ${state.selected || 'None (Safe)'} [${pass ? 'PASS' : 'FAIL'}]`);
  }

  console.log('\n--- PART 2: 10 Clean Stationary Clicks (<6px, <350ms) -> Must Select ---');

  const clickTargets = [
    { id: 1, name: 'Japan', lat: 36.20, lon: 138.25 },
    { id: 2, name: 'Brazil', lat: -15.79, lon: -47.89 },
    { id: 3, name: 'Australia', lat: -35.28, lon: 149.13 },
    { id: 4, name: 'France', lat: 46.22, lon: 2.21 },
    { id: 5, name: 'India', lat: 28.61, lon: 77.20 },
    { id: 6, name: 'Egypt', lat: 30.04, lon: 31.23 },
    { id: 7, name: 'Canada', lat: 45.42, lon: -75.69 },
    { id: 8, name: 'Mexico', lat: 23.63, lon: -102.55 },
    { id: 9, name: 'South Africa', lat: -30.55, lon: 22.93 },
    { id: 10, name: 'Germany', lat: 51.16, lon: 10.45 }
  ];

  for (const t of clickTargets) {
    // Orient globe so country is centered at (720, 450)
    await page.evaluate((targetLat, targetLon) => {
      const globe = window.globe;
      globe.isAutoRotating = false;
      globe.controls.enabled = false;
      globe.camera.position.set(0, 0, 2.4);
      globe.camera.lookAt(0, 0, 0);
      globe.camera.updateMatrixWorld(true);

      const mouse = new window.THREE.Vector2(0, 0);
      const raycaster = new window.THREE.Raycaster();
      raycaster.setFromCamera(mouse, globe.camera);
      const intersects = raycaster.intersectObject(globe.earthMesh, false);
      const hitWorld = intersects[0].point;

      const localTarget = globe.picker.constructor.latLonToVector3(targetLat, targetLon, 1.7);
      globe.earthMesh.quaternion.setFromUnitVectors(localTarget.clone().normalize(), hitWorld.clone().normalize());
      globe.earthMesh.updateMatrixWorld(true);

      window.game.selectedHit = null;
      window.game.ui.hideTouchConfirm();
    }, t.lat, t.lon);

    await page.mouse.click(720, 450);
    await new Promise(r => setTimeout(r, 200));

    const selectedName = await page.evaluate(() => window.game.selectedHit?.country?.name || null);
    const pass = selectedName && selectedName.toLowerCase().includes(t.name.toLowerCase());
    const rec = { ...t, selectedName, pass };
    clickResults.push(rec);

    console.log(`[CLICK ${String(t.id).padStart(2, '0')}/10] Target: ${t.name.padEnd(20)} Screen: (720, 450) -> Selected: ${selectedName || 'None'} [${pass ? 'PASS' : 'FAIL'}]`);
  }

  await browser.close();

  const dragPass = dragResults.filter(r => r.pass).length;
  const clickPass = clickResults.filter(r => r.pass).length;
  const totalPass = dragPass + clickPass;

  console.log('\n================================================================================');
  console.log(`DRAG TEST BENCHMARK SUMMARY:`);
  console.log(`- Drags never selecting: ${dragPass}/10 PASSED (${(dragPass * 10)}%)`);
  console.log(`- Clean clicks selecting: ${clickPass}/10 PASSED (${(clickPass * 10)}%)`);
  console.log(`- Total: ${totalPass}/20 PASSED (${(totalPass / 20 * 100).toFixed(1)}%)`);
  console.log('================================================================================');

  const outPath = path.resolve('..', 'report', 'part3', 'drag_test_results.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify({ dragResults, clickResults, dragPass, clickPass, totalPass }, null, 2));
  console.log(`Saved drag test results to: ${outPath}`);

  if (totalPass < 20) {
    process.exitCode = 1;
  }
}

runDragTest().catch(err => {
  console.error('Fatal Drag Test error:', err);
  process.exit(1);
});
