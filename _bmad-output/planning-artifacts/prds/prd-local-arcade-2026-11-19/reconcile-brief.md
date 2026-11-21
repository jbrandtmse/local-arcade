# Input Reconciliation: brief.md + idea.md → prd.md + addendum.md

Run: 2026-11-19 PRD finalization, input-reconciliation pass.
Inputs read: `_bmad-output/planning-artifacts/briefs/brief-local-arcade-2026-11-18/brief.md`, `idea.md`.
Target read: `prd.md`, `addendum.md`, plus `.memlog.md` (override audit) in this folder.

Status legend: **CAPTURED** (in PRD/addendum), **SUPERSEDED*** (logged override or memlog decision — not a defect), **GAP** (brief content vanished with no logged decision), **UNLOGGED-DEPARTURE** (PRD changes brief content but §0's "departures are logged" promise is not met).

---

## 1. idea.md — extraction

| Idea claim | Status | Where in target |
|---|---|---|
| First-person perspective, walk in, look around until the perfect machine, play switches to selected game | CAPTURED | §1, UJ-1, FR-1, FR-6 |
| Growing arcade: new games placed automatically when finished, via yaml/json config | CAPTURED | §1 growth thesis, FR-8 (Manifest), Layout System |
| Build on the 2026-11-18 brainstorm session | CAPTURED | §0, addendum E |
| Publicly hosted website on a DigitalOcean droplet | CAPTURED | §1, §6, §2.2 |
| "Up the perplexity mcp to research them" (tooling hint) | CAPTURED in spirit | Addendum A web-research landscape; §6 cites research findings |

No gaps from idea.md; every intent statement maps to a PRD mechanism.

## 2. brief.md — extraction and classification

### Executive summary / voice
- Working title, marquee may change — CAPTURED (PRD header).
- The "short version, for people" tagline (walk in, find by attract-mode sound, real 80s game, all built by local LLMs, nothing AI at runtime, "we add machines whenever we finish one") — CAPTURED in substance across §1 (every clause has a PRD home; tagline-as-such is brief voice, not a requirement).
- "The room is deliberately too big to take in at once; the seeking is the first-visit experience; finding the cabinet you remember is the visit's first hero moment" — CAPTURED (§4.1 "intentionally too-big-to-take-in-at-once footprint"; §1 "find a game the way you did as a kid… by ear"; addendum E verbatim law).
- Build-time-only local LLMs, deterministic runtime, "fixed recording… reproducible, offline-provable" — CAPTURED (§1, §6, L1 sealed-build/determinism in FR-17).
- Verifiability in-world: instruction cards behind coin doors, open workshop door reading the real repo — CAPTURED (FR-9, FR-12).

### The Problem (four peak memories / jobs)
- Re-experience — CAPTURED (§2.1).
- Rediscovery ("depth, not just the famous ten") — CAPTURED (§2.1; depth carried forward as growing wall + SM-C1 quality-over-count).
- Hero moment (finish Dragon's Lair with a crowd watching) — CAPTURED (§2.1, addendum F, §7 anchor note).
- **Put me inside** (sit in the cockpit, fly the X-wing, hear R2-D2; building-scale sit-down cabinet) — CAPTURED only in addendum F + §7 PM note + FR-11 sit-down shells; **dropped from the §2.1 JTBD list**, which replaced it with the invented "Proof-of-craft" job. Because addendum F is an explicit "record of what a requirements doc silently drops" and the anchor PM note says "revisit after M6, don't drop from memory," this is judged captured-with-caveat, not a gap.
- "What exists gives you the game but not the arcade… no 'this one's busy, you can't play yet'" — the busy-machine texture: see GAP-1 below.

### The Solution (design laws)
- Free walk-in, no guided play, no forced order; the crowd of machines is the content — CAPTURED (§1 "The room is the interface", UJ-1, addendum E).
- Find-by-ear; pull-signal order sound → attract light → player intensity — CAPTURED (FR-3, glossary, addendum E).
- No dead machines; motion/light/sound as life systems — CAPTURED (FR-5, §4.2, L1 liveness hook).
- Cabinet + player one causal system; headless games playable alone; reaction library flinch/slam/jump; drama readable across the room — CAPTURED (FR-4 + 1:1 event causality consequence; "headless" renamed to Patron/Auto-play, logged in memlog).
- Room-as-timeline (shrine, year rows, featured pod + unveiling) — SUPERSEEDING*, logged (memlog override, addendum C, §7). Featured/unveiling role explicitly absorbed by Layout System. Do not flag.
- Config-driven growth as v1 requirement, pipeline not hand-placement — CAPTURED (FR-8, FR-10, §5).
- Found, never announced; marquees game-names-only; attribution on card behind coin door — CAPTURED (FR-9, character lint L2, addendum F) — but see GAP-2 for the nameplate exception.
- Workshop as discovery (commit log, BMAD plans as paper, bench at true build state) — CAPTURED (FR-12, glossary).
- Hall of Models: ~15 tables from one shared prompt, headline exhibit, present early — CAPTURED (FR-14, M3).

### What Makes This Different
- Thesis: local LLMs as builders; runtime deterministic, provable — CAPTURED (§1, §6).
- Design laws as acceptance tests, enforceable in review — CAPTURED (FR-17, §5 CI philosophy).
- Existing artifacts (moonpatrol, pinball, dragonwar) — CAPTURED (addendum B, with DragonWar corrected to in-progress — logged decision).
- "Honest moat: authorship, taste, and the fact that it exists" — CAPTURED (addendum F).

### Who This Serves
- Builder-as-first-visitor primary; friends/family + local-LLM-curious secondary ("walking through it rather than being told about it") — CAPTURED (§2.1, §2.2, §11).

### Success Criteria
1. First minute is the product; door → daze at overwhelming room → cabinet you remember, by ear, no UI hints — CAPTURED (SM-1, UJ-1; the "daze" beat survives softly as "obviously-empty stretch… too-big footprint" and UJ-1 path; acceptable).
2. Screenshot test + no dead cabinet — CAPTURED (FR-5, SM-C2, L2 proxy).
3. Two real games behind living patrons — CAPTURED (M0–M2, FR-6). "At least one golden-age shrine cabinet physically placed" — SUPERSEDED* with the layout override (logged; shrine rows removed). **But "the busy/queue/NEXT ritual working" is a GAP — see GAP-1.**
4. New machine joins via config entry — CAPTURED (SM-2, FR-8).
5. Workshop truthfully reflects repo — CAPTURED (FR-12, M4).
6. Laptop + phone — SUPERSEDED*, logged (OQ-3, memlog override, §8). Do not flag.
7. Donation surface: tip jar, BMC, crypto; in-world interaction not web-form popup — CAPTURED (FR-13 "diegetic… never breaks character").
8. Personal bar + "the short version above makes people want to walk in" — half captured (SM-4), half GAP — see GAP-4.

### Scope (in/out)
- v1 in-scope items all map to M0–M6 in §8; attract life system → FR-17 liveness. CAPTURED.
- Out: 22-cabinet wall, heavy anchors (reframed as future epics — logged memlog), casual alley (kept with "emotionally load-bearing, revisit" PM note — CAPTURED), multiplayer (OQ-7), LLM-invented tables + monthly reveals (out, §8), runtime LLMs forever, model names on marquees/signage forever — all CAPTURED except the Hall-of-Models nameplate exception: see GAP-2.

### Open Questions (brief)
- Multiplayer co-presence → OQ-7 closed with deferral. CAPTURED.
- Phone performance budgets → mooted by desktop-only override; concrete budgets deferred to architecture. CAPTURED (§6).
- Snack-bar diegetic treatment *after* bare v1 surface — UNLOGGED-DEPARTURE (minor): PRD M5 pulls the "deterministic attendant" and counter-play framing into v1 itself. Change is in the generous direction and consistent with the brief's dream, but no memlog entry records promoting it; the brief's sequencing question silently vanished. See GAP-5.
- Marquee name: freeze before public hosting, or stay "Local Arcade"? — GAP — see GAP-3.

### Vision (post-v1)
- Deep cuts / cockpits / anchors fill the wall (timeline part superseded; anchors kept as future epics), pinball physics playable (M6), custom tables unveiled monthly with visitor-proposed themes, human crowds eventually — mostly CAPTURED as out-of-scope/future markers; the monthly-reveal + visitor-proposal specifics are not restated in the PRD but the brief itself put them out of v1, and §7/§8 mark the set as out-of-scope rather than abandoned. Not a v1-PRD gap; noted for the record.

---

## 3. GAPS (most important first)

**GAP-1 — The busy/queue/NEXT ritual (visitor side) silently vanished.**
Brief Problem: the arcade has "'this one's busy, you can't play yet'"; Success Criterion 3 explicitly requires v1 to have "the busy/queue/NEXT ritual working." The PRD keeps only the *machine/patron* side (FR-4 "designated busy machines," M0 "the 'busy' rule") and never states what a *visitor* experiences at a busy cabinet: whether it's playable, whether there's a wait/queue/NEXT moment, or what "designated busy" constrains. FR-6 says any Cabinet can be sat down at with no busy-gating. No memlog entry logs dropping or resolving the ritual. This is both a functional hole (FR-4's "designated busy" is undefined against FR-6) and an emotional one (the busy-machine crowd texture is one of the four peak memories' supporting details).

**GAP-2 — Hall of Models nameplates contradict the brief's "out forever" law, and the exception was never logged.**
Brief: "Model attribution lives on an instruction card… Model names on marquees or room signage — out forever: the arcade never breaks character." The PRD (glossary, FR-9, §7) introduces explicit model-nameplates on the Hall of Models row ("museum, not guessing") and carves them into the character-lint rule. This is a real departure from a brief law the brief marked *forever*, yet §0 promises departures are logged and neither the memlog nor addendum C contains an entry for the nameplate exception — addendum E even restates the brief law verbatim *without* the exception, so the target documents disagree with each other. Needs either a one-line memlog decision or removal.

**GAP-3 — The marquee-name open question vanished.**
Brief Open Question: "Do we freeze a marquee name before public hosting, or let it stay 'Local Arcade' until a better one walks in?" The PRD §10 closed all eight OQs but none of them is the naming question; the PRD header keeps "may change" without the decision point (name freeze before public hosting). Since the PRD adds "open to the public" as a new posture, the naming question became *more* relevant, not less, and silently disappeared.

**GAP-4 — SM-4 lost its second half: "the short version makes people want to walk in."**
Brief Success Criterion 8 has two clauses: it feels like the memory, AND the one-line short version makes people want to walk in. PRD SM-4 keeps only the feel clause. The want-to-walk-in clause is the only success criterion covering the *public* audience's pull (the builder's feel-judgment can't measure that), which matters more now that the site is public per §2.2. Small, but it's a qualitative goal the FR structure dropped.

**GAP-5 (minor) — Snack-bar sequencing changed without a log.**
Brief v1: bare donation surface; the diegetic attendant/counter-play treatment was an open question for *after* v1. PRD M5/FR-13 now include "deterministic attendant" and counter reframing inside v1. Almost certainly an intentional improvement, but it flips a brief boundary and no memlog entry records it. One memlog line would close it.

## 4. Items checked and cleared (no flag)
- Timeline layout, shrine, year rows, featured-pod unveiling — logged override (memlog, addendum C, §7).
- Laptop+phone → desktop-only — logged override (memlog OQ-3, §8, §11).
- "Headless" → "Patron / Auto-play session" wording — logged memlog.
- Moon Patrol provisional → re-implement to contract — logged decision.
- Anchors "not in v1" → "future epics, sequencing not permanent" — logged change; PM note keeps the emotional weight.
- Casual alley deferred with "emotionally load-bearing — revisit post-M6" — preserved, matches addendum D/F.
- Perplexity-research hint — addendum A satisfies it.

## 5. Recommended dispositions
1. GAP-1: add a visitor-side busy rule (either "busy cabinets cannot be sat at; a queue/NEXT beat exists" or "busy is decorative in v1, ritual deferred" — either way make it an explicit FR/OQ with a memlog line).
2. GAP-2: log the nameplate exception in memlog and amend addendum E's verbatim law so the two target docs agree.
3. GAP-3: re-add as OQ-9 (marquee freeze at public launch) or close it explicitly.
4. GAP-4: extend SM-4 wording or add the want-to-walk-in clause to SM-1's validation of the public first visit.
5. GAP-5: one memlog line ("promoted attendant into v1 M5").
