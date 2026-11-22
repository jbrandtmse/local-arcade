---
title: 'Story 1.3: The Arcade Room — slots, pillars, zones, and the roadmap wall'
type: 'feature'
created: '2026-11-21'
status: 'done'
review_loop_iteration: 1
followup_review_recommended: true
baseline_revision: 'cbc66b65bc5e26ec52ff4ad8b9a5c2f4cc5b6b21'
baseline_commit: 'cbc66b65bc5e26ec52ff4ad8b9a5c2f4cc5b6b21'
context:
  - _bmad-output/planning-artifacts/architecture/architecture-local-arcade-2026-11-19/ARCHITECTURE-SPINE.md
  - _bmad-output/specs/spec-local-arcade/room-layout.md
  - _bmad-output/planning-artifacts/ux-designs/ux-local-arcade-2026-11-20/DESIGN.md
  - _bmad-output/planning-artifacts/ux-designs/ux-local-arcade-2026-11-20/imports/arcade-floor-plan.html
warnings: ['oversized']
deferred:
  - 'main.ts real-THREE adapter executed coverage — lands with the Epic 3 browser harness (DW-12 tier); the source-pin tier (main-glue.test.ts 1.3 wiring test) was added in story 1.3 review pass 1'
---

<intent-contract>

## Intent

**Problem:** The room is still Story 1.2's placeholder stubs — four thin wall boxes, two floating pillar stubs, three cabinet stubs at the back. Nothing a Visitor walks through is the authored Arcade Room: no Wall Slot config, no zones, no occluder geometry that sightlines actually break on, no door or street side, no Welcome Flyer. Every later Epic-1 story (1.4's shells into slots, 1.9's street-door beat, Epic 2's audio occlusion, Epic 3's Layout System) needs this data to exist.

**Approach:** Rewrite the `core/room/` placeholder data in place into the authored room, per the spine's "Room geometry & collision" Conventions row: one authored AABB volume list (ids stable — collision and render code never hardcode geometry; the 1.2 resolver is untouched) becomes the walls, the closed front door, the two occluder pillars (the same set serves sight now and Epic 2 audio raycasts), and the street-side geometry outside. Add sibling authored modules — slot config (20 pre-declared Wall Slots at 1.40m pitch, revision id, roadmap stretch), zones (fixed rects + authored hue lighting), signage (the one Welcome Flyer surface), and design tokens — plus a small scene builder that extrudes meshes from the volume list and lights, and a canvas-texture painter behind an injected factory (the input service's injectable-source pattern). Zero resolver changes, zero new dependencies, zero DOM.

## Boundaries & Constraints

