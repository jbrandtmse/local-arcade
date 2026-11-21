---
id: SPEC-local-arcade
companions:
  - glossary.md
  - room-layout.md
  - cabinet-inventory.md
  - game-factory.md
  - brownfield.md
  - ../../planning-artifacts/architecture/architecture-local-arcade-2026-11-19/ARCHITECTURE-SPINE.md
  - ../../planning-artifacts/ux-designs/ux-local-arcade-2026-11-20/DESIGN.md
  - ../../planning-artifacts/ux-designs/ux-local-arcade-2026-11-20/EXPERIENCE.md
  - ../../../docs/game-authoring.md
  - ../../planning-artifacts/ux-designs/ux-local-arcade-2026-11-20/imports/arcade-floor-plan.html
sources:
  - ../../../idea.md
  - ../../brainstorming/brainstorm-local-llm-arcade-2026-11-18/brainstorm-intent.md
  - ../../brainstorming/brainstorm-local-llm-arcade-2026-11-18/session-digest.md
  - ../../brainstorming/brainstorm-local-llm-arcade-2026-11-18/v1-cut-list.md
  - ../../planning-artifacts/briefs/brief-local-arcade-2026-11-18/brief.md
  - ../../planning-artifacts/prds/prd-local-arcade-2026-11-19/prd.md
  - ../../planning-artifacts/prds/prd-local-arcade-2026-11-19/addendum.md
---

> **Canonical contract.** This SPEC and the files in `companions:` are the complete, preservation-validated contract — validated to preserve every decision from the sources — for what to build, test, and validate. Source documents listed in frontmatter are for traceability — consult them only if you need narrative rationale or prose color this contract intentionally omits.

# Local Arcade

## Why

A vision to realize, on top of a whitespace opportunity. A builder who was twelve in 1985 is building the arcade he remembers: a first-person, walk-in 3D arcade on the public web where you enter through the front door, find a game the way you once did — by ear, around pillars, over glow — and sit down and play a real game. No menu, no rail, no guided order; the room is the interface. The showcase is how it was made: every game, cabinet, room element, and patron behavior is authored by **local LLMs at build time** and frozen into a sealed build. At runtime nothing AI runs — the arcade is a fixed, reproducible, offline-provable recording of what local models can build. Emulators, flat web archives, and fixed-set 3D showcases give you the game but never the room, and none of them grow; Local Arcade grows by pipeline — each Game is its own BMad epic, and when it passes the room's acceptance laws it registers itself and the Layout System places it. Four jobs anchor every trade-off (jobs defined in PRD §2.1): re-experience, rediscovery, the hero moment, and put-me-inside. One builder, local-LLM tokens as budget, one DigitalOcean droplet. The moat is honest: authorship, taste, and the fact that it exists.

## Milestones (M0–M6)

v1 = MVP = the cut list M0–M6 (PRD §8) — the terms are interchangeable and both mean the ship scope: walk-in shell + Moon Patrol + one Patron (M0) → find-by-ear (M1) → second Cabinet end-to-end through the Game Factory incl. the five skills + gate (M2) → Hall of Models presentation (M3) → Workshop reads the repo (M4) → Snack Bar (M5) → one playable pinball table (M6); plus the standard shells and run recording/replay/report from M2 on.

## Capabilities

- **CAP-1**
  - **intent:** A Visitor loads the page and is inside the Arcade Room in first-person control (mouse-look + WASD) within the first minute, no account or auth.
  - **success:** Page load to controllable view ≤60s worst-case on a mid-range laptop (guardrail ceiling); no sign-in, cookie wall, or onboarding anywhere.
- **CAP-2**
  - **intent:** The Arcade Room renders as architecture a visitor can roam: Wall Slot walls, aisles, sightline-breaking occluder pillars, and fixed Zones — deliberately too big to take in at once, with empty Wall Slots readable as roadmap; two standard Cabinet shells exist for Wall Slot machines (stand-up, sit-down) and the Manifest's `cabinetType` assigns each Game one of them (pinball tables instead use the fixed Pinball Corner Zone shell architecture), so no Game needs bespoke furniture and no edit to the Arcade Core.
  - **success:** Pillars occlude sightline and sound from specific positions; aisle-nav lint walks every path and slot approach; the unfilled stretch is visible from the entry; both standard shells are present in the room and sit-down shells visibly host the driving/cockpit class.
