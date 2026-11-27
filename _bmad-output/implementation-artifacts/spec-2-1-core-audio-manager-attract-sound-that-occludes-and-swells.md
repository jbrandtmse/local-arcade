---
title: 'Story 2.1: Core Audio Manager — attract sound that occludes and swells'
type: 'feature'
created: '2026-11-26'
status: 'done'
baseline_revision: '09a273bfdbe0c390e9cd56763edea2d8d037c724'
baseline_commit: '09a273bfdbe0c390e9cd56763edea2d8d037c724'
review_loop_iteration: 0
followup_review_recommended: true
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

- [implement 2026-11-26] Scanner defect found by the falsifiability pass, fixed in-pass: `ci/lint-bans.mjs`'s unstable scanner lexes each backtick independently, so the CLOSING backtick of a `${...}` template literal starts a fresh literal and swallows the rest of the file (or the next backtick) into one token — any code after a substituted template was invisible to every rule. The witness "plant `new AudioContext` in the adapter -> lint-bans red" ran GREEN through the planted line because `games/moon-patrol/presentation/adapter.js:57` carries a substituted template. Fix: `scanTokens` re-arms at each substitution tail (literal parts stay opaque; contents scan as code; character-wise walk to the next `${` or closing backtick). This also hardens the pre-existing sim-path bans against future templates. A new `ci/lint-bans.test.ts` test pins that code after a substituted template stays visible to every rule in both halves. No AC or Design Note changed — the spec's lint task ("new rule + extended scan set") stands; the scanner fix is the precondition for the AC's guarantee to hold on the real tree.

- [implement-review 2026-11-26] Listener actuation added (review I1/E1). The intent's spatial law says the listener-pose + HRTF panners carry the positional change — but the shipped first pass never actuated the listener, so attenuation was pinned against wherever the browser left the default listener. The seam gained `setListenerPosition(x,y,z)`, `RawContext.listener` (`RawParamTriple`), and the adapter's third labelled clock site (one `currentTime` read, three `setTargetAtTime` writes); `tick()` drives it from the ear rule (player pose in control/workbench, entry pose pre-control) while the graph runs. The AD-3 source pin now counts exactly 3 `currentTime` occurrences in `manager.ts` (field + param stamp + listener stamp). No AC text changed — the intent contract always required this; the implementation was caught missing it.
- [implement-review 2026-11-26] Guarded boot graph + silent fallback (review B1). An insecure origin (plain http) has no `AudioContext` global, and construction can throw (hardware/policy); the unguarded construction inside `bootArcade` fell to the boot gate's catch — a working room traded for the workbench. `core/main.ts` now builds its graph via `buildAudioGraph()` (typeof guard + construction try/catch, both landing on `createSilentGraph()` — the inert, permanently-suspended fallback no gesture can resurrect), pinned by the glue source pins and new inertness tests. AD-15 posture; no AC text changed.
- [implement-review 2026-11-26] Review-pass hardening batch (each its own root cause, all pinned): `mix.ts` profile lookup reads the caller-threaded volume list instead of a module-level id→kind map (E4); `ci/lint-bans.mjs` graph-ban receivers widened to the global aliases `self`/`top`/`parent`/`global` and the keyword-lexed `global` token accepted, violation reports deduped by position+rule (B5/E5/B6/V4); gen-registry gates `sampleRate` to the `createBuffer` range `[8000, 192000]` and rejects recipes whose rounded render is empty (E2); a dead-band invariant pin asserts every authored occluder stays fatter than `2 x DEADBAND_M` on every axis (B4/E3 — the general thin-volume clamp stays a 3.7 pass); dead `occluderVolumes` export removed and `SMOOTHING_S`/`SPEAKER_HEIGHT_M`/the panner law now pinned as literals (B7/V3); the main.ts timer pin tightened to the call form `set(Timeout|Interval)\s*\(` (B8/I6); Rule 14 — literal em-dashes in this story's assertion-message strings replaced by Unicode escape sequences in the source (I4). No AC or Design Note changed.

## Review Triage Log

### 2026-11-26 — Review pass (first pass, four layers, 24 findings)

Verdicts: 24 findings — high 0, medium 9, low 15, false 0, maybe-false 0. Patched 21, rejected 3. One shared root cause groups: B4/E3 (dead-band thin-volume exposure), B5/E5 (lint receiver set), B6/V4 (duplicate lint reports), B7/V3 (dead export + unpinned smoothing), B8/I6 (timer regex), E1/I1 (listener never actuated), B2/V1 (adapter executed-tier).

