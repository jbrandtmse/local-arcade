# Deferred Work Ledger

See _bmad/custom/skill-rules.md Rule 15 (entry grammar) and Rule 17 (the drain).

### DW-1: ci/lint-bans depth evasion: Math["random"], destructured Math, new Date()/Date() pass the sim-path ban gate
- source: _bmad-output/implementation-artifacts/spec-1-1-project-bootstrap-and-the-deterministic-kernel-core.md | severity: med | fix-risk: med | footprint: ci/
- evidence: review G2/edge-6; extension-set half patched; full L0 gate lands Epic 3 (3.1/3.2)
- 2026-11-21T12:01:42Z status=routed owner=burndown by=harvest note=depth forms deferred to the Epic 3 L0 gate
- 2026-11-21T23:06:38Z occurrence=1-1-project-bootstrap-and-the-deterministic-kernel-core by=cr note=Math["random"], Math?.random and new Date() re-sighted in ci/lint-bans self-test probe

### DW-2: core/main.ts boot: a throwing createSim factory is unguarded - one faulty game kills the whole room at page load (AD-15)
- source: _bmad-output/implementation-artifacts/spec-1-1-project-bootstrap-and-the-deterministic-kernel-core.md | severity: med | fix-risk: low | footprint: core/
- evidence: review G12/blind-2,edge-16; needs supervisor-wrapped per-instance boot
- 2026-11-21T12:01:42Z status=routed owner=1-7-fault-containment-a-broken-game-never-kills-the-room by=harvest note=containment seam belongs to 1.7

### DW-3: unbounded growth in long-lived processes: supervisor.faults uncapped (60/s from a broken sim); loop.eventQueue never drained once games register
- source: _bmad-output/implementation-artifacts/spec-1-1-project-bootstrap-and-the-deterministic-kernel-core.md | severity: med | fix-risk: low | footprint: core/
- evidence: review G13/blind-5; drains exist once 1.5 registers a game
- 2026-11-21T12:01:43Z status=routed owner=1-7-fault-containment-a-broken-game-never-kills-the-room by=harvest note=cap/dedup is containment policy
- 2026-11-21T23:06:38Z occurrence=1-1-project-bootstrap-and-the-deterministic-kernel-core by=cr note=supervisor.faults cap and per-tick eventQueue drain re-sighted by CR layers

### DW-4: AGENTS.md Running-and-verifying section ("No commands exist yet") is stale once story 1.1 lands; agent instruction files are owner-only unattended
- source: _bmad-output/implementation-artifacts/spec-1-1-project-bootstrap-and-the-deterministic-kernel-core.md | severity: med | fix-risk: low | footprint: docs/
- evidence: review G17/blind-9; refresh via owning skill with package.json scripts
- 2026-11-21T12:01:43Z status=escalated owner=burndown by=harvest note=owner_only category - to decision sheet
- 2026-11-21T23:25:19Z status=resolved-by:1-1-project-bootstrap-and-the-deterministic-kernel-core by=owner note=AGENTS-refreshed-in-session-2026-11-21

### DW-5: tools/gen-registry.mjs does not validate simPath points under games/<id>/sim/ - AD-1 direction unenforced at the build step
- source: _bmad-output/implementation-artifacts/spec-1-1-project-bootstrap-and-the-deterministic-kernel-core.md | severity: med | fix-risk: low | footprint: tools/
- evidence: review G26/edge-20; manifest + L0 land Epic 3
- 2026-11-21T12:01:43Z status=routed owner=burndown by=harvest note=

### DW-6: matrix Out-of-tick-write row has no composable fault-chain test surface (gate throws to caller; supervisor wraps kernel sites - two disjoint surfaces)
- source: _bmad-output/implementation-artifacts/spec-1-1-project-bootstrap-and-the-deterministic-kernel-core.md | severity: med | fix-risk: med | footprint: core/contract/
- evidence: review G27/edge-21,edge-23,intent-1; composition deferred with 1.7
- 2026-11-21T12:01:43Z status=routed owner=1-7-fault-containment-a-broken-game-never-kills-the-room by=harvest note=

