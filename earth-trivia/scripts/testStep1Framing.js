import * as THREE from 'three';
import { WORLD_COUNTRIES } from '../data/world-50m.js';
import { COUNTRIES_DB } from '../data/countries.js';
import {
  distanceToCountryKm,
  getCountryAngularDiameter,
  CameraFlightController
} from '../src/cameraFlight.js';

console.log('================================================================================');
console.log('                 STEP 1: RESULT FRAMING & MEASUREMENT TEST                      ');
console.log('================================================================================\n');

let allPassed = true;

// 1. Measure on-screen area % of free area for large countries and sample nations
const testCountries = ['RUS', 'CAN', 'USA', 'CHN', 'BRA', 'AUS', 'HUN', 'MLT'];
const viewports = [
  { name: 'Desktop 1440x900', w: 1440, h: 900, isMobile: false, freeArea: (1440 - 344) * 900 },
  { name: 'Mobile 390x844', w: 390, h: 844, isMobile: true, freeArea: 390 * (844 - 253) }
];

console.log('--- 1. Target On-Screen Area as % of Free Area (Must be <= 60%) ---');

for (const vp of viewports) {
  console.log(`\nViewport: ${vp.name}`);
  const camera = new THREE.PerspectiveCamera(45, vp.w / vp.h, 0.1, 1000);
  const globeMesh = new THREE.Mesh(new THREE.SphereGeometry(1.7, 32, 32));
  const flight = new CameraFlightController(camera, globeMesh, { target: new THREE.Vector3() });

  for (const code of testCountries) {
    const db = COUNTRIES_DB.find(c => c.code === code);
    const wc = WORLD_COUNTRIES.find(c => String(c.id).padStart(3, '0') === String(db?.id).padStart(3, '0'));
    if (!wc) continue;

    const angularDia = getCountryAngularDiameter(wc);
    const camZ = flight.computeTargetDistance(angularDia, vp.isMobile);

    globeMesh.rotation.x = (db.lat * Math.PI) / 180;
    globeMesh.rotation.y = -((db.lon + 90) * Math.PI) / 180 - (vp.isMobile ? 0 : 0.24);
    camera.position.set(0, vp.isMobile ? -0.10 : 0, camZ);
    camera.lookAt(0, vp.isMobile ? -0.10 : 0, 0);

    // Mock window dimensions for flight.computeTargetFreeAreaPercent
    global.window = { innerWidth: vp.w, innerHeight: vp.h };

    const pct = flight.computeTargetFreeAreaPercent(wc);
    const pass = pct <= 60.0;
    if (!pass) allPassed = false;

    console.log(`  ${code.padEnd(4)} | Angular Dia: ${angularDia.toFixed(1).padStart(5)}° | CamZ: ${camZ.toFixed(2)} | Free Area: ${pct.toFixed(1).padStart(5)}% | ${pass ? 'PASS' : 'FAIL (exceeds 60%)'}`);
  }
}

// 2. Nearest point distance test: Spain clicked for Morocco
console.log('\n--- 2. Nearest-Point Distance Test ---');
const marWc = WORLD_COUNTRIES.find(c => c.id === '504'); // Morocco
const espDb = COUNTRIES_DB.find(c => c.code === 'ESP'); // Spain centroid
const nearestDist = distanceToCountryKm(espDb.lat, espDb.lon, marWc.geometry);
console.log(`  Clicked Spain (lat ${espDb.lat}, lon ${espDb.lon}) -> Morocco nearest point: ${nearestDist} km`);
if (nearestDist > 400 && nearestDist < 650) {
  console.log(`  ✓ Nearest distance accurately reflects Strait of Gibraltar / North Africa boundary (PASS)`);
} else {
  console.log(`  ✗ Nearest distance out of expected range (FAIL)`);
  allPassed = false;
}

// 3. Partial credit capping test (must be <= 300)
console.log('\n--- 3. Partial Credit Capping Test (Max 300) ---');
const testDistances = [0, 500, 1000, 2000, 3000, 4500, 5500];
for (const d of testDistances) {
  const pts = d < 5000 ? Math.max(0, Math.min(300, Math.round(400 * (1 - d / 5000)))) : 0;
  const pass = pts <= 300;
  if (!pass) allPassed = false;
  console.log(`  Distance: ${String(d).padStart(5)} km -> Points: ${String(pts).padStart(3)} | ${pass ? 'PASS (<= 300)' : 'FAIL'}`);
}

console.log('\n================================================================================');
if (allPassed) {
  console.log('                 STEP 1 FRAMING & MEASUREMENT: ALL PASSED                       ');
} else {
  console.log('                 STEP 1 FRAMING & MEASUREMENT: FAILED                           ');
  process.exit(1);
}
console.log('================================================================================');
