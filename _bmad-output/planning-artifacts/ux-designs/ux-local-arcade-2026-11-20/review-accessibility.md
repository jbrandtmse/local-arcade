# Accessibility review — Local Arcade UX spine pair (DESIGN.md + EXPERIENCE.md)

Reviewer: adversarial accessibility lens (gate). Date: 2026-11-20.
Scope: motor, visual (HoH/Deaf, low vision, color-blind, in-world legibility), cognitive, vestibular/photosensitive, screen-reader/keyboard, settings-page spec fidelity, accidental-requirement audit.
Posture honored: fiction-pure room, concessions on the outside-fiction settings page (per `.memlog.md` decision 2026-11-20). No finding below argues for breaking fiction purity; fixes are authored values, honesty lines, settings-page rows, or in-fiction physical means.

## Verdict

**CONDITIONAL PASS — spine-level honesty gaps must be fixed before Finalize; the rest are authored-value fills.**

The accessibility posture itself is sound and unusually honest for a diegetic design: subtitles-as-room-signs, archives-outside-fiction precedent, "honest silence" at unbuilt machines, single interact verb, and hue-never-as-wayfinding are all good. What fails is **delivery fidelity**: two of the contract's three accessibility guarantees are asserted but not authored — the HoH discovery guarantee is actively undermined by the contract's own occluder-geometry law, and every in-world legibility clause is a circular pointer at an "authored minimum" that was never authored. And the biggest real-user gap — whether a non-sighted visitor can enter the room at all — is not merely unprovisioned; **the contract is silent about it**, which on a public consumer site is a silent exclusion, not a concession.

| Severity | Count |
|---|---|
| Critical | 2 |
| High | 7 |
| Medium | 9 |
| Low | 5 |
| **Total** | **23** |

---

## 1. Screen-reader / non-sighted visitors — honest exclusion audit

### ACC-1 — CRITICAL — The contract never says whether a non-sighted visitor can use the room, and the site page doesn't disclose it either

- **Location:** EXPERIENCE.md → *Accessibility Floor* (lines 110–116), *Foundation* (line 20), *Information Architecture* (Front-door street view row), *Responsive & Platform* (lines 173–174). Also DESIGN.md → *Brand & Style* ("the room is the interface").
- **Finding:** The room is a single three.js canvas with "no web UI inside the fiction," pointer-lock required, center-of-view targeting. A screen-reader user receives nothing from the canvas — no ARIA, no text alternative, no stated entry point. Meanwhile the contract is *agonizingly* honest everywhere else (fake-confirmation rejected, honest silence at red-gate machines, workbench voice). This one omission breaks the pattern. What makes it worse: the core mechanic is auditory — occluded spatial sound, find-by-ear, "what blocks the ear blocks the eye." A blind visitor is arguably the user for whom this room was *structurally* designed, except no-sighted-entry is never claimed either. The contract silently excludes in both directions: it neither provisions a non-visual path nor says it doesn't exist.
- **Fix (fiction-safe, cheap):**
  1. Add one bullet to *Accessibility Floor*: "The Room is a 3D canvas. Audio-driven navigation works without sight; sighted visual surfaces (marquees, cards, signs) have no non-visual alternative in v1. Whether a non-sighted Visitor can complete UJ-1 end-to-end (locate cabinet, sit, play) is **unproven** and gated as a spike."
  2. Add a *spike acceptance test* on the M1 walk: play with sound only, eyes-closed / screen-reader-on-site-pages — can the tester find Moon Patrol, sit, and score? If it passes, Local Arcade gets an accessibility claim no 3D web space has; if it fails, say so on the site page.
  3. Site page (outside-fiction, workbench voice, zero fiction cost): one declarative line — "Sound drives navigation. Stereo audio strongly recommended. The room is a 3D view; it has no text alternative."
  4. Give the `<canvas>` a `role="img"`-with-label entry state plus a hidden skip link to the Settings page on the site page, so SR users can at least reach settings and know what they're declining.

### ACC-2 — CRITICAL — The HoH discovery guarantee is asserted, but the contract's own geometry law destroys rung 2 exactly where rung 1 works

