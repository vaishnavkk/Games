import * as THREE from 'three';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { CountryPicker } from './picker.js';
import { TINY_COUNTRIES } from '../data/tiny-countries.js';

export const FLIGHT = {
  zoomOutWrong: 1.18,   // final distance = fitDistance * this
  zoomOutCorrect: 1.2,  // correct: current distance * this
  holdMs: 300,          // pause on the wrong pick before travelling
  minMs: 900, maxMs: 3200,
  msPerDeg: 14,         // longer trips take longer, never a jump
  bumpPerDeg: 0.004,    // extra mid-flight distance so the route stays readable
  maxBump: 0.7,
  maxCamLatDeg: 80,     // keeps lookAt(up = Y) from flipping at the poles
};

const { clamp, lerp, degToRad, radToDeg } = THREE.MathUtils;
const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export function limitLatitude(dir) {
  const maxY = Math.sin(degToRad(FLIGHT.maxCamLatDeg));
  if (Math.abs(dir.y) <= maxY) return dir;
  const y = Math.sign(dir.y) * maxY;
  const h = Math.hypot(dir.x, dir.z);
  const k = h > 1e-6 ? Math.sqrt(1 - y * y) / h : 0;
  return dir.set(h > 1e-6 ? dir.x * k : Math.sqrt(1 - y * y), y, dir.z * k);
}

// Shortest path on the sphere between two unit vectors (great-circle slerp).
export function greatCircle(a, b, t, out) {
  const omega = Math.acos(clamp(a.dot(b), -1, 1));
  if (omega < 1e-5) return out.copy(b);
  if (Math.PI - omega < 1e-3) {              // opposite sides: go over a side
    const side = new THREE.Vector3(0, 1, 0).cross(a);
    if (side.lengthSq() < 1e-6) side.set(1, 0, 0);
    side.normalize();
    return out.copy(a).multiplyScalar(Math.cos(Math.PI * t)).addScaledVector(side, Math.sin(Math.PI * t));
  }
  const s = Math.sin(omega);
  return out.copy(a).multiplyScalar(Math.sin((1 - t) * omega) / s).addScaledVector(b, Math.sin(t * omega) / s);
}

// Free area = screen minus HUD minus result card (desktop) / bottom sheet (mobile).
export function getFreeRect() {
  const W = typeof window !== 'undefined' ? window.innerWidth : 1440;
  const H = typeof window !== 'undefined' ? window.innerHeight : 900;
  const hud = 64;
  return W < 640 ? { x: 0, y: hud, w: W, h: H - hud - H * 0.30 }
                 : { x: 0, y: hud, w: W - 340, h: H - hud };
}

export function isHiddenByUi(dirUnit, camera, renderer, freeRect, globeRadius = 1.7, margin = 48) {
  if (dirUnit.dot(camera.position.clone().normalize()) < 0.2) return true; // far side / edge
  const p = dirUnit.clone().multiplyScalar(globeRadius).project(camera);
  const w = renderer && renderer.domElement ? renderer.domElement.clientWidth : (typeof window !== 'undefined' ? window.innerWidth : 1440);
  const h = renderer && renderer.domElement ? renderer.domElement.clientHeight : (typeof window !== 'undefined' ? window.innerHeight : 900);
  const x = (p.x * 0.5 + 0.5) * w, y = (-p.y * 0.5 + 0.5) * h;
  return x < freeRect.x + margin || x > freeRect.x + freeRect.w - margin ||
         y < freeRect.y + margin || y > freeRect.y + freeRect.h - margin;
}

let current = null;
export function cancelAnswerFlight() {
  if (current) current.cancelled = true;
}

/**
 * o = { wasCorrect, targetDir (unit Vector3, include your free-area offset),
 *       fitDistance, targetHiddenByUi, onProgress?(e, dir) }
 * Resolves 'done' or 'cancelled'.
 */
