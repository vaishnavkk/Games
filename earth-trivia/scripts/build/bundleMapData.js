import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as topojson from 'topojson-client';
import { SOI_WEST_JK, SOI_NORTH_LADAKH } from '../../data/soi-boundaries.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function generateWorld50mJs() {
  const worldAtlasPath = path.join(__dirname, '../../node_modules/world-atlas/countries-50m.json');
  const worldTopo = JSON.parse(fs.readFileSync(worldAtlasPath, 'utf-8'));

  const geojson = topojson.feature(worldTopo, worldTopo.objects.countries);
  const geometries = worldTopo.objects.countries.geometries;

  const neighbors = topojson.neighbors(geometries);
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

  const ind = countries.find(c => c.id === '356');
  const pak = countries.find(c => c.id === '586');
  const chn = countries.find(c => c.id === '156');
  const siachenIdx = countries.findIndex(c => c.name && c.name.includes('Siachen'));

  if (ind && pak && chn) {
    const origIndRing = ind.geometry.coordinates[0][0];
    const pakPoly = pak.geometry.coordinates[0];
    const chnPoly11 = chn.geometry.coordinates[11][0];

    const afgWakhan = [
      [ 74.43254432544327, 36.9844446339776 ],
      [ 74.54054540545405, 37.022636709960864 ],
      [ 74.60174601746019, 37.03652473759114 ]
    ];

    const updatedIndRing = [
      ...origIndRing.slice(0, 159),
      ...SOI_WEST_JK.slice(1),
      ...afgWakhan,
      ...SOI_NORTH_LADAKH.slice(1),
      ...origIndRing.slice(267)
    ];
    ind.geometry.coordinates[0][0] = updatedIndRing;

    const { bbox, centroid, angularSpan } = computeBoundsAndCentroid(ind.geometry);
    ind.bbox = bbox;
    ind.centroid = centroid;
    ind.angularSpan = angularSpan;

    const revWestJk = [...SOI_WEST_JK].reverse();
    const pakUpdatedRing = [
      ...pakPoly.slice(81, 531),
      ...revWestJk.slice(1)
    ];
    pak.geometry.coordinates[0] = pakUpdatedRing;
    const pMetrics = computeBoundsAndCentroid(pak.geometry);
    pak.bbox = pMetrics.bbox;
    pak.centroid = pMetrics.centroid;
    pak.angularSpan = pMetrics.angularSpan;

    const revNorthLadakh = [...SOI_NORTH_LADAKH].reverse();
    const chnUpdatedPoly11 = [
      ...chnPoly11.slice(0, 625),
      ...revNorthLadakh.slice(1, -1),
      ...chnPoly11.slice(696)
    ];
    chn.geometry.coordinates[11][0] = chnUpdatedPoly11;
    const cMetrics = computeBoundsAndCentroid(chn.geometry);
    chn.bbox = cMetrics.bbox;
    chn.centroid = cMetrics.centroid;
    chn.angularSpan = cMetrics.angularSpan;

    if (siachenIdx !== -1) {
      countries.splice(siachenIdx, 1);
    }
  }

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
  }

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
  }

  function round4(n) {
    return Math.round(n * 10000) / 10000;
  }

  function roundCoords(coords) {
    if (typeof coords[0] === 'number') {
      return [round4(coords[0]), round4(coords[1])];
    }
    return coords.map(roundCoords);
  }

  const optimizedCountries = countries.map(c => ({
    id: c.id,
    name: c.name,
    bbox: c.bbox.map(round4),
    centroid: c.centroid.map(round4),
    angularSpan: round4(c.angularSpan),
    colorIndex: c.colorIndex,
    geometry: {
      type: c.geometry.type,
      coordinates: roundCoords(c.geometry.coordinates)
    }
  }));

  return `export const WORLD_COUNTRIES = ${JSON.stringify(optimizedCountries)};\n`;
}

if (process.argv[1] && process.argv[1].endsWith('bundleMapData.js')) {
  const content = generateWorld50mJs();
  const dataDir = path.join(__dirname, '../../data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  fs.writeFileSync(path.join(dataDir, 'world-50m.js'), content, 'utf8');
  console.log('Successfully saved data/world-50m.js with colorIndex and angularSpan!');
}
