# Validation Report — Local Arcade

- **DESIGN.md:** `_bmad-output/planning-artifacts/ux-designs/ux-local-arcade-2026-11-20/DESIGN.md`
- **EXPERIENCE.md:** `_bmad-output/planning-artifacts/ux-designs/ux-local-arcade-2026-11-20/EXPERIENCE.md`
- **Run at:** 2026-11-20 (lenses: rubric walker + accessibility)

## Overall verdict

The pair is a coherent, mostly extractable contract — tokens all carry hex, required sections present, architecture/PRD cross-refs resolve; consumable after a short fix pass (rubric: 0 critical, 1 high, 7 medium enumerated, ~10 low). The accessibility lens materially shifts the picture to **conditional pass**: two guarantees are asserted but not authored, and one exclusion is silent where the brand is otherwise relentlessly honest. Blocking items — ACC-1 (non-sighted honesty + spike), ACC-2 (occluder law vs rung-2 discovery), H-4 (site-page disclosure), V-4/VE-1 (legibility & motion baselines), SET-1 (ui-control tokens) — are now resolved in the spines; the remainder landed as authored values with named test gates.

## Category verdicts (rubric)

- Flow coverage — adequate
- Token completeness — adequate
- Component coverage — adequate
- State coverage — adequate
- Visual reference coverage — adequate (mockups pending by design)
- Bloat & overspecification — strong
- Inheritance discipline — adequate
- Shape fit — strong

## Findings by severity

### Critical (2)

**[Accessibility ACC-1] — Non-sighted visitors: silent exclusion both directions** (EXPERIENCE · Accessibility Floor / Foundation / IA). A screen-reader user gets nothing from the canvas; the room's core mechanic is auditory, yet no non-visual path is provisioned *or* honestly disclaimed. Fix applied: Accessibility Floor honesty bullet (audio nav may work without sight; visual surfaces have no non-visual alternative v1; UJ-1 end-to-end non-sighted = unproven, gated spike at M1 walk); site-page disclosure line; `<canvas>` entry label + skip-link to Settings.

**[Accessibility ACC-2] — "No sound-only gating" is false by construction: occluder law deletes rung 2 where rung 1 works** (EXPERIENCE · Accessibility vs Soundscape "what blocks the ear blocks the eye" + pillars breaking sightlines on purpose). A Deaf visitor has no sound leading them to the pillar gaps. Fixes applied: authored **light spill** (glow bleeds around occluders, floor sheen, ceiling bounce — diegetic, keeps one-geometry law) in DESIGN · Elevation & Depth; **sightline budget** — every Cabinet's marquee/attract screen visible from ≥2 positions on the circulation loop, seated as a sightline lint alongside aisle-nav lint; HoH bullet downgraded to a gated commitment (M1 walk with Deaf/HoH tester, master muted, reach a playable cabinet in 60s); visible NEXT at authored minimum size.

### High (8)

**[Rubric §4] — Street-door view has no failure states** (load failure/asset timeout, WebGL-unsupported/underpowered, pointer-lock denial) despite load being PRD's make-or-break. Applied: three State rows — the fiction boundary answers with a plain outside-fiction page (workbench voice); pointer-lock denial falls back to drag/arrow look (see MOT-1).

