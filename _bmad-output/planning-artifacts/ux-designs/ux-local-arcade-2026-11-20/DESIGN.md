---
name: 'Local Arcade'
description: Visual identity for a walk-in 3D web arcade remembered from 1985 — warm recreation at memory-dusk, glow-lit, fiction-pure.
type: design
purpose: visual-identity
status: final
created: 2026-11-20
updated: 2026-11-20
sources:
  - '_bmad-output/brainstorming/brainstorm-local-llm-arcade-2026-11-18/'
  - '_bmad-output/planning-artifacts/ux-designs/ux-local-arcade-2026-11-20/imports/arcade-floor-plan.html'
  - '_bmad-output/planning-artifacts/briefs/brief-local-arcade-2026-11-18/brief.md'
  - '_bmad-output/planning-artifacts/prds/prd-local-arcade-2026-11-19/prd.md'
  - '_bmad-output/planning-artifacts/architecture/architecture-local-arcade-2026-11-19/ARCHITECTURE-SPINE.md'
colors:
  # Room envelope — the dim warm shell; light comes FROM the machines.
  room-black: '#15110E'
  wall-warm: '#2E241D'
  wall-panel: '#4A3628'
  carpet-base: '#221B27'
  carpet-pattern: '#3E3046'
  # Glow / neon anchors — lifted from the floor plan's zone language, adjusted
  # for in-scene legibility. violet/pink/green/orange/red match plan hexes exactly;
  # amber (plan #FFB84D) and cyan (plan #46E6FF) are tuned, not verbatim.
  glow-marquee: '#FFC46B'
  glow-pink: '#FF4FA3'
  glow-cyan: '#5BC8FF'
  glow-green: '#57E6A3'
  glow-violet: '#B07CFF'
  glow-orange: '#FF9A5C'
  glow-red: '#FF6B5E'
  glow-steel: '#7FB0C9'
  # In-world text surfaces.
  paper-card: '#F2E8D4'
  card-ink: '#2A241C'
  nameplate-brass: '#D8C48F'
  sign-chalk: '#E8E4DD'
  # Outside-fiction surfaces only (site page, settings). Never rendered in-room.
  # Ratios verified on ui-surface: ui-text 15.02:1, ui-muted 6.25:1, ui-accent 9.34:1.
  ui-surface: '#191919'
  ui-text: '#EDEDED'
  ui-muted: '#9A9A9A'  # role: hint and disabled text on ui-surface only, never body or state
  ui-accent: '{colors.glow-cyan}'  # focus/interaction cue; state must also change shape/position
  ui-border: '#2E2E2E'
  ui-focus: '#5BC8FF'
typography:
  marquee-title:
    fontFamily: 'Chakra Petch'
    note: 'Physical signage — cap height 0.18m on the marquee bar; legible to ~15m. Eurostile-flavored era display.'
  instruction-heading:
    fontFamily: 'Archivo Narrow'
    note: 'Printed card heading, x-height ≥ 20mm, set like an 80s operators sheet.'
  instruction-body:
    fontFamily: 'Archivo'
    note: 'Printed card body — x-height ≥ 12mm at 0.5m viewing (generous print, deliberately).'
  room-sign:
    fontFamily: 'Archivo Narrow'
    note: 'Painted/printed room signage, always-caps, cap height ≥ 60mm at 3m. Subtitle signs inherit the same floor.'
  nameplate:
    fontFamily: 'Spectral'
    note: 'Museum label voice — Hall of Models nameplates only; cap ≥ 30mm at 2m.'
  ui-heading:
    fontFamily: 'IBM Plex Sans'
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.25'
  ui-body:
    fontFamily: 'IBM Plex Sans'
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
rounded:
  cabinet: '0px'
  sm: '2px'
  card: '4px'
  ui-md: '6px'
spacing:
  eye-height: '1.60m'
  walk-speed: '1.4m/s'
  bob-amplitude: '±0.04m'
  cabinet-width: '0.60m'
  slot-pitch: '1.40m'
  aisle-min: '1.20m'
  gutter: '24px'
  '1': '4px'
  '2': '8px'
  '3': '16px'
  '4': '32px'
