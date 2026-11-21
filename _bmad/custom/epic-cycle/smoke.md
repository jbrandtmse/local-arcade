> Section file of `/epic-cycle`. It is part of the command and binds you as the command does. A quoted section name, or a `Rule SC-n`, that is not in this file is found through the Section Index in `.claude/commands/epic-cycle.md`.

### Per-Story Smoke (Critical Gate)

After code review (HIGH/MED resolved) and before commit, the lead performs a per-story smoke — a direct exercise of the story's deliverable in its target runtime. Mandatory; only the method varies.

**Method by deliverable runtime:**

- UI / browser-deployed: drive the dev server (or a deployed build) via browser-automation MCP. Navigate, exercise, assert on DOM / render / console.
- CLI / library: invoke the new command or library entrypoint against a real runtime. Assert on stdout / stderr / return code / produced files.
- Service / API: real HTTP request against the local server (or staging). Assert on status code + response body + side-effect surface.
- Other: whatever exercise mirrors production use. Minimum: the lead invoked the new code path against a real runtime and observed expected outcomes via an out-of-band channel.

The smoke is not a substitute for automated tiers; it's the final check that the wired-up system end-to-end produces the user-observable outcome the story promises. It is also platform-bound: a suite that passes on the lead's machine is evidence about that machine, not about the CI runner or the deployment target (field case: a test that regex-scraped a nested runner's summary passed on Windows and failed on Ubuntu, where the runner colourised its output — unreproducible locally by construction). CI is the only gate that runs on the platform the project ships from; see "CI Is a Gate".

**Mechanics:**

1. After `cr_complete` (HIGH/MED resolved), determine the smoke method from the story's diff (`git diff --name-only <story_base>..HEAD`) plus the spec's Tasks & Acceptance / I/O matrix.
2. Execute, capture evidence (screenshots, stdout, response body).
3. On failure: do NOT commit as-is (*Unattended:* always (b)). Either (a) surface to user, or (b) treat the failure as an unresolved HIGH finding and run one Rework Loop iteration (re-open the spec with the failure as a `[Smoke]` task, rework commit, implement re-spawn, code-review re-spawn) then re-smoke. Failed smoke is HIGH, never deferrable.
4. On success: log `<UTC> TAB Story <id> TAB smoke_complete TAB method=<browser|cli|api|other> result=pass iterations=<N> defects_caught=<N> evidence=<path-or-summary>`. `iterations` is 1 for first-run pass, bump on re-smoke. `defects_caught` = count of bugs the smoke caught that automated tiers passed.
5. Run the fresh-environment check below, then proceed to commit.

**Verification arrangement.** By default the plan marks each `## Verification` command `(loop)` or `(once)`: the implement stage runs the story's own tests (`(loop)`) on every verification pass and the full suite (`(once)`, in batches that fit the foreground cap) exactly once, after its last patch and before it finalizes; CI then runs everything on the platform the project ships from. Two project options, each recorded under Project-specific rules so the plan writes `## Verification` to match. **(a) CI-fresh tiers** — a test tier that CI runs on fresh instances, and that is resolved before the next implement spawn ("CI Is a Gate"), may be left to CI and dropped from `(once)`; the exemption lapses whenever CI is `none` or `unavailable`. **(b) Lead-owned full run** — a project whose model does not reliably keep a long run in the foreground, or whose full suite takes several times the foreground cap, moves the `(once)` run up to the lead (the runner, in a parallel run): the lead runs it after code review and before this smoke, in capped foreground batches like any other agent — moving the run up does not lift the cap, and a runner that ends its turn has returned too (Rule 18 (5)) — and a red takes the failed-smoke path. The trade for (b): a regression outside the story's own tests surfaces one implement-and-review round later than it would in-stage; the gain: the long run is done by the longest-lived agent, the lead, instead of the shortest-lived one. (Field reports 2026-10-08 and 2026-10-10: inside one epic each story ran the full browser suite 4–9 times, about 12 minutes each; two handoffs on a small model backgrounded their sweeps despite explicit foreground instructions.)

**Fresh-environment check (Rule 19 — after the smoke, before the commit).** Run the story's added and changed tests (`git diff --name-only <story_base>..HEAD`) on a fresh environment — rebuilt by the project's recipe if its rules record one (a throwaway database or instance, a fresh container), else a clean checkout — once in their normal order and once reversed. A red is a HIGH that takes the failed-smoke path. Log `<UTC> TAB Story <id> TAB fresh_check TAB env=<recipe|clean-checkout> tests=<n> result=<pass|fail> order=forward,reverse`. In a parallel run the runner uses its own throwaway, never another runner's (Rule 13).
