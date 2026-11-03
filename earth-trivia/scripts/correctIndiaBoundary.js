import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.resolve(__dirname, '../data');
const world50mJsPath = path.join(dataDir, 'world-50m.js');
const world50mJsonPath = path.join(dataDir, 'world-50m.json');

console.log('================================================================================');
console.log('   CORRECTING MAP OF INDIA (OFFICIAL SURVEY OF INDIA SOVEREIGN BOUNDARIES)      ');
console.log('================================================================================\n');

// Import current WORLD_COUNTRIES
const { WORLD_COUNTRIES } = await import('../data/world-50m.js');

const ind = WORLD_COUNTRIES.find(c => c.id === '356' || c.name === 'India');
const pak = WORLD_COUNTRIES.find(c => c.id === '586' || c.name === 'Pakistan');
const chn = WORLD_COUNTRIES.find(c => c.id === '156' || c.name === 'China');
const siachenIdx = WORLD_COUNTRIES.findIndex(c => c.name && c.name.includes('Siachen'));

if (!ind || !pak || !chn) {
  console.error('Missing India, Pakistan, or China in WORLD_COUNTRIES!');
  process.exit(1);
}

const origIndRing = ind.geometry.coordinates[0][0];

// ═══════════════════════════════════════════════════════════════
// 1. Construct Official Survey of India Boundary for Northern India
// Covering complete territories of Jammu & Kashmir, Ladakh (including
// Gilgit-Baltistan, Aksai Chin, and Siachen Glacier), and Arunachal Pradesh
// ═══════════════════════════════════════════════════════════════

// Point 190 in India is at [ 74.20934209342093, 34.00372670382956 ]
// Point 266 in India is at [ 78.72738727387275, 34.01414272455226 ]

// A. Western border of J&K / Gilgit-Baltistan (border with Pakistan KP/Punjab)
const westJkBorder = [
  [ 74.20934209342093, 34.00372670382956 ],
  [ 73.98, 34.18 ],
  [ 73.82, 34.35 ],
  [ 73.65, 34.58 ],
  [ 73.50, 34.85 ],
  [ 73.35, 35.15 ],
  [ 73.22, 35.45 ],
  [ 73.12, 35.75 ],
  [ 73.08, 36.05 ],
  [ 73.18, 36.32 ],
  [ 73.38, 36.55 ],
  [ 73.65, 36.72 ],
  [ 73.92, 36.82 ],
  [ 74.1949419494195, 36.89764446128838 ]
];

// B. Northern border along Wakhan Corridor and Karakoram / Shaksgam (Pak indices 531 to 570)
const pakPoly = pak.geometry.coordinates[0];
const northKarakoram = [];
for (let i = 531; i <= 570; i++) {
  northKarakoram.push(pakPoly[i]);
}

// C. Northern Siachen Glacier crest connecting to Karakoram Pass (Siachen indices 7 to 14)
const siachenFeature = siachenIdx !== -1 ? WORLD_COUNTRIES[siachenIdx] : null;
const siachenCrest = siachenFeature ? siachenFeature.geometry.coordinates[0].slice(7, 15) : [
  [ 76.88056880568809, 35.61300190548782 ],
  [ 77.08937089370897, 35.55224178460536 ],
  [ 77.29457294572944, 35.50884169826075 ],
  [ 77.44577445774456, 35.47585763263885 ],
  [ 77.52137521375215, 35.47412162918506 ],
  [ 77.57177571775719, 35.47238562573128 ],
  [ 77.72297722977231, 35.48106564300019 ],
  [ 77.79857798577984, 35.49668967408425 ]
];

// D. Aksai Chin Kunlun crest and eastern Ladakh border connecting back to Point 266
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

// Assemble complete updated main landmass ring for India
const part1 = origIndRing.slice(0, 191);
const part2 = westJkBorder.slice(1);
const part3 = northKarakoram;
const part4 = siachenCrest;
const part5 = aksaiChinBoundary;
const part6 = origIndRing.slice(267);

const updatedIndRing = [...part1, ...part2, ...part3, ...part4, ...part5, ...part6];
ind.geometry.coordinates[0][0] = updatedIndRing;

