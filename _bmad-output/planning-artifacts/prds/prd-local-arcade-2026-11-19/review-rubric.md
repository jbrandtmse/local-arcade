# PRD Quality Review — Local Arcade

Reviewed: `prd.md` + `addendum.md`, walked against `.claude/skills/bmad-prd/assets/prd-validation-checklist.md`. Calibrated to agreed stakes: solo-builder passion project, public website, local-LLM budget (memlog: "PRD kept lean accordingly") — enterprise ceremony not demanded; internal rigor is.

## Overall verdict

This PRD is unusually decision-complete for a passion project: all eight open questions are resolved or deferred-with-revisit-condition, every acceptance law is either a named CI layer (FR-17 L0–L2) or a named seat in the human walk (SM-1, SM-4), and the metrics carry explicit counter-metrics (SM-C1, SM-C2) that name what they guard. What holds up: the thesis ("local models as builders, not chatbots") genuinely drives scope — the Registration/Layout/contract FRs are the spine, and the differentiation claim is earned by real landscape research rather than template furniture. What's at risk is thin but real: FR-13's single consequence presumes a donation-completion signal that the outside world may not supply, and a handful of the room's load-bearing quality laws (framerate floor, Patron reaction window) have no bound and — unlike the 60s ceiling — no explicit deferral tag. None of this blocks light-on-to-build; all of it is one-line fixable.

## Decision-readiness — strong

Trade-offs are stated as trades with what was given up named, not smoothed to neutral. OQ-6: "The industry manifest+iframe norm is deliberately traded away" — and addendum A spells out exactly what is lost (portal-style isolation, third-party embedding) for what is gained (CI verifiability). FR-16 explains *why* moving is out: "relocation fights front→back fill-order determinism." The brief supersessions are logged rather than hidden (§7 "(Supersedes the brief's 'room is a timeline' law — logged in memlog)"; §8's phone/tablet removal "supersedes the brief's 'laptop + phone' criterion"). `[NOTE FOR PM]` callouts sit at real tensions — the anchor-cabinet prerequisite note in §7 and the "emotionally load-bearing — don't drop from memory" note in §8 — not at safe checkpoints. OQ-4 is a genuinely open question (decision deferred to M6 story-scoping with a revisit condition, "Not a PRD blocker"), not a rhetorical one. SM-4's honesty — "the builder's own judgment, and the one that outranks the others" — acknowledges the personal-bar objection instead of dodging it. The §6 `[NOTE FOR ARCHITECTURE: enumerate these in the architecture run]` defers the security-enumeration tension explicitly rather than pretending "sane rate limiting" is a bound.

### Findings
None.

## Substance over theater — strong

Three personas (Josh, Ray, the builder), each load-bearing: Josh drives the find-by-ear FRs (FR-1, FR-3), Ray is the entire justification for the layout roadmap stretch and the Workshop's visible growth (UJ-2 → FR-10, FR-12), and the builder-as-persona is what makes §5 the Game Factory a requirements section rather than an appendix. The differentiation paragraph in §1 names specific comparables (three.js showcases, archive.org's 900-game flat library, Poki) and the novelty claim is hedged with research honesty — addendum A: "the Registration + Layout System concept is novel *assembly on standard plumbing*," "No arcade+local-LLM precedent found (whitespace)." That is the opposite of a differentiation section written because the template had one. NFRs in §6 are product-specific (one droplet, boring stack, "server-backed arcades die when maintenance lapses," no-runtime-LLM enforced by test), and the HTTPS/CSP boilerplate is one sentence with an explicit deferral tag rather than a section of adjectives. The Vision could not swap into any other PRD in this category.

### Findings
None.

## Strategic coherence — strong

