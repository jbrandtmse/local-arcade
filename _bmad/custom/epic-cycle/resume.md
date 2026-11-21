> Section file of `/epic-cycle`. It is part of the command and binds you as the command does. A quoted section name, or a `Rule SC-n`, that is not in this file is found through the Section Index in `.claude/commands/epic-cycle.md`.

### Resume Semantics (Critical)

`/epic-cycle` is designed to be resumable across interrupts, context exhaustion, explicit pauses, and clarification gates spanning days. A later session must pick up exactly where the prior one left off — no re-doing work, no skipping work.

#### Resume-mode detection (epic-start)

The lead determines mode before running SC-1 / SC-2:

1. Read `_bmad-output/implementation-artifacts/cycle-log-epic-{N}.md` **from the epic branch**, where it lives until the merge — `git show {TICKET}-epic{N}:<path>`, else `git show origin/{TICKET}-epic{N}:<path>` after a fetch — and from the feature branch when neither branch exists (a merged epic's log is there). The working tree's copy is the log only when the epic branch is checked out.
2. Get this epic's story states from `sprint-status.yaml`: `SPRINT_PLAN status` (per-status counts, `recommendation.story_key`, `open_action_items` — it has no per-story list) and `TRACKER_READ` for each story's own status; run `SPRINT_PLAN validate` first if the file's integrity is in doubt. Also read each `spec-{N}-*.md` frontmatter `status` — it is `bmad-build-auto`'s own durable state and the tie-breaker when the log and the tracker disagree.
3. For each affected repo, check whether `{TICKET}-epic{N}` exists locally and on the remote.

| Cycle log | `{TICKET}-epic{N}` local | `{TICKET}-epic{N}` remote | Mode | Action |
| --- | --- | --- | --- | --- |
| Missing / empty | Missing | Missing | **FRESH** | Run SC-1, SC-2. Create branches. |
| Missing / empty | Exists | Exists | **AMBIGUOUS** | If the branch has no commits beyond the feature branch (`git rev-list --count <feature>..{TICKET}-epic{N}` is 0), adopt it as FRESH — a crash between SC-2 and the first entry. Otherwise halt; ask user whether to (a) adopt existing branch and start logging against it (existing commits accepted as-is), (b) start a new epic under different `N`, or (c) inspect manually. |
| Missing / empty | Exists | Missing | **UNPUSHED_NEW** | No commits beyond the feature branch → push it (`git push -u origin {TICKET}-epic{N}`), then FRESH. Otherwise AMBIGUOUS. |
| Missing / empty | Missing | Exists | **REMOTE_NEW** | No commits beyond the feature branch → `git fetch && git checkout {TICKET}-epic{N}`, then FRESH. Otherwise AMBIGUOUS. |
| Has entries | Exists | Exists | **RESUME** | Compute resume point from the log. |
| Has entries | Missing | Exists | **REMOTE_ONLY** | `git fetch && git checkout {TICKET}-epic{N}`; then RESUME. |
| Has entries | Exists | Missing | **LOCAL_ONLY** | Halt; ask user (remote deletion intentional?). |
| Has entries, the last gate entry `epic_merged_to_feature` | Missing | Missing | **COMPLETE** | The epic is merged and its branch deleted. Skip it. |
| Has entries, an `epic_merge_started` with no `epic_merged_to_feature` | any | any | **MERGING** | See "Resume across the end-of-epic gates". |
| Has entries | Missing | Missing | **INTEGRITY_ERROR** | Halt loudly. Log claims work that branches no longer carry. |

Detection runs per affected repo. Different repos may legitimately be in different modes (parent RESUME, submodule FRESH).

#### Resume-point computation (within-epic)

An attended run whose log holds `story_set_aside` or `story_parked` entries without a later `story_unparked` or `story_dropped`, or whose unattended run state holds patches (`<state>/patches/`), reads the doctrine's U4, U10 and U11 first — never re-implement a set-aside story over its patch, never skip a held story's saved work. *Unattended:* the doctrine's U11 resume semantics override this subsection and the integrity checks' "surface to user": parked and set-aside stories are skipped, an open clarification is ruled, a dead stage's tree is saved as evidence and the story re-run from its logged `rerun_from`, an integrity error stops the epic.

For a repo in RESUME mode:

1. Bucket cycle-log entries by story ID; highest-stage entry per story is its resume anchor.
2. Earliest story whose anchor is not `committed` = resume point. Work resumes at the next pipeline stage after the anchor.
3. If a story has a `<stage>_clarification_requested` without that stage's subsequent success entry (`story_created` / `dev_complete` / `qa_complete` / `cr_complete`), the resume point is "answer the clarification + re-spawn" (re-dispatch protocol for build-auto stages). The lead surfaces the question before spawning.
4. **Reconcile with the spec's own state** (`bmad-build-auto` writes it durably; the log can lag by one crash): spec `ready-for-dev` + no `story_created` → the plan finished, the log entry was lost — write it, continue at validation. Spec `done` + `build_sha` (the commit touching the spec) reachable on the epic branch + no `dev_complete` → write the entry, harvest `deferred:`, continue at AD verifications; never re-spawn the implement stage over finished work. Spec `in-progress`/`in-review` + dirty tree is **ambiguous on its face**: it is what a dead build-auto leaves behind AND what a healthy, still-running one looks like (`in-review` is its mid-self-review state; a working agent's tree is dirty because it is working). Liveness is a property of sessions, not of files — a stage agent lives exactly as long as the session that spawned it — so branch on ownership: (i) **this lead is a fresh session with no orchestrator above it** → no stage of this pipeline can be alive; it died mid-run: surface the uncommitted diff to the user (keep and re-spawn per the re-dispatch protocol — its resume table continues from `in-progress` — or discard); never auto-clean. (ii) **Orchestrator mode** → the worktree belongs to a runner; the orchestrator NEVER diagnoses a worktree's in-flight state from artifacts. Check the open `stage_spawned` entry, then the runner's liveness (`ListAgents` — which reports process liveness only: sufficient for runner alive/dead, NOT for whether a stage agent has returned, since a resumed agent shows `running` after returning; Rule 18); if the runner is alive, ASK it whether that stage's `Agent` call has returned — it is the only party that knows — and let it act; only a runner that is confirmed dead (whose stage agents are therefore dead too) makes the artifact reading valid, and then the re-spawned runner performs this step, not the orchestrator. If liveness cannot be established either way, HALT and surface — an ambiguous liveness state is a workspace-integrity error, not a judgment call. A re-spawn onto a live stage puts two agents in one worktree (incident 2026-08-28: ~30 minutes of concurrent patching). Spec `blocked` → the clarification is still open.
5. `epic_context_compiled` present but `epic-{N}-context.md` missing or older than a planning artifact → re-run the pre-warm before the next plan spawn.

