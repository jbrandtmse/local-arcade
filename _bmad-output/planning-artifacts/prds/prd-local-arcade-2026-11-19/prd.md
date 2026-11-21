---
title: "Local Arcade"
status: final
created: 2026-11-19
updated: 2026-11-20
---

# PRD: Local Arcade
*Working title — the marquee name may change.*

## 0. Document Purpose

This PRD is for the solo builder and the BMad workflow that will drive this project: it defines what the arcade must do before any game epic is opened. It is built on — not a replacement for — two existing artifacts: the accepted product brief (`_bmad-output/planning-artifacts/briefs/brief-local-arcade-2026-11-18/brief.md`) and the 2026-11-18 brainstorm session (design laws, v1 cut list M0–M6, floor plan) at `_bmad-output/brainstorming/brainstorm-local-llm-arcade-2026-11-18/`. Where this PRD departs from the brief, the change is logged in the run memlog; two material departures: the removal of the chronological room layout (§7) and the removal of the brief's "laptop + phone" criterion in favor of desktop-only scope (§4.1, §8). Vocabulary is defined in §3 and used verbatim throughout. Assumptions are tagged inline `[ASSUMPTION: ...]` and indexed in §11.

## 1. Vision

Local Arcade is a first-person, walk-in 3D arcade on the web, **open to the public**. You enter through the front door into a room of cabinets, and you find a game the way you did as a kid in the arcade era: by ear. Attract-mode sound drifts around pillars and through doorways; you turn toward it, catch the glow, and sit down and play a real, complete game. There is no menu, no grid of tiles, no "featured content" rail. The room is the interface.

Every game, cabinet, and room element is **built by local LLMs at build time and frozen into the build** — the thesis of the project is local models as *builders, not chatbots*. At runtime the arcade is fully deterministic: no runtime LLMs, ever, by design. The room is a fixed, reproducible recording of what local models can build, and it can be proved offline.

