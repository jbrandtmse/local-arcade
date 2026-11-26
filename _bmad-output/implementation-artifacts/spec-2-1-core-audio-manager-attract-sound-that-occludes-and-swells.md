---
title: 'Story 2.1: Core Audio Manager — attract sound that occludes and swells'
type: 'feature'
created: '2026-11-26'
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
      The browser wiring this story adds (real AudioContext construction, gesture-resume
      glue, live param actuation in core/main.ts) has no executed test host — Node has no
      WebAudio. It is pinned by the fake-graph tier, pure-law tiers, and source-text pins.
    evidence: |-
      Verified at planning: repo-wide scan finds zero AudioContext/WebAudio references in
      core/ or games/ today; the repo already runs this posture for the renderer glue
      (main-glue.test.ts source pins; executed browser tier deferred to the Epic-3 harness
      per DW-15, and the dispatch confirms source pins + headless fakes are this story's
      falsifiable tier). A browser-glue edit that keeps the source text intact would ship
      silent with the suite green; the lead's smoke walk is the runtime check.
    location: >-
      core/main.ts (Manager construction + gesture glue); pinned in core/main-glue.test.ts
    severity: low
---

<intent-contract>

## Intent

**Problem:** Pull-ladder rung 1 has no sound. The room renders attract visuals, but no Cabinet makes any sound at all: the repo contains zero WebAudio code in `core/` or `games/` (verified scan — only planning docs match). FR-3/CAP-3 require attract sound that is spatialized, occluded by the room's one AABB geometry, and muffled by pillars so a Visitor locates a machine by ear alone; the Story 1.9 street-door beat ships only the visual twin of the swell.

**Approach:** Exactly one Core Audio Manager in a new `core/audio/` owns the single injected AudioContext and one node chain per placed Cabinet (looping source -> lowpass BiquadFilter -> gain -> PannerNode -> destination). Occlusion (single raycast against the `core/room` volume list) and the mix law are pure tick-state functions with hysteresis (dead-band + dwell; placeholder numbers until Story 3.7), actuated on the kernel tick. Moon Patrol supplies its attract loop as an authored plain-data recipe inlined into the build-generated registry (sealed bundle, zero runtime fetch). The door beat gains its tick-derived sound twin, and the L0 lint ban extends into the adapter half so games can never own a graph.

## Boundaries & Constraints

**Always:**
- Exactly one AudioContext, created at exactly one site in `core/main.ts` and owned by the Manager; per-Cabinet chain as above; PannerNode spatialization (HRTF) + authored distance model; occlusion = gain reduction + lowpass; single ray only (soft multi-ray explicitly deferred, AD-7).
- The occlusion raycast rides the single AABB list in `core/room/` (conventions row: audio and sightline share one occluder set) — "what blocks the ear blocks the eye" (AD-7).
- Mix derivation reads only kernel tick state: listener pose (entry `pose()` through the beat, `player` state in control), scheduler occupancy, entry phase + bleedFraction. No wall clock anywhere in `core/audio/` (AD-3/AD-7). The Manager runs as a supervisor-wrapped loop system (`loop.addSystem`), so an audio fault is a logged fault, never a dead room (AD-15).
- Occlusion transitions use hysteresis — dead-band + dwell as a pure tick function — so standing at a boundary never flips audio per tick (CAP-3).
- The attract loop is active per placement while the Cabinet is not visitor-seated; Patron autoplay keeps it sounding.
- Game audio assets are authored game data inlined at build time via the generated registry (AD-11/AD-18): zero runtime fetch, no binary blobs in the repo.
- Node tiers are this story's falsifiable evidence: pure-law tests with literal expected values, a fake-AudioContext graph rig, and source pins; the executed browser/audio-runtime tier defers to the Epic-3 harness (same posture as 2.0's renderer pins) — report honestly, label by-ear claims.
- Non-ASCII in string literals via escapes only (Rule 14); comments state contracts, not history.