#### Cross-stage integrity checks (before resuming any stage)

1. **`committed sha=X` and `build_sha=Y` reachable on `{TICKET}-epic{N}`.** For every `committed` / `dev_complete` entry, verify `git merge-base --is-ancestor <sha> {TICKET}-epic{N}`. Failure = branch drift; halt.
2. **Local and remote `{TICKET}-epic{N}` HEADs match.** `git rev-parse {TICKET}-epic{N}` vs `git rev-parse origin/{TICKET}-epic{N}` (post-fetch). Diverged non-fast-forward = halt. Strictly ahead = log `resume_local_ahead`, push. Strictly behind = fetch + fast-forward.
3. **`sprint-status.yaml` agrees with cycle log and specs.** Story marked `done` in YAML with no `committed` entry (or vice versa), or `review` in YAML with a spec not at `done` = divergence; surface to user. Exemption: a story whose highest anchor is `cr_complete` with a Fix Pack or rework in flight legitimately reads `done` (code review wrote it) or `in-progress` before its `committed` entry exists — resume at the rework/smoke step, not as divergence. `SPRINT_PLAN validate` must report `valid: true`.
4. **Submodule pointer consistency.** If `{TICKET}-epic{N}` on the parent recorded a submodule pointer at commit S, the submodule's `{TICKET}-epic{N}` must contain S. Mismatch = INTEGRITY_ERROR.
5. **Clean tree before the first build-auto spawn** (Rule 16) — a dirty tree at resume is evidence (check 4 in resume-point computation), never something to silently commit or discard.
6. **No `committed` entry is left at `ci=pending`.** Resolve each one by its commit (`CI status --branch {TICKET}-epic{N} --sha <its sha>`; an entry from before 2026-10-19.2 names one `run=`, which may be one of several workflows) and log `ci_resolved` before resuming any stage; a `failure` is handled per "CI Is a Gate" before new work starts.

