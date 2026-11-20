# Review Report: Balance & Data (`rfd-balance`)

- **Author**: Worker B (`balance`)
- **Reviewer**: Reviewer V1 (`v1` - Rules & Sim)
- **Branch**: `rfd-balance` (commit `d9b32a630029d0089d4bcc9ff768af60806ba9ac`)
- **Evaluation Date**: 2026-11-20
- **Final Verdict**: **APPROVED**

---

## 1. Commands Executed & Outputs

### 1.1 Independent Execution of 100-Seed Balance Matrix
```bash
cd robot-factory-defense
node scripts/balance.js
```
**Output:**
```
=======================================================
ROBOT FACTORY DEFENSE — AUTOMATED BALANCE MATRIX (100 SEEDS)
=======================================================

[1/5] Simulating Idle Bot (100 seeds)...
[2/5] Simulating Random Bot (100 seeds)...
[3/5] Simulating Monoculture Bots (Pulse, Coolant, Arc, Rocket)...
[4/5] Simulating Competent Bot (100 seeds)...
[5/5] Simulating Competent Bot Tower Removal (Viability check)...

=======================================================
SIMULATION RESULTS SUMMARY
=======================================================
| Bot Strategy        | Win Rate (%) | Median Wave | Median Core HP | Target Gate | Result |
|---------------------|--------------|-------------|----------------|-------------|--------|
| Idle Bot            |         0.0% |           3 |            N/A | Wave <= 3   | PASS   |
| Random Bot          |         0.0% |           4 |            N/A | Wave 3-7    | PASS   |
| Pulse-Only Bot      |         0.0% |          14 |            N/A | Win <= 50%  | PASS   |
| Coolant-Only Bot    |         0.0% |           3 |            N/A | Win <= 50%  | PASS   |
| Arc-Only Bot        |         0.0% |           3 |            N/A | Win <= 50%  | PASS   |
| Rocket-Only Bot     |         0.0% |           4 |            N/A | Win <= 50%  | PASS   |
| Competent Bot       |        64.0% |          15 |              6 | 60-85% win  | PASS   |

--- Tower Viability (No Dead Towers) ---
Competent Full Win Rate:      64.0%
Excluding pulse    Win Rate:   0.0% (Drop: -64.0 pts, Target >= 5 pts) -> PASS
Excluding coolant  Win Rate:  13.0% (Drop: -51.0 pts, Target >= 5 pts) -> PASS
Excluding arc      Win Rate:   0.0% (Drop: -64.0 pts, Target >= 5 pts) -> PASS
Excluding rocket   Win Rate:   0.0% (Drop: -64.0 pts, Target >= 5 pts) -> PASS

--- Wave & Game Durations ---
Mean Wave Duration:           47.8s (Target: 40-75s) -> PASS
Median Wave Duration:         47.0s
Mean Game Duration:           12.0 min (Target: 12-20 min) -> PASS
All Towers Utilized in Wins:  YES (PASS)

--- Circuit Economy & Armour Relevance ---
1 Fab unlocks Arc by W6:      28 circuits (Target >= 20) -> PASS
2 Fabs by W15 affords <=80%:  143 circuits (65% <= 80%) -> PASS
4 Fabs by W15 affords >=100%: 287 circuits (130% >= 100%) -> PASS
Pulse L1 vs Crusher Armour:   6 dmg (50% of nominal <= 50%) -> PASS

=======================================================
ALL INVARIANT GATES VERIFICATION
=======================================================
[PASS]  Idle Bot loss on/before W3                       | Target: maxLossWave <= 3       | Actual: maxLossWave = 3
[PASS]  Random Bot median wave 3-7                       | Target: 3 <= medianWave <= 7   | Actual: medianWave = 4
[PASS]  Pulse-Only win rate <= 50%                       | Target: <= 50%                 | Actual: 0.0%
[PASS]  Coolant-Only win rate <= 50%                     | Target: <= 50%                 | Actual: 0.0%
[PASS]  Arc-Only win rate <= 50%                         | Target: <= 50%                 | Actual: 0.0%
[PASS]  Rocket-Only win rate <= 50%                      | Target: <= 50%                 | Actual: 0.0%
[PASS]  Competent Bot win rate 60-85%                    | Target: 60% - 85%              | Actual: 64.0%
[PASS]  Competent Bot median winning Core HP 3-14        | Target: 3 <= HP <= 14          | Actual: HP = 6
[PASS]  Mean wave duration 40-75s                        | Target: 40s - 75s              | Actual: 47.8s
[PASS]  All 5 towers utilized in winning runs            | Target: true                   | Actual: true
[PASS]  Viability: Remove Pulse drops win rate >= 5 pts  | Target: drop >= 5.0 pts        | Actual: drop = 64.0 pts
[PASS]  Viability: Remove Coolant drops win rate >= 5 pts | Target: drop >= 5.0 pts        | Actual: drop = 51.0 pts
[PASS]  Viability: Remove Arc drops win rate >= 5 pts    | Target: drop >= 5.0 pts        | Actual: drop = 64.0 pts
[PASS]  Viability: Remove Rocket drops win rate >= 5 pts | Target: drop >= 5.0 pts        | Actual: drop = 64.0 pts
[PASS]  Armour: Pulse L1 dmg vs Crusher <= 50% nominal   | Target: <= 50%                 | Actual: 50.0% (6/12)
[PASS]  Economy: 1 Fab unlocks Arc by W6                 | Target: >= 20 circuits         | Actual: 28 circuits
[PASS]  Economy: 2 Fabs by W15 affords <= 80% workshop   | Target: <= 80% (176 circuits)  | Actual: 143 circuits (65%)
[PASS]  Economy: 4 Fabs by W15 affords >= 100% workshop  | Target: >= 100% (220 circuits) | Actual: 287 circuits (130%)
=======================================================
OVERALL STATUS: ALL GATES PASSED (100% OK)
=======================================================
```

