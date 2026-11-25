---
title: 'Story 1.9: The street-door beat — loading as fiction''s first shot'
type: 'feature'
created: '2026-11-24'
status: 'ready-for-dev'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - _bmad-output/planning-artifacts/architecture/architecture-local-arcade-2026-11-19/ARCHITECTURE-SPINE.md
warnings: ['oversized']
deferred: []
---

<intent-contract>

## Intent

**Problem:** The page opens mid-room: the first thing a visitor gets is the room already running, with no entry beat (FR-1, UX-DR16). The room data is pre-shaped for the beat — `door-front` closed ("the open beat is 1.9"), the street-side volumes, the wainscot gap kept clear at low height (scene.ts:224) — but nothing views the door from the street, opens it, gates control, shows the outside-fiction workbench, or measures time-to-playable (the spine's Deferred "Time-to-playable budget — set when the shell is first measured" waits on exactly this measurement).

**Approach:** A Core-owned entry sequence (`core/entry.ts`): boot stays eager and byte-law-unchanged (identity before loop.start, loop.start, rAF pair); the camera starts on the authored street view; a supervisor-wrapped kernel "entry" system runs the beat in TICKS (bleed widens + glass brightens while the page settles, handle turns when the room is actually ready — first rendered frames — the front door swings while the camera dollies in to ENTRY_SPAWN, then control takes over). Failure paths never half-load: renderer construction throwing (no WebGL2) mounts the workbench INSTEAD of booting; the ~90s timeout (init wall-check + 5400 ticks) swaps the 3D canvas for the workbench canvas. The workbench is a CANVAS-PAINTED panel (mockup ui-* tokens) — the page grows exactly one canvas and zero markup on every path (`core/workbench.ts`, the single narrow DOM exception, pinned). The entry exposes plain state + the measured `timeToPlayableMs` on `arcadeDebug.entry` for the lead's smoke and the budget record.

## Boundaries & Constraints

**Always:** boot order byte-law-unchanged: `storage.visitorId();` before `loop.start();` (the 1.8 boot-eager pin) and exactly two `requestAnimationFrame(frame)` sites; the entry system is a kernel system (`addSystem("entry")`, registered BEFORE "player", supervisor-wrapped — a throwing entry system is a fault record, the room keeps ticking); beat motion is tick-derived (AD-3) — wall-clock touches entry only at (a) the init slow-load check and (b) the `timeToPlayableMs` stamp, both device-layer, labelled; the camera ends the dolly EXACTLY on the player's ENTRY_SPAWN pose at EYE_HEIGHT (no pop at takeover); during the beat the player view is zeroed (`entry.playerView` composes OUTSIDE `seat.playerView`: axes/aim/interact all false until phase "control"); the front-door panel's final closed pose equals today's extruded box (scene.ts keeps exactly ONE mesh per collision volume — door-front's mesh becomes handle-tracked, not duplicated); workbench text is painted with ctx.fillText from local fallback font stacks (NFR-4 zero external fonts/scripts) and carries "The arcade didn't open. Reload." with the mockup ui-* token family added to tokens.ts as its only home; `arcadeDebug` gains `entry` (state + `failNow()` console trigger, the 1.7 injectFault precedent, zero UI); every gate stays green; `git rev-parse --show-toplevel` must equal `C:/git/local-arcade` for every stage and subagent.

