import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { normalizeText, getExcludedTerms } from './checkSources.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const cluesPath = path.resolve(__dirname, '../../data/clues.json');
const countriesPath = path.resolve(__dirname, '../../data/countries.json');
const cachePath = path.resolve(__dirname, '../../.cache/sources.json');
const reportPath = path.resolve(__dirname, '../../../report/content/claims_fail.txt');

export const STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'from', 'that', 'this', 'into', 'under', 'over', 'its', 'has', 'had', 'have',
  'been', 'was', 'were', 'are', 'is', 'who', 'which', 'where', 'when', 'why', 'how', 'whose', 'their', 'theirs',
  'there', 'they', 'them', 'then', 'than', 'about', 'above', 'after', 'again', 'against', 'all', 'any', 'both',
  'but', 'by', 'can', 'could', 'did', 'does', 'doing', 'down', 'during', 'each', 'few', 'further', 'having',
  'here', 'more', 'most', 'off', 'once', 'only', 'other', 'our', 'ours', 'out', 'same', 'should', 'some', 'such',
  'through', 'too', 'until', 'very', 'while', 'will', 'would', 'also', 'between', 'across', 'among', 'near',
  'known', 'famous', 'home', 'boasts', 'features', 'celebrated', 'renowned', 'world', 'global', 'national',
  'since', 'along', 'around', 'serving', 'served', 'major', 'large', 'largest', 'small', 'smallest',
  'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'
]);

