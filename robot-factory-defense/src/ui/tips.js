/**
 * First-run tips configuration and helper functions.
 */
export const FIRST_RUN_TIPS = [
  'Tap a green cell, then select a turret to build defense.',
  'Build Fabricators early to generate Circuits for powerful Workshop upgrades.',
  'Armored enemies resist basic turrets; use Arc Coils and Rockets.'
];

export function createTipsBanner(onDismiss) {
  let currentTipIndex = 0;
  const banner = document.createElement('div');
  banner.className = 'tips-banner interactive';
  banner.id = 'tipsBanner';
  banner.setAttribute('data-testid', 'tips-banner');

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
  dismissBtn.innerHTML = '✕';

  dismissBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    currentTipIndex++;
    if (currentTipIndex < FIRST_RUN_TIPS.length) {
      text.textContent = FIRST_RUN_TIPS[currentTipIndex];
    } else {
      banner.style.display = 'none';
      if (onDismiss) onDismiss();
    }
  });

  banner.appendChild(badge);
  banner.appendChild(text);
  banner.appendChild(dismissBtn);

  return {
    element: banner,
    nextTip: () => {
      currentTipIndex = (currentTipIndex + 1) % FIRST_RUN_TIPS.length;
      text.textContent = FIRST_RUN_TIPS[currentTipIndex];
    },
    hide: () => {
      banner.style.display = 'none';
    },
    show: () => {
      banner.style.display = 'flex';
    }
  };
}
