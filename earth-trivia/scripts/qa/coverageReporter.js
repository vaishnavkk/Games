import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

export function extractFunctionsFromSource(filePath) {
  const code = fs.readFileSync(filePath, 'utf8');
  const results = [];
  const regex = /(?:(export\s+)?(async\s+)?function\s+([a-zA-Z0-9_$]+)|^\s*([a-zA-Z0-9_$]+)\s*\([^)]*\)\s*\{)/gm;
  let match;
  while ((match = regex.exec(code)) !== null) {
    const name = match[3] || match[4];
    if (['if', 'for', 'while', 'switch', 'catch'].includes(name)) continue;

    const line = code.slice(0, match.index).split('\n').length;
    let braceCount = 0;
    let started = false;
    let endIdx = match.index;
    for (let i = match.index; i < code.length; i++) {
      if (code[i] === '{') {
        braceCount++;
        started = true;
      } else if (code[i] === '}') {
        braceCount--;
        if (started && braceCount === 0) {
          endIdx = i;
          break;
        }
      }
    }
    const endLine = code.slice(0, endIdx).split('\n').length;
    const size = endLine - line + 1;
    results.push({
      name,
      line,
      endLine,
      size,
      codeSlice: code.slice(match.index, endIdx + 1)
    });
  }
  return results;
}

export async function startPageCoverage(page) {
  try {
    const cdp = await page.createCDPSession();
    await cdp.send('Profiler.enable');
    await cdp.send('Profiler.startPreciseCoverage', { callCount: true, detailed: true });
    await cdp.send('DOM.enable');
    await cdp.send('CSS.enable');
    await cdp.send('CSS.startRuleUsageTracking');
    return cdp;
  } catch (e) {
    return null;
  }
}

export async function stopPageCoverage(cdp, accumulator) {
  if (!cdp) return;
  try {
    const jsCov = await cdp.send('Profiler.takePreciseCoverage');
    await cdp.send('Profiler.stopPreciseCoverage');
    const cssCov = await cdp.send('CSS.takeCoverageDelta');
    await cdp.send('CSS.stopRuleUsageTracking');
    if (jsCov?.result) accumulator.js.push(...jsCov.result);
    if (cssCov?.coverage) accumulator.css.push(...cssCov.coverage);
    await cdp.detach();
  } catch (e) {}
}

export function generateCoverageReport(accumulator, outFile) {
  const bundlePath = path.resolve(rootDir, 'dist/bundle.js');
  const bundle = fs.existsSync(bundlePath) ? fs.readFileSync(bundlePath, 'utf8') : '';

  // Find module boundaries in bundle
  const moduleRegex = /\/\/ src\/([a-zA-Z0-9_-]+\.js)/g;
  let m;
  const modules = [];
  while ((m = moduleRegex.exec(bundle)) !== null) {
    modules.push({ file: m[1], start: m.index });
  }
  for (let i = 0; i < modules.length; i++) {
    modules[i].end = (i < modules.length - 1) ? modules[i + 1].start : bundle.length;
  }
  const modMap = new Map(modules.map(mod => [mod.file, mod]));

  const srcDir = path.resolve(rootDir, 'src');
  const srcFiles = fs.readdirSync(srcDir).filter(f => f.endsWith('.js'));

  const allFunctionStats = [];
  const zeroRunFunctions = [];

  for (const file of srcFiles) {
    const fullPath = path.join(srcDir, file);
    const fns = extractFunctionsFromSource(fullPath);
    const mod = modMap.get(file);

    for (const fn of fns) {
      let callCount = 0;
      let inBundle = false;

      if (mod) {
        const modSlice = bundle.slice(mod.start, mod.end);
        const idxInSlice = modSlice.indexOf(fn.name);
        if (idxInSlice !== -1) {
          inBundle = true;
          const fnOffset = mod.start + idxInSlice;

          // Check all js coverage records matching bundle.js
          for (const rec of accumulator.js) {
            if (!rec.url || !rec.url.includes('bundle.js')) continue;
            for (const f of rec.functions) {
              for (const r of f.ranges) {
                if (r.startOffset <= fnOffset && r.endOffset >= fnOffset) {
                  callCount += r.count;
                }
              }
            }
          }
        }
      }

      const stat = {
        file: `src/${file}`,
        line: fn.line,
        name: fn.name,
        size: fn.size,
        callCount,
        inBundle
      };

      allFunctionStats.push(stat);
      if (callCount === 0) {
        zeroRunFunctions.push(stat);
      }
    }
  }

  // Check CSS rule usage
  const htmlPath = path.resolve(rootDir, 'index.html');
  const html = fs.existsSync(htmlPath) ? fs.readFileSync(htmlPath, 'utf8') : '';
  const styleMatch = html.match(/<style>([\s\S]*?)<\/style>/i);
  let totalRules = 0;
  let unusedRules = 0;
  if (styleMatch) {
    const cssText = styleMatch[1];
    const rules = cssText.match(/[^{}]+(?=\{)/g) || [];
    totalRules = rules.length;
  }

  // Format report
  const lines = [];
  lines.push('================================================================================');
  lines.push('                 GEOTRIVIA V8 PRECISE COVERAGE REPORT                           ');
  lines.push('================================================================================');
  lines.push(`Total source functions analyzed: ${allFunctionStats.length}`);
  lines.push(`Functions executed >= 1 times:   ${allFunctionStats.length - zeroRunFunctions.length}`);
  lines.push(`Functions executed 0 times:      ${zeroRunFunctions.length}`);
  lines.push('--------------------------------------------------------------------------------');
  lines.push('ZERO-RUN FUNCTIONS (executed 0 times across test suites and selfplay):');
  lines.push('--------------------------------------------------------------------------------');
  lines.push('FILE:LINE                      FUNCTION NAME              SIZE (LINES)  IN BUNDLE');
  lines.push('--------------------------------------------------------------------------------');

  for (const z of zeroRunFunctions) {
    const loc = `${z.file}:${z.line}`.padEnd(30, ' ');
    const name = z.name.padEnd(26, ' ');
    const size = `${z.size}`.padEnd(14, ' ');
    const bndl = z.inBundle ? 'yes' : 'no (tree-shaken)';
    lines.push(`${loc} ${name} ${size} ${bndl}`);
  }

  lines.push('--------------------------------------------------------------------------------');
  lines.push('ALL FUNCTIONS EXECUTION COUNTS:');
  lines.push('--------------------------------------------------------------------------------');
  for (const s of allFunctionStats) {
    const loc = `${s.file}:${s.line}`.padEnd(30, ' ');
    const name = s.name.padEnd(26, ' ');
    lines.push(`${loc} ${name} calls: ${s.callCount}`);
  }

  const reportText = lines.join('\n') + '\n';
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, reportText, 'utf8');

  return {
    totalFunctions: allFunctionStats.length,
    executedFunctions: allFunctionStats.length - zeroRunFunctions.length,
    zeroRunFunctions,
    allFunctionStats
  };
}
