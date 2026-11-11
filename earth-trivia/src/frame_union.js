import * as THREE from 'three';
import { CountryPicker } from './picker.js';

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
  return R * c;
}

export function latLonToVector3(lat, lon, radius = 1.7) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -(radius * Math.sin(phi) * Math.cos(theta)),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

export function vector3ToLatLon(v) {
  const r = v.length();
  if (r < 1e-6) return { lat: 0, lon: 0 };
  const ny = v.y / r;
  const lat = 90 - (Math.acos(Math.max(-1, Math.min(1, ny))) * 180) / Math.PI;
  const lon = ((Math.atan2(v.z / r, -v.x / r) * 180) / Math.PI) - 180;
  let normLon = lon;
  while (normLon < -180) normLon += 360;
  while (normLon > 180) normLon -= 360;
  return { lat, lon: normLon };
}

// Project point p onto great-circle segment a -> b on the sphere
export function projectPointToSegment(p, a, b) {
  const n = new THREE.Vector3().crossVectors(a, b);
  if (n.lengthSq() < 1e-12) {
    const latP = vector3ToLatLon(p);
    const latA = vector3ToLatLon(a);
    return { q: a.clone(), distKm: haversineDistanceKm(latP.lat, latP.lon, latA.lat, latA.lon) };
  }
  n.normalize();
  const pDotN = p.dot(n);
  const qProj = p.clone().addScaledVector(n, -pDotN);
  if (qProj.lengthSq() < 1e-12) {
    const latP = vector3ToLatLon(p);
    const latA = vector3ToLatLon(a);
    return { q: a.clone(), distKm: haversineDistanceKm(latP.lat, latP.lon, latA.lat, latA.lon) };
  }
  qProj.normalize().multiplyScalar(a.length());

  const angleAB = a.angleTo(b);
  const angleAQ = a.angleTo(qProj);
  const angleQB = qProj.angleTo(b);

  let bestQ = qProj;
  if (Math.abs(angleAQ + angleQB - angleAB) > 1e-4) {
    bestQ = p.angleTo(a) < p.angleTo(b) ? a.clone() : b.clone();
  }
  const distKm = p.angleTo(bestQ) * 6371;
  return { q: bestQ, distKm };
}

// Standard ray-casting point-in-polygon test
export function isPointInPolygon(lat, lon, poly) {
  const ring = poly[0];
  if (!ring || ring.length < 3) return false;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1];
    const xj = ring[j][0], yj = ring[j][1];
    const intersect = ((yi > lat) !== (yj > lat)) &&
      (lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

export function isPointInGeometry(lat, lon, geometry) {
  if (!geometry || !geometry.coordinates) return false;
  const polys = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  for (const poly of polys) {
    if (isPointInPolygon(lat, lon, poly)) return true;
  }
  return false;
}

/**
 * Expose distance from CLICK POINT to nearest point of target country.
 * Returns { km, nearestLatLon } where km is integer km (0 if adjacent/inside).
 */
export function distanceToCountryWithNearest(latClick, lonClick, targetGeometry) {
  if (!targetGeometry || !targetGeometry.coordinates) {
    return { km: 0, nearestLatLon: { lat: latClick, lon: lonClick } };
  }

  // Check if click point is inside country
  if (isPointInGeometry(latClick, lonClick, targetGeometry)) {
    return { km: 0, nearestLatLon: { lat: latClick, lon: lonClick } };
  }

  const p = latLonToVector3(latClick, lonClick, 1.7);
  const polys = targetGeometry.type === 'Polygon' ? [targetGeometry.coordinates] : targetGeometry.coordinates;
  let minDist = Infinity;
  let bestQ = p;

  for (const poly of polys) {
    const ring = poly[0];
    if (!ring || ring.length < 2) continue;
    for (let i = 0; i < ring.length - 1; i++) {
      const a = latLonToVector3(ring[i][1], ring[i][0], 1.7);
      const b = latLonToVector3(ring[i + 1][1], ring[i + 1][0], 1.7);
      const res = projectPointToSegment(p, a, b);
      if (res.distKm < minDist) {
        minDist = res.distKm;
        bestQ = res.q;
      }
    }
  }

  const roundedKm = Math.round(minDist);
  const nearestLatLon = vector3ToLatLon(bestQ);
  return {
    km: roundedKm <= 0 ? 0 : roundedKm,
    nearestLatLon
  };
}

export function getCountryBoundingBox(country) {
  const geom = country ? country.geometry : null;
  if (!geom || !geom.coordinates) {
    const lat = country && country.lat !== undefined ? country.lat : (country && country.centroid ? country.centroid[1] : 0);
    const lon = country && country.lon !== undefined ? country.lon : (country && country.centroid ? country.centroid[0] : 0);
    return { minLat: lat - 0.5, maxLat: lat + 0.5, minLon: lon - 0.5, maxLon: lon + 0.5, spanDeg: 1.0 };
  }
  let minLat = 90, maxLat = -90, minLon = 180, maxLon = -180;
  const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates;
  for (const poly of polys) {
    const ring = poly[0];
    if (!ring) continue;
    for (const [lon, lat] of ring) {
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lon < minLon) minLon = lon;
      if (lon > maxLon) maxLon = lon;
    }
  }
  const spanLat = maxLat - minLat;
  const spanLon = maxLon - minLon;
  return {
    minLat,
    maxLat,
    minLon,
    maxLon,
    spanDeg: Math.max(spanLat, spanLon)
  };
}