**Never:**
- No game half (sim or presentation) references `AudioContext`/`webkitAudioContext`/`OfflineAudioContext` or creates any node — the extended L0 ban covers these paths (AD-2/AD-7).
- No three.js audio classes (the spine names PannerNode directly), no new npm packages, no downloaded audio assets.
- No wall-clock, `Math.random`, or frame-driven pacing in `core/audio/` (AD-3).
- No final hysteresis/attenuation/geometry numbers — every audio constant is an authored placeholder labelled as such; Story 3.7's audit sets finals.
- No channel budget / distance-cull / nearest-N, no awake-set implementation, no seated focus mix (Story 2.2); no volume or focus-mix Settings row (2.4); no game-initiated play-mode SFX this story.
- Never hand-edit `generated/`; never hand-edit `deferred-work.md`; never touch either `sprint-status.yaml`; no git commit or push anywhere in this story; never touch the lead's running dev server on :5173.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Cabinet heard around a pillar | listener position derived from authored volume data (mirror the cabinet->pillar axis; never retyped coords), ray to cabinet-B0 | raycast reports the pillar hit only when the dead-banded AABB (shrunk by DEADBAND_M) is truly crossed; after DWELL_TICKS the applied class uses the authored pillar profile: gain cut + lowpass on B0's chain; listener-pose + HRTF panner carry the positional change | n/a — law |
| Boundary flapping | synthesized alternating occlusion samples, one per tick, forever | applied occlusion class never flips per tick; flips only after DWELL consecutive ticks of the other sample | n/a — hysteresis law |
| Street-door sound twin | entry phase `door`/`ready-handle`, listener `ENTRY_STREET_VIEW`, cabinet B0 | occluder set for the B0 ray is exactly `["door-front"]` (attenuated, not silent: the door profile); the attract level swells with entry `bleedFraction` across `ENTRY_RAMP_TICKS` — the sound twin of 1.9's light twin (UX-DR16) | n/a |
| Autoplay-blocked browser | injected context reports `suspended` | room, beat, and visuals run unaffected (already-shipped visual twin carries); sound is silent; each wired gesture (click / mousedown / keydown glue) triggers a resume attempt until resumed | rejected resume stays silent, retried on next gesture |
| Occupancy gates the loop | scheduler occupancy `patron-autoplay` vs `visitor-seated` | loop keeps sounding through Patron autoplay; gain law goes to 0 while visitor-seated and back on standing — a gain law only, no source start/stop churn | n/a |
| Malformed attract recipe | `attract-sound.json` fails shape validation | `tools/gen-registry.mjs` fails with an entry-indexed message (the impulsePath idiom) and the build is red | generator fail-fast |
| Determinism | the same tick inputs replayed twice | identical mix targets and byte-identical synth buffer (synth uses `core/contract` math only) | n/a |
| Fresh-environment ordering | every added/changed test on a clean environment, either order | all pass | n/a |

</intent-contract>

## Code Map