- **CAP-3**
  - **intent:** Every placed Cabinet runs Attract Mode with spatial audio occluded by room geometry; the mix follows the proximity ladder (the audio-mix mechanism, distinct from the discovery pull ladder) and collapses around a seated player (seated focus mix).
  - **success:** A machine is locatable by sound alone; moving behind a pillar changes what is heard positionally; occlusion and proximity changes use hysteresis — a dead-band plus dwell as a pure tick function (numbers set at M2) — so standing at a boundary never flips audio per tick; attract `stateHash()` advances every cycle (liveness as a unit test).
- **CAP-4**
  - **intent:** A Visitor discovers machines via the fixed pull ladder — occluded sound, then attract graphics, then Patron/player intensity — with zero UI hints.
  - **success:** SM-1: a fresh visitor locates a playing machine and sits down within the first minute, in both required variants (normal audio, and master-muted relying on graphics + body drama).
- **CAP-5**
  - **intent:** A Visitor sits at an available Cabinet and plays its full game in place inside the room, then returns to standing at their position.
  - **success:** Moon Patrol plays in place with no separate URL or menu; seated play does not pause the room; returning keeps visitor position and room continuity; walking away without standing ends the run cleanly — the Run Recording finalizes with its final stateHash and the Cabinet returns to busy/attract at the next break; Moon Patrol is reimplemented to the Game-build contract **within v1** (the M0 wrap is temporary, not the resting state — owner 2026-11-20).
- **CAP-6**
  - **intent:** Designated Cabinets are "busy": a Patron plays the game's own Auto-play session, reacting 1:1 (flinch/slam/jump) to that game's events; the queue/NEXT ritual resolves at breaks and busy is never a lock. Each Auto-play session's seed derives deterministically from the ledger revision and session index, so Patron runs are replay-reproducible; a session restarts at the next break after `gameEnded`.
  - **success:** Patron reactions fire 1:1 with injected sim events (causality probe); a present visitor takes over at a break ahead of the queue head; Patron→Patron handoff is visible end-to-end; busy-machine drama is legible from across the room.
- **CAP-7**
  - **intent:** No Dead Machines: every visible Cabinet reads active in any sampled frame. A faulting Game becomes a Faulted Machine: kernel fallback keeps marquee and screen motion performing. The fault predicate: an exception thrown inside `tick()`, or a `stateHash()` stall across N cycles (N set at M2).
  - **success:** Random-frame audit of a session finds zero Dead Machines; every Faulted Machine carries a fault marker and blocks Registration of the faulting build as a named defect while the room stays live; if a Visitor is seated at a Faulted Machine, the fallback keeps the screen performing and the Visitor is unseated gracefully at the next break with a fault-sealed recording; the room never crashes.
- **CAP-8**
  - **intent:** Personal Bests persist across visits via an anonymous local identifier; a Cabinet's score table shows the Visitor's bests plus Patron Auto-play runs — no fake strangers.
  - **success:** A returning visitor sees their Personal Best on cabinets they played, same browser, no auth; a refurbished Game keeps score continuity (keyed on stable Game id).
- **CAP-9**
  - **intent:** Maker attribution is found, never announced: an Instruction Card behind the coin door carries rules and model attribution, generated at build from the Manifest; marquees show game titles only.
  - **success:** Card content matches Manifest attribution; L2 character lint finds no attribution or "AI-generated" markers outside Instruction Cards and Hall of Models nameplates.
- **CAP-10**
  - **intent:** A finished Game joins the arcade by Manifest alone: the Registration skill commits it on a green gate, and the Layout System assigns its place deterministically per the fill rule in `room-layout.md §Growth grammar` (Wall Slots for standard machines; Pinball Corner Zone slots for `presentationOnly` pinball tables) — no hand-placement, no Core edit, never rearranged.
  - **success:** SM-2: one Game goes spec→registered end-to-end with zero Core edits and zero hand-placement; the same registration history **and the same Wall Slot configuration revision** reproduce the same room layout (the config carries a revision id recorded alongside the ledger, pinned by SM-2).
- **CAP-11**
  - **intent:** A registered Game can be refurbished (new build under the same stable id, same slot) or de-registered (the Cabinet leaves, the slot returns to the pool and reads as history); removal is a Registration-skill operation (Manifest removal → ledger `op=removed`), never a hand-edit; relocation is out of v1.
  - **success:** Refurbish keeps score continuity — when a refurbishment changes score scale or `scoreHigherIsBetter`, pre-revision bests are marked legacy and ranking compares same-revision scores only; de-registration takes effect at a run boundary: a seated Visitor finishes the run (recording finalizes), queued Patrons are released, Personal Bests survive, and the freed slot is indistinguishable from an unfilled one to the fill function — a Manifest removal only, still no Core change.