- **Location:** EXPERIENCE.md → *Accessibility Floor*, "Deaf / hard-of-hearing discovery" bullet (line 113: "no sound-only gating exists for finding machines" + ASSUMPTION that "visual attract legibility distances are authored so rung 2 works alone") vs. *Soundscape Contract* (line 105: "what blocks the ear blocks the eye, by design") vs. *Information Architecture* / DESIGN.md *Layout & Spacing* ("two occluder pillars **breaking sightlines on purpose**").
- **Finding:** This is the sharpest contradiction in the pair. The pull ladder is fixed: sound → attract graphics → Patron drama. The contract claims rung 2 (graphics) functions alone for Deaf/HoH visitors. But AD-7's "one geometry, one truth" means the pillars that occlude the kick-drum into a *ladder* also occlude the attract glow — for a Deaf visitor, the discovery system's only interesting spatial modulation (occlusion/reopen) is deleted, and the room becomes a flat visual field with hidden machines behind authored blind spots. Flow 1 itself proves it: Josh only catches Moon Patrol "over a pillar" — he got lucky because sound led him to the right geometry. A Deaf visitor has no sound leading them to the pillar gap. The ASSUMPTION admits legibility distances were never authored (verify at M1). So the guarantee "no sound-only gating exists" is currently **false by construction**: discovery is gated on either hearing *or* lucky geometry.
- **Fix (fiction-safe authored rules, not UI):**
  1. Amend the occlusion law asymmetrically *for light*: sound and sight share the occluder set, but light gets authored **spill** — floor-sheen reflection, glow bleeding around pillar edges, ceiling bounce cones — diegetic, era-true (arcades glowed through haze), and it restores a visual gradient of proximity. "What blocks the ear blocks the eye" keeps literal geometry; light simply diffracts in-scene. One sentence in DESIGN.md *Elevation & Depth*.
  2. Author a **sightline budget**: every cabinet's marquee or attract screen must be visible from ≥2 positions on the main circulation loop (aisle min 1.20m already exists — extend the aisle-nav lint to a *sightline lint*).
  3. Make the M1 walk-test a **gate with a Deaf/HoH tester and master audio muted**: reach ≥1 playable cabinet within the first 60s. Until it passes, downgrade the Accessibility Floor bullet from a claim to the ASSUMPTION it is.
  4. Patron body drama (rung 3) is already always-on full strength — good; keep, and require every busy cabinet to have a *visible* NEXT state at authored minimum size (it currently lives only in Voice/Tone).

---

## 2. Motor

### MOT-1 — HIGH — Pointer-lock is mandatory, input scheme is fixed, no remapping, no look-alternative, no pointer-lock-denial fallback

- **Location:** EXPERIENCE.md → *Interaction Primitives* (lines 92–95), *Responsive & Platform* (line 173: "Pointer-lock is required"), *Accessibility Floor* (line 114: "pointer-lock first-person is inherent").
- **Finding:** For users with hand tremor, hemiparesis, low precision grip, or no mouse (mouse is not universal — some users operate computers via keyboard/switch/head-mouse), this is a hard gate. The contract at least *names* the dependency honestly ("inherent"), but the concessions column offers only turn speed and head bob — no remapping, no alternative look channel, and no plan for the browser refusing pointer-lock (it can fail on some setups/embeds, and some users cannot gesture to grant it).
- **Fix:** The contract already hands you the clean seam: *Interaction Primitives* says "the physical device layer never leaks into a Game" and replays reproduce from "the same seed + inputs." So **input mapping is device-layer and replay-safe** — remapping cannot fork the fiction. Add to the settings page (outside-fiction): key remap for WASD/E, look-source selector (mouse-look / arrow-key look / drag-look fallback when pointer-lock is denied), mouse sensitivity. No in-room UI changes at all. Note: this fix also underpins MOT-2 and the H-4 disclosure — the settings page must actually *host* it (see SET-1).

### MOT-2 — MEDIUM — The single scheme requires simultaneous WASD + mouse + E: a two-handed, sustained-posture requirement; desktop-only removes touch alternatives

