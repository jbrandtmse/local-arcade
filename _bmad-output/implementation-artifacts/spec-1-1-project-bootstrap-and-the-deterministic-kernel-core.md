---
title: 'Story 1.1: Project bootstrap and the deterministic kernel core'
type: 'feature'
created: '2026-11-21'
status: 'done'
baseline_revision: '22602bcd771829ecc74b0fe9c6e3012da16ba153'
baseline_commit: '22602bcd771829ecc74b0fe9c6e3012da16ba153'
review_loop_iteration: 1
followup_review_recommended: true
context:
  - _bmad-output/planning-artifacts/architecture/architecture-local-arcade-2026-11-19/ARCHITECTURE-SPINE.md
  - docs/game-authoring.md
warnings: ['oversized']
deferred:
  - 'G2 (blind-1/edge-6) ci/lint-bans.mjs depth evasion: Math["random"], destructured Math, new Date()/Date() forms pass the gate; the full L0 gate is Epic 3 (3.1/3.2). Extension-set half of the finding was patched (gate scans now align: ts/mts/cts/js/mjs/cjs).'
  - 'G12 (blind-2/edge-16) core/main.ts boot: a throwing createSim factory is unguarded — one faulty game would kill the whole room at page load, against AD-15 room-never-crashes; needs a supervisor-wrapped boot per-instance.'
  - 'G13 (blind-5) unbounded growth in long-lived processes: supervisor.faults has no cap/dedup (60 entries/s from a permanently broken sim); main.ts never drains loop.eventQueue once games register (1.5).'
  - 'G17 (blind-9) AGENTS.md Running-and-verifying section ("No commands exist yet") is stale the moment this diff lands; agent instruction files are owner-only in an unattended run — lead refreshes via the owning skill.'
  - 'G26 (edge-20) tools/gen-registry.mjs does not validate simPath points under games/<id>/sim/ — AD-1 direction is unenforced at the build step (manifest + L0 land Epic 3).'
  - 'G27 (edge-21/edge-23/intent-1) the matrix Out-of-tick-write row fault chain (write throws -> supervisor logs -> loop survives) has no composable test surface: the design narrates two disjoint surfaces (gate throws to the direct caller; supervisor wraps kernel tick/events sites). Composition deferred with the 1.7 containment work.'
  - 'G31 (intent-4) cross-engine determinism (browser kernel === Node CI hashes) is a construction property (pure IEEE-exact primitives, FNV vectors) but never exercised on two engines; tools/replay (Epic 3) provides the surface.'
---

<intent-contract>

## Intent

**Problem:** The repo is greenfield — no package.json, no code. Every later Epic-1 story needs a running monorepo whose kernel owns a fixed 60Hz clock and whose contract harness makes every future game deterministic, hashable, and fault-contained from day one.

**Approach:** Bootstrap the Structural Seed directories with the spine-pinned stack (Vite app serving an empty Room Black three.js scene), then build the core pieces in TypeScript: the master loop (fixed 60Hz tick, decoupled from render), the `core/contract/` harness (seeded rng, deterministic math, between-tick write freeze, wrapper-computed stateHash, tick→events protocol), the fault-catching supervisor, and the build-time registry generator from a provisional hand-authored list, plus two `ci/` gate scripts (Core→games dependency check, sim-path lint bans).

## Boundaries & Constraints

**Always:** exact-pinned deps from the spine Stack table only (three 0.187.0, @types/three 0.187.0 matching exactly, TypeScript 7.0.2, Vite 8.3.8, Node 26) — no other new third-party dependency; Core source imports no `games/**` (AD-1); contract hook names verbatim `tick(dt, input)` / `attract()` / `autoplay(seed)` / `events()` / `snapshot()` with `stateHash()` wrapper-computed (AD-5, AD-8); sim state mutable only inside the tick window (AD-15); events are plain-data `{type, payload}`, canonical types reserved (AD-6); sim time = tick count; CI checks are deterministic scripts with zero LLM calls (AD-18); `dt` is always 1/60 tick units.

