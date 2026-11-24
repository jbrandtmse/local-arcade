---
title: 'Story 1.7: Fault containment — a broken game never kills the room'
type: 'feature'
created: '2026-11-24'
status: 'ready-for-dev'
baseline_revision: ''
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

**Problem:** A broken game can still kill the room at both ends of its life. At boot, `core/main.ts` attaches registry entries unguarded — one throwing `createSim` throws during module evaluation and the page never opens (DW-2). Once running, a throwing sim is logged by the supervisor but keeps being called 60 times a second, its fault records pile up unbounded (DW-3), and the room just keeps the last frame — a visually dead machine whose seated Visitor or Patron sits stuck on it. The fault chain (freeze gate → wrapper throw → supervisor → room laws) has no composable test surface (DW-6): the gate throws to whoever calls in, and the supervisor wraps only loop sites — two disjoint halves.

**Approach:** Land the containment seam `core/containment.ts`: a per-game guarded instance that supervisor-wraps every kernel→sim call under that gameId and quarantines the game's sim hooks on first fault; a per-entry boot guard that attaches the surviving entries when one entry's factory throws; a stateHash-stall watcher as the dev dead-machine fault predicate; and a render-side draw guard. Wire it into `core/main.ts` so a faulted Cabinet switches to the EXISTING 1.4 kernel fallback painter (marquee + screen motion, no sim), the scheduler lifts the figure and never relaunches, and the seat releases its Visitor gracefully and falls back to the coin-door law. Cap the supervisor's fault ring (DW-3).

## Boundaries & Constraints

**Always:** the room never crashes: every fault becomes a supervisor record `{tick, errorId, hook, message}` — the Dead-Machine defect (AD-15) — and the loop keeps ticking; every fault is attributed to its gameId at every kernel→sim site (sim hooks, mode switches through the guarded instance, boot under `hook: "boot"`, draw under `hook: "draw"`, stall under `hook: "stall"`); a faulted Cabinet keeps performing by reusing the shipped 1.4 fallback (the paint-step `repaintScreen` path plus the cabinet phase system) — no new fallback animator; quarantine binds the sim half, presentation faults only flip that face (the halves fault independently); graceful unseat reuses the stand law (saved pose, door close, input neutralization); fault records stamp `loop.tickCount` — never wall-clock (AD-3); dev numbers are labelled placeholders (spine keeps numeric thresholds Deferred): `MAX_FAULT_RECORDS = 64`, stall cycles `N = 3`; the attract cycle the watcher samples on is `CABINET_PHASE_CYCLE_TICKS` (240), reused; `arcadeDebug` gains the containment handle (faultedFor read + `injectFault` smoke trigger) — console-only, zero UI (UX-DR18); `git rev-parse --show-toplevel` must equal `C:/git/local-arcade` for every stage and subagent; every gate stays green.

