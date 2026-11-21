# Local Arcade — PRD Addendum

Depth that belongs in downstream documents (architecture, epics, BMad stories) or that earned a place but doesn't fit the PRD itself. Logged 2026-11-19 during the PRD run.

## A. Landscape research (web-research agent, 2026-11-19)

**Precedents found:**
- **The Internet Arcade (archive.org)** — 900+ coin-op games via JSMESS; flat web library, no 3D; positioned as preservation/research. Their docs admit JSMESS is slow and browser-hungry.
- **threejs café** (three.js discourse, Oct 2026) — first-person 90s arcade café, 10 cabinets opening real games, WebGPU/TSL with WebGL2 fallback; author: "the biggest fight was load time." Closest 3D precedent; fixed set.
- **NOPEX Arcade 3D** — walkable 3D, WebRTC P2P up to 10 players, 38 cabinets; fixed set.
- **itch.io** — ~140 three.js+arcade tagged games (Playglow, Tripo Playroom, Game Center NOVA); none are growing platforms.
- **Cautionary:** Parsec Arcades shut down Apr 2023; arcadet.com now redirects to a museum site. Server-backed social arcades reliably die when maintenance lapses — a single-owner risk to plan around, not a differentiator.

**How catalogs grow in comparable platforms:** itch.io (ZIP upload → iframe-served, auto-appears), GameDistribution (22K catalog, ready-made iframe embed links), Poki/CrazyGames (human-curated staged launch, <8 MB initial-load budget, CSP `frame-ancestors` site-locking). **Industry norm = manifest/catalog + iframe embedding.** No public standard has games self-registering into a *3D scene* — the Registration + Layout System concept is novel assembly on standard plumbing. No arcade+local-LLM precedent found (whitespace).

**Facts architecture must not get wrong:** load time is the make-or-break of walk-around scenes; iframe embedding needs CSP/site-lock handling; portals treat <8 MB initial payload as the quality bar (informative budget, not adopted as a PRD target).

**Conscious trade-away (OQ-6 resolved 2026-11-19):** the industry manifest+iframe norm is rejected in favor of native in-scene game modules — we give up portal-style isolation and instant third-party embedding to gain CI verifiability (hooks, seeded auto-play, state hashes) and the living-room laws. External non-conforming games therefore cannot register.

## B. Existing assets (from brief)

- **Moon Patrol '82 clone** — `C:/git/moonpatrol`, vanilla JS, already built by models; integrates as first Live Machine (M0) *provisionally* — owner decision 2026-11-19: once the standard Game-build contract exists, Moon Patrol is reimplemented to it so the foundation is uniform.
- **~15 LLM-built pinball tables** — `C:/git/pinball`, built from one shared prompt by ~15 models; **most tables work today**; basis of the Hall of Models (M3 presentation, M6 playability).
- **DragonWar engine** — `C:/git/dragonwar`, GPL pinball sim; **in progress, not complete** (owner, 2026-11-19) — one candidate among several for the M6 engine decision, which the owner explicitly deferred ("defined later") and recorded as its own BMad story.

## C. Rejected alternative: the chronological room

The accepted brief (2026-11-18) made the room a timeline: golden-age shrine (Invaders/Asteroids/Pac-Man/Galaga) on the back wall, wall rows each one year older toward the back, a center featured-pod for unveiling the newest build, a year ruler 1979–1985 in the floor plan. On 2026-11-19 the owner dropped this ("not bought into the chronological aspect; just walls of machines as we build them").

Consequences carried into the PRD: no shrine, no year-rows, no pod ceremony; the featured/unveiling role is absorbed by the Layout System placing new cabinets into the growing wall. The floor-plan HTML remains valid for room *architecture* (door, pillars, aisles, zones) but its year ruler and shrine/pod labels are superseded.

**Audio casualty noted (2026-11-19 reconcile pass):** the shrine's PA-system audio identity (Pac-Man/Galaga through the room speakers) died with the override; it returns only as part of a future golden-age anchor Game epic (PRD §7), not as room architecture. Pinball-corner audio anchors (SPIKE CHILLER, rumble, clacks/bells) were *not* casualties — they ride the M6 story.

## D. The original floor plan zones (superseded timeline labels marked)

- Front door bottom-center (sound spills out)
- Wall cabinets along left/right walls *(was year-ordered — superseded)*
- Back-wall SHRINE *(dropped)*
- Center FEATURED POD *(dropped)*
- PINBALL CORNER back-left (kept as Zone; its internal EM→DMD→modern timeline is decorative era-flavor, not required)
- CASUAL ALLEY mid-right (Skee-Ball, Whac-A-Mole, Hoops — deferred, emotionally load-bearing, revisit post-M6)
- SNACK BAR front-right (kept, M5)
- WORKSHOP back-right, door open, repo-fed bench (kept, M4)
- Pillars deliberately break sightlines (kept — drives FR-2/FR-3)
- Two Patron markers = busy machines (kept — FR-4)