- **CAP-12**
  - **intent:** Registration is gated by three deterministic CI layers plus the human walk — L0 contract conformance and Manifest schema, L1 headless checks (liveness, seeded end-state, determinism, sealed build), L2 whole-room audit (dead machines, screenshot proxy, Patron causality, character lint, aisle nav, flashes-rate probe), L3 human walk. CI is zero-LLM-token scripts; "local LLMs build, CI verifies, the human judges feel."
  - **success:** A Game failing any automated layer cannot be registered (the Registration skill refuses a red gate); same seed yields the same stateHash; the sealed-build predicate holds — zero fetch/XHR/WebSocket/WebTransport/beacon calls to non-same-origin targets and zero external script/style/font URLs, with allowed exceptions machine-enumerated at build time (the report POST is the standing exception; donation paths pending OQ-10).
- **CAP-13**
  - **intent:** Every game session (Visitor or Patron) is captured by the kernel as a Run Recording — resolved seed, tick-indexed inputs, periodic + final state hashes, no PII — and is replayable headlessly (`tools/replay`) and in-room on the cabinet's own screen; a diegetic claim-check fixture at a Cabinet offers the recording for download and submission to the arcade's same-origin `/api/report`; the report is logged server-side, validated against known ledger revisions, and unknown or stale-revision reports are tagged rather than silently accepted. During in-room replay the Cabinet's liveness hooks tick with the replay (never a Dead Machine), play is blocked or queued, and replays are never captured as new Run Recordings.
  - **success:** A reported fault replays to the same tick with the same fault marker from the same seed + inputs; the report POST is proven the bundle's only standing outbound call (sealed-build predicate, CAP-12).
- **CAP-14**
  - **intent:** The Workshop renders real repository truth: commit log on the monitor, BMad plans as diegetic paper (unbuilt plans staged as unbuilt), the bench staged to each machine's real build lifecycle, and every Cabinet's Instruction Card paired with its plan drawer. The snapshot exposes only build-visible repo truth: a commit log filtered to `core/`, `games/`, `ci/`, `tools/`, the ledger, and planning documents on a build-time public allowlist; personal, IP-posture, and pre-decision planning documents are excluded, and the exclusion is checked at L2.
  - **success:** Acceptance from the cut list holds: change the repo (advance a story, commit, run tests) → the workshop state changes within one build, no re-authoring; green tests put a running attract on the bench.
- **CAP-15**
  - **intent:** The Snack Bar is the donation surface, in character: a tip jar that clinks audibly, Buy-Me-a-Coffee reframed as ordering a coffee (a top-level navigation), and crypto links — every donation staged honestly as an offer, never as a confirmation; the attendant speaks fixed authored lines.
  - **success:** A donation can be initiated from inside the room with no web-form popup; the offer is staged honestly as unconfirmed — completion belongs to the provider, outside the fiction (network mechanism pending OQ-10); nothing claims confirmation; the clink enters the room's soundscape.
- **CAP-16**
  - **intent:** The Pinball Corner presents the Hall of Models (roster and shared prompt: `cabinet-inventory.md §Pinball`): one cabinet each, with explicit nameplates naming the model ("museum, not guessing"), and the shared prompt itself a findable in-world artifact; these `presentationOnly` machines carry liveness hooks — `attract()` plus a real sim half; `autoplay()` may be absent (AD-8).
  - **success:** Every nameplate matches Manifest attribution; every presentation table passes the dead-machine audit (a non-ticking table is a defect by law).
- **CAP-17**
  - **intent:** At least one Hall of Models table becomes playable — human and Auto-play — through the pinball-engine decision (OQ-4), carried by its own BMad story (choice deferred to M6), with two tables demonstrable side by side and the corner findable by ear (clacks, bells, gong).
  - **success:** The chosen engine runs a table in-browser at playable framerate, drivable by `autoplay(seed)`; side by side means table A playable (human + autoplay) and table B running the same engine in attract at playable framerate on the adjacent cabinet, both live in the same frame for a Visitor standing in the Pinball Corner.
