# Epic 2 Context: Find It by Ear — The Room Is Alive Around You (M1)

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

The full pull ladder works with zero UI hints: occluded spatial sound → attract graphics → Patron intensity. A visitor drifts toward a sound around a pillar, catches the attract glow, and sits down. The epic's release boundary is the M1 human walk: both SM-1 variants (normal audio AND master-muted) pass within 60s of first-person control, with Deaf/HoH and low-vision testers as mandatory participants, plus a sound-only non-sighted spike whose outcome is reported honestly.

## Stories

- Story 2.0: Epic 1 Deferred Cleanup (mouse-look extreme-yaw flip; stand-up cabinet shell rebuild)
- Story 2.1: Core Audio Manager — attract sound that occludes and swells
- Story 2.2: The proximity ladder and the seated focus mix — "tuned in"
- Story 2.3: Light spill and atmospheric depth — the graphics rung works alone
- Story 2.4: The Settings page — comfort presets on at first visit
- Story 2.5: The site page and honest disclosures
- Story 2.6: The M1 walk — SM-1 in both variants, honestly measured

## Requirements & Constraints

- The soundscape IS the seek system: attract audio is spatialized and occluded by room geometry so a machine is locatable by ear alone; moving behind a pillar changes what is heard, positionally. Never ambience padding, never UI beeps.
- Mix ladder is fixed: at the doorway only the nearest machines read clearly; approaching swells one machine; seated, the room collapses around that machine with all others ducked to an authored near-silent floor ("tuned in").
- Occlusion/proximity transitions use hysteresis (dead-band + dwell) implemented as a pure tick function, so standing at a boundary never flips audio per tick. The numeric values are placeholders this epic — they are finally set in Epic 3's room-audit story; behavior must still be verifiable by ear at the walk.
- The entire mix derives only from kernel tick state (positions, camera, occupancy) — never wall-clock — so a replay reproduces the identical mix. All duck levels are authored data.
- No Dead Machines law is re-measured: the M1 walk spot-checks random frames against the placed Cabinet.
- Accessibility floor binds release: comfort preset ON at first visit (seeded by OS prefers-reduced-motion); flash ceiling ≤3/sec per authored element (machine probe arrives Epic 3); Settings and site pages meet WCAG 2.2 AA (24px targets, visible focus ring ≥3:1, toggle state cued by position + shape, never color alone).
- Fiction-pure: no HUD, prompts, or UI in-room; Settings and site page live outside the fiction. Settings rows are M1-scoped only — no banter/subtitle rows yet (that feature doesn't exist until Epic 3).
- Desktop only: mouse-look + WASD + single E verb, pointer-lock; evergreen Chrome and Edge are the CI-enforced browser matrix.

## Technical Decisions

- Exactly one Core Audio Manager owns the WebAudio graph; games supply assets and requests only and may never create their own audio nodes (L0-banned). Spatialization via PannerNode plus distance attenuation; occlusion is a raycast against the dedicated occluder collider set in `core/room/` — the same geometry serves sound and sightlines (AD-7). Single-ray occlusion first; soft multi-ray explicitly deferred.
- Attract-sound assets are authored recipe JSON in each game's own assets folder (sample rate, loop length, waveform, gain, notes). The build-time registry generator validates each recipe and embeds it inline in the generated game registry — an invalid recipe fails generation naming the offending entry, and the registry stays byte-identical drift-pinned. The runtime takes audio only from the generated registry and synthesizes it there: no audio file fetch and no outbound call, so the sealed-bundle law stays intact.
- Channel budget = distance-cull + nearest-N, operating inside the liveness awake set (occupied ∪ near-radius ∪ frustum+margin); audible ⇒ awake; wake/sleep stay pure tick-state functions.
- Room geometry (conventions row amended 2026-11-26): `core/room/` owns one AABB volume list (`{id, min, max, blocksMovement, targetable, kind}`) as the single source for movement blocking, targeting, the occluder set, and visual extrusion of room volumes (wall, pillar, door, street) only. `kind: 'cabinet'` volumes are collision/targeting/occlusion data and are NEVER extruded; a Cabinet's visual is authored shell data in `core/room` — SHELL records plus profiled extruded assemblies in a per-cabinet group — with the silhouette inside the volume AABB except the open coin door and side-art decals.
- Story 2.0 rebuilds the stand-up shell from owner-authored SIDE_PROFILE/INNER_PROFILE polygons extruded via ExtrudeGeometry (room stays box-only), assembled in a per-cabinet local-frame group placed by placementGeometry + exported closedYaw, with screen / control-panel / marquee / speaker-grille / coin-door-frame / contact-shadow assemblies. Hard guarantees: cabinetAABB, collisionVolumes, the 0.60×0.60 footprint, screen dimensions, coin-door poses/meshes, placements, attract phase law, screen-draw functions, games/, core/contract/, and kernel tick stay byte-identical. Budgets: ≤1500 triangles and ≤30 meshes per cabinet, geometries/materials shared across cabinets, per-cabinet textures only for screen/marquee/side-art/overlay, part counts computed from the part list. Emissive on exactly 2 materials per cabinet (screen face, marquee face). New color tokens live in tokens.ts only (hex-outside-tokens scan stays green). sRGB + anisotropy + ACES tone mapping land in main.ts, with exposure bounds and cabinet light intensity re-derived under the tone curve (screen stays the brightest face) then re-pinned. Test laws are narrowed, never deleted; 8 new verification tests run in Node against real three.js; 4 evidence screenshots to implementation-artifacts/evidence/.
- DW-24: fix the mouse-look floor-flip at extreme yaw in Core player look math (yaw wrap / pitch clamp), pinned by a falsifiable extreme-yaw test.
- Typography split (current values): marquee lettering is ONE line at cap 0.09 m, emissive-lit from the in-body marquee face centred ~1.71 m, legible ~8 m lit; the on-screen NEXT row keeps its own independent 0.18 m minimum. Shapes reinterpretation: hard corners means flat plywood panels with sharp edges (no fillets), the upright reading its profiled side silhouette (toe-kick recess, sloped control panel, recessed leaning screen, marquee overhang); physical era hardware seen round (button caps, joystick ball-top) is exempt. Cabinet hardware material tokens (near-black vinyl panels, T-molding, metal, button caps) are the darkest fills allowed — surfaces lit by the machine, never light sources.

## UX & Interaction Patterns

- Pull-ladder rung 2 must work alone: glow gets authored spill around occluder edges (bleed, floor sheen, ceiling bounce-cones) and falls off through faint dust-haze, so the visual proximity gradient survives exactly where sound is occluded. Distant machines dim toward Room Black but never read dead; liveness tiers are invisible.
- All color in the room is light-from-a-machine; zone hues are lighting/material identity only, never wayfinding chrome.
- The street-door loading beat gains its sound twin: attract sound spills through the closed door and swells as assets stream; the already-shipped visual twin covers autoplay-blocked/muted browsers.
- Settings page: outside-fiction workbench voice, single column, ui-* tokens only; rows are look sensitivity, master volume, focus-mix strength, comfort preset (off/low/full), FOV, vignette, "calm cabinets" attract-tempo tier (tempo only — cabinets keep moving), input remap + look-source (mouse-look / drag-look / arrow-key), reset. Choices persist per browser; input mappings and presentation accommodations are device-layer only and never fork a run. Reachable from the site page AND by walking out the front door (mid-session remedy costs queue position, never a forced reload).
- Site page: entry, controls list, workbench disclosure block (mouse/keyboard, first-person, stereo central, bright moving lights, desktop-only, English-only v1), repo issue link, skip-link to Settings, unsupported-browser detection before the canvas, entry label on the canvas for assistive tech. Plain declarative voice; the non-sighted-completion claim is made only after the walk spike, verbatim per outcome.

## Cross-Story Dependencies

- Story 2.0 must land first: 2.1–2.2 audio depend on its byte-identical collision/occluder guarantees; 2.3 and the 2.6 walk depend on the rebuilt shell, the 0.09 m marquee, and the tone-curve re-derivation.
- 2.1 (occlusion) precedes 2.2 (proximity/focus mix), which layers on the same mix pipeline.
- Settings and site page (2.4, 2.5) must exist before the M1 walk (2.6) — comfort presets and disclosures are walk preconditions; the 2.6 spike outcome feeds back into 2.5's honest claim/disclaimer.
- Deferred numeric thresholds (hysteresis values, channel budget, duck levels, wake-set radii) land in Epic 3's audit story; L2 machine lints (flashes-rate, character) also arrive Epic 3. Banter/subtitle surfaces are Epic 3.
- Epic 1 already shipped: room + occluder data authored, the visual readiness twin, and the stand-up shell that 2.0 rebuilds. The M1 human walk is the epic's release gate.
