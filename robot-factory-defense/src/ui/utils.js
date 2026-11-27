/**
 * Shared UI helpers for safe HTML escaping and dynamic upgrade config lookups.
 */

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function getUpgradeEffectValue(upgradesConfig, upgradeId, effectKey, fallbackValue) {
  const globals = upgradesConfig?.workshop?.globalUpgrades;
  if (!Array.isArray(globals)) return fallbackValue;
  const item = globals.find(g => g.id === upgradeId);
  const val = item?.effect?.[effectKey];
  return typeof val === 'number' && Number.isFinite(val) ? val : fallbackValue;
}

/**
 * Find the nearest unoccupied buildable pad within maxDistCells (in grid cell units)
 * of the pointer position (gx, gy).
 */
export function findNearestBuildablePad(gx, gy, buildableCells, towers = [], maxDistCells = 0.5) {
  if (!Number.isFinite(gx) || !Number.isFinite(gy) || !Array.isArray(buildableCells)) {
    return null;
  }

  let bestCell = null;
  let bestDist = Infinity;

  for (const cell of buildableCells) {
    if (towers.some(t => t.col === cell.col && t.row === cell.row)) continue;
    const dx = Math.max(0, cell.col - gx, gx - (cell.col + 1));
    const dy = Math.max(0, cell.row - gy, gy - (cell.row + 1));
    const dist = Math.hypot(dx, dy);
    if (dist <= maxDistCells && dist < bestDist) {
      bestDist = dist;
      bestCell = cell;
    }
  }

  return bestCell;
}
