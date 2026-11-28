---
title: 'Story 2.3: Light spill and atmospheric depth — the graphics rung works alone'
type: 'feature'
created: '2026-11-27'
status: 'done'
review_loop_iteration: 0
followup_review_recommended: true
baseline_revision: '8f454854f4948deb21080ed5c50fc4df5e7bb46c'
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

- implement (2026-11-27): `buildSpillNodes(THREE, scene, volumes, placements)` gained a `scene` parameter the Code Map signature omitted — unattached point lights never render; the builder attaches each node (the `buildRoomScene` idiom the same Code Map names). Reason: the seam's `Placed` only lights what the graph holds.
- implement (2026-11-27): spec-internal tie resolved — Design Note 3's placeholder `GLOW_PULSE_PERIOD_TICKS = 120` vs the matrix's "exactly one gentle cycle per `CABINET_PHASE_CYCLE_TICKS` (240)". `glowPulse` uses a half-angle cosine: one swell per 240 ticks, and the tie `2 * GLOW_PULSE_PERIOD_TICKS == CABINET_PHASE_CYCLE_TICKS` is pinned literally in the constants test, so the matrix row, the 120 placeholder, and the `60/PERIOD <= 3` law-shape pin all stay literally true. 3.7's finals move constant AND pin together.
- implement (2026-11-27): the pulse applies to the bleed nodes too (`SPILL_INTENSITY x pulse x haze`), not only the haze factor — Design Note 4's "every lit Cabinet identically" keeps a cabinet's pair and its bleed in lockstep, and the AC3 ordering pins are pulse-independent either way.
- implement (2026-11-27): `core/no-ui-dom.test.ts` camera allowlist extended additively with 2.3's two READ-ONLY haze pose reads (`const dx/dz = camera.position.[xz] - rig.center.[xz]`), counts re-pinned. The Code Map did not name this guard, but the frame-side haze pose read crosses it; the host-form ban and the camera-blind room leg stay untouched.
- implement (2026-11-27): `main-glue.test.ts`'s `window.arcadeDebug` line pin updated in place (the additive `atmosphere:` leg moves the line); the 1.9/2.1 moved-pin precedent holds — the pin stays, the string follows the line.
- implement (2026-11-27): `glowPulse` wraps negative and >= cycle inputs (`((phaseStep % cycle) + cycle) % cycle`) — the runtime phase counter already wraps mod 240; the pure law takes no sign convention.
- implement (2026-11-27): the haze law's shape is plateau(=1 up to `HAZE_NEAR_M` 12.5) -> linear(-`HAZE_COEFF`/m) -> clamp(`HAZE_FLOOR`) — `HAZE_NEAR_M` is a labelled placeholder beyond the Boundaries tunables enumeration, forced by the matrix Near row's literal `hazeFactor = 1` at the authored door->B0 distance (~12.2 m); pinned literally with its siblings, final is 3.7's.

## Review Triage Log

### 2026-11-27 — Review pass

verdicts: 21 findings — high 0, medium 4, low 9, false 8, maybe-false 0 · routes: 7 patched entries covering 8 findings (BH-3/VG-4 one root cause, one route), 0 deferred, 13 rejected (5 low-severity rejects, 8 false)

