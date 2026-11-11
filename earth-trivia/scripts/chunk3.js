import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { validateItemSync, verifySourceUrl } from './clueTool.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const cluesPath = path.resolve(__dirname, '../data/clues.json');
const cluesJsPath = path.resolve(__dirname, '../data/clues.js');
const existingClues = JSON.parse(fs.readFileSync(cluesPath, 'utf8'));

export const chunk3Items = [
  // ── 1. United Kingdom (GBR) ────────────────────────────────────────────────
  {
    id: 'GBR-1-002', iso: 'GBR', level: 1, topic: 'theatre', kind: 'history',
    text: 'Playwright William Shakespeare composed celebrated tragedies and comedies during the Elizabethan era, revolutionizing world theatrical drama and iambic pentameter verse.',
    source: 'https://en.wikipedia.org/wiki/William_Shakespeare', evidence: ['shakespeare', 'pentameter'], checked: '2026-11-11'
  },
  {
    id: 'GBR-1-003', iso: 'GBR', level: 1, topic: 'tartan', kind: 'culture',
    text: 'Highland clans wore woven wool kilt garments with distinctive criss-crossed tartan patterns signifying lineage, heritage, and regional identity.',
    source: 'https://en.wikipedia.org/wiki/Tartan', evidence: ['tartan', 'clans'], checked: '2026-11-11'
  },
  {
    id: 'GBR-1-004', iso: 'GBR', level: 1, topic: 'mythology', kind: 'culture',
    text: 'Arthurian legends recount tales of the mythical King Arthur, the round table of chivalric knights, and the enchanted sword Excalibur.',
    source: 'https://en.wikipedia.org/wiki/King_Arthur', evidence: ['excalibur', 'arthur'], checked: '2026-11-11'
  },
  {
    id: 'GBR-1-005', iso: 'GBR', level: 1, topic: 'charter', kind: 'history',
    text: 'Magna Carta was sealed at Runnymede in 1215, establishing the foundational legal principle that monarchs remain subject to the law of the realm.',
    source: 'https://en.wikipedia.org/wiki/Magna_Carta', evidence: ['magna carta', 'runnymede'], checked: '2026-11-11'
  },
  {
    id: 'GBR-2-002', iso: 'GBR', level: 2, topic: 'evolution', kind: 'history',
    text: 'Naturalist Charles Darwin formulated the groundbreaking theory of evolution by natural selection following his historic voyage aboard the Beagle.',
    source: 'https://en.wikipedia.org/wiki/Charles_Darwin', evidence: ['darwin', 'beagle'], checked: '2026-11-11'
  },
  {
    id: 'GBR-2-003', iso: 'GBR', level: 2, topic: 'physics', kind: 'history',
    text: 'Isaac Newton formulated universal gravitation and three fundamental laws of classical mechanics, publishing his monumental Principia Mathematica in 1687.',
    source: 'https://en.wikipedia.org/wiki/Isaac_Newton', evidence: ['newton', 'principia'], checked: '2026-11-11'
  },
  {
    id: 'GBR-2-004', iso: 'GBR', level: 2, topic: 'clock', kind: 'history',
    text: 'Big Ben clock tower houses the Great Bell that has reliably struck hourly acoustic chimes over parliament since 1859.',
    source: 'https://en.wikipedia.org/wiki/Big_Ben', evidence: ['big ben', 'chimes'], checked: '2026-11-11'
  },
  {
    id: 'GBR-2-005', iso: 'GBR', level: 2, topic: 'computing', kind: 'history',
    text: 'Mathematician Alan Turing broke enigma cryptographic ciphers at Bletchley Park and pioneered foundational concepts of modern theoretical computing.',
    source: 'https://en.wikipedia.org/wiki/Alan_Turing', evidence: ['turing', 'bletchley'], checked: '2026-11-11'
  },
  {
    id: 'GBR-3-002', iso: 'GBR', level: 3, topic: 'music', kind: 'culture',
    text: 'The Beatles revolutionized rock and pop music from the Cavern Club, creating iconic studio albums and international Beatlemania hysteria.',
    source: 'https://en.wikipedia.org/wiki/The_Beatles', evidence: ['beatles', 'cavern'], checked: '2026-11-11'
  },
  {
    id: 'GBR-3-003', iso: 'GBR', level: 3, topic: 'monument', kind: 'landmark',
    text: 'Stonehenge prehistoric monument stands as a circular ring of standing sarsen megaliths constructed thousands of years ago for astronomical alignment.',
    source: 'https://en.wikipedia.org/wiki/Stonehenge', evidence: ['stonehenge', 'sarsen'], checked: '2026-11-11'
  },
  {
    id: 'GBR-3-004', iso: 'GBR', level: 3, topic: 'olympics', kind: 'current', year: 2012,
    text: 'In 2012, hosted the Summer Olympic Games highlighted by a spectacular opening ceremony celebrating the National Health Service and literary history.',
    source: 'https://en.wikipedia.org/wiki/2012_Summer_Olympics', evidence: ['olympic', 'ceremony'], checked: '2026-11-11'
  },
  {
    id: 'GBR-3-005', iso: 'GBR', level: 3, topic: 'monarchy', kind: 'incident', year: 2022,
    text: 'In 2022, Queen Elizabeth II passed away after reigning for an extraordinary seventy years, followed by solemn international ceremonies.',
    source: 'https://en.wikipedia.org/wiki/Death_and_state_funeral_of_Elizabeth_II', evidence: ['elizabeth', 'funeral'], checked: '2026-11-11'
  },

  // ── 2. Germany (DEU) ───────────────────────────────────────────────────────
  {
    id: 'DEU-1-002', iso: 'DEU', level: 1, topic: 'music', kind: 'history',
    text: 'Composer Johann Sebastian Bach perfected baroque counterpoint, polyphony, and organ fugues that shaped the foundation of classical music theory.',
    source: 'https://en.wikipedia.org/wiki/Johann_Sebastian_Bach', evidence: ['bach', 'counterpoint'], checked: '2026-11-11'
  },
  {
    id: 'DEU-1-003', iso: 'DEU', level: 1, topic: 'fairy tales', kind: 'culture',
    text: 'The Brothers Grimm collected and published legendary folkloric fairy tales including Cinderella, Rapunzel, Hansel and Gretel, and Snow White.',
    source: 'https://en.wikipedia.org/wiki/Brothers_Grimm', evidence: ['grimm', 'cinderella'], checked: '2026-11-11'
  },
  {
    id: 'DEU-1-004', iso: 'DEU', level: 1, topic: 'printing', kind: 'history',
    text: 'Johannes Gutenberg introduced movable metal type printing press technology in Mainz around 1440, revolutionizing book reproduction and public literacy.',
    source: 'https://en.wikipedia.org/wiki/Johannes_Gutenberg', evidence: ['gutenberg', 'movable'], checked: '2026-11-11'
  },
  {
    id: 'DEU-1-005', iso: 'DEU', level: 1, topic: 'reformation', kind: 'history',
    text: 'Martin Luther posted his ninety-five theses on the Wittenberg church door in 1517, igniting the Protestant Reformation across Christendom.',
    source: 'https://en.wikipedia.org/wiki/Ninety-five_Theses', evidence: ['luther', 'wittenberg'], checked: '2026-11-11'
  },
  {
    id: 'DEU-2-002', iso: 'DEU', level: 2, topic: 'relativity', kind: 'history',
    text: 'Physicist Albert Einstein published the special theory of relativity in 1905, establishing mass-energy equivalence with the famous equation E=mc2.',
    source: 'https://en.wikipedia.org/wiki/Albert_Einstein', evidence: ['einstein', 'relativity'], checked: '2026-11-11'
  },
  {
    id: 'DEU-2-003', iso: 'DEU', level: 2, topic: 'castle', kind: 'history',
    text: 'Neuschwanstein Castle was constructed by King Ludwig II with fairy-tale towers, inspiring famous theme park royal palaces.',
    source: 'https://en.wikipedia.org/wiki/Neuschwanstein_Castle', evidence: ['neuschwanstein', 'ludwig'], checked: '2026-11-11'
  },
  {
    id: 'DEU-2-004', iso: 'DEU', level: 2, topic: 'automotive', kind: 'history',
    text: 'Karl Benz patented the Motorwagen in 1886, creating the world\'s first commercial automobile powered by an internal combustion engine.',
    source: 'https://en.wikipedia.org/wiki/Benz_Patent-Motorwagen', evidence: ['benz', 'motorwagen'], checked: '2026-11-11'
  },
  {
    id: 'DEU-2-005', iso: 'DEU', level: 2, topic: 'gate', kind: 'history',
    text: 'The Brandenburg Gate neoclassical triumphal monument stood behind cold war barricades before becoming a celebrated symbol of national reunification.',
    source: 'https://en.wikipedia.org/wiki/Brandenburg_Gate', evidence: ['brandenburg', 'gate'], checked: '2026-11-11'
  },
  {
    id: 'DEU-3-002', iso: 'DEU', level: 3, topic: 'gastronomy', kind: 'culture',
    text: 'Famous for hearty bratwurst sausages served with tangy fermented sauerkraut, twisted pretzels, and sweet mustard.',
    source: 'https://en.wikipedia.org/wiki/Bratwurst', evidence: ['bratwurst', 'sauerkraut'], checked: '2026-11-11'
  },
  {
    id: 'DEU-3-003', iso: 'DEU', level: 3, topic: 'cathedral', kind: 'landmark',
    text: 'Cologne Cathedral stands as a colossal twin-spired Gothic masterpiece that took over six centuries to construct along the Rhine.',
    source: 'https://en.wikipedia.org/wiki/Cologne_Cathedral', evidence: ['cologne', 'cathedral'], checked: '2026-11-11'
  },
  {
    id: 'DEU-3-004', iso: 'DEU', level: 3, topic: 'world cup', kind: 'current', year: 2014,
    text: 'In 2014, the national football squad won the FIFA World Cup championship, highlighted by an astonishing 7-1 semifinal victory.',
    source: 'https://en.wikipedia.org/wiki/2014_FIFA_World_Cup', evidence: ['championship', 'world cup'], checked: '2026-11-11'
  },
  {
    id: 'DEU-3-005', iso: 'DEU', level: 3, topic: 'nuclear exit', kind: 'current', year: 2023,
    text: 'In 2023, completed the final phase of its historic energy transition by permanently shutting down its last remaining commercial nuclear power reactors.',
    source: 'https://en.wikipedia.org/wiki/Nuclear_power_phase-out', evidence: ['reactors', 'nuclear'], checked: '2026-11-11'
  },

  // ── 3. Spain (ESP) ─────────────────────────────────────────────────────────
  {
    id: 'ESP-1-002', iso: 'ESP', level: 1, topic: 'literature', kind: 'history',
    text: 'Author Miguel de Cervantes wrote the epic novel Don Quixote in 1605, chronicling the comedic adventures of a chivalric knight tilting at windmills.',
    source: 'https://en.wikipedia.org/wiki/Don_Quixote', evidence: ['cervantes', 'quixote'], checked: '2026-11-11'
  },
  {
    id: 'ESP-1-003', iso: 'ESP', level: 1, topic: 'painting', kind: 'history',
    text: 'Master painter Diego Velazquez painted Las Meninas in 1656, creating a complex visual masterpiece of royal perspective and artistic illusion.',
    source: 'https://en.wikipedia.org/wiki/Las_Meninas', evidence: ['meninas', 'perspective'], checked: '2026-11-11'
  },
  {
    id: 'ESP-1-004', iso: 'ESP', level: 1, topic: 'pilgrimage', kind: 'culture',
    text: 'The Camino de Santiago pilgrimage route has drawn millions of pilgrims walking across scenic trails toward the cathedral shrine of Saint James.',
    source: 'https://en.wikipedia.org/wiki/Camino_de_Santiago', evidence: ['camino', 'santiago'], checked: '2026-11-11'
  },
  {
    id: 'ESP-1-005', iso: 'ESP', level: 1, topic: 'festival', kind: 'culture',
    text: 'La Tomatina festival in Bunol turns town streets into a sea of red puree as thousands of revelers participate in an hour-long tomato fight.',
    source: 'https://en.wikipedia.org/wiki/La_Tomatina', evidence: ['tomatina', 'tomato'], checked: '2026-11-11'
  },
  {
    id: 'ESP-2-002', iso: 'ESP', level: 2, topic: 'palace', kind: 'history',
    text: 'The Alhambra hilltop fortress complex displays exquisite Islamic architecture featuring intricate arabesque plaster carvings, quiet courtyards, and fountain pools.',
    source: 'https://en.wikipedia.org/wiki/Alhambra', evidence: ['alhambra', 'arabesque'], checked: '2026-11-11'
  },
  {
    id: 'ESP-2-003', iso: 'ESP', level: 2, topic: 'cubism', kind: 'history',
    text: 'Painter Pablo Picasso co-founded cubism and created Guernica in 1937, portraying the horrors of wartime aerial bombing in stark monochrome tones.',
    source: 'https://en.wikipedia.org/wiki/Pablo_Picasso', evidence: ['picasso', 'guernica'], checked: '2026-11-11'
  },
  {
    id: 'ESP-2-004', iso: 'ESP', level: 2, topic: 'surrealism', kind: 'history',
    text: 'Surrealist artist Salvador Dali painted melting pocket watches in The Persistence of Memory, exploring fluid perceptions of time and subconscious dreamscapes.',
    source: 'https://en.wikipedia.org/wiki/Salvador_Dal%C3%AD', evidence: ['persistence', 'memory'], checked: '2026-11-11'
  },
  {
    id: 'ESP-2-005', iso: 'ESP', level: 2, topic: 'aqueduct', kind: 'history',
    text: 'The ancient aqueduct of Segovia towers with two tiers of unmortared granite arches, remarkably preserved for two thousand years.',
    source: 'https://en.wikipedia.org/wiki/Aqueduct_of_Segovia', evidence: ['segovia', 'aqueduct'], checked: '2026-11-11'
  },
  {
    id: 'ESP-3-002', iso: 'ESP', level: 3, topic: 'gastronomy', kind: 'culture',
    text: 'Famous for savory saffron rice paella simmered in wide flat pans with seafood, crispy potato bravas, and cured jamon iberico ham.',
    source: 'https://en.wikipedia.org/wiki/Paella', evidence: ['paella', 'saffron'], checked: '2026-11-11'
  },
  {
    id: 'ESP-3-003', iso: 'ESP', level: 3, topic: 'basilica', kind: 'landmark',
    text: 'Antoni Gaudi designed the Sagrada Familia basilica with towering stone spires resembling organic nature formations that pierce the urban skyline.',
    source: 'https://en.wikipedia.org/wiki/Sagrada_Fam%C3%ADlia', evidence: ['sagrada', 'basilica'], checked: '2026-11-11'
  },
  {
    id: 'ESP-3-004', iso: 'ESP', level: 3, topic: 'world cup', kind: 'current', year: 2010,
    text: 'In 2010, the national football squad captured its first FIFA World Cup title thanks to an extra-time goal in the tournament final.',
    source: 'https://en.wikipedia.org/wiki/2010_FIFA_World_Cup', evidence: ['final', 'world cup'], checked: '2026-11-11'
  },
  {
    id: 'ESP-3-005', iso: 'ESP', level: 3, topic: 'tennis', kind: 'current', year: 2022,
    text: 'In 2022, tennis legend Rafael Nadal captured a record fourteenth championship title at Roland Garros, solidifying his king of clay status.',
    source: 'https://en.wikipedia.org/wiki/Rafael_Nadal', evidence: ['nadal', 'roland'], checked: '2026-11-11'
  },

  // ── 4. United States (USA) ─────────────────────────────────────────────────
  {
    id: 'USA-1-002', iso: 'USA', level: 1, topic: 'declaration', kind: 'history',
    text: 'The Declaration of Independence was adopted in 1776 in Philadelphia, proclaiming unalienable human rights including life, liberty, and the pursuit of happiness.',
    source: 'https://en.wikipedia.org/wiki/United_States_Declaration_of_Independence', evidence: ['independence', 'declaration'], checked: '2026-11-11'
  },
  {
    id: 'USA-1-003', iso: 'USA', level: 1, topic: 'jazz', kind: 'culture',
    text: 'New Orleans gave birth to vibrant musical traditions blending brass band marches, blues chords, ragtime syncopation, and spontaneous instrumental improvisation.',
    source: 'https://en.wikipedia.org/wiki/Jazz', evidence: ['orleans', 'jazz'], checked: '2026-11-11'
  },
  {
    id: 'USA-1-004', iso: 'USA', level: 1, topic: 'folklore', kind: 'culture',
    text: 'Pioneering frontier folklore celebrates towering folk heroes like lumberjack Paul Bunyan and his giant blue ox Babe felling timber.',
    source: 'https://en.wikipedia.org/wiki/Paul_Bunyan', evidence: ['bunyan', 'lumberjack'], checked: '2026-11-11'
  },
  {
    id: 'USA-1-005', iso: 'USA', level: 1, topic: 'park', kind: 'history',
    text: 'Yellowstone was established in 1872 as the world\'s first national park, protecting geothermal geysers and wild herds of bison.',
    source: 'https://en.wikipedia.org/wiki/Yellowstone_National_Park', evidence: ['yellowstone', 'geysers'], checked: '2026-11-11'
  },
  {
    id: 'USA-2-002', iso: 'USA', level: 2, topic: 'aviation', kind: 'history',
    text: 'Brothers Orville and Wilbur Wright achieved the first controlled powered heavier-than-air human flight at Kitty Hawk in 1903.',
    source: 'https://en.wikipedia.org/wiki/Wright_brothers', evidence: ['wright', 'flight'], checked: '2026-11-11'
  },
  {
    id: 'USA-2-003', iso: 'USA', level: 2, topic: 'canyon', kind: 'landmark',
    text: 'The Grand Canyon exposes billions of years of geological strata carved by the Colorado River across immense colorful layered rock chasms.',
    source: 'https://en.wikipedia.org/wiki/Grand_Canyon', evidence: ['canyon', 'geological'], checked: '2026-11-11'
  },
  {
    id: 'USA-2-004', iso: 'USA', level: 2, topic: 'civil rights', kind: 'history',
    text: 'Martin Luther King Jr delivered his inspiring historic I Have a Dream address in 1963 during the March for Jobs and Freedom.',
    source: 'https://en.wikipedia.org/wiki/I_Have_a_Dream', evidence: ['king', 'dream'], checked: '2026-11-11'
  },
  {
    id: 'USA-2-005', iso: 'USA', level: 2, topic: 'moon landing', kind: 'history',
    text: 'The Apollo 11 mission landed humans on the lunar surface in 1969, where Neil Armstrong took one small step for man.',
    source: 'https://en.wikipedia.org/wiki/Apollo_11', evidence: ['apollo', 'armstrong'], checked: '2026-11-11'
  },
  {
    id: 'USA-3-002', iso: 'USA', level: 3, topic: 'gastronomy', kind: 'culture',
    text: 'Famous for smoky slow-cooked barbecue ribs, juicy beef burgers with melted cheddar, and warm cinnamon apple pie.',
    source: 'https://en.wikipedia.org/wiki/Barbecue', evidence: ['barbecue', 'smoked'], checked: '2026-11-11'
  },
  {
    id: 'USA-3-003', iso: 'USA', level: 3, topic: 'bridge', kind: 'landmark',
    text: 'The Golden Gate Bridge spans ocean waters with majestic International Orange suspension towers often shrouded in rolling maritime fog banks.',
    source: 'https://en.wikipedia.org/wiki/Golden_Gate_Bridge', evidence: ['bridge', 'suspension'], checked: '2026-11-11'
  },
  {
    id: 'USA-3-004', iso: 'USA', level: 3, topic: 'telescope', kind: 'current', year: 2021,
    text: 'In 2021, space scientists launched the James Webb Space Telescope to observe early cosmic galaxies and atmospheres of distant exoplanets.',
    source: 'https://en.wikipedia.org/wiki/James_Webb_Space_Telescope', evidence: ['telescope', 'exoplanets'], checked: '2026-11-11'
  },
  {
    id: 'USA-3-005', iso: 'USA', level: 3, topic: 'mars', kind: 'current', year: 2021,
    text: 'In 2021, the robotic rover Perseverance landed inside Jezero Crater on Mars alongside the miniature robotic helicopter Ingenuity.',
    source: 'https://en.wikipedia.org/wiki/Perseverance_(rover)', evidence: ['perseverance', 'ingenuity'], checked: '2026-11-11'
  },

  // ── 5. China (CHN) ─────────────────────────────────────────────────────────
  {
    id: 'CHN-1-002', iso: 'CHN', level: 1, topic: 'terracotta', kind: 'history',
    text: 'Thousands of life-sized terracotta soldiers and cavalry horses were buried in 210 BCE to protect the tomb of the first emperor.',
    source: 'https://en.wikipedia.org/wiki/Terracotta_Army', evidence: ['terracotta', 'cavalry'], checked: '2026-11-11'
  },
  {
    id: 'CHN-1-003', iso: 'CHN', level: 1, topic: 'porcelain', kind: 'culture',
    text: 'Jingdezhen developed exquisite white and cobalt-blue porcelain ceramics admired across worldwide trade routes as fine artistic treasures.',
    source: 'https://en.wikipedia.org/wiki/Chinese_ceramics', evidence: ['jingdezhen', 'porcelain'], checked: '2026-11-11'
  },
  {
    id: 'CHN-1-004', iso: 'CHN', level: 1, topic: 'philosophy', kind: 'history',
    text: 'Philosopher Confucius taught ethics, filial piety, and social harmony during the Spring and Autumn period, shaping societal values for millennia.',
    source: 'https://en.wikipedia.org/wiki/Confucius', evidence: ['confucius', 'piety'], checked: '2026-11-11'
  },
  {
    id: 'CHN-1-005', iso: 'CHN', level: 1, topic: 'dragon boat', kind: 'culture',
    text: 'Dragon Boat festivals feature synchronized paddlers racing vibrant carved canoes to pounding drums while honoring ancient poet Qu Yuan.',
    source: 'https://en.wikipedia.org/wiki/Dragon_Boat_Festival', evidence: ['dragon', 'boat'], checked: '2026-11-11'
  },
  {
    id: 'CHN-2-002', iso: 'CHN', level: 2, topic: 'canal', kind: 'history',
    text: 'The Grand Canal forms the world\'s longest artificial waterway, constructed over centuries to transport grain between major economic river basins.',
    source: 'https://en.wikipedia.org/wiki/Grand_Canal_(China)', evidence: ['canal', 'waterway'], checked: '2026-11-11'
  },
  {
    id: 'CHN-2-003', iso: 'CHN', level: 2, topic: 'buddha', kind: 'landmark',
    text: 'The Leshan Giant Buddha sits carved directly from sandstone river cliffs as a monumental 71-meter stone sculpture constructed during the Tang dynasty.',
    source: 'https://en.wikipedia.org/wiki/Leshan_Giant_Buddha', evidence: ['leshan', 'buddha'], checked: '2026-11-11'
  },
  {
    id: 'CHN-2-004', iso: 'CHN', level: 2, topic: 'medicine', kind: 'history',
    text: 'Scientist Tu Youyou discovered artemisinin from sweet wormwood herbal extracts in 1972, saving millions of lives from malaria infections.',
    source: 'https://en.wikipedia.org/wiki/Tu_Youyou', evidence: ['artemisinin', 'malaria'], checked: '2026-11-11'
  },
  {
    id: 'CHN-2-005', iso: 'CHN', level: 2, topic: 'gorge', kind: 'record',
    text: 'Three Gorges Dam harnesses hydraulic energy from the Yangtze River as the world\'s largest hydroelectric power generation station.',
    source: 'https://en.wikipedia.org/wiki/Three_Gorges_Dam', evidence: ['gorges', 'hydroelectric'], checked: '2026-11-11'
  },
  {
    id: 'CHN-3-002', iso: 'CHN', level: 3, topic: 'gastronomy', kind: 'culture',
    text: 'Famous for crispy roast duck with thin pancakes, steamed pork soup dumplings, and hand-pulled wheat noodles simmered in aromatic broth.',
    source: 'https://en.wikipedia.org/wiki/Peking_duck', evidence: ['roast', 'duck'], checked: '2026-11-11'
  },
  {
    id: 'CHN-3-003', iso: 'CHN', level: 3, topic: 'panda', kind: 'record',
    text: 'Giant pandas dwell in bamboo mist forests, serving as beloved national animal treasures protected within dedicated conservation sanctuaries.',
    source: 'https://en.wikipedia.org/wiki/Giant_panda', evidence: ['panda', 'bamboo'], checked: '2026-11-11'
  },
  {
    id: 'CHN-3-004', iso: 'CHN', level: 3, topic: 'olympics', kind: 'current', year: 2022,
    text: 'In 2022, hosted the Olympic Winter Games, becoming the first city to have staged both summer and winter editions of the games.',
    source: 'https://en.wikipedia.org/wiki/2022_Winter_Olympics', evidence: ['winter', 'olympics'], checked: '2026-11-11'
  },
  {
    id: 'CHN-3-005', iso: 'CHN', level: 3, topic: 'space station', kind: 'current', year: 2022,
    text: 'In 2022, completed construction of the Tiangong space station in low orbit, maintaining continuous three-person scientific crew rotations.',
    source: 'https://en.wikipedia.org/wiki/Tiangong_space_station', evidence: ['tiangong', 'station'], checked: '2026-11-11'
  },

  // ── 6. Russia (RUS) ────────────────────────────────────────────────────────
  {
    id: 'RUS-1-002', iso: 'RUS', level: 1, topic: 'lake', kind: 'record',
    text: 'Lake Baikal holds twenty percent of global unfrozen freshwater as the world\'s oldest and deepest continental lake, inhabited by freshwater seals.',
    source: 'https://en.wikipedia.org/wiki/Lake_Baikal', evidence: ['baikal', 'freshwater'], checked: '2026-11-11'
  },
  {
    id: 'RUS-1-003', iso: 'RUS', level: 1, topic: 'ballet', kind: 'culture',
    text: 'The Bolshoi Theatre company preserves legendary classical ballet repertoire including Swan Lake and The Nutcracker with dramatic technical virtuosity.',
    source: 'https://en.wikipedia.org/wiki/Bolshoi_Ballet', evidence: ['bolshoi', 'ballet'], checked: '2026-11-11'
  },
  {
    id: 'RUS-1-004', iso: 'RUS', level: 1, topic: 'literature', kind: 'history',
    text: 'Leo Tolstoy wrote monumental literary works including War and Peace and Anna Karenina, exploring moral philosophy and historical determinism.',
    source: 'https://en.wikipedia.org/wiki/Leo_Tolstoy', evidence: ['tolstoy', 'karenina'], checked: '2026-11-11'
  },
  {
    id: 'RUS-1-005', iso: 'RUS', level: 1, topic: 'chemistry', kind: 'history',
    text: 'Chemist Dmitri Mendeleev organized chemical elements by atomic mass in 1869 to create the foundational Periodic Table predicting undiscovered elements.',
    source: 'https://en.wikipedia.org/wiki/Dmitri_Mendeleev', evidence: ['mendeleev', 'periodic'], checked: '2026-11-11'
  },
  {
    id: 'RUS-2-002', iso: 'RUS', level: 2, topic: 'railway', kind: 'record',
    text: 'The Trans-Siberian Railway spans over nine thousand kilometers of rail tracks, connecting historic trading hubs across expansive wilderness landscapes.',
    source: 'https://en.wikipedia.org/wiki/Trans-Siberian_Railway', evidence: ['trans-siberian', 'railway'], checked: '2026-11-11'
  },
  {
    id: 'RUS-2-003', iso: 'RUS', level: 2, topic: 'spaceflight', kind: 'history',
    text: 'Cosmonaut Yuri Gagarin made history aboard Vostok 1 in 1961 by completing the first human orbital flight around planet Earth.',
    source: 'https://en.wikipedia.org/wiki/Yuri_Gagarin', evidence: ['gagarin', 'vostok'], checked: '2026-11-11'
  },
  {
    id: 'RUS-2-004', iso: 'RUS', level: 2, topic: 'fortress', kind: 'history',
    text: 'The Kremlin fortified citadel houses historic cathedrals and palaces behind crenelated red brick walls topped by iconic illuminated ruby stars.',
    source: 'https://en.wikipedia.org/wiki/Moscow_Kremlin', evidence: ['kremlin', 'citadel'], checked: '2026-11-11'
  },
  {
    id: 'RUS-2-005', iso: 'RUS', level: 2, topic: 'museum', kind: 'history',
    text: 'The State Hermitage Museum houses millions of art treasures within the lavish Baroque rooms of the former imperial Winter Palace.',
    source: 'https://en.wikipedia.org/wiki/Hermitage_Museum', evidence: ['hermitage', 'baroque'], checked: '2026-11-11'
  },
  {
    id: 'RUS-3-002', iso: 'RUS', level: 3, topic: 'gastronomy', kind: 'culture',
    text: 'Famous for beef Stroganoff sautéed with mushrooms and sour cream, savory pelmeni dumplings, and pickled cucumbers.',
    source: 'https://en.wikipedia.org/wiki/Beef_Stroganoff', evidence: ['stroganoff', 'mushrooms'], checked: '2026-11-11'
  },
  {
    id: 'RUS-3-003', iso: 'RUS', level: 3, topic: 'cathedral', kind: 'landmark',
    text: 'Saint Basil\'s Cathedral stands on Red Square with whimsical colorful swirling domes commissioned by Ivan the Terrible in the sixteenth century.',
    source: 'https://en.wikipedia.org/wiki/Saint_Basil%27s_Cathedral', evidence: ['basil', 'domes'], checked: '2026-11-11'
  },
  {
    id: 'RUS-3-004', iso: 'RUS', level: 3, topic: 'world cup', kind: 'current', year: 2018,
    text: 'In 2018, hosted the FIFA World Cup across eleven host cities, memorable for stunning underdog tournament upsets and packed fan festivals.',
    source: 'https://en.wikipedia.org/wiki/2018_FIFA_World_Cup', evidence: ['tournament', 'world cup'], checked: '2026-11-11'
  },
  {
    id: 'RUS-3-005', iso: 'RUS', level: 3, topic: 'meteor', kind: 'incident', year: 2013,
    text: 'In 2013, an explosive Chelyabinsk meteor superbolide detonated high above town settlements, producing shockwaves that shattered thousands of windows.',
    source: 'https://en.wikipedia.org/wiki/Chelyabinsk_meteor', evidence: ['chelyabinsk', 'meteor'], checked: '2026-11-11'
  },

  // ── 7. Turkey (TUR) ────────────────────────────────────────────────────────
  {
    id: 'TUR-1-002', iso: 'TUR', level: 1, topic: 'mosaic', kind: 'culture',
    text: 'Zeugma Mosaic Museum preserves exquisite ancient floor mosaics depicting mythology, including the famous captivating gaze of the Gypsy Girl.',
    source: 'https://en.wikipedia.org/wiki/Zeugma_Mosaic_Museum', evidence: ['zeugma', 'mosaic'], checked: '2026-11-11'
  },
  {
    id: 'TUR-1-003', iso: 'TUR', level: 1, topic: 'dervishes', kind: 'culture',
    text: 'The whirling dervishes of the Mevlevi order perform spiritual sema ceremonies, spinning in flowing white robes to meditative reed flute melodies.',
    source: 'https://en.wikipedia.org/wiki/Mevlevi_Order', evidence: ['dervishes', 'mevlevi'], checked: '2026-11-11'
  },
  {
    id: 'TUR-1-004', iso: 'TUR', level: 1, topic: 'archaeology', kind: 'history',
    text: 'Gobekli Tepe features monumental carved T-shaped limestone megaliths dating back over eleven thousand years as the oldest known temple complex.',
    source: 'https://en.wikipedia.org/wiki/G%C3%B6bekli_Tepe', evidence: ['limestone', 'megaliths'], checked: '2026-11-11'
  },
  {
    id: 'TUR-1-005', iso: 'TUR', level: 1, topic: 'shadow play', kind: 'culture',
    text: 'Karagoz and Hacivat shadow puppet theater uses translucent camel hide puppets illuminated behind a white cloth screen to deliver witty satirical dialogue.',
    source: 'https://en.wikipedia.org/wiki/Karag%C3%B6z_and_Hacivat', evidence: ['puppets', 'shadow'], checked: '2026-11-11'
  },
  {
    id: 'TUR-2-002', iso: 'TUR', level: 2, topic: 'thermal', kind: 'landmark',
    text: 'Pamukkale features dazzling white travertine terraces formed by mineral-rich thermal springs cascading down mountainsides over millennia.',
    source: 'https://en.wikipedia.org/wiki/Pamukkale', evidence: ['pamukkale', 'travertine'], checked: '2026-11-11'
  },
  {
    id: 'TUR-2-003', iso: 'TUR', level: 2, topic: 'ruins', kind: 'history',
    text: 'The ancient city of Ephesus preserves the monumental two-story marble facade of the Library of Celsus and grand classical amphitheatres.',
    source: 'https://en.wikipedia.org/wiki/Library_of_Celsus', evidence: ['celsus', 'library'], checked: '2026-11-11'
  },
  {
    id: 'TUR-2-004', iso: 'TUR', level: 2, topic: 'bazaar', kind: 'history',
    text: 'The Grand Bazaar dates to 1461 as one of the world\'s oldest covered markets, housing thousands of shops under vaulted painted ceilings.',
    source: 'https://en.wikipedia.org/wiki/Grand_Bazaar,_Istanbul', evidence: ['bazaar', 'vaulted'], checked: '2026-11-11'
  },
  {
    id: 'TUR-2-005', iso: 'TUR', level: 2, topic: 'cistern', kind: 'history',
    text: 'The Basilica Cistern provides an atmospheric subterranean cavern supported by hundreds of classical ionic columns and carved Medusa stone heads.',
    source: 'https://en.wikipedia.org/wiki/Basilica_Cistern', evidence: ['cistern', 'medusa'], checked: '2026-11-11'
  },
  {
    id: 'TUR-3-002', iso: 'TUR', level: 3, topic: 'gastronomy', kind: 'culture',
    text: 'Famous for savory grilled doner kebabs sliced from rotating spits, flaky pistachio baklava pastry, and chewy fruit delight confections.',
    source: 'https://en.wikipedia.org/wiki/Doner_kebab', evidence: ['kebab', 'meat'], checked: '2026-11-11'
  },
  {
    id: 'TUR-3-003', iso: 'TUR', level: 3, topic: 'strait', kind: 'landmark',
    text: 'Suspension bridges span the historic oceanic maritime waterway that directly separates two landmasses within a single bustling metropolis.',
    source: 'https://en.wikipedia.org/wiki/Bosphorus_Bridge', evidence: ['bosphorus', 'suspension'], checked: '2026-11-11'
  },
  {
    id: 'TUR-3-004', iso: 'TUR', level: 3, topic: 'earthquake', kind: 'incident', year: 2023,
    text: 'In 2023, catastrophic magnitude 7.8 and 7.5 earthquakes struck Kahramanmaras and adjacent provinces, sparking global humanitarian emergency mobilizations.',
    source: 'https://en.wikipedia.org/wiki/2023_Turkey%E2%80%93Syria_earthquakes', evidence: ['earthquakes', 'humanitarian'], checked: '2026-11-11'
  },
  {
    id: 'TUR-3-005', iso: 'TUR', level: 3, topic: 'bridge', kind: 'current', year: 2022,
    text: 'In 2022, opened the 1915 Canakkale Bridge across the Dardanelles, achieving the world\'s longest mid-span suspension bridge distance.',
    source: 'https://en.wikipedia.org/wiki/1915_%C3%87anakkale_Bridge', evidence: ['bridge', 'suspension'], checked: '2026-11-11'
  },

  // ── 8. Vietnam (VNM) ───────────────────────────────────────────────────────
  {
    id: 'VNM-1-002', iso: 'VNM', level: 1, topic: 'temple', kind: 'history',
    text: 'The Temple of Literature was established in 1070 as the first national imperial academy, honoring scholarly achievement with engraved stone stelae.',
    source: 'https://en.wikipedia.org/wiki/Temple_of_Literature,_Hanoi', evidence: ['literature', 'stelae'], checked: '2026-11-11'
  },
  {
    id: 'VNM-1-003', iso: 'VNM', level: 1, topic: 'dress', kind: 'culture',
    text: 'The graceful Ao Dai national garment features a fitted silk tunic slit to the waist worn over flowing silk trousers.',
    source: 'https://en.wikipedia.org/wiki/%C3%81o_d%C3%A0i', evidence: ['tunic', 'silk'], checked: '2026-11-11'
  },
  {
    id: 'VNM-1-004', iso: 'VNM', level: 1, topic: 'citadel', kind: 'history',
    text: 'The Imperial City of Hue retains walled palaces, ornamental pavilions, and royal tombs built by the Nguyen dynasty along the Perfume River.',
    source: 'https://en.wikipedia.org/wiki/Complex_of_Hu%E1%BA%BF_Monuments', evidence: ['monuments', 'dynasty'], checked: '2026-11-11'
  },
  {
    id: 'VNM-1-005', iso: 'VNM', level: 1, topic: 'lantern', kind: 'culture',
    text: 'Hoi An ancient river town glows during full moon nights when electric lights are extinguished and thousands of handmade silk lanterns illuminate.',
    source: 'https://en.wikipedia.org/wiki/H%E1%BB%99i_An', evidence: ['city', 'unesco'], checked: '2026-11-11'
  },
  {
    id: 'VNM-2-002', iso: 'VNM', level: 2, topic: 'cave', kind: 'record',
    text: 'Hang Son Doong stands as the world\'s largest known cave passage by volume, boasting subterranean jungles, clouds, and towering stalagmites.',
    source: 'https://en.wikipedia.org/wiki/Hang_S%C6%A1n_%C4%90o%C3%B2ng', evidence: ['passage', 'cave'], checked: '2026-11-11'
  },
  {
    id: 'VNM-2-003', iso: 'VNM', level: 2, topic: 'tunnels', kind: 'history',
    text: 'The Cu Chi subterranean tunnel complex provided underground living quarters, kitchens, and command posts during historical twentieth-century conflicts.',
    source: 'https://en.wikipedia.org/wiki/C%E1%BB%A7_Chi_tunnels', evidence: ['tunnels', 'underground'], checked: '2026-11-11'
  },
  {
    id: 'VNM-2-004', iso: 'VNM', level: 2, topic: 'terraces', kind: 'landmark',
    text: 'Mu Cang Chai features cascading carved mountainside rice terraces that turn into dazzling golden staircases during autumnal harvest season.',
    source: 'https://en.wikipedia.org/wiki/M%C3%B9_Cang_Ch%E1%BA%A3i_District', evidence: ['terraces', 'rice'], checked: '2026-11-11'
  },
  {
    id: 'VNM-2-005', iso: 'VNM', level: 2, topic: 'bridge', kind: 'landmark',
    text: 'The Golden Bridge at Ba Na Hills appears held aloft by two colossal weathered mossy stone-effect sculpture hands emerging from mountainsides.',
    source: 'https://en.wikipedia.org/wiki/Golden_Bridge_(Vietnam)', evidence: ['hands', 'bridge'], checked: '2026-11-11'
  },
  {
    id: 'VNM-3-002', iso: 'VNM', level: 3, topic: 'bay', kind: 'landmark',
    text: 'Ha Long Bay showcases thousands of towering limestone islets topped with lush vegetation rising dramatically from calm emerald marine waters.',
    source: 'https://en.wikipedia.org/wiki/H%E1%BA%A1_Long_Bay', evidence: ['islets', 'limestone'], checked: '2026-11-11'
  },
  {
    id: 'VNM-3-003', iso: 'VNM', level: 3, topic: 'gastronomy', kind: 'culture',
    text: 'Famous for steaming pho noodle soup garnished with fresh herbs, savory banh mi pork baguettes, and rich egg custard drip coffee.',
    source: 'https://en.wikipedia.org/wiki/B%C3%A1nh_m%C3%AC', evidence: ['baguette', 'pork'], checked: '2026-11-11'
  },
  {
    id: 'VNM-3-004', iso: 'VNM', level: 3, topic: 'games', kind: 'current', year: 2022,
    text: 'In 2022, hosted the thirty-first regional games multi-sport championship, topping the medal tally with a record haul of over two hundred gold medals.',
    source: 'https://en.wikipedia.org/wiki/2021_Southeast_Asian_Games', evidence: ['medals', 'games'], checked: '2026-11-11'
  },
  {
    id: 'VNM-3-005', iso: 'VNM', level: 3, topic: 'typhoon', kind: 'incident', year: 2024,
    text: 'In 2024, powerful Typhoon Yagi made landfall, causing heavy rainfall and triggering heroic emergency relief across flooded river valleys.',
    source: 'https://en.wikipedia.org/wiki/Typhoon_Yagi', evidence: ['typhoon', 'yagi'], checked: '2026-11-11'
  },

  // ── 9. South Korea (KOR) ───────────────────────────────────────────────────
  {
    id: 'KOR-1-002', iso: 'KOR', level: 1, topic: 'pottery', kind: 'culture',
    text: 'Goryeo dynasty celadon ceramics earned historical renown for delicate jade-green translucent glazes and inlaid crane and cloud motifs.',
    source: 'https://en.wikipedia.org/wiki/Goryeo_ware', evidence: ['celadon', 'goryeo'], checked: '2026-11-11'
  },
  {
    id: 'KOR-1-003', iso: 'KOR', level: 1, topic: 'clothing', kind: 'culture',
    text: 'Traditional hanbok attire features vibrant silk colors and curved fluid lines with a short cropped jacket and sweeping high-waisted wrap skirt.',
    source: 'https://en.wikipedia.org/wiki/Hanbok', evidence: ['hanbok', 'jacket'], checked: '2026-11-11'
  },
  {
    id: 'KOR-1-004', iso: 'KOR', level: 1, topic: 'palace', kind: 'history',
    text: 'Gyeongbokgung Palace preserves majestic royal throne halls and pavilion ponds constructed in 1395 as the primary seat of the Joseon dynasty.',
    source: 'https://en.wikipedia.org/wiki/Gyeongbokgung', evidence: ['gyeongbokgung', 'joseon'], checked: '2026-11-11'
  },
  {
    id: 'KOR-1-005', iso: 'KOR', level: 1, topic: 'martial art', kind: 'culture',
    text: 'Taekwondo evolved into an international Olympic combat discipline celebrated for high, jumping spinning kicks and disciplined sparring.',
    source: 'https://en.wikipedia.org/wiki/Taekwondo', evidence: ['taekwondo', 'kicks'], checked: '2026-11-11'
  },
  {
    id: 'KOR-2-002', iso: 'KOR', level: 2, topic: 'printing', kind: 'history',
    text: 'The Jikji was printed with movable metal type in 1377, recognized by UNESCO as the oldest extant movable-type book in printing history.',
    source: 'https://en.wikipedia.org/wiki/Jikji', evidence: ['jikji', 'movable'], checked: '2026-11-11'
  },
  {
    id: 'KOR-2-003', iso: 'KOR', level: 2, topic: 'ship', kind: 'history',
    text: 'Admiral Yi Sun-sin deployed iron-roofed turtle ships with spiked hulls and dragon-head cannon mouths to defeat naval invasions in the 1590s.',
    source: 'https://en.wikipedia.org/wiki/Turtle_ship', evidence: ['turtle', 'ship'], checked: '2026-11-11'
  },
  {
    id: 'KOR-2-004', iso: 'KOR', level: 2, topic: 'temple', kind: 'history',
    text: 'Haeinsa Temple preserves the Tripitaka Koreana, a complete collection of Buddhist scriptures carved across more than eighty thousand wooden printing blocks.',
    source: 'https://en.wikipedia.org/wiki/Tripitaka_Koreana', evidence: ['tripitaka', 'blocks'], checked: '2026-11-11'
  },
  {
    id: 'KOR-2-005', iso: 'KOR', level: 2, topic: 'island', kind: 'landmark',
    text: 'Jeju volcanic island features subterranean lava tubes, dormant volcanic craters, and hardy haenyeo women free-divers harvesting sea urchins.',
    source: 'https://en.wikipedia.org/wiki/Jeju_Province', evidence: ['jeju', 'haenyeo'], checked: '2026-11-11'
  },
  {
    id: 'KOR-3-002', iso: 'KOR', level: 3, topic: 'gastronomy', kind: 'culture',
    text: 'Famous for sizzling tabletop barbecue pork belly wrapped in crisp perilla leaves, spicy rice cakes, and fermented chili paste.',
    source: 'https://en.wikipedia.org/wiki/Samgyeopsal', evidence: ['pork', 'barbecue'], checked: '2026-11-11'
  },
  {
    id: 'KOR-3-003', iso: 'KOR', level: 3, topic: 'music', kind: 'current', year: 2012,
    text: 'In 2012, music artist Psy achieved global viral phenomenon status with Gangnam Style, becoming the first video to reach one billion views.',
    source: 'https://en.wikipedia.org/wiki/Gangnam_Style', evidence: ['gangnam', 'billion'], checked: '2026-11-11'
  },
  {
    id: 'KOR-3-004', iso: 'KOR', level: 3, topic: 'cinema', kind: 'current', year: 2020,
    text: 'In 2020, director Bong Joon-ho made cinematic history as Parasite became the first foreign language production to capture Best Picture at the Academy Awards.',
    source: 'https://en.wikipedia.org/wiki/Parasite_(2019_film)', evidence: ['parasite', 'academy'], checked: '2026-11-11'
  },
  {
    id: 'KOR-3-005', iso: 'KOR', level: 3, topic: 'space', kind: 'current', year: 2022,
    text: 'In 2022, successfully launched its domestically engineered Nuri rocket into orbit, carrying functional satellites into space from its space center.',
    source: 'https://en.wikipedia.org/wiki/Nuri_(rocket)', evidence: ['nuri', 'rocket'], checked: '2026-11-11'
  },

  // ── 10. Netherlands (NLD) ──────────────────────────────────────────────────
  {
    id: 'NLD-1-002', iso: 'NLD', level: 1, topic: 'pottery', kind: 'culture',
    text: 'Delftware ceramics gained international prestige in the seventeenth century for delicate tin-glazed earthenware decorated with blue floral scenes.',
    source: 'https://en.wikipedia.org/wiki/Delftware', evidence: ['delftware', 'earthenware'], checked: '2026-11-11'
  },
  {
    id: 'NLD-1-003', iso: 'NLD', level: 1, topic: 'clogs', kind: 'culture',
    text: 'Carved wooden klompen clogs were traditionally worn by farmers and artisans for foot protection against wet marshland soil.',
    source: 'https://en.wikipedia.org/wiki/Klompen', evidence: ['klompen', 'wooden'], checked: '2026-11-11'
  },
  {
    id: 'NLD-1-004', iso: 'NLD', level: 1, topic: 'painting', kind: 'history',
    text: 'Master painter Rembrandt van Rijn completed The Night Watch in 1642, acclaimed for dramatic chiaroscuro illumination and dynamic group militia composition.',
    source: 'https://en.wikipedia.org/wiki/The_Night_Watch', evidence: ['rembrandt', 'night watch'], checked: '2026-11-11'
  },
  {
    id: 'NLD-1-005', iso: 'NLD', level: 1, topic: 'botany', kind: 'history',
    text: 'Tulip mania swept speculative markets in 1637 when rare striped flower bulbs fetched fortunes before an abrupt financial collapse.',
    source: 'https://en.wikipedia.org/wiki/Tulip_mania', evidence: ['tulip', 'mania'], checked: '2026-11-11'
  },
  {
    id: 'NLD-2-002', iso: 'NLD', level: 2, topic: 'science', kind: 'history',
    text: 'Microscopy pioneer Antonie van Leeuwenhoek first observed bacteria, protozoa, and spermatozoa using handcrafted high-magnification single-lens microscopes.',
    source: 'https://en.wikipedia.org/wiki/Antonie_van_Leeuwenhoek', evidence: ['leeuwenhoek', 'microscope'], checked: '2026-11-11'
  },
  {
    id: 'NLD-2-003', iso: 'NLD', level: 2, topic: 'post-impressionism', kind: 'history',
    text: 'Post-impressionist master Vincent van Gogh created passionate swirling masterpieces like The Starry Night and Sunflowers using vivid thick impasto strokes.',
    source: 'https://en.wikipedia.org/wiki/Vincent_van_Gogh', evidence: ['gogh', 'starry night'], checked: '2026-11-11'
  },
  {
    id: 'NLD-2-004', iso: 'NLD', level: 2, topic: 'delta works', kind: 'record',
    text: 'The Delta Works storm surge barriers represent a monumental flood prevention engineering wonder protecting low-lying coastal territory from catastrophic inundation.',
    source: 'https://en.wikipedia.org/wiki/Delta_Works', evidence: ['delta works', 'flood'], checked: '2026-11-11'
  },
  {
    id: 'NLD-2-005', iso: 'NLD', level: 2, topic: 'peace palace', kind: 'history',
    text: 'The Peace Palace in The Hague houses the International Court of Justice, serving as a global symbol of international law and arbitration.',
    source: 'https://en.wikipedia.org/wiki/Peace_Palace', evidence: ['peace palace', 'arbitration'], checked: '2026-11-11'
  },
  {
    id: 'NLD-3-002', iso: 'NLD', level: 3, topic: 'gastronomy', kind: 'culture',
    text: 'Famous for round red wax wheels of mild Gouda cheese, bitterballen crispy meat croquettes, and pickled raw herring eaten with diced onions.',
    source: 'https://en.wikipedia.org/wiki/Gouda_cheese', evidence: ['gouda', 'cheese'], checked: '2026-11-11'
  },
  {
    id: 'NLD-3-003', iso: 'NLD', level: 3, topic: 'windmills', kind: 'landmark',
    text: 'Kinderdijk features an iconic network of nineteen historic drainage windmills built in the eighteenth century to pump water from marshy polders.',
    source: 'https://en.wikipedia.org/wiki/Windmills_at_Kinderdijk', evidence: ['kinderdijk', 'windmills'], checked: '2026-11-11'
  },
  {
    id: 'NLD-3-004', iso: 'NLD', level: 3, topic: 'racing', kind: 'current', year: 2021,
    text: 'In 2021, motor racing driver Max Verstappen won his dramatic maiden Formula One World Championship title with a thrilling last-lap pass.',
    source: 'https://en.wikipedia.org/wiki/Max_Verstappen', evidence: ['verstappen', 'championship'], checked: '2026-11-11'
  },
  {
    id: 'NLD-3-005', iso: 'NLD', level: 3, topic: 'museum', kind: 'current', year: 2023,
    text: 'In 2023, the Rijksmuseum staged the largest exhibition in history of painter Johannes Vermeer, drawing worldwide art enthusiasts.',
    source: 'https://en.wikipedia.org/wiki/Johannes_Vermeer', evidence: ['vermeer', 'rijksmuseum'], checked: '2026-11-11'
  }
];

async function run() {
  console.log(`Auditing Chunk 3 (${chunk3Items.length} items)...`);
  let hasErrors = false;

  for (const item of chunk3Items) {
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
    console.error('Chunk 3 has errors! Aborting.');
    process.exit(1);
  }

  console.log(`Chunk 3 verified! 100% of ${chunk3Items.length} items pass all pattern and URL checks.`);

  // Append items to clues.json and clues.js
  const combined = [...existingClues, ...chunk3Items];
  fs.writeFileSync(cluesPath, JSON.stringify(combined, null, 2), 'utf8');
  fs.writeFileSync(cluesJsPath, `// Clue Library\nexport const CLUES_LIBRARY = ${JSON.stringify(combined, null, 2)};\nexport default CLUES_LIBRARY;\n`, 'utf8');
  console.log(`Updated clues.json and clues.js! Total items now: ${combined.length}`);
}

run().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
