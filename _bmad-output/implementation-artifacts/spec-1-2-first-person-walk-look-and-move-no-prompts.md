---
title: 'Story 1.2: First-person walk — look and move, no prompts'
type: 'feature'
created: '2026-11-21'
status: 'done'
review_loop_iteration: 1
followup_review_recommended: true
baseline_revision: '56765fab8405a9e7fe0be8bc7031ca9a82a6cbc9'
context:
  - _bmad-output/planning-artifacts/architecture/architecture-local-arcade-2026-11-19/ARCHITECTURE-SPINE.md
  - _bmad-output/specs/spec-local-arcade/room-layout.md
warnings: ['oversized']
deferred:
  - summary: >-
      AC5 is referenced in the story's Tasks line and the spec_validated cycle-log row, but the spec defines no AC5; the in-view (rendered) half of the no-UI law (no HUD/crosshair/waypoint/minimap/tooltip in the 3D view) has no automated pin until the Epic 3 machine lint — currently held by the lead's per-story Chrome+Edge smoke.
    evidence: |-
      verification-gap layer demonstration: adding a camera-parented crosshair mesh in core/main.ts leaves the whole suite green — no test observes scene contents; the DOM half is pinned (core/no-ui-dom.test.ts) but the rendered half is not.
    location: >-
      core/main.ts (frame()/scene assembly); spec Tasks & Acceptance Execution line
    severity: medium
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
| Window blur (focus loss, tab still visible) | window blur with keys/buttons still down | device buffer cleared like a hidden tab — no stuck walk or drag; mouseleave off the document also ends a drag | n/a |
| Auto-repeat keydown | OS repeats keydown while a key is held | axis level unchanged; press edge belongs to the fresh keydown only (E edges once per physical press) | n/a |
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

### Review Findings — 2026-11-21 code-review pass (layers: blind-hunter, edge-case-hunter, verification-gap, acceptance-auditor; rows=22, HIGH=0)

Scope: `git diff 56765fa` + untracked QA tests (`core/player-qa.test.ts`, `core/main-glue.test.ts`). First full review of the story; every patchable in-story MED/LOW patched. Verdict: **done** — no HIGH; one MED routed with an owner (DW-12). Note: edge-case-hunter and verification-gap layers timed out on first launch and were re-run fresh.