export const KNOWN_PROPER_NAMES = new Set([
  'fuji', 'inari', 'taisha', 'nara', 'shinkansen', 'kyoto', 'tokyo', 'osaka', 'hokkaido',
  'giza', 'sphinx', 'pyramids', 'pyramid', 'nile', 'luxor', 'karnak', 'aswan',
  'waitomo', 'caves', 'auckland', 'rotorua', 'milford', 'sound', 'maori',
  'zuma', 'rock', 'niger', 'benue', 'lagos', 'abuja', 'kofar', 'mata', 'osun', 'osogbo',
  'angkor', 'wat', 'mekong', 'tonle', 'sap', 'phnom', 'penh',
  'machu', 'picchu', 'cuzco', 'andes', 'titicaca', 'lima', 'nazca',
  'table', 'mountain', 'kruger', 'drakensberg', 'cape', 'town', 'johannesburg', 'robben', 'island',
  'galapagos', 'quito', 'cotopaxi', 'guayaquil',
  'pampas', 'patagonia', 'aconcagua', 'buenos', 'aires', 'iguazu',
  'everest', 'himalayas', 'kathmandu', 'annapurna', 'pokhara',
  'banff', 'rockies', 'niagara', 'toronto', 'montreal', 'quebec', 'vancouver',
  'taj', 'mahal', 'ganges', 'himalaya', 'varanasi', 'delhi', 'mumbai', 'jaipur',
  'shinto', 'buddhist', 'buddhism', 'hindu', 'hinduism', 'islam', 'christian', 'jewish',
  'unesco', 'nobel', 'olympic', 'fifa', 'g20', 'un', 'nasa', 'esa', 'jaxa', 'slim',
  'things', 'fall', 'apart', 'chinua', 'achebe', 'wole', 'soyinka', 'fela', 'kuti', 'tobi', 'amusan',
  'tango', 'bossa', 'nova', 'capoeira', 'samba', 'reggae', 'mariachi', 'flamenco', 'fado',
  'gaucho', 'mapuche', 'inuit', 'zulu', 'yoruba', 'igbo', 'hausa', 'berber', 'bedouin', 'tuareg',
  'hangul', 'goryeo', 'joseon', 'seoul', 'busan', 'jeju',
  'persian', 'gulf', 'arabian', 'dubai', 'abu', 'dhabi', 'burj', 'khalifa',
  'calabar', 'carnival', 'afrika', 'shrine', 'suya', 'trapelacucha',
  'ad', 'bc', 'bce', 'ce', 'zen', 'kanji', 'lacrosse', 'ice', 'hockey', 'inuksuk', 'maasai',
  'adumu', 'uefa', 'euro', 'qhapaq', 'nan', 'inca', 'viti', 'levu', 'vanua', 'tanoa', 'yaqona',
  'bosphorus', 'istanbul', 'arachnocampa', 'first', 'nations', 'birchbark', 'machakos', 'akamba', 'eland',
  'gaudi', 'sagrada', 'familia', 'sejong', 'king', 'colosseum', 'florence', 'renaissance', 'neapolitan',
  'venetian', 'holi', 'navratri', 'uluru', 'aboriginal', 'dreaming', 'dreamtime', 'rosetta', 'memphis',
  'springboks', 'pato', 'piazzolla', 'olduvai', 'gorge', 'ngorongoro', 'serengeti', 'zanzibar',
  'kilimanjaro', 'tanganyika', 'victoria', 'baikal', 'hermitage', 'kremlin', 'bolshoi', 'red', 'square',
  'louvre', 'versailles', 'eiffel', 'notre', 'dame', 'carnaval', 'copacabana', 'maracana', 'cristo', 'redentor',
  'amazon', 'pantanal', 'cervantes', 'don', 'quixote', 'prado', 'alhambra', 'acropolis', 'parthenon',
  'olympia', 'delphi', 'santorini', 'meteora', 'plato', 'aristotle', 'socrates', 'matterhorn', 'alps',
  'geneva', 'zurich', 'cern', 'red', 'cross', 'wat', 'arun', 'wat', 'pho', 'ayutthaya', 'chao', 'phraya',
  'muay', 'thai', 'songkran', 'chiang', 'mai', 'great', 'barrier', 'reef', 'sydney', 'opera', 'house',
  'habana', 'vieja', 'varadero', 'malecón', 'che', 'guevara', 'marti', 'rhine', 'danube', 'berlin',
  'wall', 'brandenburg', 'gate', 'beethoven', 'bach', 'goethe', 'oktoberfest', 'neuschwanstein', 'sahara',
  'atlas', 'marrakech', 'fez', 'casablanca', 'medina', 'souk', 'habous', 'majorelle', 'tagine', 'couscous',
  'arches', 'grand', 'canyon', 'yellowstone', 'yosemite', 'statue', 'liberty', 'broadway', 'hollywood',
  'great', 'wall', 'forbidden', 'city', 'terracotta', 'army', 'yangtze', 'yellow', 'river', 'silk', 'road',
  'confucius', 'shanghai', 'beijing', 'han', 'tang', 'ming', 'qing', 'capitol', 'smithsonian', 'route',
  'drake', 'passage', 'appalachian', 'trail', 'grand', 'canal', 'stonehenge', 'edinburgh', 'castle',
  'mount', 'lake', 'saint', 'st', 'al', 'el', 'san', 'santa', 'old'
]);

export const STARTER_WORDS = new Set([
  'the', 'a', 'an', 'in', 'on', 'at', 'by', 'for', 'with', 'during', 'inside', 'outside',
  'ancient', 'historic', 'prehistoric', 'traditional', 'features', 'operating', 'extending',
  'celebrated', 'renowned', 'famous', 'known'
]);

