import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  simulateIdleBot,
  simulateRandomBot,
  simulateSingleTowerBot,
  simulateCompetentBot,
  calcCI,
  median
} from './balance.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SEED_START = 1000;
const SEED_COUNT = 300;
const SEEDS = Array.from({ length: SEED_COUNT }, (_, i) => SEED_START + i);

const BOTS = [
  { id: 'idle', name: 'Idle', fn: 'simulateIdleBot' },
  { id: 'random', name: 'Random', fn: 'simulateRandomBot' },
  { id: 'pulse_only', name: 'Pulse-only', fn: 'simulateSingleTowerBot', arg: 'pulse' },
  { id: 'coolant_only', name: 'Coolant-only', fn: 'simulateSingleTowerBot', arg: 'coolant' },
  { id: 'arc_only', name: 'Arc-only', fn: 'simulateSingleTowerBot', arg: 'arc' },
  { id: 'rocket_only', name: 'Rocket-only', fn: 'simulateSingleTowerBot', arg: 'rocket' },
  { id: 'competent', name: 'Competent', fn: 'simulateCompetentBot' }
];

if (!isMainThread) {
  const { bot, seeds } = workerData;
  const t0 = Date.now();
  let runs;
  if (bot.fn === 'simulateIdleBot') {
    runs = seeds.map(s => simulateIdleBot(s));
  } else if (bot.fn === 'simulateRandomBot') {
    runs = seeds.map(s => simulateRandomBot(s));
  } else if (bot.fn === 'simulateSingleTowerBot') {
    runs = seeds.map(s => simulateSingleTowerBot(s, bot.arg));
  } else {
    runs = seeds.map(s => simulateCompetentBot(s));
  }
  const durationMs = Date.now() - t0;

  const wins = runs.filter(r => r.won).length;
  const winRate = (wins / seeds.length) * 100;
  const ci95 = calcCI(winRate, seeds.length);
  const medWave = median(runs.map(r => r.finalWave));
  const winningHp = runs.filter(r => r.won).map(r => r.finalCoreHp);
  const medianWinningCoreHp = winningHp.length > 0 ? median(winningHp) : null;
  const allCoreHp = runs.map(r => r.finalCoreHp);
  const medianCoreHp = median(allCoreHp);
  const lossWaves = runs.filter(r => r.lossWave !== null && r.lossWave !== undefined).map(r => r.lossWave);
  const medianLossWave = lossWaves.length > 0 ? median(lossWaves) : null;
  const maxLossWave = lossWaves.length > 0 ? Math.max(...lossWaves) : null;

  let pass = false;
  let target = '';
  if (bot.id === 'idle') {
    target = 'lossWave <= 3';
    pass = maxLossWave <= 3;
  } else if (bot.id === 'random') {
    target = '3 <= medianWave <= 7';
    pass = medWave >= 3 && medWave <= 7;
  } else if (bot.id.endsWith('_only')) {
    target = 'winRate <= 50%';
    pass = winRate <= 50;
  } else if (bot.id === 'competent') {
    target = '60% <= winRate <= 85%';
    pass = winRate >= 60 && winRate <= 85;
  }

  parentPort.postMessage({
    bot: bot.name,
    configuration: 'Default',
    totalGames: seeds.length,
    wins,
    winRate: Number(winRate.toFixed(2)),
    '95% CI': Number(ci95.toFixed(2)),
    ci95: Number(ci95.toFixed(2)),
    medianWave: medWave,
    maxLossWave,
    medianLossWave,
    finalCoreHp: medianWinningCoreHp !== null ? medianWinningCoreHp : medianCoreHp,
    medianCoreHp,
    medianWinningCoreHp,
    target,
    pass,
    status: pass ? 'PASS' : 'FAIL',
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
  console.log(`Starting parallel bots simulation across ${SEED_COUNT} seeds (${SEED_START}-${SEED_START + SEED_COUNT - 1})...`);
  const startTime = Date.now();
  const promises = BOTS.map(bot => {
    return new Promise((resolve, reject) => {
      const worker = new Worker(__filename, {
        workerData: { bot, seeds: SEEDS }
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
    const allPassed = results.every(r => r.pass);

    const outData = {
      metadata: {
        task: `Robot Factory Defense Bot Balance Verification (Seeds ${SEED_START}-${SEED_START + SEED_COUNT - 1})`,
        generatedAt: new Date().toISOString(),
        seedStart: SEED_START,
        seedEnd: SEED_START + SEED_COUNT - 1,
        seedCount: SEED_COUNT,
        totalGamesRun: SEED_COUNT * BOTS.length,
        wallClockTimeSeconds: Number((totalDurationMs / 1000).toFixed(2)),
        wallClockTimeMs: totalDurationMs,
        numWorkers: BOTS.length
      },
      summary: {
        totalGames: SEED_COUNT * BOTS.length,
        wallClockTime: `${(totalDurationMs / 1000).toFixed(2)}s`,
        allPassed
      },
      results
    };

    const targetPath = path.resolve(__dirname, '../docs/balance-results/bots.json');
    fs.writeFileSync(targetPath, JSON.stringify(outData, null, 2), 'utf-8');
    console.log(`Saved bots.json (${results.length} bots, ${SEED_COUNT * BOTS.length} games in ${(totalDurationMs / 1000).toFixed(2)}s)`);
    results.forEach(r => {
      console.log(`${r.bot.padEnd(15)} WinRate: ${r.winRate}% (CI: ±${r.ci95}%) MedWave: ${r.medianWave} [${r.status}]`);
    });
  }).catch(err => {
    console.error('Bots run failed:', err);
    process.exit(1);
  });
}
