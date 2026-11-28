/**
 * Renderer Color Palettes for Neon Arcade, Daylight Workshop, and Retro Terminal themes.
 */
export const THEME_IDS = ['neon', 'daylight', 'terminal'];

export const THEME_LABELS = {
  neon: 'Neon Arcade',
  daylight: 'Daylight Workshop',
  terminal: 'Retro Terminal'
};

export const PALETTES = {
  neon: {
    deadBg: '#0a0f16',
    deadGridLine: '#111b27',
    deadVentBg: '#070b11',
    deadVentStroke: '#182433',
    deadVentLouver: '#1a293a',
    deadPipe: '#162231',
    deadPipeHighlight: '#1e3044',
    deadRivet: '#1b2b3d',
    padFill: '#14202e',
    padBorder: '#2a415d',
    padCorner: '#48dbfb',
    padSocket: '#233a57',
    pathFill: '#25364a',
    pathBorder: '#4f6f94',
    pathCenterLine: '#2e445e',
    pathChevron: '#6c8fb5',
    selectedCellBg: 'rgba(255, 121, 63, 0.25)',
    selectedCellStroke: '#ff793f',
    spawnGlow: '#ff9f43',
    spawnCore: '#ff9f43',
    spawnBg: '#1c140e',
    coreGlow: '#2ed573',
    coreFill: '#0e2217',
    coreFlash: '#ff4757',
    rangeFill: 'rgba(0, 210, 211, 0.08)',
    rangeStroke: '#00d2d3',
    hpGreen: '#2ed573',
    hpYellow: '#feca57',
    hpRed: '#ff4757',
    hpBg: '#000000',
    projRocket: '#ff793f',
    projPulse: '#00d2d3',
    frostRing: '#00d2d3',
    frostPip: '#dff9fb',
    frostTint: 'rgba(72, 219, 251, 0.35)',
    shockRing: '#a55eea',
    shockPip: '#f3e5ff',
    shockTint: 'rgba(165, 94, 234, 0.35)',
    flashTint: 'rgba(255, 255, 255, 0.72)',
    enemies: {
      glitchbot: { stroke: '#e056fd', fill: '#2e1236', accent: '#ffffff' },
      rust_walker: { stroke: '#ff9f43', fill: '#3d2614', accent: '#ffd32a' },
      spark_drone: { stroke: '#f9ca24', fill: '#3a300e', accent: '#fff200' },
      crusher_tank: { stroke: '#ff4757', fill: '#3b1218', accent: '#ff6b81' },
      iron_sentry: { stroke: '#7bed9f', fill: '#143322', accent: '#ffa502' },
      mega_mixer: { stroke: '#ff6b6b', fill: '#3b1016', accent: '#feca57' }
    },
    towers: {
      baseStroke: '#2e4a6e',
      baseFill: '#14202e',
      pulse: '#00d2d3',
      coolant: '#48dbfb',
      arc: '#a55eea',
      rocket: '#ff793f',
      fabricator: '#feca57'
    }
  },
  daylight: {
    deadBg: '#dde5ef',
    deadGridLine: '#c5d1df',
    deadVentBg: '#c9d4e2',
    deadVentStroke: '#9fb0c5',
    deadVentLouver: '#8da0b8',
    deadPipe: '#b7c4d6',
    deadPipeHighlight: '#96a8c0',
    deadRivet: '#90a3bc',
    padFill: '#f5f8fc',
    padBorder: '#6e87a6',
    padCorner: '#0284c7',
    padSocket: '#94a9c4',
    pathFill: '#b2c2d6',
    pathBorder: '#5f7896',
    pathCenterLine: '#9fb1c7',
    pathChevron: '#415a77',
    selectedCellBg: 'rgba(217, 72, 15, 0.20)',
    selectedCellStroke: '#d9480f',
    spawnGlow: '#d97706',
    spawnCore: '#b45309',
    spawnBg: '#fef3c7',
    coreGlow: '#15803d',
    coreFill: '#dcfce7',
    coreFlash: '#dc2626',
    rangeFill: 'rgba(2, 132, 199, 0.12)',
    rangeStroke: '#0284c7',
    hpGreen: '#16a34a',
    hpYellow: '#d97706',
    hpRed: '#dc2626',
    hpBg: '#0f172a',
    projRocket: '#d9480f',
    projPulse: '#0284c7',
    frostRing: '#0284c7',
    frostPip: '#0369a1',
    frostTint: 'rgba(56, 189, 248, 0.35)',
    shockRing: '#7c3aed',
    shockPip: '#6d28d9',
    shockTint: 'rgba(139, 92, 246, 0.35)',
    flashTint: 'rgba(255, 255, 255, 0.78)',
    enemies: {
      glitchbot: { stroke: '#7e22ce', fill: '#f3e8ff', accent: '#581c87' },
      rust_walker: { stroke: '#9a3412', fill: '#ffedd5', accent: '#7c2d12' },
      spark_drone: { stroke: '#713f12', fill: '#fef9c3', accent: '#422006' },
      crusher_tank: { stroke: '#b91c1c', fill: '#fee2e2', accent: '#7f1d1d' },
      iron_sentry: { stroke: '#0f766e', fill: '#ccfbf1', accent: '#134e4a' },
      mega_mixer: { stroke: '#9f1239', fill: '#ffe4e6', accent: '#881337' }
    },
    towers: {
      baseStroke: '#475569',
      baseFill: '#e2e8f0',
      pulse: '#0284c7',
      coolant: '#0891b2',
      arc: '#7c3aed',
      rocket: '#d9480f',
      fabricator: '#b45309'
    }
  },
  terminal: {
    deadBg: '#030a05',
    deadGridLine: '#0b2111',
    deadVentBg: '#020703',
    deadVentStroke: '#0f3319',
    deadVentLouver: '#144723',
    deadPipe: '#0c2914',
    deadPipeHighlight: '#174f27',
    deadRivet: '#1b5e2e',
    padFill: '#07170b',
    padBorder: '#1f6e36',
    padCorner: '#39ff14',
    padSocket: '#155226',
    pathFill: '#0e2b15',
    pathBorder: '#288a43',
    pathCenterLine: '#194d26',
    pathChevron: '#39ff14',
    selectedCellBg: 'rgba(255, 176, 0, 0.22)',
    selectedCellStroke: '#ffb000',
    spawnGlow: '#ffb000',
    spawnCore: '#ffb000',
    spawnBg: '#1c1400',
    coreGlow: '#39ff14',
    coreFill: '#06240c',
    coreFlash: '#ff3b3b',
    rangeFill: 'rgba(57, 255, 20, 0.08)',
    rangeStroke: '#39ff14',
    hpGreen: '#39ff14',
    hpYellow: '#ffb000',
    hpRed: '#ff3b3b',
    hpBg: '#000000',
    projRocket: '#ffb000',
    projPulse: '#39ff14',
    frostRing: '#00e5ff',
    frostPip: '#b8ffff',
    frostTint: 'rgba(0, 229, 255, 0.35)',
    shockRing: '#d480ff',
    shockPip: '#f2d9ff',
    shockTint: 'rgba(212, 128, 255, 0.35)',
    flashTint: 'rgba(220, 255, 220, 0.72)',
    enemies: {
      glitchbot: { stroke: '#00e5ff', fill: '#06262b', accent: '#ffffff' },
      rust_walker: { stroke: '#ffb000', fill: '#261a00', accent: '#ffe066' },
      spark_drone: { stroke: '#e6ff00', fill: '#212600', accent: '#ffffff' },
      crusher_tank: { stroke: '#ff4d4d', fill: '#2b0909', accent: '#ff9999' },
      iron_sentry: { stroke: '#66ff99', fill: '#0a2914', accent: '#ffb000' },
      mega_mixer: { stroke: '#ff33aa', fill: '#2b081c', accent: '#ffb000' }
    },
    towers: {
      baseStroke: '#1f6e36',
      baseFill: '#061409',
      pulse: '#39ff14',
      coolant: '#00e5ff',
      arc: '#d480ff',
      rocket: '#ffb000',
      fabricator: '#e6ff00'
    }
  }
};

let activeThemeId = 'neon';

export function normalizeThemeId(themeId) {
  return THEME_IDS.includes(themeId) ? themeId : 'neon';
}

export function setActiveTheme(themeId) {
  activeThemeId = normalizeThemeId(themeId);
  return activeThemeId;
}

export function getActiveTheme() {
  return activeThemeId;
}

export function getPalette(themeId = activeThemeId) {
  return PALETTES[normalizeThemeId(themeId)];
}
