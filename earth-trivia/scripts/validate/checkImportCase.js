import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

export function checkImportCase() {
  const stdout = execSync('git ls-files', { cwd: rootDir, encoding: 'utf8' });
  const gitFiles = stdout.split(/\r?\n/).map(f => f.trim()).filter(Boolean);
  const fileSet = new Set(gitFiles);
  const lowerMap = new Map();
  for (const f of gitFiles) {
    lowerMap.set(f.toLowerCase(), f);
  }

  const mismatches = [];
  const sourceFiles = gitFiles.filter(f => f.startsWith('earth-trivia/') && (f.endsWith('.js') || f.endsWith('.html') || f.endsWith('.css')));

  for (const f of sourceFiles) {
    const fullPath = path.join(rootDir, f);
    if (!fs.existsSync(fullPath)) continue;
    const content = fs.readFileSync(fullPath, 'utf8');

    // Match static and dynamic import/export from relative paths
    const patterns = [
      /(?:import|from|export\s+\*?\s*from)\s+['"](\.[^'"]+)['"]/g,
      /import\s*\(\s*['"](\.[^'"]+)['"]\s*\)/g
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const importPath = match[1];
        const dir = path.posix.dirname(f);
        const resolved = path.posix.normalize(path.posix.join(dir, importPath));

        const extensions = ['', '.js', '.json', '.css'];
        let matched = false;
        let candidateCaseMismatch = null;

        for (const ext of extensions) {
          const candidate = resolved + ext;
          if (fileSet.has(candidate)) {
            matched = true;
            break;
          }
          const lower = candidate.toLowerCase();
          if (lowerMap.has(lower) && lowerMap.get(lower) !== candidate) {
            candidateCaseMismatch = {
              expected: lowerMap.get(lower),
              actual: candidate
            };
          }
        }

        if (!matched && candidateCaseMismatch) {
          mismatches.push({
            file: f,
            importPath,
            actualImport: candidateCaseMismatch.actual,
            correctGitCase: candidateCaseMismatch.expected
          });
        }
      }
    }
  }

  return mismatches;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const mismatches = checkImportCase();
  if (mismatches.length > 0) {
    console.error('FAIL: Found import path case mismatches against git tracking:');
    for (const m of mismatches) {
      console.error(`  in ${m.file}: imported "${m.importPath}" -> resolved "${m.actualImport}" vs git "${m.correctGitCase}"`);
    }
    process.exit(1);
  } else {
    console.log('PASS: All relative imports match exact git file case.');
    process.exit(0);
  }
}
