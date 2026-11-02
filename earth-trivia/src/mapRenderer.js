import * as THREE from 'three';
import { WORLD_COUNTRIES } from '../data/world-50m.js';
import { TINY_COUNTRIES } from '../data/tiny-countries.js';

/**
 * GeoTrivia MapRenderer (Step 2 & 3: "Atlas" Cartographic Direction)
 * - Deep ink-teal ocean & graticules
 * - 5 warm sand and paper tints using greedy graph coloring (no adjacent conflicts)
 * - Crisp 1px dark ink sepia borders (contrast >= 5.0:1)
 * - Two-pass cartographic rendering: fills first, borders on top (zero seam clipping)
 * - High-resolution 4096 x 2048 equirectangular texture (8.38M pixels, 11.3 px/deg)
 * - Direct texture highlight: fill + 2px bright outline
 * - 300ms smooth fill tween
 * - Tiny countries: transparent-center unfilled rings
 * - Zero country names on globe during gameplay
 */
export class MapRenderer {
  constructor() {
    // Ultra-sharp 4096x2048 equirectangular map texture (8.38M pixels, 11.3 px/deg)
    // Only drop to 2048x1024 on legacy low-memory mobile viewports (<480px width with DPR < 2)
    const isLowMemoryMobile = window.innerWidth < 480 && (window.devicePixelRatio || 1) < 2;
    this.width = isLowMemoryMobile ? 2048 : 4096;
    this.height = isLowMemoryMobile ? 1024 : 2048;

    // "Atlas" 5 Muted Land Tints (Perceptually distinct, Delta-E >= 8 across all pairs)
    this.LAND_TINTS = [
      '#f8f2e6', // Tint 0: Pale antique alabaster
      '#e4d8c2', // Tint 1: Warm dune sand
      '#cfbea0', // Tint 2: Desert parchment
      '#baa47f', // Tint 3: Light linen ochre
      '#a38c64'  // Tint 4: Weathered wheat gold
    ];

    // Deep blue ocean colors (#0b1528 or similar deep blue)
    this.COLOR_OCEAN_TOP = '#0b1528';
    this.COLOR_OCEAN_MID = '#081322';
    this.COLOR_OCEAN_BOT = '#050c16';

    // Graticules and borders
    this.COLOR_GRATICULE = 'rgba(255, 255, 255, 0.04)';
    this.COLOR_EQUATOR = 'rgba(255, 255, 255, 0.09)';
    this.COLOR_BORDER = '#2c3b42'; // Dark ink-slate border: >= 5.0:1 contrast against all 5 tints

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
    this._tweenRaf = null;

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

  // Draw Polygon or MultiPolygon (fill & stroke)
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

  // Pure Fill Pass for Polygons
  fillGeometry(ctx, geometry) {
    if (!geometry || !geometry.coordinates) return;

    if (geometry.type === 'Polygon') {
      this.fillPolygonRings(ctx, geometry.coordinates);
    } else if (geometry.type === 'MultiPolygon') {
      for (const poly of geometry.coordinates) {
        this.fillPolygonRings(ctx, poly);
      }
    }
  }

  fillPolygonRings(ctx, rings) {
    for (let r = 0; r < rings.length; r++) {
      const ring = rings[r];
      if (!ring || ring.length < 3) continue;

      ctx.beginPath();
      const [startX, startY] = this.toPixel(ring[0][0], ring[0][1]);
      ctx.moveTo(startX, startY);

      for (let i = 1; i < ring.length; i++) {
        const [px, py] = this.toPixel(ring[i][0], ring[i][1]);
        if (Math.abs(ring[i][0] - ring[i - 1][0]) > 180) {
          ctx.moveTo(px, py);
        } else {
          ctx.lineTo(px, py);
        }
      }
      ctx.closePath();
      ctx.fill();
    }
  }

  // Pure Stroke Pass for Country Borders
  strokeGeometry(ctx, geometry) {
    if (!geometry || !geometry.coordinates) return;

    if (geometry.type === 'Polygon') {
      this.strokePolygonRings(ctx, geometry.coordinates);
    } else if (geometry.type === 'MultiPolygon') {
      for (const poly of geometry.coordinates) {
        this.strokePolygonRings(ctx, poly);
      }
    }
  }

  strokePolygonRings(ctx, rings) {
    for (let r = 0; r < rings.length; r++) {
      const ring = rings[r];
      if (!ring || ring.length < 3) continue;

      ctx.beginPath();
      const [startX, startY] = this.toPixel(ring[0][0], ring[0][1]);
      ctx.moveTo(startX, startY);

      for (let i = 1; i < ring.length; i++) {
        const [px, py] = this.toPixel(ring[i][0], ring[i][1]);
        if (Math.abs(ring[i][0] - ring[i - 1][0]) > 180) {
          ctx.moveTo(px, py);
        } else {
          ctx.lineTo(px, py);
        }
      }
      ctx.closePath();
      ctx.stroke();
    }
  }

  // Generate the permanent base texture with graph coloring and Two-Pass Cartographic Rendering
  initBaseTexture() {
    const ctx = this.baseCtx;
    const w = this.width;
    const h = this.height;

    // 1. Deep Ink-Teal Ocean Gradient
    const oceanGrad = ctx.createLinearGradient(0, 0, 0, h);
    oceanGrad.addColorStop(0, this.COLOR_OCEAN_TOP);
    oceanGrad.addColorStop(0.5, this.COLOR_OCEAN_MID);
    oceanGrad.addColorStop(1, this.COLOR_OCEAN_BOT);
    ctx.fillStyle = oceanGrad;
    ctx.fillRect(0, 0, w, h);

    // 2. Graticule Lat / Lon grid lines
    ctx.strokeStyle = this.COLOR_GRATICULE;
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
    ctx.strokeStyle = this.COLOR_EQUATOR;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();

    // 3. Two-Pass Cartographic Rendering:
    // PASS 1: Fill all land polygons with 5 graph-colored tints
    for (const country of WORLD_COUNTRIES) {
      const tintIndex = country.colorIndex !== undefined ? country.colorIndex : 0;
      ctx.fillStyle = this.LAND_TINTS[tintIndex % 5];
      this.fillGeometry(ctx, country.geometry);
    }

    // PASS 2: Stroke all country borders on top of fills (no border clipping between neighbors)
    ctx.strokeStyle = this.COLOR_BORDER;
    ctx.lineWidth = this.width >= 4096 ? 1.8 : 1.2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    for (const country of WORLD_COUNTRIES) {
      this.strokeGeometry(ctx, country.geometry);
    }

    // 4. Subtle microstate resting markers (unfilled ring for tiny countries)
    for (const tiny of TINY_COUNTRIES) {
      const [tx, ty] = this.toPixel(tiny.centroid[0], tiny.centroid[1]);
      ctx.strokeStyle = 'rgba(74, 90, 102, 0.55)';
      ctx.lineWidth = this.width >= 4096 ? 1.5 : 1.0;
      ctx.beginPath();
      ctx.arc(tx, ty, this.width >= 4096 ? 4.0 : 2.5, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Copy base to active display canvas
    this.ctx.drawImage(this.baseCanvas, 0, 0);

    // Three.js Texture
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.generateMipmaps = true;
    this.texture.minFilter = THREE.LinearMipmapLinearFilter;
    this.texture.magFilter = THREE.LinearFilter;
    this.texture.wrapS = THREE.ClampToEdgeWrapping;
    this.texture.wrapT = THREE.ClampToEdgeWrapping;

    this.isReady = true;
    return this.texture;
  }

  // Draw highlights at a given animation progress fraction (0.0 to 1.0)
  _drawHighlightsAtProgress(progress, {
    correctCountryId = null,
    guessCountryId = null,
    selectedCountryId = null,
    hoveredCountryId = null
  }) {
    // Reset from pre-rendered base
    this.ctx.drawImage(this.baseCanvas, 0, 0);

    const getCountry = (id) => {
      if (!id) return null;
      return this.countryMap.get(id) || this.countryMap.get(String(id).padStart(3, '0'));
    };

    // Draw UNFILLED ring for tiny countries (center stays 100% transparent)
    const drawTinyRing = (countryId, strokeColor, radiusPx = 8) => {
      if (!countryId) return;
      const idStr = String(countryId).padStart(3, '0');
      const tiny = TINY_COUNTRIES.find(t => t.id === idStr);
      if (tiny) {
        const [tx, ty] = this.toPixel(tiny.centroid[0], tiny.centroid[1]);
        this.ctx.save();
        this.ctx.strokeStyle = strokeColor;
        this.ctx.lineWidth = 2.0;
        this.ctx.beginPath();
        this.ctx.arc(tx, ty, radiusPx, 0, Math.PI * 2);
        this.ctx.stroke(); // Unfilled: transparent center
        this.ctx.restore();
      }
    };

    const ringRadius = this.width >= 4096 ? 12 : 7;
    const t = Math.max(0, Math.min(1, progress));

    // 1. Hovered Country (soft golden ivory highlight)
    if (
      hoveredCountryId &&
      hoveredCountryId !== correctCountryId &&
      hoveredCountryId !== guessCountryId &&
      hoveredCountryId !== selectedCountryId
    ) {
      const country = getCountry(hoveredCountryId);
      if (country && country.geometry) {
        this.ctx.fillStyle = `rgba(255, 252, 235, ${(0.40 * t).toFixed(3)})`;
        this.ctx.strokeStyle = '#fff5d6';
        this.ctx.lineWidth = this.width >= 4096 ? 3.0 : 1.8;
        this.drawGeometry(this.ctx, country.geometry);
      }
      drawTinyRing(hoveredCountryId, '#fff5d6', ringRadius);
    }

    // 2. Selected Country (prior to confirmation: warm saffron focus)
    if (
      selectedCountryId &&
      selectedCountryId !== correctCountryId &&
      selectedCountryId !== guessCountryId
    ) {
      const country = getCountry(selectedCountryId);
      if (country && country.geometry) {
        this.ctx.fillStyle = `rgba(217, 125, 16, ${(0.45 * t).toFixed(3)})`;
        this.ctx.strokeStyle = '#d97d10';
        this.ctx.lineWidth = this.width >= 4096 ? 4.0 : 2.5;
        this.drawGeometry(this.ctx, country.geometry);
      }
      drawTinyRing(selectedCountryId, '#d97d10', ringRadius + 2);
    }

    // 3. Wrong Guess Country: Soft translucent brick red fill (#ba3c2a)
    if (guessCountryId && guessCountryId !== correctCountryId) {
      const country = getCountry(guessCountryId);
      if (country && country.geometry) {
        this.ctx.fillStyle = `rgba(186, 60, 42, ${(0.35 * t).toFixed(3)})`;
        this.ctx.strokeStyle = 'transparent';
        this.ctx.lineWidth = 0;
        this.fillGeometry(this.ctx, country.geometry);
      }
    }

    // 4. Correct Target Country: Soft botanical green fill (#1d733e)
    if (correctCountryId) {
      const country = getCountry(correctCountryId);
      if (country && country.geometry) {
        this.ctx.fillStyle = `rgba(29, 115, 62, ${(0.35 * t).toFixed(3)})`;
        this.ctx.strokeStyle = 'transparent';
        this.ctx.lineWidth = 0;
        this.fillGeometry(this.ctx, country.geometry);
      }
    }

    if (this.texture) {
      this.texture.needsUpdate = true;
    }
  }

  // Render dynamic interaction highlights with 300ms fill tween
  renderHighlights({
    correctCountryId = null,
    guessCountryId = null,
    selectedCountryId = null,
    hoveredCountryId = null,
    animate = true
  } = {}) {
    if (!this.isReady) return;

    if (this._tweenRaf) {
      cancelAnimationFrame(this._tweenRaf);
      this._tweenRaf = null;
    }

    const params = { correctCountryId, guessCountryId, selectedCountryId, hoveredCountryId };

    // If hover only or animate=false, draw immediately at 1.0
    if (!animate || (hoveredCountryId && !correctCountryId && !guessCountryId && !selectedCountryId)) {
      this._drawHighlightsAtProgress(1.0, params);
      return;
    }

    const duration = 300; // 300ms fill tween
    const startTime = performance.now();

    const step = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(1.0, elapsed / duration);
      this._drawHighlightsAtProgress(progress, params);
      if (progress < 1.0) {
        this._tweenRaf = requestAnimationFrame(step);
      } else {
        this._tweenRaf = null;
      }
    };

    this._tweenRaf = requestAnimationFrame(step);
  }

  resetHighlights() {
    if (this._tweenRaf) {
      cancelAnimationFrame(this._tweenRaf);
      this._tweenRaf = null;
    }
    if (!this.isReady) return;
    this.ctx.drawImage(this.baseCanvas, 0, 0);
    if (this.texture) {
      this.texture.needsUpdate = true;
    }
  }
}
