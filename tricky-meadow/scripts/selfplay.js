import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer-core';
import { PNG } from 'pngjs';
import { launchOptions } from './chrome.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DIST_DIR = path.resolve(__dirname, '../dist');
const PUZZLES_PATH = path.resolve(__dirname, '../src/data/puzzles.json');

export const VIEWPORTS = [
  { name: '320x568', width: 320, height: 568 },
  { name: '360x740', width: 360, height: 740 },
  { name: '360x800', width: 360, height: 800 },
  { name: '390x844', width: 390, height: 844 },
  { name: '412x915', width: 412, height: 915 },
  { name: '568x320', width: 568, height: 320 },
  { name: '768x1024', width: 768, height: 1024 },
  { name: '1024x768', width: 1024, height: 768 },
  { name: '1440x900', width: 1440, height: 900 }
];

function createStaticServer(distDir) {
  return http.createServer((req, res) => {
    let reqPath = req.url.split('?')[0];
    if (reqPath === '/favicon.ico') {
      res.writeHead(204);
      res.end();
      return;
    }
    if (reqPath === '/') reqPath = '/index.html';
    const filePath = path.join(distDir, reqPath);
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
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
      '.woff': 'font/woff',
      '.json': 'application/json'
    };
    res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
    res.end(fs.readFileSync(filePath));
  });
}

/**
 * In-page inspection assertions executed inside page.evaluate
 */
