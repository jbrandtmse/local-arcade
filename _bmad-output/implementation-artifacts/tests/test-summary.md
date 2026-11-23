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