**Never:** no game content (Story 1.5), no room geometry (1.3), no Patron/scheduler (1.6), no identity/storage service (1.8), no `arcade-ledger.json` or Registration flow (Epic 3, 3.3), no Run Recording/replay (AD-26, Epic 3), no full L0 gate or manifest schema (Epic 3, 3.1/3.2), no react-three-fiber or any game framework, no iframes, no outbound network calls.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Same seed determinism | fixture sim through wrapper, same seed, two independent headless runs | identical `stateHash()` sequence and identical event lists | n/a |
| rng cursor round-trip | run N ticks, `getState()` into `snapshot()`, restore, re-run | restored run reproduces the original values exactly; cursor is plain numbers in `snapshot()` | n/a |
| Out-of-tick write | fixture sim holds state ref, writes after the tick window closes | write throws (TypeError); supervisor logs the fault | throw → supervisor, loop survives |
| Sim throws inside tick() | fixture sim throws mid-tick | supervisor catches; fault logged `{tick, errorId}`; loop keeps ticking | caught, never crashes the loop |
| Backgrounded-tab resume | loop test, fake clock: 10s wall gap after normal frames | at most MAX_CATCHUP_STEPS ticks that frame; leftover delta dropped; sim time stays = tick count | n/a |
| Registry generation | provisional list with 2 fixture entries (temp dirs) | `generated/game-registry.ts` re-exports sim halves; byte-identical across two runs | missing/invalid entry → generator exits nonzero with message |
| Empty provisional list | `tools/registry-list.json` = `[]` | empty registry module; dev and build still serve | n/a |
| Core→games import | fixture `core/` file importing `games/x/sim` | `ci/depcheck` exits nonzero citing file:line | n/a |
| Sim-path lint ban | fixture sim source using `Math.random` or `Math.sin` | `ci/lint-bans` exits nonzero naming rule + location; clean sim passes | n/a |
| Integration (Rule 1) | consumer = kernel tick-site test: wraps fixture sim, calls `tick(1/60, {controls})` then `events()` | plain-data canonical `roundBreak` reaches the consumer's event queue verbatim; empty list otherwise | n/a |
| Dev serve | fresh `npm install && npm run dev` | page serves empty three.js scene, Room Black envelope, no console errors | n/a |

</intent-contract>

## Code Map

Greenfield — these are the files the story creates (investigation evidence: repo root holds only planning/docs artifacts; no source exists).

- `package.json` / `package-lock.json` -- exact-pinned deps (three 0.187.0, @types/three 0.187.0), devDeps typescript 7.0.2 + vite 8.3.8, `engines.node >=26`, scripts: dev/build/typecheck/test/registry/depcheck/lint
- `tsconfig.json`, `vite.config.ts`, `index.html` -- strict TS (no enums/decorators: test files run under Node type-stripping); Vite root entry
- `core/main.ts` -- three.js renderer + Room Black clear-color scene, rAF render only; instantiates the loop
- `core/loop.ts` -- master loop: 1/60 accumulator, MAX_CATCHUP_STEPS guard, resume semantics, sim time = tick count; drives registered instances
- `core/supervisor.ts` -- wraps every kernel→sim call site, catches faults, logs `{tick, errorId}`
- `core/contract/rng.ts` `math.ts` `freeze.ts` `hash.ts` `wrapper.ts` `index.ts` -- the harness (see Design Notes)
- `tools/registry-list.json` (provisional, initially `[]`), `tools/gen-registry.mjs` → `generated/game-registry.ts` (committed, deterministic)
- `ci/depcheck.mjs`, `ci/lint-bans.mjs` -- AD-1 check and sim-path banned-API config (TS compiler API)
- `.gitkeep`: `core/room/`, `games/`, `services/report-ingest/` (`.claude/skills/` already tracked — existence AC already satisfied)
- Tests co-located `*.test.ts` (fixture sims live in test files or temp dirs, never in `games/`)

## Tasks & Acceptance

**Execution:**
- [x] `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html` -- create with Stack-exact pins and scripts -- AC1
- [x] `core/main.ts` -- empty Room Black three.js scene + render loop, no geometry -- AC1
- [x] `core/loop.ts` + test -- fixed 60Hz master loop, catch-up guard, resume drop, tick-count sim time -- AC3 (NFR-2)
- [x] `core/contract/rng.ts` + test -- xorshift128+, uniform/range/rangeInt/pick/weighted, getState/restore -- AC4
- [x] `core/contract/math.ts` + test -- sin/cos/tan/asin/acos/atan2/pow/exp/log, fixed coefficients, pinned output vectors -- AC4
- [x] `core/contract/freeze.ts` + test -- write-gated state; out-of-window writes throw -- AC4
- [x] `core/contract/hash.ts` + test -- canonical serialize → FNV-1a 64-bit -- AC4
- [x] `core/contract/wrapper.ts` `index.ts` + test -- inject rng, enforce tick(dt,input)→events(), attract/autoplay mode switches, wrapper `stateHash()`, between-tick freeze -- AC4
- [x] `core/supervisor.ts` + test -- catch faults at all call sites, log, keep loop alive -- AC5
- [x] `tools/gen-registry.mjs` + `tools/registry-list.json` + test -- deterministic registry emit from provisional list -- AC6
- [x] `ci/depcheck.mjs` + test -- fail any Core→`games/**` import -- AC6
- [x] `ci/lint-bans.mjs` + test -- banned-API scan configured for `games/*/sim/**` (self-tested with fixtures) -- AC7
- [x] integration test per I/O matrix row "Integration" + matrix edge-case rows above -- Rules 1/19

