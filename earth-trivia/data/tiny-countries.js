// Microstate hit detection buffers (reduced radii to eliminate overlap in Lesser Antilles & Pacific)
const TINY_COUNTRIES = [
  // European Microstates
  { id: "470", name: "Malta", centroid: [14.45, 35.90], hitRadius: 0.8 },
  { id: "492", name: "Monaco", centroid: [7.42, 43.74], hitRadius: 0.5 },
  { id: "674", name: "San Marino", centroid: [12.45, 43.94], hitRadius: 0.5 },
  { id: "336", name: "Vatican City", centroid: [12.45, 41.90], hitRadius: 0.4 },
  { id: "438", name: "Liechtenstein", centroid: [9.52, 47.16], hitRadius: 0.5 },
  { id: "020", name: "Andorra", centroid: [1.52, 42.51], hitRadius: 0.6 },

  // Asia / Middle East
  { id: "702", name: "Singapore", centroid: [103.82, 1.35], hitRadius: 0.6 },
  { id: "048", name: "Bahrain", centroid: [50.55, 26.07], hitRadius: 0.7 },
  { id: "462", name: "Maldives", centroid: [73.50, 4.17], hitRadius: 1.2 },

  // Pacific Microstates (reduced to prevent overlap)
  { id: "520", name: "Nauru", centroid: [166.93, -0.52], hitRadius: 0.9 },
  { id: "798", name: "Tuvalu", centroid: [177.65, -7.11], hitRadius: 1.0 },
  { id: "585", name: "Palau", centroid: [134.58, 7.51], hitRadius: 1.0 },
  { id: "584", name: "Marshall Islands", centroid: [171.18, 7.13], hitRadius: 1.2 },
  { id: "583", name: "Micronesia", centroid: [158.16, 6.92], hitRadius: 1.2 },
  { id: "296", name: "Kiribati", centroid: [172.98, 1.45], hitRadius: 1.2 },
  { id: "882", name: "Samoa", centroid: [-172.10, -13.76], hitRadius: 1.0 },
  { id: "776", name: "Tonga", centroid: [-175.20, -21.18], hitRadius: 1.0 },

  // Indian & Atlantic Oceans
  { id: "690", name: "Seychelles", centroid: [55.49, -4.68], hitRadius: 1.1 },
  { id: "480", name: "Mauritius", centroid: [57.55, -20.35], hitRadius: 1.0 },
  { id: "174", name: "Comoros", centroid: [43.33, -11.64], hitRadius: 1.0 },
  { id: "132", name: "Cabo Verde", centroid: [-23.51, 14.93], hitRadius: 1.1 },
  { id: "678", name: "São Tomé and Príncipe", centroid: [6.61, 0.19], hitRadius: 1.0 },

  // Lesser Antilles (reduced to 0.55° - 0.75° so neighboring island circles do not overlap)
  { id: "052", name: "Barbados", centroid: [-59.54, 13.19], hitRadius: 0.65 },
  { id: "662", name: "Saint Lucia", centroid: [-60.98, 13.91], hitRadius: 0.55 },
  { id: "670", name: "Saint Vincent and the Grenadines", centroid: [-61.29, 13.25], hitRadius: 0.55 },
  { id: "308", name: "Grenada", centroid: [-61.68, 12.12], hitRadius: 0.55 },
  { id: "028", name: "Antigua and Barbuda", centroid: [-61.80, 17.06], hitRadius: 0.65 },
  { id: "659", name: "Saint Kitts and Nevis", centroid: [-62.78, 17.36], hitRadius: 0.55 },
  { id: "212", name: "Dominica", centroid: [-61.37, 15.41], hitRadius: 0.55 },
  { id: "780", name: "Trinidad and Tobago", centroid: [-61.22, 10.69], hitRadius: 0.75 }
];

export { TINY_COUNTRIES };
