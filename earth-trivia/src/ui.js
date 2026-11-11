import { ICONS, getFlagSvg } from './icons.js';
import { getRevealClueButtonText, renderClueWorth, breakdownText, PARTIAL_MAX_KM } from './scoring.js';

export class UIManager {
  constructor() {
    this.renderClueWorth = renderClueWorth;
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
    this.mainMenuBtn = document.getElementById('mainMenuBtn');

    // Clue Card Elements
    this.cluePrompt = document.getElementById('cluePrompt');
    this.clueText = document.getElementById('clueText');
    this.clueProgression = document.getElementById('clueProgression');
    this.nextClueBtn = document.getElementById('nextClueBtn');
    this.clueBody = document.getElementById('clueBody');
    this.toggleClueBtn = document.getElementById('toggleClueBtn');

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
    // Country Dossier elements
    this.vaultRegionBadge = document.getElementById('vaultRegionBadge');
    this.vaultOfficialName = document.getElementById('vaultOfficialName');
    this.vaultPopulation = document.getElementById('vaultPopulation');
    this.vaultArea = document.getElementById('vaultArea');
    this.vaultLanguages = document.getElementById('vaultLanguages');
    this.vaultCurrency = document.getElementById('vaultCurrency');
    this.vaultBordersText = document.getElementById('vaultBordersText');
    this.vaultFieldNotes = document.getElementById('vaultFieldNotes');

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
    this.touchConfirmChip = document.getElementById('touchConfirmChip');

    this.currentDisplayedScore = 0;
    this.scoreRaf = null;
  }

  showTouchConfirm(country, onConfirm, mode = 'clue') {
    if (!this.touchConfirmBtn) return;
    if (mode === 'name') {
      // In Name mode: Never spoil the answer by showing clicked country name or flag
      if (this.touchSelectedFlag) {
        this.touchSelectedFlag.innerHTML = '';
        this.touchSelectedFlag.style.display = 'none';
      }
      if (this.touchSelectedName) {
        this.touchSelectedName.textContent = '';
        this.touchSelectedName.style.display = 'none';
      }
      this.touchConfirmBtn.classList.add('continue-only');
      this.touchConfirmBtn.setAttribute('aria-label', 'Continue with selected country');
      if (this.touchConfirmChip) {
        this.touchConfirmChip.innerHTML = `<span>Continue</span> ${ICONS.arrowRight}`;
      }
    } else if (mode === 'flag') {
      this.touchConfirmBtn.classList.remove('continue-only');
      this.touchConfirmBtn.setAttribute('aria-label', 'Confirm Country Selection');
      if (this.touchSelectedFlag) {
        this.touchSelectedFlag.innerHTML = '';
        this.touchSelectedFlag.style.display = 'none';
      }
      if (this.touchSelectedName) {
        this.touchSelectedName.style.display = 'inline-block';
        this.touchSelectedName.textContent = country.name;
      }
      if (this.touchConfirmChip) {
        this.touchConfirmChip.innerHTML = `${ICONS.check} <span>Confirm</span>`;
      }
    } else {
      // Clue mode
      this.touchConfirmBtn.classList.remove('continue-only');
      this.touchConfirmBtn.setAttribute('aria-label', 'Confirm Country Selection');
      if (this.touchSelectedFlag) {
        this.touchSelectedFlag.style.display = 'inline-block';
        this.touchSelectedFlag.innerHTML = getFlagSvg(country.flag);
      }
      if (this.touchSelectedName) {
        this.touchSelectedName.style.display = 'inline-block';
        this.touchSelectedName.textContent = country.name;
      }
      if (this.touchConfirmChip) {
        this.touchConfirmChip.innerHTML = `${ICONS.check} <span>Confirm</span>`;
      }
    }
    this.touchConfirmBtn.classList.remove('hidden');
    this.touchConfirmBtn.onclick = onConfirm;
  }