components:
  marquee:
    background: '{colors.room-black}'
    lettering: '{colors.glow-marquee}'
    radius: '{rounded.cabinet}'
  instruction-card:
    background: '{colors.paper-card}'
    ink: '{colors.card-ink}'
    radius: '{rounded.card}'
  room-sign:
    ink: '{colors.sign-chalk}'
    radius: '{rounded.sm}'
  nameplate:
    background: '{colors.room-black}'
    lettering: '{colors.nameplate-brass}'
    radius: '{rounded.sm}'
  welcome-flyer:
    background: '{colors.paper-card}'
    ink: '{colors.card-ink}'
    radius: '{rounded.sm}'
  report-claim-check:
    background: '{colors.paper-card}'
    ink: '{colors.card-ink}'
    radius: '{rounded.sm}'
  settings-page:
    background: '{colors.ui-surface}'
    text: '{colors.ui-text}'
    accent: '{colors.ui-accent}'
    border: '{colors.ui-border}'
    radius: '{rounded.ui-md}'
  ui-control-slider:
    track: '{colors.ui-border}'
    thumb: '{colors.ui-text}'
    target-min: '24px'
    thumb-to-track-contrast: '≥3:1'
  ui-control-toggle:
    off-track: '{colors.ui-border}'
    on-track: '{colors.ui-accent}'
    state-cue: 'position + shape, never color alone'
    target-min: '24px'
  ui-focus-ring:
    ring: '{colors.ui-focus}'
    ring-contrast: '≥3:1 against ui-surface'
---

## Brand & Style

**Warm recreation, glow-lit.** The arcade from the memory, at memory-dusk: the room itself is dim — dark ceiling, warm walnut walls, wood panel wainscot, deep-pattern carpet — and the light in the room comes *from the machines*. Marquees, attract screens, and cabinet glow halos are the light sources; the room's brightness is literally the aliveness of its cabinets. "Motion, light, and sound are life systems, not decoration" — visually that means a healthy room glows and a still frame never reads as a paused video.

Style posture: **stylized-real**, never photoreal. Era-faithful forms, materials, and clutter rendered in clean geometry with authored texture — chosen to survive the ≤60s worst-case load ceiling and the <8MB informative payload budget, and to keep every frame renderable at playable framerate (the screenshot test is judged "at playable framerate, not a rendered poster").

The fiction is the brand: **found, never announced**. No HUD, no markers, no modern UI inside the room; type and signage inside the room are *physical artifacts* (marquees, printed cards, painted signs), each carrying the era's print voice. The arcade never breaks character: model names appear only on Instruction Cards and Hall of Models nameplates.

Zone hues are authored identity anchors, lifted from the floor plan's zone language (adjusted for in-scene legibility, not verbatim): Pinball Corner violet, Snack Bar orange, Workshop steel, Casual Alley green, empty-stretch/roadmap amber, glow-red at the door — used as light and material identity per zone, never as UI chrome. **Every zone must also read from its fixtures and geometry at 6m with hue removed** (pinball side-profile silhouettes, counter + tip-jar shape, bench and crates, the kept-clean bare wall); color-blind check at the M1 walk.

## Colors

The palette is a *lighting* palette. Everything is judged against the dim warm envelope.