export const COMMON_WORDS = new Set([
  'have', 'been', 'has', 'had', 'was', 'were', 'is', 'are', 'begin', 'often',
  'frequently', 'dramatically', 'eleven', 'including', 'makes', 'with', 'over',
  'across', 'under', 'through', 'featuring', 'direct', 'locally', 'decorated',
  'sculpted', 'spans', 'rise', 'living', 'dating', 'serving', 'holding', 'held',
  'center', 'holiday', 'sugar', 'wrestling', 'cradle', 'native', 'potatoes',
  'glacial', 'pine', 'mornings', 'homes', 'downtown', 'erupting', 'introduced',
  'chocolate', 'vanilla', 'birds', 'flightless', 'long', 'quarters', 'vats',
  'noodle', 'fresh', 'attire', 'pork', 'belly', 'leaves', 'chili', 'paste',
  'clogs', 'mild', 'human', 'historical', 'medieval', 'sweet', 'marathon',
  'champions', 'pastoralist', 'communities', 'mobile', 'money', 'smooth',
  'milk', 'daily', 'social', 'metal', 'book', 'guitar', 'evenings', 'genres',
  'aerospace', 'lunar', 'paper', 'making', 'theater', 'performed', 'rich',
  'spicy', 'curved', 'glass', 'stone', 'carved', 'subterranean', 'boiling',
  'renewable', 'abundant', 'savory', 'tender', 'fragrant', 'autumnal', 'honoring',
  'ancestors', 'decorative', 'marigold', 'pathways', 'brass', 'hand', 'pressed',
  'corn', 'tortilla', 'tacos', 'tragedy', 'fundamental', 'philosophical', 'inquiry',
  'whitewashed', 'cliffside', 'chapels', 'blue', 'domes', 'outdoor', 'wood', 'barbecue',
  'feasts', 'cured', 'dried', 'meat', 'snacks', 'multi', 'party', 'government', 'unity',
  'pivotal', 'elections', 'flat', 'topped', 'distinct', 'official', 'posture', 'dances',
  'intricate', 'nocturnal', 'beaks', 'fiord', 'sounds', 'earth', 'oven', 'banquets',
  'labyrinthine', 'walled', 'leather', 'tanning', 'spice', 'souks', 'houses', 'staircases',
  'washed', 'shades', 'conical', 'cooking', 'slow', 'simmered', 'golden', 'crust',
  'delicate', 'steamed', 'dumplings', 'bamboo', 'baskets', 'fluffy', 'puffed', 'bread',
  'aromatic', 'lentil', 'curry', 'piping', 'broth', 'crafts', 'forests', 'baguettes',
  'croissants', 'meditation', 'traditions', 'lifestyle', 'folklore', 'textiles',
  'shrines', 'civilization', 'hieroglyphs', 'writing', 'arid', 'fertile', 'banks',
  'streets', 'monuments', 'sculptures', 'clay', 'agricultural', 'most', 'highest',
  'reed', 'cheese', 'fire', 'thousands', 'pioneering', 'hosts', 'hosted', 'welcomes',
  'welcomed', 'classical', 'physicist', 'coastal', 'islands', 'island', 'dunes',
  'volcanic', 'volcano', 'sanctuary', 'biodiversity', 'wildlife', 'canyon', 'canyons',
  'desert', 'valleys', 'valley', 'mountain', 'mountains', 'hall', 'halls', 'fortress',
  'castle', 'statue', 'statues', 'temple', 'temples', 'ruins', 'ancient', 'historic',
  'prehistoric', 'centuries', 'century', 'dynasty', 'empire', 'kingdom', 'parade',
  'carnival', 'spectacular', 'flotilla', 'stadium', 'stadiums', 'championship',
  'tournament', 'matches', 'games', 'game', 'sport', 'sports', 'football', 'rugby',
  'cricket', 'hockey', 'athletics', 'athletes', 'runner', 'runners', 'endurance',
  'gold', 'silver', 'bronze', 'medal', 'medals', 'record', 'records', 'winner',
  'winners', 'title', 'titles', 'victories', 'victory', 'underdogs', 'squad',
  'squads', 'national', 'world', 'global', 'continental', 'regional', 'international',
  'monolithic', 'inselberg', 'granite', 'sandstone', 'caldera', 'crater', 'basin',
  'peninsula', 'archipelago', 'channel', 'strait', 'river', 'rivers', 'lake', 'lakes',
  'sea', 'seas', 'ocean', 'oceans', 'stream', 'streams', 'canal', 'canals', 'waterfall',
  'waterfalls', 'falls', 'reef', 'reefs', 'atoll', 'atolls', 'plateau', 'tableland',
  'highland', 'highlands', 'lowland', 'lowlands', 'plain', 'plains', 'grassland',
  'grasslands', 'savanna', 'steppe', 'tundra', 'rainforest', 'jungle', 'wetland',
  'wetlands', 'swamp', 'marsh', 'delta', 'estuary', 'fjord', 'glacier', 'glaciers',
  'iceberg', 'ice', 'snow', 'frost', 'polar', 'equatorial', 'tropical', 'temperate',
  'monsoon', 'trade', 'winds', 'current', 'currents', 'tide', 'tides', 'climate',
  'weather', 'flora', 'fauna', 'endemic', 'species', 'reserve', 'reserves', 'park',
  'parks', 'habitat', 'ecosystem', 'biome', 'wilderness', 'pizza', 'coffee', 'safety'
]);

