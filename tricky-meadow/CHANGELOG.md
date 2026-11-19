## [0.3.1] - 2026-11-19
### Added
- 6 automated puzzle validation checks in `scripts/check-puzzles.js` with planted defect tests:
  - Claim coverage check requiring >=3 content stems in support sentences (`checkClaimCoverage`)
  - Strict CLDR icon matching against Unicode CLDR keyword database (`checkStrictCldrIcons`)
  - Reading level check enforcing Flesch-Kincaid grade level <= 4.5 and top-5000 common words vocabulary (`checkReadingLevelV031`)
  - 72 globally unique puzzle concept slugs (`checkUniqueConcepts`)
  - Kid-friendly sentiment check disallowing scary/negative words (`checkNoScaryWords`)
  - Sequence order verification in support text for order puzzles (`checkSequenceOrder`)
- Handcrafted custom SVG for Jupiter (`jupiter.svg`) featuring the Great Red Spot storm, maintaining custom SVGs at 3 (well under the 5 limit).

### Changed
- Patched 22 target puzzles (`sky-12`, `body-09`, `body-10`, `body-15`, `body-24`, `garden-19..24`, `sky-19..24`, `body-19..23`) with verified institutional sources, plain English FK <= 4.5, and single-sentence evidence matches.
- Clarified body-22 taste and smell interaction (olfactory sense works with tongue tastes to create rich meal flavor).
- Added 22 clever-child ambiguity check entries in `DECISIONS.md`.

## [0.3.0] - 2026-11-18
### Added
- 18 new verified institutional science puzzles (garden 19-24, sky 19-24, body 19-24), expanding content from 54 to 72 puzzles (24 per level).
- Custom vector artwork: handcrafted inner-ear.svg depicting the cochlea and semicircular canals for body-09.
- 3 automated puzzle validation checks in scripts/check-puzzles.js with planted defect coverage:
  - Unique emojis per puzzle (checkUniqueEmojis)
  - Label parity & prompt leak prevention (checkLabelParity)
  - Reviewed icons cap and body-part prohibition (checkReviewedIcons)

### Changed
- Replaced and refined 5 puzzles: sky-12 (day and night rotation), body-09 (inner ear balance), body-10 (muscles moving skeleton), body-12 (bare noun labels Lens/Pupil/Retina), and body-15 (red marrow making blood cells, yellow marrow storing fat).
- Updated sky-16 Mercury icon to match sky-05.
- Capped reviewed-icons.json to exactly 12 justified non-body entries.
- Automated self-play harness verified 648 sessions across 9 viewports with 7/7 selftest defects caught and 0 violations.

## [0.2.3] - 2026-11-18
### Added
- Render-time crypto-seeded item shuffle: pick and tapall randomized on puzzle start; order puzzles shuffled with never-identity guarantee.
- Unit tests (`test/shuffle.test.js`) verifying uniformity (3000 trials), order never-identity (1000 trials), attempt stability on wrong answers, and multi-start permutation variety.
- Naive player simulation in selfplay harness verifying <50% win rate on pick/tapall and 0% on order across 54 puzzles x 50 starts.
- Planted defect #7 in selfplay selftest catching un-shuffled state (7/7 defects caught).

### Fixed
- Fixed `body-10` swallowing and peristalsis digestion path (throat -> stomach -> intestines) backed by MedlinePlus anatomy video.
- Cleaned wording: `body-06` renamed item to "Stomach"; `body-15` prompt updated to "Tap the soft tissues inside your bones!"; `sky-16` fact trimmed to focus on Venus retrograde slow rotation.

## [0.2.2] - 2026-11-18
### Fixed
- Fixed 15 puzzle source evidence alignments with institutional HTML caches (0 FAIL).
- Replaced sky-18 with Moon gravity comparison (about one-sixth of Earth's gravity, NASA Space Place).
- Restructured body-08 to medical measurements group with vital signs vs height/weight distinction (MedlinePlus).
- Updated body-09 ear balance canals and body-12 inner eye structures (Retina, Pupil, Flexible lens).
- Removed oddOneOut from garden-12 by aligning distractors to reptiles group.
- Reverted 'moon' modifier in sequence checker and cleaned up allowed-terms list.

## [0.2.1] - 2026-11-18
### Fixed
- Fixed 13 puzzle contents, prompts, options, and single-sentence source evidence matches.
- Added reading level verification (Flesch-Kincaid grade <= 6.0, 4+ syllable word check with allowed-terms).
- Added distractor quality checking ensuring all wrong choices match the item group.
- Added level variety verification restricting max 2 puzzles per source page and unique topic tags.
- Expanded dynamic sprite to 102 Twemoji SVGs.

## [0.2.0] - 2026-11-18
### Added
- Expanded puzzle collection from 18 to 54 verified science trick-puzzles (18 per level across Garden & Animals, Sky & Space, Me & My Body).
- Data-driven level counts and progress tracking.
- Dynamic Twemoji SVG sprite generation with 98 verified icons.
- Single-sentence evidence verification across institutional sources (NASA Space Place, Smithsonian National Zoo, NIH/MedlinePlus, NPS, ASU Ask A Biologist).
- Multi-viewport QA self-play verification and accessible color contrast.
