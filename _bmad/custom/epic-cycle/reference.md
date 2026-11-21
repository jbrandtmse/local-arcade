> Section file of `/epic-cycle`. It is part of the command and binds you as the command does. A quoted section name, or a `Rule SC-n`, that is not in this file is found through the Section Index in `.claude/commands/epic-cycle.md`.

### Smart Parallelism (retired under v6.11 — stories run strictly sequentially in one checkout)

Story-level batching inside a single working tree is no longer possible:

- **Implement** spawns: each `bmad-build-auto` run makes its own finalize commit and then verifies the tree is clean — two concurrent runs in one checkout see each other's uncommitted work and HALT `finalization left repository dirty` (or race on the git index).
- **Plan** spawns: build-auto's step-01 version-control check ("require a clean working tree … HALT on a dirty tree") runs *after* it has loaded/compiled the epic context, so a sibling plan spawn that has already written its untracked `spec-<key>.md` makes the slower sibling halt; siblings also race on `epic-<N>-context.md`.

Concurrency therefore lives one level up — the parallel kit's per-epic worktrees (Orchestrator Mode). Within an epic: one story at a time, one stage at a time. Emitting multiple pipeline-stage `Agent` calls in one message is an anti-pattern under v6.11.

**Write-ahead rule (extended by Rule 16):** write the cycle log entry for a completed stage BEFORE the next dependent action, and COMMIT it before the next `bmad-build-auto` spawn. For `committed`: write immediately after `git push` returns success. If crashed between push success and log write, inspect `git log --oneline` on resume; if the matching commit exists, write the missing log entry — do NOT re-run the commit. The same applies to `dev_complete`: build-auto's finalize commit (`build_sha`) plus spec `status: done` without a `dev_complete` entry means the entry was lost, not the work — write it, harvest `deferred:`, set `review`, continue.

## Workflow Telemetry

The cycle log is the primary telemetry surface. Standardized metadata + stage-specific keys make per-stage cost and quality computable, and attributable to the session's model, without extra instrumentation.

**What the metadata enables:**

- Per-stage duration — `entry.timestamp − entry.spawn_at`, grouped by stage.
- Bug rate — `cr_complete.high + cr_complete.med` (root-cause entries) per story; `cr_complete.unresolved_high_med` for what escaped both the implementer and the reviewer's own patch pass (the signal that the model is not keeping up); `cr_complete.rows` for raw review volume.
- Rework rate — count of `cycle_iteration > 1` entries.
- Rework convergence — `rework_opened` per story (its `trigger=`), `rework_cap_reached` / `rework_cap_override` events, and `followup_review_recommended=true` on a rework's `dev_complete` (post-2026-09-11.1: a HIGH was patched in that pass).
- Test-pyramid leak rate — `smoke_complete.defects_caught > 0` events.
- NFR-tripwire surfacing rate — `dev_complete.nfr_tripwires`.
- Closing-section reliability — `closing_sections_present=false` rate.
- Model comparison — the same numbers on either side of a `session_model` entry whose `model=` changed. Nothing in this pipeline picks a model, so this is the evidence for choosing the next session's.

**`epic_summary` entry (optional, once per epic after the last `committed`):**

```
<UTC> TAB Epic <N> TAB epic_summary TAB stories=N wall_clock_hours=X.X total_high=N total_med=N total_low=N total_smoke_defects=N rework_events=N stage_count=N input_tokens_total=N output_tokens_total=N cost_usd=X.XX
```

Derivable from per-stage entries; a convenience, not a source of truth.
