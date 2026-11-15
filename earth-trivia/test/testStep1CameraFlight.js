import * as THREE from 'three';
import { FLIGHT, greatCircle, limitLatitude } from '../src/cameraFlight.js';

const { clamp, lerp, degToRad, radToDeg } = THREE.MathUtils;
const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function simulateFlightWithSamples(startDirUnit, targetDirUnit, startDist, fitDistance, wasCorrect, targetHiddenByUi = false) {
  const stayPut = wasCorrect && !targetHiddenByUi;
  const startDir = startDirUnit.clone().normalize();
  const endDir = stayPut ? startDir.clone() : limitLatitude(targetDirUnit.clone().normalize());
  const endDist = wasCorrect ? startDist * FLIGHT.zoomOutCorrect : fitDistance * FLIGHT.zoomOutWrong;

  const gcAngleDeg = radToDeg(Math.acos(clamp(startDir.dot(endDir), -1, 1)));
  const dur = stayPut ? 650 : clamp(FLIGHT.minMs + gcAngleDeg * FLIGHT.msPerDeg, FLIGHT.minMs, FLIGHT.maxMs);
  const bump = stayPut ? 0 : Math.min(FLIGHT.maxBump, gcAngleDeg * FLIGHT.bumpPerDeg);
  const hold = wasCorrect ? 0 : FLIGHT.holdMs;

  let prevDir = startDir.clone();
  let maxStepDeg = 0;
  let totalPathDeg = 0;
  let finalDist = startDist;
  let finalDir = startDir.clone();
  const dir = new THREE.Vector3();

  const dt = 16.666; // 60 FPS
  const totalSimTime = hold + dur;

  for (let now = 0; now <= totalSimTime + 1e-3; now += dt) {
    const raw = clamp((now - hold) / dur, 0, 1);
    const e = easeInOutCubic(raw);
    greatCircle(startDir, endDir, e, dir).normalize();
    limitLatitude(dir);

    const stepDeg = radToDeg(Math.acos(clamp(prevDir.dot(dir), -1, 1)));
    if (stepDeg > maxStepDeg) maxStepDeg = stepDeg;
    totalPathDeg += stepDeg;
    prevDir.copy(dir);

    finalDist = lerp(startDist, endDist, e) + bump * Math.sin(Math.PI * raw);
    finalDir.copy(dir);
  }

  const finalAngleErr = radToDeg(Math.acos(clamp(finalDir.dot(endDir), -1, 1)));
  const distErrPct = Math.abs(finalDist - endDist) / endDist * 100;
  const pathRatio = totalPathDeg / (gcAngleDeg || 1);

  return {
    gcAngleDeg,
    dur,
    maxStepDeg,
    totalPathDeg,
    pathRatio,
    finalAngleErr,
    distErrPct,
    finalDist,
    expectedDist: endDist
  };
}

console.log('================================================================================');
console.log('         STEP 1: CAMERA AFTER ANSWER UNIT TESTS & ONPROGRESS VERIFICATION      ');
console.log('================================================================================\n');

let allPassed = true;

// 1. Australia -> Iceland (Wrong answer)
// Australia centroid: (-25.27, 133.77), Iceland centroid: (64.96, -19.02)
const vAus = new THREE.Vector3(
  Math.cos(degToRad(-25.27)) * Math.sin(degToRad(133.77)),
  Math.sin(degToRad(-25.27)),
  Math.cos(degToRad(-25.27)) * Math.cos(degToRad(133.77))
).normalize();

const vIce = new THREE.Vector3(
  Math.cos(degToRad(64.96)) * Math.sin(degToRad(-19.02)),
  Math.sin(degToRad(64.96)),
  Math.cos(degToRad(64.96)) * Math.cos(degToRad(-19.02))
).normalize();

const fitAusIce = 2.45;
const r1 = simulateFlightWithSamples(vAus, vIce, 3.0, fitAusIce, false);