- **Room Black (`#15110E`)** — ceiling and unlit wall height. The dark the glow sits against; never flat screen-black.
- **Wall Warm (`#2E241D`) / Wall Panel (`#4A3628`)** — the lit upper wall and the wood wainscot; warm walnut, scuffed at kick-height where a real arcade would be.
- **Carpet Base (`#221B27`) / Pattern (`#3E3046`)** — near-black plum with a quiet 80s geometric pattern; loud-era carpet pattern rendered at low contrast so the carpet grounds the room instead of competing with cabinets. `[ASSUMPTION: pattern motif is a low-contrast octagon/weave; era loudness lives in the cabinets, not the floor.]`
- **Glow anchors (`glow-marquee`, `glow-pink`, `glow-cyan`, `glow-green`, `glow-violet`, `glow-orange`, `glow-red`, `glow-steel`)** — the hues of marquees, attract halos, and zone lighting. They are the saturated colors in the room, and they come *from machines and zone fixtures*, never painted on walls as decoration. Five match plan hexes exactly; amber and cyan are tuned brighter.
- **In-world contrast floors (flat-token pairs, verified):** paper-card on card-ink 12.63:1; sign-chalk on room-black 14.82:1. Scene-rendered legibility rides the lighting law, not these numbers: **every text surface receives ≥50 lux at its plane from machine light** `[ASSUMPTION: 50 lx starting floor; verify at M1]`. A **legibility lint** (size table × distance × lux) joins the character/aisle lint family.
- **Flash ceiling (photosensitivity law):** no authored element flashes more than 3 times per second; CRT flicker is era-flavor rendered as phase-shifted low-frequency motion, never decoration. The "calm cabinets" settings tier slows attract tempo — cabinets keep moving and glowing (the liveness law survives); only tempo changes.
- **Paper Card (`#F2E8D4`) / Card Ink (`#2A241C`)** — instruction cards, the welcome flyer, the report claim-check: aged paper cream, warm-black print. The only "white" surfaces in the room, and only as paper.
- **Nameplate Brass (`#D8C48F`)** — museum voice, Hall of Models only.
- **Sign Chalk (`#E8E4DD`)** — painted room signage and room-sign subtitles.
- **UI trio (`ui-surface`, `ui-text`, `ui-muted`)** — outside-fiction surfaces only (site page, settings). `{colors.ui-accent}` borrows the room's cyan glow so the plain page still feels related — but no other token crosses the fiction boundary.

Avoid: pure white or pure black fills, wall-painted neon decoration, photoreal grunge/scan textures, any chromatic color in the room that isn't light-from-a-machine.

## Typography

In-room type is physical signage, not interface type; sizes are world-scale and legibility is a design law. The minimums are authored in the frontmatter notes (marquee cap 0.18m to ~15m; card body x-height ≥12mm at 0.5m; room-sign cap ≥60mm at 3m; nameplate ≥30mm at 2m) and enforced by the legibility lint. Swap candidates for any provisional face must pass that table, not just the era-voice lint.

- **Chakra Petch** (marquee-title) — Eurostile-flavored era display for game names on marquees. `[ASSUMPTION: exact face is provisional; must be free-license and era-flavored — swap candidate is Saira Condensed.]`
- **Archivo Narrow / Archivo** (instruction-heading/body) — the printed operators-sheet voice: dense, squared, honest. Attribution text lives here and on nameplates — nowhere else in the room.
- **Archivo Narrow caps** (room-sign) — painted/printed signage voice: zone labels at door height, the welcome flyer, report-fixture signage.
- **Spectral** (nameplate) — the one serif moment, museum labels on the Hall of Models row; "museum, not guessing."
- **IBM Plex Sans** (ui-heading/ui-body) — outside-fiction pages only. Deliberately plain: the Settings page is a workbench, not a set piece.

Marquee lettering shows the game title only (`Manifest.title`) — never model names, never taglines in the room.

## Layout & Spacing

The room, not the viewport, owns layout. Scale anchors (world units; `spacing` tokens above): eye height 1.60m, stand-up cabinet footprint ~0.60m wide, Wall Slot pitch ~1.40m, aisles never narrower than 1.20m (aisle-nav lint enforces walkability). `[ASSUMPTION: derived from the floor plan's 40-unit tile ≈ 0.7m; room interior lands ≈ 19m × 12.5m — deliberately too big to take in at once, and sized to keep 50-cabinet scale honest.]`

- The room skeleton lives in EXPERIENCE.md · Information Architecture (one source of truth): front door, occluder pillars, fixed zones, wall-slot walls. The plan itself: `imports/arcade-floor-plan.html`.
- **Sightline budget:** every Cabinet's marquee or attract screen must be visible from ≥2 positions on the main circulation loop — a *sightline lint* seats beside the aisle-nav lint. `[NOTE FOR ARCHITECTURE: may tighten AD-10 placement rules at the next spine update.]`
- Depth reads through light falloff and occlusion, not interface layering.
- Outside-fiction pages use a plain single-column layout, generous `4`-gaps between settings groups; they are utility, kept out of the fiction.