**Never:** no DOM markup beyond canvases — index.html body stays exactly the module script; the served page's DOM grows exactly one canvas on EVERY path (control: the 3D canvas; unsupported: only the workbench canvas; timeout: the 3D canvas is REMOVED and the workbench canvas appended — never two canvases at once); `core/main.ts` gains no new DOM write (its one `appendChild(renderer.domElement)` and the createElement/innerHTML/textContent ban stay byte-unchanged) — all element creation/attach/remove lives in `core/workbench.ts`, scanned narrow (exactly one `createElement("canvas")`, one append, one remove, no other DOM APIs); no progress bar, no spinner, no panel during a healthy beat, no sign-in/cookie/onboarding anywhere (UX-DR16); no edit to any file under `games/**`, `core/contract/*`, `core/loop.ts`, `core/seat.ts`, `core/patrons/*`, `core/storage.ts`, `core/input/*`, `core/room/cabinets.ts`, `ci/*`, `tools/*`, `generated/*`, `index.html`; `door-front.blocksMovement` stays TRUE (1.2's closed-door pin; the open beat is presentation pose only — walk-out through the door is the Epic-2 fixture law, and entry exposes the open state for it); no new dependencies or webfonts; no outbound calls (AD-18/AD-20 sealed); no wall-clock in sim paths (lint-bans green); no run recording; no commits by this story's stages — the untracked `_bmad-output/planning-artifacts/sprint-status.yaml` stray is never committed and never deleted; never read or write `_bmad-output/unattended` and never run `_bmad/scripts/unattended-inbox.sh`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Normal load, ready fast | page load, frames render in a few frames | phase door -> bleed/glass ramp with real settle -> ready (framesRendered >= READY_FRAMES) -> handle turns -> door swings open while camera dollies street->spawn -> phase control; WASD/look live; exactly one canvas | no error expected |
| Time-to-playable measurement | phase reaches "control" | `arcadeDebug.entry.state().timeToPlayableMs` = performance.now() at takeover, non-null; never rendered anywhere (guardrail ceiling, never shown) | — |
| Unsupported browser | `new THREE.WebGLRenderer` throws (no WebGL2) | workbench canvas is the ONLY canvas, painted "The arcade didn't open." + "Reload."; the room never boots (no loop, no scene, no second canvas) | caught at the entry gate; body has zero markup |
| Slow load (asset timeout at init) | entry created with `performance.now() >= ENTRY_TIMEOUT_MS` (~90s, UX-DR16) | straight to workbench — the beat never starts (never partial fiction) | — |
| In-run stall | no rendered frame by ENTRY_TIMEOUT_TICKS = 5400 ticks (~90s at 60Hz) | workbench mounts and the 3D canvas is removed (one canvas, then zero markup change) | timeout law is tick-counted (deterministic, AD-3-labelled) |
| Workbench click | pointerdown/click on the workbench canvas | `location.reload()` via the workbench module's device wiring | — |
| Entry system throws | entry.step throws one tick | supervisor fault record `core.system.entry.*`; loop ticks on; in-run timeout law eventually lands the workbench (self-heal, no half-door) | contained (AD-15) |
| Game-instance boot fault (1.7 no-regress) | a factory throws under hook "boot" | the beat is UNAFFECTED (1.7 degrades, the room still renders frames) — door opens, control takes over; 1.7 pins byte-unchanged | — |
| Input during the beat | WASD/mouse/E pressed while phase != control | `entry.playerView` zeroes axes/aim/interact; the player never moves; after "control" the view passes through untouched (seat law intact) | — |
| Camera continuity | final dolly tick | dolly pose === (ENTRY_SPAWN.x, EYE_HEIGHT, ENTRY_SPAWN.z), player read continues the same pose — no cut, no pop | — |
| Hidden tab during the beat | rAF pauses mid-beat | ticks pause with rAF; the beat resumes on return (timeout is tick-counted; the init wall-check already covered slow first loads) — labelled | — |
| Fresh environment (Rule 19) | fresh clone, install, test | every added/changed test passes standalone and against neighbours in either order (319 baseline at HEAD 98606b3 + new) | n/a |
| Chrome + Edge matrix | lead's manual smoke (DW-12 tier) | see Verification manual checks | lead adjudicates by eye, precedent |

</intent-contract>

## Code Map

