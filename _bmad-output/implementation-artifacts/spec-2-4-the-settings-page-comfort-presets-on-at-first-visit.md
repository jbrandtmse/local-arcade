---
title: 'Story 2.4: The Settings page — comfort presets on at first visit'
type: 'feature'
created: '2026-11-27'
status: 'done'
review_loop_iteration: 0
followup_review_recommended: true
baseline_revision: '0eccd503a3206c8a64f2920e2d5f7bc59af67c7a'
baseline_commit: '0eccd503a3206c8a64f2920e2d5f7bc59af67c7a'
context:
  - _bmad-output/planning-artifacts/architecture/architecture-local-arcade-2026-11-19/ARCHITECTURE-SPINE.md
  - _bmad-output/implementation-artifacts/epic-2-context.md
warnings: ['oversized']
deferred:
  - summary: >-
      Browser-tier claims for this story — the focus ring as rendered, real contrast
      measurement, real matchMedia reduced-motion detection, real pointer-lock
      release, and any assistive-tech read of the page — have no executed browser
      tier. They are pinned at the structure/style-values tier (fake-doc node
      census, aria/shape cues, inline style literals from ui-* tokens) plus the
      executable boot tier; the executed browser tier defers to the Epic-3 harness
      plus the M1 walk (2.6), whose comfort/Deaf-HoH variants depend on this page.
    evidence: |-
      Same posture as 2.1/2.2/2.3 frontmatter items (no browser-E2E harness exists
      until Epic 3). A structure pin that keeps every literal green can still render
      wrong (font metrics, real AT semantics) — only the walk sees that.
    location: >-
      core/settings-ui.ts style/aria pins in core/settings-ui.test.ts; matchMedia +
      localStorage fake globals in core/main-boot-qa.test.ts
    severity: low
  - summary: >-
      Comfort-number placeholders are labelled and provisional per UX-DR20's own
      [ASSUMPTION] tag: preset bob ladder (off 0.04 / low half / full 0), sensitivity
      slider law (value/50 = multiplier on MOUSE_SENSITIVITY), arrow-look rate, calm
      tempo cadence (advance 1 tick per 2). Law shapes are pinned; the finals wait
      for the L3 vestibular test (5-minute walk, symptom report).
    evidence: |-
      UX-DR20: "baselines provisional — tune at the L3 vestibular test". Defaults
      chosen so shipped behaviour is byte-preserved at default slider positions
      (master 100 -> gain 1.0, strength 100 -> exact FOCUS_DUCK, FOV 60).
    location: >-
      core/settings.ts labelled constants; consumed in core/player.ts,
      core/input/index.ts, core/main.ts tempo wrap
    severity: low
  - summary: >-
      Focus-mix strength has no executed boot-tier composition pin through the
      shipped glue: the row reaches core/audio/manager.ts -> mix.ts only as a
      live getter at core/main.ts, pinned by an injected-getter unit tier
      (manager.test.ts) plus a MAIN.includes text pin. A leg that commits a
      non-default strength and observes the mix floor on a seated chain needs
      a boot-tier seat cycle — heavier than this story's boot scope; the
      look-source half of the review finding (VG-1) was patched instead
      (arrows leg in the boot live-getters test).
    evidence: |-
      Review pass VG-1: deleting the focusStrength option from the shipped
      createAudioManager call leaves every executed test green. The manager's
      own tier proves the getter is honored; only the shipped composition hop
      rides the text pin.
    location: >-
      core/main.ts focusStrength getter wiring; core/main-boot-qa.test.ts
      (the live-getters test)
    severity: medium
  - summary: >-
      The Story 2.4 boot-tier tests share the file's boot narrative (boot-2's
      handle, boot2AtPump, absolute panelCount/matchMedia counters) rather
      than being per-test hermetic — the established 2.3 pattern, extended.
      Deterministic in declaration order, but a solo run of a later boot test
      would read the earlier narrative's state. Relative counters plus a
      self-captured boot-2 handle would make each leg standalone; that re-tunes
      the whole file's pins and is QA-tier work.
    evidence: |-
      Review pass VG-o1 (boot2AtPump assignment lives inside the #settings
      test; identity consumes it; counters assert absolute accumulated values).
      Same idiom as the 2.3 boot tier's single-narrative three-test run; the
      spec's hermeticity clause ("every added or changed test passes in either
      order") reads over the file as run — node --test runs each file in one
      process in declaration order.
    location: >-
      core/main-boot-qa.test.ts Story 2.4 legs (#settings-at-load,
      accommodations-never-fork) and their shared counters
    severity: low
---

<intent-contract>

## Intent

**Problem:** The M1 accessibility floor has no Settings surface: motion, audio, and input accommodations cannot be seen or chosen; the comfort preset is not ON at first visit; and walking out the front door mid-session reaches nothing (door-front permanently blocks, no exit view exists). Stories 2.5 (site page) and 2.6 (the M1 walk, whose SM-1 muted variant needs the master-volume row) are preconditioned on this page existing.

