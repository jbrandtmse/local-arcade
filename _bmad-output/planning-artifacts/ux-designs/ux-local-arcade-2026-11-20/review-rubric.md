# Spine Pair Review — Local Arcade

## Overall verdict

The pair is a coherent, mostly extractable contract: DESIGN.md tokens all carry hex values, EXPERIENCE.md honors every required section, and cross-references into the PRD and architecture spine (AD-7, AD-24, FR refs, SM-1, OQ-3) all resolve. No criticals; the spine pair is consumable after a short fix pass. One high finding — the street-door cold-load has no failure/unsupported-environment states despite the PRD calling load time the make-or-break — and eight mediums (a broken `{colors.settings-page}` reference, missing contrast targets for in-world combinations, component-name drift across the two spines, an unproven "hues kept verbatim from the floor plan" inheritance claim, non-verbatim UJ titles, and behavioral/visual spec gaps for Snack Bar and the score table). `mockups/` absence is treated as pending per gate note (scheduled at Finalize).

## 1. Flow coverage — adequate

Extracted from frontmatter sources: PRD §2.3 defines UJ-1 (Josh), UJ-2 (Ray), UJ-3 (the builder); FR-18 (run reporting, 2026-11-20 owner requirement) and the accessibility floor are the other journey-shaped commitments. EXPERIENCE.md Key Flows: Flow 1→UJ-1, Flow 2→UJ-2, Flow 3→UJ-3, Flow 4→FR-18, Flow 5→accessibility. All three UJs and FR-18 have numbered steps and a marked **Climax** beat; Flow 1 carries an explicit failure path, Flow 3 embeds its failure (gate red → registration refuses) in step 1, Flow 4's failure (offline submit) lives in State Patterns.

### Findings
- **low** Flow 3's protagonist is unnamed ("the builder"), where Flows 1/2/4/5 name theirs (Josh, Ray, Dana, Kenji) (EXPERIENCE.md §Key Flows, Flow 3). *Fix:* invent a builder protagonist name the way Dana/Kenji were invented, tag `[ASSUMPTION]`, and log in memlog.
- **low** FR-13 / M5 donation (Snack Bar) is the one in-scope journey-shaped requirement with no Key Flow; its beats (order a coffee = the BMC click, tip-jar clink, offer-not-confirmed) appear only as IA row, Voice lines, and one State row (EXPERIENCE.md:37, 55, 88). *Fix:* either add a short Flow 6 (donation in character) or state in the State Patterns row that the donation journey intentionally has no journey flow because v1 stages it as offer-only.

## 2. Token completeness — adequate

Extracted all frontmatter tokens: 17 colors (all hex except `ui-accent` → resolves through `{colors.glow-cyan}` to `#5BC8FF`), 7 typography roles, 4 rounded, 10 spacing, 7 components (all component token refs resolve). Every `{path}` reference in EXPERIENCE.md (`{colors.glow-violet}`, `{colors.glow-orange}`, `{colors.glow-green}`, `{colors.glow-marquee}`) resolves to a defined DESIGN token. No light/dark pairs required (single-mode fiction world; outside-fiction trio is dark-only by design) — defensible.

### Findings
- **medium** `{colors.settings-page}` in DESIGN.md Components body is an unresolvable reference — there is no `colors.settings-page` token; the tokens live under `components.settings-page` (DESIGN.md:174). *Fix:* rewrite to `{components.settings-page}` (or inline the three ui-* tokens). This is the only broken `{…}` reference in the pair.
- **medium** No contrast target stated for any load-bearing in-world combination: `paper-card`/`card-ink`, `sign-chalk` on Room Black, `glow-marquee` lettering on `room-black`, `nameplate-brass` on `room-black`. WCAG 2.2 AA is committed only for outside-fiction pages (EXPERIENCE.md:115). Downstream code mirrors the spine and will need a number or an explicit authored-test rule. *Fix:* add a per-pair minimum contrast (or a "legible at authored distance by L3 walk" named seat) to DESIGN.md Colors and name the marquee/sign/card authored minimums as numeric world-space sizes.
- **low** In-room typography roles (`instruction-heading/body`, `room-sign`, `nameplate`) carry only `fontFamily` + prose note; the "authored minimum legibility" is numeric only for the marquee (cap height ≈ 0.18m) (DESIGN.md frontmatter:43-54, EXPERIENCE.md:115). *Fix:* give card/sign/nameplate their authored minimum cap or x-height at viewing distance, tagged `[ASSUMPTION]` where provisional.
- **low** Outside-fiction borders are "1px `{colors.ui-surface}`-lighter" with no token or hex defined (DESIGN.md:158). *Fix:* define a `ui-border` color token with hex.

