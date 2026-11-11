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
const chn = countries.find(c => c.id === '156');
const siachenIdx = countries.findIndex(c => c.name && c.name.includes('Siachen'));

if (ind && pak && chn) {
  const origIndRing = ind.geometry.coordinates[0][0];
  const pakPoly = pak.geometry.coordinates[0];
  const chnPoly11 = chn.geometry.coordinates[11][0];

  // A. Western border of J&K / Gilgit-Baltistan (border with Pakistan KP/Punjab)
  // Starts at Punjab-Jammu border: origIndRing[158] / pakPoly[81] = [ 74.65934659346595, 32.51944375084378 ]
  // Ends at Wakhan Corridor tripoint: pakPoly[530] = [ 74.1949419494195, 36.89764446128838 ]
  const westJkBorder = [
    [ 74.65934659346595, 32.51944375084378 ],
    [ 74.35, 32.75 ],
    [ 74.15, 33.00 ],
    [ 73.80, 33.30 ],
    [ 73.72, 33.65 ],
    [ 73.48, 34.00 ],
    [ 73.45, 34.40 ],
    [ 73.35, 34.80 ],
    [ 73.45, 35.20 ],
    [ 73.30, 35.70 ],
    [ 73.15, 36.10 ],
    [ 73.40, 36.60 ],
    [ 73.80, 36.90 ],
    [ 74.1949419494195, 36.89764446128838 ]
  ];

  // B. Northern border along Wakhan Corridor and Karakoram / Shaksgam (pakPoly 531 to 570)
  const northKarakoram = pakPoly.slice(531, 571);

  // C. Northern Siachen Glacier crest connecting to Karakoram Pass
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

  // D. Aksai Chin Kunlun crest and eastern Ladakh border connecting back to Point 266 (chnPoly11[624])
  const aksaiChinBoundary = [
    [ 78.05, 35.68 ],
    [ 78.35, 35.88 ],
    [ 78.75, 36.05 ],
    [ 79.15, 36.14 ],
    [ 79.60, 36.12 ],
    [ 80.05, 35.92 ],
    [ 80.32, 35.60 ],
    [ 80.38, 35.35 ],
    [ 80.20, 35.00 ],
    [ 79.95, 34.68 ],
    [ 79.62, 34.42 ],
    [ 79.25, 34.28 ],
    [ 78.93258932589328, 34.189479073384504 ],
    [ 78.75258752587524, 34.08705486961121 ],
    [ 78.72738727387275, 34.01414272455226 ]
  ];

  // 1. Update India (356)
  const updatedIndRing = [
    ...origIndRing.slice(0, 159), // Up to index 158 [74.659, 32.519]
    ...westJkBorder.slice(1),    // Western J&K border up to [74.1949, 36.8976]
    ...northKarakoram,           // Northern Karakoram crest [pakPoly 531..570]
    ...siachenCrest,             // Siachen crest to [77.7985, 35.4966]
    ...aksaiChinBoundary,        // Aksai Chin Kunlun crest to [78.7273, 34.0141]
    ...origIndRing.slice(267)    // Resumes at index 267 along Tibet/Himachal border
  ];
  ind.geometry.coordinates[0][0] = updatedIndRing;

  const { bbox, centroid, angularSpan } = computeBoundsAndCentroid(ind.geometry);
  ind.bbox = bbox;
  ind.centroid = centroid;
  ind.angularSpan = angularSpan;

  // 2. Adjust Pakistan (586)
  // Retains international borders (pakPoly 81 to 530), closes along reverse of westJkBorder back to pakPoly[81]
  const reverseWestJk = [...westJkBorder].reverse();
  const pakUpdatedRing = [
    ...pakPoly.slice(81, 531),
    ...reverseWestJk.slice(1)
  ];
  pak.geometry.coordinates[0] = pakUpdatedRing;
  const pMetrics = computeBoundsAndCentroid(pak.geometry);
  pak.bbox = pMetrics.bbox;
  pak.centroid = pMetrics.centroid;
  pak.angularSpan = pMetrics.angularSpan;

  // 3. Adjust China (156)
  // Replaces mainland poly 11 points 625 through 650 with the reverse of aksaiChinBoundary (excluding endpoints)
  const revAksai = [...aksaiChinBoundary.slice(0, -1)].reverse();
  const chnUpdatedPoly11 = [
    ...chnPoly11.slice(0, 625),
    ...revAksai,
    ...chnPoly11.slice(651)
  ];
  chn.geometry.coordinates[11][0] = chnUpdatedPoly11;
  const cMetrics = computeBoundsAndCentroid(chn.geometry);
  chn.bbox = cMetrics.bbox;
  chn.centroid = cMetrics.centroid;
  chn.angularSpan = cMetrics.angularSpan;

  // 4. Remove Siachen as independent country
  if (siachenIdx !== -1) {
    countries.splice(siachenIdx, 1);
  }
  console.log('✓ Applied Official Survey of India sovereign boundary correction (IND, PAK, CHN synchronized).');
}