- **Location:** EXPERIENCE.md → *Interaction Primitives*; *Responsive & Platform* (phone/tablet "gone, not deferred," PRD OQ-3).
- **Finding:** One interact verb (E) is genuinely low-demand — praise due. But the *composition* (hold W, steer with mouse, tap E, then during play use the game's axis/button slots) assumes two functioning hands in sustained posture. Desktop-only is a product decision to honor, but its accessibility cost — removing touch/alternative platforms many motor-impaired users rely on — is nowhere acknowledged.
- **Fix:** (a) The settings-page input section in MOT-1 gives one-hand presets (e.g., toggle-move, look-on-hold). (b) Acknowledge the cost in one site-page line: "Needs a mouse and keyboard together, desktop browser." Honesty, not apology. (c) Game control slots already abstract axis/button/aim — require each Manifest to declare *minimum* input demand so the room can, in-fiction, show a machine's needs on its Instruction Card (cards already carry rules).

---

## 3. Visual — Deaf/HoH beyond discovery

(The rung-2 discovery finding is ACC-2 in §1; this section covers the remaining visual-domain findings.)

### V-1 — MEDIUM — Environmental audio carries information but only Patron banter gets captions

- **Location:** EXPERIENCE.md → *Accessibility Floor* bullet 1 (subtitles = banter only); *Soundscape Contract* (lines 102–104: gong, SPIKE CHILLER, kick-drum, tip-jar clink as findable identities); Flow 5.
- **Finding:** The contract captions *conversation* but the room's spatial *events* — the pinball gong marking Pinball Corner, a faulted cabinet's misbehavior audio, the door's swelling attract — have no stated visual counterpart. Marquees name a game once seen, and rung-2 presence covers machines, but the *named identity anchors* are audio-first and silent for HoH visitors.
- **Fix:** One column added to the *Findable-by-ear identities* list: each named sound gets an authored visual signature (gong = visible striker arm mid-swing; Moon Patrol attract loop shows its title screen; tip jar = visible coin flash at counter). All diegetic; costs one clause per identity at authoring.

### V-2 — MEDIUM — Subtitle signs inherit distance, angle, and pillar occlusion; banter can happen out of sight and the words are simply lost

- **Location:** EXPERIENCE.md → Flow 5 (lines 157–160); *Accessibility Floor*; Voice/Tone row "Room-sign subtitles appear as small cabinet-side signs when enabled."
- **Finding:** Subtitles-as-room-sign is the right fiction-pure answer and Flow 5's climax is earned. But a *physical* caption has physical limits the contract never constrains: "small" signs at unknown size, no dwell time, no rule for which cabinet's flank carries a two-Patron exchange, and — with pillars — the conversation itself can occur behind an occluder from the visitor's position. A Deaf visitor who misses the visual moment gets nothing; a real caption replays on demand.
- **Fix:** Floor-plan rule: authored banter beats are staged at fixed stations visible from the circulation loop (the floor plan is fixed; this costs one constraint line). Subtitle sign gets authored min cap-height from the legibility table (V-4), dwell ≥ read-time, and re-displays for its remaining duration when the visitor re-approaches. Banter is fixed authored dialogue trees (per Voice/Tone), so per-beat station assignment is authorable now.

### V-3 — MEDIUM — Color-blind zone identity: warm-hue collapse; non-hue signatures never committed

- **Location:** DESIGN.md front-matter colors + *Colors* (zone hues verbatim), Do/Don't row "Zone hues as lighting/material identity per zone / not as wayfinding"; EXPERIENCE.md *Inspiration & Anti-patterns* line 165.
- **Finding:** Praise first: the ban on hue-as-wayfinding is WCAG-1.4.1-aligned — wayfinding rests on physical text signage (zone labels at door height). But zone *identity* leans hard on hue, and the warm set collapses: `glow-red #FF6B5E` (door), `glow-orange #FF9A5C` (Snack Bar), `glow-marquee #FFC46B` (amber roadmap) are near-indistinguishable under protanopia/deuteranopia; `glow-green` (Workshop) vs `glow-orange` also confuses under deuteranopia. A color-blind visitor's map loses door/snack/roadmap distinctions — the very zones growth is legible through (UJ-2).
- **Fix:** Commit per-zone non-hue signatures already latent in the fiction: Pinball Corner's side-profile silhouettes, Snack Bar counter + tip jar fixture shape, Workshop bench/crates, the empty stretch's kept-clean bare wall. One DESIGN.md sentence: "Every zone must read from its fixtures and geometry at 6m with hue removed; run color-blind check at M1 walk." No palette change needed.

### V-4 — MEDIUM — In-world legibility minimums are circular: "never smaller than authored minimum" points at a minimum that was never authored

- **Location:** DESIGN.md → *Typography* ("legibility is a design law… the screenshot test implies readable marquees"), front-matter `marquee-title.note` ("cap height ≈ 0.18m… Never smaller than authored minimum at viewing distance"), `instruction-body.note` ("legible when the card is held at 0.5m"); EXPERIENCE.md → *Accessibility Floor* last-but-one bullet ("meet the authored minimum legibility at their viewing distance").
- **Finding:** Both files promise the "authored minimum" and DESIGN.md authors exactly one number (marquee cap 0.18m — reasonable: ~0.65° visual angle at 15m, fine for titles). Instruction card body, room-sign, and nameplate have **no mm/x-height values, no viewing-distance table, and no lighting floor**. And in-world contrast isn't the token contrast: I verified paper card vs card ink = 12.63:1 and sign-chalk vs room-black = 14.82:1 *as flat tokens* — but these surfaces are read under machine-light falloff and dust haze at unknown lux; token ratios don't transfer to scene-rendered legibility. Every legibility clause currently defers to a value that doesn't exist. This also undercuts ACC-2 (rung-2 sufficiency *is* a legibility-distance claim).
- **Fix:** Add a legibility table to DESIGN.md `spacing`/`typography` tokens: surface → min cap or x-height in mm → max authored viewing distance → min lux at surface from machine light. Suggested floors to make explicit: card body x-height ≥ 12mm at 0.5m (generous print, deliberately), room-sign cap ≥ 60mm at 3m, nameplate ≥ 30mm at 2m, and a "text surfaces receive ≥ N lux" lighting law (light-from-machines already canon). Feed it into the existing character/aisle lint family as a legibility lint.

### V-5 — MEDIUM — Loading is audio-only: no visual "room ready" cue for the ≤60s street-door wait

- **Location:** EXPERIENCE.md → *State Patterns*, Loading row (attract sound "spills out and swells," no progress bar, door opens when ready); Flow 1 step 1.
- **Finding:** The no-progress-bar door fiction is a KEEP decision (memlog triage) — honored. But for a Deaf visitor or a visitor with master muted, a 60-second silent static door is indistinguishable from a broken page, and there's no completion signal. (Also a technical trap the contract should note: browsers block autoplay before a user gesture, so the "sound spilling out" cue may be the *only* cue — and it may not fire until interaction.)
- **Fix:** Author the visual twin of the swell: light-bleed widening under the door, glass brightening, handle turning at ready. Purely diegetic era signage lighting; keeps the no-progress-bar law intact.

## 4. Vestibular & photosensitive

### VE-1 — HIGH — Motion comfort is hand-waved: zero authored baselines, "numbers land at M2," presets untested, no FOV/vignette, no prefers-reduced-motion, no safe default

- **Location:** EXPERIENCE.md → *Accessibility Floor* "Motion comfort" bullet (turn speed / reduced-head-bob "numbers land at M2" + NOTE: "comfort presets are untested — validate at L3 human walk"); DESIGN.md → `spacing` tokens (eye-height 1.60m exists; no walk speed, no yaw speed, no bob amplitude); *Brand & Style* (screenshot test "at playable framerate," fps floor unmeasured — see L-2).
- **Finding:** "Reduced head bob" presupposes a head-bob baseline that **no document states**. Walk speed, max yaw rate, and bob amplitude are unauthored — so the comfort presets are presets relative to nothing. The contract is honest that it's unvalidated (the NOTE exists — credit), but for a product whose *first 60 seconds* are first-person locomotion with "no onboarding of any kind," deferring all numbers to M2 means the vestibular floor ships on faith. No FOV adjustment, no optional vignette (the only concession that doesn't touch fiction at all, since it's a post-process the fiction-pure law doesn't even see), and OS `prefers-reduced-motion` is never mentioned.
- **Fix:** Author baseline numbers *now* as tokens (walk speed ~1.4 m/s human-arcade-wander, max yaw, bob amplitude ±) in DESIGN.md `spacing`; commit the safe default — **comfort preset ON at first visit**, chosen on the settings page (outside-fiction, fiction-pure untouched). Respect `prefers-reduced-motion` as the initial preset value. Add FOV and vignette to the settings row list. L3 human walk gains a vestibular test (5-minute continuous walk, symptom report) alongside the existing SM-1 blocker.