## 3. Component coverage — adequate

Extracted component names from both spines: Marquee, Cabinet shells/instance, Cabinet screen, Instruction Card + coin door, Nameplate, Room-sign, Welcome Flyer, Report Claim-Check / Report fixture, Workshop staging objects / desk & bench, Tip Jar / Counter, Settings page. DESIGN.md Components has visual rows for 9; EXPERIENCE.md Component Patterns has behavioral rows for 9 (real rules — modes, precedence, staging ladders — not one-word descriptions).

### Findings
- **medium** Component names drift between the two spines and even within one file: "Report Claim-Check" (DESIGN frontmatter + Components) vs "Report fixture" (EXPERIENCE Component Patterns + IA) vs "claim-check card" (EXPERIENCE State Patterns); "Cabinet shells" (DESIGN) vs "Cabinet instance" (EXPERIENCE); "Workshop staging objects" (DESIGN) vs "Workshop desk & bench" (EXPERIENCE). Source-extraction cannot mechanically join a visual spec to its behavioral spec (DESIGN.md:100-101, 171-172; EXPERIENCE.md:38, 67, 72, 74). *Fix:* pick one name per component (suggest the frontmatter kebab-case stem: `report-claim-check`, `cabinet`, `workshop-bench`) and use it verbatim in both files' rows.
- **medium** Snack Bar fixtures (Tip Jar / Counter / attendant) have a visual row in DESIGN.md ("Tip Jar / Counter", 173) but no Component Patterns row in EXPERIENCE.md — the FR-13 interaction rules (ordering a coffee *is* the BMC click, crypto links as top-level navigation, offer-not-confirmed staging per AD-22/AD-25) live only in Voice-and-Tone and one State row. A story-dev for M5 gets no behavioral pattern table row to implement. *Fix:* add a "Snack Bar counter / attendant" row to Component Patterns.
- **medium** The Core-owned score table and the NEXT attract signal have no visual spec row in DESIGN.md (the "Cabinet screen" row in EXPERIENCE.md:71 is behavioral only; "Cabinet shells" says only "always glowing"). Score table layout/ink/type role and the NEXT lettering are unscoped, and AD-16 makes the score table Core-owned — i.e., the room's UI, not each game's. *Fix:* add a DESIGN.md Components row for attract/score/NEXT screen treatment (which typography role, `paper`-free or screen palette, where the table sits).
- **low** `room-sign` has frontmatter tokens and a Typography treatment but no anatomy row in DESIGN.md Components, and no behavioral row in EXPERIENCE.md Component Patterns (subtitle-as-sign behavior is spread across Settings row + Accessibility). *Fix:* add a room-sign row to each (material, when it appears, subtitle timing).
- **low** Nameplate has a DESIGN visual row but no EXPERIENCE behavioral row (nameplate text generated from Manifest attribution, AD-24 — unused in the behavioral contract). *Fix:* one-line behavioral row or explicit "visual-only" mark.

## 4. State coverage — adequate

Walked all ten IA surfaces for applicable states (loading/cold-load, empty, first-visit/return, fault, offline, distant/idle, offer-staging). Covered: Loading (street view), First visit, Return visit, Empty Wall Slot, Faulted cabinet, Offline/report-submit-fails, Distant machines (wake-set), Donation offer. This maps cleanly onto AD-15 (fault fallback), AD-26 (replay, report failure), AD-27 (liveness tiers).

