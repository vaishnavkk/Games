import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const jsonPath = path.resolve(__dirname, '../data/countries.json');
const jsPath = path.resolve(__dirname, '../data/countries.js');

const countries = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

// Comprehensive dossier metadata for all 195 sovereign nations
const DOSSIER_DATA = {
  "Japan": {
    officialName: "State of Japan (Nippon-koku)",
    region: "Asia",
    subregion: "Eastern Asia",
    population: 124500000,
    areaKm2: 377975,
    languages: ["Japanese"],
    currency: "Japanese Yen (JPY, ¥)",
    neighbors: [],
    maritimeStatus: "Stratovolcanic Archipelago (6,852 islands)",
    fieldNotes: "Extends along the Pacific Rim of Fire with over 100 active volcanoes. Its forested mountainous terrain covers 73% of total land area, necessitating world-class subterranean transport and seismic engineering."
  },
  "Egypt": {
    officialName: "Arab Republic of Egypt",
    region: "Africa",
    subregion: "Northern Africa",
    population: 112700000,
    areaKm2: 1002450,
    languages: ["Arabic"],
    currency: "Egyptian Pound (EGP, E£)",
    neighbors: ["Libya", "Sudan", "Israel", "Palestine"],
    maritimeStatus: "Dual-Sea Coastal (Mediterranean & Red Sea)",
    fieldNotes: "Home to the Nile River basin and the strategic Suez Canal connecting European and Asian maritime routes. Over 95% of its population inhabits the fertile strip flanking the world's longest river."
  },
  "Brazil": {
    officialName: "Federative Republic of Brazil",
    region: "Americas",
    subregion: "South America",
    population: 216400000,
    areaKm2: 8515767,
    languages: ["Portuguese"],
    currency: "Brazilian Real (BRL, R$)",
    neighbors: ["Argentina", "Bolivia", "Colombia", "Guyana", "Paraguay", "Peru", "Suriname", "Uruguay", "Venezuela"],
    maritimeStatus: "Atlantic Coastal (7,491 km coastline)",
    fieldNotes: "Encompasses roughly 60% of the Amazon Rainforest—the planet's richest biological repository—and produces one third of global coffee output across fertile southeastern highlands."
  },
  "Australia": {
    officialName: "Commonwealth of Australia",
    region: "Oceania",
    subregion: "Australia and New Zealand",
    population: 26500000,
    areaKm2: 7692024,
    languages: ["English"],
    currency: "Australian Dollar (AUD, A$)",
    neighbors: [],
    maritimeStatus: "Island Continent / Megadiverse",
    fieldNotes: "The lowest, flattest, and oldest continental landmass on Earth. Isolation over 40 million years allowed unique marsupial biodiversity and the Great Barrier Reef ecosystem to evolve."
  },
  "Italy": {
    officialName: "Italian Republic (Repubblica Italiana)",
    region: "Europe",
    subregion: "Southern Europe",
    population: 58870000,
    areaKm2: 301340,
    languages: ["Italian"],
    currency: "Euro (EUR, €)",
    neighbors: ["France", "Switzerland", "Austria", "Slovenia", "San Marino", "Vatican City"],
    maritimeStatus: "Peninsular Mediterranean",
    fieldNotes: "Boasts 59 UNESCO World Heritage sites—the most of any nation on Earth. Its boot-shaped peninsula forms the geographic spine dividing the western and eastern Mediterranean basins."
  },
  "India": {
    officialName: "Republic of India (Bharat Ganrajya)",
    region: "Asia",
    subregion: "Southern Asia",
    population: 1428627663,
    areaKm2: 3287263,
    languages: ["Hindi", "English", "22 Scheduled Official Languages"],
    currency: "Indian Rupee (INR, ₹)",
    neighbors: ["Pakistan", "China", "Nepal", "Bhutan", "Bangladesh", "Myanmar"],
    maritimeStatus: "Indian Ocean Peninsula (7,516 km coastline)",
    fieldNotes: "The world's most populous nation and largest democracy. Defined geographically by the northern Himalayan ramparts, the fertile Indo-Gangetic plain, and the triangular peninsular Deccan plateau with sovereign territory uniting J&K, Ladakh, and Arunachal Pradesh."
  },
  "Peru": {
    officialName: "Republic of Peru (República del Perú)",
    region: "Americas",
    subregion: "South America",
    population: 34000000,
    areaKm2: 1285216,
    languages: ["Spanish", "Quechua", "Aymara"],
    currency: "Peruvian Sol (PEN, S/)",
    neighbors: ["Ecuador", "Colombia", "Brazil", "Bolivia", "Chile"],
    maritimeStatus: "Pacific Coastal (Humboldt Current)",
    fieldNotes: "Encompasses three sharply contrasting natural regions: the hyper-arid coastal desert, the towering central Andes cordillera, and the vast Amazonian lowland rainforest."
  },
  "Canada": {
    officialName: "Canada",
    region: "Americas",
    subregion: "Northern America",
    population: 40100000,
    areaKm2: 9984670,
    languages: ["English", "French"],
    currency: "Canadian Dollar (CAD, C$)",
    neighbors: ["United States"],
    maritimeStatus: "Tri-Oceanic (Atlantic, Pacific, Arctic)",
    fieldNotes: "The second-largest country by land area with the world's longest coastline (202,080 km). Contains over 2 million freshwater lakes, holding 20% of the planet's surface freshwater."
  },
  "France": {
    officialName: "French Republic (République française)",
    region: "Europe",
    subregion: "Western Europe",
    population: 68000000,
    areaKm2: 551695,
    languages: ["French"],
    currency: "Euro (EUR, €)",
    neighbors: ["Belgium", "Luxembourg", "Germany", "Switzerland", "Italy", "Monaco", "Spain", "Andorra"],
    maritimeStatus: "Hexagonal Atlantic & Mediterranean",
    fieldNotes: "Acts as Western Europe's agricultural powerhouse and historic diplomatic nexus. Its overseas territories extend its exclusive economic zone across 11 million square kilometers of ocean."
  },
  "Kenya": {
    officialName: "Republic of Kenya",
    region: "Africa",
    subregion: "Eastern Africa",
    population: 55100000,
    areaKm2: 580367,
    languages: ["Swahili", "English"],
    currency: "Kenyan Shilling (KES, KSh)",
    neighbors: ["Ethiopia", "Somalia", "South Sudan", "Tanzania", "Uganda"],
    maritimeStatus: "Indian Ocean Coastal",
    fieldNotes: "Bisected directly by the Earth's equator and the Great Rift Valley. Serves as East Africa's economic, financial, and logistics epicenter with leading geothermal energy adoption."
  },
  "Iceland": {
    officialName: "Republic of Iceland (Ísland)",
    region: "Europe",
    subregion: "Northern Europe",
    population: 393600,
    areaKm2: 103000,
    languages: ["Icelandic"],
    currency: "Icelandic Króna (ISK, kr)",
    neighbors: [],
    maritimeStatus: "Mid-Atlantic Volcanic Island",
    fieldNotes: "Straddles the spreading boundary of the Eurasian and North American tectonic plates. Derives 100% of its electricity and district heating from renewable geothermal and hydro sources."
  },
  "Mexico": {
    officialName: "United Mexican States (Estados Unidos Mexicanos)",
    region: "Americas",
    subregion: "North America",
    population: 129000000,
    areaKm2: 1964375,
    languages: ["Spanish"],
    currency: "Mexican Peso (MXN, $)",
    neighbors: ["United States", "Guatemala", "Belize"],
    maritimeStatus: "Pacific & Gulf/Caribbean Coastal",
    fieldNotes: "The cradle of Mesoamerican civilizations including the Maya and Aztec empires. Features high central volcanic plateaus bounded by the Sierra Madre mountain systems."
  },
  "Norway": {
    officialName: "Kingdom of Norway (Kongeriket Norge)",
    region: "Europe",
    subregion: "Northern Europe",
    population: 5520000,
    areaKm2: 385207,
    languages: ["Norwegian (Bokmål, Nynorsk)", "Sámi"],
    currency: "Norwegian Krone (NOK, kr)",
    neighbors: ["Sweden", "Finland", "Russia"],
    maritimeStatus: "Glaciated Fjord Coastline (Atlantic/Arctic)",
    fieldNotes: "Features deep sea fjords carved by Pleistocene glaciers. Holds the world's largest sovereign wealth fund funded by offshore petroleum while leading global electric vehicle adoption."
  },
  "Greece": {
    officialName: "Hellenic Republic (Elliniki Dimokratia)",
    region: "Europe",
    subregion: "Southern Europe",
    population: 10400000,
    areaKm2: 131957,
    languages: ["Greek"],
    currency: "Euro (EUR, €)",
    neighbors: ["Albania", "North Macedonia", "Bulgaria", "Turkey"],
    maritimeStatus: "Aegean & Ionian Archipelago (6,000 islands)",
    fieldNotes: "The philosophical, mathematical, and democratic foundation of Western civilization. Controls the world's largest commercial merchant shipping fleet by tonnage."
  },
  "South Africa": {
    officialName: "Republic of South Africa",
    region: "Africa",
    subregion: "Southern Africa",
    population: 60400000,
    areaKm2: 1221037,
    languages: ["12 Official Languages (including Zulu, Xhosa, Afrikaans, English)"],
    currency: "South African Rand (ZAR, R)",
    neighbors: ["Botswana", "Lesotho", "Mozambique", "Namibia", "Eswatini", "Zimbabwe"],
    maritimeStatus: "Cape Basin (Atlantic meets Indian Ocean)",
    fieldNotes: "Features three distinct capital cities (Pretoria, Cape Town, Bloemfontein). Its high central plateau (Highveld) hosts the world's deepest platinum and gold mineral reserves."
  },
  "New Zealand": {
    officialName: "New Zealand (Aotearoa)",
    region: "Oceania",
    subregion: "Australia and New Zealand",
    population: 5220000,
    areaKm2: 268838,
    languages: ["English", "Māori", "NZ Sign Language"],
    currency: "New Zealand Dollar (NZD, NZ$)",
    neighbors: [],
    maritimeStatus: "South Pacific Dual-Island Nation",
    fieldNotes: "Located on the submerged continent of Zealandia. Features dramatic alpine glaciated peaks, thermal geysers, and ancient Gondwanan podocarp rainforests."
  },
  "Morocco": {
    officialName: "Kingdom of Morocco (Al-Mamlakah al-Maghribiyah)",
    region: "Africa",
    subregion: "Northern Africa",
    population: 37800000,
    areaKm2: 446550,
    languages: ["Arabic", "Berber (Tamazight)"],
    currency: "Moroccan Dirham (MAD)",
    neighbors: ["Algeria", "Mauritania", "Spain (Ceuta/Melilla)"],
    maritimeStatus: "Strait of Gibraltar Coastal Gateway",
    fieldNotes: "Guards the 14-kilometer naval bottleneck connecting the Atlantic Ocean with the Mediterranean Sea. Holds over 70% of the world's proven phosphate reserves."
  },
  "Switzerland": {
    officialName: "Swiss Confederation (Confoederatio Helvetica)",
    region: "Europe",
    subregion: "Western Europe",
    population: 8900000,
    areaKm2: 41285,
    languages: ["German", "French", "Italian", "Romansh"],
    currency: "Swiss Franc (CHF, Fr)",
    neighbors: ["Germany", "France", "Italy", "Austria", "Liechtenstein"],
    maritimeStatus: "Landlocked Alpine Hydrological Tower",
    fieldNotes: "Maintains armed permanent neutrality recognized since 1815. Its high Alpine glaciers feed the headwaters of the Rhine, Rhône, Inn, and Ticino river systems."
  },
  "Thailand": {
    officialName: "Kingdom of Thailand (Ratcha Anachak Thai)",
    region: "Asia",
    subregion: "South-Eastern Asia",
    population: 71800000,
    areaKm2: 513120,
    languages: ["Thai"],
    currency: "Thai Baht (THB, ฿)",
    neighbors: ["Myanmar", "Laos", "Cambodia", "Malaysia"],
    maritimeStatus: "Gulf of Thailand & Andaman Sea Coastal",
    fieldNotes: "The only Southeast Asian nation never colonized by European powers. Anchored by the Chao Phraya river delta, making it a leading global exporter of rice and natural rubber."
  },
  "Argentina": {
    officialName: "Argentine Republic (República Argentina)",
    region: "Americas",
    subregion: "South America",
    population: 46600000,
    areaKm2: 2780400,
    languages: ["Spanish"],
    currency: "Argentine Peso (ARS, $)",
    neighbors: ["Chile", "Bolivia", "Paraguay", "Brazil", "Uruguay"],
    maritimeStatus: "South Atlantic Maritime Gateway",
    fieldNotes: "Spans 3,700 km north to south from subtropical scrubland to subantarctic Tierra del Fuego. Contains Aconcagua (6,961 m), the highest peak outside the Himalayas."
  },
  "United Kingdom": {
    officialName: "United Kingdom of Great Britain and Northern Ireland",
    region: "Europe",
    subregion: "Northern Europe",
    population: 67700000,
    areaKm2: 242495,
    languages: ["English"],
    currency: "Pound Sterling (GBP, £)",
    neighbors: ["Ireland"],
    maritimeStatus: "North Atlantic Archipelagic State",
    fieldNotes: "Comprises four nations (England, Scotland, Wales, Northern Ireland). The birthplace of the Industrial Revolution and parliamentary constitutional democracy."
  },
  "Germany": {
    officialName: "Federal Republic of Germany (Bundesrepublik Deutschland)",
    region: "Europe",
    subregion: "Western Europe",
    population: 84400000,
    areaKm2: 357592,
    languages: ["German"],
    currency: "Euro (EUR, €)",
    neighbors: ["Denmark", "Poland", "Czechia", "Austria", "Switzerland", "France", "Luxembourg", "Belgium", "Netherlands"],
    maritimeStatus: "North Sea & Baltic Coastal",
    fieldNotes: "Europe's largest national economy and leading industrial engineering powerhouse. Traversed by the Rhine and Danube river commercial corridors."
  },
  "Spain": {
    officialName: "Kingdom of Spain (Reino de España)",
    region: "Europe",
    subregion: "Southern Europe",
    population: 48300000,
    areaKm2: 505990,
    languages: ["Spanish", "Catalan", "Galician", "Basque"],
    currency: "Euro (EUR, €)",
    neighbors: ["Portugal", "France", "Andorra", "Morocco", "Gibraltar"],
    maritimeStatus: "Iberian Atlantic & Mediterranean Peninsula",
    fieldNotes: "Dominates the Iberian Peninsula with extensive arid meseta plateaus. The world's largest olive oil producer and second-most visited tourist nation globally."
  },
  "United States": {
    officialName: "United States of America",
    region: "Americas",
    subregion: "Northern America",
    population: 334900000,
    areaKm2: 9833517,
    languages: ["English", "Spanish"],
    currency: "United States Dollar (USD, $)",
    neighbors: ["Canada", "Mexico"],
    maritimeStatus: "Dual-Ocean Maritime Supercontinent",
    fieldNotes: "Composed of 50 states, a federal district, and overseas territories. Features the world's largest economy, spanning from subarctic Alaska to tropical Hawaii."
  },
  "China": {
    officialName: "People's Republic of China (Zhonghua Renmin Gongheguo)",
    region: "Asia",
    subregion: "Eastern Asia",
    population: 1410000000,
    areaKm2: 9596961,
    languages: ["Standard Chinese (Mandarin)"],
    currency: "Renminbi Yuan (CNY, ¥)",
    neighbors: ["Russia", "Mongolia", "Kazakhstan", "Kyrgyzstan", "Tajikistan", "Afghanistan", "Pakistan", "India", "Nepal", "Bhutan", "Myanmar", "Laos", "Vietnam", "North Korea"],
    maritimeStatus: "East & South China Sea Coastal",
    fieldNotes: "Extends across five geographical tiers from the Tibetan 'Roof of the World' down to Pacific coastal plains. The world's largest manufacturing powerhouse."
  },
  "Russia": {
    officialName: "Russian Federation (Rossiyskaya Federatsiya)",
    region: "Europe",
    subregion: "Eastern Europe / Northern Asia",
    population: 144200000,
    areaKm2: 17098246,
    languages: ["Russian"],
    currency: "Russian Ruble (RUB, ₽)",
    neighbors: ["Norway", "Finland", "Estonia", "Latvia", "Lithuania", "Poland", "Belarus", "Ukraine", "Georgia", "Azerbaijan", "Kazakhstan", "China", "Mongolia", "North Korea"],
    maritimeStatus: "Tri-Oceanic Eurasian Landmass (11 time zones)",
    fieldNotes: "The world's largest country by geographic land area, covering over one eighth of Earth's inhabited land area and containing Lake Baikal, the deepest freshwater lake."
  },
  "Turkey": {
    officialName: "Republic of Türkiye",
    region: "Asia",
    subregion: "Western Asia / Southeastern Europe",
    population: 85300000,
    areaKm2: 783562,
    languages: ["Turkish"],
    currency: "Turkish Lira (TRY, ₺)",
    neighbors: ["Greece", "Bulgaria", "Georgia", "Armenia", "Azerbaijan", "Iran", "Iraq", "Syria"],
    maritimeStatus: "Transcontinental Bosporus / Black & Mediterranean Seas",
    fieldNotes: "Controls the Turkish Straits (Bosphorus and Dardanelles), the vital naval link between the Black Sea and the Mediterranean. Acts as an ancient transcontinental bridge."
  },
  "Vietnam": {
    officialName: "Socialist Republic of Vietnam (Cộng hòa Xã hội chủ nghĩa Việt Nam)",
    region: "Asia",
    subregion: "South-Eastern Asia",
    population: 98900000,
    areaKm2: 331212,
    languages: ["Vietnamese"],
    currency: "Vietnamese Đồng (VND, ₫)",
    neighbors: ["China", "Laos", "Cambodia"],
    maritimeStatus: "South China Sea S-Curved Littoral (3,260 km)",
    fieldNotes: "Features an S-shaped coastline flanking the Annamite Range. Anchored by the fertile agricultural basins of the Red River Delta in the north and Mekong Delta in the south."
  },
  "South Korea": {
    officialName: "Republic of Korea (Daehan Minguk)",
    region: "Asia",
    subregion: "Eastern Asia",
    population: 51700000,
    areaKm2: 100210,
    languages: ["Korean"],
    currency: "South Korean Won (KRW, ₩)",
    neighbors: ["North Korea"],
    maritimeStatus: "Yellow Sea & Sea of Japan Peninsula",
    fieldNotes: "Occupies the southern half of the Korean Peninsula. World leader in semiconductor technology, shipbuilding, and consumer electronics, centered around the Seoul capital region."
  },
  "Netherlands": {
    officialName: "Kingdom of the Netherlands (Koninkrijk der Nederlanden)",
    region: "Europe",
    subregion: "Western Europe",
    population: 17900000,
    areaKm2: 41850,
    languages: ["Dutch"],
    currency: "Euro (EUR, €)",
    neighbors: ["Germany", "Belgium"],
    maritimeStatus: "North Sea Rhine Delta / Polder Coastal",
    fieldNotes: "Over 26% of its territory lies below mean sea level, protected by the Zuiderzee Works and Delta Works mega-engineering dams. Hosts Europe's busiest seaport at Rotterdam."
  },
  "Sweden": {
    officialName: "Kingdom of Sweden (Konungariket Sverige)",
    region: "Europe",
    subregion: "Northern Europe",
    population: 10500000,
    areaKm2: 450295,
    languages: ["Swedish"],
    currency: "Swedish Krona (SEK, kr)",
    neighbors: ["Norway", "Finland"],
    maritimeStatus: "Baltic Coastal & Skagerrak Littoral",
    fieldNotes: "Covered by boreal taiga forests (69%) and over 100,000 lakes. Known for pioneering social welfare models, green steel innovation, and deep engineering design heritage."
  },
  "Portugal": {
    officialName: "Portuguese Republic (República Portuguesa)",
    region: "Europe",
    subregion: "Southern Europe",
    population: 10400000,
    areaKm2: 92212,
    languages: ["Portuguese"],
    currency: "Euro (EUR, €)",
    neighbors: ["Spain"],
    maritimeStatus: "Atlantic Continental Shelf Gateway",
    fieldNotes: "The westernmost nation of mainland Europe. Pioneered the Age of Discovery maritime navigation routes and is the world's leading producer of commercial oak cork bark."
  },
  "Indonesia": {
    officialName: "Republic of Indonesia (Republik Indonesia)",
    region: "Asia",
    subregion: "South-Eastern Asia",
    population: 277500000,
    areaKm2: 1904569,
    languages: ["Indonesian"],
    currency: "Indonesian Rupiah (IDR, Rp)",
    neighbors: ["Malaysia", "Papua New Guinea", "Timor-Leste"],
    maritimeStatus: "World's Largest Archipelagic State (17,508 islands)",
    fieldNotes: "Spans 5,100 km across the equator between the Indian and Pacific Oceans. Home to the Wallace Line separating Asian and Australasian evolutionary fauna."
  },
  "Colombia": {
    officialName: "Republic of Colombia (República de Colombia)",
    region: "Americas",
    subregion: "South America",
    population: 52100000,
    areaKm2: 1141748,
    languages: ["Spanish"],
    currency: "Colombian Peso (COP, $)",
    neighbors: ["Panama", "Venezuela", "Brazil", "Peru", "Ecuador"],
    maritimeStatus: "Dual-Ocean Coastal (Pacific & Caribbean)",
    fieldNotes: "The only South American country with coastlines on both the Pacific and Atlantic (Caribbean) Oceans. Second most biodiverse country on Earth per square kilometer."
  },
  "Chile": {
    officialName: "Republic of Chile (República de Chile)",
    region: "Americas",
    subregion: "South America",
    population: 19600000,
    areaKm2: 756102,
    languages: ["Spanish"],
    currency: "Chilean Peso (CLP, $)",
    neighbors: ["Argentina", "Bolivia", "Peru"],
    maritimeStatus: "Pacific Ribbon Littoral (4,270 km long, 177 km avg width)",
    fieldNotes: "The longest north-to-south country in the world. Encompasses the Atacama Desert—the driest non-polar desert on Earth—and the glaciated fjords of Patagonia."
  },
  "Austria": {
    officialName: "Republic of Austria (Republik Österreich)",
    region: "Europe",
    subregion: "Central Europe",
    population: 9100000,
    areaKm2: 83871,
    languages: ["German"],
    currency: "Euro (EUR, €)",
    neighbors: ["Germany", "Czechia", "Slovakia", "Hungary", "Slovenia", "Italy", "Switzerland", "Liechtenstein"],
    maritimeStatus: "Landlocked Alpine & Danubian",
    fieldNotes: "A predominantly mountainous country dominated by the Central Eastern Alps. Long served as the imperial Habsburg political nexus of Central Europe along the Danube."
  },
  "Belgium": {
    officialName: "Kingdom of Belgium (Koninkrijk België / Royaume de Belgique)",
    region: "Europe",
    subregion: "Western Europe",
    population: 11700000,
    areaKm2: 30528,
    languages: ["Dutch", "French", "German"],
    currency: "Euro (EUR, €)",
    neighbors: ["Netherlands", "Germany", "Luxembourg", "France"],
    maritimeStatus: "North Sea Coastal & Estuarine",
    fieldNotes: "Straddles the Germanic and Latin cultural boundary. Serves as the headquarters for the European Union and NATO in Brussels."
  },
  "Ireland": {
    officialName: "Republic of Ireland (Éire)",
    region: "Europe",
    subregion: "Northern Europe",
    population: 5260000,
    areaKm2: 70273,
    languages: ["Irish", "English"],
    currency: "Euro (EUR, €)",
    neighbors: ["United Kingdom"],
    maritimeStatus: "North Atlantic Island Nation",
    fieldNotes: "Known as the Emerald Isle due to its lush pastoral landscape sustained by the North Atlantic Current. Major European headquarters for global technology and pharmaceutical enterprises."
  },
  "Poland": {
    officialName: "Republic of Poland (Rzeczpospolita Polska)",
    region: "Europe",
    subregion: "Central Europe",
    population: 36700000,
    areaKm2: 312696,
    languages: ["Polish"],
    currency: "Polish Złoty (PLN, zł)",
    neighbors: ["Germany", "Czechia", "Slovakia", "Ukraine", "Belarus", "Lithuania", "Russia"],
    maritimeStatus: "Baltic Sea Coastal",
    fieldNotes: "Occupies the North European Plain between the Baltic Sea and the Carpathian Mountains. The sixth-largest economy in the EU, centered on the Vistula river basin."
  },
  "Malaysia": {
    officialName: "Malaysia",
    region: "Asia",
    subregion: "South-Eastern Asia",
    population: 33900000,
    areaKm2: 330803,
    languages: ["Malay"],
    currency: "Malaysian Ringgit (MYR, RM)",
    neighbors: ["Thailand", "Indonesia", "Brunei"],
    maritimeStatus: "Strait of Malacca & South China Sea Maritime",
    fieldNotes: "Separated into Peninsular Malaysia and Malaysian Borneo by the South China Sea. Controls navigation flanking the Strait of Malacca, the world's busiest maritime oil transit choke point."
  },
  "Singapore": {
    officialName: "Republic of Singapore",
    region: "Asia",
    subregion: "South-Eastern Asia",
    population: 5920000,
    areaKm2: 734,
    languages: ["English", "Malay", "Mandarin", "Tamil"],
    currency: "Singapore Dollar (SGD, S$)",
    neighbors: [],
    maritimeStatus: "Equatorial Island City-State",
    fieldNotes: "A highly urbanized global trade, financial, and automated maritime hub. Expanded its physical land area by over 25% through innovative land reclamation since independence."
  },
  "Saudi Arabia": {
    officialName: "Kingdom of Saudi Arabia (Al-Mamlakah al-Arabiyah as-Saudiyah)",
    region: "Asia",
    subregion: "Western Asia",
    population: 36400000,
    areaKm2: 2149690,
    languages: ["Arabic"],
    currency: "Saudi Riyal (SAR, ﷼)",
    neighbors: ["Jordan", "Iraq", "Kuwait", "Qatar", "United Arab Emirates", "Oman", "Yemen"],
    maritimeStatus: "Red Sea & Persian Gulf Littoral",
    fieldNotes: "Occupies roughly 80% of the Arabian Peninsula. Holds 17% of the world's proven petroleum reserves and houses Islam's two holiest sanctuaries at Mecca and Medina."
  },
  "United Arab Emirates": {
    officialName: "United Arab Emirates (Al-Imarat al-Arabiyah al-Muttahidah)",
    region: "Asia",
    subregion: "Western Asia",
    population: 9500000,
    areaKm2: 83600,
    languages: ["Arabic"],
    currency: "UAE Dirham (AED, د.إ)",
    neighbors: ["Saudi Arabia", "Oman"],
    maritimeStatus: "Persian Gulf & Gulf of Oman Coastal",
    fieldNotes: "A federation of seven hereditary monarchies (emirates) anchored by Abu Dhabi and Dubai. Evolved into an international aviation crossroads and financial capital."
  },
  "Nigeria": {
    officialName: "Federal Republic of Nigeria",
    region: "Africa",
    subregion: "Western Africa",
    population: 223800000,
    areaKm2: 923768,
    languages: ["English"],
    currency: "Nigerian Naira (NGN, ₦)",
    neighbors: ["Benin", "Niger", "Chad", "Cameroon"],
    maritimeStatus: "Gulf of Guinea Atlantic Coastal",
    fieldNotes: "Africa's most populous nation, housing over 250 distinct ethnic groups. Anchored economically by the Niger Delta oil basin and the megacity of Lagos."
  },
  "Ecuador": {
    officialName: "Republic of Ecuador (República del Ecuador)",
    region: "Americas",
    subregion: "South America",
    population: 18000000,
    areaKm2: 276841,
    languages: ["Spanish", "Kichwa", "Shuar"],
    currency: "United States Dollar (USD, $)",
    neighbors: ["Colombia", "Peru"],
    maritimeStatus: "Pacific Coastal & Galápagos Archipelago",
    fieldNotes: "Named for the Equator that crosses it. Its sovereign Galápagos Islands served as Charles Darwin's living laboratory for evolutionary natural selection."
  },
  "Croatia": {
    officialName: "Republic of Croatia (Republika Hrvatska)",
    region: "Europe",
    subregion: "Southern Europe",
    population: 3850000,
    areaKm2: 56594,
    languages: ["Croatian"],
    currency: "Euro (EUR, €)",
    neighbors: ["Slovenia", "Hungary", "Serbia", "Bosnia and Herzegovina", "Montenegro"],
    maritimeStatus: "Adriatic Karst Coastline (1,244 islands)",
    fieldNotes: "Features a dramatic Dalmatian karst coastline formed of dissolved limestone. Famous for Plitvice Lakes cascading terraced pools and Venetian fortified ports."
  },
  "Czechia": {
    officialName: "Czech Republic (Česká republika)",
    region: "Europe",
    subregion: "Central Europe",
    population: 10800000,
    areaKm2: 78866,
    languages: ["Czech"],
    currency: "Czech Koruna (CZK, Kč)",
    neighbors: ["Germany", "Poland", "Slovakia", "Austria"],
    maritimeStatus: "Landlocked Bohemian Basin",
    fieldNotes: "Surrounded by low mountain ranges enclosing the fertile Bohemian and Moravian river basins. Has the highest beer consumption per capita in the world."
  },
  "Hungary": {
    officialName: "Hungary (Magyarország)",
    region: "Europe",
    subregion: "Central Europe",
    population: 9600000,
    areaKm2: 93028,
    languages: ["Hungarian"],
    currency: "Hungarian Forint (HUF, Ft)",
    neighbors: ["Austria", "Slovakia", "Ukraine", "Romania", "Serbia", "Croatia", "Slovenia"],
    maritimeStatus: "Landlocked Pannonian Basin",
    fieldNotes: "Occupies the flat plains of the Carpathian Basin bisected by the Danube River. Renowned for its rich subterranean thermal springs and Lake Balaton."
  },
  "Denmark": {
    officialName: "Kingdom of Denmark (Kongeriget Danmark)",
    region: "Europe",
    subregion: "Northern Europe",
    population: 5930000,
    areaKm2: 42933,
    languages: ["Danish"],
    currency: "Danish Krone (DKK, kr)",
    neighbors: ["Germany"],
    maritimeStatus: "Jutland Peninsula & Archipelago (443 islands)",
    fieldNotes: "Controls the Danish Straits linking the North Sea to the Baltic Sea. World pioneer in offshore wind turbine technology, generating over 50% of its electricity from wind."
  },
  "Finland": {
    officialName: "Republic of Finland (Suomen tasavalta)",
    region: "Europe",
    subregion: "Northern Europe",
    population: 5560000,
    areaKm2: 338424,
    languages: ["Finnish", "Swedish"],
    currency: "Euro (EUR, €)",
    neighbors: ["Sweden", "Norway", "Russia"],
    maritimeStatus: "Baltic Sea & Gulf of Bothnia Coastal",
    fieldNotes: "Known as the Land of a Thousand Lakes (contains 188,000 lakes). Over 75% forested, Finland consistently ranks as the happiest nation in the world."
  },
  "Jordan": {
    officialName: "Hashemite Kingdom of Jordan (Al-Mamlakah al-Urduniyah al-Hashimiyah)",
    region: "Asia",
    subregion: "Western Asia",
    population: 11300000,
    areaKm2: 89342,
    languages: ["Arabic"],
    currency: "Jordanian Dinar (JOD, د.ا)",
    neighbors: ["Israel", "Palestine", "Syria", "Iraq", "Saudi Arabia"],
    maritimeStatus: "Aqaba Gulf Red Sea Outlet (26 km coast)",
    fieldNotes: "Home to the rose-red rock-cut Nabataean city of Petra and the Dead Sea—the lowest land elevation on Earth at 430 meters below sea level."
  },
  "Nepal": {
    officialName: "Federal Democratic Republic of Nepal",
    region: "Asia",
    subregion: "Southern Asia",
    population: 30900000,
    areaKm2: 147516,
    languages: ["Nepali"],
    currency: "Nepalese Rupee (NPR, ₨)",
    neighbors: ["China", "India"],
    maritimeStatus: "Landlocked Himalayan Highland",
    fieldNotes: "Contains eight of the world's ten highest mountain peaks, including Mount Everest (Sagarmatha) at 8,848.86 meters. Features dramatic bioclimatic zones from tropical plains to arctic tundra."
  },
  "Madagascar": {
    officialName: "Republic of Madagascar (Repoblikan'i Madagasikara)",
    region: "Africa",
    subregion: "Eastern Africa",
    population: 30300000,
    areaKm2: 587041,
    languages: ["Malagasy", "French"],
    currency: "Malagasy Ariary (MGA, Ar)",
    neighbors: [],
    maritimeStatus: "World's 4th Largest Island (Indian Ocean)",
    fieldNotes: "Isolated from continental landmasses for roughly 88 million years, leading over 90% of its native flora and fauna—including lemurs and baobabs—to be found nowhere else."
  },
  "Cuba": {
    officialName: "Republic of Cuba (República de Cuba)",
    region: "Americas",
    subregion: "Caribbean",
    population: 11200000,
    areaKm2: 109884,
    languages: ["Spanish"],
    currency: "Cuban Peso (CUP, $)",
    neighbors: [],
    maritimeStatus: "Largest Caribbean Island State",
    fieldNotes: "Guards the maritime entrance to the Gulf of Mexico. Renowned for its rich musical heritage (Son cubano), vintage automobiles, and biodiverse coral reef systems."
  },
  "Philippines": {
    officialName: "Republic of the Philippines (Republika ng Pilipinas)",
    region: "Asia",
    subregion: "South-Eastern Asia",
    population: 117000000,
    areaKm2: 300000,
    languages: ["Filipino", "English"],
    currency: "Philippine Peso (PHP, ₱)",
    neighbors: [],
    maritimeStatus: "Archipelago of 7,641 Islands (Western Pacific)",
    fieldNotes: "Located along the Pacific Ring of Fire and Typhoon Belt. Contains the world's second-deepest oceanic trench (Philippine Trench) and immense marine coral biodiversity."
  },
  "Ukraine": {
    officialName: "Ukraine (Ukrayina)",
    region: "Europe",
    subregion: "Eastern Europe",
    population: 38000000,
    areaKm2: 603500,
    languages: ["Ukrainian"],
    currency: "Ukrainian Hryvnia (UAH, ₴)",
    neighbors: ["Russia", "Belarus", "Poland", "Slovakia", "Hungary", "Romania", "Moldova"],
    maritimeStatus: "Black Sea & Sea of Azov Littoral",
    fieldNotes: "The largest nation entirely within Europe. Renowned as the breadbasket of Europe due to its rich black chernozem soil, producing major global grain and sunflower oil harvests."
  },
  "Uruguay": {
    officialName: "Oriental Republic of Uruguay (República Oriental del Uruguay)",
    region: "Americas",
    subregion: "South America",
    population: 3420000,
    areaKm2: 176215,
    languages: ["Spanish"],
    currency: "Uruguayan Peso (UYU, $)",
    neighbors: ["Brazil", "Argentina"],
    maritimeStatus: "Río de la Plata & South Atlantic Coastal",
    fieldNotes: "Features rolling plains (pampas) ideal for cattle ranching. Generates over 98% of its electricity from renewable sources (wind, hydro, and solar)."
  },
  "Costa Rica": {
    officialName: "Republic of Costa Rica (República de Costa Rica)",
    region: "Americas",
    subregion: "Central America",
    population: 5200000,
    areaKm2: 51100,
    languages: ["Spanish"],
    currency: "Costa Rican Colón (CRC, ₡)",
    neighbors: ["Nicaragua", "Panama"],
    maritimeStatus: "Dual-Coast Central American Isthmus",
    fieldNotes: "Abolished its standing army in 1948. Houses roughly 5% of the planet's total biodiversity within its protected national parks and biological reserves."
  },
  "Mongolia": {
    officialName: "Mongolia (Mongol Uls)",
    region: "Asia",
    subregion: "Eastern Asia",
    population: 3450000,
    areaKm2: 1564116,
    languages: ["Mongolian"],
    currency: "Mongolian Tögrög (MNT, ₮)",
    neighbors: ["Russia", "China"],
    maritimeStatus: "Landlocked Steppe & Gobi Desert",
    fieldNotes: "The world's second-largest landlocked country and most sparsely populated sovereign state, with endless grassy steppes and nomadic pastoralist traditions."
  },
  "Sri Lanka": {
    officialName: "Democratic Socialist Republic of Sri Lanka",
    region: "Asia",
    subregion: "Southern Asia",
    population: 22200000,
    areaKm2: 65610,
    languages: ["Sinhala", "Tamil"],
    currency: "Sri Lankan Rupee (LKR, Rs)",
    neighbors: [],
    maritimeStatus: "Indian Ocean Island Nation (Tear of India)",
    fieldNotes: "Situated along vital Indian Ocean east-west shipping lanes. Celebrated for high-altitude Ceylon tea estates, cinnamon spice origin, and ancient hydraulic tanks."
  },
  "Georgia": {
    officialName: "Georgia (Sakartvelo)",
    region: "Asia",
    subregion: "Western Asia / Caucasus",
    population: 3700000,
    areaKm2: 69700,
    languages: ["Georgian"],
    currency: "Georgian Lari (GEL, ₾)",
    neighbors: ["Russia", "Turkey", "Armenia", "Azerbaijan"],
    maritimeStatus: "Black Sea Littoral",
    fieldNotes: "The recognized birthplace of viticulture, with 8,000 years of unbroken subterranean clay vessel (qvevri) winemaking traditions amid the Greater Caucasus ranges."
  },
  "Panama": {
    officialName: "Republic of Panama (República de Panamá)",
    region: "Americas",
    subregion: "Central America",
    population: 4400000,
    areaKm2: 75420,
    languages: ["Spanish"],
    currency: "Panamanian Balboa (PAB) / US Dollar (USD, $)",
    neighbors: ["Costa Rica", "Colombia"],
    maritimeStatus: "Interoceanic Continental Isthmus",
    fieldNotes: "Connects North and South America. Its 82-kilometer Panama Canal handles approximately 5% of global maritime commerce through gravity-fed freshwater lock systems."
  },
  "Romania": {
    officialName: "Romania",
    region: "Europe",
    subregion: "Eastern Europe",
    population: 19000000,
    areaKm2: 238397,
    languages: ["Romanian"],
    currency: "Romanian Leu (RON, lei)",
    neighbors: ["Ukraine", "Moldova", "Bulgaria", "Serbia", "Hungary"],
    maritimeStatus: "Black Sea & Danube Delta Coastal",
    fieldNotes: "Contains Europe's largest virgin forest ecosystems and brown bear population within the sweeping arc of the Carpathian Mountains."
  },
  "Serbia": {
    officialName: "Republic of Serbia (Republika Srbija)",
    region: "Europe",
    subregion: "Southern Europe",
    population: 6600000,
    areaKm2: 88361,
    languages: ["Serbian"],
    currency: "Serbian Dinar (RSD, дин.)",
    neighbors: ["Hungary", "Romania", "Bulgaria", "North Macedonia", "Kosovo", "Montenegro", "Bosnia and Herzegovina", "Croatia"],
    maritimeStatus: "Landlocked Danubian Crossroads",
    fieldNotes: "Located at the geopolitical crossroads of Central and Southeast Europe. The confluence of the Danube and Sava rivers anchors its historic capital Belgrade."
  },
  "Slovakia": {
    officialName: "Slovak Republic (Slovenská republika)",
    region: "Europe",
    subregion: "Central Europe",
    population: 5430000,
    areaKm2: 49035,
    languages: ["Slovak"],
    currency: "Euro (EUR, €)",
    neighbors: ["Czechia", "Poland", "Ukraine", "Hungary", "Austria"],
    maritimeStatus: "Landlocked Tatra Mountain Realm",
    fieldNotes: "Features the dramatic High Tatras alpine peaks and hundreds of karst caves. The world's largest producer of automobiles per capita."
  },
  "Slovenia": {
    officialName: "Republic of Slovenia (Republika Slovenija)",
    region: "Europe",
    subregion: "Central Europe",
    population: 2110000,
    areaKm2: 20273,
    languages: ["Slovene"],
    currency: "Euro (EUR, €)",
    neighbors: ["Italy", "Austria", "Hungary", "Croatia"],
    maritimeStatus: "Adriatic Coastal Pocket (46 km coastline)",
    fieldNotes: "The intersection of the Alps, the Mediterranean, and the Pannonian Plain. Over 60% forested with world-famous underground karst chambers like Postojna."
  },
  "Bulgaria": {
    officialName: "Republic of Bulgaria (Republika Balgariya)",
    region: "Europe",
    subregion: "Southeast Europe",
    population: 6450000,
    areaKm2: 110879,
    languages: ["Bulgarian"],
    currency: "Bulgarian Lev (BGN, лв)",
    neighbors: ["Romania", "Serbia", "North Macedonia", "Greece", "Turkey"],
    maritimeStatus: "Black Sea Coastal",
    fieldNotes: "The historic cradle of the Cyrillic alphabet. Famous for the Valley of Roses, supplying the majority of the world's luxury damask rose attar oil."
  },
  "Estonia": {
    officialName: "Republic of Estonia (Eesti Vabariik)",
    region: "Europe",
    subregion: "Northern Europe",
    population: 1360000,
    areaKm2: 45227,
    languages: ["Estonian"],
    currency: "Euro (EUR, €)",
    neighbors: ["Latvia", "Russia"],
    maritimeStatus: "Baltic Sea & Gulf of Finland Coastal (2,222 islands)",
    fieldNotes: "The most digitally advanced society in the world, with 99% of public government services accessible online 24/7. Nearly half its territory is covered by boreal forests."
  },
  "Latvia": {
    officialName: "Republic of Latvia (Latvijas Republika)",
    region: "Europe",
    subregion: "Northern Europe",
    population: 1880000,
    areaKm2: 64589,
    languages: ["Latvian"],
    currency: "Euro (EUR, €)",
    neighbors: ["Estonia", "Lithuania", "Russia", "Belarus"],
    maritimeStatus: "Baltic Sea & Gulf of Riga Littoral",
    fieldNotes: "Features 500 kilometers of white sand Baltic coastline and extensive peat bogs. Its capital Riga boasts Europe's highest concentration of Art Nouveau architecture."
  },
  "Lithuania": {
    officialName: "Republic of Lithuania (Lietuvos Respublika)",
    region: "Europe",
    subregion: "Northern Europe",
    population: 2860000,
    areaKm2: 65300,
    languages: ["Lithuanian"],
    currency: "Euro (EUR, €)",
    neighbors: ["Latvia", "Belarus", "Poland", "Russia (Kaliningrad)"],
    maritimeStatus: "Baltic Coastal & Curonian Lagoon",
    fieldNotes: "Home to the Curonian Spit sand dunes and the historic Grand Duchy legacy. Its language is the oldest surviving Indo-European tongue retaining ancient grammatical archaisms."
  },
  "Kazakhstan": {
    officialName: "Republic of Kazakhstan (Qazaqstan Respýblıkasy)",
    region: "Asia",
    subregion: "Central Asia",
    population: 20000000,
    areaKm2: 2724900,
    languages: ["Kazakh", "Russian"],
    currency: "Kazakhstani Tenge (KZT, ₸)",
    neighbors: ["Russia", "China", "Kyrgyzstan", "Uzbekistan", "Turkmenistan"],
    maritimeStatus: "World's Largest Landlocked Nation / Caspian Littoral",
    fieldNotes: "Spans from the Caspian Sea to the Altai Mountains. Houses the Baikonur Cosmodrome—the world's first and largest operational space launch facility."
  },
  "Uzbekistan": {
    officialName: "Republic of Uzbekistan (Oʻzbekiston Respublikasi)",
    region: "Asia",
    subregion: "Central Asia",
    population: 36000000,
    areaKm2: 448978,
    languages: ["Uzbek"],
    currency: "Uzbekistani Soʻm (UZS, so'm)",
    neighbors: ["Kazakhstan", "Kyrgyzstan", "Tajikistan", "Afghanistan", "Turkmenistan"],
    maritimeStatus: "Doubly Landlocked Sovereign State",
    fieldNotes: "One of only two doubly-landlocked countries globally (along with Liechtenstein). Preserves the legendary Silk Road turquoise-domed cities of Samarkand and Bukhara."
  },
  "Pakistan": {
    officialName: "Islamic Republic of Pakistan",
    region: "Asia",
    subregion: "Southern Asia",
    population: 241500000,
    areaKm2: 881912,
    languages: ["Urdu", "English"],
    currency: "Pakistani Rupee (PKR, ₨)",
    neighbors: ["Iran", "Afghanistan", "China", "India"],
    maritimeStatus: "Arabian Sea Coastal Littoral",
    fieldNotes: "Traversed by the Indus River system from the Karakoram mountain crest down to the Arabian Sea port of Karachi. Home to ancient Indus Valley sites such as Mohenjo-daro."
  },
  "Bangladesh": {
    officialName: "People's Republic of Bangladesh (Gônoprojatontri Bangladesh)",
    region: "Asia",
    subregion: "Southern Asia",
    population: 171200000,
    areaKm2: 147570,
    languages: ["Bengali"],
    currency: "Bangladeshi Taka (BDT, ৳)",
    neighbors: ["India", "Myanmar"],
    maritimeStatus: "Bay of Bengal Coastal Delta",
    fieldNotes: "Forms the largest river delta in the world (Ganges-Brahmaputra-Meghna). Houses the Sundarbans mangrove forest, the world's largest contiguous mangrove habitat."
  },
  "Tanzania": {
    officialName: "United Republic of Tanzania (Jamhuri ya Muungano wa Tanzania)",
    region: "Africa",
    subregion: "Eastern Africa",
    population: 65500000,
    areaKm2: 947303,
    languages: ["Swahili", "English"],
    currency: "Tanzanian Shilling (TZS, TSh)",
    neighbors: ["Kenya", "Uganda", "Rwanda", "Burundi", "DR Congo", "Zambia", "Malawi", "Mozambique"],
    maritimeStatus: "Indian Ocean Littoral & Zanzibar Archipelago",
    fieldNotes: "Contains Africa's highest peak (Mount Kilimanjaro at 5,895 m), its lowest point (Lake Tanganyika), and the world-famous Serengeti wildlife migration corridor."
  },
  "Cambodia": {
    officialName: "Kingdom of Cambodia (Preăhréachéanachâkr Kâmpŭchéa)",
    region: "Asia",
    subregion: "South-Eastern Asia",
    population: 16900000,
    areaKm2: 181035,
    languages: ["Khmer"],
    currency: "Cambodian Riel (KHR, ៛) / US Dollar",
    neighbors: ["Thailand", "Laos", "Vietnam"],
    maritimeStatus: "Gulf of Thailand Coastal",
    fieldNotes: "Centered around the fertile Tonle Sap freshwater lake basin, which expands dramatically during seasonal monsoons. Home to the Angkor Wat temple complex."
  },
  "Ethiopia": {
    officialName: "Federal Democratic Republic of Ethiopia (Ityop'iya)",
    region: "Africa",
    subregion: "Eastern Africa",
    population: 126500000,
    areaKm2: 1104300,
    languages: ["Amharic", "Oromo", "Somali", "Tigrinya"],
    currency: "Ethiopian Birr (ETB, Br)",
    neighbors: ["Eritrea", "Djibouti", "Somalia", "Kenya", "South Sudan", "Sudan"],
    maritimeStatus: "Landlocked Horn of Africa Highland",
    fieldNotes: "One of the oldest sovereign nations on Earth and the only African nation to defeat European colonization attempts. The evolutionary cradle of Arabica coffee."
  },
  "Bolivia": {
    officialName: "Plurinational State of Bolivia (Estado Plurinacional de Bolivia)",
    region: "Americas",
    subregion: "South America",
    population: 12200000,
    areaKm2: 1098581,
    languages: ["Spanish", "Quechua", "Aymara", "Guaraní"],
    currency: "Bolivian Boliviano (BOB, Bs.)",
    neighbors: ["Brazil", "Paraguay", "Argentina", "Chile", "Peru"],
    maritimeStatus: "Landlocked Andean Highland & Amazon Basin",
    fieldNotes: "Holds the world's largest salt flat (Salar de Uyuni) containing massive lithium reserves. Its administrative seat La Paz sits at 3,640 meters altitude."
  },
  "Ghana": {
    officialName: "Republic of Ghana",
    region: "Africa",
    subregion: "Western Africa",
    population: 34100000,
    areaKm2: 238535,
    languages: ["English"],
    currency: "Ghanaian Cedi (GHS, GH₵)",
    neighbors: ["Côte d'Ivoire", "Burkina Faso", "Togo"],
    maritimeStatus: "Gulf of Guinea Atlantic Coastal",
    fieldNotes: "The first sub-Saharan African nation to gain independence from colonial rule (1957). Contains Lake Volta, the world's largest artificial reservoir by surface area."
  }
};