console.log('Test 1: Wrong Flight Australia -> Iceland');
console.log(`  Great-Circle Angle:   ${r1.gcAngleDeg.toFixed(2)}°`);
console.log(`  Max Per-Frame Step:   ${r1.maxStepDeg.toFixed(3)}° (Constraint: <= 4°) [${r1.maxStepDeg <= 4 ? 'PASS' : 'FAIL'}]`);
console.log(`  Path Length Ratio:    ${r1.pathRatio.toFixed(4)} (Constraint: <= 1.02) [${r1.pathRatio <= 1.02 ? 'PASS' : 'FAIL'}]`);
console.log(`  Final Direction Err:  ${r1.finalAngleErr.toFixed(5)}° (Constraint: <= 0.5°) [${r1.finalAngleErr <= 0.5 ? 'PASS' : 'FAIL'}]`);
console.log(`  Final Distance Error: ${r1.distErrPct.toFixed(3)}% (Constraint: <= 2%) [${r1.distErrPct <= 2 ? 'PASS' : 'FAIL'}]`);

if (r1.maxStepDeg > 4 || r1.pathRatio > 1.02 || r1.finalAngleErr > 0.5 || r1.distErrPct > 2) allPassed = false;

// 2. Spain -> Morocco (Wrong answer)
// Spain centroid: (40.46, -3.74), Morocco centroid: (31.79, -7.09)
const vSpain = new THREE.Vector3(
  Math.cos(degToRad(40.46)) * Math.sin(degToRad(-3.74)),
  Math.sin(degToRad(40.46)),
  Math.cos(degToRad(40.46)) * Math.cos(degToRad(-3.74))
).normalize();

const vMorocco = new THREE.Vector3(
  Math.cos(degToRad(31.79)) * Math.sin(degToRad(-7.09)),
  Math.sin(degToRad(31.79)),
  Math.cos(degToRad(31.79)) * Math.cos(degToRad(-7.09))
).normalize();

const fitMorocco = 2.30;
const r2 = simulateFlightWithSamples(vSpain, vMorocco, 2.8, fitMorocco, false);

console.log('\nTest 2: Wrong Flight Spain -> Morocco');
console.log(`  Great-Circle Angle:   ${r2.gcAngleDeg.toFixed(2)}°`);
console.log(`  Max Per-Frame Step:   ${r2.maxStepDeg.toFixed(3)}° (Constraint: <= 4°) [${r2.maxStepDeg <= 4 ? 'PASS' : 'FAIL'}]`);
console.log(`  Path Length Ratio:    ${r2.pathRatio.toFixed(4)} (Constraint: <= 1.02) [${r2.pathRatio <= 1.02 ? 'PASS' : 'FAIL'}]`);
console.log(`  Final Direction Err:  ${r2.finalAngleErr.toFixed(5)}° (Constraint: <= 0.5°) [${r2.finalAngleErr <= 0.5 ? 'PASS' : 'FAIL'}]`);
console.log(`  Final Distance Error: ${r2.distErrPct.toFixed(3)}% (Constraint: <= 2%) [${r2.distErrPct <= 2 ? 'PASS' : 'FAIL'}]`);

if (r2.maxStepDeg > 4 || r2.pathRatio > 1.02 || r2.finalAngleErr > 0.5 || r2.distErrPct > 2) allPassed = false;

// 3. Correct Flight (Stay put, zoom out x1.2)
const r3 = simulateFlightWithSamples(vSpain, vSpain, 2.5, 2.30, true, false);

console.log('\nTest 3: Correct Answer Flight (Stay put, zoom out x1.2)');
console.log(`  Direction Change:     ${r3.finalAngleErr.toFixed(4)}° (Constraint: <= 0.1°) [${r3.finalAngleErr <= 0.1 ? 'PASS' : 'FAIL'}]`);
console.log(`  Expected Final Dist:  ${r3.expectedDist.toFixed(3)}`);
console.log(`  Actual Final Dist:    ${r3.finalDist.toFixed(3)}`);
console.log(`  Distance Multiplier:  ${(r3.finalDist / 2.5).toFixed(3)}x (Constraint: x1.2) [${Math.abs(r3.finalDist / 2.5 - 1.2) < 0.01 ? 'PASS' : 'FAIL'}]`);

