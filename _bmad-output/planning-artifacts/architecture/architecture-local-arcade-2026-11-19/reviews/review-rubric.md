# Rubric Walk — ARCHITECTURE-SPINE.md (Local Arcade, 2026-11-19)

Reviewer: rubric walker. Date: 2026-11-19. Artifact: `ARCHITECTURE-SPINE.md` (status: draft, altitude: initiative, 25 ADs).
Driving spec: `prd.md` (final, FR-1..FR-17 + NFR §6). Memlog read for decision provenance.

## Verdict

**PASS WITH FIXES.** No criticals. The spine fixes the load-bearing divergence points (plugin contract, clock/determinism, ledger→layout, Patron/queue semantics, diegetic lint, deployment envelope) and defers the right things with named revisit conditions. Two highs are clarification-shaped gaps in *enforcement seats*, plus one genuine missed divergence point (canonical sim-event vocabulary). All five top findings can be fixed by spine edits before Game epics / Core stories open.

## Checklist walk

1. **Fixes divergence points for the level below; misses any?** Mostly yes — contract hooks, two-half rule, manifest schema, ledger discipline, layout function, Patron arbitration, zone ownership, and the skills-are-thin rule all pin what Game epics, Core stories, and Factory skills would otherwise each invent. One real miss: the canonical sim-event *type vocabulary* (end/break, scoreSubmitted) is unpinned (finding M1). Second smaller miss: the Instruction Card "rules text" input has no named home (finding M2).
2. **Every AD's Rule enforceable and preventing its Prevents?** Broadly yes — L0 import/API bans, L1 determinism/end-state, L2 audits (dead-machine, causality probe, character lint, aisle-nav), build-time generation, CI dep checks. Three clauses name a red gate or a law with no detection mechanism: AD-15 tick-only mutation, AD-5 hand-rolled-hash detection, and AD-18/AD-8 sealed-build (finding H1, M3). AD-1's CI dep check, AD-2/AD-3/AD-4/AD-7/AD-24 lint rules, AD-10/AD-11/AD-21 build mechanisms, AD-9 tools/ ledger validation all check out against their Prevents lines.
3. **Could Deferred let two units build incompatibly?** No. Pinball deferral pre-loads its obligations (packaging, GPL-in-bundle, cross-browser physics determinism); presentationOnly tables register now and upgrade via refurbish under the same id (AD-9), so M3 and M6 are compatible. Numeric-thresholds deferral is honest about the law being unenforceable until M2 — that's the PRD's own note, not a spine dodge. Soft multi-ray deferral keeps one named interface (occluder collider set, AD-7). Custom-cabinet deferral has a small unguarded edge (finding L2).
4. **Named tech verified-current (flags only)?** No staleness flags; every seed row carries a 2026-11-19 verification date consistent with the memlog pins. Flag to version reviewer: GitHub Actions unpinned on a public repo (supply-chain note, L3). nginx row correctly carries a "must be ≥" constraint rather than a soft pin.
5. **Capability coverage (map vs FR-1..FR-17 + NFRs)?** All 17 FRs and the NFR §6 posture have map rows with governing ADs. One coverage hole *inside* a mapped capability: FR-17's sealed-build check (a PRD-named L1 item and the thesis enforcement seat) is missing from the spine's L1 inventory (finding H1).
6. **Every initiative dimension DECIDED/DEFERRED/OQ?** Nearly. Envelope: deployment & environments DECIDED (AD-20 + topology diagram), infra/provider DECIDED (droplet, GH Actions, unpinned-with-reason), security posture DECIDED (CSP/HTTPS/rate-limit/validation enumerated). Two thin spots: the **browser target matrix** is neither decided, deferred, nor an OQ (finding H2); **operations after deploy** (monitoring/health, incident posture) is near-silent beyond "droplet is disposable" (finding M4).
7. **Shape right?** Yes. Decisions dominate; rationale lives in the memlog. Three mermaid diagrams carry what prose couldn't; all three parse (valid mermaid). No placeholders, no template comments, structural seed is minimal and matches AD-13/AD-14/skills rules. Nits: duplicate KERNEL→ROOM edge in the dependency diagram (L4); services-vs-kernel node split creates an undeclared-but-required edge under "anything not drawn is forbidden" (M3b).

## Findings

### Critical
None.

### High

**H1 — Sealed-build verification has no seat in the spine.**
File: AD-8 (L1 inventory), AD-18, deployment mermaid.
Issue: PRD FR-17 L1 explicitly includes "sealed build (no runtime network/model calls — the no-runtime-LLM thesis enforced by test)." AD-8's L1 enumeration lists determinism, attract liveness, and autoplay end-state but omits it; AD-18 says the bundle is "verified before it ships" without naming the gate, and the CI mermaid shows no verify step between bundle build and rsync. The thesis's only CI-proven enforcement floats between layers.
Fix: add the sealed-build check to AD-8's L1 list (or name a pre-ship bundle check in CI) and add the node to the deployment diagram.