export function extractEntitiesAndClauses(clue, country) {
  const excluded = getExcludedTerms(country);
  // Split clue text into clauses by punctuation: commas (not between digits), semicolons, colons, em/en-dashes (not between digits)
  const rawClauses = clue.text.split(/(?<!\d),(?!\d)|[;:]|(?<!\d)[—–](?!\d)|\.\s+/).map(c => c.trim()).filter(Boolean);

  // Merge any clause that has no content words (e.g. "In 2024,") with the next clause
  const mergedClauses = [];
  for (let i = 0; i < rawClauses.length; i++) {
    let cur = rawClauses[i];
    while (i + 1 < rawClauses.length) {
      const tokens = cur.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
      const cws = tokens.filter(t => t.length >= 3 && !STOPWORDS.has(t) && !excluded.has(t) && !/^\d+$/.test(t) && t !== 'bce' && t !== 'ce');
      if (cws.length === 0 || tokens.length <= 2) {
        cur = cur + ', ' + rawClauses[i + 1];
        i++;
      } else {
        break;
      }
    }
    mergedClauses.push(cur);
  }

  if (mergedClauses.length > 1) {
    const last = mergedClauses[mergedClauses.length - 1];
    const tokens = last.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
    const cws = tokens.filter(t => t.length >= 3 && !STOPWORDS.has(t) && !excluded.has(t) && !/^\d+$/.test(t) && t !== 'bce' && t !== 'ce');
    if (cws.length === 0) {
      mergedClauses[mergedClauses.length - 2] += ', ' + mergedClauses.pop();
    }
  }

  const clauseData = [];

  for (let cIdx = 0; cIdx < mergedClauses.length; cIdx++) {
    const clause = mergedClauses[cIdx];
    const years = [];
    const numUnits = [];
    const properNouns = [];

    // 1. Years: 1000-2026, or BCE/BC/CE/AD
    const yearMatches = clause.match(/\b(1\d{3}|20[0-2]\d)\b/g) || [];
    for (const y of yearMatches) {
      years.push(y);
    }
    const adBcYears = clause.match(/\b(?:AD|BC|BCE|CE)\s*(\d{1,4})\b|\b(\d{1,4})\s*(?:AD|BC|BCE|CE)\b/gi) || [];
    for (const y of adBcYears) {
      years.push(y.trim());
    }

    // 2. Number + unit
    const numUnitRegex = /\b(\d+(?:[.,]\d+)?)\s*(meters?|metres?|m|km|kilometers?|kilometres?|feet|ft|miles?|mi|percent|%|square\s+km|sq\s+km|hectares?|acres?|islands?|inhabitants?|people|million|billion|thousand|hundred|years?|centuries|century|days?|hours?|minutes?|seconds?|degrees?)\b/gi;
    let m;
    while ((m = numUnitRegex.exec(clause)) !== null) {
      numUnits.push(m[0]);
    }
    const wordNumRegex = /\b(?:one|two|three|four|five|six|seven|eight|nine|ten|a|an)\s+(?:minute|minutes|hour|hours|day|days|year|years|century|centuries|meter|meters|metre|metres|kilometer|kilometers|kilometre|kilometres|island|islands)\b/gi;
    while ((m = wordNumRegex.exec(clause)) !== null) {
      numUnits.push(m[0]);
    }
    // Standalone numbers
    const standaloneNums = clause.match(/\b\d+(?:[.,]\d+)?\b/g) || [];
    for (const num of standaloneNums) {
      if (!years.some(y => y.includes(num)) && !numUnits.some(nu => nu.includes(num))) {
        numUnits.push(num);
      }
    }

    // 3. Proper nouns
    const words = clause.split(/\s+/);
    for (let i = 0; i < words.length; i++) {
      const clean = words[i].replace(/^[“"'(\[]+|[.,;:()'\]"?!]+$/g, '');
      if (/^[A-ZÀ-ÿ][a-zà-ÿ]+$/.test(clean)) {
        const norm = normalizeText(clean);

        // Multi-word proper nouns (e.g. Olduvai Gorge, Sagrada Família, Zuma Rock, Mount Fuji)
        if (i + 1 < words.length) {
          const nextClean = words[i + 1].replace(/^[“"'(\[]+|[.,;:()'\]"?!]+$/g, '');
          if (/^[A-ZÀ-ÿ][a-zà-ÿ]+$/.test(nextClean)) {
            const nextNorm = normalizeText(nextClean);
            // Check if sentence/clause beginning is not a known proper name, or common word
            if ((i === 0 && !KNOWN_PROPER_NAMES.has(norm)) || COMMON_WORDS.has(norm) || COMMON_WORDS.has(nextNorm)) {
              // do not merge common word into multi-word proper noun
            } else {
              const multi = clean + ' ' + nextClean;
              const normMulti = normalizeText(multi);
              if (!excluded.has(normMulti)) {
                properNouns.push(multi);
                i++; // consume next word
                continue;
              }
            }
          }
        }

        // Clause/sentence initial word: only consider proper noun if it's in known proper names list
        if (i === 0) {
          if (!KNOWN_PROPER_NAMES.has(norm)) {
            continue;
          }
        }

        if (!excluded.has(norm) && !STOPWORDS.has(norm) && !COMMON_WORDS.has(norm)) {
          properNouns.push(clean);
        }
      }
    }

    // Deduplicate entities
    const allEntities = [...new Set([...years, ...numUnits, ...properNouns])];

    // Compute content words of this clause
    const clauseTokens = clause.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
    const contentWords = clauseTokens.filter(t => {
      if (t.length < 3) return false;
      if (STOPWORDS.has(t)) return false;
      if (excluded.has(t)) return false;
      if (allEntities.some(e => normalizeText(e).includes(t))) return false;
      return true;
    });

    clauseData.push({
      clause,
      entities: allEntities,
      contentWords
    });
  }

  return clauseData;
}

