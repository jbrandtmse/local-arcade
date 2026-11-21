# Epic 1 Context: Walk In — The First Living Machine (M0)

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

A visitor loads the page and is inside the Arcade Room in first-person control within a minute — no auth, no UI, no onboarding — seeing glowing cabinets with empty wall slots read as roadmap, watching a Patron actually play Moon Patrol, sitting down, and playing the real game; their personal best survives the next visit. This epic lays the entire technical foundation: deterministic kernel, room geometry, cabinet shell, the first vendored game, and Patron presence. The acceptance laws — no Dead Machines, fiction-pure room — bind from the first story even before their lints exist.

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

- Page-load to controllable first-person view ≤60s worst-case on a mid-range laptop — a guardrail ceiling, never displayed; the real time-to-playable budget is set from the first measurement. No sign-in, cookie wall, or onboarding modal ever appears.
- Room: interior ~19m × 12.5m, front door bottom-center with a street side; Wall Slots pre-declared, evenly spaced at 1.40m pitch, authored in a `core/room/` slot config carrying a revision id; aisles never narrower than 1.20m; two occluder pillars breaking sightlines; fixed Zones — Pinball Corner back-left, Workshop back-right, Snack Bar front-right, Casual Alley mid-right kept clean. Empty slots read as roadmap in the same visual language as filled ones.
- No Dead Machines: any sampled frame shows every visible Cabinet active. A faulting game becomes a Faulted Machine kept performing via kernel fallback (marquee + screen motion); the room never crashes.
- A visitor sits at a cabinet, plays the full game in place, and returns to their standing position with room continuity restored. The Moon Patrol wrap is provisional — a contract reimplementation lands later with no visible change to the cabinet experience.
- A busy Cabinet runs real auto-play (no busy animation); Patron reactions fire 1:1 with that game's sim events through an authored impulse mapping. Waiting, taking over at a `gameEnded`/`roundBreak`, and walking away all work; a present visitor beats the queue head. Banter and Patron→Patron handoff are explicitly out of scope here.
- Scores persist between visits via an anonymous UUIDv4 in localStorage under `arcade.*` — no consent wall, no PII anywhere. Score screens show only Personal Bests plus Patron auto-play runs.
- Marquees carry the game title only — never a model name, "AI-generated" badge, or tagline.
- Desktop only: pointer-lock mouse-look + WASD + single E interact verb; evergreen Chrome/Edge is the CI-enforced matrix. No HUD, crosshair, waypoint, minimap, or tooltip anywhere.
- All in-world behavior is authored deterministic data; zero LLM/model calls at runtime or in CI.

## Technical Decisions

- Microkernel/plugin: the Arcade Core kernel owns the clock, room, and all room services (input, storage/identity, Patron scheduler, seat transition). Games are two-part contract plugins — headless deterministic sim + three.js presentation adapter — placed from a provisional hand-authored registry list (ledger-driven from Epic 3). Core source never imports `games/**`; a CI dependency check fails any violation.
- One global fixed 60Hz kernel tick, decoupled from rendering, with a max-catch-up-steps guard and defined backgrounded-tab resume; sim time = tick count. Sims never call rAF/setInterval; `Math.random`, `Date.now`, `performance.now` are lint-banned on sim paths.
- `core/contract/` harness (shared by kernel, CI, tools): seeded RNG injection (uniform/range/rangeInt/pick/weighted, cursor gettable/restorable in `snapshot()`), deterministic math module, deep-freeze between ticks (out-of-tick writes throw), wrapper-computed `stateHash()` over canonicalized `snapshot()`, and the `tick(dt, input)` → `events()` protocol. Canonical events: `gameEnded`, `roundBreak`, `scoreSubmitted {score, initials?}`.
- A supervisor wraps every kernel call site and catches sim faults; a `stateHash()` stall across N attract cycles is the dev dead-machine fault predicate (N placeholder until Epic 3).
- The sim half imports no three/WebAudio/DOM/window; the presentation adapter imports three, Core service APIs, and its own sim only. Moon Patrol is vendored from `C:/git/moonpatrol` with its input layer discarded at the seam — gameplay reads only declared control slots (`axis: move`; buttons start/jump/fire).
- Scores flow only via `scoreSubmitted`; the Core owns the score table, delivered read-only to the presentation half; the sim never reads, branches on, or stores table content. Personal Bests keyed on (stable gameId, visitorId).
- Pinned stack, versions from the architecture, not the environment: three 0.187.0 + @types/three 0.187.0 (exact match), TypeScript 7.0.2 (Core/contract; games may be plain JS), Vite 8.3.8, Node 26 LTS. Hand-coded three.js — react-three-fiber deliberately forbidden.
- World units: eye height 1.60m, walk speed 1.4 m/s with ±0.04m head bob, stand-up cabinet footprint ~0.60m.

## UX & Interaction Patterns

- Loading is fiction: the page opens on the closed front door from the street; light-bleed widens under the door, glass brightens, handle turns at ready — no progress bar. Asset timeout ~90s shows a plain outside-fiction panel ("The arcade didn't open. Reload."); unsupported/underpowered browsers get the workbench panel before any 3D canvas.
- Controls are learned only from the Welcome Flyer (Paper Card stock by the front door: "MOVE: W A S D · LOOK: MOUSE · DO: E") or by trying — never from prompts. Looking IS targeting (center-of-view + E); no hover states or click-raycast. Pointer-lock denial falls back silently to drag-look, device-layer only.
- Cabinet furniture language: 0px radius shells, marquee lit with Chakra Petch title at 0.18m cap (legible ~15m), Core-owned screen surface rendering attract/score/NEXT in an era-CRT voice glowing in the cabinet's own hue family, coin door opens with E.
- Tokens: Room Black/Wall Warm envelope, low-contrast carpet pattern; the eight glow hues are light/material identity only — nothing painted-glow on walls; cabinets are the light sources. Zone hues (violet/steel/orange/green, amber at the roadmap stretch) must read at 6m from geometry alone.
- The NEXT signal renders at the authored minimum, legible from across the room — the visual rung of the discovery ladder works even with audio absent (spatial sound itself is Epic 2).

## Cross-Story Dependencies

- 1.1 (kernel, clock, contract harness) precedes all gameplay stories. 1.2's collision needs 1.3's walls/pillars/slot config; 1.4's shell needs 1.3's slots; 1.5 needs 1.2's seat/interaction and 1.4's screen; 1.6 needs 1.5's sim plus 1.4's NEXT surface. 1.7 rides 1.1's supervisor and deep-freeze; 1.8 rides 1.5's `scoreSubmitted` path; 1.9 wraps 1.2 + 1.3 readiness into the load beat.
- Deliberately deferred outward: spatial audio and the full pull ladder (Epic 2, along with the Settings/site pages and drag-look Settings rows); lints, verification gates, ledger, Layout System, Instruction Cards, banter/handoff, recordings/replay/reporting (Epic 3); Moon Patrol's full contract reimplementation (Epic 3). Deferred numeric thresholds (hysteresis, framerate floor, fault-stall N, liveness radii) mean the acceptance laws bind at review in M0 and become machine-enforced only in Epic 3.
