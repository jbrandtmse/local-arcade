# Brownfield — pre-existing assets

Assets that exist outside this repo before the Arcade Core does, and their standing contracts.

## `C:/git/moonpatrol` — Moon Patrol '82 clone

- **Status:** complete; vanilla JS, zero deps; already built by models.
- **Role:** first Live Machine (M0) — the one-minute walk is built around it (sounds from the back wall per the floor plan).
- **Contract:** vendored into `games/moon-patrol/`, wrapped to the Game-build contract for M0 (provisional); **reimplemented to the Game-build contract within v1** (owner decision 2026-11-19, scope clarified 2026-11-20) once the Game Factory establishes it, so the foundation is uniform — the wrap is temporary, not the resting state. Wrap-vs-rewrite is a seam decision; its `input.js` layer is thrown away at the seam — the game reads only declared control slots.

## `C:/git/pinball` — ~15 LLM-built pinball tables

- **Status:** one shared `prompt.md`, ~15 different local LLMs, one folder per model; **most tables work today**. Named set in `cabinet-inventory.md`.
- **Role:** basis of the Hall of Models (M3 presentation row, nameplates per model; M6 opens the path to playable — at least one table, per CAP-17).
- **Contract:** register as `presentationOnly` wrapper machines **with liveness hooks** — the contract must be wrappable around heterogeneous existing assets, not only baked into new games (ARCHITECTURE-SPINE AD-2/AD-8); a non-ticking presentation table is a Dead Machine by law (`game-factory.md §The verification gate`). All in-scope tables are vendored into `games/<game-id>/` (AD-13) with per-table Manifest attribution before the M3 audit; the roster is a ledger fact — acceptance = every Hall-of-Models row in `arcade-ledger.json` has a vendored sim half passing L1 liveness.

## `C:/git/dragonwar` — DragonWar pinball engine

- **Status:** open-source **GPL** pinball simulation; **in progress, not complete** (owner, 2026-11-19).
- **Role:** one candidate among several for the M6 pinball-engine decision (OQ-4, deferred), which is carried by its own BMad story. That story settles the OQ-4 decision — packaging form, GPL obligations in a distributed sealed bundle, and cross-browser physics determinism; the decision's full scope lives in OQ-4 (SPEC §Open Questions), not here.

## Registration-history note

`idea.md` asked for new games to appear "automatically by configuring like a yaml or json file." That mechanism is realized (and refined) as: JSON `manifest.json` per game + append-only `arcade-ledger.json` + the Registration skill; placement is the Layout System's back→front function (CAP-10). No config hand-editing of the room itself.
