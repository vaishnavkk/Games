import { getBestWave, getWins } from './storage.js';
import { FIRST_RUN_TIPS } from './tips.js';

/**
 * Screen Overlays: Title, Victory, Defeat screens.
 */
export function createScreens(callbacks = {}) {
  // Title Screen
  const titleScreen = document.createElement('div');
  titleScreen.className = 'screen-overlay';
  titleScreen.id = 'titleScreen';
  titleScreen.setAttribute('data-testid', 'title-screen');

  titleScreen.innerHTML = `
    <h1 class="screen-title">ROBOT FACTORY DEFENSE</h1>
    <p class="screen-subtitle">Assemble defensive turrets along the industrial conveyor, research advanced workshop blueprints, and protect the factory core against 15 waves of rogue automata.</p>
    
    <div class="screen-stats-box">
      <div>
        <div class="screen-stat-label">Best Wave</div>
        <div class="screen-stat-val" id="titleBestWave" data-testid="title-best-wave">0 / 15</div>
      </div>
      <div>
        <div class="screen-stat-label">Factory Victories</div>
        <div class="screen-stat-val" id="titleWins" data-testid="title-wins">0</div>
      </div>
    </div>

    <div class="screen-tips-box">
      <div class="screen-tips-header">Tactical Directives</div>
      <ol class="screen-tips-list">
        <li>${FIRST_RUN_TIPS[0]}</li>
        <li>${FIRST_RUN_TIPS[1]}</li>
        <li>${FIRST_RUN_TIPS[2]}</li>
      </ol>
    </div>

    <button class="interactive btn btn-hazard" id="btnPlay" data-testid="btn-play" aria-label="Deploy into Factory" style="font-size: 16px; padding: 12px 32px;">
      DEPLOY TO FACTORY
    </button>
  `;

  const btnPlay = titleScreen.querySelector('#btnPlay');
  btnPlay.addEventListener('click', () => {
    titleScreen.style.display = 'none';
    if (callbacks.onStartGame) callbacks.onStartGame();
  });

  // End Game Summary Screen (Shared for Win/Defeat)
  const endScreen = document.createElement('div');
  endScreen.className = 'screen-overlay';
  endScreen.id = 'endScreen';
  endScreen.setAttribute('data-testid', 'end-screen');
  endScreen.style.display = 'none';

  endScreen.innerHTML = `
    <h1 class="screen-title" id="endTitle" data-testid="end-title">MISSION OVER</h1>
    <p class="screen-subtitle" id="endSubtitle" data-testid="end-subtitle"></p>

    <div class="screen-stats-box" id="endStatsBox">
      <div>
        <div class="screen-stat-label">Wave Reached</div>
        <div class="screen-stat-val wave" id="endWaveVal" data-testid="end-wave-val">0</div>
      </div>
      <div>
        <div class="screen-stat-label">Final Core HP</div>
        <div class="screen-stat-val core-hp" id="endCoreVal" data-testid="end-core-val">0</div>
      </div>
      <div>
        <div class="screen-stat-label">Automata Destroyed</div>
        <div class="screen-stat-val" id="endKillsVal" data-testid="end-kills-val">0</div>
      </div>
      <div>
        <div class="screen-stat-label">Scrap Collected</div>
        <div class="screen-stat-val scrap" id="endScrapVal" data-testid="end-scrap-val">0</div>
      </div>
    </div>

    <button class="interactive btn btn-cyan" id="btnRetry" data-testid="btn-retry" aria-label="Retry Game" style="font-size: 16px; padding: 12px 32px;">
      RETRY MISSION
    </button>
  `;

  const btnRetry = endScreen.querySelector('#btnRetry');
  btnRetry.addEventListener('click', () => {
    endScreen.style.display = 'none';
    if (callbacks.onRetry) callbacks.onRetry();
  });

  function refreshTitleStats() {
    const bestWaveEl = titleScreen.querySelector('#titleBestWave');
    const winsEl = titleScreen.querySelector('#titleWins');
    if (bestWaveEl) bestWaveEl.textContent = `${getBestWave()} / 15`;
    if (winsEl) winsEl.textContent = `${getWins()}`;
  }
  refreshTitleStats();

  function showVictory(snap) {
    const titleEl = endScreen.querySelector('#endTitle');
    const subEl = endScreen.querySelector('#endSubtitle');
    titleEl.className = 'screen-title win';
    titleEl.textContent = 'FACTORY SECURED!';
    subEl.textContent = 'All 15 waves of rogue automata neutralized. The core remains fully operational!';

    populateEndStats(snap);
    endScreen.style.display = 'flex';
  }

  function showDefeat(snap) {
    const titleEl = endScreen.querySelector('#endTitle');
    const subEl = endScreen.querySelector('#endSubtitle');
    titleEl.className = 'screen-title loss';
    titleEl.textContent = 'CORE BREACHED!';
    subEl.textContent = 'Defensive perimeter collapsed under hostile automata assault.';

    populateEndStats(snap);
    endScreen.style.display = 'flex';
  }

  function populateEndStats(snap) {
    const waveEl = endScreen.querySelector('#endWaveVal');
    const coreEl = endScreen.querySelector('#endCoreVal');
    const killsEl = endScreen.querySelector('#endKillsVal');
    const scrapEl = endScreen.querySelector('#endScrapVal');

    if (waveEl) waveEl.textContent = `${snap.wave} / ${snap.totalWaves || 15}`;
    if (coreEl) coreEl.textContent = `${Math.max(0, snap.coreHp)} / ${snap.maxCoreHp}`;
    if (killsEl) killsEl.textContent = `${snap.stats ? snap.stats.enemiesKilled : 0}`;
    if (scrapEl) scrapEl.textContent = `${snap.stats ? snap.stats.scrapEarned : snap.scrap}`;
  }

  return {
    titleScreen,
    endScreen,
    refreshTitleStats,
    showVictory,
    showDefeat,
    hideEndScreen: () => { endScreen.style.display = 'none'; },
    showTitleScreen: () => {
      refreshTitleStats();
      titleScreen.style.display = 'flex';
    },
    hideTitleScreen: () => { titleScreen.style.display = 'none'; },
    isTitleVisible: () => titleScreen.style.display !== 'none',
    isEndVisible: () => endScreen.style.display !== 'none'
  };
}