**Acceptance Criteria:**
- Given a fresh clone, when `npm install && npm run dev`, then an empty Room Black three.js scene renders; deps are three 0.187.0 + @types/three 0.187.0 (exact match), TypeScript 7.0.2, Vite 8.3.8, Node 26 (AC1)
- Given the repo root, then Structural Seed dirs exist: `core/`, `core/room/`, `core/contract/`, `games/`, `ci/`, `tools/`, `services/`, `.claude/skills/` (AC2)
- Given a fake clock in the loop test, then the kernel advances exactly one global fixed 1/60 tick per step decoupled from render; a long wall gap advances at most MAX_CATCHUP_STEPS and resumes cleanly; sim time = tick count (AC3)
- Given `core/contract/`, then all five harness pieces work per the I/O matrix: seeded rng with cursor, deterministic math, out-of-tick writes throw, wrapper-computed `stateHash()`, `tick(dt,input)`→`events()` (AC4; AD-3/4/5/8/15)
- Given a throwing sim, then the supervisor catches the fault, logs it, and the loop keeps running (AC5; AD-15)
- Given the provisional list, then `tools/` emits the game registry; Core contains no `games/**` imports and `ci/depcheck` fails any planted violation (AC6; AD-1)
- Given fixture sim paths, then lint bans for `Math.random`/`Date.now`/`performance.now` and engine-variable transcendentals fail those fixtures and pass clean sources (AC7; full L0 is Epic 3)

### Review Findings — 2026-11-21 code-review pass 2 (re-spawn 3; layers: blind-hunter, edge-case-hunter, verification-gap, acceptance-auditor; rows=35, HIGH=0)

Scope: `git diff 22602bc` + the uncommitted patches the two interrupted reviewers left in the tree + the three untracked QA tests. This is the story's first full review of the patched tree (no rework block), so every in-story MED was patched, not routed. Verdict: **done** — no HIGH; all MEDs patched in-story or dispositioned with an owner.

