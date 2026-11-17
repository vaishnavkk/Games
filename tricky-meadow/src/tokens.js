// Tricky Meadow — Design Tokens & Contrast Calculator (Stage 3 Look)

export const TOKENS = {
  colors: {
    paperCream: '#fdfbf7',
    paperCreamDark: '#f5eedf',
    cardBg: '#ffffff',
    cardBorder: '#e8ded0',
    inkBrown: '#2d2013',        // Main text ink
    inkBrownMuted: '#5a4632',   // Secondary text
    inkBrownLight: '#7e644b',   // Tertiary / footnotes
    meadowGreen: '#2e7d47',     // Primary green
    meadowGreenDark: '#205c33', // Primary green hover / headers
    meadowGreenSoft: '#eaf5ed', // Accent background
    skyBlue: '#2b759e',         // Level 2 / accents
    skyBlueSoft: '#e8f4fa',     // Sky background
    peach: '#b64f26',           // Level 3 / accents (contrast 5.08:1)
    peachSoft: '#fdf0ea',       // Peach background
    warmAmber: '#b36b00',       // Stars & badges
    warmAmberSoft: '#fff8ea',   // Star card backgrounds
    successBorder: '#2e7d47',
    focusRing: '#2b759e'
  },
  typography: {
    fontHeadings: "'Patrick Hand', cursive, sans-serif",
    fontBody: "'Fredoka', cursive, sans-serif"
  },
  dimensions: {
    minTapTargetPx: 56,
    cardBorderRadius: '24px 28px 22px 26px',
    btnBorderRadius: '9999px',
    maxAppWidthPx: 640
  }
};

/**
 * Computes relative luminance from sRGB hex color.
 */
export function getRelativeLuminance(hex) {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  const toLinear = (c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/**
 * Computes WCAG contrast ratio between two hex colors.
 */
export function getContrastRatio(hex1, hex2) {
  const l1 = getRelativeLuminance(hex1);
  const l2 = getRelativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// Pre-computed contrast audit for tokens
export const CONTRAST_AUDIT = {
  inkBrown_on_paperCream: getContrastRatio(TOKENS.colors.inkBrown, TOKENS.colors.paperCream),
  inkBrown_on_cardBg: getContrastRatio(TOKENS.colors.inkBrown, TOKENS.colors.cardBg),
  inkBrownMuted_on_paperCream: getContrastRatio(TOKENS.colors.inkBrownMuted, TOKENS.colors.paperCream),
  meadowGreenDark_on_cardBg: getContrastRatio(TOKENS.colors.meadowGreenDark, TOKENS.colors.cardBg),
  skyBlue_on_cardBg: getContrastRatio(TOKENS.colors.skyBlue, TOKENS.colors.cardBg),
  peach_on_cardBg: getContrastRatio(TOKENS.colors.peach, TOKENS.colors.cardBg)
};
