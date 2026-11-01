import { ICONS, getFlagSvg } from './icons.js';

export class UIManager {
  constructor() {
    this.startScreen = document.getElementById('startScreen');
    this.topHud = document.getElementById('topHud');
    this.clueCard = document.getElementById('clueCard');
    this.memoryVault = document.getElementById('memoryVault');
    this.endScreen = document.getElementById('endScreen');

    // HUD Elements
    this.scoreVal = document.getElementById('scoreVal');
    this.streakVal = document.getElementById('streakVal');
    this.roundVal = document.getElementById('roundVal');
    this.timerBar = document.getElementById('timerBar');
    this.livesContainer = document.getElementById('livesContainer');
    this.soundBtn = document.getElementById('soundBtn');

    // Clue Card Elements
    this.cluePrompt = document.getElementById('cluePrompt');
    this.clueText = document.getElementById('clueText');
    this.clueProgression = document.getElementById('clueProgression');
    this.nextClueBtn = document.getElementById('nextClueBtn');

    // Memory Vault Elements
    this.vaultStatus = document.getElementById('vaultStatus');
    this.vaultFlag = document.getElementById('vaultFlag');
    this.vaultName = document.getElementById('vaultName');
    this.vaultCapital = document.getElementById('vaultCapital');
    this.vaultDistance = document.getElementById('vaultDistance');
    this.vaultLandmark = document.getElementById('vaultLandmark');
    this.vaultCulture = document.getElementById('vaultCulture');
    this.vaultAnchor = document.getElementById('vaultAnchor');
    this.vaultNextBtn = document.getElementById('vaultNextBtn');

    // End Screen Elements
    this.endScore = document.getElementById('endScore');
    this.endAccuracy = document.getElementById('endAccuracy');
    this.endStreak = document.getElementById('endStreak');
    this.missedList = document.getElementById('missedList');
    this.replayMissedBtn = document.getElementById('replayMissedBtn');
    this.restartBtn = document.getElementById('restartBtn');

    // Selection Confirm Elements
    this.touchConfirmBtn = document.getElementById('touchConfirmBtn');
    this.touchSelectedFlag = document.getElementById('touchSelectedFlag');
    this.touchSelectedName = document.getElementById('touchSelectedName');
  }

  showTouchConfirm(country, onConfirm) {
    if (!this.touchConfirmBtn) return;
    if (this.touchSelectedFlag) {
      this.touchSelectedFlag.innerHTML = getFlagSvg(country.flag);
    }
    if (this.touchSelectedName) {
      this.touchSelectedName.textContent = country.name;
    }
    this.touchConfirmBtn.classList.remove('hidden');
    this.touchConfirmBtn.onclick = onConfirm;
  }

  hideTouchConfirm() {
    if (this.touchConfirmBtn) {
      this.touchConfirmBtn.classList.add('hidden');
    }
  }

  showStartScreen() {
    this.hideTouchConfirm();
    if (this.startScreen) this.startScreen.classList.remove('hidden');
    if (this.topHud) this.topHud.classList.add('hidden');
    if (this.clueCard) this.clueCard.classList.add('hidden');
    if (this.memoryVault) this.memoryVault.classList.add('hidden');
    if (this.endScreen) this.endScreen.classList.add('hidden');
  }

  showGameHUD(totalRounds, lives, hasTimer) {
    if (this.startScreen) this.startScreen.classList.add('hidden');
    if (this.endScreen) this.endScreen.classList.add('hidden');
    if (this.topHud) this.topHud.classList.remove('hidden');
    if (this.clueCard) this.clueCard.classList.remove('hidden');
    if (this.memoryVault) this.memoryVault.classList.add('hidden');

    if (this.timerBar && this.timerBar.parentElement) {
      this.timerBar.parentElement.style.display = hasTimer ? 'block' : 'none';
    }
    this.updateLives(lives);
  }

  updateHUD({ score, streak, round, totalRounds, lives, timePercent }) {
    if (this.scoreVal && score !== undefined) {
      this.scoreVal.textContent = score.toLocaleString();
    }
    if (this.streakVal && streak !== undefined) {
      this.streakVal.textContent = streak;
    }
    if (this.roundVal && round !== undefined) {
      this.roundVal.textContent = totalRounds === Infinity ? `${round}` : `${round}/${totalRounds}`;
    }
    if (this.timerBar && timePercent !== undefined) {
      this.timerBar.style.width = `${Math.max(0, Math.min(100, timePercent))}%`;
      if (timePercent < 25) {
        this.timerBar.style.background = 'var(--color-error)';
      } else {
        this.timerBar.style.background = 'var(--color-accent)';
      }
    }
    if (lives !== undefined) {
      this.updateLives(lives);
    }
  }

  updateLives(lives) {
    if (!this.livesContainer) return;
    if (lives === null || lives === undefined) {
      this.livesContainer.style.display = 'none';
      return;
    }
    this.livesContainer.style.display = 'flex';
    this.livesContainer.innerHTML = '';
    for (let i = 0; i < 3; i++) {
      const dot = document.createElement('span');
      dot.className = `life-dot ${i < lives ? 'active' : 'lost'}`;
      this.livesContainer.appendChild(dot);
    }
  }

