import upgradesData from '../data/upgrades.json' with { type: 'json' };
import { escapeHtml } from './utils.js';
import { createThemePicker } from './theme.js';

/**
 * Workshop Modal Component for Research Upgrades & Tower Unlocks.
 */
export function createWorkshopModal(callbacks = {}) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'workshopModal';
  overlay.setAttribute('data-testid', 'workshop-modal');
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'workshopModalTitle');
  overlay.style.display = 'none';

  const content = document.createElement('div');
  content.className = 'modal-content interactive';

  // Header
  const header = document.createElement('div');
  header.className = 'modal-header';
  const title = document.createElement('h2');
  title.className = 'modal-title';
  title.id = 'workshopModalTitle';
  title.textContent = 'RESEARCH WORKSHOP';

  const btnClose = document.createElement('button');
  btnClose.className = 'interactive modal-close';
  btnClose.id = 'btnCloseWorkshop';
  btnClose.setAttribute('data-testid', 'btn-close-workshop');
  btnClose.setAttribute('aria-label', 'Close Workshop');
  btnClose.textContent = '✕';

  header.appendChild(title);
  header.appendChild(btnClose);

  // Circuits Balance Header
  const circuitsBar = document.createElement('div');
  circuitsBar.className = 'workshop-circuits-bar';
  circuitsBar.innerHTML = `
    <span class="hud-stat-label">Available Circuits:</span>
    <span class="hud-stat-val circuits" id="workshopCircuitsVal" data-testid="workshop-circuits-val">0</span>
  `;
  circuitsBar.appendChild(createThemePicker('workshopTheme'));

  // Item list container
  const list = document.createElement('div');
  list.className = 'workshop-list';

  // Section 1: Tower Unlocks
  const unlockTitle = document.createElement('div');
  unlockTitle.className = 'workshop-section-title';
  unlockTitle.textContent = '1. Tower Blueprints';
  list.appendChild(unlockTitle);

  const upgradeButtons = {};

  upgradesData.workshop.unlocks.forEach(u => {
    const item = document.createElement('div');
    item.className = 'workshop-item';

    const info = document.createElement('div');
    info.className = 'workshop-item-info';
    info.innerHTML = `
      <span class="workshop-item-name">${escapeHtml(u.name)}</span>
      <span class="workshop-item-desc">${escapeHtml(u.description)}</span>
    `;

    const btn = document.createElement('button');
    btn.className = 'interactive btn btn-cyan';
    btn.setAttribute('data-upgrade', u.id);
    btn.setAttribute('data-testid', `upgrade-${u.id}`);
    btn.setAttribute('aria-label', `Unlock ${u.name}`);
    btn.textContent = `UNLOCK (${u.cost} ⚡)`;

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (callbacks.onBuyUpgrade) callbacks.onBuyUpgrade(u.id);
    });

    item.appendChild(info);
    item.appendChild(btn);
    list.appendChild(item);

    upgradeButtons[u.id] = { btn, cost: u.cost, target: u.target, isUnlock: true };
  });

  // Section 2: Global Upgrades
  const globalTitle = document.createElement('div');
  globalTitle.className = 'workshop-section-title';
  globalTitle.textContent = '2. Global Factory Upgrades';
  list.appendChild(globalTitle);

  upgradesData.workshop.globalUpgrades.forEach(g => {
    const item = document.createElement('div');
    item.className = 'workshop-item';

    const info = document.createElement('div');
    info.className = 'workshop-item-info';
    info.innerHTML = `
      <span class="workshop-item-name">${escapeHtml(g.name)}</span>
      <span class="workshop-item-desc">${escapeHtml(g.description)}</span>
    `;

    const btn = document.createElement('button');
    btn.className = 'interactive btn btn-hazard';
    btn.setAttribute('data-upgrade', g.id);
    btn.setAttribute('data-testid', `upgrade-${g.id}`);
    btn.setAttribute('aria-label', `Purchase ${g.name}`);
    btn.textContent = `BUY (${g.cost} ⚡)`;

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (callbacks.onBuyUpgrade) callbacks.onBuyUpgrade(g.id);
    });

    item.appendChild(info);
    item.appendChild(btn);
    list.appendChild(item);

    upgradeButtons[g.id] = { btn, cost: g.cost, isUnlock: false };
  });

  content.appendChild(header);
  content.appendChild(circuitsBar);
  content.appendChild(list);
  overlay.appendChild(content);

  let previousFocus = null;

  function isOpen() {
    return overlay.style.display === 'flex';
  }

  function getFocusableElements() {
    return Array.from(
      overlay.querySelectorAll('button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])')
    );
  }

  function closeModal() {
    if (callbacks.onClose) {
      callbacks.onClose();
    } else {
      hide();
    }
  }

  function handleKeyDown(e) {
    if (!isOpen()) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      closeModal();
      return;
    }
    if (e.key === 'Tab') {
      const focusable = getFocusableElements();
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (e.shiftKey) {
        if (active === first || !overlay.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (active === last || !overlay.contains(active)) {
          e.preventDefault();
          first.focus();
        }
      }
    }
  }

  function show() {
    if (isOpen()) return;
    if (typeof document !== 'undefined') {
      previousFocus = document.activeElement;
      document.addEventListener('keydown', handleKeyDown);
    }
    overlay.style.display = 'flex';
    if (callbacks.onVisibilityChange) callbacks.onVisibilityChange(true);
    btnClose.focus();
  }

  function hide() {
    const wasOpen = isOpen();
    overlay.style.display = 'none';
    if (typeof document !== 'undefined') {
      document.removeEventListener('keydown', handleKeyDown);
    }
    if (callbacks.onVisibilityChange) callbacks.onVisibilityChange(false);
    if (wasOpen && previousFocus && typeof previousFocus.focus === 'function') {
      if (typeof document === 'undefined' || document.contains(previousFocus)) {
        previousFocus.focus();
      }
    }
    previousFocus = null;
  }

  btnClose.addEventListener('click', (e) => {
    e.stopPropagation();
    closeModal();
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closeModal();
    }
  });

  const circuitsValEl = circuitsBar.querySelector('#workshopCircuitsVal');

  function update(snap) {
    if (!snap) return;

    circuitsValEl.textContent = `${snap.circuits} ⚡`;

    for (const [id, item] of Object.entries(upgradeButtons)) {
      const isAlreadyUnlocked = item.isUnlock
        ? snap.unlockedTowers.includes(item.target)
        : snap.purchasedUpgrades.includes(id);

      if (isAlreadyUnlocked) {
        item.btn.disabled = true;
        item.btn.textContent = 'RESEARCHED ✓';
        item.btn.className = 'interactive btn';
      } else {
        const canAfford = snap.circuits >= item.cost;
        item.btn.disabled = !canAfford;
        item.btn.textContent = `${item.isUnlock ? 'UNLOCK' : 'BUY'} (${item.cost} ⚡)`;
        item.btn.className = item.isUnlock ? 'interactive btn btn-cyan' : 'interactive btn btn-hazard';
      }
    }
  }

  return {
    element: overlay,
    update,
    show,
    hide,
    isOpen
  };
}