- BH-1 (blind-hunter) — the flash-rate guard reads `GLOW_PULSE_PERIOD_TICKS` as a FULL period, so the pinned `60/120 = 0.5 Hz` describes a rate twice the pulse's true cycle rate (one swell per 240 ticks = 0.25 Hz). low · **rejected**: the spec pins `120` and the `60/PERIOD <= 3` law shape verbatim (Design Note 3, the matrix row) — the fix edits this build's spec wording, and the guard errs conservative (overestimates the rate); 3.7's finals move constant, pin, and wording together.
- BH-2 — the frame-side glow block had no emissive-ramp guard: the 2.3 wiring test's banned-token list lacked the emissive identifiers. low · **patched**: `"emissive"`/`"emissiveIntensity"` added to the comments-stripped ban scan; planted `emissiveIntensity` write in the glow block reddened the pin, reverted.
- BH-3 — the consumer-Integration ramp test wrote intensities onto the shared `built` rig every other scene test in the file reads (cross-test pollution). medium · **patched**: dedicated third rig (`walk`) for the ramp-walk test. One root cause with VG-4.
- BH-4 — the boot-time `arcadeDebug.atmosphere` seed hard-codes `pulseApplied: 1`, a value the pulse law cannot emit at phase 0. low · **patched**: seed is law-derived (`glowPulse(0)` / `hazeFactor(0)` / their product composition).
- BH-5 — `SpillNodeHandle` used an inline `import("./scene.ts").Placed` instead of the file's type-import line. low · **patched**: merged into the top-level `import type { Placed, RoomScene, Three }`.
- EG-1 (edge-case) — `hazeFactor(NaN)` returns 1 (NaN fails the `>` guard) — silent full brightness. low · **rejected**: the camera pose is kernel-owned player state; a NaN pose is an upstream bug — theoretical hardening adds a branch for an unreachable input.
- EG-2 — `glowPulse` on a non-finite phase returns NaN. low · **rejected**: `phaseStep` is the kernel's wrapped integer counter; unreachable.
- EG-3 — `flashRateCompliant(-20)` passes (60/-20 = -3 <= 3). low · **rejected**: 0 is already rejected (Infinity > 3); a negative period is an authored-constant typo, and the 3.7 L2 probe measures authored constants, not runtime input.
- EG-4 — the scene.test built-rig count formula not extended for spill nodes. **false**: spill nodes are never created by `buildRoomScene` (the formula counts exactly what it creates); they carry their own formula census in the atmo rig (expected 8) plus the volumeId-order census.
- EG-5 — the matrix near/far rows never execute main's `frame()` — only fake-rig settle plus source text. **false**: the matrix row's own wording is "fake-rig settles halo/spill intensities" — that IS the recorded tier; the executed-host tier is frontmatter deferred item 1 (the main-glue string pins are Epic 1's recorded bridge idiom).
- EG-6 — the anchor census's "both sources" leg covers only the authored B0. low · **patched**: the loop spans authored placements plus the synthetic B1 centers across both authored pillars.
- VG-1 (verification-gap, demonstrated) — the boot rig's body-center init and the distance metric are unpinned: `center:` -> `{ x: 0, z: 0 }` stayed green; Euclidean `Math.sqrt` -> Manhattan stayed green. medium · **patched**: `MAIN.includes` pins for `center: placementGeometry(placementByVolumeId(pair.volumeId).slotId).center,` and `const distanceM = Math.sqrt(dx * dx + dz * dz);` — both witnesses now red, reverted.
- VG-2 — the bleed-node grouping and the volumeId pairing are unpinned: deleting `rig.bleed.push(node);` stayed green (a shipped bleed node lit by no law, forever dark), and `volumeId: p.slotId` stayed green at the headless tier while it would throw at real boot pairing. medium · **patched**: pins for `rigsByVolumeId.set(pair.volumeId, rig);` and `rig.bleed.push(node);` plus the volumeId-order census in the scene.test atmo rig; both witnesses red, reverted.
- VG-3 — the no-ui-dom camera-allowlist regex admits mismatched `dx`/`dz` spelling. low · **rejected**: each allowed statement still reads exactly one camera property inside one `;` statement and the pinned per-entry counts catch any addition; splitting into two paired regexes is cosmetic breadth.
- VG-4 — (grouped with BH-3, same root cause) the same shared-rig pollution seen from the gap side: a scene test can leave intensities mutated for later tests. medium · **patched**: the `walk` rig fix above.
- D1 (intent-alignment) — the near/far rows are satisfied at law + text + composed fake-rig tier, not an executed frame. **false**: the matrix wording names exactly that tier ("fake-rig settles"); the executed host tier is recorded deferred item 1.
- D2 — AC3's ordering is proven on the authored intensity law and geometry anchors, not rendered light. **false**: the spec's recorded posture (frontmatter deferred 1, plan decisions 1-2); the anchor exists on the ear side, pinned geometrically in the real-three tier.
- D3 — `HAZE_NEAR_M` appears beyond the Boundaries tunables enumeration. **false**: the Always row ("every tunable is a labelled placeholder") is a property, not an exhaustive list; the plateau is forced by the matrix Near row's literal `hazeFactor = 1` at the authored door distance; recorded in the Spec Change Log.
- D4 — the camera allowlist extension and `RoomHandles.cabinetLights` amend surfaces the boundary list did not name. **false**: the intent authorizes camera-pose input, and the handles follow the `frontDoorRamp` handoff idiom; the never-list stays untouched; recorded in the Spec Change Log.
- D5 — the source scans are broader than the matrix wording (whole-directory clock scan; extra banned import tokens). **false**: a superset of the wording contradicts no intent expectation; the readdir mechanism mirrors manager.test.ts's idiom. The wording is the floor.
- D6 — `arcadeDebug.atmosphere` carries no matrix row. **false**: the spec's Code Map `main.ts` row adds it; console-only per AD-24.

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

**Mutations witnessed (implement pass 2026-11-27; each applied, red observed, reverted byte-identical — sha256 match):**
- mutation: delete `rig.pair.halo.intensity = glow;` + `rig.pair.spill.intensity = glow;` from `frame()` -> "2.3 atmosphere wiring" (main-glue.test.ts) red — every ramp assignment is pinned.
- mutation: `HAZE_FLOOR = 0.25 -> 0` -> the labelled-placeholder literal pin (atmosphere.test.ts "every atmosphere tunable…") red; the far-settle graph legs stay green at the authored far distance (~0.65) — the never-zero floor is pinned as the literal, and the knee/kilometre pins compare against the constant.
- mutation: flip both x-face `SPILL_OFFSET_M` signs in `spillAnchors` (anchors inside the AABB) -> "spill anchors" + verification 9 (cabinets.test.ts, real-three `Box3`) + the scene.test.ts spill census all red.
- mutation: delete the `mount: "ceiling"` push -> "spill anchors" count + scene.test.ts formula census red.
- mutation: `GLOW_PULSE_PERIOD_TICKS = 120 -> 15` -> "flash-rate law shape" + "attract pulse" + the literal pin red (4 Hz > 3).
- mutation: `GLOW_PULSE_FLOOR = 0.7 -> 0` -> literal pin + "attract pulse" (never-black) + "blind-spot gradient" + the consumer-Integration never-0 settle leg red.
- mutation: `import { occlusionIds } from "../audio/occlusion.ts";` into atmosphere.ts -> "AC4 asymmetry by construction" red.
- mutation: plant `const _plantedWallClock = Date.now();` in atmosphere.ts -> "AD-3: no wall-clock identifiers in ANY core/room source" red.
- mutation: add a `THREE.standardMaterial({ emissive: ... })` call in `buildSpillNodes` -> scene.test.ts emissive/material census red (the hex literal reddens the hue pin too).
- mutation: freeze `glowPulse` (`const swell = 1`) -> "attract pulse" (floor-start + exactly-one-maximum legs) red.
- mutation (review pins): boot rig `center:` -> `{ x: 0, z: 0 }` -> "2.3 atmosphere wiring" (main-glue.test.ts) red — the body-center handoff is pinned.
- mutation: distance formula `Math.sqrt(dx * dx + dz * dz)` -> `Math.abs(dx) + Math.abs(dz)` -> "2.3 atmosphere wiring" red — the XZ-Euclidean metric is pinned.
- mutation: delete `rig.bleed.push(node);` (bleed nodes built but grouped under nothing — lit by no law, dark forever) -> "2.3 atmosphere wiring" red.
- mutation: `volumeId: p.slotId` in `buildSpillNodes` -> the scene.test spill census volumeId leg red (real boot's pairing throw is caught first at the headless tier).
- mutation: plant `rig.pair.halo.material.emissiveIntensity = 0.5;` in the `frame()` glow block -> "2.3 atmosphere wiring" banned-token leg red (the emissive identifiers joined the scan at review).

**Manual checks (deferred tier, report never claim):** start your own dev server on a fresh port (never the lead's :5173) — `arcadeDebug.atmosphere` shows per-cabinet `distanceM`/`hazeFactor`/`pulseApplied`/`glowIntensity` moving as you walk away from B0, and a stand behind a pillar still shows glow intensity ordered by distance; the by-sight/browser tier stands in frontmatter `deferred` item 1 — the visual read is the lead's smoke / Epic-3 harness, never the suite.

## Auto Run Result

Status: done
Blocking condition: none

Story 2.3 shipped on baseline `8f454854f4948deb21080ed5c50fc4df5e7bb46c` (branch `ARC-1-epic2`, implement stage, unattended epic cycle). The haze law, the attract glow-pulse law, and the pillar spill tier are live in the frame's glow ramp exactly per the Design Notes and Spec Change Log rulings (haze is an authored light-tier law, not three.js Fog; spill is authored point-light mounts from the volume records only; the emissive faces are never ramped); every constant is a labelled placeholder for 3.7.

**Files changed (9):**
- `core/room/atmosphere.ts` (NEW) — the pure atmosphere tier: `hazeFactor` (plateau 1 to `HAZE_NEAR_M` 12.5 -> linear `HAZE_COEFF` 0.06/m -> clamp `HAZE_FLOOR` 0.25, never-zero per UX-DR17), `glowPulse` (half-angle cosine, one swell per phase cycle, floor `GLOW_PULSE_FLOOR`, literal tie `2 * GLOW_PULSE_PERIOD_TICKS == CABINET_PHASE_CYCLE_TICKS`), `flashRateHz`/`flashRateCompliant` against the owner-fixed `FLASH_RATE_CEILING_PER_SEC` (NFR-9 law shape; the L2 probe is 3.7's), `spillAnchors`/`spillMountY`/`buildSpillNodes` (floor-sheen + ceiling-bounce point-light mounts derived from the collision-volume records only — no raycast, no `core/audio/` — `SPILL_*` placeholders, `SPILL_INTENSITY` derived from `CABINET_LIGHT_INTENSITY`, every node BUILT DARK), `AtmosphereDebug` row shape.
- `core/room/atmosphere.test.ts` (NEW) — 11 pins: labelled-placeholder literals + the cycle tie, haze monotone/knee/floor/kilometre legs, determinism twin, pulse shape/never-black/one-swell-per-cycle/negative-and-wrap legs, flash-rate law, blind-spot gradient (test-local sightline copy; pillar-2 ear vs open control), anchor census over authored + synthetic sources across both pillars, room-scoped AD-3 wall-clock readdir scan, AC4 asymmetry import scan.
- `core/room/scene.ts` — `CabinetLightHandle` (volumeId-keyed halo/spill pair) and the `RoomHandles.cabinetLights` handoff the frame pairs against the spill nodes.
- `core/room/scene.test.ts` — built-rig count formula extended; atmo-rig spill census (node count by the edge formula + volumeId-order pin); the consumer Integration settle legs run on their own dedicated `walk` rig (hermeticity); DW-23/emissive/hue censuses green.
- `core/room/cabinets.test.ts` — verification 9: the real-three headless tier (`Box3.containsPoint`, `matrixWorld`) — every spill anchor outside its occluder AABB at exactly `SPILL_OFFSET_M` past one face, mount heights derived from `WALL_TOP`.
- `core/main.ts` — boot builds the spill tier once and pairs glow rigs by volumeId (throw on a pairing miss); `frame()`'s glow block writes halo/spill/bleed intensities from pose distance x haze x pulse; `arcadeDebug.atmosphere` seeded law-derived.
- `core/main-glue.test.ts` — 2.3 wiring pins: every ramp assignment, the boot center handoff + XZ-Euclidean metric, the pairing/grouping lines, banned tokens (wall-clock, occlusion/audio imports, emissive), the moved `window.arcadeDebug` line pin.
- `core/no-ui-dom.test.ts` — camera allowlist additive entry for the two read-only haze pose reads, per-entry counts re-pinned.
- the spec itself (frontmatter, Spec Change Log, Review Triage Log, Verification mutation record, this result).

**Review findings breakdown (21; full rows in the Review Triage Log):** high 0, medium 4, low 9, false 8, maybe-false 0. Patched 7 entries (8 findings; BH-3/VG-4 one root cause): the frame-side emissive-token pin (BH-2), the dedicated `walk` rig for the consumer test (BH-3/VG-4, medium), the law-derived boot debug seed (BH-4), the inline type import (BH-5), the anchor census's second-source leg (EG-6), the boot center + distance-metric pins (VG-1, medium — the gaps were demonstrated surviving their mutations before the pins landed), the bleed-grouping + volumeId-pairing pins (VG-2, medium — same). Deferred: nothing new this pass (the two frontmatter items are plan-stage posture). Rejected low 5 with reasons: the flash-rate 2x-semantics reading (spec pins 120 and the `60/120 <= 3` shape verbatim; the fix edits the spec's own wording; guard errs conservative), NaN-distance and non-finite-phase hardening (kernel-owned state), negative `periodTicks` (0 already rejected via Infinity; authored-constant input), the allowlist regex x/z pairing (count pins bound any addition; cosmetic). Rejected false 8: EG-4 (spill nodes never come from `buildRoomScene` — they own a formula + volumeId census), EG-5/D1 (the matrix wording names the fake-rig tier; executed host is deferred item 1), D2 (recorded tier posture), D3 (property, not an exhaustive tunables list), D4 (intent-authorized seams, `frontDoorRamp` idiom), D5 (superset scans, `manager.test.ts` idiom), D6 (Code Map names the debug leg).

**Follow-up review recommended: YES.** Three medium entries were patched inside this pass. Named residual risk: the shipped `frame()` glow block executes at no headless tier — the VG-1/VG-2 gaps are closed with source-text pins plus witnessed text-mutation reds, so a semantic rewrite inside the pinned lines (or a runtime mispairing invisible to the fake censuses) surfaces only at the executed browser tier, which frontmatter deferred item 1 routes to the Epic-3 harness plus the lead's smoke walk.

**Verification performed:** `npm run typecheck` clean; `npm test` 478/478 (after the implement pass and again after the review patches); `node ci/depcheck.mjs`, `node ci/lint-bans.mjs` clean; `node tools/gen-registry.mjs` + `generated/` no drift; `npm run build` once, clean (only the pre-existing 654.97 kB single-chunk warning). 15 mutation witnesses applied/red/reverted byte-identically (sha256-verified; all recorded under `## Verification` — the 10 pre-named falsifiable tiers plus the 5 review-pin witnesses). Tiers executed: pure-law literal pins, fake scene-graph intensity-settle pins, the real-three headless Box3/matrixWorld anchor tier, source-text pins (main-glue wiring, import/clock scans, no-ui-dom counts), demonstrated mutations. Tiers NOT executed: browser/by-eye (frontmatter `deferred` item 1) — no dev-server or browser leg ran in this pass; the lead's :5173 was never touched or probed.

**Residual risks / hand-offs:** every haze/pulse/spill number is a labelled placeholder (AD-27 Deferred row; finals 3.7, whose L2 flashes-rate probe measures against `flashRateHz`); the flash guard reads the placeholder period literally per the spec (BH-1 row — 3.7 moves constant, pin, and wording together); the spill tier keys on the authored pillar pair and the one placement — room growth stays the ledger's/3.7's call (deferred item 2); Story 2.4's comfort rows and 2.6's rung-2 walk ride this pulse/haze contract as their handle.

**Deferred findings for the ledger harvest (frontmatter `deferred`, both severity low):** (1) by-sight/browser tier for the haze depth, spill bleed, and gradient ordering — no executed visual tier exists this epic; the pure-law pins, fake-rig settle pins, and real-three anchor tier are the falsifiable tier. (2) the tier is authored against the shipped room (one Cabinet placement, the authored pillar pair; multi-cabinet legs pin via synthetic injected placements at authored slot ids) — behavior under the final authored room contents is Story 3.7's authored-data call.
