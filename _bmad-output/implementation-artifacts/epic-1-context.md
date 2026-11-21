# Epic 1 Context: Walk In — The First Living Machine (M0)

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

A visitor loads the page and is inside the Arcade Room in first-person control within a minute — no auth, no UI, no onboarding — seeing glowing cabinets whose empty wall slots read as roadmap, watching a Patron actually play Moon Patrol, sitting down, and playing the real game; their personal best survives the next visit. This epic lays the whole technical foundation: deterministic kernel, room geometry, the standard cabinet shell, the first vendored game, and Patron presence. The acceptance laws — no Dead Machines, fiction-pure room — bind from the first story even before their lints exist.

## Stories

- Story 1.1: Project bootstrap and the deterministic kernel core
- Story 1.2: First-person walk — look and move, no prompts
- Story 1.3: The Arcade Room — slots, pillars, zones, and the roadmap wall
- Story 1.4: The standard stand-up Cabinet — shell, marquee, live screen
- Story 1.5: Moon Patrol plays in place — vendored, wrapped, alive
- Story 1.6: One busy machine — a Patron actually plays
- Story 1.7: Fault containment — a broken game never kills the room
- Story 1.8: The room knows you without an account
- Story 1.9: The street-door beat — loading as fiction's first shot

## Requirements & Constraints

- Page-load to controllable first-person view ≤60s worst-case on a mid-range laptop — a guardrail ceiling, never displayed; the real time-to-playable budget is set and recorded from this epic's first measurement. No sign-in, cookie wall, or onboarding modal ever appears.
- Room: interior ~19m × 12.5m, front door bottom-center with a street side outside; Wall Slots pre-declared at 1.40m pitch in a `core/room/` slot config carrying a revision id; aisles never narrower than 1.20m; two occluder pillars breaking sightlines; fixed Zones — Pinball Corner back-left, Workshop back-right, Snack Bar front-right, Casual Alley mid-right kept clean. Empty slots read as roadmap in the same visual language as filled ones.
- No Dead Machines: any sampled frame shows every visible Cabinet active. A faulting game becomes a Faulted Machine kept performing via kernel fallback (marquee + screen motion driven by the kernel, no sim); the room never crashes.
- Visitors sit at a Cabinet, play the full game in place, and return to their standing position with room continuity restored. The Moon Patrol wrap is provisional — a contract reimplementation lands in Epic 3 with no visible change to the cabinet experience.
- A busy Cabinet runs real auto-play — no busy animation exists. Patron reactions (flinch/slam/jump) fire 1:1 with that game's sim events through an authored impulse mapping; the kernel Patron presenter animates figures, never a game's adapter. Waiting, taking over at a `gameEnded`/`roundBreak`, and walking away all work; a present visitor beats the queue head; busy is never a lock. Banter and Patron→Patron handoff are explicitly out of scope here.
- Scores persist between visits via an anonymous UUIDv4 in localStorage under `arcade.*` — no consent wall, no PII anywhere. Score screens show only Personal Bests plus Patron auto-play runs (Patron runs alone until a best exists); games never write tables.
- Marquees carry the game title only — never a model name, "AI-generated" badge, or tagline.
- Desktop only: pointer-lock mouse-look + WASD + a single E interact verb; evergreen Chrome and Edge are the CI-enforced browser matrix. No HUD, crosshair, waypoint, minimap, or tooltip anywhere — the fiction-pure ban binds at review now, machine-linted in Epic 3.
- All in-world behavior is authored deterministic data; zero LLM/model calls at runtime or in CI.

## Technical Decisions

