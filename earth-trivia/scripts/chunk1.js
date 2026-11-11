import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { validateItemSync, verifySourceUrl } from './clueTool.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const cluesPath = path.resolve(__dirname, '../data/clues.json');
const cluesJsPath = path.resolve(__dirname, '../data/clues.js');
const existingClues = JSON.parse(fs.readFileSync(cluesPath, 'utf8'));

export const chunk1Items = [
  // ── 1. Japan (JPN) ────────────────────────────────────────────────────────
  {
    id: 'JPN-1-002', iso: 'JPN', level: 1, topic: 'theatre', kind: 'culture',
    text: 'Noh theater mask traditions dating to the fourteenth century, featuring slow stylized dance-drama performed on a polished cypress stage.',
    source: 'https://en.wikipedia.org/wiki/Noh', evidence: ['cypress', 'stylized'], checked: '2026-11-11'
  },
  {
    id: 'JPN-1-003', iso: 'JPN', level: 1, topic: 'pottery', kind: 'culture',
    text: 'Centuries-old ceramic philosophy of repairing fractured pottery with golden lacquer to celebrate and honor its breakage history.',
    source: 'https://en.wikipedia.org/wiki/Kintsugi', evidence: ['lacquer', 'pottery'], checked: '2026-11-11'
  },
  {
    id: 'JPN-1-004', iso: 'JPN', level: 1, topic: 'carpentry', kind: 'culture',
    text: 'Traditional architectural joinery techniques that construct multi-story wooden structures with timber joints without a single metallic nail or screw.',
    source: 'https://en.wikipedia.org/wiki/Japanese_carpentry', evidence: ['timber', 'joinery'], checked: '2026-11-11'
  },
  {
    id: 'JPN-1-005', iso: 'JPN', level: 1, topic: 'origami', kind: 'culture',
    text: 'Ancient paper-folding craft that evolved from ceremonial gift decorations into complex geometric artistic representations.',
    source: 'https://en.wikipedia.org/wiki/Origami', evidence: ['geometric', 'ceremonial'], checked: '2026-11-11'
  },
  {
    id: 'JPN-2-002', iso: 'JPN', level: 2, topic: 'fortress', kind: 'history',
    text: 'The Himeji castle complex survives in white plaster elegance as an exceptional wooden feudal fortress with maze-like defensive alleys.',
    source: 'https://en.wikipedia.org/wiki/Himeji_Castle', evidence: ['plaster', 'defensive'], checked: '2026-11-11'
  },
  {
    id: 'JPN-2-003', iso: 'JPN', level: 2, topic: 'temple', kind: 'history',
    text: 'Ancient temple complex in Nara where a colossal bronze seated Buddha statue has stood housed inside one of the largest wooden halls.',
    source: 'https://en.wikipedia.org/wiki/T%C5%8Ddai-ji', evidence: ['bronze', 'statue'], checked: '2026-11-11'
  },
  {
    id: 'JPN-2-004', iso: 'JPN', level: 2, topic: 'biochemistry', kind: 'history',
    text: 'Scientific pioneer Jokichi Takamine first isolated and purified the vital metabolic hormone adrenaline in crystallized form in 1901.',
    source: 'https://en.wikipedia.org/wiki/Jokichi_Takamine', evidence: ['adrenaline', 'isolated'], checked: '2026-11-11'
  },
  {
    id: 'JPN-2-005', iso: 'JPN', level: 2, topic: 'shrine', kind: 'history',
    text: 'Fushimi Inari shrine features thousands of vibrant wooden torii gates winding up the sacred forested mountain paths.',
    source: 'https://en.wikipedia.org/wiki/Fushimi_Inari-taisha', evidence: ['torii', 'shrine'], checked: '2026-11-11'
  },
  {
    id: 'JPN-3-002', iso: 'JPN', level: 3, topic: 'gastronomy', kind: 'culture',
    text: 'Famous for delicate raw fish sliced over seasoned vinegar rice, savory ramen noodles, and centuries of sword-making mastery.',
    source: 'https://en.wikipedia.org/wiki/Sushi', evidence: ['vinegar', 'noodles'], checked: '2026-11-11'
  },
  {
    id: 'JPN-3-003', iso: 'JPN', level: 3, topic: 'vending', kind: 'record',
    text: 'World record holder for the highest density of automated vending machines per capita, dispensing steaming hot canned beverages and noodles.',
    source: 'https://en.wikipedia.org/wiki/Vending_machine', evidence: ['vending', 'beverages'], checked: '2026-11-11'
  },
  {
    id: 'JPN-3-004', iso: 'JPN', level: 3, topic: 'olympics', kind: 'current', year: 2021,
    text: 'Hosted the delayed Summer Olympic Games in 2021 inside empty stadiums under rigorous health protocols and robotic athlete guidance.',
    source: 'https://en.wikipedia.org/wiki/2020_Summer_Olympics', evidence: ['stadiums', 'olympic'], checked: '2026-11-11'
  },
  {
    id: 'JPN-3-005', iso: 'JPN', level: 3, topic: 'spaceflight', kind: 'incident', year: 2024,
    text: 'In 2024, its robotic SLIM moon lander achieved an unprecedented milestone, touching down within 55 meters of its designated target.',
    source: 'https://en.wikipedia.org/wiki/SLIM', evidence: ['moon', 'lander'], checked: '2026-11-11'
  },

  // ── 2. Egypt (EGY) ────────────────────────────────────────────────────────
  {
    id: 'EGY-1-002', iso: 'EGY', level: 1, topic: 'papyrus', kind: 'culture',
    text: 'Ancient craft of pressing swamp reed pith into durable writing scrolls that recorded sacred rituals and administrative edicts.',
    source: 'https://en.wikipedia.org/wiki/Papyrus', evidence: ['scrolls', 'papyrus'], checked: '2026-11-11'
  },
  {
    id: 'EGY-1-003', iso: 'EGY', level: 1, topic: 'portraiture', kind: 'culture',
    text: 'Naturalistic encaustic wax funeral portraits painted on wooden boards that blended classical artistic realism with ancient embalming traditions.',
    source: 'https://en.wikipedia.org/wiki/Fayum_mummy_portraits', evidence: ['encaustic', 'portraits'], checked: '2026-11-11'
  },
  {
    id: 'EGY-1-004', iso: 'EGY', level: 1, topic: 'ostraca', kind: 'history',
    text: 'Limestone flakes and broken pottery sherds utilized by ancient artisans to sketch drafts, write poems, and track labor disputes.',
    source: 'https://en.wikipedia.org/wiki/Ostracon', evidence: ['pottery', 'limestone'], checked: '2026-11-11'
  },
  {
    id: 'EGY-1-005', iso: 'EGY', level: 1, topic: 'quarrying', kind: 'history',
    text: 'Granite quarry sites where colossal unfinished obelisks remain carved directly into bedrock, illustrating ancient masonry splitting methods.',
    source: 'https://en.wikipedia.org/wiki/Unfinished_obelisk', evidence: ['obelisk', 'bedrock'], checked: '2026-11-11'
  },
  {
    id: 'EGY-2-002', iso: 'EGY', level: 2, topic: 'valley', kind: 'history',
    text: 'The Valley of the Kings contains over sixty rock-cut royal tombs decorated with vibrant underworld mythology frescoes.',
    source: 'https://en.wikipedia.org/wiki/Valley_of_the_Kings', evidence: ['tombs', 'underworld'], checked: '2026-11-11'
  },
  {
    id: 'EGY-2-003', iso: 'EGY', level: 2, topic: 'temple', kind: 'history',
    text: 'The vast Karnak temple complex features a massive hypostyle hall supported by 134 towering sandstone columns carved like papyrus stalks.',
    source: 'https://en.wikipedia.org/wiki/Karnak', evidence: ['hypostyle', 'columns'], checked: '2026-11-11'
  },
  {
    id: 'EGY-2-004', iso: 'EGY', level: 2, topic: 'epigraphy', kind: 'history',
    text: 'Discovery of the trilingual granodiorite slab in 1799 provided the vital linguistic key that unlocked the translation of ancient hieroglyphs.',
    source: 'https://en.wikipedia.org/wiki/Rosetta_Stone', evidence: ['hieroglyphs', 'linguistic'], checked: '2026-11-11'
  },
  {
    id: 'EGY-2-005', iso: 'EGY', level: 2, topic: 'monument', kind: 'history',
    text: 'Colossal seated stone statues at Abu Simbel were carefully relocated block by block in the 1960s to escape rising reservoir waters.',
    source: 'https://en.wikipedia.org/wiki/Abu_Simbel', evidence: ['statues', 'reservoir'], checked: '2026-11-11'
  },
  {
    id: 'EGY-3-002', iso: 'EGY', level: 3, topic: 'pyramids', kind: 'culture',
    text: 'Home to the colossal Great Pyramid of Giza, the enigmatic limestone Sphinx, and spicy cumin-infused fava bean stew.',
    source: 'https://en.wikipedia.org/wiki/Great_Pyramid_of_Giza', evidence: ['pyramid', 'limestone'], checked: '2026-11-11'
  },
  {
    id: 'EGY-3-003', iso: 'EGY', level: 3, topic: 'inundation', kind: 'history',
    text: 'Civilization shaped for millennia by the annual flooding of its legendary river, enabling rich agricultural production along fertile banks.',
    source: 'https://en.wikipedia.org/wiki/Flooding_of_the_Nile', evidence: ['flooding', 'fertile'], checked: '2026-11-11'
  },
  {
    id: 'EGY-3-004', iso: 'EGY', level: 3, topic: 'parade', kind: 'current', year: 2021,
    text: 'In 2021, held the televised Pharaohs Golden Parade, transporting twenty-two preserved royal mummies inside custom shock-absorbing vehicles.',
    source: 'https://en.wikipedia.org/wiki/Pharaohs%27_Golden_Parade', evidence: ['mummies', 'parade'], checked: '2026-11-11'
  },
  {
    id: 'EGY-3-005', iso: 'EGY', level: 3, topic: 'canal', kind: 'incident', year: 2021,
    text: 'In 2021, the massive container ship Ever Given ran aground in a vital shipping canal, halting international trade for six days.',
    source: 'https://en.wikipedia.org/wiki/2021_Suez_Canal_obstruction', evidence: ['canal', 'shipping'], checked: '2026-11-11'
  },

  // ── 3. Brazil (BRA) ───────────────────────────────────────────────────────
  {
    id: 'BRA-1-002', iso: 'BRA', level: 1, topic: 'martialart', kind: 'culture',
    text: 'Afro-descendant martial art combining acrobatic kicks, deceptive sweeps, and continuous rhythmic sway guided by traditional berimbau musical bows.',
    source: 'https://en.wikipedia.org/wiki/Capoeira', evidence: ['berimbau', 'acrobatic'], checked: '2026-11-11'
  },
  {
    id: 'BRA-1-003', iso: 'BRA', level: 1, topic: 'sculpture', kind: 'culture',
    text: 'Baroque churches adorned with expressive soapstone religious statues crafted by the legendary disabled colonial sculptor known as Aleijadinho.',
    source: 'https://en.wikipedia.org/wiki/Aleijadinho', evidence: ['soapstone', 'sculptor'], checked: '2026-11-11'
  },
  {
    id: 'BRA-1-004', iso: 'BRA', level: 1, topic: 'music', kind: 'culture',
    text: 'Lyrical musical movement blending gentle syncopated guitar rhythms with understated vocals, popularizing poetic melodies worldwide in the late 1950s.',
    source: 'https://en.wikipedia.org/wiki/Bossa_nova', evidence: ['syncopated', 'guitar'], checked: '2026-11-11'
  },
  {
    id: 'BRA-1-005', iso: 'BRA', level: 1, topic: 'ceramics', kind: 'culture',
    text: 'Ancient pre-Columbian ceramic traditions featuring intricate geometric incised designs and painted funerary urns recovered from major river delta mounds.',
    source: 'https://en.wikipedia.org/wiki/Marajoara_culture', evidence: ['funerary', 'geometric'], checked: '2026-11-11'
  },
  {
    id: 'BRA-2-002', iso: 'BRA', level: 2, topic: 'modernism', kind: 'history',
    text: 'Visionary architect Oscar Niemeyer pioneered expressive reinforced concrete public buildings characterized by sweeping curves and futuristic minimalist domes.',
    source: 'https://en.wikipedia.org/wiki/Oscar_Niemeyer', evidence: ['concrete', 'curves'], checked: '2026-11-11'
  },
  {
    id: 'BRA-2-003', iso: 'BRA', level: 2, topic: 'opera', kind: 'history',
    text: 'Teatro Amazonas, an opulent Belle Epoque opera house constructed deep within the rainforest during the height of the rubber boom.',
    source: 'https://en.wikipedia.org/wiki/Amazon_Theatre', evidence: ['theatre', 'opera'], checked: '2026-11-11'
  },
  {
    id: 'BRA-2-004', iso: 'BRA', level: 2, topic: 'aviation', kind: 'history',
    text: 'Aviation pioneer Alberto Santos-Dumont achieved the first verified public powered heavier-than-air flight with his 14-bis biplane in 1906.',
    source: 'https://en.wikipedia.org/wiki/Alberto_Santos-Dumont', evidence: ['biplane', 'flight'], checked: '2026-11-11'
  },
  {
    id: 'BRA-2-005', iso: 'BRA', level: 2, topic: 'sambadrome', kind: 'culture',
    text: 'The Sambadrome exhibition street was designed specifically to host dazzling competing samba school parades with towering floats and feathered dancers.',
    source: 'https://en.wikipedia.org/wiki/Sambadrome_Marqu%C3%AAs_de_Sapuca%C3%AD', evidence: ['samba', 'parades'], checked: '2026-11-11'
  },
  {
    id: 'BRA-3-002', iso: 'BRA', level: 3, topic: 'christ', kind: 'culture',
    text: 'Famous for the colossal thirty-meter art deco statue of Christ standing atop Corcovado mountain with outstretched welcoming arms.',
    source: 'https://en.wikipedia.org/wiki/Christ_the_Redeemer_(statue)', evidence: ['statue', 'corcovado'], checked: '2026-11-11'
  },
  {
    id: 'BRA-3-003', iso: 'BRA', level: 3, topic: 'football', kind: 'record',
    text: 'Holds the all-time world record of five men’s FIFA World Cup championship victories, celebrated for vibrant yellow jerseys and flair.',
    source: 'https://en.wikipedia.org/wiki/FIFA_World_Cup', evidence: ['championship', 'fifa'], checked: '2026-11-11'
  },
  {
    id: 'BRA-3-004', iso: 'BRA', level: 3, topic: 'olympics', kind: 'current', year: 2016,
    text: 'In 2016, hosted the Summer Olympic Games, staging the global sporting competition across coastal beach venues and modernized arenas.',
    source: 'https://en.wikipedia.org/wiki/2016_Summer_Olympics', evidence: ['olympic', 'venues'], checked: '2026-11-11'
  },
  {
    id: 'BRA-3-005', iso: 'BRA', level: 3, topic: 'worldcup', kind: 'current', year: 2014,
    text: 'Staged the worldwide FIFA World Cup tournament in 2014 across twelve modernized stadiums throughout diverse metropolitan centers.',
    source: 'https://en.wikipedia.org/wiki/2014_FIFA_World_Cup', evidence: ['stadiums', 'tournament'], checked: '2026-11-11'
  },

  // ── 4. Australia (AUS) ────────────────────────────────────────────────────
  {
    id: 'AUS-1-002', iso: 'AUS', level: 1, topic: 'rockart', kind: 'culture',
    text: 'Ancient ochre rock art galleries preserved in remote sandstone shelters depict spiritual Dreamtime ancestral stories dating back tens of thousands of years.',
    source: 'https://en.wikipedia.org/wiki/Gwion_Gwion_rock_art', evidence: ['rock', 'art'], checked: '2026-11-11'
  },
  {
    id: 'AUS-1-003', iso: 'AUS', level: 1, topic: 'aerophone', kind: 'culture',
    text: 'Traditional wind instrument hollowed out naturally by termites from eucalyptus trunks, producing deep resonant harmonic drone frequencies.',
    source: 'https://en.wikipedia.org/wiki/Didgeridoo', evidence: ['eucalyptus', 'didgeridoo'], checked: '2026-11-11'
  },
  {
    id: 'AUS-1-004', iso: 'AUS', level: 1, topic: 'hunting', kind: 'culture',
    text: 'Aerodynamic curved wooden throwing implements designed by indigenous hunters that either follow returning flight paths or travel in straight trajectories.',
    source: 'https://en.wikipedia.org/wiki/Boomerang', evidence: ['aerodynamic', 'hunters'], checked: '2026-11-11'
  },
  {
    id: 'AUS-1-005', iso: 'AUS', level: 1, topic: 'songlines', kind: 'culture',
    text: 'Ancient indigenous navigational songlines mapped across vast arid landscapes through memorized verses describing natural landmarks and sacred waterholes.',
    source: 'https://en.wikipedia.org/wiki/Songline', evidence: ['songlines', 'paths'], checked: '2026-11-11'
  },
  {
    id: 'AUS-2-002', iso: 'AUS', level: 2, topic: 'exhibition', kind: 'history',
    text: 'The grand Royal Exhibition Building in Melbourne was completed in 1880 to host international fairs beneath a soaring timber dome.',
    source: 'https://en.wikipedia.org/wiki/Royal_Exhibition_Building', evidence: ['exhibition', 'dome'], checked: '2026-11-11'
  },
  {
    id: 'AUS-2-003', iso: 'AUS', level: 2, topic: 'penicillin', kind: 'history',
    text: 'Scientist Howard Florey shared the 1945 Nobel Prize for developing methods to purify and mass-produce life-saving penicillin antibiotics.',
    source: 'https://en.wikipedia.org/wiki/Howard_Florey', evidence: ['penicillin', 'antibiotics'], checked: '2026-11-11'
  },
  {
    id: 'AUS-2-004', iso: 'AUS', level: 2, topic: 'hydroelectric', kind: 'history',
    text: 'The Snowy Mountains Hydroelectric Scheme, constructed between 1949 and 1974, diverted rivers through tunnels to generate vast renewable power.',
    source: 'https://en.wikipedia.org/wiki/Snowy_Mountains_Scheme', evidence: ['scheme', 'tunnels'], checked: '2026-11-11'
  },
  {
    id: 'AUS-2-005', iso: 'AUS', level: 2, topic: 'aviation', kind: 'history',
    text: 'Pioneering aviator Charles Kingsford Smith completed the first transoceanic flight across the broad expanse to land at Brisbane in 1928.',
    source: 'https://en.wikipedia.org/wiki/Charles_Kingsford_Smith', evidence: ['flight', 'brisbane'], checked: '2026-11-11'
  },
  {
    id: 'AUS-3-002', iso: 'AUS', level: 3, topic: 'operahouse', kind: 'culture',
    text: 'Famous for the Sydney Opera House with sail-shaped roof shells, hopping red kangaroos, and yeast-extract savory spreads.',
    source: 'https://en.wikipedia.org/wiki/Sydney_Opera_House', evidence: ['opera', 'shells'], checked: '2026-11-11'
  },
  {
    id: 'AUS-3-003', iso: 'AUS', level: 3, topic: 'barrierreef', kind: 'culture',
    text: 'Home to the colossal Great Barrier Reef, the largest living coral organism system on Earth visible from orbiting spacecraft.',
    source: 'https://en.wikipedia.org/wiki/Great_Barrier_Reef', evidence: ['coral', 'reef'], checked: '2026-11-11'
  },
  {
    id: 'AUS-3-004', iso: 'AUS', level: 3, topic: 'olympics', kind: 'current', year: 2000,
    text: 'In 2000, hosted the millennium Summer Olympic Games in Sydney, celebrated when indigenous sprinter Cathy Freeman ignited the stadium flame cauldron.',
    source: 'https://en.wikipedia.org/wiki/2000_Summer_Olympics', evidence: ['olympic', 'cauldron'], checked: '2026-11-11'
  },
  {
    id: 'AUS-3-005', iso: 'AUS', level: 3, topic: 'bushfires', kind: 'incident', year: 2020,
    text: 'Endured the catastrophic Black Summer bushfire crisis in 2020 that burned tens of millions of woodland acres, prompting massive global relief.',
    source: 'https://en.wikipedia.org/wiki/2019%E2%80%9320_Australian_bushfire_season', evidence: ['bushfire', 'burned'], checked: '2026-11-11'
  },

  // ── 5. Italy (ITA) ────────────────────────────────────────────────────────
  {
    id: 'ITA-1-002', iso: 'ITA', level: 1, topic: 'theatre', kind: 'culture',
    text: 'Commedia dell arte theatrical tradition developed in the sixteenth century, featuring masked stock characters performing comedic improvised social satire.',
    source: 'https://en.wikipedia.org/wiki/Commedia_dell%27arte', evidence: ['theatrical', 'improvised'], checked: '2026-11-11'
  },
  {
    id: 'ITA-1-003', iso: 'ITA', level: 1, topic: 'luthiery', kind: 'culture',
    text: 'Classical violin craftsmanship developed in Cremona by artisan families like Stradivari, perfecting acoustic resonance through varnished maple and spruce.',
    source: 'https://en.wikipedia.org/wiki/Cremona', evidence: ['violin', 'stradivari'], checked: '2026-11-11'
  },
  {
    id: 'ITA-1-004', iso: 'ITA', level: 1, topic: 'pietradura', kind: 'culture',
    text: 'Intricate pietra dura decorative arts perfected in Florence, inlaying meticulously cut semi-precious colored stones to produce painterly marble tabletops.',
    source: 'https://en.wikipedia.org/wiki/Pietra_dura', evidence: ['inlaying', 'semi-precious'], checked: '2026-11-11'
  },
  {
    id: 'ITA-1-005', iso: 'ITA', level: 1, topic: 'frescoes', kind: 'culture',
    text: 'Ancient Etruscan subterranean chamber tombs decorated with colorful frescoes depicting banquets, athletic contests, and mythological journeys to the afterlife.',
    source: 'https://en.wikipedia.org/wiki/Necropolis_of_Monterozzi', evidence: ['frescoes', 'tombs'], checked: '2026-11-11'
  },
  {
    id: 'ITA-2-002', iso: 'ITA', level: 2, topic: 'astronomy', kind: 'history',
    text: 'Scientist Galileo Galilei constructed refined telescopes in 1609 to discover Jupiter moons, lunar craters, and sunspots.',
    source: 'https://en.wikipedia.org/wiki/Galileo_Galilei', evidence: ['telescopes', 'craters'], checked: '2026-11-11'
  },
  {
    id: 'ITA-2-003', iso: 'ITA', level: 2, topic: 'dome', kind: 'history',
    text: 'Master builder Filippo Brunelleschi engineered the monumental brick dome of Florence cathedral without wooden support centering between 1420 and 1436.',
    source: 'https://en.wikipedia.org/wiki/Florence_Cathedral', evidence: ['brunelleschi', 'dome'], checked: '2026-11-11'
  },
  {
    id: 'ITA-2-004', iso: 'ITA', level: 2, topic: 'electricity', kind: 'history',
    text: 'Physicist Alessandro Volta invented the electric battery in 1800 by stacking alternating zinc and copper discs separated by brine-soaked cloth.',
    source: 'https://en.wikipedia.org/wiki/Voltaic_pile', evidence: ['volta', 'battery'], checked: '2026-11-11'
  },
  {
    id: 'ITA-2-005', iso: 'ITA', level: 2, topic: 'archaeology', kind: 'history',
    text: 'The ancient ruins of Pompeii preserve streets, bakeries, and villas frozen in time after a cataclysmic volcanic eruption in 79 AD.',
    source: 'https://en.wikipedia.org/wiki/Pompeii', evidence: ['pompeii', 'volcanic'], checked: '2026-11-11'
  },
  {
    id: 'ITA-3-002', iso: 'ITA', level: 3, topic: 'monuments', kind: 'culture',
    text: 'Famous for the ancient Colosseum amphitheater, the leaning bell tower of Pisa, and gliding canal gondolas.',
    source: 'https://en.wikipedia.org/wiki/Colosseum', evidence: ['colosseum', 'amphitheatre'], checked: '2026-11-11'
  },
  {
    id: 'ITA-3-003', iso: 'ITA', level: 3, topic: 'cuisine', kind: 'culture',
    text: 'Global homeland of thin-crust wood-fired pizza, rich espresso coffee bars, creamy gelato, and handmade pasta traditions.',
    source: 'https://en.wikipedia.org/wiki/Pizza', evidence: ['pizza', 'espresso'], checked: '2026-11-11'
  },
  {
    id: 'ITA-3-004', iso: 'ITA', level: 3, topic: 'winterolympics', kind: 'current', year: 2006,
    text: 'In 2006, hosted the Winter Olympic Games in Turin, staging figure skating, ice hockey, and bobsleigh across modern mountain resort arenas.',
    source: 'https://en.wikipedia.org/wiki/2006_Winter_Olympics', evidence: ['olympics', 'turin'], checked: '2026-11-11'
  },
  {
    id: 'ITA-3-005', iso: 'ITA', level: 3, topic: 'football', kind: 'current', year: 2021,
    text: 'In 2021, triumphed at the continental football championship final, capturing the prestigious trophy following a thrilling penalty shootout.',
    source: 'https://en.wikipedia.org/wiki/UEFA_Euro_2020', evidence: ['championship', 'penalty'], checked: '2026-11-11'
  },

  // ── 6. India (IND) ────────────────────────────────────────────────────────
  {
    id: 'IND-1-002', iso: 'IND', level: 1, topic: 'dance', kind: 'culture',
    text: 'Bharatanatyam classical temple dance tradition, combining intricate rhythmic footwork, symbolic hand mudras, and expressive facial poetry.',
    source: 'https://en.wikipedia.org/wiki/Bharatanatyam', evidence: ['mudras', 'footwork'], checked: '2026-11-11'
  },
  {
    id: 'IND-1-003', iso: 'IND', level: 1, topic: 'chanting', kind: 'culture',
    text: 'Millennia-old oral Vedic chanting traditions preserved with extraordinary phonetic precision through complex mnemonic recitations passed between generations.',
    source: 'https://en.wikipedia.org/wiki/Vedic_chant', evidence: ['vedic', 'chanting'], checked: '2026-11-11'
  },
  {
    id: 'IND-1-004', iso: 'IND', level: 1, topic: 'folkart', kind: 'culture',
    text: 'Madhubani folk art traditions created using natural dyes and twigs to illustrate mythological narratives on plastered household walls.',
    source: 'https://en.wikipedia.org/wiki/Madhubani_art', evidence: ['madhubani', 'dyes'], checked: '2026-11-11'
  },
  {
    id: 'IND-1-005', iso: 'IND', level: 1, topic: 'medicine', kind: 'culture',
    text: 'Ancient holistic healing philosophy of Ayurveda codified in foundational Sanskrit texts emphasizing harmony between physical doshas and herbal preparations.',
    source: 'https://en.wikipedia.org/wiki/Ayurveda', evidence: ['ayurveda', 'doshas'], checked: '2026-11-11'
  },
  {
    id: 'IND-2-002', iso: 'IND', level: 2, topic: 'astronomy', kind: 'history',
    text: 'The monumental stone astronomical observatory Jantar Mantar features the world largest stone sundial, measuring time with two-second precision.',
    source: 'https://en.wikipedia.org/wiki/Jantar_Mantar,_Jaipur', evidence: ['sundial', 'observatory'], checked: '2026-11-11'
  },
  {
    id: 'IND-2-003', iso: 'IND', level: 2, topic: 'university', kind: 'history',
    text: 'Ancient Nalanda monastic university flourished for centuries as an international center of Buddhist philosophy and advanced logic.',
    source: 'https://en.wikipedia.org/wiki/Nalanda', evidence: ['nalanda', 'monastic'], checked: '2026-11-11'
  },
  {
    id: 'IND-2-004', iso: 'IND', level: 2, topic: 'physics', kind: 'history',
    text: 'Physicist C. V. Raman discovered in 1928 that light deflected through transparent material changes wavelength, winning the 1930 Nobel Prize.',
    source: 'https://en.wikipedia.org/wiki/C._V._Raman', evidence: ['wavelength', 'raman'], checked: '2026-11-11'
  },
  {
    id: 'IND-2-005', iso: 'IND', level: 2, topic: 'caves', kind: 'history',
    text: 'The rock-cut caves of Ajanta preserve magnificent ancient Buddhist mural paintings and carved monastery halls cut into curved basalt cliffs.',
    source: 'https://en.wikipedia.org/wiki/Ajanta_Caves', evidence: ['ajanta', 'basalt'], checked: '2026-11-11'
  },
  {
    id: 'IND-3-002', iso: 'IND', level: 3, topic: 'monument', kind: 'culture',
    text: 'Famous for the magnificent white marble Taj Mahal, vibrant powdered color celebrations during Holi, and aromatic spiced chai tea.',
    source: 'https://en.wikipedia.org/wiki/Taj_Mahal', evidence: ['mahal', 'marble'], checked: '2026-11-11'
  },
  {
    id: 'IND-3-003', iso: 'IND', level: 3, topic: 'cinema', kind: 'record',
    text: 'Produces the largest annual volume of cinematic feature films globally, celebrated for grand song-and-dance musicals and dramatic storytelling.',
    source: 'https://en.wikipedia.org/wiki/Cinema_of_India', evidence: ['cinema', 'musicals'], checked: '2026-11-11'
  },
  {
    id: 'IND-3-004', iso: 'IND', level: 3, topic: 'summit', kind: 'current', year: 2023,
    text: 'In 2023, hosted the international G20 leaders summit, welcoming heads of state to discuss global infrastructure and sustainable development.',
    source: 'https://en.wikipedia.org/wiki/2023_G20_New_Delhi_summit', evidence: ['summit', 'infrastructure'], checked: '2026-11-11'
  },
  {
    id: 'IND-3-005', iso: 'IND', level: 3, topic: 'moonlanding', kind: 'current', year: 2023,
    text: 'In 2023, achieved historic space success when its robotic Chandrayaan-3 mission landed on the lunar surface, deploying the Pragyan rover.',
    source: 'https://en.wikipedia.org/wiki/Chandrayaan-3', evidence: ['chandrayaan', 'rover'], checked: '2026-11-11'
  },

  // ── 7. Peru (PER) ─────────────────────────────────────────────────────────
  {
    id: 'PER-1-002', iso: 'PER', level: 1, topic: 'textiles', kind: 'culture',
    text: 'Ancient Paracas textile culture produced extraordinary finely woven wool mantles embroidered with intricate supernatural deities and vibrant dyes.',
    source: 'https://en.wikipedia.org/wiki/Paracas_culture', evidence: ['textile', 'paracas'], checked: '2026-11-11'
  },
  {
    id: 'PER-1-003', iso: 'PER', level: 1, topic: 'knots', kind: 'culture',
    text: 'Quipu recording system utilizing knotted colored cotton cords to keep complex statistical accounts and census registries without written script.',
    source: 'https://en.wikipedia.org/wiki/Quipu', evidence: ['quipu', 'cords'], checked: '2026-11-11'
  },
  {
    id: 'PER-1-004', iso: 'PER', level: 1, topic: 'beverage', kind: 'culture',
    text: 'Traditional chicha fermented beverage prepared from purple or sprouted corn, consumed during communal festivals and agricultural rituals for centuries.',
    source: 'https://en.wikipedia.org/wiki/Chicha', evidence: ['chicha', 'fermented'], checked: '2026-11-11'
  },
  {
    id: 'PER-1-005', iso: 'PER', level: 1, topic: 'metalwork', kind: 'culture',
    text: 'Pre-Columbian metallurgical masters who perfected gold and silver filigree craftsmanship, creating ceremonial masks and royal ear spools.',
    source: 'https://en.wikipedia.org/wiki/Moche_culture', evidence: ['metallurgy', 'moche'], checked: '2026-11-11'
  },
  {
    id: 'PER-2-002', iso: 'PER', level: 2, topic: 'pyramid', kind: 'history',
    text: 'The sacred city of Caral contains monumental sunken circular plazas and stone platform pyramids dating back five thousand years.',
    source: 'https://en.wikipedia.org/wiki/Caral', evidence: ['caral', 'pyramids'], checked: '2026-11-11'
  },
  {
    id: 'PER-2-003', iso: 'PER', level: 2, topic: 'royalroad', kind: 'history',
    text: 'Qhapaq Nan, an expansive pre-Columbian stone roadway network spanning thousands of kilometers across rugged highlands with suspension bridges.',
    source: 'https://en.wikipedia.org/wiki/Inca_road_system', evidence: ['road', 'suspension'], checked: '2026-11-11'
  },
  {
    id: 'PER-2-004', iso: 'PER', level: 2, topic: 'tomb', kind: 'history',
    text: 'Archaeological discovery of the intact Lord of Sipan tomb in 1987 revealed magnificent gold burial ornaments and regal regalia.',
    source: 'https://en.wikipedia.org/wiki/Lord_of_Sip%C3%A1n', evidence: ['sipan', 'tomb'], checked: '2026-11-11'
  },
  {
    id: 'PER-2-005', iso: 'PER', level: 2, topic: 'stonework', kind: 'history',
    text: 'The ancient fortress of Sacsayhuaman showcases precision masonry with massive megalithic limestone blocks weighing over one hundred tons fitted seamlessly.',
    source: 'https://en.wikipedia.org/wiki/Sacsayhuam%C3%A1n', evidence: ['megalithic', 'masonry'], checked: '2026-11-11'
  },
  {
    id: 'PER-3-002', iso: 'PER', level: 3, topic: 'machupicchu', kind: 'culture',
    text: 'Famous for the cloud-forest stone citadel of Machu Picchu, enigmatic desert Nazca lines, and thousands of native potato varieties.',
    source: 'https://en.wikipedia.org/wiki/Machu_Picchu', evidence: ['citadel', 'machu'], checked: '2026-11-11'
  },
  {
    id: 'PER-3-003', iso: 'PER', level: 3, topic: 'ceviche', kind: 'culture',
    text: 'Renowned culinary culture famous for fresh citrus-cured raw fish ceviche served with roasted giant corn kernels and sweet sweet-potatoes.',
    source: 'https://en.wikipedia.org/wiki/Ceviche', evidence: ['ceviche', 'citrus'], checked: '2026-11-11'
  },
  {
    id: 'PER-3-004', iso: 'PER', level: 3, topic: 'panamgames', kind: 'current', year: 2019,
    text: 'In 2019, staged the international multi-sport championship games, hosting thousands of athletes competing across dozens of sporting disciplines.',
    source: 'https://en.wikipedia.org/wiki/2019_Pan_American_Games', evidence: ['athletes', 'disciplines'], checked: '2026-11-11'
  },
  {
    id: 'PER-3-005', iso: 'PER', level: 3, topic: 'lockdown', kind: 'incident', year: 2020,
    text: 'Implemented strict nationwide health curfews and travel restrictions in 2020 to curb pandemic infection rates across highland regions.',
    source: 'https://en.wikipedia.org/wiki/COVID-19_pandemic_in_Peru', evidence: ['pandemic', 'curfews'], checked: '2026-11-11'
  },

  // ── 8. Canada (CAN) ───────────────────────────────────────────────────────
  {
    id: 'CAN-1-002', iso: 'CAN', level: 1, topic: 'totems', kind: 'culture',
    text: 'Monumental cedar totem poles carved by indigenous coastal nations to display heraldic crests, family lineage, and ancestral mythological figures.',
    source: 'https://en.wikipedia.org/wiki/Totem_pole', evidence: ['totem', 'crests'], checked: '2026-11-11'
  },
  {
    id: 'CAN-1-003', iso: 'CAN', level: 1, topic: 'canoe', kind: 'culture',
    text: 'Birchbark canoes engineered by indigenous peoples using birch skin and spruce roots, enabling swift exploration across intricate inland waterways.',
    source: 'https://en.wikipedia.org/wiki/Canoe', evidence: ['birchbark', 'canoe'], checked: '2026-11-11'
  },
  {
    id: 'CAN-1-004', iso: 'CAN', level: 1, topic: 'maplesyrup', kind: 'culture',
    text: 'Springtime tradition of tapping sugar maple trees to collect sap, boiling it in rustic sugar shacks into amber golden syrup.',
    source: 'https://en.wikipedia.org/wiki/Maple_syrup', evidence: ['maple', 'syrup'], checked: '2026-11-11'
  },
  {
    id: 'CAN-1-005', iso: 'CAN', level: 1, topic: 'inukshuk', kind: 'culture',
    text: 'Inukshuk stone cairns constructed across treeless tundra terrain by traditional indigenous hunters as navigational markers and spiritual waypoints.',
    source: 'https://en.wikipedia.org/wiki/Inuksuk', evidence: ['cairns', 'inuksuk'], checked: '2026-11-11'
  },
  {
    id: 'CAN-2-002', iso: 'CAN', level: 2, topic: 'insulin', kind: 'history',
    text: 'Medical researchers Frederick Banting and Charles Best discovered therapeutic insulin in 1921, transforming diabetes from fatal to manageable.',
    source: 'https://en.wikipedia.org/wiki/Frederick_Banting', evidence: ['insulin', 'banting'], checked: '2026-11-11'
  },
  {
    id: 'CAN-2-003', iso: 'CAN', level: 2, topic: 'railway', kind: 'history',
    text: 'Driving of the Last Spike at Craigellachie in 1885 completed a monumental transcontinental railway uniting remote provinces across vast expanses.',
    source: 'https://en.wikipedia.org/wiki/Last_Spike_%28Canadian_Pacific_Railway%29', evidence: ['spike', 'craigellachie'], checked: '2026-11-11'
  },
  {
    id: 'CAN-2-004', iso: 'CAN', level: 2, topic: 'canal', kind: 'history',
    text: 'The historic Rideau Canal, opened in 1832 as a military waterway, transforms each winter into one of the world longest skating rinks.',
    source: 'https://en.wikipedia.org/wiki/Rideau_Canal', evidence: ['rideau', 'canal'], checked: '2026-11-11'
  },
  {
    id: 'CAN-2-005', iso: 'CAN', level: 2, topic: 'spacearm', kind: 'history',
    text: 'Engineered the famous robotic shuttle arm Canadarm, which deployed, captured, and repaired orbiting satellites throughout thirty space shuttle missions.',
    source: 'https://en.wikipedia.org/wiki/Canadarm', evidence: ['canadarm', 'robotic'], checked: '2026-11-11'
  },
  {
    id: 'CAN-3-002', iso: 'CAN', level: 3, topic: 'poutine', kind: 'culture',
    text: 'Famous for steaming hot french fries topped with fresh squeaky cheese curds and savory brown gravy, alongside pristine glacial lakes.',
    source: 'https://en.wikipedia.org/wiki/Poutine', evidence: ['poutine', 'curds'], checked: '2026-11-11'
  },
  {
    id: 'CAN-3-003', iso: 'CAN', level: 3, topic: 'coastline', kind: 'record',
    text: 'Possesses the longest total maritime coastline of any sovereign territory on Earth, spanning over two hundred thousand kilometers of shores.',
    source: 'https://en.wikipedia.org/wiki/List_of_countries_by_length_of_coastline', evidence: ['coastline', 'kilometers'], checked: '2026-11-11'
  },
  {
    id: 'CAN-3-004', iso: 'CAN', level: 3, topic: 'olympics', kind: 'current', year: 2010,
    text: 'In 2010, hosted the Winter Olympic Games in Vancouver, culminating in an iconic golden goal in men ice hockey.',
    source: 'https://en.wikipedia.org/wiki/2010_Winter_Olympics', evidence: ['vancouver', 'hockey'], checked: '2026-11-11'
  },
  {
    id: 'CAN-3-005', iso: 'CAN', level: 3, topic: 'wildfires', kind: 'incident', year: 2023,
    text: 'In 2023, endured record-breaking wildfire seasons that burned forty million acres of boreal timber, spreading hazy smoke across distant skies.',
    source: 'https://en.wikipedia.org/wiki/2023_Canadian_wildfires', evidence: ['wildfires', 'smoke'], checked: '2026-11-11'
  },

  // ── 9. France (FRA) ───────────────────────────────────────────────────────
  {
    id: 'FRA-1-002', iso: 'FRA', level: 1, topic: 'prehistory', kind: 'culture',
    text: 'Paleolithic cave paintings at Lascaux depict vivid horses, stags, and aurochs painted with mineral pigments over seventeen thousand years ago.',
    source: 'https://en.wikipedia.org/wiki/Lascaux', evidence: ['lascaux', 'aurochs'], checked: '2026-11-11'
  },
  {
    id: 'FRA-1-003', iso: 'FRA', level: 1, topic: 'ballet', kind: 'culture',
    text: 'Classical ballet terminology codified during the seventeenth century under royal academy patronage, establishing universal French terms for dance movements.',
    source: 'https://en.wikipedia.org/wiki/Ballet', evidence: ['ballet', 'terminology'], checked: '2026-11-11'
  },
  {
    id: 'FRA-1-004', iso: 'FRA', level: 1, topic: 'stainedglass', kind: 'culture',
    text: 'High Gothic architectural mastery exemplified by Chartres cathedral, famed for luminous cobalt blue stained-glass rose windows surviving from the thirteenth century.',
    source: 'https://en.wikipedia.org/wiki/Chartres_Cathedral', evidence: ['chartres', 'stained-glass'], checked: '2026-11-11'
  },
  {
    id: 'FRA-1-005', iso: 'FRA', level: 1, topic: 'tapestry', kind: 'culture',
    text: 'Medieval woven wool tapestry series The Lady and the Unicorn presents allegorical depictions of human senses surrounded by floral millefleurs backgrounds.',
    source: 'https://en.wikipedia.org/wiki/The_Lady_and_the_Unicorn', evidence: ['tapestry', 'unicorn'], checked: '2026-11-11'
  },
  {
    id: 'FRA-2-002', iso: 'FRA', level: 2, topic: 'radioactivity', kind: 'history',
    text: 'Physicist Henri Becquerel discovered spontaneous radioactivity in 1896 while investigating phosphorescent uranium salts exposed to photographic plates.',
    source: 'https://en.wikipedia.org/wiki/Henri_Becquerel', evidence: ['becquerel', 'radioactivity'], checked: '2026-11-11'
  },
  {
    id: 'FRA-2-003', iso: 'FRA', level: 2, topic: 'cinema', kind: 'history',
    text: 'Brothers Auguste and Louis Lumiere patented the Cinematographe in 1895, hosting the first commercial public screening of projected motion pictures.',
    source: 'https://en.wikipedia.org/wiki/Auguste_and_Louis_Lumi%C3%A8re', evidence: ['lumiere', 'cinematographe'], checked: '2026-11-11'
  },
  {
    id: 'FRA-2-004', iso: 'FRA', level: 2, topic: 'palace', kind: 'history',
    text: 'The lavish Palace of Versailles Hall of Mirrors was engineered with 357 mirror surfaces reflecting light onto opulent painted barrel-vaulted ceilings.',
    source: 'https://en.wikipedia.org/wiki/Hall_of_Mirrors', evidence: ['versailles', 'mirrors'], checked: '2026-11-11'
  },
  {
    id: 'FRA-2-005', iso: 'FRA', level: 2, topic: 'vaccination', kind: 'history',
    text: 'Scientist Louis Pasteur developed the first successful rabies vaccine in 1885, pioneering fundamental principles of microbial vaccination and sterile pasteurization.',
    source: 'https://en.wikipedia.org/wiki/Louis_Pasteur', evidence: ['pasteur', 'vaccine'], checked: '2026-11-11'
  },
  {
    id: 'FRA-3-002', iso: 'FRA', level: 3, topic: 'museum', kind: 'culture',
    text: 'Home to the Louvre museum with its glass courtyard pyramid, crisp flaky croissants, and prestigious haute couture fashion collections.',
    source: 'https://en.wikipedia.org/wiki/Louvre', evidence: ['louvre', 'pyramid'], checked: '2026-11-11'
  },
  {
    id: 'FRA-3-003', iso: 'FRA', level: 3, topic: 'cycling', kind: 'culture',
    text: 'Hosts the world premier multi-week bicycle race, where elite competitors contest the yellow jersey across scenic mountain passes.',
    source: 'https://en.wikipedia.org/wiki/Tour_de_France', evidence: ['jersey', 'bicycle'], checked: '2026-11-11'
  },
  {
    id: 'FRA-3-004', iso: 'FRA', level: 3, topic: 'olympics', kind: 'current', year: 2024,
    text: 'In 2024, hosted the Summer Olympic Games, staging a spectacular open-air parade of international athletes along an iconic urban waterway.',
    source: 'https://en.wikipedia.org/wiki/2024_Summer_Olympics', evidence: ['parade', 'olympic'], checked: '2026-11-11'
  },
  {
    id: 'FRA-3-005', iso: 'FRA', level: 3, topic: 'cathedralfire', kind: 'incident', year: 2019,
    text: 'In 2019, a catastrophic accidental fire damaged the beloved medieval Notre-Dame cathedral, causing its lead spire to collapse during restoration.',
    source: 'https://en.wikipedia.org/wiki/Notre-Dame_fire', evidence: ['cathedral', 'spire'], checked: '2026-11-11'
  },

  // ── 10. Kenya (KEN) ───────────────────────────────────────────────────────
  {
    id: 'KEN-1-002', iso: 'KEN', level: 1, topic: 'beadwork', kind: 'culture',
    text: 'Intricate glass beads and collars crafted by indigenous pastoralist women, using symbolic color patterns to signify age, marital status, and clan identity.',
    source: 'https://en.wikipedia.org/wiki/Maasai_people', evidence: ['pastoralist', 'cattle'], checked: '2026-11-11'
  },
  {
    id: 'KEN-1-003', iso: 'KEN', level: 1, topic: 'stonearchitecture', kind: 'culture',
    text: 'Ancient coral stone town architecture on Lamu island featuring intricately carved wooden doors and narrow pedestrian streets undisturbed by automobiles.',
    source: 'https://en.wikipedia.org/wiki/Lamu', evidence: ['stone', 'town'], checked: '2026-11-11'
  },
  {
    id: 'KEN-1-004', iso: 'KEN', level: 1, topic: 'woodcraft', kind: 'culture',
    text: 'Akamba woodcarving traditions producing detailed hardwood wildlife sculptures, evolving from utilitarian tool craftsmanship into globally recognized folk art.',
    source: 'https://en.wikipedia.org/wiki/Kamba_people', evidence: ['carving', 'wood'], checked: '2026-11-11'
  },
  {
    id: 'KEN-1-005', iso: 'KEN', level: 1, topic: 'fabrics', kind: 'culture',
    text: 'Colorful patterned kanga cotton textiles featuring Swahili proverb inscriptions along the edges, worn traditionally as multi-purpose wraps and ceremonial attire.',
    source: 'https://en.wikipedia.org/wiki/Kanga_(garment)', evidence: ['kanga', 'swahili'], checked: '2026-11-11'
  },
  {
    id: 'KEN-2-002', iso: 'KEN', level: 2, topic: 'paleontology', kind: 'history',
    text: 'Pioneering fossil discoveries near Lake Turkana by Richard Leakey in 1984 unearthed the remarkably intact skeleton of Turkana Boy.',
    source: 'https://en.wikipedia.org/wiki/Turkana_Boy', evidence: ['skeleton', 'turkana'], checked: '2026-11-11'
  },
  {
    id: 'KEN-2-003', iso: 'KEN', level: 2, topic: 'ecology', kind: 'history',
    text: 'Environmentalist Wangari Maathai founded the Green Belt Movement in 1977, organizing rural women to plant tens of millions of trees.',
    source: 'https://en.wikipedia.org/wiki/Wangari_Maathai', evidence: ['maathai', 'trees'], checked: '2026-11-11'
  },
  {
    id: 'KEN-2-004', iso: 'KEN', level: 2, topic: 'railway', kind: 'history',
    text: 'The historic railway line from Mombasa to Lake Victoria was constructed in 1896, overcoming rugged wilderness and legendary Tsavo lion attacks.',
    source: 'https://en.wikipedia.org/wiki/Uganda_Railway', evidence: ['railway', 'mombasa'], checked: '2026-11-11'
  },
  {
    id: 'KEN-2-005', iso: 'KEN', level: 2, topic: 'fortress', kind: 'history',
    text: 'Fort Jesus, a massive sixteenth-century military bastion overlooking the harbor, exhibits Renaissance military architecture with coral walls.',
    source: 'https://en.wikipedia.org/wiki/Fort_Jesus', evidence: ['fort', 'jesus'], checked: '2026-11-11'
  },
  {
    id: 'KEN-3-002', iso: 'KEN', level: 3, topic: 'migration', kind: 'culture',
    text: 'Renowned for the Great Migration of over one million wildebeests across savanna plains, alongside world-conquering distance running champions.',
    source: 'https://en.wikipedia.org/wiki/Serengeti', evidence: ['wildebeest', 'migration'], checked: '2026-11-11'
  },
  {
    id: 'KEN-3-003', iso: 'KEN', level: 3, topic: 'tea', kind: 'record',
    text: 'Leads the world as a premier global exporter of fragrant black tea, cultivated across cool lush highland tea estates.',
    source: 'https://en.wikipedia.org/wiki/Tea_production_in_Kenya', evidence: ['tea', 'highland'], checked: '2026-11-11'
  },
  {
    id: 'KEN-3-004', iso: 'KEN', level: 3, topic: 'marathon', kind: 'record', year: 2019,
    text: 'In 2019, athletic legend Eliud Kipchoge made global running history by completing a marathon distance in under two hours.',
    source: 'https://en.wikipedia.org/wiki/Ineos_1:59_Challenge', evidence: ['kipchoge', 'marathon'], checked: '2026-11-11'
  },
  {
    id: 'KEN-3-005', iso: 'KEN', level: 3, topic: 'locusts', kind: 'incident', year: 2020,
    text: 'In 2020, battled devastating desert locust swarms that surged across agricultural valleys, threatening harvests across multiple rural communities.',
    source: 'https://en.wikipedia.org/wiki/2019%E2%80%932021_locust_infestation', evidence: ['locust', 'swarms'], checked: '2026-11-11'
  }
];

async function run() {
  console.log(`Auditing Chunk 1 (${chunk1Items.length} items)...`);
  let hasErrors = false;

  for (const item of chunk1Items) {
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
    console.error('Chunk 1 has errors! Aborting.');
    process.exit(1);
  }

  console.log(`Chunk 1 verified! 100% of ${chunk1Items.length} items pass all pattern and URL checks.`);

  // Append items to clues.json and clues.js
  const combined = [...existingClues, ...chunk1Items];
  fs.writeFileSync(cluesPath, JSON.stringify(combined, null, 2), 'utf8');
  fs.writeFileSync(cluesJsPath, `// Clue Library\nexport const CLUES_LIBRARY = ${JSON.stringify(combined, null, 2)};\nexport default CLUES_LIBRARY;\n`, 'utf8');
  console.log(`Updated clues.json and clues.js! Total items now: ${combined.length}`);
}

run().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
