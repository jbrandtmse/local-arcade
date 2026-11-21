---
title: 'Story 1.1: Project bootstrap and the deterministic kernel core'
type: 'feature'
created: '2026-11-21'
status: 'ready-for-dev'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - _bmad-output/planning-artifacts/architecture/architecture-local-arcade-2026-11-19/ARCHITECTURE-SPINE.md
  - docs/game-authoring.md
warnings: ['oversized']
deferred: []
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
- `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html` -- create with Stack-exact pins and scripts -- AC1
- `core/main.ts` -- empty Room Black three.js scene + render loop, no geometry -- AC1
- `core/loop.ts` + test -- fixed 60Hz master loop, catch-up guard, resume drop, tick-count sim time -- AC3 (NFR-2)
- `core/contract/rng.ts` + test -- xorshift128+, uniform/range/rangeInt/pick/weighted, getState/restore -- AC4
- `core/contract/math.ts` + test -- sin/cos/tan/asin/acos/atan2/pow/exp/log, fixed coefficients, pinned output vectors -- AC4
- `core/contract/freeze.ts` + test -- write-gated state; out-of-window writes throw -- AC4
- `core/contract/hash.ts` + test -- canonical serialize → FNV-1a 64-bit -- AC4
- `core/contract/wrapper.ts` `index.ts` + test -- inject rng, enforce tick(dt,input)→events(), attract/autoplay mode switches, wrapper `stateHash()`, between-tick freeze -- AC4
- `core/supervisor.ts` + test -- catch faults at all call sites, log, keep loop alive -- AC5
- `tools/gen-registry.mjs` + `tools/registry-list.json` + test -- deterministic registry emit from provisional list -- AC6
- `ci/depcheck.mjs` + test -- fail any Core→`games/**` import -- AC6
- `ci/lint-bans.mjs` + test -- banned-API scan configured for `games/*/sim/**` (self-tested with fixtures) -- AC7
- integration test per I/O matrix row "Integration" + matrix edge-case rows above -- Rules 1/19

**Acceptance Criteria:**
- Given a fresh clone, when `npm install && npm run dev`, then an empty Room Black three.js scene renders; deps are three 0.187.0 + @types/three 0.187.0 (exact match), TypeScript 7.0.2, Vite 8.3.8, Node 26 (AC1)
- Given the repo root, then Structural Seed dirs exist: `core/`, `core/room/`, `core/contract/`, `games/`, `ci/`, `tools/`, `services/`, `.claude/skills/` (AC2)
- Given a fake clock in the loop test, then the kernel advances exactly one global fixed 1/60 tick per step decoupled from render; a long wall gap advances at most MAX_CATCHUP_STEPS and resumes cleanly; sim time = tick count (AC3)
- Given `core/contract/`, then all five harness pieces work per the I/O matrix: seeded rng with cursor, deterministic math, out-of-tick writes throw, wrapper-computed `stateHash()`, `tick(dt,input)`→`events()` (AC4; AD-3/4/5/8/15)
- Given a throwing sim, then the supervisor catches the fault, logs it, and the loop keeps running (AC5; AD-15)
- Given the provisional list, then `tools/` emits the game registry; Core contains no `games/**` imports and `ci/depcheck` fails any planted violation (AC6; AD-1)
- Given fixture sim paths, then lint bans for `Math.random`/`Date.now`/`performance.now` and engine-variable transcendentals fail those fixtures and pass clean sources (AC7; full L0 is Epic 3)

## Spec Change Log

## Review Triage Log

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

**Shared surfaces:** `games/` roster (empty this story; 1.5 adds moon-patrol), `generated/game-registry.ts` entry count (0), root `package.json` scripts set. Standing criterion: every test added or changed passes on a fresh environment, in either order.

**Manual checks:**
- `npm run dev` shows an empty three.js scene with the Room Black envelope and no console errors (the lead's per-story browser smoke runs this on Chrome/Edge).

## Auto Run Result

Status: ready-for-dev
Blocking condition: none