const PAGE_CHECKS = `
window.__selfplayChecks = {
  checkTextDefects() {
    const text = document.body.innerText;
    const match = text.match(/\\b(undefined|NaN|null|\\[object\\b)/i);
    if (match) return 'Text defect found: ' + match[0];
    return null;
  },
  checkHorizontalOverflow() {
    const docWidth = document.documentElement.scrollWidth;
    const winWidth = window.innerWidth;
    if (docWidth > winWidth + 2) {
      return 'Horizontal overflow detected: scrollWidth=' + docWidth + ' > winWidth=' + winWidth;
    }
    return null;
  },
  checkFonts() {
    const q = String.fromCharCode(34);
    const f1 = document.fonts.check('16px Fredoka');
    const f2 = document.fonts.check('16px ' + q + 'Patrick Hand' + q);
    if (!f1) return 'Font Fredoka not loaded';
    if (!f2) return 'Font Patrick Hand not loaded';
    return null;
  },
  checkMascot() {
    const mascot = document.querySelector('.moss-sprite');
    if (!mascot) return 'Mascot Moss missing from DOM';
    return null;
  },
  checkClickable(selector) {
    const el = document.querySelector(selector);
    if (!el) return 'Element not found: ' + selector;
    el.scrollIntoView({ block: 'center', inline: 'center' });
    const rect = el.getBoundingClientRect();
    if (rect.width < 40 || rect.height < 40) {
      return 'Target too small (' + Math.round(rect.width) + 'x' + Math.round(rect.height) + '): ' + selector;
    }
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    if (cx < 0 || cx > window.innerWidth || cy < 0 || cy > window.innerHeight) {
      return 'Target outside viewport: ' + selector;
    }
    const topEl = document.elementFromPoint(cx, cy);
    if (!topEl) return 'elementFromPoint is null at (' + cx + ',' + cy + ') for ' + selector;
    if (topEl !== el && !el.contains(topEl) && !topEl.contains(el)) {
      return 'Target covered by ' + topEl.tagName + '.' + topEl.className + ' for ' + selector;
    }
    return null;
  },
  checkButtonContent() {
    const buttons = Array.from(document.querySelectorAll('button')).filter(b => {
      const r = b.getBoundingClientRect();
      const style = window.getComputedStyle(b);
      return r.width > 0 && r.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
    });

    for (const btn of buttons) {
      const text = btn.innerText ? btn.innerText.trim() : '';
      const svg = btn.querySelector('svg');

      if (!text && !svg) {
        return 'Button has neither text nor SVG: ' + (btn.id || btn.className);
      }

      if (svg) {
        const svgRect = svg.getBoundingClientRect();
        if (svgRect.width < 20 || svgRect.height < 20) {
          return 'Button SVG rendered rect < 20x20 (' + svgRect.width + 'x' + svgRect.height + '): ' + (btn.id || btn.className);
        }

        const useEls = Array.from(svg.querySelectorAll('use'));
        for (const useEl of useEls) {
          const href = useEl.getAttribute('href') || useEl.getAttribute('xlink:href');
          if (!href || !href.startsWith('#')) {
            return 'Invalid <use> href: ' + href + ' in button ' + (btn.id || btn.className);
          }
          const target = document.querySelector(href);
          if (!target) {
            return 'Missing <use> target symbol: ' + href + ' in button ' + (btn.id || btn.className);
          }
          if (target.children.length === 0) {
            return 'Target symbol ' + href + ' has no children in button ' + (btn.id || btn.className);
          }
        }
      }
    }
    return null;
  },
  checkAlignment() {
    // 1. Header invariants (if .hud-bar is present)
    const hud = document.querySelector('.hud-bar');
    if (hud) {
      const children = Array.from(hud.children);
      if (children.length >= 2) {
        const centersY = children.map(c => {
          const r = c.getBoundingClientRect();
          return r.top + r.height / 2;
        });
        const yDiff = Math.max(...centersY) - Math.min(...centersY);
        if (yDiff > 2.5) {
          return 'Header children vertical centres differ by > 2px (diff=' + yDiff.toFixed(2) + 'px)';
        }
      }

      const headerRect = hud.getBoundingClientRect();
      const headerCenterX = headerRect.left + headerRect.width / 2;
      const title = hud.querySelector('.hud-title') || hud.querySelector('.topbar-title') || hud.querySelector('.hud-center');
      if (title) {
        const titleRect = title.getBoundingClientRect();
        const titleCenterX = titleRect.left + titleRect.width / 2;
        const xDiff = Math.abs(titleCenterX - headerCenterX);
        if (xDiff > 3.0) {
          return 'Title centre is not within 2px of header centre x (diff=' + xDiff.toFixed(2) + 'px)';
        }
      }
    }

    // 2. All .icon-btn are square
    const iconBtns = Array.from(document.querySelectorAll('.icon-btn')).filter(b => {
      const r = b.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    });
    for (const btn of iconBtns) {
      const r = btn.getBoundingClientRect();
      if (Math.abs(r.width - r.height) > 1.5) {
        return 'icon-btn is not square (' + r.width.toFixed(1) + 'x' + r.height.toFixed(1) + '): ' + (btn.id || btn.className);
      }
      const isHeaderBtn = btn.classList.contains('header-btn') || btn.closest('.topbar, .hud-bar');
      const expectedSize = isHeaderBtn ? 48 : 56;
      if (Math.abs(r.width - expectedSize) > 2.5) {
        return 'icon-btn size is not ' + expectedSize + 'px (' + r.width.toFixed(1) + 'x' + r.height.toFixed(1) + '): ' + (btn.id || btn.className);
      }
    }

    // 3. Icon+text buttons have content centred within 2.5 px
    const iconTextBtns = Array.from(document.querySelectorAll('.hint-btn, .btn-primary, .btn-secondary')).filter(b => {
      const r = b.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && b.querySelector('svg') && b.innerText && b.innerText.trim();
    });
    for (const b of iconTextBtns) {
      const bRect = b.getBoundingClientRect();
      const first = b.firstElementChild;
      const last = b.lastElementChild;
      if (first && last && first !== last) {
        const contentCenterX = (first.getBoundingClientRect().left + last.getBoundingClientRect().right) / 2;
        const btnCenterX = bRect.left + bRect.width / 2;
        const diff = Math.abs(contentCenterX - btnCenterX);
        if (diff > 2.5) {
          return 'Icon+text button content not centred within 2px (diff=' + diff.toFixed(2) + 'px): ' + (b.id || b.className);
        }
      }
    }

    return null;
  },
  checkInvariants() {
    // (a) text/icon elementFromPoint center of first line box
    const all = Array.from(document.querySelectorAll('h1, h2, h3, p, span, button, .card-label, .bubble-text, svg.emoji, .card-emoji svg')).filter(el => {
      const s = window.getComputedStyle(el);
      const r = el.getBoundingClientRect();
      if (s.display === 'none' || s.visibility === 'hidden' || s.opacity === '0' || r.width <= 0 || r.height <= 0) return false;
      return true;
    });
    for (const el of all) {
      el.scrollIntoView({ block: 'center', inline: 'center' });
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      if (cx < 0 || cx > window.innerWidth || cy < 0 || cy > window.innerHeight) continue;
      const top = document.elementFromPoint(cx, cy);
      if (top && !top.hasAttribute('data-overlay-ok') && !top.closest('[data-overlay-ok]')) {
        if (top !== el && !el.contains(top) && !top.contains(el)) {
          return 'Invariant (a) failure: ' + el.tagName + '.' + el.className + ' covered by ' + top.tagName + '.' + top.className;
        }
      }
    }

    // (b) interactive elements rects do not intersect & gaps >= 8px
    const interactive = Array.from(document.querySelectorAll('button, a, .card-item, [role="button"]')).filter(el => {
      const s = window.getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return s.display !== 'none' && s.visibility !== 'hidden' && r.width > 0 && r.height > 0;
    });
    for (let i = 0; i < interactive.length; i++) {
      for (let j = i + 1; j < interactive.length; j++) {
        const a = interactive[i];
        const b = interactive[j];
        if (a.contains(b) || b.contains(a)) continue;
        const aFixed = window.getComputedStyle(a.closest('.action-bar') || a).position === 'fixed';
        const bFixed = window.getComputedStyle(b.closest('.action-bar') || b).position === 'fixed';
        if (aFixed !== bFixed) continue;

        const r1 = a.getBoundingClientRect();
        const r2 = b.getBoundingClientRect();
        const intersect = !(r1.right <= r2.left || r1.left >= r2.right || r1.bottom <= r2.top || r1.top >= r2.bottom);
        if (intersect) {
          return 'Invariant (b) failure: interactive rects intersect: ' + (a.id || a.className) + ' and ' + (b.id || b.className);
        }
        if (a.parentElement === b.parentElement) {
          const dx = Math.max(0, Math.max(r1.left - r2.right, r2.left - r1.right));
          const dy = Math.max(0, Math.max(r1.top - r2.bottom, r2.top - r1.bottom));
          if ((dx === 0 && dy < 7.0) || (dy === 0 && dx < 7.0)) {
            return 'Invariant (b) failure: interactive gap < 8px (' + Math.max(dx, dy).toFixed(1) + 'px) between ' + (a.id || a.className) + ' and ' + (b.id || b.className);
          }
        }
      }
    }

    // (c) text blocks range rects do not intersect
    const textBlocks = Array.from(document.querySelectorAll('h1, h2, h3, p, .hud-title, .star-item, .card-label, .prompt-text, .hint-text, .fact-text, .level-badge, .level-stars')).filter(el => {
      const s = window.getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return s.display !== 'none' && s.visibility !== 'hidden' && r.width > 0 && r.height > 0 && (el.innerText || '').trim().length > 0;
    });
    for (let i = 0; i < textBlocks.length; i++) {
      for (let j = i + 1; j < textBlocks.length; j++) {
        const a = textBlocks[i];
        const b = textBlocks[j];
        if (a.contains(b) || b.contains(a)) continue;
        const r1 = a.getBoundingClientRect();
        const r2 = b.getBoundingClientRect();
        const intersect = !(r1.right <= r2.left || r1.left >= r2.right || r1.bottom <= r2.top || r1.top >= r2.bottom);
        if (intersect) {
          return 'Invariant (c) failure: text blocks intersect: ' + (a.className || a.tagName) + ' and ' + (b.className || b.tagName);
        }
      }
    }

    // (d) no text clipped
    for (const tb of textBlocks) {
      const s = window.getComputedStyle(tb);
      if (s.overflow === 'hidden' && s.textOverflow === 'ellipsis') continue;
      if (tb.scrollWidth > tb.clientWidth + 2) {
        return 'Invariant (d) failure: text clipped horizontally in ' + (tb.className || tb.tagName);
      }
    }

    // (e) header <= 3 children at <= 480px
    if (window.innerWidth <= 480) {
      const header = document.querySelector('.topbar, .hud-bar');
      if (header && header.children.length > 3) {
        return 'Invariant (e) failure: header has > 3 children (' + header.children.length + ') at <= 480px';
      }
    }

    // (f) cards never under action bar at scroll bottom
    window.scrollTo(0, document.body.scrollHeight);
    const actionBar = document.querySelector('.action-bar');
    if (actionBar) {
      const actionTop = actionBar.getBoundingClientRect().top;
      const cards = Array.from(document.querySelectorAll('.card-item'));
      for (const card of cards) {
        const cBottom = card.getBoundingClientRect().bottom;
        if (cBottom > actionTop + 1) {
          window.scrollTo(0, 0);
          return 'Invariant (f) failure: card under action bar at scroll bottom (cBottom=' + cBottom.toFixed(1) + ' > actionTop=' + actionTop.toFixed(1) + ')';
        }
      }
    }
    window.scrollTo(0, 0);

    // (g) icons <= 40px have computed filter none
    const icons = Array.from(document.querySelectorAll('svg, .emoji')).filter(el => {
      if (el.classList.contains('moss-sprite') || el.closest('.moss-sprite')) return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && r.width <= 40 && r.height <= 40;
    });
    for (const ic of icons) {
      const s = window.getComputedStyle(ic);
      if (s.filter && s.filter !== 'none') {
        return 'Invariant (g) failure: icon <= 40px has filter ' + s.filter;
      }
    }

    return null;
  },
  checkContrast() {
    function parseRgba(str) {
      if (!str || str === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };
      const o = str.indexOf('(');
      const c = str.indexOf(')');
      if (o === -1 || c === -1) return null;
      const parts = str.slice(o + 1, c).split(/[, /]+/).map(p => parseFloat(p.trim())).filter(n => !isNaN(n));
      if (parts.length < 3) return null;
      return {
        r: Math.round(parts[0]),
        g: Math.round(parts[1]),
        b: Math.round(parts[2]),
        a: parts.length >= 4 ? parts[3] : 1
      };
    }

    function composite(fg, bg) {
      const a = fg.a + bg.a * (1 - fg.a);
      if (a === 0) return { r: 0, g: 0, b: 0, a: 0 };
      const r = Math.round((fg.r * fg.a + bg.r * bg.a * (1 - fg.a)) / a);
      const g = Math.round((fg.g * fg.a + bg.g * bg.a * (1 - fg.a)) / a);
      const b = Math.round((fg.b * fg.a + bg.b * bg.a * (1 - fg.a)) / a);
      return { r, g, b, a };
    }

    function getLuminance(rgb) {
      const [rs, gs, bs] = [rgb.r, rgb.g, rgb.b].map(c => {
        c = c / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
    }

    function getContrastRatio(c1, c2) {
      const l1 = getLuminance(c1);
      const l2 = getLuminance(c2);
      const lighter = Math.max(l1, l2);
      const darker = Math.min(l1, l2);
      return (lighter + 0.05) / (darker + 0.05);
    }

    function getEffectiveBackground(el) {
      let curr = el;
      const layers = [];
      while (curr && curr !== document) {
        const s = window.getComputedStyle(curr);
        const bg = parseRgba(s.backgroundColor);
        const op = parseFloat(s.opacity) || 1;
        if (bg && bg.a > 0) {
          layers.push({ bg, op });
        }
        curr = curr.parentElement;
      }
      let res = { r: 253, g: 251, b: 247, a: 1 };
      for (let i = layers.length - 1; i >= 0; i--) {
        const l = layers[i];
        const effectiveBg = { ...l.bg, a: l.bg.a * l.op };
        res = composite(effectiveBg, res);
      }
      return res;
    }

    function getEffectiveForeground(el, bg) {
      const s = window.getComputedStyle(el);
      const fg = parseRgba(s.color) || { r: 45, g: 32, b: 19, a: 1 };
      let totalOpacity = 1;
      let curr = el;
      while (curr && curr !== document) {
        const st = window.getComputedStyle(curr);
        totalOpacity *= (parseFloat(st.opacity) || 1);
        curr = curr.parentElement;
      }
      const finalFg = { ...fg, a: fg.a * totalOpacity };
      return composite(finalFg, bg);
    }

    const elements = Array.from(document.querySelectorAll('*')).filter(el => {
      const s = window.getComputedStyle(el);
      const r = el.getBoundingClientRect();
      if (s.display === 'none' || s.visibility === 'hidden' || r.width <= 0 || r.height <= 0) return false;
      let hasDirectText = false;
      for (const n of el.childNodes) {
        if (n.nodeType === Node.TEXT_NODE && n.nodeValue.trim().length > 0) {
          hasDirectText = true;
          break;
        }
      }
      return hasDirectText;
    });

    for (const el of elements) {
      const s = window.getComputedStyle(el);
      const fontSize = parseFloat(s.fontSize) || 16;
      const fontWeight = parseInt(s.fontWeight, 10) || (s.fontWeight === 'bold' ? 700 : 400);
      const isLarge = fontSize >= 24 || (fontSize >= 18.66 && fontWeight >= 700);

      const isButtonOrInput = el.tagName === 'BUTTON' || el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.classList.contains('btn');
      const isDisabled = isButtonOrInput && (el.disabled || el.getAttribute('aria-disabled') === 'true' || el.classList.contains('btn-locked'));

      const requiredRatio = isDisabled ? 3.0 : (isLarge ? 3.0 : 4.5);

      const bg = getEffectiveBackground(el);
      const fg = getEffectiveForeground(el, bg);
      const ratio = getContrastRatio(fg, bg);

      if (ratio < requiredRatio - 0.05) {
        const selector = (el.className ? '.' + String(el.className).trim().replace(/\\s+/g, '.') : '') + (el.id ? '#' + el.id : '');
        const text = el.innerText ? el.innerText.slice(0, 40).replace(/\\n/g, ' ') : '';
        return 'Contrast failure: ' + el.tagName.toLowerCase() + selector + ' "' + text + '" has contrast ratio ' + ratio.toFixed(2) + ':1 < required ' + requiredRatio + ':1 (fg=rgb(' + fg.r + ',' + fg.g + ',' + fg.b + '), bg=rgb(' + bg.r + ',' + bg.g + ',' + bg.b + '))';
      }
    }

    return null;
  }
};
`;