export function animateAfterAnswer(camera, controls, o) {
  cancelAnswerFlight();
  const job = { cancelled: false };
  current = job;

  const startDir = camera.position.clone().normalize();
  const startDist = camera.position.length();
  const stayPut = o.wasCorrect && !o.targetHiddenByUi;
  const endDir = stayPut ? startDir.clone() : limitLatitude(o.targetDir.clone().normalize());
  const endDist = clamp(
    o.wasCorrect ? startDist * FLIGHT.zoomOutCorrect : o.fitDistance * FLIGHT.zoomOutWrong,
    controls.minDistance, controls.maxDistance);

  const angle = radToDeg(Math.acos(clamp(startDir.dot(endDir), -1, 1)));
  const dur = stayPut ? 650 : clamp(FLIGHT.minMs + angle * FLIGHT.msPerDeg, FLIGHT.minMs, FLIGHT.maxMs);
  const bump = stayPut ? 0 : Math.min(FLIGHT.maxBump, angle * FLIGHT.bumpPerDeg);
  const hold = o.wasCorrect ? 0 : FLIGHT.holdMs;

  controls.enabled = false;
  const dir = new THREE.Vector3();
  const t0 = performance.now();

  return new Promise((resolve) => {
    const frame = (now) => {
      if (job.cancelled) { controls.enabled = true; resolve('cancelled'); return; }
      const raw = clamp((now - t0 - hold) / dur, 0, 1);
      const e = easeInOutCubic(raw);
      greatCircle(startDir, endDir, e, dir).normalize();
      limitLatitude(dir);
      const dist = lerp(startDist, endDist, e) + bump * Math.sin(Math.PI * raw);
      camera.position.copy(dir).multiplyScalar(dist);
      camera.up.set(0, 1, 0);
      camera.lookAt(0, 0, 0);
      o.onProgress?.(e, dir);
      if (raw < 1) requestAnimationFrame(frame);
      else { controls.update(); controls.enabled = true; resolve('done'); }
    };
    requestAnimationFrame(frame);
  });
}

export function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

// Distance from clicked point to nearest point on target country boundary
export function distanceToCountryKm(latClick, lonClick, targetGeometry) {
  if (!targetGeometry || !targetGeometry.coordinates) return 0;
  const polys = targetGeometry.type === 'Polygon' ? [targetGeometry.coordinates] : targetGeometry.coordinates;
  let minDistKm = Infinity;

  for (const poly of polys) {
    const ring = poly[0];
    if (!ring) continue;
    for (let i = 0; i < ring.length; i++) {
      const [lon1, lat1] = ring[i];
      const d1 = haversineDistanceKm(latClick, lonClick, lat1, lon1);
      if (d1 < minDistKm) minDistKm = d1;

      // Also sample segment midpoint to ensure accuracy
      const next = ring[(i + 1) % ring.length];
      const midLat = (lat1 + next[1]) / 2;
      const midLon = (lon1 + next[0]) / 2;
      const dMid = haversineDistanceKm(latClick, lonClick, midLat, midLon);
      if (dMid < minDistKm) minDistKm = dMid;
    }
  }
  return minDistKm === Infinity ? 0 : Math.round(minDistKm);
}

// Largest landmass center for multi-part countries
export function getLargestLandmassCenter(country) {
  if (!country) return { lat: 0, lon: 0 };
  const geom = country.geometry;
  if (!geom || !geom.coordinates) {
    return {
      lat: country.lat !== undefined ? country.lat : (country.centroid ? country.centroid[1] : 0),
      lon: country.lon !== undefined ? country.lon : (country.centroid ? country.centroid[0] : 0)
    };
  }
  let maxPts = 0;
  let bestPoly = null;
  const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates;
  for (const p of polys) {
    if (p[0] && p[0].length > maxPts) {
      maxPts = p[0].length;
      bestPoly = p;
    }
  }
  if (!bestPoly || !bestPoly[0]) {
    return {
      lat: country.lat !== undefined ? country.lat : (country.centroid ? country.centroid[1] : 0),
      lon: country.lon !== undefined ? country.lon : (country.centroid ? country.centroid[0] : 0)
    };
  }
  let sumX = 0, sumY = 0, sumZ = 0;
  for (const [lon, lat] of bestPoly[0]) {
    const v = CountryPicker.latLonToVector3(lat, lon, 1.0);
    sumX += v.x; sumY += v.y; sumZ += v.z;
  }
  const centerV = new THREE.Vector3(sumX, sumY, sumZ).normalize();
  return CountryPicker.vector3ToLatLon(centerV);
}

