import * as THREE from 'three';
import { WORLD_COUNTRIES } from '../data/world-50m.js';
import { COUNTRIES_DB } from '../data/countries.js';
import {
  distanceToCountryWithNearest,
  planCloseWrongFlight,
  latLonToVector3,
  getLargestLandmassBox,
  getLargestLandmassCornerDirs
} from '../src/frame_union.js';
import { FLIGHT, limitLatitude, greatCircle } from '../src/cameraFlight.js';

console.log('================================================================================');
console.log('        MID-RANGE MISSES CAMERA FRAMING TESTS (DESKTOP & MOBILE)                ');
console.log('================================================================================\n');

const SEP_DEG_THRESHOLD = 25;
console.log(`sepDeg threshold used: ${SEP_DEG_THRESHOLD}° (spec: 25)\n`);

const cases = [
  { name: 'Spain -> Morocco', guessCode: 'ESP', targetCode: 'MAR', targetId: '504' },
  { name: 'France -> Italy', guessCode: 'FRA', targetCode: 'ITA', targetId: '380' },
  { name: 'Kenya -> Ethiopia', guessCode: 'KEN', targetCode: 'ETH', targetId: '231' },
  { name: 'Thailand -> Vietnam', guessCode: 'THA', targetCode: 'VNM', targetId: '704' },
  { name: 'Argentina -> Chile', guessCode: 'ARG', targetCode: 'CHL', targetId: '152' },
  { name: 'Greece -> Turkey', guessCode: 'GRC', targetCode: 'TUR', targetId: '792' },
];

const viewports = [
  { name: 'Desktop (1440x900)', W: 1440, H: 900, freeRect: { x: 0, y: 64, w: 1440 - 340, h: 900 - 64 } },
  { name: 'Mobile (390x844)', W: 390, H: 844, freeRect: { x: 0, y: 64, w: 390, h: 844 - 64 - 844 * 0.30 } }
];

let allPassed = true;

