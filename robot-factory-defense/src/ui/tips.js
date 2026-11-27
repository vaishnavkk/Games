import { getStoredData, setStoredData } from './storage.js';

/**
 * First-run tips configuration and helper functions.
 */
export const FIRST_RUN_TIPS = [
  'Tap a highlighted pad, then choose a turret.',
  'Build Fabricators early to generate Circuits for powerful Workshop upgrades.',
  'Armored enemies resist basic turrets; use Arc Coils and Rockets.'
];

export const TIPS_DISMISSED_KEY = 'tips_dismissed';

export function createTipsBanner(onDismiss) {
  let currentTipIndex = 0;
  let dismissed = Boolean(getStoredData(TIPS_DISMISSED_KEY, false));

  const banner = document.createElement('div');
  banner.className = 'tips-banner interactive';
  banner.id = 'tipsBanner';
  banner.setAttribute('data-testid', 'tips-banner');
  if (dismissed) {
    banner.style.display = 'none';
  }

  const badge = document.createElement('span');
  badge.className = 'tips-badge';
  badge.textContent = 'TIP';

  const text = document.createElement('span');
  text.className = 'tips-text';
  text.id = 'tipsText';
  text.textContent = FIRST_RUN_TIPS[currentTipIndex];

  const dismissBtn = document.createElement('button');
  dismissBtn.className = 'tips-dismiss interactive';
  dismissBtn.id = 'btnDismissTip';
  dismissBtn.setAttribute('data-testid', 'btn-dismiss-tip');
  dismissBtn.setAttribute('aria-label', 'Next Tip or Dismiss');
  dismissBtn.textContent = '✕';

  function dismiss() {
    if (dismissed) return;
    dismissed = true;
    setStoredData(TIPS_DISMISSED_KEY, true);
    banner.style.display = 'none';
    if (onDismiss) onDismiss();
  }

  dismissBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    currentTipIndex++;
    if (currentTipIndex < FIRST_RUN_TIPS.length) {
      text.textContent = FIRST_RUN_TIPS[currentTipIndex];
    } else {
      dismiss();
    }
  });

  banner.appendChild(badge);
  banner.appendChild(text);
  banner.appendChild(dismissBtn);

  return {
    element: banner,
    dismiss
  };
}