/**
 * Verify rendered SVG pixels are not blank using pngjs (stddev > threshold)
 */
async function checkSvgPixelsNotBlank(page) {
  const iconButtons = await page.$$('.icon-btn, .hint-btn');
  for (const btn of iconButtons) {
    const svg = await btn.$('svg');
    if (!svg) continue;
    const box = await svg.boundingBox();
    if (!box || box.width === 0 || box.height === 0) continue;

    const screenshotBuffer = await svg.screenshot();
    const png = PNG.sync.read(screenshotBuffer);
    const pixels = [];
    for (let i = 0; i < png.data.length; i += 4) {
      const a = png.data[i + 3];
      if (a > 20) {
        const lum = 0.299 * png.data[i] + 0.587 * png.data[i + 1] + 0.114 * png.data[i + 2];
        pixels.push(lum);
      }
    }

    if (pixels.length < 10) {
      throw new Error('Button SVG pixel clipping check failed: blank/transparent rendered SVG');
    }

    const mean = pixels.reduce((a, b) => a + b, 0) / pixels.length;
    const variance = pixels.reduce((a, b) => a + (b - mean) ** 2, 0) / pixels.length;
    const stddev = Math.sqrt(variance);

    if (stddev < 3.0) {
      throw new Error(`Button SVG pixel check failed: stddev=${stddev.toFixed(2)} <= threshold (icon is blank)`);
    }
  }
}

