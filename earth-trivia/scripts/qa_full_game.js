import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const reportDir = path.resolve(__dirname, '../../report/part4');
const screensDir = path.resolve(reportDir, 'screens');

fs.mkdirSync(screensDir, { recursive: true });

console.log('================================================================================');
console.log('         GEOTRIVIA QA: 3 FULL 10-ROUND GAME RUNS (CLUE, NAME, FLAG)              ');
console.log('================================================================================\n');

async function runFullGameQA() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:8080', { waitUntil: 'networkidle0' });
  await page.waitForSelector('#startScreen');

  // Benchmark WebGL Renderer & FPS
  const webglInfo = await page.evaluate(() => {
    const canvas = document.querySelector('#webgl-container canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('webgl2');
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    const vendor = dbg ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR);
    const isSoftware = /swiftshader|llvmpipe|software/i.test(renderer);
    return { renderer, vendor, isSoftware };
  });

  console.log('WebGL Info:', webglInfo);

  // Measure FPS over 60 frames
  const fps = await page.evaluate(async () => {
    return new Promise(resolve => {
      let frames = 0;
      const start = performance.now();
      function step() {
        frames++;
        if (frames >= 60) {
          const duration = performance.now() - start;
          resolve(Math.round((frames / duration) * 1000));
        } else {
          requestAnimationFrame(step);
        }
      }
      requestAnimationFrame(step);
    });
  });

  console.log(`Measured Canvas FPS: ${fps} FPS\n`);

  const gameRuns = [];

  for (const mode of ['clue', 'name', 'flag']) {
    console.log(`\n================================================================================`);
    console.log(`             PLAYING FULL 10-ROUND EXPEDITION: MODE = ${mode.toUpperCase()}     `);
    console.log(`================================================================================\n`);

    // Reset to start screen
    await page.evaluate(() => {
      window.ui.showStartScreen();
      window.game.phase = 'start';
    });
    await new Promise(r => setTimeout(r, 400));

    // Select mode
    await page.evaluate((m) => {
      document.querySelectorAll('.mode-btn').forEach(b => {
        if (b.dataset.mode === m) b.click();
      });
    }, mode);

    // Launch expedition
    await page.evaluate(() => document.getElementById('startExpeditionBtn').click());
    await new Promise(r => setTimeout(r, 1000));

    const roundLogs = [];

    for (let r = 1; r <= 10; r++) {
      // 1. Get current round target
      const target = await page.evaluate(() => {
        const g = window.game;
        return {
          id: g.currentCountry.id,
          name: g.currentCountry.name,
          lat: g.currentCountry.lat || (g.currentCountry.centroid ? g.currentCountry.centroid[1] : 0),
          lon: g.currentCountry.lon || (g.currentCountry.centroid ? g.currentCountry.centroid[0] : 0)
        };
      });

      // Deliberately answer wrong on rounds 3 and 7 to test partial credit scoring and arc
      const isWrongRound = (r === 3 || r === 7);

      let clickLat = target.lat;
      let clickLon = target.lon;

      if (isWrongRound) {
        // Pick an actual different sovereign country to ensure a valid country selection
        const wrong = await page.evaluate((targetId) => {
          const db = window.game.fullDatabase;
          const other = db.find(c => c.id !== targetId && c.tier === 'easy') || db.find(c => c.id !== targetId);
          return {
            lat: other.lat || (other.centroid ? other.centroid[1] : 0),
            lon: other.lon || (other.centroid ? other.centroid[0] : 0)
          };
        }, target.id);
        clickLat = wrong.lat;
        clickLon = wrong.lon;
      }

      // 2. Orient sphere so country is under center (720, 450)
      await page.waitForFunction(() => !window.globe.flight.isFlying, { timeout: 3000 }).catch(() => {});
      await page.evaluate((cLat, cLon) => {
        const globe = window.globe;
        globe.flight.cancelAnswerFlight();
        globe.flight.isFlying = false;
        globe.isAutoRotating = false;
        globe.lastInteractionTime = performance.now() + 10000000;
        globe.controls.enabled = false;

        globe.camera.position.set(0, 0, 4.4);
        globe.camera.lookAt(0, 0, 0);
        globe.camera.updateMatrixWorld(true);

        const hitWorld = new window.THREE.Vector3(0, 0, 1.7);
        const localTarget = globe.picker.constructor.latLonToVector3(cLat, cLon, 1.7);
        globe.earthMesh.quaternion.setFromUnitVectors(localTarget.clone().normalize(), hitWorld.clone().normalize());
        globe.earthMesh.updateMatrixWorld(true);
      }, clickLat, clickLon);

      // 3. Dispatch real pointer click at screen center (720, 450)
      await page.mouse.click(720, 450);
      await new Promise(r => setTimeout(r, 250));

      // 4. Confirm selection via Enter or confirm button
      await page.evaluate(() => {
        const btn = document.getElementById('touchConfirmBtn');
        if (btn && !btn.classList.contains('hidden')) btn.click();
      });
      await page.keyboard.press('Enter');
      // Wait for camera flight to complete and memory vault to appear
      await page.waitForSelector('#memoryVault:not(.hidden)', { timeout: 8000 });
      await new Promise(r => setTimeout(r, 300));

      // 5. Read round breakdown from memory vault
      const roundData = await page.evaluate((rnd) => {
        const g = window.game;
        const b = g.lastRoundBreakdown || {};
        return {
          round: rnd,
          target: g.currentCountry?.name || 'Unknown',
          guess: g.lastGuessCountry?.name || 'Open Ocean / Off-target',
          distanceKm: b.distanceKm !== undefined ? b.distanceKm : 0,
          cluesUsed: g.clueIndex + 1,
          timeSec: 3.5,
          pointsEarned: b.points || 0,
          isCorrect: b.isCorrect
        };
      }, r);

      roundLogs.push(roundData);
      console.log(`[Round ${String(r).padStart(2, '0')}/10] Target: ${roundData.target.padEnd(20)} Guess: ${roundData.guess.padEnd(20)} Dist: ${(roundData.distanceKm + ' km').padEnd(10)} Pts: +${roundData.pointsEarned} [${roundData.isCorrect ? 'CORRECT' : 'WRONG'}]`);

      // 6. Click Continue Exploration button to progress to next round
      await page.evaluate(() => {
        const nextBtn = document.getElementById('vaultNextBtn');
        if (nextBtn) nextBtn.click();
      });
      await new Promise(r => setTimeout(r, 800));
    }

    // Wait for end screen transition
    await page.waitForSelector('#endScreen:not(.hidden)', { timeout: 5000 });
    await new Promise(r => setTimeout(r, 600));

    // Capture natural end screen
    const endScreenPath = path.resolve(screensDir, `${mode}_game_endscreen.png`);
    await page.screenshot({ path: endScreenPath });

    const finalSummary = await page.evaluate(() => {
      return {
        score: parseInt(document.getElementById('endScore').textContent.replace(/,/g, ''), 10) || 0,
        accuracy: document.getElementById('endAccuracy').textContent,
        streak: parseInt(document.getElementById('endStreak').textContent, 10) || 0
      };
    });

    const sumPoints = roundLogs.reduce((acc, r) => acc + r.pointsEarned, 0);
    const scoreMatches = sumPoints === finalSummary.score;

    console.log(`\nEnd Screen Result: Final Score = ${finalSummary.score}, Accuracy = ${finalSummary.accuracy}, Streak = ${finalSummary.streak}`);
    console.log(`Sum of Round Points = ${sumPoints}`);
    console.log(`Score Verification: ${scoreMatches ? 'VERIFIED MATCH (sum === endScore)' : 'MISMATCH'}`);

    gameRuns.push({
      mode,
      rounds: roundLogs,
      sumPoints,
      finalScore: finalSummary.score,
      accuracy: finalSummary.accuracy,
      streak: finalSummary.streak,
      scoreVerified: scoreMatches,
      endScreenScreenshot: `${mode}_game_endscreen.png`
    });
  }

  await browser.close();

  const fullReport = {
    timestamp: new Date().toISOString(),
    webgl: webglInfo,
    fps,
    runs: gameRuns
  };

  const jsonPath = path.resolve(reportDir, 'full_game_runs.json');
  fs.writeFileSync(jsonPath, JSON.stringify(fullReport, null, 2), 'utf8');
  console.log(`\nSaved Full Game QA summary to: ${jsonPath}`);
}

runFullGameQA();
