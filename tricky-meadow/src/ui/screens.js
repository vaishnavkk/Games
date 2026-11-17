import { renderEmoji } from '../sprite.js';
import { LEVELS } from '../engine/game.js';

export function renderStarString(count) {
  let stars = '';
  for (let i = 0; i < count; i++) {
    stars += renderEmoji('star', 24);
  }
  return stars;
}

export function renderHomeScreen(_game) {
  return `
    <div class="screen screen-home">
      <div class="brand-hero">
        <div class="hero-icons">
          ${renderEmoji('rabbit', 64, 'hero-bounce')}
          ${renderEmoji('sparkles', 36, 'hero-sparkle')}
          ${renderEmoji('clover', 44, 'hero-float')}
        </div>
        <h1 class="game-title">Tricky Meadow</h1>
        <p class="game-tagline">Clever trick-puzzles for curious kids!</p>
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

export function renderMapScreen(game) {
  const totalStars = Object.values(game.progress.stars || {}).reduce((a, b) => a + b, 0);

  const levelCardsHtml = LEVELS.map(lvl => {
    const unlocked = game.isUnlocked(lvl.id);
    const lvlStars = game.getTotalStarsForLevel(lvl.id);
    const maxStars = lvl.totalPuzzles * 3;

    return `
      <article class="level-card ${unlocked ? 'unlocked' : 'locked'}" data-level="${lvl.id}">
        <div class="level-head">
          <span class="level-icon">${renderEmoji(lvl.emoji, 44)}</span>
          <div class="level-meta">
            <span class="level-badge">Level ${lvl.id}</span>
            <h2 class="level-name">${lvl.name}</h2>
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
    <div class="screen screen-map">
      <header class="hud-bar">
        <button type="button" class="icon-btn" id="btnBackHome" aria-label="Back to Home">
          ${renderEmoji('home', 28)}
        </button>
        <div class="hud-center">
          <h1 class="hud-title">Meadow Map</h1>
        </div>
        <div class="hud-stars" title="Total Stars Earned">
          ${renderEmoji('star', 24)}
          <span class="star-count">${totalStars}</span>
        </div>
      </header>

      <main class="levels-grid">
        ${levelCardsHtml}
      </main>
    </div>
  `;
}

export function renderPuzzleScreen(game) {
  const puzzle = game.getCurrentPuzzle();
  if (!puzzle) return `<div class="screen"><p>No puzzle selected.</p></div>`;

  const levelInfo = LEVELS.find(l => l.id === game.level);
  const currentPotentialStars = game.hintUsed ? 2 : (game.tries === 0 ? 3 : (game.tries === 1 ? 2 : 1));

  const itemsHtml = puzzle.items.map(item => {
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

    return `
      <button type="button" class="card-item ${extraClass}" data-item-id="${item.id}" aria-label="${item.label}">
        ${badgeHtml}
        <span class="card-emoji">${renderEmoji(item.emoji, 56)}</span>
        <span class="card-label">${item.label}</span>
      </button>
    `;
  }).join('');

  return `
    <div class="screen screen-puzzle ${game.isShaking ? 'shake' : ''}">
      <header class="hud-bar">
        <button type="button" class="icon-btn" id="btnBackMap" aria-label="Back to Map">
          ${renderEmoji('home', 26)}
        </button>
        <div class="hud-center">
          <span class="hud-level-tag">${levelInfo?.name || `Level ${game.level}`}</span>
          <span class="hud-potential-stars" title="Potential stars for this round">${renderStarString(currentPotentialStars)}</span>
        </div>
        <div class="hud-right">
          <button type="button" class="btn-hint ${game.hintUsed ? 'hint-used' : ''}" id="btnHint" aria-label="Use Hint" ${game.hintUsed ? 'disabled' : ''}>
            ${renderEmoji('hint', 24)}
            <span>${game.hintUsed ? 'Hint On' : 'Hint'}</span>
          </button>
        </div>
      </header>

      <section class="prompt-box">
        <h2 class="puzzle-prompt">${puzzle.prompt}</h2>
        ${game.hintUsed
          ? `<div class="hint-card">${renderEmoji('hint', 20)} <span>${puzzle.hint}</span></div>`
          : ''
        }
        ${game.feedback
          ? `<div class="feedback-msg gentle-feedback">${game.feedback}</div>`
          : ''
        }
      </section>

      <div class="cards-area ${puzzle.type}-mode">
        ${itemsHtml}
      </div>

      ${puzzle.type === 'tapall'
        ? `
          <div class="puzzle-actions">
            <button type="button" class="btn btn-primary btn-submit" id="btnDoneTapAll">
              ${renderEmoji('check', 24)}
              <span>Done</span>
            </button>
          </div>
        `
        : ''
      }

      ${puzzle.type === 'order'
        ? `
          <div class="order-hint">
            <p>Tap in order! Tap a numbered card again to undo.</p>
          </div>
        `
        : ''
      }
    </div>
  `;
}

export function renderFactScreen(game) {
  const puzzle = game.getCurrentPuzzle();
  if (!puzzle) return `<div class="screen"><p>No fact available.</p></div>`;

  const starCount = game.stars || 1;
  const starsHtml = renderStarString(starCount);

  return `
    <div class="screen screen-fact">
      <div class="fact-card">
        <div class="fact-stars-banner">
          <div class="earned-stars">${starsHtml}</div>
          <span class="earned-label">You earned ${starCount} star${starCount > 1 ? 's' : ''}!</span>
        </div>

        <div class="fact-content">
          <div class="fact-header">
            ${renderEmoji('sparkles', 28)}
            <h2 class="fact-title">Did You Know?</h2>
          </div>
          <p class="fact-text">${puzzle.fact.text}</p>

          ${puzzle.fact.evidence && puzzle.fact.evidence.length > 0
            ? `
              <div class="evidence-pills">
                ${puzzle.fact.evidence.map(e => `<span class="pill">${e}</span>`).join('')}
              </div>
            `
            : ''
          }

          <div class="fact-source">
            <a href="${puzzle.fact.source}" target="_blank" rel="noopener noreferrer">Source: Wikipedia</a>
          </div>
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

export function renderLevelDoneScreen(game) {
  const levelInfo = LEVELS.find(l => l.id === game.level);
  const totalLvlStars = game.getTotalStarsForLevel(game.level);

  return `
    <div class="screen screen-level-done">
      <div class="level-done-card">
        <div class="done-icon">${renderEmoji('trophy', 64)}</div>
        <h1 class="done-title">${levelInfo?.name || 'Level'} Complete!</h1>
        <p class="done-subtitle">Awesome job solving puzzles in the meadow!</p>

        <div class="done-stars-summary">
          ${renderEmoji('star', 32)}
          <span class="done-score">${totalLvlStars} / 18 Stars</span>
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

export function renderSettingsScreen(_game) {
  return `
    <div class="screen screen-settings">
      <div class="settings-card">
        <header class="settings-head">
          <h2>Settings & Credits</h2>
          <button type="button" class="icon-btn" id="btnCloseSettings" aria-label="Close Settings">✕</button>
        </header>

        <section class="settings-section">
          <h3>Credits & Attributions</h3>
          <ul class="credits-list">
            <li>
              <strong>Illustrations:</strong> Twemoji graphics by Twitter / X contributors, licensed under
              <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC-BY 4.0</a>.
            </li>
            <li>
              <strong>Typography:</strong> Fredoka (by Milena Brandao) & Patrick Hand (by Patrick Wagesreiter), licensed under the
              <a href="https://openfontlicense.org" target="_blank" rel="noopener noreferrer">SIL Open Font License 1.1</a>.
            </li>
            <li>
              <strong>Celebrations:</strong> canvas-confetti by Kiril Vatev, licensed under the
              <a href="https://opensource.org/licenses/ISC" target="_blank" rel="noopener noreferrer">ISC License</a>.
            </li>
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