// Helper for generating complete fallback records for any remaining countries
const REGION_LOOKUP = {
  // We'll populate dynamically or load auxiliary data
};

// Ensure all 195 countries get full dossier
console.log(`Auditing dossier data for all ${countries.length} countries...`);

// Load remaining countries defaults with accurate UN statistics
import { ALL_DOSSIER_RECORDS } from './dossierDataAll.js';

let enrichedCount = 0;
for (const country of countries) {
  const dossier = DOSSIER_DATA[country.name] || ALL_DOSSIER_RECORDS[country.name];
  if (!dossier) {
    console.error(`Missing dossier record for: ${country.name}`);
    process.exit(1);
  }
  
  country.officialName = dossier.officialName;
  country.region = dossier.region;
  country.subregion = dossier.subregion;
  country.population = dossier.population;
  country.areaKm2 = dossier.areaKm2;
  country.languages = dossier.languages;
  country.currency = dossier.currency;
  country.neighbors = dossier.neighbors || [];
  country.maritimeStatus = dossier.maritimeStatus;
  country.fieldNotes = dossier.fieldNotes;
  
  enrichedCount++;
}

console.log(`Enriched ${enrichedCount} countries with official dossier profile.`);

// Write back to countries.json and countries.js
fs.writeFileSync(jsonPath, JSON.stringify(countries, null, 2), 'utf8');
const jsOutput = `export const COUNTRIES_DB = ${JSON.stringify(countries, null, 2)};\n`;
fs.writeFileSync(jsPath, jsOutput, 'utf8');

console.log('Successfully wrote updated countries.json and countries.js');
