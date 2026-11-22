---
title: 'Story 1.2: First-person walk — look and move, no prompts'
type: 'feature'
created: '2026-11-21'
status: 'ready-for-dev'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - _bmad-output/planning-artifacts/architecture/architecture-local-arcade-2026-11-19/ARCHITECTURE-SPINE.md
  - _bmad-output/specs/spec-local-arcade/room-layout.md
warnings: ['oversized']
deferred: []
---

<intent-contract>

## Intent

**Problem:** The page boots an empty scene with a static camera — the visitor is not inside anything. Story 1.2 makes the page a first-person visit: look with the mouse, walk with WASD at eye height through collision-blocked volumes, with E as the single interact verb — and absolutely nothing on screen explaining itself.

**Approach:** A Core-owned device layer (`core/input/`, AD-7) captures keyboard, pointer-lock look, and mouse-drag fallback into a per-tick device view; a first-person controller (`core/player.ts`) runs as a kernel system inside the global tick, advancing position/look/head-bob and resolving circle-vs-AABB collision against authored placeholder volumes in `core/room/` (walls, two pillar stubs, cabinet stubs — the shape Story 1.3 grows into its real room without rework). The camera reads tick state at render time; targeting is center-of-view ray + E, with no interactable consumer yet.

## Boundaries & Constraints

**Always:** all player motion derives from kernel tick state — no wall-clock, no adapter-internal animation (AD-3); device capture lives only in Core (`core/input/`) and maps onto the AD-7 slot grammar (axis level ∈ [-1,1], button {down, pressed}, aim {dx, dy} per tick) so input is replay-safe as tick-indexed deltas (AD-26); player state mutates only inside the global tick, system hooks wrapped by the supervisor (AD-15 containment — the room never crashes); pointer-lock denial falls back silently to drag-look on the same aim channel — zero UI text ever (UX-DR18, AD-24); no HUD, crosshair, waypoint, minimap, or tooltip (NFR-8); no `games/**` imports, no new dependencies, no outbound network (AD-1, AD-18); numbers: eye height 1.60m, walk 1.4 m/s, head bob ±0.04m.

