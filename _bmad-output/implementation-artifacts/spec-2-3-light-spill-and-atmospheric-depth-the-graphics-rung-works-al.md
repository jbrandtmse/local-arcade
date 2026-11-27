---
title: 'Story 2.3: Light spill and atmospheric depth — the graphics rung works alone'
type: 'feature'
created: '2026-11-27'
status: 'ready-for-dev'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - _bmad-output/planning-artifacts/architecture/architecture-local-arcade-2026-11-19/ARCHITECTURE-SPINE.md
  - _bmad-output/implementation-artifacts/epic-2-context.md
warnings: ['oversized']
deferred:
  - summary: >-
      The by-sight claims this story's law shapes serve — the haze falloff reads as
      atmospheric depth, the spill reads as glow bleeding around the pillars, the muted
      walk reads as a findable gradient on screen — have no executed browser/render tier.
      They are pinned by the pure-law tier, fake scene-graph intensity-settle pins, and a
      real-three headless anchor tier; the executed visual tier defers to the Epic-3
      harness plus the lead's smoke walk.
    evidence: |-
      Same posture as Stories 2.1/2.2 (their frontmatter deferred items: no browser-E2E
      harness exists until Epic 3). A law-value edit that keeps every literal pin's
      arithmetic green changes what is seen — only the walk sees it. The UX-DR21 muted
      WALK itself is Story 2.6's gated commitment; this story ships the graphics rung
      that precondition covers.
    location: >-
      core/room/atmosphere.ts law constants; pinned in core/room/atmosphere.test.ts,
      scene.test.ts, cabinets.test.ts real-three tier
    severity: low
  - summary: >-
      The spill-anchor and gradient laws are authored against the room as shipped — one
      Cabinet placement, the authored pillar pair — with multi-cabinet legs pinned via
      synthetic injected placements at authored slot ids. How the tier behaves with the
      final authored room contents (more cabinets, more blockers, lit-while-busy tuning)
      is Story 3.7's authored-data call.
    evidence: |-
      One authored placement exists (cabinets.ts cabinetPlacements, B0); room growth is
      the ledger's job (AD-9/AD-10), never this story's. Mirrors 2.2's injected-B0/B1
      posture, whose review upheld it (D3 false).
    location: >-
      core/room/atmosphere.ts spillAnchors/gradient consumers; fixtures in
      core/room/atmosphere.test.ts
    severity: low
---

<intent-contract>

## Intent

**Problem:** The room's visual seek rung is inert: the per-cabinet halo and spill point lights are built once and never touched, no mechanism makes distant machines dim through atmosphere, and nothing carries the proximity gradient into the blind spots where pillars occlude sound. A Visitor with master audio muted (UX-DR21 precondition) has no pull ladder to walk — rung 2 (find it by glow) does not exist (UX-DR17).

**Approach:** A separable authored atmosphere tier in `core/room/`: pure law functions (haze falloff toward a never-zero Room-Black floor, an attract-glow pulse bounded by the flash-rate law, spill anchors computed from the occluder volume records) plus authored point-light nodes mounted around occluder edges. `core/main.ts` `frame()` ramps the existing cabinet halo/spill lights and the new spill nodes from kernel tick state — the established `frontDoorRamp` idiom. Law shapes are pinned with labelled placeholders; number finals are Story 3.7's authored-data pass (2.1/2.2 posture).

## Boundaries & Constraints

