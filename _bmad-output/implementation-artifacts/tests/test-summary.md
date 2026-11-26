# Test Automation Summary — Story 1.7 (QA stage, 2026-11-24)

Target: the implemented deliverable of Story 1.7 (`git diff --name-only 131ad25..e214182` on ARC-1-epic1 — the new `core/containment.ts` seam (boot guard, guardInstance quarantine, stall watcher, injectFault), the widened supervisor (ring cap + HookName), the optional `faultedFor` legs in seat/scheduler, and the main.ts rewiring + moved pins). Acceptance criteria: the spec's Tasks & Acceptance + I/O & Edge-Case Matrix. Framework: the project's existing convention — `node --test` over co-located `*.test.ts` (`npm test`); no new dependency; no browser harness this epic (DW-12/DW-15 precedent — the `arcadeDebug.containment.injectFault` flow and the Chrome+Edge row stay the lead's smoke).

## Generated Tests

### Fault-site QA probes
- [x] `core/containment-fault-sites.test.ts` (QA) — the three kernel→sim sites whose FIRST-fault path had never been executed: (1) the watcher's own stateHash sample — a throwing stateHash quarantines at its own site, one record under hook "stateHash" at the cycle boundary (not "tick", not "stall"), the watcher stops sampling without synthesizing a stall, the frozen hash stays the safe total; (2) the composed Rule 1 consumer integration — the scheduler's dwell launch through the boot-seam guard into a throwing autoplay(): one `moon-patrol.autoplay#1` record at the launch tick, the Patron lifts on the next dispatch (occupancy attract, figure off, queue void), and across 480 further ticks the launch gate never relaunches while the loop keeps ticking (runCount/lastSeed/raw-hook counters all frozen at the fault); (3) the snapshot() site nothing on the tick path calls — first-fault quarantine at a non-tick site freezes the loop-driven tick hooks too, and post-quarantine reads stay total.

## Gap-hunt result
Every other matrix row and AC pin was already executed by the implement suite with recorded mutations (the 11-row review triage plus 11 demonstrated mutations stand); the site legs above were the unexecuted remainder. Notably, mutation 1.7m (watcher sampling stateHash unguarded) reddens ONLY the new QA pin — the entire pre-QA containment suite stays green — the discriminator this QA tier adds.

## Coverage
- AC1: tick/events sites (implement) + QA: stateHash, snapshot, autoplay site quarantines (every wrapped hook, not just the tick-path ones).
- AC4: stall predicate + live-half pins (implement) + QA: a throwing stateHash at the watcher is a hook fault, not a stall.
- AC5: figure-lift/no-relaunch pins (implement) + QA: the launch SITE as the fault origin, composed through the real attach seam + loop + scheduler.
- AC6: cap/drain/stamp-order pins (implement) — no QA addition needed; gates re-run at QA finalize.
- Lead-tier rows (fresh environment forward/reverse, Chrome+Edge injectFault smoke) untouched per dispatch.

## Verification run (post-QA)
- `npm test`: 298/298 pass (295 at dev finalize + 3 QA).
- `npm run typecheck`: 0. `node ci/depcheck.mjs`: 0. `node ci/lint-bans.mjs`: 0.
- `node tools/gen-registry.mjs && git diff --exit-code -- generated/`: no drift. `npm run build`: green (entry-chunk warning precedent).
- QA file green standalone and against scheduler/scheduler-breaks/seat neighbours in BOTH orders (hermeticity spot-check; every rig builds its own loop/instances).
- Rule 19: 3 QA mutation demonstrations (1.7m watcher direct-sample — pre-QA suite blind, QA pin red; 1.7n launch-gate delete — composed pin red; 1.7o snapshot-leg bypass — QA pin red + two corroborating containment pins). Each red observed, reverted, `git status`/`git diff --stat` byte-identical, suite re-green 298/298. Recorded in the spec's `## Verification` QA block.

## Next Steps
- Committed by the lead already (`bdac3a5` QA test file; Verification/tracker bookkeeping through `a4ae068`) — this CR pass corrected the stale "Lead commits" instruction. Remaining lead-tier work: the fresh-environment forward/reverse check and the Chrome+Edge injectFault smoke.

---

# Test Automation Summary — Story 1.5 (QA stage, 2026-11-23)

Target: the implemented deliverable of Story 1.5 (`git diff --name-only 584110e..HEAD` — the vendored Moon Patrol plugin `games/moon-patrol/sim|presentation`, the wrapper `play(seed)` seam, `core/seat.ts` + the extended input/player/cabinets/surfaces/main legs, the one-entry registry, and the story's own test pins). Acceptance criteria: the spec's Tasks & Acceptance + I/O & Edge-Case Matrix. Framework: the project's existing convention — `node --test` with native TS type-stripping (`*.test.ts` under `core/`, `ci/`, `tools/`; `games/**/*.test.js` joined this story); no new dependency (spine-pinned set). The "E2E" surface is the scripted module surface (real kernel loop, real wrapper instance from the generated registry, real seat service) — `window.arcadeDebug` execution and the Chrome+Edge matrix rows stay the lead's browser smoke (DW-12/DW-15 precedent: the executed browser tier lands with the Epic-3 harness).

## Generated Tests

### Control-mapping QA probes
- [x] `core/seat-controls.test.ts` (QA) — AC4's executed declared-slot law beyond the move-letter leg the implement suite drove: KeyX/KeyK jump ('jump' fx drains + buggy airborne vs a grounded no-key twin), KeyZ/KeyJ fire (the fwd+up volley — buggy-exclusive, so the twin's never-shooting pin is airtight vs tank 'fire' fx — plus 'fire' fx), ArrowRight→fast cap 190 / ArrowLeft→slow floor 100 with the free-run-shortfall arithmetic. Plus the UX-DR24 legend law as a three-way set identity (adapter on-screen legend text ↔ core/main.ts authored SEAT_KEYS ↔ the key set these tests drive), nine keys both directions — the defect class that once advertised PAUSE/MUTE on a dead vocab had no tie between screen text and kernel map; closed at the established source-pin tier (DW-15).
- [x] `core/visit-arc.test.ts` (QA) — the whole-visit E2E on the module surface, one run: walk, E opens, E sits (seeded play, play pose, debug record), die mid-seat, attract resumes ALIVE in place (hash advances 120 ticks), Enter restarts on a fresh kernel seed (rebuilt world at spawn x), E stands (exact pose restore, door closed, attract), the cycle RE-ARMS (open/sit/play/stand again — the 1.4 door law survives a full death cycle), room walking resumes; plus drained pair order + plain-data identity + bounded arcadeDebug.seat event record. The stand-after-death-and-restart and second-sit path was covered by no single implement test.

## Coverage
- AC1/AC2: untouched by QA — fully pinned at the gate + wrapper tier (provenance/PROVISIONAL scans, depcheck sim leg, conformance tests with recorded mutations).
- AC3: cycle-hash + adapter op-log pins (implement) + QA: mid-visit attract liveness inside a whole play session, legend set-identity.
- AC4: E-law + move-axis + transcript-identity pins (implement) + QA: jump/fire/arrow slots executed with twins, stand + re-sit on the repeat cycle.
- AC5: death/Enter/seed-role pins (implement) + QA: the same facts asserted on the arc run (pair order, plain data, fresh-seed restart, bounded window) with independent stub seeds [8, 5150, 77].
- AC6: gates re-run at QA finalize (245/245); registry drift still exact.

## Verification run (post-QA)
- `npm test`: 245/245 pass (238 pre-QA + 7 QA). New files green standalone and in either run order (hermeticity spot-check).
- `npm run typecheck`: 0. `node ci/depcheck.mjs`: 0. `node ci/lint-bans.mjs`: 0.
- `node tools/gen-registry.mjs && git diff --exit-code -- generated/`: byte-identical, one entry.
- Rule 19: 5 QA mutation demonstrations — seat buttons loop narrowed to the first slot (KeyX jump red), standUp skips the door close (arc door pin red), sim stops emitting scoreSubmitted (arc pair-order red, reads 'burst'), attract clock frozen (arc hash-advance red), legend drops 'X or K' alt (legend set-identity red). Each named pin went red, reverted, file md5-verified byte-identical (seat.ts d2fbb78…, sim/index.js d114310…, adapter.js a5d6c5c…), tree verified clean after every revert, final full-suite sweep green 245/245 plus all gates. Recorded in the spec's `## Verification` QA block.

## Next Steps
- Lead commits the QA test files + this block (this stage forbids committing), then runs the fresh-environment forward/reverse check (Rule 19 fresh_check) and the Chrome+Edge smoke.
- 1.6 autoplay/scheduler will touch the arc rig only through the registry entry and the seat track entry — the QA probes read both from `generated/game-registry.ts`, never retype them.

---

# Test Automation Summary — Story 1.4 (QA stage, 2026-11-23)

Target: the implemented deliverable of Story 1.4 (`git diff --name-only de093fc..HEAD` — code only: the new authored module `core/room/cabinets.ts` + derived `cabinet-B0` entry in `collision-volumes.ts`, the `paintMarquee`/`paintScreen`/`repaintScreen` additions to `surfaces.ts`, the extended Three seam in `scene.ts` (rotation, texture marker, per-placement parts + lights, returned handles), the `main.ts` wiring, and the story's own test pins). Acceptance criteria: the spec's Tasks & Acceptance + I/O & Edge-Case Matrix. Framework: the project's existing convention — `node --test` with native TS type-stripping (`*.test.ts` under `core/`, `ci/`, `tools/`); no new dependency (spine-pinned set). The "Chrome vs Edge" matrix row stays the lead's browser smoke (DW-12 precedent — a browser harness would be an escalation).

## Generated Tests

### Cabinet shell QA probes
- [x] `core/room/cabinets-qa.test.ts` (QA) — AC1: the REAL 1.2 resolver walks against the derived entry (pressed flush at body-front + PLAYER_RADIUS, side slide, same-entry centred targeting — the smoke's "the body stops the walk" now has an automated leg) and an independent test-local re-derivation of the footprint from the slot record + SHELL spec; AC2: the painter uppercase law at mixed-case input (the authored record is already uppercase — the law had no pin until this probe); AC3: liveness/determinism/repaint-cost through the REAL `createKernelLoop` — equal-tick runs paint byte-identical FULL op-logs, 0-tick differs from 30-tick, 4 repaints across 31 frame reads; AC4: the pose law as geometric invariants (hinge fixed, exact 90 deg axis-swap about the SAME point, lever preserved, slot rigid); AC5: every SHELL part built exactly once at its spec dims, every part colour a tokens.ts hex (material leg of the token law).

## Coverage
- AC1: exact-id + derived-AABB pins (implement) + QA: real-resolver blocking/slide/target walk, independent geometry re-derivation.
- AC2: cap equality + marquee op-log + fontPx pins (implement) + QA: uppercase law at mixed-case input (the pre-QA suite was blind to a dropped toUpperCase).
- AC3: phase/paint-step + scan-law + same-canvas pins (implement) + QA: byte-identical full op-logs via the real kernel loop, repaint-cost counting.
- AC4: Rule-1 integration + exact pose numbers (implement) + QA: pose-law invariants (hinge/slot rigidity independent of the exact values).
- AC5: light-hue set + text-set + mesh-formula pins (implement) + QA: part-mesh existence + token-colour material law.
- Real dev-serve + DOM scans stay as the implement extended them; Chrome-vs-Edge stays the lead's smoke.

## Verification run (post-QA)
- `npm test`: 177/177 pass (171 pre-QA + 6 QA).
- `npm run typecheck`: 0. `node ci/depcheck.mjs`: 0. `node ci/lint-bans.mjs`: 0.
- `node tools/gen-registry.mjs && git diff --exit-code -- generated/`: byte-identical, registry 0 entries.
- `npm run build`: green (same three.js chunk-size warning as 1.3 — unchanged).
- QA file green standalone and against its neighbours in both run orders (hermeticity spot-check).
- Rule 19: 5 QA mutation demonstrations — one per AC, none re-running the lead's five gate classes or the four review-pass lines: blocksMovement flip (walk passes through the body), toUpperCase drop (implement suites stay green — the QA probe is the discriminator), bandOffset decoupled from the paint step (dead screen), hinge flipped to visitor-right (axis-swap breaks), raw near-miss hex on the coin-slot material (token-set red). Each red observed with attribution, reverted, `git diff --stat` byte-identical, suite re-green 177/177. Recorded in the spec's `## Verification` QA block.
- Gap hunt finding: the uppercase law (AC2's "exactly the placement title verbatim, uppercased") had no executable pin — the authored record satisfies it by construction; closed by the QA probe, no implementation change needed.

## Next Steps
- Lead commits the QA test files (this stage forbids committing).
- 1.5 driving attract content through the shell will move the QA AC3 op-log probes only if the zone record changes (they read it from `placementByVolumeId`, never retype it).

---

# Test Automation Summary — Story 1.3 (QA stage, 2026-11-22; lead refresh for rework pass 1 + cr-2 — DW-18)

Target: the implemented deliverable of Story 1.3 (`git diff --name-only 438b840..HEAD` — story_base to head, covering rework pass 1 `a85fa07` and cr-2's test patches; the QA stage itself ran from the pre-rework baseline `cbc66b65` —
the rewritten `core/room/collision-volumes.ts`, new authored modules
`slot-config/zones/signage/tokens/surfaces/scene`, `core/main.ts` wiring, and the story's
own test files). Framework: the project's existing convention — `node --test` with native
TS type-stripping (`*.test.ts` under `core/`, `ci/`, `tools/`); no new dependency. The
"Chrome vs Edge" matrix row stays the lead's browser smoke tier (DW-12/DW-15 precedent —
no browser harness this epic).

## Generated Tests

### Authored-room data + real-resolver QA probes
- [x] `core/room/room-qa.test.ts` (QA) — front-facade seams (the two front-wall segments plug
  the door exactly, street-floor/street-wall share one bounding seam); street-volume
  passability through the real 1.2 resolver (cross the strip sideways, walk its depth, an
  outside walk presses the door's street face); entry-spawn clearance + wiring + yaw-0
  facing; fill-scan order re-derived independently from run membership; roadmap stretch
  membership and amber positions; Casual Alley kept-clean law BOTH ways (no slot, no
  blocking volume); aisle probes (main aisle >=1.20, pillar->cabinet-box >=5.0 recorded
  5.05, per-slot approach clears every blocker >=0.70); sampled sightlines + the
  ear-blocks-eye occluder-subset pin (test-local slab clip, AD-7 keeps the production
  raycast in Epic 2); paintFlyer sentinel probes (the painter prints only the injected
  string — in only the injected colours, on one injected canvas). The wrap + fit-law
  containment law (every painted line MEASURES within the sheet minus 2x the margin;
  throws on a word or leading that no longer fits) is pinned at the implementation tier
  in `surfaces.test.ts` (rework pass 1), not in the QA file — cr-2 re-attribution.

### Scene-builder QA probes through the injected Three seam
- [x] `core/room/scene-qa.test.ts` (QA) — the envelope-spanning ceiling slab carries the
  Room Black token and rests above the wall top; the front-wall wainscot bands never
  intrude into the door opening (1.9's swing clearance — the review pass fixed this but no
  probe held it); the build-time one-surface law (the only painted text across every
  injected canvas is the flyer record's string — checked by substring + character
  order across the wrapped lines since rework pass 1, not by exact wrap points); the scene consumes the authored
  zone/roadmap/door lighting with hues drawn only from zone tokens + amber + door glow.

## Coverage
- AC1: id-set/door/street pins (implement) + QA: facade seam contiguity, street-volume
  passability, closed door from BOTH sides, entry-spawn clearance.
- AC2: pitch/order/roadmap pins (implement) + QA: fill order re-derived from runs, stretch
  membership (side runs, front half).
- AC3: implement sightlines + QA: independent slab-clip sightlines, occluder-subset
  ear-blocks-eye law.
- AC4: hues/lights pins (implement) + QA: Casual Alley kept-clean BOTH ways, amber never
  crossing zones.
- AC5: implement probes + QA: independent aisle probe set incl. per-slot approach against
  EVERY blocker.
- AC6: verbatim record + fake-canvas pins (implement) + QA: painter prints only the
  injected string (sentinel), build-time one-surface law.
- AC7: extrusion/emissive/BoxGeometry pins (implement) + QA: ceiling Room Black
  token-specific, wainscot never crosses the door gap.
- Real dev-serve + DOM scans stay as the implement extended them (`core/no-ui-dom.test.ts`);
  Chrome-vs-Edge stays the lead's smoke.

## Verification run (post-QA)
- `npm test`: 157/157 pass (141 pre-QA + 14 QA + 2 rework pass 1 fit-law/containment probes).
- cr-2 (rework re-review, 2026-11-22): 4 test files patched — comment parity
  ("rework pass 1"/"review pass 3" labels) plus a new scene.test.ts assertion that the
  flyer canvas measures the record's sheet metres (texture aspect == mesh aspect); no new
  tests. Re-verified 157/157 green at lead resume 2026-11-22.
- `npm run typecheck`: 0. `node ci/depcheck.mjs`: 0. `node ci/lint-bans.mjs`: 0.
- `node tools/gen-registry.mjs && git diff --exit-code -- generated/`: byte-identical.
- QA files green in one run forward and reverse order (hermeticity spot-check).
- Rule 19: 9 QA mutation demonstrations — 1-2 per AC, each a mutation CLASS the lead's
  gate list (door delete, L2 0.05, pillar-1 +1x, workshop hue, pillar-1 into L-aisle,
  middot drop, emissive add, build-call delete) did not cover: street-floor flip,
  spawn-into-door-clearance, index swap, pillar-2 z-shift, alley-rect swallow, pillar
  widening, painter invented copy, ceiling token swap, wainscot sign flip. Each red
  observed, reverted byte-identical (sha256), QA file re-green. Pin-independence shown
  where probes overlap (e.g. the index swap reddened fill order only; the pillar widening
  reddened aisles only). Recorded in the spec's `## Verification` QA block.
- Gap hunt finding: none blocking. The pre-QA suite's wainscot/door-gap law (fixed in
  review pass 1) had no pin holding it — now pinned by scene-qa; no implementation change
  was needed to make any QA probe pass.

## Next Steps
- Lead commits the QA test files (this stage forbids committing).
- 1.4's shells entering the volume list will move QA's kept-clean and approach probes only
  if they legitimately violate the authored minima; sightline pins sample the pillar-kind
  subset on purpose (Epic 2 widens its own set on its own pins).

---

# Test Automation Summary — Story 1.2 (QA stage, 2026-11-21)

Target: the implemented deliverable of Story 1.2 (`git diff --name-only 56765fa..HEAD` —
`core/input/`, `core/player.ts`, `core/room/collision-volumes.ts`, `core/loop.ts`,
`core/main.ts`, and the story's own test files).
Framework: the project's existing convention — `node --test` with native TS type-stripping
(`*.test.ts` under `core/`, `ci/`, `tools/`). No new dependency; the in-browser halves of the
no-UI law and Chrome/Edge parity stay the lead's per-story browser smoke (DW-11), as an added
browser harness would be a spine-pinned-set escalation.

## Generated Tests

### Controller / device-view QA pins
- [x] `core/player-qa.test.ts` (QA) — X-face circle-vs-AABB clamp + wall slide (side walls
  block and sliding along them keeps walking); targeting-ray pitch term (looking steeply up
  past a cabinet stub clears the target); aim-delta consumption exactly once through the real
  input service + real loop (no carry into the next tick); the AC7 determinism seam —
  `core/player.ts`/`core/input/index.ts` use contract math only, never wall-clock or
  engine-variable intrinsics.

### Browser-glue static-contract pins (no browser harness this story)
- [x] `core/main-glue.test.ts` (QA) — `frame()` reads player tick state only (camera position
  = x/z + eye height + the bob term, rotation = pitch/yaw, YXZ order, no wall-clock reads in
  render — AD-3); pointer-lock denial swallowed silently and visibility/blur clear the device
  buffer (AC3, UX-DR18); device listeners are pure forwarders and the lock check compares
  `document.pointerLockElement` to the canvas (AD-7 thin glue, AC4).

## Coverage
- AC1: existing DOM pins (implement suite + real dev-serve) + lead's html-body-hud-div mutation — no QA addition needed.
- AC2: look-sign and walk pins (implement) + QA: consumed-once through the real loop, camera-Y bob term in the render read.
- AC3: aim-channel pin (implement) + QA: silent denial catch, blur/visibility glue, lock-element compare.
- AC4: E-edge, click-inert, reach pins (implement) + QA: targeting-ray pitch term.
- AC5/AC6: placeholder-data and blocking pins (implement) + QA: X-face clamp/slide — the pre-QA suite was blind to an inverted X pushout face.
- AC7: replay-identity pin (implement) + QA: determinism-seam construction pin.
- The rendered (in-view) half of AC5/no-UI and Chrome-vs-Edge equality remain the lead's smoke (DW-11, Epic 3 CI matrix).

## Verification run (post-QA)
- `npm test`: 113/113 pass (106 pre-QA + 7 QA).
- `npm run typecheck`: 0. `node ci/depcheck.mjs`: 0. `node ci/lint-bans.mjs`: 0.
- `node tools/gen-registry.mjs && git diff --exit-code -- generated/`: byte-identical.
- QA files pass standalone in both orders (hermeticity spot-check).
- Rule 19: 7 QA mutation demonstrations — one per QA pin, none re-running the 13 already
  demonstrated (6 implement + 7 lead gate); each red observed, reverted, tree byte-identical.
  Recorded in the spec's `## Verification` QA block. Notable: the consumed-once claim got its
  first demonstrated red (mutation 3), and the X-face inversion (mutation 1) red was invisible
  to the entire pre-QA suite.

## Next Steps
- Lead commits the QA test files (stage forbids this agent from committing).
- 1.3 rewrites `core/room/collision-volumes.ts`: QA pins cite volume ids and derive faces from
  the data, so they move with the data per the spec's Shared surfaces line, not before it.
- When a browser harness decision lands (Epic 3 CI matrix), the glue pins here are the static
  contract it must reproduce live.

---

# Test Automation Summary — Story 1.1 (QA stage, 2026-11-21)

Target: the implemented deliverable of Story 1.1 (`git diff --name-only 22602bc..HEAD`).
Framework: the project's existing convention — Node's built-in `node --test` with native TS
type-stripping (`npm test` discovers `*.test.ts` under `core/`, `ci/`, `tools/`). No new
third-party dependency (spine-pinned set; browser harness would need one — escalated by design,
the browser smoke stays with the lead's per-story check per spec intent-3).

## Generated Tests

### Composed kernel e2e
- [x] `core/e2e-kernel.test.ts` (QA) — loop + wrapper + supervisor + rng wired as `core/main.ts`
  wires the registry: deterministic twin transcripts (events + stateHash, seed-bound),
  mid-run `tick()` fault contained (neighbours keep performing), `events()` fault contained
  per call site, backgrounded-tab burst bounded with per-tick events kept.

### Build-artifact / CLI e2e
- [x] `tools/registry-e2e.test.ts` (QA) — real generator invocation over a temp repo; the emitted
  registry module `import()`ed and wired through the kernel; behavior identical to direct
  construction with declared seeds; fresh regeneration replays identically.
- [x] `tools/app-serve.test.ts` (QA) — real Vite dev serve over HTTP (named target
  `127.0.0.1:4639`, strictPort) serving the entry module graph; real production build asserting
  the static bundle (hashed entry chunk, three bundled, Room Black call). Headless half of the
  Dev-serve matrix row; console/render half remains the lead's browser smoke.

## Coverage
- AC1: bootstrap pins (implement suite) + serve/build real-runtime artifacts (QA).
- AC2: seed-dir pins (implement suite) — no QA addition needed.
- AC3/AC4/AC5: unit pins (implement suite) + composed multi-instance runs with fault injection and
  catch-up under load (QA). The out-of-tick-write -> supervisor chain (G27) and cross-engine
  determinism (G31) stay deferred per the ledger — not re-exercised here.
- AC6: gate pins (implement suite) + registry-as-consumable-module determinism (QA).
- AC7: lint-ban fixture pins (implement suite) — gates already run as real subprocesses there.

## Verification run (post-QA)
- `npm test`: 66/66 pass (59 implement + 7 QA).
- `npm run typecheck`: 0. `node ci/depcheck.mjs`: 0. `node ci/lint-bans.mjs`: 0.
- `node tools/gen-registry.mjs && git diff --exit-code -- generated/`: byte-identical.
- QA files green in one run forward and reverse order (hermeticity spot-check).
- Rule 19: 3 QA mutation demonstrations (one per QA file), each red observed, reverted,
  blob-verified; recorded in the spec's `## Verification`.

## Next Steps
- Lead commits the QA test files (stage file forbids this agent from committing).
- When 1.5 lands its first real sim, extend `tools/registry-e2e.test.ts`'s wiring path to the
  moon-patrol entry rather than fixtures.
- Full browser-console serve check happens at the lead's per-story smoke (and the CI browser
  target needs an owned decision if it is ever automated — new dependency class).

---

# Test Automation Summary — Story 1.6 (QA stage, 2026-11-23)

Target: the implemented deliverable of Story 1.6 (`git diff --name-only 4f334c1..HEAD` on ARC-1-epic1).
Framework: the project's existing convention — `node --test` over co-located `*.test.ts` /
`*.test.js` (`npm test`). No new dependency; no browser harness this epic (DW-12/DW-15 precedent —
the `window.arcadeDebug` execution row and the Chrome+Edge matrix stay the lead's smoke).

## Generated Tests

### Patron scheduler — canonical-break coverage
- [x] `core/patrons/scheduler-breaks.test.ts` (QA) — the roundBreak half of the break law,
  unpinned by every executed rig leg (all natural autoplay/gameover drains are gameEnded): present
  claim honoured at a level-clear break through the SeatHandover seam, and the absent claim's
  same-break re-offer on the next derived seed with the wait persisting.

## Gap-hunt result
The implement suite (scheduler/presenter/autoplay suites + moved 1.5 pins + gen-registry fixtures +
no-ui-dom provenance scan) executes every other I/O-matrix row and all six AC pins with recorded
mutations — no re-demonstration needed. One matrix leg left unpinned by choice, recorded in the
stage's Decisions: the wait row's "a second cabinet's E while waiting" error cell is unreachable
at M0 (exactly one busy placement — pinned; byGame uniqueness — pinned; the triage's IA5 rejected
the same two-claimant class). The lead-tier rows (fresh environment, Chrome+Edge) untouched.

## Coverage
- AC1/AC2/AC3/AC6: implement pins stand (executed + mutations recorded in the spec); no QA addition needed.
- AC4/AC5: implement gameEnded pins + QA roundBreak pins (the previously unexecuted half).
- Matrix: every automatable row now has an executed test; error-cell and lead rows as above.

## Verification run (post-QA)
- `npm test`: 274/274 pass (272 at dev finalize + 2 QA).
- `npm run typecheck`: 0. `node ci/depcheck.mjs`: 0. `node ci/lint-bans.mjs`: 0.
- `node tools/gen-registry.mjs && git diff --exit-code -- generated/`: clean.
- QA file green standalone; forward and reverse order against `scheduler.test.ts` (hermeticity).
- Rule 19: 1 QA mutation demonstrated — `drop roundBreak from the break-kind condition` killed both
  new pins red (gameEnded rig pins stayed green; the pre-existing impulse-scope pin also dies,
  confirming the condition's other leg), reverted byte-identical (blob a12ebc29 before/after);
  recorded in the spec's `## Verification`.

## Next Steps
- Lead commits the QA test file + spec Verification line (stage forbids this agent from committing).
- Epic 3's second busy placement makes the wait row's second-cabinet leg executable — pair it with
  the Manifest `busy` story's QA pass.
