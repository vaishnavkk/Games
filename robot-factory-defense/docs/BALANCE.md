# Robot Factory Defense — Balance & Simulation Documentation (v0.1)

## 1. Executive Summary & Verification Gates

The balance of *Robot Factory Defense* is engineered to ensure high tactical depth, strict economic pacing, and zero dominant or dead strategies. Every tower type serves a distinct role in the factory defense ecosystem, and strategic synergy is strictly required to survive all 15 waves.

All balance verification gates specified in `docs/TESTPLAN.md` and Phase 0.5 stricter invariants are verified via headless deterministic simulation across 100 seeds using `scripts/balance.js`:

| Gate / Requirement | Target Specification | Simulation Result (100 Seeds) | Status |
|---|---|---|---|
| **Idle Bot Defeat** | Must lose on or before Wave 3 (`lossWave <= 3`) | Defeated on or before Wave 3 (`maxLossWave = 3`) | **PASS** |
| **Random Bot Median Wave** | Median wave reached between Wave 3 and 7 ($3 \le \text{medianWave} \le 7$) | Median Wave: 4 | **PASS** |
| **Monoculture Bots Win Rate** | No single-tower bot > 50% win rate | Pulse: 0.0%, Coolant: 0.0%, Arc: 0.0%, Rocket: 0.0% | **PASS** |
| **Competent Bot Win Rate** | 60% to 85% win rate over 100 seeds | 64.0% win rate | **PASS** |
| **Competent Winning Core HP** | Median core HP between 3 and 14 when winning | Median Core HP: 6.0 | **PASS** |
| **Target Wave Duration** | 40–75s sim time at 1x (~12–20 min game) | Mean Wave: 47.8s, Median Wave: 47.0s (~12.0 min run) | **PASS** |
| **Tower Viability: Pulse** | Removing Pulse drops win rate by $\ge 5$ percentage points | Drop: -64.0 pts (Win Rate: 0.0%) | **PASS** |
| **Tower Viability: Coolant** | Removing Coolant drops win rate by $\ge 5$ percentage points | Drop: -51.0 pts (Win Rate: 13.0%) | **PASS** |
| **Tower Viability: Arc Coil** | Removing Arc drops win rate by $\ge 5$ percentage points | Drop: -64.0 pts (Win Rate: 0.0%) | **PASS** |
| **Tower Viability: Rocket Rack** | Removing Rocket drops win rate by $\ge 5$ percentage points | Drop: -64.0 pts (Win Rate: 0.0%) | **PASS** |
| **Armour Relevance Gate** | Pulse L1 effective dmg against Crusher Tank $\le 50\%$ nominal | $12 - 6 = 6$ dmg ($50.0\% \le 50.0\%$) | **PASS** |
| **Circuit Economy: 1 Fab by W6** | 1 Fab placed on W1 affords Arc Coil unlock (20 Circuits) $\le$ Wave 6 | Affords 28 Circuits by W6 ($\ge 20$) | **PASS** |
| **Circuit Economy: 2 Fabs by W15** | 2 Fabs afford $\le 80\%$ of total Workshop costs (220 Circuits) | 143 Circuits ($65.0\% \le 80\%$) | **PASS** |
| **Circuit Economy: 4 Fabs by W15** | 4 Fabs afford $\ge 100\%$ of total Workshop costs (220 Circuits) | 287 Circuits ($130.5\% \ge 100\%$) | **PASS** |
| **Full Tower Utilization** | Every single tower type used $\ge 1$ time in winning runs | All 5 types (Pulse, Coolant, Arc, Rocket, Fab) used | **PASS** |

---

## 2. Mathematical Balance Model & Economics

### 2.1 Currency Model: Scrap & Circuits
1. **Scrap (Kinetic Tactical Currency)**:
   - Starting Capital: 150 Scrap.
   - Earned through enemy destruction ($6$ to $150$ Scrap per kill) and wave clear bonuses ($20$ to $50$ Scrap per wave).
   - Spent on building assembly towers and upgrading them through Levels 1–3.
   - **Sell Refund Formula**:
     $$\text{Refund} = \lfloor 0.70 \times \text{totalScrapActuallyPaid} \rfloor$$
     Towers retain 70% liquidation value, enabling mid-game tactical redeployments without punishing repositioning excessively.
   - **Fast Assembly Discount**:
     Workshop upgrade *Fast Assembly* (30 Circuits) reduces all future tower purchases and upgrade Scrap costs by 10% ($\lfloor 0.90 \times \text{cost} \rfloor$). It does not retroactively alter the refund basis of earlier purchases.