export function getLargestLandmassBox(country) {
  if (!country) return { minLat: 0, maxLat: 0, minLon: 0, maxLon: 0, centerLat: 0, centerLon: 0 };
  const geom = country.geometry;
  if (!geom || !geom.coordinates) {
    const lat = country.lat !== undefined ? country.lat : (country.centroid ? country.centroid[1] : 0);
    const lon = country.lon !== undefined ? country.lon : (country.centroid ? country.centroid[0] : 0);
    return { minLat: lat - 0.5, maxLat: lat + 0.5, minLon: lon - 0.5, maxLon: lon + 0.5, centerLat: lat, centerLon: lon };
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
    const lat = country.lat !== undefined ? country.lat : (country.centroid ? country.centroid[1] : 0);
    const lon = country.lon !== undefined ? country.lon : (country.centroid ? country.centroid[0] : 0);
    return { minLat: lat - 0.5, maxLat: lat + 0.5, minLon: lon - 0.5, maxLon: lon + 0.5, centerLat: lat, centerLon: lon };
  }
  let minLat = 90, maxLat = -90, minLon = 180, maxLon = -180;
  for (const [lon, lat] of bestPoly[0]) {
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lon < minLon) minLon = lon;
    if (lon > maxLon) maxLon = lon;
  }
  return {
    minLat,
    maxLat,
    minLon,
    maxLon,
    centerLat: (minLat + maxLat) / 2,
    centerLon: (minLon + maxLon) / 2
  };
}

export function getLargestLandmassCornerDirs(country, globeMesh) {
  const box = getLargestLandmassBox(country);
  const pts = [
    { lat: box.minLat, lon: box.minLon },
    { lat: box.minLat, lon: box.maxLon },
    { lat: box.maxLat, lon: box.minLon },
    { lat: box.maxLat, lon: box.maxLon },
    { lat: box.centerLat, lon: box.centerLon }
  ];
  return pts.map(({ lat, lon }) => {
    const v = latLonToVector3(lat, lon, 1.0);
    if (globeMesh) {
      globeMesh.updateMatrixWorld(true);
      v.applyMatrix4(globeMesh.matrixWorld);
    }
    return v.normalize();
  });
}

const { clamp, radToDeg } = THREE.MathUtils;

function projector(camera, renderer, centerDir, dx, dy, R) {
  const W = renderer.domElement.clientWidth, H = renderer.domElement.clientHeight;
  const cam = camera.clone();
  return (d, dirs) => {
    cam.position.copy(centerDir).multiplyScalar(d);
    cam.up.set(0, 1, 0);
    cam.setViewOffset(W, H, -dx, -dy, W, H);      // union centre lands in the middle of the free area
    cam.lookAt(0, 0, 0);
    cam.updateMatrixWorld(true);
    return dirs.map((p) => {
      const n = p.clone().multiplyScalar(R).project(cam);
      return { x: (n.x * 0.5 + 0.5) * W, y: (-n.y * 0.5 + 0.5) * H, front: p.dot(centerDir) > 0.05 };
    });
  };
}

/** clickDir, nearestDir: unit vectors (your click, nearest point of the target).
 *  cornerDirs: unit vectors of the 4 corners + centre of the target's largest-landmass lat/lon box.
 *  Returns null when the pair is far apart (keep the normal framing). */
export function planCloseWrongFlight({ clickDir, nearestDir, cornerDirs, camera, renderer, freeRect, R, minD, maxD }) {
  const sepDeg = radToDeg(Math.acos(clamp(clickDir.dot(nearestDir), -1, 1)));
  if (sepDeg > 25) return null;
  const pts = [clickDir, nearestDir, ...cornerDirs];
  const center = pts.reduce((s, p) => s.add(p), new THREE.Vector3()).normalize();
  const W = renderer.domElement.clientWidth, H = renderer.domElement.clientHeight;
  const dx = freeRect.x + freeRect.w / 2 - W / 2, dy = freeRect.y + freeRect.h / 2 - H / 2;
  const project = projector(camera, renderer, center, dx, dy, R);
  const m = 56;
  const fits = (d) => project(d, pts).every((q) => q.front &&
    q.x >= freeRect.x + m && q.x <= freeRect.x + freeRect.w - m &&
    q.y >= freeRect.y + m && q.y <= freeRect.y + freeRect.h - m);
  if (!fits(maxD)) return null;
  let lo = minD, hi = maxD;
  if (fits(lo)) hi = lo;
  else for (let i = 0; i < 16; i++) { const mid = (lo + hi) / 2; if (fits(mid)) hi = mid; else lo = mid; }
  const [a, b] = project(hi, [clickDir, nearestDir]);
  return { endDir: center, endDist: hi, viewShift: { dx, dy }, W, H,
           compact: Math.hypot(a.x - b.x, a.y - b.y) < 64, sepDeg };
}
