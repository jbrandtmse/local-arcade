# Game Factory — production mechanism

How new Games enter the arcade. CI philosophy, decided 2026-11-19: **local LLMs build, CI verifies, the human judges feel.** CI is deterministic scripts with zero LLM tokens — cheap to rerun, which is what makes rebuilding existing assets to the contract worth it.

## The pipeline — one Game = one BMad epic

1. **Specify** — owner taste picks what the arcade needs next (pool: `cabinet-inventory.md`).
2. **Research** — how the real game played; what makes it faithful.
3. **Design** — Cabinet type, attract mode, Manifest fields, auto-play hook.
4. **Implement** — build with local LLMs via BMad (epic → stories) against the acceptance laws.
5. **Register** — the Registration skill commits the Manifest; the Layout System places it. Growth happens.

Pacing: local-LLM tokens and owner time are the only budget; no external deadlines. The wall is never "done."

## Five purpose-built skills (built as part of M2's first pipeline run)

Thin orchestrators — all mechanics they run live in `ci/` and `tools/`; skills contain no gate logic.

- **pipeline-init** — starts a Game's BMad cycle: research, spec, per-game PRD material, epics; stamps the Game-build contract + gate criteria into the epic's acceptance from day one.
- **metadata** — collects the Manifest's metadata: name, originalYear, model attribution, Cabinet type, seed.
- **contract-test** — generates and runs a Game's L0–L1 verification suite from the contract.
- **health-check** — runs the L2 room audit against the whole room; builds the numeric thresholds (framerate floor, reaction window, audio budgets, wake-set numbers) — M2 is incomplete without them.
- **registration** — commits the Manifest end-to-end; refuses to run on a red gate.

## The verification gate — three deterministic CI layers + the human walk

Design home at contract altitude: this file (PRD addendum G is traceability only; enforcement detail: ARCHITECTURE-SPINE AD-8).

- **L0 Contract conformance** — verbatim hooks + import bans + Manifest schema. Non-conforming Games cannot be placed. Uniform hooks are what make every later layer mechanical rather than bespoke — this is what rebuilding Moon Patrol buys.
- **L1 Headless** (no browser, no tokens, seconds) — attract liveness (`stateHash` advances each cycle = no-dead-machines as a unit test); seeded `autoplay(seed)` reaches a real end state via canonical `gameEnded`/`roundBreak` (makes "busy is a texture, not a lock" provable); determinism (same seed → same `stateHash`); sealed build (static scan + no-network sandbox; the same-origin report POST is the one named exception).
- **L2 Room audit** (browser automation, whole room, so new work surfaces old regressions) — dead-machine detector; screenshot-test proxy + framerate floor; Patron causality probe (injected event → reaction within N frames); character lint (no attribution/UI markers off-whitelist); aisle-nav lint; flashes-rate probe (≤3/sec per lit surface and in aggregate across simultaneously visible surfaces).
- **L3 Human walk** — final, irreducible: the builder walks the build; SM-1 (both variants) and SM-4 live here.

**Cadence:** per story L0–L1 for the touched game; pre-Registration L0–L2 against the current room; scheduled full-room regression.

**Rebuild implication (accepted):** Moon Patrol and the Hall of Models presentation tables must satisfy contract liveness hooks — a presentation table that doesn't tick is a Dead Machine by law. Real M3-adjacent work, not a freebie.

**M3 batching exception (`presentationOnly`):** the Hall of Models wrapper tables are batched as one M3 epic — shared wrapper harness, per-table Manifests. The one-Game-one-epic law applies to Games with authored gameplay; M3 acceptance is "all vendored tables pass L1 liveness + the L2 audit as one batch."

## The contract, in one box

Hooks verbatim: `attract()`, `autoplay(seed)`, `events()`, `stateHash()` (wrapper-computed), driven by `tick(dt, input)` + `snapshot()`. Two-part plugin: pure deterministic sim half + presentation adapter. `presentationOnly` Manifests may omit `autoplay()`, but their sim half must still be the real per-tick model of everything the presentation shows (AD-8). Schema-valid Manifest written by the skill. Binding builder rules — rng discipline, control slots, snapshot rules, L0 pre-flight checklist — live in `docs/game-authoring.md` (adopted companion).
