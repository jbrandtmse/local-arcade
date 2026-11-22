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