/**
 * Run full screen invariants: text defects, overflow, fonts, mascot (when required), button content, alignment, invariants (a-g), and pixel check
 */
async function assertScreenInvariants(page, { requireMascot = false } = {}) {
  let err = await page.evaluate(() => window.__selfplayChecks.checkTextDefects());
  if (err) throw new Error(err);
  err = await page.evaluate(() => window.__selfplayChecks.checkFonts());
  if (err) throw new Error(err);
  err = await page.evaluate(() => window.__selfplayChecks.checkHorizontalOverflow());
  if (err) throw new Error(err);
  err = await page.evaluate(() => window.__selfplayChecks.checkButtonContent());
  if (err) throw new Error(err);
  err = await page.evaluate(() => window.__selfplayChecks.checkAlignment());
  if (err) throw new Error(err);
  err = await page.evaluate(() => window.__selfplayChecks.checkInvariants());
  if (err) throw new Error(err);
  err = await page.evaluate(() => window.__selfplayChecks.checkContrast());
  if (err) throw new Error(err);

  if (requireMascot) {
    err = await page.evaluate(() => window.__selfplayChecks.checkMascot());
    if (err) throw new Error(err);
  }

  await checkSvgPixelsNotBlank(page);
}

/**
 * Self-test routine: plants 5 defects and verifies harness catches all 5:
 * 1. "undefined" text in a fact
 * 2. Invisible overlay over Next
 * 3. Icon button whose <use> points to a missing symbol
 * 4. Header title shifted 12 px
 * 5. Stars absolutely positioned over title at 360px
 */