### VE-2 — HIGH — The liveness law mandates constant motion and glow but no flash ceiling exists anywhere: photosensitive epilepsy is unaddressed on a public site

- **Location:** DESIGN.md → Do/Don't row "Every visible cabinet glowing and moving, always / Any cabinet that reads dark or still (Dead Machine by law)"; *Brand & Style* ("the room's brightness is literally the aliveness of its cabinets"); EXPERIENCE.md → *Component Patterns* Cabinet row (faulted cabinet "keeps performing via kernel fallback (marquee + screen motion)"); era-faithful attract screens throughout.
- **Finding:** A room legally full of always-moving, always-glowing screens and marquees, era-flavored attract modes, and a brightness that *fluctuates with room state* — and the contract never mentions WCAG 2.3.1 (three flashes), flicker ceilings, or photosensitivity at all. The ban on photoreal scan/grunge textures incidentally reduces flicker risk, but attract-mode animation and fallback "marquee + screen motion" are exactly where era-authentic CRT flicker wants to live. For a public consumer site this is the finding most likely to become an incident report.
- **Fix:** One law sentence in DESIGN.md: "No authored element flashes more than 3 times per second; CRT flicker is era-flavor, not decoration — animate at phase-shifted low frequencies." Add a settings tier "calm cabinets": slow attract animation phase (still moving, still glowing — Dead Machine law survives; only tempo changes). The H-4 site-page disclosure covers the warning.