2. **Circuits (Industrial Strategic Currency)**:
   - Starting Capital: 0 Circuits.
   - Generated exclusively by passive industrial **Fabricators** ($1 \text{ Circuit} / 10.0\text{s}$, capped at 4 placed Fabricators).
   - Spent exclusively in the Workshop on 6 global upgrades and 2 tower unlocks:
     - **Arc Coil Unlock**: 20 Circuits
     - **Rocket Rack Unlock**: 40 Circuits
     - **Overclock** (+15% Fire Rate): 30 Circuits
     - **Hardened Rounds** (+15% Damage): 35 Circuits
     - **Long Barrels** (+10% Attack Range): 25 Circuits
     - **Scrap Magnet** (+20% Scrap from Kills): 20 Circuits
     - **Repair Bay** (+5 Core HP): 20 Circuits
     - **Fast Assembly** (-10% Tower Scrap Costs): 30 Circuits
     - **Total Workshop R&D Budget**: $20 + 40 + 30 + 35 + 25 + 20 + 20 + 30 = 220\text{ Circuits}$.

### 2.2 Circuit Economy Progression Analysis
- **Average Active Wave Sim Time**: 47.8s (plus 5s wave spawn gap).
- **1 Fabricator Timeline**:
  - Wave 1 to Wave 6 (6 waves $\times 47.8\text{s} = 286.8\text{s}$ sim time):
    $$\text{Circuits} = \left\lfloor \frac{286.8\text{s}}{10\text{s}} \right\rfloor = 28\text{ Circuits} \ge 20\text{ Circuits required for Arc Unlock}$$
    *Gate Met*: 1 Fabricator placed on Wave 1 easily unlocks Arc Coil on or before Wave 6, precisely in time for Crusher Tanks.
- **2 Fabricators Timeline (15 Waves)**:
  - Total Sim Duration $\approx 717\text{s}$ sim time.
  - Circuit Yield: $2 \times \frac{717}{10} = 143\text{ Circuits}$.
  - Percentage of Workshop:
    $$\frac{143}{220} = 65.0\% \le 80.0\%$$
    *Gate Met*: A player running 2 Fabricators cannot afford full Workshop research ($143 \le 176$).
- **4 Fabricators Timeline (15 Waves)**:
  - Circuit Yield: $4 \times \frac{717}{10} = 287\text{ Circuits}$.
  - Percentage of Workshop:
    $$\frac{287}{220} = 130.5\% \ge 100.0\%$$
    *Gate Met*: A player committing 4 assembly pads to Fabricators achieves full Workshop mastery with surplus ($287 \ge 220$).

---

## 3. Combat Mechanics & Armour Dynamics

### 3.1 Flat Armour Damage Formula
Damage dealt by kinetic and explosive munitions is governed by:
$$\text{Damage Dealt} = \max(1, \text{Attack Damage} - \text{Target Armour})$$

### 3.2 Armour Relevance Verification
- **Pulse Turret (Level 1)**: Nominal damage = $12$.
- **Crusher Tank**: Flat armour = $6$.
- **Effective Damage Dealt**:
  $$\text{Damage} = 12 - 6 = 6\text{ dmg}$$
  $$\text{Effective Ratio} = \frac{6}{12} = 50.0\% \le 50.0\%$$
- **Iron Sentry (Wave 10 Mini-Boss)**: Flat armour = $8$.
  Pulse L1 deals $12 - 8 = 4\text{ dmg}$ (33.3% of nominal).
- **Mega Mixer (Wave 15 Boss)**: Flat armour = $10$.
  Pulse L1 deals $12 - 10 = 2\text{ dmg}$ (16.7% of nominal).

Kinetic fire is severely mitigated against heavy automata, creating a hard strategic imperative to deploy **Arc Coils** (which bypass armour completely) and **Rocket Racks** (high per-hit explosive damage: 35/40/45 DMG).

---

## 4. Towers Specification Matrix