**Never:** AD-26 fault-sealed Run Recording — this story only LOGS faults (fault sealing lands Epic 3); no numeric law-setting beyond the labelled placeholders; no edit to `core/loop.ts` (quarantine lives in the guard, not the loop — the loop's own fault tolerance for raw instances and its existing fault-family pins are loop-level truth and must not move); no `games/**` edits, no manifest or `arcade-ledger.json` writes, no vendored-file touches; no new dependencies or webfonts; no DOM beyond the renderer canvas; no UI or overlay announcing a fault — the fallback IS the fiction (AD-24); no silent per-frame try/catch — a draw fault is logged once and flips that face permanently; no errorId format change (deterministic ids are the future replay-match basis, AD-26); no commits in any repo by this story's stages — the untracked `_bmad-output/planning-artifacts/sprint-status.yaml` stray is never committed and never deleted; never read or write `_bmad-output/unattended` and never run `_bmad/scripts/unattended-inbox.sh`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Boot with a throwing `createSim` (DW-2) | entries [good, broken, good] through `attachGameEntries` | boot completes; the two good entries attach and tick; broken entry registers no instance/presentation; exactly one fault `broken.boot#n` logged | boot throw contained — attach never rethrows |
| Throwing `createPresentation` at boot | entry's sim factory fine, presentation factory throws | sim still instantiated + ticking; the face uses the fallback painter; one fault under hook "boot" | contained at attach |
| Sim throws inside `tick()` (guarded) | real loop + real wrapper instance + guard | one fault `{tick, gameId.tick#n}`; that game's sim hooks are never called again (tick-call counter freezes at the fault tick); neighbours keep ticking; loop keeps ticking | supervisor record, room alive |
| Out-of-tick write chain (DW-6) | real gate + wrapper + supervisor + loop + guard; sim writes gated state outside the tick window (e.g. inside `events()`) | the gate's TypeError arrives as a fault under that gameId — ONE composed surface, no caller-side catch — then quarantine + fallback posture follow | fault record, machine quarantined |
| stateHash stall (dev predicate, AC4) | frozen-hash stub under the watcher; real attract cycles | exactly at the N=3rd cycle boundary a synthesized fault under hook "stall" + same quarantine posture; an advancing-hash sim never faults | fault synthesized once |
| Fault during Patron autoplay | busy B0, occupancy patron-autoplay, queue has a claim | figure lifts (figureActive false) same tick; occupancy → attract; queue voided; autoplay NEVER relaunches while faulted; fallback repaint steps keep advancing across 720 ticks (sampled frames change) | n/a |
| Fault during Visitor seat | Visitor sits at B0 (takeover), sim faults mid-play | same tick: stand-law release (saved pose restored, door closed, controls neutralized); scheduler re-arms only after fault clears — stays attract while faulted; later E = coin-door toggle (no sit, no wait) | graceful release, no crash |
| Draw fault at runtime | `pres.drawFrame` throws on one frame | one fault under hook "draw"; that face falls back to the fallback painter permanently (bounded logging); other faces and the render chain untouched (rAF re-armed first, 1.5) | contained per-face |
| Long broken run (DW-3) | 600-tick run with a guard-quarantined game + a system that always faults | `supervisor.faults` never exceeds 64 records, keeps the most recent, `droppedFaults` counts the rest; guard-quarantined sim contributes exactly 1 fault total | ring cap |
| Event-queue drain (DW-3 drain half) | the shipped boot wiring over 600 ticks | the patrons system drains every tick — `eventQueue` stays empty between systems (1.6 closure pinned as regression) | n/a |
| Healthy run regression | faultless boot (real registry + scheduler + seat) | zero faults, every instance's wrapper stateHash advances each attract cycle, no fallback flips | n/a |
| Fresh environment (Rule 19) | fresh clone, install, test | every added/changed test passes standalone and against neighbours in either order (275 baseline at HEAD 0649f45 + new) | n/a |
| Chrome + Edge matrix | lead's manual smoke (DW-12 tier) | see Verification manual checks | lead adjudicates by eye, precedent |

</intent-contract>

## Code Map

**New — the containment seam:**
- `core/containment.ts` — three parts, one module:
  - `attachGameEntries(entries, loop, supervisor, makeCanvas)` — the boot body moved out of `core/main.ts:103-118` (move, not copy): per entry, `supervisor.invoke({ gameId: entry.id, hook: "boot", call: () => createGameInstance(...) / entry.createPresentation(...) })`; a fault leaves the entry unattached (the 1.5 track gates already degrade untracked cabinets); returns the same `{instances (guarded), instanceInputs, presentations}` maps main.ts uses today.
  - `guardInstance(instance, supervisor, gameId, opts)` — decorator over the existing `GameInstance` interface (AD-8 hooks verbatim through the untouched wrapper): every call passes through `supervisor.invoke` under that gameId; first sim-side fault sets `faulted` — afterwards `tick/attract/autoplay/play` no-op, `events()` returns `[]`, `snapshot()` returns `{}`, `stateHash()` the wrapper hash of `{}` (computed once); `faultedFor(gameId)` view.
  - stateHash-stall watcher inside the guard: every `cycleTicks` (=240, injected) guarded-tick calls compare `instance.stateHash()`; `stallCycles` (=3, placeholder) consecutive equal samples → synthesize one fault via `supervisor.invoke` throwing-call under hook "stall", then quarantine. Watcher stops once faulted.
  - `injectFault(gameId, message)` — arcadeDebug-only smoke trigger: records a real fault through the same chain (hook "inject").
- `core/containment.test.ts` — all matrix rows except the pins' own files; the DW-6 chain test uses REAL gate + REAL `createGameInstance` + REAL `createKernelLoop` + supervisor + guard (e2e-kernel.test.ts wiring idiom, :69-77), no fakes for those collaborators.

**Changed:**
- `core/supervisor.ts` — `HookName` (:6) gains `"play" | "boot" | "draw" | "stall" | "inject"`; `faults` (:35,:61) becomes a ring of `MAX_FAULT_RECORDS = 64` (the `SEAT_EVENT_WINDOW` push/shift idiom, seat.ts:240-243) plus `droppedFaults` counter; errorId counter keeps rising. `core/supervisor.test.ts` — new cap test (200 faults → 64 most recent + count).
- `core/patrons/scheduler.ts` — options gain optional `faultedFor?: (gameId: string) => boolean` (the BusyGate injection idiom, deferred closure in main.ts); `dispatch` (:197-248) fault laws: faulted + patron-autoplay → occupancy "attract", queue voided (figure follows via `figureActive` :261, no figure change needed); the dwell launch (:238) is gated while faulted. `core/patrons/scheduler.test.ts` + `scheduler-breaks.test.ts` — faulted-law pins.
- `core/seat.ts` — options gain optional `faultedFor?`; `handleInteract` (:202-222): faulted → `toggleCoinDoor` and return (before busy/wait/sit); `step` (:240): if seated volume's game is faulted → `standUp` (the stand law already skips nothing — `entry.instance.attract()` on a guarded faulted instance is a safe no-op). `seat.test.ts` / `seat-controls.test.ts` / `visit-arc.test.ts` — faulted pins where the law changes; existing rigs unchanged (predicate optional).
- `core/main.ts` — boot body replaced by `attachGameEntries` (+ `window.arcadeDebug` gains `containment`); `frame()` face selection (:347-387): a face composites only while `presentations.has(gameId) && !containment.faultedFor(gameId) && !drawFaulted.has(gameId)` — else it joins the paint-step `repaintScreen` fallback; each face's draw+composite legs go through `supervisor.invoke({hook:"draw", ...})`, first fault adds the face to `drawFaulted` (persistent, logged once). rAF re-arm first (:313-318) survives untouched.
- Pin moves (shared surfaces): `core/main-glue.test.ts` — the arcadeDebug line (:127-130), the face-gate line (:148), the boot-half line (`entry.createPresentation({ makeCanvas:` :144 — it relocates to a containment source pin when the boot body moves), draw legs get the supervisor-wrapped form, plus new pins (boot via attachGameEntries, faultedFor in face gate, injectFault on the debug handle); `core/bootstrap.test.ts` is a stack pin only — untouched; `core/no-ui-dom.test.ts` — dev-serve module list (:154-168) gains `/core/containment.ts`. `core/loop.ts`, `core/contract/*`, `core/room/*`, `games/**`, `tools/*`, `generated/*` — UNCHANGED (the loop-level fault pins in `supervisor.test.ts:81` and `e2e-kernel.test.ts` stay green because those rigs drive RAW instances; do not "fix" them).

## Tasks & Acceptance

**Execution:**
- `core/containment.ts` + `core/containment.test.ts` -- create -- the containment seam: boot guard, guarded instance + quarantine, stall watcher, injectFault; matrix rows executed against the real composed stack
- `core/supervisor.ts` + `core/supervisor.test.ts` -- modify -- fault ring cap + droppedFaults + HookName extension (DW-3 record half)
- `core/seat.ts` + its tests -- modify -- faultedFor law: coin-door fallback + same-tick graceful release
- `core/patrons/scheduler.ts` + its tests -- modify -- faultedFor law: figure lift, queue void, no relaunch while faulted
- `core/main.ts` + moved pins in `main-glue.test.ts` / `no-ui-dom.test.ts` -- modify -- attach through the seam, fallback face selection, supervisor-wrapped draw legs, arcadeDebug.containment
- matrix edge tests -- covered by the containment/scheduler/seat test additions above

**Acceptance Criteria:**

**AC 1 — A throwing sim is contained at the seam, the room keeps ticking (AC-spine 1-2; AD-15, FR-5).** Given the real loop + real wrapper instance + guard, when a sim throws inside `tick()`, then exactly one fault `{tick, "<gameId>.tick#n"}` lands in `supervisor.faults`, the loop keeps stepping every tick, that game's sim hook call counter never advances again (quarantine), neighbours keep ticking, and its Cabinet face takes the fallback posture.

**AC 2 — Out-of-tick mutation throws in the dev kernel and lands in the fault chain (spine AC5; DW-6).** Given a gated sim that writes its gated state outside the tick window, when the kernel drives it through the real wrapper inside the real loop, then the gate's TypeError surfaces as a fault under that gameId — one composed surface (gate → wrapper → supervisor → containment), not a caller-side catch — and the quarantine + fallback posture follow; the 1.1 matrix "Out-of-tick-write" row is now executable through this single composition.

**AC 3 — Boot containment: one faulty game never kills the page (DW-2).** Given a registry where one entry's `createSim` throws and another's `createPresentation` throws, when the room attaches through `attachGameEntries`, then boot completes, every surviving entry attaches and ticks, each factory failure is logged exactly once under hook "boot", and the affected Cabinets take the 1.4 fallback face + coin-door E law.

**AC 4 — Dev dead-machine predicate: stateHash stall (FR-17 L1 precursor, CAP-7).** Given a frozen-hash instance under the watcher, when `N = 3` attract cycles (240 ticks each, placeholder until Epic 3) pass with an unchanged wrapper stateHash, then exactly one synthesized fault under hook "stall" records and the same quarantine + fallback posture engages. Given the real Moon Patrol attract instance, then its stateHash changes every cycle (attract liveness) and it never faults; a faultless room run records zero faults.

**AC 5 — A faulted Cabinet keeps performing; occupants are handled gracefully (FR-5, UX-DR6; CAP-7).** Given busy B0 mid-autoplay with a queued claim, when its sim faults, then the figure lifts that same tick (`figureActive` false), occupancy returns to attract, the queue is voided, autoplay never relaunches while faulted, and the face's fallback repaint steps keep advancing across 720 sampled ticks (frames still change — no dead look). Given a seated Visitor, then the stand-law release (pose, door, neutralized controls) lands in the same tick's routing phase — the fault is that machine's last break — and afterwards E at the Cabinet toggles the coin door (never sits, never waits). No run recording exists yet (AD-26 fault sealing is Epic 3) — the fault record is the deliverable.

**AC 6 — Bounded records, drained queue, green suite (DW-3).** `supervisor.faults` never exceeds `MAX_FAULT_RECORDS = 64` (most recent kept) and `droppedFaults` counts the overflow; a 600-tick run with a guard-quarantined broken game contributes exactly one sim fault; the shipped boot wiring drains `eventQueue` every tick (patrons-system closure of DW-3's drain half, pinned as regression). `npm test` (275 baseline + new), `npm run typecheck`, `node ci/depcheck.mjs`, `node ci/lint-bans.mjs`, registry regen no-drift, `npm run build` all green; zero new dependencies; zero outbound calls beyond `/api/report`.

## Spec Change Log

## Design Notes

**Ledger inbox (Rule 17):** `DW-2` — ADDRESSED: boot guard `attachGameEntries` (AC3, matrix rows 1-2) plus the runtime halves — draw faults supervisor-wrapped with a persistent face fallback (matrix row 8) and quarantine fallback posture (AC1). The 1.5 in-story patch (rAF re-armed first, `main.ts:313-318`) stands and is now backed by the containment tier its occurrence note routed here. `DW-3` — ADDRESSED: the faults ring cap + `droppedFaults` (AC6) bounds the records; quarantine at first fault bounds the 60/s SOURCE (AC1) — that is what the harvest note "cap/dedup is containment policy" routes. The entry's drain half is VERIFIED CLOSED by 1.6: `main.ts:272` drains unconditionally as the first statement of the patrons system body, before anything that can throw — pinned as a regression rather than re-mechanized (matrix row 10). `DW-6` — ADDRESSED: AC1/AC2 + the containment chain test give the composed fault-chain surface the 1.1 matrix Out-of-tick-write row never had (gate throws into the supervisor-wrapped site; one gameId-attributed record; laws follow).

**Governing Architecture Decisions (Rule 6):** AD-15 (the subject: supervisor catches sim faults, Dead-Machine defect logged, Cabinet keeps performing via kernel fallback, out-of-tick writes throw mechanically); AD-3 (fault records stamp tickCount; liveness cycle is tick state — the watcher counts guarded ticks); AD-5 (the wrapper-computed stateHash is the liveness/stall currency); AD-6 (the event channel is untouched — a quarantined game emits no events; consumers handle absence); AD-8 (hooks verbatim; the guard decorates the same wrapper seam L1 uses — contract semantics unchanged); AD-1 (containment is pure core, registry-driven attach, no core→games import); AD-11/AD-18 (sealed posture intact — injectFault is a console-only debug surface, zero new outbound); AD-14 (Core TS); AD-23 (busy laws under fault: figure lift, queue void, arbitration never strands — busy-never-withholds extends to faulted cabinets as fallback performance, not a relaunch into a dead sim); AD-24 (zero fault UI — the 1.4 fallback IS the fiction); AD-26 (deterministic errorIds + the cap counter are the future fault-marker basis, but recording itself stays Epic 3 — named Never). Consistency Conventions: the "Faults" row (supervisor catches → Dead-Machine defect logged → Cabinet keeps performing via kernel fallback) is realized by this story.

**Rule 1 — integration AC:** containment is the shared component this story introduces. Its Integration ACs are the matrix rows executed against a REAL loop + REAL wrapper instance + REAL supervisor (and in scheduler/seat pins the real rig idiom) — no fakes for those collaborators. Consumed-by: lead smoke (`injectFault`), Epic 3 (AD-26 fault-sealed recorder hangs on containment's fault records — ids already deterministic; the L2 dead-machine detector reads them; AD-27 wake-set layers over quarantine), 1.8/1.9 unaffected. Consumes: 1.1 (supervisor, wrapper, gate, loop — all consumed untouched), 1.4 (fallback painter + cabinet phase REUSED — the face condition flip, no second animator), 1.6 (scheduler + seat EXTENDED by one injected predicate each; the patrons per-tick drain is DW-3's drain-half closure).

**Rule 2 — extend-don't-copy siblings:** `guardInstance` is a decorator over the existing `GameInstance` interface, not a reimplementation; `attachGameEntries` MOVES `main.ts:103-118` (one call site remains); the fault ring follows the `SEAT_EVENT_WINDOW` push/shift idiom (seat.ts:240-243); the stall watcher reuses the scheduler.test.ts hash-advance idiom (:215-217); `faultedFor` injection mirrors the 1.6 `BusyGate` deferred-closure wiring; the fallback is the existing `repaintScreen` gate flipped, not a parallel fault-painter.

**Decided in-stage (unattended; inferences labelled):**
1. Containment as a decorator seam (`core/containment.ts`) instead of loop edits: `core/loop.ts` stays byte-identical, and the raw-instance fault pins (`supervisor.test.ts:81` "its tick site kept being driven", `e2e-kernel.test.ts` 30-events-faults) remain true loop-level behavior. (inference)
2. Quarantine at first sim-side fault per game; presentation faults are independent (draw fault = face fallback only, sim keeps ticking). A broken sim re-ticked 60x/s is DW-3's evidence; containment must stop the hammering. (inference)
3. "Unseated gracefully at the next break": a faulted sim emits no canonical break, so the fault IS that machine's last break — the release/arbitration lands in the same tick's routing phase (systems run after the instance phase; fixed order). (inference)
4. DW-3's drain half is closed by 1.6 (verified above); this story pins the closure instead of adding a second drain. (verified, not inferred)
5. `MAX_FAULT_RECORDS = 64` and stall `N = 3` are labelled placeholders — dev-surface numbers; the spine keeps the real numbers Deferred (M2/Epic 3), and the AC itself mandates a placeholder N. (inference on the value, labelled either way)
6. The watcher's attract cycle = `CABINET_PHASE_CYCLE_TICKS` (240), the one attract-cycle source in the codebase; the watcher counts guarded-tick calls (sim time = tick count). (inference)
7. `injectFault` on arcadeDebug (hook "inject") exists so the lead's Chrome+Edge smoke can exercise the real chain in-browser — same law path as a real fault, console-only. (inference)
8. Post-quarantine safe reads: `snapshot()` → `{}`, `stateHash()` → wrapper hash of `{}` computed once; the face never composites from a quarantined instance anyway. (inference)
9. Boot faults use hook "boot" for both halves; the face/painter consequence differs per half (instance missing → fallback; presentation missing → fallback with the sim ticking).

## Verification

**Commands (absolute workdir `C:/git/local-arcade`; every command finishes in one foreground call, `timeout: 600000`):**
- `npm run typecheck` -- (loop) expected: zero errors (containment TS + widened HookName)
- `npm test` -- (loop, and once as the full suite) expected: all pass (275 baseline at HEAD 0649f45 + new containment/fault-law tests; suite stays comfortably inside one call)
- `node ci/depcheck.mjs` -- (loop) expected: green — `core/containment` imports core/contract + core/supervisor only; registry wiring unchanged
- `node ci/lint-bans.mjs` -- (loop) expected: green (no games/sim change)
- `node tools/gen-registry.mjs && git diff --exit-code -- generated/` -- (loop) expected: no drift (registry untouched)
- `npm run build` -- (once per story) expected: Vite build succeeds (entry-chunk warning tier precedent)

**Rule 19 — pinning tests + intended mutations (implement stage: apply, observe red, revert byte-identical, record the `mutation:` lines):**
- AC1 pin: guard quarantine test (fault count 1, sim tick-call counter frozen, neighbours alive). `mutation: guard re-invokes sim hooks after a fault → the frozen-counter pin red; revert.`
- AC2 pin: composed gate-chain test (out-of-tick write → fault under gameId + quarantine). `mutation: wrapper opens the gate permanently (gate.open in kernelWindow's finally) → no out-of-tick fault record appears → red; revert.`
- AC3 pin: attach-with-broken-factory test. `mutation: attachGameEntries calls createGameInstance unguarded → the test's step throws → red; revert.`
- AC4 pin: stall-fixture test faults exactly at the N-boundary; real attract instance never faults. `mutation: watcher skips the recordFault synthesis → the stall pin red; revert.`
- AC5 pin: figure-lift/no-relaunch pins (scheduler) + same-tick release + coin-door-law pins (seat) + 720-tick fallback-motion advance. `mutation: scheduler dwell launch ignores faultedFor → the no-relaunch pin red; revert. mutation: seat.step drops the faulted release leg → the unseat pin red; revert.`
- AC6 pin: supervisor cap test + drain regression pin. `mutation: supervisor drops the ring trim → the 64-cap pin red (200 records); revert.`

**Shared surfaces (Rule 19):** `HookName` union and `supervisor.faults` consumers (existing pins stay green — caps not hit by ≤64-fault rigs; `e2e-kernel`/`supervisor.test` raw-instance pins must NOT move), `window.arcadeDebug` shape (main-glue pin line), the frame face-gate condition (main-glue pin `presentations.has(placement.gameId)) continue;` changes), `no-ui-dom.test.ts` dev-serve module list (+`/core/containment.ts`), scheduler/seat constructor options (new OPTIONAL leg — existing rigs byte-unchanged), the recorded test-count baseline. Standing criterion: every test added or changed passes on a fresh environment, standalone and against its neighbours in either order.

**Lead's manual smoke (DW-12 tier — Chrome AND Edge):** load the page, Patron runs at B0 (~10 s dwell); console: `arcadeDebug.containment.injectFault("moon-patrol")` → the figure lifts immediately, the screen flips to the 1.4 attract fallback (scan-band motion keeps moving — watch ~5 s), the marquee stays lit with its title, one `[supervisor fault]` line prints with a `moon-patrol.*` errorId, `arcadeDebug.containment.faultedFor("moon-patrol")` reads true; E at the cabinet opens/closes the coin door, never sits; a second `injectFault` adds no second fault (quarantine). Console: no DOM beyond the canvas; marquee/roadmap otherwise unchanged.

## Auto Run Result

Status: ready-for-dev
Blocking condition: none

Plan-stage result 2026-11-24 (build-auto, unattended, halt-after-planning): spec planned from epic-1-context + Story 1.7 block (epics.md:351-366) + spine AD map + direct investigation of main.ts/loop.ts/supervisor.ts/wrapper.ts/freeze.ts/cabinets.ts/seat.ts/scheduler.ts and the fault-family test pins. Ledger inbox DW-2/DW-3/DW-6 all addressed (none declined). No commits (plan stage; the untracked sprint-status.yaml stray untouched). No implementation performed.