- [B1][medium][patch] `core/main.ts` constructed `AudioContext` ungarded inside the boot try — insecure origin or throwing constructor loses the room to the workbench. Fix: `buildAudioGraph()` guard legs + `createSilentGraph()` fallback; glue pins + inertness tests.
- [B2][medium][patch] The browser adapter (`createWebAudioGraph`) had no executed test — only the fake-graph seam it feeds was exercised. Fix: shadow-RawContext test runs the real adapter in Node (loop flag, lowpass type, panner law on the node, stamped params, listener triple, connects, buffer copy).
- [B3][low][patch] Silent cabinet (registry entry without a recipe) untested. Fix: test asserts full chain, no buffer/source, debug `hasRecipe: false`, `gameId: ""`.
- [B4][low][patch] Thin authored occluders would silently invert under the dead-band shrink; nothing caught drift in `DEADBAND_M`. Fix: invariant pin over the authored list (door z 0.120 thinnest leg); general clamp deferred to 3.7 (noted in Auto Run Result).
- [B5][medium][patch] Graph-ban receivers stopped at `globalThis`/`window`: `self.AudioContext` etc. walked green in both halves. Fix: `WEBAUDIO_RECEIVERS` widened; `global` accepted as keyword token; alias fixtures pin each receiver.
- [B6][low][patch] One physical reference could report twice (destructure leg + bare leg own one position). Fix: dedupe by `file:line:col:rule`; count pins.
- [B7][low][patch] Dead `occluderVolumes` export; `SMOOTHING_S` unpin-as-literal. Fix: export removed; literal pins for `SMOOTHING_S`, `SPEAKER_HEIGHT_M`, and the full `PANNER_SETUP`.
- [B8][low][patch] The no-timer glue pin's regex had word-order slack. Fix: `set(Timeout|Interval)\s*\(` call-form pin; W14 witness planted.
- [B9][low][patch] The synth output clamp leg was dead code for the authored recipe (amps never sum past 1). Fix: overlapping full-amp notes saturate exactly ±1 (W7/Witness shows the pin catches it).
- [E1][medium][patch] Same root cause as I1: listener never actuated. Fix above (listener seam + adapter stamp + tick wire + follow tests).
- [E2][medium][patch] gen-registry accepted recipes that throw at boot (sampleRate 4000, sub-sample loops). Fix: createBuffer-range bound + empty-render guard, both pinned; W11 witness.
- [E3][medium][patch] Same root cause as B4. Fixed with the invariant pin.
- [E4][low][patch] `profileForApplied` read a module-level kind map, ignoring the caller's volume list — a threaded-scene caller gets wrong profiles. Fix: lookup reads the injected list; injection-observable pin (W15 witness).
- [E5][medium][patch] Same root cause as B5. Fixed with the receiver widening.
- [V1][medium][patch][pre-verified] The adapter had no executed test host (pre-verified gap, trust as filed). Fix: same shadow-RawContext tier as B2 — the adapter now executes under Node.
- [V2][medium][patch] Four AC claims (looped source, listener law, silent cabinet, swell/gain actuation while suspended) had pins but no demonstrated mutation witness. Fix: W1-W6/W8 witnesses recorded in `## Verification`.
- [V3][low][patch] Same root cause as B7. Fixed.
- [V4][low][patch] Same root cause as B6. Fixed.
- [I1][medium][patch] Same root cause as E1 — intent matrix row 1 (positional change rides the listener) unimplemented. Fixed; listener-follow + suspended-no-write tests pin it.
- [I2][low][reject] Claim: the swell's phase window (boot-check/door/ready-handle/open) is not re-pinned in mix law tests. Rejected: Design Note 5's one-law reading — `bleedFraction` IS the swell, and the window is pinned by 1.9's entry-phase law; a mix-side phase-window list would duplicate the source of truth (fix would edit this build's own contract reading).
- [I3][low][reject] Claim: adapter reads `ctx.currentTime`, a wall-clock-ish read in `core/`. Rejected: Design Note 8 labels exactly this boundary; the AD-3 pin confines the count to the three labelled sites — the guard the finding wants already exists and adding another would widen the scan without new law.
- [I4][low][patch] Rule 14: literal em-dashes inside this story's string literals. Fix: Unicode escape sequences in the source across the touched test files (pre-existing literals in older-story files left untouched — not this build's lines).
- [I5][low][reject] Claim: the AD-15 fault posture (audio system throwing) is not exercised in this story. Rejected: the registration posture (supervisor-wrapped system after patrons/seat) is delivered and pinned by the glue pins; the fault law itself is 1.7's containment supervisor and already pinned there — re-pinning in 2.1 adds a branch to an owned-elsewhere law.
- [I6][low][patch] Same root cause as B8 (timer regex). Fixed.

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

