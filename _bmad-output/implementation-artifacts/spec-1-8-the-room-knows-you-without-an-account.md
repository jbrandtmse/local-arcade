---
title: 'Story 1.8: The room knows you without an account'
type: 'feature'
created: '2026-11-24'
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

**Problem:** Scores die with the page. The `scoreSubmitted` event already flows through the kernel chain (1.5 pair, 1.6 single-drainer law), but nothing downstream keeps it: no visitor identity exists (no core module touches `localStorage`), no Personal Best survives a reload, Patron autoplay runs are invisible outside the scheduler, and the 1.4 score zone (`cabinets.ts:58-65`, surfaces.ts drawScreen:371-383) is lawfully empty — "renders nothing until Story 1.8 fills it."

**Approach:** Land the spine's storage/identity service (`core/storage.ts`, the SVC box): a boot-time anonymous UUIDv4 in `localStorage` under `arcade.*`, Personal Bests keyed `(stable gameId, visitorId)`, a runtime Patron-run table fed by an ingest leg riding the patrons system's existing single drain, kernel-derived pseudonyms for missing initials, and a `rowsFor(gameId)` read that the shipped frame() feeds into the EXISTING score-zone painter path. The sim half stays ignorant: the table never enters tick input, snapshot, or stateHash.

## Boundaries & Constraints

