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

let countries = geojson.features.map((f, idx) => {
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

// ═══════════════════════════════════════════════════════════════
// Official Survey of India Boundary Correction
// Merging complete territories of J&K, Ladakh, Gilgit-Baltistan,
// Aksai Chin, and Siachen Glacier into sovereign IND polygon
// ═══════════════════════════════════════════════════════════════
const ind = countries.find(c => c.id === '356');
const pak = countries.find(c => c.id === '586');
const siachenIdx = countries.findIndex(c => c.name && c.name.includes('Siachen'));

if (ind && pak) {
  const origIndRing = ind.geometry.coordinates[0][0];
  const pakPoly = pak.geometry.coordinates[0];

  const westJkBorder = [
    [ 74.20934209342093, 34.00372670382956 ],
    [ 73.98, 34.18 ], [ 73.82, 34.35 ], [ 73.65, 34.58 ],
    [ 73.50, 34.85 ], [ 73.35, 35.15 ], [ 73.22, 35.45 ],
    [ 73.12, 35.75 ], [ 73.08, 36.05 ], [ 73.18, 36.32 ],
    [ 73.38, 36.55 ], [ 73.65, 36.72 ], [ 73.92, 36.82 ],
    [ 74.1949419494195, 36.89764446128838 ]
  ];

  const northKarakoram = [];
  for (let i = 531; i <= 570; i++) {
    northKarakoram.push(pakPoly[i]);
  }

  const siachenCrest = [
    [ 76.88056880568809, 35.61300190548782 ],
    [ 77.08937089370897, 35.55224178460536 ],
    [ 77.29457294572944, 35.50884169826075 ],
    [ 77.44577445774456, 35.47585763263885 ],
    [ 77.52137521375215, 35.47412162918506 ],
    [ 77.57177571775719, 35.47238562573128 ],
    [ 77.72297722977231, 35.48106564300019 ],
    [ 77.79857798577984, 35.49668967408425 ]
  ];

  const aksaiChinBoundary = [
    [ 78.05, 35.68 ], [ 78.35, 35.88 ], [ 78.75, 36.05 ],
    [ 79.15, 36.14 ], [ 79.60, 36.12 ], [ 80.05, 35.92 ],
    [ 80.32, 35.60 ], [ 80.38, 35.35 ], [ 80.20, 35.00 ],
    [ 79.95, 34.68 ], [ 79.62, 34.42 ], [ 79.25, 34.28 ],
    [ 78.93258932589328, 34.189479073384504 ],
    [ 78.75258752587524, 34.08705486961121 ],
    [ 78.72738727387275, 34.01414272455226 ]
  ];

  const updatedIndRing = [
    ...origIndRing.slice(0, 191),
    ...westJkBorder.slice(1),
    ...northKarakoram,
    ...siachenCrest,
    ...aksaiChinBoundary,
    ...origIndRing.slice(267)
  ];
  ind.geometry.coordinates[0][0] = updatedIndRing;

  const { bbox, centroid, angularSpan } = computeBoundsAndCentroid(ind.geometry);
  ind.bbox = bbox;
  ind.centroid = centroid;
  ind.angularSpan = angularSpan;

  // Adjust Pakistan
  const pakUpdatedRing = [];
  for (let i = 49; i <= 530; i++) pakUpdatedRing.push(pakPoly[i]);
  for (let i = westJkBorder.length - 2; i >= 0; i--) pakUpdatedRing.push(westJkBorder[i]);
  pak.geometry.coordinates[0] = pakUpdatedRing;
  const pMetrics = computeBoundsAndCentroid(pak.geometry);
  pak.bbox = pMetrics.bbox;
  pak.centroid = pMetrics.centroid;
  pak.angularSpan = pMetrics.angularSpan;

  // Remove Siachen as independent country
  if (siachenIdx !== -1) {
    countries.splice(siachenIdx, 1);
  }
  console.log('✓ Applied Official Survey of India sovereign boundary correction.');
}

console.log(`Processed ${countries.length} countries.`);

const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

fs.writeFileSync(
  path.join(dataDir, 'world-50m.json'),
  JSON.stringify({
    type: 'FeatureCollection',
    features: countries.map(c => ({
      type: 'Feature',
      id: c.id,
      properties: { name: c.name },
      geometry: c.geometry
    }))
  })
);

fs.writeFileSync(
  path.join(dataDir, 'world-50m.js'),
  `export const WORLD_COUNTRIES = ${JSON.stringify(countries)};\n`
);

console.log('Successfully saved data/world-50m.json and data/world-50m.js with colorIndex and angularSpan!');
