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

## Clever-Child Ambiguity Check
- garden-01: Child argues ants/bees are "bugs", but all insects strictly have 6 legs whereas spiders have 8 legs, so only spider is not an insect.
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
- body-05: Child argues toddlers and children are synonymous, but human development orders chronologically infant to child to grown adult.
- body-06: Child argues stomach acid chews food, but mechanical chewing with teeth precedes swallowing down the throat into stomach.