export function validateClueClaims(clue, country, pageText) {
  const normPage = normalizeText(pageText || '');
  if (!normPage) {
    return [{ entity: 'PAGE_EMPTY', reason: 'Source page text is missing or unreachable' }];
  }

  // Split page into sentences on . ! ? newline and multi-space block boundaries (protecting decimal numbers like 1.8 or 12.12)
  const rawSentences = pageText.split(/(?<!\d)\.(?!\d)|[!?\n]+|\s{8,}/).map(s => s.trim()).filter(Boolean);
  const normSentences = rawSentences.map(s => normalizeText(s));
  const dehyphenSentences = normSentences.map(s => s.replace(/(?<!\d)[-—–]|[-—–](?!\d)/g, ' '));

  const clauses = extractEntitiesAndClauses(clue, country);
  const failures = [];

  for (const { clause, entities, contentWords } of clauses) {
    for (const ent of entities) {
      const normEnt = normalizeText(ent);
      if (!normEnt) continue;
      const normEntDehyphen = normEnt.replace(/(?<!\d)[-—–]|[-—–](?!\d)/g, ' ');

      // Find sentences containing the entity
      const matchingIndices = [];
      for (let i = 0; i < normSentences.length; i++) {
        if (normSentences[i].includes(normEnt) || dehyphenSentences[i].includes(normEntDehyphen)) {
          matchingIndices.push(i);
        }
      }
      const matchingSentences = matchingIndices.map(i => normSentences[i]);
      if (matchingSentences.length === 0) {
        failures.push({
          entity: ent,
          clause,
          reason: `Entity "${ent}" not found anywhere in source page sentences`
        });
        continue;
      }

      // Check if at least one matching sentence contains >= 1 other content word of the clause
      let hasContentMatch = matchingSentences.some(s =>
        contentWords.some(cw => s.includes(cw))
      );

      // If entity is a multi-word proper name (e.g. "Wole Soyinka") and full string didn't have content match,
      // try matching by surname / head noun (e.g. "Soyinka")
      if (!hasContentMatch && ent.includes(' ')) {
        const parts = ent.split(/\s+/);
        const surname = normalizeText(parts[parts.length - 1]);
        if (surname.length >= 3 && !STOPWORDS.has(surname) && !excludedTermsHas(country, surname)) {
          const surnameSentences = normSentences.filter(s => s.includes(surname));
          if (surnameSentences.some(s => contentWords.some(cw => s.includes(cw)))) {
            hasContentMatch = true;
          }
        }
      }

      if (!hasContentMatch) {
        failures.push({
          entity: ent,
          clause,
          reason: `Entity "${ent}" found in ${matchingSentences.length} page sentence(s), but none contains any content word from clause: [${contentWords.join(', ')}]`
        });
      }
    }
  }

  return failures;
}

