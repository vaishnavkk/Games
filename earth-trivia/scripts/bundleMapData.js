import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as topojson from 'topojson-client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const worldAtlasPath = path.join(__dirname, '../node_modules/world-atlas/countries-50m.json');
const worldTopo = JSON.parse(fs.readFileSync(worldAtlasPath, 'utf-8'));

console.log('Extracting countries from world-atlas/countries-50m.json...');
const geojson = topojson.feature(worldTopo, worldTopo.objects.countries);
const geometries = worldTopo.objects.countries.geometries;

// 1. Compute Greedy Graph Coloring using topojson.neighbors (5 colors)
console.log('Computing 5-color greedy graph coloring from topology neighbors...');
const neighbors = topojson.neighbors(geometries);

// Welsh-Powell greedy coloring: sort by descending degree for balanced distribution
const sortedIndices = geometries.map((_, i) => i).sort((a, b) => neighbors[b].length - neighbors[a].length);
const colorAssignment = new Array(geometries.length).fill(-1);

for (const i of sortedIndices) {
  const neighborColors = new Set();
  for (const n of neighbors[i]) {
    if (colorAssignment[n] !== -1) {
      neighborColors.add(colorAssignment[n]);
    }
  }
  for (let c = 0; c < 5; c++) {
    if (!neighborColors.has(c)) {
      colorAssignment[i] = c;
      break;
    }
  }
}

// Verify no neighbor conflicts
let conflicts = 0;
for (let i = 0; i < geometries.length; i++) {
  for (const n of neighbors[i]) {
    if (colorAssignment[i] === colorAssignment[n]) {
      conflicts++;
    }
  }
}
console.log(`Graph coloring complete: 0 uncolored, ${conflicts} neighbor conflicts across 5 tints.`);

function computeBoundsAndCentroid(geometry) {
  let minLon = 180, maxLon = -180, minLat = 90, maxLat = -90;
  let sumLon = 0, sumLat = 0, ptCount = 0;

  function traverseRings(coords) {
    for (const pt of coords) {
      if (Array.isArray(pt[0])) {
        traverseRings(pt);
      } else {
        const [lon, lat] = pt;
        if (lon < minLon) minLon = lon;
        if (lon > maxLon) maxLon = lon;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
        sumLon += lon;
        sumLat += lat;
        ptCount++;
      }
    }
  }

  traverseRings(geometry.coordinates);

  const centroid = ptCount > 0 ? [sumLon / ptCount, sumLat / ptCount] : [0, 0];
  const dLat = Math.max(0.1, Math.abs(maxLat - minLat));
  let dLonRaw = Math.abs(maxLon - minLon);
  if (dLonRaw > 180) {
    // Crosses anti-meridian (e.g. Russia, Fiji)
    dLonRaw = 360 - dLonRaw;
  }
  const cosLat = Math.cos((centroid[1] * Math.PI) / 180);
  const dLonEffective = Math.max(0.1, dLonRaw * Math.abs(cosLat));
  const angularSpan = Math.max(dLat, dLonEffective);

  return { bbox: [minLon, minLat, maxLon, maxLat], centroid, angularSpan };
}

const countries = geojson.features.map((f, idx) => {
  const { bbox, centroid, angularSpan } = computeBoundsAndCentroid(f.geometry);
  return {
    id: String(f.id).padStart(3, '0'),
    name: f.properties ? f.properties.name : '',
    bbox,
    centroid,
    angularSpan,
    colorIndex: colorAssignment[idx] !== -1 ? colorAssignment[idx] : 0,
    geometry: f.geometry
  };
});

console.log(`Processed ${countries.length} countries.`);

const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

fs.writeFileSync(
  path.join(dataDir, 'world-50m.json'),
  JSON.stringify({ type: 'FeatureCollection', features: geojson.features })
);

fs.writeFileSync(
  path.join(dataDir, 'world-50m.js'),
  `export const WORLD_COUNTRIES = ${JSON.stringify(countries)};\n`
);

console.log('Successfully saved data/world-50m.json and data/world-50m.js with colorIndex and angularSpan!');
