---
name: 'Local Arcade'
description: Experience contract for the walk-in 3D arcade — surfaces, behavior, states, journeys. The room is the interface.
type: experience
purpose: behavior-contract
status: final
created: 2026-11-20
updated: 2026-11-26
sources:
  - '_bmad-output/brainstorming/brainstorm-local-llm-arcade-2026-11-18/'
  - '_bmad-output/planning-artifacts/ux-designs/ux-local-arcade-2026-11-20/imports/arcade-floor-plan.html'
  - '_bmad-output/planning-artifacts/briefs/brief-local-arcade-2026-11-18/brief.md'
  - '_bmad-output/planning-artifacts/prds/prd-local-arcade-2026-11-19/prd.md'
  - '_bmad-output/planning-artifacts/architecture/architecture-local-arcade-2026-11-19/ARCHITECTURE-SPINE.md'
---

# Local Arcade — Experience Spine

## Foundation

Single surface: the **Arcade Room**, a first-person 3D scene in a desktop browser (mouse-look + WASD, pointer-lock). No UI system is named — there is no web UI inside the fiction. The "interface vocabulary" is physical: cabinets, paper, fixtures, zones, all rendered in one hand-coded three.js scene (no iframes, ever). `DESIGN.md` is the visual identity reference; this spine is the experience.

The only outside-fiction surfaces are plain web pages: the site page (entry, controls list, entry-demands disclosure block, repo issue link) and the Settings page (accessibility; see Accessibility Floor). Nothing else crosses the fiction boundary.

The site page carries a workbench-voice disclosure block — short declarative lines, zero fiction cost: "Needs a mouse and keyboard. First-person movement. Stereo sound is central. Bright moving lights. Desktop browser only. English only, v1."

Session model: a **Visitor** is anyone who walks in — no account, no sign-in, cookie/localStorage anonymous identifier only, carried across visits for Personal Bests. The room runs for everyone the same deterministic way; every session is a Run Recording whether or not it is ever reported.

## Information Architecture

| Surface | Reached from | Purpose |
|---|---|---|
| Front-door street view | Page load (≤60s ceiling) | Loading as the fiction's first beat — sound spilling out the door · `mockups/street-door-loading.html` |
| Arcade Room | Door opens | The whole product: walk, listen, look, sit, play · room plan: `imports/arcade-floor-plan.html` |
| Cabinet surfaces (screen, marquee, coin door + Instruction Card) | Approach + look + interact | Play, score table, rules, attribution · `mockups/cabinet-close-up.html` |
| Welcome Flyer | Wall by the front door | The control list as in-world paper (the one sanctioned announce) |
| Workshop (Zone, back-right) | Walk there | Authorship as discovery — repo truth rendered as plans and bench · `mockups/workshop-bench.html` |
| Pinball Corner (Zone, back-left) | Follow the gong | Pinball identity, own EM→today mini-timeline (era flavor, kept) |
| Hall of Models (M3) | Pinball row area | Museum row: ~15 tables, nameplates naming each model · `mockups/hall-of-models-row.html` |
| Snack Bar (Zone, front-right, M5) | Front-right, order a coffee | Donate in character — tip jar, BMC ordering, crypto links · `mockups/snack-bar-counter.html` |
| Report claim-check (paper card at a Cabinet) | Notice a misbehaving machine | Flag a run: download + submit recording |
| Settings page | Site page; also the street-door exit view | Motion/audio/input/subtitles — outside-fiction by design · `mockups/settings-page.html` |
| Street-door view (exit) | Walk back out the front door | Leave, adjust settings (same page carries the link), re-enter — the mid-session remedy costs queue position, never a forced reload |
| Repo issue page | Site page | Builder honesty, top-level navigation |

