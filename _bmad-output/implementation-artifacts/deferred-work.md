# Deferred Work Ledger

See _bmad/custom/skill-rules.md Rule 15 (entry grammar) and Rule 17 (the drain).

### DW-1: ci/lint-bans depth evasion: Math["random"], destructured Math, new Date()/Date() pass the sim-path ban gate
- source: _bmad-output/implementation-artifacts/spec-1-1-project-bootstrap-and-the-deterministic-kernel-core.md | severity: med | fix-risk: med | footprint: ci/
- evidence: review G2/edge-6; extension-set half patched; full L0 gate lands Epic 3 (3.1/3.2)
- 2026-11-21T12:01:42Z status=routed owner=burndown by=harvest note=depth forms deferred to the Epic 3 L0 gate
- 2026-11-21T23:06:38Z occurrence=1-1-project-bootstrap-and-the-deterministic-kernel-core by=cr note=Math["random"], Math?.random and new Date() re-sighted in ci/lint-bans self-test probe
- 2026-11-25T10:56:57Z owner=1-10-epic-1-burn-down by=burndown note=chartered_into_Story_1.10_closes_now_in-Epic-1-footprint
- 2026-11-26T00:37:19Z status=resolved-by:1-10-epic-1-burn-down by=adjudication note=bracket/optional-chain/destructure/bare-wallclock forms red in ci/lint-bans.test.ts(12/12);lead Layer-1 bracket-leg-kill mutation red;real repo green incl sanctioned helpers.js:15

### DW-2: core/main.ts boot: a throwing createSim factory is unguarded - one faulty game kills the whole room at page load (AD-15)
- source: _bmad-output/implementation-artifacts/spec-1-1-project-bootstrap-and-the-deterministic-kernel-core.md | severity: med | fix-risk: low | footprint: core/
- evidence: review G12/blind-2,edge-16; needs supervisor-wrapped per-instance boot
- 2026-11-21T12:01:42Z status=routed owner=1-7-fault-containment-a-broken-game-never-kills-the-room by=harvest note=containment seam belongs to 1.7
- 2026-11-23T23:39:01Z occurrence=1-5-moon-patrol-plays-in-place-vendored-wrapped-alive by=cr note=frame() re-armed rAF only after renderer.render, so a throwing game draw (pres.drawFrame/compositeScreen) killed the render chain permanently; instance patched in-story (rAF re-armed first, main-glue order pin, probe M-cr3 red then reverted); fault-containment root cause stays routed to 1-7
- 2026-11-24T14:51:16Z status=resolved-by:1-7-fault-containment-a-broken-game-never-kills-the-room by=lead note=boot guard shipped in 1-7 attachGameEntries (hook boot): broken sim factory registers NOTHING, broken presentation keeps the sim ticking AND marks faultedFor (CR HIGH patch; mutation 1.7p is the discriminator); lead L1 leg D executed on real stack

### DW-3: unbounded growth in long-lived processes: supervisor.faults uncapped (60/s from a broken sim); loop.eventQueue never drained once games register
- source: _bmad-output/implementation-artifacts/spec-1-1-project-bootstrap-and-the-deterministic-kernel-core.md | severity: med | fix-risk: low | footprint: core/
- evidence: review G13/blind-5; drains exist once 1.5 registers a game
- 2026-11-21T12:01:43Z status=routed owner=1-7-fault-containment-a-broken-game-never-kills-the-room by=harvest note=cap/dedup is containment policy
- 2026-11-21T23:06:38Z occurrence=1-1-project-bootstrap-and-the-deterministic-kernel-core by=cr note=supervisor.faults cap and per-tick eventQueue drain re-sighted by CR layers
- 2026-11-24T14:51:17Z status=resolved-by:1-7-fault-containment-a-broken-game-never-kills-the-room by=lead note=ring cap 64 + droppedFaults counted + gap-free deterministic errorIds pinned; quarantine short-circuits the guard tick so a broken sim stops being hammered 60x/s; lead L1 leg E (70 faults -> 64 kept, 6 dropped); AD-26 sealing stays Epic-3

### DW-4: AGENTS.md Running-and-verifying section ("No commands exist yet") is stale once story 1.1 lands; agent instruction files are owner-only unattended
- source: _bmad-output/implementation-artifacts/spec-1-1-project-bootstrap-and-the-deterministic-kernel-core.md | severity: med | fix-risk: low | footprint: docs/
- evidence: review G17/blind-9; refresh via owning skill with package.json scripts
- 2026-11-21T12:01:43Z status=escalated owner=burndown by=harvest note=owner_only category - to decision sheet
- 2026-11-21T23:25:19Z status=resolved-by:1-1-project-bootstrap-and-the-deterministic-kernel-core by=owner note=AGENTS-refreshed-in-session-2026-11-21

### DW-5: tools/gen-registry.mjs does not validate simPath points under games/<id>/sim/ - AD-1 direction unenforced at the build step
- source: _bmad-output/implementation-artifacts/spec-1-1-project-bootstrap-and-the-deterministic-kernel-core.md | severity: med | fix-risk: low | footprint: tools/
- evidence: review G26/edge-20; manifest + L0 land Epic 3
- 2026-11-21T12:01:43Z status=routed owner=burndown by=harvest note=
- 2026-11-25T10:56:58Z owner=1-10-epic-1-burn-down by=burndown note=chartered_into_Story_1.10_low_fix-risk_build-step_validation
- 2026-11-26T00:37:19Z status=resolved-by:1-10-epic-1-burn-down by=adjudication note=simPath law in gen-registry.mjs:64-67;bad-path+traversal+directory expectFailure pins;shipped list byte-identical drift;Layer-1 simHome-always-ok mutation red

