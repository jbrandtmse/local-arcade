# Epic 2 Context: Find It by Ear — The Room Is Alive Around You (M1)

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

This epic makes the room discoverable the way it was meant to be: a visitor drifts toward a sound around a pillar, catches an attract glow, and sits down — the full pull ladder of occluded spatial sound → attract graphics → Patron/player intensity, with zero UI hints. Spatially occluded attract audio, a distance-ordered mix that collapses around a seated player, and light that spills around occluders make the room findable by ear alone and by eye alone. The release boundary is the M1 human walk: SM-1 (first-minute discovery) must pass in both required variants — normal audio and master-muted — with Deaf/HoH and low-vision testers as mandatory participants, and the non-sighted spike runs here with its outcome reported honestly. Epic 1's deferred-cleanup debt closes first so the epic starts on a clean footing.

## Stories

- Story 2.0: Epic 1 deferred cleanup
- Story 2.1: Core Audio Manager — attract sound that occludes and swells
- Story 2.2: The proximity ladder and the seated focus mix — "tuned in"
- Story 2.3: Light spill and atmospheric depth — the graphics rung works alone
- Story 2.4: The Settings page — comfort presets on at first visit
- Story 2.5: The site page and honest disclosures
- Story 2.6: The M1 walk — SM-1 in both variants, honestly measured

## Requirements & Constraints

- The pull-ladder order is fixed — occluded spatial sound, then attract graphics, then Patron/player intensity — with zero UI hints on any rung. The soundscape *is* the seek system: never ambience padding, never UI beeps. Every findable-by-ear sound identity carries an authored visual signature so it stays findable without hearing.
- Moving behind a pillar must change what is heard, positionally; a machine must be locatable by sound alone. The mix ladder: at the doorway only the nearest machines read clearly; approaching swells one machine above the rest; sitting collapses the mix around that machine — every other cabinet ducks to an authored near-silent floor ("tuned in") — with ambience and zone sound following their own authored levels.
- Occlusion and proximity transitions use hysteresis — a dead-band plus dwell, implemented as a pure tick function — so standing at a boundary never flips audio per tick. The numbers stay placeholders until Epic 3's health-check sets them; the behavior must be verifiable at the human walk with placeholders in place.
- All mix decisions derive solely from kernel tick state (positions, camera, occupancy), never wall-clock — a replay reproduces the mix exactly.
- With master audio muted, rungs 2 and 3 must carry the whole discovery path: attract glow halos and marquee light fall off through faint haze, and glow gets authored spill around occluder edges (bleed, floor sheen, ceiling bounce-cones) so the visual proximity gradient survives exactly where sound is occluded. Distant machines dim toward the room's dark but never read dead. The one-geometry sharing is deliberately asymmetric: occluders block sound and sight, light spills.
- Flash discipline holds at authoring time: no authored element flashes faster than 3 times per second per lit surface or in aggregate (the machine-checked probe arrives in Epic 3).
- Settings and site pages are outside-fiction, plain workbench voice, `ui-*` tokens only — nothing else crosses the fiction boundary. M1-scope Settings rows: look sensitivity, master volume, focus-mix strength, comfort preset (off/low/full), FOV, optional vignette, "calm cabinets" attract-tempo tier (tempo only — cabinets keep moving and glowing), input remap (WASD/E) plus look-source (mouse-look / drag-look / arrow-key), reset to defaults. Banter-volume and subtitle rows must NOT appear yet — they arrive with banter in Epic 3; no UI for features that don't exist.
- Comfort preset is ON at first visit, seeded by OS `prefers-reduced-motion`; walk speed 1.4 m/s and ±0.04m head bob are the baselines it tunes. Settings persist per browser and never fork a run — input mappings and presentation accommodations are device-layer and replay-safe.
- Both pages meet WCAG 2.2 AA: 24px targets, visible focus ring ≥3:1, toggle state cued by position plus shape (never color alone), verified contrast ratios. The site page carries entry, the controls list, the honest disclosure block (mouse+keyboard, first-person movement, stereo central, bright moving lights, desktop-only, English-only v1), the repo issue link, a skip-link to Settings, and an entry label on the 3D canvas; unsupported/underpowered-browser detection runs before any canvas — entry never half-loads.
- The accessibility floor binds release. SM-1's clock starts at the first tick of first-person control, not page load; both variants must reach and sit at a playable cabinet within 60s at the walk — either failing is a release blocker. The color-blind check (every zone readable from fixtures/geometry at 6m with hue removed) and the 5-minute vestibular walk (which tunes the comfort baselines) run at the same walk. The non-sighted spike (sound-only, eyes-closed attempt at the full visit) is measured, and the site page's claim-or-disclaimer text mirrors its outcome verbatim — never claimed in advance. SM-4 ("feels like the memory") is recorded as builder judgment: always the tie-breaker, never a pass/fail gate.
- The no-Dead-Machines law keeps binding: random-frame posture is spot-checked against the placed cabinets at the walk.

