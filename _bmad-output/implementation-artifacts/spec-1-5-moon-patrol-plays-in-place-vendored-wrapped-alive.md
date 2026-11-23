---
title: 'Story 1.5: Moon Patrol plays in place — vendored, wrapped, alive'
type: 'feature'
created: '2026-11-23'
status: 'ready-for-dev'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - _bmad-output/planning-artifacts/architecture/architecture-local-arcade-2026-11-19/ARCHITECTURE-SPINE.md
  - _bmad-output/specs/spec-local-arcade/SPEC.md
  - docs/game-authoring.md
  - _bmad-output/specs/spec-local-arcade/cabinet-inventory.md
  - _bmad-output/planning-artifacts/ux-designs/ux-local-arcade-2026-11-20/EXPERIENCE.md
  - _bmad-output/planning-artifacts/ux-designs/ux-local-arcade-2026-11-20/mockups/cabinet-close-up.html
warnings: ['oversized']
---

<intent-contract>

## Intent

**Problem:** Cabinet B0 is alive furniture with nothing inside it — the registry is empty, its screen paints a Core text placeholder, and there is no seat: a visitor can open the coin door and stand there. The epic's payoff ("sitting down, and playing the real game") needs three things at once: the first game plugin in `games/moon-patrol/` (the owner's own original Moon Patrol at `C:/git/moonpatrol`, vendored in with its input layer discarded), the kernel's seat-transition service (FR-6: sit, play in place, stand back into the room with continuity), and a live cabinet screen driven by the game's own sim state instead of the placeholder painter.

