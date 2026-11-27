---
title: 'Story 2.2: The proximity ladder and the seated focus mix — "tuned in"'
type: 'feature'
created: '2026-11-27'
status: 'ready-for-dev'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - _bmad-output/planning-artifacts/architecture/architecture-local-arcade-2026-11-19/ARCHITECTURE-SPINE.md
  - _bmad-output/implementation-artifacts/epic-2-context.md
  - docs/game-authoring.md
warnings: ['oversized']
deferred:
  - summary: >-
      The by-ear claims this story's law shapes serve — doorway ordering reads as a mix,
      the approach swell reads as "above the rest", the seated collapse reads as
      "tuned in" — have no executed browser/audio-runtime tier. They are pinned by the
      pure-law tier, the fake-graph rig, and literal param targets; the executed tier
      defers to the Epic-3 harness plus the lead's smoke walk.
    evidence: |-
      Same posture as Story 2.1 (its frontmatter deferred item and the dispatch note:
      fake-AudioContext rigs + pure-law pins are this epic's falsifiable tier; no
      browser-E2E harness exists until Epic 3). A law-value edit that keeps every
      literal pin's arithmetic green changes what is heard — only the walk hears it.
    location: >-
      core/audio/mix.ts ladder/focus multipliers + core/audio/budget.ts constants;
      pinned in core/audio/{mix,budget,manager}.test.ts
    severity: low
---

<intent-contract>

## Intent

**Problem:** The mix has no distance ordering and no focus. Story 2.1 shipped one attract chain per Cabinet with occlusion and the door swell, but every Cabinet sits at the same level: FR-3's proximity ladder — at the doorway only the nearest machines read clearly, one swells as I approach — does not exist, and AD-7's seated focus mix ("tuned in": the room collapses around the machine I sit at, every other Cabinet ducked to an authored near-silent floor) is unimplemented. FR-3/CAP-3 require both, derived only from kernel tick state so a replay reproduces the mix (NFR-10).

**Approach:** Extend the shipped shape in place: `mix.ts` gains the ladder tier (clear/low around the nearest, spatial dead-band + the SAME dwell machine 2.1 shipped) and the focus multiplier (self full / other ducked / none neutral) as pure law; a new pure `core/audio/budget.ts` computes the channel budget — distance-cull + nearest-N inside the awake set (visitor-occupied ∪ near-radius ∪ frustum, AD-7/AD-27 interlock) — and `manager.ts` measures distances and budget flags per chain and feeds them as plain numbers. No new nodes, no new graph, no listener/law-pose change: the law still never sees the listener pose, only manager-measured distances and booleans. Every constant is a labelled placeholder pending Story 3.7's authored finals.

## Boundaries & Constraints

