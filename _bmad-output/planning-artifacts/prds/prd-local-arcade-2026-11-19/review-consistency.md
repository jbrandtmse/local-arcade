# Adversarial Consistency Review — Local Arcade PRD

Reviewer: consistency gate. Inputs: `prd.md`, `addendum.md`, `.memlog.md` (all in this folder). Date: 2026-11-19.

## Verdict

The PRD is broadly coherent and the memlog audit trail is largely honored, but it contains two genuine internal contradictions in FR-10 (the layout determinism law), one false claim in §0 about departures from the brief, and several glossary-discipline violations — fixable by wording edits, not re-decisions.

## Findings (by severity)

### F1. FR-10 contradicts itself on fill direction vs. "newest near door" — HIGH

FR-10 v1 rules state registrations "fill slots **front→back**, alternating left/right wall" and then "the **newest machines sit nearest the door**, which doubles as the visible roadmap stretch." If the pool is filled front→back, the *first* registrations occupy the slots nearest the door and the *newest* machine always lands farthest from the door — the opposite of the stated outcome, and the empty "roadmap stretch" would be at the front, not visible as growth behind the newest machines. UJ-2 ("finds the newer stretch of wall") and UJ-3 ("the next empty stretch of wall is obvious") assume the PRD's stated (contradictory) reading. Note: the memlog OQ-1 entry carries the same contradiction ("fills front-to-back ... newest near door"), so the decision log itself is ambiguous — the resolution walk never noticed it. Either the fill rule is back→front, or "newest near door" is wrong. This must be pinned before the architecture run; it is the placement law FR-17's room audit will enforce.

### F2. FR-10 determinism claim: "same registration history" vs. "same Manifest set" — HIGH

FR-10 body: "the same **registration history** yields the same room." FR-10 consequence (testable): "the same **Manifest set** always produces the same layout." These are not equivalent. Fill order is order-dependent (front→back by registration sequence), so the same *set* of manifests registered in a different *order* yields a different layout. As written, the testable consequence is false and unfalsifiable as a determinism test; the body's wording is the correct one. Fix: make the consequence read "same registration order/history produces byte-identical layout."

### F3. §0's "one material departure" claim is contradicted by the PRD itself — MEDIUM

§0: "Where this PRD departs from the brief, the change is logged in the run memlog; **the one material departure** is the removal of the chronological room layout." But the PRD repeatedly and explicitly marks a *second* material departure: §4.1 and §8 and §10-3 all say desktop-only "**supersedes the brief's 'laptop + phone' criterion**" — a superseded brief *success criterion*, recorded in the memlog as an `(override)`, not a clarification. Arguably a third: the public-website posture (§2.2, §6) is logged in the memlog as a *new* NFR section, and the PRD header itself labels §6 "adapted-in." §0 should say "the material departures are: chronological layout removed; phone/tablet criterion superseded (public-site posture added)."

### F4. Glossary discipline violations (against §0's "defined in §3 and used verbatim throughout") — MEDIUM

- **"Live Cabinet" / "Live" used but never defined**: §4.3 ("integrated as a Live Cabinet for M0"), §4.4 ("the Cabinet appears in a wall slot, Live, credited"), §8 M0. Not in §3; its meaning (attract running? contract-conformant? registered?) is load-bearing for the no-dead-machines law.
- **Synonym drift on score persistence**: FR-7 body says "**high scores** persist"; its consequence says "a returning visitor sees their **personal bests**"; §10-8 says "personal bests per-browser." The Visitor glossary entry says "score continuity." Pick one term.
- **Identity drift**: glossary Visitor — "identified only by an anonymous **cookie**"; FR-7 — "cookie **/ local-storage** identity"; §6 — "anonymous local identifier." Three formulations of one mechanism.
- **Dead Machine** capitalized as a named defect class in FR-5's consequence ("zero Dead Machines") but never defined in §3 (only described in FR-5's body).

### F5. Attract-mode law vs. presentation-only Hall of Models: reconciled, but only in FR-17, not in M3 — LOW

FR-5 ("every visible Cabinet active... a dead machine is a defect") vs. FR-14 ("Presentation-only; tables unplayable at M3") looks like a direct conflict. It *is* resolved — FR-17's last consequence and addendum G's "Rebuild implication (accepted)" require presentation tables to carry liveness hooks ("a presentation table that doesn't tick is a dead machine by law"). But §8's M3 line ("Hall of Models row, presentation-only") never mentions the liveness-hook work, and addendum B says "most tables work today," which invites the assumption that no contract work is needed at M3. Add the hook requirement to the M3 scope line so the milestone can't pass with dead tables.

### F6. Stale meta-claim in §0 about assumption tags — LOW

§0: "Assumptions are tagged inline `[ASSUMPTION: ...]` and indexed in §11." No `[ASSUMPTION:` tag survives anywhere in the document (all closed per §11 and the memlog's "all 5 remaining assumption tags confirmed"). Present-tense framing is now false; reword to past tense or the tag convention reads as missing evidence. (Memlog's "13 FRs across 8 features" event is consistent — FR-16/FR-17 were added by later logged decisions; no issue there.)

## Checks that passed

- **FR IDs**: FR-1..FR-17, all unique; no duplicates. Out-of-order placement (FR-16/FR-17 inside §4.4 before FR-10 in §4.5) is cosmetically odd but intentional (late-decision FRs kept their numbers) — acceptable, not an error.
- **Memlog fidelity**: FR-7/OQ-8 cookie persistence, Patron/Auto-play rename (incl. the "headless" engineering note), 5-skill pipeline (3→5 growth logged), FR-11 two shells, FR-17 four-layer gate, OQ-6 native-modules-not-iframes, OQ-2 lifecycle/no-moves, rebuild implication, UJ-2 "no built-in screenshot feature" — all appear in the PRD as decided. OQ-4's deferred-with-condition status is consistent across §4.9, §8, §10-4, §11, and memlog.
- **Cross-references**: OQ-1..OQ-8 referenced (§3 Manifest/Game, §4.1, §6, FR-7, §7, §8) all resolve to §10 items; resolved items are struck through and none are cited as open; "addendum G"/"addendum A" exist; FR-16 cited by the Manifest glossary exists; SM-1/SM-4 seats in L3 human walk match §5 and addendum G.
- **UJ/FR chains**: UJ-1 (FR-1..7), UJ-2 (FR-2, 6, 9, 13, 14), UJ-3 (FR-8, 10, 12, 16, 17) are coherent; SM-2 validates FR-8/FR-10 correctly.

## Recommended fixes (minimal edits)

1. FR-10: pick fill direction and state it once — e.g. "registrations fill **back→front** (newest nearest the door)" or drop "newest near door"; amend memlog OQ-1 reading in the run record.
2. FR-10 consequence: "the same registration **history** (order) always produces the same layout."
3. §0: "the material departures from the brief are the chronological layout (see §6/§7) and the desktop-only platform criterion."
4. Add **Live Cabinet** to §3; unify high-scores/personal-bests and cookie/local-storage wording; define Dead Machine or lowercase it.
5. §8 M3: append "tables must carry contract liveness hooks (FR-17) or they are dead machines by law."
6. §0: reword the inline-tag sentence to reflect that all tags were closed.