### DW-6: matrix Out-of-tick-write row has no composable fault-chain test surface (gate throws to caller; supervisor wraps kernel sites - two disjoint surfaces)
- source: _bmad-output/implementation-artifacts/spec-1-1-project-bootstrap-and-the-deterministic-kernel-core.md | severity: med | fix-risk: med | footprint: core/contract/
- evidence: review G27/edge-21,edge-23,intent-1; composition deferred with 1.7
- 2026-11-21T12:01:43Z status=routed owner=1-7-fault-containment-a-broken-game-never-kills-the-room by=harvest note=
- 2026-11-24T14:51:17Z status=resolved-by:1-7-fault-containment-a-broken-game-never-kills-the-room by=lead note=composable fault-chain surface now exists: QA composed scheduler dwell-launch through boot-seam guard into throwing autoplay (one record, lift next dispatch, no relaunch 480 ticks) + writeInEvents fixture drives the gate TypeError inside the real chain

### DW-7: cross-engine determinism (browser kernel === Node CI stateHashes) never exercised on two engines; construction property only
- source: _bmad-output/implementation-artifacts/spec-1-1-project-bootstrap-and-the-deterministic-kernel-core.md | severity: med | fix-risk: med | footprint: epics-3-replay/
- evidence: review G31/intent-4; tools/replay (Epic 3) provides the surface
- 2026-11-21T12:01:43Z status=routed owner=burndown by=harvest note=
- 2026-11-25T10:56:59Z owner=3-12-replay-headless-and-in-room-on-the-same-harness by=burndown note=cross-engine_proof_needs_replay_surface_that_lands_in_3.12;bullet_written_in_epics.md

### DW-8: ci/lint-bans ban set covers only the 9 spine-named transcendentals: ECMA implementation-approximated Math fns (atan, log2, log10, hypot, cbrt, expm1, log1p, sinh/cosh/tanh family) and the ** operator pass the sim gate
- source: _bmad-output/implementation-artifacts/spec-1-1-project-bootstrap-and-the-deterministic-kernel-core.md | severity: med | fix-risk: med | footprint: ci/
- evidence: CR re-spawn 3 blind+edge layers; AD-4 names exactly sin/cos/tan/asin/acos/atan2/pow/exp/log; widening the ban set changes AD-4 scope
- 2026-11-21T23:06:38Z status=escalated owner=burndown by=cr note=AD-4-scope amendment is owner-only (architecture amendment) - to decision sheet; decide before the Epic 3 L0 gate locks the rule surface
- 2026-11-26T02:35:46Z status=decision-pending owner=burndown by=unattended note=inbox=U-3

### DW-9: core/contract/math.ts fixed coefficients have documented exactness boundaries: sin/cos argument reduction exact to |x|~1e15, atan2 signed-zero branch parity not promised - goldens pin this module's own outputs
- source: _bmad-output/implementation-artifacts/spec-1-1-project-bootstrap-and-the-deterministic-kernel-core.md | severity: low | fix-risk: low | footprint: core/contract/
- evidence: CR edge layer; boundaries now stated in the math.ts header comment
- 2026-11-21T23:06:38Z status=wontfix-theoretical owner=1-1-project-bootstrap-and-the-deterministic-kernel-core by=cr note=reachable cabinet math sits far inside the boundary; cross-engine equality is DW-7's surface

### DW-10: ci/depcheck scans literal import/export specifiers only: computed or variable specifiers bypass the AD-1 import-direction gate
- source: _bmad-output/implementation-artifacts/spec-1-1-project-bootstrap-and-the-deterministic-kernel-core.md | severity: low | fix-risk: med | footprint: ci/
- evidence: CR edge layer; depcheck reads static specifier strings, no module graph
- 2026-11-21T23:06:39Z status=wontfix-accepted owner=1-1-project-bootstrap-and-the-deterministic-kernel-core by=cr note=sufficient while core/ is hand-written small; reopen_if=a non-literal import appears in core/ or games/ before the Epic 3 L0 static analyzer exists

### DW-11: in-view half of the no-UI law unpinned: a camera-parented mesh (crosshair/HUD) added in core/main.ts keeps the suite green; DOM half pinned only
- source: story 1.2 implement; spec-1-2 frontmatter deferred (medium) | severity: medium | fix-risk: medium | footprint: test+CI
- evidence: verification-gap demo in spec-1-2 deferred.evidence: crosshair mesh in core/main.ts scene assembly -> npm test stays green; core/no-ui-dom.test.ts pins the DOM half
- 2026-11-22T03:30:17Z status=routed owner=burndown by=harvest note=routed from spec-1-2 deferred 2026-11-22; Epic 3 owns the machine lint (3.1/3.2 L0, 3.7 L2 audit) - route-to-story or own at the Epic 1 burn-down gate; also fixes the AC5 numbering drift (epics AC5 folded into spec AC1 bullet)
- 2026-11-22T06:53:55Z occurrence=1-2-first-person-walk-look-and-move-no-prompts
- 2026-11-25T10:56:58Z owner=1-10-epic-1-burn-down by=burndown note=chartered_into_Story_1.10_in-view_no-UI_law_pin_test_closes_now_no_new_dep
- 2026-11-26T00:37:20Z status=resolved-by:1-10-epic-1-burn-down by=adjudication note=in-view law pinned: segment allowlist+camera.add/attach ban+recursive camera-blind leg;Layer-1 planted camera.add at main.ts:121 red (main.ts byte-identical after);QA forms coverage;DW-41 by-design records the strip-hoist deviation

