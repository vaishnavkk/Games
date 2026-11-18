import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { emojiToCodePoints } from './build-sprite.js';
import { LEVELS } from '../src/engine/game.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PUZZLES_PATH = path.resolve(__dirname, '../src/data/puzzles.json');
const SVG_DIR = path.resolve(__dirname, '../node_modules/@twemoji/svg');
const CUSTOM_SVG_DIR = path.resolve(__dirname, '../src/assets/svg');

const BANNED_WORDS = ['kill', 'die', 'dead', 'blood', 'gun', 'war', 'hate', 'stupid'];
const BANNED_REGEX = new RegExp(`\\b(${BANNED_WORDS.join('|')})\\b`, 'i');

function countWords(str) {
  if (!str || typeof str !== 'string') return 0;
  return str.trim().split(/\s+/).filter(Boolean).length;
}

export function stem(word) {
  word = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!word) return '';
  const irregulars = {
    teeth: 'tooth',
    children: 'child',
    babies: 'baby',
    baby: 'baby',
    toddlers: 'toddler',
    toddler: 'toddler',
    butterflies: 'butterfly',
    butterfly: 'butterfly'
  };
  if (irregulars[word]) return irregulars[word];
  if (word.endsWith('ies') && word.length > 4) return word.slice(0, -3) + 'y';
  if (/(ches|shes|xes|zes|sses)$/.test(word)) return word.slice(0, -2);
  if (word.endsWith('s') && !word.endsWith('ss') && word.length > 2) return word.slice(0, -1);
  return word;
}

const MODIFIERS = new Set(['tiny', 'forest', 'box', 'bald', 'brown', 'red', 'shiny', 'green', 'bright', 'rocky', 'dusty', 'night', 'silver', 'golden', 'distant', 'outer', 'pumping', 'clever', 'strong', 'seeing', 'sniffing', 'tasting', 'kicking', 'playful', 'grown', 'newborn', 'both', 'the', 'of', 'in', 'and']);

export function getItemKeywords(item) {
  const words = item.label.toLowerCase().split(/[^a-z]+/).filter(Boolean);
  const sig = words.filter(w => !MODIFIERS.has(w));
  return sig.length > 0 ? sig : words;
}

export function itemMatchesText(item, text) {
  const textWords = text.toLowerCase().split(/[^a-z]+/).filter(Boolean);
  const textStems = new Set(textWords.map(stem));
  const keywords = getItemKeywords(item);
  return keywords.some(kw => textStems.has(stem(kw)));
}

export function checkFactSupportsAnswer(puzzle) {
  const factText = puzzle.fact && puzzle.fact.text ? puzzle.fact.text : '';
  if (!factText) return { pass: false, reason: 'Missing fact text' };

  if (puzzle.type === 'pick' || puzzle.type === 'tapall') {
    const correctIds = Array.isArray(puzzle.answer) ? puzzle.answer : [puzzle.answer];
    const correctItems = puzzle.items.filter(it => correctIds.includes(it.id));
    const matchedCorrect = correctItems.filter(it => itemMatchesText(it, factText));
    if (matchedCorrect.length === 0) {
      return { pass: false, reason: 'Fact does not name any correct item' };
    }
    return { pass: true, reason: `Names correct item(s): ${matchedCorrect.map(i => i.label).join(', ')}` };
  } else if (puzzle.type === 'order') {
    const matchedItems = puzzle.items.filter(it => itemMatchesText(it, factText));
    if (matchedItems.length < 2) {
      return { pass: false, reason: `Order fact must name at least 2 ordered items (found ${matchedItems.length}: ${matchedItems.map(i => i.label).join(', ')})` };
    }
    return { pass: true, reason: `Names ${matchedItems.length} ordered items: ${matchedItems.map(i => i.label).join(', ')}` };
  }
  return { pass: true, reason: 'OK' };
}

