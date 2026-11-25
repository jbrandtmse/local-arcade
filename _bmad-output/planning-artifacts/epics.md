---
status: final
stepsCompleted:
  - step-01-validate-prerequisites
  - step-02-design-epics
  - step-03-create-stories
  - step-04-final-validation
inputDocuments:
  - _bmad-output/planning-artifacts/prds/prd-local-arcade-2026-11-19/prd.md
  - _bmad-output/planning-artifacts/prds/prd-local-arcade-2026-11-19/addendum.md
  - _bmad-output/planning-artifacts/architecture/architecture-local-arcade-2026-11-19/ARCHITECTURE-SPINE.md
  - _bmad-output/planning-artifacts/ux-designs/ux-local-arcade-2026-11-20/DESIGN.md
  - _bmad-output/planning-artifacts/ux-designs/ux-local-arcade-2026-11-20/EXPERIENCE.md
  - _bmad-output/specs/spec-local-arcade/SPEC.md
  - _bmad-output/specs/spec-local-arcade/glossary.md
  - _bmad-output/specs/spec-local-arcade/room-layout.md
  - _bmad-output/specs/spec-local-arcade/cabinet-inventory.md
  - _bmad-output/specs/spec-local-arcade/game-factory.md
  - _bmad-output/specs/spec-local-arcade/brownfield.md
  - _bmad-output/planning-artifacts/briefs/brief-local-arcade-2026-11-18/brief.md
  - docs/game-authoring.md
---

# Local Arcade - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for Local Arcade, decomposing the requirements from the PRD, UX Design, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

FR-1: Enter and walk the room — a visitor loads the page and is inside the Arcade Room within the first minute, in first-person control (move, look), no account and no auth. Page load to controllable first-person view ≤ 60s worst-case on a mid-range laptop (guardrail ceiling, never a target). No sign-in, cookie wall, or onboarding modal anywhere. *(Realizes UJ-1.)*

FR-2: Room architecture — the Arcade Room renders walls with Wall Slots, aisles, sightline-breaking occluder pillars, and the fixed Zones (Workshop, Snack Bar, Pinball Corner). Pillars occlude sightlines and sound to specific locations by design; empty Wall Slots are visible and readable as future machines/roadmap. *(Realizes UJ-1, UJ-2.)*

FR-3: Attract Mode with spatial occlusion — every registered Cabinet continuously runs its Attract Mode; audio is spatialized and occluded by room geometry. A visitor can locate a machine by sound alone (pull ladder: sound → attract graphics → player intensity) with zero UI hints; moving behind a pillar changes what is heard, positionally. Mix follows the proximity ladder: at the doorway only nearest machines read clearly; approaching swells a machine; seated, the mix collapses around that machine (others ducked to an authored near-silent floor). Occlusion/proximity transitions use hysteresis (dead-band + dwell, pure tick function — numbers set at M2). Scale law: the room works at ~50 cabinets — full-rate simulation only for what the player observes or is near; distant machines sleep at idle-pulse and wake on approach, never visibly. *(Realizes UJ-1.)*

FR-4: Patrons at busy machines — designated "busy" Cabinets run an Auto-play session of their own game plus a Patron whose reactions (flinch/slam/jump) correspond 1:1 with that game's sim events (no canned loops). The queue/NEXT ritual: Patron visibly mid-game, attract screen shows NEXT; the visitor may wait, take over at the next round break, or walk away — busy is a texture, never a lock. Takeover precedence: physically-present visitor beats queue head. Patrons trade authored banter (fixed dialogue trees, never generated); Patron→Patron handoff is visible end-to-end (waiting Patron sits, departing one lifts off). Busy-machine activity is legible from across the room with no zoom and no UI. *(Realizes UJ-1.)*

FR-5: No Dead Machines (screenshot test) — any randomly sampled frame of a session shows every visible Cabinet active (attract running or being played). A Dead Machine is a defect by definition, never a legitimate state. A faulting Game becomes a Faulted Machine: kernel fallback keeps marquee and screen motion performing; fault marker carried; the room never crashes. *(Realizes UJ-1, UJ-2.)*

FR-6: Sit down and play a real game — a visitor can interact with a Cabinet and play its full game in place, returning to standing at their position afterward; the room continues around a seated player. All Games follow the standard Game-build contract. The Moon Patrol clone is playable from inside its Cabinet with no separate URL or menu (M0, provisional wrap), and is reimplemented against the standard contract within the MVP with no visible change to the cabinet experience. *(Realizes UJ-1, UJ-2.)*

FR-7: Scores carry over, no account required — a visitor's Personal Bests persist between visits via an anonymous browser identifier (cookie/localStorage UUIDv4) — no login, no prompt, no PII. Score screens show the visitor's initials and the Patrons' auto-play runs only — no fake strangers. Global leaderboards are out of v1. *(Realizes UJ-1.)*

FR-8: Register a Game by manifest alone — a Game can be added to the Arcade Core by committing a Manifest; no Arcade Core code change is required. A new Game goes from "committed manifest" to "walkable Cabinet" with zero manual steps by the builder; the Core's own source is unchanged. *(Realizes UJ-3.)*

FR-9: Attribution without breaking character — the Cabinet's marquee shows only the game name; the Instruction Card behind the coin door carries rules and model attribution generated from the Manifest. No model name, "AI-generated" badge, or UI marker appears anywhere except Instruction Cards and Hall of Models nameplates. *(Realizes UJ-1.)*

FR-10: Deterministic placement — on Registration, the Layout System (pure build-time function of ledger + Wall Slot config) assigns a Wall Slot per decided rules: pre-declared, evenly spaced slots; fill back→front, alternating left/right wall so the newest machine always sits adjacent to the unfilled stretch near the door; machines never auto-rearranged; same registration history + same slot-config revision → same room. Rules keep aisles (≥1.20m) passable and sightlines/pillars intentional at every density; Registration refuses if no placement passes the aisle lint or when the slot pool is empty ("room full"). Zone-bound `presentationOnly` pinball tables bind to pre-declared Pinball Corner Zone slots, exempt from the fill rule but still deterministic. *(Realizes UJ-3.)*

FR-11: Two standard shells, declared per game — both standard Cabinet models (stand-up default, sit-down for driving/cockpit class) are modeled and present in the room; a Game's Manifest declares `cabinetType` and the Registration pipeline equips it accordingly. A new Game needs no bespoke cabinet work. Pinball tables use the fixed Pinball Corner Zone shell architecture instead of Wall Slot furniture. Custom cabinets are allowed later within a Game's own epic, within pre-declared slot geometry. *(Realizes UJ-1, UJ-2.)*

FR-12: Workshop reflects the repo — the Workshop renders current repository state (commit log on the monitor, BMad plans as diegetic paper, bench staged to the real build lifecycle); a change to the repo produces a corresponding room change within one build. Bench staging reflects real test/build status (green bench for green tests); the plan drawer may hold plans for unbuilt machines, staged legibly as unbuilt; every registered Cabinet's Instruction Card pairs with a plan-drawer entry (card↔drawer pairing). The exposed snapshot is allowlist-scoped to build-visible repo truth (`core/`, `games/`, `ci/`, `tools/`, ledger, allowlisted planning docs); exclusions checked at L2. *(Realizes UJ-3. Cut list M4.)*

FR-13: Donate in character — a visitor can complete a real donation (tip jar / Buy Me a Coffee / crypto link) through Snack Bar interaction — no web-form popups. The tip jar clinks audibly into the mix; ordering a "coffee" IS the BMC top-level navigation; every donation is staged honestly as offer, not confirmed (no completion signal exists in v1). *(Realizes UJ-2. Cut list M5.)*

FR-14: Hall of Models row — the Pinball Corner presents the ~15 model-built pinball tables (roster: `cabinet-inventory.md §Pinball`) with visible nameplates naming each model; the shared prompt is a findable in-world artifact. Presentation-only at M3, but each table registers as a `presentationOnly` contract wrapper with liveness hooks — a non-ticking table is a Dead Machine by law. *(Realizes UJ-2. Cut list M3, M6.)*

FR-15: One playable pinball table — at least one pinball table is playable (human and auto-play) using the engine chosen by its own BMad story at M6 (decision deferred, OQ-4: packaging form, GPL obligations, cross-browser physics determinism), with two tables demonstrable side by side (A playable, B same engine in attract) at playable framerate, both live in one frame; the corner is findable by ear (clacks, bells, gong). *(Realizes UJ-2. Cut list M6.)*

FR-16: Lifecycle — refurbish and remove, never move — a registered Game may be refurbished (new build under the same stable Game id: same slot, same marquee, updated machine) or de-registered (Manifest removal → ledger `op=removed`: the Cabinet leaves, the slot returns to the pool indistinguishable from unfilled, effective at a run boundary; seated visitor finishes, queued Patrons released, Personal Bests survive). Refurbish keeps score continuity keyed on the stable Game id; if score scale/direction changes, pre-revision bests are marked legacy. Removal is a Registration-skill operation, never a hand-edit. Still no Arcade Core edit. Relocation is out of v1. *(Realizes UJ-3.)*

FR-17: Game-build contract and CI gate — every Game satisfies the Game-build contract: verbatim hooks `attract()` / `autoplay(seed)` / `events()`, with `stateHash()` supplied by the Core wrapper over the Game's `snapshot()` (a Game-defined stateHash is lint-red), driven by `tick(dt, input)` + `snapshot()`; two-part plugin (pure deterministic sim half + presentation adapter); schema-valid Manifest. Registration may only proceed on a green verification gate: **L0** lint (import bans, banned APIs) + Manifest schema; **L1** headless (attract liveness = stateHash advances each cycle; seeded autoplay reaches a real end state emitting `gameEnded`/`roundBreak`; determinism same seed → same stateHash; sealed-build check — zero non-same-origin calls except the named report POST); **L2** whole-room audit (dead-machine detector, screenshot-test proxy + framerate floor, Patron causality probe within reaction window, character lint, aisle-nav lint, flashes-rate probe ≤3/sec per lit surface and aggregate); **L3** human walk (SM-1 both variants, SM-4 — irreducible). Cadence: per story L0–L1; pre-Registration L0–L2 vs current room; scheduled full-room regression. CI is deterministic scripts, zero LLM tokens. Existing assets rebuilt to contract: Moon Patrol, Hall of Models tables. *(Realizes UJ-3.)*

FR-18: A bad run can be reported, with its proof — every game session (visitor or Patron) produces a kernel-owned Run Recording: `{gameId, bundleRef, seed (resolved), tick-indexed inputChanges, periodic + final stateHash}` — no PII, not even visitor id. A diegetic claim-check fixture at a Cabinet offers the cabinet's current recording as a downloadable JSON AND a submit action (optional untrusted note); the POST goes to the arcade's own same-origin `/api/report` endpoint and is recorded server-side (thin Node-stdlib ingest: no auth, size-capped, rate-limited, JSON on disk; validates bundleRef/revision against known ledger revisions, tags unknown ones). Replay is v1: any recording replays deterministically headlessly via `tools/replay` (CI and builder reproduce a reported fault at the same tick from the same seed+inputs) and in-room as playback on the cabinet's own screen (replay instance counts for liveness, entered only by a visitor, never captured as a new recording). Fault-sealed recordings carry `{tick, errorId, lastGoodHash}`. The report POST is the room's only allowed runtime network call. The repo issue page remains a top-level navigation. Delivered with the M2 health-check work — from M2 on, no placed cabinet may be unreportable and no recording unreplayable. *(Owner requirement 2026-11-20.)*

### NonFunctional Requirements

NFR-1: Load time is the make-or-break — time-to-playable is the primary performance constraint of walk-around scenes; ≤60s page-load-to-controllable-view on a mid-range laptop is a guardrail ceiling, never a target; architecture sets the real budget when the shell is first measured. <8MB initial payload is an advisory budget, not a release gate.

NFR-2: Deterministic runtime — no runtime LLMs and no model calls at runtime or in CI, ever, by thesis; one global fixed 60Hz kernel tick (max-catch-up-steps guard, defined backgrounded-tab resume semantics); seeded RNG injected by Core; Core deterministic math module for transcendentals; the only external dependencies at play time are donation top-level navigations (FR-13, whitelisted per resolved OQ-10) and the same-origin report POST (FR-18). CI proves the thesis via the sealed-build check.

NFR-3: Scale — the room works far beyond v1 density (~50 cabinets): liveness tiers keep occupied/near/visible machines at full simulation while distant ones idle-pulse; audible ⇒ awake; wake/sleep is a pure tick-state function so replays reproduce the identical wake schedule (scoped per CAP-18); no sleeping machine ever reads dead to a visitor; headless audit mode disables culling.

NFR-4: Public, secure, anonymous posture — open public website, no accounts. HTTPS-only, strict CSP, single origin, zero external scripts/styles/fonts (donation links are top-level navigations), nginx rate limiting, input validation on anything the room sends out. One native runtime, no game iframes.

NFR-5: Privacy — anonymous identity only: UUIDv4 in localStorage under `arcade.*`; no personally identifiable information anywhere, including Run Recordings (not even the visitor id).

NFR-6: Self-hosted, single maintainer — one DigitalOcean droplet; boring, low-maintenance stack is a stability requirement (maintenance-lapsed social arcades die); nginx + certbot + one thin Node report-ingest endpoint; the droplet is disposable — the repo is the state.

NFR-7: Desktop only — input surface is mouse-look + WASD + single E interact verb, pointer-lock; no phone/tablet support anywhere. Browser matrix: enforced evergreen Chrome + Edge (CI runs these), compat target Firefox, Safari desktop best-effort (enforcement deferred to M2).

NFR-8: Fiction-pure room — no HUD, crosshair, waypoints, minimap, tooltips, menus, "are you sure" dialogs in-room; every text surface is physical signage on the character-lint whitelist (marquee | instruction-card | nameplate | room-sign); the Welcome Flyer is the single sanctioned announcing artifact; banned UI is machine-linted.