**Always:** the volume list at `core/room/collision-volumes.ts` stays the single source for movement blocking, the occluder collider set, and visual extrusion (spine Conventions row "Room geometry & collision"; AD-7 names this set for the Audio Manager's raycasts — "what blocks the ear blocks the eye"); contract numbers from room-layout.md (interior 19m × 12.5m; slot pitch 1.40m; stand-up footprint ~0.60m; eye height 1.60m; aisles never <1.20m) — that file wins over the floor plan, which is superseded except as measured geometry reference (its year ruler, SHRINE, FEATURED POD labels are dead); Wall Slot config authored with a revision id and an index giving the fill scan order back→front, sides alternating L/R (AD-10's function reads it in Epic 3); four fixed zones — Pinball Corner back-left (violet #B07CFF), Workshop back-right (steel #7FB0C9), Snack Bar front-right (orange #FF9A5C), Casual Alley mid-right kept clean (green #57E6A3) — plus roadmap amber (#FFC46B) at the front stretches (DESIGN.md token hexes exactly); design tokens verbatim: Room Black #15110E (ceiling, unlit upper wall), Wall Warm #2E241D + Wall Panel #4A3628 wainscot, Carpet Base #221B27 with low-contrast octagon pattern #3E3046; hard corners only (boxes, no rounded/cylindrical room geometry); no emissive material on any wall/pillar (hues come from lights, never painted glow — DESIGN don't "Paint glow on walls"); the one Welcome Flyer: Paper Card #F2E8D4 stock, Card Ink #2A241C, verbatim `"MOVE: W A S D · LOOK: MOUSE · DO: E"` (· = `·`), declared kind `room-sign` (AD-24 whitelist), cap height ≥60mm; room modules DOM-free — canvas painting takes an injected factory; the player resolver (`core/player.ts`) is NOT rewritten, only its input data and spawn (spine row: "the resolver is code, the volumes are data, and 1.3 rewrites the data in place"); all authored numbers that are not contract values are labelled (inference).

**Never:** no cabinet shells, marquees, or screens (1.4); no zone fixtures/furniture (Epics 4–7 — zone-hue lighting is this story's provisional identity, AC-named); no audio (Epic 2) — the occluder set is authored now, consumed then; no Layout System fill implementation (Epic 3, AD-10 — this story authors only the config it reads, with revision id + index); no door-open animation, no street-side load beat (1.9); no aisle-nav / legibility / character lint in CI (Epic 3 L0–L2 — the authored measurements bind at review/smoke now); no new dependencies, no DOM text surfaces, no `games/**` imports (AD-1, AD-18); no edits to `core/player.ts` step/resolver semantics or `core/loop.ts`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Real consumer (Rule 1): 1.2 player controller vs authored room | scripted W from authored entry spawn (0, 5.6), yaw 0 | walk stops at `wall-back` face minus player radius; a scripted diagonal against `pillar-1` stops and slides (ids, not coords); headless transcript replays identically | n/a |
| Sampled sightline left | segment spawn (0,5.6) → backmost left slot L0 center (−9.1, −3.5) | intersects exactly one occluder volume: `pillar-1` | n/a |
| Sampleed sightline right | segment spawn (0,5.6) → backmost right slot R0 center (9.1, −3.5) | intersects exactly one occluder volume: `pillar-2` | n/a |
| Roadmap visible from entry | segments spawn → frontmost slots L6 (−9.1, 4.9) and R5 (9.1, 3.5) | intersect no occluder volume — the unfilled stretch is visible from the door (CAP-2 success) | n/a |
| Aisle measurement | authored probe set: main aisle between opposing slot faces = 17.60m; pillar↔slot-box min = 5.05m; pillar↔zone-rect min = 0.75m (pillar-2 ↔ Casual Alley, a freestanding column vs an empty kept-clean rect, not a circulation pinch); per-slot approach segment from corridor point (±4.5, slot.z) to slot face clears every blocking volume by ≥0.70m | all probes satisfy the contract minimum 1.20m for circulation; values recorded from the test run, not asserted as magic constants | n/a |
| Door + street side | volume list | `wall-front` replaced by `wall-front-left` (x −9.75..−0.5) + `wall-front-right` (x 0.5..9.75); `door-front` in the gap (x −0.5..0.5, z 6.25..6.37, h 0..2.10, blocksMovement true — closed); street-side volumes beyond the front wall: `street-floor` (x −4..4, z 6.5..8.25, blocksMovement false) + `street-wall` (z 8.25..8.50, blocks true); walking forward from spawn presses against `door-front`, never through | n/a |
| Slot config | authored module | revision id + 20 slots: back row B0..B6 (z −5.85, x −4.2..4.2 step 1.40, left→right), left run L0..L6 (x −9.10, z −3.5..4.9 step 1.40, back→front), right run R0..R5 (x 9.10, z −3.5..3.5 step 1.40, back→front); each {id, wall, index (fill order: B0..B6 then L0,R0,L1,R1,…), center, facing, footprint 0.70×0.60}; consecutive in-run spacing == 1.40 exactly; roadmap.stretchSlots = [L4,L5,L6,R3,R4,R5] | n/a |
| Zones + hues | authored module | 4 zone records {id, rect, hue, light{position, hue}} exactly as Boundaries hexes; each zone light inside/at its rect, ceiling height; roadmap record with amber lights over the front stretches at (−8.6, 3.5) and (8.6, 2.8); every hue ∈ DESIGN.md glow-anchor set | n/a |
| Welcome Flyer | authored signage record | exactly ONE authored text surface: {id welcome-flyer, kind room-sign, stock paper-card, position (1.15, z 6.24, y 1.45), facing −Z, cap 0.06m, text verbatim}; canvas painter (injected fake) draws that exact string; nothing appended to any document | n/a |
| Visual extrusion | scene builder fed the volume list + zones + tokens | one box mesh per blocking volume (walls get Wall Warm + Wall Panel wainscot band 0..1.0m), ceiling Room Black, carpet floor drawn from the two carpet tokens, pillar/door/street meshes; no material with emissive ≠ 0x000000 on walls/pillars; only BoxGeometry (hard corners) | n/a |
| DOM still canvas-only | served page + source scans | entry still appends exactly the canvas; new room modules contain no `document.`/`window.`/`localStorage`; painter takes only the injected canvas factory | n/a |
| Chrome vs Edge | same authored scene | identical observable room; verified at the lead's per-story browser smoke (Chrome AND Edge, screenshots at the 6m vantages) — CI matrix is Epic 3 (AD-17) | n/a |

</intent-contract>

## Code Map

- `core/room/collision-volumes.ts` -- REWRITE IN PLACE (spine Conventions row): keep module path and exports (`Vec3`, `CollisionVolume`, `VolumeKind`, `INTERIOR`, `collisionVolumes`); new authored entries per matrix rows; `VolumeKind` gains `door` and `street`; ids `wall-back`/`wall-left`/`wall-right`/`pillar-1`/`pillar-2` survive (1.2 pins address them via `volById`); `wall-front` splits into `wall-front-left`/`wall-front-right`; add `door-front`, `street-floor`, `street-wall`
- `core/player.ts` -- READ-ONLY reuse (resolver untouched): `createPlayerController(volumes, spawn)` already injects both; authored `entrySpawn` is passed by main.ts; PLAYER_RADIUS 0.25, TARGET_REACH 2.0 stay
- `core/room/slot-config.ts` (new) -- authored Wall Slot data: revision id `wallslots-r1-2026-11-21`, 20 slots + roadmap stretch slots (matrix row); pure data, no fill logic (AD-10: the Layout System consumes this in Epic 3)
- `core/room/zones.ts` (new) -- authored zone records (rects, hues, light positions) + roadmap amber record; consumed by the scene builder now, by Epic 2 audio/zone fixtures later (AD-25 owns zone interactions — none authored here)
- `core/room/signage.ts` (new) -- the single Welcome Flyer record (AD-24 kind `room-sign`); the whitelist home the Epic-3 character lint will read
- `core/room/tokens.ts` (new) -- DESIGN.md hex tokens as numbers (ROOM_BLACK…, glow anchors, paper-card/card-ink); `core/main.ts:27` imports ROOM_BLACK from here instead of its inline constant
- `core/room/scene.ts` (new) -- `buildRoomScene(THREE, scene)`: extrudes the volume list to meshes, walls/ceiling/carpet/pillars/door/street, zone lights + door glow-red (#FF6B5E) above the door; reads only authored data (no geometry literals) — the "visual extrusion" leg of the spine row
- `core/room/surfaces.ts` (new) -- injected-canvas painters: `paintFlyer(makeCanvas, text)`, `paintCarpet(makeCanvas, baseHex, patternHex)`; DOM-free like `core/input/index.ts`'s injectable-source pattern (Rule 2: extends that sibling's pattern, no copy of the input service)
- `core/main.ts` -- wire: `buildRoomScene`, pass authored volumes + `entrySpawn` to the controller, inject real canvas factories for flyer/carpet textures; DOM append stays exactly one (the canvas)
- `core/player.test.ts` / `core/player-qa.test.ts` -- UPDATE SHARED-SURFACE PINS (1.2 pre-authorized this: "Story 1.3 rewrites that data and the tests that pin placeholder positions move with it"): the exact-ids pin (:58), the pitch pin via stubs (:73-74, moves to slot-config), the default-spawn-walks-into-cabinet-2 pin (:133 and qa :62-63) and the targeting/E-press pins that target `cabinet-2` (:156-202, :263-267) move to authored room volumes (walk/block) or test-local targetable fixtures (targeting is controller behavior — pass a synthetic volume list to the injectable constructor); wall/pillar pins stay via `volById`
- `core/no-ui-dom.test.ts` -- extend: dev-serve module-resolution list gains the new `core/room/*` modules; new source-scan pins for the room modules (no `document.`/`window.`; entry append count still 1)
- `tools/app-serve.test.ts` -- reference for the real-dev-serve pattern (Rule 3), no change
- `_bmad-output/specs/spec-local-arcade/room-layout.md` -- contract numbers authority (wins over the plan); `imports/arcade-floor-plan.html` -- measured geometry reference only (zone/corner proportions; labels superseded)

## Tasks & Acceptance

**Execution:**
- `core/room/collision-volumes.ts` + `core/room/room.test.ts` (new) -- rewrite the data to the authored room per matrix rows; test: id set, wall faces at `INTERIOR` bounds, door closed in the gap, street volumes beyond the front wall, pillar ids/centers (±3.5, 2.1), half-extent 0.25 -- AC1/AC3
- `core/room/slot-config.ts` + pins in `room.test.ts` -- 20 slots, revision id, index order, roadmap stretch; test: consecutive pitch == 1.40, slots inside envelope, no slot inside any zone rect, aisle probes per matrix row (main aisle 17.60m, pillar↔cabinet-box ≥5.0m, per-slot approach ≥0.70m clearance) -- AC2/AC5
- `core/room/occlusion.test.ts` (new) -- 2D segment-vs-AABB probe (test-local helper, not production code — Epic 2's Audio Manager owns the production raycast): the two sampled sightlines block on exactly `pillar-1`/`pillar-2`; the two roadmap-visibility segments block on nothing -- AC3
- `core/room/zones.ts` + pins -- four zone records + roadmap amber, hex-exact hues, lights at authored positions ((−8.6,3.5) and (8.6,2.8) amber; zone centers per matrix); Casual Alley rect {4.5..8.0 × 1.2..3.0} kept clean: no slot, no blocking volume inside -- AC4
- `core/room/signage.ts` + pins -- one record, verbatim text compared to `"MOVE: W A S D · LOOK: MOUSE · DO: E"` (· = `·` escape in code), kind `room-sign`, beside the door gap (|x| > door half-width), cap 0.06m -- AC6
- `core/room/tokens.ts` + `core/room/surfaces.ts` (+ `surfaces.test.ts` with a fake canvas recorder) + `core/room/scene.ts` (+ pins) -- token map; painter draws the exact flyer string via injected factory and nothing else paints DOM; carpet drawn only from the two carpet hexes; scene builder: mesh per volume kind, wainscot band, Room Black ceiling, zero emissive on wall/pillar materials, BoxGeometry only -- AC7 (+AC4 lights consumed)
- `core/main.ts` -- wire scene + authored volumes + entrySpawn; inject canvas factories -- AC1/AC2/AC7
- `core/player.test.ts`, `core/player-qa.test.ts` -- move the listed shared-surface pins to authored volumes / test-local fixtures (Code Map) -- regression of the 1.2 contract on real room data
- `core/no-ui-dom.test.ts` -- extend scans + dev-serve module list -- fiction-pure law survives
- tests for every I/O matrix row above (Rules 1/19), incl. the scripted real-controller walk (Integration) -- pinning tests + demonstrated mutations

**Acceptance Criteria:**
- Given the authored room data, then the interior is 19m × 12.5m, the front door sits bottom-center closed and blocking, and street-side geometry exists beyond the front wall (AC1; FR-2, UX-DR3)
- Given the slot config, then 20 Wall Slots are pre-declared at exactly 1.40m pitch under revision id `wallslots-r1-2026-11-21`, ordered back→front alternating L/R after the back row, and the front stretches read as roadmap: amber-lit, and visible unobstructed from the entry spawn (AC2; FR-2, seeds FR-10)
- Given sampled positions, then the sightline from the entry to each backmost side slot is blocked by exactly one occluder pillar, and those pillars are entries of the one `core/room/` AABB list that Epic 2's Audio Manager will raycast (AC3; AD-7, FR-2)
- Given the zone records, then Pinball Corner/Workshop/Snack Bar/Casual Alley are fixed rects with the token hues (violet/steel/orange/green) and authored lights, the roadmap carries amber at the front stretches, and every hue value equals the DESIGN.md glow-anchor hex (6m readability: screenshot evidence at the lead's smoke; CI legibility lint Epic 3) (AC4; FR-2, UX-DR24 partial — fixtures Epics 4–7)
- Given the authored measurements, then every aisle probe is ≥1.20m and per-slot approaches stay walkable by the 0.25m-radius player (AC5; aisle-nav lint Epic 3 L2, measurement binds now)
- Given the signage records, then exactly one authored text surface exists — the Welcome Flyer — Paper Card stock by the front door carrying the verbatim string, declared kind `room-sign`, cap ≥60mm (AC6; UX-DR10, AD-24 whitelist)
- Given the built scene, then walls/ceiling/floor/pillars use only the token hexes (Wall Warm + Wall Panel wainscot, Room Black ceiling, carpet base+pattern octagon), all room geometry is hard-cornered boxes, no wall/pillar material carries emissive (no painted glow), and the 1.2 resolver blocks against the authored volumes unchanged (AC7; UX-DR1, UX-DR4, spine Conventions row)

## Spec Change Log

(none yet)

## Review Triage Log

### 2026-11-22 — review pass 1 (blind-hunter, edge-case-hunter, verification-gap, intent-alignment)

- verdicts: 21 findings — high 1, medium 6, low 6, deferred 1, rejected 6, note 1
- findings:
  - [high] [patch] main.ts's 1.3 room/spawn wiring (buildRoomScene call, Three adapter, OffscreenCanvas factory, ENTRY_SPAWN arg, token clear-colour) reached no test, while scene.test.ts's header claimed main-glue pinned it — blind-hunter + verification-gap; main-glue.test.ts gained a 4th source-pin test (repo's designated tier per the 1.2 precedent), demonstrated red by deleting the build call, restored byte-identical; the header claim is now true.
  - [medium] [patch] Rule 14 literal non-ASCII in string literals: U+00B7 in surfaces.ts split separator, U+2014 in five test-name strings — replaced with `\u00b7` / `\u2014` escape sequences; literal em-dash/middot remain only in comments (committed convention).
  - [medium] [patch] scene.test.ts "no volume gets a second copy and no mesh drifts off its volume" was tautological (meshes filtered against the seam's own geometry list) — replaced with a real per-volume footprint+dims copy count (must be exactly 1).
  - [medium] [patch] occlusion.test.ts sampled every blocksMovement volume, so 1.4 shells placed at the sightline endpoints would flip the 1.3 design pins with no occlusion change — blockers() now samples the kind-pillar occluder subset the story designed.
  - [medium] [patch] room.test.ts flyer-beside-door assertion was dead arithmetic (`max.x - 0.5 + 0.5` cancels to a centre test, ignores the sheet width) — now edge-based: the sheet's near edge must clear the door volume's face.
  - [medium] [patch] AC5 test title overclaimed ("all circulation probes >= the contract 1.20m" while the approach bound is 0.70m) — title rewritten to what it pins; the 1.20 contract binds via the main-aisle record + per-slot corridor depths. Reading recorded: the spec's Never bars the Epic-3 lint TOOLS, and co-located data pins are the only binding surface that exists pre-CI.
  - [medium] [patch] authored constants retyped across modules/tests (ceiling 3.0-vs-WALL_TOP, glow Y vs DOOR_TOP, 0.25 wall/player radius) — collision-volumes now exports WALL_TOP and DOOR_TOP; scene.ts derives ceiling Y and DOOR_GLOW_Y from them; room.test.ts imports WALL_T and PLAYER_RADIUS; scene.test ceiling pin derives from WALL_TOP.
  - [low] [patch] door-glow intensity/reach were bare literals in the builder while zone lights are named constants — DOOR_GLOW_INTENSITY/DOOR_GLOW_REACH named, labelled (inference, Design Notes 7).
  - [low] [patch] wainscot band's +0.01 along-wall widening crossed into the door gap (5mm floating jambs exactly where 1.9's door-open beat swings) — front-wall bands now widen away from the opening.
  - [low] [patch] surfaces.ts need2d guarded ctx only; a factory handing back a non-surface died with a raw TypeError — guard now throws the loud error.
  - [low] [patch] sign-facing branch treated zero/diagonal facing implicitly as ±X/±Z — scene.ts throws unless a surface faces exactly one axis.
  - [low] [patch] paintFlyer font stack was the one authored choice with no (inference) label — labelled.
  - [low] [patch] zones.ts comment called the identity light "down-facing" (a PointLight cannot face) — reworded to "hung at ceiling height".
  - [deferred] [owner: Epic 3] executed coverage of main.ts's real-THREE adapter (the seam's mapping to real THREE.*) — the browser harness tier (DW-12 precedent); the source-pin tier was added this pass instead, executed browser coverage lands with Epic 3 CI.
  - [rejected] player.test.ts 500-tick walk has ~0.07m slack — the tightness is the pin's purpose: retuned step constants SHOULD surface as red.
  - [rejected] incidental composition counts pinned (38 meshes, 2 canvases, 7 lights) — deliberate falsifiable composition pins; 1.4 edits them knowingly.
  - [rejected] source-grep enforcement of no-emissive/no-curved-primitives duplicates the behavioral pins — defense-in-depth by design (the AC names both the material law and the hard-corners law).
  - [rejected] test-local occlusion/measurement helpers duplicated between room.test.ts and occlusion.test.ts — the production raycaster is barred this story (AD-7/Epic 2 Never); Design Notes "Extend, don't copy" records the choice.
  - [rejected] "ids stable" read retrospectively (wall-front, cabinet-1..3 kept) — the spine row's paren is the forward pin law (tests pin ids, not coords); 1.2's shared-surface row pre-authorized exactly these test moves for this rewrite; AC1 pins the authored id set.
  - [rejected] spec status/baseline block in the diff — workflow-owned run state, not code (this skill writes it by design).
  - [note] local runs used Node 24 while engines pins 26 — environmental, not introduced by the diff; suite green on both (type-stripping).

## Design Notes

**Governing ADs (Rule 6):** AD-7 (the dedicated occluder collider set in `core/room` — one geometry for audio raycasts and sightlines; the story's "(AD-7)" citation checks against the AD Rule verbatim), AD-10 (Wall Slot config pre-declared + revision id; the Layout System is a later pure build function — this story authors only its inputs), AD-24 (text-surface whitelist: the flyer is `room-sign`; zero UI), AD-25 (Zones are `core/room`-owned; interactions/fixtures later — data now), AD-3/AD-15 (scene is static authored data; render assembles meshes once, no motion in render, no tick mutation), AD-1/AD-13/AD-14 (new files in `core/`, TypeScript, import no games), AD-18 (no new dependencies), AD-17 (browser parity is the lead's smoke this epic, CI in Epic 3).

**Consumed-by:** 1.4 (stand-up shells place into the slot config's slots + footprint; empty-slot baseplates are the placement language), 1.9 (street-side geometry + closed door become the load beat; entrySpawn is the spawn-from-door home), Epic 2 (Audio Manager raycasts this same volume list; zone audio rides zone ids), Epic 3 (Layout System fill reads slot config + revision id per AD-10/CAP-10; aisle-nav + character + legibility lints pin these authored values; Instruction Card surfaces extend `signage.ts`), 1.6 (Patron pathing walks the authored aisles). **Consumes:** 1.1 (contract math not needed — data story), 1.2 (volume-list shape, the player resolver as the integration consumer, injectable-source and dev-serve test patterns).
**Integration ACs (Rule 1):** matrix row "Real consumer" — the real 1.2 controller against the real authored list through the real loop semantics; headless, no mock at the seam. Slot config: **no consumers in this story; the first consumer will be Story 1.4** (shells into slots), then Epic 3's Layout System. Zone lights: consumed by the renderer (browser tier — lead smoke), authored for zone fixtures/interactions later.
**Extend, don't copy:** `collision-volumes.ts` is rewritten in place, not forked (the spine row forbids a second geometry source); `surfaces.ts` follows `core/input/index.ts`'s injectable-source sibling pattern (no copy of it); the occlusion probe is deliberately test-local — production raycast is Epic 2's (AD-7), and duplicating `player.ts`'s slab test into production now would be the second geometry consumer the spine row prevents. Slot config is separate from the volume list on purpose: slots must not block movement (empty slots are walkable roadmap) and they feed a build-time function (AD-10), not the resolver.
**Ledger inbox:** none (`LEDGER slice 1-3-the-arcade-room-slots-pillars-zones-and-the-roadmap-wall` empty; no `DW-n:` bullets in the story's acceptance criteria).
**DW-12 precedent (cited, not re-filed — build-auto never writes the ledger):** automated 6m hue-readability/screenshot checks need a browser harness that does not exist this epic; this story's readability evidence is the lead's Chrome+Edge smoke with saved screenshots, same tier that holds 1.2's glue.

**Decided in-stage** (small, reversible, spine-consistent; authored defaults labelled (inference) — the room-layout contract numbers are NOT re-decided):
1. Slot runs and counts: back row 7 (x −4.2..4.2), left run 7 (z −3.5..4.9), right run 6 (z −3.5..3.5; front stop at +3.5 keeps clear of the future Snack Bar counter at z ≥4.5) = 20 slots; 1.40m pitch is the contract number, run extents authored from the plan's wall proportions (inference). Fill-scan order = B0..B6 left→right (the ASCII's "oldest" back row), then L0,R0,L1,R1,… — "alternating L/R" read as governing the side runs; the Layout System (Epic 3) implements skip-when-exhausted. Reversible by editing data + bumping the revision id.
2. Pillars: 0.5m squares centered (±3.5, 2.1), ids `pillar-1`/`pillar-2` kept from 1.2. Chosen by measurement (not plan pixels — the plan's decorative door→pillar polylines are sight-bends, not straight occlusions): both sampled door→backmost-slot sightlines blocked, both door→frontmost-slot roadmap sightlines clear, ≥5m to any cabinet box. Deviates from the plan's pixel positions (its pillar at z −1.2 blocks nothing straight); plan positions were never contract numbers.
3. Slots: center 0.40m off the wall face, footprint 0.70 (along wall) × 0.60 (depth) — the 0.70 along-wall width keeps 0.70m clearances between adjacent filled slots (room-layout's ~0.60m footprint is approximate; pitch 1.40 is the exact contract) (inference). Empty slots get a 0.70×0.62 Wall-Panel baseplate 0.02m raised (the "same visual language" anchor 1.4's shell will sit on) (inference).
4. Zones: rects authored from the floor plan's rectangles converted to metres (plan x∈[42,1118]→19m, z∈[42,758]→12.5m) and rounded: pinball {−9.5..−5.0 × −6.25..−3.9}, workshop {5.5..9.5 × −6.25..−4.0}, snack {5.5..9.5 × 4.5..6.25}, casual {4.5..8.0 × 1.2..3.0}. Roadmap amber lights overhead at (−8.6, 3.5) and (8.6, 2.8) — over the front stretches, deliberately outside the Snack Bar and Casual Alley rects so hues do not cross zones. (inference within the fixed corner contract).
5. Roadmap amber hex = glow-marquee `#FFC46B` — the token list's only amber (DESIGN.md notes amber is "tuned, not verbatim" from the plan's #FFB84D); if the roadmap needs its own hex later, that is a token amendment, not this story's geometry (inference).
6. Wall height 3.0m, wainscot band 0..1.0m, door 2.10m tall in a 1.0m bottom-center gap, door panel thickness 0.12 (inference — no contract number; hard corners). Ceiling Room Black; street floor muted concrete gray + far street wall (outside the token set's room envelope — street is beyond-fiction-adjacent geometry; gray is inference).
7. Zone lighting = one down-facing PointLight per zone at ceiling 2.8m, distance 8, intensity 3.0 + two amber + glow-red #FF6B5E above the door + very low Room-Black ambient 0.15 (inference; tuned by eye at the smoke — "readable at 6m" is the smoke check, the data pin guards ids/hexes/positions). "Read from geometry alone at 6m" read as: the hue arrives via light on authored geometry, not UI labels; DESIGN's "reads with hue removed" fixtures half is explicitly deferred by the AC's own "fixtures arrive in Epics 4–7".
8. Flyer: A5-proportion card 0.21×0.30, center (1.15, 6.24, 1.45) on the front wall right of the door gap, facing −Z; cap 0.06m (room-sign floor ≥60mm); drawn onto an injected canvas, texture-mapped — never a DOM node. Middle dot via `·` escape (Rule 14).
9. Entry spawn (0, 5.6), yaw 0 (facing the back wall), authored in room data; the 1.2 default-spawn parameter stays untouched for tests.
10. The candidate "signature of the one volume list = walls+pillars+door+street, occluder subset = pillar-kind entries" needs no spine write: the Conventions row added 2026-11-22 already states it (the 1.2 item 9 convention landed as a spine row; this story is its first consumer).

## Verification

**Commands:**
- `npm run typecheck` (loop) -- exit 0
- `npm test` (loop; also once as the full-suite run before finalize) -- all `*.test.ts` green: existing 113 (with the listed shared-surface pins moved, counts may shift where pins move files) + new room pins; suite runs in seconds — one foreground call
- `node ci/depcheck.mjs` (loop) -- exit 0 (new core/room files import no games)
- `node ci/lint-bans.mjs` (loop) -- exit 0 (unchanged — no sim-path code added)
- `node tools/gen-registry.mjs && git diff --exit-code -- generated/` (loop) -- byte-identical (registry unchanged)
- `npm run build` (once) -- Vite build exit 0

**Pinning tests & demonstrated mutations (Rule 19; each to be observed red, reverted, tree byte-identical, suite re-green at implement time):**
- AC1 pin: authored id set + door blocks the gap + street beyond the front wall (room.test.ts) — demonstrated: deleted the `door-front` entry -> room.test.ts id-set pin, AC6 door pin, and player.test.ts walk-into-door pin went red (exit 1); reverted byte-identical.
- AC2 pin: consecutive slot pitch == 1.40 + revision id present (room.test.ts) — demonstrated: moved one L-run center 0.05 (L2 x -0.7 -> -0.65) -> pitch pin red, aisle probes stayed green (pins independent); reverted byte-identical.
- AC3 pin: sightline spawn->L0 blocked by exactly `pillar-1` (occlusion.test.ts) — demonstrated: moved `pillar-1` 1m in +x -> L0 sightline pin red, roadmap-clear pins green; reverted byte-identical.
- AC4 pin: hues === DESIGN token hexes per zone; amber lights outside snack/casual rects (room.test.ts) — demonstrated: swapped the WORKSHOP hue to the green token -> hue pin red; reverted byte-identical.
- AC5 pin: aisle probes (room.test.ts) — demonstrated: moved `pillar-1` to (-8.0, the L2-row z) -> recorded pillar->slot clearance pin red ("recorded pillar->slot min 0.55"); reverted byte-identical.
- AC6 pin: exactly one text surface, verbatim string incl. `·` (room.test.ts / surfaces.test.ts fake canvas) — demonstrated: dropped the middle dot in the source string -> verbatim pin red. Revert needed a byte-exact node repair (the Edit tool's fuzzy non-ASCII matching had written a literal U+00B7 where the source keeps `\u00b7` escapes); sha256 restored to the pre-mutation record. Rule 14 tightened in the review pass: the surfaces.ts split separator now uses an escape too.
- AC7 pin: zero emissive on wall/pillar materials + BoxGeometry-only scan (scene pins) — demonstrated: added `emissive: 0xff6b5e` to the wall material -> zero-emissive pin red; reverted byte-identical.
- 1.3 entry-wiring pin (main-glue.test.ts, added by review pass 1) — demonstrated: removed the `buildRoomScene(three, scene, makeCanvas);` line from core/main.ts -> the wiring pin went red (nothing else in the suite failed — the gap the pin closes); restored byte-identical (sha256 match).

**Shared surfaces:** `core/room/collision-volumes.ts` id set (1.2 pins that address `wall-front`, `cabinet-1..3` and the default-spawn line move with this rewrite — list in the Code Map; the exact-ids pin is rewritten to the authored set), `INTERIOR` export (pins keep), player default-spawn test fixture (untouched), `core/no-ui-dom.test.ts` dev-serve module list (extended), `generated/game-registry.ts` entry count (0, unchanged), root `package.json` scripts (unchanged — no new scripts). Standing criterion: every test added or changed passes on a fresh environment, in either order.

**Manual checks (lead's per-story browser smoke, Chrome AND Edge — Rule 3 tier until Epic 3 CI; evidence saved to `evidence/story-1-3-smoke-*`):**
- `npm run dev`: from the door you see the amber-lit empty slot stretches unobstructed down both side walls; walk forward — the closed door stops you; the Welcome Flyer is legible beside it at ~1m; walk diagonally into a pillar — you stop and slide along it.
- Screenshot each zone hue from the authored 6m vantage (pinball (−8.5,1.0), workshop (1.5,−5.5), casual (0,0.5), snack (1.5,3.0), roadmap (−8.5,−2.5) and (1.0,0.5)): hue pool reads without any UI label; walls show no painted glow; hard corners everywhere.
- `window.arcadeDebug.player` at spawn shows (0, 5.6, yaw 0); served DOM is still canvas-only.

## Auto Run Result

Summary: the authored Arcade Room delivered per the Code Map — one authored AABB volume list rewritten in place (envelope walls with the bottom-center door gap, closed blocking door, two occluder pillars, street side), 20-slot Wall Slot config under revision `wallslots-r1-2026-11-21` with fill-scan indices and roadmap stretch, four fixed zones with DESIGN-exact hues plus roadmap amber, the one Welcome Flyer surface, design tokens, injected-canvas painters, a fake-Seam-pinned scene builder extruding one box per volume, and main.ts wiring onto it with ENTRY_SPAWN; the 1.2 resolver untouched. Review pass 1 (four layers) triaged 21 grouped findings: 13 patched inline, 1 deferred (Epic-3 harness tier), 6 rejected with reasons, 1 environmental note.

Files changed: `core/room/collision-volumes.ts` (rewritten in place; now exports WALL_T/WALL_TOP/DOOR_TOP/INTERIOR/ENTRY_SPAWN), `core/room/slot-config.ts`, `core/room/zones.ts`, `core/room/signage.ts`, `core/room/tokens.ts`, `core/room/surfaces.ts`, `core/room/scene.ts`, `core/room/room.test.ts`, `core/room/occlusion.test.ts`, `core/room/surfaces.test.ts`, `core/room/scene.test.ts` (all new), `core/main.ts` (room build + entry spawn), `core/main-glue.test.ts` (1.3 wiring pin added in review pass 1), `core/player.test.ts` + `core/player-qa.test.ts` (Code-Map-preauthorized pin moves only), `core/no-ui-dom.test.ts` (room-module scan extended), this spec.

Review findings breakdown: 21 findings — high 1 (patched), medium 6 (patched), low 6 (patched), deferred 1 (frontmatter `deferred:`), rejected 6, note 1. Full rows in the Review Triage Log.

Follow-up review recommendation: yes — this pass patched a high finding (entry-wiring coverage gap); a fresh pass at the next epic-cycle encounter of this diff is warranted.

Verification performed: `npm run typecheck` exit 0; `npm test` 141/141 green (140/140 before the review patches; the new main-glue wiring pin is the +1); `node ci/depcheck.mjs` exit 0; `node ci/lint-bans.mjs` exit 0; `node tools/gen-registry.mjs && git diff --exit-code -- generated/` byte-identical; `npm run build` exit 0 (chunk-size warning = the three.js bundle, expected, no gate). Matrix Test Audit: all 12 I/O rows mapped to executed green tests; the Chrome-vs-Edge row is the lead's designated smoke tier (DW-12 precedent). Rule 19: all seven planned AC mutations observed red then reverted byte-identical (sha256), plus the added wiring-pin mutation (delete buildRoomScene call -> only the new pin red, restored byte-identical). Rule 3 manual browser checks NOT executed by this stage — no browser harness; they are the lead's per-story smoke listed under Manual checks.

Residual risks: real-browser runtime evidence (hue readability at 6m, flyer legibility, screenshots to `evidence/story-1-3-smoke-*`) rests with the lead's Chrome+Edge smoke this story; the Three seam's mapping to real THREE.* runs only in the browser (source-pinned, not executed — deferred); local verification ran on Node 24 while `engines` pins 26 (type-stripping works both; environment, not the diff).

Status: done
Blocking condition: none

Plan pass (this section covers this pass only). Epic context reused (valid, not recompiled); 1.2 continuity loaded; spine consulted — AD-7/AD-10/AD-24/AD-25 governed, the "Room geometry & collision" Conventions row is this story's binding form; room-layout.md + DESIGN.md tokens + floor-plan measurements loaded once; geometry authored and pre-measured (both sampled sightlines blocked, roadmap sightlines clear, aisle minima ≥1.20m, min pillar↔cabinet 5.05m — computed, not assumed); ledger inbox empty (nothing to address or decline).
