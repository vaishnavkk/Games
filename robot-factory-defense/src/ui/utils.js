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
