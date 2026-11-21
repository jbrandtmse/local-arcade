# v1 Cut List — Local Arcade

Source: `.memlog.md` in this directory (the only source; no facts invented beyond it).
Thesis carried through every milestone: **local LLMs author content and behavior code at BUILD time; the runtime is deterministic performance.** "The arcade is a fixed recording of what local models can build."

## Non-negotiable v1 acceptance rules (from the session)

These gate every milestone, not just the last one:

- [ ] **The first minute is the product**: door → daze at an overwhelming room → FINDING the cabinet you remember. The seeking, not the playing, is the first-visit loop.
- [ ] **No dead machines**: every cabinet always performs — attract mode running, marquee lit, screen moving. Motion/light/sound are life systems, not decoration.
- [ ] **Screenshot test**: if a screenshot of the arcade looks static, v1 failed.
- [ ] **One causal system rule**: cabinet and player are one animated system — game events → impulse → body reaction (flinch, slam, jump); player inputs → game state. Reactions are an authored library, deterministic at runtime.
- [ ] **Headless rule**: every machine must run headless — playable by an agent alone — so "busy" cabinets are real games, not animation loops.
- [ ] **Found, never announced**: everything is discoverable (attract-hum seeking, instruction cards behind the coin door, workshop plans). No UI markers, no signage that breaks character.

---

## M0 — The one-minute walk: one cabinet, one living patron

**Why this order:** the first minute IS v1. If door → daze → find-the-cabinet lands with a single built game and one believable player, everything else is amplification; if it doesn't, nothing else matters. Moon Patrol is chosen because it already exists and is complete.

- [ ] First-person 3D walk-in shell on the web: door, entry, free look/move — no guided play, no forced order.
- [ ] Integrate the Moon Patrol '82 clone (`C:/git/moonpatrol`, vanilla JS, zero deps) into a playable cabinet.
- [ ] The cabinet is alive: lit marquee, attract mode animating on the screen when nobody plays.
- [ ] One patron stands at the cabinet actually playing it, headless: game events drive the authored reaction library (flinch on hit, slam controls, little jumps).
- [ ] Busy rule works: "this one's busy right now, you can't play it yet" — the patron mid-play blocks the cabinet.
- [ ] Pass the screenshot test from the entry position.

**Demonstrates:** the defined first minute end-to-end — one real game, one real player, one room that is alive.

## M1 — Find-by-ear navigation + attract modes as a system

**Why this order:** the seek system runs on sound and occlusion, not on more content — build it while there is only one cabinet, so it is cheap to debug and provably the thing that guides you.

- [ ] Attract audio is spatial: cabinet sound attenuates and occludes around geometry — audible from around corners before sight.
- [ ] Room geometry breaks sightlines and is too big to take in at once; the entry moment never shows the whole room.
- [ ] Attract mode implemented as a reusable life system (screen animation + lit marquee) that any placed cabinet inherits.
- [ ] A dev "alive check" wired to the screenshot test gates every cabinet placement.
- [ ] Walk verification: from the door, locate the Moon Patrol cabinet by ear alone, no UI hints.

**Demonstrates:** finding-your-cabinet-by-memory by ear — the first hero moment — with zero announced wayfinding.

## M2 — Second cabinet + shrine row geography

**Why this order:** one sound source is navigation; two is *choice*. The room only becomes "too big to take in at once" when things call from different directions, and the geography rule (newest in the center pod, older at the back) needs two placed machines to exist.

- [ ] Choose the second cabinet from the accepted wall list and build it with local LLMs end-to-end — the first full run of the build pipeline, which is the showcase's process, not just its product.
- [ ] New cabinet runs headless with its patron; the queue/NEXT ritual: player finishes, a waiting patron takes over, "busy" lifts.
- [ ] Banter between nearby patrons is fixed authored dialogue trees triggered by game events (drama readable from across the room as a near-beacon).
- [ ] Begin the back-of-room golden-age shrine layout (anchor cabinets Galaga, Pac-Man, Space Invaders, Asteroids start as a row plan; at least one physically placed in v1).
- [ ] Featured pod at the room center exists and holds the newest addition — the geography rule is now visible.
- [ ] Instruction card behind the coin door of the new cabinet credits the model that made it; marquees show ONLY game names — attribution stays in the card and outside-the-fiction metadata.

**Demonstrates:** a room where two live cabinets pull you in different directions; maker credit discoverable in-fiction.

## M3 — Hall of Models pod

**Why this order:** the 15 tables already sit in `C:/git/pinball` — maximum showcase proof per unit of work. Full playability waits on the engine decision in M6, but the museum row itself is pure presentation of existing artifacts, so the room gets its identity before the hardest technical work starts.