Room skeleton is fixed — the plan itself is kept at `imports/arcade-floor-plan.html` (the room's composition reference in place of a mock): front door bottom-center, two occluder pillars breaking sightlines on purpose, wall-slot walls, zones as listed. Growth reads as Wall Slots filling back→front, newest adjacent to the unfilled stretch — never a relocation, never a changelog.

→ Composition references sit beside their surfaces in the table above. They pin **composition and token use only** — never render fidelity: the shipped room is a lit 3D scene with authored materials, haze, and glow falloff; a mock is a diagram of one of its frames, not a preview of its quality. Spine wins on conflict.

## Voice and Tone

There is no system voice in the room. Fixtures speak in era paper; the room never explains.

| Do | Don't |
|---|---|
| "Something's wrong with this machine." (claim-check card) | "Error: cabinet crashed. Code 0x4F." |
| "NEXT" on a busy cabinet's attract screen | "This machine is occupied — try again later" toast |
| Flyer: "MOVE: W A S D · LOOK: MOUSE · DO: E" as stapled paper | "Press E to interact" prompt on screen |
| Attendant takes your coffee order in fixed authored lines | A web-form popup or "donation confirmed!" theater |
| Patron banter: fixed authored dialogue trees | Any generated or adaptive conversation |
| Room-sign subtitles appear as small cabinet-side signs when enabled | Caption bar overlaid on the viewport |

Outside-fiction pages are plain and honest ("workbench voice"): short declarative sentences, no era cosplay, no marketing.

## Component Patterns

Behavioral. Visual specs live in `DESIGN.md.Components`.

| Component | Use | Behavioral rules |
|---|---|---|
| Cabinet | Every placed Cabinet | Modes: attract / Auto-play session (Patron) / play (Visitor) / replay — mutually exclusive. A faulted Cabinet keeps performing via kernel fallback (marquee + screen motion); a Dead Machine is a defect, never a state. **Learn-by-watch law:** every Game's rules must be learnable by watching its attract/Auto-play loop — a registration-gate requirement (the gate is green or registration refuses). |
| Busy/queue/NEXT | Patron-playing cabinets | Busy = a real Auto-play session. Visitor may **wait, take over at the next round break, or walk away** — busy is never a lock. Takeover precedence: present Visitor > queue head. Patron→Patron handoffs resolve diegetically at breaks. NEXT renders at its own authored minimum (0.18m cap, independent of the marquee cap) — rung 2 of the pull ladder works without audio. |
| Sit / stand | Sit-down cabinets; stand-ups | Seated play does not pause the room; standing returns the Visitor to their position and the room continues (FR-6 continuity). |
| Coin door → Instruction Card | Any cabinet | Opening reveals rules + attribution (the only in-room attribution surface besides nameplates). Every Card matches a plan in the Workshop drawer (card↔drawer pairing). |
| Cabinet screen | Play, attract, scores, replay | Score table = Visitor's Personal Bests + Patron Auto-play runs — no fake strangers; first visit shows Patron runs only, until a Personal Best exists. Recordings play back **on the cabinet's own screen**; playback entered only by a visitor, runs to the sealed end, then the cabinet returns to attract. |
| Report claim-check | Misbehaving cabinet | Offers the cabinet's current Run Recording as download **and** submit (`/api/report`, the room's only outbound call). Optional free-text note — untrusted, never rendered in the room. No PII ever recorded. |
| Welcome Flyer | By the front door | Static paper; controls list; whitelisted room-sign surface for character lint. |
| Workshop bench & staging | Workshop zone | Staging mirrors repo truth: plan-only → chalk outline + drawer plan; red gate → bare skeleton + work light (honest silence); green → art-on with TESTED tag; registered → installed. Plans for unbuilt machines staged legibly as unbuilt. |
| Snack Bar counter / attendant (M5) | Snack Bar zone | Ordering a coffee **is** the Buy-Me-a-Coffee action; crypto links are in-world top-level navigations (AD-20); tip jar clinks audibly; every donation staged honestly as offer, not confirmed (AD-22). Attendant lines are fixed authored trees. |
| Room-sign (incl. banter subtitles) | Zones, cabinets, report fixture | Physical signs at fixed authored positions only. Banter beats stage at stations visible from the circulation loop; subtitle dwell ≥ read-time; re-approach re-displays for the remaining duration; cap ≥60mm per the DESIGN legibility table. |
| Nameplate | Hall of Models | Visual-only component (spec in DESIGN.md); text generated from Manifest attribution (AD-24). |
| Settings page | Site page; street-door exit view | Named rows: look sensitivity · master volume · banter volume/mute · focus-mix strength · comfort preset (off/low/full) · FOV · optional vignette · "calm cabinets" attract-tempo tier · "quiet room" banter-density tier · input remap (WASD/E) + look-source (mouse-look / arrow-key / drag) · reset to defaults. Subtitles render as cabinet-side room-sign surfaces. Choices persist per browser (localStorage). |

