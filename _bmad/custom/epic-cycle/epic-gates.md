> Section file of `/epic-cycle`. It is part of the command and binds you as the command does. A quoted section name, or a `Rule SC-n`, that is not in this file is found through the Section Index in `.claude/commands/epic-cycle.md`.

### Sprint Planning Per Epic (Critical Gate)

Before processing any stories for an epic:

1. Execute `/bmad-sprint-planning` directly via the `Skill` tool, **headless** — the skill defines no flag for this; pass the words `headless, intent sprint-planning` as its argument (its `## Headless Mode` section keys off being "invoked headless"). In v6.11 the skill opens with the implementation-readiness gate (it absorbed `bmad-check-implementation-readiness`), then hands the mechanical work to `sprint_plan.py generate`.
2. Parse the JSON block it ends with: `{status, intent, gate, status_file, findings, warnings}`.
   - `gate: FAIL` or `status: blocked` (duplicate epic versions, unreconciled orphans, an unconfirmed fix) → STOP; surface `findings` and the saved `implementation-readiness.md` if written. The user resolves interactively. (*Unattended:* at launch this is resolved with the owner; at a later epic's start, FAIL stops that epic — U8.)
   - `gate: CONCERNS` → surface the findings once, log them, continue.
   - `gate: PASS` → continue.
3. `sprint-status.yaml` is now current, all stories tracked, status mismatches caught; run `SPRINT_PLAN validate` as a belt-and-braces check.
4. Log `sprint_planning_complete gate=<PASS|CONCERNS>`. Bookkeeping commit if the tracker changed.

Re-runs are idempotent — the script's merge is preserve-never-downgrade.

### Retrospective Review & Story X.0 Creation (Critical Gate)

After sprint planning, before building the story list, review the previous epic's retrospective and create a cleanup story. Mandatory — closes the feedback loop between retrospectives and sprint planning.

1. Calculate previous epic number (N-1 if processing N).
2. Search for `_bmad-output/implementation-artifacts/epic-{N-1}-retro-*.md`. If multiple, latest by mtime; tie-break by lexicographic filename. Log which file was selected.
3. If a retrospective exists, extract: action items (status: completed / in-progress / not addressed), deferred review findings, preparation tasks for current epic.
4. Also take the ledger's non-terminal slice (`LEDGER slice all`, plus `LEDGER show DW-n` for any entry whose summary is not enough — never the whole file), and the `action_items:` block of `sprint-status.yaml` (`SPRINT_PLAN status` → `open_action_items`; v6.11 retrospectives append their action items there with `status: open`).
5. **Close every ledger item — this is a CLOSE, not a relabelling (Rule 17).** The input is every non-terminal entry owned by `burndown` (including the decision sheet's `note=to_x0` deferrals), by `none`, or by a story key of an earlier epic; an entry already routed to a story of this or a later epic is planned work and stays where it is. Each such entry gets exactly one trailer line, `by=x0`: **resolve** (`status=resolved-by:<story> note=<evidence>` — it was fixed since it was filed); **own** (`owner=<N>-0-… ` for items Story X.0 will do, or `owner=<a specific story key of THIS epic whose gate genuinely fails while the item stands>`); or **terminal** (`by-design` / `wontfix-theoretical` / `wontfix-accepted note=reopen_if=…` / `dropped`). Undecided `decision-pending` items (normally only those the previous epic's decision sheet deferred here as `owner=burndown note=to_x0:…`) are batched to the user in one sitting and leave this step decided (*Unattended:* classified instead; owner-only entries wait with `note=inbox=` — U8); human-owned items live in `action_items`, not the ledger. There is no "defer with rationale" and nothing may stay `owner=burndown` or `owner=none`. Default-INCLUDE in X.0 every entry that is (a) trivial + low fix-risk by now, or (b) has two or more `occurrence=` lines — excluding one requires written justification in its note (the burden flips to exclusion). Open action items are included unless the user explicitly defers them. If the previous epic's burn-down gate left more than `ledger_cap` entries owned by this epic's keys, X.0 is a mandatory fix-or-close pass over all of them. The X.0 key enters the tracker only at step 6a, and `ledger.sh` refuses an owner the tracker does not know: write every other disposition here, and the `owner=<N>-0-…` trailers right after 6a's `SPRINT_PLAN generate`.
6. Create Story X.0 in four steps (the tracker script rejects `--set` for any key not derived from the epic files, so the story must exist in `epics.md` first):
   - **6a:** Insert `### Story {N}.0: Epic {N-1} Deferred Cleanup` as the first story under Epic {N} in `epics.md`, in the same heading/format as the sibling stories, with a one-paragraph description and the included items as acceptance bullets (one per triaged item, naming its source). Re-run `SPRINT_PLAN generate` (no `--set`) so the key `{N}-0-epic-{N-1}-deferred-cleanup` appears as `backlog`; confirm it in `new_entries`.
   - **6b:** Re-run the epic-context pre-warm (the `epics.md` edit made the planning artifacts newer than `epic-{N}-context.md`); bookkeeping commit (epics.md + tracker + context + log).
   - **6c:** Spawn the normal **plan** stage with the story key + `Halt after planning.` — Story X.0 is now an ordinary epic story. Validate the spec as usual; append the full triage table under its `## Design Notes` (rows of `Item (DW-n where applicable) | Source (retro | ledger | action_items) | Disposition (resolved-by | own:<key> | terminal:<status>)`; header notes which Epic N-1 the triage covers + the date). Story X.0 closes its own owned entries at its `ledger_adjudicated` gate like any other story.
   - **6d:** `SPRINT_PLAN generate --set {N}-0-epic-{N-1}-deferred-cleanup=ready-for-dev`; bookkeeping commit. Under the parallel kit, the orchestrator treats an `epics.md` change whose only diff is an appended Story X.0 as hash-exempt (re-record `epics_md_hash` without a re-approval).
7. Skip Story X.0 ONLY if all three sources are empty. If the retro is missing but the ledger or action items have entries, do NOT skip — execute steps 5-6 from those sources. If nothing is skipped, the pre-warm in 6b doubles as the epic's initial pre-warm; if X.0 is skipped, run the pre-warm now.
8. Log `retro_review_complete source_retro=<path-or-empty> resolved=N owned=N terminal=N dropped=N load_before=N load_after=N cap=N` or `retro_review_skipped`. Closing a previous epic's action item (`sprint_status.py update --set-action-status`) happens only with the user's confirmation, at the next retrospective — never silently here.

### Epic Context Pre-warm (per epic, lead-driven)

`bmad-build-auto`'s epic-story path compiles `<implementation_artifacts>/epic-<N>-context.md` on first use — by spawning a subagent *before* its own clean-tree check, so the freshly written, untracked cache file would trip that check on the very first plan spawn of every epic (and again after any planning-artifact edit, which invalidates the cache). The lead therefore owns the compile:

1. Render the skill once: `uv run --no-cache _bmad/scripts/render_skill.py --project-root <abs-root> --skill <abs-root>/.claude/skills/bmad-build-auto`. It prints `read and follow <snapshot-dir>/workflow.md`; take `<snapshot-dir>`.
2. Spawn a synchronous subagent (`general-purpose`, no `model` and no `effort` parameter, `run_in_background: false` — Rule 18 (5)) whose prompt is: "Read fully and follow `<snapshot-dir>/compile-epic-context.md` for epic `<N>`. Working directory `<abs-root>` (Rule 13). Write only `<implementation_artifacts>/epic-<N>-context.md`."
3. Verify the file exists, is non-empty, and starts with `# Epic <N> Context:`; otherwise halt (`context compilation verification failed` — usually a missing or unparseable `epics.md`; *Unattended:* retry once, then stop the epic — U5).
4. Bookkeeping commit; log `epic_context_compiled`.

Run it after sprint planning and the Story X.0 gate (both may edit planning artifacts) and again before any plan spawn whenever a file under `planning_artifacts` is newer than the cache (Rule 5 amendments, X.0 insertion, user edits). With a valid, committed cache the plan spawn reuses it and never recompiles.

### Retrospective Per Epic (User Decision Point — the human-in-the-middle exception)

*Unattended:* the retrospective runs headless (`/bmad-retrospective -H <epic>`) and its verdict is read from its document — doctrine U9. This section's "never pass `-H`" governs attended runs.

The retrospective is the ONE deliberate human-in-the-middle exception to the autonomous loop. Its value is the human's judgment about what just happened — automating it defeats its purpose. Concretely: never spawn it as a subagent, never pre-answer its party-mode elicitation or WAIT points (Rule 9's pre-answer protocol explicitly exempts it), and never pass its `-H` / `--headless` flag.

After all stories in an epic complete:

1. Announce: "Epic X is complete. Run a retrospective before moving to the next epic? (yes/no)"
2. **Wait for the user's response.** If the user is away, the run simply pauses at this gate — resume semantics pick it back up later; do not time out into a default answer.
3. **Yes:** execute `/bmad-retrospective` directly via the `Skill` tool, fully interactive, passing the explicit epic number (its `sprint_status.py detect-epic --epic {N}` gate then lists unfinished stories; if the range ended early, the machine verdict `rejected` is expected and the human overrides). Never pass `-H`. Log `epic_retro_complete verdict=<accepted|accepted-with-open-items|rejected>` when it finishes (the skill itself marks `epic-{N}-retrospective: done` and appends its action items to `sprint-status.yaml`). Bookkeeping commit.
4. **No:** log `epic_retro_skipped reason=user_declined`; continue.

`AskUserQuestion` always elicits the human regardless of `bypassPermissions`. The lead executes the skill — do NOT spawn an agent for it (spawned subagents cannot reliably surface elicitation).
