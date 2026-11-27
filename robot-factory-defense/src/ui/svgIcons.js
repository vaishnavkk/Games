import enemiesData from '../data/enemies.json' with { type: 'json' };

const TOWER_SVGS = {
  pulse: `<svg viewBox="0 0 32 32" width="24" height="24" aria-hidden="true" focusable="false">
    <rect x="6" y="10" width="20" height="16" rx="3" fill="#1b2b3c" stroke="#00d2d3" stroke-width="2"/>
    <rect x="13" y="3" width="6" height="12" rx="1.5" fill="#00d2d3"/>
    <circle cx="16" cy="18" r="4" fill="#48dbfb"/>
  </svg>`,
  coolant: `<svg viewBox="0 0 32 32" width="24" height="24" aria-hidden="true" focusable="false">
    <polygon points="16,4 27,10 27,22 16,28 5,22 5,10" fill="#172b3d" stroke="#48dbfb" stroke-width="2"/>
    <path d="M16 8 L16 24 M9 12 L23 20 M23 12 L9 20" stroke="#74b9ff" stroke-width="2.2" stroke-linecap="round"/>
    <circle cx="16" cy="16" r="3" fill="#dff9fb"/>
  </svg>`,
  arc: `<svg viewBox="0 0 32 32" width="24" height="24" aria-hidden="true" focusable="false">
    <circle cx="16" cy="20" r="9" fill="#1e1b33" stroke="#a55eea" stroke-width="2"/>
    <polygon points="17,4 11,16 16,16 14,27 22,14 17,14" fill="#d6a2e8" stroke="#f8e8ff" stroke-width="0.8"/>
  </svg>`,
  rocket: `<svg viewBox="0 0 32 32" width="24" height="24" aria-hidden="true" focusable="false">
    <rect x="5" y="9" width="22" height="17" rx="3" fill="#2a1c19" stroke="#ff793f" stroke-width="2"/>
    <rect x="9" y="5" width="5" height="12" rx="1.5" fill="#ff9f43"/>
    <rect x="18" y="5" width="5" height="12" rx="1.5" fill="#ff9f43"/>
    <circle cx="11.5" cy="19" r="2" fill="#ff4757"/>
    <circle cx="20.5" cy="19" r="2" fill="#ff4757"/>
  </svg>`,
  fabricator: `<svg viewBox="0 0 32 32" width="24" height="24" aria-hidden="true" focusable="false">
    <rect x="5" y="7" width="22" height="18" rx="3" fill="#231f16" stroke="#feca57" stroke-width="2"/>
    <circle cx="16" cy="16" r="5" fill="none" stroke="#feca57" stroke-width="2.2"/>
    <path d="M16 8 V11 M16 21 V24 M8 16 H11 M21 16 H24" stroke="#ff9f43" stroke-width="2.2" stroke-linecap="round"/>
    <circle cx="16" cy="16" r="2" fill="#2ed573"/>
  </svg>`
};

export function getTowerSvg(type) {
  return TOWER_SVGS[type] || TOWER_SVGS.pulse;
}

export function getEnemySvg(type, enemiesConfig = enemiesData) {
  const def = enemiesConfig?.enemies?.[type] || {};
  const color = def.color || '#f1f2f6';
  const shape = def.shape || 'square';

  if (shape === 'diamond') {
    return `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
      <polygon points="12,2 22,12 12,22 2,12" fill="${color}" stroke="#0d141e" stroke-width="1.5"/>
    </svg>`;
  }
  if (shape === 'cross') {
    return `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
      <polygon points="9,2 15,2 15,9 22,9 22,15 15,15 15,22 9,22 9,15 2,15 2,9 9,9" fill="${color}" stroke="#0d141e" stroke-width="1.4"/>
    </svg>`;
  }
  if (shape === 'rectangle') {
    return `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
      <rect x="2" y="5" width="20" height="14" rx="2" fill="${color}" stroke="#0d141e" stroke-width="1.5"/>
      <rect x="6" y="9" width="12" height="6" rx="1" fill="#0d141e" opacity="0.45"/>
    </svg>`;
  }
  if (shape === 'octagon') {
    return `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
      <polygon points="8,2 16,2 22,8 22,16 16,22 8,22 2,16 2,8" fill="${color}" stroke="#feca57" stroke-width="1.6"/>
    </svg>`;
  }
  if (shape === 'skull_cog') {
    return `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="9" fill="${color}" stroke="#feca57" stroke-width="2"/>
      <circle cx="9" cy="10" r="1.8" fill="#0d141e"/>
      <circle cx="15" cy="10" r="1.8" fill="#0d141e"/>
      <rect x="8" y="14" width="8" height="3" rx="1" fill="#0d141e"/>
    </svg>`;
  }
  return `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
    <rect x="4" y="4" width="16" height="16" rx="2" fill="${color}" stroke="#0d141e" stroke-width="1.5"/>
  </svg>`;
}