- `core/audio/` -- NEW (manager.ts / mix.ts / occlusion.ts / synth.ts + co-located `*.test.ts`): the only code in the repo that names WebAudio node factories.
- `core/room/collision-volumes.ts` -- `collisionVolumes` :71, the single AABB list; `VolumeKind` :35 (`wall|pillar|door|street|cabinet`); occluder subset = kinds wall/pillar/door; ids `pillar-1`/`pillar-2`, `door-front` :116; header note: Y extents already exist for occluder reuse.
- `core/room/occlusion.test.ts` -- Story 1.3 pins; its test-local `segHitsRect` :25 + `blockers()` :52 are the sibling of the new production raycaster (do NOT edit it; see Design Notes for the copy-vs-extend record).
- `core/room/cabinets.ts` -- `cabinetPlacements` :191 (one placement: B0, gameId `moon-patrol`, `busy: true`), `placementGeometry` :224 (center x/z), `stepCabinetPhase` :367 (attract phase law, untouched).
- `core/patrons/scheduler.ts` -- `state()` :100 -> `{tick, cabinets[]}`; `Occupancy` values `"attract"` :199 / `"patron-autoplay"` :156 / `"visitor-seated"` :224 — the loop gate's input.
- `core/entry.ts` -- `EntryState` :82 (`phase`, `bleedFraction`), `ENTRY_STREET_VIEW` :71, `ENTRY_RAMP_TICKS` :67 — the swell twin's ONLY state source (pure, already tick-derived).
- `core/player.ts` -- `PlayerState` :40 (x, z, yaw) — listener pose once in control.
- `core/loop.ts` -- `addSystem` :47/:110: systems run supervisor-wrapped as `core.system.<id>` after sims; register the audio system after entry/player/patrons/seat so it sees this tick's truth.
- `core/main.ts` -- loop creation :170; system registrations :358-425 (insert `audio` after :425); input glue :431-448 (the gesture-resume hook points); `window.arcadeDebug` :658.
- `core/contract/wrapper.ts` -- `GameRegistryEntry` :85 gains optional `attractSound` (the sibling precedent is `impulses` :99); `PresentationFactory` :71 stays byte-identical.
- `tools/gen-registry.mjs` -- the impulsePath read/validate/embed block :105-124 is the sibling to extend for `attractSoundPath`; `tools/registry-list.json` -- moon-patrol entry gains `attractSoundPath`; `generated/game-registry.ts` -- regenerated, never hand-edited.
- `ci/lint-bans.mjs` -- scan set `simFiles()` :64 covers only `games/<id>/sim/**` today; rule tables :34-99; extend per Tasks (same scanner, new file set + rules). `ci/lint-bans.test.ts` -- harness with planted-violation fixtures; extend.
- `games/moon-patrol/assets/` -- `impulse-mapping.json` precedent; NEW `attract-sound.json` (authored recipe = the game's supplied asset, AD-7).
- `games/moon-patrol/presentation/adapter.js` -- factory :23; must stay audio-free (the lint law, not an edit).
- `core/main-glue.test.ts` -- the source-pin idiom for main.ts wiring (renderer-posture pins are the model).

## Tasks & Acceptance

**Execution:**
- `core/audio/occlusion.ts` -- production single-ray segment-vs-AABB over kind-filtered volumes (`wall|pillar|door`): shrink each AABB by `DEADBAND_M` before clipping, require Y-extent intersection, return hit ids ordered by entry distance; co-located literal-value tests deriving sample positions from authored data -- the ear-blocking geometry stays one list (AD-7).
- `core/audio/mix.ts` -- pure law: `(listenerPose, entryState, occupancy, occlusionSample, dwellState) -> per-volumeId {gain, lowpassHz} + next dwellState`; authored per-kind occlusion profiles `{gain, lowpassHz}` + `DWELL_TICKS`/`DEADBAND_M` constants, each labelled placeholder-until-3.7; occupancy gate and entry-swell composition; tests pin the boundary-flap and dwell-count outcomes with literals (CAP-3).
- `core/audio/synth.ts` -- recipe -> Float32 loop PCM using `core/contract` math only; pin buffer length and a hash-of-samples literal (the `contract/hash` idiom).
- `core/audio/manager.ts` -- sole graph owner; the AudioContext arrives by injection (the module names no host interface — the DOM-free `core/room` idiom); builds exactly one chain per placement once at init (looping source -> lowpass -> gain -> HRTF panner -> destination); per-tick actuation: listener pose from entry `pose()` / player state, panner at `placementGeometry().center` + an authored speaker-height constant, mix targets -> AudioParam targets (see Design Notes for the actuator boundary); suspended-context law: silent until a wired gesture triggers a resume attempt; fake-graph rig asserts exactly one context, one chain per placement, and the asserted param target values.
- `core/contract/wrapper.ts` -- `GameRegistryEntry.attractSound?: AttractSound` (+ export the recipe type) -- the build-time asset seam, sibling of `impulses`.
- `tools/gen-registry.mjs` + `tools/registry-list.json` -- optional `attractSoundPath` -> read, parse, shape-validate, embed; malformed recipe fails entry-indexed; regeneration stays byte-identical -- the sealed-build asset inline (AD-18).
- `games/moon-patrol/assets/attract-sound.json` -- authored chiptune attract-loop recipe within the validated shape; the implementer composes content that plausibly reads as a cabinet attract loop (the walk judges feel; the suite judges shape + checksum) -- games supply assets (AD-7).
- `ci/lint-bans.mjs` + `ci/lint-bans.test.ts` -- extend the scan to `games/<id>/presentation/**`; new rule `no-webaudio-graph`: identifier references to `AudioContext` / `webkitAudioContext` / `OfflineAudioContext` (bare, `new`, and `globalThis.`/`window.` forms) are banned in BOTH plugin halves; planted-violation fixtures go red, clean repo stays green -- the L0 ban covers these paths (AD-2/AD-7).
- `core/main.ts` -- construct the Manager once at boot with the real AudioContext at exactly one site; `loop.addSystem("audio", ...)` registered AFTER patrons/seat; resume attempt on the existing click/mousedown/keydown glue (:431-448) while suspended; `manager` joins `window.arcadeDebug` -- the only real-graph wiring.
- `core/main-glue.test.ts` -- source pins: exactly one AudioContext construction site, audio system registered after patrons/seat, arcadeDebug entry, gesture glue calls resume -- the browser-wiring tripwire tier.
- Co-located `core/audio/*.test.ts` -- every I/O-matrix edge case gets a Node-tier pin (flap law, dwell counts, door-front-only ray from the street view, swell ramp values, suspended/resume law, occupancy gate, determinism twin).

**Ledger inbox (Rule 17):** `LEDGER slice 2-1-core-audio-manager-attract-sound-that-occludes-and-swells` reads empty — nothing to address or decline.

**Acceptance Criteria:**
- Given every placed Cabinet, then the injected graph shows exactly one AudioContext and one source->lowpass->gain->panner chain per placement, panner at the placement center at the authored speaker height with an authored distance model and HRTF panning — asserted against the fake rig (games never appear as graph owners; AD-7).
- Given listener and cabinet separated by a pillar volume (positions derived from authored data), when the dead-banded raycast hits, then the applied profile cuts gain and lowers the cutoff on that chain, and removing the occlusion restores both after dwell; listener pose + HRTF carry the positional difference (FR-3 at law level). The by-ear localization leg is labelled: its executed tier is the Epic-3 harness plus the lead's smoke walk.
- Given occlusion samples that alternate per tick at a boundary, then the applied class flips only after `DWELL_TICKS` consecutive ticks of the other sample — never per tick (CAP-3; pure function, literal pins).
- Given the same tick inputs replayed, mix targets and the synth buffer are byte-identical, and a scan finds no wall-clock identifier in `core/audio/` — wall time enters only at the labelled `core/main.ts` gesture glue (one labelled boundary, the entry.ts idiom).
- Given the street-door beat, then B0's occluder set from `ENTRY_STREET_VIEW` is exactly `door-front` and the attract level swells with `bleedFraction` across `ENTRY_RAMP_TICKS`; given a suspended context, the room and beat run silent and unaffected, and each wired gesture attempts resume (UX-DR16 sound twin; autoplay block survives via the already-shipped visual twin).
- Given a game attempting its own graph, when `node ci/lint-bans.mjs` runs, then planted `AudioContext` references in either plugin half exit 1 and the clean repo stays green (L0 ban covers the paths, AD-2/AD-7).
- Given the registry, `node tools/gen-registry.mjs && git diff --exit-code -- generated/` is clean and the recipe is embedded; a malformed recipe fails the generator (sealed-build integrity).
- Given the full loop (`npm run typecheck`, `npm test`, `node ci/depcheck.mjs`, `node ci/lint-bans.mjs`, registry drift) then all green; `npm run build` once at story end green.
- Given a fresh environment, every added or changed test passes in either order.

## Spec Change Log

## Review Triage Log

## Design Notes

**Governing AD ids (Rule 6):** AD-7 (one Core Audio Manager owns the graph; games supply assets+requests; PannerNode spatialization, distance attenuation, single-ray raycast occlusion gain+lowpass against the dedicated `core/room` occluder set; multi-ray deferred), AD-1/AD-2 (import direction stays clean — `depcheck` green; the L0 ban extension enforces the adapter-half WebAudio ban), AD-3 (mix derives from tick state only; Manager is a loop system), AD-15 (audio runs supervisor-wrapped; an audio fault is a logged fault, the room never crashes), AD-11 (registry regeneration is the asset's only path into the bundle), AD-18 (sealed build: recipe inlined at gen time, zero runtime fetch), AD-23 (occupancy is scheduler-owned state read via `state()` — Manager mutates nothing), AD-27 (audible ⇒ awake: no wake set exists in `core/` yet and there is one placed Cabinet, so the interlock holds trivially; channel budget / nearest-N / awake set are Story 2.2's, numbers 3.7's), AD-14 (Core side is TypeScript).

**plan: decisions recorded (unattended-run policy).**
1. Asset mechanism: the attract sound is an authored plain-data recipe (`games/moon-patrol/assets/attract-sound.json`), parsed + shape-validated + inlined by `gen-registry` — the sibling of the `impulsePath` block (:105-124), not a binary blob, not a runtime fetch. `GameRegistryEntry.attractSound` widens the wrapper seam exactly as `impulses` does. The recipe -> buffer mechanism is a seam contract future game epics will build against; candidate spine Conventions row for the lead to write at the bookkeeping commit (Rule 20 — not this stage's to write).
2. Loop-gate law: attract sound is active per placement while occupancy != `visitor-seated` — the busy Patron keeps the cabinet audible (SPEC CAP-3: every placed Cabinet runs Attract Mode with spatial audio; the repo's only cabinet is `busy: true`, so an idle-only gate would ship a silent story). Visitor-seated play goes silent: in-play game audio needs the game-initiated request surface (see 6).
3. Occluder set = `collisionVolumes` entries of kind `wall|pillar|door`; `cabinet|street` excluded (floor strips never cross the eye-height segment; cabinet-kind occlusion is a 3.7 audit candidate). Per-kind authored profiles `{gain, lowpassHz}` live in `mix.ts` — labelled placeholders (epic context: numeric values are placeholders this epic; 3.7 finals).
4. Hysteresis form: dead-band = shrink the occluder AABB by `DEADBAND_M` before slab-clip (grazing never counts); dwell = the applied class changes only after `DWELL_TICKS` consecutive matching samples. Both pure, tick-counted; starting placeholders 0.05 m / 30 ticks (inference, labelled).
5. Swell twin: the door-phase ramp reuses `entry.state().bleedFraction` — already tick-derived — instead of authoring a second beat law (one law for the beat, its visual and sound twins read the same state).
6. No game-initiated request surface this story. Rules 1/2 note: the Manager's consumers in-story are the kernel wiring (main.ts system) and the moon-patrol plugin as asset supplier (Integration pin: the game's recipe reaches exactly one owned chain per cabinet, asserted via the fake rig). The first game-initiated audio request (play-mode SFX) will be the Moon Patrol reimplementation game epic; the L0 ban + asset path already pin the boundary it will play inside.
7. Raw WebAudio via injection, not three.js audio classes: the spine names PannerNode/gain/lowpass directly; `core/audio/` names no host interface (the door.ts / `core/room` DOM-free idiom); `core/main.ts` passes the real AudioContext in — the fake rig injects the same shape (extends, not copies, the fake-Three pattern from scene.test.ts).
8. Actuator boundary (AC "never wall-clock" honesty): AudioParam smoothing (`setTargetAtTime`) runs on the audio clock; the derivation feeding it reads only tick state. Labelled, like entry.ts's two labelled wall-clock points — this is the story's one labelled boundary, at the main.ts glue.

**Extend, don't copy (Rule 2).** Siblings: gen-registry's impulse-asset block (extended); lint-bans' rule tables and test harness (extended); the fake-rig idiom (re-used shape). The production raycaster in `core/audio/occlusion.ts` re-derives, rather than imports, `occlusion.test.ts`'s test-local `segHitsRect`: the 1.3 helper is 2D, pillar-only, and pinned by 1.3's geometry law; the production form is kind-filtered, Y-extent-aware, and ordered by distance. Making 1.3's test import 2.1's module would couple its authored-geometry pins to audio-module churn; unification is a 3.7 candidate, recorded here.

**Falsifiability (for implement/QA to demonstrate).** Delete the dwell counter -> flap test red; widen dead-band to 0 while moving the test listener to the grazing position -> hit-never-fires law red; swap the `wall`/`door` profiles -> street-phase gain pin red; set occupancy gate to idle-only -> busy-cabinet audible pin red; remove the `door-front`/wall kind from the filter -> occluder-set pin red; plant `new AudioContext` in the adapter -> lint-bans red; edit the recipe inline out of sync -> drift/gen-validation red.

**Consumed-by:** Story 2.2 (proximity ladder + seated focus mix layer onto this Manager and the `mix.ts` law — epic-context dependency row), Story 2.4 (Settings master volume acts on the Manager's master gain), Story 2.6 (M1 walk's audio variant), Story 3.7 (final numbers replace every placeholder), the Moon Patrol reimplementation game epic (first game-initiated request consumer). **Consumes:** `core/room/collision-volumes.ts` (occluder set), `core/entry.ts` (beat state), `core/patrons/scheduler.ts` (occupancy), `core/player.ts` (listener pose), `core/room/cabinets.ts` (placements), the generated registry (asset), `core/loop.ts` (system seat).

**Continuity from Story 2.0 (done):** this story rides the byte-identical guarantees 2.0 promised audio (collisionVolumes untouched, attract phase law untouched) — the only core/room touch here is reading the list, never editing volumes. The fake-rig and source-pin tiers follow 2.0's executed-tier deferral posture (its `deferred:` item about main.ts wiring is the precedent this spec's frontmatter `deferred:` re-states for audio glue).

## Verification

**Commands:**
- `npm run typecheck` (loop) -- expected: clean.
- `npm test` (loop) -- expected: all green including every new `core/audio/` suite; if one foreground call runs long, split by test file (`node --test <file>...`) and land all files green in the session.
- `node ci/depcheck.mjs` (loop) -- expected: AD-1 import direction clean.
- `node ci/lint-bans.mjs` (loop) -- expected: clean with the widened scan (sim + presentation halves).
- `node tools/gen-registry.mjs && git diff --exit-code -- generated/` (loop) -- expected: no registry drift.
- `npm run build` (once, at story end) -- expected: clean static bundle.

`Shared surfaces:` `tools/registry-list.json` + `generated/game-registry.ts` (read by gen-registry.test.ts, registry-e2e.test.ts, the drift command — the new optional field must ride the same change set so no loop command passes against a partial edit); `GameRegistryEntry` in `core/contract/wrapper.ts` (contract seam; wrapper.test.ts); `ci/lint-bans.mjs` scan set + rule table (lint-bans.test.ts); `window.arcadeDebug` in core/main.ts (entry/visit-arc test readers). Hermeticity: every test added or changed passes on a fresh environment, in either order; no `core/audio/` test touches :5173, another test's state, or execution order.

**Manual checks:**
- Start your own dev server on a fresh port (never the lead's :5173): after the first gesture the console shows exactly one AudioContext; the room runs silent-and-normal before it (autoplay-blocked path).
- By-ear localization and the door swell are the lead's smoke / the Epic-3 harness tier — report them as deferred, never claim them from the suite.

## Auto Run Result

Status: ready-for-dev
Blocking condition: none

Planning-stage halt per dispatch (`Halt after planning.`). The spec above is the contract; implement stage records `baseline_revision` at its clean-tree start. The epic-2-context cache (compile attempt 4) was validated current (newer than every planning-artifacts file) and reused, not recompiled. Uncommitted spec is staged for the lead's validation gate — nothing committed or pushed.
