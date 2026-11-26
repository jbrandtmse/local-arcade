# Unattended inbox -- run 20261121T0537Z-1-7

Answer an item with `bash _bmad/scripts/unattended-inbox.sh <this directory> answer U-<n> "<answer>" --by owner`, or run `/epic-cycle --review`. This file is generated: a hand edit is saved aside and never applied.

**Hold requested 2026-11-26T04:26:21Z: owner: review Epic 1 before Epic 2 plan spawn**

## Parked

### U-3 | parked | DW-8 | 2026-11-26T02:35:25Z
question: Should the lint-bans banned SET for sim-path code be widened beyond its current contents (the set itself is owner-only per DW-8 posture; 1.10 hardened the FORMS the scanner binds, not the set)
options: widen now (with fixtures per API); keep current set; decide per-API
recommendation: decide together with DW-39 - same law surface; current set keeps every gate green
blocks: nothing in-run; gates green with current set
answer: (none yet -- answer with the script or --review)

### U-4 | parked | DW-39 | 2026-11-26T02:35:26Z
question: Wall-clock ban binds .now calls only: Date.parse, Date.UTC and performance.timeOrigin pass the sim-path scan (med finding, story 1.10 CR) - widen the set to close these, or accept the current net?
options: widen set (owner-only, same rule as DW-8); accept current net; per-API carve
recommendation: pair with DW-8 into one owner decision on the banned-set surface
blocks: nothing in-run
answer: (none yet -- answer with the script or --review)

### U-5 | parked | DW-25 | 2026-11-26T02:35:26Z
question: Upstream moonpatrol repo (C:/git/moonpatrol) still needs the fix commit the vendored copy waits on - upstream writes are owner-only
options: commit upstream; leave vendored copy as-is; schedule for next Game-factory pass
recommendation: leave as-is until the Game-factory epic passes; the vendored copy compiles and passes all gates now
blocks: nothing in-run
answer: (none yet -- answer with the script or --review)

## Veto window

### U-7 | veto | Epic 2 | 2026-11-26T03:02:40Z
question: readiness re-check at Epic 2 start: CONCERNS carried from launch - Story 2.6 (M1 human walk: SM-1 both variants, mandatory Deaf/HoH + low-vision participants, non-sighted spike, vestibular report) cannot be executed by the unattended run - it needs human participants only the owner can recruit; milestones=[] so any AC move is owner-only
options: proceed: 2.0-2.5 build unattended, 2.6 stops as a human-participant need when reached (you get an inbox item then) | recruit testers mid-run while 2.0-2.5 build | move the automatable 2.6 checks (color-blind 6m geometry, random-frame posture) into earlier stories
recommendation: proceed as-is - 2.0-2.5 are unblocked; recruit participants in parallel so 2.6 has the best chance to run in-epic
blocks: Story 2.6 only; nothing before it
answer: (none yet -- answer with the script or --review)

## Holds

### U-1 | hold | Story 1.3 | 2026-11-22T18:55:49Z
question: Run held per your order after Story 1.3 code review (LLM server restart). CR-2 closed the story: 0 HIGH, tracker done; its 4 test-file patches saved as a hold patch; all bookkeeping pushed (origin head df6c218).
options: resume-now: restart the server, then re-invoke /epic-cycle 1-7 --unattended (run applies the hold patch, finishes 1.3: adjudication, re-smoke iteration 2, fresh check, commit) | hold-longer: leave HOLD in place
recommendation: restart the server and re-invoke; nothing else needed
blocks: Story 1.3 close-out and all later stories
answer: (none yet -- answer with the script or --review)

## Retrospectives to review

### U-6 | retro | Epic 1 | 2026-11-26T02:57:07Z
question: headless retro verdict accepted-with-open-items (doc epic-1-retro-2026-11-26.md): 10/10 merged, suite 365, 1 cross-seam LOW folded into DW-30 (owner 3-15); 3 new action items open in tracker: (1) falsifiable-pin convention into _bmad/custom/skill-rules.md [owner-only file], (2) raise API_TIMEOUT_MS / inference-server slots for 4-layer CR [owner launch env], (3) tracker no-touch clause in every spawn prompt [lead, in practice since 1.8]
options: keep all three; drop individual items; answer per-item in --review
recommendation: keep all three - 1 and 2 cost real pipeline capacity this epic
blocks: nothing in-run
answer: (none yet -- answer with the script or --review)

## Resolved
- U-2 | veto | Story 1.8: Score rows on the fallback cabinet face were un-paintable (authored 0.52m face fits 0 rows under the attract block; the spec's cap-4 geometry was wrong). Lead ruled option B: AD-28 — when score rows exist, the attract title yields to them (exactly 2 rows: PB + best Patron run), keeping the Epic-1 AC 'the Cabinet's score table renders read-only' satisfied in Epic 1. -> keep B, proceed (by josh, 2026-11-25T01:38:45Z#9; quoting the owner: "keep B, proceed"); resolved by lead, 2026-11-25T02:19:59Z -- 971fc93 veto kept: AD-28 attract-yield law stands; story 1.8 closed done

<!-- journal: 16 lines -->