### Findings
- **high** The Front-door street view — the product's make-or-break per PRD §6 — has no failure states: load timeout/asset failure ("the door opens when the room is ready" is the happy path only), WebGL-unsupported or underpowered browser, and pointer-lock denial (pointer-lock is stated *required*, EXPERIENCE.md:173, with no treatment when the browser denies or lacks it). All three are fiction-boundary questions ("never shown" progress bar is decided; what the door does when the room *never* opens is not), and story-dev for M0 would have to invent them. *Fix:* add State rows for load-failure, unsupported-browser, and pointer-lock-denied — even if the answer is "a plain outside-fiction page appears at that boundary" (which the fiction-purity law makes easy to justify), commit it.
- **low** First-visit empty state of a Cabinet's score table (no Personal Bests yet — Patron runs only) is implied by "no fake strangers" (EXPERIENCE.md:71) but never named as a state. *Fix:* one clause in the Cabinet screen row or Return-visit row.
- **low** Settings page: no persistence/restore state (do motion/audio/subtitle choices survive across visits? presumably localStorage, never stated) (EXPERIENCE.md:75, 112). *Fix:* one line in the Settings row.

## 5. Visual reference coverage — adequate (mockups pending by design)

`imports/` and `.working/` are empty; `mockups/` and `wireframes/` do not exist yet — scheduled after this gate, treated as pending, not critical. EXPERIENCE.md links the three planned mockups inline at the relevant section (Information Architecture, line 44): `mockups/street-door-loading.html`, `mockups/cabinet-close-up.html`, `mockups/workshop-bench.html`, each named specifically enough to identify what it illustrates, with "rendered at Finalize" and "Spine wins on conflict" stated once. No orphans (no imported files exist); no unspecific references.

### Findings
- **low** All three composition references sit in the IA section only; `cabinet-close-up` and `workshop-bench` would read better linked beside the Cabinet-surfaces IA row and the Workshop Component row respectively (and cabinet-close-up arguably belongs in DESIGN.md Components when links are added). *Fix:* at Finalize, move/add the inline links to the sections they illustrate.

## 6. Bloat & overspecification — strong

No pixel specs where tokens cover it; world-unit spacing tokens (eye-height, slot-pitch, aisle-min) earn their place because the room, not the viewport, owns layout, and each is cited by a named lint rule. No persona/FR/scope restatement — Foundation carries just enough session model to make the contract standalone. Prose in DESIGN.md is editorial voice (allowed); EXPERIENCE.md prose is rule-dense. The invented Soundscape Contract section is load-bearing (it fixes the pull-ladder order, the seated mix, and the one-geometry law behind AD-7) and would be read by every audio/room story. Key Flows narrative is journey craft, matching example shape.

### Findings
- **low** The room-skeleton paragraph (front door bottom-center, two occluder pillars, zone list) is near-duplicated between DESIGN.md Layout & Spacing (152) and EXPERIENCE.md IA (42) — two sources of truth for one decision. *Fix:* keep it in one spine and reference it from the other.

## 7. Inheritance discipline — adequate

All four `sources` entries in both spines resolve on disk. Glossary fidelity is high: Visitor, Patron, Cabinet, Wall Slot, Manifest, Registration, Layout System, Instruction Card, Run Recording, Dead Machine, Workshop, Hall of Models all used as PRD §3 defines them. Cross-refs into architecture resolve: AD-7 (occluder-set one-geometry, DESIGN.md:158 — verified verbatim against AD-7), character-lint whitelist / room-sign (AD-24), `/api/report` single outbound call (AD-18/AD-26), takeover precedence (AD-23), liveness tiers (AD-27), offer-not-confirmed (AD-22). The `<8MB` informative budget and floor-plan scale assumptions trace to the run memlog (2026-11-20 decisions) — sourced.

