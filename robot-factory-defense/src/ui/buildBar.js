import towersData from '../data/towers.json' with { type: 'json' };

/**
 * Build Bar Component for selecting and deploying towers.
 */
export function createBuildBar(callbacks = {}) {
  const container = document.createElement('div');
  container.className = 'build-bar';
  container.id = 'buildBar';
  container.setAttribute('data-testid', 'build-bar');
  container.style.display = 'none';

  const towerTypes = ['pulse', 'coolant', 'arc', 'rocket', 'fabricator'];

  const buttons = {};

  towerTypes.forEach(type => {
    const def = towersData.towers[type];
    const btn = document.createElement('button');
    btn.className = 'interactive build-card';
    btn.setAttribute('data-tower', type);
    btn.setAttribute('data-testid', `build-${type}`);
    btn.setAttribute('aria-label', `Build ${def.name}`);

    const nameEl = document.createElement('span');
    nameEl.className = 'build-card-name';
    nameEl.textContent = def.name;

    const costEl = document.createElement('span');
    costEl.className = 'build-card-cost';
    costEl.textContent = `${def.levels[0].cost} Scrap`;

    btn.appendChild(nameEl);
    btn.appendChild(costEl);

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (callbacks.onBuildTower) {
        callbacks.onBuildTower(type);
      }
    });

    buttons[type] = { btn, costEl, def };
    container.appendChild(btn);
  });

  // Cancel / Close selection button
  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'interactive btn btn-danger';
  cancelBtn.id = 'btnCancelBuild';
  cancelBtn.setAttribute('data-testid', 'btn-cancel-build');
  cancelBtn.setAttribute('aria-label', 'Cancel Build Selection');
  cancelBtn.textContent = 'CANCEL';
  cancelBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (callbacks.onCancel) callbacks.onCancel();
  });
  container.appendChild(cancelBtn);

  function update(snap, selectedCell) {
    if (!selectedCell) {
      container.style.display = 'none';
      return;
    }

    container.style.display = 'flex';

    const hasFastAssembly = snap.purchasedUpgrades.includes('fast_assembly');

    towerTypes.forEach(type => {
      const { btn, costEl, def } = buttons[type];
      let baseCost = def.levels[0].cost;
      if (hasFastAssembly) {
        baseCost = Math.floor(baseCost * 0.90);
      }

      costEl.textContent = `${baseCost} Scrap`;

      const isUnlocked = snap.unlockedTowers.includes(type);
      const canAfford = snap.scrap >= baseCost;
      const isMaxFab = type === 'fabricator' && snap.fabricatorCount >= 4;

      if (!isUnlocked) {
        btn.disabled = true;
        costEl.textContent = 'LOCKED (Workshop)';
      } else if (isMaxFab) {
        btn.disabled = true;
        costEl.textContent = 'MAX 4 BUILT';
      } else if (!canAfford) {
        btn.disabled = true;
        costEl.textContent = `${baseCost} Scrap (Need +${baseCost - snap.scrap})`;
      } else {
        btn.disabled = false;
      }
    });
  }

  return {
    element: container,
    update,
    hide: () => { container.style.display = 'none'; },
    show: () => { container.style.display = 'flex'; }
  };
}