**Mutations demonstrated (implement pass, 2026-11-26; each applied → red → reverted, tree byte-identical):**
- mutation: delete the dwell counter in `advanceDwell` (candidate applies on first match) → `core/audio/mix.test.ts` dwell-flip + alternating-flap + release-dwell pins red (3 fail)
- mutation: `DEADBAND_M = 0` → `core/audio/occlusion.test.ts` grazing-pin + over-pillar-top pin red (2 fail)
- mutation: swap the `wall` and `door` entries of `OCCLUSION_PROFILES` → `core/audio/mix.test.ts` "mix law literals" door pin red (0.125 → 0.03125)
- mutation: `occupancyGate` to idle-only (nonzero only while `attract`) → `core/audio/mix.test.ts` busy-cabinet autoplay pin red
- mutation: drop `"door"` from `OCCLUDER_KINDS` → `core/audio/occlusion.test.ts` kind-set pin + street door-front pin red (2 fail)
- mutation: plant `new AudioContext()` in `games/moon-patrol/presentation/adapter.js` after the substituted template at :57 → `node ci/lint-bans.mjs` exit 1 naming no-webaudio-graph. First attempt ran GREEN through the planted line: the unstable scanner swallowed everything after a substituted template's closing backtick into one token — see Spec Change Log; fixed by re-arming `scanTokens` at substitution tails, pinned by a new `ci/lint-bans.test.ts` test (code after a substituted template stays visible to every rule, in both halves).
- mutation: `attract-sound.json` gain 0.45 -> 0.46 → `core/audio/synth.test.ts` hash-of-samples pin red, and regenerated `generated/game-registry.ts` bytes drift (md5 6c7d42dd -> a62ad497), restored on revert.
- mutation: drop `source.connect(lowpassNode)` in `manager.ts` → `core/audio/manager.test.ts` one-owned-chain topology pin red (connects array misses the source->lowpass leg).
- mutation: add `void Date.now();` inside `mixStep` → `core/audio/manager.test.ts` AD-3 no-wall-clock source-scan pin red (`core/audio/mix.ts` flagged).

**Mutations demonstrated (review-pass patches, 2026-11-26; each applied → red → reverted, tree byte-identical by sha256):**
- mutation: `source.loop = true` -> `false` in the adapter → `manager.test.ts` adapter test red ("the attract source is a forever-loop") — records the looped-source AC leg (V2).
- mutation: delete `filter.type = "lowpass";` → adapter test red ("the adapter SETS the colouration type") — records the lowpass-leg AC leg (V2).
- mutation: delete the `setListenerPosition` call in `tick()` → "the listener follows the ear" test red — records the positional-change law (I1/E1).
- mutation: `SPEAKER_HEIGHT_M = 1.5` -> `1.4` → HRTF-panner literal pin red (every derived pin rides the constant; only the literal catches it) — records the panner AC leg (V2).
- mutation: `swellFactor` body -> `return 1;` → `mix.test.ts` swell + mix-law pins red (2), `manager.test.ts` door-swell pin red (1) — records the swell AC leg (V2).
- mutation: delete `if (silent) continue;` in `tick()` → autoplay-blocked pin red — records the suspended-actuation AC leg (V2).
- mutation: module counter added to the synth sample sum → `synth.test.ts` hash + seam + clamp + wave pins red (4) — records the determinism AC leg (V2).
- mutation: drop the `game?.attractSound !== undefined` guard → silent-cabinet test red (construction throws on the missing recipe) — records the silent-attract path (B3).
- mutation: remove `self` from `WEBAUDIO_RECEIVERS` → lint-bans alias test red — records the widened receiver set (B5/E5).
- mutation: `DEADBAND_M = 0.05` -> `0.07` → dead-band invariant pin red naming `door-front` (z 0.120; 0.06 floats a hair past it) — records the thin-occluder exposure (B4/E3).
- mutation: gen-registry `sampleRate` bounds -> positivity-only AND empty-render guard -> `false` → `tools/gen-registry.test.ts` attractSoundPath test red (the 4000 case emits happily) — records the boot-throw gate (E2).
- mutation: delete the `typeof AudioContext === "undefined"` guard leg in `main.ts` → 2.1 audio-wiring glue pin red — records the guarded-boot posture (B1).
- mutation: disable the lint-bans violation dedupe (`if (false) continue;`) → destructure count pin red (4 != 3) — records the single-report law (B6/V4).
- mutation: plant `setTimeout(() => {}, 0);` inside `buildAudioGraph` → 2.1 audio-wiring glue timer pin red — records the gesture-driven resume law (B8/I6).
- mutation: drop the `input.volumes` wire from `profileForApplied` in `mixStep` → "profile lookup reads the INJECTED volume list" pin red — records the injection law (E4).
- mutation: `SMOOTHING_S = 0.15` -> `0.2` → adapter test red at the literal smoothing pin — records the authored glide constant (B7/V3).