if (r3.finalAngleErr > 0.1 || Math.abs(r3.finalDist / 2.5 - 1.2) >= 0.01) allPassed = false;

// 4. Next Round Zoom-Out to Overview starting from correct nation
function simulateZoomOutToOverview(startDirUnit, nationDirUnit, startDist, targetDist = 4.0, dur = 600) {
  const startDir = startDirUnit.clone().normalize();
  const endDir = limitLatitude(nationDirUnit.clone().normalize());
  const dt = 16.666;
  let finalDist = startDist;
  let finalDir = startDir.clone();
  const dir = new THREE.Vector3();

  for (let now = 0; now <= dur + 1e-3; now += dt) {
    const raw = clamp(now / dur, 0, 1);
    const ease = 1 - Math.pow(1 - raw, 3); // ease-out cubic
    greatCircle(startDir, endDir, ease, dir).normalize();
    limitLatitude(dir);
    finalDist = lerp(startDist, targetDist, ease);
    finalDir.copy(dir);
  }

  const finalAngleErr = radToDeg(Math.acos(clamp(finalDir.dot(endDir), -1, 1)));
  const distErrPct = Math.abs(finalDist - targetDist) / targetDist * 100;
  return { finalDist, finalAngleErr, distErrPct };
}

// 4a. Zoom out from Spain (desktop, targetDist 4.0)
const r4a = simulateZoomOutToOverview(vSpain, vSpain, 2.76, 4.0, 600);
console.log('\nTest 4a: Next Round Zoom-out from Nation (Desktop D=4.0)');
console.log(`  Direction Alignment:  ${r4a.finalAngleErr.toFixed(4)}° (Constraint: <= 0.1°) [${r4a.finalAngleErr <= 0.1 ? 'PASS' : 'FAIL'}]`);
console.log(`  Final Distance:       ${r4a.finalDist.toFixed(3)} (Expected: 4.000) [${r4a.distErrPct < 0.1 ? 'PASS' : 'FAIL'}]`);
if (r4a.finalAngleErr > 0.1 || r4a.distErrPct >= 0.1) allPassed = false;

// 4b. Zoom out from close wrong framing (e.g. click was offset by 8 deg)
const vSlightOffset = vSpain.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), degToRad(8)).normalize();
const r4b = simulateZoomOutToOverview(vSlightOffset, vSpain, 3.10, 4.0, 600);
console.log('\nTest 4b: Next Round Zoom-out from Close Wrong Framing to Correct Nation');
console.log(`  Centered on Nation:   ${r4b.finalAngleErr.toFixed(4)}° (Constraint: <= 0.1°) [${r4b.finalAngleErr <= 0.1 ? 'PASS' : 'FAIL'}]`);
console.log(`  Final Distance:       ${r4b.finalDist.toFixed(3)} (Expected: 4.000) [${r4b.distErrPct < 0.1 ? 'PASS' : 'FAIL'}]`);
if (r4b.finalAngleErr > 0.1 || r4b.distErrPct >= 0.1) allPassed = false;

// 4c. Zoom out on Mobile portrait (targetDist 4.4)
const r4c = simulateZoomOutToOverview(vSpain, vSpain, 2.76, 4.4, 600);
console.log('\nTest 4c: Next Round Zoom-out on Mobile Portrait (Mobile D=4.4)');
console.log(`  Direction Alignment:  ${r4c.finalAngleErr.toFixed(4)}° (Constraint: <= 0.1°) [${r4c.finalAngleErr <= 0.1 ? 'PASS' : 'FAIL'}]`);
console.log(`  Final Distance:       ${r4c.finalDist.toFixed(3)} (Expected: 4.400) [${r4c.distErrPct < 0.1 ? 'PASS' : 'FAIL'}]`);
if (r4c.finalAngleErr > 0.1 || r4c.distErrPct >= 0.1) allPassed = false;

console.log('\n================================================================================');
if (allPassed) {
  console.log('✓ STEP 1 CAMERA FLIGHT UNIT TESTS: ALL PASSED');
  process.exit(0);
} else {
  console.error('✗ STEP 1 CAMERA FLIGHT UNIT TESTS: FAILED');
  process.exit(1);
}
