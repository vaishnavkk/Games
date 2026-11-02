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
  return Math.round(R * c);
}

export class CameraFlightController {
  constructor(camera, globeMesh, controls) {
    this.camera = camera;
    this.globeMesh = globeMesh;
    this.controls = controls;

    // Visual markers container
    this.markersGroup = new THREE.Group();
    this.globeMesh.add(this.markersGroup);

    this.arcMesh = null;
    this.distanceSprite = null;
    this.isFlying = false;

    // Min and max camera distance bounds
    this.MIN_CAMERA_Z = 1.45;
    this.MAX_CAMERA_Z = 2.75;
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
  }

  // Compute camera distance so target fills 50-60% of free area
  computeTargetDistance(angularSpanDeg) {
    const span = Math.min(65, Math.max(0.5, angularSpanDeg || 8));
    // Square-root progressive scaling from minZ (1.45) for microstates to maxZ (2.75) for Russia/Canada/China/USA
    const t = Math.pow((span - 0.5) / (65 - 0.5), 0.5);
    return this.MIN_CAMERA_Z + t * (this.MAX_CAMERA_Z - this.MIN_CAMERA_Z);
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
  drawGreatCircleArc(lat1, lon1, lat2, lon2) {
    const v1 = CountryPicker.latLonToVector3(lat1, lon1, 1.7).normalize();
    const v2 = CountryPicker.latLonToVector3(lat2, lon2, 1.7).normalize();

    const distanceKm = haversineDistanceKm(lat1, lon1, lat2, lon2);
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
      this.createDistanceBadge(distanceKm, midpointVec);
    }

    return distanceKm;
  }

  // Smooth camera flight and framing
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

    // Determine target center and distance
    let centerLat = targetLat;
    let centerLon = targetLon;
    let targetCamZ = this.computeTargetDistance(angularSpan);

    // Check wrong answer framing: frame both if both fit with target >= 25% of free area
    if (guessLat !== null && guessLon !== null) {
      const vTarget = CountryPicker.latLonToVector3(targetLat, targetLon, 1.7).normalize();
      const vGuess = CountryPicker.latLonToVector3(guessLat, guessLon, 1.7).normalize();
      const angularDistDeg = (vTarget.angleTo(vGuess) * 180) / Math.PI;

      // If angular distance is moderate (< 55°), frame midpoint between guess and target
      if (angularDistDeg < 55) {
        const vMid = vTarget.clone().add(vGuess).normalize();
        const midCoords = CountryPicker.vector3ToLatLon(vMid.multiplyScalar(1.7));
        centerLat = midCoords.lat;
        centerLon = midCoords.lon;
        // Adjust distance so both fit
        const requiredZ = Math.max(targetCamZ, 1.8 + (angularDistDeg / 55) * 0.75);
        targetCamZ = Math.min(this.MAX_CAMERA_Z, requiredZ);
      } else {
        // Extreme distance (e.g. > 55°): framing both would make target < 25% of free area; frame target directly
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

    // Shortest spherical path
    let curY = this.globeMesh.rotation.y;
    let diffY = (targetRotY - curY) % (Math.PI * 2);
    if (diffY > Math.PI) diffY -= Math.PI * 2;
    if (diffY < -Math.PI) diffY += Math.PI * 2;
    const finalRotY = curY + diffY;

    // Tilt for latitude
    const targetRotX = (centerLat * Math.PI) / 180;

    // Mobile vertical camera offset (places country at y ~ 0.38H, above 30% bottom sheet)
    const isMobile = window.innerWidth <= 640 || (window.innerWidth <= 900 && window.innerHeight > window.innerWidth);
    const targetCamY = isMobile ? -0.10 : 0;
    const startCamY = this.camera.position.y || 0;

    const startRotX = this.globeMesh.rotation.x;
    const startRotY = curY;
    const startCamZ = this.camera.position.z;

    const startTime = performance.now();

    const animateFlight = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      // Smooth cubic ease-in-out
      const ease =
        progress < 0.5
          ? 4 * progress * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      this.globeMesh.rotation.x = THREE.MathUtils.lerp(startRotX, targetRotX, ease);
      this.globeMesh.rotation.y = THREE.MathUtils.lerp(startRotY, finalRotY, ease);
      const camY = THREE.MathUtils.lerp(startCamY, targetCamY, ease);
      this.camera.position.y = camY;
      this.camera.position.z = THREE.MathUtils.lerp(startCamZ, targetCamZ, ease);
      this.camera.lookAt(0, camY, 0);

      if (progress < 1) {
        requestAnimationFrame(animateFlight);
      } else {
        this.isFlying = false;
        this.controls.enabled = true;
        if (onComplete) onComplete();
      }
    };

    requestAnimationFrame(animateFlight);
  }

  // Smooth reset to overview orbit
  resetToOverview({ duration = 1000, onComplete } = {}) {
    this.clearVisuals();
    this.isFlying = true;
    this.controls.enabled = false;

    const startRotX = this.globeMesh.rotation.x;
    const startCamY = this.camera.position.y || 0;
    const targetCamY = 0;
    const startCamZ = this.camera.position.z;
    const targetCamZ = 3.8;
    const startTime = performance.now();

    const animateReset = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const ease = 1 - Math.pow(1 - progress, 3);

      this.globeMesh.rotation.x = THREE.MathUtils.lerp(startRotX, 0.05, ease);
      const camY = THREE.MathUtils.lerp(startCamY, targetCamY, ease);
      this.camera.position.y = camY;
      this.camera.position.z = THREE.MathUtils.lerp(startCamZ, targetCamZ, ease);
      this.camera.lookAt(0, camY, 0);

      if (progress < 1) {
        requestAnimationFrame(animateReset);
      } else {
        this.isFlying = false;
        this.controls.enabled = true;
        if (onComplete) onComplete();
      }
    };

    requestAnimationFrame(animateReset);
  }
}
