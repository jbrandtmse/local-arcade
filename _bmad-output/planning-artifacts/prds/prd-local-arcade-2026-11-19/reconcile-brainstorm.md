# Reconciliation: brainstorm session → PRD (finalization pass)

**Inputs:** `brainstorm-intent.md`, `session-digest.md`, `v1-cut-list.md`, `arcade-floor-plan.html` (structural claims) — all from `_bmad-output/brainstorming/brainstorm-local-llm-arcade-2026-11-18/`.
**Target:** `prd.md` (snapshot as of 2026-11-19 13:41 — mid-run edits visible: queue/NEXT recovered into FR-4, FR-10 fill direction amended back→front, SM-5 added, OQ-9 added) and `addendum.md` (12:48).
**Method:** every kept design law, M0–M6 element, acceptance rule, and floor-plan structural element classified CAPTURED / SUPERSEDED-LOGGED / GAP. Per the run log, the timeline / shrine / featured-pod removals are logged overrides (PRD §7, addendum C) and are **not** flagged as gaps.

---

## 1. Design laws — disposition

| Law (source) | Disposition | Where in PRD |
|---|---|---|
| No guided play / no forced order | CAPTURED | §1 ("no menu… room is the interface"), glossary Find-by-ear ("no guided order"), addendum E |
| No dead machines; motion/light/sound are life systems | CAPTURED | FR-5, glossary Live/Dead Machine, L1/L2 checks, SM-3 |
| Screenshot test | CAPTURED | FR-5, SM-C2 (framerate-qualified), L2 proxy |
| Cabinet+player one causal system | CAPTURED | FR-4 (reactions 1:1 with auto-play events), L2 Patron causality probe |
| Headless rule (every machine playable by an agent alone) | CAPTURED | Auto-play session glossary, contract `autoplay(seed)`, L1 |
| Found, never announced | CAPTURED | FR-9, L2 character lint, glossary Instruction Card |
| Find-by-ear pull-signal ladder (sound → attract graphics → player intensity) | CAPTURED | glossary, FR-3 consequence; **detail degraded — see Gap 4** |
| Room too big to take in at once; broken sightlines; entry never shows whole room | CAPTURED | §4.1, FR-2, addendum E |
| Room is a timeline (year rows, shrine, featured pod) | SUPERSEDED-LOGGED | §7, addendum C — not flagged |
| Pinball corner runs its own EM→DMD→modern→custom timeline | SUPERSEDED-EXPLICIT | addendum D: "decorative era-flavor, not required" — explicitly downgraded, not silent |
| Body language is a broadcast channel (drama readable from across the room) | **GAP** | Gap 4 |
| Anchor audio: Pac-Man/Galaga themes as room identity + PA; pinball named anchors (gong, SPIKE CHILLER, Earthshaker rumble) | **PARTIAL GAP** | Gap 3 |

## 2. Acceptance rules (cut list, six gate-all-milestones rules)

All six appear in addendum E verbatim and are operationalized in FR-17 (L0–L3) + SM-1/SM-3/SM-4. Every law has a checker or a named seat in the human walk. **No gaps at this level.** One health warning already self-flagged in PRD (FR-17 note): numeric thresholds for the framerate floor and Patron reaction window unset, so the no-dead-machines law is not yet CI-enforceable until M2 — consistent, not a gap.

## 3. M0–M6 elements — disposition

