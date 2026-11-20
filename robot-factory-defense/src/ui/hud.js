/**
 * HUD Controller for Robot Factory Defense
 */
export function createHUD(callbacks = {}) {
  const container = document.createElement('div');
  container.className = 'hud-bar';
  container.id = 'hudBar';
  container.setAttribute('data-testid', 'hud-bar');

  // Stats Group (Left)
  const statsGroup = document.createElement('div');
  statsGroup.className = 'hud-group';

  // Core HP
  const hpStat = document.createElement('div');
  hpStat.className = 'hud-stat';
  hpStat.innerHTML = `
    <span class="hud-stat-label">Core</span>
    <span class="hud-stat-val core-hp" id="hudCoreHp" data-testid="hud-core-hp">20 / 20</span>
  `;

  // Scrap
  const scrapStat = document.createElement('div');
  scrapStat.className = 'hud-stat';
  scrapStat.innerHTML = `
    <span class="hud-stat-label">Scrap</span>
    <span class="hud-stat-val scrap" id="hudScrap" data-testid="hud-scrap">150</span>
  `;

  // Circuits
  const circuitStat = document.createElement('div');
  circuitStat.className = 'hud-stat';
  circuitStat.innerHTML = `
    <span class="hud-stat-label">Circuits</span>
    <span class="hud-stat-val circuits" id="hudCircuits" data-testid="hud-circuits">0</span>
  `;

  // Wave
  const waveStat = document.createElement('div');
  waveStat.className = 'hud-stat';
  waveStat.innerHTML = `
    <span class="hud-stat-label">Wave</span>
    <span class="hud-stat-val wave" id="hudWave" data-testid="hud-wave">0 / 15</span>
  `;

  statsGroup.appendChild(hpStat);
  statsGroup.appendChild(scrapStat);
  statsGroup.appendChild(circuitStat);
  statsGroup.appendChild(waveStat);

  // Actions Group (Right)
  const actionsGroup = document.createElement('div');
  actionsGroup.className = 'hud-group';

  // Start Wave Button
  const btnStartWave = document.createElement('button');
  btnStartWave.className = 'interactive btn btn-hazard';
  btnStartWave.id = 'btnStartWave';
  btnStartWave.setAttribute('data-testid', 'btn-start-wave');
  btnStartWave.setAttribute('aria-label', 'Start Next Wave');
  btnStartWave.textContent = 'START WAVE';
  btnStartWave.addEventListener('click', () => {
    if (callbacks.onStartWave) callbacks.onStartWave();
  });

  // Speed Toggle
  const btnSpeed = document.createElement('button');
  btnSpeed.className = 'interactive btn';
  btnSpeed.id = 'btnSpeed';
  btnSpeed.setAttribute('data-testid', 'btn-speed');
  btnSpeed.setAttribute('aria-label', 'Toggle Game Speed');
  btnSpeed.textContent = '1x';
  btnSpeed.addEventListener('click', () => {
    if (callbacks.onToggleSpeed) callbacks.onToggleSpeed();
  });

  // Pause Button
  const btnPause = document.createElement('button');
  btnPause.className = 'interactive btn';
  btnPause.id = 'btnPause';
  btnPause.setAttribute('data-testid', 'btn-pause');
  btnPause.setAttribute('aria-label', 'Pause or Resume Game');
  btnPause.textContent = 'PAUSE';
  btnPause.addEventListener('click', () => {
    if (callbacks.onTogglePause) callbacks.onTogglePause();
  });

  // Workshop Button
  const btnWorkshop = document.createElement('button');
  btnWorkshop.className = 'interactive btn btn-cyan';
  btnWorkshop.id = 'btnWorkshop';
  btnWorkshop.setAttribute('data-testid', 'btn-workshop');
  btnWorkshop.setAttribute('aria-label', 'Open Research Workshop');
  btnWorkshop.textContent = 'WORKSHOP ⚡';
  btnWorkshop.addEventListener('click', () => {
    if (callbacks.onOpenWorkshop) callbacks.onOpenWorkshop();
  });

  actionsGroup.appendChild(btnStartWave);
  actionsGroup.appendChild(btnSpeed);
  actionsGroup.appendChild(btnPause);
  actionsGroup.appendChild(btnWorkshop);

  container.appendChild(statsGroup);
  container.appendChild(actionsGroup);

  const coreHpEl = hpStat.querySelector('#hudCoreHp');
  const scrapEl = scrapStat.querySelector('#hudScrap');
  const circuitsEl = circuitStat.querySelector('#hudCircuits');
  const waveEl = waveStat.querySelector('#hudWave');

  function update(snap) {
    if (!snap) return;

    coreHpEl.textContent = `${Math.max(0, snap.coreHp)} / ${snap.maxCoreHp}`;
    scrapEl.textContent = `${snap.scrap}`;
    circuitsEl.textContent = `${snap.circuits}`;
    waveEl.textContent = `${snap.wave} / ${snap.totalWaves || 15}`;

    btnSpeed.textContent = snap.speed === 2 ? '2x' : '1x';
    btnPause.textContent = snap.paused ? 'RESUME' : 'PAUSE';

    const canStart = snap.waveState === 'idle' || snap.waveState === 'cleared';
    const isGameOver = snap.waveState === 'won' || snap.waveState === 'lost';
    const isMaxWave = snap.wave >= (snap.totalWaves || 15);

    btnStartWave.disabled = !canStart || isGameOver || (isMaxWave && snap.waveState === 'cleared');

    if (snap.waveState === 'spawning' || snap.waveState === 'active') {
      btnStartWave.textContent = 'DEFENDING...';
    } else if (snap.wave === 0) {
      btnStartWave.textContent = 'START WAVE 1';
    } else if (isMaxWave && snap.waveState === 'cleared') {
      btnStartWave.textContent = 'COMPLETE';
    } else {
      btnStartWave.textContent = `START WAVE ${snap.wave + 1}`;
    }
  }

  return {
    element: container,
    update
  };
}
