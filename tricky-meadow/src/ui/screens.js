import { renderEmoji } from '../sprite.js';
import { LEVELS } from '../engine/game.js';
import { renderMascot } from './mascot.js';
import { escapeHtml } from './escape.js';

function renderStarString(count) {
  let stars = '';
  for (let i = 0; i < count; i++) {
    stars += renderEmoji('star', 24);
  }
  return stars;
}

function renderHomeScreen(_game) {
  return `
    <div class="screen screen-home bg-home">
      <div class="ambient-layer" aria-hidden="true">
        <span class="ambient-cloud cloud-1"></span>
        <span class="ambient-cloud cloud-2"></span>
        <span class="ambient-firefly"></span>
      </div>

      <div class="brand-hero">
        <div class="hero-mascot">
          ${renderMascot('neutral', 'Welcome to Tricky Meadow! Look closely—nothing is quite what it seems!', 96)}
        </div>
        <h1 class="game-title">Tricky Meadow</h1>
        <p class="game-tagline">Clever trick-puzzles for curious kids!</p>
        <p class="how-to-play">Tap cards to solve tricks. Read fun science secrets!</p>
      </div>

      <div class="home-actions">
        <button type="button" class="btn btn-primary btn-play" id="btnPlay">
          ${renderEmoji('sparkles', 28)}
          <span>Play Puzzles</span>
        </button>
        <button type="button" class="btn btn-secondary btn-settings" id="btnSettings" aria-label="Settings and Credits">
          ${renderEmoji('settings', 24)}
          <span>Settings & Credits</span>
        </button>
      </div>
    </div>
  `;
}

function renderMapScreen(game) {
  const totalStars = Object.values(game.progress.stars || {}).reduce(
    (sum, val) => sum + (typeof val === 'number' && Number.isInteger(val) && val >= 1 && val <= 3 ? val : 0),
    0
  );

  const levelCardsHtml = LEVELS.map(lvl => {
    const unlocked = game.isUnlocked(lvl.id);
    const lvlStars = game.getTotalStarsForLevel(lvl.id);
    const totalInLevel = typeof game.getTotalPuzzlesForLevel === 'function'
      ? game.getTotalPuzzlesForLevel(lvl.id)
      : game.getLevelPuzzles(lvl.id).length;
    const maxStars = totalInLevel * 3;

    return `
      <article class="level-card ${unlocked ? 'unlocked' : 'locked'}" data-level="${lvl.id}">
        <div class="level-head">
          <span class="level-icon">${renderEmoji(lvl.emoji, 44)}</span>
          <div class="level-meta">
            <span class="level-badge">Level ${lvl.id}</span>
            <h2 class="level-name">${escapeHtml(lvl.name)}</h2>
          </div>
          <div class="level-status">
            ${unlocked
              ? `<span class="level-stars">${renderEmoji('star', 20)} ${lvlStars}/${maxStars}</span>`
              : `<span class="level-lock">${renderEmoji('lock', 24)}</span>`
            }
          </div>
        </div>

        <div class="level-desc">
          ${unlocked
            ? `<p>${lvlStars > 0 ? 'Keep going!' : 'Ready to start!'}</p>`
            : `<p class="unlock-rule">Solve 4 puzzles in Level ${lvl.id - 1} to unlock</p>`
          }
        </div>

        <button type="button" class="btn ${unlocked ? 'btn-select-level' : 'btn-locked'}" data-level="${lvl.id}" ${unlocked ? '' : 'disabled'}>
          ${unlocked ? 'Play Level' : 'Locked'}
        </button>
      </article>
    `;
  }).join('');

  return `
    <div class="screen screen-map bg-map">
      <div class="ambient-layer" aria-hidden="true">
        <span class="ambient-cloud cloud-1"></span>
        <span class="ambient-firefly"></span>
      </div>
      <header class="hud-bar topbar">
        <button type="button" class="icon-btn header-btn" id="btnBackHome" aria-label="Back to Home">
          ${renderEmoji('home', 28)}
        </button>
        <h1 class="hud-title topbar-title">Meadow Map</h1>
        <button type="button" class="icon-btn header-btn" id="btnSettings" aria-label="Settings">
          ${renderEmoji('settings', 28)}
        </button>
      </header>

      <div class="progress-row map-progress-row">
        <span>Explore Meadow Levels</span>
        <div class="hud-stars" title="Total Stars Earned">
          ${renderEmoji('star', 20)}
          <span class="star-count">${totalStars} Stars</span>
        </div>
      </div>

      <main class="levels-grid">
        ${levelCardsHtml}
      </main>
    </div>
  `;
}

