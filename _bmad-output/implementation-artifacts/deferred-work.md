# Deferred Work Ledger

See _bmad/custom/skill-rules.md Rule 15 (entry grammar) and Rule 17 (the drain).

### DW-1: ci/lint-bans depth evasion: Math["random"], destructured Math, new Date()/Date() pass the sim-path ban gate
- source: _bmad-output/implementation-artifacts/spec-1-1-project-bootstrap-and-the-deterministic-kernel-core.md | severity: med | fix-risk: med | footprint: ci/
- evidence: review G2/edge-6; extension-set half patched; full L0 gate lands Epic 3 (3.1/3.2)
- 2026-11-21T12:01:42Z status=routed owner=burndown by=harvest note=depth forms deferred to the Epic 3 L0 gate

### DW-2: core/main.ts boot: a throwing createSim factory is unguarded - one faulty game kills the whole room at page load (AD-15)
- source: _bmad-output/implementation-artifacts/spec-1-1-project-bootstrap-and-the-deterministic-kernel-core.md | severity: med | fix-risk: low | footprint: core/
- evidence: review G12/blind-2,edge-16; needs supervisor-wrapped per-instance boot
- 2026-11-21T12:01:42Z status=routed owner=1-7-fault-containment-a-broken-game-never-kills-the-room by=harvest note=containment seam belongs to 1.7

### DW-3: unbounded growth in long-lived processes: supervisor.faults uncapped (60/s from a broken sim); loop.eventQueue never drained once games register
- source: _bmad-output/implementation-artifacts/spec-1-1-project-bootstrap-and-the-deterministic-kernel-core.md | severity: med | fix-risk: low | footprint: core/
- evidence: review G13/blind-5; drains exist once 1.5 registers a game
- 2026-11-21T12:01:43Z status=routed owner=1-7-fault-containment-a-broken-game-never-kills-the-room by=harvest note=cap/dedup is containment policy

### DW-4: AGENTS.md Running-and-verifying section ("No commands exist yet") is stale once story 1.1 lands; agent instruction files are owner-only unattended
- source: _bmad-output/implementation-artifacts/spec-1-1-project-bootstrap-and-the-deterministic-kernel-core.md | severity: med | fix-risk: low | footprint: docs/
- evidence: review G17/blind-9; refresh via owning skill with package.json scripts
- 2026-11-21T12:01:43Z status=escalated owner=burndown by=harvest note=owner_only category - to decision sheet

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