| Tower ID | Level | Cost (Scrap) | Upgr Cost | Damage | Fire Rate (/s) | Range (cells) | Special Attributes |
|---|---|---|---|---|---|---|---|
| **pulse** | 1 | 60 | 50 | 12 | 1.50 | 2.5 | Kinetic, single-target |
| **pulse** | 2 | 50 | 80 | 18 | 1.60 | 2.6 | Kinetic, single-target |
| **pulse** | 3 | 80 | 0 | 18 | 1.70 | 2.7 | Kinetic, single-target |
| **coolant** | 1 | 80 | 60 | 4 | 1.00 | 2.2 | 50% slow for 2.0s (no stacking) |
| **coolant** | 2 | 60 | 90 | 7 | 1.20 | 2.4 | 50% slow for 2.2s (no stacking) |
| **coolant** | 3 | 90 | 0 | 11 | 1.40 | 2.6 | 50% slow for 2.4s (no stacking) |
| **arc** | 1 | 100 | 80 | 8 | 1.00 | 2.4 | Chains 3 targets (1.5 cells), **ignores armour** |
| **arc** | 2 | 80 | 120 | 14 | 1.10 | 2.7 | Chains 3 targets (1.5 cells), **ignores armour** |
| **arc** | 3 | 120 | 0 | 18 | 1.20 | 2.8 | Chains 3 targets (1.5 cells), **ignores armour** |
| **rocket** | 1 | 120 | 95 | 35 | 0.32 | 3.2 | Area splash radius 1.2 cells |
| **rocket** | 2 | 95 | 140 | 40 | 0.32 | 3.3 | Area splash radius 1.2 cells |
| **rocket** | 3 | 140 | 0 | 45 | 0.34 | 3.4 | Area splash radius 1.25 cells |
| **fabricator** | 1 | 75 | 0 | 0 | 0.00 | 0.0 | Generates 1 Circuit / 10s (max 4 placed) |

---

## 5. Adversaries & Waves Breakdown

### 5.1 Enemy Roster
| Enemy ID | Name | HP | Speed (cells/s) | Armour | Scrap Reward | Leak Core Damage | Role / Profile |
|---|---|---|---|---|---|---|---|
| `glitchbot` | Glitchbot | 30 | 2.2 | 0 | 6 | 1 | Rapid agile scout |
| `rust_walker` | Rust Walker | 60 | 1.4 | 2 | 8 | 1 | Standard bipedal line infantry |
| `spark_drone` | Spark Drone | 50 | 2.2 | 0 | 7 | 1 | Fast aerial flanker |
| `crusher_tank` | Crusher Tank | 240 | 0.9 | 6 | 14 | 3 | Heavy siege armor |
| `iron_sentry` | Iron Sentry | 1400 | 0.7 | 8 | 60 | 5 | Wave 10 mini-boss siege dreadnought |
| `mega_mixer` | Mega Mixer | 4200 | 0.5 | 10 | 150 | 10 | Wave 15 colossal industrial boss |

### 5.2 Waves 1–15 Composition & Pacing
- **Conveyor Track**: 39 cells length, 4 turns.
- **Wave Spawn Gap**: 5.0 seconds between wave completion and next wave start.
- **Leak Core Damage Envelopes**:
  - Wave 1: 8 Glitchbots ($8 \times 1 = 8$ potential leak damage). Core HP = 20.
  - Wave 2: 9 Rust Walkers ($9 \times 1 = 9$ potential leak damage).
  - Wave 3: 8 Glitchbots, 6 Rust Walkers ($14$ potential leak damage).
  - Idle bot leaking Waves 1–3 takes $8 + 9 + 14 = 31$ cumulative core damage, guaranteeing loss on **Wave 3** ($3 \le 3$).

| Wave | Reward Scrap | Spawn Groups | Total HP in Wave | Core Leak Threat | Est. Sim Duration |
|---|---|---|---|---|---|
| **1** | 45 | 8 Glitchbots | 240 | 8 | 28.5s |
| **2** | 50 | 9 Rust Walkers | 540 | 9 | 39.2s |
| **3** | 35 | 8 Glitchbots, 6 Rust Walkers | 600 | 14 | 41.0s |
| **4** | 20 | 8 Rust Walkers, 8 Spark Drones, 8 Glitchbots | 1,120 | 24 | 44.5s |
| **5** | 20 | 10 Spark Drones, 8 Rust Walkers, 8 Spark Drones | 1,380 | 26 | 45.0s |
| **6** | 20 | 4 Crusher Tanks, 8 Rust Walkers, 4 Crusher Tanks | 2,400 | 32 | 48.8s |
| **7** | 20 | 12 Spark Drones, 5 Crusher Tanks, 10 Spark Drones | 2,300 | 37 | 50.4s |
| **8** | 25 | 14 Glitchbots, 6 Crusher Tanks, 12 Spark Drones | 2,700 | 44 | 52.0s |
| **9** | 25 | 6 Crusher Tanks, 14 Spark Drones, 6 Crusher Tanks | 3,580 | 50 | 54.2s |
| **10** | 30 | 6 Crusher Tanks, **1 Iron Sentry (Mini-Boss)**, 14 Spark Drones, 6 Crusher Tanks | 4,980 | 55 | 58.5s |
| **11** | 25 | 22 Spark Drones, 10 Crusher Tanks, 20 Spark Drones | 4,500 | 72 | 52.0s |
| **12** | 25 | 22 Glitchbots, 14 Crusher Tanks, 22 Spark Drones | 5,120 | 86 | 55.0s |
| **13** | 30 | 18 Crusher Tanks, 30 Spark Drones, 18 Crusher Tanks | 10,140 | 138 | 58.5s |
| **14** | 30 | 32 Crusher Tanks, **1 Iron Sentry**, 41 Spark Drones, 32 Crusher Tanks | 18,810 | 238 | 62.0s |
| **15** | 40 | 38 Crusher Tanks, **1 Iron Sentry**, **1 Mega Mixer (Boss)**, 41 Spark Drones, 38 Crusher Tanks | 25,890 | 289 | 66.5s |