**Preserved-tree adjudication (prior reviewer's uncommitted hunks): all 8 kept, zero reverted; each re-checked against the governing ADs, every hunk finished with its pinning test/docs.** `.gitattributes` `*.ts text eol=lf` (kept; comment narrowed to the registry byte-comparison reason — the hunk does not promise a repo-wide EOL policy); `hash.ts` cycle guard (kept, M5); `index.ts` `export * as math` (kept — the spine diagram has no SIM→CONTRACT import edge, so `ctx.math` injection is the only sanctioned math channel); `rng.ts` signed-int32 restore guard (kept, M4); `wrapper.ts` `math` in SimContext + injection (kept, M6); `loop.ts` non-array-events synthetic fault (kept, M1); `supervisor.ts` guarded `onFault` consumer (kept, M3); `gen-registry.mjs` unknown-field strict loop (kept, M12).

| sev | finding (grouped) | disposition |
|-----|-------------------|-------------|
| med | `math.ts` `exp` 1/9! coefficient typo (`2.755731922398589e-7`) biased every `exp`/`pow`-composed result ~1e-10 | patched: coefficient fixed to `2.7557319223985893e-6`, six goldens re-pinned from the fixed module (M8 red) |
| med | wrapper handed the kernel's live input object to `sim.tick()` — a sim write into `input.controls` persisted into the next tick (AD-16) | patched: per-tick `structuredClone` + deep-freeze; write throws, kernel object insulated (M7 red) |
| med | non-array `events()` return from an unwrapped instance was silently dropped — containment depended on how the instance was built (AD-6/AD-15) | patched: loop call site raises a synthetic supervisor fault (M1 red) |
| med | rng `restore()` admitted fractional/out-of-int32 cursors that wrap silently through the Int32Array and fork the stream (AD-4) | patched: exact signed-int32 guard (M4 red) |
| med (re-sights) | lint-bans depth evasion (Math["random"]/destructure/`new Date`); `supervisor.faults` uncapped + `eventQueue` undrained | existing root causes: `occurrence=` trailers on DW-1 and DW-3, no new entries |
| med | lint-bans ban set covers only the nine spine-named transcendentals; ECMA implementation-approximated fns (atan, log2, log10, hypot, cbrt, expm1, log1p, sinh/cosh/tanh) and `**` pass — widening changes AD-4 scope | escalated: DW-8 owner=burndown (architecture-amendment category, owner-only unattended — decision sheet) |
| low | sparse arrays hashed/cloned to malformed `[1,null,…]` — overturns pass-1 edge-9 "unreachable": holes are constructible in gated state | patched: guards in `canonicalSerialize` (M9 red) and `toPlain` (pinned in `freeze.test.ts`) |
| low | symbol keys silently dropped from snapshot/hash | patched: guards in `canonicalSerialize` + `toPlain` (M10 red) |
| low | `canonicalSerialize` had no cycle guard where `toPlain` did — stack overflow instead of TypeError | patched: ancestor guard, diamonds still clone (M5 red) |
| low | a throwing `onFault` consumer escaped `invoke()` and could take the call site down (AD-15 containment) | patched: guarded consumer call, fault record survives (M3 red) |
| low | `loop.start()` pump died on a throw outside the supervisor-wrapped calls (e.g. injected clock) — the fixed tick stopped | patched: `try/finally` re-arms before the throw spreads (M2 red) |
| low | `gateDeep` missed the `setPrototypeOf` trap — prototype swap out of window was legal | patched: trap denies (M11 red) |
| low | gen-registry accepted unknown fields — a `seeds` typo silently dropped a seed | patched: strict schema loop (M12 red) |
| low | `registry-e2e` transcript compare was order-dependent (drained order follows registration order, which differs registry-path vs direct-path) | patched: drained events sorted by gameId |
| low | math fixed-coefficient exactness boundaries undocumented (sin/cos reduction exact to ~1e15; atan2 signed-zero branches not promised) | documented in `math.ts` header; terminal `wontfix-theoretical` DW-9 |
| low | `ci/depcheck` sees literal specifiers only — computed/variable specifiers bypass the AD-1 gate | terminal `wontfix-accepted` DW-10 (`reopen_if=` in note; real static analysis is the Epic 3 L0 gate) |
| low | `docs/game-authoring.md` never said math arrives via the `ctx.math` injection seam | patched: §2 sentence added |
| — | acceptance-auditor: AD-9 provisional-list `seed` field stands in for ledger-derived seeds until Epic 3 — correctly provisional, no action | Epic 3 (3.3) watch note, not ledger work |
| — | re-affirmed pass-1 rejections: tsc-excludes-tests (blind-8/intent-8), NaN clock (edge-14), Infinity weight (edge-12), rangeInt bounds (edge-11), autoplay reseed rollback (edge-13), CLI flag crashes (edge-1/2/18) | rejected — adjudications stand, re-tested against the patched tree |

**Verification after this pass:** `npm run typecheck` 0; `npm test` 75/75 (66 + 9 new pinning tests); `node ci/depcheck.mjs` 0; `node ci/lint-bans.mjs` 0; registry re-emit byte-identical; 12 CR mutation demonstrations below, each reverted and sha256 byte-verified.

## Spec Change Log

## Review Triage Log

### 2026-11-21 — Review pass 1 (layers: blind-hunter 10, edge-case-hunter 23, verification-gap 4, intent-alignment 10)

Verdicts: total=47 — patch=17, partial=2, defer=9, reject=12, false=7. Layer severities disregarded; severities below are mine (Rule 6: AD violation = HIGH). All patch rows applied by the implement agent, verified by a full re-run afterwards.

| id | sev | finding (layer order) | verdict | route | resolution |
|----|-----|----------------------|---------|-------|------------|
| blind-1 | med | lint-bans gate evadable via bracket/destructure/Date forms; extension sets of the two gates misaligned | partial | patch+defer | extensions aligned (ts/mts/cts/js/mjs/cjs in both gates); depth evasion deferred G2 (full L0 is Epic 3, AC7) |
| blind-2 | low | supervisor HookName names snapshot/stateHash/attract/autoplay but loop only ever wraps tick/events; main.ts boot factory unguarded | partial | false+defer | false for call-site claim (loop wraps exactly the sites it invokes); boot guard deferred G12 |
| blind-3 | med | rng.restore() lacks reseed's all-zero fixed-point guard | patch | patch | guard added in restore(); test pins reject-and-determinism |
| blind-4 | med | depcheck.test clean-fixture test swallows nonzero exit (comment claims it asserts) | patch | patch | asserts run(dir).ok === true |
| blind-5 | med | supervisor.faults unbounded; main.ts never drains eventQueue | defer | defer | G13 (cap/drain policy belongs with 1.5+ consumers) |
| blind-6 | med | toPlain() has no cycle guard (stack overflow, not TypeError) | patch | patch | path-local ancestor set throws `cyclic` TypeError; cycle+diamond tests |
| blind-7 | med | toPlain rejects `undefined` but canonicalSerialize silently dropped undefined members — conflicting contracts | patch | patch | canonicalSerialize now throws on undefined members (strict wins); test pins |
| blind-8 | low | tsconfig typecheck never checks ci/ tools/ trees (tests excluded) | reject | reject | deliberate: tests run under Node type-stripping; tsc guards shipped code only |
| blind-9 | med | AGENTS.md "No commands exist yet" stale the moment this lands | defer | defer | G17 (agent instruction file — owner-only in unattended run) |
| blind-10 | med | math.test sin²+cos² invariant missing Math.abs (one-sided tolerance) | patch | patch | Math.abs two-sided |
| edge-1 | low | depcheck --root with no value crashes (TypeError, not clean fail) | reject | reject | still nonzero exit; gate fails safe |
| edge-2 | low | depcheck on tree without core/ ENOENTs | reject | reject | gate is repo-rooted by script; fail mode acceptable |
| edge-3 | high | banned Core->games import passes via template-literal dynamic import | patch | patch | scanner matches NoSubstitutionTemplateLiteral; fixture test |
| edge-4 | high | specifier "../games" (no trailing separator) slips past GAMES_SPEC | patch | patch | regex now `(?:^\|[\\/])games(?:[\\/]\|$)`; fixture test |
| edge-5 | low | lint-bans --root with no value crashes | reject | reject | nonzero exit anyway |
| edge-6 | med | Math["random"] bracket access breaks the token chain | defer | defer | G2 |
| edge-7 | med | sim holding the raw target it passed to ctx.gated() can write out-of-window past the proxy | patch | patch | gated() clones at the seam (structuredClone); raw-target pin test |
| edge-8 | med | toPlain cycle -> unbounded recursion | patch | patch | see blind-6 |
| edge-9 | low | sparse array hashes as malformed "[1,,3]" | reject | reject | unreachable: gated/structuredClone/plain-JSON state; guard-branch |
| edge-10 | med | rng restore all-zero fixed point | patch | patch | see blind-3 |
| edge-11 | low | rng.rangeInt with min > max returns out-of-range values | reject | reject | kernel-side input validation, not a sim hazard this story |
| edge-12 | low | rng.weighted with Infinity weight returns last item silently | reject | reject | guard branch; no caller surface yet |
| edge-13 | low | autoplay() half-applied if sim hook throws after rng.reseed | reject | reject | no autoplay call sites exist this story; supervisor catches faults at those sites when 1.6 lands |
| edge-14 | low | loop stepOnce NaN delta bypasses the delta<0 clamp | reject | reject | injected clock NaN is author error; monotonic clocks assumed (spine AD-3) |
| edge-15 | low | main.ts WebGL construction unguarded | reject | reject | AC1 manual browser smoke (lead's) is the surface; headless serve not promised |
| edge-16 | med | main.ts boot: createSim factory throw kills the room | defer | defer | G12 |
| edge-17 | med | depcheck.test clean fixture silently passes on gate crash | patch | patch | see blind-4 |
| edge-18 | low | gen-registry flag with no value crashes instead of exit-1 | reject | reject | nonzero exit; build-time CLI, list is authored |
| edge-19 | med | gen-registry localName collision (a1 vs a-1 -> gA1) emits uncompilable registry | patch | patch | collision fails the generator; fixture test |
| edge-20 | med | gen-registry simPath not validated to games/<id>/sim | defer | defer | G26 |
| edge-21 | med | out-of-tick write fault never enters supervisor.faults (matrix row chain not composable) | defer | defer | G27 |
| edge-22 | — | claim: engines ">=26" is a range, not an exact Node 26 pin | false | false | spec and spine pin the floor ">=26"; exact-match promise applies to deps only |
| edge-23 | med | claim: out-of-tick write row promises supervisor coverage the wrapper tests disprove | defer | defer | G27 (same composition gap as edge-21) |
| vgap-1 | high | gen-registry repo test overwrites the committed registry instead of pinning it — committed drift can never turn npm test red | patch | patch | test reads committed bytes, regenerates, asserts byte-identical, restores on drift; new mutation demonstration added |
| vgap-2 | med | integration.test order-dependent (tick 4 pinned to prior test's leftovers) | patch | patch | per-test harness(); tick asserted against own clock |
| vgap-3 | med | twin-run "identical event lists" compares two always-empty queues | patch | patch | fire control fed to both twins; eventTotal > 0 asserted |
| vgap-4 | med | loop.start() pump and start-without-schedule have no executed test | patch | patch | fake-schedule start() test + TypeError test |
| intent-1 | med | matrix row 3 fault chain unconstructible at any single surface (R2b reading) | defer | defer | G27 |
| intent-2 | — | AD-6 "canonical types reserved" has no enforcement surface (R3) | false | false | reservation lives in the spine vocabulary; no code/test claims enforcement this story (shape-only validation is what the spec says) |
| intent-3 | — | dev-serve row exercised structurally, not at browser runtime; Node-26 pin never honored on the Node 24 host (R6, R7) | false | false | spec assigns the browser smoke to the lead's per-story manual check; Node-24-with-EBADENGINE recorded as environment limitation, pins kept per Stack |
| intent-4 | med | cross-engine hash equality is construction-only, unexercised (R1) | defer | defer | G31 |
| intent-5 | — | rng round-trip row reads as kernel state-restore; only cursor round-trip exists (R5) | false | false | matches the row at the fixture surface; kernel-driven restore/replay is on the Never list until Epic 3 |
| intent-6 | high | AD-15 "mutation only inside tick()" violated at the surface: gate opened around events()/snapshot()/attract()/autoplay() too (R4) | patch | patch | kernelWindow now wraps ONLY sim.tick; gate-closed call sites tested (mutating inside events()/attract()/autoplay() throws) |
| intent-7 | — | supervisor hook vocabulary wider than wrapped call sites (R9) | false | false | wrapped set complete relative to the sites the kernel path actually invokes this story |
| intent-8 | low | test corpus excluded from tsc --noEmit (contract types unchecked in tests) | reject | reject | same as blind-8: typecheck scope is shipped code; tests are type-stripped by design |
| intent-9 | — | package-lock.json absent from the reviewed patch although a test pins it | false | false | reviewer artifact gap: the lockfile exists and is committed; the diff pathspec excluded it for review-size reasons |
| intent-10 | — | fault log is a superset {tick,errorId,hook,message}; events wrapped in EventRecord | false | false | superset contains the row's shape; the inner event is asserted verbatim |

## Design Notes

**Governing ADs (Rule 6):** AD-1 (dep direction + CI check), AD-2 (harness is the one sanctioned shared seam), AD-3 (Core owns 60Hz clock), AD-4 (seeded rng + math module), AD-5 (wrapper stateHash), AD-6 (canonical event types), AD-8 (calling protocol; L0 config seeded here, completed Epic 3), AD-9 (provisional list stands in for the ledger until Epic 3), AD-11 (build-time registry), AD-13 (monorepo), AD-14 (TS at Core+contract seam), AD-15 (tick-window mutation + supervisor), AD-18 (deterministic, zero-LLM CI).

**Consumed-by:** 1.2 (first-person shell drives the loop), 1.3 (`core/room` data into kernel), 1.5 (Moon Patrol sim through the wrapper — first real game consumer), 1.6 (scheduler rides the loop), 1.7 (supervisor + write-freeze are the containment basis); in-story consumers: `ci/` and `tools/` via the harness, kernel test site via the registry.
**Consumes:** none — first story; consumes only the spine.
**Integration ACs:** matrix row "Integration" (fixture sim as first consumer stand-in); no real game this story — first is 1.5.
**Extend, don't copy:** first source code in the repo; no siblings exist yet.
**Ledger inbox:** none (deferred-work.md does not exist yet; `ledger_load` counted 0).

**Decided in-stage** (small, reversible, spine-consistent):
1. Test runner: Node 26 built-in `node --test` with native TS type-stripping; `tsc --noEmit` is the separate typecheck — zero added deps.
2. Lint bans: deterministic `ci/lint-bans.mjs` using the TypeScript compiler API (already-pinned), not a new linter dependency — the spine treats `ci/` as deterministic scripts.
3. rng: xorshift128+, four 32-bit-word state; `getState()`/restore as plain arrays (matches `docs/game-authoring.md §2`).
4. `stateHash()`: canonical JSON (sorted keys) → FNV-1a 64-bit, pure JS so Node and browser agree.
5. Freeze mechanism: write-gated wrapper — mutations allowed only inside the tick window, out-of-window writes throw (AD-15's observable contract; plain `Object.freeze` cannot un-freeze for the next tick).
6. MAX_CATCHUP_STEPS = 5; on resume the leftover wall-clock delta is dropped (implementation detail).
7. Registry: `tools/registry-list.json` → `tools/gen-registry.mjs` → committed `generated/game-registry.ts` (sorted, deterministic); `arcade-ledger.json` is NOT created here (Epic 3, 3.3).
8. Deps added: only the spine Stack pins — no new third-party dependency, so the licence gate is not triggered.

## Verification

**Commands:**
- `npm install` (once) -- exit 0 on a fresh clone with the committed lockfile, pinned versions exact
- `npm run typecheck` (loop) -- `tsc --noEmit` exit 0
- `npm test` (loop; also once as the full-suite run before finalize) -- every `*.test.ts` under `core/`, `ci/`, `tools/` passes
- `node ci/depcheck.mjs` (loop) -- exit 0 on the real tree; its own test proves a planted Core→games import fails nonzero
- `node ci/lint-bans.mjs` (loop) -- exit 0 on the real tree; fixture tests prove each banned API goes red
- `node tools/gen-registry.mjs && git diff --exit-code -- generated/` (loop) -- re-emit is byte-identical
- `npm run build` (once) -- Vite build exits 0

**Mutation demonstrations (Rule 19; one per AC, each reverted and byte-verified after — `git status --short` / `git diff --stat` unchanged every round):**
- AC1 mutation: package.json `three` pin loosened to `^0.187.0` -> core/bootstrap.test.ts "stack pins are exact (no ranges) and three/@types/three match" went red
- AC2 mutation: `core/room/` seed dir removed -> core/bootstrap.test.ts "Structural Seed directories exist" went red
- AC3 mutation: catch-up guard block deleted from `stepOnce()` in core/loop.ts -> core/loop.test.ts "backgrounded-tab resume: 10s gap -> MAX_CATCHUP_STEPS ticks, leftover dropped, clean resume" went red (600 ticks ran instead of 5)
- AC4 mutation: xorshift shift `s0 << 11` -> `s0 << 12` in core/contract/rng.ts -> core/contract/rng.test.ts seed-1234 `rangeInt(1,6)` golden went red
- AC5 mutation: `throw err` inserted in supervisor `invoke()` catch -> core/supervisor.test.ts "events() call site is also wrapped: a fault there is logged, loop alive" went red
- AC6 mutation: depcheck GAMES_SPEC pattern `games` -> `gamez` in ci/depcheck.mjs -> ci/depcheck.test.ts planted Core->games import (fixture exits nonzero, cites file:line) went red
- AC7 mutation: `"sin"` dropped from TRANSCENDENTALS in ci/lint-bans.mjs -> ci/lint-bans.test.ts "all nine engine transcendentals are banned" went red
- AC6b mutation (patch round): generator template comment line changed in tools/gen-registry.mjs -> tools/gen-registry.test.ts "the repo's own list regenerates the committed registry byte-identically" went red (drift pin, vgap-1); template reverted, generator output sha256 46f38b31… re-verified identical, suite green
- **Code-review pass-2 mutations (Rule 19; re-spawn 3; all 12 turned their pinning test red, each reverted and sha256 byte-verified, suite 75/75 green after):**
  - CR-M1 mutation: non-array `events()` else-branch removed from `runGlobalTick()` in core/loop.ts -> core/loop.test.ts "non-array events() return surfaces as a supervisor fault, not a silent drop" went red (silent drop returned; 0 faults instead of 3)
  - CR-M2 mutation: pump `try/finally` re-arm unwrapped in `start()` in core/loop.ts -> core/loop.test.ts "the start() pump re-arms after a throw outside the supervisor-wrapped calls" went red (schedule never re-armed after the clock glitch)
  - CR-M3 mutation: `onFault?.(entry)` unguarded in core/supervisor.ts -> core/supervisor.test.ts "a throwing onFault consumer is contained" went red (consumer throw escaped `invoke()`)
  - CR-M4 mutation: rng restore guard loosened to `Number.isFinite` only in core/contract/rng.ts -> core/contract/rng.test.ts "restore enforces exact signed-int32 words" went red (`[0.5,1,2,3]` accepted, silent wrap)
  - CR-M5 mutation: both `ancestors.has` cycle guards disabled in core/contract/hash.ts -> core/contract/hash.test.ts "cycles and sparse arrays throw instead of serializing to malformed JSON" went red (RangeError stack overflow, not the `cyclic` TypeError)
  - CR-M6 mutation: `math: mathModule` injection removed in core/contract/wrapper.ts -> core/contract/wrapper.test.ts "ctx.math seam" went red (TypeError on `ctx.math.sin`)
  - CR-M7 mutation: `deepFreezePlain(structuredClone(input))` replaced with the raw `input` in core/contract/wrapper.ts -> core/contract/wrapper.test.ts "the per-tick input view is frozen" went red (write succeeded and mutated the kernel's object)
  - CR-M8 mutation: `exp` 1/9! coefficient reverted to the `2.755731922398589e-7` typo in core/contract/math.ts -> core/contract/math.test.ts pinned goldens went red (2 failures; error ~30x larger)
  - CR-M9 mutation: sparse-array guard disabled in core/contract/hash.ts -> core/contract/hash.test.ts sparse assertion went red (emitted `[1,null,null]`)
  - CR-M10 mutation: symbol-key guards disabled in core/contract/hash.ts and freeze.ts -> hash + freeze symbol tests went red (keys silently dropped)
  - CR-M11 mutation: `setPrototypeOf` trap removed from `gateDeep` in core/contract/freeze.ts -> core/contract/freeze.test.ts out-of-window list went red (prototype swap succeeded silently)
  - CR-M12 mutation: unknown-field loop disabled in tools/gen-registry.mjs -> tools/gen-registry.test.ts "invalid entries fail nonzero" went red (`seeds` typo accepted with exit 0)

**Coverage notes:** matrix row "Out-of-tick write" is pinned by core/contract/freeze.test.ts and the wrapper.test.ts stolen-ref case (write throws, snapshot unchanged) with fault logging covered by core/supervisor.test.ts. All new code is untracked pre-commit, so each mutation round additionally confirmed the mutated file's sha256 identical to pre-mutation. Environment limitation: the suite runs green on Node v24.16.0 with an EBADENGINE warning against `engines.node >=26` -- pins kept per Stack; `ci/` gates tokenize via `typescript/unstable/ast` (TypeScript 7.0.2's native port has no legacy JS compiler API).

**Shared surfaces:** `games/` roster (empty this story; 1.5 adds moon-patrol), `generated/game-registry.ts` entry count (0), root `package.json` scripts set. Standing criterion: every test added or changed passes on a fresh environment, in either order.

**QA additions (2026-11-21, `bmad-qa-generate-e2e-tests`; uncommitted — lead commits):**
- `core/e2e-kernel.test.ts` (QA) — composed loop + wrapper + supervisor run wired exactly as `core/main.ts` wires the registry: deterministic twin multi-instance transcripts (event lists + stateHash sequences, seed-bound divergence), `tick()`-throw containment with neighbours performing, `events()`-throw containment per call site, backgrounded-tab burst with per-tick events kept. Pins AC3/AC4/AC5 at the composition level (deferred G27/G31 chains NOT re-exercised — ledger-owned).
- `tools/registry-e2e.test.ts` (QA) — generator run as a real CLI over a temp repo (never `games/`); emitted module `import()`ed and wired through the kernel; run transcript (events + wrapper hashes per frame) identical to direct construction with the declared seeds; a fresh regeneration replays identically. Pins AC6 for the registry as a consumable artifact.
- `tools/app-serve.test.ts` (QA) — dev serve over real HTTP against the named target `127.0.0.1:4639` (strictPort): entry script in the page, Room Black envelope, `/core/main.ts` and `/generated/game-registry.ts` resolve through the dev graph; production build into a temp outDir: hashed entry chunk >300 KB with `setClearColor` + `0x15110e`/1380622 in it. Headless half of the "Dev serve" row (AC1); the console/render half stays with the lead's browser smoke.
- QA mutation demonstrations (Rule 19; one per QA file, each reverted and blob-verified — `git hash-object` equal to the `HEAD` blob / `git diff --stat` empty every round):
  - AC5-QA mutation: `events()` call site unwrapped from `supervisor.invoke` in `core/loop.ts` `runGlobalTick()` -> `core/e2e-kernel.test.ts` "sim throws inside events() every tick: contained per call site, loop and neighbours alive" went red (fault propagated through `step()`, loop died).
  - AC6-QA mutation: seed-field emission disabled in `tools/gen-registry.mjs` entry template -> `tools/registry-e2e.test.ts` "generated module is importable and wired: identical run to direct construction" went red (declared seeds 123/9 became undefined).
  - AC1-QA mutation: `index.html` entry script src broken to `/core/mian.ts` -> `tools/app-serve.test.ts` dev-serve assertion "index.html loads the entry module" went red and the production build failed to resolve the entry.
- QA re-verification: full `npm test` 66/66 with QA files; `npm run typecheck`, `node ci/depcheck.mjs`, `node ci/lint-bans.mjs`, `node tools/gen-registry.mjs && git diff --exit-code -- generated/` all exit 0; QA files green in one run forward and reverse order.

**Manual checks:**
- `npm run dev` shows an empty three.js scene with the Room Black envelope and no console errors (the lead's per-story browser smoke runs this on Chrome/Edge).

## Auto Run Result

Status: done
Blocking condition: none

**Summary.** Full build + review pass 1 landed the story exactly per the contract: pinned Vite/three/TS bootstrap, the fixed-60Hz master loop, the complete `core/contract/` harness (rng, math, gate, hash, wrapper), supervisor fault containment, the provisional-list registry generator with committed deterministic output, and the two `ci/` gates — all pinned by 59 tests. Review pass 1 (4 layers, 47 findings) patched 17 + 2 partial findings including two HIGH AD-1 depcheck bypasses and one HIGH AD-15 window violation (gate now opens only around `sim.tick()`), then re-verified everything green.

**Files.** `package.json`+lock, `tsconfig.json`, `vite.config.ts`, `index.html`, `.gitignore`; `core/`: `main.ts`, `loop.ts`, `supervisor.ts`, `contract/{rng,math,freeze,hash,wrapper,index}.ts`, `.gitkeep` in `core/room/`; `tools/gen-registry.mjs`, `tools/registry-list.json`, `generated/game-registry.ts`; `ci/depcheck.mjs`, `ci/lint-bans.mjs`; 12 `*.test.ts` (incl. `core/integration.test.ts`); `.gitkeep` in `games/`, `services/report-ingest/`.

**Findings breakdown.** total=47: patch=17, partial=2 (blind-1, blind-2), defer=9 (frontmatter `deferred:` G2/G12/G13/G17/G26/G27/G31), reject=12, false=7. Rejected with reasons: blind-8 + intent-8 (test corpus outside tsc scope — deliberate), edge-1/5/18 (missing CLI flag value still exits nonzero), edge-2 (depcheck on tree without core/ ENOENTs — fails safe), edge-9 (sparse-array hash — unreachable via gated plain-JSON state), edge-11/12 (rng guard branches, no caller surface this story), edge-13 (autoplay half-applied — no autoplay call sites exist yet), edge-14 (NaN wall delta — author-injected clock), edge-15 (WebGL guard — AC1's surface is the lead's browser smoke). False with reasons: edge-22 (engines ">=26" is the Stack floor pin, not an exact-pin promise), intent-2 (AD-6 reservation is spine vocabulary; shape-only enforcement is what the spec says), intent-3 (dev-serve smoke assigned to lead; Node-24 host recorded as limitation), intent-5 (rng round-trip matches the row at the fixture surface; kernel restore is Never-list), intent-7 (supervisor wraps every site the kernel invokes this story), intent-9 (lockfile exists and commits; my diff pathspec excluded it), intent-10 (fault-log superset contains the row's shape; inner event asserted verbatim).

**Verification outcomes (post-patch re-run).** `npm install` 0; `npm run typecheck` 0; `npm test` 59/59; `node ci/depcheck.mjs` 0 (planted-bypass fixtures now include bare `../games` and template-literal dynamic import); `node ci/lint-bans.mjs` 0; `node tools/gen-registry.mjs` re-emit byte-identical (sha256 46f38b31…, and the drift is now pinned by a test, not just the loop command); `npm run build` 0. Eight mutation demonstrations total (AC1–AC7 plus the new registry-drift pin), each reverted and byte-verified.

**Followup review recommended: yes.** The patch round changed the freeze/gate seam beyond what the review layers saw: strict tick window (gate closed at events/snapshot/attract/autoplay), `gated()` cloning at the seam, `toPlain` cycle guard, strict-undefined hashing, and aligned gate extension sets. A fresh pass should confirm these against 1.2+ consumer patterns (especially whether attract()/autoplay() needing state setup later requires an explicit kernel-sanctioned setup window — spine AD-15 currently forbids out-of-tick mutation, and the diff now follows the spine literally).

**Residual risks.** Local env is Node v24.16.0 against the `engines: ">=26"` pin (EBADENGINE warning; suite green on 24, but the pin is unverified at its floor — fresh-environment check still pending). `git diff --exit-code -- generated/` is vacuous until this commit lands (pre-commit the file is intent-to-add); sha256 comparison was used instead, and vgap-1's test now pins drift permanently. AGENTS.md staleness (G17) is owner-only in an unattended run — left untouched, deferred to the lead.

