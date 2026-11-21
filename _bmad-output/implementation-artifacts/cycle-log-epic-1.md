2026-11-21T05:26:56Z	Epic 1	session_model	model=qwen3.8-flash-next-iq3_s subagent_model=qwen3.8-flash-next-iq3_s
2026-11-21T05:26:56Z	Epic 1	runtime_gate	bmad=6.12.4 uv=0.12.5 ci=none
2026-11-21T05:26:56Z	Epic 1	launch_env	depth=default watchdog=0 bash_max_ms=default context=262144 api_timeout_ms=default
2026-11-21T05:26:56Z	Epic 1	permission_mode_attested	mode=bypassPermissions
2026-11-21T05:26:56Z	Epic 1	ci_mode_chosen	without_ci=none choice=local_green
2026-11-21T05:26:56Z	Epic 1	notify_unavailable	reason=no_push_notification_tool_in_session
2026-11-21T05:26:56Z	Epic 1	feature_branch_created	repos=. ticket=ARC-1 description=local-arcade root=origin/main
2026-11-21T05:27:22Z	Epic 1	epic_branch_created	repos=. from=168ba25
2026-11-21T05:27:22Z	Epic 1	epic_branch_checked_out	repos=. head=168ba25
2026-11-21T05:27:22Z	Epic 1	spine_resolved	path=_bmad-output/planning-artifacts/architecture/architecture-local-arcade-2026-11-19/ARCHITECTURE-SPINE.md ads=27 status=final
2026-11-21T05:33:02Z	Epic 1	ledger_load	total=0 open=0 routed=0 escalated=0 decision_pending=0 terminal=0 status_unknown=0 owner_unknown=0 burndown=0 reowned_none=0
2026-11-21T05:33:02Z	Epic 1	sprint_planning_complete	gate=CONCERNS findings=l3_human_walk_story_2.6,owner_taste_decisions_epic3_7,outward_infra_3.15_park,milestones_none
2026-11-21T05:33:02Z	Epic 1	retro_review_skipped	reason=no_retro_no_open_ledger_no_open_action_items
2026-11-21T05:33:56Z	Epic 1	unattended_started	run=20261121T0537Z-1-7 policy=cc3dfe318c687a5f4549d7b653ec4a5278cbb9f7 doctrine=1ac9e3987fa47aeddd6db0265385923232cbe42e range=1-7 ci=local_green visibility=PUBLIC notify=inbox-only lock_token=1795239200-6850
2026-11-21T05:42:49Z	Epic 1	epic_context_compiled	sha=d1682b8 reason=initial
2026-11-21T05:44:58Z	Story 1.1	stage_spawned	stage=plan spawn_at=2026-11-21T05:44:58Z agent_name=1-1-bootstrap-plan-1 cycle_iteration=1
2026-11-21T06:08:43Z	Story 1.1	story_created	spawn_at=2026-11-21T05:44:58Z path=_bmad-output/implementation-artifacts/spec-1-1-project-bootstrap-and-the-deterministic-kernel-core.md build_status=ready-for-dev spec_tokens=2200 epic_context=compiled
2026-11-21T06:08:43Z	Story 1.1	spec_validated	spawn_at=2026-11-21T05:44:58Z service_introducing=true integration_ac=present adr_constrained_acs=ac3,ac4,ac5,ac6,ac7 decision_dependency=none sections_created=none owned_ledger=none addressed=0 declined=0 mutates_shared_runtime=false cycle_iteration=1
2026-11-21T06:09:27Z	Story 1.1	stage_spawned	stage=implement spawn_at=2026-11-21T06:09:27Z agent_name=1-1-bootstrap-implement-1 cycle_iteration=1 story_base=de1223d
2026-11-21T12:03:25Z	Story 1.1	report_error	fault=lead field=story_base reported=de1223d actual=22602bc impact=stage_spawned_read_HEAD_before_its_own_commit_src_trees_identical
2026-11-21T12:03:25Z	Story 1.1	dev_complete	spawn_at=2026-11-21T06:09:27Z build_sha=940b655 baseline_revision=22602bc story_base=22602bc review_loop_iteration=1 followup_review_recommended=true deferred=7 files=36 loc_added=3896 loc_removed=18 cycle_iteration=1
2026-11-21T12:03:25Z	Story 1.1	ledger_routed_planned	story=1-7-fault-containment-a-broken-game-never-kills-the-room entries=3 excess=0 by=harvest
2026-11-21T12:11:09Z	Story 1.1	adr_verifications_complete	tool=node_cli acs=ac3,ac4,ac5,ac6,ac7 result=pass evidence=inline mutations=ac3:tick-threshold-x2,ac4:fnv-offset-lsb,ac5:supervisor-rethrow,ac6:planted-core-games-import,ac7:planted-math-random
2026-11-21T12:11:11Z	Story 1.1	stage_spawned	stage=qa spawn_at=2026-11-21T12:11:11Z agent_name=1-1-bootstrap-qa-1 cycle_iteration=1
2026-11-21T13:09:00Z	Story 1.1	qa_complete	spawn_at=2026-11-21T12:11:11Z tests_added=3 mutations_demonstrated=3 first_run_failures=0 clarifications=0 closing_sections_present=true cycle_iteration=1
2026-11-21T13:09:00Z	Story 1.1	stage_spawned	stage=code-review spawn_at=2026-11-21T13:09:00Z agent_name=1-1-bootstrap-cr-1 cycle_iteration=1
2026-11-21T17:50:24Z	Story 1.1	stage_api_error	stage=code-review error=other wait_min=0 detail=ECONNREFUSED_mid-patch tree=partial_patches_preserved respawn=1-1-bootstrap-cr-2
2026-11-21T20:33:20Z	Story 1.1	stage_api_error	stage=code-review error=other wait_min=0 detail=network_restart_during_cr2 tree=unchanged_from_cr1_partial respawn=1-1-bootstrap-cr-3
2026-11-21T23:19:11Z	Story 1.1	cr_complete	spawn_at=2026-11-21T17:56:02Z resolved=5 fixed_at_source=5 by_design=0 wontfix_theoretical=1 routed=1 escalated=1 decision_pending=0 deferred=0 high=0 med=3 low=2 rows=35 unresolved_high_med=0 clarifications=0 closing_sections_present=true cycle_iteration=1 respawn=3
2026-11-21T23:19:11Z	Story 1.1	ledger_adjudicated	owned=0 resolved=0 reowned=0 terminal=0
2026-11-21T23:25:19Z	Story 1.1	smoke_complete	method=browser result=pass iterations=2 defects_caught=1 evidence=_bmad-output/implementation-artifacts/evidence/story-1-1-smoke.png ruling=decide favicon-404-browser-initiated fixed-in-index.html
2026-11-21T23:29:49Z	Story 1.1	fresh_check	env=clean-checkout-node-26.13.1 tests=15 result=pass order=forward,reverse
2026-11-21T23:30:50Z	Story 1.1	committed	sha=5aebb03 submodules= ci=none
2026-11-21T23:30:50Z	Story 1.1	story_cycle	plan_to_commit_min=1065 implement_passes=1 reviews=1 rework=0 first_ci=none
2026-11-21T23:39:44Z	Story 1.1	report_error	fault=lead field=cr_complete.spawn_at reported=2026-11-21T17:56:02Z actual=2026-11-21T13:09:00Z impact=spawn_at_written_from_memory_not_the_open_stage_spawned_marker_cr_respawns_are_stage_api_error_not_new_markers
2026-11-21T23:50:24Z	Epic 1	epic_context_compiled	reason=planning_artifact_newer	agent=epic-1-context-compile-1	note=routed_DW_bullets_excluded_from_epic_context_token_target_800-1500
