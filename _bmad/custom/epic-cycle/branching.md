> Section file of `/epic-cycle`. It is part of the command and binds you as the command does. A quoted section name, or a `Rule SC-n`, that is not in this file is found through the Section Index in `.claude/commands/epic-cycle.md`.

### Source Control Branching (Critical Gates)

These fire at the very start of each epic, before sprint planning or story work. Apply uniformly to the parent repo and every submodule in `.gitmodules`. For multi-repo projects (separate child repos rather than git submodules), the user enumerates affected repos up-front; the rules apply to each.

**Precondition — clean working tree.** Before any branching rule, the lead runs `git status --short` against the parent repo and every submodule and halts on dirty state. Non-negotiable. (If the IDE file-sync toggle below applies, run this clean-tree check FIRST; the toggle is then applied only transiently around each branch-changing operation and restored immediately after, so between operations `.vscode/settings.json` is back at its original value and the tree is clean. Never stage the transiently-toggled file into any commit.)

#### IDE file-sync toggle (conditional — IRIS/ObjectScript projects only)

Some IRIS/ObjectScript projects run an IDE extension that bidirectionally syncs the workspace with a live IRIS server (the VSCode-ObjectScript extension with `objectscript.conn.active: true` in `.vscode/settings.json`). When a git operation that **changes branches** rapidly rewrites the working tree, that sync fights the operation — it pushes the new tree to the server, the server recompiles and re-formats, then pushes the formatted files back to disk — producing phantom drift (e.g. spurious whitespace-only diffs), compile cascades, or partially-applied state that has to be reverted before the next commit.

This subsection is self-contained — it does not depend on any project's CLAUDE.md or rules files.

**Applicability — detect once, up front (after the initial clean-tree check):**

1. If `.vscode/settings.json` does NOT exist, or has no `objectscript.conn` block, or `objectscript.conn.active` is not `true` → the extension isn't actively syncing (or this isn't an ObjectScript/IRIS project). **SKIP this toggle entirely; it never applies.** Non-ObjectScript projects are never affected.
2. Otherwise the toggle is in effect for this run: record the original value (almost always `true`) so each window can restore it. The sync stays ENABLED except inside the branch-operation windows defined below.

**Scope — wrap ONLY branch-changing operations; do NOT disable the sync for the whole epic.** Disable the sync immediately before, and restore it immediately after, each git operation (or contiguous group of operations) that moves HEAD and rewrites the working tree: `checkout`, `checkout -b`, `merge`, `pull` (when it advances HEAD), `rebase`, `reset --hard`, `cherry-pick`, `stash apply`/`pop`, `revert`, `submodule update`. Within `/epic-cycle` there are two such windows (plus any resume-time checkout):

- **Window A — epic-start branching (SC-1 + SC-2 + checkout):** wrap the feature-branch checkout/creation, the epic-branch creation, and the `git checkout {TICKET}-epic{N}`. Restore the moment the epic branch is checked out.
- **Window B — SC-4 end-of-epic merge:** wrap the `checkout <feature>` / `pull` / `merge --no-ff` / branch deletes (per affected repo, submodules-first). Restore the moment the merge + deletes complete.

Read-only git ops (`status`/`diff`/`log`) and `add`/`commit`/`push`/`fetch` do NOT change branches and are NOT wrapped. The per-story pipeline stays on `{TICKET}-epic{N}` and only commits/pushes, so it runs with the sync **enabled**, as normal. Between windows the sync is on and `.vscode/settings.json` sits at its original value — clean — so the clean-tree check and the per-story commits never see a toggle-induced modification.

To wrap a window: set `objectscript.conn.active: false` → perform the branch operation(s) → set it back to the recorded original value.

**Restoration is MANDATORY and is the #1 failure mode of this rule.** Each window's restore must run — on success, on halt, on failure, on merge conflict, or on user cancellation. Treat each window like a `try/finally`: the restore belongs on the always-runs path, never only after the success path. The transiently-toggled `.vscode/settings.json` must never be `git add`-ed into any commit; if a window overlaps a commit (the SC-4 merge commit), verify settings.json is not staged. If you discover a window's restore was missed, restore immediately and tell the user the workspace was left disconnected from IRIS and for roughly how long.

