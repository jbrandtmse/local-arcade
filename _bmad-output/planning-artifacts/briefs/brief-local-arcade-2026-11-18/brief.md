---
title: "Product Brief: Local Arcade"
status: accepted
created: 2026-11-18
updated: 2026-11-18
---

# Product Brief: Local Arcade

*Name is a working title — the marquee reads "Local Arcade" for now and may change.*
*Depth lives in the brainstorm artifacts and the v1 cut list (linked under Sources); this brief is the boundary and the story, not the spec.*

## Executive Summary

**The short version, for people:** *"A first-person 3D arcade on the web — you walk in, find a cabinet by its attract-mode sound, and play a real 80s game. Every game, machine, and patron in it was built by local LLMs when the arcade was built, and nothing AI runs while you play. We add machines whenever we finish one."*

Local Arcade is a first-person, walk-in 3D arcade on the web. You enter through the front door into a room full of 1980s cabinets — every one lit, attract mode running, sound drifting around corners — and you find your way not by a menu but by ear and memory, the way you found a machine in a real arcade. When you sit down, the game is a real game. The room is deliberately too big to take in at once; the seeking is the first-visit experience, and finding the cabinet you remember is the visit's first hero moment.

The showcase is how it was made. Everything — games, cabinets, room, the behavior of the patrons — is authored by **local LLMs at build time**. No LLM runs while you play: all in-world behavior is deterministic, event-driven performance. The arcade is a fixed recording of what local models can build — reproducible, offline-provable, and verifiable in-world: instruction cards behind coin doors and an open workshop door whose desk reads the actual project repository.

It is built to grow: as we design and implement new games, they join the arcade. Adding a finished machine is a configuration entry; the room places it in the featured pod, and the floor plan visibly waits for it. Personal project, publicly hosted (DigitalOcean droplet), solo-play only for v1.

## The Problem

This is a human problem, not a market one — it starts from four peak memories and the jobs they describe:

1. **Re-experience** — play the old arcade games again and re-feel what you enjoyed at twelve: comfort, muscle memory, being that kid again.
2. **Rediscovery** — meet games you haven't seen in thirty years and enjoy them again. The arcade needs *depth*, not just the famous ten.
3. **The hero moment** — finish Dragon's Lair start-to-finish with a crowd watching. Accomplishment plus an audience.
4. **Put me inside** — sit in the cockpit, fly the X-wing, hear R2-D2. The sit-down/surround cabinets were rooms; this concept is that cabinet rebuilt at building scale.

What exists today — emulators, browser game portals — gives you the *game* but not the *arcade*: no room, no sound around corners, no crowd gathering, no "this one's busy, you can't play yet." The feeling those memories are built on lives in the room, and nothing on the web puts you in the room. The problem is that this experience doesn't exist for the builder and their circle — not that a market gap demands a product.

## The Solution

The room itself, and the laws that keep it alive:

- **Free walk-in, no guided play.** First-person, free look and move, no forced order. The crowd of machines *is* the content.
- **Find-by-ear.** The attract-mode soundscape is the seek system: the room's geometry occludes cabinet audio, so you locate the machine you remember by sound before you see it. Pull-signal order: sound first, then attract-mode light, then player intensity at the machine.
- **No dead machines.** Every cabinet always performs — attract mode animating, marquee lit, screen moving. Motion, light, and sound are life systems, not decoration.
- **A cabinet and its player are one causal system.** Patrons at "busy" machines are *actually playing*: every game runs headless (playable by an agent alone), and game events drive an authored reaction library — flinch, slam, jump. Drama readable from across the room.
- **The room is a timeline.** Golden-age shrine at the back (Space Invaders, Galaga, Pac-Man, Asteroids); wall rows one year older toward the back; the featured pod at center holds each newest addition with its unveiling. Growth is visible in the floor plan.
- **Config-driven growth (v1 requirement).** Registering a completed machine in a config file places it in the room. The pipeline, not a hand-placement, is the growth mechanism.
- **Found, never announced.** No UI markers, no signage that breaks character; marquees show only game names. Model attribution lives on an instruction card behind the coin door — a real arcade artifact you go looking for.
- **The workshop.** A door left open in the arcade; its desk reads the real repository — commit log on the monitor, BMAD plans as diegetic paper, a machine on the bench staged to its true build state. Authorship as discovery.
- **The Hall of Models.** A row of pinball tables built by ~15 different local LLMs from one shared prompt — the headline exhibit, present in the room from early on.

## What Makes This Different

