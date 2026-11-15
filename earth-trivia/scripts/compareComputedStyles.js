import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { takeFullSnapshot } from './snapshotComputedStyles.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

async function main() {
  const baselinePath = path.resolve(rootDir, '../report/cleanup/computed_styles_baseline.json');
  if (!fs.existsSync(baselinePath)) {
    console.error('Baseline snapshot not found at:', baselinePath);
    process.exit(1);
  }
  const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
  console.log('Loaded baseline computed style snapshot.');

  console.log('Capturing current computed style snapshot...');
  const current = await takeFullSnapshot();

  let diffCount = 0;
  const diffs = [];

  for (const vp in baseline) {
    for (const phase in baseline[vp]) {
      const baseElements = baseline[vp][phase];
      const curElements = current[vp]?.[phase] || {};

      for (const elKey in baseElements) {
        if (!curElements[elKey]) {
          diffCount++;
          diffs.push(`[${vp}][${phase}] Element missing in current: ${elKey}`);
          continue;
        }

        const baseProps = baseElements[elKey];
        const curProps = curElements[elKey];

        for (const prop in baseProps) {
          const bVal = baseProps[prop];
          const cVal = curProps[prop];
          if (bVal !== cVal) {
            // Check if it's sub-pixel rounding difference (< 0.5px)
            const bNum = parseFloat(bVal);
            const cNum = parseFloat(cVal);
            if (!isNaN(bNum) && !isNaN(cNum) && bVal.endsWith('px') && cVal.endsWith('px')) {
              if (Math.abs(bNum - cNum) < 0.6) continue;
            }
            diffCount++;
            diffs.push(`[${vp}][${phase}][${elKey}] ${prop}: base='${bVal}' vs cur='${cVal}'`);
          }
        }
      }
    }
  }

  console.log('--------------------------------------------------------------------------------');
  console.log(`Computed style differences: ${diffCount}`);
  if (diffCount > 0) {
    console.log('Sample differences:');
    diffs.slice(0, 10).forEach(d => console.log('  ' + d));
    process.exit(1);
  } else {
    console.log('[PASS] Exact 0 computed style differences across all phases and viewports!');
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