| Milestone element (v1-cut-list) | Disposition |
|---|---|
| M0: 3D walk-in shell, door, free look/move, no forced order | CAPTURED (FR-1) |
| M0: Moon Patrol integration | CAPTURED (FR-6, provisional + reimplementation logged) |
| M0: cabinet alive (marquee, attract) | CAPTURED (FR-3, FR-17 attract()) |
| M0: one patron playing headless with authored reaction library | CAPTURED (FR-4; "authored library, deterministic" implicit in sealed-build + events) |
| M0: busy rule ("busy right now, you can't play yet") | CAPTURED (FR-4: busy is texture not lock; visitor may wait/take over at round break) |
| M0: screenshot test from entry position | CAPTURED (FR-5 + SM-1 human walk) |
| M1: spatial occluded attract audio, audible around corners | CAPTURED (FR-3) |
| M1: room breaks sightlines; entry moment never shows whole room | CAPTURED (FR-2, §4.1) |
| M1: attract as reusable life system every cabinet inherits | CAPTURED (contract `attract()` + FR-3) |
| M1: dev "alive check" gating each placement | CAPTURED (L2 dead-machine detector; Registration refuses red gate) |
| M1: walk verification, locate by ear, no UI hints | CAPTURED (SM-1, L3) |
| M2: second cabinet end-to-end through local-LLM pipeline | CAPTURED (§8 M2, SM-2, UJ-3) |
| M2: queue/NEXT ritual — **waiting patron takes over, "busy" lifts** | PARTIAL — visitor-side ritual recovered into FR-4 (mid-run edit); the **patron→patron handoff** ("a waiting patron takes over") is not represented; Patrons are one-per-machine in the PRD's model |
| M2: banter between nearby patrons (fixed authored dialogue trees, near-beacon) | **GAP** — Gap 1 |
| M2: shrine row layout (≥1 anchor placed) | SUPERSEDED-LOGGED |
| M2: featured pod holds newest | SUPERSEDED-LOGGED (absorbed by Layout System, §8) |
| M2: instruction card behind coin door; marquees = game names only | CAPTURED (FR-9) |
| M3: row of ~15 model-built tables | CAPTURED (FR-14) |
| M3: explicit nameplates ("museum, not guessing") | CAPTURED (FR-14, FR-9 exception) |
| M3: shared prompt as findable in-world artifact | CAPTURED (FR-14) |
| M3: unplayable cabinets still perform (no dead machines pre-physics) | CAPTURED and strengthened (M3 liveness-hook requirement, §8) |
| M3: card per table, pairing with its plans in the workshop drawer | **GAP** — pairing dropped, Gap 2 |
| M4: open door, desk plans, monitor, still-warm chair | CAPTURED (chair is flavor, trivially absent) |
| M4: git log as work log; BMad plans as diegetic paper (spread-open / boxed+dated) | CAPTURED at summary level (glossary Workshop, §4.7) |
| M4: bench lifecycle staging (chalk outline → skeleton → TESTED → crate) | CAPTURED at one-line level ("bench staged to the real build lifecycle"); the staged states themselves live only in the cut list |
| M4: test status drives the bench (tests-green → first attract on bench) | **GAP** — Gap 2 |
| M4: plans on desk for a not-yet-built machine (in-world foreshadowing) | **GAP** — Gap 2 |
| M4: repo change → room change, no re-authoring | CAPTURED (FR-12; "within one build" added) |
| M5: diegetic counter, rails hidden | CAPTURED (FR-13; "rails hidden" phrasing dropped, trivial) |
| M5: tip jar CLINKS into soundscape (donation audible, found by ear) | CAPTURED (§4.8 "tip jar that clinks"; "audible in the soundscape" nuance softened) |
| M5: BMC ordering; crypto links; nothing more | CAPTURED (FR-13, with provider-completion caveat added) |
| M5: attendant deterministic, fixed authored order lines, no runtime LLM | CAPTURED (§4.8, §8 M5, §6) |
| M6: engine decision recorded as real BMad story (dogfooding) | CAPTURED (FR-15, OQ-4; DragonWar corrected to "in progress") |
| M6: one table playable by human AND auto-play (headless applies to pinball) | CAPTURED (FR-15) |
| M6: pinball attract = sound+motion (clacks, bells, flipper volleys), corner findable by ear | PARTIAL — §4.9 keeps only "gong, tables that run"; see Gap 3 |
| M6: two tables side by side | CAPTURED (FR-15) |
| M6: EM→modern corner timeline laid out | SUPERSEDED-EXPLICIT (addendum D downgrade) |

## 4. Floor-plan structural elements

| Element | Disposition |
|---|---|
| Front door bottom-center, sound spills out | CAPTURED (UJ-1 "sound already spilling out", §1; addendum D) |
| Pillars deliberately break sightlines (+sound occlusion) | CAPTURED (FR-2 consequence, FR-3) |
| Zones: Pinball Corner, Snack Bar, Workshop (casual alley deferred) | CAPTURED (glossary Zone, addendum D mapping; casual alley out-of-scope with PM revisit note) |
| Patron markers = busy machines | CAPTURED (FR-4) |
| Empty stretch near door = roadmap | CAPTURED and adapted — FR-10's back→front fill amendment explicitly re-anchors the roadmap stretch near the door ("matching the floor plan's empty stretch near the door") |
| Workshop-desk plans foreshadow upcoming launches (roadmap note) | **GAP** — the foreshadowing half of the roadmap mechanic is stranded when the pod died; Gap 2 |
| Year ruler / shrine / pod labels | SUPERSEDED-LOGGED |
| "The timeline scales: every themed corner is a museum of its own tech" | SUPERSEDED with the layout override; pinball corner explicitly downgraded in addendum D — acceptable |

## 5. Silent gaps (the findings)

### Gap 1 — Patron banter dropped from M2 scope (most important)
Cut list M2: "Banter between nearby patrons is fixed authored dialogue trees triggered by game events (drama readable from across the room as a near-beacon)." The session digest's headline flavor — "the arcade talks, and it's never the same conversation twice" — was already cut down to authored trees, and even the authored trees are absent from the PRD: §8 M2 doesn't list them, no FR covers them, and the pull-ladder restatements (glossary, FR-3) truncate "player intensity" to the bare term, losing the source's "(jerking on controls, talking, bantering)". This is v1 scope in the cut list, not an override — the only logged overrides are timeline/shrine/pod. Verdict: **silent GAP**; either restore to M2 or log an explicit deferral.