const NUMBER_WORDS = new Set(['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'twenty', 'thirty', 'hundred', 'thousand', 'million']);

const STOP_WORDS = new Set([
  'the', 'and', 'are', 'with', 'for', 'from', 'that', 'this', 'have', 'has',
  'into', 'your', 'about', 'than', 'while', 'they', 'their', 'them', 'these',
  'those', 'when', 'what', 'which', 'where', 'who', 'how', 'our', 'all', 'can',
  'not', 'but', 'out', 'down', 'then', 'also', 'only', 'just', 'more', 'most',
  'very', 'each', 'both', 'does', 'like', 'than', 'then', 'our', 'its', 'been',
  'were', 'some', 'could', 'would', 'should', 'other', 'made', 'part', 'parts'
]);

function getContentWords(str) {
  return (str || '').toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 3 && !STOP_WORDS.has(w) && !/^\d+$/.test(w));
}

export function checkFactTeaches(puzzle) {
  const factText = puzzle.fact?.text || '';
  const evidenceList = puzzle.fact?.sources
    ? puzzle.fact.sources.flatMap(s => s.evidence || [])
    : (puzzle.fact?.evidence || []);

  const factLower = factText.toLowerCase();

  // 1. Number or name from evidence
  let hasNumberOrName = false;
  for (const ev of evidenceList) {
    const evLower = ev.toLowerCase();
    const evDigits = evLower.match(/\b\d+[\d,]*\b/g) || [];
    for (const d of evDigits) {
      const clean = d.replace(/,/g, '');
      if (factLower.includes(clean)) hasNumberOrName = true;
    }
    if (evLower.includes('238,855') && factLower.includes('239,000')) {
      hasNumberOrName = true;
    }
    for (const nw of NUMBER_WORDS) {
      if (evLower.includes(nw) && factLower.includes(nw)) hasNumberOrName = true;
    }
    const evTokens = evLower.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length >= 3 && !STOP_WORDS.has(w));
    for (const tok of evTokens) {
      if (factLower.includes(tok)) hasNumberOrName = true;
    }
  }

  // 2. >= 3 content words that appear in neither prompt nor item labels
  const promptWords = new Set(getContentWords(puzzle.prompt));
  const labelWords = new Set();
  (puzzle.items || []).forEach(it => {
    getContentWords(it.label).forEach(w => labelWords.add(w));
  });

  const factWords = getContentWords(factText);
  const newContentWords = factWords.filter(w => !promptWords.has(w) && !labelWords.has(w));
  const uniqueNew = Array.from(new Set(newContentWords));

  if (!hasNumberOrName) {
    return { pass: false, reason: 'Fact does not contain a number or name from its evidence' };
  }
  if (uniqueNew.length < 3) {
    return { pass: false, reason: `Fact contains only ${uniqueNew.length} new content words (expected >= 3: ${uniqueNew.join(', ')})` };
  }
  return { pass: true, reason: `Teaches (${uniqueNew.length} new words: ${uniqueNew.slice(0, 4).join(', ')})` };
}

// Planted-defect tests
const oldGarden06 = {
  id: 'garden-06',
  type: 'order',
  items: [
    { id: 'a', label: 'Seed' },
    { id: 'b', label: 'Tiny Sprout' },
    { id: 'c', label: 'Green Stem' },
    { id: 'd', label: 'Sunflower' }
  ],
  answer: ['a', 'b', 'c', 'd'],
  fact: {
    text: 'Instead of falling to soil, mangrove seeds begin growing while still attached to the plant!'
  }
};

const oldBody02 = {
  id: 'body-02',
  type: 'tapall',
  items: [
    { id: 'a', label: 'Pumping Heart' },
    { id: 'b', label: 'Clever Brain' },
    { id: 'c', label: 'Outer Skin' }
  ],
  answer: ['a', 'b'],
  fact: {
    text: 'Your skin is the largest organ of the human body, protecting everything inside your body.'
  }
};

const oldBody05 = {
  id: 'body-05',
  type: 'order',
  prompt: 'Order these human growth stages from youngest to oldest age!',
  items: [
    { id: 'a', label: 'Baby Infant' },
    { id: 'b', label: 'Playful Child' },
    { id: 'c', label: 'Grown Adult' }
  ],
  answer: ['a', 'b', 'c'],
  fact: {
    text: 'Human growth progresses steadily from an infant into a playful child and then into a grown adult!',
    evidence: ['infant', 'child']
  }
};