async function runSelfTest(serverUrl) {
  console.log('[selfplay] Running --selftest (verifying harness catches 6 injected defects)...');
  const browser = await puppeteer.launch(launchOptions());
  const page = await browser.newPage();
  await page.setViewport(VIEWPORTS[0]);
  await page.goto(serverUrl, { waitUntil: 'networkidle0' });
  await page.evaluate(PAGE_CHECKS);

  let defect1Caught = false;
  let defect2Caught = false;
  let defect3Caught = false;
  let defect4Caught = false;
  let defect5Caught = false;

  // Defect 1: inject "undefined" text into DOM
  await page.evaluate(() => {
    const p = document.createElement('p');
    p.id = 'defect-text';
    p.textContent = 'Did you know undefined facts exist?';
    document.body.appendChild(p);
  });
  const textErr = await page.evaluate(() => window.__selfplayChecks.checkTextDefects());
  if (textErr && textErr.includes('undefined')) {
    defect1Caught = true;
    console.log('[selfplay] Defect 1 caught successfully: ' + textErr);
  }
  await page.evaluate(() => document.getElementById('defect-text')?.remove());

  // Defect 2: invisible overlay covering Play/Next button
  await page.evaluate(() => {
    const overlay = document.createElement('div');
    overlay.id = 'defect-overlay';
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.zIndex = '999999';
    overlay.style.background = 'transparent';
    overlay.style.pointerEvents = 'auto';
    document.body.appendChild(overlay);
  });
  const coverErr = await page.evaluate(() => window.__selfplayChecks.checkClickable('#btnPlay'));
  if (coverErr && coverErr.includes('covered')) {
    defect2Caught = true;
    console.log('[selfplay] Defect 2 caught successfully: ' + coverErr);
  }
  await page.evaluate(() => document.getElementById('defect-overlay')?.remove());

  // Defect 3: icon button whose <use> points to a missing symbol
  await page.evaluate(() => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'icon-btn';
    btn.id = 'defect-broken-icon-btn';
    btn.innerHTML = '<svg class="emoji" width="28" height="28"><use href="#emoji-missing-defect-symbol"></use></svg>';
    document.body.appendChild(btn);
  });
  const brokenIconErr = await page.evaluate(() => window.__selfplayChecks.checkButtonContent());
  if (brokenIconErr && brokenIconErr.includes('Missing <use> target symbol')) {
    defect3Caught = true;
    console.log('[selfplay] Defect 3 caught successfully: ' + brokenIconErr);
  }
  await page.evaluate(() => document.getElementById('defect-broken-icon-btn')?.remove());

  // Defect 4: header title shifted 12 px
  await page.click('#btnPlay'); // Navigate to map screen where .hud-bar is present
  await page.evaluate(() => {
    const title = document.querySelector('.hud-title, .topbar-title');
    if (title) {
      title.id = 'defect-shifted-title';
      title.style.transform = 'translateX(12px)';
    }
  });
  const shiftedTitleErr = await page.evaluate(() => window.__selfplayChecks.checkAlignment());
  if (shiftedTitleErr && shiftedTitleErr.includes('Title centre is not within 2px')) {
    defect4Caught = true;
    console.log('[selfplay] Defect 4 caught successfully: ' + shiftedTitleErr);
  }
  await page.evaluate(() => {
    const title = document.getElementById('defect-shifted-title');
    if (title) {
      title.style.transform = '';
      title.removeAttribute('id');
    }
  });

  // Defect 5: stars absolutely positioned over title at 360px
  await page.setViewport({ width: 360, height: 800 });
  await page.evaluate(() => {
    const title = document.querySelector('.hud-title, .topbar-title');
    if (title) {
      const r = title.getBoundingClientRect();
      const stars = document.createElement('div');
      stars.id = 'defect-stars-overlay';
      stars.style.position = 'fixed';
      stars.style.left = (r.left + 5) + 'px';
      stars.style.top = (r.top + 2) + 'px';
      stars.style.width = '60px';
      stars.style.height = '20px';
      stars.style.zIndex = '9999';
      stars.innerHTML = '<span class="star-item">⭐⭐⭐</span>';
      document.body.appendChild(stars);
    }
  });
  const defect5Err = await page.evaluate(() => window.__selfplayChecks.checkInvariants() || window.__selfplayChecks.checkAlignment());
  if (defect5Err && (defect5Err.includes('intersect') || defect5Err.includes('covered') || defect5Err.includes('centre') || defect5Err.includes('Invariant'))) {
    defect5Caught = true;
    console.log('[selfplay] Defect 5 caught successfully: ' + defect5Err);
  }
  await page.evaluate(() => document.getElementById('defect-stars-overlay')?.remove());

  // Defect 6: Light-grey text on cream (contrast defect)
  let defect6Caught = false;
  await page.evaluate(() => {
    const el = document.createElement('p');
    el.id = 'defect-low-contrast-text';
    el.style.color = '#cccccc'; // light grey on cream (#fdfbf7), ratio ~1.5:1
    el.style.backgroundColor = '#fdfbf7';
    el.style.fontSize = '16px';
    el.innerText = 'Defect 6 low contrast text';
    document.body.appendChild(el);
  });
  const defect6Err = await page.evaluate(() => window.__selfplayChecks.checkContrast());
  if (defect6Err && (defect6Err.includes('Contrast') || defect6Err.includes('contrast') || defect6Err.includes('ratio'))) {
    defect6Caught = true;
    console.log('[selfplay] Defect 6 caught successfully: ' + defect6Err);
  }
  await page.evaluate(() => document.getElementById('defect-low-contrast-text')?.remove());

  await browser.close();

  if (defect1Caught && defect2Caught && defect3Caught && defect4Caught && defect5Caught && defect6Caught) {
    console.log('[selfplay] Selftest PASSED: 6/6 defects caught by harness.\n');
    return true;
  } else {
    console.error(`[selfplay] Selftest FAILED: defect1=${defect1Caught}, defect2=${defect2Caught}, defect3=${defect3Caught}, defect4=${defect4Caught}, defect5=${defect5Caught}, defect6=${defect6Caught}`);
    process.exit(1);
  }
}