### Gap 2 — Workshop (M4) compressed to a single FR; its richest acceptance mechanics dropped
FR-12 says only "repo change → room change." Four cut-list M4 mechanics are gone without a logged decision: (a) **test status drives the bench** (tests-green → first attract mode running on the bench) — the strongest truthfulness proof after git log; (b) **plans on the desk for a not-yet-built machine** — in-world foreshadowing, and the only thing that connected the workshop to the roadmap/roadmap-stretch after the pod died (floor-plan roadmap note ties them together); (c) **instruction card ↔ its plans in its drawer** showroom↔workshop map (cut list M3 + M4 + floor-plan workshop note all carry it — FR-17 even cites "pairing later" is gone); (d) the **blocked state** ("ON HOLD" brick, brainstorm-intent) and the paper-state vocabulary (spread-open / boxed+dated) live only in the glossary shorthand. FR-12's single sentence under-specifies the milestone whose whole point is richness.

### Gap 3 — Anchor-audio identity stranded by the shrine removal, never re-anchored
"Pac-Man and Galaga themes are the room's identity and PA system" (intent + digest) died with the shrine override, but the override was about *placement*, not about the room having signature sounds; nothing in PRD/addendum carries the identity-audio idea forward even as future flavor (addendum F, the emotional record, doesn't mention it). For pinball, only the "gong" survives in §4.9; "SPIKE CHILLER", Earthshaker's rumble, and the M6 item "pinball attract = sound + motion: clacks, bells, flipper volleys — the pinball corner is findable by ear" are not carried as requirements (general FR-3 covers cabinets; FR-14/15 say nothing about pinball attract sound). Verdict: partially a casualty of a logged override, but **silently** — no deferral note anywhere.

### Gap 4 — Broadcast-channel law and patron-queue mechanics degraded
(a) "Body language is a broadcast channel — drama readable from across the room" (floor-plan rules, digest, and M2 parenthetical) is the *near-range beacon* that makes busy machines findable when sound is occluded; the PRD keeps player intensity in the ladder name but never requires reactions to be visible/legible at distance. (b) M2's queue/NEXT as recovered into FR-4 is visitor-side only; the cut-list ritual "player finishes, a **waiting patron** takes over, 'busy' lifts" — patrons queuing behind each other — is not in any FR, and the PRD's Patron model implies one patron per machine. Minor but load-bearing for "the room is alive."

### Gap 5 — Snack-bar donor-presence flavor dropped without note (low weight)
"Names on the cooler — 'this month's coffees = 40 hours of Galaga lit'" (floor-plan snack note) was already labeled "direction, not v1 scope" in brainstorm-intent, so its absence from v1 scope is fine; but unlike the casual alley and heavy anchors, it received no revisit note or addendum-F entry, so it will fall out of memory. Same category: "hundreds of machines played by locals when nobody's watching" flex, and the coach's seed minute (Galaga intermission tune, "you gonna play, or just watch?").

## 6. Qualitative-flavor ledger (dropped vs deferred)

- **Deferred with a note:** heavy anchors + put-me-inside (addendum F, §7 PM note), casual alley (§8 PM note), multiplayer (OQ-7), leaderboards (OQ-8), pinball corner era-timeline (addendum D). Healthy.
- **Dropped silently:** patron banter (Gap 1), workshop drawer-map / foreshadow-plans / test-driven bench (Gap 2), anchor/PA audio identity + named pinball sound anchors (Gap 3), broadcast-channel readability + patron→patron queue (Gap 4), donor presence on cooler and seed-minute flavor (Gap 5).
- **Recovered mid-run (evidence the pass is converging):** queue/NEXT visitor ritual into FR-4, SM-5 word-of-mouth metric, OQ-9 marquee name.

## 7. Recommended disposition

Not edits (this pass writes no PRD changes):
1. Add banter to FR-4 or §8 M2 (one clause: "authored patron dialogue trees triggered by game events; drama legible from across the room — the near beacon"), or log the cut explicitly.
2. Expand FR-12's consequences with test-status-drives-bench, unbuilt-machine plans (foreshadowing the roadmap stretch), and card↔drawer plan pairing; or defer each explicitly.
3. One addendum-F line preserving anchor/PA audio identity and the named pinball sound anchors as future flavor.
4. One clause covering reaction legibility at distance and patron→patron takeover when a patron's game ends.
5. Optional: fold donor-presence flavor into the snack-bar revisit note.
