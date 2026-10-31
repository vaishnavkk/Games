import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { MapRenderer } from './mapRenderer.js';
import { CameraFlightController } from './cameraFlight.js';
import { CountryPicker } from './picker.js';

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
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;
    this.container.appendChild(this.renderer.domElement);

    // Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 2.0;
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

    // Globe Mesh
    const sphereGeo = new THREE.SphereGeometry(1.7, 64, 64);
    const sphereMat = new THREE.MeshPhongMaterial({
      map: texture,
      shininess: 20,
      specular: new THREE.Color(0x334466)
    });
    this.earthMesh = new THREE.Mesh(sphereGeo, sphereMat);
    this.earthMesh.rotation.y = -Math.PI / 2;
    this.scene.add(this.earthMesh);

    // Atmospheric Glow Shell
    this.createAtmosphere();

    // Cosmic Stars
    this.createStars();

    // Lighting
    const ambient = new THREE.AmbientLight(0xdde8ff, 0.9);
    this.scene.add(ambient);
    const sunLight = new THREE.DirectionalLight(0xffffff, 1.5);
    sunLight.position.set(5, 3, 5);
    this.scene.add(sunLight);
    const rimLight = new THREE.DirectionalLight(0x06b6d4, 0.7);
    rimLight.position.set(-5, -2, -4);
    this.scene.add(rimLight);

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

  createAtmosphere() {
    const atmosGeo = new THREE.SphereGeometry(1.7 * 1.035, 64, 64);
    const atmosMat = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        void main() {
          float intensity = pow(0.72 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.4);
          gl_FragColor = vec4(0.02, 0.72, 0.88, 1.0) * intensity * 1.5;
        }
      `,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true
    });
    const atmosphere = new THREE.Mesh(atmosGeo, atmosMat);
    this.scene.add(atmosphere);
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
  }

  animate(time) {
    requestAnimationFrame(this.animate);

    // Resume idle rotation if untouched for 3.5 seconds
    if (!this.flight.isFlying && !this.isAutoRotating) {
      if (performance.now() - this.lastInteractionTime > 3500) {
        this.isAutoRotating = true;
      }
    }

    if (this.isAutoRotating && !this.flight.isFlying) {
      this.earthMesh.rotation.y += 0.001;
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