**Approach:** A device-layer settings tier. `core/settings.ts` owns the row schema, defaults, first-visit seeding from an injected `prefers-reduced-motion` port, and a pure resolution law turning stored rows into scalars; persistence rides `core/storage.ts` (the single localStorage owner) under `arcade.settings.v1`. The scalars are consumed by the existing systems — player (bob), input (sensitivity multiplier, look-source gate, arrow-key aim, remap table), audio (new master gain node + focus-mix strength input to mix.ts), camera (FOV), cabinets (tempo wrap at the `stepCabinetPhase` call site). A same-document outside-fiction DOM panel (`core/settings-ui.ts`, workbench's injected-doc precedent, new narrow-allowlist leg in the no-ui-dom scan) opens when the visitor crosses the now-walkable open front door outward (the street strip IS the exit view) and via a `#settings` deep link; the room keeps ticking, so the absence laws already price the queue-position cost, and "Back to the arcade" re-enters without any reload.

## Boundaries & Constraints

**Always:**
- Settings are device-layer only (NFR-9): they never enter sim state, `stateHash`, or Run Recording inputs at slot level — a settings change between two seeded runs of the same game leaves the recording inputs and hashes identical; no `games/` edit.
- Persistence through `core/storage.ts` only (the single-owner localStorage scan, no-ui-dom.test.ts:137): new key `arcade.settings.v1`, corrupt/unknown/out-of-range payloads merge-per-key to defaults and never throw, port-throw degrades to the memory overlay with zero supervisor faults.
- First visit seeds the comfort preset ON, never silently off: OS reduce -> `full`, else -> `low` (mockup's checked state). The preset tunes head-bob off the authored tokens (off = `BOB_AMPLITUDE` 0.04, low = half, full = 0); walk speed 1.4 m/s stays (UX-DR20 tunes baselines only at the L3 vestibular test).
- The page is outside-fiction workbench voice, single column, mockup composition MINUS the Epic-3 rows: groups Look (sensitivity, look-source, input remap), Sound (master volume, focus-mix strength), Comfort (preset tri-state, FOV, vignette, calm cabinets), reset action. Colours ONLY via `toCss(UI_*)` — `UI_MUTED`, `UI_ACCENT` join `tokens.ts`; copy rides the mockup's strings as authored constants (workbench idiom).
- WCAG 2.2 AA structural laws (UX-DR23): control style literals carry the 24px minimum; focus-ring style uses `UI_FOCUS`; toggles/segments cue state by role + aria-checked + position + ON/OFF word nodes + shape marker, never colour alone.
- Defaults equal shipped behaviour: master 100 -> gain 1.0, focus strength 100 -> exact `FOCUS_DUCK`, FOV 60, calm off, vignette off, look-source mouse (lock + silent drag fallback per UX-DR18), bindings W/A/S/D/E.
- Door exit is the literal walk-out: `door-front.blocksMovement` flips to false in place (authored-data edit per the spine's Room geometry conventions row; the volume stays in the occluder `kind: door` set — occlusion is unaffected); the open door during control is fiction-consistent (door.ts notes the volume never moves today). Crossing the door plane outward (pure tick pose state) opens the panel and exits pointer-lock; crossing back closes it. The room never stops ticking.
- Calm cabinets: tempo multiplier wraps the existing `stepCabinetPhase(cabinets, 1)` call site (advance one phase tick per two loop ticks when calm); `CABINET_PHASE_CYCLE_TICKS`, the phase law, glow/pulse laws, and containment sampling stay byte-identical — cabinets keep moving and glowing.
- Vignette is a `pointer-events:none` DOM overlay carrying zero text and zero interactive elements, gradient from the ROOM_BLACK channels (it is light-management, not chrome); off by default.
- Input remap: a table of {forward, back, left, right} -> `event.code` supplied to the input service; Interact stays E this release (mockup: disabled Rebind + hint) — the row shows it, the button is disabled.

**Never:**
- No new npm dependency; no second HTML entry / `rollupOptions.input` change (a second page is a forced reload — forbidden mid-session); `index.html` body stays exactly `["script"]`.
- No banter volume, subtitle, or quiet-room rows — negative-census pin (they arrive with banter, Epic 3).
- No edits to cabinet shell internals (`SHELL` profiles, part meshes), `cabinetPlacements`, or the collision-volume list beyond the single `door-front.blocksMovement` bit (DW-29 separation contract).
- No scheduler API to preserve a claim across exit — the existing absence laws (presence predicate, off-chair void/re-arm) ARE the queue-position cost; no `core/patrons/` edit.
- No `location.reload` in any settings module (banned token in its scan leg); no browser-E2E tier; no dev-server or :5173 leg; no `games/`, `generated/`, or ledger edits; no HUD/in-room prompt UI (the panel covers only the street/outside context, never overlays in-room control — crossing inward closes it).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| First visit, reduced motion | no stored key, injected port `() => true` | preset `full` -> bob 0; defaults otherwise | n/a |
| First visit, no OS signal | no stored key, port `() => false` | preset `low` -> bob = half `BOB_AMPLITUDE` (labelled) | n/a |
| Return visit | stored valid object | stored rows verbatim; port never consulted | n/a |
| Corrupt store | unparseable JSON / unknown keys / out-of-range values | per-key merge to defaults, clamps applied; zero supervisor faults | degrade idiom |
| Port throws (no localStorage) | boot-qa global set | defaults; memory overlay; suite-green (existing storage law) | overlay |
| Slider commit (master/focus/fov/sens) | panel change event | value persists immediately; live apply, no reload: graph master gain settles v/100; focus factor = `1 - s*(1-FOCUS_DUCK)` (s=1 at default pins 2.2 byte-identical); `camera.fov` + projection update; input aim multiplier = value/50 | n/a |
| Preset change | radio commit | bob scalar changes on the next player step; page shape marker + aria-checked move | n/a |
| Calm ON | switch commit | phase advances 1 per 2 loop ticks (recorded); pulse/scan-band consumers keep running; never dark | n/a |
| Look-source arrows | radio commit | arrow keys write the same `{dx,dy}` aim channel; no pointer-lock request; mouse mode keeps lock + drag fallback (1.2 pins' shape) | n/a |
| Rebind forward -> KeyQ | remap UI | `takeView` maps KeyQ; KeyW idles; persist; reset restores W | n/a |
| Walk-out mid-session | control phase, pose crosses door plane outward (|x| <= 0.5, z past inner face) | street strip reachable; panel open; pointer-lock released; scheduler `present()` false at any cabinet while away -> claims lapse at breaks, chair empties (queue cost) | n/a |
| Re-enter | cross inward or Back-to-the-arcade | panel closes / visitor returns to `ENTRY_SPAWN`; same document, no navigation; no claim restored (cost paid) | n/a |
| `#settings` at load | fresh load with hash | panel over the street/entry context; entry beat keeps ticking behind; close returns to the normal beat | n/a |
| Reset | button | stored key cleared; effective values = first-visit seed immediately | n/a |
| Settings vs determinism | same seed + same recorded inputs, settings A vs B | game instance `stateHash` sequence identical | n/a |

</intent-contract>

## Code Map

- `core/settings.ts` -- NEW: row schema + defaults + `arcade.settings.v1` codec + first-visit seed (injected `prefersReducedMotion: () => boolean` port) + pure resolvers (`bobAmplitude(settings)`, `aimMultiplier`, `focusStrength`, `masterGain`, `fov`, `tempoEveryN`, `bindingTable`). Persistence via `storage.ts`'s exported StoragePort/browser-port + degrade-overlay idiom (extend, not a new store). No wall-clock, no `localStorage` literal.
- `core/settings-ui.ts` -- NEW: same-document panel. Workbench's injected-doc idiom (`WorkbenchDoc`-style slice) + row-spec data -> builder creates the node tree; copy as authored constants from the mockup; styles inline via `toCss(UI_*)` + the 24px/2px-ring literals; events commit through settings.ts and the injected apply callbacks. Banned: `location.reload`, `innerHTML`, room tokens.
- `core/main.ts` -- eager settings boot BEFORE system construction (the `storage.visitorId()` eager pattern :366-367): load once, wire scalars into player, input service, audio (master gain at graph build + setter), camera FOV (:150 + `updateProjectionMatrix` — none today), cabinets tempo wrap at the :440 callback (the `main-glue.test.ts:147` pin moves with it); mount panel lazily; door-crossing detection reads `player.state` in the tick (open/close with a small dead-band); `#settings` hash hook; vignette overlay create-once/toggle; pointer-lock release + input buffer drop on open (reuse `visibilityChanged` idiom).
- `core/storage.ts` -- export the StoragePort type + browser-port factory for reuse (additive; all existing laws byte-preserved).
- `core/player.ts` -- `WALK_SPEED`/`BOB_AMPLITUDE` (:19,:21) stay the authored baselines; step() consumes an injected effective bob amplitude (and walk speed stays). `teleport` (:244-249) is the re-entry seam. `MOUSE_SENSITIVITY` (:24) untouched — the multiplier scales aim upstream in input.
- `core/input/index.ts` -- hardcoded codes (:83-87) become the default table entries; service takes `bindingTable` + `lookSource` + `aimMultiplier`; new arrow-key aim producer writing the SAME `{dx,dy}` channel drag uses (:119-124 gate); `takeView` (:153-166) applies multiplier once/tick; `main.ts:529-555` DOM glue unchanged.
- `core/audio/manager.ts` -- master GainNode between chains and `destination` (:400-402 chain ends; graph seam :82-96); default 1.0 byte-identity; live setter; `state()` gains a `masterGain` read.
- `core/audio/mix.ts` -- `focusMultiplierFor` (:132-134) takes a strength input: effective = `1 - strength*(1-FOCUS_DUCK)`; strength 1 reproduces `FOCUS_DUCK` exactly (2.2 pins byte-preserved).
- `core/room/collision-volumes.ts` -- `door-front` (:115-122): `blocksMovement: true -> false` (the ONLY list edit); `ENTRY_SPAWN` :52 re-entry target; `street-floor` (:146-153) becomes reachable; ids/order/kinds byte-preserved.
- `core/room/tokens.ts` -- add `UI_MUTED '#9A9A9A'`, `UI_ACCENT` (same hex as GLOW_CYAN by DESIGN's `{colors.glow-cyan}` borrow); hex-home floor (:1219) moves 28 -> 30.
- `core/no-ui-dom.test.ts` -- NEW settings-ui leg in the workbench-allowlist shape (:90-112 pattern): exact counts for `createElement(` per tag family, `.appendChild(`/`.removeChild(`, `addEventListener(`, `style.`, `textContent`; forbids `document.` direct beyond the mount slice, `window.`, `innerHTML`, `querySelector`, `localStorage`, `location.reload`. Existing legs byte-preserved except count re-pins where main.ts's wiring lines moved.
- `core/entry.ts` -- untouched (phase gate :177-187, street pose :71 are the context for the load-time panel).
- `core/patrons/scheduler.ts` -- untouched: presence :165-172 + void/re-arm :261-268 are the queue-cost law.
- `core/room/cabinets.ts` / `door.ts` -- read-only (phase law :359-373 byte-preserved; door ramp untouched).
- Tests: `core/settings.test.ts` (NEW — schema/seed/codec/clamps/degrade/resolver twins), `core/settings-ui.test.ts` (NEW — fake-doc builder: row census + NEGATIVE census (no banter/subtitle/quiet) + aria/shape/word cue pins + 24px/ring style literals + copy constants + reset), `core/main-boot-qa.test.ts` + `main-boot-three-shim.mjs` (extend fake globals: `matchMedia`, `localStorage`, richer `createElement` stub with `style`/`setAttribute`/`textContent`/value props — then boot-tier consumer pins: audio master gain, camera FOV, input multiplier/binding, tempo cadence, crossing -> panel open + scheduler presence false + chair law, `#settings`, settings-vs-hash identity), `core/player.test.ts` / `core/input/input.test.ts` / `core/audio/mix.test.ts` / `core/audio/manager.test.ts` (moved pins at defaults stay green; bob pin moves to the effective-scalar form).
- `core/main-glue.test.ts` -- :147 cabinets-callback pin follows the tempo wrap (moved-pin precedent, 1.9/2.1/2.3); wiring pins for the new boot block; `window.arcadeDebug` line pin moves with the additive `settings` leg.

## Tasks & Acceptance

**Execution:**
- `core/settings.ts` + `core/settings.test.ts` -- NEW pure tier per Code Map; every tunable a labelled constant (deferred item 2); unit-test every matrix persistence/seed/resolve row.
- `core/storage.ts` -- export port machinery; additive only, all 868 test lines byte-preserved.
- `core/settings-ui.ts` + `core/settings-ui.test.ts` -- NEW panel per mockup composition minus Epic-3 rows; fake-doc census + WCAG-structure pins; copy from mockup strings.
- `core/no-ui-dom.test.ts` -- add the settings-ui narrow-allowlist leg; re-pin counts; add `location.reload` to its ban list.
- `core/player.ts`, `core/input/index.ts` (+ their tests) -- effective bob scalar; binding table + look-source gate + arrow producer + aim multiplier; defaults keep existing pins green at 1.0x/mouse mode; bob pin moves to the effective form (UX-DR20 supersedes the 1.2 ±0.04 first-visit default — record in the commit).
- `core/audio/manager.ts`, `core/audio/mix.ts` (+ tests) -- master gain node + strength input; default identities pinned literally (gain 1.0, `FOCUS_DUCK` exact).
- `core/room/collision-volumes.ts`, `core/room/tokens.ts` (+ scene.test floor count) -- door bit flip; two ui-* tokens.
- `core/main.ts` + `core/main-glue.test.ts` -- boot wiring, crossing detector (open/close dead-band), panel mount + `#settings` hook, vignette overlay, FOV application, tempo wrap; moved pins per Code Map.
- `core/main-boot-qa.test.ts` + shim -- fake-global extension + executable consumer pins incl. the settings-vs-identical-stateHash row and the exit/queue-cost leg.

**Ledger inbox (Rule 17):** `LEDGER slice 2-4-the-settings-page-comfort-presets-on-at-first-visit` reads empty — nothing to address or decline (verified at dispatch; decision-pending DW-8/25/39/45 and DW-29 assessed under Design Notes — none bind this story).

**Acceptance Criteria:**
- Given the built panel tree (fake-doc tier), then it is single-column workbench voice with the exact M1 row census {sensitivity, look-source, remap, master, focus-mix, preset, FOV, vignette, calm, reset} and a NEGATIVE census leg asserting no banter/subtitle/quiet-room nodes; every colour comes from `UI_*` via `toCss`, and `settings-ui.ts` contains zero hex literals (hex-home + source scan) — outside-fiction tokens law (AC1, UX-DR14).
- Given each consumer, then reading settings produces an observable effect at the consumer's tier: fake audio graph master gain settles to the slider fraction; `mix.ts` focus factor tracks strength with default byte-identity; `camera.fov` + projection update; player step bob amplitude tracks the preset; the loop record shows tempo cadence change; `takeView` aim/binding change (AC2 Integration ACs, Rule 1).
- Given first visit, then the preset is ON (`full` under injected reduce, else `low`) and persisted only on first change; a return visit never re-seeds (AC4, UX-DR20).
- Given the stored key, then it lives under `arcade.settings.v1` via the storage single-owner; corrupt/port-throw inputs degrade with zero faults and per-key defaults (AC5, NFR-9).
- Given settings A vs B around the same seeded game instance with identical recorded slot inputs, then the instance `stateHash` sequence is byte-identical — accommodations never fork a run (AC5; boot tier).
- Given the panel structure, then controls carry 24px-minimum style literals, the focus ring style names `UI_FOCUS`, and every toggle/segment exposes role + aria-checked + position/shape marker + ON/OFF word nodes — colour never alone (AC6, UX-DR23; executed AT/browser contrast tier = frontmatter deferred item 1).
- Given control-phase play, then walking outward through the open front door reaches the street strip, opens the panel, releases pointer-lock; scheduler presence fails while away (claims lapse at breaks, an empty chair voids/re-arms — the queue-position cost); crossing back or Back-to-the-arcade re-enters at `ENTRY_SPAWN` in the same document — no reload anywhere (AC7, UX-DR14/16).
- Given the loop (`npm run typecheck`, `npm test`, `node ci/depcheck.mjs`, `node ci/lint-bans.mjs`, `node tools/gen-registry.mjs && git diff --exit-code -- generated/`), then all green with every 1.x/2.0-2.3 pin byte-preserved except the moved pins named in the Code Map; `npm run build` once at story end.
- Given a fresh environment, every added or changed test passes in either order.

## Spec Change Log

### 2026-11-28 — mutation-block AC relabel (authoring fix, from review layer VG-2)

The `## Verification` mutation lines carried AC ids inconsistent with this spec's own Acceptance Criteria list (seed law had AC1, census AC2, a non-existent AC3, master-gain/bob/strength/tempo split across AC4/AC6). Corrected to the spec's AC map (seed law -> AC4, codec/clamps -> AC5, census -> AC1, WCAG 24px -> AC6, master-gain/bob/strength/tempo -> AC2, seed/never-re-seed -> AC4). No AC text, I/O matrix row, or intent contract changed; this is the verification-block's own provenance repair, applied through the owning build skill per project policy.

## Review Triage Log

### 2026-11-28 — Review pass (four context-free layers over the `0eccd50…` diff)

Layers: blind-hunter (10 findings), edge-case-hunter (5, JSON), verification-gap (2 primary + 4 other), intent-alignment (9 divergence rows). Total 30 rows. Verdicts: 1 high, 11 medium, 11 low, 7 false. Routes: 10 patched (as 7 root-cause fixes B/A/C/D/E/F/I/J + VG-2 test fix + VG-o3 demos), 2 deferred (added to frontmatter), 1 authoring fix (relabeled above), the rest rejected with reasons below. `followup_review_recommended: true` — fix B (panel visibility) is the high-severity patch and is pinned only at the style-literal + boot-fake-DOM tier; the real-page layout and the focus-mix composition hop remain the named unverified risks (frontmatter deferred items 1 and 3).

**Route A — deep-link auto-close (root cause: close arm fired on pose alone).**
- BH-1 — medium — main.ts exit system closed the `#settings` panel ~210 ticks after load (ENTRY_SPAWN z=5.6 <= door-front.min.z 6.25 with no crossing ever taken); verified real at the cited geometry. PATCH: `openedByCrossing` flag gates the close arm; boot-qa survival leg added; falsifier R (drop the flag) reds the #settings pin, sole red.
- EH-2 — medium — same root cause from the edge tier (hash-opened panel + pose on the close side). Patched with Route A; the agent's `openedByHash` guard shape was NOT taken (the crossing flag is simpler and covers hash AND walk opens).
- intent#4 — low — flagged the same fate as unpinned at every tier. Patched with Route A (the boot tier now pumps boot-2 past control and asserts the panel survives).

**Route B — panel invisible on the real page (HIGH).**
- BH-2 — high — `mountSettingsPanel` root was static-flow (width/padding/background/color only) under `html, body { height:100%; overflow:hidden }`: the whole page landed below the fold, unreachable. The most severe finding of the pass. PATCH: fixed overlay root (`position:fixed; left/top 0; max-height 100vh; overflow-y:auto`) — the vignette's own positioning idiom; pinned in settings-ui.test.ts WCAG leg + no-ui-dom style count; falsifiers R8 (style legs) red both layers.
- BH-8 — medium — vignette (positioned, full-viewport, no z-index) painted above the then-static panel. Root cause was the same static root; with the panel now positioned and mounted LATER in DOM order, it paints above the vignette with no z-index ladder. Patched with Route B; stacking stays a by-eye claim (deferred item 1).

**Route C — stale rebind capture (root cause: capture listener outlived its page).**
- BH-3 — medium — `captureKey`'s one-shot `window` keydown survived close/Back: a later in-room keypress committed a binding mid-run and repainted a detached panel; stacked captures answered one key with many verbs. PATCH: `pendingCapture` cancel seam — closing (either way) cancels the pending capture; a second Rebind click cancels the first.
- EH-1 — medium — same root cause (double-click + close-before-reply legs). Patched with Route C. Boot-qa cancel leg drives the panel's Rebind then closes with the capture pending; falsifier R16 (drop the cancel call) reds it, sole red.
- EH-5 — low — REJECT (recorded): `settings.commit()` outside the panel's `onRows` seam (debug console, 2.6's driver) would leave FOV/gain/vignette stale while `rows()` says otherwise. The panel's commit path is the only product write side this story ships; `arcadeDebug.settings` is the spec's read-only debug leg (field-access readers), and a service-wide `onChange` channel is a new surface the spec does not ask for — 2.6 drives the same panel seam.

**Route D — binding collisions.**
- BH-7 — medium — commit/decode accepted two verbs on one code, a verb on KeyE, and arrows-as-movement double-duty. PATCH (product default, recorded in the Auto Run Result): commit-side rejection when the four verbs are not distinct; KeyE/arrow codes as movement stay allowed (Interact never tabled; double-duty is the visitor's own choice); decodeRows stays per-key permissive so corrupt stores still self-heal. Pinned in settings.test.ts; falsifier R4 sole red.
- EH-4 — medium — same root cause; its proposed "reject Arrow codes while lookSource=arrows" guard was NOT taken (it fights the visitor-choice default) — the arrow-vs-PAGE problem is a different root cause, fixed by Route E.

**Route E — arrows vs. the page's own keyboard navigation.**
- BH-5 — medium — with `lookSource:"arrows"`, radiogroup arrow navigation wrote aim every tick and turned the camera behind the page; the note that `aimMultiplier` also scales arrow speed is accepted (one channel, one sensitivity — the AD-26 replay-currency law). PATCH: `lookEnabled` getter — while the panel is up the LOOK channel is gated (arrows silent, pending deltas consumed-not-emitted), MOVEMENT stays live (the walk-back law, AC7). Pinned at the unit tier (input.test.ts) and the boot tier (walk-out gate leg), text-pinned in main-glue; falsifiers R5 (unit) and R14 (boot wiring) red.

**Route F — dead preset border cue.**
- BH-4 — low — `paintPreset` wrote `borderColor` on labels with default `border-style:none` — inert; the advertised "marker AND border show the pick" cue was half-real. PATCH: labels carry a real `2px solid` border; pinned in the preset-segment leg; falsifier R7 sole red.

**Route I — duplicate default-binding home.**
- BH-10 — low — `DEFAULT_BINDING_TABLE` re-declared the default table as a mutable copy in core/input/index.ts. PATCH: derives from settings.ts `DEFAULT_BINDING` (single vocabulary home); existing input.test default-table pin stays green.

**Route J — zero-amplitude settle degenerate.**
- EH-3 — medium — standing while the preset switched to full: the decay law scaled to zero decays by zero, stranding a bob-offset eye. PATCH: `bobAmplitude <= 0` settles instantly; stillness leg in the effective-bob test; falsifier R6 red.

**Verification-gap layer.**
- VG-1 — medium — lookSource and focusStrength had no executable consumer leg through the shipped glue (only `MAIN.includes` text pins). PATCH half: boot-qa live-getters test gained the arrows leg (commit arrows, dispatched keydown, yaw moves); `focusStrength` boot composition needs a seat cycle — DEFERRED (new frontmatter item 3).
- VG-2 — low — `assert.equal(vignetteGradient(), vignetteGradient())` could never fail. PATCH: replaced with the overlay-background-equals-law pin; the agent's demo (mount-side gradient swap) read GREEN before the fix and RED after.
- VG-o1 — low — the boot tier is a shared narrative (boot2AtPump, absolute panelCount counters), not per-test hermetic. DEFERRED (new frontmatter item 4): pre-existing 2.3 boot-narrative idiom, deterministic in declaration order; a relative-counter rewrite re-tunes the whole file's pins and is QA-tier work, not this story's.
- VG-o2 — false (as a code finding) — the AC mislabels are real but live in the spec's verification block; FIXED as the authoring change logged above.
- VG-o3 — medium — several AC legs (colour home, FOV-at-construction, aim multiplier, port-throw, reset marker, aria/shape cues, never-re-seed, census planting) had no mutation demonstration. PATCH: 16 further demonstrations run this pass (see the review-pass block in `## Verification`); every named pin observed red, every revert sha256-verified.
- VG-o4 — low — REJECT: the rebind keypress also reaches the input service, so pressing a movement key while rebinding walks. Intentional: the walk-back close law (AC7) REQUIRES movement live under the panel, and the look half — the actually-harmful half — is gated by Route E; the axes leak is the accepted product default.

**Intent-alignment layer (reading disclosures; divergences 1-9).**
- intent#1 — low — REJECT (recorded decision): the open trigger moved from the matrix's "z past inner face" to the street edge (6.5) with the door volume as dead-band — the spine Code Map's crossing law and the no-flap requirement mandate it; pinned at both text and boot tiers.
- intent#2 — false — the port-throw row's named tier moved (boot-qa stubs localStorage now; the degrade leg runs in settings.test.ts where no global exists). Accepted relocation — storage.ts's law home is the pure tier; the boot file states it.
- intent#3 — low — REJECT (recorded): the queue-lapse scenario asserts absence, not a lapsed held claim. The spec's own design note makes the absence laws the queue cost; staging a seat cycle pre-crossing is boot-tier scope creep (2.6's walk variants exercise the seated case).
- intent#5 — false — the WCAG 24px law is pinned at style-literal level; the frontmatter deferred item 1 already owns the computed/browser claim.
- intent#6 — false — "stored key cleared" implemented as the in-key empty marker: StoragePort (storage.ts:99-102) has only getItem/setItem — verified; the marker is the only shape available and is pinned.
- intent#7 — low — REJECT with the capture-seam part now MOOT: the boot-qa cancel leg drives the panel's Rebind + dispatched window keydown end-to-end (negative path); the `visibilityChanged()` call-count stays a call-site-law text pin.
- intent#8 — false — the single-owner scan binds code text (comments stripped); the footnote copy names localStorage only as rendered prose, verbatim from the mockup — the concat idiom keeps the scan honest.
- intent#9 — low — REJECT (recorded): the identity pin runs with zero dispatched input, so "same recorded inputs" holds vacuously; settings never reach sim inputs (AD-16 — that edge is the input tier's replay-currency law, pinned there); a play-under-two-settings-window boot leg is QA-tier work.

**False findings, code layer.**
- BH-6 — false — `HINT_SENSITIVITY` "14px target labels use ui-muted..." is mock BODY copy (a `.hint` div inside the slider row at mockups/settings-page.html:152), not a side-margin annotation; the copy law pins it correctly. Same for `HINT_LOOK_SOURCE` (mockup line 159).
- BH-9 — false — "Back leaves #settings armed": clearing the hash would be a navigation primitive (AC7 never-navigates; the matrix's reload-with-hash row mandates that the deep link opens the page). The URL posture on reload is 2.5's link design, not this story's.

## Design Notes

**Governing AD ids (Rule 6):** AD-7 (Core owns the one Audio Manager graph — master gain lives there — and owns device capture: sensitivity/look-source/remap stay inside the input service, devices never leak to games), AD-16 (anonymous identity storage under `arcade.*` via the namespaced Core storage service; settings carry no PII and never reach sim input), AD-15 (settings never mutate sim state; scalars feed core systems from the device layer; faults unchanged), AD-3 (the tempo wrap is tick-counted, never wall-clock; every new module is clock-free), AD-27 (phase stays mod-240; calm tempo is presentation tempo only — liveness invisible; the awake set untouched), AD-24 (fiction posture: the panel renders only in the outside/street context, never overlays in-room control; the vignette overlay is a presentation accommodation (NFR-9) with zero informational content — posture flagged for the Epic-3 L2 character-lint author), AD-18/AD-11 (sealed bundle: zero new deps/assets, `matchMedia` is local, drift check green), AD-10 + Room-geometry conventions row (the volume list is authored data rewritten in place — the door bit is that sanctioned in-place edit; placement untouched), AD-23 (queue semantics untouched — absence laws pay the cost), AD-1/AD-2 (no game half involvement; depcheck green), AD-17 (desktop keyboard/mouse posture unchanged).

**No AD contradicts an AC.** The 1.2 ±0.04m-bob AC default is superseded at first visit by UX-DR20's owner-fixed preset-ON law; the token and the off-preset literal survive; pins move, never delete (narrow, don't delete — 2.0 law).

**Extend, don't copy (Rule 2).** Persistence extends `storage.ts` (its StoragePort + degrade overlay — the single-owner scan forces it). `settings-ui.ts` extends the `workbench.ts` injected-doc + narrow-allowlist precedent, NOT its canvas-painting: WCAG 2.2 AA (24px hit targets, focus rings, radio/switch roles) is unservable on a painted canvas, so the module takes real DOM with a pinned narrower surface — reason recorded here per Rule 2. The arrow-key producer writes the SAME `{dx,dy}` aim channel drag-look already uses (one channel, three producers). Focus strength extends `mix.ts`'s multiplier-shaped law at its input. The tempo wrap wraps the existing call site instead of touching the phase law.

**plan: decisions recorded (unattended-run policy).**
1. Same-document panel, not a second HTML entry — "never a forced reload" rules out page navigation mid-session; 2.5's skip-link uses the `#settings` hook.
2. Door exit = walk through the open door (blocksMovement flipped in place) rather than an E-interaction: the AC says "walking out"; the volume stays the `kind: door` occluder (sound law untouched); the crossing detector is a pose dead-band, pure tick state.
3. First-visit seed `reduce -> full, else low` — the mockup's checked `low` plus UX-DR20's wording fix this reading; the preset is never first-visit-off.
4. The preset tunes head-bob only; walk speed, FOV, vignette, calm are independent rows (mockup state shows vignette/calm OFF at `low`); UX-DR20's [ASSUMPTION] tunes baselines at the L3 vestibular test, so any wider preset bundle is a later authored-data change.
5. E (interact) stays unremapped this release — the mockup's disabled Rebind + "Interact stays E this release" hint.
6. Slider defaults = shipped behaviour (master 100, strength 100, FOV 60) so all 2.1/2.2 audio pins byte-preserve; the mockup's 80/50/75 are demo state, not product defaults.
7. Vignette gradient uses ROOM_BLACK channels (light-management, matching the room's own dark) while the page chrome uses only ui-* — the token-fence AC concerns the page, and DESIGN's "every color is light-from-a-machine" argues the vignette belongs to the light family.
8. Ledger assessment: DW-8/DW-39 (lint-ban rule surface) — this story changes no sim-path ban rule; not implicated. DW-25 (Moon Patrol respawn) — no game touched. DW-45 (emissive/screen-brightest) — no emissive/ACES edit. DW-29 separation contract: no shell profile, part list, or mesh named by any AC/task/pin; the calm-tempo wrap sits at the main.ts call site, not inside cabinets.ts.

**Integration ACs (Rule 1).** Consumers are in the matrix/tasks: audio manager, mix law, player, input service, camera, loop-cabinets, scheduler (indirect cost), 2.5's future link. **Consumed-by:** Story 2.5 (site page skip-link `#settings`; sibling disclosure panel reuses this page's voice/tokens), Story 2.6 (SM-1 muted variant drives the master-volume row; comfort presets are walk preconditions), Story 3.x (banter volume/mute + subtitles + quiet-room rows extend the row census; L2 character lint judges the vignette-overlay posture). **Consumes:** `core/storage.ts` port + overlay; `core/input/index.ts` service; `core/audio/{manager,mix}`; `core/player.ts`; `core/main.ts` camera + loop wiring; `core/room/{collision-volumes,tokens,cabinets}`; scheduler laws (read-only).

**Falsifiability (for implement/QA to demonstrate).** Seed port `() => true` but drop the seed branch -> first-visit `full` pin red; remove the corrupt-key clamp -> corrupt-store pin red; rename a row id or add a banter row -> census legs red; bob scalar ignored -> preset step pin red; master gain built but never connected before `destination` -> fake-graph settle red; strength input ignored -> mix factor default-identity still green BUT strength-0 leg red; flip door bit without the crossing detector -> walk-out matrix row red; tempo wrap advancing every tick -> loop-record cadence red; `location.reload` in settings-ui -> guard leg red; settings change that mutates game state -> stateHash-identity boot pin red.

**Continuity (Story 2.3 done).** This story is 2.3's named consumer: the comfort/vignette rows ride 2.3's pulse/haze + 3/sec law untouched (no light-tier edit needed — the vignette is DOM-side and the calm tempo feeds the same phase input the pulse reads). The boot-qa tier (QA, 2.3) is the executable consumer tier here too. The injected-placement/labelled-placeholder/twin idioms carry forward verbatim.

## Verification

**Commands:**
- `npm run typecheck` (loop) -- expected: clean.
- `node --test core/settings.test.ts core/settings-ui.test.ts core/storage.test.ts core/input/input.test.ts core/player.test.ts` (loop) -- expected: all green (settings tier + moved-pin families).
- `node --test core/audio/manager.test.ts core/audio/mix.test.ts core/room/scene.test.ts core/room/cabinets.test.ts` (loop) -- expected: green; master-gain and strength-identity legs included.
- `node --test core/main-glue.test.ts core/main-boot-qa.test.ts core/no-ui-dom.test.ts core/entry.test.ts` (loop) -- expected: green incl. the extended boot tier and new guard leg.
- `npm test` (once) -- expected: full suite green (~480 + new tests); split batches above cover the 10-min cap.
- `node ci/depcheck.mjs` (loop) -- expected: AD-1 import direction clean (settings tier is core-internal).
- `node ci/lint-bans.mjs` (loop) -- expected: clean, rules unchanged (this story touches no sim-path ban surface — DW-8/DW-39 not implicated).
- `node tools/gen-registry.mjs && git diff --exit-code -- generated/` (loop) -- expected: no drift (no registry field).
- `npm run build` (once, at story end) -- expected: clean bundle.

**Shared surfaces:** `door-front.blocksMovement` (room.test resolver pins, 1.3 AC pin, player.test blocking pins — moved per precedent); the collision-volume list otherwise byte-identical; `core/no-ui-dom.test.ts` guard counts + new leg; `core/room/tokens.ts` hex-home floor 28 -> 30; the row-id/label census (Story 2.5 links into it — pin the id list); `window.arcadeDebug` additive `settings` leg (field-access readers; no whole-object deepEqual readers — the 2.2 posture); `main-glue.test.ts:147` cabinets callback pin (moved); player.test bob literals (moved to effective-scalar form); boot-qa fake-global set (matchMedia/localStorage/createElement stub — shared by every future boot test). Hermeticity: every test added or changed passes on a fresh environment, in either order; no test touches :5173 or another test's state.

**Manual checks (deferred tier, report never claim):** on a self-started dev-server port (never the lead's :5173), Tab through the page — the ring moves visibly; walk out the front door — the panel appears, the door sound keeps occluding behind it, walking back restores control with no reload; `arcadeDebug.settings` mirrors the effective scalars. The by-eye/browser tier stands in frontmatter `deferred` item 1 — the M1 walk and Epic-3 harness own it.

**Mutation demonstrations (Rule 19 — each applied to the shipped source, observed red on the named pinning test, reverted, and sha256-verified byte-identical to the pre-mutation file every round; the batch suites and boot-qa re-ran green after the reverts):**
- AC4 (seed law) mutation: `seedPreset()` ternary replaced with `return PRESET_SEED_DEFAULT;` in core/settings.ts -> core/settings.test.ts "first visit, reduced motion" (with the seed legs, 4 fails) went red. Reverted.
- AC5 (codec clamps) mutation: both bound lines dropped from `clampNum` -> core/settings.test.ts corrupt-store and commit-clamp pins went red (2 fails). Reverted.
- AC1 (row census) mutation: `data-row` "sensitivity" renamed "sens" on the sensitivity row in core/settings-ui.ts -> core/settings-ui.test.ts row-census pin went red. Reverted.
- AC6 (WCAG 24px target) mutation: `input.style.height = SETTINGS_HIT_TARGET;` dropped from `slider()` -> core/settings-ui.test.ts "WCAG structure: every control carries the 24px target literal..." went red (undefined !== '24px'). Reverted.
- AC7 (never navigates) mutation: `location.reload();` planted in `mountSettingsPanel` -> core/no-ui-dom.test.ts "2.4 settings-ui.ts's DOM surface is exactly the pinned allowlist..." went red. Reverted.
- AC2 (one master gain leg) mutation: `masterNode.connect(graph.destination);` dropped in core/audio/manager.ts -> core/audio/manager.test.ts "...exactly one looping chain each..." connect-log pin went red (8 !== 9 legs; master-gain legs too). Reverted.
- AC2 (effective bob scalar) mutation: hold branch `state.bobAmp = bobAmplitude;` -> `state.bobAmp = BOB_AMPLITUDE;` in core/player.ts -> core/player.test.ts "Story 2.4 effective bob..." went red (0.04 !== 0). Reverted.
- AC2 (focus strength) mutation: `focusMultiplierFor` duck branch hardcoded to `FOCUS_DUCK` (strength ignored) in core/audio/mix.ts -> core/audio/mix.test.ts "Story 2.4 focus-strength input..." strength-0 leg went red (0.0625 !== 1) while every 2.2 identity pin stayed green. Reverted.
- AC7 (walk-out detector) mutation: the open-branch crossing test dropped from the "exit" system in core/main.ts -> core/main-boot-qa.test.ts walk-out, crossing-back/re-entry, and #settings-at-load pins went red. Reverted. (Re-demonstrated post-review-patch — the same three legs stay red against the patched detector.)
- AC2 (calm tempo wrap) mutation: the wrap made unconditional (`stepCabinetPhase(cabinets, 1)` every tick) -> core/main-boot-qa.test.ts "the calm row wraps the shipped tempo call site" went red, sole red; re-demonstrated after the pin began reading the window delta through the phase-cycle wrap (`CABINET_PHASE_CYCLE_TICKS`) — the red value is then unambiguous at any phase offset (8 !== 4; the pre-wrap demo read -232 !== 4). Reverted.
- AC5 (accommodations never fork) mutation: a `calmGate` tick-skip facade added to `attachGameEntries` (core/containment.ts — delegate wrapper skipping `tick()` on even loop ticks while calm) wired from core/main.ts off `settings.rows().calmCabinets` -> core/main-boot-qa.test.ts "accommodations never fork a run" stateHash-identity pin went red, sole red (sample 0 diverged). Reverted. (A seed-gated variant is NOT a sufficient falsifier here — boot-3's store already reads calm=true at attach; the facade proves the pin binds the TICK-TIME settings read.)

Review-pass mutation rounds (same law: apply -> observe red on the named pin -> revert -> sha256-verify byte-identical to the pre-mutation file; batches and boot-qa re-ran green after every revert):

- AC4 (never re-seed) mutation: construction changed to ignore the stored payload (`current = defaults(seedPreset())`) in core/settings.ts -> core/settings.test.ts "return visit: stored rows ride verbatim..." went red (seed-forcing also reddened the corrupt-store/reset legs). Reverted.
- AC5 (port-throw degrade) mutation: the try/catch dropped from `read()` in core/settings.ts -> core/settings.test.ts "port throws (no localStorage)..." went red, sole red (the throw escaped the service). Reverted.
- AC5 (reset clears by marker) mutation: `write("");` dropped from `reset()` -> core/settings.test.ts "reset: the stored key is cleared..." went red, sole red. Reverted.
- AC5 (binding-collision rejection, review law) mutation: the collision guard deleted from `commit()` -> core/settings.test.ts "commit rejects a binding collision..." went red, sole red (the colliding table landed). Reverted.
- AC2 (look-channel gate at the unit tier) mutation: `const lookOn = lookEnabled();` -> `= true;` in core/input/index.ts -> core/input/input.test.ts "lookEnabled false gates the LOOK channel..." went red, sole red. Reverted.
- AC2 (zero-amplitude instant settle, review law) mutation: the `bobAmplitude <= 0` leg dropped from the bob block in core/player.ts -> core/player.test.ts "Story 2.4 effective bob..." stillness leg went red (the eye stayed bob-offset: scaled-to-zero decay decays by zero). Reverted.
- AC2 (FOV feeds CONSTRUCTION) mutation: `fov(settings.rows())` -> `60` in the PerspectiveCamera construction in core/main.ts -> core/main-boot-qa.test.ts #settings-at-load pin went red on the shim's recorded `ctorFov` (constructor-argument arm — the boot applyRows cannot satisfy it), and core/main-glue.test.ts's boot-block text pin went red. Reverted.
- AC2 (aim-multiplier live getter) mutation: `aimMultiplier: () => aimMultiplier(settings.rows())` -> `() => 1` in core/main.ts -> core/main-boot-qa.test.ts "rows ride LIVE getters..." (the sensitivity-2x leg) went red, sole red. Reverted.
- AC2/AC7 (the page owns the keyboard, review law) mutation: the `lookEnabled: () => !exitViewOpen` wiring deleted from the input tuning in core/main.ts -> core/main-boot-qa.test.ts walk-out pin went red (the gate leg: a held arrow + stray drag turned the camera while the panel was up; the movement-live leg stayed true). Reverted.
- AC6 (preset-label real border, review law) mutation: `lab.style.borderStyle/borderWidth` dropped in core/settings-ui.ts -> core/settings-ui.test.ts "preset segment..." went red, sole red (the borderColor cue inert on border-style:none). Reverted.
- AC6/AC1 (fixed-overlay panel law, review law) mutation: the root's `position/left/top/maxHeight/overflowY` writes dropped -> core/settings-ui.test.ts "WCAG structure..." AND core/no-ui-dom.test.ts allowlist leg (style-write count 97) both went red. Reverted.
- AC1 (no banter node) mutation: a `p` "Welcome back, traveller." planted in `mountSettingsPanel` -> core/no-ui-dom.test.ts allowlist leg went red (createElement census p 2->3, textContent writes 25->26). Reverted. (The settings-ui.test.ts tree pins stayed green — the census scan is the named pinning layer for planted nodes.)
- AC1 (token home: no hex) mutation: `sub.style.color = toCss(UI_MUTED)` -> `"#8a8fa3"` -> core/settings-ui.test.ts "colour home: settings-ui.ts carries ZERO hex literals..." went red, sole red. Reverted.
- AC6 (aria-checked law) mutation: the switch paint `aria-checked` -> constant `"true"` -> core/settings-ui.test.ts "switch rows: role=switch starts aria-checked=false..." went red (the reset-repaint leg too). Reverted.
- AC7 (close arm gated on an actual crossing, review law) mutation: `openedByCrossing &&` dropped from the close condition -> core/main-boot-qa.test.ts #settings-at-load pin went red, sole red (the spawn pose inside the door tick-closed the deep-linked panel — BH-1's law). Reverted. (Companion note, honest scope: the `entry.phase() !== "control"` guard line in the same system is DEFENSIVE — deleting it alone read GREEN at the boot tier, because the entry dolly is view-side and never moves the player pose the detector reads; that line is text-tier-pinned by main-glue, and the boot tier falsifies the never-auto-close LAW through the openedByCrossing arm instead.)
- AC7 (pending capture is page-scoped, review law) mutation: the `pendingCapture()` call dropped from `closeExitView` in core/main.ts -> core/main-boot-qa.test.ts crossing-back/re-entry pin went red, sole red (the stale keydown listener bound KeyZ to forward after the panel closed). Reverted.
- AC2/AC6 (vignette gradient law bound to the mount) mutation: `overlay.style.background = vignetteGradient()` swapped for an inline near-miss gradient inside `mountVignetteOverlay` while the exported law stays correct -> core/settings-ui.test.ts vignette pin went red, sole red (the VG-2 rework: the old self-compare `vignetteGradient() === vignetteGradient()` could never redden — that mutation read GREEN against it). Reverted.

## Auto Run Result

Status: done
Blocking condition: none

**Implemented.** Story 2.4 ships as specified: `core/settings.ts` (row schema, `arcade.settings.v1` codec with per-key validation/clamps, first-visit seed law, pure resolvers, storage.ts degrade idiom over the injected StoragePort), `core/settings-ui.ts` (full panel over the injected-doc slice + zero-text vignette overlay, census/count pins in `core/no-ui-dom.test.ts`), eager settings boot in `core/main.ts` with every consumer riding a live getter (binding table, look source, look gate, aim multiplier, focus strength, master gain, FOV-at-construction and live), master GainNode in `core/audio/manager.ts`, strength-aware `focusMultiplierFor` in `core/audio/mix.ts` (byte-identical at strength 100), `player.step(dt, view, bobAmplitude?)`, the calm-tempo wrap at the `stepCabinetPhase(cabinets, 1)` call site, `door-front.blocksMovement: false` + the pose dead-band crossing detector + the `#settings` deep link, and the extended executable boot tier (three boots, stateHash identity over 120 age-aligned samples).

**Review pass (one iteration, four context-free layers, 30 findings — full rows in the Review Triage Log).** Verdicts: 1 high, 11 medium, 11 low, 7 false. Seven root-cause code fixes applied: panel became a fixed scrollable overlay (BH-2 high — it was invisible on the real page; also resolves the vignette stacking BH-8); close arm gated on an actual outward crossing (`openedByCrossing`) so the deep-link panel survives entry->control (BH-1/EH-2/intent#4); page-scoped rebind capture with cancel-on-close (BH-3/EH-1); commit-side binding-collision rejection (BH-7/EH-4); `lookEnabled` look-channel gate while the panel is up (BH-5); real 2px border on preset labels (BH-4); instant settle at zero bob amplitude (EH-3); `DEFAULT_BINDING_TABLE` derived from the settings.ts home (BH-10). Test tier hardened with it: boot-qa shim `removeEventListener` + constructor-frozen `ctorFov`, survival/cancel/gate/arrows boot legs, unit pins for every new law, the VG-2 tautology replaced by a live pin. Two defers added to frontmatter (focus-mix boot composition hop, medium; boot-narrative coupling, low). VG-o2 AC mislabels fixed as the logged authoring change. Rejections stand with their recorded reasons in the log.

**Product-default decisions (unattended authority: within spec intent, reversible, no owner-only category, contradicting no AD or owner-fixed value).** (1) The settings page owns the keyboard: arrows/drags are gated while the panel is up, MOVEMENT stays live (the walk-back close law, AC7). (2) A commit binding two movement verbs to one code is ignored; KeyE/arrow codes as movement verbs stay allowed — Interact is never tabled, and arrows double-duty is the visitor's own choice; a corrupt STORE still merges per key. (3) The open trigger is the street edge (6.5) with the door volume as dead-band — Code Map crossing law, not the matrix's "past inner face" phrasing. (4) Reset clears by writing the empty marker under the same key (`StoragePort` has no removeItem — verified). (5) The port-throw degrade leg runs in the pure tier (boot-qa stubs a working store); (6) the boot tier keeps its shared-narrative idiom (deferred item 4). (7) Pressing a movement key while rebinding walks — accepted consequence of decision 1's movement-live half.

**Verification performed.** All loop commands green after the patches (`typecheck`; the three node --test batches; depcheck; lint-bans; gen-registry drift). Once-commands: `npm test` 522/522 green; `npm run build` clean (the 500 kB chunk notice is pre-existing informational). Rule 19: 27 total mutation demonstrations (11 initial + 16 review-pass rounds) — each applied to shipped source, observed red on the named pinning test, reverted, sha256-verified byte-identical to the pre-mutation file; batches and boot-qa re-ran green after every revert group. Boot tier executes: 9/9 -> boot legs added, still 9/9.

**Followup review recommended: true.** Named unverified risks: (a) the high-severity panel-visibility fix is pinned only at the style-literal + fake-DOM boot tier — real-page layout, scroll behavior, and vignette/panel stacking stand with the browser tier (frontmatter deferred item 1); (b) the focus-strength row's shipped-composition hop rides injected-getter unit tiers plus a text pin (deferred item 3). Residual: comfort numbers provisional (item 2), boot-narrative coupling (item 4), WCAG computed hit-targets by-eye.

**Scope hygiene.** 25 files: the four new core files (`settings.ts`, `settings.test.ts`, `settings-ui.ts`, `settings-ui.test.ts`), `core/main.ts`, `core/input/index.ts`, `core/player.ts`, `core/audio/{manager,mix}.ts`, `core/room/{collision-volumes,door,tokens}.ts`, `core/storage.ts`, the moved-pin families (`main-glue`, `main-boot-qa`, `main-boot-three-shim.mjs`, `no-ui-dom`, `player`, `input`, `settings`-adjacent audio/room tests), and this spec artifact. No `games/`, `generated/`, ledger, scheduler, patrons, or `index.html` change; the only volume-list edit stays the single `door-front.blocksMovement` bit (DW-29 posture); no new deps; nothing pushed — the commit is local on `ARC-1-epic2`; the untracked `_bmad-output/planning-artifacts/sprint-status.yaml` stray was left untouched and uncommitted.
