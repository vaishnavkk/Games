/**
 * Parallel Tower Ablation Matrix Runner (Seeds 1000-1299)
 * Runs 6 configurations across 300 seeds using Worker threads.
 */
import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { simulateCompetentBot, calcCI, median } from './balance.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIGS = [
  { id: 'baseline', name: 'Baseline (Full Roster)', tower: null, excludedTower: null },
  { id: 'pulse', name: 'No Pulse', tower: 'pulse', excludedTower: 'pulse' },
  { id: 'coolant', name: 'No Coolant', tower: 'coolant', excludedTower: 'coolant' },
  { id: 'arc', name: 'No Arc', tower: 'arc', excludedTower: 'arc' },
  { id: 'rocket', name: 'No Rocket', tower: 'rocket', excludedTower: 'rocket' },
  { id: 'fabricator', name: 'No Fabricator', tower: 'fabricator', excludedTower: 'fabricator' }
];

const SEED_START = 1000;
const SEED_COUNT = 300;
const SEEDS = Array.from({ length: SEED_COUNT }, (_, i) => SEED_START + i);

if (!isMainThread) {
  const { config, seeds } = workerData;
  const t0 = Date.now();
  const runs = seeds.map(s => simulateCompetentBot(s, config.excludedTower, { targeting: 'first' }));
  const durationMs = Date.now() - t0;

  const wins = runs.filter(r => r.won).length;
  const winRate = (wins / seeds.length) * 100;
  const ci95 = calcCI(winRate, seeds.length);
  const medWave = median(runs.map(r => r.finalWave));
  const winningHp = runs.filter(r => r.won).map(r => r.finalCoreHp);
  const medianWinningCoreHp = winningHp.length > 0 ? median(winningHp) : 0;
  const allCoreHp = runs.map(r => r.finalCoreHp);
  const medianCoreHp = median(allCoreHp);
  const finalCoreHp = medianWinningCoreHp > 0 ? medianWinningCoreHp : medianCoreHp;

  parentPort.postMessage({
    id: config.id,
    name: config.name,
    tower: config.tower,
    excludedTower: config.excludedTower,
    totalGames: seeds.length,
    wins,
    winRate: Number(winRate.toFixed(2)),
    ci95: Number(ci95.toFixed(2)),
    medianWave: medWave,
    finalCoreHp,
    medianCoreHp,
    medianWinningCoreHp,
    durationMs,
    runs: runs.map(r => ({
      seed: r.seed,
      won: r.won,
      finalWave: r.finalWave,
      finalCoreHp: r.finalCoreHp,
      ticks: r.ticks
    }))
  });
} else {
  async function runAll() {
    const mainStart = Date.now();
    console.log(`Starting parallel ablation simulation across ${SEED_COUNT} seeds (${SEED_START}-${SEED_START + SEED_COUNT - 1}) for ${CONFIGS.length} configurations...`);

    const workerPromises = CONFIGS.map(config => {
      return new Promise((resolve, reject) => {
        const worker = new Worker(__filename, {
          workerData: { config, seeds: SEEDS }
        });
        worker.on('message', resolve);
        worker.on('error', reject);
        worker.on('exit', code => {
          if (code !== 0) reject(new Error(`Worker for ${config.id} exited with code ${code}`));
        });
      });
    });

    const resultsList = await Promise.all(workerPromises);
    const wallClockTimeMs = Date.now() - mainStart;
    const wallClockTimeSeconds = Number((wallClockTimeMs / 1000).toFixed(2));

    const baselineResult = resultsList.find(r => r.id === 'baseline');
    const baselineWinRate = baselineResult.winRate;

    const ablations = {};
    const results = [];

    for (const res of resultsList) {
      if (res.id === 'baseline') continue;

      const drop = Number((baselineWinRate - res.winRate).toFixed(2));
      const pass = drop >= 5.0;
      const ablationEntry = {
        id: res.id,
        name: res.name,
        tower: res.tower,
        excludedTower: res.excludedTower,
        seeds: [SEED_START, SEED_START + SEED_COUNT - 1],
        totalGames: res.totalGames,
        wins: res.wins,
        winRate: res.winRate,
        ci95: res.ci95,
        '95% CI': res.ci95,
        drop,
        dropVsBaseline: drop,
        medianWave: res.medianWave,
        finalCoreHp: res.finalCoreHp,
        medianCoreHp: res.medianCoreHp,
        medianWinningCoreHp: res.medianWinningCoreHp,
        gate: 'Drop >= 5.0 pts vs baseline',
        target: 'drop >= 5.0 pts',
        pass,
        status: pass ? 'PASS' : 'FAIL',
        durationMs: res.durationMs
      };

      ablations[res.id] = ablationEntry;
      results.push(ablationEntry);
    }

    const baselineEntry = {
      id: 'baseline',
      name: baselineResult.name,
      configuration: 'Baseline',
      seeds: [SEED_START, SEED_START + SEED_COUNT - 1],
      totalGames: baselineResult.totalGames,
      wins: baselineResult.wins,
      winRate: baselineResult.winRate,
      ci95: baselineResult.ci95,
      '95% CI': baselineResult.ci95,
      medianWave: baselineResult.medianWave,
      finalCoreHp: baselineResult.finalCoreHp,
      medianCoreHp: baselineResult.medianCoreHp,
      medianWinningCoreHp: baselineResult.medianWinningCoreHp,
      gate: '60% <= winRate <= 85%',
      target: '60% - 85% win rate',
      pass: baselineResult.winRate >= 60 && baselineResult.winRate <= 85,
      status: baselineResult.winRate >= 60 && baselineResult.winRate <= 85 ? 'PASS' : 'FAIL',
      durationMs: baselineResult.durationMs
    };

    // Subsets
    const subsets = {
      S1_no_rocket: {
        name: 'Subset S1 (No Rocket: Pulse + Coolant + Arc + Fab)',
        towers: ['pulse', 'coolant', 'arc', 'fabricator'],
        excluded: 'rocket',
        winRate: ablations.rocket.winRate,
        ci95: ablations.rocket.ci95,
        '95% CI': ablations.rocket.ci95,
        medianWave: ablations.rocket.medianWave,
        target: 'winRate >= 30.0%',
        pass: ablations.rocket.winRate >= 30.0,
        status: ablations.rocket.winRate >= 30.0 ? 'PASS' : 'FAIL'
      },
      S2_no_coolant: {
        name: 'Subset S2 (No Coolant: Pulse + Arc + Rocket + Fab)',
        towers: ['pulse', 'arc', 'rocket', 'fabricator'],
        excluded: 'coolant',
        winRate: ablations.coolant.winRate,
        ci95: ablations.coolant.ci95,
        '95% CI': ablations.coolant.ci95,
        medianWave: ablations.coolant.medianWave,
        target: 'winRate >= 30.0%',
        pass: ablations.coolant.winRate >= 30.0,
        status: ablations.coolant.winRate >= 30.0 ? 'PASS' : 'FAIL'
      },
      S3_no_arc: {
        name: 'Subset S3 (No Arc: Pulse + Coolant + Rocket + Fab)',
        towers: ['pulse', 'coolant', 'rocket', 'fabricator'],
        excluded: 'arc',
        winRate: ablations.arc.winRate,
        ci95: ablations.arc.ci95,
        '95% CI': ablations.arc.ci95,
        medianWave: ablations.arc.medianWave,
        target: 'winRate >= 30.0%',
        pass: ablations.arc.winRate >= 30.0,
        status: ablations.arc.winRate >= 30.0 ? 'PASS' : 'FAIL'
      }
    };

    const allPassed = baselineEntry.pass && results.every(r => r.pass);

    const outputData = {
      metadata: {
        analysis: 'Tower Viability & Re-planning Ablation Analysis (Seeds 1000-1299)',
        target: 'robot-factory-defense/docs/balance-results/ablation.json',
        generatedAt: new Date().toISOString(),
        seedStart: SEED_START,
        seedEnd: SEED_START + SEED_COUNT - 1,
        seedCount: SEED_COUNT,
        configurationsCount: CONFIGS.length,
        totalGamesRun: SEED_COUNT * CONFIGS.length,
        wallClockTimeMs,
        wallClockTimeSeconds
      },
      summary: {
        totalGames: SEED_COUNT * CONFIGS.length,
        wallClockTime: `${wallClockTimeSeconds}s`,
        allPassed
      },
      baseline: baselineEntry,
      ablations,
      results,
      rows: [baselineEntry, ...results],
      subsets,
      allPassed
    };

    const outputPath = path.resolve(__dirname, '../docs/balance-results/ablation.json');
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2), 'utf8');
    console.log(`Successfully wrote ablation results to: ${outputPath}`);

    // Print summary table to console
    console.log('\n=======================================================');
    console.log(`TOWER ABLATION MATRIX SUMMARY (${SEED_COUNT} SEEDS)`);
    console.log('=======================================================');
    console.log(`Baseline Win Rate: ${baselineResult.winRate.toFixed(1)}% ± ${baselineResult.ci95.toFixed(1)}% (Status: ${baselineEntry.status})`);
    console.log('-------------------------------------------------------');
    console.log('| Configuration | Wins / Total | Win Rate | 95% CI | Drop vs Base | Med Wave | Core HP | Status |');
    console.log('|---------------|--------------|----------|--------|--------------|----------|---------|--------|');
    console.log(`| Baseline      | ${String(baselineResult.wins).padStart(4)} / ${SEED_COUNT} | ${(baselineResult.winRate.toFixed(1) + '%').padStart(8)} | ±${(baselineResult.ci95.toFixed(1) + '%').padStart(5)} |     0.0 pts  | ${String(baselineResult.medianWave).padStart(8)} | ${String(baselineResult.finalCoreHp).padStart(7)} | ${baselineEntry.status}   |`);
    for (const r of results) {
      console.log(`| ${r.name.padEnd(13)} | ${String(r.wins).padStart(4)} / ${SEED_COUNT} | ${(r.winRate.toFixed(1) + '%').padStart(8)} | ±${(r.ci95.toFixed(1) + '%').padStart(5)} | ${(r.drop >= 0 ? '-' : '+') + Math.abs(r.drop).toFixed(1).padStart(4)} pts  | ${String(r.medianWave).padStart(8)} | ${String(r.finalCoreHp).padStart(7)} | ${r.status.padEnd(6)} |`);
    }
    console.log('=======================================================');
    console.log(`Total Games: ${SEED_COUNT * CONFIGS.length} in ${wallClockTimeSeconds}s (allPassed: ${allPassed})`);
    console.log('=======================================================\n');
  }

  runAll().catch(err => {
    console.error('Ablation runner failed:', err);
    process.exit(1);
  });
}
