import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import tailwindColors from 'tailwindcss/colors.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const tokensPath = path.resolve(__dirname, '../src/tokens.css');

console.log('================================================================================');
console.log('            TAILWIND DEFAULT COLOR COLLISION AUDIT (check:palette)              ');
console.log('================================================================================\n');

// 1. Flatten all Tailwind default color hex values
const tailwindHexMap = new Map();

function collectTailwind(obj, prefix = '') {
  for (const [key, val] of Object.entries(obj)) {
    if (typeof val === 'string' && val.startsWith('#')) {
      const hex = val.toLowerCase();
      tailwindHexMap.set(hex, `${prefix}${key}`);
    } else if (typeof val === 'object' && val !== null) {
      collectTailwind(val, `${prefix}${key}.`);
    }
  }
}
collectTailwind(tailwindColors);
console.log(`Loaded ${tailwindHexMap.size} default Tailwind v3 color values for collision check.\n`);

// 2. Read tokens.css and extract all hex codes
const tokensContent = fs.readFileSync(tokensPath, 'utf8');
const hexRegex = /#(?:[0-9a-fA-F]{3,4}){1,2}\b/g;
const tokensHex = new Set();
let match;
while ((match = hexRegex.exec(tokensContent)) !== null) {
  tokensHex.add(match[0].toLowerCase());
}

console.log(`Extracted ${tokensHex.size} unique color values from tokens.css:\n`);

let violations = 0;
for (const hex of tokensHex) {
  if (tailwindHexMap.has(hex)) {
    console.error(`[COLLISION] ${hex} matches Tailwind default: ${tailwindHexMap.get(hex)}`);
    violations++;
  } else {
    console.log(`[OK - UNIQUE] ${hex}`);
  }
}

console.log('\n--------------------------------------------------------------------------------');
if (violations > 0) {
  console.error(`PALETTE CHECK FAILED: ${violations} token color(s) match Tailwind defaults!`);
  process.exit(1);
} else {
  console.log(`PALETTE CHECK PASSED: 0 collisions found. All ${tokensHex.size} colors are custom "Atlas" values.`);
  process.exit(0);
}