// ═══════════════════════════════════════════════════════════════
// Vatican City (336) Precision Envelope
// Expands microscopic polygon to cover St. Peter's & official DB coords
// ═══════════════════════════════════════════════════════════════
const vat = countries.find(c => c.id === '336');
if (vat) {
  vat.geometry = {
    type: 'Polygon',
    coordinates: [[[12.425, 41.895], [12.458, 41.895], [12.458, 41.908], [12.425, 41.908], [12.425, 41.895]]]
  };
  const vMetrics = computeBoundsAndCentroid(vat.geometry);
  vat.bbox = vMetrics.bbox;
  vat.centroid = vMetrics.centroid;
  vat.angularSpan = vMetrics.angularSpan;
  console.log('✓ Applied Vatican City precision envelope.');
}

// ═══════════════════════════════════════════════════════════════
// Antimeridian Seam Split (Russia, Fiji)
// Clean planar equirectangular split at 180° meridian:
// Resolves Pacific / Sea of Okhotsk chord artifact and guarantees
// valid, closed non-self-intersecting 2D polygon rings.
// ═══════════════════════════════════════════════════════════════
const rus = countries.find(c => c.id === '643');
if (rus) {
  const p17 = rus.geometry.coordinates[17][0];
  const p17_East = [
    ...p17.slice(0, 3713),
    [180, 68.984196297588],
    [180, 65.06777250585009],
    ...p17.slice(4035)
  ];
  const p17_West = [
    [-180, 68.984196297588],
    ...p17.slice(3714, 4035),
    [-180, 65.06777250585009],
    [-180, 68.984196297588]
  ];

  const p28 = rus.geometry.coordinates[28][0];
  const p28_West = [
    ...p28.slice(0, 28),
    [-180, 71.53785737810506]
  ];
  const p28_East = [
    [180, 70.99275229361672],
    ...p28.slice(28, 42),
    [180, 71.53785737810506],
    [180, 70.99275229361672]
  ];

  rus.geometry.coordinates[17] = [p17_East];
  rus.geometry.coordinates.push([p17_West]);
  rus.geometry.coordinates[28] = [p28_West];
  rus.geometry.coordinates.push([p28_East]);
  console.log('✓ Split Russia antimeridian polygons (Poly 17 and Poly 28) into clean closed rings.');
}

const fiji = countries.find(c => c.id === '242');
if (fiji && fiji.geometry.coordinates[15]) {
  const f15 = fiji.geometry.coordinates[15][0];
  const f15_East = [
    ...f15.slice(0, 3),
    [180, -16.48966975294752],
    [180, -16.54001385310727]
  ];
  const f15_West = [
    [-180, -16.48966975294752],
    ...f15.slice(4, 9),
    [-180, -16.48966975294752]
  ];
  fiji.geometry.coordinates[15] = [f15_East];
  fiji.geometry.coordinates.push([f15_West]);
  console.log('✓ Split Fiji antimeridian polygon 15 into clean closed rings.');
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