What makes this arcade different from every comparable experience found in web research (fixed-set three.js showcases, archive.org's flat 900-game library, portal aggregators like Poki): it **grows**. Each new game is developed as its own BMad epic — spec, research, design, implement — and when it passes the room's acceptance laws it *registers itself* with the Arcade Core, and the arcade's Layout System places it. The owner never hand-places a machine and never edits the core to add a game. The arcade is a living, growing record of the golden age and what local models can build — and the growth is visible in the room itself, as walls fill.

It is a passion project: one builder, local-LLM tokens as the budget, one DigitalOcean droplet. Rigor goes where it compounds — into the registration and layout mechanics, and into the acceptance laws that keep the room alive.

## 2. Target User

### 2.1 Jobs To Be Done

- **Re-experience** — the builder, who was twelve in the arcade era, wants to *be inside* the memory, not browse it.
- **Rediscovery** — encounter a game by its attract sound and light, remember what it is, and play it for real.
- **The hero moment** — finish a game at a cabinet with the room alive around you (the feeling of finishing Dragon's Lair with a crowd watching).
- **Proof-of-craft** (builder as secondary persona) — watch the arcade grow: a new machine appears, correctly placed, credited, with its workshop traces behind it. The room truthfully reflects the repo.

### 2.2 Users, Publicly

The arcade is a **public website**: anyone who reaches the URL can walk in and play — no account, no invitation, no traffic gate. Traffic volume is expected to stay modest, but the build posture is that of a real public site: secure, hardened, anonymous-friendly (see §6). The builder remains the primary persona; friends, family of that generation, and the local-LLM-curious arrive by link.

**Still not for (v1):** anonymous portal-scale traffic patterns (no accounts, no moderation, no third-party submissions — see §7), and multiplayer crowds.

### 2.3 Key User Journeys

*[Owner-confirmed 2026-11-19. The UJ-2 screenshot beat relies on native browser screenshots — no built-in capture/share feature is in scope.]*

- **UJ-1. Josh finds a game by ear, in his own arcade, with no UI.**
  - **Persona + context:** Josh, twelve in 1985 (now very much not); opens his own arcade on his laptop on a free evening.
  - **Entry state:** no account, no auth; an anonymous cookie quietly carries his scores between visits; the page loads to the front door from outside, sound already spilling out.
  - **Path:** enters, looks around; a kick-drum pattern from somewhere left of the back wall pulls him; he walks toward it, geometry occluding and reopening the sound; he catches an attract screen over a pillar; a Patron at the machine flinches at a shot — the machine is *live*.
  - **Climax:** he sits down and plays Moon Patrol for real; no prompt told him anything.
  - **Resolution:** he stands, the room continues; he drifts toward another sound.
  - **Edge case:** a machine he doesn't recognize — he reads its Instruction Card behind the coin door, which credits the model that built it; the marquee shows only the game name.

- **UJ-2. Ray visits the week a new machine appeared.**
  - **Persona + context:** Ray, a friend from that generation, sent a link.
  - **Entry state:** fresh visitor, nothing installed, desktop browser.
  - **Path:** wanders, finds the newer stretch of wall; one cabinet has fresh cardboard and a newer Instruction Card; he plays it; the Workshop door is open and shows the real recent commits.
  - **Climax:** "wait — this one didn't exist last month?" The growth is visible in the room, not announced in a changelog.
  - **Resolution:** he leaves with a screenshot; the still frame is indistinguishable from a paused video.

- **UJ-3. The builder ships Game #4 as an epic, and it installs itself.**
  - **Persona + context:** the builder on a local-LLM evening; Game #4 passes its epic's final acceptance.
  - **Entry state:** the game lives in the repo, built entirely by local LLMs through the Game Factory — kicked off by the pipeline-init skill, metadata collected, epics generated.
  - **Path:** the Registration skill commits the Manifest → the Layout System assigns it a Wall Slot → the cabinet appears in the room with Attract Mode, a Patron working the machine, and an Instruction Card crediting the model.
  - **Climax:** the builder walks up and plays it — the pipeline, not a hand-placement, put it there.
  - **Resolution:** the workshop reflects the commit; the next empty stretch of wall is obvious.

## 3. Glossary

- **Arcade Core** — the application shell: the 3D room, first-person controls, machine loading, and registration handling. Adding a Game must never require editing the Arcade Core.
- **Arcade Room** — the walk-in 3D space: front door, walls with **Wall Slots**, aisles, pillars, and fixed **Zones**.
- **Zone** — a fixed functional area of the Arcade Room with a purpose: Workshop, Snack Bar, Pinball Corner. Zones are architecture; they are not placed by the layout system.
- **Game** — a complete, playable game built by local LLMs at build time and registered into the Arcade Core. Games are separate build artifacts but run as **native in-scene modules in one runtime** — never iframes (OQ-6 resolved). One Game = one BMad epic in production.
- **Cabinet** — the in-room embodiment of a registered Game. Two standard Cabinet models exist — **stand-up** (the default, most games) and **sit-down** (driving and cockpit games); the Manifest declares which. The Cabinet carries its marquee (game name only), attract mode, and coin door with its **Instruction Card**.
- **Registration** — the act of adding a finished Game to the Arcade Core by committing a **Manifest** via the Registration skill. No other manual step.
- **Manifest** — the declarative entry a Game supplies to register itself: stable Game id, title, original game year, attribution, cabinet type (stand-up/sit-down), build reference (versioned — refurbishments commit new builds under the same id, FR-16), auto-play hook, seed. Required fields are an architecture decision; their existence and role are a requirement here.
- **Layout System** — the deterministic placement rules that assign a registered Cabinet a Wall Slot (aisle spacing, sightlines, density limits). Placement is pipeline behavior, not hand-work.
- **Wall Slot** — a place on a wall for a Cabinet. The pool of empty Wall Slots is how visible growth reads.
- **Live Machine** — a Cabinet whose attract mode is running and, when "busy," whose Patron is actually playing. Every placed Cabinet is a Live Machine.
- **Dead Machine** — a Cabinet that reads inactive in a sampled frame: attract stalled, nothing playing. A defect by definition, never a legitimate state (FR-5).
- **Personal Best** — the best score earned by a Visitor's anonymous local identifier on a given Game, persisted across visits (FR-7) — distinct from a Cabinet's own in-game score table, which Auto-play sessions also play against.
- **Patron** — an in-room figure who plays a "busy" machine; their reactions (flinch, slam, jump) are driven by a real **Auto-play session** of that machine's own game — cabinet and patron as one causal system. (Engineering calls the player-less game instance a "headless" instance; in-world they are simply patrons playing.)
- **Auto-play session** — a game instance running with no human at the controls, driving a busy Cabinet's attract/high-score activity and the Patron's reactions.
- **Attract Mode** — a machine's self-advertising loop: sound, screen, lights. Occluded by room geometry; it is the find-by-ear discovery signal.
- **Find-by-ear** — the discovery loop: sound → attract graphics → player intensity. Zero UI hints, no guided order.
- **Instruction Card** — the card behind a coin door carrying rules and model attribution. Attribution lives here and nowhere else; the arcade never breaks character.
- **Workshop** — the open, diegetic rendering of the real repo: commits on the monitor, BMad plans as paper, the bench staged to the real build lifecycle.
- **Game Factory** — the production pipeline per Game: specify → research → design → implement (as its own BMad epic) → **register**, driven by five purpose-built skills (see §5). The pipeline is the growth mechanism.
- **Game-build contract** — the standard interface every Game satisfies: hooks (`attract()`, `autoplay(seed)`, `events()`, `stateHash()`) + a valid Manifest. It is what makes CI verification mechanical; existing assets get rebuilt to it.
- **Verification gate** — the token-free, four-layer CI check (FR-17) that must be green before Registration. Philosophy: *local LLMs build, CI verifies, the human judges feel.*
- **Run Recording** — the kernel-owned capture of one game session (seed, tick-indexed inputs, state hashes), replayable headlessly and in-room; the artifact that makes a run reproducible and a bug report provable (FR-18).
- **Hall of Models** — the presentation row of ~15 LLM-built pinball tables from one shared prompt, with explicit model nameplates ("museum, not guessing").
- **Local LLM** — model used at build time only. Runtime LLMs are out forever by thesis.
- **Visitor** — anyone in the public who walks in; identified only by an anonymous local identifier (browser cookie / localStorage) for score continuity. No account exists.

## 4. Features

### 4.1 Walk-In Arcade Shell

**Description:** The visitor enters through the front door into the Arcade Room and moves through it in first person. Realizes UJ-1. **Desktop browser only** (mouse-look + WASD) — decided 2026-11-19; phone/tablet is out entirely, superseding the brief's "laptop + phone" criterion. The room includes fixed architecture — aisles, sightline-breaking pillars, an intentionally too-big-to-take-in-at-once footprint, and an obviously-empty stretch of wall that reads as roadmap.

**Functional Requirements:**

#### FR-1: Enter and walk the room
A visitor can load the page and be inside the Arcade Room within the first minute, in first-person control (move, look), no account and no auth. Realizes UJ-1.

**Consequences (testable):**
- Page load to controllable first-person view in ≤ 60s worst-case on a mid-range laptop — a guardrail ceiling (owner-confirmed 2026-11-19), never a target; architecture sets the real time-to-playable budget. Research flags load time as the make-or-break of walk-around scenes.
- No sign-in, cookie wall, or onboarding modal anywhere.

#### FR-2: Room architecture
The Arcade Room renders walls with Wall Slots, aisles, pillars, and the fixed Zones defined by milestones (Workshop, Snack Bar, Pinball Corner). Realizes UJ-1, UJ-2.

**Consequences:**
- Pillars occlude sightlines and sound to specific locations by design.
- Empty Wall Slots are visible and readable as future machines.

### 4.2 Living Machines and Find-by-ear

**Description:** The room is alive before any visitor touches anything. Every placed Cabinet runs Attract Mode; at busy machines a Patron is *actually playing* (via an Auto-play session), and Patron reactions — flinch, slam, jump — are caused by that game's own events: cabinet and patron are one causal system. Attract sound is occluded by geometry, which makes drifting toward a sound (Find-by-ear) the entire discovery system. Realizes UJ-1.

**Functional Requirements:**

#### FR-3: Attract Mode with spatial occlusion
Every registered Cabinet continuously runs its Attract Mode; its audio is spatialized and occluded by room geometry. Realizes UJ-1.

**Consequences:**
- A visitor can locate a machine by sound alone (sound → attract graphics → player intensity), with zero UI hints.
- Moving behind a pillar changes what is heard, positionally.
- The mix is a proximity ladder: at the doorway only the nearest machines read clearly, approaching a machine swells it above the rest, and while seated in play the mix collapses around that machine — other cabinets' audio ducked to an authored floor ("tuned in"). *(Owner audio spec, 2026-11-20.)*
- The room must still work at sizes far beyond v1 (think 50 cabinets): full-rate simulation is reserved for what the player can observe or is near; distant machines sleep and wake as the player approaches — the mechanism belongs to architecture, the requirement is law. *(Owner scale requirement, 2026-11-20.)*

#### FR-4: Patrons at busy machines
Designated "busy" machines run an Auto-play session of their own game and a Patron whose reactions are driven by that game's events. At a busy Cabinet the visitor sees the **queue/NEXT ritual** (recovered from the brief, 2026-11-19): the Patron is visibly mid-game, the attract screen shows NEXT; the visitor may wait, take over at the next round break, or walk away. A busy machine is never permanently withheld from a visitor. Patrons trade authored **banter** (fixed dialogue trees — a cut-list M2 item; never runtime generation), and the queue resolves diegetically among Patrons: at a break a *waiting* Patron takes the seat and the departing one lifts off. Realizes UJ-1.

**Consequences:**
- Patron flinch/slam/jump events correspond 1:1 with events in the Auto-play session (no canned animation loops).
- Every Cabinet a visitor can reach eventually becomes playable by that visitor — "busy" is a texture, not a lock.
- A busy machine's activity (reactions, banter, audio) is legible **from across the room** — no zoom, no UI: this is the player-intensity rung of the Find-by-ear ladder.
- Patron→Patron handoff is visible end-to-end: waiting Patron sits, previous Patron lifts off.

#### FR-5: No Dead Machines (screenshot test)
Any randomly sampled frame of a session shows every visible Cabinet active (attract running or being played). A Dead Machine is a defect, not a state. Realizes UJ-1, UJ-2.

**Consequences:**
- A random-frame audit across a play session finds zero Dead Machines.

### 4.3 Playing a Cabinet

**Description:** When the visitor sits down at a Cabinet, the actual game plays in place — a real game, complete, built by local LLMs. The first is Moon Patrol (`C:/git/moonpatrol`): its existing vanilla-JS clone gets integrated as a Live Machine for M0, but integration "as is" is provisional — once the Game Factory establishes the standard way games are built, Moon Patrol is **reimplemented to that standard** so the foundation is uniform (owner decision, 2026-11-19; scope clarified 2026-11-20: the reimplementation is part of the MVP, not post-v1). Realizes UJ-1, UJ-2.

**Functional Requirements:**

#### FR-6: Sit down and play a real game
A visitor can interact with a Cabinet and play its full game in place, returning to the room afterward. All Games follow the standard Game-build contract established by the first pipeline run. Realizes UJ-1.

**Consequences:**
- The Moon Patrol clone is playable from inside its Cabinet with no separate URL or menu (M0), and is re-released against the standard contract **within the MVP** (clarified 2026-11-20) with no visible change to the cabinet experience.
- Playing does not break the room for others in the session; returning keeps the visitor's position and room continuity (owner-confirmed 2026-11-19).

#### FR-7: Scores carry over, no account required
A visitor's high scores persist between visits via an anonymous browser cookie / localStorage identity — no login, no prompt. Realizes UJ-1.

**Consequences:**
- A returning visitor sees their personal bests on the cabinets they've played, same browser, no auth.
- No personally identifiable information is collected; the identity is an anonymous local identifier.
- Global leaderboards are out of v1 (OQ-8 resolved 2026-11-19); score screens show the visitor's initials and the Patrons' auto-play runs.

### 4.4 Registration — the growth mechanism

**Description:** Games join the room by themselves. A finished Game ships with a Manifest; the Registration skill commits it, **Registering** the Game with the Arcade Core: the Cabinet appears in a Wall Slot, Live, credited, with its Instruction Card. No hand-placement, no core edit. Realizes UJ-2, UJ-3.

**Functional Requirements:**

#### FR-8: Register a Game by manifest alone
A Game can be added to the Arcade Core by committing a Manifest; no Arcade Core code change is required. Realizes UJ-3.

**Consequences:**
- A new Game goes from "committed manifest" to "walkable Cabinet" with zero manual steps by the builder.
- The Arcade Core's own source is unchanged by that addition.

#### FR-9: Attribution without breaking character
The Cabinet's marquee shows only the game name; the Instruction Card behind the coin door carries rules and model attribution generated from the Manifest. Realizes UJ-1.

**Consequences:**
- No model name, "AI-generated" badge, or UI marker appears anywhere except the Instruction Card and the Hall of Models nameplates (the one deliberate museum exception).

#### FR-16: Lifecycle — refurbish and remove, never move
A registered Game may be **refurbished** (a new build committed under the same stable Game id: same slot, same marquee, updated machine) or **de-registered** (the Manifest entry removed: the Cabinet leaves, the Wall Slot returns to the pool and reads as history in the same visual language as the roadmap stretch). Realizes UJ-3. *(Decided 2026-11-19.)*

**Consequences (testable):**
- A refurbished Game keeps score continuity — scores key on the stable Game id, not the build.
- De-registering a Game requires a Manifest removal only — still no Arcade Core edit.

**Out of Scope:**
- Moving an installed Cabinet to a different slot in v1 — relocation fights front→back fill-order determinism; a manual-override relocation is its own future epic.

#### FR-17: Game-build contract and CI gate
Every Game satisfies the **Game-build contract** — standard hooks the Arcade Core can call on any game (`attract()`, `autoplay(seed)`, `events()`, `stateHash()`) plus a valid Manifest — and Registration may only proceed on a **green verification gate** (decided 2026-11-19). Realizes UJ-3.

**The gate, four layers** (full design in addendum G):
- **L0 Contract conformance** — hooks present, Manifest valid. A non-conforming Game cannot be placed.
- **L1 Headless checks** — attract liveness (`stateHash` advances each cycle), seeded auto-play runs to a real end state, determinism (same seed → same stateHash), sealed build (no runtime network/model calls from the bundle — with one named exception, the same-origin report POST of FR-18 — the no-runtime-LLM thesis enforced by test). No browser, no LLM, seconds.
- **L2 Room audit** — scripted walk of the whole room: dead-machine detector across *all* Cabinets (new work surfaces old regressions), screenshot-test proxy + framerate floor, Patron causality probe, character lint (no attribution markers outside cards/nameplates), aisle nav lint.
- **L3 Human walk** — final, irreducible: the builder walks the build; first-minute-by-ear (SM-1) and SM-4 live here. L0–L2 exist so this walk is about feel, not bugs.

**Consequences (testable):**
- A Game failing any automated layer cannot be Registered; the Registration skill refuses a red gate.
- `[NOTE FOR ARCHITECTURE: the numeric thresholds — navigation framerate floor (FR-15, SM-C2) and Patron reaction window in the causality probe — must be set when the health-check skill is built in M2. Until set, the no-dead-machines law is not CI-enforceable; M2 acceptance is incomplete without them.]`
- Determinism and sealed-build are CI-proven properties of every placed Game, not conventions.
- The room audit runs against the full room, not just the candidate Game.
- Existing assets rebuilt to contract: Moon Patrol (already planned via FR-6) and the Hall of Models presentation tables — presentation-only tables still need liveness hooks, or they are Dead Machines by law.

#### FR-18: A bad run can be reported, with its proof
A visitor (or the builder) can flag a misbehaving cabinet from inside the room, and the report carries a **Run Recording** — a reproducible capture of the run in question: seed, tick-indexed inputs, state hashes. *(Owner requirement added 2026-11-20, post-acceptance; logged in the architecture run memlog.)*

**Consequences (testable):**
- Every game session — visitor or Patron — produces a compact local Run Recording replayable in CI (same seed + inputs → same run; a fault reproduces exactly).
- v1 reporting is honest and local-first: the room offers the recording as a downloadable file **and** a "submit report" action — the recording posts to the arcade's own same-origin endpoint and is **recorded server-side** *(owner requirement, 2026-11-20)*. The endpoint is minimal: no auth, size-capped, rate-limited, JSON stored. The repo's issue page remains available as a top-level navigation (the donation-link posture).
- No PII in a recording: seed, inputs, hashes, game/build ids only.
- **Replay is v1 too** *(owner requirement, 2026-11-20)*: any Run Recording plays back deterministically — headlessly via the repo's replay tool (CI and the builder reproduce a reported fault exactly), and in the room as playback of that run on the cabinet's own screen.
- That report POST is the room's **only** allowed runtime network call: the sealed-build check (FR-17) proves everything else stays silent.

### 4.5 Layout System

**Description:** Placement is pipeline behavior: on Registration, deterministic **Layout System** rules assign the Cabinet a Wall Slot — respecting aisle spacing, sightlines/pillars, and density limits — without hand-work by the builder. Chosen deliberately over hand-placement so the room stays coherent as it grows. Realizes UJ-2, UJ-3.

**Functional Requirements:**

#### FR-10: Deterministic placement
On Registration, the Layout System assigns a Wall Slot per its (now-decided) rules; the same registration history yields the same room. Realizes UJ-3.

**The v1 rules (decided 2026-11-19; fill direction amended same day after consistency review):**
- Wall Slots are **pre-declared and evenly spaced** — slot geometry is part of the hand-designed room architecture, not computed per game.
- Registrations fill slots **back→front, alternating left/right wall**: the earliest machines take the back-wall area, each later registration lands nearer the door, so the **newest machine always sits adjacent to the unfilled stretch** — the visible roadmap between it and the entrance (matching the floor plan's empty stretch near the door, and UJ-1: the first machine, Moon Patrol, sounds from the back).
- Machines are **never auto-rearranged** once placed.
- When slots run out, **room growth is its own epic** (extension / second room / back wall) — decided when real, not speculatively.

**Consequences:**
- Placement is reproducible: the same **registration history** (same Manifests, same order) always produces the same layout.
- Rules keep aisles passable and sightlines/pillars intentional at every density.
- Richer placement rules (sightline optimization, themed clustering) can layer on later without moving existing machines.

**Out of Scope:**
- Zone placement (Zones are fixed architecture); auto-rearrangement; speculative room growth.

### 4.6 Standard Cabinet Models

**Description:** Two standard Cabinet models are designed and modeled up front so every Game hangs off an established shell instead of inventing its own furniture: the **stand-up** cabinet (the classic upright look — most games) and the **sit-down** cabinet (driving games, cockpit experiences, the sit-down future anchors). The Manifest declares which type a Game uses. The two standard models are the default, not the only possibility: custom cabinets are allowed later within a Game's own epic scope (owner-confirmed 2026-11-19).

**Functional Requirements:**

#### FR-11: Two standard shells, declared per game
Both standard Cabinet models (stand-up, sit-down) are modeled and present in the room; a Game's Manifest declares its Cabinet type and the Registration pipeline equips it accordingly. Realizes UJ-1, UJ-2.

**Consequences:**
- A new Game needs no bespoke cabinet work to appear correctly furnished.
- Sit-down cabinets visibly host the driving/cockpit class of games; stand-ups host the rest.

### 4.7 Workshop — the room tells the truth

**Description:** The Workshop door stands open: the monitor shows the real repo's recent commits, BMad plans appear as diegetic paper, and the bench is staged to the real build lifecycle. The room is a truthful reflection of the project. Realizes UJ-2, UJ-3. (Cut list M4.)

**Functional Requirements:**

#### FR-12: Workshop reflects the repo
The Workshop renders current repository state; a change to the repo produces a corresponding change in the room. Realizes UJ-3.

**Consequences:**
- Acceptance rule from the cut list holds: repo change → room change, within one build.
- The bench staging reflects the repo's actual test/build status — green bench for green tests.
- The plan drawer may hold plans for machines **not yet built** — honest foreshadowing, staged legibly as unbuilt.
- Each registered Cabinet's Instruction Card has a matching plan in the Workshop (card ↔ drawer pairing).

### 4.8 Snack Bar — the donation surface

**Description:** In-world giving, diegetic: a tip jar that clinks, Buy Me a Coffee reframed as ordering at the counter, crypto links, and a deterministic attendant. The arcade never breaks character. (Cut list M5.)

**Functional Requirements:**

#### FR-13: Donate in character
A visitor can complete a real donation (tip jar / Buy Me a Coffee / crypto link) through Snack Bar interaction. Realizes UJ-2.

**Consequences:**
- v1 has no donation-completion signal at any provider: Buy Me a Coffee's free tier offers no webhook and v1 has no donation-related backend (its only endpoint is the minimal report-ingest one, FR-18) — so every donation is staged honestly as **offer, not confirmed** (tip jar clinks locally; no fake "confirmed" theater). *(Amended 2026-11-19 to match the architecture spine — the earlier promise that a provider completion signal would update the jar presupposed a backend v1 deliberately does not have.)*
- Completion-signal updates (e.g., polling the Buy-Me-a-Coffee supporter feed) return with the thin backend as a named later epic — see ARCHITECTURE-SPINE AD-22 and its Deferred list.
- `[RESOLVED by architecture 2026-11-19: per-provider mechanism = named honest fallbacks, no hoped-for webhooks.]`

### 4.9 Pinball Corner and the Hall of Models

**Description:** The Pinball Corner is a Zone with its own presence (gong, tables that run; the corner's full audio-anchor identity — SPIKE CHILLER, table rumble, findable-by-ear clacks and bells — rides the M6 story, 2026-11-19). The **Hall of Models** is the headline exhibit: ~15 pinball tables built by different local LLMs from one shared prompt, displayed as presentation pieces with explicit nameplates — museum, not guessing (existing assets at `C:/git/pinball`; most tables work today). Later, one table becomes physically *playable* via a pinball-physics engine decision — the **which table / which engine** question is explicitly deferred ("defined later", OQ-4); note the DragonWar sim (`C:/git/dragonwar`) is *in progress*, not complete, and is one candidate among several. Realizes UJ-2. (Cut list M3, M6.)

**Functional Requirements:**

#### FR-14: Hall of Models row
The Pinball Corner presents the ~15 model-built tables with visible nameplates naming each model; the shared prompt is a findable artifact in the room. (Presentation-only; tables unplayable at M3.) Realizes UJ-2.

#### FR-15: One playable pinball table
At least one pinball table is playable (human and auto-play) using the engine chosen by its BMad story (decision deferred, OQ-4), with two tables demonstrable side by side. (M6.) Realizes UJ-2.

**Feature-specific NFR:**
- Pinball physics must run in-browser at playable framerate; the PRD commits only to feasibility (owner-confirmed 2026-11-19) — the engine story (OQ-4) carries the risk.

## 5. Production Model — the Game Factory *(invented section: the product's core mechanism)*

Each new Game follows the same pipeline, and **each Game is its own BMad epic**:

1. **Specify** — pick/name the game (owner's taste decides what the arcade needs next).
2. **Research** — how the real game played; what makes it faithful.
3. **Design** — cabinet type, attract mode, manifest fields, auto-play hook.
4. **Implement** — build with local LLMs via BMad (epic → stories), against the acceptance laws (this PRD's FR-3 to FR-5 are each new game's gates).
5. **Register** — commit the Manifest; the Layout System places it. Growth happens.

**CI philosophy (decided 2026-11-19): *local LLMs build, CI verifies, the human judges feel.*** CI itself is deterministic scripts with **zero LLM tokens** — cheap to run, cheap to rerun, which is what makes rebuilding existing games to the Game-build contract worth it. The acceptance laws are not prose in this document; every law has either a checker in the verification gate (FR-17) or a named seat in the human walk (SM-1, SM-4). Where it runs: **per story** — layers 0–1 for that game; **pre-Registration** — layers 0–2 against the current room, Registration refuses a red gate; **scheduled** — full-room regression. Full layer design in addendum G.

The pipeline is driven by **purpose-built skills**, themselves build work owned by the first pipeline run (M2):

- **Pipeline-init skill** — starts a Game's BMad cycle: research, spec, the per-game addition to the PRD material, and the epics document; stamps the Game-build contract and gate criteria into the epic's acceptance from day one. Story work then follows the normal BMad cycle.
- **Metadata skill** — collects and records the metadata the Game needs: game name, original year, model attribution, Cabinet type, seed, and whatever else the Manifest requires.
- **Contract-test skill** — generates and runs a Game's verification suite (layers 0–1) from the contract.
- **Health-check skill** — runs the layer-2 room audit against the whole room.
- **Registration skill** — commits the Manifest and completes Registration end-to-end, refusing to run on a red gate.

## 6. Cross-Cutting NFRs *(adapted-in: public-site posture)*

- **Public, secure, anonymous.** The site is open to the public with no accounts. Only an anonymous local identifier exists (FR-7). Build posture of a real public website: HTTPS, content-security policy, input validation on anything the room sends out, sane rate limiting — `[NOTE FOR ARCHITECTURE: enumerate these in the architecture run]`. The entire room is one native runtime; no game iframes (OQ-6 resolved), which removes a whole attack/compat surface.
- **Self-hosted, single maintainer.** One DigitalOcean droplet; boring, low-maintenance stack is a stability requirement — research found server-backed arcades die when maintenance lapses (see addendum A).
- **Deterministic runtime.** No runtime LLMs and no model calls at runtime, ever, by thesis. The only external dependencies at play time are the donation links (FR-13) and the same-origin report POST (FR-18) — nothing else phones home, and CI proves it.
- **Load time is the make-or-break.** Time-to-playable is the primary performance constraint of walk-around scenes; architecture sets the budget (FR-1 carries the v1 ceiling).

## 7. Non-Goals (Explicit)

- **No runtime LLMs. Ever.** By thesis — the room is a fixed recording of build-time work.
- **No era/chronological layout.** Dropped 2026-11-19: no year-ordered rows, no golden-age shrine, no featured-pod unveiling ceremony. Walls fill as built; the Layout System handles placement. *(Supersedes the brief's "room is a timeline" law — logged in memlog.)*
- **Not a portal or catalog platform.** No accounts, no recommendations, no moderation queues, no third-party submissions.
- **No multiplayer or real visitor crowds in v1** (deliberately open afterward, OQ-7).
- **No model names on signage** — attribution only on Instruction Cards and Hall of Models nameplates. "Out forever."
- **No heavy anchor cabinet in v1.** This is a sequencing choice, not a permanent no: an anchor (Dragon's Lair, Star Wars, Gauntlet class) is a legitimate future Game epic added through the same pipeline as the system grows. `[NOTE FOR PM: emotionally load-bearing — when the first anchor epic opens, the sit-down Cabinet model (FR-11) is its prerequisite.]`
- **No paid pricing** — donations only, in character.

## 8. MVP Scope

**In scope (= cut list M0–M6, adapted for the layout override):**
- **M0:** first-person walk-in shell + the existing Moon Patrol clone integrated as a Live Machine (provisional integration; reimplemented against the standard contract **within the MVP** — FR-6, clarified 2026-11-20) + one Patron at a busy machine (the "busy" rule).
- **M1:** spatial, occluded attract audio; Find-by-ear with zero UI hints.
- **M2:** second Cabinet built end-to-end through the Game Factory — the first full epic — and the five Factory skills (pipeline-init, metadata, contract-test, health-check, registration) plus the verification gate built as part of that run; placed by the Layout System; Instruction Card credits the model. *(The featured-pod unveiling ceremony is replaced by placement into the growing wall.)*
- **M3:** Hall of Models row, presentation-only but **contract-liveness hooks required** (FR-17) — a presentation table that doesn't tick is a Dead Machine by law (FR-5); shared prompt findable.
- **M4:** Workshop reads the real repo (repo change → room change).
- **M5:** Snack Bar donation surface, deterministic attendant.
- **M6:** pinball physics story (engine/table decision "defined later" — OQ-4); one table playable, two side by side.
- Plus, as established before M2's first pipeline run completes: the two standard Cabinet models, stand-up and sit-down (FR-11).
- Plus **run recording, replay, and bug reporting (FR-18)** delivered with the M2 health-check skill work — including the thin same-origin report-ingest endpoint on the droplet. From M2 on, no placed cabinet may be unreportable, and no recording may be unreplayable. *(Owner requirements 2026-11-20.)*
- Removed from M2–M3 acceptance details: shrine rows, year ordering, and the featured pod — replaced by plain fill-as-built walls under Layout System rules.

**Out of scope for v1:** everything in §7, plus the full 22-cabinet wall inventory, the casual alley (Skee-Ball/Whac-A-Mole/Hoops), LLM-invented table designs beyond the shared-prompt set, cross-visitor global leaderboards (OQ-8), and any phone/tablet support — **desktop browser only** (owner decision 2026-11-19; supersedes the brief's "laptop + phone" criterion). `[NOTE FOR PM: the casual alley and the heavy anchors are emotionally load-bearing — revisit after M6, don't drop from memory. Donor names on the cooler and seed-minute flavor are small diegetic gifts — revisit at M5.]`

## 9. Success Metrics

**Primary:**
- **SM-1 (first minute finds it):** a **fresh visitor** — never the builder, who can't qualify — locates and sits down at a playing machine by ear alone, with no UI hints, within the first minute. Measured via fresh-visitor walkthroughs (e.g., Ray at milestone walks). Validates FR-1, FR-3.
- **SM-2 (the pipeline works):** one Game goes spec → registration end-to-end (M2), placed with zero Arcade Core edits and zero hand-placement. Validates FR-8, FR-10.
- **SM-3 (the room is alive):** a random-frame audit of a session finds zero dead Cabinets. Validates FR-4, FR-5.

**Personal (the bar that started this):**
- **SM-4:** "it feels like the arcade from the memory" — the builder's own judgment, and the one that outranks the others.

**Secondary (the public pull):**
- **SM-5:** "the short version makes people want to walk in" (recovered from the brief, 2026-11-19) — visitors who only *hear about* the arcade (a link, someone's screenshot) show up wanting in. Word-of-mouth pull against the modest-traffic posture.

**Counter-metrics (do not optimize):**
- **SM-C1: cabinet count.** A wall of 22 half-alive cabinets is a failure; a room of 4 fully-alive ones is the start of success. Count must never be traded against SM-3 or load time. Counterbalances SM-2.
- **SM-C2: raw visual fidelity.** A frame-rate-starved beautiful room fails the walk-around; "screenshot test" means a frame indistinguishable from a paused video *at playable framerate*, not a rendered poster. Counterbalances SM-3.

## 10. Open Questions

1. ~~Layout rules, concretely~~ — **RESOLVED 2026-11-19 (fill direction amended same day):** pre-declared evenly-spaced Wall Slots; **back→front** alternating fill so newest sits beside the unfilled roadmap stretch near the door; never auto-rearrange; room growth is an epic when slots run out. See FR-10.
2. ~~Lifecycle~~ — **RESOLVED 2026-11-19:** refurbish-in-place (same stable Game id), manual de-registration returns the slot (reads as history), no moves in v1. See FR-16.
3. ~~Phone/tablet~~ — **RESOLVED 2026-11-19: desktop browser only**, phone/tablet removed entirely (supersedes the brief criterion). Not deferred — gone.
4. **Pinball engine & first playable table** — **DEFERRED decision** (owner, 2026-11-19): decided at M6 story-scoping by the builder; DragonWar is in progress, most tables work. Revisit condition: when M6 opens. Not a PRD blocker.
5. ~~Quality gate placement~~ — **RESOLVED 2026-11-19:** four-layer CI verification gate + final human walk (FR-17, §5); captured in the contract-test and health-check skills.
6. ~~Game integration contract~~ — **RESOLVED 2026-11-19 (by the FR-17 contract decision):** Games are native in-scene modules in one runtime, never iframes — CI cannot call hooks, drive seeded auto-play, or read state hashes across a sandbox boundary. Boundary that follows: an external, non-conforming game (e.g., a web port you didn't build) simply cannot register. The industry manifest+iframe norm is deliberately traded away (addendum A).
7. ~~Multiplayer presence~~ — **CLOSED as deliberate deferral (2026-11-19):** v1 is single-visitor (Patrons only — closer to the memory than a lobby of avatars). Revisit condition: after M6, once the pipeline is self-sustaining. If ever built, cheapest honest form is anonymous presence (dots/silhouettes; no accounts, no chat) — research's cautionary tales about maintenance-lapsed social arcades set that bar.
8. ~~Global leaderboards~~ — **RESOLVED 2026-11-19: out of v1**, personal bests per-browser only (FR-7). Deferred with presence, post-M6. Pre-noted constraint: auto-play makes client-reported scores trivially fakeable — any future board requires **verifiable runs, not merely posted ones**. Diegetic fit meanwhile: score screens show the visitor's initials and the Patrons' auto-play runs — no fake strangers.
9. **Marquee name** — the brief left the arcade's public name open (working title "Local Arcade"); now that public hosting is the posture, decide the name and its title lockup **before the droplet goes public**. Non-blocking for M0–M6 development, blocking for public launch. Owner decision, revisit condition: launch prep.

## 11. Assumptions Index

**All closed 2026-11-19.** Nothing in this PRD now rests on an unconfirmed inference; each item is kept as the audit trail of what was once inferred:

- §2.3 — UJ beats **confirmed** by owner (age line corrected earlier in run); no built-in screenshot feature needed.
- §4.1 — desktop-browser-only scope **decided** (OQ-3; supersedes the brief's laptop+phone criterion).
- §4.1 FR-1 — ≤60s **confirmed as guardrail ceiling**, not target; architecture sets the budget.
- §4.3 FR-6 — return-to-room continuity **confirmed**.
- §4.3 FR-7 — per-browser persistence **decided** (OQ-8).
- §4.5 FR-10 — no auto-rearrangement **confirmed** via OQ-1.
- §4.6 FR-11 — standard shells as default, custom cabinets allowed later **confirmed**.
- §5 — acceptance-law enforcement **decided** as four-layer CI gate + human walk (FR-17).
- §4.9 FR-15 — feasibility-only commitment **confirmed**; engine/table choice deferred (OQ-4).
- Still open by design (not assumptions): OQ-4 pinball engine (revisit: M6 opens), OQ-9 marquee name (revisit: launch prep), `[NOTE FOR ARCHITECTURE]` in §6 and FR-17 (CI thresholds set at M2).