// Compute world direction vector for camera to frame country cleanly in free area
export function getTargetCameraDir(country, globeMesh) {
  const center = getLargestLandmassCenter(country);
  const localVec = CountryPicker.latLonToVector3(center.lat, center.lon, 1.0);
  if (globeMesh) {
    globeMesh.updateMatrixWorld(true);
    localVec.applyMatrix4(globeMesh.matrixWorld);
  }
  const worldVec = localVec.normalize();

  const W = typeof window !== 'undefined' ? window.innerWidth : 1440;
  const H = typeof window !== 'undefined' ? window.innerHeight : 900;
  const isMobile = W < 640 || (W <= 900 && H > W);

  const targetDir = worldVec.clone();
  if (isMobile) {
    // Pitch down to position country in upper 70% viewport above bottom sheet
    const right = new THREE.Vector3().crossVectors(targetDir, new THREE.Vector3(0, 1, 0)).normalize();
    if (right.lengthSq() > 1e-4) {
      targetDir.applyAxisAngle(right, -0.10);
    }
  } else {
    // Yaw right to position country in left free area (~550px)
    targetDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), 0.12);
  }
  return targetDir.normalize();
}

// Compute angular diameter of country's largest landmass
export function getCountryAngularDiameter(country) {
  if (!country) return 5;
  const geom = country.geometry;
  if (!geom || !geom.coordinates) return 5;

  let maxPts = 0;
  let bestPoly = null;
  const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates;
  for (const p of polys) {
    if (p[0] && p[0].length > maxPts) {
      maxPts = p[0].length;
      bestPoly = p;
    }
  }
  if (!bestPoly || !bestPoly[0]) return 5;

  const ext = bestPoly[0];
  const center = getLargestLandmassCenter(country);
  const centerVec = CountryPicker.latLonToVector3(center.lat, center.lon, 1.0).normalize();
  let maxAngle = 0;
  for (const [lon, lat] of ext) {
    const v = CountryPicker.latLonToVector3(lat, lon, 1.0).normalize();
    const angle = centerVec.angleTo(v);
    if (angle > maxAngle) maxAngle = angle;
  }
  return (maxAngle * 2 * 180) / Math.PI;
}

export class CameraFlightController {
  constructor(camera, globeMesh, controls) {
    this.camera = camera;
    this.globeMesh = globeMesh;
    this.controls = controls;

    // Visual markers container (added directly to globeMesh so it rotates synchronously)
    this.markersGroup = new THREE.Group();
    this.globeMesh.add(this.markersGroup);

    this.arcMesh = null;
    this.distanceSprite = null;
    this.isFlying = false;
    this.targetFreeAreaPercent = null;

    // LineMaterials cache for resizing
    this.lineMaterials = [];

    // Min and max camera distance bounds
    this.MIN_CAMERA_Z = 2.52;
    this.MAX_CAMERA_Z_DESKTOP = 3.65;
    this.MAX_CAMERA_Z_MOBILE = 5.15;
  }

  resize(width, height) {
    for (const mat of this.lineMaterials) {
      if (mat && mat.resolution) {
        mat.resolution.set(width, height);
      }
    }
  }