NFR-9: Accessibility floor binds release — SM-1 must pass both variants (normal audio AND master-muted) at the L3 human walk with Deaf/HoH and low-vision testers as mandatory participants; comfort preset ON at first visit, seeded by OS `prefers-reduced-motion`; flash ceiling: no authored element flashes >3 times/sec per lit surface and in aggregate across simultaneously visible lit surfaces (L2 flashes-rate probe); world-scale legibility minimums enforced by a legibility lint (size × distance × ≥50 lux); settings and site pages meet WCAG 2.2 AA — 24px targets, visible focus ring, no state-by-color-only.

NFR-10: All in-world behavior is authored deterministic data — impulse mappings, reaction library, banter/attendant dialogue trees are fixed authored data assets consumed by the kernel; never generated at runtime. English-only room data in v1.

NFR-11: Pinball physics feasibility — pinball physics must run in-browser at playable framerate; the PRD commits only to feasibility — the M6 engine story (OQ-4) carries the risk.

NFR-12: Counter-metrics (do not optimize) — cabinet count (SM-C1) and raw visual fidelity (SM-C2) must never be traded against aliveness (SM-3) or load time; the screenshot test is judged at playable framerate, not as a rendered poster.

### Additional Requirements

**Starter template: NONE specified.** The Architecture defines a Structural Seed (greenfield directory scaffold) instead — Epic 1 Story 1 is a repo bootstrap from scratch per that seed, not a clone of a template.