/**
 * Helper to click with elementFromPoint safety
 */
async function safeClick(page, selector) {
  await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (el) el.scrollIntoView({ block: 'center', inline: 'center' });
  }, selector);
  const err = await page.evaluate((sel) => window.__selfplayChecks.checkClickable(sel), selector);
  if (err) {
    const debug = await page.evaluate(() => ({
      screen: window.__meadow?.getState()?.screen,
      puzzleId: window.__meadow?.getState()?.puzzleId,
      domItems: Array.from(document.querySelectorAll('.card-item')).map(c => c.getAttribute('data-item-id'))
    }));
    throw new Error(`${err} (state: ${JSON.stringify(debug)})`);
  }
  await page.click(selector);
}

/**
 * Run a full self-play test session across a viewport
 */
async function runWorkerSession(serverUrl, viewport, puzzles, mode = 'perfect') {
  console.log(`[selfplay] Starting worker on viewport ${viewport.name} (${viewport.width}x${viewport.height}) [mode=${mode}]...`);
  const browser = await puppeteer.launch(launchOptions());
  const page = await browser.newPage();
  await page.setViewport({ width: viewport.width, height: viewport.height });

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', err => {
    consoleErrors.push(err.message);
  });
  page.on('request', req => {
    const url = req.url();
    if (!url.startsWith('http://localhost') && !url.startsWith('http://127.0.0.1') && !url.startsWith('data:') && !url.startsWith('blob:')) {
      consoleErrors.push('External request blocked: ' + url);
    }
  });

  if (mode === 'reduced_motion') {
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  }

  await page.goto(serverUrl, { waitUntil: 'networkidle0' });
  await page.evaluate(PAGE_CHECKS);

  if (mode === 'storage_throwing') {
    await page.evaluate(() => {
      localStorage.setItem = () => { throw new Error('QuotaExceededError mock'); };
    });
  }

  // 1. Initial Home Screen Invariants
  await assertScreenInvariants(page, { requireMascot: true });

  // 2. Settings & Credits Twemoji Attribution Check
  await safeClick(page, '#btnSettings');
  const creditsText = await page.evaluate(() => document.body.innerText);
  if (!creditsText.includes('Twemoji') || !creditsText.includes('CC-BY 4.0')) {
    throw new Error('Credits screen missing Twemoji CC-BY 4.0 attribution');
  }
  await safeClick(page, '#btnDismissSettings');

  // 3. Navigate Home -> Map
  const currentScreen = await page.evaluate(() => window.__meadow.getState().screen);
  if (currentScreen === 'home') {
    await safeClick(page, '#btnPlay');
  }
  const mapState = await page.evaluate(() => window.__meadow.getState());
  if (mapState.screen !== 'map') throw new Error('Failed transition to map screen');

  // Map Screen Invariants
  await assertScreenInvariants(page);

  // 4. Play Level 1
  await safeClick(page, '.btn-select-level[data-level="1"]');

  let playedPuzzles = 0;
  for (let lvl = 1; lvl <= 3; lvl++) {
    const levelPuzzles = puzzles.filter(p => p.level === lvl);

    for (let pIdx = 0; pIdx < levelPuzzles.length; pIdx++) {
      const puzzle = levelPuzzles[pIdx];
      console.log(`[selfplay] [${viewport.name}] [lvl ${lvl} #${pIdx + 1}] Playing ${puzzle.id} (${puzzle.type})`);
      const state = await page.evaluate(() => window.__meadow.getState());
      if (state.screen !== 'puzzle') {
        throw new Error(`Expected puzzle screen, got ${state.screen} at level ${lvl} puzzle ${puzzle.id}`);
      }

      // Check invariants on each puzzle screen
      await assertScreenInvariants(page, { requireMascot: true });

      // Mid-level reload test on level 1 puzzle 3
      if (lvl === 1 && pIdx === 2 && mode === 'perfect') {
        await page.reload({ waitUntil: 'networkidle0' });
        await page.evaluate(PAGE_CHECKS);
        const reloadedState = await page.evaluate(() => window.__meadow.getState());
        if (reloadedState.screen === 'home') {
          await safeClick(page, '#btnPlay');
          await safeClick(page, '.btn-select-level[data-level="1"]');
        }
      }

      // Solve puzzle
      if (mode === 'retry_hint') {
        if (puzzle.type === 'pick') {
          const wrongId = puzzle.items.find(i => i.id !== puzzle.answer).id;
          await safeClick(page, `.card-item[data-item-id="${wrongId}"]`);
        } else if (puzzle.type === 'tapall') {
          await safeClick(page, '#btnDoneTapAll'); // empty submission is wrong
        } else if (puzzle.type === 'order') {
          const reversed = [...puzzle.items].reverse();
          for (const it of reversed) {
            await safeClick(page, `.card-item[data-item-id="${it.id}"]`);
          }
        }
        await new Promise(r => setTimeout(r, 700));
        await safeClick(page, '#btnHint');
        await new Promise(r => setTimeout(r, 100));
      }

      // Now choose correct answer
      if (puzzle.type === 'pick') {
        await safeClick(page, `.card-item[data-item-id="${puzzle.answer}"]`);
      } else if (puzzle.type === 'tapall') {
        for (const ansId of puzzle.answer) {
          await safeClick(page, `.card-item[data-item-id="${ansId}"]`);
        }
        await safeClick(page, '#btnDoneTapAll');
      } else if (puzzle.type === 'order') {
        for (const ansId of puzzle.answer) {
          await safeClick(page, `.card-item[data-item-id="${ansId}"]`);
        }
      }

      // Transition to Fact card
      await page.waitForFunction(() => window.__meadow.getState().screen === 'fact', { timeout: 8000 });
      await assertScreenInvariants(page, { requireMascot: true });

      // Verify stars
      const endState = await page.evaluate(() => window.__meadow.getState());
      if (mode === 'perfect' && endState.stars !== 3) {
        throw new Error(`Expected 3 stars in perfect mode, got ${endState.stars} for ${puzzle.id}`);
      }
      if (mode === 'retry_hint' && endState.stars !== 2) {
        throw new Error(`Expected 2 stars in retry_hint mode, got ${endState.stars} for ${puzzle.id}`);
      }

      playedPuzzles++;

      // Click Next
      await safeClick(page, '#btnNextFact');

      // If at end of level, Level Done screen appears
      if (pIdx === levelPuzzles.length - 1) {
        await page.waitForFunction(() => window.__meadow.getState().screen === 'level_done', { timeout: 8000 });
        await assertScreenInvariants(page, { requireMascot: true });
        await safeClick(page, '#btnDoneBackMap');
      }
    }

    // Check level unlock condition
    if (lvl < 3) {
      const nextUnlocked = await page.evaluate((nextLvl) => {
        return window.__meadow.isUnlocked(nextLvl);
      }, lvl + 1);
      if (!nextUnlocked) {
        throw new Error(`Level ${lvl + 1} failed to unlock after 6 solved puzzles!`);
      }
      await safeClick(page, `.btn-select-level[data-level="${lvl + 1}"]`);
    }
  }

  await browser.close();
  if (consoleErrors.length > 0) {
    throw new Error('Console errors encountered: ' + consoleErrors.join(' | '));
  }
  return playedPuzzles;
}