// Recompute India bbox, centroid, and angular span
let minLon = 180, maxLon = -180, minLat = 90, maxLat = -90;
let sumLon = 0, sumLat = 0, totalPts = 0;

for (const poly of ind.geometry.coordinates) {
  for (const [lon, lat] of poly[0]) {
    if (lon < minLon) minLon = lon;
    if (lon > maxLon) maxLon = lon;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    sumLon += lon;
    sumLat += lat;
    totalPts++;
  }
}

ind.bbox = [minLon, minLat, maxLon, maxLat];
ind.centroid = [sumLon / totalPts, sumLat / totalPts];
const dLat = Math.max(0.1, Math.abs(maxLat - minLat));
const dLon = Math.max(0.1, Math.abs(maxLon - minLon) * Math.cos((ind.centroid[1] * Math.PI) / 180));
ind.angularSpan = Math.max(dLat, dLon);

console.log('✓ Successfully updated India (356):');
console.log(`  BBox: [${ind.bbox.map(n => n.toFixed(2)).join(', ')}]`);
console.log(`  Centroid: [${ind.centroid.map(n => n.toFixed(2)).join(', ')}]`);
console.log(`  Angular Span: ${ind.angularSpan.toFixed(2)}°`);
console.log(`  Vertices: ${updatedIndRing.length}`);

// ═══════════════════════════════════════════════════════════════
// 2. Adjust Pakistan (586) boundary to close at western J&K border
// ═══════════════════════════════════════════════════════════════
// In Pakistan, points 0 to 49 (LoC) and 531 to 570 (Gilgit-Baltistan north)
// are replaced with the western border connecting Point 530 to Point 49
const pakUpdatedRing = [];
// Pak points 49 to 530 (southern and western Pakistan)
for (let i = 49; i <= 530; i++) {
  pakUpdatedRing.push(pakPoly[i]);
}
// Reverse of westJkBorder to close the ring back to Point 49
for (let i = westJkBorder.length - 2; i >= 0; i--) {
  pakUpdatedRing.push(westJkBorder[i]);
}
pak.geometry.coordinates[0] = pakUpdatedRing;

// Recompute Pakistan bbox & centroid
let pMinLon = 180, pMaxLon = -180, pMinLat = 90, pMaxLat = -90;
let pSumLon = 0, pSumLat = 0;
for (const [lon, lat] of pakUpdatedRing) {
  if (lon < pMinLon) pMinLon = lon;
  if (lon > pMaxLon) pMaxLon = lon;
  if (lat < pMinLat) pMinLat = lat;
  if (lat > pMaxLat) pMaxLat = lat;
  pSumLon += lon;
  pSumLat += lat;
}
pak.bbox = [pMinLon, pMinLat, pMaxLon, pMaxLat];
pak.centroid = [pSumLon / pakUpdatedRing.length, pSumLat / pakUpdatedRing.length];
console.log('✓ Successfully adjusted Pakistan (586) boundary:');
console.log(`  BBox: [${pak.bbox.map(n => n.toFixed(2)).join(', ')}]`);

// ═══════════════════════════════════════════════════════════════
// 3. Remove Siachen Glacier as a separate independent feature
// ═══════════════════════════════════════════════════════════════
if (siachenIdx !== -1) {
  WORLD_COUNTRIES.splice(siachenIdx, 1);
  console.log('✓ Successfully merged Siachen Glacier completely into India.');
}

// ═══════════════════════════════════════════════════════════════
// 4. Save updated data files
// ═══════════════════════════════════════════════════════════════
fs.writeFileSync(
  world50mJsPath,
  `export const WORLD_COUNTRIES = ${JSON.stringify(WORLD_COUNTRIES)};\n`
);

const featureCollection = {
  type: 'FeatureCollection',
  features: WORLD_COUNTRIES.map(c => ({
    type: 'Feature',
    id: c.id,
    properties: { name: c.name },
    geometry: c.geometry
  }))
};
fs.writeFileSync(world50mJsonPath, JSON.stringify(featureCollection));

console.log(`✓ Saved ${WORLD_COUNTRIES.length} sovereign country features to world-50m.js and world-50m.json.`);
