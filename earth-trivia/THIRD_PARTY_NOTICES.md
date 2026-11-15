# Third-Party Notices & Licenses

GeoTrivia: Earth Explorer bundles or references several open-source libraries, fonts, and cartographic datasets. This document details the respective copyright notices and licenses for each component.

---

## 1. Production Dependencies

### Three.js (`three`)
- **Version**: ^0.182.0
- **License**: MIT
- **Copyright**: Copyright © 2010-2025 three.js authors
- **URL**: https://github.com/mrdoob/three.js

```text
The MIT License

Copyright © 2010-2025 three.js authors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```

---

### TopoJSON Client (`topojson-client`)
- **Version**: ^3.1.0
- **License**: ISC
- **Copyright**: Copyright 2012-2019 Michael Bostock
- **URL**: https://github.com/topojson/topojson-client

```text
Copyright 2012-2019 Michael Bostock

Permission to use, copy, modify, and/or distribute this software for any purpose
with or without fee is hereby granted, provided that the above copyright notice
and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND
FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS
OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER
TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF
THIS SOFTWARE.
```

---

### Canvas Confetti (`canvas-confetti`)
- **Version**: ^1.9.4
- **License**: ISC
- **Copyright**: Copyright (c) 2020 Kiril Vatev
- **URL**: https://github.com/catdad/canvas-confetti

```text
ISC License

Copyright (c) 2020, Kiril Vatev

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
```

---

## 2. Bundled Cartographic Data

### Natural Earth 50m Cultural Vectors (`world-atlas`)
- **Source Package**: `world-atlas` (^2.0.2)
- **Upstream Project**: Natural Earth
- **License**: Public Domain (Natural Earth) / ISC (`world-atlas`)
- **Copyright**: Copyright 2013-2019 Michael Bostock (`world-atlas`); Natural Earth public domain dedication
- **URL**: https://www.naturalearthdata.com / https://github.com/topojson/world-atlas

```text
Natural Earth is in the public domain. All versions of Natural Earth may be used in
any manner, including for commercial purposes, without payment or permission.

world-atlas package license:
Copyright 2013-2019 Michael Bostock

Permission to use, copy, modify, and/or distribute this software for any purpose
with or without fee is hereby granted, provided that the above copyright notice
and this permission notice appear in all copies.
```

---

### Survey of India Sovereign Boundary Overlay (`data/soi-boundaries.js`)
- **Source**: Survey of India official boundary dataset, compiled via DataMeet open spatial repository
- **License**: UNVERIFIED
- **Note**: The official boundary segments of Jammu & Kashmir and Ladakh are spliced into the base Natural Earth polygon for India (`id: 356`) to reflect official Survey of India boundary cartography. While DataMeet projects are released under open database licenses (e.g., Open Data Commons / Creative Commons / NDSAP), the specific upstream statutory copyright and reproduction terms of the official Survey of India cartographic data cannot be verified offline and are designated as **UNVERIFIED**.

---

### Microstates Dataset (`data/tiny-countries.js`)
- **License**: MIT
- **Copyright**: Copyright (c) 2026 GeoTrivia contributors
- **Note**: Hand-curated coordinates and radial bounds for 31 microstates and island nations.

---

## 3. Bundled Typography

### Fraunces Variable Font (`vendor/@fontsource-variable/fraunces/`)
- **License**: SIL Open Font License, Version 1.1 (OFL-1.1)
- **Copyright**: Copyright 2020 The Fraunces Project Authors (https://github.com/undercasetype/Fraunces)
- **URL**: https://fonts.google.com/specimen/Fraunces

```text
SIL OPEN FONT LICENSE Version 1.1 - 26 February 2007

Permission is hereby granted, free of charge, to any person obtaining a copy
of the Font Software, to use, study, copy, merge, embed, modify, redistribute,
and sell modified and unmodified copies of the Font Software, subject to the
conditions stated in the SIL Open Font License, Version 1.1.
```

---

### DM Sans Variable Font (`vendor/@fontsource-variable/dm-sans/`)
- **License**: SIL Open Font License, Version 1.1 (OFL-1.1)
- **Copyright**: Copyright 2019 The DM Sans Project Authors (https://github.com/googlefonts/dm-fonts)
- **URL**: https://fonts.google.com/specimen/DM+Sans

```text
SIL OPEN FONT LICENSE Version 1.1 - 26 February 2007

Permission is hereby granted, free of charge, to any person obtaining a copy
of the Font Software, to use, study, copy, merge, embed, modify, redistribute,
and sell modified and unmodified copies of the Font Software, subject to the
conditions stated in the SIL Open Font License, Version 1.1.
```

---

## 4. Educational & Encyclopedic Clue Content

### Wikipedia & Wikimedia Documentation
- **Source**: English Wikipedia articles referenced in `data/clues.json`
- **License**: Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)
- **Copyright**: Wikimedia Foundation and Wikipedia contributors
- **URL**: https://en.wikipedia.org / https://creativecommons.org/licenses/by-sa/4.0/
