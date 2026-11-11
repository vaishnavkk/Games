import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { validateItemSync, verifySourceUrl } from './clueTool.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const cluesPath = path.resolve(__dirname, '../data/clues.json');
const cluesJsPath = path.resolve(__dirname, '../data/clues.js');
const existingClues = JSON.parse(fs.readFileSync(cluesPath, 'utf8'));

export const chunk2Items = [
  // ── 1. Iceland (ISL) ───────────────────────────────────────────────────────
  {
    id: 'ISL-1-002', iso: 'ISL', level: 1, topic: 'parliament', kind: 'history',
    text: 'The Althing parliamentary assembly first convened outdoors at Thingvellir in 930 as one of the earliest democratic bodies in history.',
    source: 'https://en.wikipedia.org/wiki/Althing', evidence: ['althing', 'thingvellir'], checked: '2026-11-11'
  },
  {
    id: 'ISL-1-003', iso: 'ISL', level: 1, topic: 'horse', kind: 'culture',
    text: 'Unique breed of five-gaited horses preserved purebred since ancient settlement, renowned for their smooth flying pace and sturdy endurance.',
    source: 'https://en.wikipedia.org/wiki/Icelandic_horse', evidence: ['gaited', 'horses'], checked: '2026-11-11'
  },
  {
    id: 'ISL-1-004', iso: 'ISL', level: 1, topic: 'folklore', kind: 'culture',
    text: 'Centuries-old folk tradition respecting hidden folk living within mossy volcanic rocks, sometimes prompting civil builders to alter highway paths.',
    source: 'https://en.wikipedia.org/wiki/Hulduf%C3%B3lk', evidence: ['hidden', 'rocks'], checked: '2026-11-11'
  },
  {
    id: 'ISL-1-005', iso: 'ISL', level: 1, topic: 'cuisine', kind: 'culture',
    text: 'Culinary heritage featuring fermented shark cured underground for months, traditionally enjoyed during midwinter feasts with hearty flatbread.',
    source: 'https://en.wikipedia.org/wiki/H%C3%A1karl', evidence: ['shark', 'fermented'], checked: '2026-11-11'
  },
  {
    id: 'ISL-2-002', iso: 'ISL', level: 2, topic: 'waterfall', kind: 'record',
    text: 'Dettifoss waterfall roars with immense hydraulic energy across vast canyons, widely considered one of the most powerful cascades.',
    source: 'https://en.wikipedia.org/wiki/Dettifoss', evidence: ['dettifoss', 'waterfall'], checked: '2026-11-11'
  },
  {
    id: 'ISL-2-003', iso: 'ISL', level: 2, topic: 'rift', kind: 'history',
    text: 'The crystal-clear waters of the Silfra fissure offer divers extraordinary visibility between slowly drifting continental tectonic plates.',
    source: 'https://en.wikipedia.org/wiki/Silfra', evidence: ['silfra', 'plates'], checked: '2026-11-11'
  },
  {
    id: 'ISL-2-004', iso: 'ISL', level: 2, topic: 'literature', kind: 'history',
    text: 'Author Halldor Laxness earned the Nobel Prize in Literature in 1955 for powerful epic storytelling reflecting national heritage and resilience.',
    source: 'https://en.wikipedia.org/wiki/Halld%C3%B3r_Laxness', evidence: ['laxness', 'literature'], checked: '2026-11-11'
  },
  {
    id: 'ISL-2-005', iso: 'ISL', level: 2, topic: 'church', kind: 'history',
    text: 'Hallgrimskirkja sanctuary stands tall with dramatic stepped concrete wings inspired by natural basalt columns and cooling volcanic lava flows.',
    source: 'https://en.wikipedia.org/wiki/Hallgr%C3%ADmskirkja', evidence: ['basalt', 'columns'], checked: '2026-11-11'
  },
  {
    id: 'ISL-3-002', iso: 'ISL', level: 3, topic: 'geyser', kind: 'record',
    text: 'The famous natural fountain Strokkur erupts reliably every few minutes, blasting steaming boiling water tens of meters into the sky.',
    source: 'https://en.wikipedia.org/wiki/Strokkur', evidence: ['strokkur', 'erupts'], checked: '2026-11-11'
  },
  {
    id: 'ISL-3-003', iso: 'ISL', level: 3, topic: 'beach', kind: 'culture',
    text: 'Reynisfjara shoreline features dramatic towering basalt columns and crashing white foam against pitch-black volcanic sand.',
    source: 'https://en.wikipedia.org/wiki/Reynisfjara', evidence: ['reynisfjara', 'basalt'], checked: '2026-11-11'
  },
  {
    id: 'ISL-3-004', iso: 'ISL', level: 3, topic: 'volcano', kind: 'incident', year: 2010,
    text: 'In 2010, the explosive eruption of Eyjafjallajokull created massive ash clouds that grounded commercial air travel across international airspace.',
    source: 'https://en.wikipedia.org/wiki/2010_eruptions_of_Eyjafjallaj%C3%B6kull', evidence: ['ash', 'airspace'], checked: '2026-11-11'
  },
  {
    id: 'ISL-3-005', iso: 'ISL', level: 3, topic: 'football', kind: 'current', year: 2016,
    text: 'In 2016, the national football squad captivated global fans with an underdog tournament run and their thunderous rhythmic thunderclap chant.',
    source: 'https://en.wikipedia.org/wiki/Viking_clap', evidence: ['thunderclap', 'chant'], checked: '2026-11-11'
  },

  // ── 2. Mexico (MEX) ────────────────────────────────────────────────────────
  {
    id: 'MEX-1-002', iso: 'MEX', level: 1, topic: 'pyramid', kind: 'history',
    text: 'Ancient stone city of Teotihuacan features the monumental Pyramid of the Sun aligned precisely along the Avenue of the Dead.',
    source: 'https://en.wikipedia.org/wiki/Teotihuacan', evidence: ['teotihuacan', 'pyramid'], checked: '2026-11-11'
  },
  {
    id: 'MEX-1-003', iso: 'MEX', level: 1, topic: 'art', kind: 'culture',
    text: 'Celebrated for colorful alebrijes folk sculptures depicting fantastical chimeric creatures carved from copal wood and decorated with intricate motifs.',
    source: 'https://en.wikipedia.org/wiki/Alebrije', evidence: ['alebrijes', 'copal'], checked: '2026-11-11'
  },
  {
    id: 'MEX-1-004', iso: 'MEX', level: 1, topic: 'music', kind: 'culture',
    text: 'Traditional son jarocho musical style combines stringed jarana instruments with percussive wooden platform dancing known as zapateado.',
    source: 'https://en.wikipedia.org/wiki/Son_jarocho', evidence: ['jarocho', 'jarana'], checked: '2026-11-11'
  },
  {
    id: 'MEX-1-005', iso: 'MEX', level: 1, topic: 'agriculture', kind: 'history',
    text: 'Ancient chinampa agricultural method created fertile floating garden plots upon shallow lakebeds to cultivate bountiful crops without soil depletion.',
    source: 'https://en.wikipedia.org/wiki/Chinampa', evidence: ['chinampa', 'floating'], checked: '2026-11-11'
  },
  {
    id: 'MEX-2-002', iso: 'MEX', level: 2, topic: 'cenote', kind: 'history',
    text: 'Natural limestone sinkholes filled with clear freshwater served as sacred ritual sites and essential water reservoirs for ancient civilizations.',
    source: 'https://en.wikipedia.org/wiki/Cenote', evidence: ['cenote', 'sinkhole'], checked: '2026-11-11'
  },
  {
    id: 'MEX-2-003', iso: 'MEX', level: 2, topic: 'painting', kind: 'history',
    text: 'Painter Frida Kahlo created world-renowned self-portraits exploring identity and pain from her vibrant cobalt-walled home known as the Blue House.',
    source: 'https://en.wikipedia.org/wiki/Frida_Kahlo', evidence: ['kahlo', 'portraits'], checked: '2026-11-11'
  },
  {
    id: 'MEX-2-004', iso: 'MEX', level: 2, topic: 'observatory', kind: 'history',
    text: 'El Caracol structure at Chichen Itza functioned as an ancient astronomical observatory tracking celestial cycles of the planet Venus.',
    source: 'https://en.wikipedia.org/wiki/El_Caracol,_Chichen_Itza', evidence: ['caracol', 'venus'], checked: '2026-11-11'
  },
  {
    id: 'MEX-2-005', iso: 'MEX', level: 2, topic: 'silver', kind: 'history',
    text: 'Taxco flourished into a historic silver-crafting center where artisans continue shaping exquisite handcrafted jewelry and ornamental metalwork.',
    source: 'https://en.wikipedia.org/wiki/Taxco', evidence: ['taxco', 'silver'], checked: '2026-11-11'
  },
  {
    id: 'MEX-3-002', iso: 'MEX', level: 3, topic: 'gastronomy', kind: 'culture',
    text: 'Famous for complex rich mole sauces blended from dried chili peppers, savory spices, seeds, and unsweetened dark cacao.',
    source: 'https://en.wikipedia.org/wiki/Mole_(sauce)', evidence: ['mole', 'chili'], checked: '2026-11-11'
  },
  {
    id: 'MEX-3-003', iso: 'MEX', level: 3, topic: 'temple', kind: 'history',
    text: 'The step-pyramid of Kukulkan at Chichen Itza creates a famous shadow illusion resembling a slithering serpent during equinoxes.',
    source: 'https://en.wikipedia.org/wiki/El_Castillo,_Chichen_Itza', evidence: ['kukulkan', 'serpent'], checked: '2026-11-11'
  },
  {
    id: 'MEX-3-004', iso: 'MEX', level: 3, topic: 'heritage', kind: 'current', year: 2010,
    text: 'In 2010, the ancestral national cuisine received formal inscription on the UNESCO Intangible Cultural Heritage list for its ancient cooking methods.',
    source: 'https://en.wikipedia.org/wiki/Mexican_cuisine', evidence: ['unesco', 'intangible'], checked: '2026-11-11'
  },
  {
    id: 'MEX-3-005', iso: 'MEX', level: 3, topic: 'cinema', kind: 'current', year: 2018,
    text: 'In 2018, director Alfonso Cuaron earned worldwide acclaim and three major cinematic Academy Awards for his intimate personal masterpiece Roma.',
    source: 'https://en.wikipedia.org/wiki/Roma_(2018_film)', evidence: ['roma', 'academy'], checked: '2026-11-11'
  },

  // ── 3. Norway (NOR) ────────────────────────────────────────────────────────
  {
    id: 'NOR-1-002', iso: 'NOR', level: 1, topic: 'stave church', kind: 'history',
    text: 'Centuries-old wooden stave churches constructed with intricate timber framework, carved dragon heads, and medieval runic inscriptions.',
    source: 'https://en.wikipedia.org/wiki/Stave_church', evidence: ['stave', 'timber'], checked: '2026-11-11'
  },
  {
    id: 'NOR-1-003', iso: 'NOR', level: 1, topic: 'folklore', kind: 'culture',
    text: 'Rich folklore traditions tell of giant woodland trolls inhabiting deep evergreen forests and turning to stone when exposed to sunlight.',
    source: 'https://en.wikipedia.org/wiki/Troll', evidence: ['troll', 'stone'], checked: '2026-11-11'
  },
  {
    id: 'NOR-1-004', iso: 'NOR', level: 1, topic: 'ship', kind: 'history',
    text: 'The Oseberg ship burial unearthed an exquisitely preserved ninth-century wooden vessel filled with elaborate carvings and textile artifacts.',
    source: 'https://en.wikipedia.org/wiki/Oseberg_Ship', evidence: ['oseberg', 'vessel'], checked: '2026-11-11'
  },
  {
    id: 'NOR-1-005', iso: 'NOR', level: 1, topic: 'costume', kind: 'culture',
    text: 'Traditional folk costumes known as bunad feature distinct regional wool embroidery patterns and silver jewelry worn during national celebrations.',
    source: 'https://en.wikipedia.org/wiki/Bunad', evidence: ['bunad', 'embroidery'], checked: '2026-11-11'
  },
  {
    id: 'NOR-2-002', iso: 'NOR', level: 2, topic: 'painting', kind: 'history',
    text: 'Expressionist painter Edvard Munch captured existential human anxiety in his iconic masterpiece depicting an agonizing figure under an orange sky.',
    source: 'https://en.wikipedia.org/wiki/The_Scream', evidence: ['munch', 'scream'], checked: '2026-11-11'
  },
  {
    id: 'NOR-2-003', iso: 'NOR', level: 2, topic: 'exploration', kind: 'history',
    text: 'Explorer Roald Amundsen led the historic 1911 polar expedition that first successfully reached the terrestrial pole using sled dogs.',
    source: 'https://en.wikipedia.org/wiki/Roald_Amundsen', evidence: ['amundsen', 'expedition'], checked: '2026-11-11'
  },
  {
    id: 'NOR-2-004', iso: 'NOR', level: 2, topic: 'seed vault', kind: 'record',
    text: 'Constructed a secure global seed vault deep within permafrost mountain rock to safeguard world crop biodiversity against catastrophic loss.',
    source: 'https://en.wikipedia.org/wiki/Svalbard_Global_Seed_Vault', evidence: ['seed', 'permafrost'], checked: '2026-11-11'
  },
  {
    id: 'NOR-2-005', iso: 'NOR', level: 2, topic: 'theatre', kind: 'history',
    text: 'Playwright Henrik Ibsen pioneered modern realistic drama through celebrated theatrical works examining social conventions and individual autonomy.',
    source: 'https://en.wikipedia.org/wiki/Henrik_Ibsen', evidence: ['ibsen', 'playwright'], checked: '2026-11-11'
  },
  {
    id: 'NOR-3-002', iso: 'NOR', level: 3, topic: 'cliff', kind: 'landmark',
    text: 'Preikestolen stands as a massive flat-topped cliff rising hundreds of meters vertically above a deep glacier-carved saltwater inlet.',
    source: 'https://en.wikipedia.org/wiki/Preikestolen', evidence: ['preikestolen', 'cliff'], checked: '2026-11-11'
  },
  {
    id: 'NOR-3-003', iso: 'NOR', level: 3, topic: 'peace prize', kind: 'history',
    text: 'Hosts the annual presentation of the prestigious Nobel Peace Prize honoring individuals and organizations dedicated to international harmony.',
    source: 'https://en.wikipedia.org/wiki/Nobel_Peace_Prize', evidence: ['nobel', 'peace'], checked: '2026-11-11'
  },
  {
    id: 'NOR-3-004', iso: 'NOR', level: 3, topic: 'winter sports', kind: 'current', year: 2022,
    text: 'In 2022, winter athletes set an all-time record by capturing sixteen gold medals at a single Olympic Winter Games tournament.',
    source: 'https://en.wikipedia.org/wiki/Norway_at_the_2022_Winter_Olympics', evidence: ['olympic', 'gold'], checked: '2026-11-11'
  },
  {
    id: 'NOR-3-005', iso: 'NOR', level: 3, topic: 'chess', kind: 'current', year: 2013,
    text: 'In 2013, grandmaster Magnus Carlsen captured the World Chess Championship title, launching an unprecedented era of tactical chess dominance.',
    source: 'https://en.wikipedia.org/wiki/Magnus_Carlsen', evidence: ['carlsen', 'chess'], checked: '2026-11-11'
  },

  // ── 4. Greece (GRC) ────────────────────────────────────────────────────────
  {
    id: 'GRC-1-002', iso: 'GRC', level: 1, topic: 'games', kind: 'history',
    text: 'Ancient sanctuary of Olympia hosted quadrennial athletic competitions honoring the gods, inspiring the modern global athletic games movement.',
    source: 'https://en.wikipedia.org/wiki/Ancient_Olympic_Games', evidence: ['olympia', 'athletic'], checked: '2026-11-11'
  },
  {
    id: 'GRC-1-003', iso: 'GRC', level: 1, topic: 'theatre', kind: 'history',
    text: 'The ancient theatre of Epidaurus demonstrates miraculous acoustics where a spectator in the uppermost limestone tier clearly hears a coin drop.',
    source: 'https://en.wikipedia.org/wiki/Ancient_Theatre_of_Epidaurus', evidence: ['epidaurus', 'theatre'], checked: '2026-11-11'
  },
  {
    id: 'GRC-1-004', iso: 'GRC', level: 1, topic: 'pottery', kind: 'culture',
    text: 'Classical black-figure and red-figure painted terracotta pottery depicted epic mythological combats, athletic contests, and daily domestic life.',
    source: 'https://en.wikipedia.org/wiki/Black-figure_pottery', evidence: ['pottery', 'terracotta'], checked: '2026-11-11'
  },
  {
    id: 'GRC-1-005', iso: 'GRC', level: 1, topic: 'philosophy', kind: 'history',
    text: 'Philosophers Socrates, Plato, and Aristotle developed systematic inquiry into ethics, logic, politics, and metaphysics that shaped world thought.',
    source: 'https://en.wikipedia.org/wiki/Ancient_Greek_philosophy', evidence: ['philosophy', 'aristotle'], checked: '2026-11-11'
  },
  {
    id: 'GRC-2-002', iso: 'GRC', level: 2, topic: 'mechanism', kind: 'history',
    text: 'The Antikythera mechanism was discovered from an ancient shipwreck as an astonishing geared analog computer tracking astronomical positions.',
    source: 'https://en.wikipedia.org/wiki/Antikythera_mechanism', evidence: ['antikythera', 'astronomical'], checked: '2026-11-11'
  },
  {
    id: 'GRC-2-003', iso: 'GRC', level: 2, topic: 'monastery', kind: 'history',
    text: 'Meteora hosts medieval monastic communities built atop dramatic sheer sandstone rock pillars rising hundreds of meters into the sky.',
    source: 'https://en.wikipedia.org/wiki/Meteora', evidence: ['meteora', 'pillars'], checked: '2026-11-11'
  },
  {
    id: 'GRC-2-004', iso: 'GRC', level: 2, topic: 'canal', kind: 'history',
    text: 'The Corinth Canal cuts through narrow rock with steep vertical limestone walls to connect two important marine bodies.',
    source: 'https://en.wikipedia.org/wiki/Corinth_Canal', evidence: ['corinth', 'canal'], checked: '2026-11-11'
  },
  {
    id: 'GRC-2-005', iso: 'GRC', level: 2, topic: 'oracle', kind: 'history',
    text: 'The sanctuary of Delphi served as the mystical seat of the Pythia high priestess, consulted for centuries regarding momentous decisions.',
    source: 'https://en.wikipedia.org/wiki/Delphi', evidence: ['delphi', 'pythia'], checked: '2026-11-11'
  },
  {
    id: 'GRC-3-002', iso: 'GRC', level: 3, topic: 'temple', kind: 'history',
    text: 'The Parthenon temple stands atop a rocky citadel as an iconic classical monument featuring refined marble peristyle colonnades.',
    source: 'https://en.wikipedia.org/wiki/Parthenon', evidence: ['parthenon', 'marble'], checked: '2026-11-11'
  },
  {
    id: 'GRC-3-003', iso: 'GRC', level: 3, topic: 'gastronomy', kind: 'culture',
    text: 'Famous for skewered souvlaki meats served with warm pita bread, crisp cucumber yogurt dip, and delicate honey-soaked baklava pastries.',
    source: 'https://en.wikipedia.org/wiki/Souvlaki', evidence: ['souvlaki', 'pita'], checked: '2026-11-11'
  },
  {
    id: 'GRC-3-004', iso: 'GRC', level: 3, topic: 'football', kind: 'current', year: 2004,
    text: 'In 2004, the national football squad stunned the athletic world by winning the continental championship tournament as massive underdogs.',
    source: 'https://en.wikipedia.org/wiki/UEFA_Euro_2004', evidence: ['tournament', 'championship'], checked: '2026-11-11'
  },
  {
    id: 'GRC-3-005', iso: 'GRC', level: 3, topic: 'olympics', kind: 'current', year: 2004,
    text: 'In 2004, hosted the modern Olympic Games in the historical birthplace of the ancient competitions under the memorable banner Welcome Home.',
    source: 'https://en.wikipedia.org/wiki/2004_Summer_Olympics', evidence: ['olympic', 'games'], checked: '2026-11-11'
  },

  // ── 5. South Africa (ZAF) ──────────────────────────────────────────────────
  {
    id: 'ZAF-1-002', iso: 'ZAF', level: 1, topic: 'fossils', kind: 'history',
    text: 'Sterkfontein caves yielded world-famous early hominin fossil discoveries including Mrs Ples and Little Foot, enriching evolutionary understanding.',
    source: 'https://en.wikipedia.org/wiki/Sterkfontein', evidence: ['sterkfontein', 'fossil'], checked: '2026-11-11'
  },
  {
    id: 'ZAF-1-003', iso: 'ZAF', level: 1, topic: 'beadwork', kind: 'culture',
    text: 'Vibrant geometric beadwork patterns traditionally communicate social status, courtship intentions, and clan identity across indigenous communities.',
    source: 'https://en.wikipedia.org/wiki/Zulu_beadwork', evidence: ['beadwork', 'patterns'], checked: '2026-11-11'
  },
  {
    id: 'ZAF-1-004', iso: 'ZAF', level: 1, topic: 'jazz', kind: 'culture',
    text: 'Township musical culture emerged from vibrant communities, blending expressive brass melodies with marabi rhythms and political defiance.',
    source: 'https://en.wikipedia.org/wiki/Marabi', evidence: ['marabi', 'jazz'], checked: '2026-11-11'
  },
  {
    id: 'ZAF-1-005', iso: 'ZAF', level: 1, topic: 'rock art', kind: 'culture',
    text: 'Historic sandstone caves showcase thousands of ancient rock paintings created by San artists depicting eland antelopes and ritual trance visions.',
    source: 'https://en.wikipedia.org/wiki/San_rock_art', evidence: ['eland', 'rock'], checked: '2026-11-11'
  },
  {
    id: 'ZAF-2-002', iso: 'ZAF', level: 2, topic: 'reconciliation', kind: 'history',
    text: 'Nelson Mandela walked out of prison after twenty-seven years of incarceration in 1990 to lead a peaceful transition toward democracy.',
    source: 'https://en.wikipedia.org/wiki/Nelson_Mandela', evidence: ['mandela', 'prison'], checked: '2026-11-11'
  },
  {
    id: 'ZAF-2-003', iso: 'ZAF', level: 2, topic: 'medicine', kind: 'history',
    text: 'Surgeon Christiaan Barnard performed the world\'s first successful human heart transplant operation at Groote Schuur Hospital in 1967.',
    source: 'https://en.wikipedia.org/wiki/Christiaan_Barnard', evidence: ['transplant', 'heart'], checked: '2026-11-11'
  },
  {
    id: 'ZAF-2-004', iso: 'ZAF', level: 2, topic: 'island', kind: 'history',
    text: 'Robben Island served for decades as a maximum-security prison holding anti-apartheid leaders, preserved as a poignant historical museum.',
    source: 'https://en.wikipedia.org/wiki/Robben_Island', evidence: ['robben', 'prison'], checked: '2026-11-11'
  },
  {
    id: 'ZAF-2-005', iso: 'ZAF', level: 2, topic: 'botany', kind: 'record',
    text: 'The Cape Floral Region forms one of the richest botanical zones on Earth, home to thousands of endemic fynbos flowering plant species.',
    source: 'https://en.wikipedia.org/wiki/Fynbos', evidence: ['fynbos', 'floral'], checked: '2026-11-11'
  },
  {
    id: 'ZAF-3-002', iso: 'ZAF', level: 3, topic: 'wine', kind: 'culture',
    text: 'Historic wine estates feature ornate whitewashed gables nestled amidst rolling vineyards renowned for distinct Pinotage red wine varieties.',
    source: 'https://en.wikipedia.org/wiki/Pinotage', evidence: ['pinotage', 'wine'], checked: '2026-11-11'
  },
  {
    id: 'ZAF-3-003', iso: 'ZAF', level: 3, topic: 'canyon', kind: 'landmark',
    text: 'Blyde River Canyon forms one of the largest vegetated canyons in the world, renowned for the cylindrical rock towers of the Three Rondavels.',
    source: 'https://en.wikipedia.org/wiki/Blyde_River_Canyon', evidence: ['canyon', 'rondavels'], checked: '2026-11-11'
  },
  {
    id: 'ZAF-3-004', iso: 'ZAF', level: 3, topic: 'world cup', kind: 'current', year: 2010,
    text: 'In 2010, made sporting history by hosting the FIFA World Cup, memorable for buzzing plastic vuvuzela horns and vibrant fan celebrations.',
    source: 'https://en.wikipedia.org/wiki/2010_FIFA_World_Cup', evidence: ['vuvuzela', 'world cup'], checked: '2026-11-11'
  },
  {
    id: 'ZAF-3-005', iso: 'ZAF', level: 3, topic: 'rugby', kind: 'current', year: 2023,
    text: 'In 2023, the national rugby squad won a record fourth global championship tournament title with a thrilling one-point final victory.',
    source: 'https://en.wikipedia.org/wiki/South_Africa_national_rugby_union_team', evidence: ['championship', 'rugby'], checked: '2026-11-11'
  },

  // ── 6. New Zealand (NZL) ───────────────────────────────────────────────────
  {
    id: 'NZL-1-002', iso: 'NZL', level: 1, topic: 'treaty', kind: 'history',
    text: 'The Treaty of Waitangi was signed in 1840 between indigenous tribal chiefs and royal emissaries, founding modern bicultural governance.',
    source: 'https://en.wikipedia.org/wiki/Treaty_of_Waitangi', evidence: ['waitangi', 'treaty'], checked: '2026-11-11'
  },
  {
    id: 'NZL-1-003', iso: 'NZL', level: 1, topic: 'tattoo', kind: 'culture',
    text: 'Ta moko facial and body tattooing traditions utilize chisel carving techniques to mark lineage, social ranking, and personal rites of passage.',
    source: 'https://en.wikipedia.org/wiki/T%C4%81_moko', evidence: ['moko', 'tattooing'], checked: '2026-11-11'
  },
  {
    id: 'NZL-1-004', iso: 'NZL', level: 1, topic: 'jade', kind: 'culture',
    text: 'Greenstone nephrite jade known as pounamu is traditionally carved into hei tiki talismans and revered as sacred family treasures.',
    source: 'https://en.wikipedia.org/wiki/Pounamu', evidence: ['pounamu', 'jade'], checked: '2026-11-11'
  },
  {
    id: 'NZL-1-005', iso: 'NZL', level: 1, topic: 'bird', kind: 'record',
    text: 'The kakapo survives as a critically endangered flightless nocturnal parrot celebrated for its owl-like face and booming mating call.',
    source: 'https://en.wikipedia.org/wiki/K%C4%81k%C4%81p%C5%8D', evidence: ['flightless', 'parrot'], checked: '2026-11-11'
  },
  {
    id: 'NZL-2-002', iso: 'NZL', level: 2, topic: 'suffrage', kind: 'history',
    text: 'Became the first self-governing nation in the world to grant all women the legal right to vote in parliamentary elections in 1893.',
    source: 'https://en.wikipedia.org/wiki/Women%27s_suffrage_in_New_Zealand', evidence: ['suffrage', 'vote'], checked: '2026-11-11'
  },
  {
    id: 'NZL-2-003', iso: 'NZL', level: 2, topic: 'mountaineering', kind: 'history',
    text: 'Mountaineer Edmund Hillary achieved global fame in 1953 by completing the first confirmed summit ascent of Mount Everest alongside Tenzing Norgay.',
    source: 'https://en.wikipedia.org/wiki/Edmund_Hillary', evidence: ['hillary', 'everest'], checked: '2026-11-11'
  },
  {
    id: 'NZL-2-004', iso: 'NZL', level: 2, topic: 'physics', kind: 'history',
    text: 'Physicist Ernest Rutherford discovered the atomic nucleus and radioactive half-life, winning the Nobel Prize in Chemistry in 1908.',
    source: 'https://en.wikipedia.org/wiki/Ernest_Rutherford', evidence: ['rutherford', 'nucleus'], checked: '2026-11-11'
  },
  {
    id: 'NZL-2-005', iso: 'NZL', level: 2, topic: 'glowworm', kind: 'landmark',
    text: 'Waitomo caves feature subterranean limestone grottoes illuminated by thousands of luminescent insect larvae twinkling like star constellations.',
    source: 'https://en.wikipedia.org/wiki/Waitomo_Glowworm_Caves', evidence: ['waitomo', 'glowworm'], checked: '2026-11-11'
  },
  {
    id: 'NZL-3-002', iso: 'NZL', level: 3, topic: 'geothermal', kind: 'landmark',
    text: 'Rotorua thermal wonderland features boiling mud pools, silica terraces, and erupting geysers carrying a distinct mineral sulfur scent.',
    source: 'https://en.wikipedia.org/wiki/Rotorua', evidence: ['rotorua', 'geothermal'], checked: '2026-11-11'
  },
  {
    id: 'NZL-3-003', iso: 'NZL', level: 3, topic: 'bungee', kind: 'culture',
    text: 'Commercial bungy jumping was pioneered at the historic Kawarau suspension bridge, turning leap diving into a worldwide adrenaline pastime.',
    source: 'https://en.wikipedia.org/wiki/Bungy_jumping', evidence: ['bungy', 'kawarau'], checked: '2026-11-11'
  },
  {
    id: 'NZL-3-004', iso: 'NZL', level: 3, topic: 'cinema', kind: 'current', year: 2003,
    text: 'In 2003, director Peter Jackson concluded a fantasy epic trilogy that swept eleven Academy Awards and showcased dramatic countryside landscapes.',
    source: 'https://en.wikipedia.org/wiki/The_Lord_of_the_Rings:_The_Return_of_the_King', evidence: ['jackson', 'awards'], checked: '2026-11-11'
  },
  {
    id: 'NZL-3-005', iso: 'NZL', level: 3, topic: 'earthquake', kind: 'incident', year: 2011,
    text: 'In 2011, a devastating magnitude 6.2 earthquake struck Christchurch, damaging historic cathedral stone structures and prompting a resilient urban rebuilding.',
    source: 'https://en.wikipedia.org/wiki/2011_Christchurch_earthquake', evidence: ['earthquake', 'christchurch'], checked: '2026-11-11'
  },

  // ── 7. Morocco (MAR) ───────────────────────────────────────────────────────
  {
    id: 'MAR-1-002', iso: 'MAR', level: 1, topic: 'university', kind: 'history',
    text: 'The University of al-Qarawiyyin in Fez was founded in 859 by Fatima al-Fihri, recognized by UNESCO as the oldest continuously operating higher educational institution.',
    source: 'https://en.wikipedia.org/wiki/University_of_al-Qarawiyyin', evidence: ['fihri', 'qarawiyyin'], checked: '2026-11-11'
  },
  {
    id: 'MAR-1-003', iso: 'MAR', level: 1, topic: 'tilework', kind: 'culture',
    text: 'Zellij architectural mosaic tilework features intricate geometric stars cut by hand from enameled terracotta tiles to ornament fountains and palaces.',
    source: 'https://en.wikipedia.org/wiki/Zellij', evidence: ['zellij', 'mosaic'], checked: '2026-11-11'
  },
  {
    id: 'MAR-1-004', iso: 'MAR', level: 1, topic: 'carpet', kind: 'culture',
    text: 'Indigenous Berber artisans craft plush wool rugs using traditional hand-knotting looms, characterized by asymmetric abstract diamond patterns.',
    source: 'https://en.wikipedia.org/wiki/Berber_carpet', evidence: ['carpet', 'rugs'], checked: '2026-11-11'
  },
  {
    id: 'MAR-1-005', iso: 'MAR', level: 1, topic: 'argan', kind: 'culture',
    text: 'Argan tree groves produce precious culinary and cosmetic oil extracted from tree kernels, traditionally cracked by women\'s cooperatives.',
    source: 'https://en.wikipedia.org/wiki/Argan_oil', evidence: ['argan', 'oil'], checked: '2026-11-11'
  },
  {
    id: 'MAR-2-002', iso: 'MAR', level: 2, topic: 'kasbah', kind: 'history',
    text: 'Ait Benhaddou stands as an impressive earthen clay kasbah fortress along former caravan routes, famously featured in numerous historical film epics.',
    source: 'https://en.wikipedia.org/wiki/A%C3%AFt_Benhaddou', evidence: ['benhaddou', 'earthen'], checked: '2026-11-11'
  },
  {
    id: 'MAR-2-003', iso: 'MAR', level: 2, topic: 'mosque', kind: 'history',
    text: 'Hassan II Mosque features a colossal minaret topped with a laser beam pointing toward Mecca, perched gracefully over ocean waters.',
    source: 'https://en.wikipedia.org/wiki/Hassan_II_Mosque', evidence: ['hassan', 'minaret'], checked: '2026-11-11'
  },
  {
    id: 'MAR-2-004', iso: 'MAR', level: 2, topic: 'garden', kind: 'history',
    text: 'Jardin Majorelle showcases a vibrant cobalt blue villa surrounded by rare exotic cacti, lovingly restored by fashion visionary Yves Saint Laurent.',
    source: 'https://en.wikipedia.org/wiki/Jardin_Majorelle', evidence: ['majorelle', 'cobalt'], checked: '2026-11-11'
  },
  {
    id: 'MAR-2-005', iso: 'MAR', level: 2, topic: 'ruins', kind: 'history',
    text: 'Volubilis preserves ancient Roman provincial ruins showcasing remarkably intact floor mosaics, triumphal arches, and Corinthian columns amidst olive groves.',
    source: 'https://en.wikipedia.org/wiki/Volubilis', evidence: ['volubilis', 'mosaics'], checked: '2026-11-11'
  },
  {
    id: 'MAR-3-002', iso: 'MAR', level: 3, topic: 'square', kind: 'culture',
    text: 'Jemaa el-Fnaa square transforms nightly into a bustling open-air carnival of snake charmers, storytellers, acrobats, and sizzling food stalls.',
    source: 'https://en.wikipedia.org/wiki/Jemaa_el-Fnaa', evidence: ['jemaa', 'charmers'], checked: '2026-11-11'
  },
  {
    id: 'MAR-3-003', iso: 'MAR', level: 3, topic: 'gastronomy', kind: 'culture',
    text: 'Famous for steaming couscous topped with spiced vegetables and slow-cooked lamb, sweetened with cinnamon, toasted almonds, and raisins.',
    source: 'https://en.wikipedia.org/wiki/Couscous', evidence: ['couscous', 'semolina'], checked: '2026-11-11'
  },
  {
    id: 'MAR-3-004', iso: 'MAR', level: 3, topic: 'football', kind: 'current', year: 2022,
    text: 'In 2022, made sporting history at the FIFA World Cup by becoming the first squad of its regional confederation to advance to the tournament semifinals.',
    source: 'https://en.wikipedia.org/wiki/2022_FIFA_World_Cup', evidence: ['semifinals', 'world cup'], checked: '2026-11-11'
  },
  {
    id: 'MAR-3-005', iso: 'MAR', level: 3, topic: 'earthquake', kind: 'incident', year: 2023,
    text: 'In 2023, a powerful magnitude 6.8 earthquake struck mountain settlements near Al Haouz, triggering urgent international disaster relief efforts.',
    source: 'https://en.wikipedia.org/wiki/2023_Marrakesh-Safi_earthquake', evidence: ['earthquake', 'haouz'], checked: '2026-11-11'
  },

  // ── 8. Switzerland (CHE) ───────────────────────────────────────────────────
  {
    id: 'CHE-1-002', iso: 'CHE', level: 1, topic: 'covenant', kind: 'history',
    text: 'The Federal Charter of 1291 bound three valley communities together in mutual defense, laying the founding bedrock of the perpetual confederation.',
    source: 'https://en.wikipedia.org/wiki/Federal_Charter_of_1291', evidence: ['charter', 'confederation'], checked: '2026-11-11'
  },
  {
    id: 'CHE-1-003', iso: 'CHE', level: 1, topic: 'knife', kind: 'culture',
    text: 'Multi-tool pocketknife featuring signature red casings and versatile folding steel implements was designed for military issue in 1891.',
    source: 'https://en.wikipedia.org/wiki/Swiss_Army_knife', evidence: ['pocketknife', 'military'], checked: '2026-11-11'
  },
  {
    id: 'CHE-1-004', iso: 'CHE', level: 1, topic: 'singing', kind: 'culture',
    text: 'Traditional folk singing characterized by rapid vocal register shifts originated as a communicative call between mountain meadows and livestock herds.',
    source: 'https://en.wikipedia.org/wiki/Yodeling', evidence: ['yodeling', 'register'], checked: '2026-11-11'
  },
  {
    id: 'CHE-1-005', iso: 'CHE', level: 1, topic: 'botany', kind: 'culture',
    text: 'The delicate white edelweiss flower grows upon rugged limestone cliffs and serves as a beloved national botanical emblem.',
    source: 'https://en.wikipedia.org/wiki/Leontopodium_nivale', evidence: ['edelweiss', 'flower'], checked: '2026-11-11'
  },
  {
    id: 'CHE-2-002', iso: 'CHE', level: 2, topic: 'physics', kind: 'history',
    text: 'CERN laboratory operates the colossal Large Hadron Collider particle accelerator deep underground to probe fundamental laws of physics.',
    source: 'https://en.wikipedia.org/wiki/CERN', evidence: ['cern', 'hadron'], checked: '2026-11-11'
  },
  {
    id: 'CHE-2-003', iso: 'CHE', level: 2, topic: 'tunnel', kind: 'record',
    text: 'Gotthard Base Tunnel opened as the world\'s longest and deepest rail tunnel, carving a 57-kilometer transit route through mountain rock.',
    source: 'https://en.wikipedia.org/wiki/Gotthard_Base_Tunnel', evidence: ['gotthard', 'tunnel'], checked: '2026-11-11'
  },
  {
    id: 'CHE-2-004', iso: 'CHE', level: 2, topic: 'bridge', kind: 'history',
    text: 'Chapel Bridge in Lucerne survives as one of the oldest covered wooden bridges, adorned with seventeenth-century interior triangular paintings.',
    source: 'https://en.wikipedia.org/wiki/Kapellbr%C3%BCcke', evidence: ['wooden', 'bridge'], checked: '2026-11-11'
  },
  {
    id: 'CHE-2-005', iso: 'CHE', level: 2, topic: 'humanitarian', kind: 'history',
    text: 'Humanitarian Henry Dunant founded the International Committee of the Red Cross in Geneva in 1863 to provide neutral wartime medical care.',
    source: 'https://en.wikipedia.org/wiki/International_Committee_of_the_Red_Cross', evidence: ['dunant', 'red cross'], checked: '2026-11-11'
  },
  {
    id: 'CHE-3-002', iso: 'CHE', level: 3, topic: 'gastronomy', kind: 'culture',
    text: 'Famous for scraping hot melted raclette cheese over boiled baby potatoes, tart gherkin pickles, and pickled pearl onions.',
    source: 'https://en.wikipedia.org/wiki/Raclette', evidence: ['raclette', 'cheese'], checked: '2026-11-11'
  },
  {
    id: 'CHE-3-003', iso: 'CHE', level: 3, topic: 'mountain', kind: 'landmark',
    text: 'The distinct pyramid-shaped peak of the Matterhorn rises majestically, inspiring the triangular packaging design of world-famous honey almond chocolate bars.',
    source: 'https://en.wikipedia.org/wiki/Matterhorn', evidence: ['matterhorn', 'pyramid'], checked: '2026-11-11'
  },
  {
    id: 'CHE-3-004', iso: 'CHE', level: 3, topic: 'tennis', kind: 'current', year: 2018,
    text: 'In 2018, tennis icon Roger Federer captured his twentieth Grand Slam singles championship title, continuing an illustrious sporting legacy.',
    source: 'https://en.wikipedia.org/wiki/Roger_Federer', evidence: ['federer', 'singles'], checked: '2026-11-11'
  },
  {
    id: 'CHE-3-005', iso: 'CHE', level: 3, topic: 'particle', kind: 'incident', year: 2012,
    text: 'In 2012, physicists working at the Large Hadron Collider confirmed the momentous discovery of the Higgs boson fundamental particle.',
    source: 'https://en.wikipedia.org/wiki/Higgs_boson', evidence: ['higgs', 'boson'], checked: '2026-11-11'
  },

  // ── 9. Thailand (THA) ──────────────────────────────────────────────────────
  {
    id: 'THA-1-002', iso: 'THA', level: 1, topic: 'buddhism', kind: 'culture',
    text: 'Centuries-old Theravada Buddhist monastic traditions involve robed monks collecting morning alms from faithful residents across towns.',
    source: 'https://en.wikipedia.org/wiki/Buddhism_in_Thailand', evidence: ['monks', 'alms'], checked: '2026-11-11'
  },
  {
    id: 'THA-1-003', iso: 'THA', level: 1, topic: 'dance', kind: 'culture',
    text: 'Classical Khon masked drama depicts episodes from the Ramakien epic through intricate hand gestures, glittering crowns, and gilded costumes.',
    source: 'https://en.wikipedia.org/wiki/Khon', evidence: ['khon', 'ramakien'], checked: '2026-11-11'
  },
  {
    id: 'THA-1-004', iso: 'THA', level: 1, topic: 'festival', kind: 'culture',
    text: 'Loy Krathong festival celebrates water spirits by floating decorated lotus-shaped baskets adorned with flowers, incense, and glowing candles onto rivers.',
    source: 'https://en.wikipedia.org/wiki/Loi_Krathong', evidence: ['krathong', 'incense'], checked: '2026-11-11'
  },
  {
    id: 'THA-1-005', iso: 'THA', level: 1, topic: 'massage', kind: 'culture',
    text: 'Ancient therapeutic massage tradition combines acupressure and assisted yoga-like stretching techniques codified at the Wat Pho temple school.',
    source: 'https://en.wikipedia.org/wiki/Thai_massage', evidence: ['massage', 'acupressure'], checked: '2026-11-11'
  },
  {
    id: 'THA-2-002', iso: 'THA', level: 2, topic: 'capital', kind: 'history',
    text: 'The historic ruined city of Ayutthaya flourished for four centuries as a cosmopolitan trading capital before its destruction in 1767.',
    source: 'https://en.wikipedia.org/wiki/Ayutthaya_Kingdom', evidence: ['ayutthaya', 'kingdom'], checked: '2026-11-11'
  },
  {
    id: 'THA-2-003', iso: 'THA', level: 2, topic: 'buddha', kind: 'history',
    text: 'Wat Traimit houses the Golden Buddha statue, an astounding solid gold seated sculpture weighing over five tons that was long concealed in plaster.',
    source: 'https://en.wikipedia.org/wiki/Golden_Buddha_(statue)', evidence: ['traimit', 'gold'], checked: '2026-11-11'
  },
  {
    id: 'THA-2-004', iso: 'THA', level: 2, topic: 'railway', kind: 'history',
    text: 'The historic railway bridge over the River Kwai was constructed during wartime under brutal conditions, immortalized in renowned literature and film.',
    source: 'https://en.wikipedia.org/wiki/Burma_Railway', evidence: ['railway', 'kwai'], checked: '2026-11-11'
  },
  {
    id: 'THA-2-005', iso: 'THA', level: 2, topic: 'temple', kind: 'history',
    text: 'Wat Rong Khun, renowned as the White Temple, features unconventional contemporary art and dazzling mirrored plaster symbolizing spiritual purity.',
    source: 'https://en.wikipedia.org/wiki/Wat_Rong_Khun', evidence: ['khun', 'plaster'], checked: '2026-11-11'
  },
  {
    id: 'THA-3-002', iso: 'THA', level: 3, topic: 'gastronomy', kind: 'culture',
    text: 'Famous for sweet mango sticky rice drizzled with warm coconut cream, spicy green papaya salad, and aromatic red curry.',
    source: 'https://en.wikipedia.org/wiki/Mango_sticky_rice', evidence: ['sticky', 'coconut'], checked: '2026-11-11'
  },
  {
    id: 'THA-3-003', iso: 'THA', level: 3, topic: 'floating market', kind: 'culture',
    text: 'Damnoen Saduak floating market features bustling wooden paddleboats laden with fresh tropical fruits, hot noodle bowls, and colorful woven hats.',
    source: 'https://en.wikipedia.org/wiki/Damnoen_Saduak_floating_market', evidence: ['damnoen', 'floating'], checked: '2026-11-11'
  },
  {
    id: 'THA-3-004', iso: 'THA', level: 3, topic: 'cave rescue', kind: 'incident', year: 2018,
    text: 'In 2018, a miraculous international rescue mission safely extracted twelve young football players and their coach from the flooded Tham Luang cave.',
    source: 'https://en.wikipedia.org/wiki/Tham_Luang_cave_rescue', evidence: ['luang', 'rescue'], checked: '2026-11-11'
  },
  {
    id: 'THA-3-005', iso: 'THA', level: 3, topic: 'tsunami', kind: 'incident', year: 2004,
    text: 'In 2004, massive tsunami waves struck coastal resort communities, prompting heroic community rebuilding and modernized oceanic early warning networks.',
    source: 'https://en.wikipedia.org/wiki/2004_Indian_Ocean_earthquake_and_tsunami', evidence: ['tsunami', 'earthquake'], checked: '2026-11-11'
  },

  // ── 10. Argentina (ARG) ────────────────────────────────────────────────────
  {
    id: 'ARG-1-002', iso: 'ARG', level: 1, topic: 'folklore', kind: 'culture',
    text: 'Gaucho equestrian traditions celebrate self-reliance, leatherwork craft, and folk songs played on acoustic guitars around evening campfires.',
    source: 'https://en.wikipedia.org/wiki/Gaucho', evidence: ['gaucho', 'equestrian'], checked: '2026-11-11'
  },
  {
    id: 'ARG-1-003', iso: 'ARG', level: 1, topic: 'pastry', kind: 'culture',
    text: 'Alfajores sweet sandwich cookies filled with rich caramelized dulce de leche and rolled in grated coconut or dipped in chocolate.',
    source: 'https://en.wikipedia.org/wiki/Alfajor', evidence: ['alfajor', 'dulce'], checked: '2026-11-11'
  },
  {
    id: 'ARG-1-004', iso: 'ARG', level: 1, topic: 'theatre', kind: 'history',
    text: 'Teatro Colon opened in 1908, celebrated internationally for its horseshoe-shaped auditorium and world-class acoustic resonance.',
    source: 'https://en.wikipedia.org/wiki/Teatro_Col%C3%B3n', evidence: ['teatro', 'acoustic'], checked: '2026-11-11'
  },
  {
    id: 'ARG-1-005', iso: 'ARG', level: 1, topic: 'revolution', kind: 'history',
    text: 'The May Revolution of 1810 replaced the colonial viceroy with a local governing junta, igniting the struggle for national independence.',
    source: 'https://en.wikipedia.org/wiki/May_Revolution', evidence: ['revolution', 'junta'], checked: '2026-11-11'
  },
  {
    id: 'ARG-2-002', iso: 'ARG', level: 2, topic: 'literature', kind: 'history',
    text: 'Author Jorge Luis Borges pioneered philosophical labyrinthine fiction, magical realism themes, and innovative short stories that influenced world literature.',
    source: 'https://en.wikipedia.org/wiki/Jorge_Luis_Borges', evidence: ['borges', 'labyrinth'], checked: '2026-11-11'
  },
  {
    id: 'ARG-2-003', iso: 'ARG', level: 2, topic: 'science', kind: 'history',
    text: 'Physician Rene Favaloro developed coronary artery bypass surgery in 1967, revolutionizing clinical cardiology and saving millions of patients.',
    source: 'https://en.wikipedia.org/wiki/Ren%C3%A9_Favaloro', evidence: ['favaloro', 'bypass'], checked: '2026-11-11'
  },
  {
    id: 'ARG-2-004', iso: 'ARG', level: 2, topic: 'cemetery', kind: 'history',
    text: 'Recoleta Cemetery features elaborate neoclassical marble mausoleums and ornate crypts housing statesmen, poets, and cultural icon Eva Peron.',
    source: 'https://en.wikipedia.org/wiki/La_Recoleta_Cemetery', evidence: ['recoleta', 'mausoleums'], checked: '2026-11-11'
  },
  {
    id: 'ARG-2-005', iso: 'ARG', level: 2, topic: 'paleontology', kind: 'record',
    text: 'Paleontologists discovered fossil remains of Patagotitan mayorum, recognized among the most colossal titanosaur dinosaurs ever to walk the planet.',
    source: 'https://en.wikipedia.org/wiki/Patagotitan', evidence: ['patagotitan', 'titanosaur'], checked: '2026-11-11'
  },
  {
    id: 'ARG-3-002', iso: 'ARG', level: 3, topic: 'falls', kind: 'landmark',
    text: 'Iguazu Falls presents a stupendous spectacle of hundreds of thunderous cascades, anchored by the mist-shrouded chasm of the Devil\'s Throat.',
    source: 'https://en.wikipedia.org/wiki/Iguazu_Falls', evidence: ['iguazu', 'throat'], checked: '2026-11-11'
  },
  {
    id: 'ARG-3-003', iso: 'ARG', level: 3, topic: 'glacier', kind: 'landmark',
    text: 'Perito Moreno glacier features a massive advancing wall of vibrant blue ice that periodically ruptures dramatic natural arches.',
    source: 'https://en.wikipedia.org/wiki/Perito_Moreno_Glacier', evidence: ['moreno', 'glacier'], checked: '2026-11-11'
  },
  {
    id: 'ARG-3-004', iso: 'ARG', level: 3, topic: 'world cup', kind: 'current', year: 2022,
    text: 'In 2022, captain Lionel Messi led the national football squad to an emotional World Cup championship victory in an unforgettable penalty shootout.',
    source: 'https://en.wikipedia.org/wiki/2022_FIFA_World_Cup', evidence: ['messi', 'world cup'], checked: '2026-11-11'
  },
  {
    id: 'ARG-3-005', iso: 'ARG', level: 3, topic: 'papacy', kind: 'current', year: 2013,
    text: 'In 2013, Cardinal Jorge Mario Bergoglio was elected Pope Francis, making history as the first Jesuit pontiff and first modern Pope from overseas.',
    source: 'https://en.wikipedia.org/wiki/Pope_Francis', evidence: ['francis', 'jesuit'], checked: '2026-11-11'
  }
];