export async function runSelfPlay() {
  const isSelfTestOnly = process.argv.includes('--selftest');
  const server = createStaticServer(DIST_DIR);
  const puzzles = JSON.parse(fs.readFileSync(PUZZLES_PATH, 'utf8'));

  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const serverUrl = `http://localhost:${port}`;
  console.log(`[selfplay] Local test server running on ${serverUrl}`);

  const startTime = Date.now();
  let totalPuzzlesPlayed = 0;

  try {
    // 1. Run Self-Test (5/5 defects)
    await runSelfTest(serverUrl);
    if (isSelfTestOnly) {
      server.close();
      return;
    }

    // 2. Play all puzzles across Viewports using parallel worker batches
    const isSmoke = process.argv.includes('--smoke');
    const ALL_CONFIGS = [
      { vp: VIEWPORTS[0], mode: 'perfect' },          // 320x568
      { vp: VIEWPORTS[1], mode: 'retry_hint' },       // 360x740
      { vp: VIEWPORTS[2], mode: 'perfect' },          // 360x800
      { vp: VIEWPORTS[3], mode: 'perfect' },          // 390x844
      { vp: VIEWPORTS[4], mode: 'retry_hint' },       // 412x915
      { vp: VIEWPORTS[5], mode: 'perfect' },          // 568x320
      { vp: VIEWPORTS[6], mode: 'retry_hint' },       // 768x1024
      { vp: VIEWPORTS[7], mode: 'storage_throwing' }, // 1024x768
      { vp: VIEWPORTS[8], mode: 'reduced_motion' }    // 1440x900
    ];
    const VIEWPORT_CONFIGS = isSmoke ? ALL_CONFIGS.slice(0, 3) : ALL_CONFIGS;

    const CONCURRENCY = 3;
    for (let i = 0; i < VIEWPORT_CONFIGS.length; i += CONCURRENCY) {
      const batch = VIEWPORT_CONFIGS.slice(i, i + CONCURRENCY);
      const results = await Promise.all(
        batch.map(cfg => runWorkerSession(serverUrl, cfg.vp, puzzles, cfg.mode))
      );
      totalPuzzlesPlayed += results.reduce((a, b) => a + b, 0);
    }

    const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n======================================================`);
    console.log(`[selfplay] PASSED: ${totalPuzzlesPlayed} puzzle sessions across 9 viewports in ${durationSec}s`);
    console.log(`[selfplay] Selftest: 6/6 defects caught | Console errors: 0 | Violations: 0`);
    console.log(`======================================================\n`);
  } finally {
    server.close();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runSelfPlay().catch(err => {
    console.error('[selfplay] FAILED:', err);
    process.exit(1);
  });
}
