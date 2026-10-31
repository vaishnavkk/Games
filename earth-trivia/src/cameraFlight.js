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

    // Active arc line
    this.arcMesh = null;
    this.isFlying = false;
  }

  clearVisuals() {
    while (this.markersGroup.children.length > 0) {
      const child = this.markersGroup.children[0];
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
      this.markersGroup.remove(child);
    }
    this.arcMesh = null;
  }

  // Add 3D surface beacon pin
  createPinMarker(lat, lon, colorHex = 0x10b981) {
    const pinGroup = new THREE.Group();
    const localPt = CountryPicker.latLonToVector3(lat, lon, 1.7);
    const norm = localPt.clone().normalize();

    // Pulsing surface ring
    const ringGeo = new THREE.RingGeometry(0.035, 0.075, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: colorHex,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.95
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.copy(localPt.clone().multiplyScalar(1.002));
    ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), norm);
    pinGroup.add(ring);

    // Vertical light beam
    const beamGeo = new THREE.CylinderGeometry(0.01, 0.025, 0.4, 16);
    const beamMat = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.85
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), norm);
    beam.position.copy(localPt.clone().add(norm.clone().multiplyScalar(0.2)));
    pinGroup.add(beam);

    this.markersGroup.add(pinGroup);
    return pinGroup;
  }

  // Draw 3D Great-Circle Geodesic Arc between Guess and Target
  drawGreatCircleArc(lat1, lon1, lat2, lon2) {
    const v1 = CountryPicker.latLonToVector3(lat1, lon1, 1.7).normalize();
    const v2 = CountryPicker.latLonToVector3(lat2, lon2, 1.7).normalize();

    const distanceKm = haversineDistanceKm(lat1, lon1, lat2, lon2);
    const numPoints = 64;
    const points = [];

    // Altitude peak proportional to distance (up to 0.45 globe radii above surface)
    const angularDist = v1.angleTo(v2);
    const maxAltitude = Math.min(0.45, 0.15 + (angularDist / Math.PI) * 0.35);
    const sinAngle = Math.sin(angularDist);

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
      // Parabolic altitude arc
      const altitude = Math.sin(t * Math.PI) * maxAltitude;
      p.multiplyScalar(1.7 + altitude);
      points.push(p);
    }

    const curve = new THREE.CatmullRomCurve3(points);
    const tubeGeo = new THREE.TubeGeometry(curve, 64, 0.014, 8, false);
    const tubeMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.9
    });

    this.arcMesh = new THREE.Mesh(tubeGeo, tubeMat);
    this.markersGroup.add(this.arcMesh);

    return distanceKm;
  }

  // Fly to country and center it, optionally offsetting for side cards
  flyToCountry(lat, lon, { duration = 1400, isDesktopOffset = false, onComplete } = {}) {
    this.isFlying = true;
    this.controls.enabled = false;

    // Target rotation around Y: -(lon + 90) * rad
    let targetRotY = -((lon + 90) * Math.PI) / 180;

    // If desktop side card is open, offset target slightly so country is in the open 75% area
    if (isDesktopOffset && window.innerWidth > 900) {
      targetRotY -= 0.28; // slight yaw offset to position country to left of center
    }

    // Shortest spherical path
    let curY = this.globeMesh.rotation.y;
    let diffY = (targetRotY - curY) % (Math.PI * 2);
    if (diffY > Math.PI) diffY -= Math.PI * 2;
    if (diffY < -Math.PI) diffY += Math.PI * 2;
    const finalRotY = curY + diffY;

    // Tilt for latitude
    const targetRotX = ((lat * 0.72) * Math.PI) / 180;

    const startRotX = this.globeMesh.rotation.x;
    const startRotY = curY;
    const startCamZ = this.camera.position.z;
    const targetCamZ = 2.4;

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
      this.camera.position.z = THREE.MathUtils.lerp(startCamZ, targetCamZ, ease);
      this.camera.lookAt(0, 0, 0);

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
    const startCamZ = this.camera.position.z;
    const targetCamZ = 4.0;
    const startTime = performance.now();

    const animateReset = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const ease = 1 - Math.pow(1 - progress, 3); // Cubic ease out

      this.globeMesh.rotation.x = THREE.MathUtils.lerp(startRotX, 0.05, ease);
      this.camera.position.z = THREE.MathUtils.lerp(startCamZ, targetCamZ, ease);
      this.camera.lookAt(0, 0, 0);

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