for (const vp of viewports) {
  console.log(`--- VIEWPORT: ${vp.name} ---`);
  console.log('| Case                  | Distance | Final Dist | Equals minD | Min Margin | Max Step | Status |');
  console.log('|-----------------------|----------|------------|-------------|------------|----------|--------|');

  const camera = new THREE.PerspectiveCamera(45, vp.W / vp.H, 0.1, 1000);
  const renderer = { domElement: { clientWidth: vp.W, clientHeight: vp.H } };
  const minD = 2.52;
  const maxD = 5.5;

  for (const tc of cases) {
    const guessDb = COUNTRIES_DB.find(c => c.code === tc.guessCode);
    const targetDb = COUNTRIES_DB.find(c => c.code === tc.targetCode);
    const targetWc = WORLD_COUNTRIES.find(c => String(c.id).padStart(3, '0') === String(tc.targetId).padStart(3, '0'));

    const clickLat = guessDb.lat;
    const clickLon = guessDb.lon;
    const { km: distanceKm, nearestLatLon } = distanceToCountryWithNearest(clickLat, clickLon, targetWc.geometry);

    const clickDir = latLonToVector3(clickLat, clickLon, 1.0).normalize();
    const nearestDir = latLonToVector3(nearestLatLon.lat, nearestLatLon.lon, 1.0).normalize();
    const cornerDirs = getLargestLandmassCornerDirs(targetWc);

    const plan = planCloseWrongFlight({
      clickDir,
      nearestDir,
      cornerDirs,
      camera,
      renderer,
      freeRect: vp.freeRect,
      R: 1.7,
      minD,
      maxD
    });

    if (!plan) {
      console.log(`| ${tc.name.padEnd(21)} | ${String(Math.round(distanceKm)).padStart(5)} km | NULL       | false       | N/A        | N/A      | FAIL   |`);
      allPassed = false;
      continue;
    }

    const bbox = getLargestLandmassBox(targetWc);
    const c1 = latLonToVector3(bbox.minLat, bbox.minLon, 1.7);
    const c2 = latLonToVector3(bbox.minLat, bbox.maxLon, 1.7);
    const c3 = latLonToVector3(bbox.maxLat, bbox.minLon, 1.7);
    const c4 = latLonToVector3(bbox.maxLat, bbox.maxLon, 1.7);
    const pClick = latLonToVector3(clickLat, clickLon, 1.7);
    const pNear = latLonToVector3(nearestLatLon.lat, nearestLatLon.lon, 1.7);

    // Set camera up for projected check
    const cam = camera.clone();
    cam.aspect = vp.W / vp.H;
    cam.updateProjectionMatrix();
    cam.position.copy(plan.endDir).multiplyScalar(plan.endDist);
    cam.up.set(0, 1, 0);
    cam.setViewOffset(vp.W, vp.H, -plan.viewShift.dx, -plan.viewShift.dy, vp.W, vp.H);
    cam.lookAt(0, 0, 0);
    cam.updateMatrixWorld(true);

    let smallestMargin = Infinity;
    const checkPts = [pClick, pNear, c1, c2, c3, c4];
    for (const pt of checkPts) {
      const proj = pt.clone().project(cam);
      const sx = (proj.x * 0.5 + 0.5) * vp.W;
      const sy = (-proj.y * 0.5 + 0.5) * vp.H;
      const mLeft = sx - vp.freeRect.x;
      const mRight = vp.freeRect.x + vp.freeRect.w - sx;
      const mTop = sy - vp.freeRect.y;
      const mBottom = vp.freeRect.y + vp.freeRect.h - sy;
      const m = Math.min(mLeft, mRight, mTop, mBottom);
      if (m < smallestMargin) smallestMargin = m;
    }

    // Per-frame step simulation
    const startDir = clickDir.clone();
    const endDir = limitLatitude(plan.endDir.clone().normalize());
    const angle = (THREE.MathUtils.radToDeg(Math.acos(THREE.MathUtils.clamp(startDir.dot(endDir), -1, 1))));
    const minDurForAngle = Math.ceil((angle / 3.0) * 16.6);
    const dur = THREE.MathUtils.clamp(Math.max(FLIGHT.minMs + angle * FLIGHT.msPerDeg, minDurForAngle), FLIGHT.minMs, FLIGHT.maxMs);
    const frames = Math.ceil(dur / 16.6);
    let maxStep = 0;
    let prev = startDir.clone();
    for (let f = 1; f <= frames; f++) {
      const t = f / frames;
      const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      const cur = new THREE.Vector3();
      greatCircle(startDir, endDir, ease, cur).normalize();
      limitLatitude(cur);
      const step = THREE.MathUtils.radToDeg(Math.acos(THREE.MathUtils.clamp(prev.dot(cur), -1, 1)));
      if (step > maxStep) maxStep = step;
      prev.copy(cur);
    }

    const equalsMin = Math.abs(plan.endDist - minD) < 0.001;
    const pass = smallestMargin >= 24.0 && maxStep <= 4.0;
    if (!pass) allPassed = false;

    console.log(
      `| ${tc.name.padEnd(21)} | ${(String(Math.round(distanceKm)) + ' km').padEnd(8)} | ${plan.endDist.toFixed(2).padEnd(10)} | ${String(equalsMin).padEnd(11)} | ${(smallestMargin.toFixed(1) + ' px').padEnd(10)} | ${(maxStep.toFixed(2) + '°').padEnd(8)} | ${pass ? 'PASS' : 'FAIL'}   |`
    );
  }
  console.log('--------------------------------------------------------------------------------\n');
}

if (!allPassed) {
  console.error('✗ Some framing tests failed margin >= 24px constraint');
  process.exit(1);
} else {
  console.log('✓ All 6 mid-range miss cases passed margin >= 24px constraint on Desktop and Mobile.');
  process.exit(0);
}