### DW-12: core/main.ts glue has no executed test host: addSystem takeView wiring, device listeners, silent-denial path pinned only by source-text and dev-serve text asserts
- source: _bmad-output/implementation-artifacts/spec-1-2-first-person-walk-look-and-move-no-prompts.md | severity: med | fix-risk: high | footprint: in-story
- evidence: verification-gap demo: hoisting input.takeView() out of the addSystem callback -> page cannot walk/look; npm test stays 113/113; no test imports or executes core/main.ts
- 2026-11-22T06:53:54Z status=routed owner=burndown by=cr note=browser harness = new dep, Epic 3 scope; lead Chrome+Edge smoke is the Epic 1 gate; distinct from DW-11 in-view half
- 2026-11-23T11:12:59Z occurrence=1-4-the-standard-stand-up-cabinet-shell-marquee-live-screen
- 2026-11-23T23:39:02Z occurrence=1-5-moon-patrol-plays-in-place-vendored-wrapped-alive by=cr note=seat/wrapper and the new draw-chain legs stay pinned by source-text asserts + dev-serve text only (acceptance-auditor A3/A1); executed-host tier still open
- 2026-11-24T06:44:33Z occurrence=1-6-one-busy-machine-a-patron-actually-plays
- 2026-11-24T14:40:31Z occurrence=1-7-fault-containment-a-broken-game-never-kills-the-room
- 2026-11-25T10:56:59Z owner=3-2-the-gate-goes-deterministic-l0-l1-scripts-contract-test-skil by=burndown note=browser-harness_tier_is_planned_Epic_3_scope_executed-host_tests_need_it;bullet_in_epics.md_3.2

### DW-13: requestPointerLock synchronous throw escapes the promise catch, logging to console and breaking AC3 silent denial; no target engine throws synchronously
- source: _bmad-output/implementation-artifacts/spec-1-2-first-person-walk-look-and-move-no-prompts.md | severity: low | fix-risk: low | footprint: in-story
- evidence: main.ts wraps the call in Promise.resolve(...).catch(() => {}); a sync throw would bypass it; AD-17 targets (Chrome/Edge) return promise/undefined
- 2026-11-22T06:53:55Z status=wontfix-theoretical owner=1-2-first-person-walk-look-and-move-no-prompts by=cr note=makes it real: an AD-17 target engine throwing synchronously from requestPointerLock

### DW-14: dev-serve pins hold strict ports 4641 (no-ui-dom) and 4639 (app-serve): a port busy on a shared machine turns the suite red
- source: _bmad-output/implementation-artifacts/spec-1-2-first-person-walk-look-and-move-no-prompts.md | severity: low | fix-risk: med | footprint: in-story
- evidence: two strictPort dev-serve tests; external port use fails them independent of code
- 2026-11-22T06:53:55Z status=wontfix-accepted owner=1-2-first-person-walk-look-and-move-no-prompts by=cr note=reopen_if=EADDRINUSE/port-collision red observed in a suite run; Epic 3 CI needs ephemeral port or lock

### DW-15: main.ts real-THREE adapter executed coverage (browser harness tier)
- source: story 1.3 implement deferred: | severity: low | fix-risk: med | footprint: cross-cutting
- evidence: spec-1-3 frontmatter deferred: + core/main-glue.test.ts source-pin tier added in review pass 1
- 2026-11-22T11:32:43Z status=routed owner=burndown by=harvest note=DW-12 tier; Epic 3 browser harness (3.2/3.15) closes it
- 2026-11-23T23:39:02Z occurrence=1-5-moon-patrol-plays-in-place-vendored-wrapped-alive by=cr note=the 1.5 drawFrame/compositeScreen chain adds real-THREE legs with no executed browser coverage; source-pin tier until the Epic-3 browser harness
- 2026-11-24T06:44:33Z occurrence=1-6-one-busy-machine-a-patron-actually-plays
- 2026-11-25T10:56:59Z owner=3-2-the-gate-goes-deterministic-l0-l1-scripts-contract-test-skil by=burndown note=same_browser-harness_tier_as_DW-12;bullet_in_epics.md_3.2

### DW-16: Front wall open above the door head: no lintel volume over the door gap (visible see-through band y 2.1-3.0 when looking up at the door; 13cm recess behind the panel)
- source: spec-1-3-the-arcade-room-slots-pillars-zones-and-the-roadmap-wall.md | severity: med | fix-risk: med | footprint: in-story
- evidence: wall-front segments exclude the gap x entirely; door-front covers only y 0..2.1 z 6.25..6.37 - the spec's I/O matrix row authors exactly this volume set; all AC1 pins are 2D XZ so Y gaps cannot go red
- 2026-11-22T13:41:43Z status=by-design owner=1-3-the-arcade-room-slots-pillars-zones-and-the-roadmap-wall by=cr note=spec-bound: matrix row + Design Notes 6 name the shape; reopen if the lead's door-front smoke sees the band -> spec amendment (lintel volume or taller door)

### DW-17: AmbientLight coloured with the Room Black SURFACE token is a near-no-op fill (0x15110E x 0.15 ~ 4% luminance low-intensity): the pin cements an inert light
- source: spec-1-3-the-arcade-room-slots-pillars-zones-and-the-roadmap-wall.md | severity: low | fix-risk: low | footprint: in-story
- evidence: DESIGN.md treats Room Black as ceiling/clear-colour surface token; scene.test + scene-qa pin colour ROOM_BLACK and intensity <= 0.2; the fill the light nominally provides is ~0.6% luminance
- 2026-11-22T13:41:54Z status=by-design owner=1-3-the-arcade-room-slots-pillars-zones-and-the-roadmap-wall by=cr note=spec-bound: Design Notes item 7 authors this exact value, 'tuned by eye at the smoke'; reopen at the lead's 6m smoke if unlit faces read too dark
- 2026-11-23T01:55:41Z status=routed owner=1-3-the-arcade-room-slots-pillars-zones-and-the-roadmap-wall by=smoke note=reopened at lead 6m smoke iter2: unlit faces read near-black at all six vantages; owner present 'it's very dark in there, probably going to need a little more light'
- 2026-11-23T04:28:12Z status=resolved-by:1-3-the-arcade-room-slots-pillars-zones-and-the-roadmap-wall by=lead note=rework pass 2 candela-scale retune (zone/amber 150/reach16, ambient 0.6 token, glow 15/8) + strengthened pins; cr-3 four layers re-verified green at HEAD; lead mutations red->byte-identical (floor-breach, built-desync, emissive); 6m visual proof=story's own re-smoke iter 3 before commit; red re-smoke re-opens DW-17 in-story