async function run() {
  console.log(`Auditing Chunk 2 (${chunk2Items.length} items)...`);
  let hasErrors = false;

  for (const item of chunk2Items) {
    const existingForIso = existingClues.filter(c => c.iso === item.iso);
    const syncErrors = validateItemSync(item, existingForIso);
    if (syncErrors.length > 0) {
      console.error(`[SYNC ERROR] ${item.id}:`, syncErrors);
      hasErrors = true;
    }
    const urlRes = await verifySourceUrl(item.source, item.evidence);
    if (!urlRes.ok) {
      console.error(`[URL ERROR] ${item.id} (${item.source}):`, urlRes.error);
      hasErrors = true;
    }
  }

  if (hasErrors) {
    console.error('Chunk 2 has errors! Aborting.');
    process.exit(1);
  }

  console.log(`Chunk 2 verified! 100% of ${chunk2Items.length} items pass all pattern and URL checks.`);

  // Append items to clues.json and clues.js
  const combined = [...existingClues, ...chunk2Items];
  fs.writeFileSync(cluesPath, JSON.stringify(combined, null, 2), 'utf8');
  fs.writeFileSync(cluesJsPath, `// Clue Library\nexport const CLUES_LIBRARY = ${JSON.stringify(combined, null, 2)};\nexport default CLUES_LIBRARY;\n`, 'utf8');
  console.log(`Updated clues.json and clues.js! Total items now: ${combined.length}`);
}

run().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