### Findings
- **medium** The provenance claim "Glow anchors… Their values are the floor-plan's own zone hues, kept verbatim so plan and scene read as one system" (DESIGN.md:128; repeated as "reused verbatim so plan, deck, and scene read as one system", EXPERIENCE.md:165) is false at the hex level for 2 of 7 anchors: plan amber (roadmap/pod) is `#FFB84D`, token `glow-marquee` is `#FFC46B`; plan cyan is `#46E6FF`, token `glow-cyan` is `#5BC8FF` (which instead matches the architecture deck's `#5cc8ff` — the deck's palette matches none of the tokens verbatim). Also "Workshop/Casual green" (DESIGN.md:119) misattributes the plan: green `#57E6A3` is Casual Alley; the plan's Workshop is steel `#7FB0C9`, which has no token at all. `glow-pink`, `glow-violet`, `glow-green`, `glow-orange`, `glow-red` match the plan exactly. A consumer reconciling scene against plan hits drift with no arbiter. *Fix:* either change `glow-marquee`/`glow-cyan` to the plan hexes, or state the deltas deliberately ("lifted from the plan's zone language, adjusted for in-scene legibility") and add a `glow-steel`-style token (or explicit none-decision) for Workshop's zone identity; log the decision in memlog.
- **medium** UJ titles are not carried verbatim: Flow 1 "Josh finds a game by ear" (PRD: "Josh finds a game by ear, in his own arcade, with no UI"); Flow 2 "Ray sees the wall grow" (PRD: "Ray visits the week a new machine appeared"); Flow 3 "The builder ships Game #4" (PRD: "The builder ships Game #4 as an epic, and it installs itself"). Mapping is clear via the UJ-n labels, but traceability by title breaks. *Fix:* put the PRD title verbatim in each flow heading, keep the retitle as a subtitle.
- **low** Orthography drift from the PRD glossary: EXPERIENCE.md writes "autoplay"/"Autoplay" where the glossary term is "Auto-play session" (EXPERIENCE.md:67, 71) — acceptable as the code hook name `autoplay(seed)`, but prose should use the glossary term outside hook-name contexts.

## 8. Shape fit — strong

DESIGN.md body sections are exactly the canonical order (Brand & Style → Colors → Typography → Layout & Spacing → Elevation & Depth → Shapes → Components → Do's and Don'ts), nothing missing. EXPERIENCE.md has all required defaults (Foundation, IA, Voice and Tone, Component Patterns, State Patterns, Interaction Primitives, Accessibility Floor, Key Flows) — none dropped. Required-when-applicable both present and earned: Inspiration & Anti-patterns (sources supply reference material — the floor plan, real 80s arcades — and explicit rejects: Parsec, rails, badges, fake theater) and Responsive & Platform (the desktop-only decision and browser-target matrix are load-bearing platform commitments, even single-surface). Invented section: Soundscape Contract — earns its place (see §6). The `[ASSUMPTION]` tagging discipline matches the memlog's assumption-triage decisions (all five triaged assumptions appear in the spines tagged or committed as authored).

### Findings
- (none)

## Mechanical notes

- Broken cross-reference (the only one in the pair): DESIGN.md:174 `{colors.settings-page}` → should be `{components.settings-page}`.
- Component-name identity failures across spines: `report-claim-check` vs "Report fixture"; "Cabinet shells" vs "Cabinet instance"; "Workshop staging objects" vs "Workshop desk & bench" (see §3).
- DESIGN.md frontmatter carries `type/purpose/status/created/updated/sources` beyond the google-labs design.md spec core keys — consistent with the repo's spine convention, harmless.
- `rounded` deliberately omits `full`; pills are explicitly banned (DESIGN.md:162) — internally consistent.
- `spacing` mixes world meters with px scales; spec permits named tokens; readable, and the meters are cited by the aisle-nav lint.
- `imports/` and `.working/` empty; no orphan assets; three mockup filenames are the only forward references, all named specifically ("Spine wins on conflict" stated exactly once, EXPERIENCE.md:44).
- Floor-plan hue audit: exact matches — violet `#B07CFF`, pink `#FF4FA3`, green `#57E6A3`, orange `#FF9A5C`, red `#FF6B5E`; mismatched — marquee/amber (`#FFC46B` vs `#FFB84D`), cyan (`#5BC8FF` vs `#46E6FF`); plan Workshop steel `#7FB0C9` has no token.
- Severity summary: 0 critical, 1 high, 8 medium, 10 low.