**Crash recovery.** If a prior run crashed mid-window, `.vscode/settings.json` may be left at `active: false`. On a fresh run, if detection finds `active: false` where a live connection is expected, surface it to the user before proceeding — it may be an orphaned toggle from a crash, or an intentional manual disconnect; only the user knows.

This toggle is purely an IRIS/ObjectScript convenience; it has no effect on, and must not be applied to, non-ObjectScript projects.

#### Rule SC-1 — Feature branch verification (epic-start)

The lead checks for a feature branch in every affected repo. Branch name follows the project's configured pattern (see "Tracker format flexibility" below); default is `feature/{TICKET}_{Description}`.

- **If the feature branch exists** (locally or fetch-discoverable on remote): check it out, verify it's up to date with its remote, continue.
- **If the feature branch does NOT exist:** STOP and ask the user:
  1. Should the feature branch be created?
  2. The exact `{TICKET}` (validated against the project's `ticket_format` regex).
  3. The exact `{Description}` (validated against `description_format`).
  4. Which root does it branch from? Default precedence: `origin/develop` → `origin/main` → `origin/master`. The lead surfaces candidates the repo actually has and asks the user to confirm.

  **Root freshness check (mandatory, per affected repo, BEFORE creating anything):** `git fetch origin`, then compare the chosen remote root against its local counterpart: `git rev-list --left-right --count origin/{root}...{root}`.
  - **Local ahead (0 behind / N ahead):** STOP. The local branch carries N commit(s) origin does not have — basing on `origin/{root}` will REMOVE from the working tree every tracked file those commits added (this has deleted a project's entire `.claude/` + `_bmad/` tooling mid-session). Show the commits (`git log --oneline origin/{root}..{root}`) and ask the user: (a) push local `{root}` to origin first, then base on `origin/{root}` (recommended); (b) base on local `{root}` instead; (c) base on `origin/{root}` anyway, explicitly acknowledging the listed content disappears from the working tree. Log `root_freshness_resolved` with the choice.
  - **Diverged (both counts nonzero):** HALT and surface both commit lists — the user reconciles the trunk before any branching (same doctrine as a resume INTEGRITY_ERROR; never pick a side silently).
  - **Equal, or local behind:** proceed with `origin/{root}` (the normal case).

  On user authorization: validate the resulting branch name, then `git fetch origin && git checkout -b <validated-name> <confirmed-root> && git push -u origin <validated-name>` per affected repo. Log `feature_branch_created`.

Merging the feature branch into `develop` / `main` is OUT of scope for `/epic-cycle` — that's a PR-review / code-owner workflow. `/epic-cycle` creates and merges INTO the feature branch only.

##### Tracker format flexibility (per-project configuration)

The default assumes a JIRA-style tracker. Real projects use JIRA, Linear, GitHub Issues, Azure DevOps, or no tracker at all. The lead reads the project's branch-naming config from the first of these locations to exist:

1. `_bmad/custom/branch-naming.yaml` (preferred)
2. A `## Branch naming` section in CLAUDE.md
3. The defaults below

**Config schema:**

```yaml
# _bmad/custom/branch-naming.yaml
feature_pattern: "feature/{TICKET}_{Description}"  # template with {TICKET} and {Description}
epic_pattern: "{TICKET}-epic{N}"  # template for epic branch; {TICKET} reused from SC-1, {N} is epic number
ticket_format: "^([A-Z]+-\\d+|SPIKE|EXPLORE|REFACTOR)$"  # regex; tracker IDs OR named exceptions
ticket_required: true   # if false, {TICKET} may be empty
description_format: "^[a-z][a-z0-9-]{2,60}$"  # kebab-case, 3-60 chars, starts with letter
separator: "_"          # between TICKET and Description in the feature template
```

**Defaults if no config:**

| Field | Default |
| --- | --- |
| `feature_pattern` | `feature/{TICKET}_{Description}` |
| `epic_pattern` | `{TICKET}-epic{N}` |
| `ticket_format` | `^[A-Z]+-\d+$` (JIRA/Linear-style) |
| `ticket_required` | `true` |
| `description_format` | `^[a-z][a-z0-9-]{2,60}$` |
| `separator` | `_` |

**Validation at the SC-1 user prompt:**

1. Ask user for `{TICKET}` and `{Description}`, showing an example derived from the configured pattern.
2. Validate each against the configured regex.
3. If invalid: surface the mismatch with the offending regex shown. Offer: (a) re-enter, (b) override and use as-is (logs a warning), (c) update the project config.
4. If valid: render the branch name and confirm before creating.

**Ticketless work.** The default `ticket_format` allows `SPIKE`, `EXPLORE`, `REFACTOR` as named exceptions (e.g., `feature/SPIKE_audio-latency-probe`). Projects can broaden or narrow this list.

**Branch-name safety (non-negotiable).** Refuse any branch name with spaces, shell metacharacters (`*`, `?`, `[`, `]`, `;`, `&`, `|`, `<`, `>`, `$`, `` ` ``, newline), or git-reserved sequences (`..`, `@{`, leading `-`, trailing `.`). These guards are independent of the project config.

#### Rule SC-2 — Epic branch verification (epic-start)

After the feature branch is in place, the lead checks for an epic branch in every affected repo. The branch name follows the project's configured `epic_pattern` (see "Tracker format flexibility" below); default is `{TICKET}-epic{N}` (e.g., `PROJ-1234-epic1`). The ticket prefix is required so that multiple projects committing to the same repository under different tickets do not collide on a shared `epic1` / `epic2` namespace.

`{TICKET}` is the same value validated and recorded by SC-1 for the feature branch — the lead reuses it; do not re-prompt.

- **If the epic branch exists** (local or remote): check it out, continue.
- **If the epic branch does NOT exist:** create deterministically off the feature branch — no user prompt; the name is derived from the epic number and the SC-1 ticket. `git checkout <feature> && git pull && git checkout -b {TICKET}-epic{N} && git push -u origin {TICKET}-epic{N}`. Log `epic_branch_created`.

**Resume semantics:** mid-epic resume should find `{TICKET}-epic{N}` already in place. If the lead is resuming with prior `committed` entries in the cycle log but `{TICKET}-epic{N}` is missing locally AND on remote, that is a workspace-integrity error — halt and surface. Do NOT silently re-create.

**Ticketless projects.** If the project's `ticket_required` is `false` and no ticket was supplied at SC-1, the default `epic_pattern` resolves to a leading-hyphen name (`-epic1`), which is git-invalid. Projects in this mode MUST override `epic_pattern` (e.g., to `epic{N}` for single-project repos, or to `{DESCRIPTION}-epic{N}` to derive the prefix from the feature branch description). The lead validates the resolved epic branch name against the same branch-name safety rules as SC-1 and halts on failure.

#### Rule SC-3 — Commits go ONLY to the epic branch

Every commit during the epic cycle lands on `{TICKET}-epic{N}` in the affected repo. The lead asserts `git branch --show-current == "{TICKET}-epic{N}"` immediately before every `git commit` and halts on mismatch. The one exception is SC-4's merge record (`chore(epic-N): record merge`), committed on the feature branch after the merge, where the assertion names `<feature>` instead. Applies to submodules (each submodule's HEAD must be on its own `{TICKET}-epic{N}` before the parent's `git add <submodule-path>`).

Push frequency: per story, to the epic branch's remote.

#### Rule SC-4 — End-of-epic merge gate (user decision point)

After the retrospective gate (whether opted in or not), the lead pauses (*Unattended:* no question — `when_green`, doctrine U9):

> "Epic {N} is complete. Merge `{TICKET}-epic{N}` into the feature branch and delete the epic branch (local + remote) in every affected repo?"

**Precondition — the branch head's CI is green.** CI judged the epic's last pushed commit, not the epic-close bookkeeping commits on top of it: those are never pushed on their own, and the merge carries them. In every affected repository, submodules first: `git fetch origin {TICKET}-epic{N}`; `H=$(git rev-parse origin/{TICKET}-epic{N})`; `git merge-base --is-ancestor $H HEAD` must hold — if it does not, or `origin/{TICKET}-epic{N}` is missing, stop and surface it: never merge, never delete the remote branch — and every file `git diff-tree -r --name-only --no-renames $H HEAD` lists must be a bookkeeping path (Rule 16: `<impl>`, `<planning>`; the parallel kit's `_bmad/custom/epic-dependencies.yaml`). Anything else is pushed and its CI resolved first. Then `CI status --branch {TICKET}-epic{N} --sha $H` (or the equivalent for the project's CI): `success` on every workflow — or `untriggered` (nothing a workflow watches changed), or `ci=none` for a project without CI, which this gate confirms: if `CI expected --branch {TICKET}-epic{N} --sha $H` lists a workflow, CI has arrived since the pre-flight, so judge `CI status` at `$H` as for `ci=gh` — is required; `failure` → log `merge_gate_blocked reason=ci_red runs=<the red runs> job=<name>` and surface the failing job instead of the merge question — the branch is not mergeable while it is red, whatever the local suite says (field report 2026-08-30: a branch red for ~16 h passed two full story pipelines); `pending` → wait; `unavailable` → retry as "Reading the result" says. Confirming CI by hand (*Unattended:* as chosen at launch — U2) is only for an epic that runs without readable CI: `ci=unavailable` at the pre-flight, or `reason=no_push_trigger`. With `ci=gh`, CI that stays unreadable holds the merge like an infrastructure outage — never a merge on local green. `cancelled` → as "Reading the result" says. Log `ci_green_verified runs=<ids> head=$H` on success.

Before asking, (1) surface the burn-down gate's result for this epic (`ledger_burndown_*` entry: what was resolved, made terminal, chartered into the burn-down story, the overflow re-owned to which next-epic keys, and the drain ratio), and (2) run the **epic-close decision sheet** (see "Ledger Drain"): every `escalated` and `decision-pending` entry, presented once with a recommended disposition, the user's answers written as `by=merge_gate` trailer lines and logged `decision_sheet_recorded` — the burn-down gate set these aside precisely because only the user can decide them. If this is the range's FINAL epic, follow the merge with the ledger sweep: `LEDGER slice all` — every remaining non-terminal entry must already be owned by a named story key outside the range; present the list with a recommended disposition for each — the end-of-project triage, sized for one sitting.

If **yes**, first write the write-ahead marker on the epic branch — log `epic_merge_started head=<the CI-verified head> feature=<feature>` and bookkeeping-commit it (no separate push: it would start another CI run for a log line, and the merge carries it to origin) — then execute the merge — submodules-first, then the parent (mirrors per-story Submodule Commit Order to avoid broken pointers on the feature branch's remote). This is "Window B" for the IDE file-sync toggle: if that toggle applies, set `objectscript.conn.active: false` before the first `checkout` below and restore it immediately after the deletes complete (mandatory, `try/finally`; restore even if the merge conflicts and halts):

For each affected repo, ordered submodules-first:

1. `git checkout <feature>`
2. `git pull origin <feature>` (in case it moved while the epic was in flight)
3. `git merge --no-ff {TICKET}-epic{N} -m "Merge {TICKET}-epic{N}: <one-line summary>"` (preserves the epic branch's commit graph)
4. `git push origin <feature>`
5. `git branch -d {TICKET}-epic{N}` (refuses if not fully merged — the safety we want)
6. `git push origin --delete {TICKET}-epic{N}`

Then record it: once the merge is verified on origin, append `epic_merged_to_feature` to this epic's cycle log — the merge brought the log onto the feature branch — and commit it there as `chore(epic-N): record merge`, push, and verify. This is the one sanctioned commit on the feature branch (SC-3); without it the next epic's clean-tree check halts on the uncommitted log line.

If submodules are involved, the parent's merge step (3) brings in submodule pointer updates that already exist on `{TICKET}-epic{N}` from per-story commits. Because the submodules' own feature branches were merged in the preceding pass, those pointers now resolve cleanly on the submodules' remotes. Verify with `git submodule status` before the final parent push.

If **no**, log `epic_merge_skipped reason=<short>` and leave `{TICKET}-epic{N}` intact.

#### Rule SC-5 — Epic re-open recreates the epic branch

If an epic is re-opened (e.g., the next epic's retrospective surfaces work that belongs on the prior epic, or the user explicitly reopens), the `{TICKET}-epic{N}` branch must be recreated.

- If the prior `{TICKET}-epic{N}` was merged and deleted: branch a new `{TICKET}-epic{N}` off the current feature-branch HEAD (picks up any interim feature-branch progress).
- If the prior `{TICKET}-epic{N}` was never merged and still exists: check it out as-is; do not branch a parallel `{TICKET}-epic{N}`.

Log `epic_branch_reopened reason=<short>`.

#### Rule SC-6 — NEVER commit directly to `main`, `master`, or `develop`

The lead refuses any commit (story, retrospective, hotfix, anything) when the current branch is `main`, `master`, or `develop` in any affected repo. Absolute defensive default. If the user explicitly directs a direct-to-trunk commit (emergency hotfix outside the epic cycle), that's OUT of scope — the user performs it manually.

Pairs naturally with remote branch protection on trunks.

#### Rule SC-7 — If unsure where to commit, STOP and ask

Branching state can drift across sessions. If the lead cannot confidently identify the right branch to commit to — multiple feature branches with similar names, missing epic branch mid-resume, ambiguous parent between `develop` and `main`, etc. — STOP and ask the user. Do not guess. (*Unattended:* stop the run — U5.)

#### Rule SC-8 — Parallel epics on the same feature branch

Multiple `/epic-cycle` runs may execute concurrently against the same feature branch — typically when different agents drive Epic A and Epic B simultaneously.

**Per-agent isolation: one working tree per agent.** Git only allows one HEAD per working directory. Concurrent agents on different epic branches require either:

- `git worktree add <path> {TICKET}-epic{N}` (recommended) — separate worktrees share the same `.git` object store. Cleanup: `git worktree remove <path>` after the epic merges.
- Separate full clones (simpler but heavier).

A single working directory running two agents on different epic branches is not supported — it requires constant branch-switching that corrupts file state.

**Branch creation under parallelism.** Each agent runs Rule SC-2 independently. `{TICKET}-epic{N}` is created off the feature branch's current HEAD at the moment that agent starts. If Epic A started earlier and a hotfix or sibling-epic merge landed on feature in between, Epic B's `{TICKET}-epic{N}` branches off a newer feature HEAD. That's fine — the `--no-ff` merge at SC-4 handles three-way reconciliation.

**Per-story commits.** Independent branches, independent remotes — no race. Each agent's pre-commit branch assertion is per-agent and per-worktree.

**Merge serialization.** The `git push` to feature is a single-writer point on the remote, so SC-4 must serialize across agents:

- **Coordinated:** each SC-4 sequence starts with `git pull origin <feature>`. If Epic A already merged, Epic B's pull picks that up before its own merge runs. Standard three-way merge from there.
- **Near-simultaneous:** the user picks the order. The second agent re-pulls feature after the first lands.

**Conflict handling at merge time.** (*Unattended:* integrate forward first and resolve per the policy's `gates.merge_conflicts` — doctrine U9.) If `git merge --no-ff {TICKET}-epic{N}` produces conflicts (against another epic's already-merged work, a hotfix on feature, or any other drift since branching), the lead STOPs and surfaces to the user. Auto-resolution is forbidden — git's conflict heuristics can silently drop intentional changes. The user resolves in the working tree, then signals the lead to continue.

Submodules are independent under this rule too — each submodule's `{TICKET}-epic{N}` merges into its own feature branch sequentially; submodule conflicts require user resolution before the parent's submodule pointer is bumped.

**Out-of-scope coordination:** if two parallel epics' planning artifacts overlap (both stories' ACs touch the same files), that's a sprint-planning conflict the user resolves before parallel execution. Rule of thumb: if two epics' Files-to-Modify tables overlap by more than ~20%, run sequentially.

#### Sub-repository vs submodule terminology

"Submodule" = git submodule (registered in `.gitmodules`; `git -C <path>` operates on it as a child repo). "Sub-repository" = a non-submodule child repo under one umbrella (separate clones the umbrella project orchestrates). Rules SC-1 through SC-8 apply to both. If ambiguous, that's a SC-7 STOP-and-ask trigger.
