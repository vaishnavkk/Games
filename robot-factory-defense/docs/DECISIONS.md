# Robot Factory Defense — Architecture & Design Decisions Log

This log records major architectural decisions, threshold updates, and cross-worker agreements.

- Phase 0: Initial stack, frozen contract, data schemas, 16x9 grid (28 buildable cells, 39 path cells, 4 turns).
- Phase 0.5: Boss stats (IronSentry 1200 HP / 8 arm, MegaMixer 3500 HP / 10 arm), leak damage (Glitchbot 1, RustWalker 1, SparkDrone 1, CrusherTank 3, IronSentry 5, MegaMixer 10), armour damage rule max(1, dmg - armour), circuit economy (Fabricator 10s, 75 scrap, Workshop 220 + unlocks 60), sell refund floor(70% actually paid), stricter testplan gates.
