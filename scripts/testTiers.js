#!/usr/bin/env node
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const earthTriviaDir = path.resolve(__dirname, '../earth-trivia');
const targetScript = path.resolve(earthTriviaDir, 'scripts/testTiers.js');

const child = spawn(process.execPath, [targetScript, ...process.argv.slice(2)], {
  cwd: earthTriviaDir,
  stdio: 'inherit'
});

child.on('exit', (code) => {
  process.exit(code || 0);
});