- **CAP-18**
  - **intent:** The room works far beyond v1 density — sized for ~50 cabinets and up: liveness tiers keep occupied/near/visible machines at full simulation while distant ones idle-pulse; audible implies awake; wake/sleep is a pure function of tick state.
  - **success:** Replays reproduce the identical wake schedule and stateHashes for runs in which no relevant sim slept; for runs containing sleep, the guarantee is scoped to continuously-awake instances and audit-mode replays are a superset room view, not bit-identical to a live session (the Run Recording carries no camera/occupancy data); no sleeping machine ever reads dead to a visitor; audit mode disables culling so CI sees the full room.

## Constraints

- **Deterministic runtime:** zero LLM/model calls at runtime and in CI; one global fixed 60Hz kernel tick, advanced on a fixed step decoupled from the render loop, with a max-catch-up-steps-per-frame guard and defined resume semantics after a backgrounded tab (so stateHash identity survives frame drops and slow machines); seeded rng injected by Core; deterministic math module for transcendentals. The no-runtime-LLM thesis is CI-proven by the sealed-build check, not hoped for.
- **One sealed static bundle, single origin.** Sealed-build predicate: zero fetch/XHR/WebSocket/WebTransport/beacon calls to non-same-origin targets, and zero external script/style/font URLs. Allowed exceptions are machine-enumerated at build time (same whitelist discipline as the text-surface whitelist); the same-origin report POST (`/api/report`) is the standing exception. Donation network paths await OQ-10.
- **Games are native in-scene modules in one runtime — never iframes/webviews.** An external, non-conforming game simply cannot register (deliberate trade of the portal norm for CI verifiability).
- **Every Game satisfies the Game-build contract:** verbatim hooks `attract()` / `autoplay(seed)` / `events()`, with `stateHash()` supplied by the Core wrapper over the Game's `snapshot()` (a Game-defined `stateHash` is lint-red); a schema-valid Manifest; a two-part plugin (pure deterministic sim half + presentation adapter); the Core imports no game code. Exception: `presentationOnly` Manifests may omit `autoplay()`, but their sim half must still be the real per-tick model of everything the presentation shows (AD-8). Restatement home: `game-factory.md §The contract, in one box`; binding builder rules: `docs/game-authoring.md`; enforcement detail: ARCHITECTURE-SPINE.
- **Desktop browser only** (mouse-look + WASD, pointer-lock). Phone/tablet are gone, not deferred — this supersedes the brief's laptop+phone criterion.
- **Anonymous identity only:** UUIDv4 in localStorage; no accounts, no auth, no PII anywhere — including Run Recordings (not even the visitor id).
- **One DigitalOcean droplet:** nginx ≥1.30.7 serving the static bundle + one thin Node report-ingest endpoint. Boring, low-maintenance stack is a stability requirement (maintenance-lapsed social arcades die — see the PRD addendum's cautionary precedents); the droplet is disposable, the repo is the state.
- **Load and liveliness guardrails:** ≤60s to a controllable view on a mid-range laptop (a ceiling, never the target); <8MB initial payload is an advisory budget, not a release gate; framerate-floor numbers are set at M2. Cabinet count (SM-C1) and raw visual fidelity (SM-C2) must never be traded against aliveness or framerate.
- **Fiction-pure room:** no HUD, crosshair, waypoints, minimap, tooltips, menus, or confirmation dialogs in-room; every text surface is physical signage on the character-lint whitelist (marquee | instruction-card | nameplate | room-sign); the Welcome Flyer is the single sanctioned announcing artifact. Banned UI is machine-linted.
- **Attribution only on Instruction Cards and Hall of Models nameplates.** No model names on signage — out forever. (The marquee rule is CAP-9's.)
- **All in-world behavior is authored deterministic data:** per-game impulse mappings, the kernel reaction library, fixed dialogue trees for banter and the attendant — never generated at runtime.
- **Monorepo;** registration history is the strictly append-only `arcade-ledger.json`; Manifests are written by the Registration skill, never by hand.
- **English-only v1 room data;** translation would be additional build-time authored data; no localization surface is designed in v1.
- **IP posture (owner, 2026-11-20):** publicly hosting recreations of named classics is a non-commercial passion-project risk, consciously accepted and on the record; a takedown or licensing challenge returns the decision to the owner. GPL obligations (e.g. a DragonWar-derived engine) remain to be settled inside the M6 engine story — its scope lives in OQ-4; this posture does not waive them.
- **Accessibility floor binds release:** SM-1 must pass the audio variant and the master-muted variant at the L3 human walk (Deaf/HoH and low-vision testers are mandatory participants); comfort preset ON at first visit, seeded by `prefers-reduced-motion`; flash ceiling ≤3/sec per lit surface and in aggregate across all simultaneously visible lit surfaces (L2 flashes-rate probe; aggregate scope owner-confirmed 2026-11-20); world-scale legibility minimums enforced by a legibility lint; settings and site pages live outside the fiction (see EXPERIENCE.md · Accessibility Floor).

## Non-goals

**Forever, by thesis:**
- Runtime LLMs anywhere — the room is a fixed recording of build-time work.
- Model names or "AI-built" badges on marquees or room signage (Instruction Cards and Hall of Models nameplates are the sole exceptions).
- Chronological room layout — no golden-age shrine, no year-ordered rows, no featured-pod unveiling. Dropped 2026-11-19; walls fill as built.
- Menus, featured-content rails, guided tours, forced order. The room is the interface.
- Paid pricing — donations only, in character.
- Phone/tablet support — removed entirely, not deferred.

**Cut for v1, with named revisit conditions:**
- Multiplayer / real-visitor co-presence (revisit post-M6; cheapest honest form is anonymous presence — dots/silhouettes, no accounts, no chat).
- Global cross-visitor leaderboards (post-M6; Auto-play makes posted scores trivially fakeable, so any future board needs verifiable runs, not merely posted ones).
- Casual alley — Skee-Ball, Whac-A-Mole, hoops (post-M6; serves a social function none of the four jobs covers).
- Heavy peak-memory anchor cabinets — Dragon's Lair, Star Wars, Gauntlet class (legitimate future Game epics through the same pipeline; the sit-down Cabinet model is their prerequisite).
- The rest of the accepted 22-cabinet wall inventory — grown by the pipeline, never a hand-built v1 wall.
- Custom LLM-invented pinball tables and monthly reveals (after M6 physics plus a proven featured pipeline).
- Model Grand Prix leaderboards.
- Cabinet relocation in v1; room growth (new Wall Slots) is its own epic once Wall Slots run out.
- Donation completion confirmation (provider polling/webhooks) — returns with a deferred thin backend; v1 stages offers honestly.
- Localization.

## Success signal

- A fresh visitor (never the builder) walks in cold, locates a playing cabinet by ear alone within the first minute — the clock starts at the first tick of first-person control, not at page load (CAP-1's load ceiling and SM-1's discovery budget measure from different beats, and both may be exercised in one session) — with no UI hints, and again with audio muted, locating by attract graphics and Patron body drama alone — waits through the NEXT ritual, and plays a real game (SM-1).
- A random-frame audit of a live session finds zero Dead Machines: every Cabinet in a random screenshot reads mid-play — the screenshot is indistinguishable from a frame of the room running at playable framerate (SM-3 + screenshot test).
- One Game goes spec → Registration end-to-end through the pipeline with zero Core edits and zero hand-placement, appearing live and credited in the growing wall (SM-2).
- The builder's own bar outranks the metrics: it feels like the arcade from the memory (SM-4 — never a pass/fail gate; it is the tie-breaker between shippable builds — owner-confirmed 2026-11-20), and the short version of the idea makes people want to walk in (SM-5 — its falsifiable floor is pending OQ-11).

## Open Questions

Walked with the owner 2026-11-20 (OQ-4, OQ-9 — both survivors keep their named decision seats). OQ-10 and OQ-11 were opened by the 2026-11-20 four-lens review pass and await the owner.

- **OQ-4 (revisit when M6 opens — deferral confirmed by owner):** which pinball engine and which table goes first — packaging form inside the sim half (WASM vs port vs rewrite), GPL obligations inside a distributed sealed bundle, and cross-browser physics determinism beyond same-seed-same-hash.
- **OQ-9 (revisit at launch prep — owner keeping "Local Arcade" as working title):** the public marquee name and title lockup — non-blocking for M0–M6, blocking for public launch.
- **OQ-10 (owner decision, needed before M5 story-scoping):** the donation network path — does the sealed bundle machine-enumerate top-level navigations to the named provider destinations (coffee/crypto), or are donations routed through the same-origin Node ingest? And may CAP-15 "completes" ever mean more than "the offer honestly leaves the room"? Until resolved, the build-time network whitelist carries only the report POST and CAP-15 stages offers as unconfirmed.
- **OQ-11 (owner decision, at M2):** SM-5's falsifiable floor — proposed: ≥N fresh visitors (N set at M2) who heard about the arcade and walked in unaided, counted from aggregate droplet access logs (no PII). SM-4's non-gate status is owner-confirmed (2026-11-20); only the SM-5 floor value remains pending.
