import upgradesData from '../data/upgrades.json' with { type: 'json' };

/**
 * Workshop Modal Component for Research Upgrades & Tower Unlocks.
 */
export function createWorkshopModal(callbacks = {}) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'workshopModal';
  overlay.setAttribute('data-testid', 'workshop-modal');
  overlay.style.display = 'none';

  const content = document.createElement('div');
  content.className = 'modal-content interactive';

  // Header
  const header = document.createElement('div');
  header.className = 'modal-header';
  const title = document.createElement('h2');
  title.className = 'modal-title';
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
      <span class="workshop-item-name">${u.name}</span>
      <span class="workshop-item-desc">${u.description}</span>
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
      <span class="workshop-item-name">${g.name}</span>
      <span class="workshop-item-desc">${g.description}</span>
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

  btnClose.addEventListener('click', (e) => {
    e.stopPropagation();
    if (callbacks.onClose) callbacks.onClose();
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay && callbacks.onClose) {
      callbacks.onClose();
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
    show: () => { overlay.style.display = 'flex'; },
    hide: () => { overlay.style.display = 'none'; },
    isOpen: () => overlay.style.display === 'flex'
  };
}
