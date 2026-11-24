import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { simulateCompetentBot, calcCI, median } from './balance.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SEED_START = 1000;
const SEED_COUNT = 300;
const SEEDS = Array.from({ length: SEED_COUNT }, (_, i) => SEED_START + i);

const CONFIGS = [
  { id: 'scrap_08', name: 'Scrap x0.8', parameter: 'scrap', multiplier: 0.8, scrapScale: 0.8, hpScale: 1.0 },
  { id: 'scrap_10', name: 'Scrap x1.0', parameter: 'scrap', multiplier: 1.0, scrapScale: 1.0, hpScale: 1.0 },
  { id: 'scrap_12', name: 'Scrap x1.2', parameter: 'scrap', multiplier: 1.2, scrapScale: 1.2, hpScale: 1.0 },
  { id: 'hp_09', name: 'Enemy HP x0.9', parameter: 'hp', multiplier: 0.9, scrapScale: 1.0, hpScale: 0.9 },
  { id: 'hp_10', name: 'Enemy HP x1.0', parameter: 'hp', multiplier: 1.0, scrapScale: 1.0, hpScale: 1.0 },
  { id: 'hp_11', name: 'Enemy HP x1.1', parameter: 'hp', multiplier: 1.1, scrapScale: 1.0, hpScale: 1.1 }
];

if (!isMainThread) {
  const { config, seeds } = workerData;
  const t0 = Date.now();
  const runs = seeds.map(s => simulateCompetentBot(s, null, {
    scrapScale: config.scrapScale,
    hpScale: config.hpScale
  }));
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
    bot: 'Competent',
    configuration: config.name,
    parameter: config.parameter,
    multiplier: config.multiplier,
    totalGames: seeds.length,
    gamesRun: seeds.length,
    wins,
    winRate: Number(winRate.toFixed(2)),
    '95% CI': Number(ci95.toFixed(2)),
    ci95: Number(ci95.toFixed(2)),
    ci95_lower: Number(Math.max(0, winRate - ci95).toFixed(2)),
    ci95_upper: Number(Math.min(100, winRate + ci95).toFixed(2)),
    medianWave: medWave,
    finalCoreHp,
    medianCoreHp,
    medianWinningCoreHp,
    target: '<= 30.0 pts delta vs 1.0x baseline',
    gate: `Sensitivity (${config.name})`,
    durationMs,
    runs: runs.map(r => ({
      seed: r.seed,
      won: r.won,
      finalWave: r.finalWave,
      lossWave: r.lossWave,
      finalCoreHp: r.finalCoreHp
    }))
  });
} else {
  console.log(`Starting parallel sensitivity simulation across ${SEED_COUNT} seeds...`);
  const startTime = Date.now();
  const promises = CONFIGS.map(config => {
    return new Promise((resolve, reject) => {
      const worker = new Worker(__filename, {
        workerData: { config, seeds: SEEDS }
      });
      worker.on('message', resolve);
      worker.on('error', reject);
      worker.on('exit', code => {
        if (code !== 0) reject(new Error(`Worker stopped with exit code ${code}`));
      });
    });
  });

  Promise.all(promises).then(results => {
    const totalDurationMs = Date.now() - startTime;
    const baseRun = results.find(r => r.parameter === 'scrap' && r.multiplier === 1.0);
    const baseWinRate = baseRun ? baseRun.winRate : 82.0;

    let scrapMaxDelta = 0;
    let hpMaxDelta = 0;

    results.forEach(r => {
      const delta = Number((r.winRate - baseWinRate).toFixed(2));
      const absDelta = Number(Math.abs(delta).toFixed(2));
      r.delta = delta;
      r.absDelta = absDelta;
      r.pass = absDelta <= 30.0;
      r.status = r.pass ? 'PASS' : 'FAIL';

      if (r.parameter === 'scrap') {
        if (absDelta > scrapMaxDelta) scrapMaxDelta = absDelta;
      } else if (r.parameter === 'hp') {
        if (absDelta > hpMaxDelta) hpMaxDelta = absDelta;
      }
    });

    const allPassed = results.every(r => r.pass);

    const outData = {
      metadata: {
        task: `Robot Factory Defense Sensitivity Analysis (Seeds ${SEED_START}-${SEED_START + SEED_COUNT - 1})`,
        target: 'robot-factory-defense/docs/balance-results/sensitivity.json',
        generatedAt: new Date().toISOString(),
        seedStart: SEED_START,
        seedEnd: SEED_START + SEED_COUNT - 1,
        seedCount: SEED_COUNT,
        totalGamesRun: SEED_COUNT * CONFIGS.length,
        wallClockTimeSeconds: Number((totalDurationMs / 1000).toFixed(2)),
        wallClockTimeMs: totalDurationMs,
        targetThreshold: '<= 30.0 pts delta per step'
      },
      summary: {
        totalGames: SEED_COUNT * CONFIGS.length,
        wallClockTime: `${(totalDurationMs / 1000).toFixed(2)}s`,
        wallClockTimeSeconds: Number((totalDurationMs / 1000).toFixed(2)),
        scrapMaxDelta,
        hpMaxDelta,
        gateScrapPass: scrapMaxDelta <= 30.0,
        gateHpPass: hpMaxDelta <= 30.0,
        allPassed
      },
      results
    };

    const targetPath = path.resolve(__dirname, '../docs/balance-results/sensitivity.json');
    fs.writeFileSync(targetPath, JSON.stringify(outData, null, 2), 'utf-8');
    console.log(`Saved sensitivity.json (${results.length} configs, ${SEED_COUNT * CONFIGS.length} games in ${(totalDurationMs / 1000).toFixed(2)}s)`);
    results.forEach(r => {
      console.log(`${r.configuration.padEnd(18)} WinRate: ${r.winRate}% (Delta: ${r.delta > 0 ? '+' : ''}${r.delta} pts) [${r.status}]`);
    });
  }).catch(err => {
    console.error('Sensitivity run failed:', err);
    process.exit(1);
  });
}