  hideTouchConfirm() {
    if (this.touchConfirmBtn) {
      this.touchConfirmBtn.classList.add('hidden');
      this.touchConfirmBtn.classList.remove('continue-only');
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
          this.nextClueBtn.innerHTML = `${ICONS.lightbulb} <span>Reveal Clue ${clueIndex + 2}</span>`;
        } else {
          this.nextClueBtn.style.display = 'none';
        }
      }
    }
  }

  showMemoryVault({ isCorrect, isTimeout, targetCountry, guessCountry, distanceKm, isAdjacent, hitCoords, targetCoords, breakdown, isPractice, onNext }) {
    this.hideTouchConfirm();
    if (this.clueCard) this.clueCard.classList.add('hidden');
    if (this.memoryVault) this.memoryVault.classList.remove('hidden');

    // Status Pill
    if (isCorrect) {
      this.vaultStatus.innerHTML = `${ICONS.check} CORRECT IDENTIFICATION`;
      this.vaultStatus.className = 'vault-status correct';
      if (this.vaultDistance) this.vaultDistance.style.display = 'none';
      if (this.vaultNextBtn) {
        this.vaultNextBtn.innerHTML = `<span>Continue</span> ${ICONS.arrowRight}`;
      }
    } else if (isTimeout) {
      this.vaultStatus.innerHTML = `TIME EXPIRED • STUDY &amp; REMEMBER`;
      this.vaultStatus.className = 'vault-status missed';
      // When nothing was selected on timeout, distance is not required - remove distance box completely
      if (this.vaultDistance) this.vaultDistance.style.display = 'none';
      if (this.vaultNextBtn) {
        this.vaultNextBtn.innerHTML = `<span>Continue</span> ${ICONS.arrowRight}`;
      }
    } else {
      this.vaultStatus.innerHTML = `MISSED • STUDY &amp; REMEMBER`;
      this.vaultStatus.className = 'vault-status missed';
      if (this.vaultDistance) {
        this.vaultDistance.style.display = 'block';
        const clickedName = guessCountry ? guessCountry.name : 'Open Ocean';
        const miles = Math.round(distanceKm * 0.621371);
        const originLat = hitCoords && hitCoords.lat !== undefined ? hitCoords.lat : (guessCountry && guessCountry.lat !== undefined ? guessCountry.lat : 0);
        const originLon = hitCoords && hitCoords.lon !== undefined ? hitCoords.lon : (guessCountry && guessCountry.lon !== undefined ? guessCountry.lon : 0);
        const destLat = targetCoords && targetCoords.lat !== undefined ? targetCoords.lat : (targetCountry ? targetCountry.lat : 0);
        const destLon = targetCoords && targetCoords.lon !== undefined ? targetCoords.lon : (targetCountry ? targetCountry.lon : 0);
        const originCoordStr = Math.abs(originLat).toFixed(2) + '°' + (originLat >= 0 ? 'N' : 'S') + ', ' + Math.abs(originLon).toFixed(2) + '°' + (originLon >= 0 ? 'E' : 'W');
        const destCoordStr = Math.abs(destLat).toFixed(2) + '°' + (destLat >= 0 ? 'N' : 'S') + ', ' + Math.abs(destLon).toFixed(2) + '°' + (destLon >= 0 ? 'E' : 'W');
        if (isAdjacent || distanceKm === 0) {
          this.vaultDistance.innerHTML =
            '<div class="distance-main">You clicked <strong>' + clickedName + '</strong>, <strong>0 km (Adjacent)</strong> from <strong>' + targetCountry.name + '</strong></div>' +
            '<div class="distance-coords">' +
              '<span>🤝 Neighboring Country • Shared Sovereign Border (0 km)</span>' +
            '</div>';
        } else {
          this.vaultDistance.innerHTML =
            '<div class="distance-main">You clicked <strong>' + clickedName + '</strong>, <strong>' + distanceKm.toLocaleString() + ' km</strong> <span class="distance-mi">(' + miles.toLocaleString() + ' mi)</span> from <strong>' + targetCountry.name + '</strong></div>' +
            '<div class="distance-coords">' +
              '<span>📍 ' + originCoordStr + '</span>' +
              '<span class="coord-arrow">➔</span>' +
              '<span>🎯 ' + destCoordStr + '</span>' +
            '</div>';
        }
      }
      if (this.vaultNextBtn) {
        this.vaultNextBtn.innerHTML = `<span>Continue</span> ${ICONS.arrowRight}`;
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
      } else if (isTimeout) {
        this.vaultBreakdown.innerHTML = `<span class="breakdown-tag zero">0 pts (Time expired)</span>`;
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

    // Populate Rich Country Dossier fields
    if (this.vaultRegionBadge) {
      this.vaultRegionBadge.textContent = targetCountry.subregion || targetCountry.region || 'Global';
    }
    if (this.vaultOfficialName) {
      this.vaultOfficialName.textContent = targetCountry.officialName || targetCountry.name;
    }
    if (this.vaultPopulation) {
      const pop = targetCountry.population;
      if (pop >= 1000000000) {
        this.vaultPopulation.textContent = (pop / 1000000000).toFixed(2) + 'B';
      } else if (pop >= 1000000) {
        this.vaultPopulation.textContent = (pop / 1000000).toFixed(1) + 'M';
      } else if (pop) {
        this.vaultPopulation.textContent = pop.toLocaleString();
      } else {
        this.vaultPopulation.textContent = '—';
      }
    }
    if (this.vaultArea) {
      this.vaultArea.textContent = targetCountry.areaKm2 ? targetCountry.areaKm2.toLocaleString() + ' km²' : '—';
    }
    if (this.vaultLanguages) {
      this.vaultLanguages.textContent = Array.isArray(targetCountry.languages) ? targetCountry.languages.join(', ') : (targetCountry.languages || '—');
    }
    if (this.vaultCurrency) {
      this.vaultCurrency.textContent = targetCountry.currency || '—';
    }
    if (this.vaultBordersText) {
      if (targetCountry.neighbors && targetCountry.neighbors.length > 0) {
        const count = targetCountry.neighbors.length;
        this.vaultBordersText.textContent = `Bordered by ${count} nation${count > 1 ? 's' : ''}: ${targetCountry.neighbors.slice(0, 3).join(', ')}${count > 3 ? '...' : ''}`;
      } else if (targetCountry.maritimeStatus) {
        this.vaultBordersText.textContent = targetCountry.maritimeStatus;
      } else {
        this.vaultBordersText.textContent = 'Island / Maritime State';
      }
    }
    if (this.vaultFieldNotes) {
      this.vaultFieldNotes.textContent = targetCountry.fieldNotes || `Situated in ${targetCountry.subregion || targetCountry.region}, ${targetCountry.name} features distinctive cultural and geographic heritage.`;
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
        const uniqueMissed = Array.isArray(missedCountries)
        ? Array.from(new Map(missedCountries.map(c => [c.id || c.name, c])).values())
        : [];
      uniqueMissed.forEach(c => {
          const item = document.createElement('div');
          item.className = 'missed-item';
          item.innerHTML = `
            <div class="missed-head">
              <span class="flag-icon">${getFlagSvg(c.flag)}</span>
              <strong>${c.name}</strong>
              <span class="capital">Capital: ${c.capital}</span>
            </div>
            <div class="missed-anchor">${(c.memoryAnchors && c.memoryAnchors[0]) || (c.clues && c.clues[0]) || ''}</div>
          `;
          this.missedList.appendChild(item);
        });
      }
    }

    if (this.restartBtn) this.restartBtn.onclick = onRestart;
    if (this.replayMissedBtn) this.replayMissedBtn.onclick = onReplayMissed;
  }
}