function renderPuzzleScreen(game) {
  const puzzle = game.getCurrentPuzzle();
  if (!puzzle) return `<div class="screen"><p>No puzzle selected.</p></div>`;

  const levelInfo = LEVELS.find(l => l.id === game.level);
  const levelPuzzles = game.getLevelPuzzles();
  const puzzleIdx = levelPuzzles.findIndex(p => p.id === game.puzzleId);
  const totalPuzzlesInLevel = levelPuzzles.length;
  const currentPotentialStars = game.hintUsed ? 2 : (game.tries === 0 ? 3 : (game.tries === 1 ? 2 : 1));

  const displayedItems = game.getCurrentDisplayedItems ? game.getCurrentDisplayedItems() : (game.displayedItems || puzzle.items);
  const itemsHtml = displayedItems.map(item => {
    let extraClass = '';
    let badgeHtml = '';

    if (puzzle.type === 'tapall') {
      const selected = game.tapAllSelection.has(item.id);
      if (selected) {
        extraClass = 'selected';
        badgeHtml = `<span class="item-badge checkmark">${renderEmoji('check', 20)}</span>`;
      }
    } else if (puzzle.type === 'order') {
      const orderIdx = game.orderSelection.indexOf(item.id);
      if (orderIdx !== -1) {
        extraClass = 'ordered';
        badgeHtml = `<span class="item-badge order-num">${orderIdx + 1}</span>`;
      }
    }

    const escapedLabel = escapeHtml(item.label);
    return `
      <button type="button" class="card-item ${extraClass}" data-item-id="${escapeHtml(item.id)}" aria-label="${escapedLabel}">
        ${badgeHtml}
        <span class="card-emoji">${renderEmoji(item.emoji, 56)}</span>
        <span class="card-label">${escapedLabel}</span>
      </button>
    `;
  }).join('');

  return `
    <div class="screen screen-puzzle bg-level-${game.level} ${game.isShaking ? 'shake' : ''}">
      <header class="hud-bar topbar">
        <button type="button" class="icon-btn header-btn" id="btnBackMap" aria-label="Back to Map">
          ${renderEmoji('home', 28)}
        </button>
        <h1 class="hud-title topbar-title hud-level-tag">${escapeHtml(levelInfo?.name || `Level ${game.level}`)}</h1>
        <button type="button" class="icon-btn header-btn" id="btnSettings" aria-label="Settings">
          ${renderEmoji('settings', 28)}
        </button>
      </header>

      <div class="progress-row">
        <span class="progress-label">Puzzle ${puzzleIdx >= 0 ? puzzleIdx + 1 : 1} of ${totalPuzzlesInLevel}</span>
        <div class="progress-stars earned-stars" aria-label="Potential stars" title="Potential stars for this round">
          ${renderStarString(currentPotentialStars)}
        </div>
      </div>

      <section class="mascot-puzzle-row">
        ${renderMascot(
          game.tries > 0 ? 'think' : (game.hintUsed ? 'think' : 'neutral'),
          game.hintUsed ? `Hint: ${puzzle.hint}` : (game.feedback ? game.feedback : null),
          64
        )}
      </section>

      <section class="prompt-box">
        <h2 class="puzzle-prompt">${escapeHtml(puzzle.prompt)}</h2>
      </section>

      <div class="cards-area ${puzzle.type}-mode">
        ${itemsHtml}
      </div>

      ${puzzle.type === 'order'
        ? `
          <div class="order-hint">
            <p>Tap in order! Tap a numbered card again to undo.</p>
          </div>
        `
        : ''
      }

      <footer class="action-bar">
        <button type="button" class="btn btn-hint hint-btn ${game.hintUsed ? 'hint-used' : ''}" id="btnHint" aria-label="Use Hint" ${game.hintUsed ? 'disabled' : ''}>
          ${renderEmoji('hint', 28)}
          <span>${game.hintUsed ? 'Hint On' : 'Hint'}</span>
        </button>
        <button type="button" class="btn icon-btn btn-read-aloud" id="btnReadAloud" aria-label="Read prompt aloud">
          ${renderEmoji('speaker', 28)}
        </button>
        ${puzzle.type === 'tapall'
          ? `
            <button type="button" class="btn btn-primary btn-submit" id="btnDoneTapAll">
              ${renderEmoji('check', 24)}
              <span>Done</span>
            </button>
          `
          : ''
        }
      </footer>
    </div>
  `;
}

