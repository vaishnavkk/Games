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
  }

  showStartScreen() {
    this.startScreen.classList.remove('hidden');
    this.topHud.classList.add('hidden');
    this.clueCard.classList.add('hidden');
    this.memoryVault.classList.add('hidden');
    this.endScreen.classList.add('hidden');
  }

  showGameHUD(totalRounds, lives, hasTimer) {
    this.startScreen.classList.add('hidden');
    this.endScreen.classList.add('hidden');
    this.topHud.classList.remove('hidden');
    this.clueCard.classList.remove('hidden');
    this.memoryVault.classList.add('hidden');

    this.timerBar.parentElement.style.display = hasTimer ? 'block' : 'none';
    this.updateLives(lives);
  }

  updateHUD({ score, streak, round, totalRounds, lives, timePercent }) {
    if (this.scoreVal) this.scoreVal.textContent = score;
    if (this.streakVal) {
      this.streakVal.textContent = streak;
      const flame = this.streakVal.parentElement.querySelector('.flame-icon');
      if (flame) flame.style.display = streak >= 3 ? 'inline-block' : 'none';
    }
    if (this.roundVal) {
      this.roundVal.textContent = totalRounds === Infinity ? `${round}` : `${round}/${totalRounds}`;
    }
    if (this.timerBar && timePercent !== undefined) {
      this.timerBar.style.width = `${Math.max(0, Math.min(100, timePercent))}%`;
      if (timePercent < 25) {
        this.timerBar.style.background = '#ef4444';
      } else {
        this.timerBar.style.background = '#06b6d4';
      }
    }
    if (lives !== undefined) {
      this.updateLives(lives);
    }
  }

  updateLives(lives) {
    if (!this.livesContainer) return;
    if (lives === null) {
      this.livesContainer.style.display = 'none';
      return;
    }
    this.livesContainer.style.display = 'flex';
    this.livesContainer.innerHTML = '';
    for (let i = 0; i < 3; i++) {
      const heart = document.createElement('span');
      heart.className = `heart ${i < lives ? 'active' : 'lost'}`;
      heart.textContent = '❤️';
      this.livesContainer.appendChild(heart);
    }
  }

  showQuestion({ mode, country, clueIndex, clueText, availableCluesCount }) {
    this.clueCard.classList.remove('hidden');
    this.memoryVault.classList.add('hidden');

    if (mode === 'name') {
      this.cluePrompt.textContent = 'Find this country on the globe:';
      this.clueText.innerHTML = `<span class="highlight-target">${country.flag} ${country.name}</span>`;
      this.clueProgression.style.display = 'none';
      this.nextClueBtn.style.display = 'none';
    } else if (mode === 'flag') {
      this.cluePrompt.textContent = 'Find the country matching this flag:';
      this.clueText.innerHTML = `<span class="flag-huge">${country.flag}</span>`;
      this.clueProgression.style.display = 'none';
      this.nextClueBtn.style.display = 'none';
    } else {
      // Clue mode
      this.cluePrompt.textContent = 'Click the country on the globe:';
      this.clueText.textContent = clueText;
      this.clueProgression.style.display = 'flex';
      this.clueProgression.textContent = `Clue ${clueIndex + 1} of 3`;

      if (clueIndex < 2) {
        this.nextClueBtn.style.display = 'inline-flex';
        this.nextClueBtn.textContent = `💡 Reveal Clue ${clueIndex + 2} (-250 pts)`;
      } else {
        this.nextClueBtn.style.display = 'none';
      }
    }
  }

  showMemoryVault({ isCorrect, targetCountry, guessCountry, distanceKm, onNext }) {
    this.clueCard.classList.add('hidden');
    this.memoryVault.classList.remove('hidden');

    if (isCorrect) {
      this.vaultStatus.textContent = '🎉 CORRECT IDENTIFICATION!';
      this.vaultStatus.className = 'vault-status correct';
      this.vaultDistance.style.display = 'none';
      this.vaultNextBtn.textContent = 'Continue Exploration ➔';
    } else {
      this.vaultStatus.textContent = 'MISSED • STUDY & REMEMBER';
      this.vaultStatus.className = 'vault-status missed';
      this.vaultDistance.style.display = 'block';
      this.vaultDistance.innerHTML = `You clicked <strong>${guessCountry ? guessCountry.name : 'Ocean'}</strong> • <strong>${distanceKm.toLocaleString()} km</strong> away`;
      this.vaultNextBtn.textContent = 'Got It! Next Country ➔';
    }

    this.vaultFlag.textContent = targetCountry.flag;
    this.vaultName.textContent = targetCountry.name;
    this.vaultCapital.textContent = `Capital: ${targetCountry.capital}`;
    this.vaultLandmark.textContent = targetCountry.landmark;
    this.vaultCulture.textContent = targetCountry.cultureFood;
    this.vaultAnchor.textContent = targetCountry.memoryAnchors[0] || targetCountry.clues[0];

    this.vaultNextBtn.onclick = onNext;
  }

  showEndScreen({ score, accuracy, bestStreak, missedCountries, onRestart, onReplayMissed }) {
    this.topHud.classList.add('hidden');
    this.clueCard.classList.add('hidden');
    this.memoryVault.classList.add('hidden');
    this.endScreen.classList.remove('hidden');

    this.endScore.textContent = score;
    this.endAccuracy.textContent = `${accuracy}%`;
    this.endStreak.textContent = bestStreak;

    this.missedList.innerHTML = '';
    if (missedCountries.length === 0) {
      this.missedList.innerHTML = '<div class="perfect-notice">🌟 Perfect Expedition! No countries were missed.</div>';
      this.replayMissedBtn.style.display = 'none';
    } else {
      this.replayMissedBtn.style.display = 'inline-flex';
      missedCountries.forEach(c => {
        const item = document.createElement('div');
        item.className = 'missed-item';
        item.innerHTML = `
          <div class="missed-head">
            <span class="flag">${c.flag}</span>
            <strong>${c.name}</strong>
            <span class="capital">Capital: ${c.capital}</span>
          </div>
          <div class="missed-anchor">${c.memoryAnchors[0]}</div>
        `;
        this.missedList.appendChild(item);
      });
    }

    this.restartBtn.onclick = onRestart;
    this.replayMissedBtn.onclick = onReplayMissed;
  }
}
