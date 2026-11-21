---
description: Run the BMAD Method epic development cycle for one or more epics
---

You are executing the BMAD Method development implementation cycle for one or more epics. Stories run strictly sequentially — one story, one stage at a time, in one checkout (see "Smart Parallelism" for why).

**After any context compaction, re-read this file (`.claude/commands/epic-cycle.md`) in full, and then the section file for the stage or gate you are in (the Section Index below), before your next action.** Compaction keeps only about the first 5,000 tokens of this command; a lead working from the summary alone skips gates, and drops the stage-file directive and the Values list from every later spawn prompt.

**Arguments:** $ARGUMENTS — an epic range (e.g., `1-3` for Epics 1 through 3, `2` for a single epic), optionally followed by `--unattended`; or `--review` alone. If there is no range and no `--review`, prompt the user for the range; a range with `--review` is an argument error.

**`--unattended` or `--review`: read `_bmad/custom/epic-cycle-unattended.md` (the doctrine) in full before anything else, and again after every compaction.** Under those flags it overrides every passage it names — the passages below carry an *Unattended:* pointer to its section (U1–U14) — and after the attended setup the development loop never waits for input: every stop point is decided, vetoed, parked, stopped or held. Without those flags, read it only for the case in its U10 (an attended run after an unattended one). **`--review` alone runs only the doctrine's U13** — the attended review of an unattended run's inbox — and none of the pre-flight gates, setup or Task Sequence below.

## Section Index (read a section before the step it governs)

This file is the core of the command: the pre-flight, the Task Sequence, the spawn pattern, the Pipeline Flow and the cycle-log format. The gates' own sections are files in `_bmad/custom/epic-cycle/`, read when you reach them. They are part of this command and bind you exactly as this file does.

- **Read a section file in full, once per epic, immediately before the first step it governs** — the Task Sequence names it. After a compaction, read it again if you are still inside that step.
- **Do not read ahead, and do not act from a step's one-line summary.** The summary says what the step is; the section says how, and what stops it.
- **A quoted section name, a `Rule SC-n`, or a named part that this file does not contain is in the table below.** Where a section file, the doctrine or the rules registry says "the command's …", this table says which file that is.
- **The `stage-*.md` files are written for the stage agents.** A spawn prompt names one and the stage agent reads it ("Stage files"); the lead does not, except to settle what a stage was told.

| File in `_bmad/custom/epic-cycle/` | Sections and named parts | Read it |
| --- | --- | --- |
| `anti-patterns.md` | Anti-Patterns | Once per invocation, after the pre-flight |
| `resume.md` | Resume Semantics — resume-mode detection, resume-point computation, the integrity checks, "Resume across the end-of-epic gates" | Per Epic step 2, on every invocation |
| `branching.md` | Source Control Branching — Rules SC-1 to SC-8, the IDE file-sync toggle, "Tracker format flexibility" | Per Epic step 3 (a repo in FRESH mode); End of Epic step 4 (the merge) |
| `ci-gate.md` | CI Is a Gate — the `CI` shorthand, "Reading the result", the resolution points | Per Epic step 4; Per Story steps 4 and 10; End of Epic step 4 (the merge gate) |
| `ledger-drain.md` | Ledger Drain | Per Epic step 5; Per Story step 8; End of Epic steps 1 and 4 |
| `epic-gates.md` | Sprint Planning Per Epic; Retrospective Review & Story X.0 Creation; Epic Context Pre-warm; Retrospective Per Epic | Per Epic steps 5 and 6 and the pre-warm; End of Epic step 3 |
| `spec-gates.md` | Lead Validates the Story Spec; AD-Aware Execution (Layers 1–3) | Per Story steps 3 and 5 |
| `smoke.md` | Per-Story Smoke — the smoke, the verification arrangement, the fresh-environment check | Per Story step 9 |
| `rework-loop.md` | Rework Loop | Whenever a story is re-opened: a review that leaves it `in-progress`, a fix pack, a failed smoke, a red CI run |
| `clarification.md` | Clarification protocol — the build-auto blocking-condition table, the Re-dispatch protocol | When a stage returns `blocked` or `## Clarification Needed`, and before any re-spawn after a harness error |
| `stage-plan.md`, `stage-implement.md`, `stage-qa.md`, `stage-code-review.md` | The stage's rules, pre-answered checkpoints and completion contract; the rework re-spawn additions | The stage agent, as its first action |
| `reference.md` | Smart Parallelism (why stories run one at a time); Workflow Telemetry (`epic_summary`, what the log lets you compute) | Only to write the optional `epic_summary`, or to analyse a run |

In this file: Pre-flight Runtime Check, Task Sequence, Execution Guidelines, Permission Mode (with "Launch environment"), Model and Effort, Skill Tool Invocation, Agent Invocation Pattern (Spawn Prompt Skeleton, Stage files, Pipeline Flow, Status Ownership, Context Handoff Between Stages, Lead Context Management), When to Pause, Handling Clarifications, Submodule / Sub-Repository Commit Order, Completion Logging (Cycle Log Format).

## Pre-flight Runtime Check

Uses the standard `Agent` tool to spawn pipeline-stage subagents and the `Skill` tool for lead-side skill invocations. No experimental flag required.

**Session model (first action, before any other gate):** this command names no model and passes none. Every stage agent, and every agent a stage spawns, runs on the model and at the reasoning effort this session was started with ("Model and Effort"). Read your own model declaration from your system prompt ("You are powered by the model named …") and the launch setting `printenv CLAUDE_CODE_SUBAGENT_MODEL`, and log `session_model model=<declared id|unknown> subagent_model=<that variable's value|unset>`. It is a record, not a gate: nothing halts on it, and nothing in this command compares one model with another. The entry is what lets a later quality dip be traced to the model that ran — the lead's own judgment artifacts (spec validation, merge-conflict resolutions, AD verdicts) are the pipeline's least-reviewed outputs.

If `Agent` is a deferred tool, load its schema via `ToolSearch` with `"select:Agent"` before first use. If `Agent` is unavailable, halt and surface to the user.

