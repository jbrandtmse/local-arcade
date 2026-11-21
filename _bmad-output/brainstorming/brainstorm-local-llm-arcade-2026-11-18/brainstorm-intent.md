# Brainstorm Intent — Local-LLM Arcade

Source: `.memlog.md` (session complete, 2026-11-18). Downstream: bmad-product-brief / bmad-prd.

## Product statement

A walk-in, first-person 3D web arcade of 1980s video cabinets, pinball tables, and casual amusements, with a snack-bar donation counter and a workshop whose in-world state reads the actual project repository. The visitor roams freely: 22 named video cabinets along the walls, a pinball corner with named classics plus a Hall of Models (15 tables already built in-repo by ~15 different local LLMs from one shared prompt), Skee-Ball/Whac-A-Mole/Hoops, and a donation counter. The showcase is that the whole thing is BUILT by local LLMs — content and behavior authored at build time. There are NO runtime LLMs: all in-world behavior (patrons, machines, snack bar) is deterministic, event-driven performance. The arcade is a fixed recording of what local models can build — reproducible, offline, provable.

## The four user jobs

1. **Re-experience** — play old arcade games and re-feel what was enjoyed in childhood.
2. **Rediscovery** — meet games not played in 30 years and enjoy them again.
3. **Hero moment** — accomplishment in front of an audience (finishing Dragon's Lair start-to-finish with a crowd watching); real visitors fill the audience the deterministic room stages.
4. **Put-me-inside** — being in the cockpit, flying the X-wing, R2-D2 talking to you (Star Wars, Battlezone, Turbo).

## Design laws

- **No guided play, no forced order.** The visitor walks up to any machine; the crowd of machines IS the content.
- **No dead machines.** Every cabinet always performs — attract mode running, marquee lit, screen moving. Motion/light/sound are life systems, not decoration. v1 acceptance test: if a screenshot of the arcade looks static, it failed.
- **Cabinet and player are one causal system.** Game events → agent impulse → body reaction (flinch, slam, jump); player inputs → game state. Body language is broadcast — drama readable from across the room. Consequence: every machine runs headless (playable by an agent alone), so "busy" cabinets are real games, not loops.
- **The room is a timeline.** Golden-age shrine at the back (the anchor cabinets); wall rows arranged by year, mid-decade row anchored by the user's own peak-memory games; newest builds go in the featured pod at room center; older games live at the back. The arcade grows over time and the floor plan shows it. The pinball corner runs its own EM → DMD-era → modern-LCD → custom-tables-dated-today timeline.
- **Find-by-ear.** The attract-mode soundscape is the seek system: you locate the game you remember by ear before you see it. Pull signals in order: (1) sound effects, (2) bright attract-mode graphics/animation, (3) player intensity at the machine. Anchor audio: Pac-Man and Galaga themes are the room's identity and PA system; pinball's anchors are Twilight Zone's gong, Addams Family's "SPIKE CHILLER", Earthshaker's rumble.
- **Everything is found, never announced.** The meta-law. The arcade never breaks character: in-room marquees show only game names. Model attribution lives on an in-cabinet instruction card behind the coin door — a real arcade artifact, something you go looking for. The workshop, the cards, and the repo-fed bench are one authorship-as-discovery mechanic.
- **The workshop is the repo rendered as in-world plans.** A door left open in the arcade; on the desk, plans describing how the arcade was built (BMAD method, local models). Its state is NOT fiction — it reads the actual repository: which machine is in progress and its state (spec/epic/story progress, test status, commits on the monitor). Plans render as diegetic paper (spread-open = in-progress, boxed+dated = shipped, under an "ON HOLD" brick = blocked); a workbench machine is staged to its real build lifecycle (chalk outline → bare skeleton → TESTED on the bench → stenciled crate by the door). Each cabinet's instruction card pairs with its plans in its drawer.

## Inventory

### Video cabinets — 22 accepted

- **Golden-age shrine (back of room, anchor cabinets):** Space Invaders, Galaga, Pac-Man, Asteroids.
- **1980:** Missile Command, Battlezone (sit-down periscope vector tank — put-me-inside, era-authentic).
- **1981:** Centipede, Donkey Kong (the definitive hero-machine), Frogger, Defender, Turbo (sit-down cockpit racing).
- **1982:** Dig Dug, Joust.
- **1983:** Dragon's Lair, Star Wars (vector, cockpit — peak memories; anchor the mid-decade rows).
- **1984:** Paperboy.
- **1985:** Gauntlet.
- **Wall picks, year not fixed in session:** Galaxian, Pole Position, Moon Patrol, Elevator Action, Tempest.
- **Already built:** Moon Patrol '82 clone — vanilla JS, zero deps — at `C:/git/moonpatrol`.

### Pinball

- **Named classics:** Eight Ball Deluxe (1978); Williams/Bally classics — Earthshaker! (1989), The Addams Family (1992), Twilight Zone (1993); plus modern tables.
- **Existing inventory at `C:/git/pinball`:** one shared prompt, ~15 local LLMs each built its own table — Dragon's Keep, Quantum Core: Meltdown, Space Station, Storm Chaser, Nova Strike, Midnight Heist, Ragnarök, Neon Quest, and more. Presented as the **Hall of Models**: one cabinet per table, credited per model (attribution via instruction card, not room signage). Optional garnish: "Model Grand Prix" — leaderboards attributed per model.
- **Engine:** DragonWar, user's open-source GPL pinball simulation engine, at `C:/git/dragonwar`.
- **Custom-table direction:** tables that never physically existed — name, theme, rules, backglass art, attract voice invented by a local LLM — unveiled monthly into the featured pod; visitors could propose themes.

### Casual games (audience-widening, the hang-out / head-to-head equalizer)

Skee-Ball, Whac-A-Mole, arcade basketball hoops.

### Snack bar (v1 shape)

Simple donation surface: a tip location, links to crypto wallets, a Buy Me a Coffee link. Diegetic treatment (counter, clinking tip jar, visible donor presence) is direction, not v1 scope.

## v1 "first minute" vertical slice

The first minute IS the walk-in: the room is deliberately too big to take in at once — broken sightlines, sounds from around corners — the visitor dazes, then FINDS the cabinet they're looking for by ear. The seeking, not the playing, is the core first-visit loop; finding-by-memory is the first hero moment. The slice must prove: deterministic-alive room passing the screenshot test; a working attract-hum seek; at least one real headless game behind a busy patron; an instruction card findable behind a coin door; the workshop readable from repo state.

## Deliberately open

- **Multiplayer presence** — the hero-moment audience is meant to be real visitors, but how visitors co-presence in the room is unresolved.
- **Snack-bar interaction details** — v1 is the bare donation surface; the diegetic attendant/counter treatment is unresolved direction (and must not imply runtime LLMs).
- **Performance / scale targets** — the room must feel too big to take in at once; concrete budgets, machine counts, and target hardware are unresolved.