**Always:**
- The glow/spill tier is cabinet-mesh-independent: it mounts only from `placementGeometry`/slot records, `collisionVolumes` records, `SHELL` face-height constants, and the existing cabinet-light mount sites (DW-29 re-audit is running lead-side — no AC may reference shell profiles, part lists, or mesh internals).
- One geometry source, two mechanisms: the visual tier reads `core/room/collision-volumes.ts` records directly and NEVER calls `core/audio/occlusion.ts` — audio occlusion is raycast, light bleed is authored around the same blocker geometry (asymmetric by design, epics.md 2.3 AC2 / DESIGN.md Elevation & Depth).
- All color is light-from-a-machine (UX-DR1): new hues live in `tokens.ts` only; the tier adds point lights only — no painted glow sheets, no emissive additions. Emissive stays exactly 2 faces per Cabinet (2.0 pins).
- Glow derives solely from kernel tick state (camera/entry pose, cabinet phase, placements, volumes) — never wall-clock; actuation is light `intensity`/`distance` writes in `frame()`, like the front-door ramp.
- Distant lit machines dim toward Room Black but never read dead: the haze law has an authored never-zero floor; every lit Cabinet keeps glowing (liveness tiers invisible, AD-27).
- Every tunable — haze falloff coefficient, haze floor, pulse period and floor, spill offsets/reach/mount heights — is a labelled placeholder. The flash ceiling of 3/sec (NFR-9) is owner-fixed as a LAW shape; the machine probe is Story 3.7.
- Emissive faces are never distance-ramped: the haze tier acts on point lights only, so the DW-23 exposure budget and screen-stays-brightest law ride untouched.

