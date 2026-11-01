// WCAG Contrast Ratio Checker
function hexToRgb(hex) {
  hex = hex.replace(/^#/, '');
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('');
  }
  const num = parseInt(hex, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

function relativeLuminance(r, g, b) {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function contrastRatio(hex1, hex2) {
  const c1 = hexToRgb(hex1);
  const c2 = hexToRgb(hex2);
  const l1 = relativeLuminance(c1.r, c1.g, c1.b);
  const l2 = relativeLuminance(c2.r, c2.g, c2.b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// Blend RGBA over solid background
function blendRgba(fgHex, alpha, bgHex) {
  const fg = hexToRgb(fgHex);
  const bg = hexToRgb(bgHex);
  const r = Math.round(fg.r * alpha + bg.r * (1 - alpha));
  const g = Math.round(fg.g * alpha + bg.g * (1 - alpha));
  const b = Math.round(fg.b * alpha + bg.b * (1 - alpha));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

const pairs = [
  { element: 'Primary Text on Surface BG', fg: '#f8fafc', bg: '#0f172a', target: 'Normal text (≥4.5:1)' },
  { element: 'Primary Text on Card Surface', fg: '#f8fafc', bg: '#131c31', target: 'Normal text (≥4.5:1)' },
  { element: 'Secondary Text on Surface BG', fg: '#94a3b8', bg: '#0f172a', target: 'Normal text (≥4.5:1)' },
  { element: 'Secondary Text on Card Surface', fg: '#94a3b8', bg: '#131c31', target: 'Normal text (≥4.5:1)' },
  { element: 'Muted Text on Deep Canvas', fg: '#7888a0', bg: '#090d16', target: 'Normal text (≥4.5:1)' },
  { element: 'Accent Blue Button Text on Accent BG', fg: '#ffffff', bg: '#2563eb', target: 'Button text (≥4.5:1)' },
  { element: 'Accent Subtext on Card Surface', fg: '#60a5fa', bg: '#131c31', target: 'Normal text (≥4.5:1)' },
  { element: 'Success Text on Card Surface', fg: '#34d399', bg: '#131c31', target: 'Normal text (≥4.5:1)' },
  { element: 'Success Text on Success Subtle Tint', fg: '#34d399', bg: blendRgba('#10b981', 0.12, '#131c31'), target: 'Normal text (≥4.5:1)' },
  { element: 'Error Text on Card Surface', fg: '#f87171', bg: '#131c31', target: 'Normal text (≥4.5:1)' },
  { element: 'Error Text on Error Subtle Tint', fg: '#f87171', bg: blendRgba('#ef4444', 0.12, '#131c31'), target: 'Normal text (≥4.5:1)' },
  { element: 'Warning / Clue Points Text on Card Surface', fg: '#fbbf24', bg: '#131c31', target: 'Normal text (≥4.5:1)' },
  { element: 'Card Border on Canvas', fg: '#1e293b', bg: '#090d16', target: 'UI Component boundary (≥3.0:1)' }
];

console.log('================================================================================');
console.log('               WCAG AA COLOR CONTRAST COMPLIANCE AUDIT                          ');
console.log('================================================================================\n');

const results = [];
for (const p of pairs) {
  const ratio = contrastRatio(p.fg, p.bg);
  const ratioFormatted = ratio.toFixed(2) + ':1';
  const minRequired = p.target.includes('3.0') ? 3.0 : 4.5;
  const pass = ratio >= minRequired;
  const status = ratio >= 7.0 ? 'PASS AAA' : (pass ? 'PASS AA' : 'FAIL');
  results.push({
    element: p.element,
    foreground: p.fg,
    background: p.bg,
    ratio: ratioFormatted,
    standard: p.target,
    status
  });
  console.log(`${p.element.padEnd(42)} | FG: ${p.fg.padEnd(7)} | BG: ${p.bg.padEnd(7)} | Ratio: ${ratioFormatted.padEnd(8)} | Status: ${status}`);
}

import fs from 'fs';
fs.writeFileSync('scripts/step0_contrast_results.json', JSON.stringify(results, null, 2));
console.log('\nContrast audit saved to scripts/step0_contrast_results.json');