- **The thesis is the product:** local LLMs as *builders*, not chatbots. Content and behavior authored at build time; the runtime is deterministic — reproducible, offline, provable. Most "AI" demos showcase a model running live; this showcases what models leave built.
- **Design laws are acceptance tests.** The screenshot test, the headless rule, "found, never announced" — enforceable in review, not vibes.
- **It starts from artifacts that already exist:** a complete Moon Patrol '82 clone (vanilla JS, zero deps) at `C:/git/moonpatrol`, ~15 model-built pinball tables at `C:/git/pinball` (one folder per model, all built from one shared `prompt.md`), and the open-source GPL pinball engine DragonWar at `C:/git/dragonwar`.
- **Honest moat:** authorship, taste, and the fact that it exists. No claimed technical barrier — anyone could attempt this; nobody has built this particular room.

## Who This Serves

- **Primary: the builder as first visitor** — someone who was twelve in the arcade era, chasing the four jobs above. If it lands for them, it lands.
- **Secondary: friends and family of that generation, plus the local-LLM-curious** — people who want to *see* what local models can build, walking through it rather than being told about it.

## Success Criteria

v1 succeeds when —

1. **The first minute is the product:** door → daze at an overwhelming room → find the cabinet you remember, by ear alone, no UI hints.
2. **The room passes the screenshot test** — a still frame must be indistinguishable from a video of the room paused one second later — and no cabinet ever looks dead.
3. **Two real games run behind living patrons** (Moon Patrol integrated first; a second built end-to-end through the local-LLM pipeline), with the busy/queue/NEXT ritual working, and at least one golden-age shrine cabinet physically placed in the room.
4. **A new machine joins the arcade via a config entry** — growth proven as mechanism, not promise.
5. **The workshop truthfully reflects repo state** (advance a story, commit, run tests → the room changes with it).
6. **It runs in a browser on a modern laptop and a modern phone**, publicly hosted.
7. **The donation surface works:** the tip jar, Buy Me a Coffee, and crypto wallet links each accept a real donation from inside the room — an in-world interaction, not a web-form popup.
8. **Personal bar:** it feels like the arcade from the memory, and the short version above makes people want to walk in.

## Scope

**In for v1** (boundaries; milestones M0–M6 are in the cut list):

- First-person 3D walk-in shell with spatial, occluding attract audio and geometry too big to take in at once.
- Runs in the browser on a modern laptop and a modern phone; publicly hosted (DigitalOcean droplet).
- Two fully playable video cabinets, headless-capable, with patrons; at least one golden-age shrine cabinet physically placed.
- Reusable attract-mode life system every placed cabinet inherits.
- Config-file registration that places a machine (featured pod at room center).
- Hall of Models presentation row (all ~15 tables visible and performing; physics playable later, in M6).
- The workshop reading the real repo.
- Snack-bar donation surface only: tip jar, Buy Me a Coffee, crypto wallet links.

**Explicitly out of v1:**

- The rest of the 22-cabinet wall, and the heavy peak-memory anchors (Dragon's Lair, Star Wars, Gauntlet) — post-v1 through the proven pipeline.
- Casual alley (Skee-Ball, Whac-A-Mole, hoops) — serves the social job v1 can't deliver.
- Multiplayer / real-visitor crowds — patrons set the stage; humans fill it later.
- LLM-invented custom tables and monthly reveals — needs playable physics plus the pipeline first.
- **Runtime LLMs anywhere — out forever by thesis, not by schedule.**
- Model names on marquees or room signage — out forever: the arcade never breaks character.

## Vision

With the pipeline proven, the wall fills along its timeline — the deep cuts, then the sit-down cockpits, then the peak-memory anchors that are the hardest builds. Pinball physics make the Hall of Models playable; custom tables invented end-to-end by local models (name, theme, rules, backglass, voice) unveil monthly into the featured pod, themes open to visitor proposals. Real visitors eventually share the room, so the hero-moment audience is human. The arcade becomes a living, growing record of two things at once: the golden age of arcades, and what local models can build when they're treated as builders, not chatbots.

## Open Questions

- Multiplayer co-presence: how do real visitors share the room without breaking determinism? (Endgame question, not v1.)
- Phone performance: concrete budgets — machines in view, draw calls, audio channels. To be set during architecture.
- Snack-bar: when does the diegetic in-world treatment (attendant, counter play) earn its place after the bare v1 donation surface?
- Do we freeze a marquee name before public hosting, or let it stay "Local Arcade" until a better one walks in?

## Sources

- `idea.md` (project root) — original intent statement.
- Brainstorm session (2026-11-18): `_bmad-output/brainstorming/brainstorm-local-llm-arcade-2026-11-18/` — `brainstorm-intent.md`, `session-digest.md`, `v1-cut-list.md` (M0–M6).
- Existing repos: `C:/git/moonpatrol`, `C:/git/pinball`, `C:/git/dragonwar`.
