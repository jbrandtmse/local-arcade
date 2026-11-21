> Section file of `/epic-cycle`. It is part of the command and binds you as the command does. A quoted section name, or a `Rule SC-n`, that is not in this file is found through the Section Index in `.claude/commands/epic-cycle.md`.

### Clarification protocol

*Unattended:* the lead classifies and rules or parks instead of surfacing (doctrine U5); the re-spawn mechanics below are unchanged.

If an agent returns with a `## Clarification Needed` section instead of the closing summary, the lead:

1. Reads the question from the returned message.
2. Surfaces it to the user with Story ID + context.
3. Waits for the user's answer.
4. Re-spawns the same stage's agent with the clarification baked into the prompt or written to the spec's `## Design Notes` (committed first — Rule 16). If the answer has architectural weight (Rule 20 — a seam, a convention, a dependency or licence, a numeric invariant), it is written into the spine in that same commit and the AD id is cited where the answer is recorded.
5. Logs `<stage>_clarification_requested` before the re-spawn; the re-spawn's normal success entry (`story_created` / `dev_complete` / `qa_complete` / `cr_complete`) closes it.

**`bmad-build-auto` results map onto this protocol by blocking condition** (read from the spec's `## Auto Run Result`; the plan/implement stages emit no `## Clarification Needed` section):

*Unattended:* each "surface to the user" in this table is classified instead (doctrine U5): non-convergence is the rework cap, an intent gap is a clarification.

| Spec `status` / blocking condition | Lead action |
| --- | --- |
| `ready-for-dev` (plan spawn) | Success — log `story_created`, run the spec gates. |
| `done` (implement spawn) | Success — harvest `deferred:`, set `review`, log `dev_complete`. |
| `blocked`: `intent gap`, `unclear intent`, `missing previous-story continuity decision`, `matrix ambiguity`, `spec failed ready-for-development standard`, or an unresolved-questions list | Clarification path. Surface the condition + `## Auto Run Result` to the user with Story ID. On answer, follow the **re-dispatch protocol** below. Log `<stage>_clarification_requested` / `<stage>_complete`. |
| `blocked`: `version-control metadata not writable`, `finalization left repository dirty`, `no subagents`, `context compilation verification failed` | Pipeline/environment defect (a missed bookkeeping commit — Rule 16; a non-general-purpose spawn; a missing or unparseable `epics.md` / failed epic-context pre-warm). Halt loudly, fix the cause, re-dispatch per the protocol. Never "answer" these as clarifications. |
| `blocked`: **free-text** condition naming a dirty tree, untracked files, or a branch mismatch (step-01 has no canonical string for this — `version-control metadata not writable` fires only when `git add --refresh` itself fails) | The commonest Rule 16 miss: uncommitted cycle-log / tracker / spec writes, or a wrong checkout. Same handling as the row above — reconcile (`git status --short`; bookkeeping commit or `git checkout {TICKET}-epic{N}`), log `protocol_violation` only if an agent left the tree dirty, and re-dispatch per the protocol. |
| `blocked`: `review repair loop exceeded 5 iterations (non-convergence)`, `implementation verification failed`, `patch verification failed`, `matrix test audit failed`, `handoff conflicts with spec` | Treat as a failed rework cap: surface to the user with the spec's `## Review Triage Log`. The spec is wrong more often than the code. |
| `blocked`: `no epic spec found`, `no stories.yaml found`, `story id not found in stories.yaml`, `ambiguous story file match`, `unrecognized status in existing story file`, `missing spec_file before implementation`, `planned spec file disappeared before implementation` | A `/epic-cycle` dispatch bug (folder+id dispatch used in sprint mode; a spec path that does not exist or whose frontmatter was hand-mangled). Fix the anchor and re-dispatch per the protocol. |
| `blocked`: `blocked spec supplied`, `story already blocked` | The lead re-dispatched on a spec still at `status: blocked` — a kit bug, not a new clarification. Apply the re-dispatch protocol (reset the status first). |

**Re-dispatch protocol (any re-spawn after a `blocked` result).** build-auto routes strictly by the spec's frontmatter `status`: `draft` → plan, `ready-for-dev` / `in-progress` → implement, `in-review` → review, `done` → follow-up review pass, `blocked` → HALT `blocked spec supplied`. So a re-spawn on an unchanged `blocked` spec can never proceed, and a re-spawn with the **story key** while a spec already exists resumes it only if it is still `draft` — at any other status the skill creates `spec-<key>-2.md` and ignores the edited file. Therefore, before every re-dispatch:

1. Apply the answer to the spec. For a **plan-stage** halt the answer usually belongs inside the `<intent-contract>` block (build-auto preserves that block verbatim when it resumes a `draft`) and/or `## Design Notes`; for an **implement-stage** halt it belongs in the non-frozen sections (`## Design Notes`, `## Tasks & Acceptance`, `## Spec Change Log`). Note the change in `## Spec Change Log`. If the answer has architectural weight, write it into the spine first (Rule 20) and cite the AD id.
2. Reset the frontmatter `status`: `draft` to re-plan (the next run re-derives the spec around the preserved intent block and honours `Halt after planning.`); `in-progress` (or `ready-for-dev`) to re-implement. **Exception — an `intent gap` raised at build-auto's review step** (the spec's `## Review Triage Log` entry names a saved patch file under `<impl>`): the skill saved the attempted change as that patch and reverted the code, so do not re-implement — after applying the amendment, `git apply --whitespace=nowarn <patch>` (byte for byte, whatever `apply.whitespace` says), verify it applied cleanly, set `status: in-review`, and the re-spawn resumes at review with the work intact (the 2026-08-29 field report's "expensive mid-implement halt" is exactly this case). This one dispatch is exempt from the clean-tree gate: the applied patch is source code, which a bookkeeping commit never stages — commit only the spec and the log, then spawn. A spec-path dispatch skips build-auto's own tree check, its review diffs from the spec's baseline (which covers the applied patch), and its finalize commits the patch with the rest of the reviewed diff.
3. Bookkeeping commit (Rule 16).
4. Re-spawn the same stage **on the spec path** — never on the story key once a spec exists, and **never by `SendMessage` to the old stage agent**. Its `Agent` return value was its completion signal; an agent "resumed" after returning is alive with no durable record of it (no open `stage_spawned`), invisible to resume detection, and a de-facto background stage. The re-spawn's apparent cost is the price of durability: the answer lives in the spec, not in a chat message, so the story survives a crash between the answer and the re-spawn.
