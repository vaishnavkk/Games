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

const UPGRADES = [
  { id: 'none', name: 'None (Baseline)', mode: 'none' },
  { id: 'overclock', name: 'Overclock', mode: 'overclock' },
  { id: 'hardened_rounds', name: 'Hardened Rounds', mode: 'hardened_rounds' },
  { id: 'long_barrels', name: 'Long Barrels', mode: 'long_barrels' },
  { id: 'scrap_magnet', name: 'Scrap Magnet', mode: 'scrap_magnet' },
  { id: 'repair_bay', name: 'Repair Bay', mode: 'repair_bay' },
  { id: 'fast_assembly', name: 'Fast Assembly', mode: 'fast_assembly' }
];

if (!isMainThread) {
  const { upg, seeds } = workerData;
  const t0 = Date.now();
  const runs = seeds.map(s => simulateCompetentBot(s, null, { workshopMode: upg.mode }));
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
    id: upg.id,
    name: upg.name,
    totalGames: seeds.length,
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
    durationMs,
    runs: runs.map(r => ({
      seed: r.seed,
      won: r.won,
      finalWave: r.finalWave,
      lossWave: r.lossWave,
      finalCoreHp: r.finalCoreHp,
      purchasedUpgrades: r.purchasedUpgrades
    }))
  });
} else {
  console.log(`Starting parallel workshop simulation across ${SEED_COUNT} seeds...`);
  const startTime = Date.now();
  const promises = UPGRADES.map(upg => {
    return new Promise((resolve, reject) => {
      const worker = new Worker(__filename, {
        workerData: { upg, seeds: SEEDS }
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
    const noneRun = results.find(r => r.id === 'none');
    const noneRate = noneRun ? noneRun.winRate : 0;

    const upgradesObj = {};
    results.forEach(r => {
      if (r.id === 'none') {
        r.gate = 'Baseline';
        r.target = 'Baseline';
        r.pass = true;
        r.status = 'PASS';
        r.gainVsNone = 0;
        r['gain vs none'] = 0;
      } else {
        const gain = Number((r.winRate - noneRate).toFixed(2));
        r.gainVsNone = gain;
        r['gain vs none'] = gain;
        r.gate = 'Gain vs none <= 60.0 pts';
        r.target = '<= 60.0 pts gain vs none';
        r.pass = gain <= 60.0;
        r.status = r.pass ? 'PASS' : 'FAIL';
        upgradesObj[r.id] = r;
      }
    });

    const allPassed = results.every(r => r.pass);

    const outData = {
      metadata: {
        analysis: 'Workshop Upgrades Analysis',
        target: 'robot-factory-defense/docs/balance-results/workshop.json',
        generatedAt: new Date().toISOString(),
        startSeed: SEED_START,
        endSeed: SEED_START + SEED_COUNT - 1,
        seedCount: SEED_COUNT,
        configurationsCount: UPGRADES.length,
        totalGamesRun: SEED_COUNT * UPGRADES.length,
        wallClockTimeMs: totalDurationMs,
        wallClockTimeSeconds: Number((totalDurationMs / 1000).toFixed(2))
      },
      summary: {
        totalGames: SEED_COUNT * UPGRADES.length,
        wallClockTime: `${(totalDurationMs / 1000).toFixed(2)}s`,
        allPassed
      },
      baseline: noneRun,
      upgrades: upgradesObj,
      results
    };

    const targetPath = path.resolve(__dirname, '../docs/balance-results/workshop.json');
    fs.writeFileSync(targetPath, JSON.stringify(outData, null, 2), 'utf-8');
    console.log(`Saved workshop.json (${results.length} configs, ${SEED_COUNT * UPGRADES.length} games in ${(totalDurationMs / 1000).toFixed(2)}s)`);
    results.forEach(r => {
      console.log(`${r.name.padEnd(20)} WinRate: ${r.winRate}% (Gain: +${r.gainVsNone} pts) [${r.status}]`);
    });
  }).catch(err => {
    console.error('Workshop run failed:', err);
    process.exit(1);
  });
}
