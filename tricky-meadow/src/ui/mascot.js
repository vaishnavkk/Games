// Tricky Meadow — Mascot "Moss" (Round Leaf-Sprite with 3 Expressions)
import { escapeHtml } from './escape.js';

/**
 * Renders Moss the leaf-sprite.
 * @param {'neutral'|'cheer'|'think'} expression
 * @param {string|null} speechText
 * @param {number} size
 */
export function renderMascot(expression = 'neutral', speechText = null, size = 80) {
  const safeExpr = expression === 'cheer' || expression === 'think' ? expression : 'neutral';
  const safeSize = Number.isFinite(Number(size)) ? Number(size) : 80;
  let eyes = '';
  let mouth = '';
  let sproutTransform = 'rotate(0, 50, 15)';
  const blush = '<ellipse cx="32" cy="56" rx="5" ry="3" fill="#fca5a5" opacity="0.6"/><ellipse cx="68" cy="56" rx="5" ry="3" fill="#fca5a5" opacity="0.6"/>';

  if (safeExpr === 'cheer') {
    // Excited squinting arc eyes and big open mouth
    eyes = `
      <path d="M 30 48 Q 36 42 42 48" stroke="#1f2937" stroke-width="3.5" fill="none" stroke-linecap="round"/>
      <path d="M 58 48 Q 64 42 70 48" stroke="#1f2937" stroke-width="3.5" fill="none" stroke-linecap="round"/>
    `;
    mouth = `
      <path d="M 42 56 Q 50 68 58 56 Z" fill="#b91c1c" stroke="#1f2937" stroke-width="2"/>
    `;
    sproutTransform = 'rotate(12, 50, 15)';
  } else if (safeExpr === 'think') {
    // Thoughtful glance upwards with a small wondering O-mouth
    eyes = `
      <circle cx="37" cy="46" r="4.5" fill="#1f2937"/>
      <circle cx="39" cy="44" r="1.5" fill="#ffffff"/>
      <circle cx="63" cy="46" r="4.5" fill="#1f2937"/>
      <circle cx="65" cy="44" r="1.5" fill="#ffffff"/>
      <path d="M 33 40 Q 38 38 43 41" stroke="#1f2937" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <path d="M 57 41 Q 62 38 67 40" stroke="#1f2937" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    `;
    mouth = `
      <ellipse cx="50" cy="58" rx="3.5" ry="4" fill="#1f2937"/>
    `;
    sproutTransform = 'rotate(-10, 50, 15)';
  } else {
    // Neutral gentle smile with curious round eyes
    eyes = `
      <circle cx="36" cy="49" r="4.5" fill="#1f2937"/>
      <circle cx="38" cy="47" r="1.5" fill="#ffffff"/>
      <circle cx="64" cy="49" r="4.5" fill="#1f2937"/>
      <circle cx="66" cy="47" r="1.5" fill="#ffffff"/>
    `;
    mouth = `
      <path d="M 44 56 Q 50 62 56 56" stroke="#1f2937" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    `;
  }

  const svg = `
    <svg class="moss-sprite moss-${safeExpr}" width="${safeSize}" height="${safeSize}" viewBox="0 0 100 100" role="img" aria-label="Moss the meadow leaf-sprite (${safeExpr})">
      <defs>
        <radialGradient id="mossBodyGrad" cx="45%" cy="40%" r="55%">
          <stop offset="0%" stop-color="#84cc16"/>
          <stop offset="65%" stop-color="#4d7c0f"/>
          <stop offset="100%" stop-color="#365314"/>
        </radialGradient>
        <linearGradient id="mossLeafGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#a3e635"/>
          <stop offset="100%" stop-color="#65a30d"/>
        </linearGradient>
      </defs>

      <!-- Little Leaf Sprout on Head -->
      <g transform="${sproutTransform}" class="moss-sprout">
        <path d="M 50 25 Q 50 12 43 8 Q 40 18 50 25 Z" fill="url(#mossLeafGrad)" stroke="#365314" stroke-width="1.5"/>
        <path d="M 50 25 Q 54 10 60 7 Q 58 19 50 25 Z" fill="url(#mossLeafGrad)" stroke="#365314" stroke-width="1.5"/>
        <line x1="50" y1="25" x2="50" y2="15" stroke="#365314" stroke-width="2" stroke-linecap="round"/>
      </g>

      <!-- Round Moss Body with subtle organic watercolor displacement -->
      <ellipse cx="50" cy="55" rx="36" ry="32" fill="url(#mossBodyGrad)" class="moss-body" filter="url(#watercolor-filter)"/>

      <!-- Cheeks, Eyes, Mouth -->
      ${blush}
      ${eyes}
      ${mouth}

      <!-- Tiny feet -->
      <ellipse cx="40" cy="86" rx="7" ry="4" fill="#365314"/>
      <ellipse cx="60" cy="86" rx="7" ry="4" fill="#365314"/>
    </svg>
  `;

  if (!speechText) {
    return `<div class="mascot-wrap">${svg}</div>`;
  }

  return `
    <div class="mascot-wrap has-speech">
      ${svg}
      <div class="moss-speech-bubble" role="status">
        <p class="bubble-text">${escapeHtml(speechText)}</p>
      </div>
    </div>
  `;
}
