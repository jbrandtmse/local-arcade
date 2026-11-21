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