### VE-3 — (disclosure; placed with V/H) — see H-4 below.

## 5. Cognitive

### COG-1 — MEDIUM — Zero scaffolding plus reading-required-to-play: the no-hints law is fine, but entry cost for cognitive/reading users is unmitigated — while the contract already owns a diegetic fix it never claims

- **Location:** EXPERIENCE.md → *State Patterns* "First visit: No onboarding of any kind. Discovery is the product"; *Interaction Primitives* "learned from the Welcome Flyer or by trying — never from prompts"; *Soundscape Contract* "Zero UI hints on any rung"; DESIGN.md *Layout & Spacing* ("deliberately too big to take in at once"), Typography (instruction cards as "dense, squared" operators-sheet voice).
- **Finding:** For users with executive-function differences, working-memory limits, aphasia, or slow reading, a 19×12.5m room with no prompts, rules learned from dense printed cards, and a control list on one wall flyer is a wall. Note what the contract *does* get right for cognition, and should say so: the deterministic room that runs "the same way for everyone," growth that is "never a relocation," fixed zones, and physical text signage at door height together make the spatial map learnable across visits — a genuine cognitive-accessibility asset currently unclaimed. The gap is *rules-to-play*: reading the Card is the only stated path.
- **Fix (fiction-pure):** (a) **Learn-by-watch law:** every Game's rules must be learnable by watching its attract/autoplay loop — Patron autoplay already performs the rules; make it a registration requirement (hooks the existing gate: "the gate is green or registration refuses"). (b) Card print budget: cap lines/words per Card, one rule per line — era operators' sheets were terse anyway. (c) Settings page gains a "quiet room" tier (banter density reduced) for auditory-overload/ADHD — a volume/density control, not UI.

## 6. Settings page — does the spec actually support the promised controls?

### SET-1 — HIGH — IA row + Component row + Accessibility Floor promise sliders/toggles/mixes; DESIGN.md defines zero form-control tokens. As specified, the settings page cannot be built without inventing its entire control layer

- **Location:** DESIGN.md front matter `components.settings-page` (only background/text/accent/radius), `typography` (only ui-heading 24px / ui-body 16px); EXPERIENCE.md → *Information Architecture* Settings row ("Motion/audio/subtitles"), *Component Patterns* Settings row, *Accessibility Floor* bullet 1; *Accessibility Floor* AA claim ("settings and site pages meet WCAG 2.2 AA").
- **Finding:** The promise (verified consistent across all three documents): turn speed / comfort levels, master + focus-mix strength, banter-subtitles toggle. The spec's support for it: a background color, a text color, an accent, and a radius. There is **no slider component, no toggle component, no focus-indicator token, no target-size rule** (WCAG 2.2 SC 2.5.8 minimum 24px is part of the AA claim being made), no label/error conventions, no statement that the page is keyboard-operable. I verified the color trio passes on its own — ui-text #EDEDED on #191919 = 15.02:1, ui-muted #9A9A9A = 6.25:1, ui-accent #5BC8FF = 9.34:1 — but ui-muted has no stated *role* (it fails 2.40:1 against ui-text, so it must be scoped to disabled/hint text on the surface only), and accent-as-state would make state color-only (SC 1.4.1) unless specified. "Deliberately plain, single column" is good design; plain is not a substitute for specified.
- **Fix:** Add `components.ui-control` family to DESIGN.md: slider (track + thumb, target ≥24px, thumb-to-track ≥3:1), toggle (on/off state differentiated by shape/position, not color alone), focus ring token (`ui-focus: ui-accent` or dedicated, ≥3:1 against surface), link/state conventions, and a role line for ui-muted (hint/disabled text, never body). One row each — costs nothing, and it's the difference between an AA claim and an AA contract.

