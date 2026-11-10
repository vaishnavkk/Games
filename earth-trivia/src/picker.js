function computeGeometryArea(geometry) {
  if (!geometry || !geometry.coordinates) return Infinity;
  let totalArea = 0;
  const polys = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  for (const poly of polys) {
    const ring = poly[0];
    if (!ring || ring.length < 3) continue;
    let a = 0;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const latMid = ((ring[i][1] + ring[j][1]) / 2) * (Math.PI / 180);
      const cosLat = Math.cos(latMid);
      const x1 = ring[j][0] * cosLat, y1 = ring[j][1];
      const x2 = ring[i][0] * cosLat, y2 = ring[i][1];
      a += (x1 * y2) - (x2 * y1);
    }
    totalArea += Math.abs(a) * 0.5;
  }
  return totalArea;
}

import * as THREE from 'three';
import { WORLD_COUNTRIES } from '../data/world-50m.js';
import { TINY_COUNTRIES } from '../data/tiny-countries.js';
import { COUNTRIES_DB } from '../data/countries.js';

export class CountryPicker {
  constructor(camera, globeMesh) {
    this.camera = camera;
    this.globeMesh = globeMesh;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    // Cache pre-computed bounding boxes and polygons
    this.countries = WORLD_COUNTRIES;
    this.tinyCountries = TINY_COUNTRIES;
    this.dbCountries = COUNTRIES_DB;
    this.canvas = null;
  }

  // Enrich country feature with trivia metadata (flag, capital, landmark, etc.)
  _enrichCountry(country) {
    if (!country) return null;
    const id3 = String(country.id).padStart(3, '0');
    const dbMatch = this.dbCountries.find(c => String(c.id).padStart(3, '0') === id3);
    if (dbMatch) {
      return {
        ...country,
        ...dbMatch,
        // preserve GeoJSON geometry and bbox from world-50m
        geometry: country.geometry || dbMatch.geometry,
        bbox: country.bbox || dbMatch.bbox
      };
    }
    return country;
  }

  // Convert 3D Sphere Local Point to (lat, lon)
  static vector3ToLatLon(localVec) {
    const norm = localVec.clone().normalize();

    // lat in [-90, 90]
    const lat = Math.asin(Math.max(-1, Math.min(1, norm.y))) * (180 / Math.PI);

    // theta in [0, 2PI] => lon in [-180, 180]
    let theta = Math.atan2(norm.z, -norm.x);
    if (theta < 0) theta += Math.PI * 2;
    let lon = (theta * 180 / Math.PI) - 180;

    // Normalize
    while (lon < -180) lon += 360;
    while (lon > 180) lon -= 360;

    return { lat, lon };
  }