### DW-18: tests/test-summary.md flyer-probe descriptions stale after story 1.3 rework pass 1 (paintFlyer wrap+measureText fit law, sheet widened 0.40x0.60)
- source: spec-1-3-the-arcade-room-slots-pillars-zones-and-the-roadmap-wall.md | severity: low | fix-risk: low | footprint: in-story
- evidence: spec frontmatter deferred bullet 2; stale lines 23/31 describe pre-rework paintFlyer pins
- 2026-11-22T16:30:58Z status=routed owner=1-3-the-arcade-room-slots-pillars-zones-and-the-roadmap-wall by=harvest note=QA regenerates the artifact on its next pass; implement stage never hand-edits it
- 2026-11-22T18:45:03Z status=routed owner=1-3-the-arcade-room-slots-pillars-zones-and-the-roadmap-wall by=cr note=23/31 already refreshed by rework commit; residual: header baseline, stale 155 count, room-qa containment misattribution
- 2026-11-23T01:47:21Z status=resolved-by:1-3-the-arcade-room-slots-pillars-zones-and-the-roadmap-wall by=lead note=test-summary.md refreshed at adjudication: header baseline 438b840..HEAD, 157/157 counts, cr-2 patch note, containment pin re-attributed to surfaces.test.ts; spec deferred bullet 2 reconciled

### DW-19: fake 0.92em measureText metric duplicated across room-qa/scene/scene-qa fakes; surfaces.test.ts holds the helper
- source: spec-1-3-the-arcade-room-slots-pillars-zones-and-the-roadmap-wall.md | severity: low | fix-risk: low | footprint: in-story
- evidence: 4 test fakes carry the identical metric body; review pass 3 had to edit all four at once - drift risk on the next metric change
- 2026-11-22T18:45:08Z status=wontfix-accepted owner=1-3-the-arcade-room-slots-pillars-zones-and-the-roadmap-wall by=cr note=reopen_if=next pass that must change the fake metric meets the 4 copies first; extract a shared test-support helper then

### DW-20: stray untracked _bmad-output/planning-artifacts/sprint-status.yaml is a stale duplicate of the tracked canonical implementation-artifacts copy
- source: spec-1-3-the-arcade-room-slots-pillars-zones-and-the-roadmap-wall.md | severity: low | fix-risk: low | footprint: out-of-footprint
- evidence: the stray copy (generated 11-22 20:30) lists epic-1/1-1/1-2 backlog + 1-3 review while the tracked canonical impl copy holds in-progress/done/done + 1-3; nothing in the test path reads the planning copy; it entered the cr-3 diff only via the untracked-files rule
- 2026-11-23T04:22:41Z status=wontfix-accepted owner=1-3-the-arcade-room-slots-pillars-zones-and-the-roadmap-wall by=cr note=reopen_if=the file gets committed, or an argument-less /bmad-code-review Tier-3 scan or sprint view reads the planning-artifacts copy; the fix then is the sprint-planning skill regenerating it (AGENTS.md bars hand-editing _bmad-output artifacts) - the canonical impl-side file is synced by the epic-cycle stage tool (cr-3 set 1-3=done there)

### DW-21: cabinet screen zone strings (attract|score|next) are a text family outside AD-24's four print stocks - the Epic-3 character lint must treat Core-owned game screens as a separate family
- source: spec-1-4-the-standard-stand-up-cabinet-shell-marquee-live-screen.md | severity: low | fix-risk: low | footprint: in-footprint
- evidence: spec 1.4 Design Notes AD-24 boundary note: screen zone kinds declared in core/room/cabinets.ts; DESIGN lists the screen as a surface treatment outside the four paper stocks; no spine amendment claimed by 1.4
- 2026-11-23T05:39:33Z status=routed owner=3-5-instruction-cards-from-the-manifest-and-the-character-lint by=lead note=adjudicate at 3.5's plan: extend the lint family taxonomy or amend AD-24 (U7 bounds); marquee kind already declared in the signage.ts whitelist home

### DW-22: drawScreen score-rows branch unreachable until a score zone has rows (1.4 shipped an honestly-empty score zone; the branch paints rows but no authored data reaches it)
- source: spec-1-4-the-standard-stand-up-cabinet-shell-marquee-live-screen | severity: low | fix-risk: low | footprint: in-story
- evidence: surfaces.ts drawScreen score loop never entered: p.screenZones.score === [] pinned by cabinets.test.ts:68; no user-reachable failure today
- 2026-11-23T11:12:59Z status=wontfix-theoretical owner=1-4-the-standard-stand-up-cabinet-shell-marquee-live-screen by=cr note=reopen_if=score zone gets its first row (1.8); pin the row layout + NEXT/score collision then