### DW-7: cross-engine determinism (browser kernel === Node CI stateHashes) never exercised on two engines; construction property only
- source: _bmad-output/implementation-artifacts/spec-1-1-project-bootstrap-and-the-deterministic-kernel-core.md | severity: med | fix-risk: med | footprint: epics-3-replay/
- evidence: review G31/intent-4; tools/replay (Epic 3) provides the surface
- 2026-11-21T12:01:43Z status=routed owner=burndown by=harvest note=

### DW-8: ci/lint-bans ban set covers only the 9 spine-named transcendentals: ECMA implementation-approximated Math fns (atan, log2, log10, hypot, cbrt, expm1, log1p, sinh/cosh/tanh family) and the ** operator pass the sim gate
- source: _bmad-output/implementation-artifacts/spec-1-1-project-bootstrap-and-the-deterministic-kernel-core.md | severity: med | fix-risk: med | footprint: ci/
- evidence: CR re-spawn 3 blind+edge layers; AD-4 names exactly sin/cos/tan/asin/acos/atan2/pow/exp/log; widening the ban set changes AD-4 scope
- 2026-11-21T23:06:38Z status=escalated owner=burndown by=cr note=AD-4-scope amendment is owner-only (architecture amendment) - to decision sheet; decide before the Epic 3 L0 gate locks the rule surface

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

### DW-12: core/main.ts glue has no executed test host: addSystem takeView wiring, device listeners, silent-denial path pinned only by source-text and dev-serve text asserts
- source: _bmad-output/implementation-artifacts/spec-1-2-first-person-walk-look-and-move-no-prompts.md | severity: med | fix-risk: high | footprint: in-story
- evidence: verification-gap demo: hoisting input.takeView() out of the addSystem callback -> page cannot walk/look; npm test stays 113/113; no test imports or executes core/main.ts
- 2026-11-22T06:53:54Z status=routed owner=burndown by=cr note=browser harness = new dep, Epic 3 scope; lead Chrome+Edge smoke is the Epic 1 gate; distinct from DW-11 in-view half

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

### DW-16: Front wall open above the door head: no lintel volume over the door gap (visible see-through band y 2.1-3.0 when looking up at the door; 13cm recess behind the panel)
- source: spec-1-3-the-arcade-room-slots-pillars-zones-and-the-roadmap-wall.md | severity: med | fix-risk: med | footprint: in-story
- evidence: wall-front segments exclude the gap x entirely; door-front covers only y 0..2.1 z 6.25..6.37 - the spec's I/O matrix row authors exactly this volume set; all AC1 pins are 2D XZ so Y gaps cannot go red
- 2026-11-22T13:41:43Z status=by-design owner=1-3-the-arcade-room-slots-pillars-zones-and-the-roadmap-wall by=cr note=spec-bound: matrix row + Design Notes 6 name the shape; reopen if the lead's door-front smoke sees the band -> spec amendment (lintel volume or taller door)

### DW-17: AmbientLight coloured with the Room Black SURFACE token is a near-no-op fill (0x15110E x 0.15 ~ 4% luminance low-intensity): the pin cements an inert light
- source: spec-1-3-the-arcade-room-slots-pillars-zones-and-the-roadmap-wall.md | severity: low | fix-risk: low | footprint: in-story
- evidence: DESIGN.md treats Room Black as ceiling/clear-colour surface token; scene.test + scene-qa pin colour ROOM_BLACK and intensity <= 0.2; the fill the light nominally provides is ~0.6% luminance
- 2026-11-22T13:41:54Z status=by-design owner=1-3-the-arcade-room-slots-pillars-zones-and-the-roadmap-wall by=cr note=spec-bound: Design Notes item 7 authors this exact value, 'tuned by eye at the smoke'; reopen at the lead's 6m smoke if unlit faces read too dark

### DW-18: tests/test-summary.md flyer-probe descriptions stale after story 1.3 rework pass 1 (paintFlyer wrap+measureText fit law, sheet widened 0.40x0.60)
- source: spec-1-3-the-arcade-room-slots-pillars-zones-and-the-roadmap-wall.md | severity: low | fix-risk: low | footprint: in-story
- evidence: spec frontmatter deferred bullet 2; stale lines 23/31 describe pre-rework paintFlyer pins
- 2026-11-22T16:30:58Z status=routed owner=1-3-the-arcade-room-slots-pillars-zones-and-the-roadmap-wall by=harvest note=QA regenerates the artifact on its next pass; implement stage never hand-edits it