- `core/entry.ts` — NEW: the entry sequence law. `createEntrySequence({ now, spawn, eyeHeight })` -> `{ step(), markFrameRendered(), playerView(view), pose(), phase(), state(), failNow() }`; phases `boot-check | door | ready-handle | open | control | workbench`; authored constants (inference unless cited): `ENTRY_TIMEOUT_MS = 90_000` (~90s UX-DR16), `ENTRY_TIMEOUT_TICKS = 5400` (90s x 60Hz), `ENTRY_READY_FRAMES = 2` (inference), `HANDLE_TICKS`, `OPEN_TICKS`, `STREET_VIEW = { x: 0, z: 7.35 }` on the authored street-floor strip (collision-volumes.ts:147 spans z 6.5..8.25), yaw facing the door, eye height EYE_HEIGHT. Dolly = lerp STREET_VIEW -> spawn (pure arithmetic; any transcendental via `core/contract` math). DOM-free (scan-able like room modules); wall-clock only via injected `now` at init + control stamp.
- `core/entry.test.ts` — NEW: fake `now`, fake DeviceView (player.test.ts view-builder idiom): phase sequence at exact tick windows; slow-load init -> workbench phase before any beat; 5400-tick stall -> workbench; entry throw -> loop keeps ticking (real loop rig, loop.test idiom); playerView zeroing then passthrough (composition with the REAL seat.playerView); dolly endpoint === ENTRY_SPAWN pose (math module, exact pins); `state()` plain-data.
- `core/room/door.ts` — NEW: front-door furniture law, extends the `coinDoorPose` hinge idiom (cabinets.ts:coinDoorPose): `frontDoorOpenPose(fraction 0..1)` -> panel position/yaw about the vertical hinge at x = -DOOR_HALF_W swinging roomward; handle rotation 0 -> 18deg (mockup); ramp maps entry progress -> bleed/glass light intensity+distance. Every dim derives from `DOOR_T/DOOR_TOP/DOOR_HALF_W/WALL_T/HALF_Z` — never retyped. Inside `core/room/` -> the existing DOM-free room scan covers it automatically.
- `core/room/door.test.ts` — NEW (joins the core/room test family): closed pose == today's volume-box placement (byte-continuity pin); open pose exact hinge math; ramps monotone 0..1.
- `core/room/scene.ts` — modify: build the street-view composition parts (mockup match, composition + tokens only): collect the door-front extrusion into a returned `handles.frontDoor = { panel, handle, glassMesh?, bleedLight, glassLight }` (special-case kind "door" in the existing loop — ONE mesh per volume law preserved); awning box proud of the front wall exterior above the door head (Wall Panel token, dims from door constants); glass sheet + handle proud of the panel's street face (+Z); a GLOW_MARQUEE bleed point light at the door base on the street side + a glass light (both start dark, the frame re-poses them — the coin-door-pose idiom). `RoomHandles` extends (the 1.4 screens/doors precedent).
- `core/room/tokens.ts` — modify: add the mockup's outside-fiction panel family + glass hexes as the single home: `UI_SURFACE #191919, UI_TEXT #EDEDED, UI_BORDER #2E2E2E, UI_FOCUS #5BC8FF, GLASS_DARK #3a2c20, GLASS_DIM #2a2018` (Rule 14: toCss derives). Keep the hue-set guard honest (tokens stay the only home).
- `core/workbench.ts` — NEW: the outside-fiction panel. `mountWorkbench({ doc, reason, removeCanvas })`: the ONLY core module that creates/attaches/removes an element — exactly one `createElement("canvas")`, one append, one remove (narrow pin, new no-ui-dom scan); panel painted ctx.fillText on the canvas (fallback font stack, ui-* tokens, mockup composition: panel bottom-right of the viewport), click handler -> `location.reload()` (device wiring injected/recordable for tests); `paintWorkbench(canvas, copy)` stays a pure painter (surfaces.ts idiom — Rule 2 extend).
- `core/workbench.test.ts` — NEW: fake doc recorder (createElement/appendChild/removeChild call law), painter text contains the exact copy, reload handler fires the injected reload.
- `core/main.ts` — modify: (1) renderer construction wrapped in try/catch -> on throw `mountWorkbench({ removeCanvas: null })` and DO NOT boot (boot body wrapped in one `bootArcade()` function; every existing law substring survives); slow-load init check before the beat; (2) `const entry = createEntrySequence({ now: () => performance.now(), ... })`, `loop.addSystem("entry", () => entry.step())` registered BEFORE "player"; player line becomes `player.step(1, entry.playerView(seat.playerView(input.takeView())));` (the 1.8 composed-argument pin idiom); (3) frame(): camera pose from `entry.pose()` until phase "control" (the existing player-read line survives unchanged inside the else branch), front-door furniture re-posed + lights ramped from entry state every frame (coin-door idiom), `entry.markFrameRendered()` after a successful `renderer.render`, workbench swap once when phase "workbench" (`mountWorkbench({ removeCanvas: canvas })` inside a one-shot guard — a throwing mount is console.error'd once, never a per-frame try); (4) `window.arcadeDebug` gains `entry` (type + assignment move, 1.8 idiom).
- `core/main-glue.test.ts` — modify: moved/extended pins — player-step composed line (replaces the :172 pin), `addSystem("entry"` registered before `"player"` (source-index idiom, :283-285), boot-eager + two-rAF pins STAY byte-unchanged (regression pins), camera-branch + front-door-pose + frame-stamp + one-shot-mount pins, arcadeDebug pin line gains `entry`.
- `core/no-ui-dom.test.ts` — modify: dev-serve module list gains `/core/entry.ts`, `/core/workbench.ts`, `/core/room/door.ts`; NEW narrow scan: workbench.ts DOM surface exactly {createElement("canvas"), appendChild once, removeChild once, addEventListener for reload} and nothing else; entry.ts joins a DOM-free scan (document./window./localStorage/navigator./createElement/style.); index.html + main.ts pins byte-unchanged.
- `core/room/scene.test.ts` + `core/room/scene-qa.test.ts` — modify: front-door furniture part pins (glass/handle/awning meshes, token-only materials, lights start dark, closed front-door pose equals the old plain extrusion), existing per-volume/baseplate/shell counts adjusted only by the new furniture.
- Read-only evidence: `core/room/collision-volumes.ts:52,63-69,114-160` (ENTRY_SPAWN, DOOR_*, door-front, street strip — all authored "for 1.9"); `core/room/scene.ts:224` (wainscot gap law cites "1.9's door-open beat"); `core/main-glue.test.ts:172,190,283-285,370` (the pins 1.9 must not break: seat-view, two-rAF, system order, boot-eager "1.9's boot beat rides this wiring"); `core/loop.ts:110-117` (systems supervisor-wrapped `core.system.<id>`); mockup `_bmad-output/planning-artifacts/ux-designs/ux-local-arcade-2026-11-20/mockups/street-door-loading.html` (composition + tokens ONLY, UX-DR26).

## Tasks & Acceptance

**Execution:**
- `core/entry.ts` + `core/entry.test.ts` -- create -- phase law, ready gate, timeout law, dolly pose, playerView gate, measurement
- `core/room/door.ts` + `core/room/door.test.ts` + `core/room/scene.ts` + `core/room/tokens.ts` -- modify/create -- street composition, front-door pose/ramp law, tokens home
- `core/workbench.ts` + `core/workbench.test.ts` -- create -- canvas-painted panel, narrow-DOM law, reload wiring
- `core/main.ts` -- modify -- boot gate + entry system + camera branch + furniture/frame-stamp/workbench legs + arcadeDebug.entry
- `core/main-glue.test.ts` + `core/no-ui-dom.test.ts` + `core/room/scene.test.ts` + `core/room/scene-qa.test.ts` -- modify -- moved/new pins per Code Map (DW-12 source-pin tier convention)
- matrix edge tests -- covered by entry/workbench/door suites above

**Acceptance Criteria:**

**AC 1 — The page opens on the closed door from the street, zero UI (FR-1, UX-DR16).** Given a supported browser at page load, when the first frames render, then the rendered view is the authored street composition (facade, awning, glassed door, handle, widening bleed) with the entry phase at door/ready-handle; the served body grows exactly ONE canvas and zero markup; no progress bar or panel exists (no-ui-dom pins + entry phase pins green).

**AC 2 — Readiness is real, and the takeover is seamless (NFR-1, AD-3).** Given the room reaches ready (frames rendered >= ENTRY_READY_FRAMES), when the handle ticks and the open window runs, then the door swings open while the camera dollies to EXACTLY the ENTRY_SPAWN pose at EYE_HEIGHT and phase becomes control, after which the player's view passes through (axes/aim/E live; drag-look silent fallback per 1.2 law). Given input during the beat, then nothing moves (entry.playerView zeros — composed outside seat.playerView, glue pin).

**AC 3 — The measurement is recorded, never shown (NFR-1, spine Deferred).** When phase hits control, `arcadeDebug.entry.state().timeToPlayableMs` holds performance.now() at takeover (device-layer stamp); nothing in the scene, DOM, or console announces a budget or bar. The lead's smoke records the number; closing the spine's Deferred "Time-to-playable budget" row is the LEAD's spine write at that record (Rule 20) — this story only produces the measurement.

**AC 4 — Entry never half-loads (UX-DR15 partial, UX-DR16).** Given renderer construction throws, then the room never boots and the workbench canvas is the page's only DOM addition; given the slow-load init check or 5400 ticks without a rendered frame, then the 3D canvas is removed and the workbench canvas mounted once — the panel reads "The arcade didn't open. Reload." in the ui-* token family, painted (no markup text), click reloads; on every path body holds at most one canvas and zero other elements. Underpowered-FPS detection is explicitly OUT (no M0 threshold exists — spine Deferred to M2; UX-DR15 is "partial" in its own AC wording).

**AC 5 — No prior law regresses (1.2/1.3/1.4/1.7/1.8).** Boot-eager identity pin and the two-rAF law byte-unchanged; door-front stays one mesh, closed pose byte-continuous, blocksMovement true (1.2 closed-door pin green); every existing 1.4/1.7/1.8 glue and containment pin green; the room keeps ticking through the beat (Patrons play behind the door — the bleed's light source is literally the room running); a boot-faulted cabinet degrades exactly as 1.7 pins; `npm test` (319 baseline at HEAD 98606b3 + new), typecheck, depcheck, lint-bans, registry no-drift, `npm run build` all green; zero new deps, zero outbound calls.

**AC 6 — Composition matches the mockup for composition and tokens only (UX-DR26).** The street-view parts (sidewalk/facade already authored; awning, glass, handle, bleed + glass lights) carry the mockup's token family from tokens.ts (hue-set guard pins the new hexes' single home); the scene-tier pins assert token-only materials and zero painted glow (1.3's identity law holds from the street side too).

### Design-note anchors for review
Rule 6 AD ids: see Design Notes below. Rule 3: the canvas-painted panel + source-pin tiers follow the 1.8 precedent (browser evidence on the lead's smoke tier).

## Spec Change Log

## Review Triage Log

## Design Notes

**Ledger inbox (Rule 17):** EMPTY — `LEDGER slice 1-9-the-street-door-beat-loading-as-fiction-s-first-shot` has no entries; nothing to address or decline.

**Governing Architecture Decisions (Rule 6):** AD-3 (beat motion tick-derived; wall-clock only device-layer at init-check + measurement stamp, labelled; timeout tick-counted); AD-15 (entry is a supervisor-wrapped kernel system; a throwing entry self-heals to the timeout path; the room never crashes); AD-24 (diegetic integrity — the door IS the fiction; the workbench is the UX-DR15/16-sanctioned OUTSIDE-fiction state: canvas-painted, zero markup, and it replaces fiction rather than annotating it; the AD-24 text-surface whitelist covers in-room surfaces only — the panel is not a room surface); AD-16 (boot-eager identity untouched: the id exists before the door opens); AD-11/AD-18/AD-20 + NFR-4 (sealed bundle: no runtime asset fetch to hide behind — readiness keys on the browser's REAL settle (rendered frames); zero external fonts/scripts; workbench text on local fallback stacks); AD-25 (the front door is a Core/room fixture — 1.9 owns the open-beat pose and exposes open state; walk-out/E interaction law is Epic 2's); AD-7 (device capture untouched; input gated at the view layer like seat.playerView; pointer-lock denial stays silent — takeover needs no gesture, drag-look carries it); AD-2/AD-1 (games tree untouched; entry lives kernel-side); AD-27 untouched (no culling change).

**Rule 1 — integration AC:** the entry sequence is the shared component introduced. Consumer: `frame()` reads `entry.pose()`/`phase()` and produces the observable camera takeover + door furniture motion — pinned at the glue source tier (camera branch, pose application, frame stamp) plus the entry suite's executed pose law; consumer: the lead's smoke reads `arcadeDebug.entry` (phase + timeToPlayableMs) and drives `failNow()`. Consumed-by: 2.1 (the audio twin keys its swell to `entry.state().phase`/progress — the one seam Epic 2 needs; UX-DR16's sound twin), 2.4 (Settings-by-walking-out rides the front-door open state + fixture law), Epic 3 (the sealed-build/framerate audits sample the room only after takeover). Consumes: 1.1 (loop, supervisor, rAF law), 1.2 (player view gate, EYE_HEIGHT, collision law), 1.3 (door/street volumes, ENTRY_SPAWN, wainscot-gap law — all authored "for 1.9"), 1.8 (boot-eager wiring the beat rides, main-glue:370).

**Rule 2 — extend-don't-copy siblings:** `frontDoorOpenPose` extends the `coinDoorPose` hinge law (cabinets.ts); `paintWorkbench` extends the surfaces.ts painter idiom (injected canvas, toCss from tokens — the panel is the same "paint, never markup" law as the Welcome Flyer); `entry.playerView` extends `seat.playerView`; the camera/furniture read in frame() reuses the coin-door/figure re-pose idiom; the boot wrap reuses the containment try-at-the-edge posture. Entry's state machine has no sibling — new is correct.

**Decided in-stage (unattended; inferences labelled):**
1. Workbench = a second canvas swapped in, never a DOM panel: keeps the smoke law "body exactly SCRIPT+CANVAS" true on ALL paths (at most one canvas at any instant); narrow-DOM exception pinned to `core/workbench.ts`. (inference from the two conflicting laws; the resolution is the smallest one that satisfies both)
2. Panel copy painted via ctx.fillText (fallback stacks; NFR-4); "Reload." is actionable as canvas-click -> location.reload() (mockup affordance without a DOM button). (inference)
3. Unsupported detection = renderer-construction failure (WebGL2, three 0.187's floor); the underpowered-FPS heuristic waits for M2 thresholds — the spine's Deferred row says the framerate floor numbers are set at M2 and 1.9's AC already says "UX-DR15 partial". (inference)
4. Readiness = `framesRendered >= 2` (authored, inference) — what actually loads after eager boot is the browser's first-frame settle; honest limit labelled: the pre-module network wait cannot animate the door (the script is not running yet) — the init wall-check covers >~90s slow loads so those visitors get the panel, never half fiction.
5. Timeout 5400 ticks (~90s at 60Hz, UX-DR16's "~") + init wall-check; a hidden-tab beat pauses with rAF and resumes (labelled).
6. Camera handover = dolly through the doorway ending exactly on the player spawn pose — no cut (surface continuity; pose law pinned at both endpoints).
7. The front-door OPEN state is presentation + exposed state only; `door-front.blocksMovement` stays true (walk-out is Epic 2's fixture law — keeps 1.2's closed-door pin byte-unchanged).
8. `arcadeDebug.entry.failNow()` mirrors the 1.7 injectFault precedent so Chrome+Edge smoke drives the workbench swap on the real fault law, not a script.
9. The Welcome Flyer keeps 1.3's room-side placement (single room-sign law); the mockup's flyer leg of the composition is that same surface — 1.9 neither moves nor duplicates it. (inference)
10. Awning/glass/handle are scene furniture derived from the door/wall constants — the one-mesh-per-volume extrusion law survives (door-front's mesh gains a handle, not a twin).

## Verification

**Commands (absolute workdir `C:/git/local-arcade`; every command finishes in one foreground call, `timeout: 600000`):**
- `npm run typecheck` -- (loop) expected: zero errors (entry/workbench/door TS + RoomHandles extension)
- `npm test` -- (loop, and once as the full suite) expected: all pass (319 baseline at HEAD 98606b3 + new entry/workbench/door/glue tests; suite stays comfortably inside one call)
- `node ci/depcheck.mjs` -- (loop) expected: green — entry/workbench/room-door import core only; games tree untouched
- `node ci/lint-bans.mjs` -- (loop) expected: green (no games/sim change)
- `node tools/gen-registry.mjs && git diff --exit-code -- generated/` -- (loop) expected: no drift (registry untouched)
- `npm run build` -- (once per story) expected: Vite build succeeds (entry-chunk warning tier precedent)

**Rule 19 — pinning tests + intended mutations (implement stage: apply, observe red, revert byte-identical, record the `mutation:` lines):**
- AC1 pin: entry boot-phase test (phase door at boot) + no-ui-dom single-canvas/module-list + scene composition furniture pins. `mutation: entry.step starts in phase "control" (skip the beat) -> the boot-phase pin and the input-gate pins red; revert.`
- AC2 pin: phase-window sequence test + dolly-endpoint pin (=== ENTRY_SPAWN/EYE_HEIGHT, math module) + composed playerView glue pin. `mutation: dolly end uses STREET_VIEW z (no walk-in) -> the endpoint pin red (takeover pop); revert. mutation: entry.playerView passes the view through during "open" -> the zeroing pin red (visitor walks mid-beat); revert.`
- AC3 pin: control-stamp test (fake now: state().timeToPlayableMs === the fake now at the control tick). `mutation: the stamp reads loop.tickCount instead of injected now -> the measurement pin red; revert.`
- AC4 pin: renderer-throw path (mount called, boot skipped — glue source pin + entry test), init slow-load straight-to-workbench, 5400-tick stall -> workbench phase, workbench.test.ts narrow-DOM call-law test + copy pin. `mutation: drop the removeChild of the 3D canvas on timeout -> the one-canvas call-law pin red (two canvases); revert. mutation: ENTRY_TIMEOUT_TICKS off-by-order (compares before incrementing) -> the exact-tick stall pin red; revert.`
- AC5 pin: byte-unchanged boot-eager + two-rAF pins stay green + 1.7/1.8 pins untouched + entry-throw containment test (real loop rig: fault record, tick count advances). `mutation: register "entry" AFTER "player" -> the system-order source pin red (player steps one tick unzeroed); revert.`
- AC6 pin: scene-tier token-only material pins over the new furniture + hue-set guard (new hexes only in tokens.ts). `mutation: the awning material uses a literal hex -> the hue-set guard red; revert.`

**Shared surfaces (Rule 19):** `window.arcadeDebug` shape (+`entry` — main-glue pin line moves), the player-step view line (`seat.playerView(input.takeView())` -> composed `entry.playerView(seat.playerView(input.takeView()))` — main-glue :172 pin moves), `RoomHandles` (+`frontDoor` — scene.test/scene-qa furniture+count pins move, per-volume copy law preserved), the scene mesh set (+awning/glass/handle/two lights, token-only), `no-ui-dom.test.ts` dev-serve module list (+entry, workbench, room/door) + a new narrow workbench scan, the recorded test-count baseline. Standing criterion: every test added or changed passes on a fresh environment, standalone and against its neighbours in either order.

**Lead's manual smoke (DW-12 tier — Chrome AND Edge):** fresh load of `npm run dev`: the view is the closed door from the street (composition matches the mockup: sidewalk band, facade, awning, glassed door, handle, bleed widening under the door while the page settles — Patrons' room-glow is the light source), no progress bar anywhere; bleed+glass reach full, handle turns, door swings open with the camera walking in, then WASD walks and drag-look looks (pointer-lock denial silent); console `arcadeDebug.entry.state()` shows phase "control" and a REAL `timeToPlayableMs` — RECORD the number for the lead's budget entry (the spine Deferred row closes at the lead's spine write, Rule 20); `arcadeDebug.entry.failNow()` -> the 3D canvas is replaced by the plain workbench panel reading "The arcade didn't open. Reload." (ui-* tokens, click reloads); at all three moments DevTools shows body = exactly script + ONE canvas, zero other elements.

## Auto Run Result

Status: ready-for-dev
Blocking condition: none

Plan stage (2026-11-24): spec written from the epics 1.9 block, epic-1 context (reused, not recompiled), the spine (Rule 6 map above), the 1.8 continuity spec, and the 1.9 planning sweep (PRD FR-1 ceiling, UX-DR15/16/26 verbatim, mockup composition/tokens, boot-pin evidence). Not implemented, not committed — the plan stage halts for the lead's validation gate per the dispatch.