  showQuestion({ mode, country, clueIndex, clueText, availableCluesCount }) {
    this.hideTouchConfirm();
    if (this.clueCard) this.clueCard.classList.remove('hidden');
    if (this.memoryVault) this.memoryVault.classList.add('hidden');

    const clueBody = document.getElementById('clueBody');
    const toggleClueBtn = document.getElementById('toggleClueBtn');
    if (clueBody && toggleClueBtn) {
      clueBody.classList.remove('collapsed');
      toggleClueBtn.innerHTML = ICONS.chevronUp;
      toggleClueBtn.setAttribute('aria-expanded', 'true');
    }

    if (mode === 'name') {
      this.cluePrompt.textContent = 'Locate on the globe:';
      this.clueText.innerHTML = `<span class="highlight-target">${getFlagSvg(country.flag)} ${country.name}</span>`;
      if (this.clueProgression) this.clueProgression.style.display = 'none';
      if (this.nextClueBtn) this.nextClueBtn.style.display = 'none';
    } else if (mode === 'flag') {
      this.cluePrompt.textContent = 'Locate nation for flag:';
      this.clueText.innerHTML = `<span class="flag-preview">${getFlagSvg(country.flag)}</span>`;
      if (this.clueProgression) this.clueProgression.style.display = 'none';
      if (this.nextClueBtn) this.nextClueBtn.style.display = 'none';
    } else {
      // Clue mode
      this.cluePrompt.textContent = 'Click nation on globe:';
      this.clueText.textContent = clueText;
      if (this.clueProgression) {
        this.clueProgression.style.display = 'inline-flex';
        this.clueProgression.textContent = `Clue ${clueIndex + 1} of 3`;
      }

      if (this.nextClueBtn) {
        if (clueIndex < 2) {
          this.nextClueBtn.style.display = 'inline-flex';
          this.nextClueBtn.innerHTML = `${ICONS.lightbulb} <span>Reveal Clue ${clueIndex + 2} (-250 pts)</span>`;
        } else {
          this.nextClueBtn.style.display = 'none';
        }
      }
    }
  }

  showMemoryVault({ isCorrect, targetCountry, guessCountry, distanceKm, onNext }) {
    this.hideTouchConfirm();
    if (this.clueCard) this.clueCard.classList.add('hidden');
    if (this.memoryVault) this.memoryVault.classList.remove('hidden');

    if (isCorrect) {
      this.vaultStatus.innerHTML = `${ICONS.check} CORRECT IDENTIFICATION`;
      this.vaultStatus.className = 'vault-status correct';
      if (this.vaultDistance) this.vaultDistance.style.display = 'none';
      if (this.vaultNextBtn) {
        this.vaultNextBtn.innerHTML = `<span>Continue Exploration</span> ${ICONS.arrowRight}`;
      }
    } else {
      this.vaultStatus.innerHTML = `MISSED • STUDY &amp; REMEMBER`;
      this.vaultStatus.className = 'vault-status missed';
      if (this.vaultDistance) {
        this.vaultDistance.style.display = 'block';
        const clickedName = guessCountry ? guessCountry.name : 'Ocean';
        this.vaultDistance.innerHTML = `Clicked <strong>${clickedName}</strong> • <strong>${distanceKm.toLocaleString()} km</strong> away`;
      }
      if (this.vaultNextBtn) {
        this.vaultNextBtn.innerHTML = `<span>Next Country</span> ${ICONS.arrowRight}`;
      }
    }

    if (this.vaultFlag) {
      this.vaultFlag.innerHTML = getFlagSvg(targetCountry.flag);
    }
    if (this.vaultName) this.vaultName.textContent = targetCountry.name;
    if (this.vaultCapital) this.vaultCapital.textContent = `Capital: ${targetCountry.capital}`;
    if (this.vaultLandmark) this.vaultLandmark.textContent = targetCountry.landmark;
    if (this.vaultCulture) this.vaultCulture.textContent = targetCountry.cultureFood;
    if (this.vaultAnchor) {
      this.vaultAnchor.textContent = (targetCountry.memoryAnchors && targetCountry.memoryAnchors[0]) || targetCountry.clues[0];
    }

    if (this.vaultNextBtn) {
      this.vaultNextBtn.onclick = onNext;
      this.vaultNextBtn.focus();
    }
  }

  showEndScreen({ score, accuracy, bestStreak, missedCountries, onRestart, onReplayMissed }) {
    this.hideTouchConfirm();
    if (this.topHud) this.topHud.classList.add('hidden');
    if (this.clueCard) this.clueCard.classList.add('hidden');
    if (this.memoryVault) this.memoryVault.classList.add('hidden');
    if (this.endScreen) this.endScreen.classList.remove('hidden');

    if (this.endScore) this.endScore.textContent = score.toLocaleString();
    if (this.endAccuracy) this.endAccuracy.textContent = `${accuracy}%`;
    if (this.endStreak) this.endStreak.textContent = bestStreak;

    if (this.missedList) {
      this.missedList.innerHTML = '';
      if (!missedCountries || missedCountries.length === 0) {
        this.missedList.innerHTML = '<div class="perfect-notice">Flawless Expedition — 100% Identification Accuracy!</div>';
        if (this.replayMissedBtn) this.replayMissedBtn.style.display = 'none';
      } else {
        if (this.replayMissedBtn) this.replayMissedBtn.style.display = 'inline-flex';
        missedCountries.forEach(c => {
          const item = document.createElement('div');
          item.className = 'missed-item';
          item.innerHTML = `
            <div class="missed-head">
              <span class="flag-icon">${getFlagSvg(c.flag)}</span>
              <strong>${c.name}</strong>
              <span class="capital">Capital: ${c.capital}</span>
            </div>
            <div class="missed-anchor">${c.memoryAnchors ? c.memoryAnchors[0] : c.clues[0]}</div>
          `;
          this.missedList.appendChild(item);
        });
      }
    }

    if (this.restartBtn) this.restartBtn.onclick = onRestart;
    if (this.replayMissedBtn) this.replayMissedBtn.onclick = onReplayMissed;
  }
}