## State Patterns

| State | Surface | Treatment |
|---|---|---|
| Loading | Street-door view | The door is closed; attract sound spills out and swells as assets stream. Visual twin of the swell (muted/Deaf visitors, and browsers that block autoplay until a gesture): light-bleed widens under the door, glass brightens, handle turns at ready. No progress bar; the door opens when the room is ready — the ≤60s ceiling is a guardrail, never shown. |
| Load failure / asset timeout | Street-door view | Door stays closed; after ~90s `[ASSUMPTION]` a plain outside-fiction panel appears on the page, workbench voice: "The arcade didn't open. Reload." No partial fiction. |
| Unsupported / underpowered browser | Site page | Detected before the 3D canvas; workbench panel: "Needs a modern desktop browser with 3D support." Entry never half-loads. |
| First visit | Room | No onboarding of any kind. Discovery is the product (first minute = door → daze → find by ear). |
| Return visit | Cabinets played before | Personal Best appears on that cabinet's score table. No "welcome back" — the room just knows. |
| Empty Wall Slot | Walls | Reads as roadmap: kept-clean empty stretch, same visual language as filled slots; plans in the Workshop drawer foreshadow what's coming. |
| Faulted cabinet | A cabinet | Fallback performance (marquee + screen motion); the claim-check fixture becomes findable; replay reproduces the fault at the same tick from the same seed + inputs. |
| Offline / report submit fails | Claim-check card | "Couldn't send. Take the card with you." (download fallback) — the room itself needs no network. |
| Distant machines | Beyond wake radius | Asleep at idle-pulse, invisible to the player; visible ⇒ awake and glowing. Wake-on-approach is seamless — scale never shows as deadness. |
| Donation offer (M5) | Snack Bar | Staged honestly as offer, not confirmed; completion theater waits for a real backend. |

## Interaction Primitives

- **WASD** move, **mouse** look (pointer-lock), **E** = the single interact verb (open coin door, sit, pick up a card, offer the report). Settled 2026-11-20; the only binding the contract adds.
- Looking *is* targeting: center-of-view + E. No hover states, no click-to-raycast, no menus.
- Controls are learned from the Welcome Flyer or by trying — never from prompts.
- Pointer-lock denial never dead-ends the visit: look falls back to drag-look or arrow-key look (device layer, replay-safe); the fallback is silent in-room and configurable on the Settings page.
- **Banned everywhere:** HUD, crosshair, waypoints, minimap, tooltips, click-to-move, context menus, "are you sure" dialogs.
- Game controls are the game's declared scheme slots (axis / button / aim) — extensible forever without breaking any game; the physical device layer never leaks into a Game.

## Soundscape Contract

The soundscape *is* the seek system — never ambience, never UI beeps.

- **Pull ladder, fixed order:** occluded spatial sound → attract-mode graphics → Patron/player intensity. Zero UI hints on any rung.
- **Mix ladder:** at the doorway only the nearest machines read clearly; approaching swells a machine above the rest; while seated, the mix collapses around that machine and every other cabinet ducks to an authored near-silent floor ("tuned in"). Duck levels and channel budgets are set at M2.
- **Findable-by-ear identities:** Moon Patrol sounds from the back wall (M0); Pinball Corner's gong / SPIKE CHILLER / rumble (M6); the tip jar clinks into the mix (M5); half-built bench machines sit in honest silence. Each named identity carries an authored **visual signature** (gong = striker arm mid-swing; Moon Patrol attract loop shows its title screen; tip jar = coin flash at the counter) so identities are findable without hearing.
- One raycast-occlusion geometry serves sound and sightlines together — what blocks the ear blocks the eye, by design — **for sound only**. Light gets authored spill around occluders (DESIGN · Elevation & Depth), so the graphics rung survives blind spots.
- Nothing phones home: the report POST is the bundle's single named outbound call; audio behavior is identical in every browser build (replays reproduce the mix).