  // Convert (lat, lon) to 3D Sphere Local Vector
  static latLonToVector3(lat, lon, radius = 1.7) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);

    const x = -radius * Math.cos(theta) * Math.sin(phi);
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(theta) * Math.sin(phi);

    return new THREE.Vector3(x, y, z);
  }

  // Standard raycasting Point-in-Polygon test
  static pointInPolygonRings(lon, lat, rings) {
    if (!rings || rings.length === 0) return false;

    // Exterior ring
    const exterior = rings[0];
    let inside = false;
    for (let i = 0, j = exterior.length - 1; i < exterior.length; j = i++) {
      const xi = exterior[i][0], yi = exterior[i][1];
      const xj = exterior[j][0], yj = exterior[j][1];
      const intersect = ((yi > lat) !== (yj > lat)) &&
        (lon < (xj - xi) * (lat - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }

    if (!inside) return false;

    // Check interior holes
    for (let h = 1; h < rings.length; h++) {
      const hole = rings[h];
      let inHole = false;
      for (let i = 0, j = hole.length - 1; i < hole.length; j = i++) {
        const xi = hole[i][0], yi = hole[i][1];
        const xj = hole[j][0], yj = hole[j][1];
        const intersect = ((yi > lat) !== (yj > lat)) &&
          (lon < (xj - xi) * (lat - yi) / (yj - yi) + xi);
        if (intersect) inHole = !inHole;
      }
      if (inHole) return false;
    }

    return true;
  }

  // Test if point is inside a GeoJSON Geometry
  static testGeometry(lon, lat, geometry) {
    if (!geometry) return false;
    if (geometry.type === 'Polygon') {
      return CountryPicker.pointInPolygonRings(lon, lat, geometry.coordinates);
    } else if (geometry.type === 'MultiPolygon') {
      for (const poly of geometry.coordinates) {
        if (CountryPicker.pointInPolygonRings(lon, lat, poly)) {
          return true;
        }
      }
    }
    return false;
  }

  // Single unified resolution logic for both coordinate lookups and 3D raycasting
  _resolveCountryAtLatLon(lat, lon) {
    // 1. Polygon hit ALWAYS wins: Check Bounding Box & Point-in-Polygon for all countries
    // Step 3c: When several polygons contain the point, the smallest-area one wins
    let bestCountry = null;
    let minArea = Infinity;

    for (const country of this.countries) {
      const [minLon, minLat, maxLon, maxLat] = country.bbox;
      const inBbox = maxLon >= minLon
        ? (lon >= minLon && lon <= maxLon && lat >= minLat && lat <= maxLat)
        : ((lon >= minLon || lon <= maxLon) && lat >= minLat && lat <= maxLat);

      if (inBbox && CountryPicker.testGeometry(lon, lat, country.geometry)) {
        const area = computeGeometryArea(country.geometry);
        if (area < minArea) {
          minArea = area;
          bestCountry = country;
        }
      }
    }

    if (bestCountry) {
      return {
        country: this._enrichCountry(bestCountry),
        hitLat: lat,
        hitLon: lon,
        isTiny: false
      };
    }

    // 2. Microstate Fallback: Nearest buffer wins
    let bestTiny = null;
    let minDegDist = Infinity;
    const cosLat = Math.cos((lat * Math.PI) / 180);

    for (const tiny of this.tinyCountries) {
      const [tLon, tLat] = tiny.centroid;
      const dLon = (lon - tLon) * cosLat;
      const dLat = lat - tLat;
      const degDist = Math.hypot(dLon, dLat);

      if (degDist <= tiny.hitRadius && degDist < minDegDist) {
        minDegDist = degDist;
        bestTiny = tiny;
      }
    }

    if (bestTiny) {
      const fullCountry = this.countries.find(c => String(c.id).padStart(3, '0') === bestTiny.id)
        || this.dbCountries.find(c => String(c.id).padStart(3, '0') === bestTiny.id);
      if (fullCountry) {
        return {
          country: this._enrichCountry(fullCountry),
          hitLat: bestTiny.centroid[1],
          hitLon: bestTiny.centroid[0],
          isTiny: true
        };
      }
    }

    return null;
  }

  // Raycast from mouse / touch screen coordinates [clientX, clientY]
  pickCountry(clientX, clientY, containerWidth, containerHeight) {
    if (!this.canvas) {
      this.canvas = document.querySelector('#webgl-container canvas');
    }
    if (this.canvas) {
      const rect = this.canvas.getBoundingClientRect();
      const rw = rect.width || containerWidth;
      const rh = rect.height || containerHeight;
      this.mouse.x = ((clientX - rect.left) / rw) * 2 - 1;
      this.mouse.y = -((clientY - rect.top) / rh) * 2 + 1;
    } else {
      this.mouse.x = (clientX / containerWidth) * 2 - 1;
      this.mouse.y = -(clientY / containerHeight) * 2 + 1;
    }

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.globeMesh, false);
    if (intersects.length === 0) return null;

    const hit = intersects[0];
    const localPoint = this.globeMesh.worldToLocal(hit.point.clone());
    const { lat, lon } = CountryPicker.vector3ToLatLon(localPoint);

    const hitResult = this._resolveCountryAtLatLon(lat, lon);
    if (hitResult) return hitResult;

    // Clicked in ocean or unassigned territory
    return {
      country: null,
      hitLat: lat,
      hitLon: lon,
      isOcean: true
    };
  }

  // Lookup country directly by lat/lon (used for coordinate & microstate testing)
  findCountryAtLatLon(lat, lon) {
    const result = this._resolveCountryAtLatLon(lat, lon);
    return result ? result.country : null;
  }
}