### DW-23: exposure-law ceiling/floor assume three's NoToneMapping + default decay=2; no pin observes them — a tone-mapping change greens CI while invalidating the bound
- source: spec-1-4-the-standard-stand-up-cabinet-shell-marquee-live-screen.md | severity: low | fix-risk: low | footprint: in-story
- evidence: grep: main.ts builds the WebGLRenderer with no toneMapping anywhere; the 2/0.5 bounds encode inverse-square+linear semantics (three decay=2); a tone-map change re-derives them with the suite green — spec residual risks already label this
- 2026-11-23T14:03:41Z status=wontfix-theoretical owner=1-4-the-standard-stand-up-cabinet-shell-marquee-live-screen by=cr note=reopen_if: tone mapping lands in main.ts or the exposure constants move under a non-linear tone curve
- 2026-11-26T06:12:28Z status=routed owner=2-0-epic-1-deferred-cleanup by=correct-course note=reopen_if FIRED - ACES tone mapping lands in main.ts under Story 2.0; exposure bounds 2/0.5 and CABINET_LIGHT_INTENSITY/REACH re-derived under the tone curve and re-pinned

### DW-24: mouse-look: mousing far left/right makes the view become the floor (camera flips/slams to floor at extreme yaw after big horizontal drags)
- source: owner report 2026-11-23 (mid-run, story 1.5 in plan) | severity: minor | fix-risk: small | footprint: core/player.ts look math / camera basis (yaw wrap, pitch clamp)
- evidence: Owner-observed while using the game: after dragging the mouse far left or right the view becomes the floor. Repro not yet confirmed by the lead; smoke drags never exceeded ~2.5 rad so the path is untested.
- 2026-11-23T14:51:13Z status=routed owner=burndown by=owner note=owner said: do not fix now; address in the next pass over the backlog
- 2026-11-25T10:57:00Z status=decision-pending owner=burndown by=burndown note=to_x0:schedule_the_mouse-look_yaw-wrap/pitch-clamp_pass_at_Epic-2_X.0_per_owner_ruling_2026-11-23_do-not-fix-during-stories
- 2026-11-26T03:01:24Z status=routed owner=2-0-epic-1-deferred-cleanup by=x0 note=default-include: minor + small fix-risk; owner ruling 2026-11-23 (do-not-fix-during-stories) now applied - this is the next-pass-over-backlog; repro beyond smoke-tested ~2.5 rad drags

### DW-25: Moon Patrol respawn pad-clear filter never removes minefields (x/w vs x1/x2 NaN predicate) — buggy can respawn onto a mine
- source: story 1.5 implement review B3+E4 (shared root cause); spec-1-5 frontmatter deferred | severity: medium | fix-risk: small | footprint: games/moon-patrol/sim/world.js:106 respawn predicate; data shape sim/course.js:100; vendored law kept world.js unmodified below seam edits (AC1)
- evidence: Spec 1.5 Review Triage Log B3/E4: respawn() filters with (o.x + o.w > padL && o.x < padR); minefields carry x1/x2 -> NaN -> never filtered. Present in vendored source C:/git/moonpatrol@49c3519... Settle: fix predicate for x1/x2 kinds (upstream first, then re-vendor) + sim test that respawns a run with a minefield on the pad.
- 2026-11-23T20:25:26Z status=routed owner=1-6-one-busy-machine-a-patron-actually-plays by=dev note=1.6 drives the sim to a real end state via autoplay (AD-8 L1) — the respawn unfairness lands squarely in that path; fix upstream at C:/git/moonpatrol then re-vendor
- 2026-11-24T07:01:45Z status=routed owner=1-6-one-busy-machine-a-patron-actually-plays by=lead note=bundle_half_resolved_in_1-6_(x1/x2_predicate_re-vendored + pad-clear pin world_gameplay.test.js);upstream C:/git/moonpatrol commit is owner call — routed to epic-1 decision sheet;entry stays open pending upstream commit
- 2026-11-25T10:57:00Z status=escalated owner=burndown by=burndown note=bundle_half_resolved_in_1.6;remainder_is_the_upstream_C:/git/moonpatrol_commit_owner-only_to_epic-1_decision_sheet
- 2026-11-26T02:35:47Z status=decision-pending owner=burndown by=unattended note=inbox=U-5

### DW-26: the PROVISIONAL play(seed) seam flips the wrapper to mode play even for a sim that ships no play hook (kernel-side restart owns the start verb)
- source: spec-1-5-moon-patrol-plays-in-place-vendored-wrapped-alive.md | severity: low | fix-risk: low | footprint: in-story
- evidence: wrapper.ts play() calls sim.play?.(seed) then sets mode unconditionally (edge-hunter E1+E2, blind B2); DN 4 declares the seam provisional and the no-ui-dom test pins the PROVISIONAL marker at all three entry points
- 2026-11-23T23:39:50Z status=by-design owner=1-5-moon-patrol-plays-in-place-vendored-wrapped-alive by=cr note=spec-bound: DN 4 + AD-23's provisional occupation of the reserved play mode; AD-8 hook names untouched, no AD amendment; Epic 3 manifest/autoplay replaces the seam

### DW-27: vendored in-play HUD flashes run at ~5/s (fuel) and ~8/s (warning, invuln) while only the attract PRESS ENTER blink (2/s) meets the 3-per-s comfort ceiling
- source: spec-1-5-moon-patrol-plays-in-place-vendored-wrapped-alive.md | severity: low | fix-risk: med | footprint: games/moon-patrol/presentation/adapter.js play-HUD draw block
- evidence: acceptance-auditor A6: fuel floor(t*1000/200), warning /180, invuln /120; the ceiling the spec pins binds the attract blink; M0 wrap is explicitly temporary (CAP-5)
- 2026-11-23T23:40:42Z status=wontfix-accepted owner=1-5-moon-patrol-plays-in-place-vendored-wrapped-alive by=cr note=reopen_if=the lead's Chrome/Edge smoke or an L2 flashes-rate probe reports play-HUD flashes above 3/s as a comfort problem