  clearVisuals() {
    while (this.markersGroup.children.length > 0) {
      const child = this.markersGroup.children[0];
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (child.material.map) child.material.map.dispose();
        child.material.dispose();
      }
      this.markersGroup.remove(child);
    }
    this.arcMesh = null;
    this.distanceSprite = null;
    this.lineMaterials = [];
    this.targetFreeAreaPercent = null;
  }

  // Draw fat-line geometry outline (Line2) on the sphere
  drawCountryOutline(country, isTarget = true) {
    if (!country) return;

    const strokeColor = isTarget ? 0x36b368 : 0xeb5843; // Botanical green or Terracotta red
    const isTiny = TINY_COUNTRIES.some(t => String(t.id).padStart(3, '0') === String(country.id).padStart(3, '0')) ||
                   getCountryAngularDiameter(country) < 2.0;

    const w = typeof window !== 'undefined' ? window.innerWidth : 1440;
    const h = typeof window !== 'undefined' ? window.innerHeight : 900;

    if (isTiny) {
      // Small countries: draw an unfilled 3D ring larger than the country so land is visible inside
      const c = getLargestLandmassCenter(country);
      const centerVec = CountryPicker.latLonToVector3(c.lat, c.lon, 1.704).normalize();
      // Generate orthonormal basis around centerVec
      const up = Math.abs(centerVec.y) < 0.99 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
      const right = new THREE.Vector3().crossVectors(centerVec, up).normalize();
      const perp = new THREE.Vector3().crossVectors(right, centerVec).normalize();

      const ringRadiusDeg = 1.8; // ~200 km radius
      const alpha = (ringRadiusDeg * Math.PI) / 180;
      const cosA = Math.cos(alpha);
      const sinA = Math.sin(alpha);

      const segments = 64;
      const positions = [];
      for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        const pt = new THREE.Vector3()
          .copy(centerVec)
          .multiplyScalar(cosA)
          .addScaledVector(right, sinA * Math.cos(theta))
          .addScaledVector(perp, sinA * Math.sin(theta))
          .normalize()
          .multiplyScalar(1.704);
        positions.push(pt.x, pt.y, pt.z);
      }

      const geo = new LineGeometry();
      geo.setPositions(positions);
      const mat = new LineMaterial({
        color: strokeColor,
        linewidth: 3.5,
        worldUnits: false,
        transparent: true,
        opacity: 0.95,
        depthTest: true
      });
      mat.resolution.set(w, h);
      this.lineMaterials.push(mat);

      const line = new Line2(geo, mat);
      line.computeLineDistances();
      this.markersGroup.add(line);
      return;
    }

    // Standard countries: draw all exterior rings from geometry
    const geom = country.geometry;
    if (!geom || !geom.coordinates) return;

    const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates;
    const mat = new LineMaterial({
      color: strokeColor,
      linewidth: 3.0,
      worldUnits: false,
      transparent: true,
      opacity: 0.95,
      depthTest: true
    });
    mat.resolution.set(w, h);
    this.lineMaterials.push(mat);

    for (const poly of polys) {
      const ring = poly[0];
      if (!ring || ring.length < 3) continue;

      const positions = [];
      for (const [lon, lat] of ring) {
        const pt = CountryPicker.latLonToVector3(lat, lon, 1.704);
        positions.push(pt.x, pt.y, pt.z);
      }
      // Ensure closed loop
      const firstPt = CountryPicker.latLonToVector3(ring[0][1], ring[0][0], 1.704);
      positions.push(firstPt.x, firstPt.y, firstPt.z);

      const geo = new LineGeometry();
      geo.setPositions(positions);

      const line = new Line2(geo, mat);
      line.computeLineDistances();
      this.markersGroup.add(line);
    }
  }

  // Compute camera distance so target fits free area with ocean/neighbours visible (area <= 60%)
  computeTargetDistance(angularSpanDeg, isMobile = false) {
    const span = Math.max(0.2, Math.min(85, angularSpanDeg || 8));
    if (isMobile) {
      // Mobile portrait (390x844, aspect ratio 0.46)
      const t = Math.pow(span / 85, 0.55);
      return this.MIN_CAMERA_Z + t * (this.MAX_CAMERA_Z_MOBILE - this.MIN_CAMERA_Z);
    } else {
      // Desktop landscape (1440x900)
      const t = Math.pow(span / 85, 0.60);
      return this.MIN_CAMERA_Z + t * (this.MAX_CAMERA_Z_DESKTOP - this.MIN_CAMERA_Z);
    }
  }

  // Measure target on-screen area as percentage of free area
  computeTargetFreeAreaPercent(country) {
    if (!country || !country.geometry) return 0;
    const geom = country.geometry;

    this.globeMesh.updateMatrixWorld(true);
    this.camera.updateMatrixWorld(true);

    const W = typeof window !== 'undefined' ? window.innerWidth : 1440;
    const H = typeof window !== 'undefined' ? window.innerHeight : 900;
    const isMobile = W <= 640 || (W <= 900 && H > W);
    const freeAreaPx = isMobile ? (W * (H * 0.70)) : ((W - 344) * H);

    const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates;
    let totalScreenArea = 0;

    for (const poly of polys) {
      const ring = poly[0];
      if (!ring || ring.length < 3) continue;

      const screenPts = [];
      for (const [lon, lat] of ring) {
        const localP = CountryPicker.latLonToVector3(lat, lon, 1.7);
        const worldP = localP.clone().applyMatrix4(this.globeMesh.matrixWorld);
        const n = worldP.clone().normalize();
        const toCam = this.camera.position.clone().sub(worldP).normalize();
        if (n.dot(toCam) > 0.02) { // facing camera
          const p2 = worldP.clone().project(this.camera);
          screenPts.push({
            x: (p2.x * 0.5 + 0.5) * W,
            y: (-p2.y * 0.5 + 0.5) * H
          });
        }
      }

      if (screenPts.length >= 3) {
        let a = 0;
        for (let i = 0, j = screenPts.length - 1; i < screenPts.length; j = i++) {
          a += (screenPts[j].x * screenPts[i].y) - (screenPts[i].x * screenPts[j].y);
        }
        totalScreenArea += Math.abs(a) * 0.5;
      }
    }

    const pct = Math.min(100, Math.round((totalScreenArea / freeAreaPx) * 1000) / 10);
    this.targetFreeAreaPercent = pct;
    return pct;
  }

  // Create high-DPI canvas sprite badge for distance at midpoint of arc
  createDistanceBadge(distanceKm, positionVec) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 192;
    const ctx = canvas.getContext('2d');

    // High-DPI 2x scale
    ctx.scale(2, 2);

    const w = 256;
    const h = 96;
    const r = 24;

    // Drop shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 2;

    // Rounded badge surface (Atlas ink-navy pill with crisp glass border)
    ctx.fillStyle = 'rgba(8, 26, 36, 0.94)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.60)';
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.moveTo(r, 6);
    ctx.lineTo(w - r, 6);
    ctx.quadraticCurveTo(w - 6, 6, w - 6, r);
    ctx.lineTo(w - 6, h - r);
    ctx.quadraticCurveTo(w - 6, h - 6, w - r, h - 6);
    ctx.lineTo(r, h - 6);
    ctx.quadraticCurveTo(6, h - 6, 6, h - r);
    ctx.lineTo(6, r);
    ctx.quadraticCurveTo(6, 6, r, 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Reset shadow for crisp typography
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // Primary: distance in km (crisp bold white)
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 31px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${distanceKm.toLocaleString()} km`, 128, 38);

    // Secondary: distance in miles
    const miles = Math.round(distanceKm * 0.621371);
    ctx.fillStyle = 'rgba(215, 235, 250, 0.88)';
    ctx.font = '500 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(`(${miles.toLocaleString()} mi)`, 128, 68);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.position.copy(positionVec);
    sprite.scale.set(0.24, 0.09, 1);
    sprite.userData = { baseScale: { x: 0.24, y: 0.09 } };

    this.distanceSprite = sprite;
    this.markersGroup.add(sprite);
    return sprite;
  }

  // Draw 2px neutral line (white at 70%) with distance at midpoint
  drawGreatCircleArc(lat1, lon1, lat2, lon2, distanceKm) {
    const v1 = CountryPicker.latLonToVector3(lat1, lon1, 1.7).normalize();
    const v2 = CountryPicker.latLonToVector3(lat2, lon2, 1.7).normalize();

    const dist = distanceKm !== undefined ? distanceKm : haversineDistanceKm(lat1, lon1, lat2, lon2);
    const numPoints = 64;
    const points = [];

    const angularDist = v1.angleTo(v2);
    const maxAltitude = Math.min(0.42, 0.12 + (angularDist / Math.PI) * 0.32);
    const sinAngle = Math.sin(angularDist);

    let midpointVec = null;

    for (let i = 0; i <= numPoints; i++) {
      const t = i / numPoints;
      let p;
      if (angularDist < 1e-4) {
        p = v1.clone();
      } else if (Math.abs(angularDist - Math.PI) < 1e-3) {
        p = v1.clone().lerp(v2, t).normalize();
      } else {
        const scale1 = Math.sin((1 - t) * angularDist) / sinAngle;
        const scale2 = Math.sin(t * angularDist) / sinAngle;
        p = new THREE.Vector3(
          v1.x * scale1 + v2.x * scale2,
          v1.y * scale1 + v2.y * scale2,
          v1.z * scale1 + v2.z * scale2
        ).normalize();
      }

      // Parabolic altitude arc above globe surface
      const altitude = Math.sin(t * Math.PI) * maxAltitude;
      p.multiplyScalar(1.7 + altitude);
      points.push(p);

      if (i === Math.floor(numPoints / 2)) {
        const normal = p.clone().normalize();
        const tangent = v2.clone().sub(v1).normalize();
        const side = new THREE.Vector3().crossVectors(normal, tangent).normalize();
        midpointVec = p.clone().addScaledVector(normal, 0.09).addScaledVector(side, 0.05);
      }
    }

    // 2px neutral line (white at 70%)
    const curve = new THREE.CatmullRomCurve3(points);
    const tubeGeo = new THREE.TubeGeometry(curve, 64, 0.0020, 8, false);
    const tubeMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.70
    });

    this.arcMesh = new THREE.Mesh(tubeGeo, tubeMat);
    this.markersGroup.add(this.arcMesh);

    // Distance label at arc midpoint
    if (midpointVec) {
      this.createDistanceBadge(dist, midpointVec);
    }

    return dist;
  }

  animateAfterAnswer(opts) {
    this.isFlying = true;
    return animateAfterAnswer(this.camera, this.controls, opts).then((status) => {
      this.isFlying = false;
      return status;
    });
  }

  cancelAnswerFlight() {
    this.isFlying = false;
    cancelAnswerFlight();
  }

  // Backwards compatible wrapper for flyToCountry
  flyToCountry(targetLat, targetLon, {
    duration = 1400,
    isDesktopOffset = false,
    angularSpan = 10,
    guessLat = null,
    guessLon = null,
    onComplete
  } = {}) {
    const isMobile = (typeof window !== 'undefined') ? (window.innerWidth <= 640 || (window.innerWidth <= 900 && window.innerHeight > window.innerWidth)) : false;
    const fitDistance = this.computeTargetDistance(angularSpan, isMobile);
    const centerVec = CountryPicker.latLonToVector3(targetLat, targetLon, 1.0);
    if (this.globeMesh) {
      this.globeMesh.updateMatrixWorld(true);
      centerVec.applyMatrix4(this.globeMesh.matrixWorld);
    }
    const targetDir = centerVec.normalize();
    if (isDesktopOffset && !isMobile) {
      targetDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), 0.12);
    } else if (isMobile) {
      const right = new THREE.Vector3().crossVectors(targetDir, new THREE.Vector3(0, 1, 0)).normalize();
      if (right.lengthSq() > 1e-4) targetDir.applyAxisAngle(right, -0.10);
    }

    return this.animateAfterAnswer({
      wasCorrect: false,
      targetDir,
      fitDistance,
      targetHiddenByUi: false
    }).then((status) => {
      if (onComplete) onComplete();
      return status;
    });
  }

  resetToOverview({ duration = 1000, onComplete } = {}) {
    this.cancelAnswerFlight();
    this.isFlying = true;
    this.controls.enabled = false;
    if (this.controls.sphericalDelta) this.controls.sphericalDelta.set(0, 0, 0);
    if (this.controls.panOffset) this.controls.panOffset.set(0, 0, 0);
    this.clearVisuals();

    const startCamX = this.camera.position.x || 0;
    const startCamY = this.camera.position.y || 0;
    const startCamZ = this.camera.position.z;
    const targetCamZ = 4.0;
    const startTime = performance.now();

    const animateReset = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const ease =
        progress < 0.5
          ? 2 * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 2) / 2;

      const camX = THREE.MathUtils.lerp(startCamX, 0, ease);
      const camY = THREE.MathUtils.lerp(startCamY, 0, ease);
      const camZ = THREE.MathUtils.lerp(startCamZ, targetCamZ, ease);
      this.camera.position.set(camX, camY, camZ);
      this.camera.lookAt(0, 0, 0);

      if (progress < 1) {
        requestAnimationFrame(animateReset);
      } else {
        this.camera.position.set(0, 0, targetCamZ);
        this.camera.lookAt(0, 0, 0);
        this.isFlying = false;
        this.controls.enabled = true;
        if (this.controls.sphericalDelta) this.controls.sphericalDelta.set(0, 0, 0);
        if (this.controls.panOffset) this.controls.panOffset.set(0, 0, 0);
        this.controls.target.set(0, 0, 0);
        this.controls.update();
        if (onComplete) onComplete();
      }
    };

    requestAnimationFrame(animateReset);
  }
}