The PRD has a thesis and the feature list follows from it rather than from ease: the bet is "local models as builders, not chatbots," and the growth mechanism (Registration, Manifest, Layout System, game-build contract — FR-8, FR-10, FR-17) is treated as the product's core, with §5 labeled an *invented section* for exactly that reason. The six acceptance laws (addendum E) are each traceable to either a checker or a human-walk seat — "The acceptance laws are not prose in this document" (§5) is a claim the PRD actually honors. Success metrics validate the thesis rather than activity: SM-1 measures the find-by-ear discovery loop, SM-2 measures the pipeline thesis end-to-end, SM-3 measures the no-dead-machines law. Counter-metrics are present, specific, and paired: SM-C1 ("a wall of 22 half-alive cabinets is a failure") counterbalances SM-2; SM-C2 counterbalances SM-3. MVP scope kind is coherent — an experience with a platform-growth engine behind it — and the M0–M6 cut list with its layout-override adaptations shows the scope logic tracked the thesis change rather than the original plan.

### Findings
None (the SM-1 measurement gap is filed under Done-ness, where it bites).

## Done-ness clarity — adequate

This is the dimension the PRD mostly wins: nearly every FR carries testable consequences — FR-8's "zero manual steps by the builder" and "The Arcade Core's own source is unchanged"; FR-10's "same Manifest set always produces the same layout"; FR-16's "scores key on the stable Game id, not the build"; FR-17's "A Game failing any automated layer cannot be Registered." The screenshot test is stated as an audit ("A random-frame audit across a play session finds zero Dead Machines"), not an aspiration. FR-1's ≤60s is explicitly framed as a guardrail ceiling with the real budget pushed to architecture — an honest bound-plus-deferral, not a hedge. What keeps this from strong: a few consequences rest on mechanisms the outside world doesn't obviously provide, and the one performance number in the document is doing almost all the bounding work while adjacent thresholds float.

### Findings
- **[medium]** FR-13 presumes a donation-completion signal that may not exist (§4.8) — "A completed purchase updates the physical jar/order state in the scene" is the feature's *only* consequence, and it assumes the donation provider reports completion back into the scene. Buy-Me-a-Coffee webhooks exist; tip-jar links vary; a bare crypto link has no "completed" callback at all — the visitor pays on-chain and the scene has nothing to watch. A story author taking FR-13 at face value hits this cold at M5. *Fix:* one line naming the completion mechanism (provider webhook, sandboxed return URL, or manual/owner-set increment as a fallback) or an explicit `[NOTE FOR ARCHITECTURE]` deferral like §6's.
- **[medium]** Unparameterized quality thresholds on the room's own laws (FR-5, FR-15, §5/addendum G) — the screenshot law lives and dies on "at playable framerate" (FR-15's feature NFR, addendum G's "screenshot-test proxy + framerate floor") and the Patron causality probe fires "within N frames," yet neither carries a number *or* the explicit deferral callout that the 60s ceiling got ("architecture sets the budget," §11). These are load-bearing for SM-3, SM-C2, and the L2 gate — if nobody ever sets the floor, the "no dead machines" law is unenforceable in CI. *Fix:* tag both as architecture-set budgets (one line each), or commit a v1 number (e.g., 30fps floor, reaction within 1s) and let architecture refine.
- **[low]** SM-1 has no testable subject (§9) — "a *fresh visitor* locates and sits down at a playing machine by ear alone… within the first minute," but SM-1's measurement seat is the L3 human walk, walked by the builder — who by definition is not fresh (he placed nothing, but he knows the room). As written, the metric has no one qualified to produce its data point. *Fix:* name the instrument — "send the link to Ray (or another same-generation friend) and observe first-minute behavior" — or restate SM-1 as an observation-of-others metric.

## Scope honesty — strong

