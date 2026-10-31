import * as THREE from 'three';
import { WORLD_COUNTRIES } from '../data/world-50m.js';
import { TINY_COUNTRIES } from '../data/tiny-countries.js';

export class MapRenderer {
  constructor() {
    // Choose texture resolution (2048x1024 mobile / 4096x2048 high-DPI desktop)
    const isDesktop = window.innerWidth > 900 && (window.devicePixelRatio || 1) >= 1.5;
    this.width = isDesktop ? 4096 : 2048;
    this.height = isDesktop ? 2048 : 1024;

    // Base pre-rendered canvas (generated once on startup)
    this.baseCanvas = document.createElement('canvas');
    this.baseCanvas.width = this.width;
    this.baseCanvas.height = this.height;
    this.baseCtx = this.baseCanvas.getContext('2d');

    // Dynamic display canvas (used as Three.js texture)
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.ctx = this.canvas.getContext('2d');

    this.texture = null;
    this.isReady = false;

    // Fast lookup of countries by ID
    this.countryMap = new Map();
    WORLD_COUNTRIES.forEach(c => this.countryMap.set(c.id, c));
  }

  // Convert (lon, lat) to Equirectangular pixel coordinates
  toPixel(lon, lat) {
    const x = ((lon + 180) / 360) * this.width;
    const y = ((90 - lat) / 180) * this.height;
    return [x, y];
  }

  // Draw a Polygon or MultiPolygon onto canvas context
  drawGeometry(ctx, geometry) {
    if (!geometry || !geometry.coordinates) return;

    if (geometry.type === 'Polygon') {
      this.drawPolygonRings(ctx, geometry.coordinates);
    } else if (geometry.type === 'MultiPolygon') {
      for (const poly of geometry.coordinates) {
        this.drawPolygonRings(ctx, poly);
      }
    }
  }

  drawPolygonRings(ctx, rings) {
    for (let r = 0; r < rings.length; r++) {
      const ring = rings[r];
      if (!ring || ring.length < 3) continue;

      ctx.beginPath();
      const [startX, startY] = this.toPixel(ring[0][0], ring[0][1]);
      ctx.moveTo(startX, startY);

      for (let i = 1; i < ring.length; i++) {
        const [px, py] = this.toPixel(ring[i][0], ring[i][1]);
        // Handle longitude wrapping edge artifacts
        if (Math.abs(ring[i][0] - ring[i - 1][0]) > 180) {
          ctx.moveTo(px, py);
        } else {
          ctx.lineTo(px, py);
        }
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }

  // Generate the permanent base border texture once
  initBaseTexture() {
    const ctx = this.baseCtx;
    const w = this.width;
    const h = this.height;

    // 1. Deep Ocean Background
    const oceanGrad = ctx.createLinearGradient(0, 0, 0, h);
    oceanGrad.addColorStop(0, '#07101e');
    oceanGrad.addColorStop(0.5, '#050b14');
    oceanGrad.addColorStop(1, '#03070d');
    ctx.fillStyle = oceanGrad;
    ctx.fillRect(0, 0, w, h);

    // 2. Subtle Equirectangular Grid Lines (Lat / Lon)
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.06)';
    ctx.lineWidth = 1;
    for (let lon = -180; lon <= 180; lon += 30) {
      const [x] = this.toPixel(lon, 0);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let lat = -90; lat <= 90; lat += 30) {
      const [, y] = this.toPixel(0, lat);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Equator accent line
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.16)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();

    // 3. Render all land polygons
    ctx.fillStyle = '#142033';
    ctx.strokeStyle = 'rgba(148, 190, 235, 0.38)';
    ctx.lineWidth = this.width > 2048 ? 1.5 : 1.0;

    for (const country of WORLD_COUNTRIES) {
      this.drawGeometry(ctx, country.geometry);
    }

    // 4. Subtle tiny country dots for microstates
    for (const tiny of TINY_COUNTRIES) {
      const [tx, ty] = this.toPixel(tiny.centroid[0], tiny.centroid[1]);
      ctx.fillStyle = 'rgba(56, 189, 248, 0.7)';
      ctx.beginPath();
      ctx.arc(tx, ty, this.width > 2048 ? 3.5 : 2.0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Copy base to active canvas
    this.ctx.drawImage(this.baseCanvas, 0, 0);

    // Create Three.js Canvas Texture
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.anisotropy = 4;
    this.texture.generateMipmaps = true;
    this.texture.minFilter = THREE.LinearMipmapLinearFilter;
    this.texture.magFilter = THREE.LinearFilter;
    this.texture.wrapS = THREE.ClampToEdgeWrapping;
    this.texture.wrapT = THREE.ClampToEdgeWrapping;

    this.isReady = true;
    return this.texture;
  }

  // Re-render highlight states (fast drawImage + overlay polygon fills)
  renderHighlights({ correctCountryId = null, guessCountryId = null, hoveredCountryId = null } = {}) {
    if (!this.isReady) return;

    // Reset from pre-rendered base
    this.ctx.drawImage(this.baseCanvas, 0, 0);

    // Hovered Country
    if (hoveredCountryId && hoveredCountryId !== correctCountryId && hoveredCountryId !== guessCountryId) {
      const country = this.countryMap.get(hoveredCountryId);
      if (country) {
        this.ctx.fillStyle = 'rgba(6, 182, 212, 0.35)';
        this.ctx.strokeStyle = '#38bdf8';
        this.ctx.lineWidth = this.width > 2048 ? 3 : 2;
        this.drawGeometry(this.ctx, country.geometry);
      }
    }

    // Wrong Guess Country (Red)
    if (guessCountryId && guessCountryId !== correctCountryId) {
      const country = this.countryMap.get(guessCountryId);
      if (country) {
        this.ctx.fillStyle = 'rgba(239, 68, 68, 0.65)';
        this.ctx.strokeStyle = '#ef4444';
        this.ctx.lineWidth = this.width > 2048 ? 4 : 2.5;
        this.drawGeometry(this.ctx, country.geometry);
      }
    }

    // Correct Country (Green)
    if (correctCountryId) {
      const country = this.countryMap.get(correctCountryId);
      if (country) {
        this.ctx.fillStyle = 'rgba(16, 185, 129, 0.72)';
        this.ctx.strokeStyle = '#34d399';
        this.ctx.lineWidth = this.width > 2048 ? 4.5 : 3.0;
        this.drawGeometry(this.ctx, country.geometry);
      }
    }

    // Notify Three.js to re-upload updated texture
    if (this.texture) {
      this.texture.needsUpdate = true;
    }
  }

  resetHighlights() {
    if (!this.isReady) return;
    this.ctx.drawImage(this.baseCanvas, 0, 0);
    if (this.texture) {
      this.texture.needsUpdate = true;
    }
  }
}
