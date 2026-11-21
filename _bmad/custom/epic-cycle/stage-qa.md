# `/epic-cycle` stage file — qa (`bmad-qa-generate-e2e-tests`)

An Epic Cycle stage prompt sent you here. Read this whole file before you invoke the skill or touch anything: it is the rest of that prompt, and its rules, pre-answers and completion contract bind you exactly as if they were written there.

- "Above" means the prompt that sent you here.
- A name in angle brackets that the prompt's **Values** list gives — `<story-key>`, `<spec path>`, `<impl>` and the like — stands for the value given there.
- Any other angle-bracket name is a slot in your own output.

```text
Pre-answered checkpoint (Rule 9): the skill's first step asks what to test — answer: the deliverable of Story <id>, i.e. the files listed above (the diff since `<baseline_revision>`), whose acceptance criteria are the spec's Tasks & Acceptance and I/O & Edge-Case Matrix at <spec path>. Do not ask; do not broaden scope to unrelated features. If the project has no test framework yet, choose the stack-appropriate default, record the choice in ## Decisions, and proceed.

Rules for this stage (from skill-rules.md):

- Rule 8 (test discoverability): generated tests MUST be discoverable by the project's default test suite — (a) correct naming convention, (b) not excluded by ignore files, (c) not tagged in a way that opts them out of the default run.
- Rule 19 (falsifiability): for each acceptance criterion, name the mutation that would make its pinning test fail, apply it, confirm red, revert, and confirm the tree is byte-identical to before the mutation (`git status --short` / `git diff --stat` unchanged — a leaked mutation is a defect you shipped). Record it next to the test in the spec's `## Verification` as `mutation: <what> → <test that went red>` (create that section if the planner omitted it — the spec template deletes it for trivial stories). One mutation per AC, not per assertion. A test whose red you have not observed is not evidence; an assertion that cannot fail (expected value forced by the type, subject never constructed, two empty runs compared) is a defect to fix, not a test to count. Report `mutations_demonstrated=<N>` in ## Decisions.
- File-list completeness: append every test file you create to the spec's `## Verification` section (marked `(QA)`), so the spec remains the complete record of the story's files — not just your closing summary.
- Rule 19 (hermeticity): every test you write creates and removes the state it asserts on, depends on no other test's leftovers or run order, and waits for the system under test to signal readiness before acting.
- Rule 13 (targets and reading): name every runtime target explicitly — never a tool's default target — and tear down only what your session started; read each document once and work from your copy.

🚫 Do NOT `git commit` or `git push`. Leave ALL changes uncommitted in the working tree — the lead commits after the per-story smoke gate. Propagate this prohibition verbatim into any subagent you spawn (`git commit` / `git push` / `git reset` / `git rebase` / anything that mutates a remote or triggers CI are all forbidden for them too), in the same breath as the working directory (Rule 13); verify a subagent's self-report by checking that `git rev-parse HEAD` still equals the sha you recorded before spawning it, before relying on it. Rule 18: never `SendMessage` any agent; never message a subagent after it has returned (spawn a fresh one); every `Agent` call you make passes `run_in_background: false`, and every test run is in the foreground of its own tool call with `timeout: 600000`, split into calls that each finish inside the 10-minute cap — never `Monitor`, never end your turn with anything you started still running (Rule 18 (5)); **return exactly once**, when your tests are written and run — never an interim message.

End your final message with these sections, in order:

## Files Modified
- <full path from repo root>
(or "(none)")

## Tests Added
- <full path from repo root>
(or "(none)")

## Decisions
- <one-line summary>
(or "(none)")

## Issues Encountered
- <one-line summary>
(or "(none)")

If you cannot make confident progress for ANY reason — ambiguous ACs, missing prerequisite, user-preference choice, environment failure, or anything risking a stated constraint — STOP before the closing summary and end with a "## Clarification Needed" section instead (Rule 4): the question, what was tried, what is blocking. Do not guess; do not soldier on.
```
