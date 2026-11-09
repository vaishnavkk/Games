import * as THREE from 'three';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { CountryPicker } from './picker.js';
import { TINY_COUNTRIES } from '../data/tiny-countries.js';

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
  let centerLat = country.lat;
  let centerLon = country.lon;

  if (centerLat === undefined && country.centroid) {
    centerLon = country.centroid[0];
    centerLat = country.centroid[1];
  }
  if (centerLat === undefined) {
    let sumX = 0, sumY = 0, sumZ = 0;
    for (const [lon, lat] of ext) {
      const v = CountryPicker.latLonToVector3(lat, lon, 1.0);
      sumX += v.x; sumY += v.y; sumZ += v.z;
    }
    const centerV = new THREE.Vector3(sumX, sumY, sumZ).normalize();
    const coords = CountryPicker.vector3ToLatLon(centerV);
    centerLat = coords.lat;
    centerLon = coords.lon;
  }

  const centerVec = CountryPicker.latLonToVector3(centerLat, centerLon, 1.0).normalize();
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
    this.MIN_CAMERA_Z = 2.05;
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

    const w = window.innerWidth;
    const h = window.innerHeight;

    if (isTiny) {
      // Small countries: draw an unfilled 3D ring larger than the country so land is visible inside
      const cLat = country.lat !== undefined ? country.lat : (country.centroid ? country.centroid[1] : 0);
      const cLon = country.lon !== undefined ? country.lon : (country.centroid ? country.centroid[0] : 0);
      const centerVec = CountryPicker.latLonToVector3(cLat, cLon, 1.704).normalize();
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

    const W = window.innerWidth;
    const H = window.innerHeight;
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

  // Create canvas sprite badge for distance at midpoint of arc
  createDistanceBadge(distanceKm, positionVec) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 96;
    const ctx = canvas.getContext('2d');

    // Rounded badge surface (Atlas ink-navy pill with light border)
    ctx.fillStyle = 'rgba(8, 26, 36, 0.90)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.40)';
    ctx.lineWidth = 3;

    const r = 24;
    ctx.beginPath();
    ctx.moveTo(r, 6);
    ctx.lineTo(256 - r, 6);
    ctx.quadraticCurveTo(256 - 6, 6, 256 - 6, r);
    ctx.lineTo(256 - 6, 96 - r);
    ctx.quadraticCurveTo(256 - 6, 96 - 6, 256 - r, 96 - 6);
    ctx.lineTo(r, 96 - 6);
    ctx.quadraticCurveTo(6, 96 - 6, 6, 96 - r);
    ctx.lineTo(6, r);
    ctx.quadraticCurveTo(6, 6, r, 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Distance text in white
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 34px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${distanceKm.toLocaleString()} km`, 128, 51);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.position.copy(positionVec);
    sprite.scale.set(0.38, 0.14, 1);

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
        midpointVec = p.clone().add(p.clone().normalize().multiplyScalar(0.08));
      }
    }

    // 2px neutral line (white at 70%)
    const curve = new THREE.CatmullRomCurve3(points);
    const tubeGeo = new THREE.TubeGeometry(curve, 64, 0.009, 8, false);
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

  // Smooth camera flight and framing with Quaternion SLERP & zero controls fighting
  flyToCountry(targetLat, targetLon, {
    duration = 1400,
    isDesktopOffset = false,
    angularSpan = 10,
    guessLat = null,
    guessLon = null,
    onComplete
  } = {}) {
    this.isFlying = true;
    this.controls.enabled = false;
    // Kill residual damping inertia immediately to eliminate flight jitter
    if (this.controls.sphericalDelta) this.controls.sphericalDelta.set(0, 0, 0);
    if (this.controls.panOffset) this.controls.panOffset.set(0, 0, 0);
    this.controls.scale = 1;

    const isMobile = window.innerWidth <= 640 || (window.innerWidth <= 900 && window.innerHeight > window.innerWidth);

    // Determine target center and distance
    let centerLat = targetLat;
    let centerLon = targetLon;
    let targetCamZ = this.computeTargetDistance(angularSpan, isMobile);

    // Check wrong answer framing: frame both if both fit with target >= 25% of free area
    if (guessLat !== null && guessLon !== null) {
      const vTarget = CountryPicker.latLonToVector3(targetLat, targetLon, 1.7).normalize();
      const vGuess = CountryPicker.latLonToVector3(guessLat, guessLon, 1.7).normalize();
      const angularDistDeg = (vTarget.angleTo(vGuess) * 180) / Math.PI;

      // If angular distance is moderate (< 50°), frame midpoint between guess and target
      if (angularDistDeg < 50) {
        const vMid = vTarget.clone().add(vGuess).normalize();
        const midCoords = CountryPicker.vector3ToLatLon(vMid.multiplyScalar(1.7));
        centerLat = midCoords.lat;
        centerLon = midCoords.lon;
        const requiredZ = Math.max(targetCamZ, isMobile ? 3.2 + (angularDistDeg / 50) * 1.5 : 2.2 + (angularDistDeg / 50) * 1.1);
        const maxZ = isMobile ? this.MAX_CAMERA_Z_MOBILE : this.MAX_CAMERA_Z_DESKTOP;
        targetCamZ = Math.min(maxZ, requiredZ);
      } else {
        // Extreme distance (e.g. > 50°): framing both would reduce target < 25%; frame target directly
        centerLat = targetLat;
        centerLon = targetLon;
      }
    }

    // Target rotation around Y: -(centerLon + 90) * rad
    let targetRotY = -((centerLon + 90) * Math.PI) / 180;

    // Desktop offset: shift slightly left so country sits cleanly in free area
    if (isDesktopOffset && window.innerWidth > 900) {
      targetRotY -= 0.24;
    }

    // Shortest spherical path for Y rotation
    let curY = this.globeMesh.rotation.y;
    let diffY = (targetRotY - curY) % (Math.PI * 2);
    if (diffY > Math.PI) diffY -= Math.PI * 2;
    if (diffY < -Math.PI) diffY += Math.PI * 2;
    const finalRotY = curY + diffY;

    // Tilt for latitude
    const targetRotX = (centerLat * Math.PI) / 180;

    // Mobile vertical camera offset (places country above 30% bottom sheet)
    const targetCamY = isMobile ? -0.10 : 0;
    const startCamY = this.camera.position.y || 0;

    // Quaternion SLERP setup: shortest-path spherical linear interpolation on SO(3)
    const startQuat = this.globeMesh.quaternion.clone();
    const targetEuler = new THREE.Euler(targetRotX, finalRotY, 0, 'YXZ');
    const targetQuat = new THREE.Quaternion().setFromEuler(targetEuler);
    if (startQuat.dot(targetQuat) < 0) {
      targetQuat.set(-targetQuat.x, -targetQuat.y, -targetQuat.z, -targetQuat.w);
    }

    const startCamZ = this.camera.position.z;
    const startTime = performance.now();

    const animateFlight = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      // Smooth cubic bezier / easeInOutCubic
      const ease =
        progress < 0.5
          ? 4 * progress * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      this.globeMesh.quaternion.slerpQuaternions(startQuat, targetQuat, ease);
      this.globeMesh.quaternion.normalize();
      this.globeMesh.rotation.setFromQuaternion(this.globeMesh.quaternion, 'YXZ');

      const camY = THREE.MathUtils.lerp(startCamY, targetCamY, ease);
      this.camera.position.y = camY;
      this.camera.position.z = THREE.MathUtils.lerp(startCamZ, targetCamZ, ease);
      this.camera.lookAt(0, camY, 0);

      if (progress < 1) {
        requestAnimationFrame(animateFlight);
      } else {
        this.globeMesh.quaternion.copy(targetQuat);
        this.globeMesh.rotation.setFromQuaternion(targetQuat, 'YXZ');
        this.camera.position.y = targetCamY;
        this.camera.position.z = targetCamZ;
        this.camera.lookAt(0, targetCamY, 0);

        this.isFlying = false;
        this.controls.enabled = true;
        if (this.controls.sphericalDelta) this.controls.sphericalDelta.set(0, 0, 0);
        if (this.controls.panOffset) this.controls.panOffset.set(0, 0, 0);
        this.controls.target.set(0, targetCamY, 0);
        this.controls.update();

        if (onComplete) onComplete();
      }
    };

    requestAnimationFrame(animateFlight);
  }

  resetToOverview({ duration = 1000, onComplete } = {}) {
    this.isFlying = true;
    this.controls.enabled = false;
    if (this.controls.sphericalDelta) this.controls.sphericalDelta.set(0, 0, 0);
    if (this.controls.panOffset) this.controls.panOffset.set(0, 0, 0);
    this.clearVisuals();

    const startCamY = this.camera.position.y;
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

      this.camera.position.y = THREE.MathUtils.lerp(startCamY, 0, ease);
      this.camera.position.z = THREE.MathUtils.lerp(startCamZ, targetCamZ, ease);
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