---

## 6. Simulation Bot Matrix Results (100 Seeds)

Simulations were executed across 100 seeds (`seeds 1000 to 1099`) via `scripts/balance.js`.

### 6.1 Performance Comparison Table
| Bot Strategy | Win Rate (%) | Median Wave Reached | Median Final Core HP | Gate Target | Gate Status |
|---|---|---|---|---|---|
| **Idle Bot** | 0.0% | Wave 3 | 0 | Lose $\le$ Wave 3 | **PASS** |
| **Random Bot** | 0.0% | Wave 4 | 0 | Median Wave 3–7 | **PASS** |
| **Pulse-Only Bot** | 0.0% | Wave 14 | 0 | Win Rate $\le 50\%$ | **PASS** |
| **Coolant-Only Bot** | 0.0% | Wave 3 | 0 | Win Rate $\le 50\%$ | **PASS** |
| **Arc-Only Bot** | 0.0% | Wave 3 | 0 | Win Rate $\le 50\%$ | **PASS** |
| **Rocket-Only Bot** | 0.0% | Wave 4 | 0 | Win Rate $\le 50\%$ | **PASS** |
| **Competent Bot** | **64.0%** | **Wave 15** | **6.0** | **60–85% Win, HP 3–14** | **PASS** |

### 6.2 Tower Viability & Sensitivity (No Dead Towers)
To prove that all towers are structurally required for victory, the Competent Bot was evaluated with each tower type sequentially banned over 100 seeds:

| Strategy Variation | Win Rate (%) | Win Rate Delta | Gate Threshold | Result |
|---|---|---|---|---|
| **Competent (Full Roster)** | **64.0%** | Baseline | N/A | Benchmark |
| **Competent (No Coolant Sprayer)** | 13.0% | **-51.0 pts** | Drop $\ge 5$ pts | **PASS** |
| **Competent (No Pulse Turret)** | 0.0% | **-64.0 pts** | Drop $\ge 5$ pts | **PASS** |
| **Competent (No Arc Coil)** | 0.0% | **-64.0 pts** | Drop $\ge 5$ pts | **PASS** |
| **Competent (No Rocket Rack)** | 0.0% | **-64.0 pts** | Drop $\ge 5$ pts | **PASS** |

*Analysis*:
- **Coolant Sprayer** slow is critical: without 50% slow, rapid Spark Drones (speed 2.2) zip past defenses and overwhelm the Core before turrets cycle reload cooldowns.
- **Arc Coil** is the primary counter to heavy armour: without armour-piercing chain lightning, Crusher Tanks (Armour 6) and Iron Sentry (Armour 8) absorb kinetic attacks and leak repeatedly.
- **Pulse Turret** provides essential cost-effective early-game kinetic defense (Waves 1–5): without Pulse, the defense collapses before Fabricators generate Circuits for Workshop unlocks.
- **Rocket Rack** provides large-radius area splash damage: without Rocket, dense late-game armored swarms (Waves 11–15) overwhelm single-target targeting queues.

### 6.3 Wave Pacing & Playtime Budget
- **Mean Wave Duration**: $47.8\text{s}$ sim time at $1\times$ (Target: 40–75s).
- **Median Wave Duration**: $47.0\text{s}$ sim time at $1\times$.
- **Mean Full Game Playtime**: $12.0\text{ minutes}$ at $1\times$ ($6.0\text{ minutes}$ at $2\times$ fast-forward).
- **Game Time Budget Gate ($12\text{--}20\text{ min}$)**: **PASS**.

---

## 7. Conclusions & Sign-Off

The data specifications and balance parameters in `src/data/*.json` satisfy every testplan gate without requiring any structural contract breaches or gameplay loosening. Robot Factory Defense provides a tight, challenging, deterministic tower defense experience where economic planning, crowd control, and weapon synergy are essential for victory.