**H2 — Desktop-browser target matrix is neither decided nor deferred.**
File: AD-17, AD-8 (L2 screenshot/framerate checks), Stack/CI rows.
Issue: "desktop-only" names the input surface but not the browser targets. L2 screenshot-test proxy, framerate floor, pointer-lock/spatialization behavior, and three.js feature use are all browser-dependent; "CI runs desktop-browser targets" doesn't say which. Game epics could build Chrome-only assumptions with no CI target to catch them.
Fix: name the targets (e.g., latest Chrome/Firefox/Safari stable as CI audit targets) in AD-17, or mark the matrix an explicit decision-with-revisit at M1 (when audio occlusion quality gets tuned).

### Medium

**M1 — Canonical sim-event vocabulary is unpinned (missed divergence point).**
File: AD-6, AD-8 (L1 "the game emits its end/break event"), AD-23, Consistency Conventions (Data & formats).
Issue: conventions pin the event *shape* (`{type, payload}`, camelCase) and mention `scoreSubmitted` in passing, but the event *type names* the kernel depends on — the end/break event (L1 end-state guarantee, Patron takeover per AD-23, scheduler handoff) — have no canonical name. Every Game epic invents its own; L1's "runs to a real end state" check and the queue ritual need one shared currency.
Fix: pin required event type names in the contract (conventions table or AD-6 rule), e.g. a required `gameEnded`/`roundBreak` event, and have L0/L1 lint for it.

**M2 — Instruction Card "rules text" has no home in the Manifest schema.**
File: AD-24 vs AD-12.
Issue: AD-24 generates Instruction Cards from "Manifest attribution + the game's rules text"; AD-12's required/optional field list has no rules-text field and no named asset path. Two epics store rules text in different places; card generation diverges — exactly the "attribution scattered per-story" this AD prevents.
Fix: add a manifest field (inline string or required asset path like `rulesTextRef: "rules.md"`) to AD-12 and schema.

**M3 — Three rule clauses lack a named detection mechanism.**
File: AD-15 (rule 1), AD-5 (rule 3), dependency diagram + preamble line 36.
Issue: (a) "no sim-state mutation outside `tick()`" — lint can't see this and the supervisor only catches throws; no CI/lint seat is named. (b) "a hand-rolled hash in a game is a red gate" — how is a hand-rolled hash detected? The snapshot-access path (how Core obtains the plain state within the four fixed hooks) is also unspecified. (c) The preamble says anything not drawn in the import diagram is forbidden, but no KERNEL→SVC edge is drawn while the kernel necessarily uses its own services — a forbidden-by-omission that contradicts the paradigm line.
Fix: AD-15 — name the mechanism (contract-test harness drives the sim with input-only injection; any state change outside tick shows up in stateHash ordering checks — or restate as a lintable ban on registering callbacks/handlers in the sim half). AD-5 — state that a game's `stateHash()` hook must delegate to the Core hasher (call-shape is lintable at L0). Diagram — add KERNEL→SVC or merge the nodes.

**M4 — Operations envelope after deploy is near-silent.**
File: AD-20.
Issue: recovery posture is decided (disposable droplet, repo-is-state) and certbot implies renewal, but nothing says whether the public site gets any liveness monitoring / error reporting — and any runtime error telemetry must be squared with the anonymity posture (AD-16). At initiative altitude, "no monitoring, by design" would be a legitimate DECIDED answer; it currently isn't stated either way.
Fix: one sentence in AD-20: either "no telemetry of any kind, anonymous posture (checked by CSP/zero-external-scripts rule)" or name the minimal uptime check.

### Low

**L1 — Ledger append-only validation mechanism is vague.** AD-9: "validated by `tools/` at build" doesn't say how a rewritten history is caught. Fix: CI compares the local ledger's prefix against the ledger on origin/main (append-only diff).

**L2 — Custom cabinet models deferred without a slot-fit constraint.** Deferred list + FR-11: a custom model could exceed Wall Slot footprint/aisle clearance; aisle-nav lint is the only backstop, and only at L2. Fix: note slot bounding volume in `core/room` config as an L2 (or L0 manifest `cabinetType`-adjacent) lint input.

**L3 — GitHub Actions unpinned on a public repo.** Stack table. Supply-chain exposure for a thesis project whose CI is the law. Consider pinning the workflow-sha set once CI lands (M2).

**L4 — Dependency diagram duplicate edge.** KERNEL→ROOM drawn twice with different labels; valid mermaid but noise — merge.

**L5 — FR-13 soft contradiction acknowledged only in memlog.** AD-22 answers the PRD's testable consequence ("purchase updates jar on completion") with "no v1 mechanism," which contradicts the PRD's acceptance text. The spine states its answer honestly; flag that the PRD consequence needs a matching amendment so M5 acceptance doesn't inherit two laws.