**BMAD + runtime gate (second action):** read `installation.version` from `_bmad/_config/manifest.yaml` and require ≥ 6.11.0 — this command drives `bmad-build-auto`, which does not exist earlier (6.10 projects: use the pre-6.11 kit). **BMAD v7 gate**, checked before the version comparison (a v7 project may have no manifest, or a stale 6.12 one under v7 skills): `.claude/skills/bmad-build-auto/customize.toml` (or its plugin-namespaced equivalent) must declare `[[workflow.review_layers]]`, and no `bmod-method/bmod.toml` may exist under the project's `.claude/skills/`. (One only under `~/.claude/skills/` is a user-level v7 preview: if `_bmad/custom/kit-versions.yaml` records `v7_global_accepted:`, log `v7_global accepted=<date>` and continue; otherwise HALT and tell the user to remove the preview or re-run the kit's install Step 1, which records the acceptance.) Otherwise HALT with: "This kit supports BMAD Method 6.11–6.12.x. This project runs BMAD v7 (<the marker found>), which replaces the review layers, sprint planning and story files the kit drives — its overrides would stop v7's renderer. To keep using these kits, keep the project on 6.12.x (`npx bmad-method@6.12 install --action update --modules bmm --tools claude-code --yes` in the project directory); try the v7 preview in a separate clone." Run `uv --version`; HALT with the install pointer (https://docs.astral.sh/uv/) if it fails — `bmad-build-auto` renders itself through `uv run _bmad/scripts/render_skill.py` and halts on activation without it. Then run `uv run --no-cache _bmad/scripts/resolve_config.py --project-root <abs-root> --key core.project_name`: exit 0 proves uv can run BMAD's scripts (Python ≥ 3.11 available or provisioned); exit 3 means no Python 3.11+ — HALT. Verify these exist: `.claude/skills/bmad-build-auto/SKILL.md`, `.claude/skills/bmad-code-review/SKILL.md`, `.claude/skills/bmad-qa-generate-e2e-tests/SKILL.md`, `.claude/skills/bmad-sprint-planning/scripts/sprint_plan.py` (on a plugin-namespaced install, the equivalent paths). Verify the durable state is tracked: `git check-ignore -q _bmad-output/implementation-artifacts` must FAIL (exit 1) — if the directory is gitignored, HALT: cycle logs, `sprint-status.yaml`, specs and the ledger must live on the epic branch (resume, bookkeeping commits, and the parallel merge queue depend on it); the user removes `_bmad-output/` from `.gitignore` (keeping `_bmad/render/`, `*.user.toml`, `.worktrees/` ignored). Then determine how CI can be read (see "CI Is a Gate"): `ci=gh` when `.github/workflows/` holds a `*.yml` or `*.yaml` workflow, `gh auth status` succeeds, and `git remote get-url origin` is a GitHub URL (each epic then checks that a workflow runs on a push to its branch — "CI Is a Gate"); `ci=none` only when the repo has no CI configuration at all — no GitHub workflow and none of `.gitlab-ci.yml`, `azure-pipelines.yml`, `.circleci/config.yml`, `Jenkinsfile`, `bitbucket-pipelines.yml`, `.buildkite/`, `.travis.yml`, `.drone.yml`; `ci=unavailable` otherwise (CI exists, but this session cannot read its results) — surface `unavailable` once ("CI results cannot be read from this session; the merge gate will ask you to confirm CI by hand") rather than proceeding as if the suite's local result were the shipped one. Log `runtime_gate bmad=<version> uv=<version> ci=<gh|none|unavailable>`. Resolve `<project_name>`, `<impl>` and `<planning>` with BMAD's config resolver (the shorthand paragraph below). Read the launch environment ("Permission Mode": `printenv CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH CLAUDE_CODE_RETRY_WATCHDOG BASH_MAX_TIMEOUT_MS CLAUDE_CODE_MAX_CONTEXT_TOKENS API_TIMEOUT_MS`) and log `launch_env`; an explicit depth below what the run needs (2 sequential, 3 parallel) → HALT and say which setting to raise. If `ANTHROPIC_BASE_URL` is set and `CLAUDE_CODE_MAX_CONTEXT_TOKENS` is not, tell the user once that Claude Code may be assuming a larger context window than the model has ("Launch environment"), then continue.

**Unattended run lock (attended runs — under `--unattended` the doctrine's U2 decides instead, and a runner skips this):** if `_bmad-output/unattended/run.lock` or `<worktree_base>/.coordination/unattended/run.lock` exists, an unattended run may hold this checkout — show `bash _bmad/scripts/unattended-inbox.sh <its directory> run-status` and stop; only the owner can confirm that run is dead and release its lock (doctrine U10, last bullet). Two sessions never work one checkout.

**`SPRINT_PLAN` shorthand.** Throughout this command, `SPRINT_PLAN` means `uv run --no-cache <path-to>/bmad-sprint-planning/scripts/sprint_plan.py`, where `<path-to>` is `.claude/skills` (or the plugin-namespaced skills directory). Three more placeholders recur below: `<impl>` and `<planning>` (also written `<implementation_artifacts>` / `<planning_artifacts>`) and `<project_name>`. Resolve all three once, at pre-flight, through BMAD's own resolver — `uv run --no-cache _bmad/scripts/resolve_config.py --project-root <abs-root> --key core.project_name --key modules.bmm.implementation_artifacts --key modules.bmm.planning_artifacts` (JSON out) — and substitute `{project-root}`; by default they are `_bmad-output/implementation-artifacts` and `_bmad-output/planning-artifacts`. Never read them from `_bmad/config.toml` alone: the resolver merges the project's config layers (`_bmad/config.toml`, `_bmad/custom/config.toml`, and the user files), as the rendered skills (`bmad-build-auto`) do. Four pipeline skills do not: `bmad-code-review`, `bmad-qa-generate-e2e-tests`, `bmad-sprint-planning` and `bmad-retrospective` read `_bmad/bmm/config.yaml`. So compare: the resolver's `implementation_artifacts` and `planning_artifacts` must equal those keys in `_bmad/bmm/config.yaml` (after substituting `{project-root}`); a mismatch → HALT — those four skills would write somewhere other than the lead and build-auto. Align the two (re-run the BMAD installer, or set the path in both files) and re-invoke. It is BMAD's deterministic tracker script (JSON in, JSON out; `uv run` may print an `Installed N package(s)` line to stderr — ignore it). Its three subcommands replace the retired `/bmad-sprint-status mode=data|validate`:

- `SPRINT_PLAN status --status-file <impl>/sprint-status.yaml` → per-status counts, `open_action_items`, `recommendation.story_key`, `all_done`.
- `SPRINT_PLAN validate --status-file <impl>/sprint-status.yaml` → `valid`, `problems`.
- `status` has no per-story list. **`TRACKER_READ`** — `awk '/^development_status:/ { f = 1; next } f && /^[^ #]/ { f = 0 } f && /^  [^ #]/ { print $1, $2 }' <impl>/sprint-status.yaml` — prints `key: status` per line; it is the one sanctioned per-story read (a read, never an edit).

**`LEDGER` shorthand.** `LEDGER` means `bash _bmad/scripts/ledger.sh <impl>/deferred-work.md` (installed by this kit). `LEDGER load` → counts + `owner:<key>=<n>` lines; `LEDGER slice <owner>|all` → `DW-n TAB status TAB owner TAB summary` for non-terminal entries; `LEDGER show DW-n` → one entry; `LEDGER new "<summary>" "<source>" <severity> <fix-risk> <footprint> "<evidence>" <status> <owner> <by> "<note>"` → creates an entry, prints its id; `LEDGER append DW-n "status=… owner=… by=… note=…"` → one trailer line. Nobody in the pipeline reads or edits `deferred-work.md` any other way.
- `SPRINT_PLAN generate --epic-file <planning>/epics.md --status-file <impl>/sprint-status.yaml --stories-dir <impl> --project <project_name> --date "<MM-DD-YYYY HH:MM>" --set <key>=<status> [--set …]` → the lead's ONLY sanctioned status writer. The merge itself never downgrades, but **`--set` is the script's repair path and is applied unconditionally — it WILL downgrade.** Before every `--set`, read the key's current value (`SPRINT_PLAN status` or the file) and refuse to write a lower rank (`backlog < ready-for-dev < in-progress < review < done`) — the exceptions are the Rework Loop's re-open of a `done` story (its step 1), logged `rework_opened`, and an unattended set-aside (doctrine U4). `--set` on a key that is not in the generated plan fails (`ok: false`, "not in the generated plan") and writes nothing — a story must exist in the epic file first. Preserves comments; reports `explicit_set`. Use `--dry-run` when unsure. (`<epic-file>` may repeat for multi-file epics; `<project_name>`, `<impl>` and `<planning>` are the resolver's values from the shorthand paragraph above.)

## Task Sequence

**Read the section first.** A step that a section governs starts by reading that section's file (Section Index); the *Read:* line of each group says which. `anti-patterns.md` is read once per invocation, before the first epic's step 1.

**Per Epic (setup, executed once per epic before any stories):**

*Read:* step 2 → `resume.md` · step 3 → `branching.md` (only when a repo is in FRESH mode) · step 4 → `ci-gate.md` · step 5 → `ledger-drain.md` and `epic-gates.md`, which also governs step 6 and the pre-warm.

1. **Lead** verifies a clean working tree across the parent repo and every submodule listed in `.gitmodules`; halts on dirty state.
2. **Lead** determines per-repo resume mode (see "Resume Semantics").
3. For repos in FRESH mode: **Lead** verifies (or creates with user authorization) the feature branch per Rule SC-1, then verifies (or creates) the epic branch `{TICKET}-epic{N}` per Rule SC-2.
4. **Lead** checks every affected repo out to `{TICKET}-epic{N}` and logs `epic_branch_checked_out` (with `ci=gh`, after the per-epic CI check — "CI Is a Gate"; on the run's first epic, after first writing the held pre-flight entries — see "Cycle Log Format", `runtime_gate`); then resolves the **architecture spine** (Rule 6: newest `ARCHITECTURE-SPINE.md` with `status: final` under `<planning>/architecture/*/`, else the newest spine, else any `*architecture*.md` under `<planning>`, else none), counts its `### AD-` blocks, and logs `spine_resolved path=<path|none> ads=<N> status=<final|draft|none>`. The path goes into every spawn prompt; Rule 20 writes go to this file.
5. **Lead** measures the ledger (`LEDGER load`; re-owns any `owner=none` entry) and logs `ledger_load`, then executes `/bmad-sprint-planning` directly, **headless**, with the load in its argument, and branches on its readiness `gate` (see "Sprint Planning Per Epic" and "Ledger Drain").
6. If a previous epic's retrospective, the ledger (`LEDGER slice all`), or open `action_items` in `sprint-status.yaml` have unresolved items, **Lead** reviews them, **closes** each (resolve / own / terminal — Rule 17), and creates Story X.0 via a `bmad-build-auto` plan spawn (see "Retrospective Review & Story X.0 Creation").

**Per Story (executed once per story in the epic):**

*Read:* step 3 → `spec-gates.md`, which also governs step 5 · steps 4 and 10 → `ci-gate.md` · step 8 → `ledger-drain.md` · step 9 → `smoke.md` · a story that is re-opened (step 7, a failed smoke, a red CI run) → `rework-loop.md` · a stage that returns `blocked` or `## Clarification Needed`, or dies on a harness error → `clarification.md`.

1. **Lead** asserts the branch, writes the `stage_spawned stage=plan …` write-ahead entry to the cycle log, and makes the bookkeeping commit (Rule 16 — the tree MUST be clean before every `bmad-build-auto` dispatch). Every later stage spawn (implement, qa, code-review) is preceded by its own `stage_spawned` entry the same way.
2. Agent — **PLAN**: `/bmad-build-auto`, prompt = the explicit sprint-status story key plus `Halt after planning.`, plus the story's **ledger inbox** (`LEDGER slice <key>` pasted in — every entry addressed in Tasks & Acceptance or declined under Design Notes with a reason; Rule 17 (1b)). It writes `spec-{key}.md` and halts with status `ready-for-dev`. **Lead captures the spec path** and logs `story_created`. The plan does not wait on the previous story's CI run — a plan writes a spec, not code, so it cannot build on a red (see step 4).
3. **Lead** gates the spec: Integration-AC validation (Rules 1/2), AD mapping against the spine (Rule 6), sections the template may have deleted, decision dependency (a spec that builds on a `decision-pending` ledger entry is an intent gap for the user NOW, not at the merge gate — *Unattended:* ruled or parked, U5); logs `spec_validated`; sets the story `ready-for-dev` via `SPRINT_PLAN generate --set`; bookkeeping commit (everything under `implementation-artifacts`: spec, log, tracker).
4. **Lead** resolves the previous story's `ci=pending` (see "CI Is a Gate", resolution point 1) — a red reworks that story first while this story's spec waits at `ready-for-dev`. Then the lead sets the story `in-progress` (+ `epic-{N}` lift) via `SPRINT_PLAN`, bookkeeping commit; then Agent — **IMPLEMENT**: `/bmad-build-auto`, prompt = the spec path. It implements (via its handoff subagent), self-reviews with its review layers, finalizes the spec `status: done`, and makes a local commit. **Lead** reads the spec frontmatter (`baseline_revision`; accept `baseline_commit` if a newer build-auto writes that key instead — the retrospective skill already calls `baseline_revision` deprecated), harvests `deferred:` into the ledger — each item born with an owner via `LEDGER new` (Rule 15) — sets the story `review` via `SPRINT_PLAN`, and logs `dev_complete` with `build_sha=`. The story's FIRST `dev_complete` also logs `story_base=<baseline_revision>` (the commit its first implement `stage_spawned` recorded; an unattended pick-up logs a new one — doctrine U4 — and the gates then use the latest): every rework overwrites `baseline_revision`, so the gates that judge the story's whole delivered scope — adjudication, smoke, the fresh-environment check — diff from `story_base`; only the scoped re-review uses the rework's own baseline.
5. **Lead** executes any AD-tooled AC verifications, each with a named, applied, and reverted mutation (Rule 19 — a pass without one is `unverified`; see "AD-Aware Execution").
6. Agent: `/bmad-qa-generate-e2e-tests` (scope pre-answered to this story's deliverable = `git diff --name-only <baseline_revision>..HEAD`; one demonstrated mutation per AC, Rule 19).
7. Agent: `/bmad-code-review`, with the spec path as the explicit argument (`review_mode = full`). After it returns: `SPRINT_PLAN validate` (the skill's own sprint-status sync is pre-answered to the script, but verify) and `grep -c "^## Deferred from:" <impl>/deferred-work.md` — if that count grew, the reviewer ignored the ledger pre-answer: harvest each stray bullet with `LEDGER new … cr`, strip the stray block (the one sanctioned edit — those bullets are not DW entries), and log `ledger_stray_bullets harvested=N`. Copy the reviewer's `entries:` line into `cr_complete` (root-cause counts, `rows=`, `unresolved_high_med=`). If the review leaves the story `in-progress` (a HIGH, or — first review only — an unpatched in-story MED), run the Rework Loop (max 3 iterations; each re-review scoped to the rework; a re-review with no HIGH closes the story) before proceeding.
8. **Lead** adjudicates the ledger slice this story owns (Rule 17): every entry with effective `owner=<this story key>` is closed against DELIVERED scope — `resolved-by` with evidence, re-owned with the residual restated, or terminal — until `LEDGER slice <key>` reads empty. Logs `ledger_adjudicated`.
9. **Lead** performs per-story smoke and then the fresh-environment check — the story's added and changed tests on a fresh environment, forward and reversed (Rule 19; see "Per-Story Smoke"); logs `smoke_complete` and `fresh_check`.
10. **Lead** commits (QA tests, review patches, ledger, bookkeeping) and pushes — **only to the epic branch** in every affected repo, never to main/master/develop (Rule SC-3 + SC-6) — then records the CI runs the push started on the `committed` entry (`ci=pending runs=<ids>` — every workflow's, from `CI status` — or `ci=none` / `ci=unavailable` per the pre-flight; see "CI Is a Gate"), and logs `story_cycle` (see "Cycle Log Format"). The result is resolved before the next story's implement spawn, never assumed.

A story therefore produces several commits on the epic branch: bookkeeping commits, the plan commit (spec), `bmad-build-auto`'s finalize commit (`build_sha`), and the lead's post-smoke commit (`committed sha`). That is by design; the epic's `--no-ff` merge preserves the graph.

**End of Epic (executed once per epic after all stories):**

*Read:* step 1 → `ledger-drain.md` · step 3 → `epic-gates.md` · step 4 → `ledger-drain.md`, `ci-gate.md` and `branching.md` (Rule SC-4).

1. **Lead** runs the **burn-down gate** (Rule 17, see "Ledger Drain"): every story-closable (`routed`/`open`) ledger entry owned by `burndown` or by one of this epic's story keys is resolved / made terminal now, chartered into ONE burn-down story `N.<M+1>` (M = the highest existing story number under Epic N in `epics.md` or `sprint-status.yaml`; at most `burndown_story_max` entries, by priority) that runs the full per-story pipeline before the epic closes, or — the explicit overflow — re-owned to a specific next-epic story key. `escalated` / `decision-pending` entries are not work: they are counted and handed to the decision sheet (step 4). Logs `ledger_burndown_complete` (or `ledger_burndown_skipped reason=empty`).
2. **Lead** sets `epic-{N}: done` via `SPRINT_PLAN generate --set epic-{N}=done` — a transition no skill writes (see "Status Ownership") — and logs `epic_status_done`.
3. **Lead** pauses: "Run a retrospective?" If yes, execute `/bmad-retrospective` fully interactive — the human-in-the-middle exception; see "Retrospective Per Epic".
4. **Lead** presents the **epic-close decision sheet** (Rule 17 (5): every `escalated` and `decision-pending` entry with a recommended disposition, decided in one sitting; human-owned items move to `action_items`), records the answers as `by=merge_gate` trailer lines, logs `decision_sheet_recorded`, and then pauses: "Merge `{TICKET}-epic{N}` into the feature branch and delete the epic branch (local + remote)?" — per Rule SC-4. If yes, execute the merge in each affected repo (submodules-first, parent last).

## Execution Guidelines

Each pipeline-stage task is delegated via the `Agent` tool. Lead-side skills (sprint planning, retrospective) are invoked directly via the `Skill` tool. Story planning is a **spawned** stage in v6.11 (`bmad-build-auto` never advances to another story, so the old race-ahead concern that kept story creation lead-side is gone) — what stays lead-side is the *validation* of the plan. For `bmad-build-auto` stages the completion contract is the spec file (frontmatter `status` + `## Auto Run Result`), not prose. For QA/CR stages, if a return is missing closing-summary sections, the lead extracts the file list from `git status --short` plus `git diff --name-only <baseline_revision>..HEAD` — this is normal extraction.

`/bmad-code-review` triages findings into **decision-needed / patch / defer / dismiss** buckets at **low / medium / high** severity. Under `/epic-cycle` the review agent applies every patch-bucket finding and resolves decision-needed items using best judgment plus the BMAD skill rules; only a genuine user-preference or spec-contradiction question comes back as `## Clarification Needed`. The BMAD skills must be invoked via `Skill`; don't skip steps. `/bmad-retrospective` is the one deliberate human-in-the-middle exception to the autonomous loop — it MUST run in interactive mode, and every one of its elicitation stops must reach the user (*Unattended:* headless, `-H <epic>`, doctrine U9).

## Permission Mode (Critical)

Subagents **inherit the lead session's permission mode** — on current Claude Code builds the `Agent` tool's `mode` parameter is accepted but ignored ("Deprecated; ignored. Subagents inherit the parent session's permission mode"). The effective control is therefore how the lead session was started: for an unattended run launch it with `claude --permission-mode bypassPermissions` (or `--dangerously-skip-permissions`), or `--permission-mode auto` where the harness offers it with a configured environment. Pass `mode: "bypassPermissions"` on every `Agent` call whose schema offers a `mode` parameter — harmless where ignored, honoured on older builds; where the schema has no `mode` (load it with `ToolSearch` if `Agent` is deferred), omit it, because an unknown parameter fails the call. Without an unattended permission mode the subagent prompts for every file edit and bash command and the pipeline stalls. No permission mode auto-answers `AskUserQuestion` — that tool always elicits the human. Therefore `/bmad-retrospective` is lead-only (spawned subagents cannot reliably surface their elicitation). Run unattended cycles only in a trusted/isolated environment.

Pipeline-stage subagents must be spawned **synchronously** — never backgrounded, and synchronous is a parameter, not an adjective: every `Agent` call passes `run_in_background: false` (Rule 18 (5)). On current Claude Code builds an `Agent` call that omits the flag runs in the background — it returns at once and its work continues unsupervised — so "spawn synchronously" in prose is not enough, at any depth. A backgrounded subagent never hands control back in an unattended run and the pipeline stalls (this is why `bmad-build-auto` mandates synchronous subagent calls). Parallel batches are still synchronous: N `Agent` calls in ONE message resolve together.

`bmad-build-auto` **requires** subagents of its own (it HALTs `blocked` / `no subagents` otherwise): the stage agent that runs it must be `subagent_type: "general-purpose"` (full tool set including `Agent`). Nested spawning to depth 3 (lead → build-auto stage agent → its handoff/review subagents) is verified on Claude Code (2026-08-26 spike).

**Launch environment (unattended runs).** Set these where the lead session is launched (the shell, or the user's `settings.json` `env` — a project's `.claude/settings.json` `env` applies only once the workspace is trusted). They are Claude Code settings as of 2.1.29x; check them against your version. The pre-flight reads them with `printenv` and logs `launch_env depth=<n|default> watchdog=<0|1> bash_max_ms=<n|default> context=<n|default> api_timeout_ms=<n|default>`.

- `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH` — nesting is limited to 3 layers below the main session by default. A sequential run needs 2 (stage → its handoff and review layers), a parallel run 3 (runner → stage → handoff and layers); `4` leaves headroom. At the limit an agent silently loses the `Agent` tool and does the work itself: `bmad-build-auto` then halts `no subagents`, and other skills run their review layers inline without saying so.
- `CLAUDE_CODE_RETRY_WATCHDOG=1` — retries rate-limit and overload errors (`429` / `529`) indefinitely with backoff instead of failing the stage. A `429` that reports a spend or usage limit still fails at once (see the API-error handling in "Agent Invocation Pattern").
- `BASH_MAX_TIMEOUT_MS` (with `BASH_DEFAULT_TIMEOUT_MS`) — raises the foreground cap of Rule 18 (5), default 10 minutes, for a project whose test batches need longer.
- `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS` — 20 running subagents per session by default, nested ones included; over it an `Agent` call fails with `Concurrent subagent limit reached`. A parallel run's peak is about `max_parallel_epics` × (runner + stage + its review layers).
- Headless launches (`claude -p`) only: `CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS=0`, or the process stops waiting for background runners after 10 idle minutes.

**Launch environment (the model endpoint).** This command expects a session whose model and effort were chosen at launch ("Model and Effort"). For a local or self-hosted endpoint, set these in the same place as the settings above. They are Claude Code settings as documented on 2026-11-18; check them against your version.

- `ANTHROPIC_BASE_URL`, with `ANTHROPIC_AUTH_TOKEN` or `ANTHROPIC_API_KEY` as the endpoint expects — the endpoint. It must serve the Anthropic Messages API (`/v1/messages`) and stream its responses: a gateway that buffers a response until it is complete stalls the session.
- The model — `--model`, `ANTHROPIC_MODEL`, or the `model` setting. Subagents inherit it.
- `CLAUDE_CODE_MAX_CONTEXT_TOKENS` — the model's real context window. Claude Code does not know the window of a model id it does not recognize and may assume a far larger one; the session then never compacts, and the endpoint rejects the request instead. If you also set `CLAUDE_CODE_AUTO_COMPACT_WINDOW`, keep it at or below the same figure. This command stays in the lead's context for the whole run: a window that leaves less room for work than the command itself takes is too small to lead a run.
- `API_TIMEOUT_MS` — how long a request may wait for the response to begin, 10 minutes by default. Raise it for a server that queues requests (the next item) or loads the model on first use.
- Parallel requests. BMAD's review steps launch their layers — four by default — in one message; they run in parallel, so their requests reach the endpoint together. A server with fewer slots queues them, which costs nothing as long as `API_TIMEOUT_MS` covers the wait. Before giving the server more slots, check how it divides its context window between them. To launch the layers one at a time instead, a project adds a rule under "Project-specific rules" in `_bmad/custom/skill-rules.md`, which every stage loads: "Review layers launch one at a time: one `Agent` call per message, each with `run_in_background: false`."
- The reasoning effort — `--effort`, `CLAUDE_CODE_EFFORT_LEVEL` or the `effortLevel` setting where Claude Code sends one for your model, otherwise the server's own reasoning setting. Subagents run at the session's.
- `CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS=1` — for an endpoint that rejects requests with `Unexpected value(s)` or `Extra inputs are not permitted`.

**Supervised, not unattended.** "Unattended" describes the permission mode, not the loop. Measured on a greenfield epic (field report 2026-08-29: 8 stories, 9 clarifications, 7 user decisions, zero false halts) the pipeline needs roughly **one human round trip per story**, peaking where planning artifacts meet reality for the first time, plus one decision sheet at each epic's merge gate. Every one of those halts is load-bearing: a run launched by someone who expects to walk away will experience correct behaviour as a malfunction, and the tempting reactions — pre-authorizing everything, widening footprints blindly — are worse than the wait. The levers that reduce the rate without reducing the halts are Rule 5's apply-and-report tier (amendments that preserve intent are applied, then reviewed) and Rule 11's authority/concurrency split (parallel kit); the halts themselves are not tunable. **`--unattended` changes this for the development loop only:** setup still stops, while the owner is present; after it, the loop decides small questions, parks owner-only ones and keeps going, under the project's policy (`_bmad/custom/unattended.yaml`) and the doctrine. The halts become inbox items and veto-window rulings the owner reviews with `/epic-cycle --review`.

## Model and Effort (set once, on the session)

This command names no model and no reasoning effort. Both belong to the session that runs it, and are set where that session is launched ("Launch environment"). Everything below the lead inherits them:

- **No `Agent` call passes `model` or `effort`, at any depth.** A stage agent runs on the session's model at the session's effort, and so do the agents it spawns: `bmad-build-auto`'s implementation handoff and self-review layers, `bmad-code-review`'s review layers, the epic-context compile. That is also BMAD's own rule for its review layers ("All review subagents must run at the same model capability as the current session").
- **Never add either parameter, and never write a `model:` or `effort:` line into a skill's or this command's frontmatter.** The `Agent` tool's `model` parameter takes a Claude alias, not the id of a model a local endpoint serves: a spawn that names one asks the endpoint for a model it may not have.
- **A different model for subagents is a launch setting, never a spawn parameter.** Claude Code's own `CLAUDE_CODE_SUBAGENT_MODEL` is the place for it; check on your version which model a stage then runs on. The pre-flight records the variable (`session_model … subagent_model=`).
- **One model plans, implements and reviews.** BMAD recommends running code review in a "fresh context, ideally different LLM" than the implementer. Here the fresh context carries that alone: the review stage is a new agent that sees the spec and the diff, never the implementer's conversation, and each of its layers is a separate agent again. The independent gates therefore matter more than they do with two models — never switch off a code-review layer, and never skip the lead's spec validation, AD verifications or smoke to save time.
- **The lead's own work runs on the same model.** Lead-run gate skills (`/bmad-sprint-planning`, `/bmad-retrospective`) and lead-side gates (spec validation, AD verifications, smoke, merge-conflict decisions) execute inline in the lead session.
- **There is no model-policy file and no end-of-epic model checkpoint.** Whether the model is keeping up is the owner's judgment, read from the cycle log ("Workflow Telemetry": `unresolved_high_med`, rework iterations, smoke defects). The remedy is a different model or effort on the next session, which that session's `session_model` entry records.

**Upstream levers (v6.11):** `bmad-build-auto`'s `implementation_handoff` and every skill's `review_layers[].instruction` are free-prose overrides in `_bmad/custom/<skill>.toml`. A project may switch a `bmad-build-auto` self-review layer off with `instruction = ""` in its override (File 2's note: deleting the entry does nothing, and switching off `edge-case-hunter` drops the spec-claims check); the code-review stage is the one never to cut.

## Skill Tool Invocation (Critical)

All BMAD skills must be invoked via the **`Skill` tool**, not interpreted inline. Agent spawn prompts must explicitly state: "use the `Skill` tool to invoke /bmad-build-auto" (or the relevant skill). Without this directive, agents may try to execute skill logic themselves. For `bmad-build-auto` this matters twice over: its SKILL.md is a bootstrap that runs `uv run render_skill.py` and then follows the rendered `workflow.md` — an agent that "reads the skill" instead of invoking it never renders and runs stale or unresolved workflow text.

## Agent Invocation Pattern (Required)

Each pipeline-stage subagent is a single `Agent` tool call. The `Agent` tool returns the agent's final assistant message as its result — that is the completion signal. No separate envelope, no team membership, no shutdown handshake.

For each pipeline stage, the lead:

1. **Resolves nothing: no model, no effort.** The stage runs on the session's model at the session's effort ("Model and Effort"); there is no map to consult and no policy file to read.
2. **Writes the `stage_spawned` entry** (`stage=<plan|implement|qa|code-review> spawn_at=<UTC> agent_name=<name passed on the Agent call> cycle_iteration=N`; a story's first implement spawn — and, under `--unattended`, its first after a set-aside or a re-plan — also carries `story_base=<HEAD sha>`) to the cycle log IMMEDIATELY before the call — never after. Then, if the stage is `bmad-build-auto`, **ensures the tree is clean** (Rule 16): every pending bookkeeping write including this entry is committed first; `git status --short` must be empty in the stage's working directory (and in every mounted submodule) — the one exception is the review-step intent-gap patch re-dispatch (re-dispatch protocol, step 2), whose applied patch stays uncommitted by design. An open `stage_spawned` (no closing success entry, no `<stage>_clarification_requested`) is the only durable evidence that a stage may be in flight — resume reads it before any re-dispatch.
3. **Spawns** the subagent via `Agent` with `name: "<story-key>-<stage>-<iteration>"` (the `agent_name` recorded above — pass `name` only when the tool's schema offers it; the log entry identifies the stage either way) and:
   - `subagent_type: "general-purpose"` (required for `bmad-build-auto` stages — they spawn their own subagents)
   - no `model` and no `effort` parameter — the stage, and every agent it spawns, inherits the session's ("Model and Effort")
   - `mode: "bypassPermissions"` — only when the `Agent` schema offers `mode` (see Permission Mode); omit it where the schema has none
   - `run_in_background: false` — always explicit, never omitted (Rule 18 (5)): the harness default may be background, and a backgrounded stage returns at once while its work runs on with no supervisor
   - `description: <3-5 word task description>`
   - `prompt: <full task — see Spawn Prompt Skeleton below>`
4. **Reads the result.** For `bmad-build-auto` stages: re-read the spec file from disk — frontmatter `status` (`ready-for-dev` after a plan spawn; `done` after an implement spawn; `blocked` otherwise) and the `## Auto Run Result` section (`Status:` / `Blocking condition:`); the agent's prose is advisory. For QA/CR stages: the returned message's closing-summary sections (`## Files Modified`, `## Tests Added`, `## Decisions`, `## Issues Encountered`).
   **A harness error is not a stage result.** If the `Agent` result is an error from the harness rather than the stage's report — `Agent terminated early due to an API error: …`, or a rate-limit, overload, or usage-limit message — the stage did not finish. Log `stage_api_error stage=<stage> error=<rate_limit|overload|usage_limit|other>`; wait (rate limit or overload: about 5, then 10, then 20 minutes; a spend or usage limit: STOP and surface it to the user — waiting will not clear it; *Unattended:* hold, U11); then re-spawn the stage per the **Re-dispatch protocol** ("Clarification protocol"): its open `stage_spawned` entry stands, a `bmad-build-auto` stage resumes from the spec's `status`, and the tree is checked first — a stage cut off mid-edit can leave changes behind, which Rule 18 (4)'s quiescence samples and the Rule 16 clean-tree gate catch. It is never a failed story and never a rework iteration. (Field report 2026-10-10: at least seven runner kills from rate limits or quota in one month-long run.)
5. **Falls back** to `git diff --name-only <baseline_revision>..HEAD` + `git status --short` if closing sections are missing.
6. **Records** the stage in the cycle log per the telemetry spec.
7. **Proceeds** to the next stage. No shutdown step.

**Lead-run gate skills run in the lead's context.** `/bmad-sprint-planning` and `/bmad-retrospective` are invoked by the lead directly via the `Skill` tool (not spawned as sub-agents). This is by design (these gates must stay lead-side; see "Sprint Planning Per Epic" and "Retrospective Per Epic").

### Spawn Prompt Skeleton

Every Agent spawn prompt must include, in this order:

1. The literal marker `**Epic Cycle Stage: <plan|implement|qa|code-review> for Story <id>**`.
2. The dispatch anchor: for **plan**, the sprint-status story key (e.g. `3-2-digest-delivery`) — never a spec path, never a spec folder; for **implement / qa / code-review**, the spec file path captured at `story_created`.
3. The list of files modified by upstream stages (for QA: `git diff --name-only <baseline_revision>..HEAD`; for code review: that list plus QA's `## Tests Added`).
4. The architecture spine path from `spine_resolved` (`<planning>/architecture/<run-folder>/ARCHITECTURE-SPINE.md`, or "none") as factual context — its `AD-n` blocks are the project's architecture decisions (Rule 6).
5. The directive: `Use the Skill tool to invoke /<bmad-skill-name>.` For `bmad-build-auto` the skill's own argument is the dispatch anchor from item 2 — for the plan stage append the exact sentence `Halt after planning.` to the argument.
6. The stage-file directive and the **Values** list (see "Stage files" below). The file carries the stage's rules and — for QA/CR — its **pre-answered checkpoints**: every interactive menu/halt the skill will hit, with the chosen option, so the agent never waits on input that cannot arrive (Rule 9). `bmad-build-auto` has no checkpoints; its files carry rules only.
7. The completion-contract directive — for QA/CR quote the closing-summary section names inline; for `bmad-build-auto` state that the spec file's frontmatter `status` + `## Auto Run Result` is the contract and that the agent must not push.
8. Skill-specific context.

**Unattended runs:** after these items, append the `## Unattended run` block the doctrine renders from the policy (U6); the policy's `stage_preamble`, when set, heads the prompt instead.

### Stage files (the stage agent reads its own instructions)

Each stage's rules, pre-answered checkpoints and completion contract are a file the stage agent reads. The lead never pastes them, and does not need to hold them:

| Stage | File |
| --- | --- |
| plan (`bmad-build-auto` + `Halt after planning.`) | `_bmad/custom/epic-cycle/stage-plan.md` |
| implement (`bmad-build-auto` on the planned spec) | `_bmad/custom/epic-cycle/stage-implement.md` |
| qa (`bmad-qa-generate-e2e-tests`) | `_bmad/custom/epic-cycle/stage-qa.md` |
| code-review (`bmad-code-review`) | `_bmad/custom/epic-cycle/stage-code-review.md` |

Item 6 of every spawn prompt is the text below, with the stage's file as an absolute path and every value you have filled in:

```text
FIRST ACTION, before you invoke the skill or touch anything: read <abs-root>/_bmad/custom/epic-cycle/stage-<stage>.md in full. It is the rest of this prompt: its rules, its pre-answered checkpoints and its completion contract bind you exactly as if they were written here. Where it writes one of the names below in angle brackets, use the value given here.

Values:
- story-key: <the sprint-status key>
- id: <the story id>
- N: <the epic number>
- spec path: <the spec file — "none yet" for the plan stage>
- baseline_revision: <sha — "none yet" until the implement stage has run>
- impl: <path>
- planning: <path>
- project_name: <name>
- path-to: <the skills directory>
- ledger: <impl>/deferred-work.md
- ledger inbox: <plan stage only: the output of `LEDGER slice <story-key>`, or "(none)">
- rework: <re-spawns in the Rework Loop only — implement: `k=<iteration>`; code review: `k=<iteration>`, `rework baseline sha=<sha>`, `original baseline sha=<sha>`, `list=<the previous round's unresolved items>`>
```

- **The `rework:` line is how a rework block is "appended".** Where the Rework Loop or the Pipeline Flow says to append the "Rework re-dispatch" block (implement) or the "Rework re-review" block (code review), give the `rework:` line: each block is the last part of its stage file and applies only when that line is present. Leave the line out of every other spawn.
- **A stage's "block" is its file.** Where a section speaks of the plan block, the implement block, the QA block or the CR block, it means that stage's file.
- **Always an absolute path.** A stage agent resolves a relative path against its own idea of the working directory (Rule 13).
- **Never paraphrase a stage file into the prompt, and never drop the directive to save words.** Without it the stage runs the skill with no rules, no pre-answers and no containment text.
- **A project's own additions to a stage's instructions go into the stage file**, through the overlay (`_bmad/custom/epic-cycle-overlay.md`), never into the prompt.

### Pipeline Flow

```
Lead resolves the architecture spine (newest final ARCHITECTURE-SPINE.md, else newest, else *architecture*.md, else none); logs spine_resolved — path included in every spawn prompt.

For each epic in range:
  Lead verifies clean working tree (parent + every submodule); halts on dirty state.

  # IDE file-sync toggle applicability — conditional, IRIS/ObjectScript projects only (see Source Control Branching)
  ideSync = (.vscode/settings.json exists AND objectscript.conn.active == true)
  If ideSync: record original value   # sync STAYS ON except inside the two branch-op windows; never stage settings.json
  If ideSync: set objectscript.conn.active = false   # >>> Window A start — wraps resume-checkout + SC-1/SC-2 + epic-branch checkout

  # Resume-mode detection (see Resume Semantics)
  For each affected repo, lead determines mode by cross-referencing:
    - cycle-log-epic-{N}.md existence + entries
    - sprint-status.yaml story states for this epic
      (SPRINT_PLAN status for the computed snapshot — per-status counts, recommendation.story_key;
       SPRINT_PLAN validate first if the YAML's integrity is in doubt; per-story states via the
       TRACKER_READ shorthand — status has no per-story list)
    - spec-<key>.md frontmatter status per story (draft | ready-for-dev | in-progress | in-review | done | blocked)
    - {TICKET}-epic{N} branch presence locally and on remote
  Modes per repo: FRESH | RESUME | REMOTE_ONLY | LOCAL_ONLY | AMBIGUOUS | INTEGRITY_ERROR
    INTEGRITY_ERROR or AMBIGUOUS → halt and surface to user
    LOCAL_ONLY                   → halt and ask user (remote deletion intentional?)
    REMOTE_ONLY                  → fetch + checkout {TICKET}-epic{N}; then RESUME
    RESUME                       → run Cross-stage integrity checks; on pass, set resume point
    FRESH                        → fall through to SC-1 / SC-2

  # SC-1 / SC-2 — only where FRESH
  For each repo in FRESH:
    Lead verifies the feature branch
      If missing → STOP and ask user (TICKET, Description, root); validate; create; push; log feature_branch_created
    Lead verifies {TICKET}-epic{N}
      If missing → branch off the feature branch (deterministic); push; log epic_branch_created
  Lead checks every affected repo out to {TICKET}-epic{N}; logs epic_branch_checked_out
  If ideSync: restore objectscript.conn.active to original   # <<< Window A end — MANDATORY (try/finally; restore even on halt/failure)

  Lead: LEDGER load → re-own every owner=none entry (append owner=<story key>|burndown) → logs ledger_load   # see Ledger Drain
    (a legacy-grammar ledger — no `### DW-` headings — HALTS here: run the Step-1 migration first)
  Lead executes /bmad-sprint-planning via Skill tool, HEADLESS, with "Ledger load: <the load line>" in its argument; parses the trailing JSON:
    gate=FAIL or status=blocked → STOP; surface findings (and the saved implementation-readiness.md if written)   # Unattended: at a later epic's start, FAIL stops that epic (U8)
    gate=CONCERNS → surface once; continue
    gate=PASS → continue
  Lead logs sprint_planning_complete gate=<PASS|CONCERNS>
  If Epic N-1 retrospective exists OR LEDGER slice all is non-empty OR sprint-status.yaml action_items has status=open entries,
     AND no prior retro_review_* entry for this epic:
    Lead reads all sources, CLOSES every ledger item (resolved-by | own | terminal — Rule 17), inserts Story X.0 into epics.md,
      plans it via the normal PLAN spawn, appends the triage table to the spec; logs retro_review_complete
  Else if no prior retro_review_* entry:
    Lead logs retro_review_skipped reason=no_retro_no_open_ledger_no_open_action_items
  Else:
    (resume case — gate already passed; skip)

  # Epic-context pre-warm (see "Epic Context Pre-warm") — after any epics.md edit, before the first plan spawn
  Lead renders bmad-build-auto, spawns a subagent on the rendered compile-epic-context.md for epic N, verifies the header,
    bookkeeping commit; logs epic_context_compiled

  For each story, strictly sequentially, starting from the resume point:
    If any file in planning_artifacts is newer than epic-{N}-context.md → re-run the pre-warm + bookkeeping commit first
    Lead asserts current branch == {TICKET}-epic{N} in every affected repo; halts on mismatch
    Lead writes stage_spawned (stage= spawn_at= agent_name= cycle_iteration=) IMMEDIATELY BEFORE each Agent call —
      for build-auto stages inside the bookkeeping commit that precedes the spawn; closed by the stage's success entry or a clarification entry

    # --- PLAN ---
    Lead logs stage_spawned stage=plan; bookkeeping commit (Rule 16: tree clean before every build-auto spawn)
    Lead invokes Agent for /bmad-build-auto with "<story-key> Halt after planning."
      → re-reads spec-<key>.md: status ready-for-dev → captures spec path; logs story_created path=<spec> build_status=ready-for-dev
      → status blocked → Clarification protocol (build-auto table)
    Lead validates the spec: Integration ACs (Rules 1/2), AD mapping (Rule 6), deleted sections re-created, decision dependency   # see "Lead Validates the Story Spec"
    Lead logs spec_validated; SPRINT_PLAN generate --set <key>=ready-for-dev; bookkeeping commit (everything under implementation-artifacts)

    # --- IMPLEMENT ---
    Lead resolves the PREVIOUS story's ci=pending (CI status) → logs ci_resolved   # resolution point (1): the plan above did not wait
      failure → classify (logs ci_red_classified): infra → timed retry, never rework | flake → one rerun + flake: ledger entry | story → HIGH: re-open THAT story's spec with a [CI] task, one rework iteration, re-smoke, re-commit — this story's spec waits at ready-for-dev (inherited red → surface to the user)
    Lead: SPRINT_PLAN generate --set <key>=in-progress --set epic-{N}=in-progress; bookkeeping commit
    Lead invokes Agent for /bmad-build-auto with the spec path
      → re-reads spec: status done → build_sha = HEAD (its finalize commit); asserts tree clean
        Lead harvests spec frontmatter deferred: → LEDGER new … <status> <owner> harvest (born owned, Rule 15); SPRINT_PLAN generate --set <key>=review
        Lead mirrors baseline_revision into the spec frontmatter as baseline_commit (bmad-code-review reads that key)
        logs dev_complete build_sha=<sha> baseline_revision=<sha> review_loop_iteration=<n> followup_review_recommended=<bool> deferred=<n>
      → status blocked → Clarification protocol (build-auto table)
    Lead executes AD-tooled AC verifications against the spine (lead-side, sequential per AC, one mutation each — Rule 19); logs adr_verifications_complete
    Lead invokes Agent for /bmad-qa-generate-e2e-tests → reads ## Tests Added → logs qa_complete
    Lead invokes Agent for /bmad-code-review with the spec path → reads return
      → verifies sprint-status.yaml moved to done|in-progress; if still review, SPRINT_PLAN generate --set <key>=<reviewer's final status>; SPRINT_PLAN validate
      → checks for stray "## Deferred from:" bullets in deferred-work.md (reviewer ignored the ledger pre-answer) → harvest via LEDGER new, strip, log ledger_stray_bullets
      → logs cr_complete
    If review returned a ## Fix Pack (trivial LOW, Rule 15): the reviewer has already applied mechanical patches; behavioral-but-trivial items go through ONE rework iteration below (cycle_iteration+1) — bounded: exactly one fix-pack iteration per story, shared with the first-review MED iteration; the smoke gate still follows
    While review left story in-progress (a HIGH; or, on the story's FIRST review only, an unpatched in-story MED with fix-risk ≤ med — `routed` / `escalated` mediums never block) AND rework iterations < 3:   # see Rework Loop
      Lead re-opens the spec (status in-progress; unresolved findings appended as unchecked Tasks & Acceptance items); logs rework_opened trigger=<high|med_first_review|fix_pack|smoke|ci> items=<csv>; REWORK commit (QA tests + reviewer patches + bookkeeping)
      Lead re-spawns /bmad-build-auto on the spec (cycle_iteration+1; "Rework re-dispatch" block appended: work only the open items, followup_pass=true) → harvest deferred:, logs dev_complete
      Lead re-runs AD verifications if rework touched AD-constrained ACs; SPRINT_PLAN generate --set <key>=review
      Lead sets spec baseline_commit = this rework's baseline_revision (scoped re-review: <rework baseline>..HEAD, never the whole story again); re-spawns /bmad-code-review with the "Rework re-review" block → logs cr_complete
      A re-review that finds no HIGH closes the story (remaining MEDs routed/escalated with owners) — the loop exits here even if MEDs remain (Rule 15 exit condition)
    If still in-progress after 3 iterations (Unattended: no override — stop the story, set it aside; U4-U5): STOP; logs rework_cap_reached; surface outstanding findings to user — an override is accepted only with a finite item list and closes at the next review without HIGH (rework_cap_override items=… close=…; see Rework Loop)
    Lead adjudicates LEDGER slice <key> against delivered scope (resolved-by | re-own | terminal) until empty; logs ledger_adjudicated   # Rule 17
    Lead performs per-story smoke (lead-side); logs smoke_complete
    Lead runs the fresh-environment check (the story's added + changed tests on a fresh environment, forward then reversed — Rule 19); logs fresh_check; red → failed-smoke path
    Lead asserts current branch == {TICKET}-epic{N}; commits (QA tests, review patches, bookkeeping) + pushes ONLY to {TICKET}-epic{N} (submodules first if applicable)
    Lead verifies the push on origin (git fetch; merge-base --is-ancestor) and the runs' headSha; logs committed ci=pending runs=<ids> (CI status: every workflow; ci=none|unavailable per pre-flight); logs story_cycle; next story
    # the pending run is resolved before the NEXT story's implement spawn — its plan proceeds meanwhile (see IMPLEMENT above)

  # Burn-down gate (Rule 17) — before the epic closes
  Lead: LEDGER slice burndown + slice <each story key of epic N>:
    empty → logs ledger_burndown_skipped reason=empty
    else  → set aside every escalated / decision-pending entry for the decision sheet (to_decision_sheet=N; never re-own or decide them here)
            resolve / terminal what can be closed now; if what remains exceeds ledger_cap (default 8) OR any remaining entry has 2+ occurrences:
              charter Story N.<M+1> "Epic N burn-down" (M = highest existing story number under Epic N across epics.md + sprint-status.yaml; reuse an existing burn-down story) — at most burndown_story_max (default 12) entries by priority (severity, occurrences, low fix-risk first)
              (insert into epics.md, SPRINT_PLAN generate, pre-warm, full per-story pipeline incl. its own ledger_adjudicated)
            every entry still non-terminal (the overflow) → append owner=<specific next-epic story key> with the reason (never "burndown", never "none")
            logs ledger_burndown_complete open_before= resolved= terminal= chartered= chartered_size= overflow= reowned= to_decision_sheet= open_after= cap= story_max= filed_this_epic= closed_this_epic= drain_ratio=
  Lead: SPRINT_PLAN generate --set epic-{N}=done (no skill writes this transition); bookkeeping commit; logs epic_status_done
  Lead pauses: "Run a retrospective?"   # human-in-the-middle gate — never auto-answered, never times out into a default (Unattended: headless -H <epic>, verdict read; U9)
    If yes → /bmad-retrospective via Skill tool, fully interactive (all WAITs reach the user), with the burn-down counts in its argument; logs epic_retro_complete
    If no  → logs epic_retro_skipped reason=user_declined
  Lead presents the epic-close decision sheet (Rule 17 (5)): every escalated + decision-pending entry, one sitting, recommended disposition each   # Unattended: classified; owner-only → inbox (U9)
    → writes the answers as by=merge_gate trailer lines (human-owned → action_items + dropped note=action_item); bookkeeping commit; logs decision_sheet_recorded
  Lead pauses: "Merge {TICKET}-epic{N} → feature, delete {TICKET}-epic{N}?" → if yes:   # Unattended: when_green, integrate forward first (U9)
    Logs epic_merge_started head=<CI-verified sha> on the epic branch; bookkeeping commit (the merge carries it to origin)   # the write-ahead marker
    If ideSync: set objectscript.conn.active = false   # >>> Window B start — wraps the merge branch ops
    For each affected repo, submodules-first then parent:
      checkout feature; pull; merge --no-ff {TICKET}-epic{N}; push feature; delete {TICKET}-epic{N} local + remote
    If ideSync: restore objectscript.conn.active to original   # <<< Window B end — MANDATORY (try/finally; restore even on conflict/halt)
    Verifies on origin; logs epic_merged_to_feature on the feature branch; commits it (chore(epic-N): record merge); pushes
  Else:
    Logs epic_merge_skipped
  Logs epic complete; next epic
```

### Status Ownership (who writes sprint-status.yaml)

`bmad-build-auto` never touches `sprint-status.yaml` (only the interactive `bmad-build` syncs it, and that skill is not a pipeline stage), so under v6.11 the **lead** owns the early story transitions and writes them ONLY through `SPRINT_PLAN generate --set` (deterministic, preserves comments; `--set` is unconditional, so the lead checks the current value first and never writes a lower rank):

| Transition | Written by |
| --- | --- |
| file generation, `backlog` seeding, `epic-N` keys, `epic-N-retrospective: optional` | `/bmad-sprint-planning` (headless) via `sprint_plan.py generate` |
| story `backlog → ready-for-dev` (after the plan spawn is validated) | **the lead** — `SPRINT_PLAN generate --set <key>=ready-for-dev` |
| story `ready-for-dev → in-progress` + epic `backlog → in-progress` lift (immediately before the implement spawn) | **the lead** — `--set <key>=in-progress --set epic-{N}=in-progress` |
| story `in-progress → review` (after the implement spawn's spec reads `status: done`) | **the lead** — `--set <key>=review` |
| story `review → done` (or back to `in-progress`) | `/bmad-code-review` (its step-04 sync). The skill only sets `{story_key}` itself when it found the story via its sprint-status scan; on an explicit spec-path dispatch the spawn prompt must state the key, and the **lead verifies after `cr_complete`** that the file moved — if it still reads `review`, apply the reviewer's reported final status with `SPRINT_PLAN generate --set` (this is the one sanctioned lead write of `done`/`in-progress` for a story). |
| `epic-{N}-retrospective: optional → done`, `action_items` append | `/bmad-retrospective` via its `sprint_status.py update` |
| **epic `in-progress → done`** (after the last story reaches `done`) | **the lead** — `--set epic-{N}=done`; log `epic_status_done` |

Status enum (kebab-case, unchanged in BMAD v6.11): story `backlog → ready-for-dev → in-progress → review → done`; epic `backlog → in-progress → done`; retrospective `optional → done`; action items `open → in-progress → done`; legacy aliases `drafted` ≡ `ready-for-dev`, `contexted` ≡ `in-progress` (normalized by the script). Never downgrade a status, except the Rework Loop's re-open of a `done` story and an unattended set-aside — `--set` would happily do it (it is the script's repair path), so read before you write; never hand-edit the YAML.

**Do not confuse the two status vocabularies.** The spec file's frontmatter `status` is `bmad-build-auto`'s machine state: `draft | ready-for-dev | in-progress | in-review | done | blocked`. `in-review` (spec, mid-self-review) is NOT `review` (sprint-status, awaiting code review), and a spec at `done` means "build-auto finished", not "story done" — the story is `done` only when `bmad-code-review` says so. Never copy one vocabulary into the other.

### Context Handoff Between Stages (Critical)

The **spec file path** is the canonical context anchor, passed forward to every downstream agent. File lists flow from git (build-auto commits its work) and from the closing-summary sections of the QA/CR returns.

1. Plan → lead: the spec path (from the `SPEC:` line; verified by glob).
2. Lead → Implement: the spec path only (build-auto loads the spec's `context:` docs itself).
3. Implement → QA: lead reads `baseline_revision` from the spec frontmatter (or `baseline_commit` if that is the key a newer build-auto writes — accept either), computes `git diff --name-only <baseline_revision>..HEAD`, passes spec path + that list to QA.
4. QA → Code reviewer: lead reads `## Tests Added` from QA, passes spec path + `baseline_revision` + the diff list + QA's tests.
5. Code reviewer → Commit: lead stages the union of QA's tests, the reviewer's patches, and bookkeeping files (build-auto's own work is already committed).

If a QA/CR return is missing closing sections, fall back to `git status --short` plus the diff list above.

### Lead Context Management (long-run hygiene)

The lead's context window is the scarcest resource in a multi-epic run. Fresh context per stage is the point of the subagent design — both Anthropic's long-horizon-agent guidance and BMAD's own docs ("run each skill in a fresh context window") converge on it. Lead-side rules:

- The cycle log + `sprint-status.yaml` + spec files are the durable state — treat them as external memory (write-ahead, then act). Never rely on conversation memory for a resume or gating decision.
- Do NOT pull stage diffs, full test output, or whole spec files into the lead's context; the completion contracts exist precisely so stage detail stays in the stage. The lead reads a spec only at gates that require it (spec validation, AD mapping, rework re-open, smoke planning) and otherwise reads only its frontmatter and `## Auto Run Result`.
- After a context compaction/summarization event, re-anchor before the next action: re-read this command file in full (compaction keeps only its first ~5,000 tokens), then the section file for the current stage or gate (Section Index), then the cycle-log tail, the sprint-status snapshot (`SPRINT_PLAN status`), the current spec path and its frontmatter `status`. The write-ahead rule guarantees the state is recoverable from those files; the command text is what says what to do with it.
- Never load the rendered `bmad-build-auto` workflow into the lead's context — it runs inside the stage agent. The lead only ever reads spec frontmatter and the `## Auto Run Result` section.
- Never open `deferred-work.md`. A healthy ledger is small; an unhealthy one is megabytes, and either way `LEDGER load|slice|show` returns exactly the lines a gate needs.
- Budget: one story's pipeline should cost the lead only its gate-skill invocations, spawn prompts, returned closing summaries, and log writes.
- Section files are read at their gate, not before. A section you do not need yet is context you pay for on every turn; a section you needed three stories ago is still the rule — when in doubt at a gate, read its file again rather than acting from memory.
- A smaller window compacts more often. On a model with less room than the windows this pipeline was developed on, expect compaction inside an epic, not only between epics: the re-anchor above is then routine, and it works only because every fact it needs was written to disk first. Keep Claude Code's idea of the window equal to the model's real one ("Launch environment"), so compaction happens before the endpoint rejects a request.

## When to Pause

*Unattended:* stages still halt with `## Clarification Needed` for anything outside the Unattended block's decide-small rule (U6); the lead classifies instead of pausing (U5).

Within each agent, halt and surface a clarification via `## Clarification Needed` if ANY hold:

- Ambiguous ACs or requirements.
- Missing prerequisite — story references data/code/context not present.
- Multiple reasonable design options where user preference matters.
- Environment or dependency failure blocking the work.
- Proceeding would risk breaking a stated constraint (security, compliance, performance, correctness, an AD's Rule).

Do not guess; do not soldier on. A short pause beats a wrong implementation unwound later.

## Handling Clarifications

*Unattended:* classify, then rule or park — doctrine U5.

When an agent returns with `## Clarification Needed`:

1. Read the question from the returned message.
2. Surface it to the user with Story ID + context.
3. Wait for the user's answer.
4. Re-spawn the same stage's agent with the clarification baked in (prompt, or the spec's `## Design Notes` — committed first, Rule 16; an answer with architectural weight also goes into the spine, Rule 20). Never `SendMessage` the old agent (see Anti-Patterns).
5. Log `<stage>_clarification_requested` before re-spawn; the stage's normal success entry (`story_created` / `dev_complete` / `qa_complete` / `cr_complete`) closes it.

**Key distinction:** clarification-needed is not a completion — closing sections won't be present. Detect via the `## Clarification Needed` heading (QA/CR stages) or the spec's `status: blocked` (build-auto stages — see the blocking-condition table and re-dispatch protocol under "Clarification protocol").

## Submodule / Sub-Repository Commit Order (Critical, if Applicable)

Applies to projects with git submodules OR sub-repositories. Skip if neither applies.

When stories modify files in child-repo directories:

1. **Commit and push inside each affected child first.** For git submodules, this produces an updated submodule pointer the parent will reference.
2. **Then commit and push in the parent.** For submodules, stage both parent files AND the updated pointer (`git add <submodule-path>`). For sub-repositories, the parent references children only at workflow level; children should still be pushed first.

If the parent is pushed with a submodule pointer that doesn't exist on the submodule's remote, other developers get checkout failures. Always submodules-first.

After each story, run `git -C <child-path> status --short` for every affected child to detect changes.

## Completion Logging

At each story completion, write a brief log entry: story ID/name, files touched, key design decisions, issues auto-resolved vs requiring user input.

### Cycle Log Format (enables resume)

Per-stage log entries, append-only. File: `_bmad-output/implementation-artifacts/cycle-log-epic-{N}.md`.

**Format (TAB-separated, exactly four fields):**

```
<UTC-timestamp> TAB <Story <id> | Epic <N>> TAB <stage> TAB <metadata>
```

- Fields separated by a literal TAB (`\t`), not spaces.
- The **metadata** field is whitespace-separated `key=value` pairs. Multi-values comma-separated; no spaces or tabs inside values (percent-encode if needed). Keys are lowercase snake_case.
- **Every sha is read, never recalled.** A `sha=` / `head=` / `build_sha=` / `baseline_revision=` value — in a log entry, a `## Clarification Needed`, or a completion contract — is produced by `git rev-parse --short <ref>` at the moment of writing, never from earlier context (field case 2026-08-29: a clarification quoted a HEAD that did not exist in the repository). The party reading a quoted sha verifies it resolves (`git cat-file -e <sha>`) before acting on it and logs a mismatch as `report_error fault=<lead|stage|runner> field=<name> reported=<sha> actual=<sha>`.
- **Durable facts are verified on origin.** `committed`, `ci_green_verified` and `epic_merged_to_feature` are written only after `git fetch` and `git merge-base --is-ancestor <sha> origin/<branch>` succeed, and a green only when `CI status` reports every workflow green (or `untriggered`) on that exact head ("CI Is a Gate").
- **A CI-fix commit is logged under the story it fixes** (`committed … fix_for=<story-key>`), never under the story in flight — otherwise one story's cycle time absorbs another's fix (field report 2026-10-10: one story read 16.4 hours when it took 5.6).
- Two entry kinds (distinguished by field 2):
  - **Story-level:** `Story <id>` (most entries).
  - **Epic-level:** `Epic <N>` (branch lifecycle + the optional epic summary).

**Valid story-level stages, in order:** `stage_spawned` (write-ahead marker IMMEDIATELY before every stage `Agent` call — see below), `story_created` (plan spawn returned `ready-for-dev`), `spec_validated` (lead gate passed; `ready-for-dev` written), `dev_complete` (implement spawn returned `done`; `review` written), `adr_verifications_complete` (mandatory, between dev and qa; emits `result=none_required` if no AD-tooled ACs), `qa_complete`, `cr_complete`, `ledger_adjudicated` (mandatory, after the last cr and before smoke — Rule 17), `smoke_complete` (mandatory, between adjudication and commit), `fresh_check` (mandatory, after smoke — Rule 19; metadata `env=<recipe|clean-checkout> tests=<n> result=<pass|fail> order=forward,reverse`), `committed`, `story_cycle` (mandatory, right after `committed` — one line the telemetry reads instead of re-deriving it: `plan_to_commit_min=<n> implement_passes=<n> reviews=<n> rework=<n> first_ci=<success|story|flake|infra|pending|none>`; `first_ci` is back-filled by a later `ci_resolved story=<id>` entry, never by editing this line). Also story-level, whenever they occur: `stage_api_error` (a stage `Agent` call ended on a harness error — metadata `stage= error=<rate_limit|overload|usage_limit|other> wait_min=<n>`; closed by the re-spawn's normal entry) and `ci_red_classified` (metadata `run=<id> class=<story|flake|infra> test=<name|none>`). Clarification events use `<stage>_clarification_requested` (`<stage>` ∈ `plan | dev | qa | cr`), closed by that stage's normal success entry on the re-spawn — `story_created` for `plan`, `dev_complete`, `qa_complete`, `cr_complete` — never by a literal `<stage>_complete` (there is no `plan_complete`). Optional: `bookkeeping_committed sha=<short>` after each Rule 16 commit (aids resume forensics; not required). Rework-loop entries (story-level, between `cr_complete` and the next `stage_spawned`): `rework_opened` — the lead re-opened the spec; metadata `cycle_iteration=N iteration=<k> trigger=<high|med_first_review|fix_pack|smoke|ci|cap_override> items=<csv of finding / DW ids> scope_baseline=<sha>`. `rework_cap_reached` — the third iteration did not converge; metadata `cycle_iteration=N rework_iterations_used=3 cap=3 outstanding=<csv> result=stop_and_surface`. `rework_cap_override` — the user authorized one more iteration; metadata `cap=3 used=3 authorized_by=user items=<finite csv> close=next_review_without_high` — an override without `items=` is not writable: ask for the list first (Rework Loop step 5).

**`stage_spawned` — the in-flight marker.** Written IMMEDIATELY BEFORE the `Agent` call for any pipeline stage, never after. Metadata: `stage=<plan|implement|qa|code-review> spawn_at=<UTC> agent_name=<name passed on the Agent call> cycle_iteration=N`, plus `story_base=<HEAD sha>` on a story's first implement spawn (and, unattended, its first after a set-aside or a re-plan). Closed by that stage's success entry (`story_created` / `dev_complete` / `qa_complete` / `cr_complete`) or by a `<stage>_clarification_requested`; the success entry's `spawn_at=` repeats the marker's value. A `stage_spawned` with no closing entry is the ONLY durable evidence that a stage may still be in flight — resume MUST check for it before any re-dispatch, and (orchestrator mode) it names the runner-owned agent to ask about. The durable record is otherwise empty for exactly the window in which liveness matters; this entry fills it.

**Valid epic-level stages:**

- `feature_branch_created` — SC-1 created the feature branch. Metadata: `repos=<paths>` `ticket=<id>` `description=<desc>` `root=<origin/branch>`.
- `epic_branch_created` — SC-2 created `{TICKET}-epic{N}`. Metadata: `repos=<paths>` `from=<feature-sha>`.
- `ci_mode_changed` — A run that began without CI found a workflow ("CI Is a Gate"). Metadata: `from=none` `to=gh` `sha=<sha>`.
- `epic_branch_checked_out` — Lead checked out `{TICKET}-epic{N}` (resume or after creation). Metadata: `repos=<paths>` `head=<sha>`, plus `ci=unavailable reason=no_push_trigger` when no workflow runs on a push to the epic branch ("CI Is a Gate").
- `epic_branch_reopened` — SC-5 recreated after a prior merge. Metadata: `reason=<short>` `from=<feature-sha>`.
- `session_model` — Pre-flight record of the model this session runs on; every stage inherits it ("Model and Effort"). Metadata: `model=<declared id|unknown>` `subagent_model=<CLAUDE_CODE_SUBAGENT_MODEL's value|unset>`. Written on every invocation, a resume included, so the entries between two of them ran on the first one's model.
- `runtime_gate` — Pre-flight BMAD/uv/CI check. Metadata: `bmad=<version>` `uv=<version>` `ci=<gh|none|unavailable>`. (Pre-flight entries are held until Task Sequence step 4 has checked the FIRST epic of the range out to its epic branch, then written to that epic's cycle log, as `Epic <N>`, ahead of this run's other entries and committed with its first bookkeeping commit — never written before step 1's clean-tree check, which they would fail, and never on the feature branch or the trunk. A crash before then loses nothing: the pre-flight runs again on every invocation.)
- `launch_env` — Pre-flight read of the launch environment ("Permission Mode"). Metadata: `depth=<n|default>` `watchdog=<0|1>` `bash_max_ms=<n|default>` `context=<n|default>` `api_timeout_ms=<n|default>`.
- `protocol_violation` — Any layer observed a containment breach (Rule 18: subagent commit/push, orphan writer, interim return, `SendMessage` to a returned agent). Metadata: `stage=<name>` `depth=<N>` `agent=<name>` `violation=<short>` `consequence=<short>` `detected_by=<short>` `outcome=<short>`. Never omitted "because it was handled" — the record is the point.
- `root_freshness_resolved` — SC-1 root freshness check needed a user decision. Metadata: `repo=<path>` `root=<origin/branch>` `choice=push_local_first|base_on_local|base_on_origin_anyway`.
- `epic_context_compiled` — Lead-driven epic-context pre-warm wrote `epic-{N}-context.md`. Metadata: `sha=<bookkeeping-commit>` `reason=<initial|planning_artifact_newer|x0_inserted|nfr_amendment>`.
- `spine_resolved` — The architecture spine the epic will read and write (Rule 6/20). Metadata: `path=<path|none> ads=<N> status=<final|draft|none>`.
- `spine_updated` — A decision with architectural weight was written into the spine (Rule 20). Metadata: `ad=<AD-n|conv|stack|deferred> reason=<clarification|rule5|decision_sheet> by=<lead|runner> story=<key|none> lint=ok`.
- `ledger_stray_bullets` — A reviewer wrote `## Deferred from:` bullets instead of ledger entries; the lead harvested them. Metadata: `harvested=N story=<key>`.
- `ledger_owner_repaired` — `ledger_load` found `UNKNOWN` owners and re-owned them by unique `<epic>-<story>-` prefix (Rule 17 (1)). Metadata: `repaired=N halted=N` (`halted` > 0 means an ambiguous key stopped the run).
- `ledger_routed_planned` — `DW-n:` acceptance bullets written into receiving stories' `epics.md` blocks (Rule 17 (1b)). Metadata: `story=<key> entries=N excess=N by=<harvest|cr|adjudication|burndown|merge_gate>`.
- `merge_gate_blocked` — SC-4 precondition failed. Metadata: `reason=<ci_red|…> runs=<ids> job=<name> head=<sha>`.
- `ci_green_verified` — The branch head's CI is `success`: every run of every workflow the push started (`CI status`), read independently by the lead/orchestrator. Metadata: `runs=<ids> head=<sha>`, plus `result=<untriggered|none>` and `via=<sha>` when the verdict is not a plain `success` on the head itself.
- `ledger_load` — Epic-start ledger measurement, before sprint planning (Rule 17). Metadata: `total=N open=N routed=N escalated=N decision_pending=N terminal=N burndown=N reowned_none=N`.
- `sprint_planning_complete` — Sprint planning done. Metadata: `gate=<PASS|CONCERNS>`.
- `ledger_burndown_complete` / `ledger_burndown_skipped` — End-of-epic burn-down gate (Rule 17), after the last `committed` and before `epic_status_done`. Metadata: `open_before=N resolved=N terminal=N chartered=N chartered_size=N overflow=N reowned=N to_decision_sheet=N open_after=N cap=N story_max=N filed_this_epic=N closed_this_epic=N drain_ratio=X.XX` for complete; `reason=empty` for skipped.
- `decision_sheet_recorded` / `decision_sheet_skipped` — Epic-close decision sheet at SC-4 (Rule 17 (5)): every `escalated` / `decision-pending` entry decided by the user in one sitting. Metadata: `decided=N to_action_items=N to_x0=N`; `reason=empty` for skipped.
- `report_error` — A quoted fact (sha, count, path) in a contract, clarification, or log entry did not match the repository. Metadata: `fault=<lead|stage|runner> field=<name> reported=<value> actual=<value> impact=<short>`.
- `retro_review_complete` / `retro_review_skipped` — Retro + Story X.0 gate done (start-of-epic CLOSE of the previous epic's retro artifacts, the ledger slice, and open action items). Metadata: `source_retro=<path-or-empty>` `resolved=<N>` `owned=<N>` `terminal=<N>` `dropped=<N>` `load_before=<N>` `load_after=<N>` `cap=<N>` for complete; `reason=<short>` for skipped.
- `epic_retro_complete` / `epic_retro_skipped` — End-of-epic retrospective gate (the fully interactive, human-in-the-middle run of `/bmad-retrospective` — distinct from `retro_review_*` above). Metadata: `reason=<short>` for skipped.
- `epic_status_done` — Lead set `epic-{N}: done` in sprint-status.yaml after the last story reached `done`. Metadata: `stories=<N>`.
- `resume_local_ahead` — Resume check 2 found local ahead of remote; lead pushed. Metadata: `repo=<path>` `pushed_shas=<N>`.
- `epic_merge_skipped` — User declined SC-4 merge. Metadata: `reason=<short>`.
- `epic_merge_started` — SC-4 write-ahead marker, on the epic branch before the first checkout. Metadata: `head=<epic head sha>` `feature=<branch>`.
- `epic_merged_to_feature` — SC-4 merge completed (written on the feature branch and committed as `chore(epic-N): record merge`). Metadata: `repos=<paths>` `feature_sha=<sha>` `merge_sha=<sha>` `submodules=<paths-or-empty>`.
- Unattended runs (doctrine U2–U12): `unattended_started` / `unattended_resumed` (`run= policy= doctrine= range= lock_token=`), `permission_mode_attested`, `ci_mode_chosen`, `notify_unavailable`, `ruling` (`question= choice= rejected= why= category=<decide|veto|park|stop> policy=`, plus `reversal=` for a veto), `story_parked`, `story_set_aside` (`story= patch= sha=`), `story_unparked` (`via= story_base=`), `story_dropped` (`story= id=`), `story_waiting` (`story= on=`), `runner_unattended_start` (`run= policy= doctrine=`), `inbox_hand_edit` (`file=`), `rework_cap_override … authorized_by=owner via=`, `owner_decision` (`id= at=<answer_ref> via= by=`), `unattended_stop` (`unit= reason=`), `hold_ordered`, `hold_saved` (`story= stage= patch= tree=`), `hold_restored` (`story=`), `stage_dead` (`story= stage= evidence= rerun_from=`), `hold_complete` (`shas=`), `unattended_report`.
- `epic_summary` (optional, once per epic after the last `committed`) — see Workflow Telemetry.

**Standardized telemetry (on every `*_complete` entry):**

- `spawn_at=<UTC>` — when the lead invoked `Agent` (omit on lead-driven stages).
- No model and no effort on these entries: one model runs every stage, and `session_model` records it once per invocation. To attribute an entry, read the nearest `session_model` above it.
- `cycle_iteration=N` — defaults to 1; increment on re-spawn after downstream rejection or clarification.

**Stage-specific telemetry (when available):**

- `story_created`: `path=<spec> build_status=ready-for-dev spec_tokens=N epic_context=<compiled|reused>`.
- `spec_validated`: `service_introducing=true|false integration_ac=<present|declared-none|user-waived> adr_constrained_acs=<AD-n csv-or-empty> decision_dependency=<DW-n csv|none> sections_created=<csv|none> owned_ledger=<DW-n csv|none> addressed=N declined=N mutates_shared_runtime=true|false`.
- `dev_complete`: `build_sha=<short> baseline_revision=<short> [story_base=<short>] review_loop_iteration=N followup_review_recommended=true|false deferred=N loc_added=N loc_removed=N files=N nfr_tripwires=N adr_violations_surfaced=N` (`story_base` appears on the story's first `dev_complete` only and is never rewritten; `review_loop_iteration` and `followup_review_recommended` are read from the spec frontmatter; `deferred` is the count harvested into the ledger).
- `adr_verifications_complete`: `tool=<id> acs=<comma-separated-list> result=pass|fail|unverified|none_required evidence=<path-or-empty> mutations=<ac:what,…|none>` (`pass` requires a mutation per AC — Rule 19).
- `qa_complete`: `tests_added=N mutations_demonstrated=N first_run_failures=N clarifications=N closing_sections_present=true|false` (a persistent gap between `tests_added` and `mutations_demonstrated` is the visible signal of vacuous coverage).
- `committed`: also `amendments=<file:line csv|none>` — every Rule 5 apply-and-report amendment this story made to a planning artifact or root file, for post-hoc review.
- `cr_complete`: `resolved=N fixed_at_source=N by_design=N wontfix_theoretical=N routed=N escalated=N decision_pending=N deferred=N dismissed=N high=N med=N low=N rows=N unresolved_high_med=N clarifications=N closing_sections_present=true|false` — `high`/`med`/`low` are root-cause ENTRIES after the reviewer's step-03 grouping, copied from its `entries:` closing line; `rows` is the raw finding count the layers reported before grouping (volume, never a threshold input); `unresolved_high_med` is the high+med entries the reviewer left unresolved after its own patches — the clearest sign that the session's model is not keeping up with the stack (field report 2026-09-11: four layers filing one root cause as four rows roughly doubled the gross count).
- `ledger_adjudicated`: `owned=N resolved=N reowned=N terminal=N` (`owned` = slice size before; `resolved+reowned+terminal` must equal it).
- `smoke_complete`: `method=<browser|cli|api|other> result=pass|fail iterations=N defects_caught=N evidence=<path>`.
- `committed`: `sha=<short-hash> submodules=<paths-or-empty> ci=<pending|none|unavailable> runs=<ids|none>` (`pending` is resolved by a later `ci_resolved`; an older entry may carry `ci=success` or `ci=failure`; a `committed` with `run=<id>` is a pre-2026-10-19.2 entry, one without `ci=` a pre-2026-08-30.2 one).
- `ci_resolved`: `story=<id> sha=<sha> runs=<ids> failed=<workflow paths|none> via=<shas|none> result=<success|failure|cancelled|untriggered|none> resolved_at=<next_plan|burndown|merge_gate|resume>`.

**Cost telemetry (when available):** `input_tokens=N output_tokens=N cost_usd=X.XX` on any `*_complete` entry. Omit if not extractable.

**Example** (TABs shown as `→`; actual file uses literal tabs):

```
2026-05-18T13:55:02Z→Epic 1→feature_branch_created→repos=. ticket=PROJ-1234 description=initial-foundation root=origin/main
2026-05-18T13:55:10Z→Epic 1→epic_branch_created→repos=. from=a1b2c3d
2026-05-18T13:55:11Z→Epic 1→epic_branch_checked_out→repos=. head=a1b2c3d
2026-05-18T13:55:40Z→Epic 1→ledger_load→total=0 open=0 routed=0 escalated=0 decision_pending=0 terminal=0 burndown=0 reowned_none=0
2026-05-18T13:56:00Z→Epic 1→sprint_planning_complete→gate=PASS
2026-05-18T13:56:30Z→Epic 1→retro_review_skipped→reason=no_retro_no_open_ledger_no_open_action_items
2026-05-18T13:57:10Z→Epic 1→epic_context_compiled→sha=b2c3d4e reason=initial
2026-05-18T14:20:00Z→Story 1.5→stage_spawned→stage=plan spawn_at=2026-05-18T14:20:05Z agent_name=1-5-render-engine-plan-1 cycle_iteration=1
2026-05-18T14:23:11Z→Story 1.5→story_created→spawn_at=2026-05-18T14:20:05Z path=_bmad-output/implementation-artifacts/spec-1-5-render-engine.md build_status=ready-for-dev spec_tokens=1420 epic_context=compiled
2026-05-18T14:23:40Z→Story 1.5→spec_validated→service_introducing=true integration_ac=present adr_constrained_acs=ac5
2026-05-18T14:23:48Z→Story 1.5→stage_spawned→stage=implement spawn_at=2026-05-18T14:23:50Z agent_name=1-5-render-engine-implement-1 cycle_iteration=1
2026-05-18T14:24:02Z→Story 1.5→dev_complete→spawn_at=2026-05-18T14:23:50Z build_sha=9f8e7d6 baseline_revision=a1b2c3d review_loop_iteration=1 followup_review_recommended=false deferred=1 files=3 loc_added=412 cycle_iteration=1
2026-05-18T14:25:00Z→Story 1.5→adr_verifications_complete→tool=chrome_devtools_mcp acs=ac5 result=pass evidence=path/to/evidence/
2026-05-18T14:29:47Z→Story 1.5→qa_complete→spawn_at=2026-05-18T14:25:30Z tests=tests/render-engine.test.ts tests_added=14 closing_sections_present=true
2026-05-18T14:33:18Z→Story 1.5→cr_complete→spawn_at=2026-05-18T14:30:15Z resolved=2 deferred=0 high=1 med=1 low=0 closing_sections_present=true
2026-05-18T14:33:50Z→Story 1.5→ledger_adjudicated→owned=1 resolved=1 reowned=0 terminal=0
2026-05-18T14:34:00Z→Story 1.5→smoke_complete→method=browser result=pass iterations=1 defects_caught=0 evidence=path/to/screens/
2026-05-18T14:34:30Z→Story 1.5→committed→sha=abc1234 submodules=
2026-05-18T17:58:10Z→Epic 1→ledger_burndown_complete→open_before=3 resolved=1 terminal=1 chartered=0 reowned=1 open_after=1 cap=8
2026-05-18T17:58:40Z→Epic 1→epic_status_done→stories=6
2026-05-18T18:02:11Z→Epic 1→epic_merged_to_feature→repos=. feature_sha=def5678 merge_sha=fed8765 submodules=
```

**Parsing rule:** split each line on TAB into exactly 4 fields; split metadata on whitespace into `key=value` tokens; split each value on `,` for lists.

On restart, scan the cycle log for the highest-stage entry per story / epic to compute the resume point.