## Technical Decisions

- Exactly one Core Audio Manager owns the entire WebAudio graph — games supply assets and requests only and never create their own nodes or graphs (the L0 API bans cover those paths). Spatialization is PannerNode with distance attenuation; occlusion is a single-ray raycast from listener to cabinet against the room's dedicated occluder collider set, applying gain reduction plus a lowpass. Soft multi-ray occlusion is explicitly deferred.
- That same occluder set is the sightline-breaking reference — the whole signal ladder rides one geometry, and raycasts run against the authored AABB volume data, never hardcoded geometry.
- Channel budget = distance-cull + nearest-N, operating strictly inside the liveness awake set: a sleeping machine makes no sound, so proximity and visibility drive the mix for free. Wake/sleep stays a pure tick-state function, and no sleeping machine ever reads dead or silent-visible to a visitor. The deferred numbers (audio N, dead-band/dwell, duck levels, wake-set radius/margin/cadence) will be set in one config by Epic 3's health-check.
- Plugin adapters stay self-drive-free: all audio and visual motion derives from sim/kernel state read at tick time — the no-self-drive and no-wall-clock rules bind both halves.
- The Epic 1 cleanup pass (Story 2.0) reshapes the renderer substrate this epic's visual work rides on: the cabinet shell becomes profiled, assembled geometry in a per-cabinet group — cabinet-kind volumes are collision/targeting/occlusion data only, never drawn, while room volumes stay box-built; the screen and marquee faces become the only emissive materials, the marquee is one line at a 0.09m cap (legible ~8m lit) while the on-screen NEXT row keeps its own 0.18m floor (the caps are split by law), and sRGB + ACES tone mapping land in the renderer entry with exposure bounds and cabinet light intensities re-derived under the tone curve (screen stays the brightest face) and re-pinned. New colour tokens live only in the token module.

## UX & Interaction Patterns

- The M1 visit narrative: door opens → daze → a sound occludes and reopens positionally around a pillar → attract glow caught over the pillar edge → NEXT plus Patron body drama says the machine is live → wait, take over at the break, or walk away. The muted variant must complete this end-to-end on glow and body language alone.
- The street-door loading beat gains its sound twin: attract sound spills through the closed door and swells as assets stream; the shipped visual twin (light-bleed, brightening glass, turning handle) covers muted and autoplay-blocked browsers. No progress bar, ever.
- Settings is reachable two ways: from the site page and by walking out the front door mid-session (the street-door view doubles as the exit view); re-entering costs queue position, never a forced reload.
- Zone hues stay lighting/material identity only — never wayfinding or UI chrome; every zone reads from fixtures and geometry with hue removed at 6m.

## Cross-Story Dependencies

- Story 2.0 runs first: the mouse-look extreme-yaw fix and the cabinet-shell profile rebuild (which re-pins exposure under the new tone mapping and retires an old shell part). Its renderer posture — emissive faces, ACES, split marquee/NEXT caps — is the substrate 2.3's light work is authored against.
- 2.1 rides Epic 1's shipped occluder collider set and attract law, and delivers the Audio Manager that 2.2's ladders and the deferred street-door sound swell both land on. 2.2 rides 2.1's manager and mix-state plumbing. 2.3 rides 2.0's renderer state and Epic 1's zone hues.
- 2.4 completes Epic 1's silent drag-look fallback by adding the look-source and remap rows; 2.5 hosts the browser-detection panel Epic 1 shipped, and its non-sighted claim text is written only from 2.6's spike outcome.
- 2.6 runs last and gates the epic: 2.4 and 2.5 must exist first, because the accessibility walk cannot happen without comfort presets and honest disclosures.
- Deferred out by design: every numeric threshold (occlusion dead-band + dwell, duck levels, audio channel N, wake-set numbers, reaction window, framerate floor) is set by Epic 3's health-check story, and the lints that will machine-police this epic's authored behaviors (flashes-rate probe, character lint, full dead-machine audit) land there too. Banter volume/mute and subtitle Settings rows arrive with banter in Epic 3.