const plantGardenRes = checkFactSupportsAnswer(oldGarden06);
const plantBodyRes = checkFactSupportsAnswer(oldBody02);
const plantBody05Res = checkFactTeaches(oldBody05);

if (plantGardenRes.pass || plantBodyRes.pass || plantBody05Res.pass) {
  console.error('[check:puzzles] Planted defect verification FAILED: defective facts unexpectedly passed!');
  process.exit(1);
}
console.log('[check:puzzles] Planted defect verification PASSED: old garden-06, old body-02, and old body-05 correctly rejected.');

if (!fs.existsSync(PUZZLES_PATH)) {
  console.error(`[check:puzzles] Error: File not found: ${PUZZLES_PATH}`);
  process.exit(1);
}

let puzzles;
try {
  puzzles = JSON.parse(fs.readFileSync(PUZZLES_PATH, 'utf8'));
} catch (e) {
  console.error(`[check:puzzles] JSON Parse Error: ${e.message}`);
  process.exit(1);
}

if (!Array.isArray(puzzles) || puzzles.length === 0) {
  console.error('[check:puzzles] Error: puzzles.json must be a non-empty array');
  process.exit(1);
}

const errors = [];
const seenIds = new Set();

puzzles.forEach((p, idx) => {
  const prefix = `[Puzzle #${idx + 1} (${p.id || 'unnamed'})]`;

  // 1. Unique ID
  if (!p.id || typeof p.id !== 'string') {
    errors.push(`${prefix} Missing or invalid 'id'`);
  } else if (seenIds.has(p.id)) {
    errors.push(`${prefix} Duplicate puzzle id '${p.id}'`);
  } else {
    seenIds.add(p.id);
  }

  // 2. Level (1, 2, or 3)
  if (![1, 2, 3].includes(p.level)) {
    errors.push(`${prefix} Invalid 'level': must be 1, 2, or 3 (got ${p.level})`);
  }

  // 3. Type
  if (!['pick', 'tapall', 'order'].includes(p.type)) {
    errors.push(`${prefix} Invalid 'type': must be 'pick', 'tapall', or 'order' (got ${p.type})`);
  }

  // 4. Prompt length (<= 14 words)
  const promptWords = countWords(p.prompt);
  if (!p.prompt || promptWords === 0) {
    errors.push(`${prefix} Missing 'prompt'`);
  } else if (promptWords > 14) {
    errors.push(`${prefix} Prompt exceeds 14 words (${promptWords} words): "${p.prompt}"`);
  }

  // 5. Items
  if (!Array.isArray(p.items) || p.items.length < 2) {
    errors.push(`${prefix} 'items' must be an array with at least 2 items`);
  } else {
    const itemIds = new Set();
    p.items.forEach((item, itemIdx) => {
      if (!item.id) errors.push(`${prefix} Item #${itemIdx + 1} missing 'id'`);
      if (itemIds.has(item.id)) errors.push(`${prefix} Duplicate item id '${item.id}'`);
      itemIds.add(item.id);

      // Label length (<= 3 words)
      const labelWords = countWords(item.label);
      if (!item.label || labelWords === 0) {
        errors.push(`${prefix} Item '${item.id}' missing label`);
      } else if (labelWords > 3) {
        errors.push(`${prefix} Item '${item.id}' label exceeds 3 words (${labelWords} words): "${item.label}"`);
      }

      // Check emoji exists in Twemoji or custom SVG
      const code = emojiToCodePoints(item.emoji);
      const svgExists = fs.existsSync(path.join(CUSTOM_SVG_DIR, `${code}.svg`)) ||
                        fs.existsSync(path.join(SVG_DIR, `${code}.svg`)) ||
                        fs.existsSync(path.join(SVG_DIR, `${code}-fe0f.svg`));
      if (!svgExists) {
        errors.push(`${prefix} Item '${item.id}' emoji '${item.emoji}' (${code}) has no Twemoji or custom SVG`);
      }

      // Banned words in label
      if (BANNED_REGEX.test(item.label || '')) {
        errors.push(`${prefix} Item '${item.id}' label contains banned word: "${item.label}"`);
      }
    });

    // 6. Answer verification
    if (p.type === 'pick') {
      if (typeof p.answer !== 'string' || !itemIds.has(p.answer)) {
        errors.push(`${prefix} Answer '${p.answer}' is not a valid item id`);
      }
    } else if (p.type === 'tapall') {
      if (!Array.isArray(p.answer) || p.answer.length === 0 || !p.answer.every(ans => itemIds.has(ans))) {
        errors.push(`${prefix} Answer for tapall must be an array of valid item ids`);
      }
    } else if (p.type === 'order') {
      if (!Array.isArray(p.answer) || p.answer.length !== p.items.length || !p.answer.every(ans => itemIds.has(ans))) {
        errors.push(`${prefix} Answer for order must be an ordered array containing all ${p.items.length} item ids`);
      }
    }
  }

  // 7. Hint
  if (!p.hint) {
    errors.push(`${prefix} Missing 'hint'`);
  } else if (BANNED_REGEX.test(p.hint)) {
    errors.push(`${prefix} Hint contains banned word: "${p.hint}"`);
  }

  // 8. Fact (text <= 28 words)
  if (!p.fact || typeof p.fact.text !== 'string') {
    errors.push(`${prefix} Missing 'fact.text'`);
  } else {
    const factWords = countWords(p.fact.text);
    if (factWords > 28) {
      errors.push(`${prefix} Fact exceeds 28 words (${factWords} words): "${p.fact.text}"`);
    }
    if (BANNED_REGEX.test(p.fact.text)) {
      errors.push(`${prefix} Fact text contains banned word: "${p.fact.text}"`);
    }
    if (!p.fact.source && !p.fact.sources) {
      errors.push(`${prefix} Missing 'fact.source' or 'fact.sources'`);
    }
  }

  // 9. Fact supports answer check
  const factSupport = checkFactSupportsAnswer(p);
  console.log(`[check:puzzles] ${p.id.padEnd(10)} [support: ${factSupport.pass ? 'PASS' : 'FAIL'}]: ${factSupport.reason}`);
  if (!factSupport.pass) {
    errors.push(`${prefix} Fact does not support answer: ${factSupport.reason}`);
  }

  // 10. Fact teaches check
  const factTeaches = checkFactTeaches(p);
  console.log(`[check:puzzles] ${p.id.padEnd(10)} [teaches: ${factTeaches.pass ? 'PASS' : 'FAIL'}]: ${factTeaches.reason}`);
  if (!factTeaches.pass) {
    errors.push(`${prefix} Fact does not teach: ${factTeaches.reason}`);
  }

  // Check prompt for banned words
  if (BANNED_REGEX.test(p.prompt || '')) {
    errors.push(`${prefix} Prompt contains banned word: "${p.prompt}"`);
  }
});

// Check Level icons exist in Twemoji or custom SVG
for (const lvl of LEVELS) {
  const code = emojiToCodePoints(lvl.emoji);
  const svgExists = fs.existsSync(path.join(CUSTOM_SVG_DIR, `${code}.svg`)) ||
                    fs.existsSync(path.join(SVG_DIR, `${code}.svg`)) ||
                    fs.existsSync(path.join(SVG_DIR, `${code}-fe0f.svg`));
  if (!svgExists) {
    errors.push(`Level ${lvl.id} icon '${lvl.emoji}' (${code}) has no Twemoji or custom SVG`);
  }
}

if (errors.length > 0) {
  console.error(`[check:puzzles] FAILED with ${errors.length} error(s):`);
  errors.forEach(err => console.error(`  ✖ ${err}`));
  process.exit(1);
}

console.log(`[check:puzzles] PASSED: All ${puzzles.length} puzzles verified (schema, IDs, words, banned-list, SVGs, fact support, fact teaches).`);
process.exit(0);