**Approach:** Vendor the game as the spine's two-part plugin — `games/moon-patrol/sim/` (plain JS: the vendored config/rng/course/world plus ported tests, edited only at the seam: particles out of sim, engine-variable math replaced, rng cursors exposed) and `games/moon-patrol/presentation/` (the vendored canvas-2D renderer + sprites, edited to draw from sim state instead of wall clock). The wrapper's existing `createGameInstance` enforces the contract verbatim (dt = 1/60, input exactly `{controls}`, wrapper-computed `stateHash`); a provisional `play(seed)` seam on the wrapper (and optional `play?(seed)` on the sim) enters the reserved `InstanceMode "play"` — marked provisional exactly as the story AC requires, since the Epic 3 reimplementation replaces this wrap at the final contract. A new kernel-owned `core/seat.ts` service owns sit/stand: E at an open coin door sits (kernel-fresh seed via the provisional registry entry's controls declaration fed by the extended input service), the seat system maps raw key views to the game's declared slots every tick, and standing restores the exact saved pose. `CabinetPlacement` gains a `gameId` link; the screen for a game-driven cabinet composites the adapter's frames into the attract zone (NEXT row unchanged), and the 1.4 Core painter stays as the no-game fallback path.

## Boundaries & Constraints

**Always:** the game registers by the build-generated registry alone — `tools/registry-list.json` (provisional carrier per AD-12 and the epic context's Technical Decision: never `manifest.json`, which the Epic 3 Registration skill writes; never hand-edit `generated/`) gains one entry `{id, simPath, seed, presPath, controls}`; `core/**` never imports `games/**` (depcheck stays green; `generated/` is the only importer — AD-1). `games/moon-patrol/sim/` imports nothing but itself: no three, no WebAudio, no DOM/window (AD-2); `ci/lint-bans.mjs` (which auto-scans any `games/*/sim/**`) passes on the vendored code with zero exemptions — `Math.random` particle bursts leave the sim (they become a game-local `burst` event; the presentation owns visual particles), `Math.sin` calls become `ctx.math.sin`, `Math.hypot` becomes `Math.sqrt(x*x + y*y)` (AD-4). The wrapper enforces dt = 1/60 exactly; the sim internally runs two `dt/2` substeps (exact double halving) because the vendored physics is tuned and tested at 1/120 (AD-3 permits internal substepping). Declared slots: `axis: move` ∈ [-1,1], buttons `start`, `jump`, `fire` (AD-7, game-authoring §3) — gameplay reads ONLY these; the vendored `input.js` is discarded at the seam, never vendored. `events()` emits only plain data: canonical `gameEnded {score}` + `scoreSubmitted {score}` at game-over, `roundBreak` at course clear; everything else keeps the vendored fx names as game-local events. `snapshot()` is plain-serializable including every rng cursor (kernel `ctx.rng.getState()` AND the vendored mulberry states — the vendored rng gains `getState`/`setState`); `stateHash()` stays wrapper-computed (AD-5); no sim defines its own. The seat service is kernel-owned in `core/` (the seat transition is a room service — epic context, spine microkernel law): standing + closed door + E opens the coin door (1.4 law); standing + open door + E sits and starts a play session with a kernel-fresh random seed; seated + E stands, restoring the saved player pose exactly and closing the coin door; the instance returns to attract the moment `gameEnded` lands (liveness law — no frozen screen; the visitor stays seated until their own E — "busy is never a lock" belongs to 1.6). The seated keyboard mapping mirrors the vendored attract legend exactly (`A/D` + `Arrows` = speed, `Z/J` = fire, `X/K` = jump, `Enter` = start/restart) — the game's own screen is the instruction surface, no new UI anywhere (UX-DR18/UX-DR24, AD-24). E remains the single interact verb (EXPERIENCE line 101). Attract mode runs continuously on the cabinet from the registry instance (seed derived from the entry — AD-4 roles), its sim-side attract clock advancing in-tick, its title-screen signature (MOON PATROL title, parallax scroll, theme cycle, blinking "PRESS ENTER" at 2 Hz — under the ≤3/s flash ceiling) drawn by the presentation from snapshot reads at render (AD-3: render reads, never advances). Vendored provenance: source `C:/git/moonpatrol` HEAD `49c351910af742a86cf97987bc474bb4d7d8da40` recorded in a header comment of every vendored file. Provisional marking: the sim and presentation index headers say PROVISIONAL wrap (AD-14) — the Epic 3 reimplementation replaces them at the standard contract with no visible cabinet-experience change.

**Never:** no `manifest.json`, no `arcade-ledger.json` writes (Epic 3 registration), no hand-edits under `generated/`; no edits to `core/loop.ts` or `core/supervisor.ts`; no autoplay AI in the sim (Story 1.6 owns `autoplay(seed)` — the hook is omitted and the wrapper already tolerates it missing); no audio (the vendored `audio.js` is NOT vendored — Moon Patrol sounds land with the Epic 2 Audio Manager, UX-DR25; the cabinet is silent in this story — no escalation: this is the planning artifacts' own Epic-2 deferral, not a scope drop); no scores on screen, no localStorage, no personal bests (Story 1.8 owns the table; the game's own in-run HUD score is game screen content and stays); no Patron, no queue, no busy state, no NEXT changes (1.6); no Instruction Card (3.5); no replay/recording (Epic 3); no new npm dependencies or webfonts; no runtime LLM (AD-18 — the sealed bundle's only outbound call stays `/api/report`, untouched); no DOM/window in either game half's non-glue code (the presentation draws into an injected `OffscreenCanvas` factory like the 1.4 painters); no `games/**` import from `core/**`; no pushing past the wrapper's input grammar (seated controls arrive as `{axes, buttons}` per AD-7 — the adapter and sim never see raw key codes).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Rule 1 integration (the seat service): real controller + real loop + real wrapper instance | scripted steps from entry spawn to B0 (real resolver, TARGET_REACH 2.0, centre-of-view), E, E | first E opens the coin door (1.4 law); second E: `instance.mode() === "play"`, world snapshot mode "running", seed = the seedFn value; scripted KeyA held 30 ticks moves the buggy left in `snapshot()`; E stands: player pose fields `===` the pre-sit snapshot exactly, coin door closed, instance back in attract | n/a |
| Attract liveness (CAP-3, spine fault predicate) | 3 × 720-tick theme cycles through the real `createKernelLoop`, sampling `stateHash()` per cycle boundary | three pairwise-distinct hashes; whole test runs in well under a second | a stalled attract hash is the dev dead-machine fault predicate (spine) — test fails loudly |
| Title-screen signature on the cabinet (UX-DR24) | adapter drawFrame at tick 0 and tick 600 into a recording fake 2D context | op-logs differ (scroll/cycle moved); theme-0 log contains the MOON PATROL title string; "PRESS ENTER" present; no wall-clock source in presentation (banned-strings scan pin) | n/a |
| Play → game over while seated | scripted controls driving lives to zero | `events()` drains `scoreSubmitted {score}` then `gameEnded {score}` (same tick), plain-data (JSON round-trip identity); instance flips back to attract and its hash keeps advancing; visitor stays seated; a start-button edge (Enter) while seated-at-attract calls `play(nextSeed)` — new run from the seedFn | n/a |
| Course clear | scripted clear of course A | `roundBreak` event; vendored champion behaviour (continue at courseIndex 1) keeps running unmodified | n/a |
| Seed roles (AD-4) | sit twice with seedFn stubbed to two different values | two run transcripts differ; with the same stubbed seed the transcripts are bit-identical; the attract instance's seed is the registry entry's number (source-pin + wrapper state) | n/a |
| Snapshot honesty | any play snapshot | `JSON.parse(JSON.stringify(s))` deep-equals `s`; both rng cursors present and plain; deep-freeze gate holds; out-of-tick writes to live sim state throw (AD-15) — the vendored `up.hits` Set of object refs is a numeric-id array in the snapshot | n/a |
| Seated look/movement law | seated, scripted W or mouse-drag views | player position and yaw/pitch do NOT change (zeroed view to `player.step`); E still routes (targeting still resolves B0 from the play pose) | n/a |
| Non-game cabinets | a placement with no `gameId` | E keeps the plain 1.4 coin-door toggle — the 1.4 integration law survives for future shells | n/a |
| Registry + gates | entry list grows 0 → 1 | `generated/game-registry.ts` regenerates with the one entry (drift gate green); depcheck green (`generated → games` legal, `core → games` absent); lint-bans green on the vendored sim with zero exemptions; typecheck green (tsconfig `allowJs` — the generated file imports the plain-JS sim) | n/a |
| Fresh environment (Rule 19) | fresh clone, `npm install`, `npm test` | the `games/**/*.test.js` glob joins `npm test`; every added/changed test passes standalone and against its neighbours in either run order (180 baseline + vendored ~32 + new) | n/a |
| Chrome + Edge matrix | lead's manual smoke (DW-12 tier) | see Verification manual checks | lead adjudicates by eye, standing precedent |

</intent-contract>

## Code Map

**New — the game plugin (plain JS, AD-13/AD-14):**
- `games/moon-patrol/sim/index.js` — `createSim()` → the contract hooks: `tick(dt,input)` (dt halves, 2 × 1/120 substeps into vendored `step`), `attract()`, `events()`, `snapshot()` (world + attract clock + both rng cursors, plain), plus provisional `play?(seed)`; canonical-event mapping from vendored fx names. PROVISIONAL header + provenance sha.
- `games/moon-patrol/sim/config.js`, `course.js` — vendored as-is (config carries the score TABLE as presentation-read data — never in snapshot; `course.js` keeps its own derived game-local rng — legal per game-authoring §2).
- `games/moon-patrol/sim/rng.js` — vendored mulberry32 + added `getState`/`setState` (plain uint32 state) so snapshots carry the cursor.
- `games/moon-patrol/sim/world.js` — vendored with seam edits only: particles out (emit game-local `burst` fx; `burst()` consumers presentation-side), `Math.sin` → `ctx.math.sin`, `Math.hypot` → `Math.sqrt`, `up.hits` Set-of-refs → numeric `oid` array, world rng state exposed for snapshot, `structuredClone` kept (plain data). dt-agnostic `step` unchanged.
- `games/moon-patrol/sim/*.test.js` — the three vendored test files + `helpers.js` ported into the repo (drive() feeds the boolean shape `step` reads; 1/120 semantics preserved).
- `games/moon-patrol/presentation/adapter.js` — `createPresentation({makeCanvas})` → `{canvas (game-resolution OffscreenCanvas), drawFrame(snapshotView)}`; vendored `render.js` edited: blinks/parallax/theme-cycle read the sim's attract clock and world `t`, never `performance.now`; HUD (score/lives) is game screen content. PROVISIONAL header.
- `games/moon-patrol/presentation/sprites.js` — vendored procedural sprite draws (as-is).
- `core/seat.ts` — the kernel seat-transition service: sit/stand state machine per the E law, saved pose, play-pose constants derived from `placementGeometry` + `SHELL.screen` (standoff 0.80m matching the 1.4 approach binding; pitch to screen-centre via `math.atan2` — (inference), smoke-tuned), per-tick raw-key → declared-slot mapping (from the registry entry's `controls`), seedFn injection (default Math.random-based — kernel side, sim-path bans untouched), canonical-event watching for `gameEnded` → instance back to attract, drains `loop.drainEvents()` as the M0 sole consumer.
- `core/seat.test.ts` — unit + Rule-1 integration tests for the rows above.
- `games/moon-patrol/presentation/adapter.test.js` — op-log determinism, title signature, attract-diff rows.

**Changed (extension, not fork — Rule 2 siblings named):**
- `core/contract/wrapper.ts` — optional `play?(seed)` on `SimHooks`, `play(seed)` on `GameInstance` (reseed injected rng → `sim.play?.(seed)` → mode `"play"`); the stale "no wrapper surface sets play" comment REPLACED (Rule 14); provisional marker comment.
- `core/input/index.ts` — track levels + per-tick keydown edges for ALL key codes; new `takeCodeView()` (levels + edges) consumed once per tick by the seat system; `takeView()` shape unchanged (1.2 pins green).
- `core/player.ts` — add `teleport({x,z,yaw,pitch})` (kernel pose setter used only by the seat service); step/target/interact semantics untouched.
- `core/room/cabinets.ts` — `CabinetPlacement` gains `gameId?: string` (authored link B0 ↔ "moon-patrol"); nothing else moves.
- `core/room/surfaces.ts` — new `compositeScreen(canvas, zones, gameCanvas, …)` beside `paintScreen`: game frame fit (letterboxed, no stretch) into the attract-zone rect + the 0.18m NEXT row + empty score zone; `paintScreen`/`repaintScreen` stay as the no-game fallback (1.7 will need them).
- `core/main.ts` — registry wiring gains presentation adapters (injected `makeCanvas`), a seat service instance + `addSystem("seat")`, seat-aware E handlers per placement (plain toggle where no `gameId`), per-frame composite draw for game-driven screens (reads `instance.snapshot()` — legal read outside the tick), `window.arcadeDebug` gains `seat`. Banned-strings law in `frame()` stands.
- `tools/registry-list.json` — the one entry (seed authored number, (inference)); `tools/gen-registry.mjs` — schema extended: `presPath` + `controls` (shallow-validated; unknown fields still fail); `tools/gen-registry.test.ts` — fixtures + emitted-output expectations updated.
- `package.json` — `test` glob adds `"games/**/*.test.js"` (script KEYS unchanged — bootstrap pin green); `tsconfig.json` — `allowJs: true` (the generated registry imports the plain-JS sim; JS files type-infer without `checkJs`, matching "games may be plain JS").
- Moved/retargeted pins (shared surfaces): `core/room/cabinets.test.ts` AC4 row "E again closes" → sits, and stand auto-closes; `core/main-glue.test.ts` gains seat-wiring + composite-draw pins (banned strings stay banned); `core/no-ui-dom.test.ts` dev-serve module list gains `/core/seat.ts` + `/generated/game-registry.ts` + `/games/moon-patrol/presentation/adapter.js`, and a DOM-free scan for `games/moon-patrol/presentation/`; 1.4's repaint-gate pins re-anchor to the fallback path (the game-driven B0 repaints from snapshot reads every frame).

## Tasks & Acceptance

- [ ] `games/moon-patrol/sim/*.js` -- create (vendor + seam edits) -- the game, deterministic, lint-clean
- [ ] `games/moon-patrol/sim/*.test.js` -- create (port) -- vendored behaviour locked after the seam edits
- [ ] `games/moon-patrol/presentation/*.js` -- create (vendor + edit) -- frames from sim state only
- [ ] `core/contract/wrapper.ts` -- modify (play seam) -- enter the reserved play mode contractually
- [ ] `tools/registry-list.json` + `tools/gen-registry.mjs` + its test -- modify -- the one registration carrier
- [ ] `core/input/index.ts`, `core/player.ts`, `core/room/cabinets.ts`, `core/room/surfaces.ts` -- modify (extend) -- raw-key views, teleport, gameId, compositeScreen
- [ ] `core/seat.ts` + `core/seat.test.ts` -- create -- the seat-transition service (FR-6)
- [ ] `core/main.ts` -- modify (wiring) -- seat system + adapter draw + seat-aware E handlers
- [ ] `package.json`, `tsconfig.json` -- modify -- test glob, allowJs
- [ ] moved pins in `cabinets.test.ts`, `main-glue.test.ts`, `no-ui-dom.test.ts` -- modify -- the enumerated shared surfaces move honestly

**AC 1 — Vendored in, L0-clean at the seam.** Given the owner's original game at `C:/git/moonpatrol@49c3519…`, when the vendored files land in `games/moon-patrol/`, then the sim half imports nothing but itself, the input.js/audio.js/main.js layers are not vendored, `node ci/lint-bans.mjs` and `node ci/depcheck.mjs` pass with zero exemptions, the ported vendored tests pass, and every vendored file carries its provenance header.

**AC 2 — Contract exposed verbatim through the wrapper.** Given a real `createGameInstance`, when the kernel loop ticks it at 1/60, then `tick → events → snapshot → stateHash` behave per the contract: input is exactly the declared `{axes,buttons}` slots, dt ≠ 1/60 throws, events and snapshot are plain-serializable (both rng cursors inside), `stateHash` is wrapper-computed, and `play(seed)` (provisional seam) re-arms the injected rng and flips the reserved mode.

**AC 3 — The cabinet is alive as Moon Patrol (CAP-3, CAP-7, UX-DR24).** Given only the registry entry and the kernel loop, when B0 is sampled, then attract runs continuously (stateHash advances every 720-tick theme cycle — a seconds-fast unit test), and the screen shows the vendored title-screen signature driven only by sim state.

**AC 4 — Play in place, stand back out (FR-6, CAP-5).** Given a standing visitor facing B0 (real resolver, real loop), when they press E twice, then a seeded run starts in place and declared-slot controls visibly drive the buggy in the snapshot; when they press E again, then position and view are restored exactly and room continuity holds (the transcript after standing replays identically to one that never sat, from the same standing state).

**AC 5 — Canonical events and honest seeds.** Given a scripted run to death while seated, then `scoreSubmitted {score}` + `gameEnded` land as plain data, the instance returns to attract liveness while the visitor stays seated, Enter restarts with a fresh seed; a course clear emits `roundBreak`; attract uses the entry's derived seed, visitor sessions a kernel-fresh one (test-visible via the injected seedFn); the wrap is marked provisional at both entry points.

**AC 6 — Every gate green, prior contracts preserved.** The full local suite passes (typecheck, `npm test` with games joined, depcheck, lint-bans, registry no-drift at 1 entry, build once); the 1.4 shell/marquee/roadmap/coin-door laws survive except the enumerated moved pins; zero new dependencies/webfonts; zero outbound calls beyond the untouched `/api/report` path.

## Spec Change Log

- 2026-11-23: initial plan (plan stage, unattended; no prior spec for this key).

## Review Triage Log

(empty — plan stage)

## Design Notes

**Ledger inbox:** the LEDGER slice for story key `1-5-moon-patrol-plays-in-place-vendored-wrapped-alive` is EMPTY — no deferred-work bullets arrived with this dispatch; nothing to address or decline. (DW-12's browser-smoke tier precedent still applies to Verification.)

**Governing Architecture Decisions (Rule 6):** AD-1 (registry is the only game surface; core never imports games), AD-2 (two-part plugin; sim imports nothing), AD-3 (global fixed tick; render reads only; internal substepping), AD-4 (rng injection + cursor in snapshot; Core math; seed roles derived-vs-fresh), AD-5 (wrapper-computed stateHash), AD-6 (canonical events; game-local fx names allowed as plain events), AD-7 (device capture in Core; games read declared slots), AD-8 (contract hooks; attract liveness), AD-11 (build-generated registry; provisional carrier per epic-context Technical Decision + AD-12's "Manifest never hand-written"), AD-13 (monorepo `games/<id>/`; vendored-in original code), AD-14 (wrap heterogeneous assets for M0; Epic 3 reimplementation), AD-15 (mutation only in-tick; supervisor wraps), AD-16 (scores travel only via scoreSubmitted; table Core-owned — 1.8), AD-18 (sealed build; vendored code is inert data in the bundle; zero LLM), AD-23 (kernel owns seat transition; play mode reserved for the scheduler — this story occupies it), AD-24 (no non-diegetic UI; the game's own attract legend is the instruction surface), plus the spine Consistency Conventions rows: Room geometry & collision (placement gains an id link, geometry untouched), State & mutation (seat state lives in the kernel system), Controls (slot grammar via the entry's controls declaration).

**Rule 1 — integration AC:** the seat-transition service is a service this story INTRODUCES; its Integration AC is the matrix's Rule-1 row (real player controller + real resolver + real kernel loop + real wrapper instance + real input service), plus the attract-consumer row (registry instance sampled through the loop). No fake collaborator substitutes for those.

**Rule 2 — lineage:** Consumes — 1.1 contract harness (wrapper EXTENDED with the play seam, not forked), 1.2 player/input (input EXTENDED with `takeCodeView`, player EXTENDED with `teleport`), 1.3 volumes/roadmap, 1.4 screen handles + injected-canvas painter pattern (`compositeScreen` beside `paintScreen`), coin-door law, placement record, 0.80m approach binding, smoke tier. Consumed-by — 1.6 (`autoplay(seed)` joins the omitted hook; the scheduler takes the seat surface + NEXT; game-local fx events are the impulse-mapping input), 1.7 (fault containment of a play instance; the Core-painter fallback branch this story keeps alive), 1.8 (`scoreSubmitted` consumer, bests keyed on the stable gameId "moon-patrol"), Epic 2 (audio: the vendored audio.js re-lands against the Audio Manager), Epic 3 (contract reimplementation replaces the sim+presentation to the standard contract — the replay restore must rewire the flattened `up.hits`/grp-alias copies noted below; Manifest + ledger replace the provisional carrier; the `play` seam's final contract shape lands there).

**Extend-don't-copy siblings:** `core/seat.ts` follows `player.ts`/`cabinets.ts` (kernel service, authored constants, system inside the tick); `compositeScreen` beside `paintScreen` (copy justified: composition-of-frames vs text-painting obey different fit laws, but the NEXT row reuses the 1.4 minimum); `gen-registry.mjs` schema extended in place; vendored `render/sprites/config/course/world/rng` are vendoring itself — the AC mandates the copy.

**Decided in-stage (unattended; inferences labelled):**
1. E-law cycle: standing+closed → open; standing+open → sit; seated → stand (auto-closes the coin door). This moves 1.4's "E again closes" pin; the door is never left open after standing, so the 1.4 law's closure-after-interaction flavour survives. (inference; smoke check)
2. Play pose: stand point 0.80m in front of the body face (the 1.4 approach binding), yaw toward the shell, pitch `atan2(screenCenterY − EYE_HEIGHT, 0.80)` via Core math — authored derivation, (inference), "tuned by eye at the smoke" precedent.
3. Seated input: movement/look views are zeroed into `player.step`; E still routes through targeting (the play pose faces B0 — targeting resolves it). No player-freeze flag; zeroed views are enough.
4. Wrapper `play(seed)` = reseed → `sim.play?.(seed)` → mode "play"; the optional sim-side `play?(seed)` on the vendored sim is a PROVISIONAL seam extension — the spine's AD-8 hook list is NOT amended (spine untouched; whether it eventually amends AD-8 is Epic 3's contract-reimplementation call, flagged for review here).
5. dt: tick(dt) runs exactly 2 substeps of dt/2 (exact double halving) — the vendored 1/120 tuning survives unchanged inside the 1/60 kernel. (inference; AD-3 permits substepping.)
6. Particles (the vendored sim's only nondeterminism) leave the sim: sim emits game-local `burst` events with x/y; the presentation owns visual particles stepped per draw from its own deterministic visual rng. Snapshot stays clean.
7. Snapshot honesty edits: `up.hits` Set-of-object-refs → numeric `oid` array; the `grpRef` shared alias flattens to per-object copies in the snapshot (stateHash equal; live-alias rewire on restore is Epic-3 replay scope — recorded, not silently dropped); vendored mulberry (rng.js + world-local one) gain getState/setState; the course-builder's derived game-local rng stream is legal per game-authoring §2 (transient build state, course output is plain data).
8. Canonical mapping: fx `gameover` → `scoreSubmitted {score}` + `gameEnded` same tick; fx `clear` → `roundBreak`; all other vendored fx names pass through as game-local plain events (they are 1.6's impulse-mapping input).
9. Kernel-fresh seed: seat service holds a seedFn (default `(Math.random()*0x100000000)>>>0`, kernel-side — lint-bans scans sim paths only) — injected in tests so determinism pins stay hermetic. (inference)
10. Seated keyboard map = the vendored attract legend's own keys (A/D + Arrows, Z/J, X/K, Enter) — the screen that teaches the game teaches the keys; the declaration rides the provisional registry entry (`controls`) — Manifest carrier until Epic 3. (inference)
11. `gameEnded` while seated: instance → `attract()`, visitor stays seated; Enter (start edge) restarts via `play(nextFreshSeed)`. No auto-eject (queue/lock laws are 1.6). (inference)
12. The seat system drains `loop.drainEvents()` each tick — sole M0 consumer; canonical events also recorded on `arcadeDebug.seat` for the console smoke. (inference)
13. Screen: game-driven B0 composites the adapter canvas into the attract-zone rect (letterbox fit — the no-stretch law's sibling), NEXT row stays Core-painted at 0.18m, score zone honestly empty until 1.8; the 1.4 paint-step gate governs only the fallback painter path now (game frames repaint every rAF from snapshot reads — reads outside the tick are legal). (inference)
14. tsconfig `allowJs: true` so the generated TS registry may import the plain-JS sim without declarations; no `checkJs`. (inference — matches "games may be plain JS")
15. No manifest.json/arcade-ledger.json here (AD-12 — Registration skill, Epic 3); `CabinetPlacement.gameId` is the authored B0↔game link (room data, not a games import).
16. Audio out of scope per the planning artifacts' own Epic-2 boundary (UX-DR25) — not a scope drop; no escalation.
17. IP: vendored code is the owner's own single-author original work (no third-party code/assets; all sprites procedural); no licence grant needed (allowed-licence list never engaged); the Moon Patrol trademark posture is the SPEC's already-accepted IP constraint. Provenance sha in every vendored header.
18. Entry seed: authored fixed number in `tools/registry-list.json` (any constant; (inference) — derived-role per AD-4; changing it re-pins nothing but attract-run transcripts).
19. `autoplay(seed)` NOT implemented in this story (1.6's); the wrapper tolerates the missing optional hook (1.1 design).
20. Fault behaviour while seated is 1.7's story; the supervisor already wraps the call sites — no seat-side containment invented here.

## Verification

**Commands (all at absolute workdir `C:/git/local-arcade`; every command finishes in one foreground call):**
- `npm run typecheck` -- (loop) expected: zero errors (allowJs now includes the vendored JS for import resolution)
- `npm test` -- (loop, and once as the full suite) expected: all pass (baseline 180/180 at the story base; + ported vendored ~32 + new seat/adapter/registry pins)
- `node ci/depcheck.mjs` -- (loop) expected: green (generated→games import present; core→games absent)
- `node ci/lint-bans.mjs` -- (loop) expected: green WITH the vendored sim now actually scanned — zero exemptions
- `node tools/gen-registry.mjs && git diff --exit-code -- generated/` -- (loop) expected: one entry, no drift
- `npm run build` -- (once per story) expected: Vite build succeeds (vendored plain JS bundles via the registry import; entry-chunk size warning tier unchanged precedent)

**Rule 19 — pinning test + demonstrated mutation per AC (implement pass: each mutation applied, red observed, reverted, tree byte-identical, suite green after reverts):**
- AC1 pin: lint-bans/depcheck green as test evidence + a provenance-header scan (sha string in every vendored file) + ported vendored tests green. `mutation: reintroduce Math.random in the burst path → lint-bans red; reverted.`
- AC2 pin: contract-conformance test through the REAL wrapper (wrong-dt throws; events JSON-identity; snapshot JSON-identity WITH both cursors; play(seed) reseed observable — same script+seed replays identical, different seed differs). `mutation: drop the world rng cursor from snapshot() → snapshot-serializability-cursor pin AND the same-seed determinism pin red; reverted.`
- AC3 pin: 3×720-tick cycle through the real loop → three distinct wrapper-computed hashes (seconds-fast); adapter op-log title-string + attract-diff pins; presentation banned-strings scan. `mutation: freeze the attract clock (no attractT increment) → cycle-hash liveness pin AND draw-diff pin red; reverted.`
- AC4 pin: Rule-1 integration row as a test (walk→E→E→scripted KeyA moves buggy in snapshot→E→pose fields exactly equal saved, door closed, mode attract; post-stand transcript identical to never-sat from the same standing state). `mutation: stand skips the teleport restore → pose-equality pin red; reverted.`
- AC5 pin: scripted death drains scoreSubmitted+gameEnded plain-data, instance flips to attract mid-seat (hash advances), Enter restart observable via seedFn stub; roundBreak on scripted clear; two sits with two stubbed seeds → differing transcripts, same seed → identical; PROVISIONAL header scan. `mutation: seat drops the scoreSubmitted emit (gameEnded only) → AC5 drain pin red; reverted.`
- AC6 pin: gates above; registry drift at 1; bootstrap script-keys pin; package.json/tsconfig diff pins; 1.4 suites green except the enumerated moved pins. `mutation: core/seat.ts gains a direct import of games/moon-patrol → depcheck red; reverted.`

**Shared surfaces that move:** `package.json` test glob (games join; script keys unchanged) and the recorded test-count baseline; `tsconfig.json` `allowJs`; `generated/game-registry.ts` entry count 0→1 (drift test regenerates); `CabinetPlacement` record +gameId (placement-shape pins); `cabinets.test.ts` AC4 E-sequence row (toggle → sit/stand cycle); `main-glue.test.ts` frame pins (seat wiring, composite draw, banned strings still absent); `no-ui-dom.test.ts` dev-serve module list + new presentation DOM-free scan; B0 screen repaint law (1.4 paint-step gate → fallback path only; game-driven repaint per frame from snapshot reads); `window.arcadeDebug` gains `seat`. Hermiticity criterion: every added or changed test passes on a fresh environment standalone and against its neighbours in either order.

**Lead's manual smoke (DW-12 tier — Chrome AND Edge, screenshots at the door vantage and the play vantage):** walk in → B0's screen shows the vendored attract title screen with blinking PRESS ENTER (motion visible, calm); E opens the coin door with the 1.4 pose swing; E sits — camera at the play pose, screen legible (the letterbox reads as a CRT frame, not stretched), A/D/Arrows drive the buggy, Z/J fire, X/K jump — the legend on screen matches what works; die → attract resumes while seated; Enter restarts with a different course seed feel; E stands → back on the feet at the same spot, door closed; marquee/NEXT/roadmap unchanged from 1.4; console clean; `arcadeDebug.seat` visible. Brightness/legibility totals stay the lead's adjudication per precedent.

## Auto Run Result

Status: ready-for-dev
Blocking condition: none