## Elevation & Depth

Depth is *atmospheric*, never card-shadow. In-room: attract glow halos and marquee light fall off through a faint dust-haze; the occluder collider set that occludes sound also carves visible depth (one geometry, one truth — AD-7). **The sharing is asymmetric for light: glow gets authored spill.** Light bleeds around occluder edges, sheens along the floor, and bounce-cones off the ceiling, so proximity still reads as a visual gradient even where sightlines are broken — diegetic, era-true (arcades glowed through haze), and it is what makes the attract-graphics rung work alone for Deaf/HoH visitors. Distant machines dim toward Room Black but never read dead (liveness tiers are invisible: visible ⇒ always awake and glowing). On outside-fiction pages: flat surfaces, 1px `{colors.ui-border}` borders; shadows stay at zero.

## Shapes

Hard corners dominate: `{rounded.cabinet}` (0) for cabinet shells, screens, and bezels — 80s cabinets are boxes, softened only by wear, never by radius. Paper surfaces carry `{rounded.card}` (4px) — a real card's corner. Only outside-fiction UI uses `{rounded.ui-md}`. No pills, no circles-as-surfaces.

## Components

- **Marquee** — `{colors.glow-marquee}` (or the game's own art-lit variant) lettering of `Manifest.title` on a dark cabinet-top bar; lit from within; never smaller than authored cap height. Game name only.
- **Cabinet** (stand-up | sit-down shells) — `{rounded.cabinet}`; both standard models always glowing, always performing.
- **Cabinet screen** (Core-owned surface treatment) — attract/score/NEXT all render here. Score table set in `instruction-heading` scale rules (screen type, era-CRT voice, no paper stock); the **NEXT** signal at the marquee's authored minimum, legible from across the room; fault fallback keeps marquee + screen motion alive. Screen glows are the machine's own hue family.
- **Instruction Card** — `{colors.paper-card}` sheet behind the coin door; heading + rules + attribution (the only in-room attribution surface besides nameplates). Matches its plan in the Workshop drawer (card↔drawer pairing). Print budget: one rule per line, capped length — era operators' sheets were terse anyway.
- **Nameplate** — `{colors.nameplate-brass}` on Room Black; Hall of Models rows only; names the model.
- **Room-sign** — `{colors.sign-chalk}` painted/printed voice: zone labels at door height, banter subtitle signs, report-fixture signage. Appears only as physical signage stock at fixed authored positions; never floats, never overlays the view.
- **Welcome Flyer** — a stapled era flyer on the wall by the front door; `{colors.paper-card}` stock carrying the control list as in-world paper. The single sanctioned "announcing" artifact, whitelisted as a room-sign surface for character lint.
- **Report claim-check** — a small paper card at the Cabinet ("something's wrong with this machine") in instruction-card stock; its own staging state; offers download + submit.
- **Workshop bench & staging** — chalk outline → bare skeleton + work light → art-on with TESTED tag → stenciled crate. These read build truth, so they get worn-paper and honest-material treatment, never gamey props.
- **Tip Jar / Counter** — Snack Bar fixtures in warm wood + glass, catch-light orange.
- **Settings page** — `{components.settings-page}` + `ui-control-*` tokens; plain, functional, deliberately not era-styled (outside-fiction honesty).

## Do's and Don'ts

| Do | Don't |
|---|---|
| Let cabinets be the light sources | Paint glow on walls as decoration |
| Stylized-real geometry with authored texture | Photoreal textures / scan grunge (load budget, and it ages into uncanny) |
| Paper cream for in-world print surfaces | Pure white surfaces in the room |
| Marquees carry only the game name | Model names, badges, or "AI-built" tags on any marquee or sign — out forever |
| Era-print voice inside the room | Modern UI typefaces, icons, or chrome in the room |
| Zone hues as lighting/material identity per zone | Zone hues as UI accents or wayfinding |
| Every visible cabinet glowing and moving, always | Any cabinet that reads dark or still (Dead Machine by law) |
| Fiction-pure room; honesty pages outside it | HUD, crosshair, waypoints, minimap, tooltips — anywhere in-room |