### 1.2 Full Test Suite Execution
```bash
cd robot-factory-defense
npm test
```
**Output:**
```
ℹ tests 34, suites 6, pass 34, fail 0 (346ms)
```

### 1.3 Code Quality & Lint
```bash
cd robot-factory-defense
npm run lint
```
**Output:**
```
> robot-factory-defense@0.1.0 lint
> eslint src/ test/ scripts/

(exit code 0, 0 errors, 0 warnings)
```

---

## 2. Concrete Findings

### Finding 1: Exact Reproduction of 100-Seed Simulation Matrix (`scripts/balance.js`, `docs/BALANCE.md`)
- **Severity**: Positive Verification (PASS)
- **Detail**: The independent execution of `node scripts/balance.js` reproduced the exact figures documented in `docs/BALANCE.md` across every bot strategy:
  - **Idle Bot**: Loses on or before Wave 3 (actual: max loss wave = 3; gate: $\le 3$).
  - **Random Bot**: Median wave reached = 4 (gate: $3 \le \text{medianWave} \le 7$).
  - **Monoculture Bots**: 0.0% win rate across all single-tower types (Pulse: 0.0%, Coolant: 0.0%, Arc: 0.0%, Rocket: 0.0%; gate: $\le 50\%$).
  - **Competent Bot**: 64.0% win rate (gate: $60\% \le \text{winRate} \le 85\%$).
  - **Competent Winning Core HP**: Median = 6.0 (gate: $3 \le \text{medianHp} \le 14$).
  - **Wave Pacing**: Mean wave duration = 47.8s (gate: $40\text{s} \le \text{duration} \le 75\text{s}$), mean game duration = 12.0 min (gate: $12\text{–}20\text{ min}$).