**[Accessibility MOT-1] — Pointer-lock mandatory, no remap, no look alternative, no denial fallback.** Applied to Settings spec: key remap (WASD/E), look-source selector (mouse-look / arrow-key / drag-when-denied), mouse sensitivity. Replay-safe: input mapping is device-layer (the contract's own seam — "the physical device layer never leaks into a Game").

**[Accessibility VE-1] — Motion comfort has no baselines: presets relative to nothing.** Applied: authored baseline tokens (walk 1.4 m/s, capped yaw, bob amplitude) `[ASSUMPTION: provisional floors]`; comfort preset **ON at first visit**, seeded by OS `prefers-reduced-motion`; FOV + optional vignette added (post-process — fiction-pure law doesn't see it); L3 walk gains a vestibular test.

**[Accessibility VE-2] — No flash/photosensitivity ceiling despite the always-glowing law.** Applied to DESIGN: no authored element flashes >3×/s; CRT flicker is era-flavor at phase-shifted low frequencies; "calm cabinets" settings tier slows attract tempo (liveness law survives).

**[Accessibility SET-1] — Settings page promises controls, spec has zero form-control tokens behind its AA claim.** Applied: `ui-control` component family — slider (thumb-to-track ≥3:1), toggle (state by shape/position not color), `ui-focus` ring token (≥3:1), target sizes ≥24px, `ui-muted` role scoped to hint/disabled text.

**[Accessibility SET-2] — No mid-session return path to Settings; remedy costs a ≤60s reload.** Applied: **exit beat** — walk out the front door → street-door view (room sound fading back inside) → same page carries the Settings link; new IA row. Era-true, no new surface; Personal Bests persist, queue position is the only cost.

**[Accessibility H-4] — Site page never discloses entry demands.** Applied: workbench-voice disclosure block — "Needs mouse + keyboard. First-person movement. Stereo sound central. Bright moving lights. Desktop browser only. English only, v1."

**[Accessibility QA-1] — SM-1's release gate is gated on hearing.** Applied: SM-1 defined in two variants — rung-1 (normal audio) and rung-2-only (master muted) — both required at L3 walk; Deaf/HoH and low-vision testers are mandatory participants.

### Medium (16)

- **[Accessibility V-1]** Identity anchors (gong, SPIKE CHILLER, kick-drum, clink) are audio-only signatures. Applied: each named sound gets an authored visual signature (striker arm mid-swing, title screen, coin flash) — one clause each.
- **[Accessibility V-2]** Subtitle-sign physics unbounded (size, dwell, occlusion, stations). Applied: banter beats staged at fixed stations visible from the circulation loop; min cap-height from the legibility table; dwell ≥ read-time; re-approach re-displays for remaining duration.
- **[Accessibility V-3]** Zone hues collapse under protanopia/deuteranopia (red/orange/amber). Applied: DESIGN law — every zone must read from fixtures/geometry at 6m with hue removed (pinball silhouettes, counter shape, bench/crates, bare kept wall); color-blind check at M1 walk. No palette change.
- **[Accessibility V-4] / [Rubric §2]** Legibility circularity + no in-world contrast targets. Applied: DESIGN legibility table — card body x-height ≥12mm @0.5m, room-sign cap ≥60mm @3m, nameplate ≥30mm @2m, marquee 0.18m kept; text surfaces receive a minimum lux from machine light `[ASSUMPTION: N=50 lx starting]`; flat-pair ratios recorded (card 12.63:1, sign-on-black 14.82:1); legibility lint joins the character/aisle lint family.
- **[Accessibility SET-3]** "No alternate experience fork" could block future accommodations. Applied: clarified — identical world state and seeded behavior; input mappings and presentation accommodations are device-layer, not a fork.
- **[Accessibility SET-4]** Mix controls incomplete/conflated. Applied named rows: look sensitivity · master volume · banter volume · focus-mix strength · comfort preset (off/low/full).
- **[Accessibility COG-1]** Rules-to-play requires reading dense cards; deterministic-room cognitive assets unclaimed. Applied: **learn-by-watch law** (a Game's rules must be learnable from its attract/autoplay loop — a registration-gate requirement); Card print budget (one rule per line, capped length); "quiet room" settings tier (banter density).
- **[Rubric §2]** `{colors.settings-page}` unresolvable reference → fixed to `{components.settings-page}`.
- **[Rubric §3]** Component-name drift across spines (Report Claim-Check / Report fixture / claim-check card, etc.) → names unified: `report-claim-check`, `cabinet`, `workshop-bench`, used verbatim in both files.
- **[Rubric §3]** Snack Bar fixtures lack a behavioral row → added (ordering IS the BMC click, crypto links as top-level navigations, offer-not-confirmed per AD-22).
- **[Rubric §3]** Score table / NEXT have no visual row → DESIGN gains cabinet-screen surface treatment (Core-owned; type role, NEXT at authored minimum, screen-palette rules).
- **[Rubric §7]** "Hues kept verbatim from the floor plan" false for 2 of 7 (amber/cyan adjusted to deck values; Workshop's steel `#7FB0C9` untokened; green misattributed to Workshop) → provenance honestly restated ("lifted… adjusted for in-scene legibility"), `glow-steel` token added for Workshop, Casual Alley owns the green.
- **[Rubric §7]** UJ titles not verbatim → flow headings now carry PRD titles with the retitle as subtitle.
- **[Rubric §3]** `room-sign` lacks anatomy/behavioral rows → added both (material, appearance rules, subtitle timing per V-2).
- **[Rubric §4]** Score-table first-visit empty state unnamed → named (Patron runs only until a Personal Best exists).
- **[Rubric §4]** Settings persistence unstated → choices persist per browser (localStorage), reset-to-defaults added (L-1 folded).

### Low (selected, applied)

Flow 3 protagonist named — **Josh ships Game #4** `[ASSUMPTION: the builder and Josh are one person; UJ-1 says "his own arcade"]`; FR-13 donation gets a short Flow 6 (M5); settings-page borders get `ui-border` token; room-skeleton duplication reduced to one home (EXPERIENCE) + reference (DESIGN); mockup links will move beside their sections at Finalize; prose uses glossary "auto-play session" outside hook-name contexts; face swaps must pass the legibility table, not just era-voice lint; English-only honesty line on site page; ui-accent role specified (never state-only).

## Reviewer files

- `review-rubric.md` — 0 critical, 1 high, 7 medium (8 claimed), ~10 low
- `review-accessibility.md` — 2 critical, 7 high, 9 medium, 5 low