**Always:** identity = UUIDv4 only, generated once at boot into `arcade.visitor`, shape-validated on read (corrupt value regenerates — self-heal, inference); PB under `arcade.pb.<visitorId>.<gameId>` as `{initials, score}`; scores travel ONLY via canonical `scoreSubmitted {score, initials?}` (AD-6) — the ingest rides the patrons body's already-drained `patronsRecords` (AD-23 single-drainer: exactly one `drainEvents()` call stays in main.ts); every ingest sits inside the supervisor-wrapped patrons system (AD-15) stamped by tick; visitor-vs-Patron classification reads scheduler occupancy BEFORE `scheduler.dispatch` (during a Patron run that is the live run; `lastSeed` is the run's resolved seed — AD-4 currency); missing initials get a kernel-derived anonymous pseudonym [A-Z]{3} (Patron: deterministic from the run's resolved seed; visitor: from (visitorId, gameId, run tick) — no `Math.random` in the derivation, label as inference); game-supplied initials sanitize to at most 3 chars A-Z (NFR-5: PII never enters the table); table content law in the service: no Personal Best → Patron runs only; Personal Best → PB row first, then top Patron rows; cap 4 rows (geometry: on the 0.52m face row baselines 191/260/329/398 fit, i=4→467 > nextTop 416 where drawScreen throws — inference, pinned); `rowsFor` returns `[]` while the table is empty → the CAP-8 zone stays empty (1.4 pin survives byte-unchanged); the painter takes live rows via a re-composed `ScreenZones` argument at paint time — `cabinets.ts` placement data stays authored-readonly, surfaces.ts stays UNCHANGED; every localStorage access wrapped in try/catch → quota/private-mode degrades to in-memory session, the room keeps ticking (label); the shipped frame() wiring is pinned at the main-glue source tier (established DW-12 convention); `git rev-parse --show-toplevel` must equal `C:/git/local-arcade` for every stage and subagent; every gate stays green.

**Never:** no edit to ANY file under `games/**` (sim, presentation adapter, assets, vendored law) — the table never reaches the sim (L0-red in Epic 3; enforced at review in M0 via: games tree untouched, depcheck sim-closure green, no-ui-dom scans green); no second `drainEvents()`; no edit to `core/loop.ts`, `core/contract/*`, `core/room/*` (painters/placements/data), `core/seat.ts`, `core/patrons/*`, `core/containment.ts`, `tools/*`, `generated/*`, `ci/*`; no registry-list or gen-registry change (the provisional entry carries no `scoreHigherIsBetter` — Personal Best law is higher-wins at M0, label, the AD-12 field arrives with the Epic-3 ledger machinery); no new dependencies or webfonts; no DOM beyond the renderer canvas; no consent wall, prompt, or UI of any kind (UX-18/AD-24); no wall-clock (`Date.now`/`performance.now`) in core storage state paths; no outbound call (the bundle's only network stays `/api/report`, Epic 3); no run recording (AD-26 — Epic 3); errorId/fault law unchanged (1.7 pins must not move); no commits in any repo by this story's stages — the untracked `_bmad-output/planning-artifacts/sprint-status.yaml` stray is never committed and never deleted; never read or write `_bmad-output/unattended` and never run `_bmad/scripts/unattended-inbox.sh`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| First visit (empty storage) | fresh fake storage, boot | exactly one key written: `arcade.visitor` = UUIDv4 shape `[0-9a-f-]{36}`, v4 nibble `4`; no other key; zero DOM beyond canvas (no-ui-dom pins green) | nothing else about the visitor exists |
| Reload / returning visit | second service over the SAME storage | same visitorId read back (no rewrite); PB read back from `arcade.pb.<visitorId>.<gameId>` | corrupt stored uuid (shape fail) → regenerate + rewrite (self-heal) |
| Seated Visitor score, no initials | visitor-seated, `{score: 15230}` drained | PB written; initials = derived [A-Z]{3} pseudonym from (visitorId, gameId, tick) — stable across reloads for that (visitorId, gameId) | lower score than PB → ignored, PB kept |
| Seated Visitor score, with initials | payload `{score, initials: "j.d!"}` | sanitized to exactly 3 chars from A–Z (uppercase, strip, slice, pad); never arbitrary text rendered | sanitize, never reject-crash |
| Patron autoplay run | patron-autoplay occupancy, `{score: 12000}` drained | Patron-run row recorded; initials = deterministic letters from the run's resolved seed (`lastSeed` at ingest) — same seed → same initials next reload | unbounded table capped: best-3 Patron rows in the view, ring-bounded storage |
| Table content law | no PB yet / PB exists | rowsFor: Patron rows ALONE until a PB exists; then PB row first + top Patron rows; both empty → `[]` → score zone renders nothing (CAP-8 1.4 pin intact) | — |
| Idle scoreSubmitted | scoreSubmitted drained while occupancy attract (authoring oddity) | classified idle → recorded as NEITHER PB nor Patron run (no phantom history) | recorded in the debug view only |
| Quarantined Cabinet (1.7 no-regress) | `injectFault` then 720 guarded ticks | guard emits no events → rowsFor NEVER changes after quarantine; the fallback face keeps painting the CURRENT table rows through paint steps (no dead table, no new rows) | 1.7 fault pins byte-unchanged |
| Storage throws (quota/private mode) | setItem throws on every write | writes degrade to in-memory for the session; zero supervisor faults; loop keeps ticking; reads still serve the session | caught in the storage port, labelled |
| Sim never sees the table | games tree | no file under `games/**` changed or added; tick input shape stays `{controls}` only; a source scan shows no `localStorage`/table read in games sources | depcheck + no-ui-dom green; review-enforced (L0 red lands Epic 3) |
| Fresh environment (Rule 19) | fresh clone, install, test | every added/changed test passes standalone and against neighbours in either order (298 baseline at HEAD 315c998 + new) | n/a |
| Chrome + Edge matrix | lead's manual smoke (DW-12 tier) | see Verification manual checks | lead adjudicates by eye, precedent |

</intent-contract>

## Code Map

**New — the storage/identity service (the spine's SVC "storage/identity" box, realized):**
- `core/storage.ts` — one module, three parts:
  - Identity: `visitorId()` — read `arcade.visitor`, v4-shape-validate, else generate via injected `uuidFn` (default `crypto.randomUUID()` — verified present in Node 26 and evergreen Chrome/Edge) and write once; boot calls it eagerly ("first visit generates").
  - Table state: Personal Bests (`arcade.pb.<visitorId>.<gameId>` = JSON `{initials, score}`, higher-wins at M0 — label) + Patron-run ring (runtime only — Patron runs replay deterministically from the derived seeds on every boot (1.6 `derivedSeed`), persisting them would duplicate recomputable state — inference) + `recordScoreSubmitted({gameId, score, initials?}, kind: "visitor"|"patron", seed: number|null, tick)` with initials sanitize + pseudonym derivation (integer mix over the resolved seed / identity triple — extends the `derivedSeed` mixing idiom, scheduler.ts:48-53).
  - Reads: `rowsFor(gameId): readonly string[]` — the content law + 4-row cap (constants exported for pins); `state()` plain-data view for `arcadeDebug.storage`.
  - Ingest: `ingest(records: readonly EventRecord[], ctx: { kindOf: (gameId) => "visitor"|"patron"|"idle"; seedOf: (gameId) => number; tick: number })` — pure loop over drained records; classification/seed come from main.ts closures over scheduler + seat (BusyGate deferred-closure injection idiom).
  - Storage port: `getItem/setItem` injected; default wraps `globalThis.localStorage` behind try/catch; Node 26 has no `localStorage` global (verified) — tests inject a Map-backed fake (hermetic; identity seeded per test).
- `core/storage.test.ts` — every matrix row except the pins' own files; the composed Patron-run row uses the REAL scheduler rig (scheduler.test.ts idiom: real scheduler + real `cabinetPlacements[0]` (B0, seed 1982, busy) + stub instance) and REAL drained `EventRecord`s, plus the fake-sim-through-real-wrapper chain for the visitor path (containment-fault-sites.test.ts composition idiom).

**Changed (pin moves — shared surfaces):**
- `core/main.ts` — create `storage = createStorageService({...})` (uuid + storage defaults at the browser edge); eager `storage.visitorId()` at boot; `window.arcadeDebug` gains `storage` (the :145 pin line moves); patrons body gains ONE leg after the `drawTick` stamp and BEFORE `presenter.step`/`scheduler.dispatch`: `storage.ingest(patronsRecords, { kindOf: ..., seedOf: (id) => scheduler.state().cabinets.find(...)?.lastSeed ?? 0, tick: drawTick })` — `kindOf` reads `scheduler.state()` occupancy (`patron-autoplay`→patron) then `seat.state()` seated gameId (visitor), else idle; the fallback repaint block (:383-403) composes `const zones = placement.gameId != null ? { ...placement.screenZones, score: storage.rowsFor(placement.gameId) } : placement.screenZones` and passes THAT to `repaintScreen` — the 1.4 pin `placement.screenZones,` at :141 moves to the composed-zone form; composite faces keep the 1.5 law (game owns its pixels; the vendored adapter's session HI-SCORE is NOT the table and stays byte-unchanged — the table renders on the Core-driven face, AD-16's read-only presentation-half half; the Epic-3 adapter reimplementation lands the literal adapter-rendered play face).
- `core/main-glue.test.ts` — arcadeDebug line pin; new pins: the ingest leg sits inside the patrons body between the stamp and presenter.step (extend the existing order pins — drain-first and stamp-behind-drain legs stay byte-unchanged), `storage.visitorId()` boot call, composed-zone pin replacing `placement.screenZones,`; the face-gate and draw-leg pins stay untouched.
- `core/no-ui-dom.test.ts` — dev-serve module list gains `/core/storage.ts`; the input-service/room/presentation DOM-free scans stay untouched (the ONLY core module touching storage is core/storage.ts — add a one-line scan pin over core sources if cheap, else note it as review-enforced).
- UNCHANGED: `core/room/surfaces.ts` (the score-rows branch surfaces.ts:371-383 already paints and already throws on NEXT collision — the cap constant mirrors its geometry), `core/room/cabinets.ts` (ScreenZones + empty authored `score: []` stay), scheduler/seat/containment/loop/contract/ci/tools/generated/games.

## Tasks & Acceptance

**Execution:**
- `core/storage.ts` + `core/storage.test.ts` -- create -- identity + PB + Patron-run table + pseudonyms + rowsFor + ingest; matrix rows executed against real scheduler rig + fake storage
- `core/main.ts` -- modify -- service at the browser edge, eager identity at boot, patrons-body ingest leg (the only new per-tick consumer, riding the existing drain), fallback-face composed zones, `arcadeDebug.storage`
- `core/main-glue.test.ts` + `core/no-ui-dom.test.ts` -- modify -- moved/new glue pins per Code Map (source-pin tier, DW-12 convention)
- matrix edge tests -- covered by the storage suite additions above

**Acceptance Criteria:**

**AC 1 — Anonymous identity, no account, no PII (FR-7, AD-16, NFR-5).** Given empty storage, when the service boots, then exactly one key `arcade.visitor` holds a UUIDv4 (shape-validated), written once; given a second service over the same storage (the reload), then the same id is read back without rewrite; nothing else about the visitor exists anywhere (no other key, no DOM, no prompt).

**AC 2 — Scores travel only via `scoreSubmitted`; the kernel owns the table (AD-6, AD-16).** Given a drained `scoreSubmitted {score, initials?}`, when ingest classifies it (scheduler occupancy: patron-autoplay → Patron run with initials derived from the run's resolved seed; visitor-seated → PB; idle → recorded neither), then the visitor path updates the Personal Best iff the score beats it (higher-wins at M0 — label); game-supplied initials sanitize to ≤3 chars A–Z; missing initials get the kernel pseudonym; no file under `games/**` changed and the sim's tick input stays `{controls}` — the sim never reads, branches on, or stores table content (M0 review enforcement; L0 red lands Epic 3).

**AC 3 — The table renders read-only in the presentation half, with the content law (FR-7, UX-DR6).** Given an empty table, then `rowsFor` is `[]` and the score zone renders nothing (the 1.4 CAP-8 pins green); given Patron runs but no Personal Best, then rows are Patron runs alone; given a Personal Best, then rows lead with the PB row; the composed zones feed `repaintScreen` on the fallback face (main-glue pins: boot identity, ingest leg inside the patrons body, composed-zone argument).

**AC 4 — Returning shows the Personal Best keyed (stable gameId, visitorId) (FR-7, seeds FR-16).** Given a visitor scored run persisted under `arcade.pb.<visitorId>.<gameId>`, when a fresh service (same storage) computes rows, then the PB row appears with the same initials — the same key carries refurbish continuity (AD-9 stable gameId).

**AC 5 — The 1.7 laws do not regress; a quarantined Cabinet keeps its table law.** Given `injectFault` then 720 ticks, then no new table row ever appears (the guard emits no events), `rowsFor` stays byte-stable, and the fallback face keeps painting the current rows through paint steps; all 1.7 containment/seat/scheduler pins byte-unchanged; exactly one `drainEvents()` call site remains in main.ts.

**AC 6 — Bounded, hermetic, green suite.** Patron rows capped (best-3 view, ring-bounded); a throwing storage write degrades to in-memory with zero faults and the loop ticking on; `npm test` (298 baseline at HEAD 315c998 + new), `npm run typecheck`, `node ci/depcheck.mjs`, `node ci/lint-bans.mjs`, registry regen no-drift, `npm run build` all green; zero new dependencies; zero outbound calls beyond the never-shipped `/api/report` (AD-18).

## Spec Change Log

## Review Triage Log

## Design Notes

**Ledger inbox (Rule 17):** EMPTY — `LEDGER slice 1-8-the-room-knows-you-without-an-account` returned no entries; nothing to address or decline.

**Governing Architecture Decisions (Rule 6):** AD-16 (the subject: UUIDv4 under `arcade.*`, namespaced storage service, `scoreSubmitted`-only scores, kernel pseudonym, read-only table to the presentation half rendered from the service at tick time, sim never sees it, PB keyed (gameId, visitorId), global leaderboards out); AD-6 (`scoreSubmitted` canonical, sims' only channel); AD-23 (occupancy classification; single-drainer law — ingest rides the patrons body, no new drain); AD-3 (records stamped by tick, no wall-clock); AD-15 (ingest inside the supervisor-wrapped patrons system; a throwing storage op is contained — degrades, never faults the room); AD-4 (the Patron pseudonym derives from the run's RESOLVED seed — the derived-seed currency `derivedSeed` mints); AD-9 (stable gameId is the PB key's leading leg — refurbish continuity free); AD-1/AD-2 (import directions untouched; games tree untouched — the sim-ignorance of the table is structural); AD-7 (storage/identity is a Core service; the adapter DOM-free + localStorage-ban scans stay green because the adapter never touches it); AD-18 (localStorage is local; the sealed posture holds — no new outbound surface); AD-24 (the score zone is the era screen surface; zero UI announces anything); AD-26 (recordings must never carry the visitor id — this service is the boundary Epic 3 honors; no recording here). Consistency Conventions: the "Identity & storage" row is realized verbatim (PB keyed (gameId, visitorId) with initials + score, games use the Core storage service only); the "State & mutation" row (tick input carries only `controls`) is proven by the unchanged contract/wrapper/game layers.

**Rule 1 — integration AC:** the storage service is the shared component introduced. Consumer: the Cabinet screen painter (frame() fallback path) reads `rowsFor` and produces visible score-zone rows — pinned at the glue source tier (composed-zone argument) plus the executed painter tier (drawScreen already paints filled zones — a zone with 2 rows paints 2 rows, mutation-provable); consumer: the lead's smoke reads `arcadeDebug.storage` and the fallback face after `injectFault`. Consumed-by: 1.9 (the boot beat rides the same boot wiring — identity exists before the door opens), Epic 3 (AD-26 recording never includes the visitor id — it lives HERE; FR-16 refurbish continuity rides the same PB key; the scoreHigherIsBetter-aware PB law activates when the ledger carries the field). Consumes: 1.5 (`scoreSubmitted` sim pair, drained verbatim), 1.6 (scheduler occupancy + `lastSeed` run records, seat seated-gameId, single-drainer patrons body), 1.4 (score zone + painter law reused), 1.7 (quarantine posture defines the faulted-table law).

**Rule 2 — extend-don't-copy siblings:** the Patron-run ring follows the `SEAT_EVENT_WINDOW` push/shift + `supervisor` ring idiom; the pseudonym derivation extends the `derivedSeed` integer-mix idiom (scheduler.ts:48-53) — a new tiny hash because the sibling returns 32-bit seeds, not letters (copy would mis-shape); `ingest(ctx)` injection mirrors the 1.6 BusyGate / 1.7 faultedFor deferred-closure wiring; the service creation sits beside seat/scheduler in main.ts with the same options-injection posture.

**Decided in-stage (unattended; inferences labelled):**
1. One module `core/storage.ts` for identity + PB + table — the spine's SVC box names one "storage/identity" service; splitting identity from scores would scatter the `arcade.*` law. (inference)
2. Table renders through the Core painter's existing score zone via a composed `ScreenZones` at paint time; composite (game-driven) faces keep 1.5's pixel law. AD-16's "rendered from the adapter" lands fully with the Epic-3 contract reimplementation; at M0 the provisional wrap's Core-driven face is the Cabinet's presentation half. Visible browser path: the fallback face (1.7's `injectFault` precedent) + `arcadeDebug.storage`. (inference — labelled; the Epic-3 reimpl per AD-14/AD-16 closes the literal adapter path)
3. Patron-run table is runtime-only, not persisted: derived seeds replay the same runs every boot, so persistence would store recomputable, potentially-stale state. (inference)
4. Higher-wins Personal Best at M0: the provisional registry list carries no `scoreHigherIsBetter` (AD-12 field arrives with Epic-3 ledger machinery); the service takes the flag as an option defaulting true so activation is one wiring line later. (inference, labelled)
5. Pseudonyms: Patron = letters from the run's resolved seed (deterministic across reloads — the same Patron "scoreboard name" returns); visitor missing-initials = letters from (visitorId, gameId, tick). No PII: uuid only, [A-Z]{3} display. Sanitization truncates game-supplied initials. (inference)
6. Row cap 4 = the geometry ceiling the existing drawScreen throws above (baselines computed from the authored constants); Patron view keeps best-3 + PB. (inference, pinned)
7. Idle-classified scoreSubmitted records neither PB nor Patron row — an authoring oddity must not fabricate history (CAP-8 honesty). (inference)
8. Storage failure degrades to in-memory silently (zero faults): a private-mode browser is a device-layer condition, not a room fault; the room-never-crashes law binds. (inference)
9. `crypto.randomUUID()` is the uuid source (verified present Node 26 + evergreen Chrome/Edge; v4 shape exact). (verified)
10. Classification reads scheduler/seat plain-data `state()` views rather than widening their interfaces — zero scheduler/seat code edits, zero 1.6/1.7 pin churn. (verified code reads)

## Verification

**Commands (absolute workdir `C:/git/local-arcade`; every command finishes in one foreground call, `timeout: 600000`):**
- `npm run typecheck` -- (loop) expected: zero errors (storage TS + composed-zones typing)
- `npm test` -- (loop, and once as the full suite) expected: all pass (298 baseline at HEAD 315c998 + new storage/glue tests; suite stays comfortably inside one call)
- `node ci/depcheck.mjs` -- (loop) expected: green — `core/storage` imports core (loop types, cabinets) only; games tree untouched
- `node ci/lint-bans.mjs` -- (loop) expected: green (no games/sim change)
- `node tools/gen-registry.mjs && git diff --exit-code -- generated/` -- (loop) expected: no drift (registry untouched)
- `npm run build` -- (once per story) expected: Vite build succeeds (entry-chunk warning tier precedent)

**Rule 19 — pinning tests + intended mutations (implement stage: apply, observe red, revert byte-identical, record the `mutation:` lines):**
- AC1 pin: fresh-storage boot test (one key, v4 shape) + reload-identity test. `mutation: boot skips the eager visitorId() call → the one-key pin red (storage empty at boot); revert.`
- AC2 pin: classification matrix tests (real scheduler rig: patron run rows with seed-derived initials; visitor PB; idle records neither) + sanitize pins. `mutation: ingest classifies by seat-state FIRST (patron run mis-credited as PB) → the patron-row pin red; revert. mutation: sanitize passes initials through → the PII-shaped initials pin red; revert.`
- AC3 pin: rowsFor content-law tests (empty → []; patron-only; PB-first) + painter zone-fill pin (2 rows paint 2 texts) + composed-zone glue pin. `mutation: rowsFor emits Patron rows when a PB exists but drops the PB row → the content-law pin red; revert.`
- AC4 pin: second-service read-back test (same initials + score). `mutation: PB read ignores the visitorId leg of the key → the two-visitors-one-storage pin red (cross-visitor bleed); revert.`
- AC5 pin: quarantine law test (injectFault-then-720: rows byte-stable; fallback face composes zones every paint step) + the one-drain call-count pin stays green. `mutation: ingest runs AFTER scheduler.dispatch (patron seed off-by-one) → the seed-derived initials pin red; revert.`
- AC6 pin: storage-throw degradation test + ring cap test + the moved glue pins (main-glue, no-ui-dom module list). `mutation: the storage port drops the try/catch → the degradation test red (throw escapes into the patrons system → fault record); revert.`

**Shared surfaces (Rule 19):** `window.arcadeDebug` shape (main-glue pin line gains `storage`), the patrons system body (one new leg BETWEEN the drawTick stamp and presenter.step — the 1.7 drain-first and stamp-behind-drain pins stay byte-unchanged; the new leg order is pinned), the fallback repaint's zones argument (1.4 pin `placement.screenZones,` moves to the composed form), `no-ui-dom.test.ts` dev-serve module list (+`/core/storage.ts`), the recorded test-count baseline. Standing criterion: every test added or changed passes on a fresh environment, standalone and against its neighbours in either order.

**Lead's manual smoke (DW-12 tier — Chrome AND Edge):** load the page; Patron runs complete at B0; console `arcadeDebug.storage.state()` shows the visitorId (v4 shape) + Patron rows with seed-derived initials; sit and die at B0, note the score; RELOAD → `arcadeDebug.storage.state()` shows the SAME visitorId and the Personal Best row (initials + score) keyed moon-patrol; console `arcadeDebug.containment.injectFault("moon-patrol")` → the fallback face now shows the score rows above the NEXT row (scan band still drifting, marquee lit); rowsFor unchanged after a further 10 s (guard silent). localStorage inspection: exactly `arcade.visitor` + `arcade.pb.<visitorId>.moon-patrol` under the `arcade.*` namespace, no PII. No DOM beyond the canvas anywhere.

## Auto Run Result

Status: ready-for-dev
Blocking condition: none
