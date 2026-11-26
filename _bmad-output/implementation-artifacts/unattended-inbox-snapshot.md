# Unattended inbox -- run 20261121T0537Z-1-7

Answer an item with `bash _bmad/scripts/unattended-inbox.sh <this directory> answer U-<n> "<answer>" --by owner`, or run `/epic-cycle --review`. This file is generated: a hand edit is saved aside and never applied.

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

## Holds

### U-1 | hold | Story 1.3 | 2026-11-22T18:55:49Z
question: Run held per your order after Story 1.3 code review (LLM server restart). CR-2 closed the story: 0 HIGH, tracker done; its 4 test-file patches saved as a hold patch; all bookkeeping pushed (origin head df6c218).
options: resume-now: restart the server, then re-invoke /epic-cycle 1-7 --unattended (run applies the hold patch, finishes 1.3: adjudication, re-smoke iteration 2, fresh check, commit) | hold-longer: leave HOLD in place
recommendation: restart the server and re-invoke; nothing else needed
blocks: Story 1.3 close-out and all later stories
answer: (none yet -- answer with the script or --review)

## Resolved
- U-2 | veto | Story 1.8: Score rows on the fallback cabinet face were un-paintable (authored 0.52m face fits 0 rows under the attract block; the spec's cap-4 geometry was wrong). Lead ruled option B: AD-28 — when score rows exist, the attract title yields to them (exactly 2 rows: PB + best Patron run), keeping the Epic-1 AC 'the Cabinet's score table renders read-only' satisfied in Epic 1. -> keep B, proceed (by josh, 2026-11-25T01:38:45Z#9; quoting the owner: "keep B, proceed"); resolved by lead, 2026-11-25T02:19:59Z -- 971fc93 veto kept: AD-28 attract-yield law stands; story 1.8 closed done

<!-- journal: 13 lines -->
