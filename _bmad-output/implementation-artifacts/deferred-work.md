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
