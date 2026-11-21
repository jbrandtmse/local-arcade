# Session Digest — The Local-LLM 80s Arcade

Status: **IN PROGRESS** (batch 2 starting). This is a human-readable checkpoint written mid-session; the authoritative record is `.memlog.md` in this same folder (33+ entries, time-ordered, attributed `by user` / `by coach`).

Date: 2026-11-18 · Mode: Creative Partner · Techniques run: Job to Be Done, Backcasting, Worst Possible Idea

---

## The concept (as it stands)

A first-person, walk-in **80s arcade on the web**, built entirely with **local LLMs** — the building itself is the showcase of what local LLMs can do. Visitors enter through a front door and wander freely; cabinets are actually playable; patrons (LLM agents) genuinely play the busy machines and talk; the snack bar carries a donate / "buy me a coffee" hook. Built locally first, then opened to the public.

## The four jobs (from the user's own peak memories)

1. **Re-experience** — "play a bunch of old arcade games and re-experience what I enjoyed in my childhood." Comfort, muscle memory, being twelve again.
2. **Rediscovery** — "maybe discover games I haven't played for 30 years and enjoy them again." The arcade must have *depth* — deep cuts, not just the famous ten. (Peak memories: discovering Gauntlet, Pole Position, Star Wars.)
3. **The hero moment** — beat Dragon's Lair start-to-finish (~an hour) **with a crowd watching**. Accomplishment + audience.
4. **Put me inside** — sit in the cockpit, fly the X-wing, hear R2-D2 talk. The sit-in/surround cabinets (*Star Wars*, *Pole Position*, *Gauntlet*) were rooms. **The whole 3D-walk-in concept is the sit-down cabinet rebuilt at building scale.**

## Design laws & systems discovered

- **No guided play.** No forced order. The crowd of machines IS the content; visitors walk up and try things freely. *(user)*
- **The room is a timeline.** Door → present; every row further back is one year older. Center of the room = **featured pod**: newest additions, each with a launch moment. Back of the room = **the shrine**: forever-classics (Galaga, Pac-Man, Space Invaders, Asteroids), dimmer light, sun-faded art — but always playable, never behind glass. The changelog you can hear from the door; the room visibly waits to grow. *(user's instinct, developed together)*
- **Built too big for one glance.** Broken sightlines, pillars, machines you can't see from the door, sound around corners. The overwhelm at the threshold *is* the welcome. *(coach)*
- **The attract-mode hum is the seek SYSTEM, not atmosphere.** Long-range beacon = sound; mid-range = attract-mode flash; near = player intensity. **Finding-by-memory-and-ear is the first hero moment of the visit.** *(user's pull-signal order + coach's systematization)*
- **Pull signal hierarchy** (how you find where the action is): 1) sound effects, 2) bright attract graphics/animation, 3) player intensity — jerking on controls, talking, bantering. *(user)*
- **Busy machines.** A patron stands at a cabinet mid-play, blocking it — real arcade texture, "it's busy, you can't play yet." *(user)*
- **The crowd is the LLM's job.** The audience that made the best real memory is what an LLM is uniquely good at generating. Patrons notice what you play, gather when you're on a run, remember you from last week, gasp when you finish Dragon's Lair. They **narrate and banter** — infinite, never repeated, reactive to the actual game on the actual screen. "The arcade talks, and it's never the same conversation twice." *(coach)*
- **Queuing ritual.** Watch → wait → "NEXT." High-score tables populated with regulars' names — the arcade has *history* before you arrive. *(coach)*
- **NO DEAD MACHINES.** Every cabinet always performs: attract mode running, marquee lit, screen moving. Motion/light/sound are life systems, not decoration. **The screenshot test:** a still frame must be indistinguishable from a pause of a video one second later. If it looks like a screenshot instead of a place, we failed. *(user's worst-case, flipped)*
- **A cabinet and its player are ONE system.** Game events → agent impulse → body reaction (flinch, slam, jump); player inputs → game state. Real-player tells are *involuntary*: jerky motion, slamming controls, little jumps, whole-body involvement. No cutouts, no loops. *(user's worst-case + tells, flipped)*
- **The hidden architecture spec this demands: every game must run headless** — genuinely playable by an agent alone — so "busy" cabinets are real games, not canned videos. Hundreds of machines being played by locals when nobody's watching is the ultimate local-LLM flex. *(coach)*
- **Body language is a broadcast channel** — drama readable from across the room (the near beacon). *(coach)*
- **Anchor sounds:** the Pac-Man and Galaga themes are recognizable eyes-closed. These games are *watchable* with nobody playing → crowds form → hero moments happen. Their attract music doubles as the room's PA system. *(user)*

## The first minute (v1's soul)

**The walk-in: dazing around the overwhelmed room, then FINDING the cabinet you're looking for.** The seeking is the core first-visit loop; locating the game you remember (by ear, by memory) is the first hero moment. *(user)*

Coach's seed minute (optional reference): door half-open, Galaga's intermission tune already audible, round a row, the guy at the cabinet dies, throws his hands up — "you gonna play, or just watch?" You play. He queues. NEXT.

## The opening inventory (22 cabinets — user: "they all belong")

**The Shrine (back wall, forever-machines):** Space Invaders, Pac-Man, Galaga, Asteroids
**The Walls (each row one year older toward the back):**
- 1978–1981: Galaxian '79 · Missile Command '80 · Battlezone '80 (sit-down periscope) · Centipede '81 · Donkey Kong '81 · Frogger '81 · Defender '81 · Tempest '81 · Turbo '81 (sit-down cockpit)
- 1982–1983: Pole Position '82 (sit-down) · Moon Patrol '82 · Dig Dug '82 · Joust '82 · Elevator Action '83 · **Dragon's Lair '83** · **Star Wars '83** (the R2-D2 cockpit — middle-row anchor)
- 1984: Paperboy '84 (sit-down handlebars)
- 1985: **Gauntlet '85** (four cabinets shoulder-to-shoulder — middle-row anchor)

**Empty 1985–86 stretch near the door = the featured pod's address** — every future addition gets unveiled there with a date. The emptiness is a roadmap.

Selection criteria used: watchable from across the room · sound you'd recognize eyes-closed · fills an empty year on the timeline · sit-down/immersive where possible.

## Not yet explored (batch 2 territory)

- **Pinball machines** — a different job than video cabinets (tactile, mechanical, solo ritual, the flipper sound)
- **Other amusements** — skee-ball, foosball, whatever else belongs
- **The snack bar + donate / "buy me a coffee" hook** — the money question, must feel in-world, not a web-app popup
- Public-site concerns (visitors, identity, multiplayer presence) — parked for later

## Open threads worth catching later

- Multiplayer: are patrons the *only* crowd, or do real visitors share the room?
- "New games we're adding as the system grows" — the featured pod implies a release cadence.
- The sit-down/cockpit cabinets (Star Wars, Pole Position, Battlezone, Turbo, Paperboy) are the physical core of the "inside-it" job — likely the showcase builds.