### Finding 2: Robust Tower Viability & "No Dead Towers" Gate (`scripts/balance.js:520-575`)
- **Severity**: Positive Verification (PASS)
- **Detail**: The simulation verified the non-negotiable rule that removing any single tower type from the competent strategy must drop the win rate by at least 5 percentage points:
  - Without Pulse Turret: Win rate drops from 64.0% to 0.0% (-64.0 pts; target $\ge 5$ pts).
  - Without Coolant Sprayer: Win rate drops from 64.0% to 13.0% (-51.0 pts; target $\ge 5$ pts).
  - Without Arc Coil: Win rate drops from 64.0% to 0.0% (-64.0 pts; target $\ge 5$ pts).
  - Without Rocket Rack: Win rate drops from 64.0% to 0.0% (-64.0 pts; target $\ge 5$ pts).
- **Conclusion**: There are zero redundant or dead towers in the roster; every defense tier is functionally essential for wave survival.

### Finding 3: Circuit Economy & Workshop Purchasing Bounds (`src/data/towers.json`, `src/data/upgrades.json`)
- **Severity**: Positive Verification (PASS)
- **Detail**: Fabricators produce 1 Circuit every 10.0 seconds (cost 75 Scrap, cap 4 units):
  - **1 Fabricator placed on Wave 1**: Accumulates 28 Circuits by Wave 6, successfully enabling the Arc Coil unlock (20 Circuits) on or before Wave 6 (target $\ge 20$).
  - **2 Fabricators operating through Wave 15**: Generates 143 Circuits, covering 65.0% of total Workshop costs (satisfying the constraint $\le 80\%$ of 220 Circuits).
  - **4 Fabricators operating through Wave 15**: Generates 287 Circuits, covering 130.5% of total Workshop costs (satisfying the constraint $\ge 100\%$).
- **Conclusion**: Economy pacing rewards investment without allowing premature trivialization of workshop research.

### Finding 4: Flat Armour Relevance & Combat Mitigation Gate (`src/data/enemies.json`, `src/data/towers.json`)
- **Severity**: Positive Verification (PASS)
- **Detail**:
  - Pulse Turret Level 1 has a nominal damage of 12.
  - Crusher Tank has 6 flat armour.
  - Effective damage dealt per pulse kinetic hit: $12 - 6 = 6$ ($50.0\% \le 50.0\%$ nominal damage).
  - Against Iron Sentry mini-boss (8 armour), Pulse deals $12 - 8 = 4$ damage ($33.3\%$).
  - Against Mega Mixer boss (10 armour), Pulse deals $12 - 10 = 2$ damage ($16.7\%$).
- **Conclusion**: Armour relevance is preserved, creating tactical demand for Arc Coil's armour-piercing chain lightning and Rocket Rack's high-damage artillery splash.

### Finding 5: Schema Conformance & Data Calibration Integrity (`src/data/*.json`)
- **Severity**: Positive Verification (PASS)
- **Detail**:
  - All JSON data files (`map.json`, `towers.json`, `enemies.json`, `waves.json`, `upgrades.json`) strictly adhere to the draft-07 JSON schema defined in CONTRACT.md §3.
  - Adversary stats provide smooth difficulty progression: Glitchbot (30 HP, 0 arm, 1 leak dmg), Rust Walker (60 HP, 2 arm, 1 leak dmg), Spark Drone (50 HP, 0 arm, 1 leak dmg, 2.2 speed), Crusher Tank (240 HP, 6 arm, 3 leak dmg), Iron Sentry mini-boss (1400 HP, 8 arm, 5 leak dmg), Mega Mixer boss (4200 HP, 10 arm, 10 leak dmg).
  - 15 waves feature calibrated wave spawn gaps of 5.0s, with mini-boss at Wave 10 and final boss at Wave 15.

---

## 3. Final Verdict

**APPROVED**

Worker B's balance calibration and headless balance testing harness strictly satisfy all requirements of DESIGN.md, CONTRACT.md, and TESTPLAN.md. All 18 automated balance invariant gates pass with 100% conformance, and the data schema is frozen and production-ready.
