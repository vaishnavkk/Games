import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import tailwindColors from 'tailwindcss/colors.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('================================================================================');
console.log('       TAILWIND DEFAULT COLOR COLLISION AUDIT ACROSS ALL CSS/JS (Step 4f)       ');
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

// 2. Discover all relevant CSS, HTML, and JS source files
const filesToCheck = [
  path.resolve(rootDir, 'src/tokens.css'),
  path.resolve(rootDir, 'index.html'),
];

const srcDir = path.resolve(rootDir, 'src');
if (fs.existsSync(srcDir)) {
  const srcFiles = fs.readdirSync(srcDir);
  for (const f of srcFiles) {
    if (f.endsWith('.js') || f.endsWith('.css')) {
      filesToCheck.push(path.resolve(srcDir, f));
    }
  }
}

const hexRegex = /#(?:[0-9a-fA-F]{3,4}){1,2}\b/g;
let totalCheckedColors = 0;
let violations = 0;
const uniqueProjectColors = new Set();

for (const filePath of filesToCheck) {
  if (!fs.existsSync(filePath)) continue;
  const relPath = path.relative(rootDir, filePath);
  const content = fs.readFileSync(filePath, 'utf8');
  const fileHexMatches = new Set();
  
  let match;
  while ((match = hexRegex.exec(content)) !== null) {
    let hex = match[0].toLowerCase();
    if (hex.length === 4) {
      hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
    }
    fileHexMatches.add(hex);
    uniqueProjectColors.add(hex);
  }

  let fileViolations = 0;
  for (const hex of fileHexMatches) {
    totalCheckedColors++;
    if (tailwindHexMap.has(hex)) {
      console.error(`  [COLLISION] ${relPath}: ${hex} matches Tailwind default: ${tailwindHexMap.get(hex)}`);
      fileViolations++;
      violations++;
    }
  }

  if (fileViolations === 0 && fileHexMatches.size > 0) {
    console.log(`[PASS] ${relPath} (${fileHexMatches.size} unique hex colors, 0 collisions)`);
  }
}

console.log('\n--------------------------------------------------------------------------------');
console.log(`Scanned ${filesToCheck.length} source files.`);
console.log(`Audited ${uniqueProjectColors.size} unique hex colors across the entire project.`);

if (violations > 0) {
  console.error(`\nPALETTE CHECK FAILED: ${violations} color collision(s) detected with Tailwind v3 defaults!`);
  process.exit(1);
} else {
  console.log(`\nPALETTE CHECK PASSED: 0 collisions found. All colors strictly conform to custom "Atlas" system.`);
  process.exit(0);
}
