import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('scaffold files and dependencies exist', () => {
  const pkgPath = path.resolve(__dirname, '../package.json');
  assert.ok(fs.existsSync(pkgPath), 'package.json should exist');

  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  assert.equal(pkg.name, 'tricky-meadow');
  assert.equal(pkg.license, 'MIT');
  assert.ok(pkg.engines?.node, 'engines.node must be defined');

  const spritePath = path.resolve(__dirname, '../src/sprite.js');
  assert.ok(fs.existsSync(spritePath), 'sprite.js should be generated');

  const mainPath = path.resolve(__dirname, '../src/main.js');
  const mainContent = fs.readFileSync(mainPath, 'utf8');
  assert.ok(mainContent.includes('GameManager'), 'main.js must instantiate GameManager');
  assert.ok(mainContent.includes('Fredoka') || mainContent.includes('@fontsource/fredoka'), 'main.js must load fonts');
});
