import towersData from '../data/towers.json' with { type: 'json' };

/**
 * Inspect Card for viewing, upgrading, and selling placed towers.
 */
export function createInspectCard(callbacks = {}) {
  const card = document.createElement('div');
  card.className = 'inspect-card interactive';
  card.id = 'inspectCard';
  card.setAttribute('data-testid', 'inspect-card');
  card.style.display = 'none';

  // Header
  const header = document.createElement('div');
  header.className = 'inspect-header';
  const title = document.createElement('span');
  title.className = 'inspect-title';
  title.id = 'inspectTitle';
  const lvlBadge = document.createElement('span');
  lvlBadge.className = 'inspect-lvl';
  lvlBadge.id = 'inspectLvl';
  header.appendChild(title);
  header.appendChild(lvlBadge);

  // Stats
  const statsBox = document.createElement('div');
  statsBox.className = 'inspect-stats';
  statsBox.id = 'inspectStats';

  // Actions (Upgrade / Sell)
  const actions = document.createElement('div');
  actions.className = 'inspect-actions';

  const btnUpgrade = document.createElement('button');
  btnUpgrade.className = 'interactive btn btn-cyan';
  btnUpgrade.id = 'btnUpgrade';
  btnUpgrade.setAttribute('data-testid', 'btn-upgrade');
  btnUpgrade.setAttribute('aria-label', 'Upgrade Selected Tower');
  btnUpgrade.textContent = 'UPGRADE';

  const btnSell = document.createElement('button');
  btnSell.className = 'interactive btn btn-danger';
  btnSell.id = 'btnSell';
  btnSell.setAttribute('data-testid', 'btn-sell');
  btnSell.setAttribute('aria-label', 'Sell Selected Tower');
  btnSell.textContent = 'SELL';

  actions.appendChild(btnUpgrade);
  actions.appendChild(btnSell);

  // Close Button
  const btnClose = document.createElement('button');
  btnClose.className = 'interactive btn';
  btnClose.id = 'btnCloseInspect';
  btnClose.setAttribute('data-testid', 'btn-close-inspect');
  btnClose.setAttribute('aria-label', 'Close Inspect Panel');
  btnClose.textContent = 'CLOSE';
  btnClose.style.marginTop = '4px';

  card.appendChild(header);
  card.appendChild(statsBox);
  card.appendChild(actions);
  card.appendChild(btnClose);

  let currentTowerId = null;

  btnUpgrade.addEventListener('click', (e) => {
    e.stopPropagation();
    if (currentTowerId && callbacks.onUpgradeTower) {
      callbacks.onUpgradeTower(currentTowerId);
    }
  });

  btnSell.addEventListener('click', (e) => {
    e.stopPropagation();
    if (currentTowerId && callbacks.onSellTower) {
      callbacks.onSellTower(currentTowerId);
    }
  });

  btnClose.addEventListener('click', (e) => {
    e.stopPropagation();
    if (callbacks.onClose) callbacks.onClose();
  });

  function update(snap, tower) {
    if (!tower) {
      currentTowerId = null;
      card.style.display = 'none';
      return;
    }

    currentTowerId = tower.id;
    card.style.display = 'flex';

    const def = towersData.towers[tower.type];
    if (!def) return;

    title.textContent = def.name;
    lvlBadge.textContent = tower.type === 'fabricator' ? 'LVL 1' : `LVL ${tower.level} / 3`;

    const lvlConfig = def.levels[tower.level - 1];
    const isMaxLvl = tower.level >= def.levels.length || tower.type === 'fabricator';

    let statsHtml = '';
    if (tower.type === 'fabricator') {
      statsHtml = `
        <div class="inspect-stat-row"><span>Output:</span><span class="inspect-stat-val">1 Circuit / 10s</span></div>
        <div class="inspect-stat-row"><span>Limit:</span><span class="inspect-stat-val">Max 4 Active</span></div>
      `;
    } else {
      const dmgBonus = snap.purchasedUpgrades.includes('hardened_rounds') ? ' (+15%)' : '';
      const rngBonus = snap.purchasedUpgrades.includes('long_barrels') ? ' (+10%)' : '';
      const frBonus = snap.purchasedUpgrades.includes('overclock') ? ' (+15%)' : '';

      statsHtml = `
        <div class="inspect-stat-row"><span>Damage:</span><span class="inspect-stat-val">${lvlConfig.damage}${dmgBonus}</span></div>
        <div class="inspect-stat-row"><span>Range:</span><span class="inspect-stat-val">${lvlConfig.range} cells${rngBonus}</span></div>
        <div class="inspect-stat-row"><span>Fire Rate:</span><span class="inspect-stat-val">${lvlConfig.fireRate}/s${frBonus}</span></div>
      `;

      if (tower.type === 'coolant') {
        statsHtml += `<div class="inspect-stat-row"><span>Slow:</span><span class="inspect-stat-val">50% for ${lvlConfig.slowDuration}s</span></div>`;
      } else if (tower.type === 'arc') {
        statsHtml += `<div class="inspect-stat-row"><span>Chain:</span><span class="inspect-stat-val">3 targets (ignores armor)</span></div>`;
      } else if (tower.type === 'rocket') {
        statsHtml += `<div class="inspect-stat-row"><span>Splash:</span><span class="inspect-stat-val">${lvlConfig.splashRadius} cells radius</span></div>`;
      }
    }
    statsBox.innerHTML = statsHtml;

    // Upgrade cost calculation
    if (isMaxLvl) {
      btnUpgrade.disabled = true;
      btnUpgrade.textContent = 'MAX LEVEL';
    } else {
      let upCost = lvlConfig.upgradeCost;
      if (snap.purchasedUpgrades.includes('fast_assembly')) {
        upCost = Math.floor(upCost * 0.90);
      }
      btnUpgrade.textContent = `UPGRADE (${upCost} Scrap)`;
      btnUpgrade.disabled = snap.scrap < upCost;
    }

    // Sell refund calculation: floor(0.70 * investedScrap)
    const refundRatio = towersData.sellRefundRatio || 0.70;
    const refund = Math.floor((tower.investedScrap || lvlConfig.cost) * refundRatio);
    btnSell.textContent = `SELL (+${refund} Scrap)`;
    btnSell.disabled = false;
  }

  return {
    element: card,
    update,
    hide: () => {
      currentTowerId = null;
      card.style.display = 'none';
    },
    show: () => { card.style.display = 'flex'; },
    getCurrentTowerId: () => currentTowerId
  };
}