function excludedTermsHas(country, term) {
  const excluded = getExcludedTerms(country);
  return excluded.has(term);
}

// CLI Execution
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const clues = JSON.parse(fs.readFileSync(cluesPath, 'utf8'));
  const countries = JSON.parse(fs.readFileSync(countriesPath, 'utf8'));
  const countryByIso = new Map(countries.map(c => [c.code, c]));
  const cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));

  const args = process.argv.slice(2);
  const tierArg = args.find(a => a.startsWith('--tier='));
  const targetTier = tierArg ? tierArg.split('=')[1].toLowerCase() : null;

  console.log(`[check:claims] Validating claims against source page sentences...`);
  if (targetTier) console.log(`[check:claims] Filtering to tier: ${targetTier}`);

  let easyFailures = 0;
  let mediumFailures = 0;
  let hardFailures = 0;

  const failureLog = [];

  for (const clue of clues) {
    const country = countryByIso.get(clue.iso);
    const tier = country ? country.tier : 'unknown';

    if (targetTier && tier !== targetTier) {
      continue;
    }

    const pageText = cache[clue.source]?.pageText || '';
    const failures = validateClueClaims(clue, country, pageText);

    if (failures.length > 0) {
      if (tier === 'easy') easyFailures++;
      else if (tier === 'medium') mediumFailures++;
      else if (tier === 'hard') hardFailures++;

      for (const f of failures) {
        failureLog.push(`${clue.id} [${tier}] | ${f.entity} | ${f.reason} | Clause: "${f.clause}"`);
      }
    }
  }

  // Ensure report directory exists
  const reportDir = path.dirname(reportPath);
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  fs.writeFileSync(reportPath, failureLog.join('\n'), 'utf8');

  console.log(`[check:claims] Results:`);
  console.log(`  Easy failures:   ${easyFailures}`);
  console.log(`  Medium failures: ${mediumFailures} (informational)`);
  console.log(`  Hard failures:   ${hardFailures} (informational)`);
  console.log(`  Total failures:  ${easyFailures + mediumFailures + hardFailures}`);
  console.log(`  Saved detailed failure log to: ${reportPath}`);

  if (targetTier === 'easy' && easyFailures > 0) {
    console.error(`[check:claims] FAILED: ${easyFailures} Easy tier claims failed verification.`);
    process.exit(1);
  } else if (!targetTier && easyFailures > 0) {
    console.error(`[check:claims] FAILED: ${easyFailures} Easy tier claims failed verification.`);
    process.exit(1);
  } else {
    console.log(`[check:claims] PASS: All evaluated Easy claims verified successfully.`);
    process.exit(0);
  }
}
