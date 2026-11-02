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
    this.vaultBreakdown = document.getElementById('vaultBreakdown');
    this.vaultLandmark = document.getElementById('vaultLandmark');
    this.vaultCulture = document.getElementById('vaultCulture');
    this.vaultAnchor = document.getElementById('vaultAnchor');
    this.vaultNextBtn = document.getElementById('vaultNextBtn');

    // End Screen Elements
    this.endScore = document.getElementById('endScore');
    this.endAccuracy = document.getElementById('endAccuracy');
    this.endStreak = document.getElementById('endStreak');
    this.endBestScore = document.getElementById('endBestScore');
    this.missedList = document.getElementById('missedList');
    this.replayMissedBtn = document.getElementById('replayMissedBtn');
    this.restartBtn = document.getElementById('restartBtn');

    // Selection Confirm Elements
    this.touchConfirmBtn = document.getElementById('touchConfirmBtn');
    this.touchSelectedFlag = document.getElementById('touchSelectedFlag');
    this.touchSelectedName = document.getElementById('touchSelectedName');

    this.currentDisplayedScore = 0;
    this.scoreRaf = null;
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

  showGameHUD(totalRounds, hasTimer, isPractice) {
    if (this.startScreen) this.startScreen.classList.add('hidden');
    if (this.endScreen) this.endScreen.classList.add('hidden');
    if (this.topHud) this.topHud.classList.remove('hidden');
    if (this.clueCard) this.clueCard.classList.remove('hidden');
    if (this.memoryVault) this.memoryVault.classList.add('hidden');

    if (this.timerBar && this.timerBar.parentElement) {
      this.timerBar.parentElement.style.display = hasTimer ? 'block' : 'none';
    }

    this.currentDisplayedScore = 0;
    if (this.scoreVal) {
      this.scoreVal.textContent = isPractice ? 'PRACTICE' : '0';
    }
  }

  // Smooth animated count-up for score changes (~300ms)
  animateScoreCountUp(targetScore) {
    if (!this.scoreVal) return;
    if (this.scoreRaf) {
      cancelAnimationFrame(this.scoreRaf);
      this.scoreRaf = null;
    }

    const startVal = this.currentDisplayedScore;
    const diff = targetScore - startVal;
    if (diff === 0) {
      this.scoreVal.textContent = targetScore.toLocaleString();
      return;
    }

    const duration = 300;
    const startTime = performance.now();

    const step = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(1.0, elapsed / duration);
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startVal + diff * ease);
      this.scoreVal.textContent = current.toLocaleString();

      if (progress < 1.0) {
        this.scoreRaf = requestAnimationFrame(step);
      } else {
        this.currentDisplayedScore = targetScore;
        this.scoreVal.textContent = targetScore.toLocaleString();
        this.scoreRaf = null;
      }
    };

    this.scoreRaf = requestAnimationFrame(step);
  }

  updateHUD({ score, streak, round, totalRounds, isPractice, timePercent }) {
    if (this.scoreVal) {
      if (isPractice) {
        this.scoreVal.textContent = 'PRACTICE';
      } else if (score !== undefined) {
        if (Math.abs(score - this.currentDisplayedScore) > 0) {
          this.animateScoreCountUp(score);
        } else {
          this.scoreVal.textContent = score.toLocaleString();
        }
      }
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
      this.cluePrompt.textContent = 'Locate nation on globe:';
      this.clueText.innerHTML = `<span class="target-name-spotlight">${getFlagSvg(country.flag)} ${country.name}</span>`;
      if (this.clueProgression) this.clueProgression.style.display = 'none';
      if (this.nextClueBtn) this.nextClueBtn.style.display = 'none';
    } else if (mode === 'flag') {
      this.cluePrompt.textContent = 'Locate nation for flag:';
      this.clueText.innerHTML = `<div class="target-flag-spotlight">${getFlagSvg(country.flag)}</div>`;
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

  showMemoryVault({ isCorrect, targetCountry, guessCountry, distanceKm, breakdown, isPractice, onNext }) {
    this.hideTouchConfirm();
    if (this.clueCard) this.clueCard.classList.add('hidden');
    if (this.memoryVault) this.memoryVault.classList.remove('hidden');

    // Status Pill
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
        const clickedName = guessCountry ? guessCountry.name : 'Open Ocean';
        // Required exact phrasing: "You clicked Spain, 1,240 km from Morocco"
        this.vaultDistance.innerHTML = `You clicked <strong>${clickedName}</strong>, <strong>${distanceKm.toLocaleString()} km</strong> from <strong>${targetCountry.name}</strong>`;
      }
      if (this.vaultNextBtn) {
        this.vaultNextBtn.innerHTML = `<span>Next Country</span> ${ICONS.arrowRight}`;
      }
    }

    // Header: Flag, Name, Capital
    if (this.vaultFlag) {
      this.vaultFlag.innerHTML = getFlagSvg(targetCountry.flag);
    }
    if (this.vaultName) this.vaultName.textContent = targetCountry.name;
    if (this.vaultCapital) this.vaultCapital.textContent = `Capital: ${targetCountry.capital}`;

    // Score Breakdown Badge
    if (this.vaultBreakdown) {
      if (isPractice) {
        this.vaultBreakdown.innerHTML = `<span class="breakdown-tag practice">Practice Mode • Scores unrecorded</span>`;
      } else if (breakdown) {
        if (isCorrect) {
          const speedTxt = breakdown.speedBonus > 0 ? ` | Speed: +${breakdown.speedBonus}` : '';
          this.vaultBreakdown.innerHTML = `<span class="breakdown-tag scored"><strong>+${breakdown.points.toLocaleString()} pts</strong> (Base: ${breakdown.base} | Clues: +${breakdown.clueBonus}${speedTxt} | Streak: ${breakdown.streakMultiplier}x)</span>`;
        } else {
          this.vaultBreakdown.innerHTML = breakdown.points > 0
            ? `<span class="breakdown-tag partial"><strong>+${breakdown.points.toLocaleString()} pts</strong> (Distance proximity credit)</span>`
            : `<span class="breakdown-tag zero">0 pts (&gt;5,000 km from target)</span>`;
        }
      }
    }

    // Educational Facts
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

  showEndScreen({ score, accuracy, bestStreak, missedCountries, isPractice, mode, tier, onRestart, onReplayMissed }) {
    this.hideTouchConfirm();
    if (this.topHud) this.topHud.classList.add('hidden');
    if (this.clueCard) this.clueCard.classList.add('hidden');
    if (this.memoryVault) this.memoryVault.classList.add('hidden');
    if (this.endScreen) this.endScreen.classList.remove('hidden');

    if (this.endScore) {
      this.endScore.textContent = isPractice ? 'Practice' : score.toLocaleString();
    }
    if (this.endAccuracy) this.endAccuracy.textContent = `${accuracy}%`;
    if (this.endStreak) this.endStreak.textContent = bestStreak;

    // Display saved best score
    if (this.endBestScore) {
      try {
        const key = `geotrivia_best_${mode || 'clue'}_${tier || 'easy'}`;
        const best = parseInt(localStorage.getItem(key) || '0', 10);
        this.endBestScore.textContent = `${best.toLocaleString()} pts`;
      } catch (e) {
        this.endBestScore.textContent = '—';
      }
    }

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