Rule 6 re-check: implementation matches AD-1/3/6/7/13/14/15/17/24/26 Rule text (DeviceView == AD-7 slot grammar; systems supervisor-wrapped inside `runGlobalTick`; render reads tick state only; zero UI surfaces; `window.arcadeDebug = { player, loop }` is non-visual — nothing rendered, announced, or exposed beyond state; replay transcript shape identical on both lock paths). Rule 1: Integration AC exercised (scriptedSession through real service+loop). Rule 2: `addSystem` extends the loop, no sibling copies. Rule 3: real-runtime evidence = dev-serve HTTP pins (project's designated app-serve pattern); browser-execution tier is the lead's smoke this epic and lands with Epic 3 CI — depth gap routed as DW-12.

| sev | finding (layer order) | disposition |
|-----|----------------------|-------------|
| med | core/main.ts glue never executed by any test — view-hoisting/listener-misattachment mutations keep 113/113 green (verification-gap) | routed: DW-12 owner=burndown (fix = browser harness, new dep, Epic 3 infra; lead smoke is this epic's gate) — non-blocking |
| med (re-sights) | AC5 numbering still cited in Tasks line, cycle-log rows, and test-summary Coverage wording; AC1 parenthetical "pinned by test" overstates the in-view half (blind, acceptance-auditor) | occurrence=DW-11 (existing routed entry, note already covers AC5 drift + in-view pin); spec-body wording is a spec edit — skill rule keeps it out of scope here |
| low | `SECONDS_PER_TICK = 1/60` duplicated between core/player.ts and loop's `MS_PER_TICK` — dual source of truth for tick rate, walk speed could desync from kernel clock (blind) | patched: player derives it from imported `MS_PER_TICK / 1000` (bit-exact, `=== 1/60` verified); suite green |
| low | head bob at full amplitude while pinned at a blocking face — commanded distance counted as travelled, contradicting matrix "Head bob: phase advances with distance travelled" (edge) | patched: `travelled` = actual displacement after `resolveMove` + new `bobAmp === 0` assertion in the wall-block pin (mutation-observed red on old behaviour) |
| low | stuck drag-look: mouseup outside the window never arrives; re-entry injects a look jump (edge) | patched: `document.documentElement` mouseleave → `input.mouseUp(0)` glue + new main-glue assertion (mutation-observed red) |
| low | loop `addSystem` pins (AC6/AD-15) had no `mutation:` line in `## Verification`; `ac6b:system-call-unwrapped` lived only in the cycle-log gate row (blind, verification-gap) | closed in-pass: mutation re-demonstrated red, line written under `## Verification` |
| low | `pointerLocked` test title claims a "glue" consumer; the glue compares `document.pointerLockElement` and `arcadeDebug` exposes no input handle (blind) | patched: test retitled to the truthful QA/debug-surface contract |
| low | integration session labels its f=200 wall-clock gap "backgrounded-tab" but fires no visibility event; walk-through-gap transcript mislabels the scenario (blind) | patched: comments restated — gap models the catch-up bound only; buffer-clear half pinned at f=390 + input suite |
| low | requestPointerLock synchronous throw would escape the promise catch (AC3 silent denial) (edge) | terminal `wontfix-theoretical` DW-13: AD-17 target engines never throw sync; reopen condition in note |
| low | DOM-free / banned-token pins scan dotted literals only — `globalThis.document`, aliased `document`, `eval` bypass (blind) | occurrence adjacent to DW-10's class but distinct gate (test pin vs ci/depcheck): covered by DW-10's adjudication pattern; Epic 3 L0 static analyzer is the real fix |
| low | dev-serve strictPorts 4641/4639 can collide on a busy machine (acceptance-auditor) | terminal `wontfix-accepted` DW-14: reopen_if=observed port-collision red; Epic 3 CI needs ephemeral port/lock |
| low (re-sights, rejections stand) | player pre-inside inflated AABB (edge; prior `[low][reject]` — unreachable: 0.023 m/tick vs ≥0.4 m stub faces, 1.3 rewrites volumes); addSystem dup-id/mid-tick guard (edge; prior reject — sole caller registers at boot); targeting ray origin ignores ±0.04 m bob (auditor; prior reject — divergence only at stub rims 1.3 rewrites) | rejected — prior adjudications re-checked against current code, hold |
| false | cycle-log `adr_verifications_complete` mutation names contradict spec `## Verification` (blind) — the cycle-log row names the lead's AD-tooled gate mutations (the seven in the gate commit); `## Verification` records implement/QA pinning mutations: separate gates, both records accurate | rejected |
| false | `collision-volumes.ts` "not literally pure data, no logic" (auditor) — `cabinetStub` builds data rows at module load; no runtime logic, state, or per-frame behaviour; reads true under the spec phrase | rejected |
| false | follow-up-review named-risk list stale post-QA (blind) — Auto Run Result covers its own pass by rule (Rule 14); QA pins postdate it | rejected |
| — | cycle-log frontmatter `review_loop_iteration=0` vs dev_complete row `=1`; cycle-log row-grammar drift (qa_complete missing `cycle_iteration`; `ledger_routed_planned` `story=` key) (blind) | lead-owned artifacts — not story work, no source edit; noted for the lead's bookkeeping |
| — | shipped blur-glue + `!e.repeat` filter exceed the frozen I/O matrix rows (auditor) | fix is a spec-intent edit (skill rule: out of review scope); suggested amendment for the lead at commit: extend the "Backgrounded tab resume" row with blur, and add an auto-repeat row — apply-and-report tier, intent unchanged |

**Verification after this pass:** `npm run typecheck` 0; `npm test` 113/113 (counts unchanged; two assertions added inside existing pins); `node ci/depcheck.mjs` 0; `node ci/lint-bans.mjs` 0; registry re-emit byte-identical; three CR mutation demonstrations (loop unwrap, bob distance, mouseleave listener) each observed red then reverted.

## Spec Change Log

- 2026-11-22 (lead, apply-and-report per CR): I/O matrix gained two rows — window-blur buffer clear and auto-repeat press-edge — pinning behavior the CR patches shipped. `review_loop_iteration` 0→1 (lead). Design Notes 9 recorded into the spine as a Consistency Conventions row (`spine_updated`, memlog #64); spine newer than epic-1 context → pre-warm re-run before Story 1.3 plan.

## Review Triage Log

### 2026-11-21 — Review pass
- verdicts: 16 findings — high 0, medium 7, low 7, false 2, maybe-false 0
- findings:
  - `[medium]` `[patch]` Scripted integration session dropped its look events — session never engaged pointer lock or drag, so both `mouseMove` calls were silently discarded and the "target clears then re-arms" narrative was unexercised — fixed: lock engaged, walk stops in reach, scripted look-off/re-center; assertions now pin set→clear→re-arm order (observed at f≈306/320/355).
  - `[medium]` `[patch]` Denied pointer-lock rejection not silenced — `void el.requestPointerLock()` leaks an unhandled promise rejection on denial (Esc cooldown, gesture policy), breaking the silent-fallback contract at the console — fixed: `Promise.resolve(...).catch(() => {})` in the glue.
  - `[medium]` `[defer]` AC5 dangles — Tasks line and the `spec_validated` cycle-log row cite AC5, but the spec defines no AC5; the in-view (rendered) half of the no-UI law has no automated pin until the Epic 3 machine lint — grouped with the verification-gap finding below; recorded in frontmatter `deferred:`.
  - `[false]` `[reject]` Stale Auto Run Result / empty triage log mid-run — the finalize step of this same pass writes these; workflow state, not a defect.
  - `[false]` `[reject]` loop.ts systems comment "asserts a nonexistent event-dispatch phase" — the comment quotes AD-23's binding in-tick phase order verbatim from the spine; the claim misreads a spine citation as a code claim.
  - `[low]` `[reject]` `addSystem` duplicate-id / mid-tick registration guard — one boot-registered system this story; the fix adds a guard for a state no caller can reach.
  - `[low]` `[reject]` `bobPhase` unbounded growth — same-engine replays are bit-identical regardless; wrapping changes recorded transcript values and re-pins the bob test for no demonstrated harm.
  - `[low]` `[reject]` Targeting ray origin ignores ±0.04m head bob — diverges only at the top/bottom rims of placeholder stubs, which 1.3 rewrites; the finding's own alternative fix was a Design Notes edit (spec edit).
  - `[medium]` `[patch]` Window blur (focus to another window, tab visible) drops pending keyup/mouseup — stuck walk/drag — fixed: `window.addEventListener("blur", () => input.visibilityChanged())` in the glue (service method already pinned).
  - `[medium]` `[patch]` requestPointerLock promise rejection (edge-case layer) — same root cause as the blind-hunter finding above; shared entry, same fix.
  - `[low]` `[reject]` Player pre-inside an inflated AABB — unreachable with this story's spawn and per-tick step (0.023m/tick vs ≥0.75m faces); 1.3 authors real volumes and will face it with its own tests.
  - `[low]` `[reject]` `step(dt>1)` tunneling — no caller passes dt>1 (the loop steps dt=1 only); future scheduler callers pin their own substepping.
  - `[low]` `[reject]` Two E presses inside one tick collapse to one edge — physically implausible at 16.7ms, and the AD-7 view grammar carries one button slot per tick.
  - `[medium]` `[patch]` Once-per-press law rested on the untested `!e.repeat` glue line in a module no test executes — service re-armed the edge on every repeat keydown — fixed: repeat-down dedup in `key()` plus a headless pin (input suite 10→11).
  - `[medium]` `[defer]` AC5 / in-view no-UI half has no pinning test or mutation line — grouped with the blind-hunter AC5 row above; deferral recorded in frontmatter `deferred:`.
  - `[low]` `[reject]` Constant-equality assertions (`EYE_HEIGHT 1.6`, `TARGET_REACH 2.0`) couple to tuning churn — both numbers are stated in the intent contract (Always numbers; matrix row 7 "within 2.0m"), so pinning them is per-spec, intentional.

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

**Pinning tests & demonstrated mutations (Rule 19; each reverted, tree byte-identical, suite re-green):**
- AC1 pin `core/main.ts builds no DOM surface…` (core/no-ui-dom.test.ts) — mutation: appended `document.body.appendChild(document.createElement("div"))` after the canvas append in core/main.ts → that pin red, siblings green; reverted.
- AC2 pin `pitch clamps at ±85° … yaw turns with mouse-x` (core/player.test.ts) — mutation: look sign `state.yaw -=` → `+=` in core/player.ts → that pin red; reverted.
- AC3 pin `drag-look fallback: button-down drag feeds the same aim channel…` (core/input/input.test.ts) — mutation: aim gate `if (locked || dragging)` → `if (locked)` → that pin red; reverted.
- AC4 pin `E press with a registered handler fires exactly on the press edge, once` (core/player.test.ts) — mutation: `view.interact.pressed` → `view.interact.down` → that pin red; reverted.
- AC6 pin `wall block: stop at face minus player radius; strafing still slides` (core/player.test.ts) — mutation: z-pushout face `nz = dz > 0 ? lo : hi` → `? hi : lo` → that pin red (stub/E pins as knock-on); reverted.
- AC7 pin `Integration: two headless loop runs, identical scripted device views -> identical transcripts` (core/player.test.ts) — mutation: injected `state.bobPhase += Math.random() * 1e-9` into step() → transcript equality red; reverted.

**QA stage additions (2026-11-21, `bmad-qa-generate-e2e-tests`):**
- Files (QA): `core/player-qa.test.ts` (4 pins), `core/main-glue.test.ts` (3 pins) — the implemented surface the 31 implement pins leave unobserved: X-face collision clamp + slide-along, targeting-ray pitch term, per-tick aim consumption through the real loop, the determinism seam (contract math; no wall-clock or `Math.*` transcendentals in `core/player.ts`/`core/input/index.ts`), render-reads-tick-state-only (camera position incl. the bob term, rotation pitch/yaw, no wall-clock in `frame()` — the camera-Y half of the Head-bob matrix row; the *rendered* half stays deferred per frontmatter), silent pointer-lock denial + blur/visibility buffer-clear glue, and thin device glue (forward-only listeners; lock-element-vs-canvas compare). QA file placement decided in-stage: concern-named QA files co-located under `core/`; implement-owned test files untouched.
- mutation: X pushout face `nx = dx > 0 ? lo : hi` → `? hi : lo` (core/player.ts) → QA pin `side walls block…` red; existing suite unaffected (112/113) — the X-face inversion was invisible to the whole pre-QA suite; reverted, suite re-green.
- mutation: targeting ray `dirY = math.sin(state.pitch)` → `dirY = 0` → QA pin `targeting respects pitch…` red; existing suite unaffected; reverted.
- mutation: dropped `takeView()`'s aim reset (`aimDx/aimDy = 0`) → QA pin `aim deltas land exactly once…` red plus existing `pointer-locked aim: … consumed once per tick` and `drag-look fallback…` pins — this mutation supplies the first demonstrated red for the consumed-once claim (prior AC3 mutation hit the capture gate only); reverted.
- mutation: player basis `math.sin` → `Math.sin` (core/player.ts) → QA pin `determinism seam (AC7)…` red (contract sin is a Taylor approximation ≠ libm; behavioral pins stay green because every existing scenario sits at yaw-0/exact values where they agree — the pin binds the seam itself); reverted.
- mutation: `+ math.sin(p.bobPhase) * p.bobAmp` removed from `camera.position.set` (core/main.ts) → QA pin `render reads tick state only…` red; reverted.
- mutation: silent-denial catch removed — `void Promise.resolve(….requestPointerLock()).catch(() => {})` → `void ….requestPointerLock()` → QA pin `pointer-lock denial is silent…` red; reverted.
- mutation: `input.pointerLockChanged(document.pointerLockElement === canvas)` → `input.pointerLockChanged(true)` → QA pin `device glue is thin…` red; reverted.
- code-review pass mutations (2026-11-21, each observed red, reverted, suite re-green):
  - mutation: kernel-system call unwrapped from `supervisor.invoke` (`sys.fn()` direct) in core/loop.ts runGlobalTick → pin `addSystem: a throwing system is supervisor-logged; the tick, the loop and neighbours keep running` red (doesNotThrow catches "system boom"); reverted. (This closes the Rule-19 record gap for the three loop `addSystem` pins, previously named only in the `adr_verifications_complete` cycle-log row.)
  - mutation: bob distance reverted to commanded (`travelled = dist`) in core/player.ts → `wall block…` pin's new `bobAmp === 0` assertion red (amplitude held at 0.04 while pinned); reverted by re-applying the actual-displacement fix.
  - mutation: `document.documentElement.addEventListener("mouseleave", …)` listener removed from core/main.ts → QA `device glue is thin…` pin's new mouseleave assertion red; reverted.
- All seven mutations reverted with `git status --short`/`git diff --stat` byte-identical; post-QA `npm test` 113/113; typecheck/depcheck/lint-bans/registry-drift all green; the two QA files pass standalone in either order (hermeticity).

**Shared surfaces:** `core/room/` placeholder collision volume list — this story's tests assert its volume ids/positions; Story 1.3 rewrites that data and the tests that pin placeholder positions move with it (pin ids, not raw coords, wherever a test can). `generated/game-registry.ts` entry count (0, unchanged); root `package.json` scripts set (unchanged — no new scripts). Standing criterion: every test added or changed passes on a fresh environment, in either order.

**Manual checks (lead's per-story browser smoke, Chrome AND Edge — Rule 3 real-runtime + NFR-7 until Epic 3 CI):**
- `npm run dev`: click canvas → pointer lock engaged; mouse-look + WASD feel continuous; run into the back wall — you stop and slide along it; Esc → drag-look still turns the view, silently; nowhere is there a prompt, cursor overlay, HUD, or message
- `window.arcadeDebug.player` during the walk shows position/yaw/pitch/bob consistent with what's seen; an E press with the view centered on a cabinet stub records the press edge in the input view

## Auto Run Result

Status: done
Blocking condition: none

Implement pass (this section covers this pass only). Handoff subagent implemented the spec; the stage verified the diff against spec and spine, ran the Matrix Test Audit, demonstrated six pinning mutations (one per AC — all red, all reverted, suite re-green), ran the four review layers in parallel, and applied the patched findings.

**Summary:** first-person visit shell — Core device service (`core/input/`, DOM-free, AD-7 slot grammar with silent drag-look fallback on the same aim channel), first-person controller (`core/player.ts`: 1.4 m/s walk at 1.60m eye height, ±85° pitch clamp, ±0.04m bob by distance with 0.25s settle, circle(r=0.25)-vs-AABB pushout with wall slide, center-of-view targeting reach 2.0m, empty `registerInteractable` registry), loop gains supervisor-wrapped `addSystem`, placeholder collision volumes close the 19m×12.5m envelope, and the camera only reads tick state at render.

**Files changed:**
- `core/room/collision-volumes.ts` (new) — authored placeholder AABB data, ids stable for 1.3
- `core/input/index.ts` + `core/input/input.test.ts` (new) — device capture service, 11 pins
- `core/player.ts` + `core/player.test.ts` (new) — controller + 13 pins incl. headless replay integration session
- `core/loop.ts` + `core/loop.test.ts` — `addSystem(id, fn)` supervisor-wrapped as `core.system.<id>`; 3 new pins
- `core/main.ts` — glue: input service, player system, camera-from-state render, `window.arcadeDebug`; silent denial (promise catch), blur buffer clear
- `core/no-ui-dom.test.ts` (new) — DOM-surface pins incl. real dev-serve (port 4641) check
- spec (this file) — frontmatter, Rule 19 mutation lines, triage log, this result

**Review findings breakdown:** 16 findings — 0 high; 7 medium, 7 low, 2 false. Patched (4 entries): scripted-session look events were dead code (now pins target set→clear→re-arm); unhandled pointer-lock rejection silenced in glue; window-blur stuck-input fix; service-level auto-repeat edge dedup + new pin. Deferred (1 grouped entry): AC5 dangles in Tasks/cycle-log and the in-view no-UI half has no automated pin until Epic 3 machine lint (lead's Chrome+Edge smoke holds it now) — in frontmatter `deferred:`. Rejected lows (7, reasons in triage log): theoretical-hardening and placeholder-geometry edge cases not reachable this story, plus intentional intent-pinned constant assertions. Rejected false (2): mid-run workflow state; a comment that correctly quotes AD-23.

**Follow-up review recommendation: true** — patched entries include two-or-more mediums. Unverified risk it names: the browser-glue half of `core/main.ts` (pointer-lock grant/denial path, blur/visibility listeners, camera-from-state render line, in-view no-UI half, Chrome-vs-Edge parity) is exercised by no automated suite — it rests on the lead's per-story browser smoke on both browsers.

**Verification performed:** `npm run typecheck` exit 0; `npm test` 106/106 (existing 75 green + 31 new); `node ci/depcheck.mjs` exit 0; `node ci/lint-bans.mjs` exit 0; `node tools/gen-registry.mjs` + registry byte-identical (0 entries); `npm run build` exit 0 once (pre-existing three.js chunk-size warning); Matrix Test Audit: all 11 rows covered, row "Chrome vs Edge" per spec is the lead's manual smoke; six Rule 19 mutation demonstrations recorded under ## Verification, each reverted with suite re-green.

**Residual risks:** local Node is 24.16 against the spine's `engines: >=26` — suite green on 24, but the pinned-LTS fresh environment is the standing-criterion check; `window.arcadeDebug` is a mutable state handle (non-visual; review re-checked it is not a UI surface — nothing rendered or announced); in-view no-UI deferral as above.
