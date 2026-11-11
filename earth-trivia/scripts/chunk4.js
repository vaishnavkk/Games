import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { validateItemSync, verifySourceUrl } from './clueTool.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const cluesPath = path.resolve(__dirname, '../data/clues.json');
const cluesJsPath = path.resolve(__dirname, '../data/clues.js');
const existingClues = JSON.parse(fs.readFileSync(cluesPath, 'utf8'));

export const chunk4Items = [
  // ── 1. Sweden (SWE) ────────────────────────────────────────────────────────
  {
    id: 'SWE-1-002', iso: 'SWE', level: 1, topic: 'runes', kind: 'history',
    text: 'Carved granite runestones dating to the Viking Age feature serpent ribbon designs and Younger Futhark inscriptions erected in memory of departed relatives.',
    source: 'https://en.wikipedia.org/wiki/Runestone', evidence: ['futhark', 'runestones'], checked: '2026-11-11'
  },
  {
    id: 'SWE-1-003', iso: 'SWE', level: 1, topic: 'fika', kind: 'culture',
    text: 'Social tradition of fika invites friends and colleagues to pause daily for warm coffee accompanied by fragrant cardamon or cinnamon buns.',
    source: 'https://en.wikipedia.org/wiki/Fika_(culture)', evidence: ['fika', 'coffee'], checked: '2026-11-11'
  },
  {
    id: 'SWE-1-004', iso: 'SWE', level: 1, topic: 'lucia', kind: 'culture',
    text: 'Winter procession features young singers in white gowns wearing crowns of glowing candles, singing traditional carols on dark December mornings.',
    source: 'https://en.wikipedia.org/wiki/Saint_Lucy%27s_Day', evidence: ['candles', 'december'], checked: '2026-11-11'
  },
  {
    id: 'SWE-1-005', iso: 'SWE', level: 1, topic: 'dalahorse', kind: 'culture',
    text: 'Brightly painted carved wooden Dala horses originated as rustic winter toys and evolved into beloved national symbols of folk craftsmanship.',
    source: 'https://en.wikipedia.org/wiki/Dala_horse', evidence: ['dala', 'horse'], checked: '2026-11-11'
  },
  {
    id: 'SWE-2-002', iso: 'SWE', level: 2, topic: 'botany', kind: 'history',
    text: 'Botanist Carl Linnaeus established modern binomial nomenclature in Systema Naturae, formalizing the two-term naming convention for biological organisms.',
    source: 'https://en.wikipedia.org/wiki/Carl_Linnaeus', evidence: ['linnaeus', 'binomial'], checked: '2026-11-11'
  },
  {
    id: 'SWE-2-003', iso: 'SWE', level: 2, topic: 'icehotel', kind: 'landmark',
    text: 'The Icehotel in Jukkasjarvi is rebuilt every winter using pristine natural ice blocks harvested from the frozen Torne River.',
    source: 'https://en.wikipedia.org/wiki/Icehotel_(Jukkasj%C3%A4rvi)', evidence: ['icehotel', 'torne'], checked: '2026-11-11'
  },
  {
    id: 'SWE-2-004', iso: 'SWE', level: 2, topic: 'science', kind: 'history',
    text: 'Inventor Alfred Nobel patented dynamite in 1867 and bequeathed his vast fortune to establish the international Nobel Prizes.',
    source: 'https://en.wikipedia.org/wiki/Alfred_Nobel', evidence: ['dynamite', 'nobel'], checked: '2026-11-11'
  },
  {
    id: 'SWE-2-005', iso: 'SWE', level: 2, topic: 'ship', kind: 'history',
    text: 'The 17th-century warship Vasa was salvaged almost intact from the harbor floor after capsizing on its maiden voyage in 1628.',
    source: 'https://en.wikipedia.org/wiki/Vasa_(ship)', evidence: ['vasa', 'salvaged'], checked: '2026-11-11'
  },
  {
    id: 'SWE-3-002', iso: 'SWE', level: 3, topic: 'music', kind: 'culture',
    text: 'Pop sensation ABBA achieved worldwide fame after winning the Eurovision Song Contest in 1974 with Waterloo, inspiring a global musical catalog.',
    source: 'https://en.wikipedia.org/wiki/ABBA', evidence: ['abba', 'waterloo'], checked: '2026-11-11'
  },
  {
    id: 'SWE-3-003', iso: 'SWE', level: 3, topic: 'gastronomy', kind: 'culture',
    text: 'Famous for savory meatballs served with rich brown cream gravy, tart lingonberry jam, and buttery pressed mashed potatoes.',
    source: 'https://en.wikipedia.org/wiki/K%C3%B6ttbullar', evidence: ['lingonberry', 'meatballs'], checked: '2026-11-11'
  },
  {
    id: 'SWE-3-004', iso: 'SWE', level: 3, topic: 'music', kind: 'current', year: 2023,
    text: 'In 2023, singer Loreen won the Eurovision Song Contest for a historic second time with Tattoo, matching an all-time tournament record.',
    source: 'https://en.wikipedia.org/wiki/Eurovision_Song_Contest_2023', evidence: ['loreen', 'eurovision'], checked: '2026-11-11'
  },
  {
    id: 'SWE-3-005', iso: 'SWE', level: 3, topic: 'space', kind: 'current', year: 2024,
    text: 'In 2024, astronaut Marcus Wandt flew to the International Space Station aboard the Axiom Mission 3 commercial spaceflight.',
    source: 'https://en.wikipedia.org/wiki/Marcus_Wandt', evidence: ['wandt', 'astronaut'], checked: '2026-11-11'
  },

  // ── 2. Portugal (PRT) ──────────────────────────────────────────────────────
  {
    id: 'PRT-1-002', iso: 'PRT', level: 1, topic: 'cork', kind: 'record',
    text: 'The world\'s leading producer of cork, harvesting thick protective bark from ancient cork oak forests without felling the living trees.',
    source: 'https://en.wikipedia.org/wiki/Quercus_suber', evidence: ['cork', 'bark'], checked: '2026-11-11'
  },
  {
    id: 'PRT-1-003', iso: 'PRT', level: 1, topic: 'treaty', kind: 'history',
    text: 'The Treaty of Tordesillas was signed in 1494, drawing a meridian dividing newly discovered lands outside Christendom between two seafaring powers.',
    source: 'https://en.wikipedia.org/wiki/Treaty_of_Tordesillas', evidence: ['tordesillas', 'meridian'], checked: '2026-11-11'
  },
  {
    id: 'PRT-1-004', iso: 'PRT', level: 1, topic: 'ceramic', kind: 'culture',
    text: 'Intricate blue and white glazed ceramic tile panels known as azulejos adorn palaces, churches, and train stations depicting historical chronicles.',
    source: 'https://en.wikipedia.org/wiki/Azulejo', evidence: ['azulejo', 'ceramic'], checked: '2026-11-11'
  },
  {
    id: 'PRT-1-005', iso: 'PRT', level: 1, topic: 'music', kind: 'culture',
    text: 'Fado vocal music expresses poignant longing and melancholic destiny, traditionally accompanied by twelve-string teardrop-shaped guitars.',
    source: 'https://en.wikipedia.org/wiki/Fado', evidence: ['fado', 'singing'], checked: '2026-11-11'
  },
  {
    id: 'PRT-2-002', iso: 'PRT', level: 2, topic: 'navigation', kind: 'history',
    text: 'Navigator Vasco da Gama completed the first maritime voyage connecting his homeland directly to the spice markets in 1498.',
    source: 'https://en.wikipedia.org/wiki/Vasco_da_Gama', evidence: ['gama', 'voyage'], checked: '2026-11-11'
  },
  {
    id: 'PRT-2-003', iso: 'PRT', level: 2, topic: 'monastery', kind: 'history',
    text: 'Jeronimos Monastery showcases exuberant Manueline architectural stonework featuring carved nautical ropes, armillary spheres, and sea monsters.',
    source: 'https://en.wikipedia.org/wiki/Jer%C3%B3nimos_Monastery', evidence: ['manueline', 'monastery'], checked: '2026-11-11'
  },
  {
    id: 'PRT-2-004', iso: 'PRT', level: 2, topic: 'palace', kind: 'landmark',
    text: 'Pena Palace crowns a foggy mountain ridge in Sintra, painted in vivid yellow and red tones as an eccentric Romanticism masterpiece.',
    source: 'https://en.wikipedia.org/wiki/Pena_Palace', evidence: ['sintra', 'palace'], checked: '2026-11-11'
  },
  {
    id: 'PRT-2-005', iso: 'PRT', level: 2, topic: 'bridge', kind: 'record',
    text: 'Vasco da Gama Bridge spans over twelve kilometers across the Tagus estuary, ranked among the longest roadway bridges.',
    source: 'https://en.wikipedia.org/wiki/Vasco_da_Gama_Bridge', evidence: ['tagus', 'bridge'], checked: '2026-11-11'
  },
  {
    id: 'PRT-3-002', iso: 'PRT', level: 3, topic: 'gastronomy', kind: 'culture',
    text: 'Famous for pastel de nata warm flaky egg custard tarts dusted with powdered sugar and cinnamon, originated by Catholic monks.',
    source: 'https://en.wikipedia.org/wiki/Pastel_de_nata', evidence: ['pastel', 'custard'], checked: '2026-11-11'
  },
  {
    id: 'PRT-3-003', iso: 'PRT', level: 3, topic: 'tower', kind: 'landmark',
    text: 'Belem Tower stands along the Tagus riverbank as a fortified stone bastion celebrating maritime exploration.',
    source: 'https://en.wikipedia.org/wiki/Bel%C3%A9m_Tower', evidence: ['tagus', 'tower'], checked: '2026-11-11'
  },
  {
    id: 'PRT-3-004', iso: 'PRT', level: 3, topic: 'football', kind: 'current', year: 2016,
    text: 'In 2016, the men\'s national football squad won the continental championship tournament with a dramatic extra-time goal in the final.',
    source: 'https://en.wikipedia.org/wiki/UEFA_Euro_2016', evidence: ['tournament', 'championship'], checked: '2026-11-11'
  },
  {
    id: 'PRT-3-005', iso: 'PRT', level: 3, topic: 'surfing', kind: 'current', year: 2011,
    text: 'In 2011, big-wave surfer Garrett McNamara rode a record-breaking 24-meter wave at Nazare, turning the coastal town into a global surfing phenomenon.',
    source: 'https://en.wikipedia.org/wiki/Nazar%C3%A9,_Portugal', evidence: ['surfing', 'wave'], checked: '2026-11-11'
  },

  // ── 3. Indonesia (IDN) ─────────────────────────────────────────────────────
  {
    id: 'IDN-1-002', iso: 'IDN', level: 1, topic: 'batik', kind: 'culture',
    text: 'Batik textile art uses hot wax applied with a canting copper pen to resist dyes and create intricate geometric patterns.',
    source: 'https://en.wikipedia.org/wiki/Batik', evidence: ['batik', 'wax'], checked: '2026-11-11'
  },
  {
    id: 'IDN-1-003', iso: 'IDN', level: 1, topic: 'volcano', kind: 'history',
    text: 'The cataclysmic 1815 eruption of Mount Tambora caused the historical Year Without a Summer across global agricultural regions.',
    source: 'https://en.wikipedia.org/wiki/1815_eruption_of_Mount_Tambora', evidence: ['tambora', 'eruption'], checked: '2026-11-11'
  },
  {
    id: 'IDN-1-004', iso: 'IDN', level: 1, topic: 'wayang', kind: 'culture',
    text: 'Wayang kulit shadow puppet theater dramatizes ancient mythological epics behind illuminated linen screens accompanied by gamelan bronze gongs.',
    source: 'https://en.wikipedia.org/wiki/Wayang_kulit', evidence: ['wayang', 'shadow'], checked: '2026-11-11'
  },
  {
    id: 'IDN-1-005', iso: 'IDN', level: 1, topic: 'spice', kind: 'history',
    text: 'The historic Spice Islands were the sole historical source of nutmeg and cloves, driving centuries of intense oceanic colonial trade conflicts.',
    source: 'https://en.wikipedia.org/wiki/Maluku_Islands', evidence: ['nutmeg', 'cloves'], checked: '2026-11-11'
  },
  {
    id: 'IDN-2-002', iso: 'IDN', level: 2, topic: 'temple', kind: 'history',
    text: 'Borobudur stands as the world\'s largest Buddhist temple monument, constructed with nine stacked platforms crowned by seventy-two perforated stupas.',
    source: 'https://en.wikipedia.org/wiki/Borobudur', evidence: ['borobudur', 'stupas'], checked: '2026-11-11'
  },
  {
    id: 'IDN-2-003', iso: 'IDN', level: 2, topic: 'hindu temple', kind: 'history',
    text: 'Prambanan temple complex features towering pointed stone shrines dedicated to the Trimurti deities, decorated with Ramayana narrative bas-reliefs.',
    source: 'https://en.wikipedia.org/wiki/Prambanan', evidence: ['prambanan', 'trimurti'], checked: '2026-11-11'
  },
  {
    id: 'IDN-2-004', iso: 'IDN', level: 2, topic: 'wildlife', kind: 'record',
    text: 'Komodo National Park protects the largest living lizard species, capable of growing over three meters in length with venomous predatory bites.',
    source: 'https://en.wikipedia.org/wiki/Komodo_dragon', evidence: ['komodo', 'lizard'], checked: '2026-11-11'
  },
  {
    id: 'IDN-2-005', iso: 'IDN', level: 2, topic: 'lake', kind: 'record',
    text: 'Lake Toba fills a colossal prehistoric volcanic caldera, holding a massive island within its calm sapphire crater waters.',
    source: 'https://en.wikipedia.org/wiki/Lake_Toba', evidence: ['toba', 'caldera'], checked: '2026-11-11'
  },
  {
    id: 'IDN-3-002', iso: 'IDN', level: 3, topic: 'gastronomy', kind: 'culture',
    text: 'Famous for fragrant fried rice with sweet soy sauce, skewered chicken satay with peanut sauce, and slow-cooked caramelized beef rendang.',
    source: 'https://en.wikipedia.org/wiki/Rendang', evidence: ['rendang', 'beef'], checked: '2026-11-11'
  },
  {
    id: 'IDN-3-003', iso: 'IDN', level: 3, topic: 'dance', kind: 'culture',
    text: 'The dramatic Kecak fire dance features a circle of chanting performers rhythmically vocalizing chattering sounds around flickering coconut torches.',
    source: 'https://en.wikipedia.org/wiki/Kecak', evidence: ['kecak', 'chanting'], checked: '2026-11-11'
  },
  {
    id: 'IDN-3-004', iso: 'IDN', level: 3, topic: 'capital', kind: 'current', year: 2022,
    text: 'In 2022, parliament approved legislation to build the futuristic smart forest capital city of Nusantara on the island of Borneo.',
    source: 'https://en.wikipedia.org/wiki/Nusantara_(city)', evidence: ['nusantara', 'capital'], checked: '2026-11-11'
  },
  {
    id: 'IDN-3-005', iso: 'IDN', level: 3, topic: 'train', kind: 'current', year: 2023,
    text: 'In 2023, launched Whoosh, the first operational high-speed rail line on its tropical landmass, connecting two major metropolitan cities.',
    source: 'https://en.wikipedia.org/wiki/Whoosh_(train)', evidence: ['whoosh', 'high-speed'], checked: '2026-11-11'
  },

  // ── 4. Colombia (COL) ──────────────────────────────────────────────────────
  {
    id: 'COL-1-002', iso: 'COL', level: 1, topic: 'gold', kind: 'history',
    text: 'The myth of El Dorado arose from Muisca indigenous ceremonies where a new ruler was dusted in gold powder before plunging into sacred lake waters.',
    source: 'https://en.wikipedia.org/wiki/El_Dorado', evidence: ['dorado', 'muisca'], checked: '2026-11-11'
  },
  {
    id: 'COL-1-003', iso: 'COL', level: 1, topic: 'cumbia', kind: 'culture',
    text: 'Cumbia musical folklore blends indigenous flutes and ancestral syncopated percussion drums, featuring dancers carrying glowing candles during nighttime courtyard festivities.',
    source: 'https://en.wikipedia.org/wiki/Cumbia', evidence: ['cumbia', 'flutes'], checked: '2026-11-11'
  },
  {
    id: 'COL-1-004', iso: 'COL', level: 1, topic: 'flowers', kind: 'culture',
    text: 'Feria de las Flores in Medellin features the silleteros parade where flower farmers carry massive elaborate floral medallions upon their backs.',
    source: 'https://en.wikipedia.org/wiki/Festival_of_the_Flowers', evidence: ['silleteros', 'flowers'], checked: '2026-11-11'
  },
  {
    id: 'COL-1-005', iso: 'COL', level: 1, topic: 'emerald', kind: 'record',
    text: 'World-renowned for producing the finest deep-green emerald gemstones mined from ancient hydrothermal sedimentary deposits in Muzo.',
    source: 'https://en.wikipedia.org/wiki/Colombian_emeralds', evidence: ['muzo', 'emerald'], checked: '2026-11-11'
  },
  {
    id: 'COL-2-002', iso: 'COL', level: 2, topic: 'literature', kind: 'history',
    text: 'Author Gabriel Garcia Marquez was awarded the Nobel Prize in Literature in 1982 for his epic masterpiece One Hundred Years of Solitude.',
    source: 'https://en.wikipedia.org/wiki/Gabriel_Garc%C3%ADa_M%C3%A1rquez', evidence: ['solitude', 'nobel'], checked: '2026-11-11'
  },
  {
    id: 'COL-2-003', iso: 'COL', level: 2, topic: 'salt cathedral', kind: 'landmark',
    text: 'The Salt Cathedral of Zipaquira is carved deep within underground halite mineral mines, featuring monumental illuminated chambers and altars.',
    source: 'https://en.wikipedia.org/wiki/Salt_Cathedral_of_Zipaquir%C3%A1', evidence: ['cathedral', 'salt'], checked: '2026-11-11'
  },
  {
    id: 'COL-2-004', iso: 'COL', level: 2, topic: 'palms', kind: 'record',
    text: 'The Cocora Valley is famous for towering wax palms, recognized as the tallest palm species in the world, rising amid misty mountain meadows.',
    source: 'https://en.wikipedia.org/wiki/Ceroxylon_quindiuense', evidence: ['cocora', 'palms'], checked: '2026-11-11'
  },
  {
    id: 'COL-2-005', iso: 'COL', level: 2, topic: 'art', kind: 'history',
    text: 'Artist Fernando Botero developed a signature visual style known as Boterismo, depicting people and animals in exaggerated rotund proportions.',
    source: 'https://en.wikipedia.org/wiki/Fernando_Botero', evidence: ['botero', 'style'], checked: '2026-11-11'
  },
  {
    id: 'COL-3-002', iso: 'COL', level: 3, topic: 'gastronomy', kind: 'culture',
    text: 'Famous for arepas grilled corn patties stuffed with cheese, hearty bandeja paisa platters with beans and avocado, and smooth washed coffee.',
    source: 'https://en.wikipedia.org/wiki/Arepa', evidence: ['arepa', 'corn'], checked: '2026-11-11'
  },
  {
    id: 'COL-3-003', iso: 'COL', level: 3, topic: 'river', kind: 'landmark',
    text: 'Cano Cristales is celebrated as the river of five colors, blooming in vibrant scarlet red tones due to aquatic macarenia plants.',
    source: 'https://en.wikipedia.org/wiki/Ca%C3%B1o_Cristales', evidence: ['cristales', 'macarenia'], checked: '2026-11-11'
  },
  {
    id: 'COL-3-004', iso: 'COL', level: 3, topic: 'cycling', kind: 'current', year: 2019,
    text: 'In 2019, cyclist Egan Bernal became the youngest rider in over a century to win the premier global road cycling tour general classification title.',
    source: 'https://en.wikipedia.org/wiki/Egan_Bernal', evidence: ['bernal', 'cycling'], checked: '2026-11-11'
  },
  {
    id: 'COL-3-005', iso: 'COL', level: 3, topic: 'rescue', kind: 'incident', year: 2023,
    text: 'In 2023, four indigenous children were miraculously found alive in dense jungle forty days after a plane crash in Operation Hope.',
    source: 'https://en.wikipedia.org/wiki/2023_Colombia_Cessna_206_crash', evidence: ['crash', 'children'], checked: '2026-11-11'
  },

  // ── 5. Chile (CHL) ─────────────────────────────────────────────────────────
  {
    id: 'CHL-1-002', iso: 'CHL', level: 1, topic: 'mapuche', kind: 'culture',
    text: 'Mapuche indigenous communities weave intricate wool textiles and craft silver pectoral jewelry known as trapelacucha, holding fierce traditions of autonomy.',
    source: 'https://en.wikipedia.org/wiki/Mapuche', evidence: ['mapuche', 'textiles'], checked: '2026-11-11'
  },
  {
    id: 'CHL-1-003', iso: 'CHL', level: 1, topic: 'mummies', kind: 'history',
    text: 'The Chinchorro mummies were artificially preserved thousands of years earlier than those along the Nile, utilizing clay masks and reed wrapping.',
    source: 'https://en.wikipedia.org/wiki/Chinchorro_mummies', evidence: ['chinchorro', 'mummies'], checked: '2026-11-11'
  },
  {
    id: 'CHL-1-004', iso: 'CHL', level: 1, topic: 'copper', kind: 'record',
    text: 'The world\'s largest open-pit copper mine, Chuquicamata, operates in high arid plateaus extracting massive volumes of essential industrial minerals.',
    source: 'https://en.wikipedia.org/wiki/Chuquicamata', evidence: ['chuquicamata', 'copper'], checked: '2026-11-11'
  },
  {
    id: 'CHL-1-005', iso: 'CHL', level: 1, topic: 'cueca', kind: 'culture',
    text: 'The cueca national courtship dance mimics the mating ritual of a rooster and hen, featuring dancers fluttering white handkerchiefs in rhythmic circles.',
    source: 'https://en.wikipedia.org/wiki/Cueca', evidence: ['cueca', 'handkerchiefs'], checked: '2026-11-11'
  },
  {
    id: 'CHL-2-002', iso: 'CHL', level: 2, topic: 'poetry', kind: 'history',
    text: 'Poet Pablo Neruda received the Nobel Prize in Literature in 1971 for impassioned verses celebrating love, social struggle, and elemental natural landscapes.',
    source: 'https://en.wikipedia.org/wiki/Pablo_Neruda', evidence: ['neruda', 'poetry'], checked: '2026-11-11'
  },
  {
    id: 'CHL-2-003', iso: 'CHL', level: 2, topic: 'observatory', kind: 'record',
    text: 'The ALMA radio telescope array on the Chajnantor plateau operates sixty-six antennas in dry thin air to observe star and planet formation.',
    source: 'https://en.wikipedia.org/wiki/Atacama_Large_Millimeter_Array', evidence: ['alma', 'antennas'], checked: '2026-11-11'
  },
  {
    id: 'CHL-2-004', iso: 'CHL', level: 2, topic: 'park', kind: 'landmark',
    text: 'Torres del Paine National Park showcases soaring granite spires, vibrant turquoise glacial lakes, and roaming herds of wild guanacos.',
    source: 'https://en.wikipedia.org/wiki/Torres_del_Paine_National_Park', evidence: ['paine', 'guanacos'], checked: '2026-11-11'
  },
  {
    id: 'CHL-2-005', iso: 'CHL', level: 2, topic: 'port', kind: 'history',
    text: 'Valparaiso historic seaport is renowned for colorful hillside wooden houses, outdoor street murals, and steep funicular elevator railways.',
    source: 'https://en.wikipedia.org/wiki/Valpara%C3%ADso', evidence: ['funicular', 'murals'], checked: '2026-11-11'
  },
  {
    id: 'CHL-3-002', iso: 'CHL', level: 3, topic: 'gastronomy', kind: 'culture',
    text: 'Famous for pastel de choclo sweet baked corn and ground beef casserole, empanadas de pino with olives, and refreshing pisco sour cocktails.',
    source: 'https://en.wikipedia.org/wiki/Pastel_de_choclo', evidence: ['pastel', 'choclo'], checked: '2026-11-11'
  },
  {
    id: 'CHL-3-003', iso: 'CHL', level: 3, topic: 'island', kind: 'landmark',
    text: 'Easter Island features nearly one thousand monumental stone moai statues with prominent chins and brows carved from volcanic tuff.',
    source: 'https://en.wikipedia.org/wiki/Moai', evidence: ['moai', 'statues'], checked: '2026-11-11'
  },
  {
    id: 'CHL-3-004', iso: 'CHL', level: 3, topic: 'mine rescue', kind: 'incident', year: 2010,
    text: 'In 2010, the miraculous rescue of thirty-three miners trapped deep underground inside the San Jose copper mine transfixed the world.',
    source: 'https://en.wikipedia.org/wiki/2010_Copiap%C3%B3_mining_accident', evidence: ['miners', 'rescue'], checked: '2026-11-11'
  },
  {
    id: 'CHL-3-005', iso: 'CHL', level: 3, topic: 'football', kind: 'current', year: 2015,
    text: 'In 2015, the national football squad captured its first continental championship tournament title on home soil in a dramatic penalty shootout.',
    source: 'https://en.wikipedia.org/wiki/2015_Copa_Am%C3%A9rica', evidence: ['championship', 'penalty'], checked: '2026-11-11'
  },

  // ── 6. Austria (AUT) ───────────────────────────────────────────────────────
  {
    id: 'AUT-1-002', iso: 'AUT', level: 1, topic: 'music', kind: 'history',
    text: 'Prodigy Wolfgang Amadeus Mozart composed timeless symphonies, concertos, and operas in Salzburg, transforming classical musical history before his early death.',
    source: 'https://en.wikipedia.org/wiki/Wolfgang_Amadeus_Mozart', evidence: ['mozart', 'symphonies'], checked: '2026-11-11'
  },
  {
    id: 'AUT-1-003', iso: 'AUT', level: 1, topic: 'coffeehouse', kind: 'culture',
    text: 'Traditional coffeehouse culture serves melange coffee alongside newspapers on wooden racks and glasses of fresh tap water on silver trays.',
    source: 'https://en.wikipedia.org/wiki/Viennese_coffee_house', evidence: ['coffee', 'melange'], checked: '2026-11-11'
  },
  {
    id: 'AUT-1-004', iso: 'AUT', level: 1, topic: 'waltz', kind: 'culture',
    text: 'The Strauss musical dynasty popularized the elegant ballroom waltz, creating immortal melodies like The Blue Danube performed during annual balls.',
    source: 'https://en.wikipedia.org/wiki/The_Blue_Danube', evidence: ['danube', 'waltz'], checked: '2026-11-11'
  },
  {
    id: 'AUT-1-005', iso: 'AUT', level: 1, topic: 'mummy', kind: 'history',
    text: 'Otzi the Iceman was discovered remarkably preserved within mountain glacier ice dating back more than five thousand years to the Copper Age.',
    source: 'https://en.wikipedia.org/wiki/%C3%96tzi', evidence: ['iceman', 'glacier'], checked: '2026-11-11'
  },
  {
    id: 'AUT-2-002', iso: 'AUT', level: 2, topic: 'painting', kind: 'history',
    text: 'Secessionist painter Gustav Klimt created iconic golden-phase artworks including The Kiss, adorned with shimmering gold leaf and intricate decorative patterns.',
    source: 'https://en.wikipedia.org/wiki/Gustav_Klimt', evidence: ['klimt', 'kiss'], checked: '2026-11-11'
  },
  {
    id: 'AUT-2-003', iso: 'AUT', level: 2, topic: 'psychoanalysis', kind: 'history',
    text: 'Neurologist Sigmund Freud founded psychoanalysis in Berggasse 19, exploring the unconscious mind, dream interpretation, and psychological theories.',
    source: 'https://en.wikipedia.org/wiki/Sigmund_Freud', evidence: ['freud', 'psychoanalysis'], checked: '2026-11-11'
  },
  {
    id: 'AUT-2-004', iso: 'AUT', level: 2, topic: 'palace', kind: 'landmark',
    text: 'Schonbrunn Palace served as the lavish summer residence of Habsburg monarchs, featuring baroque staterooms and expansive manicured palace gardens.',
    source: 'https://en.wikipedia.org/wiki/Sch%C3%B6nbrunn_Palace', evidence: ['palace', 'habsburg'], checked: '2026-11-11'
  },
  {
    id: 'AUT-2-005', iso: 'AUT', level: 2, topic: 'village', kind: 'landmark',
    text: 'Hallstatt stands as a picturesque lakeside village famous for ancient prehistoric salt mining tunnels and pastel-colored timber houses.',
    source: 'https://en.wikipedia.org/wiki/Hallstatt', evidence: ['hallstatt', 'salt'], checked: '2026-11-11'
  },
  {
    id: 'AUT-3-002', iso: 'AUT', level: 3, topic: 'gastronomy', kind: 'culture',
    text: 'Famous for golden-fried Wiener schnitzel served with lemon, sweet spiced apple strudel in paper-thin pastry, and Sachertorte chocolate cake.',
    source: 'https://en.wikipedia.org/wiki/Wiener_schnitzel', evidence: ['schnitzel', 'veal'], checked: '2026-11-11'
  },
  {
    id: 'AUT-3-003', iso: 'AUT', level: 3, topic: 'riding school', kind: 'culture',
    text: 'The classical riding school in the imperial palace preserves haute école dressage horsemanship performed by white Lipizzaner stallions.',
    source: 'https://en.wikipedia.org/wiki/Lipizzan', evidence: ['lipizzan', 'dressage'], checked: '2026-11-11'
  },
  {
    id: 'AUT-3-004', iso: 'AUT', level: 3, topic: 'music', kind: 'current', year: 2014,
    text: 'In 2014, singer Conchita Wurst captured international acclaim by winning the Eurovision Song Contest with the sweeping ballad Rise Like a Phoenix.',
    source: 'https://en.wikipedia.org/wiki/Conchita_Wurst', evidence: ['wurst', 'eurovision'], checked: '2026-11-11'
  },
  {
    id: 'AUT-3-005', iso: 'AUT', level: 3, topic: 'marathon', kind: 'incident', year: 2019,
    text: 'In 2019, marathon runner Eliud Kipchoge made athletic history in the Prater park by completing a marathon in under two hours.',
    source: 'https://en.wikipedia.org/wiki/Ineos_1:59_Challenge', evidence: ['kipchoge', 'marathon'], checked: '2026-11-11'
  },

  // ── 7. Ireland (IRL) ───────────────────────────────────────────────────────
  {
    id: 'IRL-1-002', iso: 'IRL', level: 1, topic: 'tomb', kind: 'history',
    text: 'Newgrange prehistoric passage tomb was engineered around 3200 BCE so the winter solstice dawn sunbeam illuminates the inner chamber through a roofbox.',
    source: 'https://en.wikipedia.org/wiki/Newgrange', evidence: ['newgrange', 'solstice'], checked: '2026-11-11'
  },
  {
    id: 'IRL-1-003', iso: 'IRL', level: 1, topic: 'manuscript', kind: 'history',
    text: 'The Book of Kells preserves an exquisitely illuminated four-Gospel manuscript created by Celtic monks with Celtic spirals, animals, and vibrant pigments.',
    source: 'https://en.wikipedia.org/wiki/Book_of_Kells', evidence: ['kells', 'manuscript'], checked: '2026-11-11'
  },
  {
    id: 'IRL-1-004', iso: 'IRL', level: 1, topic: 'folklore', kind: 'culture',
    text: 'Celtic folklore tells of mischievous leprechauns hiding pots of gold at rainbows and banshees wailing to foretell imminent family tragedy.',
    source: 'https://en.wikipedia.org/wiki/Leprechaun', evidence: ['leprechaun', 'folklore'], checked: '2026-11-11'
  },
  {
    id: 'IRL-1-005', iso: 'IRL', level: 1, topic: 'harp', kind: 'culture',
    text: 'The Celtic wire-strung harp serves as a revered musical instrument and national heraldic emblem featured on official seals and coinage.',
    source: 'https://en.wikipedia.org/wiki/Celtic_harp', evidence: ['harp', 'celtic'], checked: '2026-11-11'
  },
  {
    id: 'IRL-2-002', iso: 'IRL', level: 2, topic: 'literature', kind: 'history',
    text: 'Author James Joyce wrote Ulysses in 1922, creating a landmark modernist stream-of-consciousness novel chronicling Leopold Bloom across a single June day.',
    source: 'https://en.wikipedia.org/wiki/Ulysses_(novel)', evidence: ['joyce', 'ulysses'], checked: '2026-11-11'
  },
  {
    id: 'IRL-2-003', iso: 'IRL', level: 2, topic: 'science', kind: 'history',
    text: 'Physicist John Tyndall proved the atmospheric greenhouse effect and explained why the sky is blue through light-scattering experiments in 1859.',
    source: 'https://en.wikipedia.org/wiki/John_Tyndall', evidence: ['tyndall', 'greenhouse'], checked: '2026-11-11'
  },
  {
    id: 'IRL-2-004', iso: 'IRL', level: 2, topic: 'cliffs', kind: 'landmark',
    text: 'The Cliffs of Moher rise over two hundred meters vertically above crashing ocean waves, teeming with nesting seabirds including colorful horned puffins.',
    source: 'https://en.wikipedia.org/wiki/Cliffs_of_Moher', evidence: ['moher', 'cliffs'], checked: '2026-11-11'
  },
  {
    id: 'IRL-2-005', iso: 'IRL', level: 2, topic: 'college', kind: 'history',
    text: 'Trinity College Library houses the magnificent Long Room, holding two hundred thousand historic books beneath a barrel-vaulted oak ceiling.',
    source: 'https://en.wikipedia.org/wiki/Trinity_College_Library', evidence: ['library', 'trinity'], checked: '2026-11-11'
  },
  {
    id: 'IRL-3-002', iso: 'IRL', level: 3, topic: 'music', kind: 'culture',
    text: 'The traditional theatrical tap performance Riverdance gained international phenomenon status with rapid synchronized footwork and spirited fiddling.',
    source: 'https://en.wikipedia.org/wiki/Riverdance', evidence: ['riverdance', 'dance'], checked: '2026-11-11'
  },
  {
    id: 'IRL-3-003', iso: 'IRL', level: 3, topic: 'causeway', kind: 'landmark',
    text: 'Giant\'s Causeway showcases forty thousand interlocking hexagonal basalt columns formed by ancient volcanic activity, shrouded in giant folklore legends.',
    source: 'https://en.wikipedia.org/wiki/Giant%27s_Causeway', evidence: ['causeway', 'basalt'], checked: '2026-11-11'
  },
  {
    id: 'IRL-3-004', iso: 'IRL', level: 3, topic: 'rugby', kind: 'current', year: 2023,
    text: 'In 2023, the men\'s national rugby team captured the Six Nations Grand Slam title, solidifying their ranking as the world\'s top-ranked squad.',
    source: 'https://en.wikipedia.org/wiki/2023_Six_Nations_Championship', evidence: ['championship', 'rugby'], checked: '2026-11-11'
  },
  {
    id: 'IRL-3-005', iso: 'IRL', level: 3, topic: 'referendum', kind: 'current', year: 2015,
    text: 'In 2015, became the first country in the world to legalize same-sex marriage through a nationwide popular referendum ballot.',
    source: 'https://en.wikipedia.org/wiki/Thirty-fourth_Amendment_of_the_Constitution_of_Ireland', evidence: ['referendum', 'marriage'], checked: '2026-11-11'
  },

  // ── 8. Poland (POL) ────────────────────────────────────────────────────────
  {
    id: 'POL-1-002', iso: 'POL', level: 1, topic: 'astronomy', kind: 'history',
    text: 'Astronomer Nicolaus Copernicus published De revolutionibus in 1543, proposing the revolutionary heliocentric model placing the Sun at the planetary center.',
    source: 'https://en.wikipedia.org/wiki/Nicolaus_Copernicus', evidence: ['copernicus', 'heliocentric'], checked: '2026-11-11'
  },
  {
    id: 'POL-1-003', iso: 'POL', level: 1, topic: 'music', kind: 'history',
    text: 'Virtuoso composer Frederic Chopin composed romantic piano nocturnes, polonaises, and mazurkas infused with melancholic patriotic longing.',
    source: 'https://en.wikipedia.org/wiki/Fr%C3%A9d%C3%A9ric_Chopin', evidence: ['chopin', 'nocturnes'], checked: '2026-11-11'
  },
  {
    id: 'POL-1-004', iso: 'POL', level: 1, topic: 'bison', kind: 'record',
    text: 'Bialowieza Forest preserves primeval lowland woodland, sheltering the largest wild population of heavy woodland bison.',
    source: 'https://en.wikipedia.org/wiki/Bia%C5%82owie%C5%BCa_Forest', evidence: ['forest', 'bison'], checked: '2026-11-11'
  },
  {
    id: 'POL-1-005', iso: 'POL', level: 1, topic: 'paper cutting', kind: 'culture',
    text: 'Traditional folk art of wycinanki features intricate multicolored paper silhouettes cut with sheep-shearing scissors to decorate rustic timber homes.',
    source: 'https://en.wikipedia.org/wiki/Wycinanki', evidence: ['wycinanki', 'paper'], checked: '2026-11-11'
  },
  {
    id: 'POL-2-002', iso: 'POL', level: 2, topic: 'science', kind: 'history',
    text: 'Marie Curie discovered radium and polonium, becoming the first woman to win a Nobel Prize and the only person to win in two distinct sciences.',
    source: 'https://en.wikipedia.org/wiki/Marie_Curie', evidence: ['curie', 'radium'], checked: '2026-11-11'
  },
  {
    id: 'POL-2-003', iso: 'POL', level: 2, topic: 'castle', kind: 'record',
    text: 'Malbork Castle was founded by Teutonic Knights as the largest castle in the world by land surface area, built from millions of red bricks.',
    source: 'https://en.wikipedia.org/wiki/Malbork_Castle', evidence: ['malbork', 'castle'], checked: '2026-11-11'
  },
  {
    id: 'POL-2-004', iso: 'POL', level: 2, topic: 'salt mine', kind: 'history',
    text: 'Wieliczka Salt Mine features underground chapels, chandeliers, and religious sculptures carved entirely from subterranean rock salt by generations of miners.',
    source: 'https://en.wikipedia.org/wiki/Wieliczka_Salt_Mine', evidence: ['wieliczka', 'mine'], checked: '2026-11-11'
  },
  {
    id: 'POL-2-005', iso: 'POL', level: 2, topic: 'reconstruction', kind: 'history',
    text: 'The historic royal old town was meticulously reconstructed stone by stone from 18th-century paintings after almost total destruction during wartime.',
    source: 'https://en.wikipedia.org/wiki/Old_Town,_Warsaw', evidence: ['old town', 'reconstruction'], checked: '2026-11-11'
  },
  {
    id: 'POL-3-002', iso: 'POL', level: 3, topic: 'gastronomy', kind: 'culture',
    text: 'Famous for pierogi dough dumplings boiled and pan-fried with onions, sour fermented rye soup, and slow-simmered bigos hunter\'s stew.',
    source: 'https://en.wikipedia.org/wiki/Pierogi', evidence: ['pierogi', 'dumplings'], checked: '2026-11-11'
  },
  {
    id: 'POL-3-003', iso: 'POL', level: 3, topic: 'dragon', kind: 'culture',
    text: 'Wawel Castle overlooks a limestone river den where legends recount how a clever cobbler defeated a ferocious dragon with sulfur.',
    source: 'https://en.wikipedia.org/wiki/Wawel_Dragon', evidence: ['wawel', 'dragon'], checked: '2026-11-11'
  },
  {
    id: 'POL-3-004', iso: 'POL', level: 3, topic: 'tennis', kind: 'current', year: 2022,
    text: 'In 2022, tennis star Iga Swiatek mounted an astounding thirty-seven match winning streak and captured multiple Grand Slam championship titles.',
    source: 'https://en.wikipedia.org/wiki/Iga_%C5%9Awi%C4%85tek', evidence: ['swiatek', 'streak'], checked: '2026-11-11'
  },
  {
    id: 'POL-3-005', iso: 'POL', level: 3, topic: 'literature', kind: 'current', year: 2018,
    text: 'In 2018, acclaimed author Olga Tokarczuk was awarded the Nobel Prize in Literature for a narrative imagination crossing boundaries with encyclopedic passion.',
    source: 'https://en.wikipedia.org/wiki/Olga_Tokarczuk', evidence: ['tokarczuk', 'nobel'], checked: '2026-11-11'
  },

  // ── 9. Singapore (SGP) ─────────────────────────────────────────────────────
  {
    id: 'SGP-1-002', iso: 'SGP', level: 1, topic: 'merlion', kind: 'culture',
    text: 'The iconic Merlion statue with the head of a lion and body of a fish serves as a beloved national personification spouting water.',
    source: 'https://en.wikipedia.org/wiki/Merlion', evidence: ['merlion', 'statue'], checked: '2026-11-11'
  },
  {
    id: 'SGP-1-003', iso: 'SGP', level: 1, topic: 'peranakan', kind: 'culture',
    text: 'Peranakan heritage blends Chinese and Malay traditions in ornate porcelain, intricate beaded slippers, and spicy aromatic Nyonya laksa noodles.',
    source: 'https://en.wikipedia.org/wiki/Peranakan', evidence: ['peranakan', 'nyonya'], checked: '2026-11-11'
  },
  {
    id: 'SGP-1-004', iso: 'SGP', level: 1, topic: 'botany', kind: 'history',
    text: 'The National Botanic Gardens was founded in 1859, recognized as a UNESCO World Heritage site renowned for its orchid breeding and conservation.',
    source: 'https://en.wikipedia.org/wiki/Singapore_Botanic_Gardens', evidence: ['botanic', 'orchid'], checked: '2026-11-11'
  },
  {
    id: 'SGP-1-005', iso: 'SGP', level: 1, topic: 'shophouses', kind: 'culture',
    text: 'Historic shophouses feature sheltered five-foot ways, colorful ornamental facade carvings, and louvered wooden shutters in bustling trading commercial districts.',
    source: 'https://en.wikipedia.org/wiki/Shophouse', evidence: ['shophouse', 'facade'], checked: '2026-11-11'
  },
  {
    id: 'SGP-2-002', iso: 'SGP', level: 2, topic: 'gardens', kind: 'landmark',
    text: 'Gardens by the Bay features eighteen towering solar-powered Supertree vertical structures draped with climbing ferns, orchids, and bromeliads.',
    source: 'https://en.wikipedia.org/wiki/Gardens_by_the_Bay', evidence: ['supertree', 'gardens'], checked: '2026-11-11'
  },
  {
    id: 'SGP-2-003', iso: 'SGP', level: 2, topic: 'port', kind: 'record',
    text: 'Tuas Mega Port represents a cutting-edge automated maritime hub utilizing driverless automated guided vehicles and electric yard cranes.',
    source: 'https://en.wikipedia.org/wiki/Tuas_Port', evidence: ['tuas', 'port'], checked: '2026-11-11'
  },
  {
    id: 'SGP-2-004', iso: 'SGP', level: 2, topic: 'airport', kind: 'landmark',
    text: 'Jewel Changi Airport features the world\'s tallest indoor waterfall, the Rain Vortex, cascading seven stories through a lush terraced forest dome.',
    source: 'https://en.wikipedia.org/wiki/Jewel_Changi_Airport', evidence: ['vortex', 'waterfall'], checked: '2026-11-11'
  },
  {
    id: 'SGP-2-005', iso: 'SGP', level: 2, topic: 'water', kind: 'record',
    text: 'Pioneered NEWater high-grade recycled water utilizing advanced dual-membrane microfiltration and ultraviolet technology to ensure water self-sufficiency.',
    source: 'https://en.wikipedia.org/wiki/NEWater', evidence: ['newater', 'microfiltration'], checked: '2026-11-11'
  },
  {
    id: 'SGP-3-002', iso: 'SGP', level: 3, topic: 'gastronomy', kind: 'culture',
    text: 'Famous for Hainanese poached chicken rice with ginger chili sauce, spicy chili crab with fried buns, and bustling hawker centres.',
    source: 'https://en.wikipedia.org/wiki/Hainanese_chicken_rice', evidence: ['chicken', 'rice'], checked: '2026-11-11'
  },
  {
    id: 'SGP-3-003', iso: 'SGP', level: 3, topic: 'hotel', kind: 'landmark',
    text: 'Marina Bay Sands hotel features three soaring towers linked by a cantilevered rooftop SkyPark with a famous panoramic infinity pool.',
    source: 'https://en.wikipedia.org/wiki/Marina_Bay_Sands', evidence: ['sands', 'skypark'], checked: '2026-11-11'
  },
  {
    id: 'SGP-3-004', iso: 'SGP', level: 3, topic: 'heritage', kind: 'current', year: 2020,
    text: 'In 2020, hawker culture received formal inscription on the UNESCO Representative List of the Intangible Cultural Heritage of Humanity.',
    source: 'https://en.wikipedia.org/wiki/Hawker_centre', evidence: ['hawker', 'unesco'], checked: '2026-11-11'
  },
  {
    id: 'SGP-3-005', iso: 'SGP', level: 3, topic: 'badminton', kind: 'current', year: 2021,
    text: 'In 2021, athlete Loh Kean Yew made national history by capturing the men\'s singles title at the World Badminton Championships.',
    source: 'https://en.wikipedia.org/wiki/Loh_Kean_Yew', evidence: ['badminton', 'singles'], checked: '2026-11-11'
  },

  // ── 10. Saudi Arabia (SAU) ─────────────────────────────────────────────────
  {
    id: 'SAU-1-002', iso: 'SAU', level: 1, topic: 'hospitality', kind: 'culture',
    text: 'Traditional coffee culture involves brewing lightly roasted beans with cardamom and saffron in copper dallah pots, served alongside sweet dates.',
    source: 'https://en.wikipedia.org/wiki/Arabic_coffee', evidence: ['dallah', 'cardamom'], checked: '2026-11-11'
  },
  {
    id: 'SAU-1-003', iso: 'SAU', level: 1, topic: 'architecture', kind: 'culture',
    text: 'Historic Al-Balad in Jeddah features multi-story houses built from coral limestone and adorned with elaborate carved wooden roshan balconies.',
    source: 'https://en.wikipedia.org/wiki/Al-Balad,_Jeddah', evidence: ['balad', 'roshan'], checked: '2026-11-11'
  },
  {
    id: 'SAU-1-004', iso: 'SAU', level: 1, topic: 'desert', kind: 'record',
    text: 'The Rub\' al Khali spans vast expanses of undulating orange sand dunes as the largest continuous sand desert on the planet.',
    source: 'https://en.wikipedia.org/wiki/Rub%27_al_Khali', evidence: ['khali', 'dunes'], checked: '2026-11-11'
  },
  {
    id: 'SAU-1-005', iso: 'SAU', level: 1, topic: 'falconry', kind: 'culture',
    text: 'Ancient heritage of hunting with trained falcons across arid desert plateaus, celebrated through international breeding festivals and auctions.',
    source: 'https://en.wikipedia.org/wiki/Falconry', evidence: ['falconry', 'falcons'], checked: '2026-11-11'
  },
  {
    id: 'SAU-2-002', iso: 'SAU', level: 2, topic: 'archaeology', kind: 'history',
    text: 'Hegra at AlUla preserves more than one hundred monumental tombs with ornate carved facades cut directly into sandstone outcrops.',
    source: 'https://en.wikipedia.org/wiki/Hegra_(Mada%27in_Salih)', evidence: ['hegra', 'tombs'], checked: '2026-11-11'
  },
  {
    id: 'SAU-2-003', iso: 'SAU', level: 2, topic: 'fortress', kind: 'history',
    text: 'Masmak Fortress was captured in 1902 in a daring dawn assault, marking a pivotal turning point in the unification of the kingdom.',
    source: 'https://en.wikipedia.org/wiki/Masmak_fort', evidence: ['masmak', 'fortress'], checked: '2026-11-11'
  },
  {
    id: 'SAU-2-004', iso: 'SAU', level: 2, topic: 'oasis', kind: 'record',
    text: 'Al-Ahsa Oasis forms the largest self-contained desert oasis on Earth, nurturing over two million date palm trees fed by thermal springs.',
    source: 'https://en.wikipedia.org/wiki/Al-Ahsa_Oasis', evidence: ['ahsa', 'oasis'], checked: '2026-11-11'
  },
  {
    id: 'SAU-2-005', iso: 'SAU', level: 2, topic: 'edge of the world', kind: 'landmark',
    text: 'The Tuwaiq escarpment, renowned as the Edge of the World, features dramatic sheer limestone cliffs dropping hundreds of meters to ancient plains.',
    source: 'https://en.wikipedia.org/wiki/Tuwaiq', evidence: ['tuwaiq', 'escarpment'], checked: '2026-11-11'
  },
  {
    id: 'SAU-3-002', iso: 'SAU', level: 3, topic: 'gastronomy', kind: 'culture',
    text: 'Famous for kabsa spiced long-grain rice topped with tender roasted chicken or lamb, toasted pine nuts, and savory tomato broth.',
    source: 'https://en.wikipedia.org/wiki/Kabsa', evidence: ['kabsa', 'rice'], checked: '2026-11-11'
  },
  {
    id: 'SAU-3-003', iso: 'SAU', level: 3, topic: 'tower', kind: 'landmark',
    text: 'Kingdom Centre skyscraper features an iconic curved inverted parabolic arch spanned by a glass skybridge viewing deck.',
    source: 'https://en.wikipedia.org/wiki/Kingdom_Centre', evidence: ['kingdom', 'skybridge'], checked: '2026-11-11'
  },
  {
    id: 'SAU-3-004', iso: 'SAU', level: 3, topic: 'football', kind: 'current', year: 2022,
    text: 'In 2022, the national football squad produced one of the greatest World Cup upsets in sporting history by defeating the eventual champions 2-1.',
    source: 'https://en.wikipedia.org/wiki/2022_FIFA_World_Cup', evidence: ['champions', 'world cup'], checked: '2026-11-11'
  },
  {
    id: 'SAU-3-005', iso: 'SAU', level: 3, topic: 'space', kind: 'current', year: 2023,
    text: 'In 2023, biomedical researcher Rayyanah Barnawi made history by flying to the International Space Station aboard the Axiom Mission 2.',
    source: 'https://en.wikipedia.org/wiki/Rayyanah_Barnawi', evidence: ['barnawi', 'space'], checked: '2026-11-11'
  },

  // ── 11. United Arab Emirates (ARE) ─────────────────────────────────────────
  {
    id: 'ARE-1-002', iso: 'ARE', level: 1, topic: 'falaj', kind: 'history',
    text: 'Ancient aflaj irrigation systems channeled fresh water from mountain aquifers through underground gravity tunnels to nurture desert date oases.',
    source: 'https://en.wikipedia.org/wiki/Al_Ain', evidence: ['aflaj', 'oasis'], checked: '2026-11-11'
  },
  {
    id: 'ARE-1-003', iso: 'ARE', level: 1, topic: 'pearls', kind: 'history',
    text: 'Pearl diving formed the historic economic backbone along coastal creeks, where brave free-divers plunged to seabed reefs with nose clips.',
    source: 'https://en.wikipedia.org/wiki/Pearl_hunting', evidence: ['pearl', 'oysters'], checked: '2026-11-11'
  },
  {
    id: 'ARE-1-004', iso: 'ARE', level: 1, topic: 'dhow', kind: 'culture',
    text: 'Traditional wooden dhow boats with triangular lateen sails have navigated oceanic trade routes for centuries transporting textiles and spices.',
    source: 'https://en.wikipedia.org/wiki/Dhow', evidence: ['dhow', 'sails'], checked: '2026-11-11'
  },
  {
    id: 'ARE-1-005', iso: 'ARE', level: 1, topic: 'weaving', kind: 'culture',
    text: 'Al-Sadu traditional weaving uses dyed sheep and camel wool on floor looms to craft geometric patterned tents and camel blankets.',
    source: 'https://en.wikipedia.org/wiki/Al_Sadu', evidence: ['sadu', 'weaving'], checked: '2026-11-11'
  },
  {
    id: 'ARE-2-002', iso: 'ARE', level: 2, topic: 'mosque', kind: 'landmark',
    text: 'Sheikh Zayed Grand Mosque features eighty-two white marble domes, gold-leaf candelabras, and the world\'s largest hand-knotted wool carpet.',
    source: 'https://en.wikipedia.org/wiki/Sheikh_Zayed_Mosque', evidence: ['zayed', 'mosque'], checked: '2026-11-11'
  },
  {
    id: 'ARE-2-003', iso: 'ARE', level: 2, topic: 'museum', kind: 'landmark',
    text: 'Louvre museum under the coastal dome is sheltered beneath a silvery canopy of eight thousand geometric stars creating a rain of light effect.',
    source: 'https://en.wikipedia.org/wiki/Louvre_Abu_Dhabi', evidence: ['louvre', 'dome'], checked: '2026-11-11'
  },
  {
    id: 'ARE-2-004', iso: 'ARE', level: 2, topic: 'falcon', kind: 'culture',
    text: 'The national falcon hospital operates as the premier avian medical clinic treating thousands of prized hunting birds annually.',
    source: 'https://en.wikipedia.org/wiki/Abu_Dhabi_Falcon_Hospital', evidence: ['falcon', 'hospital'], checked: '2026-11-11'
  },
  {
    id: 'ARE-2-005', iso: 'ARE', level: 2, topic: 'fort', kind: 'history',
    text: 'Qasr Al Hosn stands as the oldest stone watchtower and palace structure, preserving the historical origin of the coastal settlement.',
    source: 'https://en.wikipedia.org/wiki/Qasr_al-Hosn', evidence: ['qasr', 'hosn'], checked: '2026-11-11'
  },
  {
    id: 'ARE-3-002', iso: 'ARE', level: 3, topic: 'gastronomy', kind: 'culture',
    text: 'Famous for savory al harees cracked wheat slow-simmered with tender meat, sweet saffron luqaimat dumplings, and fragrant cardamon tea.',
    source: 'https://en.wikipedia.org/wiki/Harees', evidence: ['harees', 'wheat'], checked: '2026-11-11'
  },
  {
    id: 'ARE-3-003', iso: 'ARE', level: 3, topic: 'skyscraper', kind: 'record',
    text: 'Burj Khalifa soars to 828 meters as the tallest building and freestanding structure in the world, dominating the desert skyline.',
    source: 'https://en.wikipedia.org/wiki/Burj_Khalifa', evidence: ['khalifa', 'tallest'], checked: '2026-11-11'
  },
  {
    id: 'ARE-3-004', iso: 'ARE', level: 3, topic: 'mars probe', kind: 'current', year: 2021,
    text: 'In 2021, the Hope spacecraft successfully entered orbit around Mars, returning revolutionary atmospheric data on seasonal Martian weather cycles.',
    source: 'https://en.wikipedia.org/wiki/Emirates_Mars_Mission', evidence: ['hope', 'mars'], checked: '2026-11-11'
  },
  {
    id: 'ARE-3-005', iso: 'ARE', level: 3, topic: 'climate summit', kind: 'current', year: 2023,
    text: 'In 2023, hosted the COP28 global climate summit where nearly two hundred nations pledged to transition away from fossil fuels.',
    source: 'https://en.wikipedia.org/wiki/2023_United_Nations_Climate_Change_Conference', evidence: ['climate', 'conference'], checked: '2026-11-11'
  },

  // ── 12. Nigeria (NGA) ──────────────────────────────────────────────────────
  {
    id: 'NGA-1-002', iso: 'NGA', level: 1, topic: 'bronzes', kind: 'history',
    text: 'The historic forest kingdom of bronze craftsmen produced renowned cast bronze and brass relief plaques depicting court rituals, warriors, and kings.',
    source: 'https://en.wikipedia.org/wiki/Benin_Bronzes', evidence: ['bronzes', 'plaques'], checked: '2026-11-11'
  },
  {
    id: 'NGA-1-003', iso: 'NGA', level: 1, topic: 'nok', kind: 'history',
    text: 'The ancient Nok culture sculpted remarkable stylized terracotta human heads and animal figures with pierced pupils dating back over two millennia.',
    source: 'https://en.wikipedia.org/wiki/Nok_culture', evidence: ['nok', 'terracotta'], checked: '2026-11-11'
  },
  {
    id: 'NGA-1-004', iso: 'NGA', level: 1, topic: 'calabar', kind: 'culture',
    text: 'The Calabar Carnival attracts thousands of costumed masquerade performers in a month-long street pageant celebrated as the pride of the nation.',
    source: 'https://en.wikipedia.org/wiki/Calabar_Carnival', evidence: ['calabar', 'carnival'], checked: '2026-11-11'
  },
  {
    id: 'NGA-1-005', iso: 'NGA', level: 1, topic: 'dyeing', kind: 'culture',
    text: 'Centuries-old Kofar Mata indigo dyeing pits continue utilizing natural crushed indigo leaves to dye patterned cotton textiles in stone vats.',
    source: 'https://en.wikipedia.org/wiki/Kofar_Mata_Dye_Pits', evidence: ['dye', 'indigo'], checked: '2026-11-11'
  },
  {
    id: 'NGA-2-002', iso: 'NGA', level: 2, topic: 'literature', kind: 'history',
    text: 'Author Chinua Achebe published Things Fall Apart in 1958, chronicling the clash of traditional village customs and foreign colonial domination.',
    source: 'https://en.wikipedia.org/wiki/Things_Fall_Apart', evidence: ['achebe', 'things fall apart'], checked: '2026-11-11'
  },
  {
    id: 'NGA-2-003', iso: 'NGA', level: 2, topic: 'literature', kind: 'history',
    text: 'Playwright Wole Soyinka was awarded the Nobel Prize in Literature in 1986, celebrated for poetic drama steeped in rich mythological Yoruba heritage.',
    source: 'https://en.wikipedia.org/wiki/Wole_Soyinka', evidence: ['soyinka', 'nobel'], checked: '2026-11-11'
  },
  {
    id: 'NGA-2-004', iso: 'NGA', level: 2, topic: 'grove', kind: 'landmark',
    text: 'The Osun-Osogbo Sacred Grove protects dense primary rain forest and sanctuaries along riverbanks dedicated to the fertility goddess Osun.',
    source: 'https://en.wikipedia.org/wiki/Osun-Osogbo', evidence: ['osun', 'sacred'], checked: '2026-11-11'
  },
  {
    id: 'NGA-2-005', iso: 'NGA', level: 2, topic: 'rock', kind: 'landmark',
    text: 'Zuma Rock stands as a colossal monolithic inselberg rising over seven hundred meters with natural contours resembling a human facial profile.',
    source: 'https://en.wikipedia.org/wiki/Zuma_Rock', evidence: ['zuma', 'rock'], checked: '2026-11-11'
  },
  {
    id: 'NGA-3-002', iso: 'NGA', level: 3, topic: 'gastronomy', kind: 'culture',
    text: 'Famous for spicy suya grilled beef skewers coated in ground peanut pepper spices, rich egusi melon soup, and pounded yam.',
    source: 'https://en.wikipedia.org/wiki/Suya', evidence: ['suya', 'skewers'], checked: '2026-11-11'
  },
  {
    id: 'NGA-3-003', iso: 'NGA', level: 3, topic: 'music', kind: 'culture',
    text: 'Fela Kuti created the infectious Afrobeat musical genre at the Afrika Shrine, blending energetic jazz improvisation with highlife and political satire.',
    source: 'https://en.wikipedia.org/wiki/Fela_Kuti', evidence: ['afrobeat', 'fela'], checked: '2026-11-11'
  },
  {
    id: 'NGA-3-004', iso: 'NGA', level: 3, topic: 'athletics', kind: 'current', year: 2022,
    text: 'In 2022, track star Tobi Amusan shattered the world record in the 100-meter hurdles at the World Athletics Championships, clocking 12.12 seconds.',
    source: 'https://en.wikipedia.org/wiki/Tobi_Amusan', evidence: ['amusan', 'hurdles'], checked: '2026-11-11'
  },
  {
    id: 'NGA-3-005', iso: 'NGA', level: 3, topic: 'super eagles', kind: 'current', year: 2024,
    text: 'In 2024, the men\'s national football squad surged to the final of the continental championship tournament, earning tournament silver.',
    source: 'https://en.wikipedia.org/wiki/2023_Africa_Cup_of_Nations', evidence: ['tournament', 'championship'], checked: '2026-11-11'
  }
];

async function run() {
  console.log(`Auditing Chunk 4 (${chunk4Items.length} items)...`);
  let hasErrors = false;

  for (const item of chunk4Items) {
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
    console.error('Chunk 4 has errors! Aborting.');
    process.exit(1);
  }

  console.log(`Chunk 4 verified! 100% of ${chunk4Items.length} items pass all pattern and URL checks.`);

  // Append items to clues.json and clues.js
  const combined = [...existingClues, ...chunk4Items];
  fs.writeFileSync(cluesPath, JSON.stringify(combined, null, 2), 'utf8');
  fs.writeFileSync(cluesJsPath, `// Clue Library\nexport const CLUES_LIBRARY = ${JSON.stringify(combined, null, 2)};\nexport default CLUES_LIBRARY;\n`, 'utf8');
  console.log(`Updated clues.json and clues.js! Total items now: ${combined.length}`);
}

run().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