### DW-28: the moon-patrol control legend lives in four carriers with no shared source: SEAT_KEYS in core/main.ts, the controls block in tools/registry-list.json, the drawn legend in adapter.js, the set-identity pin in adapter.test.js
- source: spec-1-5-moon-patrol-plays-in-place-vendored-wrapped-alive.md | severity: low | fix-risk: med | footprint: core/main.ts + tools/registry-list.json + games/moon-patrol/presentation/
- evidence: blind-hunter B8: the lists agree today (nine-key set-identity source pin keeps them honest); unification needs the Epic-3 Manifest to carry the legend (AD-12: manifest never hand-written)
- 2026-11-23T23:40:42Z status=wontfix-accepted owner=1-5-moon-patrol-plays-in-place-vendored-wrapped-alive by=cr note=reopen_if=Epic 3 registration lands a manifest legend carrier, or a key change lands in one carrier and the set-identity pin or the smoke legend check goes red

### DW-29: Cabinet shell reads as a vending machine, not an upright arcade cabinet: wants a real marquee box on top plus cabinet contours (shaped side panels, screen bezel/hood, control-deck silhouette)
- source: owner walkthrough of :5173 build, 2026-11-24 | severity: med | fix-risk: med | footprint: core
- evidence: owner verbatim: 'it looks like a vending machine now... hoping for something more like a real arcade cabinet, with a marquee on top and contours like a real cabinet'; current stand-up shell is a flat slab with a lit marquee band (1.4 geometry)
- 2026-11-24T14:24:52Z status=routed owner=burndown by=lead note=owner-initiated; NOT an AC miss for 1-4 (marquee-lit law met) - enhancement beyond current ACs; priority-rank at the Epic 1 burndown gate, candidate new story (visual polish) on the decision sheet; geometry lives in core/room/cabinets.ts + collision volumes + screen surface mapping
- 2026-11-25T10:56:58Z owner=1-10-epic-1-burn-down by=burndown note=chartered_into_Story_1.10_owner-prioritized_cabinet_realism_pass
- 2026-11-26T00:37:20Z status=resolved-by:1-10-epic-1-burn-down by=adjudication note=contours shipped (marquee box,deck,kick,hood,wings;SHELL_PART_MESHES 11);QA IS-value drift pins + VG-1 continuity pins falsify the byte-identical law (AABB/faces/canvases/lights);realism verdict adjudicates at the smoke immediately following - a failed smoke reopens through the rework loop
- 2026-11-26T06:13:05Z status=routed owner=2-0-epic-1-deferred-cleanup by=correct-course note=REOPENED per its 1-10 adjudication clause (proposal wrote status=reopened - rendered routed per ledger grammar): the owner-review hold (f900038/82270ad) is the smoke-equivalent realism adjudication promised; VERDICT FAIL - shell still reads vending-machine; owner-authored corrective task drives the rebuild; seated in Story 2.0 per owner ruling

### DW-30: boot identity uses crypto.randomUUID outside any supervisor: a runtime without Web Crypto (insecure-context http origin) throws at boot instead of degrading — settle with the deploy origin's scheme (droplet https vs plain http)
- source: 1-8-the-room-knows-you-without-an-account | severity: medium | fix-risk: low | footprint: core
- evidence: core/main.ts boot storage.visitorId() -> default uuidFn crypto.randomUUID; missing API throws before loop.start; spec DN9 verified-present for Node 26 + evergreen Chrome/Edge only; storage port degrade law does NOT cover this (the throw is at key generation, not storage access)
- 2026-11-24T19:59:30Z status=routed owner=3-15-the-public-posture-one-sealed-bundle-to-one-droplet by=lead note=harvested from spec 1-8 frontmatter deferred; fix-risk low = one-line fallback uuid generator or https-only settle; footprint core (boot wiring)
- 2026-11-26T02:31:31Z by=retro note=1.9 catch changed the failure SHAPE (epic-1 retro cross-seam pass, main.ts:99-108): boot now DEGRADES but mislabeled - whole-boot catch mounts workbench reason=unsupported and Reload deterministically re-throws = terminal loop on plain-http LAN origins (https droplet unaffected); when 3-15 settles the origin scheme also make the catch distinguish boot-dependency-throw from browser-incapability; plausible confidence (static+suite evidence, no insecure-context browser run)

### DW-31: storage service conflates a port read/write failure with absence: a flaky or mid-session-changing port could clobber a higher PB or orphan a PB under a visitor id never persisted
- source: spec-1-8-the-room-knows-you-without-an-account.md | severity: med | fix-risk: med | footprint: in-story
- evidence: read() catch returns null (storage.ts:287-290) so readPb/recordScoreSubmitted treat a failed read as no-PB and write unconditionally (:370-377); write() swallows setItem failure with no visitor-key retry (:293-300)
- 2026-11-24T21:57:44Z status=wontfix-theoretical owner=1-8-the-room-knows-you-without-an-account by=cr note=would be real if a port's getItem/setItem availability diverged mid-session; browser storage gates are session-stable

### DW-32: rowsFor cap-2 branch cannot fire (the view has at most two sources), so the unit cap pin never exercises truncation; the live guard is the painter collision throw
- source: spec-1-8-the-room-knows-you-without-an-account.md | severity: low | fix-risk: med | footprint: in-story
- evidence: rowsFor pushes at most PB then best Patron (storage.ts:385-396); the rows.length guard is always true before the second push, so removing SCORE_ROW_CAP keeps the unit pin green; AD-28 names the collision law as the guard
- 2026-11-24T21:57:54Z status=wontfix-theoretical owner=1-8-the-room-knows-you-without-an-account by=cr note=would be real if a third row source (Epic-3 ledger/leaderboard machinery) landed without the view law being updated