**Always:**
- The gain law stays one product per chain: `ATTRACT_BASE_GAIN * profile.gain * swell * occupancyGate * ladderMultiplier * focusMultiplier`, zeroed when the chain is not audible. Story 2.1's `occupancyGate` (silent ONLY while a visitor sits at this Cabinet), `swellFactor`, occlusion profile, and dwell law stay byte-preserved — their pins stay green.
- Proximity ordering is hysteresis-bounded (CAP-3): a spatial dead-band (a chain within `PROXIMITY_BAND_M` of the nearest still samples "clear") plus the temporal dwell, reusing 2.1's generic `advanceDwell` machine — a listener at a tie boundary never flips the mix per tick.
- Seated focus reads the scheduler's settled occupancy only (`state().cabinets[].occupancy`, AD-23) — exactly `"visitor-seated"` arms the focus layer; `"patron-autoplay"` never does. The Manager mutates no scheduler/player/entry state (the 2.1 AD-23 non-mutation pin still holds).
- Channel budget operates inside the awake set: awake = this Cabinet visitor-seated ∪ within `NEAR_RADIUS_M` ∪ inside the authored frustum cone; budget = within `CULL_RADIUS_M`, nearest `NEAREST_N` by (distance, volumeId tie-break). audible ⇒ awake is a machine-checked interlock (AD-27).
- Everything derives from kernel tick state: manager-measured planar (x/z) distances from `ear()`, occupancy, entry phase. No wall clock in `core/audio/` — the AD-3 source pin scans the directory, so `budget.ts` joins it automatically; no new labelled clock site (the adapter's three `currentTime` sites stay exactly three).
- The frustum leg uses an authored cosine threshold computed from the facing basis (`yaw 0` looks `-Z`, player.ts's convention) — no transcendentals, no camera/aspect input, so it is deterministic and pure.
- Fake-graph rig + pure-law literal pins are this story's falsifiable tier; by-ear claims are labelled, never asserted from the suite.
- Non-ASCII in source string literals via escapes (Rule 14); comments state contracts, not history.

**Never:**
- No new graph nodes or sources — the topology stays one looping chain per placed Cabinet (2.1's pins byte-preserved); no ambience padding, no zone sounds, no UI beeps (UX-DR25). Ambience/zone audio does not exist in this repo; when it arrives (Snack Bar clink M5, AD-25) it rides its OWN authored levels — the focus law ducks cabinet chains only.
- No listener-pose input to the law (pose feeds manager-side ray origin, distances, and `setListenerPosition` — the 2.1 shape).
- No sim-advance sleep tiers, no `loop.ts` wake-set wiring: AD-27's sim liveness is the kernel perf story's; this story's awake predicate is the audio-side candidate set it will later reuse (recorded below).
- No final numbers: `PROXIMITY_BAND_M`, `LADDER_DWELL_TICKS`, `LADDER_FAR_DUCK`, `FOCUS_DUCK`, `NEAR_RADIUS_M`, `AWAKE_FRUSTUM_COS_MIN`, `CULL_RADIUS_M`, `NEAREST_N` are labelled placeholders (Story 3.7 owns every final; AD-27's Deferred row).
- No edits to `core/main.ts` (every seam 2.2 needs is already injected), `generated/`, authored `cabinetPlacements`/`collisionVolumes`/slot config, `core/contract/`, `games/`, `docs/`, either `sprint-status.yaml`, `deferred-work.md`; no git commit or push; never touch the lead's dev server on :5173; no new dependencies.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Doorway ordering | synthetic law inputs: listener at the doorway pose (`ENTRY_SPAWN`), chains at distances derived from authored Wall Slot records (B0/B1/B3 back row; never retyped coords) | exactly the nearest chain reads at full ladder level; every other chain's gain lands `LADDER_FAR_DUCK` x its profile product — literal pins | n/a — law |
| Approach swell | synthetic approach sequence toward one chain | its applied tier flips to clear after `LADDER_DWELL_TICKS`; its gain exceeds every other chain's (literal ordering pin) | n/a — law |
| Ladder boundary flapping | two chains at alternating nearest (sample key flips every tick) | applied tier never flips per tick — dwell holds the last applied tier forever (CAP-3, mirrors 2.1's flap pin) | n/a — hysteresis |
| Seated collapse ("tuned in") | fake-rig manager, TWO injected placements (synthetic records at authored slot ids), scheduler stub seats at one | the non-focus chain's gain param targets settle at the `FOCUS_DUCK` floor product; the focused chain's focus multiplier reads FULL while the 2.1 seated-attract gate keeps its attract silent (composition — see Design Notes 1) | n/a — focus law |
| Busy is not focus | occupancy `"patron-autoplay"` on one chain, no visitor seated | no focus ducking anywhere; the busy cabinet keeps sounding (2.1 gate untouched) | n/a |
| Stand up | occupancy returns to `"attract"` at the seated chain | focus layer lifts the same tick it is observed; other chains' gains restore toward their ladder levels (the 600-tick scheduler re-arm governs the seated cabinet's own attract return — unchanged law) | n/a |
| Budget cull | a synthetic chain beyond `CULL_RADIUS_M`, or awake rank >= `NEAREST_N` | `audible: false`, gain target 0 (loop source keeps running — gain-only law, no start/stop churn) | n/a — budget |
| Awake interlock | budget computed over a mixed room (far-behind chains, seated-beyond-radius chain) | `inBudget ⊆ awake` (audible ⇒ awake, AD-27); a visitor-seated chain is awake even beyond the near radius | n/a — interlock |
| Determinism | the same tick inputs replayed twice | identical mix targets, ladder states, and budget decisions, byte-identical | n/a |
| Fresh-environment ordering | every added/changed test on a clean environment, either order | all pass | n/a |

</intent-contract>

## Code Map

- `core/audio/mix.ts` -- the pure law to EXTEND: `mixStep` :142, `MixInput` :63 (gains: distanceM, nearestOtherM, focus, ladderDwell, awake, inBudget), `MixStep` :77 (gains: ladderDwell, audible), generic `advanceDwell` :95 (reusable for the ladder tier — keys are opaque strings), `DwellState`/`INITIAL_DWELL` :50-56, `ATTRACT_BASE_GAIN` :39, `DWELL_TICKS` :45, `occupancyGate` :136 and `swellFactor`/`SWEEP_PHASES` :126-130 (byte-preserve; 2.1 pins).
- `core/audio/manager.ts` -- the actuator: `tick()` :394 (per-chain occlusion -> `mixStep` -> param targets; extend with distance measure + budget call + new inputs), `ear()` :384 (phase->pose handover; both poses carry yaw — EntryPose :73, PlayerState.yaw :45), `Chain` :290 (gains a ladderDwell field), `ChainDebug`/`state()` :304-318/:425 (gains distanceM, ladderApplied, audible for arcadeDebug), `AudioManagerOptions` :277 (scheduler/player/entry/placements/volumes already injected — no main.ts change needed), `SPEAKER_HEIGHT_M` :86 (chain.speaker is the distance/budget target point), `createWebAudioGraph` :177 + three labelled `currentTime` sites (unchanged — topology and clock boundary stay exactly as 2.1 shipped).
- `core/audio/budget.ts` -- NEW: pure channel budget. Constants `NEAR_RADIUS_M`, `AWAKE_FRUSTUM_COS_MIN`, `CULL_RADIUS_M`, `NEAREST_N` (labelled placeholders); `computeBudget(listener {x,z,yaw}, targets [{volumeId, x, z, visitorOccupied}]) -> { awakeIds, inBudgetIds }` — awake = visitorOccupied ∪ planar-dist <= NEAR_RADIUS_M ∪ cos(bearing, facing) >= AWAKE_FRUSTUM_COS_MIN; inBudget = awake ∩ dist <= CULL_RADIUS_M, first NEAREST_N by (dist asc, volumeId asc tie). Facing basis mirrors player.ts :96-98 (yaw 0 -> -Z); cosine test, no transcendentals.
- `core/audio/occlusion.ts` -- `occlusionIds` :70: read-only in 2.2 (tick still rays per chain); unchanged.
- `core/patrons/scheduler.ts` -- `state()` :100 -> `{tick, cabinets[]}`, `SchedulerCabinetView` :77-85 (`volumeId`, `occupancy`), `Occupancy` :35 — the focus layer's ONLY occupancy source; Manager reads, never writes.
- `core/player.ts` -- `PlayerState` :40 (x, z, yaw :45), `EYE_HEIGHT` :17, basis :96 (facing convention for the frustum test).
- `core/entry.ts` -- `EntryPose` :73 (carries yaw), `pose()` :189, `EntryState`/`EntryPhase` :39-45 — pre-control ear.
- `core/room/cabinets.ts` -- `CabinetPlacement` :163 (record shape for injected synthetic placements), `cabinetPlacements` :191 (ONE authored placement B0 `busy: true` — never edited), `placementGeometry` :224 (center from the slot record; feeds chain.speaker).
- `core/room/slot-config.ts` -- `wallSlots` :66: B0 (-4.2,-5.85), B1 (-2.8,-5.85), B3 (0,-5.85)... authored slot geometry is the multi-chain pin source (inject placements at authored slot ids; never edit the config).
- `core/room/collision-volumes.ts` -- `ENTRY_SPAWN` :52 (0, 5.6 — the doorway pose for the ordering pin), `collisionVolumes` :71 (default volumes seam; cabinet/street never occlude).
- `core/main.ts` -- audio wiring :452-467 (`createAudioManager` gets graph/registry/scheduler/player/entry; `addSystem("audio")` after patrons/seat) and `window.arcadeDebug` :709: NO edit — 2.2's inputs all derive from the already-injected seams.
- `core/audio/manager.test.ts` -- `createFakeGraph` rig :56 (param `targets: number[]` arrays — focus/cull settle pins read these), injected-`placements` seam, the AD-3 `readdirSync` no-wall-clock pin :615-624 (auto-covers new `budget.ts`), the AD-23 non-mutation pin (`bobPhase` witness) — both must stay green.
- `core/audio/mix.test.ts` -- pure-law literal idiom; every existing `mixStep` call site gains the new required `MixInput` fields in the same change set.
- `core/loop.ts` -- `addSystem` order :110-117: audio runs after patrons/seat, so occupancy is this tick's settled truth (AD-23).
- `ci/lint-bans.mjs`, `tools/gen-registry.mjs` -- unchanged; the loop commands re-verify the graph ban and registry drift still hold.

## Tasks & Acceptance

**Execution:**
- `core/audio/budget.ts` -- NEW pure module per the Code Map: awake set (occupied ∪ near ∪ frustum-cos) then distance-cull + nearest-N; exports the labelled-placeholder constants; the interlock `inBudgetIds ⊆ awakeIds` is a structural property of the function (compute budget FROM the awake list, never beside it).
- `core/audio/mix.ts` -- extend the law in place: new constants `PROXIMITY_BAND_M`, `LADDER_DWELL_TICKS`, `LADDER_FAR_DUCK`, `FOCUS_DUCK`, `INITIAL_LADDER_DWELL` (applied `"clear"`); ladder sample `"clear"` iff `distanceM <= nearestOtherM + PROXIMITY_BAND_M` (single chain: `nearestOtherM = Infinity` -> always clear); ladder applied tier via `advanceDwell` (reuse, not a copy); multiplier tables: clear -> 1, low -> `LADDER_FAR_DUCK`; focus self -> 1, other -> `FOCUS_DUCK`, none -> 1; `audible = awake && inBudget`; the gain product gains the two multipliers and is 0 unless audible. `occupancyGate`, `swellFactor`, occlusion/dwell law: byte-preserved.
- `core/audio/manager.ts` -- per tick: planar distance per chain from `ear()` to `chain.speaker`; `seatedVolumeId` from the settled occupancy map (exactly `"visitor-seated"`); one `computeBudget` call from `ear()` (with yaw) over chain targets + occupied flags; feed the new law inputs; store the returned `ladderDwell`; actuation stays gain + lowpass `setTarget` only (no start/stop, no new nodes); extend `ChainDebug` with `distanceM`, `ladderApplied`, `audible`.
- `core/main.ts` -- NO edit; run the main-glue pins to prove the wiring record stayed byte-identical.
- `core/audio/budget.test.ts` -- NEW co-located suite: every I/O-matrix budget row as literal pins (awake legs each leg discriminated: seated-beyond-radius awake, near-radius boundary from both sides, frustum in/out from the authored facing, `inBudget ⊆ awake` over a mixed room, cull beyond `CULL_RADIUS_M`, rank >= `NEAREST_N` out, volumeId tie-break stable, determinism twin).
- `core/audio/mix.test.ts` -- update existing call sites (new required fields, neutral defaults at each call); add pins: doorway ordering (distances derived from authored Wall Slot geometry vs the doorway pose), approach swell ordering, ladder dwell flip-count + alternating-never-flip, `INITIAL_LADDER_DWELL` starts clear, `PROXIMITY_BAND_M` leg (tie band keeps "clear"), focus three-way literals, the seated composition pin (focus `"self"` x gate 0 = attract silent, multiplier contract full — Design Notes 1), `audible=false` -> gain 0.
- `core/audio/manager.test.ts` -- fake-rig tier with TWO injected placements (synthetic `CabinetPlacement` records at authored slot ids B0 + B1; authored list untouched) and an injected scheduler stub: seated collapse (non-focus chain's gain targets settle at the floor product, literal), focus-not-busy (`"patron-autoplay"` never collapses), stand-up lift, `arcadeDebug.audio` ladder/audible record legs, no-cull-today leg (authored single cabinet is audible at authored placeholders). Keep the AD-3 readdir pin and AD-23 non-mutation pin green (they now cover `budget.ts` too).
- Co-located tests cover every I/O-matrix edge case at the Node tier.

**Ledger inbox (Rule 17):** `LEDGER slice 2-2-the-proximity-ladder-and-the-seated-focus-mix-tuned-in` reads empty — nothing to address or decline. (DW-48/DW-49 stay closed wontfix; DW-50/DW-51 are owner=3-7-… — explicitly NOT taken here.)

**Acceptance Criteria:**
- Given the doorway pose and law inputs at distances derived from the authored back-row Wall Slot records, then exactly the nearest chain reads at full ladder level and every other lands `LADDER_FAR_DUCK x profile` — literal pins (FR-3 rung at law tier; the by-ear leg is labelled per frontmatter `deferred`).
- Given a synthetic approach sequence toward one chain, when the law runs, then after `LADDER_DWELL_TICKS` its applied tier is clear and its gain strictly exceeds every other chain's (FR-3 "swells above the rest"; the panner/carrier swell stays 2.1's browser-tier leg).
- Given alternating-nearest samples, then the applied ladder tier never flips per tick (CAP-3 hysteresis: dead-band + dwell, pure function, literal pins).
- Given the fake-rig manager with two chains and the scheduler stub seated at one, when ticks run, then the other chain's gain param targets settle at the `FOCUS_DUCK` floor product and the focused chain's focus multiplier reads FULL (with the 2.1 seated-attract gate keeping that cabinet's attract silent — the composition Design Notes 1 records), and removing the seat lifts the floor (FR-3/AD-7 "tuned in").
- Given occupancy `"patron-autoplay"` with no seated visitor, then no chain ducks to the focus floor (busy is not focus).
- Given chains beyond `CULL_RADIUS_M` or at awake-rank >= `NEAREST_N`, then `audible=false` and their gain targets are 0, and `inBudget ⊆ awake` holds over a mixed-room fixture (channel budget inside the awake set; audible ⇒ awake — AD-7/AD-27 interlock; numbers labelled placeholders, 3.7 finals).
- Given the same tick inputs replayed twice, mix targets, ladder states, and budget decisions are identical; the AD-3 no-wall-clock scan now includes `budget.ts` (plant `Date.now` there -> red) and the adapter still counts exactly three labelled `currentTime` sites (NFR-10).
- Given the fake rig, the graph still holds exactly one looping chain per placement — no new node kinds, no ambience/UI-beep source anywhere; `node ci/lint-bans.mjs` stays green (UX-DR25, AD-7).
- Given the full loop (`npm run typecheck`, `npm test`, `node ci/depcheck.mjs`, `node ci/lint-bans.mjs`, `node tools/gen-registry.mjs && git diff --exit-code -- generated/`) then all green, with Story 2.1's law pins byte-preserved; `npm run build` once at story end green.
- Given a fresh environment, every added or changed test passes in either order.

## Spec Change Log

## Review Triage Log

## Design Notes

**Governing AD ids (Rule 6):** AD-7 (one Core Audio Manager owns the graph; proximity ladder + seated focus mix + channel budget = distance-cull + nearest-N inside the awake set; mix derives solely from tick state; duck levels authored data), AD-27 (audible ⇒ awake interlock; awake set is a pure tick-state function; every number is on AD-27's Deferred row — 3.7 finals), AD-3 (no wall clock in the law; the AD-3 scan covers the new module), AD-23 (occupancy is scheduler-owned, read via `state()`; the focus layer reads the same settled occupancy the audio system already sees per the fixed in-tick order), AD-15 (unchanged: the Manager stays one supervisor-wrapped system), AD-18/AD-11 (sealed bundle untouched — no new assets or registry fields), AD-1/AD-2 (no game half involvement; depcheck green), AD-14 (Core side stays TypeScript).

**plan: decisions recorded (unattended-run policy).**
1. "Focused cabinet at full level" vs 2.1's seated-attract silence: the focus layer is a MULTIPLIER — the seated chain's focus multiplier is FULL (1); 2.1's `occupancyGate` keeps that cabinet's attract loop silent while a visitor sits (its busy-cabinet/seated pins are byte-preserved law). The "full level" is the contract the machine's own audio rides (attract returns on stand; play-mode audio arrives with the game-initiated request surface — Moon Patrol reimplementation epic). AD-7 ducks "every OTHER cabinet's audio" — the ducking law is fully live in this story for every non-focus cabinet. Composition is pinned explicitly so neither law can silently erase the other.
2. Ladder tier is binary clear/low around the nearest: `"clear"` iff within `PROXIMITY_BAND_M` of the nearest chain (spatial dead-band leg), then the SHIPPED generic `advanceDwell` machine (temporal leg) — Rule 2 extend, not copy; the dwell machine's keys are opaque strings, so the ladder reuses it verbatim. A separate constant `LADDER_DWELL_TICKS` lets 3.7 tune ladder and occlusion timing apart.
3. `budget.ts` lives in `core/audio/`: it is the audio-side awake predicate + nearest-N selection, and the existing AD-3 `readdirSync` clock scan auto-enrolls it. AD-27's kernel sim wake-set (loop-scheduler tiering, sleeping sims) is NOT this story — no `loop.ts` change, no sim tiering; when the perf story lands it reuses/extends this predicate rather than re-deriving it (hand-off recorded here and in the Auto Run Result, mirroring 2.1's 3.7 hand-off posture). Today one Cabinet is placed, so interlocks hold trivially at the manager tier and the multi-chain legs pin at law/budget tier with synthetic injected placements.
4. Frustum leg: authored `AWAKE_FRUSTUM_COS_MIN` cosine threshold vs the facing basis (yaw 0 -> -Z), not the renderer's camera (main.ts :136 is 60 deg vertical, aspect-dependent — a render-layer value, not tick state). Keeps the awake function pure, deterministic, and aspect-free; 2.4's FOV row and 3.7's numbers may later connect them.
5. Budget silence vs focus floor are layered, not competing: outside the budget -> gain 0; inside the budget but non-focus while seated -> the `FOCUS_DUCK` near-silent floor. At the shipped placeholders (`NEAREST_N = 4`, `CULL_RADIUS_M = 25` — beyond the room's ~22.7 m diagonal) nothing in today's one-Cabinet room is budget-silent, so "tuned in" ships as the floor, not as silence; 3.7 tunes the numbers (AD-27 Deferred).
6. The AC's "ambience and zone sound following their own authored levels" clause: NO ambience or zone audio source exists in this repo (UX-DR25: the soundscape IS the seek system — never ambience padding; zone audio = Snack Bar clink, M5/AD-25). Rule 1 note: no ambience/zone consumers in this story; the first is the M5 Snack Bar. The focus law ducks cabinet chains only — non-cabinet audio, when it exists, is outside the chain set and keeps its authored level by construction. Never-add check: the fake-rig node-kind census (one chain per placement, no new kinds).
7. The new `MixInput` fields are REQUIRED (neutral values written explicitly at each existing call site in the same change set) — an optional-fields design would let the law's new legs silently default in future callers; 2.1's "narrow, never delete" precedent carries: existing pins keep asserting exactly what they asserted.
8. Multi-machine AC legs pin at law/budget tier with synthetic distances derived from the authored Wall Slot records (B0/B1/B3 exist in slot-config; manager-tier pins inject synthetic `CabinetPlacement` records at authored slot ids). The authored `cabinetPlacements` list stays one entry — room presence is the ledger's job (AD-9/AD-10), never this story's.

**Extend, don't copy (Rule 2).** The ladder tier extends `advanceDwell` (mix.ts :95) — same machine, new key space. The focus multiplier extends the `mixStep` product. `budget.ts` has no existing sibling (the repo has no wake set — 2.1 Design Notes verified the scan); the future kernel sim wake-set story is named above as the unification owner. The fake-rig two-chain tests extend 2.1's `createFakeGraph` and injected-`placements` seam — no new rig class.

**Falsifiability (for implement/QA to demonstrate).** Delete the ladder dwell usage (applied flips on the first sample) -> the ladder flap + flip-count pins red; `LADDER_FAR_DUCK` -> 1 -> the low-tier and doorway-ordering pins red; `FOCUS_DUCK` -> 1 -> the collapse and floor-literal pins red; seat detection to include `"patron-autoplay"` -> the focus-not-busy pin red; `seatedVolumeId` wired wrong (all chains "other") -> the composition pin (focused chain full) red; `PROXIMITY_BAND_M` -> 0 -> the tie-band pin red; drop the seated-occupied leg from `budget.ts` -> the seated-beyond-radius awake pin red; budget computed beside instead of from the awake list -> the `inBudget ⊆ awake` interlock pin red; `NEAREST_N` -> 0 or `CULL_RADIUS_M` -> 0 at the law tier -> the audible-zero pins red; plant `Date.now()` in `budget.ts` -> the AD-3 readdir pin red; add a new graph node kind in the manager -> the topology-census pin red.

**Consumed-by:** Story 2.4 (Settings master volume acts on the Manager; the "focus-mix strength" row scales this story's focus layer — its handle is the `FOCUS_DUCK`/focus-multiplier contract), Story 2.6 (M1 walk rung 1: the ladder and tuned-in are what the walk hears), Story 3.7 (finals for every placeholder constant here, per AD-27's Deferred row), the kernel sim-liveness story (extends `budget.ts`'s awake predicate instead of re-deriving it), the Moon Patrol reimplementation game epic (first audio riding the focused chain's full-level multiplier via the future request surface). **Consumes:** Story 2.1's shipped law and graph (`core/audio/{mix,manager,occlusion}.ts` — extended in place), `core/patrons/scheduler.ts` settled occupancy, `core/player.ts`/`core/entry.ts` ear pose + yaw, `core/room/cabinets.ts` placements + `slot-config.ts` geometry, `core/room/collision-volumes.ts` (doorway pose for pins), `core/loop.ts` system seat (unchanged order).

**Continuity from Story 2.1 (done):** 2.1 left the law path distance-invariant on purpose (the panner carries distance; its Design Notes named channel budget / nearest-N / awake set and the seated focus mix as 2.2's). This story layers onto exactly that shape: the law still never sees the listener pose — distances and budget flags arrive as plain manager-measured numbers. The 2.1 spec's follow-up recommendation (re-review after 2.2 layers onto the Manager) and its 3.7 hand-offs (DW-50/DW-51) are untouched by this spec — they stay owner=3-7-….

## Verification

**Commands:**
- `npm run typecheck` (loop) -- expected: clean.
- `npm test` (loop) -- expected: all green including `core/audio/{mix,budget,manager}.test.ts` and every 2.1 pin unchanged; if one foreground call runs long, split by test file (`node --test <file>...`) and land all files green in the session.
- `node ci/depcheck.mjs` (loop) -- expected: AD-1 import direction clean (budget.ts is core-internal, type-only imports elsewhere).
- `node ci/lint-bans.mjs` (loop) -- expected: clean, rules unchanged.
- `node tools/gen-registry.mjs && git diff --exit-code -- generated/` (loop) -- expected: no drift (this story adds no registry field).
- `npm run build` (once, at story end) -- expected: clean static bundle.

**Shared surfaces:** `window.arcadeDebug.audio` chain record in `core/main.ts` (entry/visit-arc test readers — 2.2 ADDS `distanceM`/`ladderApplied`/`audible` fields per chain; readers that count or match existing fields must stay green); `MixInput`/`MixStep` shape in `core/audio/mix.ts` (mix.test.ts call sites ride the same change set); the `core/audio/` file list (the AD-3 `readdirSync` clock scan auto-rolls in `budget.ts`); 2.1's shipped law constants (`ATTRACT_BASE_GAIN`, `DWELL_TICKS`, `OCCLUSION_PROFILES`, `occupancyGate`, `swellFactor`) — pins byte-preserved. Hermeticity: every test added or changed passes on a fresh environment, in either order; no `core/audio/` test touches :5173, another test's state, or execution order.

**Manual checks:**
- Start your own dev server on a fresh port (never the lead's :5173): after the first gesture and the door beat, `arcadeDebug.audio.chains[0]` shows `audible: true`, `ladderApplied: "clear"`, a plausible `distanceM`; sit at B0 and the record shows the occupancy flip — the audible by-ear collapse is the lead's smoke / Epic-3 harness tier, report it as deferred, never claim it from the suite.

## Auto Run Result

Status: ready-for-dev
Blocking condition: none