### SET-2 — HIGH — The settings page is reachable only from the site page; there is no path back mid-session, so a motion-sick or subtitle-late visitor pays a ≤60s reload and loses their run

- **Location:** EXPERIENCE.md → *Information Architecture* (Settings page: "Reached from: Site page"); Flow 5 ("Before entering, Kenji enables banter subtitles"); *State Patterns* (Loading row, ≤60s).
- **Finding:** Real accessibility use is *reactive*: nausea starts at minute two; Kenji doesn't know he needs subtitles until a joke passes unheard. The IA makes the remedy cost a full reload — under the fiction's own ceiling that's up to 60s plus lost queue position at a busy cabinet (Busy/queue rules protect queue head by "present visitor > queue head" — reloading forfeits "present"). The Accessibility Floor implicitly assumes everyone pre-configures; that assumption silently excludes people whose needs emerge in-room.
- **Fix (fiction-pure, already half-built):** The front door is canonical (street view is a named surface). Author the exit beat: **walk out the door → street-door view (reversed: room sound fading back inside) → same page carries the Settings link.** No new UI surface, no fiction break — leaving an arcade is era-true, and Personal Bests already persist in localStorage so the run cost shrinks to queue position. Add one IA row: "Street-door view (exit) — Arcade Room — leave, adjust settings, re-enter."

### SET-3 — MEDIUM — "No alternate experience fork" is ambiguous enough to contractually block future in-world accommodations