### DW-33: banned-token scan posture is duplicated across three test files: comment-strip can mask tokens inside string literals, and the games-source token bans match prose in literals (false red risk)
- source: spec-1-8-the-room-knows-you-without-an-account.md | severity: low | fix-risk: med | footprint: in-story
- evidence: no-ui-dom.test.ts, main-glue.test.ts and storage.test.ts each inline the same replace-based comment strip; the games scan tokens (storage. / visitorId / rowsFor / arcade.pb) match string contents; masking path acknowledged theoretical in-story triage
- 2026-11-24T21:58:03Z status=wontfix-accepted owner=1-8-the-room-knows-you-without-an-account by=cr note=reopen_if=a core or vendored source trips or masks a ban scan through string content, or a fourth scan site lands (unify the scanner then)

### DW-34: Rule 3: the rendered score rows (user-facing surface) have no browser-tier test in the QA suite; rendering is proven at source-pin tier plus an executed real-painter chain
- source: spec-1-8-the-room-knows-you-without-an-account.md | severity: high | fix-risk: high | footprint: in-story
- evidence: QA suite is node --test headless; the intent fixes the verification tiers itself (main-glue source pins, real-painter chain test) and the Chrome/Edge matrix row assigns browser evidence to the lead's post-review smoke gate; a browser harness would need tooling the Never-list bars
- 2026-11-24T21:58:14Z status=by-design owner=1-8-the-room-knows-you-without-an-account by=cr note=spec-bound (Rule 15): intent-pinned tier + lead smoke gate; closes by-design at emission, smoke gate lands the browser evidence

### DW-35: a renderer.render throw AFTER the first successful frame is uncontained: a post-first-frame wedge (context loss, driver hiccup) throws every rAF with a frozen camera and no workbench — settle with a render-fault flip in the 1.7 drawFaulted idiom or a context-loss handler
- source: 1-9-the-street-door-beat-loading-as-fiction-s-first-shot | severity: medium | fix-risk: low | footprint: core
- evidence: core/main.ts frame(): the renderer.render leg unwrapped since 1.1 (1.7 supervisor hook draw wraps the game draw legs); core/entry.ts stall arms only while framesRendered===0 so any rendered frame cancels the self-heal — pre-existing posture surfaced by the 1.9 review pass
- 2026-11-25T06:52:46Z status=routed owner=3-14-liveness-tiers-the-room-scales-while-the-law-holds by=lead note=harvested from spec 1-9 frontmatter deferred; pre-existing since 1.1 not a 1.9 regression; underpowered-device tiers are 3-14's own ground; adjudicate at that story's smoke tier

### DW-36: workbench panel paints at 1x device pixels — soft text on HiDPI displays
- source: spec-1-9-the-street-door-beat-loading-as-fiction-s-first-shot.md | severity: low | fix-risk: med | footprint: in-story
- evidence: core/workbench.ts sizes the canvas backing store in CSS px; DPR scaling needs CSS sizing (a style write) that the pinned narrow-DOM law (one createElement/append/remove + one listener) forbids
- 2026-11-25T09:53:02Z status=by-design owner=1-9-the-street-door-beat-loading-as-fiction-s-first-shot by=cr note=spec-bound: the narrow-DOM exception is the story's own pinned law; simplest option consistent with the spine

### DW-37: entry camera + front-door frame legs still run every rAF after the workbench mount (terminal page)
- source: spec-1-9-the-street-door-beat-loading-as-fiction-s-first-shot.md | severity: low | fix-risk: med | footprint: in-story
- evidence: core/main.ts frame(): the camera branch and front-door re-pose block sit before the workbenchMounted guard (main.ts:499) — dead writes to a detached scene each frame, no DOM change, draw legs already guarded (main-glue-qa order pin)
- 2026-11-25T09:53:02Z status=wontfix-accepted owner=1-9-the-street-door-beat-loading-as-fiction-s-first-shot by=cr note=reopen_if=smoke/profiling shows measurable per-frame cost on the workbench page or story 3-14 reworks the frame legs

### DW-38: mount-record reason mislabels 2 of 4 workbench paths: 'unsupported' for every boot throw, 'asset-timeout' also for failNow
- source: spec-1-9-the-street-door-beat-loading-as-fiction-s-first-shot.md | severity: low | fix-risk: med | footprint: in-story
- evidence: no consumer reads mount.reason today (review pass 1 blind 3 kept the option for the caller); deriving true provenance needs an entry-side path source the API does not expose
- 2026-11-25T09:53:03Z status=wontfix-accepted owner=1-9-the-street-door-beat-loading-as-fiction-s-first-shot by=cr note=reopen_if=first consumer of mount.reason attributes a fault from it (console/telemetry) and sees a wrong label

### DW-39: ci/lint-bans wall-clock rules bind the .now member only: Date.parse, Date.UTC, and performance.timeOrigin walk the sim-path gate green (probe-verified)
- source: spec-1-10-epic-1-burn-down | severity: med | fix-risk: med | footprint: in-story
- evidence: ci/lint-bans.mjs BAN_LOOKUP/GLOBAL_CLOCK key exact receiver.member pairs (Date.now, Date.perf now, globalThis.Date family); a planted sim file using Date.parse / Date.UTC / performance.timeOrigin exits 0. Closing this moves the banned SET - owner-only posture per DW-8 precedent; the 1.10 spec binds FORMS of already-banned APIs, never new API families
- 2026-11-26T00:25:25Z status=escalated owner=burndown by=cr note=decision-sheet alongside DW-8; distinct family (wall-clock members, not transcendentals)
- 2026-11-26T02:35:46Z status=decision-pending owner=burndown by=unattended note=inbox=U-4

