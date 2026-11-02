import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

import { COUNTRIES_DB } from '../data/countries.js';

console.log('================================================================================');
console.log('                  STEP 0: INVENTORY AUDIT (CURRENT BUILD)                       ');
console.log('================================================================================\n');

// 1. Database Tiers
const easyPool = COUNTRIES_DB.filter(c => c.tier === 'easy');
const medPool = COUNTRIES_DB.filter(c => c.tier === 'medium');
const hardPool = COUNTRIES_DB.filter(c => c.tier === 'hard' || !c.tier);
console.log(`[Database Tiers] Total: ${COUNTRIES_DB.length}`);
console.log(` - Easy Tier Pool:   ${easyPool.length} countries`);
console.log(` - Medium Tier Pool: ${medPool.length} countries (Combined Easy+Med: ${easyPool.length + medPool.length})`);
console.log(` - Hard Tier Pool:   ${hardPool.length} countries (All UN: ${COUNTRIES_DB.length})\n`);

// 2. HTML Inspection for Modes, Tiers, Rounds, Toggles
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

const modes = {
  clue: html.includes('data-mode="clue"') && !html.includes('data-mode="clue" disabled'),
  name: html.includes('data-mode="name"') || html.includes('Names (P3)'),
  nameDisabled: html.includes('Names (P3)') && html.includes('disabled'),
  flag: html.includes('data-mode="flag"') || html.includes('Flags (P3)'),
  flagDisabled: html.includes('Flags (P3)') && html.includes('disabled'),
};
console.log('[Modes in UI]:', modes);

const tiers = {
  easy: html.includes('data-tier="easy"'),
  mediumDisabled: html.includes('Navigator (P3)') && html.includes('disabled'),
  hardDisabled: html.includes('Global (P3)') && html.includes('disabled'),
};
console.log('[Tiers in UI]:', tiers);

const rounds = {
  ten: html.includes('data-rounds="10"'),
  twenty: html.includes('data-rounds="20"'),
  endless: html.includes('data-rounds="endless"')
};
console.log('[Rounds in UI]:', rounds);

const toggles = {
  timerInDOM: html.includes('id="timerToggle"'),
  survivalInDOM: html.includes('id="survivalToggle"')
};
console.log('[Toggles in UI]:', toggles);

// 3. Logic in game.js
const gameSrc = fs.readFileSync(path.join(root, 'src/game.js'), 'utf8');
const logic = {
  clueModeHandled: gameSrc.includes('clue'),
  nameModeHandled: gameSrc.includes('mode === \'name\'') || fs.readFileSync(path.join(root, 'src/ui.js'), 'utf8').includes('mode === \'name\''),
  flagModeHandled: gameSrc.includes('mode === \'flag\'') || fs.readFileSync(path.join(root, 'src/ui.js'), 'utf8').includes('mode === \'flag\''),
  timerLogic: gameSrc.includes('startTimer') && gameSrc.includes('handleTimeout'),
  survivalLogic: gameSrc.includes('this.isSurvival') && gameSrc.includes('this.lives--'),
  requeueMissed: gameSrc.includes('this.roundQueue.splice(reinsertIndex, 0, target)'),
  localStorageScore: gameSrc.includes('localStorage.setItem(\'geotrivia_highscore\'')
};
console.log('[Game Engine Capabilities]:', logic);

const inventoryReport = {
  tiersCount: { easy: easyPool.length, medium: medPool.length, total: COUNTRIES_DB.length },
  modes,
  tiers,
  rounds,
  toggles,
  logic
};

fs.writeFileSync(path.join(__dirname, 'step0_inventory_result.json'), JSON.stringify(inventoryReport, null, 2));
console.log('\nInventory audit saved to scripts/step0_inventory_result.json');
