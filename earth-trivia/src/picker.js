import * as THREE from 'three';
import { WORLD_COUNTRIES } from '../data/world-50m.js';
import { TINY_COUNTRIES } from '../data/tiny-countries.js';

export class CountryPicker {
  constructor(camera, globeMesh) {
    this.camera = camera;
    this.globeMesh = globeMesh;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    // Cache pre-computed bounding boxes and polygons
    this.countries = WORLD_COUNTRIES;
    this.tinyCountries = TINY_COUNTRIES;
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

  // Raycast from mouse / touch screen coordinates [clientX, clientY]
  pickCountry(clientX, clientY, containerWidth, containerHeight) {
    this.mouse.x = (clientX / containerWidth) * 2 - 1;
    this.mouse.y = -(clientY / containerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.globeMesh, false);

    if (intersects.length === 0) {
      return null;
    }

    const hit = intersects[0];
    // Transform hit point into globe's local coordinate space
    const localPoint = this.globeMesh.worldToLocal(hit.point.clone());
    const { lat, lon } = CountryPicker.vector3ToLatLon(localPoint);

    // 1. Check Tiny Countries / Microstates with generous hit radius
    for (const tiny of this.tinyCountries) {
      const [tLon, tLat] = tiny.centroid;
      // Spherical angular distance estimation
      const dLon = (lon - tLon) * Math.cos((lat * Math.PI) / 180);
      const dLat = lat - tLat;
      const degDist = Math.hypot(dLon, dLat);

      if (degDist <= tiny.hitRadius) {
        const fullCountry = this.countries.find(c => c.id === tiny.id);
        if (fullCountry) {
          return {
            country: fullCountry,
            hitLat: tLat,
            hitLon: tLon,
            isTiny: true
          };
        }
      }
    }

    // 2. Test Bounding Box & Point-in-Polygon for all countries
    for (const country of this.countries) {
      const [minLon, minLat, maxLon, maxLat] = country.bbox;

      // Fast Bounding Box check
      let inBbox = false;
      if (maxLon >= minLon) {
        inBbox = (lon >= minLon && lon <= maxLon && lat >= minLat && lat <= maxLat);
      } else {
        // Crosses Date Line
        inBbox = ((lon >= minLon || lon <= maxLon) && lat >= minLat && lat <= maxLat);
      }

      if (!inBbox) continue;

      // Point in Polygon
      if (CountryPicker.testGeometry(lon, lat, country.geometry)) {
        return {
          country,
          hitLat: lat,
          hitLon: lon,
          isTiny: false
        };
      }
    }

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
    // 1. Check Tiny Countries / Microstates
    for (const tiny of this.tinyCountries) {
      const [tLon, tLat] = tiny.centroid;
      const dLon = (lon - tLon) * Math.cos((lat * Math.PI) / 180);
      const dLat = lat - tLat;
      const degDist = Math.hypot(dLon, dLat);

      if (degDist <= tiny.hitRadius) {
        const fullCountry = this.countries.find(c => c.id === tiny.id);
        if (fullCountry) return fullCountry;
      }
    }

    // 2. Test Bounding Box & Point-in-Polygon
    for (const country of this.countries) {
      const [minLon, minLat, maxLon, maxLat] = country.bbox;
      let inBbox = false;
      if (maxLon >= minLon) {
        inBbox = (lon >= minLon && lon <= maxLon && lat >= minLat && lat <= maxLat);
      } else {
        inBbox = ((lon >= minLon || lon <= maxLon) && lat >= minLat && lat <= maxLat);
      }
      if (!inBbox) continue;

      if (CountryPicker.testGeometry(lon, lat, country.geometry)) {
        return country;
      }
    }
    return null;
  }
}
