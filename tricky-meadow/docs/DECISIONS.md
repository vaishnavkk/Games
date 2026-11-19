# Architecture & Design Decisions

1. Stage 3 Look: Cream paper (#fdfbf7) with warm brown ink (#2d2013) yielding 15.1:1 contrast ratio (exceeds WCAG AAA 7:1).
2. Stage 3 Aesthetic: Ghibli-inspired warm mood with organic irregular border radii and subtle SVG watercolor displacement filters.
3. Stage 3 Mascot: "Moss" leaf-sprite with 3 expressions (neutral, cheer, think) and speech bubble for hints.
4. Stage 3 Motion: Pure CSS ambient clouds, grass sway, firefly; full disable under prefers-reduced-motion with gentle background flash fallback.
5. Stage 4 Content: 18 verified trick-puzzles across 3 levels (NASA Space Place, Smithsonian, Britannica Kids) with single-sentence evidence matching.
6. Stage 4 Child Safety: Educational source URLs displayed as plain text only on Credits page, with no outbound links for kids.
7. Stage 5 Self-Play: Puppeteer automated self-play verifying 54 sessions across 3 viewports (390x844, 768x1024, 1440x900) in 36.5s.
8. Stage 5 Accessibility: Web Speech API synthesis read-aloud support, :focus-visible outlines, and semantic ARIA labeling.
9. Stage 6 Deployment: Root Pages serves unbundled redirect to /dist/ with un-ignored dist in root .gitignore and Arcade Hub card integration.
10. Task 1 Icons & Layout: UI aliases mapped directly to sprite symbol IDs; header grid minmax(0,1fr) auto minmax(0,1fr) balances controls; selfplay invariant verifies button pixel stddev > 3.0 and geometry.
11. Task 2 Content & Sources: Replaced bot-shielded sources with 100% fetchable government sources (NASA, NPS, NOAA, MedlinePlus) with 0 WARN / 0 FAIL.
12. Task 3 Fact Consistency: Dropped 2/2/2 rule for Me & My Body (now 3 pick, 1 tapall, 2 order); restored body-02 to pick largest organ (Outer Skin).
13. Task 1 Phone Layout: Single-row topbar 48px 1fr 48px, progress-row under header, 56px action bar fixed at bottom, icons <= 40px filter:none.
14. Task 3 Content: Custom painted SVG chrysalis in sprite, true-at-scale sky-06 distances with max 2 sources, teeth count order body-05.
15. Task 1 Level Icons: Level 2 emoji switched to planet (🪐) preserving stars for ratings; build fails if any level icon is missing from sprite.
16. Task 2 Contrast Invariant: Computed fg/bg with alpha compositing across all visible text; amber darkened to #8a4e00 (>=6.7:1), unlock hint darkened to #7c2d12 (8.9:1), locked button darkened to #544c42 (6.8:1); selftest 6/6 catches defect 6.
17. Task Content: Dynamic data-driven level counts; Batch 1 verified 12 puzzles across NASA, NPS, SI National Zoo, MedlinePlus.
18. Task Content: Batch 2 verified 12 puzzles (garden 11-14, sky 11-14, body 11-14) across Smithsonian, NASA Space Place, MedlinePlus, ASU Ask A Biologist.
19. Task Content: Batch 3 verified 12 puzzles reaching 54 total (18/level); 100% institutional evidence matches, 98-icon dynamic sprite.
20. Task Content Fixes: 13 institutional puzzle corrections, reading-level FK<=6 with allowed-terms, distractor groups, and variety checks.
21. Task Content & Checks: 0 FAIL sources across 54 puzzles; reverted 'moon' from MODIFIERS; removed oddOneOut from garden-12; updated sky-18 Moon gravity, body-08 vital signs, and body-09 balance.
22. Task Shuffle & Wording: Render-time crypto-seeded Fisher-Yates shuffle with order never-identity; naive-player harness test & selftest 7/7; body-10 stomach/intestine MedlinePlus alignment.

23. Task v0.3.0: 18 verified puzzles added reaching 72 total (24/level); 3 new checks (unique emojis, label parity, reviewed icons <= 12 with 0 body parts); fixed sky-12, body-09 (inner-ear SVG), body-10 (muscles), body-12 (bare nouns), body-15 (marrow); 100% institutional evidence matches.
24. Task v0.3.1: 6 new checks (claim coverage >=3 stems, strict CLDR icons, FK<=4.5 reading level with top-5000 common words, 72 unique concept slugs, no scary words, sequence order in support); 22 puzzles patched with 100% institutional evidence; custom jupiter SVG added (total 3 SVGs); body-22 clarifies that olfactory sense of smell works with tongue tastes to create rich meal flavor.
25. Task v0.3.2: 6 puzzle content patch (body-20, body-23, sky-20, body-24, garden-24, sky-12); dual institutional sources for body-20 (water) and sky-12 (Earth rotation); single-sentence claim matching with no unsupported numbers; 100% test, checks, and selfplay pass across 9 viewports.

## Clever-Child Ambiguity Check- garden-01: Child argues ants/bees are "bugs", but all insects strictly have 6 legs whereas spiders have 8 legs, so only spider is not an insect.
- garden-02: Child argues mushrooms grow in soil like plants, but fungi cannot photosynthesize or produce food from sunlight.
- garden-03: Child argues bears lay eggs like platypuses, but bears and foxes are placental mammals that give live birth, so only turtles and eagles lay eggs.
- garden-04: Child argues flying squirrels fly, but they only glide through the air while bats flap wings and power true flight.
- garden-05: Child argues caterpillars turn directly into butterflies, but insect metamorphosis strictly requires the pupal chrysalis stage.
- garden-06: Child argues flowers bloom before leaves, but roots, sprout, and stem development must precede floral flowering.
- sky-01: Child argues Mercury is closest to Sun so must be hottest, but Venus's thick greenhouse atmosphere traps higher surface heat.
- sky-02: Child argues the Sun is a fiery planet, but core nuclear fusion defines the Sun astrophysically as a star.
- sky-03: Child argues the glowing Moon creates light, but the Moon produces no light of its own and purely reflects sunlight.
- sky-04: Child argues only Saturn has rings because they are most visible, but Jupiter, Uranus, and Neptune also possess ring systems.
- sky-05: Child argues seasonal warmth puts Earth closer to Sun, but planetary orbital radii from Sun strictly order Mercury, Venus, Earth, Mars.
- sky-06: Child argues Sun is closer than night stars, but Moon is in Earth orbit (384,400 km), vastly closer than the Sun (150M km).
- body-01: Child argues bigger adults must have more bones, but human infants are born with ~300 bones that fuse into 206 adult bones.
- body-02: Child argues skin is just outer wrapping, but skin is anatomically the largest organ of the human body.
- body-03: Child argues heavy skeleton bones are hardest, but tooth enamel is 96% mineral crystal, physically harder than bone.
- body-04: Child argues knees feel touch, but the face houses the primary sensory organs for sight, smell, and taste.
- body-05: Child argues babies have teeth, but human infants are born toothless before developing 20 baby teeth then up to 32 adult teeth.
- body-06: Child argues stomach acid chews food, but mechanical chewing with teeth precedes swallowing down the throat into stomach.
- garden-19: Child argues flamingos are born bright pink, but young flamingos are grey-white and derive their pink pigmentation solely from carotenoid-rich shrimp food.
- garden-20: Child argues ostriches are birds so they must fly, but ostriches possess heavy bodies and flat breastbones lacking the keel needed to anchor flight muscles.
- garden-21: Child argues green leaves drink falling rain, but subterranean roots anchor the plant and draw water and soil nutrients upwards.
- garden-22: Child argues whales and dolphins are big fish, but they breathe air with lungs and nurse young with milk, defining them anatomically as marine mammals.
- garden-23: Child argues meerkats stand upright just to stretch, but standing tall on hind legs allows sentries to spot approaching aerial and ground danger from far away.
- garden-24: Child argues beavers build the roof first, but beaver pond lodges strictly require cutting wood, piling branches into deep water, and hollowing the nest.
- sky-12: Child argues the Sun circles around Earth every day, but Earth's axial rotation once every 24 hours creates the cycle of day and night.
- sky-19: Child argues clouds are fluffy balls of cotton or smoke, but clouds form entirely from condensed water vapor droplets and chilled ice crystals floating aloft.
- sky-20: Child argues the Moon has clouds and wind, but lunar gravity is too weak to retain a substantial atmosphere, leaving only a tenuous exosphere with no wind.
- sky-21: Child argues distant night stars might be closer than daytime, but the Sun is our local host star located 93 million miles away, thousands of times closer than Alpha Centauri.
- sky-22: Child argues shooting stars are actual falling stars, but they are tiny space debris and meteor dust particles compressing and glowing in Earth's upper atmosphere.
- sky-23: Child argues Saturn is largest because of its huge rings, but Jupiter contains more mass and physical planetary volume than all other planets combined.
- sky-24: Child argues rain falls before water evaporates, but atmospheric heating drives liquid evaporation before condensation creates clouds and rainfall.
- body-09: Child argues ears only hear sounds, but fluid and sensory hair cells in the semicircular canals of the inner ear regulate balance.
- body-10: Child argues bones move on their own, but skeletal muscles contract in pairs to pull bones and produce bodily motion.
- body-12: Child argues the pupil changes focus, but the flexible crystalline lens suspended behind the pupil alters shape to focus light on the retina.
- body-15: Child argues all bone parts are hard calcium, but internal red marrow produces blood cells while yellow marrow stores energy fat.
- body-19: Child argues white cells or lungs deliver oxygen directly, but red blood cells contain hemoglobin that binds and transports oxygen molecules across all body tissues.
- body-20: Child argues heavy solid bones make up most of body weight, but clear water constitutes more than 50% of total human body weight.
- body-21: Child argues hair or clothing is the primary protective shield, but the waterproof cutaneous skin barrier defends inner organs against microbes and harm.
- body-22: Child argues taste is solely tongue work, but olfactory receptors in the nose detect airborne food aromas that work together with tastebuds to create meal flavor.
- body-23: Child argues sleep shuts the brain off completely, but restful sleep restores energy while the active brain organizes memories and repairs tissues.
- body-24: Child argues sound hits the cochlea first, but acoustical waves travel into the ear canal, vibrate the eardrum, and finally enter the inner ear.