### DW-40: cycle-log 1.10 qa_complete row has ts and spawn_at swapped: ts=21:18:28Z is the spawn time, spawn_at=21:59:41Z is the completion (inverted vs the log schema)
- source: spec-1-10-epic-1-burn-down | severity: low | fix-risk: low | footprint: out-of-story
- evidence: _bmad-output/implementation-artifacts/cycle-log-epic-1.md qa_complete row (2026-11-25): the ts column carries the stage-spawn timestamp while spawn_at carries the completion timestamp - reversed reading of the schema's row
- 2026-11-26T00:25:39Z status=decision-pending owner=burndown by=cr note=human=lead - cycle-log rows are the lead's artifact; reported for the lead's bookkeeping fix, nothing closable by a story stage
- 2026-11-26T00:37:19Z status=resolved-by:1-10-epic-1-burn-down by=lead note=row_ts_and_spawn_at_swapped_back_in_place_at_cr_close(lead-owned cycle log)

### DW-41: no-ui-dom.test.ts comment-strip idiom hoisted to module scope - the spec sentence do-not-hoist-a-shared-helper and the sentence do-not-add-another-strip-site cannot both hold literally; module-scope reuse is the only reading that keeps DW-33's strip-site count at 3
- source: spec-1-10-epic-1-burn-down | severity: low | fix-risk: low | footprint: in-story
- evidence: core/no-ui-dom.test.ts module-scope strip()/walk() feed the new DW-11 camera scans; DW-33's reopen_if counts independent strip SITES repo-wide (main-glue:381, no-ui-dom, storage:690 stay 3); the DOM-half pins (:37-47, :60-70) are byte-unchanged
- 2026-11-26T00:26:01Z status=by-design owner=1-10-epic-1-burn-down by=cr note=reading that satisfies both spec clauses; DW-33's fourth-site unify trigger untouched

### DW-42: DW-29 deck slab bottoms at 0.71m and rides proud 0.06 - it covers the top 0.02m band of the coin door (door top 0.73, proud 0.02); decor overlap, realism-tier only
- source: spec-1-10-epic-1-burn-down | severity: low | fix-risk: low | footprint: in-story
- evidence: core/room/cabinets.ts SHELL.deck centerY 0.75 height 0.08 (bottom 0.71, top 0.79) vs coin-door record top 0.73; scene.ts deck mount proud 0.06 exceeds the door's 0.02; no binding law violated (the coin door itself is byte-unchanged); the 0.75 dim is the Decided-in-stage-5 smoke-tuned value recorded in the spec claim-check
- 2026-11-26T00:26:01Z status=by-design owner=1-10-epic-1-burn-down by=cr note=flag for the lead's Chrome+Edge smoke: if the covered band reads wrong at 2m/6m, smoke-tune SHELL.deck centerY/proud there
- 2026-11-26T06:12:28Z status=routed owner=2-0-epic-1-deferred-cleanup by=correct-course note=deck slab deleted outright by the profile rebuild; the coin-door top-band overlap closes with the part

### DW-43: Cabinet-shell contour extrusion is single-placement-only: the SHELL formula scales parts by cabinetPlacements.length but authored data holds one placement and there is no injection seam — per-placement contour repetition untestable once 3.4 makes placement a pure function
- source: 1-10-epic-1-burn-down | severity: low | fix-risk: low | footprint: core
- evidence: QA observation at story 1.10 qa_complete, confirmed valid by CR: core/room/cabinets.ts SHELL loop multiplies by cabinetPlacements.length; only one authored placement; no seam to plant two
- 2026-11-26T00:46:06Z status=routed owner=3-4-the-layout-system-placement-is-a-pure-build-time-function by=lead note=adjudicated at story 1-10 ledger gate (not a 1.10 fix: 1.10 shipped the law for the authored single placement); the placement seam is 3.4's own ground — pin contour repetition at that story
- 2026-11-26T06:12:28Z by=correct-course note=law unchanged; part names superseded by the Story 2.0 profile rebuild (3-4 AC bullet reworded to name SIDE_PROFILE/INNER_PROFILE panels + assemblies)

### DW-44: main.ts renderer posture (ACES, exposure 1.0, sRGB/anisotropy, cap-arg switch) has only a source-text-pin executed tier; a posture change or three.js version bump keeping the source text intact ships visually wrong with the suite green
- source: story 2.0 implement self-review (verification-gap layer) deferred: | severity: low | fix-risk: med | footprint: cross-cutting
- evidence: spec-2-0 frontmatter deferred: #1; core/main-glue.test.ts:126-140 pins + executed-tier-waits note; same tier as DW-15/DW-12
- 2026-11-26T15:34:55Z status=routed owner=3-2-the-gate-goes-deterministic-l0-l1-scripts-contract-test-skil by=harvest note=same browser-harness tier as DW-15; Epic-3 3.2/3.15 harness closes it; pre-existing posture, not caused by 2.0

### DW-45: Owner-authored contradiction: screen-brightest law cannot hold literally against the brief's fixed emissive pair - marquee 1.2 tone-maps to 0.804 above screen 1.0 at 0.763 under the measured ACES curve; literal screen-brightest needs a brief amendment
- source: story 2.0 implement deferred: | severity: low | fix-risk: low | footprint: small
- evidence: spec-2-0 frontmatter deferred: #2; core/room/cabinets.ts emissive pair + scene.test.ts exposure law; measured ACES anchors 1.0 to 0.763, 1.2 to 0.804
- 2026-11-26T15:35:41Z status=decision-pending owner=burndown by=harvest note=inbox=U-9; in-story disposition by-design (law re-expressed, ceiling 1.18 to 0.80); owner decides which source binds