- **Paradigm (binding):** microkernel/plugin architecture. The Arcade Core is the kernel (deterministic fixed-tick clock, room, all room services: audio, input, storage/identity, Patron scheduler + occupancy). Games are two-part contract plugins: pure deterministic sim half + presentation adapter. An append-only registration ledger feeds the game registry and the Layout System at build time. Deploy is one static bundle. *(AD-1…AD-27 are binding; the spine wins on conflict.)*
- **Structural Seed / repo topology (monorepo, AD-13):** `core/` (scheduler, supervisor, patron system + `patrons/` data, services), `core/room/` (geometry, Wall Slot config, occluder colliders, Zones, zone interaction objects), `core/contract/` (harness shared by kernel + `ci/` + `tools/`: wrapper, seeded rng, deterministic math, deep-freeze, calling protocol, record/replay core), `games/<game-id>/{sim,presentation,manifest.json,assets}`, `ci/` (deterministic L0–L2 gate scripts + manifest schema), `tools/` (ledger/build utilities: registry, placement, card generation; `tools/replay`), `services/report-ingest/` (Node stdlib only), `.claude/skills/` (5 Factory skills, thin orchestrators — no gate logic in skills), `arcade-ledger.json` (repo root).
- **Dependency rules (AD-1, AD-2, AD-7):** Core imports no `games/**` source at authoring time (CI dependency check); sim half imports no three/WebAudio/DOM/window; presentation adapter imports three + Core service APIs + own sim only; L0 lint enforces per-half import bans and bans direct WebAudio, `localStorage`, window input listeners.
- **Clock & determinism (AD-3, AD-4, AD-5):** one global 60Hz tick (sims never call rAF/setInterval; `Date.now`/`performance.now` lint-banned in sim half; no self-driving loops in either half); Core-injected seeded rng (derived seed for attract/Patron instances, kernel-fresh random for visitor play; resolved seed recorded, replay never re-derives; rng cursor inside `snapshot()`); `stateHash()` implemented by the Core contract wrapper over `snapshot()`.
- **Evented causality (AD-6):** sims emit plain-data event lists per tick — the only channel a Game has; canonical reserved types `gameEnded`, `roundBreak`, `scoreSubmitted` (`{score, initials?}`); kernel systems emit the same event kind; no direct game-to-game or game-to-Patron calls.
- **Room services (AD-7):** one Core Audio Manager owns the WebAudio graph (PannerNode spatialization, distance attenuation, raycast occlusion gain+lowpass against the dedicated occluder collider set — single-ray first, soft multi-ray deferred); the same occluder set is the sightline-breaking reference; channel budget = distance-cull + nearest-N (thresholds at M2); seated focus mix; kernel maps devices onto Manifest-declared control slots (`axis` ∈ [-1,1]; `button` = {down, pressed}; `aim` = {dx, dy}; additive versioned vocabulary, `controls.vocab`).
- **Ledger (AD-9):** strictly append-only rows `{gameId, seq, revision, manifestRef (content hash), op ∈ registered|refurbished|removed}`; highest revision wins; `seed` lives only in the Manifest; `tools/` validates ledger at build (monotonic rows, hash match, one winner per id).
- **Layout System (AD-10):** pure build-time function of (ledger + Wall Slot config); pre-declared evenly-spaced slots; back→front alternating fill; Zones fixed architecture, never placed; Zone machine positions inside a Zone are authored data. Slot-config revision id recorded alongside the ledger (SM-2 reproducibility).
- **Build (AD-11):** build reads all manifests + winning ledger revision per id; generates game registry, placements, and Instruction Cards; bundles one hashed static site; `buildRef` = the introducing commit; served build derives from the bundle's git snapshot.
- **Manifest required fields (AD-12):** `id` (kebab-case = dir name), `title`, `originalYear`, `attribution`, `cabinetType` (stand-up | sit-down | pinball), `seed`, `busy`, `controls`, `scoreHigherIsBetter`, `rulesText`, `buildRef`; optional `presentationOnly`. JSON Schema in `ci/`+`tools/`, validated at L0; manifests written by the Registration skill, never by hand.
- **Identity & scores (AD-16):** anonymous visitor UUIDv4 in localStorage; scores reported only via `scoreSubmitted`; the Cabinet's in-game score table is Core-owned and delivered read-only to the Cabinet's presentation half; never in sim input/stateHash/recordings; Personal Best keyed (stable gameId, visitorId).
- **Faults (AD-15):** no sim-state mutation outside `tick()` (deep-freeze harness, out-of-tick write throws); Core supervisor catches sim faults — logged as Dead-Machine defect, Cabinet keeps performing via kernel fallback.
- **Patron system (AD-23):** busy = real `autoplay(seed)` (no busy animation); occupancy + queue in the kernel scheduler, tick-deterministic (seeded); fixed in-tick phase order (sim ticks → event dispatch → scheduler decisions → input routing); reaction path = sim event → authored per-game impulse mapping → kernel reaction library → kernel Patron presenter; adapters never pose Patron figures; banter = fixed authored dialogue trees.
- **Diegetic integrity (AD-24):** every text surface declares a kind on the lint whitelist; marquees = title only; attribution only on Cards/nameplates; Cards generated at build from Manifest attribution + rulesText; L2 character lint.
- **Zones & fixtures (AD-25):** Zones and fixtures (coin door, desk, counter, door, report fixture) are `core/room`-owned interaction objects — no manifests, no placement, no game code; deterministic authored data-driven rules; figures (incl. Snack Bar attendant) drawn by the kernel Patron presenter via a figure-request service.
- **Run Recording/replay/report mechanics (AD-26):** recording format + fault sealing; storage ring under `arcade.rec.*` (latest per placed Cabinet never evicted; byte budget + periodic-hash cadence = single global config, set at M2; writes batched outside tick budget); `tools/replay` via `core/contract/`; in-room replay instance kind (`replay`, mutually exclusive with attract/autoplay/play, counts for liveness); `/api/report` ingest (`services/report-ingest/`, Node stdlib, no auth, size-capped, rate-limited, JSON on disk) — the one named outbound-call exception.
- **Liveness tiers (AD-27):** awake set = occupied ∪ near-radius ∪ frustum+margin, recomputed each tick; idle-pulse cadence shared; pure tick-state wake functions; audible ⇒ awake; audit mode disables culling. **All numbers (near radius, frustum margin, pulse cadence, audio N) set at M2.**
- **Numeric thresholds deferred to M2 (blocking M2 acceptance):** navigation framerate floor (FR-15/SM-C2), Patron reaction window, audio channel budget (distance-cull/nearest-N), seated focus-mix duck levels, wake-set radius/margin/cadence, occlusion hysteresis dead-band + dwell, fault-stall N cycles, recording byte budget + hash cadence. Until set, the full no-dead-machines law is not CI-enforceable — the health-check skill (M2) builds them.
- **Stack (pinned, web-verified 2026-11-19):** three 0.187.0 + @types/three 0.187.0 (must match exactly); TypeScript 7.0.2 (Core + contract seam; games may be plain JS with JSDoc); Vite 8.3.8; Node 26 Active LTS (26.13.x); nginx 1.30.7+ (upstream repo install, not distro backports); report-ingest on `node:http` stdlib only; GitHub Actions hosted (pin actions to commit SHAs); DigitalOcean droplet (unpinned). Hand-coded three.js on Vite+npm — **react-three-fiber deliberately not used** (React reconciliation fights the fixed-tick model).
- **Deployment (AD-20):** one droplet; nginx + certbot; HTTPS-only; strict CSP; single origin; zero external scripts; nginx rate limiting; nginx proxies `/api/report` to the thin ingest service on the same droplet. GitHub Actions: per-push L0/L1 for touched game + build; merge to main builds one hashed static bundle and re-verifies the sealed-build property against the final bundle before rsync to the droplet; scheduled full-room regression. Same artifact dev → CI → prod.
- **Game Factory (five skills, built as part of M2's first pipeline run):** pipeline-init (starts a Game's BMad cycle: research, spec, per-game PRD material, epics; stamps contract + gate criteria into epic acceptance), metadata (collects Manifest metadata), contract-test (generates/runs the game's L0–L1 suite), health-check (runs the L2 whole-room audit; builds the numeric thresholds), registration (commits the Manifest end-to-end; refuses a red gate). Skills are thin orchestrators; mechanics live in `ci/` and `tools/`.
- **Binding builder rules:** `docs/game-authoring.md` — rng discipline (rng only inside `tick()`, cursor in `snapshot()`), deterministic math (engine-variable transcendentals lint-red), control slots (input read only via declared slots inside `tick()`; wrap existing games at the seam, throw their input layer away), snapshot rules (plain serializable, no Map/Set/class/Date), never self-log/replay/fetch/localStorage, L0 pre-flight checklist.
- **Brownfield assets (standing contracts):** `C:/git/moonpatrol` (complete vanilla-JS clone) vendored into `games/moon-patrol/`, wrapped to contract for M0, reimplemented to the contract within v1; `C:/git/pinball` (~15 tables, most work today) vendored into `games/<game-id>/` with per-table Manifest attribution before the M3 audit, registered as `presentationOnly` wrappers with liveness hooks (M3 batching exception: one shared wrapper harness, per-table Manifests, audit as one batch); `C:/git/dragonwar` (GPL, in progress) is one candidate for the M6 engine decision (OQ-4).
- **Canonical floor plan:** `ux-designs/ux-local-arcade-2026-11-20/imports/arcade-floor-plan.html` (room architecture only — year ruler/SHRINE/POD labels superseded); `room-layout.md` numeric values win over the plan. Room ~19m × 12.5m; slot pitch 1.40m; stand-up footprint 0.60m; eye height 1.60m; aisles ≥1.20m; two occluder pillars.
- **Registration→placement→build flow:** Game epic PR (source + manifest) → `ci/` gate (L0 lint+schema, L1 headless, L2 audit vs current room) → green required → ledger append → build (generated registry + placement + Instruction Cards) → one hashed static bundle incl. Workshop repo snapshot → rsync to droplet (nginx serves).
- **Success metric seats:** SM-1 (first-minute-by-ear, both variants) and SM-4 (feels like the memory — never a pass/fail gate; tie-breaker) live in the L3 human walk; SM-2 (pipeline end-to-end, zero Core edits/hand-placement) and SM-3 (zero Dead Machines in random-frame audit) are measurable; SM-5 floor value pending OQ-11 (owner decision at M2).
- **Open questions carried into stories:** OQ-4 pinball engine/table (decision story at M6), OQ-9 marquee name (blocking public launch only, at launch prep), OQ-10 donation network path (RESOLVED by owner 2026-11-20, before M5 scoping: top-level navigations to named provider destinations machine-enumerated on the build-time whitelist; donations never mean more than "the offer honestly leaves the room" — offer-only, no confirmation, v1 permanent), OQ-11 SM-5 falsifiable floor (at M2).

### UX Design Requirements

UX-DR1: Implement the color token system as authored: room envelope (Room Black `#15110E`, Wall Warm `#2E241D`, Wall Panel `#4A3628`, Carpet Base/Pattern `#221B27`/`#3E3046` low-contrast octagon/weave); eight glow anchors (`glow-marquee #FFC46B`, `glow-pink #FF4FA3`, `glow-cyan #5BC8FF`, `glow-green #57E6A3`, `glow-violet #B07CFF`, `glow-orange #FF9A5C`, `glow-red #FF6B5E`, `glow-steel #7FB0C9`) used only as light/material identity from machines and zone fixtures — never painted on walls; in-world paper surfaces (Paper Card `#F2E8D4` / Card Ink `#2A241C`, Nameplate Brass `#D8C48F`, Sign Chalk `#E8E4DD`); outside-fiction UI trio (`ui-surface #191919`, `ui-text #EDEDED`, `ui-muted #9A9A9A` hint/disabled only, `ui-accent` = cyan glow, `ui-border`, `ui-focus`). No pure white or pure black fills; no chromatic color in the room that isn't light-from-a-machine.

UX-DR2: Implement the world-scale typography system, enforced by a legibility lint (size table × distance × lux): Chakra Petch marquee-title (cap 0.18m, legible ~15m; provisional face — swap candidate Saira Condensed must pass the table); Archivo Narrow instruction-heading (x-height ≥20mm) / Archivo instruction-body (x-height ≥12mm at 0.5m, era operators'-sheet voice); Archivo Narrow caps room-sign (cap ≥60mm at 3m); Spectral nameplate (cap ≥30mm at 2m, museum voice); IBM Plex Sans (24px/600 heading, 16px/1.6 body) outside-fiction pages only. Marquees carry `Manifest.title` only.

UX-DR3: Implement spacing/scale anchors as world units: eye height 1.60m; walk speed 1.4 m/s with head bob ±0.04m; stand-up cabinet width ~0.60m; Wall Slot pitch 1.40m; aisles never narrower than 1.20m; room interior ~19m × 12.5m (too big to take in at once, sized for 50-cabinet honesty); outside-fiction gutter 24px and spacing scale 4/8/16/32px.

UX-DR4: Implement the shape language: 0px radius for cabinet shells/screens/bezels, 2px signs, 4px paper cards, 6px outside-fiction UI; no pills or circles-as-surfaces; depth is atmospheric (glow falloff, haze, occlusion), never card-shadow; outside-fiction pages are flat with 1px `ui-border` borders and zero shadows.

UX-DR5: Marquee component — glow-marquee (or the game's art-lit variant) lettering of `Manifest.title` on a dark cabinet-top bar, lit from within, never below the authored cap height; game name only.

UX-DR6: Cabinet screen surface treatment (Core-owned): attract / score table / NEXT / replay playback all render here; score table in era-CRT voice at instruction-heading scale rules; NEXT signal at the marquee's authored minimum, legible from across the room (rung-2 of the pull ladder works without audio); fault fallback keeps marquee + screen motion alive; screen glows in the machine's own hue family.

UX-DR7: Instruction Card — generated from Manifest attribution + rules text; Paper Card stock behind the coin door; heading + rules + attribution; print budget: one rule per line, capped length; card↔Workshop-drawer pairing.

UX-DR8: Nameplate — brass lettering on Room Black, Hall of Models rows only; text generated from Manifest attribution; names the model.

UX-DR9: Room-sign — Sign Chalk painted/printed voice at fixed authored positions (zone labels at door height, report-fixture signage); banter subtitles render as small cabinet-side signs when enabled: dwell ≥ read-time, re-approach re-displays for remaining duration, cap ≥60mm; never floats, never overlays the view.

UX-DR10: Welcome Flyer — stapled era flyer on the wall by the front door; Paper Card stock; carries the control list ("MOVE: W A S D · LOOK: MOUSE · DO: E") as in-world paper; the single sanctioned announcing artifact, whitelisted for character lint.

UX-DR11: Report claim-check fixture — small Paper Card at the Cabinet ("something's wrong with this machine"), instruction-card stock; owns its staging state; offers the recording as download + submit; offline/submit-fail treatment: "Couldn't send. Take the card with you." (download fallback).

UX-DR12: Workshop bench staging visuals — chalk outline (plan-only) → bare cabinet skeleton + work light (source present, red gate — honest silence) → art-on with TESTED tag + first attract on the bench (tests green, pre-Registration) → stenciled crate/installed (registered); worn-paper honest-material treatment, never gamey props; unbuilt plans staged legibly as unbuilt.

UX-DR13: Snack Bar fixtures — tip jar and counter in warm wood + glass, catch-light orange; coin clink enters the room's soundscape; attendant figure via kernel figure-request service with fixed authored lines.

UX-DR14: Settings page (outside-fiction, plain workbench style, deliberately not era-styled) — named rows: look sensitivity; master volume; banter volume/mute; focus-mix strength; comfort preset (off/low/full); FOV; optional vignette; "calm cabinets" attract-tempo tier (cabinets keep moving/glowing — tempo only); "quiet room" banter-density tier; input remap (WASD/E) + look-source (mouse-look / arrow-key / drag); reset to defaults. Choices persist per browser (localStorage). Reachable from the site page AND by walking out the front door (mid-session remedy costs queue position, never a forced reload).

UX-DR15: Site page (outside-fiction) — entry, controls list, workbench disclosure block ("Needs a mouse and keyboard. First-person movement. Stereo sound is central. Bright moving lights. Desktop browser only. English only, v1."), repo issue link, skip-link to Settings; underpowered/unsupported-browser detection BEFORE the 3D canvas ("Needs a modern desktop browser with 3D support") — entry never half-loads.

UX-DR16: Street-door loading beat — the door is closed; attract sound spills out and swells as assets stream; the visual twin for muted/Deaf visitors and autoplay-blocking browsers: light-bleed widens under the door, glass brightens, handle turns at ready; no progress bar — the door opens when the room is ready; load failure after ~90s: plain outside-fiction panel ("The arcade didn't open. Reload."). Street-door view doubles as the exit view (walk out, adjust settings, re-enter).

UX-DR17: Atmospheric depth & light-spill law — attract glow halos and marquee light fall off through faint dust-haze; glow gets authored spill around occluder edges (bleed, floor sheen, ceiling bounce-cones) so the attract-graphics rung works alone through sightline blind spots (Deaf/HoH proximity gradient); distant machines dim toward Room Black but never read dead; liveness tiers are invisible to the player.

UX-DR18: Interaction primitives — WASD move, mouse look (pointer-lock), E as the single interact verb (open coin door, sit, pick up a card, offer the report); looking IS targeting (center-of-view + E); no hover states, no click-to-raycast, no menus; controls learned from the Welcome Flyer or by trying, never from prompts; pointer-lock denial falls back silently to drag-look or arrow-key look (device layer, replay-safe, configurable in Settings).

UX-DR19: Banned-UI enforcement surface — HUD, crosshair, waypoints, minimap, tooltips, click-to-move, context menus, "are you sure" dialogs are banned everywhere and machine-linted by the L2 character lint.

UX-DR20: Motion comfort package — authored baselines exist as DESIGN tokens (walk 1.4 m/s, bob ±0.04m); comfort preset ON at first visit, seeded by OS `prefers-reduced-motion`; baselines provisional — tune at the L3 vestibular test (5-minute continuous walk, symptom report).

UX-DR21: Deaf/HoH discovery test (gated commitment) — the M1 walk includes a Deaf/HoH tester with master audio muted: reach a playable cabinet within the first 60s; SM-1's two required variants (rung-1 normal audio; rung-2 master-muted) both pass at the L3 walk; color-blind check (zones read from fixtures/geometry at 6m with hue removed) at the M1 walk.

UX-DR22: Non-sighted visitor M1 spike — sound-only, eyes-closed attempt at UJ-1 (locate, sit, score); outcome reported honestly on the site page either way; canvas carries an entry label.

UX-DR23: Outside-fiction page accessibility — WCAG 2.2 AA: 24px touch/click targets, visible focus ring (`ui-focus`, ≥3:1 against ui-surface), toggle state cued by position + shape never color alone, verified contrast ratios (ui-text 15.02:1, ui-muted 6.25:1, ui-accent 9.34:1).

UX-DR24: Zone identity system — hues as lighting/material identity: Pinball Corner violet, Snack Bar orange, Workshop steel, Casual Alley green (kept-clean empty in v1), empty-stretch/roadmap amber, glow-red at the door; every zone reads from fixtures and geometry at 6m with hue removed; findable-by-ear sound identities each carry an authored visual signature (Pinball gong = striker arm mid-swing; Moon Patrol attract loop shows its title screen; tip jar = coin flash at the counter) so identities are findable without hearing; half-built bench machines sit in honest silence.

UX-DR25: Soundscape contract — the soundscape IS the seek system: never ambience padding, never UI beeps; pull ladder fixed order with zero UI hints; mix ladder (doorway nearest-read → approach swell → seated collapse to near-silent floor); Moon Patrol sounds from the back wall (M0); Pinball Corner gong / SPIKE CHILLER / table rumble ride M6; audio behavior identical across browser builds (replays reproduce the mix).

UX-DR26: Composition references — six mockups pin composition and token use only, never render fidelity (`ux-designs/ux-local-arcade-2026-11-20/mockups/`: street-door-loading, cabinet-close-up, workshop-bench, hall-of-models-row, snack-bar-counter, settings-page); the spine wins on conflict.

### FR Coverage Map

FR-1: Epic 1 - First-person walk-in shell, page load to controllable view ≤60s, no auth
FR-2: Epic 1 - Room architecture: Wall Slot walls, aisles, occluder pillars, fixed Zones, empty stretch as roadmap
FR-3: Epic 2 - Spatially occluded attract audio, pull ladder, proximity ladder + seated focus mix, hysteresis
FR-4: Epic 1 - Patron at a busy machine: autoplay-driven reactions 1:1, queue/NEXT ritual, banter, handoff
FR-5: Epic 1 - No Dead Machines law + Faulted Machine fallback; law binds from day one, lints/audits arrive Epic 2-3
FR-6: Epic 1 - Sit down and play Moon Patrol in place; return continuity; contract reimplementation lands in Epic 3
FR-7: Epic 1 - Anonymous identity, Personal Bests across visits, Core-owned score table (Personal Bests + Patron runs)
FR-8: Epic 3 - Registration by Manifest alone via the Registration skill; zero Core edits
FR-9: Epic 3 - Generated Instruction Card with model attribution + L2 character lint (marquee-title-only rule starts in Epic 1)
FR-10: Epic 3 - Layout System: pure build-time function, pre-declared slots, back→front alternating fill, aisle lint
FR-11: Epic 3 - Both standard shells (stand-up, sit-down) equipped per Manifest cabinetType (stand-up exists already from Epic 1)
FR-12: Epic 5 - Workshop renders allowlisted repo truth; bench lifecycle staging; card↔drawer pairing
FR-13: Epic 6 - Snack Bar donation surface: tip jar clink, BMC coffee ordering, crypto links; offer-not-confirmed
FR-14: Epic 4 - Hall of Models row: ~15 presentationOnly wrapper tables, nameplates, findable shared prompt
FR-15: Epic 7 - One playable pinball table (OQ-4 engine decision story) + second in attract, side by side
FR-16: Epic 3 - Refurbish (same id, score continuity) and de-registration at a run boundary; never move
FR-17: Epic 3 - Game-build contract + four-layer verification gate; M2 numeric thresholds (blocking M2 acceptance)
FR-18: Epic 3 - Run Recording, headless + in-room replay, claim-check fixture, /api/report ingest, no PII

## Epic List

### Epic 1: Walk In — The First Living Machine *(M0)*
A visitor loads the page, is inside the room in first-person control within a minute, sees a room of glowing cabinets with empty wall slots reading as roadmap, watches a Patron actually playing Moon Patrol, sits down, and plays the real game — their personal best survives the next visit. No auth, no UI, no dead machines from day one.

**FRs covered:** FR-1, FR-2, FR-4, FR-5, FR-6, FR-7 *(FR-9 partial: marquee shows title only; FR-11 partial: the stand-up shell exists for M0)*

**Implementation notes:** Story 1.1 bootstraps the greenfield repo from the Structural Seed (no starter template exists). Kernel clock (60Hz), contract seam, supervisor, first-person shell, room geometry, provisional Moon Patrol wrap, one Patron + queue/NEXT. The acceptance laws (no dead machines, fiction-pure) bind from the first story even before their lints exist.

### Epic 2: Find It by Ear — The Room Is Alive Around You *(M1)*
A visitor drifts toward a sound around a pillar, catches the attract glow, and sits down — the full pull ladder (occluded sound → attract graphics → Patron intensity) with zero UI hints. Both SM-1 variants (normal audio AND master-muted) pass the M1 human walk, with Deaf/HoH and low-vision testers as mandatory participants; the non-sighted spike runs here.

**FRs covered:** FR-3 *(FR-5 and SM-1 re-measured here)*

**Implementation notes:** Core Audio Manager, occluder collider set (sound + sightlines on one geometry), proximity-ladder mix + seated focus mix, hysteresis (numbers may wait for M2 thresholds; behavior verifiable at the walk). Settings page (UX-DR14) and site page (UX-DR15) land here — the accessibility walk cannot happen without comfort presets and subtitles. Gate: the M1 human walk is the release boundary.

### Epic 3: The Arcade Grows Itself — Pipeline, Proof, and Repair *(M2)*
A second Game goes spec→registered end-to-end: Game-build contract + contract harness, append-only ledger, the five Factory skills, Registration on a green four-layer gate, deterministic Layout System placement, generated Instruction Card crediting the model, both standard shells equipped per Manifest, refurbish/remove lifecycle — zero hand-placement, zero Core edits (SM-2). Every run is kernel-recorded, replayable headlessly (`tools/replay`) and in-room, and reportable via the claim-check fixture + `/api/report`. The M2 numeric thresholds land here — M2 acceptance is incomplete without them. The public deployment posture (one hashed static bundle, nginx, CI re-verify, rsync) ships with this epic.

**FRs covered:** FR-8, FR-9, FR-10, FR-11, FR-16, FR-17, FR-18

**Implementation notes:** Deliberately one epic (owner-approved): the gate/ledger/layout/card machinery churns the same `ci/` + `tools/` + ledger files; splitting would create file-churn epics. It will be story-heavy: contract harness; L0–L2 gates + thresholds; ledger + skills; layout + placement; cards + character lint; lifecycle; recording/replay/reporting (+ ingest service); the second Game built as the first full epic against the contract; Moon Patrol reimplementation to the standard contract (FR-6). OQ-11 (SM-5 floor) is decided here. The second Game's identity is the owner's pick from the cabinet-inventory pool.

### Epic 4: The Hall of Models — A Museum Row *(M3)*
A visitor finds a row of ~15 pinball tables in the Pinball Corner, each with a brass nameplate naming the model that built it, with the shared prompt as a findable in-world artifact — the single museum exception to found-never-announced. Presentation-only, but every table ticks (liveness hooks) or it is a Dead Machine by law.

**FRs covered:** FR-14

**Implementation notes:** M3 batching exception applies: one shared `presentationOnly` wrapper harness, per-table Manifests, L1 liveness + L2 audit accepted as one batch. Vendoring the ~15 tables from `C:/git/pinball` into `games/<game-id>/` is real work (AD-2: the contract must wrap heterogeneous existing assets).

### Epic 5: The Room Tells the Truth — The Open Workshop *(M4)*
A returning visitor sees this week's real commits on the Workshop monitor, BMad plans as diegetic paper (unbuilt ones staged legibly as unbuilt), and the bench staged to each machine's real build lifecycle — repo change → room change within one build.

**FRs covered:** FR-12

**Implementation notes:** Build-time Workshop snapshot baked into the bundle (AD-21), allowlist-scoped to build-visible repo truth (CAP-14, exclusions checked at L2); card↔drawer pairing closes FR-12's loop with Epic 3's card generation.

### Epic 6: Pay the Arcade in Character — The Snack Bar *(M5)*
A visitor orders a "coffee" at the counter (that IS the Buy-Me-a-Coffee top-level navigation), drops a coin into the tip jar that clinks audibly into the mix, and follows crypto links — all staged honestly as offer, never confirmation. No web-form popups, no confirmation theater.

**FRs covered:** FR-13

**Implementation notes:** OQ-10 RESOLVED (owner, 2026-11-20): donations leave the room as user-gesture **top-level navigations** to machine-enumerated provider destinations on the build-time whitelist — no routing through ingest, no new server machinery; CAP-15 completion stays "the offer honestly leaves the room," offer-only forever in v1. Fixtures are `core/room` interaction objects (AD-25); attendant lines are fixed authored dialogue trees.

### Epic 7: Pinball Comes Alive *(M6)*
Two tables are live in one frame in the Pinball Corner — one playable by the visitor and by auto-play, the same engine running the adjacent cabinet in attract — at playable framerate, with the corner findable by ear (gong, SPIKE CHILLER, table rumble, clacks/bells).

**FRs covered:** FR-15

**Implementation notes:** Carries the OQ-4 decision story (engine + first table: packaging form inside the sim half, GPL obligations in a distributed sealed bundle, cross-browser physics determinism beyond same-seed-same-hash); `C:/git/dragonwar` is one candidate. Pinball audio anchors (gong/SPIKE CHILLER/rumble) ride this epic. Zone-bound `presentationOnly` tables bind to Pinball Corner Zone slots (exempt from back→front fill).

## Epic 1: Walk In — The First Living Machine *(M0)*

A visitor loads the page, is inside the room in first-person control within a minute, sees a room of glowing cabinets with empty wall slots reading as roadmap, watches a Patron actually playing Moon Patrol, sits down, and plays the real game — their personal best survives the next visit. No auth, no UI, no dead machines from day one.

### Story 1.1: Project bootstrap and the deterministic kernel core

As a builder,
I want a runnable monorepo matching the Structural Seed with a kernel that owns a fixed 60Hz clock and the contract harness,
So that every game and room service runs on one reproducible, deterministic runtime from day one.

**Acceptance Criteria:**

**Given** a fresh clone, **when** I install and run dev, **Then** the pinned stack serves an empty three.js scene (Room Black envelope): three 0.187.0 + @types/three 0.187.0 (exact match), TypeScript 7.0.2, Vite 8.3.8, Node 26
**And** the Structural Seed directories exist (`core/`, `core/room/`, `core/contract/`, `games/`, `ci/`, `tools/`, `services/`, `.claude/skills/`), contents arriving with the stories that need them
**And** the master loop advances one global fixed 60Hz sim tick decoupled from rendering, with a max-catch-up-steps-per-frame guard and defined backgrounded-tab resume semantics (NFR-2); sim time = tick count
**And** `core/contract/` provides: seeded rng injection (`uniform/range/rangeInt/pick/weighted`, cursor gettable/restorable), the deterministic math module (sin/cos/tan/asin/acos/atan2/pow/exp/log), deep-freeze between ticks (out-of-tick writes throw), wrapper-computed `stateHash()` over canonicalized `snapshot()`, and the `tick(dt, input)`→`events()` calling protocol (AD-3, AD-4, AD-5, AD-8, AD-15)
**And** the supervisor wraps every kernel call site and catches faults (AD-15)
**And** the build-time registry generator (`tools/`) emits a game registry from a provisional hand-authored list (ledger-driven in Epic 3); Core source contains no `games/**` imports — a CI dependency check fails any violation (AD-1)
**And** lint bans for `Math.random` / `Date.now` / `performance.now` and engine-variable transcendentals are configured on sim-half paths (full L0 completes in Epic 3)

### Story 1.2: First-person walk — look and move, no prompts

As a Visitor,
I want to load the page and immediately look with the mouse and walk with WASD,
So that I am inside the room the way I remember it — no prompts, no menus, nothing explaining itself.

**Acceptance Criteria:**

**Given** a loaded page, **Then** no modal, onboarding, sign-in, or cookie wall has ever appeared (FR-1)
**When** pointer-lock is granted, **Then** mouse-look + WASD move at eye height 1.60m, walk speed 1.4 m/s, head bob ±0.04m (UX-DR3, NFR-7)
**And** when pointer-lock is denied, a silent drag-look fallback keeps the visit alive — device-layer only, replay-safe (UX-DR18; its Settings rows arrive in Epic 2)
**And** E is the single interact verb with looking-as-targeting (center-of-view); no hover states, no click-raycast (UX-DR18)
**And** no HUD, crosshair, waypoint, minimap, or tooltip exists anywhere in the view (NFR-8, UX-DR19 — machine lint arrives Epic 3; the law binds at review now)
**And** walls, pillars, and cabinets block movement via kernel collision driven from tick state
**And** behavior is identical on evergreen Chrome and Edge desktop — the CI-enforced matrix (NFR-7)

### Story 1.3: The Arcade Room — slots, pillars, zones, and the roadmap wall

As a Visitor,
I want to walk a real room — evenly spaced cabinet slots on the walls, pillars that break sightlines, fixed zones, and an obvious empty stretch near the door,
So that the space reads as an arcade that grows, and finding things by drifting is possible at all.

**Acceptance Criteria:**

**Given** the room, **Then** the interior is ~19m × 12.5m (contract numbers per `room-layout.md`; that file wins over the floor plan), front door bottom-center with a street side outside (FR-2, UX-DR3)
**And** Wall Slots are pre-declared, evenly spaced at 1.40m pitch, authored in `core/room/` slot config with a revision id; empty slots read as roadmap in the same visual language as filled ones (FR-2, seeds FR-10)
**And** two occluder pillars break sightlines from sampled positions, and the dedicated occluder collider set lives in `core/room/` as the one geometry for sound (Epic 2) and sight (AD-7)
**And** Zones are fixed architecture: Pinball Corner back-left, Workshop back-right, Snack Bar front-right, Casual Alley mid-right kept clean — with authored zone-hue lighting identity (violet/steel/orange/green, amber at the roadmap) readable at 6m from geometry alone (FR-2, UX-DR24 partial; zone fixtures arrive in Epics 4–7)
**And** aisles are never narrower than 1.20m (aisle-nav lint machine-checks it at Epic 3 L2)
**And** the Welcome Flyer sits on the wall by the front door: Paper Card stock, "MOVE: W A S D · LOOK: MOUSE · DO: E" — the single sanctioned announcing artifact, a whitelisted room-sign surface (UX-DR10)
**And** the envelope uses the design tokens — Room Black unlit wall height, Wall Warm + wainscot, low-contrast carpet octagon — hard corners only; cabinets are the light sources and nothing is painted-glow on walls (UX-DR1, UX-DR4)

### Story 1.4: The standard stand-up Cabinet — shell, marquee, live screen

As a Visitor,
I want every placed cabinet glowing with a lit marquee, a live screen surface, and a coin door,
So that the room's furniture reads as real 80s machines — and every future game can wear the same shell.

**Acceptance Criteria:**

**Given** the stand-up shell (~0.60m footprint, 0px radius), **Then** it exists as room-architecture furniture with marquee bar, screen bezel, and coin door — the first of the two standard shells (FR-11 partial; sit-down arrives in Epic 3)
**And** the marquee lights the game title only, glow-marquee lettering in Chakra Petch at 0.18m cap height legible to ~15m — never a model name, badge, or tagline (FR-9 partial, UX-DR2, UX-DR5)
**And** the cabinet screen is a Core-owned surface treatment rendering attract / score / NEXT zones in the era-CRT voice, glowing in the cabinet's own hue family (UX-DR6)
**And** the coin door opens/closes with E — the generated Instruction Card surface itself arrives in Epic 3 (FR-9)
**And** composition matches `mockups/cabinet-close-up.html` for token use only, never render fidelity (UX-DR26)

### Story 1.5: Moon Patrol plays in place — vendored, wrapped, alive

As a Visitor,
I want to reach Moon Patrol in the room, press E, and play the real game inside its cabinet — then return to where I was standing,
So that the first minute ends with a real game, complete and playable — the promise of the whole project.

**Acceptance Criteria:**

**Given** `C:/git/moonpatrol`, **Then** it is vendored into `games/moon-patrol/` (AD-13) with the sim half importing no three/WebAudio/DOM/window (AD-2), and its `input.js` layer thrown away at the seam — gameplay reads only declared control slots (`axis: move`; `buttons: start, jump, fire`) per `docs/game-authoring.md §3`
**And** the wrapper exposes the contract verbatim: `tick(dt, input)` at dt=1/60, `events()` plain-data lists reaching canonical `gameEnded`/`roundBreak`, `scoreSubmitted` for scores, `snapshot()` plain-serializable including the rng cursor; `stateHash()` is wrapper-computed (AD-5, AD-6)
**And** `attract()` runs continuously on the cabinet — including the title-screen visual signature (UX-DR24) — and its `stateHash` advances every attract cycle as a seconds-fast unit test
**And** a standing Visitor pressing E plays in place on the cabinet screen via the kernel seat-transition service; leaving restores their position and room continuity (FR-6)
**And** Visitor sessions get a kernel-fresh random seed (surprise preserved; recording itself is Epic 3); derived seeding follows AD-4 roles
**And** the wrap is marked provisional — the reimplementation to the standard contract is scheduled within the MVP (FR-6, Epic 3) with no visible change to the cabinet experience

### Story 1.6: One busy machine — a Patron actually plays

As a Visitor,
I want to see a Patron playing Moon Patrol — flinching at shots, NEXT glowing on the screen — and to take over at the break,
So that the machine reads as alive and lived-in, and "busy" is texture, never a lock.

**Acceptance Criteria:**

**Given** a Cabinet designated busy (provisional scheduler config; the Manifest `busy` field lands in Epic 3), **Then** the kernel Patron scheduler runs a Moon Patrol auto-play session with a derived seed — no separate "busy animation" exists (FR-4, AD-23)
**And** Patron reactions (flinch/slam/jump) fire 1:1 with that game's own sim events through the authored per-game impulse mapping → kernel reaction library; no canned loops (FR-4, AD-6, AD-23)
**And** the figure is animated by the kernel Patron presenter — a game's adapter never poses a Patron (AD-23)
**And** NEXT renders on the screen at the authored minimum, legible from across the room (UX-DR6)
**When** the Visitor waits, takes over at the next `gameEnded`/`roundBreak`, or walks away, **Then** all three work — a present Visitor beats the queue head, and busy never permanently withholds a machine (FR-4)
**And** the auto-play session restarts at the next break after ending
**And** banter and Patron→Patron handoff are explicitly out of scope here (M2 cut-list items → Epic 3)

### Story 1.7: Fault containment — a broken game never kills the room

As a Visitor,
I want a crashing cabinet to keep performing and the room to keep running,
So that no machine ever reads dead and my visit never dies at someone else's exception.

**Acceptance Criteria:**

**Given** a sim throws inside `tick()`, **when** the supervisor catches it, **Then** the room never crashes and the fault is logged as a Dead-Machine defect (AD-15, FR-5)
**And** the faulted Cabinet keeps performing via kernel fallback (marquee + screen motion driven by the kernel, no sim) — a sampled frame still reads active (FR-5, UX-DR6)
**And** a Visitor seated at the faulted machine keeps a performing screen and is unseated gracefully at the next break (CAP-7; fault-sealed recording arrives in Epic 3)
**And** the dev harness treats a `stateHash()` stall across N attract cycles as the dead-machine fault predicate (N is a placeholder until Epic 3 sets it) and stateHash-delta as attract liveness (FR-17 L1 precursor, CAP-7)
**And** any out-of-tick mutation throws in the dev kernel — mutation-only-in-`tick()` is mechanical, not convention (AD-15)
- DW-2: core/main.ts boot: a throwing createSim factory is unguarded - one faulty game kills the whole room at page load (AD-15) (ledger; routed by harvest 2026-11-21)
- DW-3: unbounded growth in long-lived processes: supervisor.faults uncapped (60/s from a broken sim); loop.eventQueue never drained once games register (ledger; routed by harvest 2026-11-21)
- DW-6: matrix Out-of-tick-write row has no composable fault-chain test surface (gate throws to caller; supervisor wraps kernel sites - two disjoint surfaces) (ledger; routed by harvest 2026-11-21)

### Story 1.8: The room knows you without an account

As a returning Visitor,
I want my personal best on the cabinets I played, same browser, no login,
So that the arcade carries my history without collecting my identity.

**Acceptance Criteria:**

**Given** a first visit, **Then** the Core generates an anonymous UUIDv4 in `localStorage` under `arcade.*` — no consent wall, no prompt, nothing else about the visitor exists (FR-7, AD-16, NFR-5)
**And** game scores travel only via canonical `scoreSubmitted` `{score, initials?}`; missing initials get a kernel-derived anonymous pseudonym; games never write tables (AD-16)
**And** the Cabinet's score table renders read-only in the presentation half: Personal Bests + Patron auto-play runs only — Patron runs alone until a Personal Best exists (FR-7, UX-DR6)
**And** the sim never reads, branches on, or stores score-table content (L0-red in Epic 3; enforced at review in M0) (AD-16)
**And** returning shows the Personal Best keyed on (stable gameId, visitorId) — refurbish continuity will ride the same key (FR-7, seeds FR-16)
**And** no personally identifiable information exists anywhere — the identifier is a random UUID only (NFR-5)

### Story 1.9: The street-door beat — loading as fiction's first shot

As a Visitor,
I want the page to open on a closed arcade door that comes ready — no progress bar, no modals — and put me in control within a minute,
So that entering is already the product's first beat, not a technical wait.

**Acceptance Criteria:**

**Given** page load, **Then** the visitor sees the front door from the street, closed; there is no progress bar and no sign-in/cookie wall/onboarding anywhere (FR-1, UX-DR16)
**And** the visual twin of readiness plays while assets stream: light-bleed widens under the door, glass brightens, handle turns at ready (the sound swell rides Epic 2's Audio Manager) (UX-DR16)
**When** the room is ready, **Then** the door opens and control takes over — page-load to controllable view ≤60s worst-case on a mid-range laptop (guardrail ceiling, never shown), and the real time-to-playable budget is set and recorded from this first measurement (FR-1, NFR-1)
**And** on asset timeout ~90s, a plain outside-fiction workbench panel appears: "The arcade didn't open. Reload." — never partial fiction (UX-DR16)
**And** a detected unsupported/underpowered browser gets the workbench panel *before* the 3D canvas — entry never half-loads (UX-DR15 partial; full site page lands in Epic 2)
**And** composition matches `mockups/street-door-loading.html` for composition and tokens only (UX-DR26)

### Story 1.10: Epic 1 burn-down

As the owner (the lead closing the epic),
I want the deferred-work items that sit squarely inside Epic 1's own footprint closed in one bounded pass,
So that Epic 1 merges with no burndown debt: two CI/tooling gaps, one test-law gap, and the owner-priority cabinet-shell realism pass, all through the story pipeline.

**Acceptance Criteria:**

- DW-29: Cabinet shell reads as a vending machine, not an upright arcade cabinet: wants a real marquee box on top plus cabinet contours (shaped side panels, screen bezel/hood, control-deck silhouette) (ledger; routed by burndown gate 2026-11-25; owner-initiated priority)
- DW-1: ci/lint-bans depth evasion: Math["random"], destructured Math, new Date()/Date() pass the sim-path ban gate (ledger; routed by burndown gate 2026-11-25)
- DW-5: tools/gen-registry.mjs does not validate simPath points under games/<id>/sim/ — AD-1 direction unenforced at the build step (ledger; routed by burndown gate 2026-11-25)
- DW-11: in-view half of the no-UI law unpinned: a camera-parented mesh (crosshair/HUD) added in core/main.ts keeps the suite green; DOM half pinned only (ledger; routed by burndown gate 2026-11-25)

## Epic 2: Find It by Ear — The Room Is Alive Around You *(M1)*

The full pull ladder with zero UI hints — occluded spatial sound → attract graphics → Patron intensity — so a Visitor drifts toward a sound around a pillar, catches the attract glow, and sits down. Both SM-1 variants (normal audio AND master-muted) pass the M1 human walk, with Deaf/HoH and low-vision testers as mandatory participants.

### Story 2.1: Core Audio Manager — attract sound that occludes and swells

As a Visitor,
I want attract-mode sound to be spatial in the room — blocked and muffled by pillars, swelling as I approach — with the loading door already spilling it,
So that I can locate a machine by ear alone: the first rung of the pull ladder works with zero UI hints.

**Acceptance Criteria:**

**Given** every placed Cabinet, **Then** exactly one Core Audio Manager owns the WebAudio graph (games supply assets + requests only) doing PannerNode spatialization and distance attenuation (AD-7)
**When** the line from listener to cabinet crosses the occluder collider set, **Then** the Manager applies raycast occlusion as gain reduction + lowpass — single-ray first (soft multi-ray explicitly deferred) (AD-7)
**And** moving behind a pillar changes what is heard, positionally; a Visitor can locate a machine by sound alone (FR-3)
**And** occlusion/proximity transitions use hysteresis — dead-band + dwell as a pure tick function — so standing at a boundary never flips audio per tick (CAP-3; numbers are placeholders until Story 3.7 sets them)
**And** the entire mix derives only from kernel tick state (positions, camera, occupancy) — never wall-clock (AD-7)
**And** the street-door beat now has its sound twin: attract sound spills through the closed door and swells as assets stream, surviving autoplay-gesture blocks via the already-shipped visual twin (UX-DR16)
**And** no game ever creates its own WebAudio graph or audio nodes — the L0 ban covers these paths (AD-7)

### Story 2.2: The proximity ladder and the seated focus mix — "tuned in"

As a Visitor,
I want the room's mix to order itself by distance — only the nearest machines clear at the door, one machine swelling as I approach, and everything but my machine dropping when I sit down,
So that the sound itself guides me to a machine and keeps my game clear while I play — the owner's proximity-ladder spec, honored exactly.

**Acceptance Criteria:**

**Given** a Visitor at the doorway, **Then** only the nearest machines read clearly; the rest sit low in the mix (FR-3)
**When** the Visitor approaches a machine, **Then** that machine swells above the rest (FR-3)
**When** a Visitor sits down to play, **Then** the focus mix collapses the room around that machine: focused cabinet at full level, every other cabinet ducked to an authored near-silent floor — "tuned in" — with ambience and zone sound following their own authored levels (FR-3, AD-7)
**And** channel budget = distance-cull + nearest-N operating inside the awake set (AD-7/AD-27 interlock; numbers set in Story 3.7)
**And** duck levels are authored data; mix state is tick-derived — a replay reproduces the mix (NFR-10)
**And** the soundscape never adds ambience padding or UI beeps — the soundscape *is* the seek system (UX-DR25)

### Story 2.3: Light spill and atmospheric depth — the graphics rung works alone

As a Visitor who can't hear (or with audio muted),
I want attract glow halos, haze falloff, and light bleeding around the pillars that block the sound,
So that the second rung of the pull ladder — find it by glow — works on its own, and depth reads through light, not interface.

**Acceptance Criteria:**

**Given** every lit Cabinet, **Then** attract glow halos and marquee light fall off through a faint dust-haze; distant machines dim toward Room Black but never read dead (UX-DR17)
**And** glow gets authored spill around occluder edges — bleed, floor sheens, ceiling bounce-cones — so the proximity gradient stays visible through the blind spots where sound is occluded (DESIGN · Elevation & Depth; the sound/sight sharing is asymmetric for light, by design)
**And** with master audio muted, a Visitor can still walk the pull ladder (glow → Patron drama) — rungs 2 and 3 survive without hearing (UX-DR21 precondition)
**And** no zone hue is ever painted as UI chrome or wayfinding; all color in the room is light-from-a-machine (UX-DR1)
**And** flash discipline holds at authoring time: no authored element flashes >3/sec (the L2 flashes-rate probe machine-checks it in Story 3.7) (NFR-9)

### Story 2.4: The Settings page — comfort presets on at first visit

As a Visitor with vestibular, hearing, or motion sensitivities,
I want a plain, honest Settings page — reachable from the site page and by walking out the front door — with the comfort preset already ON,
So that the visit adapts to me without the room ever breaking character.

**Acceptance Criteria:**

**Given** the Settings page, **Then** it is outside-fiction, workbench-voice, deliberately not era-styled: single column, `ui-*` tokens only; no other design token crosses the fiction boundary (UX-DR14)
**And** M1-scope rows work: look sensitivity · master volume · focus-mix strength · comfort preset (off/low/full) · FOV · optional vignette · "calm cabinets" attract-tempo tier (cabinets keep moving and glowing — tempo only; the liveness law survives) · input remap (WASD/E) + look-source (mouse-look / drag-look / arrow-key look) · reset to defaults (UX-DR14, UX-DR18)
**And** "banter volume/mute" and subtitle rows are NOT shown yet — they arrive with banter in Epic 3 (no UI for features that don't exist)
**And** the comfort preset is ON at first visit, seeded by OS `prefers-reduced-motion`; baselines (walk 1.4 m/s, bob ±0.04m) are the tokens it tunes from (UX-DR20)
**And** choices persist per browser in localStorage and never fork a run — input mappings and presentation accommodations are device-layer only (NFR-9)
**And** the page meets WCAG 2.2 AA: 24px targets, visible focus ring ≥3:1, toggle state cued by position + shape, never color alone (UX-DR23)
**And** walking out the front door reaches the same page mid-session; re-entering costs queue position, never a forced reload (UX-DR14)

### Story 2.5: The site page and honest disclosures

As a first-time Visitor arriving by link (or a non-sighted Visitor evaluating whether this works for them),
I want a plain site page that tells the truth about what the room needs and what it doesn't claim,
So that I'm never ambushed by a half-loaded canvas, and nobody is promised an experience that hasn't been proven.

**Acceptance Criteria:**

**Given** the site page, **Then** it carries: entry, the controls list, the workbench disclosure block ("Needs a mouse and keyboard. First-person movement. Stereo sound is central. Bright moving lights. Desktop browser only. English only, v1."), the repo issue page as a top-level link, and a skip-link to Settings (UX-DR15)
**And** the 3D canvas carries an entry label for assistive tech (UX-DR22)
**And** the unsupported/underpowered-browser panel from Epic 1 lives on this page — detection before the canvas, entry never half-loads (UX-DR15)
**And** page language is plain declarative workbench voice — no era cosplay, no marketing (UX-DR15)
**And** the non-sighted-completion claim is NOT made yet — it is earned by Story 2.6's spike and then claimed or disclaimed here, verbatim per outcome (UX-DR22)

### Story 2.6: The M1 walk — SM-1 in both variants, honestly measured

As the project (the builder's release gate),
I want the M1 human walk executed with the real accessibility participants and the non-sighted spike,
So that "the first minute is the product" is proven — not assumed — and the M1 milestone is real.

**Acceptance Criteria:**

**Given** a fresh visitor who is not the builder, **when** the SM-1 rung-1 variant runs (normal audio), **Then** they locate and sit down at a playing machine by ear alone within 60s of first-person control — the clock from the first tick of control, not page load (SM-1, SPEC Success signal)
**And** the rung-2 variant (master audio muted) also reaches a playable cabinet within 60s using attract graphics + Patron body drama alone — with a Deaf/HoH tester as a mandatory participant; failing either variant is a release blocker at the walk (UX-DR21, NFR-9)
**And** a color-blind check passes: every zone reads from fixtures/geometry at 6m with hue removed (UX-DR24)
**And** the non-sighted spike runs (sound-only, eyes-closed attempt at UJ-1): outcome recorded and mirrored honestly on the site page either way — claim on pass, explicit disclaimer on fail (UX-DR22)
**And** the vestibular test (5-minute continuous walk, symptom report) tunes the comfort baselines (UX-DR20)
**And** the random-frame posture is spot-checked against the placed Cabinet — no Dead Machine in sampled frames (FR-5)
**And** SM-4 ("feels like the memory") is recorded as the builder's judgment — never a pass/fail gate, always the tie-breaker (SM-4)

## Epic 3: The Arcade Grows Itself — Pipeline, Proof, and Repair *(M2)*

A second Game goes spec→registered end-to-end — zero hand-placement, zero Core edits (SM-2) — gated by the four-layer verification gate; every run is kernel-recorded, replayable headlessly and in-room, and reportable via the claim-check fixture + `/api/report`. The M2 numeric thresholds land here — M2 acceptance is incomplete without them. The public deployment posture ships with this epic.

### Story 3.1: The Game-build contract, finalized — harness, Manifest schema, L0 rules

As a Game author (human or local LLM),
I want the contract seam complete — schema-valid Manifests, declared control slots, and the full harness the kernel and CI both use — with L0 rules mechanical,
So that every future Game hangs off one uniform standard instead of bespoke integration work.

**Acceptance Criteria:**

**Given** the Manifest schema (`ci/` + `tools/`), **Then** required fields validate: `id` (kebab = dir name), `title`, `originalYear`, `attribution`, `cabinetType` (stand-up|sit-down|pinball), `seed`, `busy`, `controls`, `scoreHigherIsBetter`, `rulesText`, `buildRef`; optional `presentationOnly` (AD-12)
**And** the control vocabulary v1 is schema-pinned with a versioned `controls.vocab`: `axis` = number ∈ [-1,1]; `button` = `{down, pressed}`; `aim` = `{dx,dy}` — additive forever, never retyping existing slots (AD-7)
**And** `core/contract/` completes the calling protocol: per-tick `tick(dt, input)` with constant dt = 1/60 tick units, then `events()` pull; `attract()`/`autoplay(seed)` as one-shot kernel-initiated mode switches; the supervisor wraps every call site (AD-8)
**And** the sim's tick input carries exactly one field — `controls` — nothing else is injected (AD-16)
**And** L0 lint is complete and runs locally: per-half import bans, WebAudio/`localStorage`/window-listener bans, no `Math.random`/`Date.now`/`performance.now`, no engine-variable transcendentals in sim, game-defined `stateHash` is red, score-service reads from the sim half are red, undeclared/one-off control slots are schema-red — the `docs/game-authoring.md §8` pre-flight checklist is the test list
**And** the contract is wrappable around heterogeneous existing assets (proven by a wrapper spike over a foreign-style module), not only baked into new games (AD-2 — Epic 4 depends on this)

### Story 3.2: The gate goes deterministic — L0/L1 scripts, contract-test skill, CI cadence

As an owner whose budget is local-LLM tokens,
I want a deterministic, zero-token CI that runs L0 contract conformance and L1 headless checks per story, driven by a contract-test skill,
So that "local LLMs build, CI verifies, the human judges feel" is machinery — and reruns cost nothing.

**Acceptance Criteria:**

**Given** `ci/` scripts run against a game, **Then** L0 covers lint + Manifest schema, and failure means the game cannot be placed (FR-17)
**And** L1 runs headless in Node, no browser, in seconds: attract liveness (stateHash advances each cycle); seeded `autoplay(seed)` runs to a real end state emitting canonical `gameEnded` or `roundBreak` before terminating; determinism (same seed → same stateHash, twice); sealed-build check = static scan + no-network sandbox proving zero outbound network/model calls, with allowed exceptions machine-enumerated at build time (the future report POST pre-enumerated as the standing exception) (FR-17, AD-8, AD-18)
**And** the contract-test skill generates and runs a game's L0–L1 suite from the contract — a thin orchestrator over `ci/` scripts; skills contain no gate logic
**And** GitHub Actions runs per-push L0/L1 for the touched game + a build; actions pinned to commit SHAs; zero LLM tokens anywhere (AD-20)
**And** the Core→games dependency check runs in CI (AD-1)
- DW-12: core/main.ts glue has no executed test host: addSystem takeView wiring, device listeners, silent-denial path pinned only by source-text and dev-serve text asserts (ledger; routed by burndown 2026-11-25)
- DW-15: main.ts real-THREE adapter executed coverage — same browser-harness tier as DW-12 (ledger; routed by burndown 2026-11-25)

### Story 3.3: The ledger and Registration — a Game joins by Manifest alone

As an owner (the builder),
I want an append-only registration ledger and a Registration skill that commits a Manifest end-to-end — plus a Metadata skill that collects the Manifest honestly — refusing to run on a red gate,
So that adding a machine is one supervised pipeline act, never a hand-edit, and the room's history is tamper-detectable.

**Acceptance Criteria:**

**Given** `arcade-ledger.json` at the repo root, **Then** it is STRICTLY append-only: rows `{gameId, seq, revision, manifestRef (manifest content hash), op ∈ registered|refurbished|removed}`; highest revision wins; `seed` lives only in the Manifest (AD-9)
**And** `tools/` validates the ledger at every build: monotonic rows, hash match (drift/tamper detectable), one winner per id
**And** the Registration skill commits a Manifest end-to-end (validate → gate check → ledger append) and refuses to proceed on a red gate — gate layers present at the time; L2 joins in Story 3.7 (FR-8, FR-17)
**And** the Metadata skill collects the Manifest's metadata (name, originalYear, attribution, cabinet type, seed…); Manifests are written by the skill, never by hand — including removals (AD-12)
**And** the build's registry + placements consume the winning revision per id (AD-11) — the room's presence is a function of the ledger, not git order (AD-9)
**And** adding a Game changes zero Arcade Core source files — the CI dependency check proves it (FR-8)

### Story 3.4: The Layout System — placement is a pure build-time function

As an owner,
I want a deterministic placement function — back→front, alternating left/right, reclaimed slots indistinguishable from unfilled, aisle-lint refusal, "room full" refusal — computed from (ledger + slot config) at build time,
So that the newest machine always lands beside the unfilled stretch, the same history always reproduces the same room, and I never hand-place anything (SM-2).

**Acceptance Criteria:**

**Given** the ledger + `core/room/` Wall Slot config (with revision id recorded alongside), **Then** placement is a pure function producing identical layouts for identical inputs (FR-10, AD-10, CAP-10)
**And** the fill scan takes the first unfilled-or-reclaimed slot back→front, alternating L/R wall; a slot returned by `removed` is indistinguishable from an unfilled one; when one wall exhausts, that side of the alternation is skipped (`room-layout.md §Growth grammar`)
**And** if no remaining deterministic placement passes the ≥1.20m aisle lint, Registration refuses — the room never enters lint-red; an empty slot pool yields a deterministic "room full" L0 refusal (room growth is its own future epic)
**And** the Zone-bound path exists: `presentationOnly` pinball Manifests bind to pre-declared Pinball Corner Zone slots, exempt from fill but still deterministic (used in Epic 4)
**And** machines never move: the function never rearranges existing placements (FR-10, FR-16's "never move")

### Story 3.5: Instruction Cards from the Manifest — and the character lint

As a Visitor,
I want a paper Instruction Card behind the coin door carrying that machine's rules and model attribution, with nothing attribution-shaped anywhere else,
So that authorship is found, never announced — found-never-announced becomes machine-checked.

**Acceptance Criteria:**

**Given** a registered Game, **Then** its Instruction Card is generated at build time from Manifest attribution + `rulesText`, rendered in Paper Card stock behind the coin door, honoring the print budget (one rule per line, capped length) (FR-9, AD-24, UX-DR7)
**And** marquee surfaces still show title only; attribution exists nowhere else except Hall of Models nameplates (the museum exception, Epic 4) (FR-9)
**And** every text surface in the room declares a kind on the lint whitelist (marquee | instruction-card | nameplate | room-sign); the Welcome Flyer is whitelisted (AD-24)
**And** L2 character lint fails any undeclared surface, off-whitelist attribution ("AI-generated"/model-name markers outside cards/nameplates), or non-diegetic UI marker (NFR-8, UX-DR19)
**And** generated card text holds the typography floors — Archivo Narrow heading ≥20mm, Archivo body ≥12mm at 0.5m (UX-DR2)

### Story 3.6: The sit-down shell — two standard Cabinets, equipped per Manifest

As an owner,
I want the second standard shell — sit-down — modeled and present in the room, with the pipeline equipping whichever shell the Manifest declares,
So that no Game invents furniture, and the driving/cockpit class has a home before the heavy anchors arrive.

**Acceptance Criteria:**

**Given** both standard shells (stand-up from Epic 1, sit-down new), **Then** both are modeled room architecture and present in the room (FR-11)
**And** Registration equips the Cabinet by `cabinetType` from the Manifest — stand-up or sit-down — automatically (FR-11, AD-12)
**And** sit-down shells sit at Wall Slots with the same hard-corner language and support seated play via the kernel seat-transition service (sit/stand pattern)
**And** custom cabinet models remain out of v1 scope except within a Game's own epic, and must fit pre-declared slot geometry (FR-11 constraint)

### Story 3.7: The L2 room audit — whole-room proof, and the numbers that make the law enforceable

As an owner,
I want a scripted whole-room audit (dead-machine detector, screenshot proxy + framerate floor, Patron causality probe, character lint, aisle-nav lint, flashes probe) run by a health-check skill — and every deferred numeric threshold finally SET,
So that new work surfaces old regressions, the acceptance laws stop being prose, and the pre-Registration gate is complete (M2 acceptance is impossible without this).

**Acceptance Criteria:**

**Given** the health-check skill (thin orchestrator), **when** run, **Then** it executes L2 browser-automation audits against ALL placed Cabinets in the current room: dead-machine detector (stateHash-delta per attract cycle, every cabinet), screenshot-test proxy (sampled frame differs from prior) + framerate floor, Patron causality probe (injected sim event → reaction within the reaction window), character lint (Story 3.5), aisle-nav lint (scripted walker passes every aisle and slot approach), flashes-rate probe (≤3/sec per lit surface AND aggregate across simultaneously visible lit surfaces) (FR-17, CAP-12)
**And** the numeric thresholds are set, in one config, as part of this story: framerate floor (SM-C2, NFR-12 — the screenshot proxy is judged at playable framerate, never traded for a rendered poster), Patron reaction window, audio channel budget (distance-cull/nearest-N), seated focus-mix duck levels, occlusion hysteresis dead-band + dwell, fault-stall N cycles, wake-set near radius / frustum margin / idle-pulse cadence, recording byte budget + periodic-hash cadence (AD-27, CAP-3/7/18) — with these set, the no-dead-machines law becomes CI-enforceable
**And** the Registration skill's pre-Registration gate now runs L0–L2 against the current room; red means refusal (FR-17)
**And** CI gains the scheduled full-room regression workflow (L1–L2) (AD-20 cadence)
**And** the L3 human-walk seat is documented for each law: SM-1 both variants and SM-4 have named seats there (AD-8 L3)

### Story 3.8: Lifecycle — refurbish and remove, never move

As an owner,
I want to refurbish a machine (new build, same id, same slot) or remove it (Manifest removal → the Cabinet leaves at a run boundary, the slot returns to the pool) — both through the Registration skill only,
So that the wall stays honest as machines improve or leave, scores survive, and relocation stays out.

**Acceptance Criteria:**

**Given** a registered Game, **when** the Registration skill commits a refurbish (new build, same stable `id`), **Then** ledger `op=refurbished` appends, slot and marquee stay, and Personal Bests keep working — keyed on the stable id (FR-16, AD-9)
**And** if the refurbishment changes score scale or `scoreHigherIsBetter`, pre-revision bests are marked legacy and ranking compares same-revision scores only (CAP-11)
**When** the skill commits a removal (`op=removed`), **Then** it takes effect at a run boundary: a seated Visitor finishes (recording finalizes — full sealing lands in Story 3.11), queued Patrons are released, Personal Bests survive, and the freed slot is indistinguishable to the fill function (FR-16, CAP-11)
**And** removal/refurbish require a Manifest-level operation only — zero Core edits (FR-16, FR-8)
**And** relocation is absent: no code path moves a placed Cabinet (FR-16 out-of-scope)

### Story 3.9: Game #2 end-to-end — the pipeline proves itself (SM-2) — and the room gains voices

As an owner,
I want the pipeline-init skill to start Game #2's BMad cycle (research → spec → epics stamped with contract + gate criteria), the Game to build with local LLMs, and the Registration skill to place it live, credited, with a Patron and banter at it,
So that SM-2 is proven — spec→registered with zero Core edits and zero hand-placement — and the growing wall becomes visible growth.

**Acceptance Criteria:**

**Given** the pipeline-init skill, **when** invoked for a Game chosen from the `cabinet-inventory.md` pool (owner's taste), **Then** it produces the Game's research, spec, per-game PRD material, and epics document — stamping the Game-build contract and gate criteria into the epic's acceptance from day one; story work then follows the normal BMad cycle in a separate epic run
**And** the completed Game passes full pre-Registration L0–L2 and registers; the Cabinet appears Live on the unfilled stretch adjacent to the newest filled slot, marquee lit, Instruction Card crediting the model (UJ-3)
**And** SM-2 evidence is recorded: zero Arcade Core file edits, zero manual placement, identical-layout reproducibility from (ledger + slot-config revision) (CAP-10)
**And** with ≥2 busy Cabinets, the Patron scheduler runs multiple Patrons: Patron→Patron handoff is visible end-to-end (waiting Patron sits, departing one lifts off), and Patrons trade authored banter — fixed dialogue trees triggered by events, never generated (FR-4 completion)
**And** banter gets its diegetic subtitle surface: cabinet-side room-sign signs when enabled (dwell ≥ read-time, re-approach re-displays, cap ≥60mm), and the Settings page gains "banter volume/mute" + subtitle rows (UX-DR9, UX-DR14)
**And** busy-machine drama remains legible from across the room with no zoom and no UI (FR-4)

### Story 3.10: Moon Patrol, reimplemented to the standard

As an owner,
I want Moon Patrol rebuilt to the Game-build contract under the same stable id — a refurbish through the pipeline — replacing the provisional wrap,
So that the foundation is uniform: the very first machine obeys the same standard as every future one, with no visible change to its cabinet experience.

**Acceptance Criteria:**

**Given** the contract-complete reimplementation in `games/moon-patrol/sim|presentation`, **when** it registers as a refurbish (`op=refurbished`, same id), **Then** the Cabinet keeps its slot, marquee, and Personal Best continuity (FR-6, FR-16)
**And** the reimplementation passes full L0–L2 like any Game (L0 pre-flight checklist green) (FR-17)
**And** the room-side experience is unchanged: same attract identity, same busy Patron behavior, same playability (FR-6 "no visible change")
**And** the old provisional wrap code path is retired — the wrap is not the resting state (`brownfield.md`)
**And** score continuity is demonstrated: a pre-reimplementation Personal Best still shows (legacy rules apply only if score scale/direction changed) (CAP-11)

### Story 3.11: Run Recording — the kernel captures every run

As a builder (future bug-fixing me) and a Visitor (future reporter),
I want the kernel to record every game session — mine or a Patron's — as seed + tick-indexed inputs + periodic/final state hashes, with no PII,
So that any run is reproducible evidence: a fixed recording of a deterministic room, diagnosable without a witness.

**Acceptance Criteria:**

**Given** every kernel-driven game instance (Visitor, Patron, attract — replay instances excluded per Story 3.12), **Then** the recorder writes `{gameId, bundleRef (served bundle's git snapshot — distinct from Manifest buildRef), resolved seed, tick-indexed inputChanges, periodic + final stateHash}` (FR-18, AD-26)
**And** a sim fault mid-run seals the recording at the last good tick with `{tick, errorId, lastGoodHash}`; kernel fallback frames are never recorded (AD-26, CAP-7)
**And** storage is a ring under `arcade.rec.*`: eviction never touches identity or Personal-Best keys, and the most recent recording of each still-placed Cabinet is never evicted (AD-26)
**And** no PII appears in a recording — not even the visitor id (AD-16, NFR-5)
**And** recording writes are batched outside the tick budget; byte budget and periodic-hash cadence use the Story 3.7 config (AD-26)
**And** games never log, trace, or replay their own runs — the kernel owns recording; the L0 `localStorage` ban keeps it that way (AD-26)

### Story 3.12: Replay — headless and in-room, on the same harness

As a builder and a Visitor,
I want any Run Recording to replay bit-identically — through `tools/replay` in CI/terminal, and as playback on the cabinet's own screen in the room,
So that a reported fault reproduces exactly ("evidence, not an anecdote" — Flow 4), and I can rewatch a run where it happened.

**Acceptance Criteria:**

**Given** a recording, **when** `tools/replay <recording>` runs headless through the `core/contract/` harness, **Then** the same seed + inputs reproduce identical stateHashes, and a fault-sealed recording re-fires the same fault marker at the same tick (FR-18, AD-26)
**And** replay uses the recorded seed verbatim — never re-derives (AD-4, AD-26)
**And** in-room replay is a kernel instance kind (`replay`) mutually exclusive with that Cabinet's attract/autoplay/play: the incumbent instance's recording seals first, the replay instance counts for liveness (its stateHash advances — never a Dead Machine), plays to the sealed end (final hash or fault marker), then the Cabinet returns to attract (CAP-13)
**And** playback is entered only by a Visitor; the scheduler never initiates it; a takeover at a break seals the replay recording and opens the play recording — the Cabinet's latest is always what gets reported (AD-26)
**And** replays are never captured as new Run Recordings (CAP-13)
**And** periodic hashes localize divergence — `tools/replay` output pinpoints the first differing cycle (AD-26)
- DW-7: cross-engine determinism (browser kernel === Node CI stateHashes) never exercised on two engines; construction property only — the replay harness must prove both engines agree (ledger; routed by burndown 2026-11-25)

### Story 3.13: The claim-check and the report endpoint — a bad run is provable

As a Visitor (Dana, Flow 4),
I want a small paper card at a misbehaving cabinet offering its current recording — download it, or submit it with an optional note — and the arcade records it server-side,
So that the one thing the room ever sends outward is proof that something needs fixing.

**Acceptance Criteria:**

**Given** a placed Cabinet, **Then** a diegetic claim-check fixture (AD-25-owned; instruction-card stock; "something's wrong with this machine" as room-sign) offers the Cabinet's current recording as downloadable JSON AND a submit action with an optional free-text note — the note is untrusted and never rendered in the room (FR-18, UX-DR11)
**And** submit POSTs to the same-origin `/api/report`: nginx proxies to `services/report-ingest/` — thin Node stdlib (`node:http`), no auth, size-capped, rate-limited, JSON stored on droplet disk; reports are recorded server-side; the ingest validates bundleRef/revision against known ledger revisions and tags unknown/stale ones rather than silently accepting (FR-18, AD-26, CAP-13)
**And** the sealed-build check names this POST as the bundle's ONLY standing outbound exception; everything else stays silent — proven by the L1 sealed check and re-verified against the final bundle (AD-18, AD-20)
**And** submit failure is staged diegetically: "Couldn't send. Take the card with you." (download fallback); the room itself needs no network (UX-DR11)
**And** the repo's new-issue page remains available as a top-level navigation (FR-18)
**And** a full loop is demonstrated in CI: fault → recording → submit → pull → `tools/replay` reproduces at the same tick (Flow 4)

### Story 3.14: Liveness tiers — the room scales while the law holds

As a Visitor (future me, walking a 50-cabinet room),
I want distant machines to sleep at an idle-pulse and wake seamlessly as I approach or look at them,
So that the room works far beyond v1 density without any visible cabinet ever reading dead.

**Acceptance Criteria:**

**Given** every tick, **Then** the awake set recomputes as: visitor-occupied ∪ near-radius ∪ frustum+margin (visible ⇒ awake); everything else idle-pulses at a fixed shared cadence (one tick per pulse) (AD-27, NFR-3)
**And** wake/sleep is a pure function of tick state (camera, positions, occupancy) — never wall-clock, never view-count heuristics — so a replay reproduces the identical wake schedule and stateHashes, scoped per CAP-18 (recordings carry no camera/occupancy data)
**And** audible ⇒ awake: the Audio Manager's distance-cull + nearest-N budget operates inside the awake set; a sleeping machine makes no sound, so proximity drives the mix for free (AD-7/AD-27)
**And** no sleeping or idle-pulsing machine ever reads dead to a Visitor; wake-on-approach is seamless (EXPERIENCE · State Patterns: Distant machines)
**And** headless L1/L2 runs disable culling entirely — audit mode: CI always sees the unculled full room (AD-27)
**And** the thresholds from Story 3.7 (near radius, frustum margin, pulse cadence, audio N) are consumed from the single global config
- DW-35: renderer.render throws AFTER the first successful frame are uncontained (no supervisor receipt covers the post-first-frame draw path) — the liveness/containment legs must close it (ledger; routed by harvest at story 1.9 dev_complete 2026-11-25)

### Story 3.15: The public posture — one sealed bundle to one droplet

As an owner (single maintainer) and the public,
I want the merge-to-main pipeline to build one hashed static bundle, re-prove the sealed-build property against the final artifact, and rsync it to a hardened nginx droplet,
So that the site is a real public website — secure, anonymous, boring to maintain — and the droplet is disposable because the repo is the state.

**Acceptance Criteria:**

**Given** merge to main, **when** CI builds, **Then** it produces one hashed static bundle (source + ledger + manifests in → bundle out, AD-11) and re-runs the sealed-build check against the final bundle before deploy (AD-20, AD-18)
**And** the droplet runs nginx ≥1.30.7 (upstream repo install, not distro backports) + certbot: HTTPS-only, strict CSP, single origin, zero external scripts/styles/fonts, rate limiting; nginx proxies `/api/report` to the ingest service (AD-20, NFR-4)
**And** the same artifact serves dev → CI → prod; deploy is rsync; the droplet is disposable — repo rebuild reproduces everything (NFR-6)
**And** public launch remains gated on the marquee name decision (OQ-9) — infrastructure is ready, the name is launch-prep work (Deferred list)
**And** the scheduled full-room regression from Story 3.7 keeps running against main

## Epic 4: The Hall of Models — A Museum Row *(M3)*

The ~15 LLM-built pinball tables from `C:/git/pinball` enter the room as a presentation row in the Pinball Corner — a museum of what fifteen local models each built from one shared prompt. The M3 batching exception applies (`game-factory.md`): one epic for all tables, because they share one wrapper harness; acceptance is "all vendored sim halves pass L1 liveness + the L2 audit as one batch." Vendoring fifteen foreign tables into the monorepo is real work — this epic is where AD-2's "the contract is wrappable around heterogeneous existing assets" gets its full proof at scale.

### Story 4.1: Vendor the table set and wrap it — the contract wraps foreign assets at scale

As an owner,
I want every in-scope Hall of Models table from `C:/git/pinball` vendored into `games/<game-id>/` behind one shared `presentationOnly` wrapper harness,
So that the museum row is real code in the monorepo (AD-13) and the contract proves it wraps heterogeneous existing assets, not just newly authored Games.

**Acceptance Criteria:**

**Given** `C:/git/pinball` (one shared `prompt.md`, ~15 local LLMs, one folder per model), **Then** every in-scope table — the `cabinet-inventory.md` roster (Dragon's Keep, Quantum Core: Meltdown, Space Station, Storm Chaser, Nova Strike, Midnight Heist, Ragnarök, Neon Quest, and the rest per the repo folder list) — is vendored into `games/<game-id>/` as a two-part plugin (brownfield contract)
**And** ONE shared wrapper harness hosts the contract hooks (`attract()`, `events()`, `tick(dt, input)` + `snapshot()`, wrapper-computed `stateHash()`) — not fifteen bespoke integrations
**And** each table gets a schema-valid Manifest marked `presentationOnly`: per-table `attribution` = the model that built it (from the repo folder names); `autoplay()` may be omitted, but the sim half is the **real per-tick model of everything the presentation shows** — a non-ticking presentation table is a Dead Machine by law (AD-8)
**And** each table's heterogeneous input layer is discarded at the seam — the vendored sim reads only declared control slots (nothing is played in M3; presentation only)
**And** vendored code is adapted until every table passes L0 lint and Manifest schema — vendoring never exempts a table from the rules

### Story 4.2: Batch registration and the Pinball Corner — the roster is a ledger fact

As an owner,
I want the tables registered through the Registration skill as one batch, bound to pre-declared Pinball Corner Zone slots,
So that the roster is a ledger fact, the row physically stands in the room, and nothing about it was hand-placed.

**Acceptance Criteria:**

**Given** the M3 batching exception, **when** the batch registers, **Then** every Hall-of-Models row in `arcade-ledger.json` has a vendored sim half, and acceptance is ALL of them passing L1 liveness + the L2 audit **as one batch** (game-factory, brownfield)
**And** `presentationOnly` pinball Manifests bind via the Zone-bound path from Story 3.4 to pre-declared Pinball Corner Zone slots — exempt from back→front fill, still fully deterministic (AD-10)
**And** the pinball cabinet shell exists as a standard room Cabinet (per FR-11's shell language) equipped automatically from `cabinetType: pinball`
**And** the corner's geometry passes the ≥1.20m aisle lint; the room's "full" capacity math accounts for zone-bound slots
**And** EM → DMD-era → modern placement flavor in the corner is decorative — explicitly not required in v1 (`cabinet-inventory.md`)
**And** the batch registration changes zero Arcade Core source files (FR-8)

### Story 4.3: Nameplates and the shared prompt — found, never announced, museum-style

As a Visitor,
I want each table to carry a brass Nameplate naming the model that built it, and the shared prompt they all worked from to exist as a findable artifact,
So that the museum's meaning — fifteen local models, one prompt — is discoverable in-world without ever being announced.

**Acceptance Criteria:**

**Given** a registered Hall table, **Then** a brass Nameplate is generated at build time from Manifest attribution — brass lettering on Room Black, Hall of Models rows only (UX-DR8) — on the `nameplate` text-surface whitelist (AD-24), the sanctioned museum exception to attribution-lives-only-on-cards (FR-9)
**And** the shared `prompt.md` from `C:/git/pinball` is present as a findable in-room paper artifact near the row (paper-stock surface, whitelisted as `instruction-card`-class), readable in the Spectral voice (UX-DR5)
**And** marquee surfaces on these cabinets still show title only — the nameplate is the sole attribution outside cards
**And** the character lint from Story 3.5 stays green across the whole corner: every surface declared, nothing attribution-shaped appearing elsewhere in the room (NFR-8)

### Story 4.4: The dead-machine law holds in the museum

As a Visitor,
I want every table in the row visibly alive — playfield lit, backglass running, sound present as I pass — under the same audit as playable machines,
So that the museum row reads as machines running, not corpses on display.

**Acceptance Criteria:**

**Given** `presentationOnly` tables, **Then** L1 enforces attract liveness (stateHash advances) + determinism only — no seeded `autoplay()` end-state requirement where `autoplay()` is omitted (AD-8)
**And** the L2 dead-machine detector, screenshot proxy, and flashes-rate probe run against every corner cabinet in the batch audit (Story 3.7 machinery, consumed here)
**And** liveness tiers apply to the corner: distant tables idle-pulse, wake seamlessly on approach/look, and audible ⇒ awake governs their sound (AD-27)
**And** the Patron scheduler never queues or seats Patrons at `presentationOnly` cabinets — the row is watched, not played (FR-14)
**And** the corner participates in the scheduled full-room regression (Story 3.15)

## Epic 5: The Room Tells the Truth — The Open Workshop *(M4)*

The Workshop stops being a lit empty corner and becomes the room's honest report on itself: this week's real commits on a monitor, BMad plans as diegetic paper, and a workbench staging each machine at its real build lifecycle. A repo change produces a room change within one build — the arcade's transparency is rendered in-world, allowlist-scoped to build-visible repo truth, checked at L2. This closes the card↔drawer pairing promised on every Instruction Card (UX-DR7).

### Story 5.1: The Workshop monitor — repo truth baked into the bundle

As a returning Visitor,
I want the Workshop monitor showing the arcade's real recent commit log, generated from the repository at build time,
So that what I see in the room is this week's actual work — a repo change becomes a room change within one build.

**Acceptance Criteria:**

**Given** the build, **Then** it generates the Workshop repo snapshot (AD-21) — real commit log from the repo at build time — and bakes it into the bundle as authored deterministic data (NFR-10)
**And** the snapshot is allowlist-scoped to build-visible repo truth only: `core/`, `games/`, `ci/`, `tools/`, the ledger, allowlisted planning docs (CAP-14, FR-12) — anything outside the allowlist is absent from the artifact
**And** the Workshop monitor (a diegetic screen in fiction) renders the snapshot: recent commits, honest and plain — no runtime git access, no runtime fetch; the sealed-build property is untouched (AD-18)
**And** rebuilding after any repo change visibly changes the monitor within that one build — proven by a fixture commit in CI
**And** the monitor surface declares its kind on the character-lint whitelist (room-sign class) — fiction-pure, no non-diegetic chrome (NFR-8)

### Story 5.2: The plan drawer — BMad plans as diegetic paper, paired with cards

As a returning Visitor,
I want the Workshop's plan drawer to hold this room's BMad plans as paper — unbuilt ones legibly staged as unbuilt — with every installed machine's Instruction Card having its matching plan here,
So that the room's future is visible as plainly as its past, and no machine exists that wasn't planned.

**Acceptance Criteria:**

**Given** allowlisted planning docs (per-game specs/epics in `_bmad-output/` as designated allowlist entries), **Then** they render in the plan drawer as diegetic paper in the room's paper-stock voice, readable in the Spectral voice (UX-DR5)
**And** plans for unbuilt machines are staged legibly **as unbuilt** — the fiction never presents a plan as a promise of a machine that exists (FR-12)
**And** card↔drawer pairing: every registered Cabinet's Instruction Card has a corresponding plan-drawer entry, paired by the stable game id (UX-DR7, FR-12)
**And** a pairing lint runs at build/L2: a registered Cabinet with no drawer entry, or a drawer entry claiming a machine that never registered as built, is red
**And** the drawer content is generated from the same build snapshot as the monitor — hand-placing paper is not a path (NFR-10)

### Story 5.3: The workbench — the build lifecycle staged honestly

As a Visitor,
I want the Workshop workbench to stage each machine exactly where its real build lifecycle stands — chalk outline, bare skeleton, TESTED tag, or stenciled crate —
So that the room's honesty is physical: green bench for green tests, and a red gate shown as honest silence, never fake progress.

**Acceptance Criteria:**

**Given** a machine's real lifecycle state at build time, **Then** the workbench staging matches it exactly (UX-DR12): **chalk outline** (plan-only, no source yet) → **bare cabinet skeleton + work light** (source present, gate red — honest silence) → **art-on with TESTED tag + first attract playing on the bench** (tests green, pre-Registration) → **stenciled crate / installed** (registered)
**And** the stage is computed from gate + ledger records the build already has (Story 3.2/3.3 machinery) — never hand-set, never optimistic; a machine with a red gate never shows a green bench (FR-12, "green bench for green tests")
**And** the first attract on the bench (art-on stage) is the real `attract()` from the real sim half — the bench demonstrates the actual machine, not a mock
**And** all staging uses worn-paper honest-material treatment — never gamey props (UX-DR12)
**And** unbuilt plans staged at the bench remain legibly unbuilt (chalk outline ≠ construction-in-progress pretending to be built)
**And** the bench staging participates in the L2 audit's screenshot proxy at each stage (a staged skeleton reads as a skeleton, alive in its own way)

### Story 5.4: The Workshop honesty audit — allowlist and pairing machine-checked

As an owner,
I want L2 to check the Workshop's honesty properties — allowlist exclusions, card↔drawer completeness, staging-vs-gate agreement, one-build freshness —
So that "the room tells the truth" is an enforced law, not a vibe, and a leak or a lie turns the gate red.

**Acceptance Criteria:**

**Given** the L2 room audit extended with Workshop checks (FR-12, "exclusions checked at L2"), **Then** an allowlist-canary check plants non-allowlisted content in the fixture repo and fails the audit if any of it appears in the room (CAP-14)
**And** the pairing lint and staging-vs-actual-gate-state checks run in the audit: staging that disagrees with the current gate/ledger record is red
**And** the one-build freshness fixture (commit → monitor change) runs in the scheduled full-room regression (Story 3.7/3.15 cadence)
**And** the Workshop stays fiction-pure: every text surface — monitor, plan papers, crate stencils, TESTED tag — declares its whitelist kind; character lint passes across the zone (NFR-8, AD-24)
**And** zone fixture completion is audited: the Workshop now reads as an occupied zone at 6m from geometry alone, closing its part of UX-DR24

## Epic 6: Pay the Arcade in Character — The Snack Bar *(M5)*

The Snack Bar becomes the donation surface without ever breaking fiction: a warm-wood counter with an attendant who speaks fixed authored lines, a tip jar whose coin clink enters the room's soundscape, "ordering a coffee" that **is** the Buy-Me-a-Coffee top-level navigation, and crypto links — every one staged honestly as an **offer that leaves the room**, never a confirmation. Per resolved OQ-10, donations are user-gesture top-level navigations to machine-enumerated whitelist destinations; the bundle itself still makes zero outbound calls, and completion belongs to the provider, outside the fiction — forever in v1.

### Story 6.1: The Snack Bar stands — counter, fixtures, and the attendant

As a Visitor,
I want the Snack Bar to read as a real counter with an attendant I can talk to,
So that the room's warm corner is a place I walk up to, not a sign with a link on it.

**Acceptance Criteria:**

**Given** the Snack Bar front-right Zone (fixed since Story 1.3), **Then** its fixtures — counter and tip jar in warm wood + glass, catch-light orange (UX-DR13, UX-DR24 zone identity) — are built as `core/room` interaction objects (AD-25), interactable at the counter like other room furniture
**And** the attendant figure exists via the kernel's figure-request service, speaking only **fixed authored dialogue lines** — a dialogue tree, never generated text (UX-DR13, same discipline as banter)
**And** the attendant's lines are in-character about the arcade, the room, and the offer of a coffee — no donation-status chatter, no marketing (NFR-8)
**And** the zone now reads as occupied at 6m from geometry alone (UX-DR24 closure for Snack Bar)
**And** the attendant and fixtures obey liveness tiers and the audio budget like everything else (AD-27, AD-7)

### Story 6.2: The tip jar — a coin into the mix

As a Visitor,
I want to drop a coin into the tip jar and hear it clink into the room's sound,
So that giving is a physical, audible act in the fiction — and the only honest thing a purely-local gesture can be.

**Acceptance Criteria:**

**Given** the tip jar fixture, **when** a Visitor performs the diegetic coin-drop interaction, **Then** the clink enters the room's soundscape through the Audio Manager — spatialized at the counter, obeying the channel budget and focus mix (UX-DR13, AD-7)
**And** the gesture is fully local: zero network calls, nothing sent anywhere — the jar is a jar (sealed-build untouched, AD-18)
**And** the staging is honest: the coin is a room act of support, presented as such — no receipt, no counter of "your donation," no claimed downstream effect (AD-22 offer-not-confirmed)
**And** the clink plays exactly once per gesture and never loops or spam-triggers (input debouncing at the fixture, kernel-governed)
**And** the flashes-rate probe and character lint pass across the zone

### Story 6.3: Ordering a coffee — the navigation IS the donation

As a Visitor,
I want "ordering a coffee" at the counter to take me to the real Buy-Me-a-Coffee page as a top-level navigation,
So that the donation works in the real world without a single web-form popup inside the fiction.

**Acceptance Criteria:**

**Given** the counter interaction "order a coffee," **when** the Visitor takes it, **Then** the browser performs a **user-gesture top-level navigation** to the named Buy-Me-a-Coffee destination — no iframe, no popup form, no in-room checkout (FR-13, OQ-10 resolved)
**And** the destination is machine-enumerated on the build-time network whitelist alongside the report POST; the sealed-build check proves these navigations are the *only* external paths, and the L1 sealed check + L2 audit re-verify against the final bundle (AD-18, CAP-12)
**And** nothing in the room ever claims, implies, or polls for completion: the offer honestly leaves the room, and completion belongs to the provider outside the fiction — this is permanent in v1 (AD-22, CAP-15, owner decision 2026-11-20)
**And** the room survives the away-and-return per defined backgrounded-tab resume semantics: the tick and stateHash identity resume cleanly, no state jump on return (NFR-2)
**And** the navigation choice is plain and diegetic-staged: the attendant offers, the paper on the counter states where it goes — no fake "processing" theater (UX-DR13)

### Story 6.4: Crypto links and the offer-never-confirmation law, machine-checked

As a Visitor and as an owner,
I want the crypto links present in character on the counter, and the whole donation surface audited so nothing in the room can ever pretend a donation completed,
So that the honesty law "offer, never confirmation" is enforced, not hoped for.

**Acceptance Criteria:**

**Given** the counter's paper surface (whitelisted text-surface kind), **Then** the crypto links/addresses are presented in character, generated from the allowlisted config, and any link out is a top-level navigation on the same whitelisted destination list (Story 6.3 machinery)
**And** an audit rule (L2 + character lint) fails the build on **confirmation theater**: any UI, sound, or text asserting a completed/verified/received donation anywhere in the room (FR-13, CAP-15, AD-22)
**And** every donation path is enumerable from the build: tip jar (local), coffee nav (whitelisted), crypto nav (whitelisted) — an unlisted external destination is red in the sealed-build check
**And** donation config lives in one allowlisted place (destinations + addresses), never scattered in fixture code — a provider change is a config refurbish, no room redesign
**And** the Snack Bar enters the scheduled full-room regression (Story 3.15)

## Epic 7: Pinball Comes Alive *(M6)*

At least one pinball table becomes playable — human and auto-play — on an engine chosen by its own decision story (OQ-4, deferred by you until M6 opens), with two tables side by side in one frame: A playable, B the same engine in attract — at playable framerate. The corner becomes findable by ear: clacks, bells, the gong. This epic carries the heaviest open risk in the product (NFR-11: pinball physics in-browser) and deliberately front-loads it: the decision story gates everything else.

### Story 7.1: The engine decision — OQ-4 settled with evidence, not vibes

As an owner,
I want a dedicated decision story that settles the pinball engine question — packaging form, GPL obligations, cross-browser physics determinism — with a feasibility probe,
So that the riskiest bet in v1 is chosen deliberately before any table is built on it, per NFR-11's feasibility commitment.

**Acceptance Criteria:**

**Given** the OQ-4 question (SPEC §Open Questions), **Then** the story produces a recorded decision covering all three named axes: **packaging form inside the sim half** (WASM vs port vs rewrite), **GPL obligations inside a distributed sealed bundle** (if a GPL candidate is chosen — `C:/git/dragonwar` is one candidate among several, in progress), and **cross-browser physics determinism beyond same-seed-same-hash**
**And** a feasibility probe runs the candidate physics headless AND in the NFR-7 desktop browser matrix: same seed → same stateHash across engines/browsers, at a framerate above the Story 3.7 floor — probe harness built on `core/contract/`, throwaway code kept out of `core/`
**And** the probe measures the one-frame budget for two live tables (setting up Story 7.3's acceptance with real numbers)
**And** the decision record names the chosen engine AND first table (owner taste decides among candidates), and states the determinism strategy (e.g., fixed-point vs integer physics vs verified-transcendental shim) as a contract obligation on the sim half
**And** if no candidate passes feasibility: epic halts and re-plans via correct-course — v1 degrades gracefully to presentation-only pinball, and that outcome is a legitimate decision output (NFR-11 commits to feasibility exploration, not a promise)

### Story 7.2: The first playable table — pinball obeys the full contract

As a Visitor,
I want the first real pinball table to play like pinball — flippers, nudge, a real round that ends — under the same contract as every other machine,
So that "one more Game through the pipeline" is true even for the hardest Game class in the room.

**Acceptance Criteria:**

**Given** the Story 7.1 decision, **Then** the engine + first table ship as `games/<game-id>/` with the two-part split: sim half = the physics and table logic in the decided packaging form, presentation half = the table's visuals/sound — zero contract exceptions (AD-1, AD-2)
**And** controls are declared slots (vocabulary v1: e.g., two flipper `button`s, nudge `axis`) — kernel input mapping, no bespoke wiring (AD-7)
**And** rng flows only from the kernel-seeded generator inside `tick`; the deterministic-math rule holds per the 7.1 determinism strategy; engine-variable transcendentals stay lint-red in sim (docs/game-authoring rules apply to vendored/portable engine code with zero exemptions)
**And** `autoplay(seed)` plays a real round to `gameEnded`/`roundBreak` — L1 end-state and determinism checks pass; a Visitor's run emits canonical `scoreSubmitted` and Personal Bests work on the table (FR-4, FR-6 machinery)
**And** the table registers through the Registration skill (no hand-placement), gets a playable Pinball Corner Zone placement in the fixed Zone shell architecture (FR-11), and its marquee/Nameplate/Instruction Card follow the existing rules
**And** a Run Recording of a pinball session replays bit-identically through `tools/replay` — physics included (FR-18)

### Story 7.3: Two live in one frame — playable and attract, side by side

As a Visitor,
I want table A playing me (or a Patron auto-playing it) while table B beside it runs the same engine in attract — both live in one frame,
So that the corner reads as working pinball, not a screen recording, at a framerate that proves it.

**Acceptance Criteria:**

**Given** two Zone slots side by side, **when** table A is occupied (Visitor or Patron `autoplay`) and table B runs `attract()` on the same engine, **Then** both tick in the same kernel frame and both hold the framerate floor (Story 3.7 config) — the L2 screenshot proxy + framerate floor prove it in audit (FR-15)
**And** Patron causality applies: a `gameEnded`/`roundBreak` on A visibly changes Patron behavior within the reaction window (Story 3.7 probe passes on pinball too)
**And** liveness tiers hold: both tables awake while watched; distant corner idle-pulses without either reading dead (AD-27)
**And** attract on B is the real engine running a scripted/seeded attract round — not a canned animation (AD-8 liveness law)
**And** the pair passes the scheduled full-room regression with pinball in the room — SM-3 zero-dead-machines includes them (FR-15, SM-3)

### Story 7.4: The corner found by ear — pinball's audio anchors

As a Visitor with my eyes closed,
I want to find the Pinball Corner by sound alone — clacks, bells, the gong, a rumble under the table —
So that the corner earns its place in the first-minute-by-ear experience like the back wall does.

**Acceptance Criteria:**

**Given** the playable + attract tables, **Then** the sim's declared sound events drive the Audio Manager: ball clacks, bell hits, flipper snaps — spatialized at the table, occlusion and channel budget respected (AD-7)
**And** the corner's authored audio anchors from `cabinet-inventory.md` are staged: Twilight Zone gong, Addams Family "SPIKE CHILLER", Earthshaker rumble — as diegetic fixtures/sound points in the corner (they ride M6 per the inventory; full named-table epics stay future), each with its authored visual signature so the identity is findable without hearing — gong = striker arm mid-swing (UX-DR24)
**And** audible ⇒ awake governs the corner: approaching from the aisle, the corner swells per the mix ladder before it's fully in view (UX-DR25, AD-27)
**And** a seated Visitor at a table gets the focus mix — pinball's dense sound layering ducks the room correctly and never blows the channel budget (UX-DR25, AD-7; strength configurable per UX-DR14)
**And** the flashes-rate probe passes on playfield lights and strobes (pinball is the worst-case lit surface in the room)
**And** L3 human walk gains the beat: "find the pinball corner by ear" is added to the SM-1 walk script (SM-1 both variants)
