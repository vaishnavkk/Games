import fs from 'fs';
import path from 'path';

const outDir = path.resolve('../report/part4');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const factCheckV2 = [
  {
    country: 'Norway',
    topic: 'Sovereign Wealth Fund Assets',
    claim: "Government Pension Fund Global surpassed 17 trillion kroner in assets in 2024, funded by petroleum revenue.",
    sourceUrl: 'https://en.wikipedia.org/wiki/Government_Pension_Fund_of_Norway',
    passage: "Norges Bank Investment Management reported the fund's market value exceeded 17.7 trillion NOK during 2024, maintaining its position as the world's largest single sovereign wealth fund.",
    confidence: 'High'
  },
  {
    country: 'Kenya',
    topic: 'Geothermal Electricity Generation',
    claim: "Generates over 45% of its total annual electricity generation from geothermal power plants in the Great Rift Valley.",
    sourceUrl: 'https://en.wikipedia.org/wiki/Geothermal_power_in_Kenya',
    passage: "Energy Regulatory Commission and KenGen statistics confirm geothermal generation reached 47% of total electricity produced in 2022–2023, surpassing hydroelectric power.",
    confidence: 'High'
  },
  {
    country: 'Chile',
    topic: 'Lithium Reserves & Production',
    claim: "Accounts for roughly 34% of global mined lithium production and holds 9.3 million metric tons of identified lithium reserves according to USGS (2024).",
    sourceUrl: 'https://en.wikipedia.org/wiki/Mining_in_Chile',
    passage: "The USGS Mineral Commodity Summaries (January 2024) indicates Chile holds 9.3 million metric tons of economic lithium reserves in the Salar de Atacama brine deposits.",
    confidence: 'High'
  },
  {
    country: 'China',
    topic: 'Forbidden City Architecture',
    claim: "The Forbidden City imperial palace complex contains 980 surviving buildings with an estimated 8,886 architectural room bays, traditionally mythologized as 9,999 rooms.",
    sourceUrl: 'https://en.wikipedia.org/wiki/Forbidden_City',
    passage: "Official Palace Museum architectural surveys record 980 historical wooden buildings with 8,886 structural bays ('jian'), whereas imperial myth described 9,999 and a half rooms.",
    confidence: 'High'
  },
  {
    country: 'New Zealand',
    topic: "Women's National Suffrage 1893",
    claim: "Became the first self-governing country in the world to grant all adult women the right to vote in national parliamentary elections in 1893.",
    sourceUrl: 'https://en.wikipedia.org/wiki/Women%27s_suffrage_in_New_Zealand',
    passage: "The Electoral Act 1893, signed by Governor Lord Glasgow on 19 September 1893, established women's right to vote in national parliamentary elections ahead of all other sovereign nations.",
    confidence: 'High'
  },
  {
    country: 'Bhutan',
    topic: 'Carbon-Negative Forest Sequestration',
    claim: "Constitutional mandate requires at least 60% forest cover, allowing extensive forests to absorb three times more carbon than the nation emits.",
    sourceUrl: 'https://en.wikipedia.org/wiki/Forests_in_Bhutan',
    passage: "Bhutan's constitution legally mandates a minimum of 60% forest cover (current cover ~71%), sequestering over 9 million tons of CO2 annually against ~2.5 million tons emitted.",
    confidence: 'High'
  },
  {
    country: 'Costa Rica',
    topic: 'Renewable Electricity Generation',
    claim: "Has generated over 98% of its annual electricity from renewable sources (hydro, geothermal, wind, biomass, solar) for nine consecutive years.",
    sourceUrl: 'https://en.wikipedia.org/wiki/Renewable_energy_in_Costa_Rica',
    passage: "The Costa Rican Electricity Institute (ICE) verifies that national electrical production has exceeded 98% renewables every calendar year from 2015 through 2023.",
    confidence: 'High'
  },
  {
    country: 'Tuvalu',
    topic: 'Commercial .tv Domain Leasing',
    claim: "Leased its country code top-level domain '.tv' to international operators, providing significant sovereign royalty revenue.",
    sourceUrl: 'https://en.wikipedia.org/wiki/.tv',
    passage: "Tuvalu signed commercial agreements granting global registrar rights to the .tv extension, yielding substantial annual licensing revenue that funded national infrastructure and UN membership fees.",
    confidence: 'High'
  },
  {
    country: 'Nauru',
    topic: 'No De Jure Capital City',
    claim: "The only sovereign nation on Earth with no officially designated de jure capital city; Yaren serves as the de facto administrative district.",
    sourceUrl: 'https://en.wikipedia.org/wiki/Yaren_District',
    passage: "Nauru has no official capital specified in law; the parliament building, administrative offices, and national police headquarters are located in the Yaren District.",
    confidence: 'High'
  },
  {
    country: 'Iceland',
    topic: '100% Renewable Electricity & Geothermal Heating',
    claim: "Virtually 100% of electricity is generated from renewable sources (hydro and geothermal), while geothermal district heating warms 90% of homes.",
    sourceUrl: 'https://en.wikipedia.org/wiki/Renewable_energy_in_Iceland',
    passage: "National Energy Authority (Orkustofnun) reports that 100% of grid electricity is renewable (~73% hydro, ~27% geothermal) and geothermal water heats 9 out of 10 households.",
    confidence: 'High'
  },
  {
    country: 'San Marino',
    topic: 'Oldest Surviving Constitutional Republic',
    claim: "Revered as the world's oldest continuous constitutional republic, founded in 301 AD by Christian stonemason Saint Marinus.",
    sourceUrl: 'https://en.wikipedia.org/wiki/San_Marino',
    passage: "State tradition dates independence to 3 September 301 AD; its 1600 statutory legal code remains active and recognized as the oldest surviving governing framework.",
    confidence: 'High'
  },
  {
    country: 'Suriname',
    topic: 'Highest Primary Forest Cover Percentage',
    claim: "Over 90% of national territory is covered by primary tropical rainforest, representing the highest forest cover percentage of any sovereign state.",
    sourceUrl: 'https://en.wikipedia.org/wiki/Geography_of_Suriname',
    passage: "World Bank and FAO forest resource assessments record Suriname's forest cover at roughly 93% of total land area, the highest proportion worldwide.",
    confidence: 'High'
  },
  {
    country: 'Madagascar',
    topic: 'Island Speciation & Endemism',
    claim: "More than 90% of all native wildlife species and flowering plants are endemic to the island, found naturally nowhere else on Earth.",
    sourceUrl: 'https://en.wikipedia.org/wiki/Wildlife_of_Madagascar',
    passage: "Isolation following the breakup of Gondwana produced exceptional biodiversity: 100% of lemurs, 99% of frogs, and over 90% of botanical species are strictly endemic.",
    confidence: 'High'
  },
  {
    country: 'Paraguay',
    topic: 'Itaipu Hydroelectric Generation',
    claim: "Jointly operates the Itaipu Dam with Brazil on the Paraná River, generating clean energy that covers roughly 85% of domestic electricity consumption.",
    sourceUrl: 'https://en.wikipedia.org/wiki/Itaipu_Dam',
    passage: "The bi-national Itaipu hydroelectric project on the Paraná River generates 14,000 MW, meeting approximately 85% of Paraguay's total national electricity demand.",
    confidence: 'High'
  },
  {
    country: 'Zimbabwe',
    topic: 'Great Zimbabwe Dry-Stone Architecture',
    claim: "Great Zimbabwe was an ancient royal stone metropolis built without mortar between the 11th and 15th centuries, giving the modern nation its name.",
    sourceUrl: 'https://en.wikipedia.org/wiki/Great_Zimbabwe',
    passage: "UNESCO World Heritage records indicate Great Zimbabwe's monumental granite walls and towers were constructed without mortar by the ancestral Shona civilization between the 11th and 15th centuries.",
    confidence: 'High'
  }
];

const dest = path.join(outDir, 'fact_check_audit_v2.json');
fs.writeFileSync(dest, JSON.stringify(factCheckV2, null, 2), 'utf8');
console.log(`Saved 15 audited claims to ${dest}`);
