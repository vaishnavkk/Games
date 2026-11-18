# Changelog

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
