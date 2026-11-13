import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { MapRenderer } from './mapRenderer.js';
import { CameraFlightController } from './cameraFlight.js';
import { CountryPicker } from './picker.js';
import { WORLD_COUNTRIES } from '../data/world-50m.js';

export class GlobeApp {
  constructor(containerEl) {
    this.container = containerEl;
    this.width = containerEl.clientWidth || window.innerWidth;
    this.height = containerEl.clientHeight || window.innerHeight;

    // Three.js Core
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, this.width / this.height, 0.1, 1000);
    this.camera.position.set(0, 0, 4.0);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(this.width, this.height);
    // Cap devicePixelRatio at 2.0 for optimal balance of razor sharpness and rendering performance
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2.0));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.20;
    this.container.appendChild(this.renderer.domElement);

    // Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    const isFast = (typeof window !== 'undefined' && window.__FAST_MODE) ||
      (typeof window !== 'undefined' && typeof window.location !== 'undefined' && 
       new URLSearchParams(window.location.search).get('fast') === '1');
    this.controls.dampingFactor = isFast ? 0.25 : 0.05;
    this.controls.minDistance = 2.52;
    this.controls.maxDistance = 6.5;
    this.controls.enablePan = false;
    this.controls.rotateSpeed = 0.6;
    this.controls.zoomSpeed = 0.8;

    // Auto-rotation state
    this.isAutoRotating = true;
    this.lastInteractionTime = performance.now();

    // Map Renderer
    this.mapRenderer = new MapRenderer();
    const texture = this.mapRenderer.initBaseTexture();

    // Set anisotropic filtering to GPU maximum to preserve sharpness at grazing angles
    const maxAnisotropy = this.renderer.capabilities.getMaxAnisotropy();
    texture.anisotropy = Math.max(4, maxAnisotropy);

    // Globe Mesh (128x128 segments = 16,384 vertices for a perfectly round silhouette)
    const sphereGeo = new THREE.SphereGeometry(1.7, 128, 128);
    const sphereMat = new THREE.MeshPhongMaterial({
      map: texture,
      shininess: 8,
      specular: new THREE.Color(0x101a24)
    });
    this.earthMesh = new THREE.Mesh(sphereGeo, sphereMat);
    this.earthMesh.rotation.y = -Math.PI / 2;
    this.scene.add(this.earthMesh);

    // True 3D Spherical Vector Border Mesh (Razor-sharp 3D vector geometry across all zooms)
    this.createVectorBorders();

    // Cosmic Stars (No atmosphere glow shell: completely removed to ensure clean, sharp Earth edges)
    this.createStars();

    // Balanced Natural Lighting (Pure white illumination, no artificial colored rim glow)
    const ambient = new THREE.AmbientLight(0xffffff, 1.15);
    this.scene.add(ambient);
    const sunLight = new THREE.DirectionalLight(0xffffff, 1.25);
    sunLight.position.set(5, 3, 5);
    this.scene.add(sunLight);
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.40);
    fillLight.position.set(-5, -2, -4);
    this.scene.add(fillLight);

    // Subsystems
    this.picker = new CountryPicker(this.camera, this.earthMesh);
    this.flight = new CameraFlightController(this.camera, this.earthMesh, this.controls);

    // Event Listeners
    window.addEventListener('resize', this.onResize.bind(this));
    this.bindInteraction();

    // Render loop
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  // True 3D Spherical Vector Border Mesh (surface-offset vector geometry for ultra-crisp borders)
  createVectorBorders() {
    const positions = [];
    const radius = 1.7018; // 0.1% surface offset to guarantee zero z-fighting

    for (const country of WORLD_COUNTRIES) {
      const geom = country.geometry;
      if (!geom || !geom.coordinates) continue;

      const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates;
      for (const poly of polys) {
        for (const ring of poly) {
          if (!ring || ring.length < 2) continue;
          for (let i = 0; i < ring.length; i++) {
            const nextIdx = (i + 1) % ring.length;
            const p1 = ring[i];
            const p2 = ring[nextIdx];
            // Skip segments crossing the antimeridian seam
            if (Math.abs(p2[0] - p1[0]) > 180) continue;
            // Skip artificial antimeridian split seam
            if (Math.abs(p1[0]) >= 179.99 && Math.abs(p2[0]) >= 179.99) continue;

            const v1 = CountryPicker.latLonToVector3(p1[1], p1[0], radius);
            const v2 = CountryPicker.latLonToVector3(p2[1], p2[0], radius);

            positions.push(v1.x, v1.y, v1.z);
            positions.push(v2.x, v2.y, v2.z);
          }
        }
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
    const mat = new THREE.LineBasicMaterial({
      color: 0x22323d,
      transparent: true,
      opacity: 0.85,
      depthTest: true
    });
    this.borderMesh = new THREE.LineSegments(geo, mat);
    this.earthMesh.add(this.borderMesh);
  }


  setMicrostateTarget(target) {
    if (!target) {
      this.activeMicrostate = null;
      const ring = document.getElementById('microstateRing');
      if (ring) ring.style.display = 'none';
      return;
    }
    const bbox = target.bbox;
    const w = bbox ? Math.abs(bbox[2] - bbox[0]) : (target.angularSpan || 0);
    if (w < 3.0 || (target.id && ['336', '492', '674', '438', '020', '470', '584', '798', '296'].includes(String(target.id).padStart(3, '0')))) {
      const lat = target.lat !== undefined ? target.lat : (target.centroid ? target.centroid[1] : 0);
      const lon = target.lon !== undefined ? target.lon : (target.centroid ? target.centroid[0] : 0);
      this.activeMicrostate = { target, lat, lon };
    } else {
      this.activeMicrostate = null;
      const ring = document.getElementById('microstateRing');
      if (ring) ring.style.display = 'none';
    }
  }
  createStars() {
    const starGeo = new THREE.BufferGeometry();
    const starCount = 1000;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i += 3) {
      const r = 35 + Math.random() * 45;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      starPositions[i] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPositions[i + 2] = r * Math.cos(phi);
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0x93c5fd,
      size: 0.65,
      transparent: true,
      opacity: 0.85
    });
    const stars = new THREE.Points(starGeo, starMat);
    this.scene.add(stars);
  }

  bindInteraction() {
    const onUserActive = () => {
      this.isAutoRotating = false;
      this.lastInteractionTime = performance.now();
    };

    const dom = this.renderer.domElement;
    dom.addEventListener('pointerdown', onUserActive);
    dom.addEventListener('wheel', onUserActive);
  }

  onResize() {
    this.width = this.container.clientWidth || window.innerWidth;
    this.height = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width, this.height);
    if (this.flight) {
      this.flight.resize(this.width, this.height);
    }
  }

  animate(time) {
    requestAnimationFrame(this.animate);

    // Auto-rotation only resumes when NOT viewing a result card or selecting a country
    const isViewingResult = window.game && (window.game.phase === 'result' || window.game.phase === 'selected');

    if (!this.flight.isFlying && !this.isAutoRotating && !isViewingResult) {
      if (performance.now() - this.lastInteractionTime > 3500) {
        this.isAutoRotating = true;
      }
    }

    if (this.isAutoRotating && !this.flight.isFlying && !isViewingResult) {
      this.earthMesh.rotation.y += 0.001;
    }

    // Never fight active camera flight
    if (!this.flight.isFlying) {
      this.controls.update();
    }

    // Dynamic distance badge scaling so zooming in stays crystal clear and un-crowded
    if (this.flight && this.flight.distanceSprite) {
      const sprite = this.flight.distanceSprite;
      const camDist = this.camera.position.distanceTo(sprite.position);
      const scaleFactor = Math.max(0.35, Math.min(2.0, camDist / 3.8));
      const base = (sprite.userData && sprite.userData.baseScale) || { x: 0.24, y: 0.09 };
      sprite.scale.set(base.x * scaleFactor, base.y * scaleFactor, 1);
    }

    // Microstate HTML/SVG overlay ring projection (Step 3d)
    const ring = document.getElementById('microstateRing');
    if (ring) {
      if (this.activeMicrostate) {
        const localPt = CountryPicker.latLonToVector3(this.activeMicrostate.lat, this.activeMicrostate.lon, 1.7);
        const worldPt = localPt.clone().applyMatrix4(this.earthMesh.matrixWorld);
        const toCam = this.camera.position.clone().sub(worldPt).normalize();
        const norm = worldPt.clone().normalize();
        const isFacing = norm.dot(toCam) > 0.05;

        if (isFacing) {
          const p = worldPt.clone().project(this.camera);
          const w = this.renderer.domElement.clientWidth;
          const h = this.renderer.domElement.clientHeight;
          const x = (p.x * 0.5 + 0.5) * w;
          const y = (-p.y * 0.5 + 0.5) * h;
          ring.style.display = 'block';
          ring.style.left = `${Math.round(x - 28)}px`;
          ring.style.top = `${Math.round(y - 28)}px`;
        } else {
          ring.style.display = 'none';
        }
      } else {
        ring.style.display = 'none';
      }
    }

    this.renderer.render(this.scene, this.camera);
  }
}