## Accessibility Floor

Behavioral. Visual contrast, authored legibility minimums, and the flash ceiling live in `DESIGN.md`.

- **Settings page (outside-fiction)**, reachable from the site page *and* by walking out the front door. Named rows: see Component Patterns. Precedent: the archives outside the fiction.
- **Motion comfort is authored, not deferred-to-nothing:** baselines exist as DESIGN tokens (walk 1.4 m/s, bob ±0.04m); the **comfort preset is ON at first visit**, seeded by OS `prefers-reduced-motion`. `[ASSUMPTION: baselines provisional — tune at the L3 vestibular test (5-minute continuous walk, symptom report).]`
- **Deaf / HoH discovery:** attract graphics + Patron body drama are always on at full strength, and authored light-spill restores a visual proximity gradient through occluder blind spots (DESIGN · Elevation & Depth). **Gated commitment, not a claim:** the M1 walk includes a Deaf/HoH tester with master audio muted — reach a playable cabinet within the first 60s. Until that passes, this is an assumption with a test attached, not a guarantee.
- **Non-sighted visitors — stated honestly:** the Room is a 3D canvas. Audio-driven navigation may work without sight; marquee/card/sign surfaces have no non-visual alternative in v1. Whether a non-sighted Visitor completes UJ-1 end-to-end (locate, sit, score) is **unproven**, run as an M1 spike (sound-only, eyes-closed attempt): pass → claim it on the site page; fail → say *that* on the site page. The canvas carries an entry label; the site page carries a skip-link to Settings.
- **SM-1 has two required variants** — rung-1 (normal audio) and rung-2-only (master muted) — both must pass at the L3 walk; Deaf/HoH and low-vision testers are mandatory participants, not afterthoughts.
- **Cognitive assets claimed:** the deterministic room — same state for everyone, fixed zones, never a relocation, physical text signage — is learnable across visits; the learn-by-watch law is the rules-to-play path, and Cards stay inside the print budget.
- Room-sign and card text hold the DESIGN legibility floors at their viewing distances (legibility lint); settings and site pages meet WCAG 2.2 AA — 24px targets, visible focus ring, no state-by-color-only.
- **Identical world state and seeded behavior for every visitor** — replays and reports stay honest. Input mappings and presentation accommodations are device-layer and do not fork a run.

## Key Flows

### Flow 1 — UJ-1: "Josh finds a game by ear, in his own arcade, with no UI"

*(Josh, "twelve in 1985, now very much not")*

1. Page loads: Josh sees the arcade's front door from the street; a kick-drum pattern spills out.
2. The door opens; he's inside, free look, WASD. No prompt told him anything.
3. He drifts left; the kick-drum occludes and reopens around the first pillar.
4. Over a pillar he catches an attract screen — Moon Patrol — glow against the dim wall.
5. A Patron flinches at a shot, throws a hand up: the machine is *live*, busy, NEXT showing.
6. He waits; the round break comes; the Patron lifts off and Josh is in.
7. **Climax:** he plays Moon Patrol for real, and for a minute he is twelve. No menu, no marker, no hint — he found it the way he always did: by ear, then by glow, then by the crowd of one.
8. He stands; the room continues around him; another sound is already pulling him deeper.

Failure: both required SM-1 variants (see Accessibility Floor) must pass; failing either inside the first 60 seconds is a release blocker at the L3 human walk.

### Flow 2 — UJ-2: "Ray visits the week a new machine appeared"

*(Ray, fresh visitor from a link, desktop browser)*