- Microkernel/plugin: the Arcade Core kernel owns the clock, the room, and every room service (input, storage/identity, Patron scheduler + occupancy, seat transition). Games are two-part contract plugins — pure deterministic sim half + three.js presentation adapter. The game registry is build-generated from a provisional hand-authored list (ledger-driven from Epic 3). Core source never imports `games/**`; a CI dependency check fails violations.
- One global fixed 60Hz kernel tick decoupled from rendering, with a max-catch-up-steps guard and defined backgrounded-tab resume; sim time = tick count. Sims never call rAF/setInterval; `Math.random`, `Date.now`, `performance.now` are lint-banned on sim paths (full L0 in Epic 3).
- `core/contract/` harness, shared by kernel, CI, and tools: seeded RNG injection (uniform/range/rangeInt/pick/weighted; cursor gettable/restorable inside `snapshot()`), a deterministic math module, deep-freeze between ticks (out-of-tick writes throw), wrapper-computed `stateHash()` over canonicalized `snapshot()`, and the `tick(dt, input)` → `events()` protocol. Canonical events: `gameEnded`, `roundBreak`, `scoreSubmitted {score, initials?}`; sims never define their own `stateHash`.
- The supervisor wraps every kernel call site and catches sim faults; a `stateHash()` stall across N attract cycles is the dev dead-machine fault predicate (N a placeholder until Epic 3); stateHash-delta is attract liveness.
- The sim half imports no three/WebAudio/DOM/window; the adapter imports three, Core service APIs, and its own sim only. Moon Patrol is vendored with its input layer discarded at the seam — gameplay reads only declared control slots (`axis: move`; buttons start/jump/fire). Visitor play gets a kernel-fresh seed; attract/Patron instances derive seeds.
- Scores travel only via `scoreSubmitted`; the score table is Core-owned, delivered read-only to the presentation half, and never in sim input, stateHash, or state. Personal Bests keyed on (stable gameId, visitorId).
- Pinned stack from the architecture, not the environment: three 0.187.0 + @types/three 0.187.0 (exact match), TypeScript 7.0.2 (Core/contract; games may be plain JS), Vite 8.3.8, Node 26 LTS. Hand-coded three.js; react-three-fiber deliberately forbidden.
- World units: eye height 1.60m; walk speed 1.4 m/s with ±0.04m head bob; stand-up cabinet ~0.60m footprint; 0px-radius shells and hard corners throughout.

## UX & Interaction Patterns

- Loading is fiction: the page opens on the closed front door seen from the street; light-bleed widens under the door, glass brightens, handle turns at ready — no progress bar. Asset timeout ~90s shows a plain outside-fiction panel ("The arcade didn't open. Reload."); detected unsupported/underpowered browsers get a workbench panel before any 3D canvas. (The sound twin of this beat rides Epic 2.)
- Controls are learned only from the Welcome Flyer (Paper Card stock by the door: "MOVE: W A S D · LOOK: MOUSE · DO: E") or by trying — never from prompts. Looking IS targeting (center-of-view + E); no hover states, no click-raycast. Pointer-lock denial falls back silently to drag-look, device-layer only and replay-safe.
- Cabinet furniture: marquee lit with Chakra Petch title lettering at 0.18m cap height, legible ~15m; the Core-owned screen surface renders attract / score table / NEXT in an era-CRT voice, glowing in the cabinet's own hue family; the coin door opens/closes with E. NEXT renders at the authored minimum, legible from across the room — the visual rung of the discovery ladder works with audio absent (spatial sound is Epic 2).
- Tokens: Room Black / Wall Warm envelope, low-contrast carpet pattern; the eight glow hues are light/material identity only — cabinets are the light sources, nothing is painted-glow on walls. Zone hues (violet / steel / orange / green, amber at the roadmap stretch) must read at 6m from geometry alone.

## Cross-Story Dependencies

- 1.1 (kernel, clock, contract harness) precedes all gameplay stories. 1.2's collision needs 1.3's walls/pillars/slot config; 1.4's shell needs 1.3's slots; 1.5 needs 1.2's seat/interaction plus 1.4's screen; 1.6 needs 1.5's sim plus 1.4's NEXT surface; 1.7 rides 1.1's supervisor and deep-freeze; 1.8 rides 1.5's `scoreSubmitted` path; 1.9 wraps 1.2 + 1.3 readiness into the load beat.
- Deferred outward by design: spatial audio, the full pull ladder, Settings and site pages (Epic 2); lints and verification gates, ledger, Layout System, Instruction Cards, banter and Patron handoff, recordings/replay/reporting, and the Moon Patrol contract reimplementation (Epic 3). The numeric thresholds (occlusion hysteresis, fault-stall N, framerate floor, liveness radii) stay unset until Epic 3 — so in M0 the acceptance laws bind at review, not in CI.