**Never:** no real room geometry, Wall Slot config, zones, or occluder collider set (Story 1.3 owns those — 1.2 authors only placeholder collision volumes); no cabinet shell, coin door, or marquee (1.4); no seating/seat transition (1.5); no Patron/scheduler or input arbitration (1.6); no Settings rows for the drag-look fallback (Epic 2); no new canonical event type names (AD-6 vocabulary stays closed); no react-three-fiber, no DOM overlay of any kind, no mobile input paths (AD-17).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Pointer-lock granted | click on canvas grants lock; mouse moves; W held | per-tick look {dx,dy} consumed exactly once per tick; yaw/pitch advance (pitch clamped ±85°); position advances 1.4 m/s along facing at eye height 1.60m | lock release re-arms on next click, silently |
| Pointer-lock denied/released | lock never granted or lost (Esc, tab hide) | drag-look: mouse-drag deltas feed the same aim channel; WASD unaffected; no message, prompt, or style change anywhere (silent, device-layer only) | n/a |
| Backgrounded tab resume | loop resume semantics (≤ MAX_CATCHUP_STEPS) + hidden device buffer | no look/teleport burst: per-tick deltas consumed per tick; buffer cleared on visibility change; player advances ≤ catch-up ticks | leftover wall delta dropped (loop's existing behavior) |
| Walk into wall/pillar/cabinet stub | scripted W toward a placeholder volume | position stops at the face minus player radius; strafing still slides along the wall; blocking derived from tick state | n/a |
| Diagonal walk | W+D same ticks | speed magnitude stays 1.4 m/s (input vector normalized before scaling) | n/a |
| Head bob | moving N ticks | camera Y = 1.60m + sin(phase)·0.04m, phase advances with distance travelled; standing settles to 1.60m | n/a |
| Looking-as-targeting | camera center aimed at a targetable placeholder volume within 2.0m | player state records `targetId`; moving off it (or beyond reach) clears to null; mouse click changes nothing | click has no targeting/interact effect (center-of-view only) |
| E interact press | E pressed while targetId set | button {pressed:true} exactly one tick; no interactable handler is registered this story → no state change, no event; press with no target → no-op | n/a |
| No UI ever (FR-1, NFR-8) | served page, either browser | DOM contains only the canvas main.ts appends — no modal, onboarding, sign-in, cookie wall, HUD, crosshair, waypoint, minimap, tooltip | n/a |
| Integration (Rule 1) | two headless loop runs, identical scripted device views | identical player-state transcripts (position, yaw/pitch, bob, targetId) — device-agnostic, replay-safe | n/a |
| Chrome vs Edge | same scripted session | identical observable behavior — CI matrix is Epic 3; the lead's per-story browser smoke on both enforces it now | n/a |

</intent-contract>

## Code Map

- `core/loop.ts` -- the tick pump to extend: `runGlobalTick()` (:61) is the only place global systems may run; add `addSystem(id, fn)` there, supervisor-wrapped; `TICK_DT`, `MS_PER_TICK`, `MAX_CATCHUP_STEPS` (:12-16) stay untouched
- `core/main.ts` -- browser entry; camera placeholder comment at :22 says "shell arrives in 1.2"; wire the input service + player controller into the loop; camera transform reads player tick state each render frame (no motion computed in render)
- `core/contract/wrapper.ts` -- `TickInput` (:13) is the GAME tick input ({controls} only, AD-16); the player's device view is a separate kernel-side shape, never injected into sims
- `core/contract/math.ts` via `core/contract/index.ts` -- use `math.sin/cos/...` for the player step so headless and browser agree bit-for-bit (free, already-pinned seam)
- `core/room/` -- empty (.gitkeep); first occupant is the placeholder collision config; Story 1.3 edits this data in place
- `index.html` -- body holds only the module script (:22): the no-UI pinning test asserts the served DOM grows nothing else
- `core/bootstrap.test.ts` -- pin style for new headless assertions (reads real files, no mocks)
- `tools/app-serve.test.ts` -- QA dev-serve pattern the browser half of FR-1/no-UI will extend (Rule 3 real-runtime evidence)

## Tasks & Acceptance

**Execution:**
- `core/room/collision-volumes.ts` -- authored placeholder data: four wall boxes closing a 19m × 12.5m interior envelope (room-layout.md contract numbers), two pillar stubs, three cabinet stubs at 1.40m pitch along the back wall; shape `{id, min, max, blocksMovement, targetable, kind}` — pure data, no logic, so 1.3 replaces/extends in place -- AC6
- `core/input/index.ts` + `core/input/input.test.ts` -- device capture service (AD-7): keyboard (WASD axes, E button edge), pointer-lock lifecycle, mouse move/drag-look into one per-tick device view `{axes, aim, interact}`; browser glue thin behind an injectable source; per-tick deltas consumed once; buffer cleared on visibility change -- AC2/AC3
- `core/player.ts` + `core/player.test.ts` -- first-person controller: position/yaw/pitch/bobPhase/targetId state; step(dt=1, input) normalizes move input to 1.4 m/s, advances bob ±0.04m by distance, resolves circle(r=0.25m)-vs-AABB pushout with wall slide, center-of-view ray (reach 2.0m) sets targetId; headless determinism test per matrix row "Integration" -- AC2/AC4/AC6/AC7
- `core/loop.ts` + `core/loop.test.ts` -- add `addSystem(id, fn)`; systems run every global tick inside `supervisor.invoke` (fault → logged, tick keeps running); pin with a throwing system -- AC6 (collision "driven from tick state") + AD-15
- `core/main.ts` + `core/no-ui-dom.test.ts` (or extend `tools/app-serve.test.ts` pattern) -- wire input+player; camera from player state at render; served DOM is canvas-only, no lock-request UI -- AC1/AC5/FR-1
- tests for each I/O matrix row above (Rules 1/19) -- incl. diagonal speed, pitch clamp, bob settle, E edge once, click-does-nothing, replay-identical transcripts

**Acceptance Criteria:**
- Given a loaded page (Chrome or Edge), then no modal, onboarding, sign-in, cookie wall, HUD, crosshair, waypoint, minimap, or tooltip has appeared — the only DOM surface is the canvas (AC1, FR-1, NFR-8; machine lint Epic 3, pinned by test + smoke now)
- Given pointer-lock granted, when the mouse moves and WASD is held, then look updates per tick (pitch clamped) and the visitor walks at 1.4 m/s at eye height 1.60m with ±0.04m head bob (AC2; UX-DR3, NFR-7)
- Given pointer-lock denied or lost, then a silent drag-look keeps the visit alive through the same per-tick aim channel — device layer only, no UI, and the recorded tick-indexed input view is identical to the locked path's shape, so replay is unaffected (AC3; UX-DR18, AD-26)
- Given E pressed while the center of view is aimed at a targetable volume within reach, then the press edges once and targeting is by center-of-view only — a mouse click never targets or interacts (AC4; UX-DR18)
- Given any scripted movement, then walls, pillars, and cabinet stubs block position changes via collision resolved inside the global tick — a scripted run reproduces identical player transcripts headlessly (AC6)
- Given the same scripted device views, then observable behavior is constructed to be engine-identical (pure math module, tick-driven); evergreen Chrome + Edge equality is verified at the lead's browser smoke until the Epic 3 CI matrix (AC7; NFR-7)

## Spec Change Log

## Review Triage Log

## Design Notes

**Governing ADs (Rule 6):** AD-3 (Core owns the clock; motion derives from tick state, none from render), AD-6 (no new canonical event names; E-targeting stays kernel state this story), AD-7 (Core owns ALL device capture — pointer lock, keys, mouse buttons; slot grammar axis/button/aim; adapter half never sees devices), AD-15 (player state mutates only inside the tick; systems run supervisor-wrapped; the room never crashes), AD-17 (desktop mouse-look + WASD only), AD-24 (diegetic integrity: zero non-diegetic UI; nothing text-bearing is rendered), AD-26 (per-tick device views are the replay currency — fallback must not change the recorded shape), AD-1 (new core files import nothing from games; depcheck stays green), AD-13/AD-14 (monorepo, TS at Core).

**Consumed-by:** 1.3 (replaces `core/room/collision-volumes.ts` placeholders with the authored room + slot config; occluder set reuses this volume list shape), 1.4 (coin door = first consumer of E-targeting), 1.5 (seat transition rides targeting + player state), 1.6 (input arbitration at busy machines extends the input service), 1.9 (street-door beat wraps this shell's load posture), Epic 2 Settings (drag-look rows).
**Consumes:** Story 1.1 — `core/loop.ts` tick pump, `core/contract/` math + supervisor, the dev-serve QA harness.
**Integration ACs (Rule 1):** matrix row "Integration" (the real consumer — the player system — reads the real input service through the real loop; no mock at the integration seam); the E-verb has no consumer this story — note: **no consumers in this story for interact routing; the first consumer will be Story 1.4** (coin door).
**Extend, don't copy:** the loop gains `addSystem` rather than a second pump; the input service is the first device layer (no sibling); the collision volume file is the first occupant of `core/room/` — 1.3 extends the same list. The placeholder envelope reuses the existing Room Black scene, not a parallel renderer.
**Ledger inbox:** none (`LEDGER slice 1-2-first-person-walk-look-and-move-no-prompts` empty; routed DW bullets appear under other story keys, not this one).

**Decided in-stage** (small, reversible, spine-consistent; numbers are authored defaults, not yet measured — labelled (inference)):
1. File topology: `core/input/index.ts` (device capture, browser glue behind an injectable source), `core/player.ts` (controller), `core/room/collision-volumes.ts` (placeholder data only). Loop hook `addSystem(id, fn)` runs in `runGlobalTick()` supervisor-wrapped as `{gameId:"core.system.<id>"}`.
2. Device view per tick: `axes {forward, strafe} ∈ {-1,0,1}` normalized before speed scaling; `aim {dx, dy}` raw px deltas consumed once per tick (drag-look writes the same {dx, dy}); `interact {down, pressed}`. This mirrors AD-7's slot grammar so the future game-control routing and AD-26 inputChanges reuse it verbatim.
3. Placeholder collision volumes are AABBs in the XZ plane (walls extruded for rendering is 1.3's job; collision is 2D): interior 19m × 12.5m, four wall boxes, two pillar stubs, three cabinet stubs at 1.40m pitch (room-layout.md numbers; exact stub positions placeholder — (inference)). 1.3 rewrites the data, not the resolver.
4. Collision resolution: player circle r = 0.25m vs AABB, axis-separated pushout, slide preserved (inference — aisle 1.20m ≫ 2r, never blocks circulation).
5. Mouse sensitivity 0.0025 rad/px; pitch clamp ±85°; head-bob wavelength 0.7m (≈2Hz at walk speed), amplitude eases to 0 within 0.25s when stopped; target reach 2.0m (inference — will be tuned by feel at the 1.3 walk; none of these are product targets).
6. `window.arcadeDebug = { player, loop }` non-visual state handle for headless QA and the lead's console smoke — review must re-check this is not a UI surface (nothing rendered, nothing announced).
7. E press with a target but no registered handler: no-op, no event. Interact routing is a kernel-internal handler registry (`registerInteractable(volumeId, handler)`); it lands empty this story; 1.4 fills it. No new event type names.
8. Player step uses `core/contract/math` (already-pinned deterministic module) so Node and browser transcripts agree bit-for-bit — the sim-half ban doesn't bind Core, but the seam is free and hermetic.
9. The candidate "`core/room/` collision volumes = one authored AABB list shared by collision (now) and occluder/visual geometry (1.3, Epic 2 audio)" is a Consistency Conventions candidate for the lead to record in the spine at the story's commit (Rule 20) — it constrains 1.3's file shape.

## Verification

**Commands:**
- `npm run typecheck` (loop) -- exit 0
- `npm test` (loop; also once as the full-suite run before finalize) -- all `*.test.ts` under `core/` pass, existing 75 stay green (suite runs in seconds — one foreground call)
- `node ci/depcheck.mjs` (loop) -- exit 0 (new core files import no games)
- `node ci/lint-bans.mjs` (loop) -- exit 0
- `node tools/gen-registry.mjs && git diff --exit-code -- generated/` (loop) -- byte-identical (no registry change this story)
- `npm run build` (once) -- Vite build exit 0

**Shared surfaces:** `core/room/` placeholder collision volume list — this story's tests assert its volume ids/positions; Story 1.3 rewrites that data and the tests that pin placeholder positions move with it (pin ids, not raw coords, wherever a test can). `generated/game-registry.ts` entry count (0, unchanged); root `package.json` scripts set (unchanged — no new scripts). Standing criterion: every test added or changed passes on a fresh environment, in either order.

**Manual checks (lead's per-story browser smoke, Chrome AND Edge — Rule 3 real-runtime + NFR-7 until Epic 3 CI):**
- `npm run dev`: click canvas → pointer lock engaged; mouse-look + WASD feel continuous; run into the back wall — you stop and slide along it; Esc → drag-look still turns the view, silently; nowhere is there a prompt, cursor overlay, HUD, or message
- `window.arcadeDebug.player` during the walk shows position/yaw/pitch/bob consistent with what's seen; an E press with the view centered on a cabinet stub records the press edge in the input view

## Auto Run Result

Status: ready-for-dev
Blocking condition: none

Plan-stage halt per the dispatch ("Halt after planning."). Epic context reused from the committed `epic-1-context.md` (not recompiled); Story 1.1 loaded for continuity; spine AD blocks mapped; `LEDGER slice` empty and recorded in Design Notes. Spec meets the READY FOR DEVELOPMENT standard on first pass; `oversized` warning set (body above the 900-1600 token target — the I/O matrix, per-AC tasks, and the in-stage decision register carry the implement stage without a codebase re-investigation). Not committed: the plan stage leaves the spec uncommitted for the lead's validation gate.