#### Resume interactions with parallel epics (SC-8)

If Epic A is being resumed and Epic B merged to feature in the interim, Epic A's `{TICKET}-epic{N}` is unaffected — reconciliation happens at Epic A's eventual SC-4 merge. If Epic A's own `{TICKET}-epic{N}` was force-pushed by another contributor during the pause, Check 1 fails and the lead halts.

#### Resume across the Story X.0 / retro-review gate

- `retro_review_complete` or `retro_review_skipped` entry → already done, skip.
- No such entry → run the gate.
- Entry present but Story X.0 has no `story_created` → treat Story X.0 as the first incomplete story and resume there.

#### Resume across the end-of-epic gates

- Last story `committed` but no `ledger_burndown_*` entry → resume at the burn-down gate (Rule 17); never write `epic_status_done` without it. A story with `cr_complete` but no `ledger_adjudicated` resumes at adjudication, never at smoke.
- Log shows `epic_status_done` but no `epic_retro_*` entry → resume at the retrospective question.
- `epic_merge_started` but no `epic_merged_to_feature` → the merge was interrupted. If the logged `head` is an ancestor of `origin/<feature>`, the merge landed: finish only what is missing (the branch deletes, the record commit) and write the entry — never merge again. Otherwise, if the epic branch still exists, resume at the merge question; if neither, INTEGRITY_ERROR.
- `epic_retro_*` present but no `epic_merged_to_feature` / `epic_merge_skipped` → resume at SC-4: the decision sheet first if no `decision_sheet_*` entry exists for this epic (Rule 17 (5) — its trailer lines are idempotent to re-present; entries already `by=merge_gate` are shown as decided), then the merge question.
- Both gates are user decision points; re-asking after a long pause is correct behavior. (*Unattended:* neither asks — U9.) A run interrupted mid-retrospective resumes by re-asking the retrospective question (the skill's own output artifacts show how far it got); never auto-complete a half-finished retro.

#### Resume across Sprint Planning

Sprint planning is idempotent — `sprint-status.yaml` is regenerated each run. Always re-run on resume; the skill is a no-op when the YAML is current. The cycle log is append-only, so the new `sprint_planning_complete` entry coexists with the prior one (highest-timestamp wins).

#### Workspace-integrity errors are NOT auto-recoverable

INTEGRITY_ERROR or any cross-stage-check failure must halt. Auto-recovery paths ("the branches must have been pruned; recreate them") lose work. Only the user knows whether missing state was intentional (cleanup) or accidental (mistake).

When halting on an integrity error, surface:

1. What the log says happened (story IDs, stages, recorded shas).
2. What the workspace shows (branches present/missing, HEAD shas).
3. The specific check that failed.
4. Options for the user (re-create from log, abandon log, inspect manually).

Never guess.

#### Resume vs starting a new epic

If the cycle log for epic N is missing but cycle log for epic N-1 exists and shows N-1 completed, that's a normal FRESH start for epic N. SC-1 / SC-2 create the new branch. The retro-review gate triages N-1's deferred items into Story N.0.

If cycle logs for both epic N and epic N+1 are present with entries, two epics are in flight (parallel per SC-8). Resume each independently in its own worktree.
