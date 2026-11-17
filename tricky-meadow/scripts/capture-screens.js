import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer-core';
import { launchOptions } from './chrome.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distDir = path.resolve(__dirname, '../dist');
const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/') reqPath = '/index.html';
  const filePath = path.join(distDir, reqPath);
  if (!fs.existsSync(filePath)) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }
  const ext = path.extname(filePath);
  const types = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.svg': 'image/svg+xml',
    '.woff2': 'font/woff2',
    '.woff': 'font/woff'
  };
  res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
  res.end(fs.readFileSync(filePath));
});

server.listen(0, async () => {
  const port = server.address().port;
  const url = `http://localhost:${port}`;
  const browser = await puppeteer.launch(launchOptions());
  const page = await browser.newPage();
  await page.setViewport({ width: 640, height: 800, deviceScaleFactor: 1 });

  // 1. Map screen
  await page.goto(url, { waitUntil: 'networkidle0' });
  await page.click('#btnPlay');
  await new Promise(r => setTimeout(r, 600));
  const mapPath = path.resolve(__dirname, '../docs/img/map.webp');
  await page.screenshot({ path: mapPath, type: 'webp', quality: 80 });
  const mapSize = fs.statSync(mapPath).size;
  console.log(`[screenshot] Map saved: ${mapPath} (${mapSize} bytes, ${(mapSize / 1024).toFixed(1)} KB)`);

  // 2. Puzzle with Fact card
  await page.click('.btn-select-level[data-level="1"]');
  await new Promise(r => setTimeout(r, 500));
  // Solve puzzle garden-01 (answer c: Spider)
  await page.click('.card-item[data-item-id="c"]');
  await new Promise(r => setTimeout(r, 800));
  const factPath = path.resolve(__dirname, '../docs/img/fact-card.webp');
  await page.screenshot({ path: factPath, type: 'webp', quality: 80 });
  const factSize = fs.statSync(factPath).size;
  console.log(`[screenshot] Fact card saved: ${factPath} (${factSize} bytes, ${(factSize / 1024).toFixed(1)} KB)`);

  // 3. Root docs thumbnail
  const rootThumbPath = path.resolve(__dirname, '../../docs/img/trickymeadow.webp');
  fs.copyFileSync(mapPath, rootThumbPath);
  console.log(`[screenshot] Root thumb saved: ${rootThumbPath} (${fs.statSync(rootThumbPath).size} bytes)`);

  await browser.close();
  server.close();
});
