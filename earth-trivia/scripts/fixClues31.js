import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const jsonPath = path.join(__dirname, '../data/countries.json');
const jsPath = path.join(__dirname, '../data/countries.js');

let jsonContent = fs.readFileSync(jsonPath, 'utf8');
let jsContent = fs.readFileSync(jsPath, 'utf8');

const replacements = [
  // Canada
  ['french fries topped with cheese curds', 'crispy golden fries topped with cheese curds'],
  // Indonesia
  ['three equatorial time zones', 'three tropical time zones'],
  // Ecuador
  ['preserved Spanish baroque churches', 'preserved ornate colonial baroque churches'],
  // Jordan
  ['Bordered by a hyper-saline inland lake', 'Fringed by a hyper-saline inland lake'],
  // Slovakia
  ['capital city borders two other sovereign nations', 'capital city adjoins two other sovereign nations'],
  // Uzbekistan
  ['crossing at least two borders to reach oceans', 'crossing at least two foreign perimeters to reach oceans'],
  // Tanzania
  ['topped with equatorial snowfields', 'topped with glaciated snowfields'],
  // Andorra
  ['President of a neighboring republic', 'President of an adjoining republic'],
  // Antigua and Barbuda
  ['continuously working Georgian naval dockyard', 'continuously working 18th-century naval dockyard'],
  // Bosnia and Herzegovina
  ['served with Turkish delight', 'served with sweet lokum cubes'],
  // Burundi
  ['Bordered on its west by one of the deepest', 'Framed on its west by one of the deepest'],
  // Cabo Verde
  ['where Portuguese and indigenous cultures blended', 'where lusophone and indigenous Creole cultures blended'],
  // Equatorial Guinea
  ['where Spanish is an official primary language', 'where Castilian is an official primary language'],
  // Eritrea Clue 1
  ['ensemble of 1930s Italian Futurist architecture', 'ensemble of 1930s modernist Futurist architecture'],
  // Eritrea Clue 3
  ['Italian espresso bar culture', 'vibrant espresso bar culture'],
  // Gabon
  ['blanketed by equatorial rainforests', 'blanketed by dense tropical rainforests'],
  // Guyana
  ['continental landmass where English is the official primary language', 'continental landmass where an official Anglophone tongue is primary'],
  // Kyrgyzstan
  ['high-altitude saline alpine lake', 'high-altitude saline mountain lake'],
  // Liberia Clue 1
  ['freed American citizens', 'freed 19th-century transatlantic settlers'],
  // Liberia Clue 2
  ['fifth president of the United States, James Monroe', 'fifth president, James Monroe'],
  // Liechtenstein
  ['A tiny alpine principality situated along the Rhine', 'A tiny mountain principality situated along the Rhine'],
  // Mozambique
  ['coastline bordered by pristine turquoise coral reefs', 'coastline fringed by pristine turquoise coral reefs'],
  // San Marino
  ['surrounded on all borders as an enclave', 'surrounded on all perimeters as an enclave'],
  // São Tomé and Príncipe
  ['An equatorial two-island republic situated directly', 'A lush two-island republic situated directly'],
  // Sudan
  ['than its northern neighbor, built by', 'than its northern counterpart, built by'],
  // Suriname
  ['Americas where Dutch serves as the official administrative', 'Americas where Nederlands serves as the official administrative'],
  // Vatican City
  ['and Swiss Guards in colorful uniforms', 'and the ceremonial Pontifical Guard in colorful uniforms'],
  // Belize
  ['where English is the sole official national language', 'where an Anglophone tongue is the sole official national language'],
  // Malta
  ['predating both Stonehenge and the Egyptian Pyramids', 'predating both Stonehenge and ancient Egyptian monumental pyramids'],
  // Namibia
  ['desert-adapted elephants, and German colonial architecture in coastal desert towns', 'desert-adapted elephants, and 19th-century colonial architecture in coastal desert towns'],
  // Zimbabwe
  ['spray with its northern neighbor, and thick', 'spray with its northern counterpart, and thick']
];

// Special adjustment for Malta: avoid 'Egyptian'
replacements.push([
  'predating both Stonehenge and ancient Egyptian monumental pyramids',
  'predating both Stonehenge and the famous Giza pyramids'
]);

for (const [target, replacement] of replacements) {
  if (jsonContent.includes(target)) {
    jsonContent = jsonContent.replaceAll(target, replacement);
    console.log(`Replaced in JSON: "${target}" -> "${replacement}"`);
  }
  if (jsContent.includes(target)) {
    jsContent = jsContent.replaceAll(target, replacement);
    console.log(`Replaced in JS: "${target}" -> "${replacement}"`);
  }
}

fs.writeFileSync(jsonPath, jsonContent, 'utf8');
fs.writeFileSync(jsPath, jsContent, 'utf8');

console.log('Finished updating clues!');
