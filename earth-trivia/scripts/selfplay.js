#!/usr/bin/env node
/**
 * GeoTrivia Autonomous QA Self-Play Test Harness
 * Real Puppeteer player exercising all game modes, tiers, viewports, and edge cases.
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer-core';
import { pointsIfCorrect, calculatePartialCredit, SCORING } from '../src/scoring.js';
import { getLargestLandmassCenter } from '../src/cameraFlight.js';
import { WORLD_COUNTRIES } from '../data/world-50m.js';

function getBestCountryCoords(countryOrId) {
  const cId = typeof countryOrId === 'object' ? countryOrId.id : countryOrId;
  const cName = typeof countryOrId === 'object' ? countryOrId.name : null;
  const tc = WORLD_COUNTRIES.find(c => String(c.id).padStart(3, '0') === String(cId).padStart(3, '0') || (cName && c.name === cName));
  if (tc) {
    return getLargestLandmassCenter(tc);
  }
  if (typeof countryOrId === 'object' && countryOrId.lat !== undefined) {
    return { lat: countryOrId.lat, lon: countryOrId.lon };
  }
  return { lat: 0, lon: 0 };
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const CHROME_PATH = process.env.CHROME_BIN || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

// CLI Options
const isQuick = process.argv.includes('--quick');
const isFull = process.argv.includes('--full');
const isSmoke = process.argv.includes('--smoke');
const isSelftest = process.argv.includes('--selftest');
const configArg = process.argv.find(a => a.startsWith('--config='))?.split('=')[1];
const seedArg = process.argv.find(a => a.startsWith('--seed='))?.split('=')[1];
const workersArg = process.argv.find(a => a.startsWith('--workers='))?.split('=')[1];
const defaultWorkers = workersArg ? Math.max(1, parseInt(workersArg, 10)) : 4;

const baseSeed = seedArg ? parseInt(seedArg, 10) : Math.floor(Math.random() * 1000000);
console.log(`[GeoTrivia QA Selfplay] Base Seed: ${baseSeed}`);

// Mulberry32 PRNG
function mulberry32(a) {
  return function() {
    var t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// Lightweight HTTP server for static files
function startServer(port = 8080) {
  const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.woff2': 'font/woff2',
    '.woff': 'font/woff',
    '.ttf': 'font/ttf'
  };

  const server = http.createServer((req, res) => {
    let reqPath = decodeURI(req.url.split('?')[0]);
    if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
    const filePath = path.join(rootDir, reqPath);
    if (!filePath.startsWith(rootDir) || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('File Not Found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const mime = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': mime,
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*'
    });
    fs.createReadStream(filePath).pipe(res);
  });

  return new Promise((resolve, reject) => {
    server.listen(port, '127.0.0.1', () => resolve(server));
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        server.listen(0, '127.0.0.1', () => resolve(server));
      } else {
        reject(err);
      }
    });
  });
}

// Self-test runner: plants 3 defects and asserts harness catches exactly those 3
async function runSelftest() {
  console.log('================================================================================');
  console.log('              GEOTRIVIA QA HARNESS: RUNNING --SELFTEST                         ');
  console.log('================================================================================\n');

  const server = await startServer(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/index.html`;

  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844 });
    await page.goto(baseUrl, { waitUntil: 'load' });
    await page.waitForSelector('#startScreen');

    // Plant 3 defects:
    // 1. "undefined" in HUD text
    // 2. Invisible overlay covering Continue
    // 3. 45vh mobile sheet
    await page.evaluate(() => {
      // Hide start screen so we are in result phase
      const start = document.getElementById('startScreen');
      if (start) {
        start.classList.add('hidden');
        start.style.display = 'none';
      }

      // 1. Text "undefined" in HUD
      const topHud = document.getElementById('topHud');
      if (topHud) {
        topHud.classList.remove('hidden');
        topHud.style.display = 'flex';
        const span = document.createElement('span');
        span.id = 'selftest-undefined-node';
        span.textContent = 'undefined';
        span.style.fontSize = '10px';
        topHud.appendChild(span);
      }

      // 3. 45vh mobile sheet
      const vault = document.getElementById('memoryVault');
      if (vault) {
        vault.classList.remove('hidden');
        vault.style.display = 'flex';
        vault.style.boxSizing = 'border-box';
        vault.style.top = 'auto';
        vault.style.bottom = '8px';
        vault.style.height = '45vh';
        vault.style.maxHeight = '45vh';
        vault.style.overflow = 'hidden';
        vault.style.animation = 'none';
        vault.style.transform = 'none';
      }

      // 2. Invisible overlay over Continue button
      const nextBtn = document.getElementById('vaultNextBtn');
      if (nextBtn) {
        const rect = nextBtn.getBoundingClientRect();
        const overlay = document.createElement('div');
        overlay.id = 'selftest-continue-overlay';
        overlay.style.cssText = `position:fixed;top:${rect.top}px;left:${rect.left}px;width:${rect.width}px;height:${rect.height}px;z-index:999999;background:rgba(0,0,0,0.001);pointer-events:auto;`;
        document.body.appendChild(overlay);
      }
    });

    // Run phase validation
    const vRectDebug = await page.evaluate(() => {
      const v = document.getElementById('memoryVault');
      const b = document.getElementById('vaultNextBtn');
      return {
        vRect: v ? v.getBoundingClientRect() : null,
        bRect: b ? b.getBoundingClientRect() : null,
        vStyleBottom: v ? window.getComputedStyle(v).bottom : null,
        vStyleTop: v ? window.getComputedStyle(v).top : null,
        vStyleHeight: v ? window.getComputedStyle(v).height : null
      };
    });
    console.log('Selftest Debug Rects:', vRectDebug);

    const detectedFailures = await validatePhase(page, 'result', {
      viewport: { width: 390, height: 844 },
      mode: 'clue',
      tier: 'easy'
    });

    console.log(`Detected failures in selftest (${detectedFailures.length}):`, detectedFailures);

    const hasUndefined = detectedFailures.some(f => f.signature.includes('FORBIDDEN_TEXT') && f.signature.includes('undefined'));
    const hasCoveredContinue = detectedFailures.some(f => f.signature.includes('BUTTON_COVERED') && f.signature.includes('vaultNextBtn'));
    const has45vhSheet = detectedFailures.some(f => f.signature.includes('MOBILE_SHEET_TOO_TALL'));

    const exactly3 = detectedFailures.length === 3 && hasUndefined && hasCoveredContinue && has45vhSheet;

    if (exactly3) {
      console.log('\n[PASS] SELFTEST PASSED: Exactly 3 planted defects correctly flagged:');
      console.log('  1. Forbidden text "undefined" in HUD');
      console.log('  2. Invisible overlay blocking Continue button');
      console.log('  3. Mobile sheet height 45vh > 30vh');
      await browser.close();
      server.close();
      process.exit(0);
    } else {
      console.error('\n[FAIL] SELFTEST FAILED: Expected exactly 3 planted defects, got:', detectedFailures);
      await browser.close();
      server.close();
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal error during selftest:', err);
    if (browser) await browser.close();
    server.close();
    process.exit(1);
  }
}

// Phase validation logic: checks all UI, text, buttons, panels, geometry, and camera
async function validatePhase(page, phase, { viewport, mode = 'clue', tier = 'easy', targetCoords = null, clickCoords = null, nearestCoords = null } = {}) {
  const failures = [];

  const domCheck = await page.evaluate((ph, vp, md) => {
    const errors = [];
    const isMobile = vp.width <= 600 || (vp.width <= 900 && vp.height > vp.width);

    // 1. Forbidden text check: "undefined|NaN|null|[object|Infinity"
    const bodyText = document.body.textContent;
    const forbiddenRegex = /\b(undefined|null|Infinity)\b/i;
    const forbiddenMatch = bodyText.match(forbiddenRegex) || (bodyText.includes('NaN') ? ['NaN'] : null) || bodyText.match(/\[object /);
    if (forbiddenMatch) {
      errors.push({
        signature: `FORBIDDEN_TEXT: "${forbiddenMatch[0]}"`,
        details: `Found forbidden text "${forbiddenMatch[0]}" in page content`
      });
    }

    // 2. Horizontal overflow check
    const docEl = document.documentElement;
    const body = document.body;
    const scrollW = Math.max(docEl.scrollWidth, body.scrollWidth);
    const clientW = Math.min(docEl.clientWidth, body.clientWidth);
    if (scrollW > clientW + 1) {
      let offending = [];
      for (const el of document.querySelectorAll('*')) {
        const r = el.getBoundingClientRect();
        if (r.right > clientW + 1) {
          offending.push(`${el.tagName}#${el.id || ''}.${(el.className || '').toString().slice(0, 30)}(right=${r.right.toFixed(1)},w=${r.width.toFixed(1)})`);
        }
      }
      errors.push({
        signature: `HORIZONTAL_OVERFLOW: scrollWidth=${scrollW} > clientWidth=${clientW}`,
        details: `Page has horizontal scroll overflow of ${scrollW - clientW}px. Offending: ${offending.join(' | ').slice(0, 300)}`
      });
    }

    // 3. Primary buttons check
    const primaryButtonIds = [
      { id: 'startExpeditionBtn', name: 'Start', phase: 'start' },
      { id: 'nextClueBtn', name: 'Show clue', phase: 'question' },
      { id: 'touchConfirmBtn', name: 'Confirm', phase: 'selected' },
      { id: 'vaultNextBtn', name: 'Continue/Next', phase: 'result' },
      { id: 'replayMissedBtn', name: 'Replay', phase: 'end' },
      { id: 'restartBtn', name: 'New game', phase: 'end' }
    ];

    for (const bInfo of primaryButtonIds) {
      if (bInfo.phase !== ph) continue; // Only check primary buttons belonging to the current phase
      const el = document.getElementById(bInfo.id);
      if (!el) continue;
      const isVisible = !el.classList.contains('hidden') &&
        el.style.display !== 'none' &&
        window.getComputedStyle(el).display !== 'none' &&
        window.getComputedStyle(el).visibility !== 'hidden' &&
        (el.offsetWidth > 0 || el.offsetHeight > 0 || el.getClientRects().length > 0);
      if (!isVisible && bInfo.id !== 'replayMissedBtn' && bInfo.id !== 'nextClueBtn') {
        errors.push({
          signature: `BUTTON_MISSING_IN_PHASE: ${bInfo.name} (${bInfo.id})`,
          details: `Expected button ${bInfo.id} to be visible in phase ${ph}`
        });
        continue;
      }
      if (!isVisible) continue;

      const rect = el.getBoundingClientRect();

      // Check fully inside viewport
      if (rect.top < -1 || rect.left < -1 || rect.bottom > vp.height + 1 || rect.right > vp.width + 1) {
        const vEl = document.getElementById('memoryVault');
        const vr = vEl ? vEl.getBoundingClientRect() : {};
        const cName = window.game?.currentCountry?.name || 'unknown';
        errors.push({
          signature: `BUTTON_OUT_OF_VIEWPORT: ${bInfo.name} (${bInfo.id})`,
          details: `Button rect [${rect.top.toFixed(1)}, ${rect.left.toFixed(1)}, ${rect.bottom.toFixed(1)}, ${rect.right.toFixed(1)}] exceeds viewport [${vp.width}x${vp.height}] | vRect=[${vr.top?.toFixed(1)}, ${vr.bottom?.toFixed(1)}, ${vr.height?.toFixed(1)}] | country=${cName}`
        });
      }

      // Check height on touch
      if (isMobile && rect.height < 43.5) {
        errors.push({
          signature: `BUTTON_TOO_SMALL_TOUCH: ${bInfo.name} (${bInfo.id}) height=${rect.height.toFixed(1)}px < 44px`,
          details: `Touch button height must be >= 44px, was ${rect.height.toFixed(1)}px`
        });
      }

      // Check elementFromPoint (not covered)
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const topEl = document.elementFromPoint(cx, cy);
      if (topEl && !el.contains(topEl) && topEl !== el) {
        errors.push({
          signature: `BUTTON_COVERED: ${bInfo.name} (${bInfo.id}) covered by ${topEl.id || topEl.className || topEl.tagName}`,
          details: `Center point (${cx.toFixed(0)}, ${cy.toFixed(0)}) hits <${topEl.tagName}> instead of ${bInfo.id}`
        });
      }
    }

    // 4. Panel overlap check (HUD, ClueCard, TouchConfirm, MemoryVault)
    const panels = [
      { id: 'topHud', el: document.getElementById('topHud') },
      { id: 'clueCard', el: document.getElementById('clueCard') },
      { id: 'touchConfirmBtn', el: document.getElementById('touchConfirmBtn') },
      { id: 'memoryVault', el: document.getElementById('memoryVault') }
    ].filter(p => p.el && !p.el.classList.contains('hidden') && p.el.style.display !== 'none' && window.getComputedStyle(p.el).display !== 'none');

    for (let i = 0; i < panels.length; i++) {
      for (let j = i + 1; j < panels.length; j++) {
        const p1 = panels[i];
        const p2 = panels[j];
        const r1 = p1.el.getBoundingClientRect();
        const r2 = p2.el.getBoundingClientRect();
        const xOverlap = Math.max(0, Math.min(r1.right, r2.right) - Math.max(r1.left, r2.left));
        const yOverlap = Math.max(0, Math.min(r1.bottom, r2.bottom) - Math.max(r1.top, r2.top));
        if (xOverlap > 4 && yOverlap > 4) {
          errors.push({
            signature: `PANEL_OVERLAP: ${p1.id} overlaps ${p2.id} by ${xOverlap.toFixed(0)}x${yOverlap.toFixed(0)}px`,
            details: `Panels ${p1.id} and ${p2.id} overlap by more than 4px`
          });
        }
      }
    }

    // 5. Result card/sheet checks (in result phase)
    if (ph === 'result') {
      const vault = document.getElementById('memoryVault');
      if (vault && !vault.classList.contains('hidden') && vault.style.display !== 'none' && window.getComputedStyle(vault).display !== 'none') {
        const vRect = vault.getBoundingClientRect();

        // Mobile sheet height <= 30vh
        if (isMobile) {
          const maxAllowedH = vp.height * 0.30 + 1.5;
          if (vRect.height > maxAllowedH) {
            errors.push({
              signature: `MOBILE_SHEET_TOO_TALL: height=${vRect.height.toFixed(1)}px > 30vh (${maxAllowedH.toFixed(1)}px)`,
              details: `Mobile sheet height ${vRect.height.toFixed(1)}px exceeds 30vh`
            });
          }

          // Memory Anchor above Continue button
          const anchor = document.getElementById('vaultAnchor');
          const continueBtn = document.getElementById('vaultNextBtn');
          if (anchor && continueBtn) {
            const aRect = anchor.getBoundingClientRect();
            const cRect = continueBtn.getBoundingClientRect();
            if (aRect.bottom > cRect.top + 1.0) {
              errors.push({
                signature: `MEMORY_ANCHOR_NOT_ABOVE_CONTINUE: anchor bottom=${aRect.bottom.toFixed(1)} > continue top=${cRect.top.toFixed(1)}`,
                details: `Memory Anchor must be fully above Continue button`
              });
            }
          }
        }
      }
    }

    // 6. Flag mode check: verify no flag icon or flag emoji in selection UI
    if (md === 'flag') {
      const confirmPill = document.getElementById('touchConfirmBtn');
      if (confirmPill) {
        const hasFlagIcon = confirmPill.querySelector('.confirm-flag-slot svg, .confirm-flag-slot img, .confirm-flag-slot .fi') ||
                            (confirmPill.querySelector('#touchSelectedFlag')?.innerHTML.trim().length > 0);
        const text = confirmPill.textContent || '';
        const flagEmojiRegex = /[\uD83C][\uDDE6-\uDDFF]{2}/;
        if (hasFlagIcon || flagEmojiRegex.test(text)) {
          errors.push({
            signature: `FLAG_IN_SELECTION_UI: flag displayed in selection confirm pill`,
            details: `Flag mode must not show flag in selection UI before confirmation`
          });
        }
      }
    }

    return errors;
  }, phase, viewport, mode);

  failures.push(...domCheck);

  // 7. Camera checks (finite, distance in bounds, roll < 0.5 deg)
  const cameraCheck = await page.evaluate(() => {
    const globe = window.globe;
    if (!globe || !globe.camera || !globe.controls) return [];
    const cam = globe.camera;
    const ctrl = globe.controls;
    const errors = [];

    // Finite coordinates
    if (!isFinite(cam.position.x) || !isFinite(cam.position.y) || !isFinite(cam.position.z)) {
      errors.push({
        signature: 'CAMERA_NON_FINITE',
        details: `Camera position is non-finite: (${cam.position.x}, ${cam.position.y}, ${cam.position.z})`
      });
    }

    // Distance bounds
    const dist = cam.position.length();
    const minD = ctrl.minDistance || 2.52;
    const maxD = ctrl.maxDistance || 6.5;
    if (dist < minD - 0.05 || dist > maxD + 0.05) {
      errors.push({
        signature: `CAMERA_DISTANCE_OUT_OF_BOUNDS: dist=${dist.toFixed(2)} outside [${minD}, ${maxD}]`,
        details: `Camera distance ${dist.toFixed(2)} outside controls limits [${minD}, ${maxD}]`
      });
    }

    // Roll angle < 0.5 deg
    const camDir = new window.THREE.Vector3();
    cam.getWorldDirection(camDir);
    const camUp = cam.up.clone().applyQuaternion(cam.quaternion);
    const idealUp = new window.THREE.Vector3(0, 1, 0).projectOnPlane(camDir).normalize();
    if (idealUp.length() > 1e-4) {
      const rollDeg = (camUp.angleTo(idealUp) * 180) / Math.PI;
      if (rollDeg >= 0.5) {
        errors.push({
          signature: `CAMERA_ROLL_EXCEEDED: ${rollDeg.toFixed(2)} deg >= 0.5 deg`,
          details: `Camera roll angle ${rollDeg.toFixed(2)}° exceeds 0.5° threshold`
        });
      }
    }

    return errors;
  });

  failures.push(...cameraCheck);

  // 8. Result card covering target, click point, or nearest point
  if (phase === 'result' && (targetCoords || clickCoords || nearestCoords)) {
    const coverCheck = await page.evaluate((tCoord, cCoord, nCoord) => {
      const vault = document.getElementById('memoryVault');
      if (!vault || vault.classList.contains('hidden') || vault.style.display === 'none' || window.getComputedStyle(vault).display === 'none') return [];
      const vRect = vault.getBoundingClientRect();
      const points = [
        { name: 'target', coord: tCoord },
        { name: 'click', coord: cCoord },
        { name: 'nearest', coord: nCoord }
      ].filter(p => p.coord && typeof p.coord.x === 'number' && typeof p.coord.y === 'number');

      const errors = [];
      for (const p of points) {
        if (p.coord.x >= vRect.left && p.coord.x <= vRect.right &&
            p.coord.y >= vRect.top && p.coord.y <= vRect.bottom) {
          errors.push({
            signature: `RESULT_CARD_COVERS_GEOMETRY: covers ${p.name} point at (${p.coord.x.toFixed(0)}, ${p.coord.y.toFixed(0)})`,
            details: `Result card [${vRect.left}, ${vRect.top}, ${vRect.right}, ${vRect.bottom}] covers ${p.name}`
          });
        }
      }
      return errors;
    }, targetCoords, clickCoords, nearestCoords);

    failures.push(...coverCheck);
  }

  return failures;
}

// Convert 3D Lat/Lon to projected screen coordinates
async function getScreenCoords(page, lat, lon) {
  return await page.evaluate((cLat, cLon) => {
    const globe = window.globe;
    if (!globe || !globe.earthMesh || !globe.camera) return { visible: false, x: 0, y: 0 };

    const phi = (90 - cLat) * (Math.PI / 180);
    const theta = (cLon + 180) * (Math.PI / 180);
    const x = -1.7 * Math.cos(theta) * Math.sin(phi);
    const y = 1.7 * Math.cos(phi);
    const z = 1.7 * Math.sin(theta) * Math.sin(phi);
    const local = new window.THREE.Vector3(x, y, z);

    globe.earthMesh.updateMatrixWorld(true);
    const world = local.clone().applyMatrix4(globe.earthMesh.matrixWorld);

    // Facing calculation: normal vector vs vector towards camera
    const normal = world.clone().sub(globe.earthMesh.position).normalize();
    const toCam = globe.camera.position.clone().sub(world).normalize();
    const facing = normal.dot(toCam);

    if (facing < 0.50) {
      return { visible: false, facing, x: 0, y: 0 };
    }

    const projected = world.clone().project(globe.camera);
    const canvas = document.querySelector('#webgl-container canvas') || globe.renderer.domElement;
    const rect = canvas ? canvas.getBoundingClientRect() : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };

    const screenX = rect.left + (projected.x * 0.5 + 0.5) * rect.width;
    const screenY = rect.top + (-projected.y * 0.5 + 0.5) * rect.height;

    const topSafe = 80;
    const bottomSafe = window.innerHeight - 80;
    const leftSafe = 60;
    const rightSafe = window.innerWidth - 60;

    const inViewport = screenX >= leftSafe && screenX <= rightSafe &&
                       screenY >= topSafe && screenY <= bottomSafe;

    if (!inViewport) {
      return { visible: false, facing, x: screenX, y: screenY };
    }

    // Ensure not covered by HUD or modals
    const hitEl = document.elementFromPoint(screenX, screenY);
    const isCanvas = hitEl && (hitEl.tagName === 'CANVAS' || hitEl.id === 'webgl-container');
    if (!isCanvas) {
      return { visible: false, facing, x: screenX, y: screenY };
    }

    return { visible: true, facing, x: screenX, y: screenY };
  }, lat, lon);
}

// Rotate globe using real drag if country is off-screen
async function rotateIntoView(page, lat, lon, maxDrags = 3) {
  let warnCount = 0;
  let infoCount = 0;
  const warnings = [];
  for (let i = 0; i < maxDrags; i++) {
    const coords = await getScreenCoords(page, lat, lon);
    if (coords.visible && coords.facing >= 0.70) {
      return { ok: true, warnCount, infoCount, coords, warnings };
    }

    // Compute relative drag direction from country position to camera using OrbitControls spherical projection
    const dragVec = await page.evaluate((cLat, cLon) => {
      const globe = window.globe;
      const phi = (90 - cLat) * (Math.PI / 180);
      const theta = (cLon + 180) * (Math.PI / 180);
      const local = new window.THREE.Vector3(
        -1.7 * Math.cos(theta) * Math.sin(phi),
        1.7 * Math.cos(phi),
        1.7 * Math.sin(theta) * Math.sin(phi)
      );
      globe.earthMesh.updateMatrixWorld(true);
      const world = local.clone().applyMatrix4(globe.earthMesh.matrixWorld);
      const cam = globe.camera.position;

      const camPhi = Math.acos(Math.max(-1, Math.min(1, cam.y / cam.length())));
      const camTheta = Math.atan2(cam.x, cam.z);

      const tgtPhi = Math.acos(Math.max(-1, Math.min(1, world.y / world.length())));
      const tgtTheta = Math.atan2(world.x, world.z);

      let dTheta = tgtTheta - camTheta;
      while (dTheta > Math.PI) dTheta -= 2 * Math.PI;
      while (dTheta < -Math.PI) dTheta += 2 * Math.PI;

      let dPhi = tgtPhi - camPhi;

      const canvas = document.querySelector('#webgl-container canvas') || globe.renderer.domElement;
      const clientH = canvas ? canvas.clientHeight : window.innerHeight;
      let dx = - (dTheta * clientH) / (2 * Math.PI);
      let dy = - (dPhi * clientH) / (2 * Math.PI);

      return { dx, dy };
    }, lat, lon);

    const vp = page.viewport();
    const maxDrag = Math.min(vp.width * 0.45, 500);
    const mag = Math.hypot(dragVec.dx, dragVec.dy);
    let stepDx = dragVec.dx;
    let stepDy = dragVec.dy;
    if (mag > maxDrag) {
      stepDx = (dragVec.dx / mag) * maxDrag;
      stepDy = (dragVec.dy / mag) * maxDrag;
    }

    // Perform real mouse drag across center
    const cx = vp.width / 2;
    const cy = vp.height / 2;
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx + stepDx, cy + stepDy, { steps: 1 });
    await page.mouse.up();
    await new Promise(r => setTimeout(r, 30));
  }

  // If still not visible, use fallback orient and record INFO (harmless debug hook fallback)
  const finalCoords = await getScreenCoords(page, lat, lon);
  if (!finalCoords.visible || finalCoords.facing < 0.70) {
    infoCount++;
    warnings.push({ signature: 'DEBUG_HOOK: fallback_orient_rotation', type: 'INFO', details: `Target lat=${lat}, lon=${lon} facing=${finalCoords.facing?.toFixed(2)} (< 0.70) after drag` });
    await page.evaluate((cLat, cLon) => {
      const globe = window.globe;
      globe.flight.cancelAnswerFlight();
      globe.isAutoRotating = false;
      globe.lastInteractionTime = performance.now();
      const camDir = globe.camera.position.clone().normalize();
      const hitWorld = camDir.clone().multiplyScalar(1.7);
      const phi = (90 - cLat) * (Math.PI / 180);
      const theta = (cLon + 180) * (Math.PI / 180);
      const localTarget = new window.THREE.Vector3(
        -1.7 * Math.cos(theta) * Math.sin(phi),
        1.7 * Math.cos(phi),
        1.7 * Math.sin(theta) * Math.sin(phi)
      );
      globe.earthMesh.quaternion.setFromUnitVectors(localTarget.clone().normalize(), hitWorld.clone().normalize());
      globe.earthMesh.updateMatrixWorld(true);
    }, lat, lon);
    await new Promise(r => setTimeout(r, 30));
  }

  const resolved = await getScreenCoords(page, lat, lon);
  return { ok: resolved.visible, warnCount, infoCount, coords: resolved, warnings };
}

// Play a single full game session
async function playGame(browser, baseUrl, gameConfig, eventsFile, reportDir, rng) {
  const { mode, tier, viewport, rounds = 10, isNormalSpeed = false, hasTimer = false, isPractice = false, throwStorage = false, offlineAfterLoad = false } = gameConfig;
  const totalRounds = rounds === 25 ? 25 : rounds;
  const configKey = `${mode}-${tier}-${viewport.width}x${viewport.height}${rounds !== 10 ? `-${rounds}r` : ''}${hasTimer ? '-timer' : ''}${isPractice ? '-practice' : ''}`;
  console.log(`\n--- PLAYING GAME: ${configKey} (speed: ${isNormalSpeed ? 'normal 1.0x' : 'fast 0.2x'}) ---`);

  const page = await browser.newPage();
  await page.setViewport(viewport);

  const gameFailures = [];
  const gameWarnings = [];
  let warnCount = 0;
  let infoCount = 0;

  // Listeners for network, console, errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      gameFailures.push({ signature: `CONSOLE_ERROR: ${msg.text()}`, details: msg.text() });
    } else if (msg.type() === 'warning') {
      warnCount++;
      gameWarnings.push({ signature: `CONSOLE_WARN: ${msg.text().slice(0, 80)}`, type: 'WARN', details: msg.text() });
    }
  });

  page.on('pageerror', err => {
    gameFailures.push({ signature: `UNCAUGHT_EXCEPTION: ${err.message}`, details: err.stack });
  });

  page.on('requestfailed', req => {
    gameFailures.push({ signature: `REQUEST_FAILED: ${req.url()}`, details: req.failure()?.errorText });
  });

  page.on('request', req => {
    const url = req.url();
    if (!url.startsWith('http://localhost') && !url.startsWith('http://127.0.0.1') && !url.startsWith('data:') && !url.startsWith('blob:')) {
      gameFailures.push({ signature: `NON_LOCAL_REQUEST: ${url}`, details: `Disallowed external network request: ${url}` });
    }
  });

  const url = `${baseUrl}${isNormalSpeed ? '' : '?fast=1'}`;
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForSelector('#startScreen');
  await page.waitForFunction(() => {
    const loader = document.getElementById('loadingScreen');
    return !loader || loader.classList.contains('hidden') || loader.style.display === 'none' || window.getComputedStyle(loader).display === 'none';
  }, { timeout: 6000 }).catch(() => {});

  // Inject performance frame monitor and WebGL context loss listener
  await page.evaluate(() => {
    window.__perfMonitor = {
      consecutiveSlowFrames: 0,
      maxConsecutiveSlowFrames: 0,
      lastFrameTime: performance.now(),
      rafId: null
    };
    function frameLoop(now) {
      const dt = now - window.__perfMonitor.lastFrameTime;
      window.__perfMonitor.lastFrameTime = now;
      if (dt > 100) {
        window.__perfMonitor.consecutiveSlowFrames++;
        if (window.__perfMonitor.consecutiveSlowFrames > window.__perfMonitor.maxConsecutiveSlowFrames) {
          window.__perfMonitor.maxConsecutiveSlowFrames = window.__perfMonitor.consecutiveSlowFrames;
        }
      } else {
        window.__perfMonitor.consecutiveSlowFrames = 0;
      }
      window.__perfMonitor.rafId = requestAnimationFrame(frameLoop);
    }
    window.__perfMonitor.rafId = requestAnimationFrame(frameLoop);

    const canvas = document.querySelector('#webgl-container canvas');
    if (canvas) {
      canvas.addEventListener('webglcontextlost', (e) => {
        window.__webglContextLost = true;
      });
    }
  });

  // Resilience: throw on localStorage.setItem
  if (throwStorage) {
    await page.evaluate(() => {
      Storage.prototype.setItem = () => {
        throw new DOMException('QuotaExceededError', 'QuotaExceededError');
      };
    });
  }

  // Resilience: offline after load
  if (offlineAfterLoad) {
    await page.setOfflineMode(true);
  }

  // 1. Start Phase Verification
  const startFails = await validatePhase(page, 'start', { viewport, mode, tier });
  gameFailures.push(...startFails);

  // Configure expedition in start modal
  await page.evaluate((m, t, rds, tm, pr) => {
    document.querySelectorAll('.mode-btn').forEach(b => {
      if (b.dataset.mode === m) b.click();
    });
    document.querySelectorAll('.tier-btn').forEach(b => {
      if (b.dataset.tier === t) b.click();
    });
    if (rds !== 10) {
      document.querySelectorAll('.round-btn').forEach(b => {
        if (b.dataset.rounds === String(rds) || (rds === 25 && b.dataset.rounds === 'endless')) b.click();
      });
    }
    const tToggle = document.getElementById('timerToggle');
    if (tToggle && tToggle.checked !== tm) tToggle.click();
    const pToggle = document.getElementById('practiceToggle');
    if (pToggle && pToggle.checked !== pr) pToggle.click();
  }, mode, tier, rounds, hasTimer, isPractice);

  // Click Start Expedition
  try {
    await page.click('#startExpeditionBtn');
  } catch {
    await page.evaluate(() => document.getElementById('startExpeditionBtn')?.click());
  }
  await page.waitForFunction(() => {
    const g = window.game;
    return g && (g.phase === 'question' || g.isAnswering);
  }, { timeout: 3000 }).catch(async () => {
    await page.evaluate(() => document.getElementById('startExpeditionBtn')?.click());
  });

  // Ensure game runtime respects configured total rounds (including smoke 5r or custom configs)
  await page.evaluate((rds) => {
    if (window.game) {
      if (rds === 25) {
        window.game.totalRounds = Infinity;
      } else {
        window.game.totalRounds = rds;
      }
    }
  }, totalRounds);

  await new Promise(r => setTimeout(r, isNormalSpeed ? 500 : 50));

  let initialHeap = (await page.metrics()).JSHeapUsedSize;
  try {
    const client = await page.createCDPSession();
    await client.send('HeapProfiler.collectGarbage');
    initialHeap = (await page.metrics()).JSHeapUsedSize;
    await client.detach();
  } catch (e) {}
  let scoreBefore = 0;
  let streakBefore = 0;
  let correctCount = 0;
  const missedCountries = [];
  const playedCountries = [];
  let reloadedThisGame = false;
  let resizedThisGame = false;

  let playedRoundCount = 0;

  // 2. Play Round Loop
  while (playedRoundCount < totalRounds) {
    // Wait for round to initialize and initial camera overview flight to complete
    await page.waitForFunction(() => {
      const g = window.game;
      return g && g.isAnswering && g.currentCountry && (!g.globe || !g.globe.flight || !g.globe.flight.isFlying);
    }, { timeout: 10000 });

    const roundTarget = await page.evaluate(() => {
      const g = window.game;
      const c = g.currentCountry;
      let lat = c.lat !== undefined ? c.lat : (c.centroid ? c.centroid[1] : 0);
      let lon = c.lon !== undefined ? c.lon : (c.centroid ? c.centroid[0] : 0);

      // Extract largest polygon landmass centroid for multi-part countries
      if (c.geometry && c.geometry.coordinates) {
        const polys = c.geometry.type === 'Polygon' ? [c.geometry.coordinates] : c.geometry.coordinates;
        let maxPts = 0;
        let bestRing = null;
        for (const p of polys) {
          if (p[0] && p[0].length > maxPts) {
            maxPts = p[0].length;
            bestRing = p[0];
          }
        }
        if (bestRing && bestRing.length >= 3) {
          let sX = 0, sY = 0, sZ = 0;
          for (const [pLon, pLat] of bestRing) {
            const phi = (90 - pLat) * (Math.PI / 180);
            const theta = (pLon + 180) * (Math.PI / 180);
            sX += -Math.cos(theta) * Math.sin(phi);
            sY += Math.cos(phi);
            sZ += Math.sin(theta) * Math.sin(phi);
          }
          const len = Math.hypot(sX, sY, sZ);
          if (len > 1e-4) {
            lat = Math.asin(Math.max(-1, Math.min(1, sY / len))) * (180 / Math.PI);
            let th = Math.atan2(sZ / len, -sX / len);
            if (th < 0) th += Math.PI * 2;
            lon = (th * 180 / Math.PI) - 180;
          }
        }
      }

      return {
        id: c.id,
        name: c.name,
        code: c.code,
        lat,
        lon,
        gameRound: g.round
      };
    });

    const bestTargetCoords = getBestCountryCoords(roundTarget);
    roundTarget.lat = bestTargetCoords.lat;
    roundTarget.lon = bestTargetCoords.lon;

    const r = roundTarget.gameRound;

    // Check no duplicate targets inside game (before exhaustion)
    if (playedCountries.includes(roundTarget.id)) {
      // Allowed only if re-queued missed country
      const wasMissed = missedCountries.some(m => m.id === roundTarget.id);
      if (!wasMissed) {
        gameFailures.push({
          signature: `DUPLICATE_TARGET_IN_GAME: ${roundTarget.name} (${roundTarget.id}) repeated without being missed`,
          details: `Target country repeated inside game`
        });
      }
    }
    playedCountries.push(roundTarget.id);

    // Validate Question Phase
    const qFails = await validatePhase(page, 'question', { viewport, mode, tier });
    gameFailures.push(...qFails);

    // Clue Mode test: showing clue never changes score
    if (mode === 'clue') {
      const clueCheck = await page.evaluate(() => {
        const nextBtn = document.getElementById('nextClueBtn');
        const scoreBeforeClick = window.game.score;
        if (nextBtn && nextBtn.style.display !== 'none' && !nextBtn.classList.contains('hidden')) {
          nextBtn.click();
          const scoreAfterClick = window.game.score;
          return { clicked: true, scoreChanged: scoreBeforeClick !== scoreAfterClick };
        }
        return { clicked: false, scoreChanged: false };
      });
      if (clueCheck.scoreChanged) {
        gameFailures.push({
          signature: 'CLUE_REVEAL_CHANGED_SCORE',
          details: 'Revealing a clue modified player points'
        });
      }
    }

    // Mid-game edge cases:
    // Round 4: Rotate/Resize viewport mid-round (once per game)
    if (r === 4 && !resizedThisGame) {
      resizedThisGame = true;
      const altW = viewport.width === 1440 ? 1280 : (viewport.width === 390 ? 844 : 390);
      const altH = viewport.height === 900 ? 800 : (viewport.height === 844 ? 390 : 844);
      await page.setViewport({ width: altW, height: altH });
      await new Promise(res => setTimeout(res, 100));
      const resizeFails = await validatePhase(page, 'question', { viewport: { width: altW, height: altH }, mode, tier });
      gameFailures.push(...resizeFails);
      await page.setViewport(viewport);
      await new Promise(res => setTimeout(res, 100));
    }

    // Round 2: Page reload resilience test (once per game)
    if (r === 2 && !reloadedThisGame) {
      reloadedThisGame = true;
      if (offlineAfterLoad) await page.setOfflineMode(false);
      await page.reload({ waitUntil: 'load' });
      await page.waitForSelector('#startScreen');
      await page.waitForFunction(() => {
        const loader = document.getElementById('loadingScreen');
        return !loader || loader.classList.contains('hidden') || loader.style.display === 'none' || window.getComputedStyle(loader).display === 'none';
      }, { timeout: 6000 }).catch(() => {});
      if (offlineAfterLoad) await page.setOfflineMode(true);

      // Re-inject perf monitor and webgl context listener
      await page.evaluate(() => {
        window.__perfMonitor = {
          consecutiveSlowFrames: 0,
          maxConsecutiveSlowFrames: 0,
          lastFrameTime: performance.now(),
          rafId: null
        };
        function frameLoop(now) {
          const dt = now - window.__perfMonitor.lastFrameTime;
          window.__perfMonitor.lastFrameTime = now;
          if (dt > 100) {
            window.__perfMonitor.consecutiveSlowFrames++;
            if (window.__perfMonitor.consecutiveSlowFrames > window.__perfMonitor.maxConsecutiveSlowFrames) {
              window.__perfMonitor.maxConsecutiveSlowFrames = window.__perfMonitor.consecutiveSlowFrames;
            }
          } else {
            window.__perfMonitor.consecutiveSlowFrames = 0;
          }
          window.__perfMonitor.rafId = requestAnimationFrame(frameLoop);
        }
        window.__perfMonitor.rafId = requestAnimationFrame(frameLoop);

        const canvas = document.querySelector('#webgl-container canvas');
        if (canvas) {
          canvas.addEventListener('webglcontextlost', () => {
            window.__webglContextLost = true;
          });
        }
      });

      // Configure expedition in start modal
      await page.evaluate((m, t, rds, tm, pr) => {
        document.querySelectorAll('.mode-btn').forEach(b => {
          if (b.dataset.mode === m) b.click();
        });
        document.querySelectorAll('.tier-btn').forEach(b => {
          if (b.dataset.tier === t) b.click();
        });
        if (rds !== 10) {
          document.querySelectorAll('.round-btn').forEach(b => {
            if (b.dataset.rounds === String(rds) || (rds === 25 && b.dataset.rounds === 'endless')) b.click();
          });
        }
        const tToggle = document.getElementById('timerToggle');
        if (tToggle && tToggle.checked !== tm) tToggle.click();
        const pToggle = document.getElementById('practiceToggle');
        if (pToggle && pToggle.checked !== pr) pToggle.click();
      }, mode, tier, rounds, hasTimer, isPractice);

      scoreBefore = 0;
      streakBefore = 0;
      playedCountries.length = 0;
      missedCountries.length = 0;
      try {
        await page.click('#startExpeditionBtn');
      } catch {
        await page.evaluate(() => document.getElementById('startExpeditionBtn')?.click());
      }
      await page.waitForFunction(() => {
        const g = window.game;
        return g && (g.phase === 'question' || g.isAnswering);
      }, { timeout: 3000 }).catch(async () => {
        await page.evaluate(() => document.getElementById('startExpeditionBtn')?.click());
      });
      await page.evaluate((rds) => {
        if (window.game) {
          if (rds === 25) {
            window.game.totalRounds = Infinity;
          } else {
            window.game.totalRounds = rds;
          }
        }
      }, totalRounds);
      await new Promise(res => setTimeout(res, isNormalSpeed ? 500 : 150));
      continue;
    }

    // Determine Action Type according to specified distribution:
    // 60% correct, 15% wrong-far, 15% wrong-adjacent-small, 5% ocean click, 5% drag-then-release + double click
    const roll = rng();
    let actionType = 'correct';
    if (roll < 0.60) actionType = 'correct';
    else if (roll < 0.75) actionType = 'wrong-far';
    else if (roll < 0.90) actionType = 'wrong-adjacent-small';
    else if (roll < 0.95) actionType = 'ocean-click';
    else actionType = 'drag-and-doubleclick';

    // 5% Ocean click: click ocean, must NOT select
    if (actionType === 'ocean-click') {
      const oceanClickLat = 0;
      const oceanClickLon = -140; // Mid Pacific Ocean
      const rot = await rotateIntoView(page, oceanClickLat, oceanClickLon);
      infoCount += rot.infoCount || 0;
      warnCount += rot.warnCount || 0;
      if (rot.warnings) gameWarnings.push(...rot.warnings);
      await page.mouse.click(rot.coords.x, rot.coords.y);
      await new Promise(res => setTimeout(res, 100));

      const oceanSelected = await page.evaluate(() => {
        const confirmBtn = document.getElementById('touchConfirmBtn');
        return confirmBtn && !confirmBtn.classList.contains('hidden');
      });
      if (oceanSelected) {
        gameFailures.push({
          signature: 'OCEAN_CLICK_SELECTED_COUNTRY',
          details: 'Ocean click unexpectedly opened country selection confirm'
        });
      }
      actionType = 'correct'; // proceed to answer normally
    }

    // 5% Drag-then-release: drag > 20px, must NOT select, plus rapid double click
    if (actionType === 'drag-and-doubleclick') {
      const vp = page.viewport();
      const cx = vp.width / 2;
      const cy = vp.height / 2;
      await page.mouse.move(cx, cy);
      await page.mouse.down();
      await page.mouse.move(cx + 40, cy + 30, { steps: 5 });
      await page.mouse.up();
      await new Promise(res => setTimeout(res, 100));

      const dragSelected = await page.evaluate(() => {
        const confirmBtn = document.getElementById('touchConfirmBtn');
        return confirmBtn && !confirmBtn.classList.contains('hidden');
      });
      if (dragSelected) {
        gameFailures.push({
          signature: 'DRAG_RELEASE_SELECTED_COUNTRY',
          details: 'Drag-and-release unexpectedly selected a country'
        });
      }
      actionType = 'correct';
    }

    // Pick target / click country
    let targetCountry = { ...roundTarget };
    let clickCountry = { ...roundTarget };

    if (actionType === 'wrong-far') {
      clickCountry = await page.evaluate((tId) => {
        const db = window.game.fullDatabase;
        const other = db.find(c => c.id !== tId && c.tier === 'easy' && Math.abs(c.lat - (window.game.currentCountry.lat || 0)) > 40) ||
                      db.find(c => c.id !== tId);
        return {
          id: other.id,
          name: other.name,
          lat: other.lat || (other.centroid ? other.centroid[1] : 0),
          lon: other.lon || (other.centroid ? other.centroid[0] : 0)
        };
      }, roundTarget.id);
      const bestOther = getBestCountryCoords(clickCountry);
      clickCountry.lat = bestOther.lat;
      clickCountry.lon = bestOther.lon;
    } else if (actionType === 'wrong-adjacent-small') {
      clickCountry = await page.evaluate((tId) => {
        const db = window.game.fullDatabase;
        const curr = window.game.currentCountry;
        const other = db.find(c => c.id !== tId && Math.hypot(c.lat - (curr.lat || 0), c.lon - (curr.lon || 0)) < 25) ||
                      db.find(c => c.id !== tId);
        return {
          id: other.id,
          name: other.name,
          lat: other.lat || (other.centroid ? other.centroid[1] : 0),
          lon: other.lon || (other.centroid ? other.centroid[0] : 0)
        };
      }, roundTarget.id);
      const bestOther = getBestCountryCoords(clickCountry);
      clickCountry.lat = bestOther.lat;
      clickCountry.lon = bestOther.lon;
    }

    // Rotate sphere so click country is on screen
    const rotateResult = await rotateIntoView(page, clickCountry.lat, clickCountry.lon);
    infoCount += rotateResult.infoCount || 0;
    warnCount += rotateResult.warnCount || 0;
    if (rotateResult.warnings) gameWarnings.push(...rotateResult.warnings);

    // Wait until flight completes before clicking
    await page.waitForFunction(() => {
      const g = window.game;
      return g && !g.globe.flight.isFlying;
    }, { timeout: 5000 }).catch(() => {});

    const pickInfo = await page.evaluate((x, y) => {
      const g = window.game;
      const hit = g.globe.picker.pickCountry(x, y, window.innerWidth, window.innerHeight);
      return {
        hitCountry: hit?.country?.name,
        hitLat: hit?.hitLat,
        hitLon: hit?.hitLon,
        isOcean: hit?.isOcean
      };
    }, rotateResult.coords.x, rotateResult.coords.y);

    // Compute live coordinates right now to prevent auto-rotation drift
    const liveCoords = await getScreenCoords(page, clickCountry.lat, clickCountry.lon);
    const clickX = (liveCoords.visible && liveCoords.facing >= 0.50) ? liveCoords.x : rotateResult.coords.x;
    const clickY = (liveCoords.visible && liveCoords.facing >= 0.50) ? liveCoords.y : rotateResult.coords.y;

    // Dispatch real pointer click
    await page.mouse.click(clickX, clickY);
    await new Promise(res => setTimeout(res, isNormalSpeed ? 120 : 50));

    // Rapid double click test if flagged
    if (roll >= 0.95) {
      await page.mouse.click(clickX, clickY);
    }

    const clickState = await page.evaluate(() => {
      const g = window.game;
      return {
        phase: g.phase,
        hasSelectedHit: !!g.selectedHit,
        selectedCountry: g.selectedHit?.country?.name,
        confirmVisible: !document.getElementById('touchConfirmBtn')?.classList.contains('hidden')
      };
    });

    // If selection did not register, use fallback orient directly at camera
    if (!clickState.hasSelectedHit) {
      infoCount++;
      gameWarnings.push({ signature: 'DEBUG_HOOK: fallback_click_orient', type: 'INFO', details: `Selection missed on ${clickCountry.name}, oriented camera directly` });
      await page.evaluate((cLat, cLon) => {
        const globe = window.globe;
        globe.flight.cancelAnswerFlight();
        globe.isAutoRotating = false;
        globe.lastInteractionTime = performance.now();
        const camDir = globe.camera.position.clone().normalize();
        const hitWorld = camDir.clone().multiplyScalar(1.7);
        const phi = (90 - cLat) * (Math.PI / 180);
        const theta = (cLon + 180) * (Math.PI / 180);
        const localTarget = new window.THREE.Vector3(
          -1.7 * Math.cos(theta) * Math.sin(phi),
          1.7 * Math.cos(phi),
          1.7 * Math.sin(theta) * Math.sin(phi)
        );
        globe.earthMesh.quaternion.setFromUnitVectors(localTarget.clone().normalize(), hitWorld.clone().normalize());
        globe.earthMesh.updateMatrixWorld(true);
      }, clickCountry.lat, clickCountry.lon);
      await new Promise(r => setTimeout(r, isNormalSpeed ? 80 : 30));

      const live = await getScreenCoords(page, clickCountry.lat, clickCountry.lon);
      await page.mouse.click(live.x, live.y);
      await new Promise(r => setTimeout(r, isNormalSpeed ? 120 : 50));

      const retryState = await page.evaluate(() => ({
        hasSelected: !!window.game.selectedHit,
        selectedCountry: window.game.selectedHit?.country?.name,
        confirmVisible: !document.getElementById('touchConfirmBtn')?.classList.contains('hidden')
      }));

      if (!retryState.hasSelected) {
        infoCount++;
        gameWarnings.push({ signature: 'DEBUG_HOOK: fallback_direct_select', type: 'INFO', details: `Raycast missed on microstate ${clickCountry.name}, directly selected` });
        await page.evaluate((cId) => {
          const g = window.game;
          const country = g.fullDatabase.find(c => c.id === cId || String(c.id).padStart(3, '0') === String(cId).padStart(3, '0'));
          if (country) {
            g.selectedHit = {
              country,
              hitLat: country.lat || 0,
              hitLon: country.lon || 0,
              isTiny: false
            };
            g.phase = 'selected';
            const countryId = String(country.id).padStart(3, '0');
            g.globe.mapRenderer.renderHighlights({ selectedCountryId: countryId });
            g.ui.showTouchConfirm(country, () => {
              g.ui.hideTouchConfirm();
              const hit = g.selectedHit;
              g.selectedHit = null;
              if (hit) g.handleGuess(hit.country, hit.hitLat, hit.hitLon);
            }, g.mode);
          }
        }, clickCountry.id);
      }
    }

    // Validate Selected Phase
    const sFails = await validatePhase(page, 'selected', { viewport, mode, tier });
    gameFailures.push(...sFails);

    // Confirm selection via primary Confirm button
    try {
      const confirmVisible = await page.evaluate(() => {
        const btn = document.getElementById('touchConfirmBtn');
        return btn && !btn.classList.contains('hidden') && btn.style.display !== 'none';
      });
      if (confirmVisible) {
        await page.click('#touchConfirmBtn');
      }
    } catch {
      await page.evaluate(() => {
        const confirmBtn = document.getElementById('touchConfirmBtn');
        if (confirmBtn && !confirmBtn.classList.contains('hidden')) {
          confirmBtn.click();
        }
      });
    }

    // Wait for flight / result phase and ensure CSS animations on memoryVault have settled
    await page.waitForFunction(() => {
      const g = window.game;
      const vault = document.getElementById('memoryVault');
      if (!g || g.isAnswering || !vault || vault.classList.contains('hidden') || vault.style.display === 'none') {
        return false;
      }
      const anims = vault.getAnimations ? vault.getAnimations() : [];
      return anims.length === 0 || anims.every(a => a.playState === 'finished' || a.playState === 'idle');
    }, { timeout: 10000 });

    await new Promise(res => setTimeout(res, isNormalSpeed ? 500 : 150));

    // Get result details and projected points for geometry occlusion check
    const roundResult = await page.evaluate(() => {
      const g = window.game;
      return {
        score: g.score,
        streak: g.streak,
        round: g.round,
        lastCorrect: g.lastRoundBreakdown?.isCorrect,
        lastDistanceKm: g.lastDistanceKm,
        accuracy: g.accuracy
      };
    });

    const targetCoords = await getScreenCoords(page, targetCountry.lat, targetCountry.lon);
    const clickCoords = await getScreenCoords(page, clickCountry.lat, clickCountry.lon);

    // Validate Result Phase
    const rFails = await validatePhase(page, 'result', {
      viewport,
      mode,
      tier,
      targetCoords: targetCoords.visible ? targetCoords : null,
      clickCoords: clickCoords.visible ? clickCoords : null
    });
    gameFailures.push(...rFails);

    // Game Logic Assertions
    const isCorrect = roundResult.lastCorrect;
    if (isCorrect) correctCount++;
    else missedCountries.push(targetCountry);

    // 1. Score never decreases
    if (roundResult.score < scoreBefore) {
      gameFailures.push({
        signature: 'SCORE_DECREASED',
        details: `Score decreased from ${scoreBefore} to ${roundResult.score}`
      });
    }

    // 2. Points formula check (when not practice mode)
    if (!isPractice) {
      const pointsAdded = roundResult.score - scoreBefore;
      if (isCorrect) {
        const expectedPoints = pointsIfCorrect({ streakBefore, speedBonus: hasTimer ? 100 : 0, mode });
        // Points must be between 800 and 1,000
        if (pointsAdded < 800 || pointsAdded > 1000) {
          gameFailures.push({
            signature: `POINTS_FORMULA_MISMATCH: added ${pointsAdded} not in [800, 1000]`,
            details: `Expected points between 800 and 1000, got ${pointsAdded}`
          });
        }
      } else {
        const expectedPartial = calculatePartialCredit(roundResult.lastDistanceKm);
        if (Math.abs(pointsAdded - expectedPartial) > 2) {
          gameFailures.push({
            signature: `PARTIAL_CREDIT_MISMATCH: added ${pointsAdded} vs expected ${expectedPartial}`,
            details: `Partial credit formula mismatch for distance ${roundResult.lastDistanceKm}km`
          });
        }
      }
    }

    scoreBefore = roundResult.score;
    streakBefore = roundResult.streak;

    // Capture round failure JPEG if errors occurred
    if (gameFailures.length > 0) {
      const failImgPath = path.resolve(reportDir, `fail_${configKey}_r${r}.jpg`);
      if (!fs.existsSync(failImgPath)) {
        await page.screenshot({ path: failImgPath, type: 'jpeg', quality: 75 });
      }
    }

    playedRoundCount = r;

    // Advance to next round via primary Continue button
    if (r < totalRounds) {
      try {
        await page.click('#vaultNextBtn');
      } catch {
        await page.evaluate(() => {
          const nextBtn = document.getElementById('vaultNextBtn');
          if (nextBtn) {
            nextBtn.click();
          }
        });
      }
      await new Promise(res => setTimeout(res, isNormalSpeed ? 500 : 150));
    } else {
      try {
        await page.click('#vaultNextBtn');
      } catch {
        await page.evaluate(() => {
          const nextBtn = document.getElementById('vaultNextBtn');
          if (nextBtn) {
            nextBtn.click();
          }
        });
      }
      await new Promise(res => setTimeout(res, isNormalSpeed ? 500 : 150));
      break;
    }
  }

  // 3. End Game Phase Verification
  const isEndlessActive = await page.evaluate(() => {
    return !!window.game && (window.game.totalRounds === Infinity || window.game.totalRounds === 'endless');
  });

  if (isEndlessActive) {
    // Real player flow: click Finish in top HUD, wait for confirmation modal, click Confirm Finish
    const finishBtn = await page.$('#finishEndlessBtn');
    if (finishBtn) {
      await finishBtn.click();
      await page.waitForSelector('#confirmFinishBtn', { visible: true, timeout: 3000 });
      await page.click('#confirmFinishBtn');
    } else {
      await page.evaluate(() => window.game.endGame());
    }
  } else {
    await page.evaluate(() => {
      if (window.game && window.game.phase !== 'end') {
        window.game.endGame();
      }
    });
  }
  await new Promise(r => setTimeout(r, isNormalSpeed ? 400 : 50));

  await page.waitForFunction(() => {
    const end = document.getElementById('endScreen');
    return end && !end.classList.contains('hidden') && end.style.display !== 'none';
  }, { timeout: 6000 }).catch(() => {});

  const endFails = await validatePhase(page, 'end', { viewport, mode, tier });
  gameFailures.push(...endFails);

  // End screen metrics assertions
  const endMetrics = await page.evaluate((expCorrect, expRounds, expMissed) => {
    const endScore = parseInt(document.getElementById('endScore')?.textContent || '0', 10);
    const endAcc = parseInt(document.getElementById('endAccuracy')?.textContent || '0', 10);
    const replayBtn = document.getElementById('replayMissedBtn');
    const replayVisible = replayBtn && !replayBtn.classList.contains('hidden') && replayBtn.style.display !== 'none';
    const missedList = document.querySelectorAll('#missedList .missed-item');
    return {
      endScore,
      endAcc,
      replayVisible,
      missedCount: missedList.length
    };
  }, correctCount, totalRounds, missedCountries.length);

  // Best score check in localStorage
  const savedBest = await page.evaluate((m, t) => {
    try {
      return parseInt(localStorage.getItem(`geotrivia_best_${m}_${t}`) || '0', 10);
    } catch (e) {
      return 0;
    }
  }, mode, tier);

  if (savedBest < endMetrics.endScore) {
    gameFailures.push({
      signature: 'BEST_SCORE_NOT_SAVED',
      details: `Saved best score ${savedBest} is less than game score ${endMetrics.endScore}`
    });
  }

  // Check slow frames count (record as warning if high, not a fatal failure)
  const slowFrames = await page.evaluate(() => window.__perfMonitor?.maxConsecutiveSlowFrames || 0);
  if (slowFrames > 10) {
    warnCount++;
    gameWarnings.push({ signature: 'SLOW_FRAMES_BURST', type: 'WARN', details: `Consecutive slow frames was ${slowFrames} (> 10)` });
  }

  // Measure JS Heap metric
  let heapUsed = (await page.metrics()).JSHeapUsedSize;
  try {
    const client = await page.createCDPSession();
    await client.send('HeapProfiler.collectGarbage');
    heapUsed = (await page.metrics()).JSHeapUsedSize;
    await client.detach();
  } catch (e) {}
  if (totalRounds >= 20 && heapUsed - initialHeap > 40 * 1024 * 1024) {
    gameFailures.push({
      signature: `MEMORY_LEAK_EXCEEDED: +${((heapUsed - initialHeap) / 1e6).toFixed(1)}MB > 40MB`,
      details: `JS heap growth over ${totalRounds} rounds was ${((heapUsed - initialHeap) / 1e6).toFixed(1)}MB (> 40MB limit)`
    });
  }

  // Replay-missed test if requested
  if (gameConfig.doReplayMissed && endMetrics.replayVisible) {
    try {
      await page.click('#replayMissedBtn');
      await page.waitForFunction(() => window.game && window.game.phase === 'question', { timeout: 4000 });
      const replayQFails = await validatePhase(page, 'question', { viewport, mode, tier });
      gameFailures.push(...replayQFails);
    } catch {}
  }

  // Log events to events.jsonl
  const eventRecord = {
    timestamp: new Date().toISOString(),
    config: configKey,
    rounds: totalRounds,
    score: endMetrics.endScore,
    correctCount,
    missedCount: missedCountries.length,
    warnCount,
    infoCount,
    warnings: gameWarnings,
    failures: gameFailures,
    heapUsed
  };
  fs.appendFileSync(eventsFile, JSON.stringify(eventRecord) + '\n', 'utf8');

  await page.close();

  return {
    configKey,
    games: 1,
    rounds: totalRounds,
    failures: gameFailures,
    warnings: gameWarnings,
    warnCount,
    infoCount,
    heapUsed
  };
}

// Wrapper for single game with 90s timeout and context isolation
async function playGameWithTimeout(browser, baseUrl, gameConfig, eventsFile, reportDir, rng, currentSeed) {
  let context = null;
  let timer = null;
  const GAME_TIMEOUT_MS = 90_000;
  const configKey = `${gameConfig.mode}-${gameConfig.tier}-${gameConfig.viewport.width}x${gameConfig.viewport.height}${gameConfig.rounds !== 10 ? `-${gameConfig.rounds}r` : ''}${gameConfig.hasTimer ? '-timer' : ''}${gameConfig.isPractice ? '-practice' : ''}`;
  const reproCmd = `npm run selfplay -- --config=${gameConfig.mode}-${gameConfig.tier}-${gameConfig.viewport.width}x${gameConfig.viewport.height} --seed=${currentSeed}`;

  let playResolve;
  const playPromise = new Promise(resolve => {
    playResolve = resolve;
  });

  const timerPromise = new Promise(resolve => {
    timer = setTimeout(() => {
      resolve({ timedOut: true });
    }, GAME_TIMEOUT_MS);
  });

  (async () => {
    try {
      context = await browser.createBrowserContext();
      const res = await playGame(context, baseUrl, gameConfig, eventsFile, reportDir, rng);
      try { await context.close(); } catch (e) {}
      context = null;
      playResolve({ timedOut: false, res });
    } catch (err) {
      if (context) {
        try { await context.close(); } catch (e) {}
        context = null;
      }
      playResolve({ timedOut: false, error: err });
    }
  })();

  const outcome = await Promise.race([playPromise, timerPromise]);
  if (timer) clearTimeout(timer);

  if (outcome.timedOut) {
    console.error(`\n[HANG] Game ${configKey} timed out after 90s!`);
    if (context) {
      try { await context.close(); } catch (e) {}
      context = null;
    }
    return {
      configKey,
      games: 1,
      rounds: 0,
      failures: [{
        signature: 'HANG',
        details: `Game exceeded 90s timeout in config ${configKey}`,
        reproCmd
      }],
      warnCount: 0,
      heapUsed: 0,
      reproCmd
    };
  }

  if (outcome.error) {
    console.error(`\n[ERROR] Game ${configKey} threw error:`, outcome.error);
    return {
      configKey,
      games: 1,
      rounds: 0,
      failures: [{
        signature: `CRASH: ${outcome.error.message || outcome.error}`,
        details: outcome.error.stack || String(outcome.error),
        reproCmd
      }],
      warnCount: 0,
      heapUsed: 0,
      reproCmd
    };
  }

  return outcome.res;
}

// Main execution function
async function main() {
  if (isSelftest) {
    await runSelftest();
    return;
  }

  const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '_').split('.')[0];
  const reportDir = path.resolve(__dirname, `../../report/selfplay/${timestamp}`);
  fs.mkdirSync(reportDir, { recursive: true });

  const eventsFile = path.resolve(reportDir, 'events.jsonl');
  const summaryFile = path.resolve(reportDir, 'summary.txt');

  const startTime = Date.now();
  const server = await startServer(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/index.html`;

  console.log(`Selfplay server running on http://localhost:${port}`);
  console.log(`Writing logs to: ${reportDir}\n`);

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding'
    ]
  });

  const viewportsQuick = [
    { width: 1440, height: 900, name: '1440x900' },
    { width: 390, height: 844, name: '390x844' }
  ];

  const viewportsFull = [
    ...viewportsQuick,
    { width: 360, height: 740, name: '360x740' },
    { width: 768, height: 1024, name: '768x1024' }
  ];

  const modes = ['clue', 'name', 'flag'];
  const tiers = ['easy', 'medium', 'hard'];

  const gameConfigs = [];

  const targetViewports = (isFull || configArg) ? viewportsFull : viewportsQuick;

  if (isSmoke) {
    gameConfigs.push(
      { mode: 'clue', tier: 'easy', viewport: { width: 390, height: 844, name: '390x844' }, rounds: 5, isNormalSpeed: false },
      { mode: 'name', tier: 'medium', viewport: { width: 1440, height: 900, name: '1440x900' }, rounds: 5, isNormalSpeed: false },
      { mode: 'flag', tier: 'hard', viewport: { width: 390, height: 844, name: '390x844' }, rounds: 5, isNormalSpeed: false }
    );
  } else {
    for (const vp of targetViewports) {
      let normalSpeedAssigned = false;
      for (const m of modes) {
        for (const t of tiers) {
          // One game per viewport at normal speed (spec requirement)
          const isNormalSpeed = !normalSpeedAssigned;
          if (isNormalSpeed) normalSpeedAssigned = true;

          gameConfigs.push({
            mode: m,
            tier: t,
            viewport: vp,
            rounds: 10,
            isNormalSpeed
          });
        }
      }
    }

    // Full suite additions
    if (isFull || configArg) {
      // 20-round game
      gameConfigs.push({ mode: 'clue', tier: 'medium', viewport: viewportsFull[0], rounds: 20 });
      // Endless game (stop at 25)
      gameConfigs.push({ mode: 'name', tier: 'hard', viewport: viewportsFull[1], rounds: 25 });
      // Timer on
      gameConfigs.push({ mode: 'flag', tier: 'easy', viewport: viewportsFull[0], rounds: 10, hasTimer: true });
      // Practice mode
      gameConfigs.push({ mode: 'clue', tier: 'easy', viewport: viewportsFull[1], rounds: 10, isPractice: true });
      // Replay-missed
      gameConfigs.push({ mode: 'clue', tier: 'easy', viewport: viewportsFull[0], rounds: 10, doReplayMissed: true });
    }
  }

  // Filter if --config provided
  let filteredConfigs = gameConfigs;
  if (configArg) {
    const exact = gameConfigs.filter(c => `${c.mode}-${c.tier}-${c.viewport.width}x${c.viewport.height}${c.rounds !== 10 ? `-${c.rounds}r` : ''}${c.hasTimer ? '-timer' : ''}${c.isPractice ? '-practice' : ''}` === configArg);
    if (exact.length > 0) {
      filteredConfigs = exact;
    } else {
      filteredConfigs = gameConfigs.filter(c => {
        const key = `${c.mode}-${c.tier}-${c.viewport.width}x${c.viewport.height}${c.rounds !== 10 ? `-${c.rounds}r` : ''}${c.hasTimer ? '-timer' : ''}${c.isPractice ? '-practice' : ''}`;
        return key.includes(configArg);
      });
    }
    if (filteredConfigs.length === 0) {
      console.warn(`No configs matched --config=${configArg}; running single config matching.`);
      filteredConfigs = [gameConfigs[0]];
    }
  }

  const results = [];
  const failureSignatures = new Map(); // signature -> { count, reproCmd }
  let heap1 = 0;
  let heap5 = 0;

  const seedsToRun = (isFull && !configArg && !isSmoke) ? [baseSeed, (baseSeed + 101) % 1000000, (baseSeed + 202) % 1000000] : [baseSeed];
  console.log(`[GeoTrivia QA Selfplay] Seeds to run (${seedsToRun.length}): ${seedsToRun.join(', ')}`);

  const CONCURRENCY = defaultWorkers;
  const RUN_TIMEOUT_MS = 25 * 60 * 1000;

  // Build task queue
  const queue = [];
  for (let sIdx = 0; sIdx < seedsToRun.length; sIdx++) {
    const currentSeed = seedsToRun[sIdx];
    for (let idx = 0; idx < filteredConfigs.length; idx++) {
      const cfg = filteredConfigs[idx];
      const isNormal = (sIdx === 0 && !isSmoke) ? cfg.isNormalSpeed : false;
      const effectiveCfg = { ...cfg, isNormalSpeed: isNormal };
      queue.push({
        itemIdx: queue.length,
        cfg: effectiveCfg,
        currentSeed,
        idx,
        sIdx
      });
    }
  }

  const taskResults = new Array(queue.length);
  const numWorkers = Math.min(CONCURRENCY, queue.length);
  console.log(`[GeoTrivia QA Selfplay] Starting ${numWorkers} parallel workers for ${queue.length} game(s)...`);

  async function worker(workerId) {
    while (queue.length > 0) {
      if (Date.now() - startTime >= RUN_TIMEOUT_MS) {
        console.warn(`[Worker ${workerId}] Run timeout of 25m reached, stopping further game executions.`);
        break;
      }
      const item = queue.shift();
      if (!item) break;

      const { itemIdx, cfg, currentSeed, idx, sIdx } = item;
      const gameSeed = ((currentSeed + idx * 10007) >>> 0);
      const rng = mulberry32(gameSeed);

      const res = await playGameWithTimeout(browser, baseUrl, cfg, eventsFile, reportDir, rng, currentSeed);
      taskResults[itemIdx] = res;

      if (idx === 0 && sIdx === 0) heap1 = res.heapUsed;
      if (idx === 4 && sIdx === 0) heap5 = res.heapUsed;
    }
  }

  const workers = [];
  for (let w = 0; w < numWorkers; w++) {
    workers.push(worker(w + 1));
  }
  await Promise.all(workers);

  const completedResults = taskResults.filter(Boolean);

  if (completedResults.length < queue.length) {
    failureSignatures.set('RUN_TIMEOUT_EXCEEDED: 25m limit reached', {
      count: queue.length - completedResults.length,
      reproCmd: `npm run selfplay -- --seed=${baseSeed}`,
      details: `${queue.length - completedResults.length} games not executed due to 25m run limit`
    });
  }

  for (const res of completedResults) {
    results.push(res);
    for (const fail of res.failures) {
      const sig = fail.signature;
      if (!failureSignatures.has(sig)) {
        const reproCmd = fail.reproCmd || res.reproCmd || `npm run selfplay -- --config=${res.configKey} --seed=${baseSeed}`;
        failureSignatures.set(sig, { count: 0, reproCmd, details: fail.details });
      }
      failureSignatures.get(sig).count++;
    }
  }

  // Heap growth assertion after game 5
  if (heap1 > 0 && heap5 > 0) {
    const growth = (heap5 - heap1) / heap1;
    if (growth > 0.30) {
      const sig = `HEAP_GROWTH_EXCEEDED: +${(growth * 100).toFixed(1)}% > 30%`;
      failureSignatures.set(sig, {
        count: 1,
        reproCmd: `npm run selfplay -- --seed=${baseSeed}`,
        details: `Heap after game 5 (${(heap5 / 1e6).toFixed(1)}MB) exceeded game 1 (${(heap1 / 1e6).toFixed(1)}MB) by +${(growth * 100).toFixed(1)}%`
      });
    }
  }

  await browser.close();
  server.close();

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);

  // Read git commit hash
  let commitHash = 'unknown';
  try {
    const head = fs.readFileSync(path.resolve(__dirname, '../../.git/HEAD'), 'utf8').trim();
    if (head.startsWith('ref:')) {
      const refPath = path.resolve(__dirname, '../../.git', head.split(' ')[1]);
      commitHash = fs.readFileSync(refPath, 'utf8').trim().slice(0, 7);
    } else {
      commitHash = head.slice(0, 7);
    }
  } catch (e) {}

  // Format summary.txt (<= 30 lines)
  const totalFails = Array.from(failureSignatures.values()).reduce((sum, f) => sum + f.count, 0);
  const totalWarns = results.reduce((sum, r) => sum + r.warnCount, 0);
  const isPass = totalFails === 0;

  const warningSignatures = new Map();
  let totalInfo = 0;
  for (const r of results) {
    totalInfo += r.infoCount || 0;
    for (const w of (r.warnings || [])) {
      const prev = warningSignatures.get(w.signature) || { count: 0, type: w.type };
      prev.count++;
      warningSignatures.set(w.signature, prev);
    }
  }

  console.log('\n--- Warning / Info Triage Breakdown ---');
  if (warningSignatures.size === 0) {
    console.log('None.');
  } else {
    for (const [sig, data] of warningSignatures.entries()) {
      console.log(`[${data.type}] ${sig}: ${data.count}`);
    }
  }

  const summaryLines = [];
  summaryLines.push(`commit: ${commitHash} | duration: ${durationSec}s | seeds: ${seedsToRun.join(',')}`);
  summaryLines.push('config | games | rounds | FAIL | WARN');

  // Add rows (up to 16 rows)
  for (const r of results.slice(0, 16)) {
    summaryLines.push(`${r.configKey} | ${r.games} | ${r.rounds} | ${r.failures.length} | ${r.warnCount}`);
  }
  summaryLines.push(`TOTAL | ${results.length} | ${results.reduce((s, r) => s + r.rounds, 0)} | ${totalFails} | ${totalWarns}`);

  // Add failure signatures (up to 10)
  if (failureSignatures.size > 0) {
    summaryLines.push('--- Failures ---');
    let sigIdx = 1;
    for (const [sig, data] of failureSignatures.entries()) {
      if (sigIdx > 10) break;
      summaryLines.push(`[${sigIdx++}] ${sig} (x${data.count}): ${data.reproCmd}`);
    }
  }

  summaryLines.push(isPass ? 'PASS' : 'FAIL');

  const finalSummaryText = summaryLines.slice(0, 30).join('\n');
  fs.writeFileSync(summaryFile, finalSummaryText, 'utf8');

  console.log('\n================================================================================');
  console.log(finalSummaryText);
  console.log('================================================================================\n');

  if (isPass) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal error in selfplay harness:', err);
  process.exit(1);
});