1. Ray arrives at the street-door view, walks in, wanders right.
2. One cabinet has fresh cardboard and a newer Instruction Card; the stretch beside it is still empty.
3. The Workshop door is open; the monitor shows real commits from this week.
4. **Climax:** "wait — this one didn't *exist* last month?" Growth is visible in the room, not announced in a changelog.
5. He leaves with a browser screenshot; no still frame of this room reads as a paused video.

### Flow 3 — UJ-3: "The builder ships Game #4 as an epic, and it installs itself"

*(Josh ships it — `[ASSUMPTION: the builder and Josh are one person; UJ-1 says "his own arcade"]`)*

1. Game #4 clears its epic; the Registration skill commits the Manifest; the gate is green or registration refuses.
2. The Layout System assigns it a Wall Slot on the unfilled stretch.
3. In the room it appears with attract mode, a Patron working it, an Instruction Card crediting the model.
4. **Climax:** the builder walks up and plays it — the *pipeline*, not a hand-placement, put it there. The next empty stretch is obvious.

### Flow 4 — Dana reports a bad run (FR-18)

1. Mid-play, Moon Patrol does something wrong — a wave that shouldn't exist.
2. Standing up, Dana notices the claim-check card at the cabinet: "something's wrong with this machine."
3. Interacting offers the run: download the recording, or submit it (optional note). Dana submits.
4. Later, the builder pulls the report and runs `tools/replay` — the fault reproduces at the same tick, same seed, same hashes.
5. **Climax:** the bug is *provable* — a misbehaving run in a deterministic room is evidence, not an anecdote.

### Flow 5 — Kenji plays with subtitles (accessibility)

1. Before entering, Kenji enables banter subtitles on the Settings page.
2. In the room, when two Patrons trade lines at a busy machine, small cabinet-side signs carry the words in room-sign stock.
3. **Climax:** the joke lands — the room never broke character, and Kenji was never handed an overlay.

### Flow 6 — Ana orders a coffee (FR-13, M5)

1. Ana finishes a run and leans on the Snack Bar counter; the attendant greets in fixed authored lines.
2. The wall menu prices a "coffee" in Buy-Me-a-Coffee terms — ordering one **is** the click, a top-level navigation in character.
3. A coin into the tip jar CLINKS audibly into the room — payment found by ear like everything else.
4. **Climax:** paying the arcade felt like being a customer, not a user — and nothing claims the payment landed. It is offered, honestly, until a backend can vouch.

## Inspiration & Anti-patterns

- **Lifted from real 1980s arcades:** instruction cards behind coin doors, tip jars, staple flyers on the wall, high-score tables with regulars' names — history legible before you arrive.
- **Lifted from the floor plan itself:** the zone hues ({colors.glow-violet}, {colors.glow-orange}, {colors.glow-steel}, {colors.glow-marquee}) — five match plan hexes exactly, amber and cyan tuned brighter for in-scene legibility — so plan, deck, and scene read as one system.
- **Rejected — Parsec Arcades posture:** server-backed social arcades die when maintenance lapses (Parsec shut down Apr 2023). Our answer: static sealed bundle + one thin ingest endpoint.
- **Rejected — featured-content rails / menus / guided tours:** the room is the interface; ordering machines for the Visitor is out forever.
- **Rejected — "AI-built" badges, model names on signage:** attribution is an artifact you find (card, nameplate), never a label stamped on the fiction.
- **Rejected — fake confirmation theater:** donations are offers until a backend can honestly confirm them; leaderboards hold real Personal Bests and Patron runs, never fake strangers.

## Responsive & Platform

Desktop browser only — phone/tablet support is *gone*, not deferred (PRD OQ-3). Target matrix: enforced evergreen Chrome + Edge; compat Firefox; Safari desktop best-effort (deferred to M2). Pointer-lock is required. Worst-case load to controllable view ≤60s on a mid-range laptop is the ceiling; <8MB initial payload is the informative budget, not a metric to chase in review.

Language: English-only in v1 — room signage, cards, banter, and copy are authored English data. Translation would be additional authored data at build time, never runtime; no localization surface is designed in v1.