**Never:**
- No edits to cabinet shell internals (`SHELL` profiles, `SIDE_PROFILE`/`INNER_PROFILE`, part meshes), `cabinetPlacements`, or the `collisionVolumes` list; no new `Three` seam vocabulary (no Fog, no bloom/post-processing, no new geometry kinds beyond what the seam already exposes); no new dependencies and no `three`/`@types/three` version change.
- No `games/`, registry, or ledger edits; no browser-E2E tier (none exists until Epic 3); no touching the lead's dev server on :5173; no HUD/wayfinding/painted chrome (AD-24, UX-DR1).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Near source | camera at the authored doorway pose (`ENTRY_SPAWN`), B0 at authored slot | `hazeFactor` = 1; halo/spill light intensities at nominal x pulse — literal pins | n/a |
| Far corner | camera at the farthest authored corner (room diagonal ~22.7 m, 2.2's authored figure) | `hazeFactor` >= `HAZE_FLOOR` > 0 and strictly below near; fake-rig settles halo/spill intensities at nominal x factor, never 0 (never read dead, UX-DR17) | n/a |
| Monotone falloff | distances swept along the authored axis | non-increasing in distance; strictly decreasing until the floor clamps | n/a |
| Pillar bleed | authored pillar volume (±3.5, 2.1) + B0 as source | spill anchors outside the volume AABB at `SPILL_OFFSET_M` on the far side from the source; per relevant edge: floor-sheen mount + ceiling-bounce mount; node count = authored formula over volume records | n/a |
| Blind-spot gradient | two synthetic placements (B0 + B1 at authored slot ids); ear at an aisle point behind the pillar where the `occlusion.test.ts` `segHitsRect` sightline idiom says direct sight is broken | spill-glow intensities order by source distance exactly as in the open-floor case — the proximity gradient survives where sound is occluded (AC2/AC3) | n/a |
| Attract pulse | phase sequence over one `CABINET_PHASE_CYCLE_TICKS` (240) | glow-pulse multiplier stays in [`GLOW_PULSE_FLOOR`, 1], never 0 (always glowing); exactly one gentle authored cycle per phase cycle; `60 / GLOW_PULSE_PERIOD_TICKS` <= 3 literal (NFR-9 law shape) | n/a |
| Phase twin | identical phase inputs replayed twice | identical multiplier sequence, inputs unmutated (mirrors `budget.test.ts:152-162`) | n/a |
| No-audio independence | atmosphere law/builder run with `core/audio/*` absent from the import graph | gradient, pulse, and anchors unchanged; source pin: `atmosphere.ts` imports nothing from `core/audio/` | import scan fails red |
| Clock plant | `Date.now()` planted in `atmosphere.ts` | the module-scoped no-wall-clock scan pin red (mirrors `manager.test.ts:615-624`) | n/a |
| Emissive census | built scene graph (fakeThree) | exactly 2 emissive materials per Cabinet, intensities [1.0, 1.2] (2.0 pins byte-preserved); atmosphere tier contributes 0 emissive nodes | census pin red |

</intent-contract>

## Code Map

- `core/room/atmosphere.ts` -- NEW, the tier. Pure laws: `hazeFactor(distanceM)` (monotone non-increasing, clamped to [`HAZE_FLOOR`, 1]; labelled coefficient + floor); `glowPulse(phaseStep)` -> multiplier in [`GLOW_PULSE_FLOOR`, 1], one gentle cycle per attract cycle; `flashRateHz(periodTicks)` = 60/periodTicks with the <= 3 law guard; `spillAnchors(sourceCenter, occluderVolume)` -> labelled anchors from the volume record ONLY (outside the AABB, far side from source, floor + ceiling mounts, formula-count); builder `buildSpillNodes(THREE-seam, volumes, placements)` creating nodes ONCE (buildRoomScene idiom) returning handles `{volumeId, mount, light: Placed}`. Exports the labelled constants. No `three` import (fakeThree idiom), no `core/audio` import.
- `core/room/scene.ts` -- Three seam :120-146 (pointLight; `Placed` :100-109 already carries animatable `intensity`/`distance` — the ramp vocabulary, extend not copy); existing per-cabinet `spill` + `halo` point lights built from `placementGeometry` + face heights at :686-691 — the mount sites, unchanged; `RoomHandles` :258-290 GAINS `cabinetLights: {volumeId, halo, spill}` so `frame()` can ramp them; `buildRoomScene` :302-764, `addLight` :203-207, ambient/lights tail :756-761.
- `core/room/cabinets.ts` -- attract phase law :359-373 (`CABINET_PHASE_CYCLE_TICKS` 240, `stepCabinetPhase`, `screenPaintStep` — byte-preserve); `CabinetPlacement` :163-189 and the sole B0 placement :191-202 — read-only; `placementGeometry` :224-238; `CABINET_LIGHT_INTENSITY/_REACH/_STANDOFF_M` :418-428 (the nominal the haze multiplies); `FACE_ILLUMINANCE_CEILING/_FLOOR` :467-468 (DW-23 exposure budget, untouched — emissive never ramped).
- `core/room/collision-volumes.ts` -- `CollisionVolume` :37-44; pillars at (±3.5, 2.1) in the list :71-177; `ENTRY_SPAWN` :52 (doorway pose for pins); INTERIOR 19x12.5 :47 — the single occluder-geometry source, read-only.
- `core/audio/occlusion.ts` -- `OCCLUDER_KINDS` ["wall","pillar","door"] :25, `occlusionIds` :70 — context for which blockers matter (same set the visual tier authors around); NEVER imported by atmosphere.ts (asymmetry pin).
- `core/main.ts` -- renderer + ACES/exposure :122-133 and `setClearColor(ROOM_BLACK,1)` :129 unchanged; scene-assembly block (calls `buildRoomScene`) gains one atmosphere build; `frame()` :516-687 — camera pose source :527-535, `frontDoorRamp` light-ramp block :541-555 is THE idiom to mirror; add the glow-ramp block; `window.arcadeDebug` :84-96/:709 gains an additive `atmosphere` leg (per-cabinet `{distanceM, hazeFactor, pulseApplied, glowIntensity}`).
- `core/room/door.ts` -- `frontDoorRamp(progress)` :169-181 + the two dark-built lights :739-752 (scene side) — the existing sibling frame-side light ramp (Rule 2).
- `core/room/tokens.ts` -- ROOM_BLACK :9, glow anchors :21-27, `toCss` :90 — hue home for any new hue (hue-home guard auto-covers).
- `core/room/scene.test.ts` -- `fakeThree()` :135-295 (records MatRec `emissive`, NodeRec parents, lights), `fakeWorld()` :324-384, world-object count FORMULA :616-634 (extends with `built.lights` — new lights must extend the formula, never magic), emissive-pair pin :573-583, ACES substrate test :719-751, hue-home guard :1185-1208 — all byte-preserved.
- `core/room/cabinets.test.ts` -- real-three headless tier :764-1032: `buildThree()` :774-794 mirrors main.ts, `updateMatrixWorld` + `Box3` queries — the pattern for pinning spill-anchor world positions; emissive-pair :975-986.
- `core/room/occlusion.test.ts` -- `segHitsRect` :25 sightline pins — the fixture idiom for "where sight is broken" WITHOUT importing the audio module.
- `core/audio/{budget,manager}.test.ts` -- twin pin shape `budget.test.ts:152-162`; AD-3 `readdirSync` no-wall-clock scan `manager.test.ts:615-624` — mirror the mechanism scoped to `core/room/` for `atmosphere.ts`.
- `core/main-glue.test.ts` -- wiring/order string pins :440-507 (system order unchanged; new frame block and build call must keep existing pins green).
- `ci/lint-bans.mjs`, `ci/depcheck.mjs`, `tools/gen-registry.mjs` -- unchanged; loop re-verifies bans, import direction, registry drift.

## Tasks & Acceptance

**Execution:**
- `core/room/atmosphere.ts` -- NEW pure module per the Code Map; constants labelled placeholders; `spillAnchors` reads volume records only (no raycast, no `core/audio` import — asymmetry by construction); builder uses the existing seam primitives (pointLight) so `fakeThree` needs no extension.
- `core/room/scene.ts` -- extend `RoomHandles` with `cabinetLights` handles (keep the created lights); counts/comments updated; nothing else moves.
- `core/main.ts` -- build the spill tier once at scene assembly; in `frame()` ramp per cabinet: `nominal x glowPulse(phase) x hazeFactor(cameraDistance)` onto the halo/spill handles, and each spill node's intensity by its source cabinet's haze factor (the bleed carries the gradient into the blind spot); add the additive `arcadeDebug.atmosphere` leg. Pose source = the same entry-then-player pose the camera uses; no new per-frame state.
- `core/room/atmosphere.test.ts` -- NEW co-located suite: every I/O-matrix row as literal pins (near/far/monotone/floor legs from authored geometry distances; anchors outside-AABB both pillars for both sources; far-side selection; count formula; blind-spot gradient ordering with synthetic B0+B1 and the segHitsRect-shaped fixture; pulse range/rate/one-cycle; phase twin; no-wall-clock scan; asymmetry import scan).
- `core/room/scene.test.ts` -- extend the world-object/light count formula for the new nodes; atmosphere-contributes-zero-emissive census leg; existing pins byte-preserved.
- `core/room/cabinets.test.ts` -- one real-three tier pin: built spill nodes' `matrixWorld` positions sit outside each authored pillar AABB at the labelled offsets (Box3 assertion); no cabinet-internals touched.
- `core/main-glue.test.ts` / `core/room/scene.test.ts` fake-rig -- consumer Integration pin: scripted camera move toward B0 raises the halo/spill intensity values in the recorded graph (main `frame()` reads the handles and produces observable effect).

**Ledger inbox (Rule 17):** `LEDGER slice 2-3-light-spill-and-atmospheric-depth-the-graphics-rung-works-al` reads empty — nothing to address or decline.

**Acceptance Criteria:**
- Given the haze law swept from the doorway pose to the farthest authored corner (~22.7 m), then it equals 1 near, is strictly decreasing until clamped, and at far distance >= `HAZE_FLOOR` > 0 (literal pins); and in the fake graph a far camera settles the cabinet halo/spill `intensity` at nominal x factor, never 0 — distant machines dim toward Room Black but never read dead (AC1, UX-DR17).
- Given the authored pillar volumes and B0, when the spill tier builds, then the node set per relevant edge (floor-sheen + ceiling-bounce mounts) sits outside the volume AABB at `SPILL_OFFSET_M` on the side away from the source, count pinned by formula over volume records, pinned at the fake-graph and real-three Box3 tiers (AC2).
- Given B0 + synthetic B1 and an ear behind the authored pillar where the sightline idiom says direct sight is broken, then spill-glow intensities order by source distance identically to the open-floor ordering — the proximity gradient stays visible through the blind spots where sound is occluded (AC2/AC3; the muted WALK itself is 2.6's, per frontmatter `deferred`).
- Given a source scan of `core/room/atmosphere.ts` (and its main.ts wiring), then it imports nothing from `core/audio/` and calls no occlusion raycast — light bleed is authored around the same blocker geometry, never folded into the audio mechanism (AC2 "asymmetric by design").
- Given the phase sequence over one attract cycle, then the glow-pulse multiplier stays within [`GLOW_PULSE_FLOOR`, 1] (never black — always glowing), performs exactly one gentle cycle, and `flashRateHz(GLOW_PULSE_PERIOD_TICKS)` <= 3 holds as a literal law-shape pin (NFR-9; L2 probe lands 3.7); replayed inputs give the identical sequence; the screen scan-band law stays byte-preserved (a repaint drift is not a flash).
- Given the built graph, then emissive materials remain exactly 2 per Cabinet at [1.0, 1.2] (2.0 pins byte-preserved), the atmosphere tier contributes zero emissive/painted-glow nodes, and every new hue lives in `tokens.ts` (hue-home guard green) — no zone hue painted as chrome (UX-DR1).
- Given the tick-state contract, then planting `Date.now()` in `atmosphere.ts` reds the new module-scoped no-wall-clock pin, and `node tools/gen-registry.mjs && git diff --exit-code -- generated/` stays drift-free (no registry field; AD-18 sealed).
- Given the full loop (`npm run typecheck`, `npm test`, `node ci/depcheck.mjs`, `node ci/lint-bans.mjs`, `node tools/gen-registry.mjs && git diff --exit-code -- generated/`) then all green with every 2.0/2.1/2.2 pin byte-preserved; `npm run build` once at story end green.
- Given a fresh environment, every added or changed test passes in either order.

## Spec Change Log

## Review Triage Log

## Design Notes

**Governing AD ids (Rule 6):** AD-7 (the occluder collider set is the sightline-breaking reference — one geometry carves sound AND depth; the sharing is asymmetric for light: authored spill; Core owns the room services), AD-3 (all glow derived from tick state read at tick/frame time — no adapter-internal frame-driven animation, no wall clock; the ramp mirrors `frontDoorRamp`), AD-15 (frame actuation writes presentation-graph intensities only, never sim state — the established coin-door/door-ramp idiom), AD-27 (visible ⇒ always awake AND glowing — the never-zero haze floor keeps liveness invisible; AD-27's Deferred row owns every number, finals 3.7), AD-18/AD-11 (sealed bundle: authored constants in `core/room`, no new assets, no registry fields, drift check green), AD-24 (glow is light, never chrome: no painted markers, no wayfinding), AD-14 (Core stays TypeScript), AD-1/AD-2 (no game half involvement; depcheck green), AD-9/AD-10 (placements and volume lists unchanged — room growth stays the ledger's job).

**plan: decisions recorded (unattended-run policy).**
1. "Faint dust-haze" is an authored attenuation LAW on the light tier, not three.js `Fog`. Fog would be new `Three`-seam vocabulary, would fade the Room-Black ceiling and the emissive faces uncontrolled, and would fight the DW-23 tone-curve re-derivation (scene.test.ts:719-751). The AC's "attract glow halos and marquee light fall off through haze" reads exactly as the existing per-cabinet `halo`/`spill` point lights (scene.ts:686-691) distance-ramped toward an authored floor. If 3.7's authored pass later prefers literal fog, it extends the seam with its own pins; 2.3's law shapes stay valid either way.
2. "Floor sheens" and "ceiling bounce-cones" are authored point-light mounts — a low grazing mount past the occluder edge (reads as a sheen on the carpet it lights) and a ceiling-hung mount (reads as bounce) — not painted glow sheets and not volumetric cone geometry. Do's/Don'ts bars painted glow on room surfaces (UX-DR1); `pointLight` is already in the seam; the era-true read rides hue + mount. Literal cone shapes would be 3.7/Epic-3 authored-data territory.
3. Flash law: glow pulse = one gentle swell per attract cycle (`GLOW_PULSE_PERIOD_TICKS` placeholder 120 => 0.5 Hz, well under the owner-fixed 3/sec ceiling — the ceiling is a number stated in the PRD/epics, used as given, never re-derived; the placeholder is the tunable). `flashRateHz` + the <= 3 guard is the law-shape pin; the machine probe across all authored elements is 3.7's L2 probe. The screen's 10-tick scan-band repaint is drift, not a flash: it is byte-preserved and 2.0-pinned.
4. The pulse applies to every lit Cabinet identically, independent of occupancy: "both standard models always glowing, always performing" (DESIGN.md Components); no `core/patrons/` coupling in this story (Patron drama needs no light interaction today — grep-confirmed; rung 3 stays untouched).
5. DW-29 separation contract: the tier attaches ONLY to (a) the existing cabinet light mount sites (which derive from `placementGeometry` + `SHELL` face-height constants — authored data a mesh rebuild re-derives automatically) and (b) world anchors from `collisionVolumes` records. No AC, task, or pin names a profile, part, or mesh. A cabinet-mesh change lands as a cabinets-only diff that re-mounts this tier untouched.
6. Emissive faces are never ramped (Boundaries): the haze floor and the DW-23 face-illuminance band (CEILING 1.18 / FLOOR 0.17) both concern the emissive sheets; keeping them static makes "screen stays the brightest face" trivially byte-preserved while "never read dead" is carried additionally by the emissive faces themselves staying lit.
7. Dwell machinery is deliberately NOT reused from mix.ts: the visual gradient is continuous (no binary tier flip), so no dead-band/dwell is needed; a hysteresis on a continuous ramp would be an unjustified copy (Rule 2 reverse: record why).
8. Multi-cabinet and future-room legs pin with synthetic injected `CabinetPlacement`s at authored slot ids (B1/B3 exist in slot-config); the authored `cabinetPlacements` list stays one entry (frontmatter deferred item 2).

**Extend, don't copy (Rule 2).** The ramp extends `Placed`'s animatable `intensity`/`distance` (:100-109) and mirrors its built sibling `frontDoorRamp` (door.ts:169-181) — same frame-side actuation idiom, new law inputs. `hazeFactor`/`spillAnchors`/`flashRateHz` have no existing sibling: the investigation grep-verified zero distance handling, zero fog, and zero flash law in the visual tier — new pure module, not a copy. The no-wall-clock scan mirrors manager.test.ts's `readdirSync` mechanism scoped to `core/room/` (extend that idiom to the new module rather than touching the audio scan).

**Integration ACs (Rule 1):** consumer `core/main.ts` `frame()` reads the atmosphere + cabinet-light handles and produces observable effect: a scripted camera move toward B0 raises the recorded halo/spill intensities in the fake graph (pin named under Tasks). **Consumed-by:** Story 2.4 (Settings comfort presets + vignette row act on authored light/pulse levels — their handle is this story's pulse/haze contract and the 3/sec law), Story 2.6 (M1 walk rung-2: the master-muted walk rides this gradient), Story 3.7 (finals for every placeholder per AD-27's Deferred row + the L2 flashes-rate probe measures against `flashRateHz`), the lead's smoke walk (`arcadeDebug.atmosphere` leg). **Consumes:** `core/room/collision-volumes.ts` volume records; `core/room/cabinets.ts` placements + phase law + `CABINET_LIGHT_*` nominals; `core/room/scene.ts` Three seam + existing light mounts; `core/room/tokens.ts` hues; `core/main.ts` entry/player pose source.

**Falsifiability (for implement/QA to demonstrate).** Delete the frame() ramp call -> the near/far intensity-ordering pin red; `HAZE_FLOOR` -> 0 -> the never-dead literal + far-settle pins red; `SPILL_OFFSET_M` sign flipped (anchor inside the AABB) -> the Box3 containment pin red; drop the ceiling mount from the builder -> the count-formula pin red; `GLOW_PULSE_PERIOD_TICKS` -> 15 -> the flash-rate law pin red (0.25 s period => 4 Hz); `GLOW_PULSE_FLOOR` -> 0 -> the always-glowing pin red; import `occlusionIds` into atmosphere.ts -> the asymmetry source pin red; plant `Date.now()` in atmosphere.ts -> the room-scoped clock scan pin red; add an emissive material to a spill node -> the emissive-census pin red; freeze the pulse (constant 1) -> the one-cycle-per-phase-cycle pin red.

**Ledger inbox:** empty slice (above). **Continuity from Story 2.2 (done):** 2.2's ladder/focus law and the 2.1 graph stay untouched — this story is the sibling VISUAL rung of the same pull ladder and shares only the volume data, never the audio pipeline; the injected-placement fixture idiom, the twin shape, and the labelled-placeholder posture are carried forward verbatim from 2.2.

## Verification

**Commands:**
- `npm run typecheck` (loop) -- expected: clean.
- `npm test` (loop) -- expected: all green including `core/room/{atmosphere,scene,cabinets}.test.ts`; if one foreground call runs long, split by test file (`node --test <file>...`) and land all files green in the session.
- `node ci/depcheck.mjs` (loop) -- expected: AD-1 import direction clean (atmosphere.ts is core-internal).
- `node ci/lint-bans.mjs` (loop) -- expected: clean, rules unchanged.
- `node tools/gen-registry.mjs && git diff --exit-code -- generated/` (loop) -- expected: no drift (this story adds no registry field).
- `npm run build` (once, at story end) -- expected: clean static bundle.

**Shared surfaces:** `core/room/scene.test.ts` world-object/light count formula and emissive-pair/emissive-census pins (this story EXTENDS counts with new lights; every existing literal stays); `window.arcadeDebug` gains the additive `atmosphere` leg (field-accessed readers stay green, no `deepEqual` readers of the whole object — the 2.2 posture); the `core/room/` file list (the new room-scoped clock scan enrols `atmosphere.ts` automatically); hue-home guard token floor (auto-covers new tokens); main.ts wiring record read by `main-glue.test.ts` string pins. Hermeticity: every test added or changed passes on a fresh environment, in either order; no room test touches :5173, another test's state, or execution order.

**Manual checks (deferred tier, report never claim):** start your own dev server on a fresh port (never the lead's :5173) — `arcadeDebug.atmosphere` shows per-cabinet `distanceM`/`hazeFactor`/`pulseApplied`/`glowIntensity` moving as you walk away from B0, and a stand behind a pillar still shows glow intensity ordered by distance; the by-sight/browser tier stands in frontmatter `deferred` item 1 — the visual read is the lead's smoke / Epic-3 harness, never the suite.

## Auto Run Result

Status: ready-for-dev
Blocking condition: none

Plan pass (2026-11-27): spec written from the epics.md Story 2.3 block (epics.md:463-475, owner-fixed ACs), SPEC.md/UX-DR1/17/21 + DESIGN.md Elevation & Depth, the epic-2-context cache (attempt 5, reused — not recompiled), Story 2.2 continuity (done spec: fixture/twin/placeholder posture carried), and one synchronous investigation subagent's presentation-layer map. Self-review against the READY-FOR-DEVELOPMENT standard: pass (no intent gaps; the haze-as-law and spill-as-point-lights readings are recorded as plan: decisions, none touching an AD or an owner-fixed value). Ledger inbox empty — nothing addressed or declined. Governing ADs recorded (AD-7/3/15/27/18/11/24/14/1/2/9/10). `oversized` warning set (spec exceeds 1600 tokens, 2.2 precedent). HALTed after planning per the dispatch directive; nothing committed (lead owns all bookkeeping commits); :5173 untouched.
