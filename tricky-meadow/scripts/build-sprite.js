import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { UI_ICONS } from '../src/data/ui-icons.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SVG_DIR = path.resolve(__dirname, '../node_modules/@twemoji/svg');
const PUZZLES_PATH = path.resolve(__dirname, '../src/data/puzzles.json');
const OUT_JS = path.resolve(__dirname, '../src/sprite.js');
const OUT_SVG = path.resolve(__dirname, '../public/sprite.svg');

export function emojiToCodePoints(str) {
  if (!str) return '';
  if (/^[0-9a-fA-F-]+$/.test(str.trim())) return str.trim().toLowerCase();
  const codes = [];
  for (const char of str) {
    const cp = char.codePointAt(0);
    // Ignore variation selector 16 (\uFE0F) for standard emojis
    if (cp !== 0xfe0f) {
      codes.push(cp.toString(16));
    }
  }
  return codes.join('-');
}

if (!fs.existsSync(PUZZLES_PATH)) {
  console.error(`[build-sprite] Error: Puzzles file not found at ${PUZZLES_PATH}`);
  process.exit(1);
}

const puzzles = JSON.parse(fs.readFileSync(PUZZLES_PATH, 'utf8'));

// Collect all emojis from UI_ICONS and puzzles
const emojiMap = new Map(); // code -> Set of alias identifiers

// Add UI_ICONS
for (const [key, emoji] of Object.entries(UI_ICONS)) {
  const code = emojiToCodePoints(emoji);
  if (!emojiMap.has(code)) emojiMap.set(code, new Set());
  emojiMap.get(code).add(key);
  emojiMap.get(code).add(code);
  emojiMap.get(code).add(emoji);
}

// Add puzzle item emojis
for (const puzzle of puzzles) {
  if (Array.isArray(puzzle.items)) {
    for (const item of puzzle.items) {
      if (item.emoji) {
        const code = emojiToCodePoints(item.emoji);
        if (!emojiMap.has(code)) emojiMap.set(code, new Set());
        emojiMap.get(code).add(code);
        emojiMap.get(code).add(item.emoji);
      }
    }
  }
}

const symbols = [];
const missing = [];

for (const [code, aliases] of emojiMap.entries()) {
  let svgPath = path.join(SVG_DIR, `${code}.svg`);
  if (!fs.existsSync(svgPath)) {
    // Try with -fe0f if present
    const altPath = path.join(SVG_DIR, `${code}-fe0f.svg`);
    if (fs.existsSync(altPath)) {
      svgPath = altPath;
    } else {
      missing.push({ code, aliases: Array.from(aliases) });
      continue;
    }
  }

  const rawXml = fs.readFileSync(svgPath, 'utf8');
  const match = rawXml.match(/<svg[^>]*>([\s\S]*?)<\/svg>/i);
  if (!match) {
    missing.push({ code, error: 'Failed to parse SVG content' });
    continue;
  }

  const innerXml = match[1].trim();
  // Register symbol for code and all aliases
  symbols.push(`  <symbol id="emoji-${code}" viewBox="0 0 36 36">\n    ${innerXml}\n  </symbol>`);
  for (const alias of aliases) {
    if (alias !== code && /^[a-zA-Z0-9_-]+$/.test(alias)) {
      symbols.push(`  <symbol id="emoji-${alias}" viewBox="0 0 36 36">\n    ${innerXml}\n  </symbol>`);
    }
  }
}

if (missing.length > 0) {
  console.error('[build-sprite] BUILD FAILED: Referenced emoji missing in @twemoji/svg:');
  missing.forEach(m => console.error(`  - Code: ${m.code} (aliases: ${m.aliases?.join(', ')})`));
  process.exit(1);
}

const spriteXml = `<svg xmlns="http://www.w3.org/2000/svg" style="display:none">\n<defs>\n${symbols.join('\n')}\n</defs>\n</svg>`;
const spriteBytes = Buffer.byteLength(spriteXml, 'utf8');
const iconCount = emojiMap.size;

fs.mkdirSync(path.dirname(OUT_JS), { recursive: true });
fs.mkdirSync(path.dirname(OUT_SVG), { recursive: true });

fs.writeFileSync(OUT_SVG, spriteXml, 'utf8');

const jsContent = `// Auto-generated SVG Sprite from puzzles.json & ui-icons.js
// Total icons: ${iconCount} | Total size: ${spriteBytes} bytes
export const SPRITE_SVG = ${JSON.stringify(spriteXml)};
export const ICON_COUNT = ${iconCount};
export const SPRITE_SIZE_BYTES = ${spriteBytes};

export function emojiToSymbolId(str) {
  if (!str) return 'sparkles';
  if (/^[0-9a-fA-F-]+$/.test(str.trim())) return str.trim().toLowerCase();
  const codes = [];
  for (const char of str) {
    const cp = char.codePointAt(0);
    if (cp !== 0xfe0f) codes.push(cp.toString(16));
  }
  return codes.join('-');
}

export function initSprite() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('tricky-meadow-sprite')) return;
  const div = document.createElement('div');
  div.id = 'tricky-meadow-sprite';
  div.style.display = 'none';
  div.innerHTML = SPRITE_SVG;
  document.body.insertBefore(div, document.body.firstChild);
}

export function renderEmoji(nameOrEmoji, size = 36, className = '') {
  const sym = emojiToSymbolId(nameOrEmoji);
  return \`<svg class="emoji \${className}" width="\${size}" height="\${size}" aria-hidden="true"><use href="#emoji-\${sym}"></use></svg>\`;
}
`;

fs.writeFileSync(OUT_JS, jsContent, 'utf8');
console.log(`[build-sprite] Generated dynamic sprite: ${iconCount} icons, ${spriteBytes} bytes (${(spriteBytes / 1024).toFixed(1)} KB)`);
