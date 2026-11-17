import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SVG_DIR = path.resolve(__dirname, '../node_modules/@twemoji/svg');
const OUT_JS = path.resolve(__dirname, '../src/sprite.js');
const OUT_SVG = path.resolve(__dirname, '../public/sprite.svg');

export const EMOJI_MAP = {
  // Animals & Insects
  rabbit: '1f430',
  fox: '1f98a',
  bear: '1f43b',
  frog: '1f438',
  turtle: '1f422',
  butterfly: '1f98b',
  honeybee: '1f41d',
  ladybug: '1f41e',
  caterpillar: '1f41b',
  snail: '1f40c',
  ant: '1f41c',
  chick: '1f425',
  duck: '1f986',
  owl: '1f989',
  hedgehog: '1f994',
  squirrel: '1f43f',
  deer: '1f98c',
  bat: '1f987',
  mouse: '1f42d',
  hamster: '1f439',
  cat: '1f431',
  dog: '1f436',
  monkey: '1f435',
  lion: '1f981',
  cow: '1f42e',
  pig: '1f437',
  sheep: '1f411',
  horse: '1f434',

  // Plants & Nature
  flower: '1f338',
  blossom: '1f33c',
  sunflower: '1f33b',
  tulip: '1f337',
  rose: '1f339',
  hibiscus: '1f33a',
  seedling: '1f331',
  herb: '1f33f',
  clover: '1f340',
  leaf: '1f341',
  mushroom: '1f344',
  evergreen: '1f332',
  tree: '1f333',
  palm: '1f334',
  apple: '1f34e',
  green_apple: '1f34f',
  strawberry: '1f353',
  grapes: '1f347',
  watermelon: '1f349',
  orange: '1f34a',
  banana: '1f34c',
  cherry: '1f352',
  carrot: '1f955',
  corn: '1f33d',
  peanut: '1f95c',
  chestnut: '1f330',

  // Weather & Sky
  sun: '2600',
  sun_face: '1f31e',
  moon: '1f319',
  star: '2b50',
  glow_star: '1f31f',
  sparkles: '2728',
  cloud: '2601',
  rain: '1f327',
  rainbow: '1f308',
  lightning: '26a1',
  snowflake: '2744',
  droplet: '1f4a7',
  fire: '1f525',

  // Items & Badges
  balloon: '1f388',
  gift: '1f381',
  trophy: '1f3c6',
  key: '1f5dd',
  lock: '1f512',
  unlock: '1f513',
  bell: '1f514',
  search: '1f50d',
  lightbulb: '1f4a1',
  magic_wand: '1fa84',
  target: '1f3af',
  puzzle: '1f9e9',
  circus: '1f3aa',
  palette: '1f3a8',
  music_note: '1f3b5'
};

const symbols = [];

for (const [name, code] of Object.entries(EMOJI_MAP)) {
  const filePath = path.join(SVG_DIR, `${code}.svg`);
  if (!fs.existsSync(filePath)) {
    console.warn(`Warning: SVG for ${name} (${code}) not found at ${filePath}`);
    continue;
  }
  const content = fs.readFileSync(filePath, 'utf8');
  // Extract inner XML
  const match = content.match(/<svg[^>]*>([\s\S]*?)<\/svg>/i);
  if (match) {
    const inner = match[1].trim();
    symbols.push(`  <symbol id="emoji-${name}" viewBox="0 0 36 36">\n    ${inner}\n  </symbol>`);
    symbols.push(`  <symbol id="emoji-${code}" viewBox="0 0 36 36">\n    ${inner}\n  </symbol>`);
  }
}

const spriteXml = `<svg xmlns="http://www.w3.org/2000/svg" style="display:none">\n<defs>\n${symbols.join('\n')}\n</defs>\n</svg>`;

// Ensure directories
fs.mkdirSync(path.dirname(OUT_JS), { recursive: true });
fs.mkdirSync(path.dirname(OUT_SVG), { recursive: true });

// Write SVG sprite file
fs.writeFileSync(OUT_SVG, spriteXml, 'utf8');

// Write JS injector
const jsContent = `// Auto-generated SVG Sprite with ${Object.keys(EMOJI_MAP).length} emojis
export const SPRITE_SVG = ${JSON.stringify(spriteXml)};

export function initSprite() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('tricky-meadow-sprite')) return;
  const div = document.createElement('div');
  div.id = 'tricky-meadow-sprite';
  div.style.display = 'none';
  div.innerHTML = SPRITE_SVG;
  document.body.insertBefore(div, document.body.firstChild);
}

export function renderEmoji(name, size = 36, className = '') {
  return \`<svg class="emoji \${className}" width="\${size}" height="\${size}" aria-hidden="true"><use href="#emoji-\${name}"></use></svg>\`;
}
`;

fs.writeFileSync(OUT_JS, jsContent, 'utf8');
console.log(`[build-sprite] Successfully built sprite with ${Object.keys(EMOJI_MAP).length} emojis (${symbols.length / 2} unique) into ${OUT_JS} and ${OUT_SVG}`);