- [ ] A row of cabinets, one per model-built table from `C:/git/pinball` (Dragon's Keep, Quantum Core: Meltdown, Space Station, Storm Chaser, Nova Strike, Midnight Heist, Ragnarök, Neon Quest, and the rest).
- [ ] Nameplates are explicit: each cabinet states which local model built its table — museum, not guessing game.
- [ ] The shared prompt that built all 15 is itself a findable in-world artifact, never announced.
- [ ] Each cabinet performs while unplayable: backglass/table art animated in attract, marquee lit — no dead machines even before physics lands.
- [ ] Instruction card per table credits its model, pairing later with its plans in the workshop (M4).

**Demonstrates:** the headline claim — fifteen local models, one identical prompt — walkable and visible in the room.

## M4 — The workshop reading the repo

**Why this order:** the workshop's state is not fiction — it reads the real repository. It must come after M2–M3 so there ARE real BMAD docs, commits, and test runs for it to truthfully display; before this point it would be a prop, and props violate the found-never-announced meta-law.

- [ ] A door left open somewhere in the arcade; desk with plans, monitor, still-warm chair.
- [ ] Wire the room to the actual project repo: git log renders as the work log on the desk monitor; BMAD specs/epics/story files render as diegetic paper (spread-open plans = in-progress stories, boxed + dated = shipped).
- [ ] At least one machine shown partially assembled on the bench, matching its real build stage (lifecycle staging: chalk outline → bare cabinet skeleton with work light → art on with TESTED tag → stenciled crate by the door).
- [ ] Test status in the repo drives the bench (tests-green = first attract mode running on the bench).
- [ ] Each cabinet's instruction card pairs with ITS plans in its drawer — showroom ↔ workshop map.
- [ ] Plans on the desk for a machine not built yet — in-world foreshadowing of the next featured-pod addition.
- [ ] Acceptance: change the repo (advance a story, commit, run tests) → the workshop state changes with it, no re-authoring.

**Demonstrates:** the thesis made physical — the building visibly shows how it was made, generated from its own repo as source of truth.

## M5 — Snack-bar donation counter

**Why this order:** the retention fixture last among built features: it touches no gameplay tech, stays fully deterministic, and only earns its place once the walk-and-find loop actually holds a visitor long enough to want a coffee.

- [ ] A diegetic counter in the room; the rails are hidden behind it.
- [ ] Tip jar that CLINKS into the room's soundscape (donation is audible, found by ear like everything else).
- [ ] Buy Me a Coffee as ordering: ordering a coffee IS the Buy-Me-a-Coffee click.
- [ ] Crypto wallet links on/behind the counter (the v1 donation surface from the session: tip + wallets + BMC — nothing more).
- [ ] The attendant is deterministic: fixed authored order lines, no runtime LLM anywhere.

**Demonstrates:** a visit can become a hangout, and paying the arcade is an in-world interaction, not a web form.

## M6 — Pinball physics on a chosen engine

**Why this order:** the hardest runtime tech goes last, once the room, the walk, and the showcase framing are proven; it then retro-plays the already-built Hall of Models rather than carrying v1 on its own.

- [ ] Engine decision: the existing open-source GPL simulation at `C:/git/dragonwar` vs an alternative; record the decision as a real BMAD story so the workshop shows it (dogfooding the method).
- [ ] The chosen engine runs at least one Hall of Models table, playable by a human AND headless by a patron (the headless rule applies to pinball too).
- [ ] Pinball attract = sound + motion: clacks, bells, flipper volleys — the pinball corner is findable by ear like the cabinet rows.
- [ ] At least two model-built tables playable side by side, so "play them all and compare" begins to hold.
- [ ] EM-era → 80s/90s → modern → custom timeline arrangement of the corner is laid out (placement plan; not all eras need machines in v1).

**Demonstrates:** the second audience (tactile players) gets real physics, and the Hall of Models becomes playable, not just visible.

---

## Explicitly OUT of v1 (cut, with why)

- **The rest of the 22-cabinet accepted wall inventory** (Centipede, Donkey Kong, Frogger, Defender, Tempest, the full set) — each cabinet is a full authored build; v1 proves the pipeline with two and lets the featured pod add the rest over time. The floor plan is designed to grow, so the cut is visible-in-world, not missing.
- **Dragon's Lair, Star Wars, Gauntlet mid-decade anchors** — the user's peak memories, but the heaviest builds (laser-disc/3D/vector heritage); they come through the proven pipeline after v1.
- **The full four-cabinet shrine** — the back row is placed as geography in M2, but completing Galaga + Pac-Man + Space Invaders + Asteroids as playable cabinets is post-v1; Pac-Man/Galaga attract themes as the room's PA system grow in as those cabinets exist.
- **Casual alley** (Skee-Ball, Whac-A-Mole, Hoops) — widens the audience but serves the head-to-head social job that single-visitor v1 cannot deliver; nothing in the first minute needs it.
- **Multiplayer / real-visitor crowds** (Joust-style two-player, shared room) — "patrons set the stage; humans fill it" is the endgame, but deterministic patron behavior is enough to make the room alive for one visitor; networking is out of v1 scope.
- **Custom LLM-invented tables** (name, theme, rules, backglass, attract voice; monthly featured reveals; visitor-proposed themes) — the project's ultimate showcase, but it depends on M6 physics plus a repeatable featured-pod pipeline; deferred until both exist.
- **Model Grand Prix** (shared leaderboards attributed per model) — optional garnish on top of explicit nameplates; the museum framing stands without it.
- **Runtime LLMs anywhere** — out by thesis, not by schedule: patrons, attendant, and all in-world behavior are deterministic authored rules forever.
- **Model names on marquees/room signage** — out forever by decision: the arcade never breaks character; attribution lives in instruction cards and the outside-fiction archive layer.
