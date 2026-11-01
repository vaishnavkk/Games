import { WORLD_COUNTRIES } from '../data/world-50m.js';
import { TINY_COUNTRIES } from '../data/tiny-countries.js';
import { COUNTRIES_DB } from '../data/countries.js';

console.log('| Country | ID | Centroid [Lon, Lat] | Fallback Radius | 50m Polygon? | Fallback Behavior |');
console.log('|---|---|---|---|---|---|');

for (const t of TINY_COUNTRIES) {
  const poly = WORLD_COUNTRIES.find(c => String(c.id).padStart(3, '0') === t.id);
  const hasPoly = poly ? 'Yes' : 'No';
  const role = poly 
    ? 'Offshore margin buffer (polygon hit wins first)' 
    : 'Primary hit detection (No 50m Natural Earth polygon)';
  console.log(`| ${t.name} | ${t.id} | [${t.centroid[0].toFixed(2)}, ${t.centroid[1].toFixed(2)}] | ${t.hitRadius.toFixed(1)}° | ${hasPoly} | ${role} |`);
}