## E. Acceptance laws verbatim from the brainstorm cut list

Six rules gating every milestone:

1. the first minute is the product
2. no dead machines
3. screenshot test — a still frame indistinguishable from a paused video, no cabinet ever looks dead
4. one causal system — cabinet and patron are one system
5. every game runs headless
6. everything found, never announced

Plus design laws kept in the brief:

- no guided play/forced order
- find-by-ear signal ladder (sound → attract graphics → player intensity)
- attribution only on in-cabinet instruction cards behind the coin door
- marquees show game names only
- the room deliberately too big to take in at once

**Deliberate exception to the attribution law (source-checked 2026-11-19):** the Hall of Models' explicit model nameplates are NOT a new decision — they come from the brainstorm's kept-ideas list itself ("explicit nameplates = museum, not guessing"), and the PRD's FR-9 codifies them as the single exception to found-never-announced. The "no model names on signage" law and the nameplates coexist by design: signage stays clean, the museum row speaks.

## F. Emotional/vibes record a requirements doc silently drops

- "Found, never announced" — the arcade never breaks character; no AI badges anywhere except cards/nameplates.
- The hero moment: finish Dragon's Lair with a crowd watching — anchors deferred, but the *feeling* they justify is a design goal (patrons react because a real game is happening).
- "Put me inside": sit-down cockpits at building scale (Star Wars cockpit, R2-D2) — the deferred heavy anchors carry this; revisit post-M6.
- The open workshop door as honesty: the room truthfully reading the repo is part of the emotional contract, not a debug feature.
- Personal bar: "it feels like the arcade from the memory." The builder was twelve in the arcade era; the product is for him first.
- "Honest moat: authorship, taste, and the fact that it exists."

## G. Production workflow (Game Factory) detail

Each Game = one BMad epic: specify (owner taste picks what the arcade needs next) → research (faithfulness to the real game) → design (Cabinet type, attract mode, Manifest, auto-play hook) → implement (local LLMs, BMad stories, gated by acceptance laws §E) → register (commit Manifest; Layout System places).

Pacing: local-LLM tokens and owner time are the only budget; no external deadlines. Growth model is continuous — the wall is never "done."

**Factory skills (required by owner, 2026-11-19; built as part of M2's first pipeline run — five total):**
- **Pipeline-init skill** — initiates a Game's BMad cycle: research, spec, the per-game addition to the PRD material, and the epics document; stamps the Game-build contract + gate criteria into the epic's acceptance criteria. Story cycles then follow normal BMad.
- **Metadata skill** — collects necessary game metadata: name, original year, model attribution, cabinet type, seed, plus whatever else the Manifest requires.
- **Contract-test skill** — generates and runs a Game's verification suite (gate layers 0–1) from the contract.
- **Health-check skill** — runs the layer-2 room audit against the whole room.
- **Registration skill** — performs the actual Registration (commit a Manifest → placed Cabinet); refuses to run on a red gate.

**CI verification gate — full design (philosophy decided 2026-11-19: "local LLMs build, CI verifies, the human judges feel"):**
- **L0 Contract conformance:** standard hooks `attract()`, `autoplay(seed)`, `events()`, `stateHash()` + a valid Manifest. Non-conforming games cannot be placed. Uniform hooks are what make every later layer mechanical rather than bespoke — this is what rebuilding Moon Patrol buys.
- **L1 Headless checks (no browser, no tokens, seconds):** attract liveness (stateHash changes each cycle = no-dead-machines as a unit test); seeded auto-play reaches a real end state and emits events; determinism (same seed → same stateHash twice = the "fixed recording" thesis enforced); sealed build (harness blocks network/model calls = "no runtime LLMs, ever" as a test, not a hope).
- **L2 Room audit (browser automation, whole room):** dead-machine detector sampling every visible Cabinet (so new work surfaces old regressions); screenshot-test proxy + framerate floor (SM-C2 as a metric); Patron causality probe (inject a known auto-play event → Patron reacts within N frames); character lint (no "AI-generated"/model-name markers outside cards and nameplates — found-never-announced machine-checked); aisle nav lint (scripted walker passes every path).
- **L3 Human walk (final, irreducible):** the builder walks the milestone build — first-minute-by-ear (SM-1) and SM-4. Layers 0–2 exist to make this walk about feel, not bugs.
- **Cadence:** per-story layers 0–1; pre-Registration layers 0–2 against the current room; scheduled full-room regression. CI is deterministic scripts — zero LLM tokens — so rerunning is near-free.
- **Rebuild implication (accepted):** Moon Patrol (planned) and Hall of Models presentation tables must satisfy contract liveness hooks — a presentation table that doesn't tick is a dead machine by law. Real M3-adjacent work, not a freebie.

**Cabinet standardization:** two standard Cabinet models designed and modeled (stand-up default; sit-down for driving/cockpit games). Games hang off these shells rather than inventing furniture; custom cabinets remain possible within a Game's own epic.