- **Location:** EXPERIENCE.md → *Accessibility Floor* final bullet: "Replays and reports carry identical behavior for assistive users — no alternate experience fork."
- **Finding:** Read charitably, this protects determinism for reports — good and necessary (it's why the room is trustworthy). Read literally, it forbids any future accommodation that changes room *presentation* (brighter reading light, larger signage, calm attract tempo from VE-2) because those would make two visitors' rooms "not identical." The next accessibility cycle will cite this sentence at each other in review.
- **Fix:** One clarifying half-sentence: "identical world state and seeded behavior; input mappings and presentation accommodations are device-layer (per Interaction Primitives' device-layer rule) and do not fork the run." Replays stay honest; accommodations stay open.

### SET-4 — MEDIUM — Mix controls are incomplete and one label conflates two different controls

- **Location:** EXPERIENCE.md → *Accessibility Floor* bullet 1: "turn speed / motion comfort levels, audio mix controls (master + focus-mix strength)."
- **Finding:** Missing for real users: **banter volume / mute** (auditory processing disorder, ADHD, tinnitus, misophonia — banter is authored dialogue trees, so per-channel mixing is trivial in the audio graph). And "turn speed / motion comfort levels" conflates *look sensitivity* (a motor/input accommodation, always available) with *comfort presets* (a vestibular provision that changes motion rendering) — they belong on separate rows with separate defaults, or a user chasing sensitivity will land in a motion setting they didn't consent to.
- **Fix:** Name the rows explicitly in the Component Patterns Settings row: look sensitivity · master volume · banter volume · focus-mix strength · comfort preset (off / low / full, default per prefers-reduced-motion).

## 7. Does anything accidentally *require* hearing, perfect vision, or low motion-sensitivity?

| Requirement | Where it sneaks in | Severity |
|---|---|---|
| **Hearing as release-gate** | EXPERIENCE.md Flow 1 failure clause: "no machine within reach of the door's first 60 seconds would fail SM-1 — the L3 human walk treats it as a release blocker." SM-1 is defined only through the audio path; the HoH path is the ASSUMPTION at line 113. As written, the release gate itself is gated on hearing. | HIGH (**QA-1**) |
| **Hearing for page-ready signal** | Loading swell is the only stated completion cue (V-5). | MED |
| **Hearing for spatial events** | Gong/crink/kick identity anchors (V-1). | MED |
| **Sighted vision for discovery** | ACC-2 (occluder law vs rung 2); V-4 (legibility minimums unauthored). | CRIT / MED |
| **Sighted vision for entry decision** | Site page never says the room is a 3D view with no text alternative (ACC-1). | CRIT |
| **Low motion sensitivity** | First 60s locomotion with no onboarding, all comfort numbers deferred, no safe default (VE-1); pointer-lock "required" (MOT-1). | HIGH |
| **Photosensitive tolerance** | No flash ceiling anywhere (VE-2). | HIGH |
| **Disclosure before entry** | **H-4 (HIGH):** Site page lists "entry, controls list, repo issue link" only. The desktop-only decision, pointer-lock requirement, motion demand, stereo-audio centrality, and photosensitivity note are all undisclosed before a vulnerable visitor commits to a ≤60s door load. Fix: one workbench-voice paragraph on the site page — four short declarative lines ("Needs mouse + keyboard. First-person movement. Stereo sound. Bright moving lights. Desktop browser only."). Zero fiction cost; the workbench voice is already the brand of that page. |  |

**QA-1 fix:** define SM-1 pass in two variants — rung-1 (normal audio) **and** rung-2-only (master muted) — and require both in the L3 walk. Make HoH and low-vision testers mandatory participants, not a verify-at-M1 afterthought.

## 8. Low-severity

- **L-1 (LOW) — Settings: no reset-to-defaults row.** After a mistuned mix (focus-mix strength in particular can disorient), there's no escape hatch. Add "reset to defaults" to the settings page. *(EXPERIENCE.md Accessibility Floor bullet 1.)*
- **L-2 (LOW) — "Playable framerate" is unmeasured.** DESIGN.md *Brand & Style* ties the screenshot test to "playable framerate" but no fps floor exists; low fps on a weak mid-range laptop worsens both nausea (VE-1) and in-world text legibility (V-4). Author a floor (e.g., 30 fps sustained at the ≤60s load ceiling) as a token.
- **L-3 (LOW) — Era condensed faces carry long Card body under dim light with no legibility-review clause on face swaps.** `instruction-body` (Archivo) and provisional `Chakra Petch` have documented swap candidates (Saira Condensed); add one line: swap candidates must pass the V-4 legibility table, not just era-voice lint.
- **L-4 (LOW) — i18n out-of-v1 (memlog) is not stated in the public contract.** An English-only room/site is a legitimate scope call, but a non-English visitor meets the same silent-exclusion shape as ACC-1, smaller. One site-page honesty line ("English only, v1").
- **L-5 (LOW) — ui-accent role unspecified.** Numerically fine (9.34:1 on ui-surface), but if it marks control state it must be paired with shape/position per SET-1.

## 9. What the contract already gets right (keep; cite in defense)

- **The concessions-outside-fiction architecture is coherent and precedented** (archives, memlog decision) — every fix above rides it without a single in-room HUD compromise.
- **Subtitles as cabinet-side room-signs** is a genuinely strong idea, not a cope — it just needs the size/dwell/staging constraints (V-2).
- **The deterministic, never-relocating room with fixed zones and physical text signage** is a latent cognitive-accessibility feature — claim it.
- **"Zero UI hints" ≠ zero affordances**: the single interact verb (E), aisle-min 1.20m walkability lint, and hue-never-as-wayfinding all incidentally serve accessibility; the contract should say so.
- **Device-layer input abstraction ("the physical device layer never leaks into a Game")** makes remapping and alternative control schemes *provably replay-safe* — the strongest accessibility seam in the architecture spine, currently unexploited.
- **Honesty as brand** (honest silence at unbuilt machines, no fake strangers, workbench voice) — the fixes requested here are all one-line extensions of the brand, not concessions to it.

## Gate recommendation

Block Finalize until: **ACC-1** (honesty declaration + non-sighted spike), **ACC-2** (occlusion-asymmetry law + sightline lint + Deaf-tester M1 gate), **H-4** (site-page disclosure block), and the authored values behind **V-4/VE-1** (legibility and motion baselines) land in the spine pair. SET-1's ui-control tokens should land in the same pass since the AA claim is already on the record. Everything else may proceed to M1/M2 as authored values with the named test gates attached.