function renderFactScreen(game) {
  const puzzle = game.getCurrentPuzzle();
  if (!puzzle) return `<div class="screen"><p>No fact available.</p></div>`;

  const starCount = game.stars || 1;
  const starsHtml = renderStarString(starCount);

  return `
    <div class="screen screen-fact bg-level-${game.level}">
      <div class="fact-card">
        <div class="fact-stars-banner">
          <div class="earned-stars">${starsHtml}</div>
          <span class="earned-label">You earned ${starCount} star${starCount > 1 ? 's' : ''}!</span>
        </div>

        <div class="fact-content">
          <div class="fact-header">
            ${renderMascot('cheer', null, 56)}
            <h2 class="fact-title">Did You Know?</h2>
          </div>
          <p class="fact-text">${escapeHtml(puzzle.fact.text)}</p>

          ${puzzle.fact.evidence && puzzle.fact.evidence.length > 0
            ? `
              <div class="evidence-pills">
                ${puzzle.fact.evidence.map(e => `<span class="pill">${escapeHtml(e)}</span>`).join('')}
              </div>
            `
            : ''
          }
        </div>

        <div class="fact-actions">
          <button type="button" class="btn btn-primary btn-next" id="btnNextFact">
            <span>Next Puzzle</span>
            ${renderEmoji('sparkles', 24)}
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderLevelDoneScreen(game) {
  const levelInfo = LEVELS.find(l => l.id === game.level);
  const totalLvlStars = game.getTotalStarsForLevel(game.level);
  const totalInLevel = typeof game.getTotalPuzzlesForLevel === 'function'
    ? game.getTotalPuzzlesForLevel(game.level)
    : game.getLevelPuzzles(game.level).length;

  return `
    <div class="screen screen-level-done bg-level-${game.level}">
      <div class="level-done-card">
        <div class="done-icon">
          ${renderMascot('cheer', 'Incredible work, explorer!', 96)}
        </div>
        <h1 class="done-title">${escapeHtml(levelInfo?.name || 'Level')} Complete!</h1>
        <p class="done-subtitle">Awesome job solving puzzles in the meadow!</p>

        <div class="done-stars-summary">
          ${renderEmoji('star', 32)}
          <span class="done-score">${totalLvlStars} / ${totalInLevel * 3} Stars</span>
        </div>

        <div class="done-actions">
          <button type="button" class="btn btn-primary" id="btnDoneBackMap">
            <span>Back to Meadow Map</span>
            ${renderEmoji('home', 24)}
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderSettingsScreen(_game) {
  return `
    <div class="screen screen-settings">
      <div class="settings-card">
        <header class="hud-bar topbar settings-topbar">
          <button type="button" class="icon-btn header-btn" id="btnCloseSettings" aria-label="Close Settings">
            ${renderEmoji('home', 28)}
          </button>
          <h1 class="hud-title topbar-title">Settings & Credits</h1>
          <button type="button" class="icon-btn header-btn" id="btnDoneSettings" aria-label="Done">
            ${renderEmoji('check', 24)}
          </button>
        </header>

        <section class="settings-section">
          <h3>Credits & Attributions</h3>
          <ul class="credits-list plain-text-sources">
            <li>
              <strong>Illustrations:</strong> Twemoji graphics by Twitter / X contributors, licensed under CC-BY 4.0.
            </li>
            <li>
              <strong>Typography:</strong> Fredoka (by Milena Brandao) & Patrick Hand (by Patrick Wagesreiter), licensed under the SIL Open Font License 1.1.
            </li>
            <li>
              <strong>Celebrations:</strong> canvas-confetti by Kiril Vatev, licensed under the ISC License.
            </li>
          </ul>
        </section>

        <section class="settings-section">
          <h3>Fact Sources (Parents & Educators)</h3>
          <p class="reset-desc">Institutional sources consulted for educational facts (plain text):</p>
          <ul class="credits-list plain-text-sources">
            <li>NASA Space Place & Solar System Exploration</li>
            <li>Smithsonian's National Zoo & Conservation Biology Institute</li>
            <li>NOAA, Ocean Service & USGS Water Science School</li>
            <li>National Park Service (NPS)</li>
            <li>NIH MedlinePlus, NHLBI, NIAMS & NIDCD</li>
            <li>ASU Ask A Biologist, University Extensions & ADA MouthHealthy</li>
          </ul>
        </section>

        <section class="settings-section reset-section">
          <h3>Game Progress</h3>
          <p class="reset-desc">Press and hold for 2 seconds to reset progress.</p>
          <div class="hold-container">
            <button type="button" class="btn btn-reset-progress" id="btnResetProgress">
              <span class="btn-text">Hold to Reset (2s)</span>
              <div class="hold-progress" id="holdProgress"></div>
            </button>
          </div>
        </section>

        <div class="settings-foot">
          <button type="button" class="btn btn-secondary" id="btnDismissSettings">Done</button>
        </div>
      </div>
    </div>
  `;
}

export function renderApp(game) {
  switch (game.screen) {
    case 'home':
      return renderHomeScreen(game);
    case 'map':
      return renderMapScreen(game);
    case 'puzzle':
      return renderPuzzleScreen(game);
    case 'fact':
      return renderFactScreen(game);
    case 'level_done':
      return renderLevelDoneScreen(game);
    case 'settings':
      return renderSettingsScreen(game);
    default:
      return renderHomeScreen(game);
  }
}