§7 is a Non-Goals section doing real work: the runtime-LLM ban ("Ever. By thesis"), the no-portal boundary, the deliberate layout-law supersession, and — notably — the *sequencing* honesty on anchors ("This is a sequencing choice, not a permanent no"). Omissions that could be silently assumed are called out in place: FR-16 and FR-10 each carry their own Out-of-Scope blocks; §8's out-of-scope list extends beyond §7 (casual alley, 22-cabinet inventory) and adds a `[NOTE FOR PM]` so the emotionally load-bearing drops aren't lost. The assumption discipline is exemplary for the stakes: five inline assumptions were each confirmed by the owner and §11 keeps them as an audit trail rather than quietly deleting them. Open-items density: 8 OQs, all closed — 6 resolved, 2 deferred-with-revisit-condition (OQ-4, OQ-7/OQ-8) — which on a green-light-to-build PRD is clean, not a blocker. De-scoping (shrine rows, featured pod, phone support) is logged with dates and rationale in the memlog, never done silently.

### Findings
None.

## Downstream usability — adequate

The PRD is chain-top (the pipeline-init skill "stamps the game-build contract and gate criteria into the epic's acceptance," §5), so this dimension carries weight, and it mostly delivers: sections are self-contained with explicit §/FR/OQ cross-refs rather than "see above"; FR↔UJ "Realizes" links resolve; SM "Validates FR-x" links resolve; UJs all have named protagonists with context inline. The soft spot is small glossary discipline gaps — the §3 vocabulary is strong but three terms used as if defined aren't in it, and one defined term drifts in case (details in Mechanical notes). None of these breaks extraction, but a story-author pulling FR-5 alone will meet "Dead Machines" as a capitalized defined term and have to hunt §4.2 to find out it's just inactive cabinets.

### Findings
None beyond the mechanical notes below.

## Shape fit — strong

Hobby/solo stakes with a public consumer surface, and the shape matches both: rigor is concentrated exactly where the PRD says it compounds (registration/layout mechanics, acceptance laws), UJ density is right for a walk-in experience where discovery UX is load-bearing (three UJs, not fourteen personas), and the "invented section" / "adapted-in" labels show a PRD consciously bent to the project rather than bent by the template. The brownfield obligations are met carefully: existing repos are cited with accurate status — Moon Patrol provisional-then-reimplemented, pinball tables "most work today," DragonWar "in progress, not complete, and is one candidate among several" (§4.9) — and the brief's superseded laws are distinguished from its surviving ones (addendum C/D mark floor-plan labels as kept vs dropped). Nothing here reads over-formalized (no ceremonial personas, no compliance boilerplate) or under-formalized for a public site.

### Findings
None.

## Mechanical notes

- **Glossary gaps for in-use terms:** "Live Cabinet" (§4.3, §8 M0) and "Dead Machine(s)" (FR-5 consequence line 135 capitalizes it as a term) are used as if defined but have no §3 entries. Fix: add two short entries or lowercase the usage.
- **Defined-term case drift:** "Game-build contract" (2×, incl. the §3 heading) vs "game-build contract" (4× in FR-6, FR-17, §5). Harmless, but source-extraction for epic acceptance may key on exact strings.
- **FR ID order:** IDs FR-1…FR-17 are unique and gap-free, but FR-16/FR-17 sit between FR-9 and FR-10 (§4.4). Cross-refs all resolve; only a reader scanning for "missing FR-10 under §4.4" could stumble.
- **OQ label coverage:** §10 numbers items 1–8 but only 1, 3, 4, 6, 7, 8 are ever cited in "OQ-x" form; OQ-2 and OQ-5 are never referenced by label anywhere, so a reference like "see OQ-2" has no visible anchor. Fix: prefix §10 items with their OQ-n labels.
- **§0 sentence now stale:** "Assumptions are tagged inline `[ASSUMPTION: ...]` and indexed in §11" — after the final confirmation sweep (memlog: "all 5 remaining assumption tags confirmed") no inline tags remain in the body; §11 correctly self-describes as an audit trail. One word change ("were tagged inline") restores accuracy.
- **"Mid-range laptop" (FR-1)** is the baseline for the ≤60s ceiling but unspecified; acceptable for a guardrail ceiling, architecture will pin a reference machine.
- **Clean:** FR/UJ/SM/OQ counts unique, UJ protagonists named (Josh, Ray, the builder), Assumptions Index entries all traceable to §11's audit-trail role, no duplicate IDs found.