`Shared surfaces:` `tools/registry-list.json` + `generated/game-registry.ts` (read by gen-registry.test.ts, registry-e2e.test.ts, the drift command — the new optional field must ride the same change set so no loop command passes against a partial edit); `GameRegistryEntry` in `core/contract/wrapper.ts` (contract seam; wrapper.test.ts); `ci/lint-bans.mjs` scan set + rule table (lint-bans.test.ts); `window.arcadeDebug` in core/main.ts (entry/visit-arc test readers). Hermeticity: every test added or changed passes on a fresh environment, in either order; no `core/audio/` test touches :5173, another test's state, or execution order.

**Manual checks:**
- Start your own dev server on a fresh port (never the lead's :5173): after the first gesture the console shows exactly one AudioContext; the room runs silent-and-normal before it (autoplay-blocked path).
- By-ear localization and the door swell are the lead's smoke / the Epic-3 harness tier — report them as deferred, never claim them from the suite.

## Auto Run Result

Status: done
Blocking condition: none

**Summary.** Story 2.1 delivered as specced: one Core Audio Manager (`core/audio/manager.ts`) owns the single injected graph with one looping source -> lowpass -> gain -> HRTF panner chain per placed Cabinet; pure occlusion (`occlusion.ts`, single-ray slab-clip with the dead-band) and pure mix law with dwell hysteresis (`mix.ts`); deterministic PCM synth (`synth.ts`) rendering the Moon Patrol recipe that `gen-registry` validates and inlines (sealed bundle); the door beat's sound twin rides `bleedFraction`; the L0 graph ban covers both plugin halves; boot construction is guarded and falls to a silent fallback graph instead of the workbench. All 8 Design Note decisions landed; the review pass added the listener actuation the intent required (see Spec Change Log).

**Files.** 21 files changed vs baseline 09a273b (+2372/-29): new `core/audio/{manager,mix,occlusion,synth}.ts` + their co-located suites (1682 lines across the 8 files); touched `core/main.ts` (buildAudioGraph, system seat, gesture resume, debug record), `core/main-glue.test.ts` (2.1 pins), `core/contract/{index,wrapper}.ts` (`attractSound` seam), `ci/lint-bans.mjs/.test.ts` (both-halves scan, widened receivers, dedupe), `tools/gen-registry.mjs/.test.ts`, `tools/registry-list.json`, `generated/game-registry.ts` (regenerated), `games/moon-patrol/assets/attract-sound.json`, `docs/game-authoring.md` (checklist wording), this spec.

**Review breakdown (first pass, 24 findings: 0 high, 9 medium, 15 low).** 21 patched across 7 shared root causes (rows carry the fix applied); 3 rejected: I2 (swell window re-pin would duplicate the 1.9 entry law against Design Note 5's one-law reading), I3 (the labelled `currentTime` boundary is Design Note 8's own contract and the AD-3 pin fences its count), I5 (the fault law is 1.7's supervisor, already pinned there; 2.1's registration posture is delivered and pinned). Full rows in `## Review Triage Log`.

**Follow-up recommendation.** `followup_review_recommended: true` (first pass, six medium findings patched). Recommend the lead re-run review at the code-review stage after 2.2 layers onto this Manager, and keep 3.7's authored-audio pass carrying: final profile/smoothing/dwell/dead-band numbers, the general thin-occluder clamp (this pass only pinned the invariant on the authored list), a build-time note when overlapping recipe amps sum past 1, and the 1.3/2.1 rayclip unification (Design Notes, "Extend, don't copy").

**Verification performed.** `npm run typecheck` clean; `npm test` 425/425 green (the four `core/audio/` suites plus `ci/lint-bans.test.ts` 17/17, `tools/gen-registry.test.ts` 9/9, `core/main-glue.test.ts` 12/12 also green run standalone — hermeticity); `node ci/depcheck.mjs` clean; `node ci/lint-bans.mjs` clean on the real tree; `node tools/gen-registry.mjs` re-emits byte-identical to the staged generated module (the drift command shows the intended `attractSound` addition against the pre-change commit — the story's own change set); `npm run build` clean once. 25 mutation witnesses total (9 implement-pass + 16 review-pass) each applied, observed red, reverted byte-identical (sha256-verified) — lines recorded in `## Verification`.

**Residual risks (honest tier statement).** Executed tiers: fake-AudioContext graph rig, pure-law literal pins, source-text pins, and the browser adapter run under a shadowed RawContext in Node. NOT executed anywhere in this story: any browser or audio-runtime tier — real HRTF listener following, by-ear localization, the audible door swell, and the live autoplay gesture wiring are pinned only at source/fake level and deferred to the lead's smoke / the Epic-3 harness (the frontmatter `deferred:` item stands). A browser-glue edit that keeps main.ts's pinned source text intact would ship silent with this suite green.
