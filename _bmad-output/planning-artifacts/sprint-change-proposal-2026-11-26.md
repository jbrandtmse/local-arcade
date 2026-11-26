# Sprint Change Proposal — Cabinet Shell Rebuild (DW-29 reopen)

- **Date:** 2026-11-26 (run clock per cycle-log UTC; local date 2026-11-25)
- **Trigger:** Owner-review hold on Epic 2 — DW-29 realism adjudication FAILED
- **Change scope:** Moderate (Direct Adjustment inside existing Story 2.0)
- **Owner decision:** Incremental review mode; work folded into **Story 2.0**, not a new story and not a 1.10 reopen
- **Status:** APPROVED by owner 2026-11-26 — P1–P3 applied to epics.md by this run; P4 staged for the Story 2.0 spawn owner; P5 routed to bmad-ux, P6 routed to bmad-architecture as work orders
- **Owner task brief (verbatim):** `sprint-change-proposal-2026-11-26-owner-task.md` (same folder) — the owner's complete corrective task, extracted byte-for-byte (15,484 bytes) from the original correct-course invocation transcript; this is the authoritative implementation brief Story 2.0's spec must carry verbatim. The "owner corrective task 2026-11-26" citation below refers to that file.

---

## 1. Issue Summary

**Problem.** The shipped stand-up cabinet still reads as a vending machine, not a 1980s upright arcade cabinet. Story 1.10 shipped a contour pass (marquee box, deck slab, kick plate, screen hood, side wings — `SHELL_PART_MESHES = 11`), but the underlying form is still a 0.60 × 0.60 × 1.80 m brick with thin boxes stuck on its front.

**How discovered.** DW-29's own adjudication clause pre-committed the verdict mechanism:

> `2026-11-26T00:37:20Z status=resolved-by:1-10… by=adjudication note=contours shipped…realism verdict adjudicates at the smoke immediately following - a failed smoke reopens`

The owner-ordered hold (`hold_ordered reason=owner-ordered: review Epic 1 before Story 2.0 plan spawn`, cycle-log 2026-11-26T04:26Z, shas `f900038`/`82270ad`) **is** that realism adjudication, and it failed. The owner then authored a corrective design task — *rebuild the stand-up cabinet shell so it looks like a real 1980s arcade cabinet* — geometry and materials only. Per DW-29's clause, a failed verdict reopens the row through the rework loop; this proposal executes that reopen and seats the fix.

**The owner's task (binding corrective design, summarized here; full text is the implementation brief):**
- Author `SIDE_PROFILE` (11 points) and `INNER_PROFILE` (12 points) polygons (z,y metres) in `cabinets.ts`; extrude side panels (depth 0.019 at x −0.281/+0.300) and core (depth 0.562 at x 0.281) via `ExtrudeGeometry` with `mesh.rotation.y = -Math.PI/2` — the distinctive side silhouette: toe-kick, sloped control panel, recessed leaning screen opening, marquee overhang.
- Build each cabinet in a per-cabinet local-frame **group** placed once by `placementGeometry` + `closedYaw` (which becomes exported); detail assemblies (screen sub-group at (0, 1.28, 0.01) rot.x −0.1707; control panel at (0, 0.9375, 0.2075) rot.x +0.3709 with joystick/buttons; marquee face 0.562×0.15×0.005 at (0, 1.7125, 0.2525); speaker grille; coin-door frame; contact shadow).
- Extend the `Three` seam (real adapter in `main.ts` + every headless fake): `group()`, `extrudeGeometry`, `cylinderGeometry`, `sphereGeometry`, material arrays, `emissiveMap`/`emissiveIntensity`/`metalness`.
- Materials: six new tokens in `tokens.ts` only; sRGB color space + anisotropy; **ACES tone mapping** in `main.ts`.
- Marquee lettering: ONE line at **0.09 m** cap (was two lines at 0.18 m).
- Budgets: ≤1500 triangles / ≤30 meshes per cabinet; shared geometries/materials; per-cabinet textures only for screen/marquee/side-art/overlay.
- A byte-identical do-not-touch list and a 9-question acceptance checklist gate the work.

## 2. Impact Analysis

### Checklist results (Step 2)

| Item | Status | Finding |
|---|---|---|
| PRD impact | [x] none | PRD §4.6 already demands "classic upright look"; SM-4 "feels like the memory" is the tie-breaker this serves; SM-C2 caps the risk. No PRD edit. |
| Epic/story scope | [x] none new | Folded into Story 2.0 (exists, `backlog`, un-spawned). No story added, no epic reordered. |
| Spec | [N/A] | Specs are per-story artifacts; 2.0's spec is authored at spawn and must carry this brief. |
| Architecture conflict | [!] one row | Spine Consistency-Conventions row "Room geometry & collision" says volumes are the single source for "visual extrusion" with no cabinet exemption → P6. |
| UX conflict | [!] three | UX-DR2/UX-DR5 cap-0.18 law, UX-DR6 "NEXT at the marquee's authored minimum", DESIGN.md Shapes "80s cabinets are boxes" + token set → P2, P5. |
| DW ledger | [!] four rows move | DW-29 reopen→2-0; DW-23 reopen_if fires; DW-42 closes with its part; DW-43 part names stale → P4. |
| Code/test laws to narrow | [!] six | non-box-geometry ban, emissive ban, one-mesh-per-volume, mesh-count formula, contour-≤0.06-proud law, exposure IS-pins — narrow, never delete (test law). |

### DW-23 — reopen_if fires (light physics)
`DW-23` is `status=wontfix-theoretical` with `note=reopen_if: tone mapping lands in main.ts or the exposure constants move under a non-linear tone curve`. The task mandates ACES tone mapping in `main.ts`. The exposure-law bounds `FACE_ILLUMINANCE_CEILING = 2` / `FLOOR = 0.5` (cabinets.ts:378-379) and their IS pins (`scene.test.ts:449-479` pins 0.25/4/2/0.5 for `CABINET_LIGHT_INTENSITY`/`REACH`/ceiling/floor) become invalid: **Story 2.0 must re-derive the bounds under the tone curve and retune `CABINET_LIGHT_INTENSITY` (0.25)/`REACH` (4) so the screen remains the brightest face**, then re-pin. This is exactly the scenario DW-23 predicted.

### DW-42 — self-closing
The deck slab (`SHELL.deck` centerY 0.75, bottom 0.71, proud 0.06 — the part that covers the coin-door top band) is **deleted outright** in the profile rebuild (the INNER_PROFILE front panel from y 0.10 to 0.895 replaces it). The overlap closes with the part; DW-42 routes to 2.0 and closes there.

### DW-43 — law survives, part names stale
DW-43 (routed to 3.4): per-placement contour repetition. The 3.4 AC bullet names the 1.10 parts ("marquee box, deck slab, kick plate, screen hood, side wings") — all deleted by this rebuild. The law (repeat per placement through the placement seam) is unchanged; the bullet text must name the new assemblies → P3.

### Seat-pose consequence
`core/seat.ts:129-138` computes seated pitch as `atan2(SHELL.screen.centerY − EYE_HEIGHT, PLAY_STANDOFF_M)`. Screen centerY moves 1.05 → 1.28, so the seated pitch changes. The `cabinets.test.ts:577` / `:600-610` seat-pose pins are updated to the new derived value (they re-derive, not deleted). `SHELL.screen.width/height` stay byte-identical (0.44/0.52) as the task demands.

### Test-law narrowings (never deletes)
1. `scene.test.ts:393-401` "BoxGeometry only" → "room meshes are boxes; non-box geometry appears only inside cabinet groups".
2. `scene.test.ts:385-391` "zero emissive" → "emissive on exactly screen-face and marquee-face materials, 2 materials per cabinet".
3. `scene.test.ts:230-245` "one mesh per volume" → "one mesh per NON-cabinet volume; `kind === 'cabinet'` volumes render no mesh".
4. Mesh-count formula (`scene.test.ts:403-422`) stays data-derived; `SHELL_PART_MESHES` becomes **computed from the part list, not hand-authored** (tightens `cabinets.test.ts:81`).
5. `scene.test.ts:578-657` contour ≤0.06 m-proud-of-body law → the new silhouette law: shell stays inside the AABB except open coin door + side-art decals (≤0.302 bounding x).
6. Exposure pins re-derived under ACES (DW-23 above).
7. `scene.test.ts:796-822` hex-scan already bans every tokens.ts hex elsewhere — stays green as-is; the six new tokens flow through automatically (≥22-hex floor rises).
8. Eight new verification tests per the task (Node, real three.js: profile bounding boxes, triangle/mesh budgets, emissive-material census, group placement/yaw, seam parity between real adapter and fakes, coin-door world-space continuity, texture census, AABB containment).

### Artifact conflicts
- **epics.md:** Story 2.0 AC set; UX-DR2/UX-DR6; Story 3.4 DW-43 bullet. Done-story history (Story 1.4 AC line "0.18m cap legible to ~15m", line 315) is **left as history** — the UX-DR rewording removes the forward binding instead of rewriting a shipped story's AC.
- **DESIGN.md** (bmad-ux): marquee typography note, Shapes section, token set, Marquee/screen component rows.
- **ARCHITECTURE-SPINE.md** (bmad-architecture): one Consistency-Conventions row.
- **deferred-work.md:** four row movements.
- **sprint-status.yaml:** **no edit** — `2-0-epic-1-deferred-cleanup` already exists as `backlog`; no keys added (checklist 6.4 N/A).

### Code touch map (implementation, Story 2.0)
`core/room/cabinets.ts` (profiles, group placement, `closedYaw` export, SHELL part list, cap-token split `MARQUEE_CAP_M = 0.18 → 0.09` + `SCREEN_NEXT_CAP_M = 0.18` keeping AD-28's 0.18 m NEXT floor), `core/room/scene.ts` (seam extensions, group assembly, cabinet-volume render skip), `core/main.ts` (adapter methods, ACES, sRGB, anisotropy), `core/room/tokens.ts` (six tokens), `core/room/surfaces.ts` (one-line marquee painter; touch only `paintMarquee`/`fitLine` — `paintScreen`/`repaintScreen`/`compositeScreen`/`drawScreen` byte-identical), plus the six test narrowings above. Untouched: `collisionVolumes`, `cabinetAABB`, `cabinetPlacements`, `coinDoorPose`/`toggleCoinDoor`, attract phase law, `games/`, `core/contract/`, kernel tick.

## 3. Recommended Approach

**Option 1 — Direct Adjustment, seated inside Story 2.0.** Scope classification: **Moderate** (backlog reorganization inside one un-spawned story + two routed artifact work orders; no PRD/MVP change, no epic reorder).

- **Why:** Story 2.0 exists as the Epic-1-deferred-cleanup vessel and was explicitly put on `story_standby` (cycle-log 2026-11-26T05:11Z) *pending this correct-course outcome*. DW-29 is Epic-1 cleanup debt by ledger law. Seating it elsewhere (new Story 2.7, or reopening done Story 1.10) was considered and rejected by the owner.
- **Effort:** medium-high — multi-file geometry + materials + renderer change; ~7 test-law narrowings; 8 new tests; tone-curve retune.
- **Risk:** medium — headless-fake/real-adapter seam fidelity (tests use fakes; the 8 new tests use real three.js and pin both sides), ACES exposure retune touching the DW-23 law, profile/overlap gaps (task allows smallest-number adjustments, which must be listed in the implementation report).
- **Timeline:** zero net delay — 2.0 was about to spawn anyway; the standby ends with this approval.

## 4. Detailed Change Proposals (P1–P6, all approved)

### Stories — epics.md (applied by this skill; correct-course is the owning skill for epics.md per AGENTS.md)

**P1 — Story 2.0, AC section (epics.md:421-423): add the DW-29-reopen AC bullet.**

OLD:
```
**Acceptance Criteria:**

- DW-24: mouse-look: … (ledger; owner report 2026-11-23; X.0 triage 2026-11-26)
```

NEW — append after the DW-24 bullet:
```
- DW-29 (reopened): the stand-up cabinet reads as a real 1980s upright, not a vending machine — the shell is rebuilt from the owner-authored SIDE_PROFILE/INNER_PROFILE polygons extruded via ExtrudeGeometry (room stays box-only), assembled in a per-cabinet local-frame group placed by placementGeometry + exported closedYaw, with screen/control-panel/marquee/speaker-grille/coin-door-frame/contact-shadow assemblies (ledger; owner corrective task 2026-11-26)
  - byte-identical: cabinetAABB, collisionVolumes, the 0.60×0.60 footprint, SHELL.body, SHELL.screen.width/height (0.44/0.52), coinDoorPose/toggleCoinDoor/SHELL.coinDoor/SHELL.coinSlot world-space meshes, cabinetPlacements, attract phase law, paintScreen/repaintScreen/compositeScreen/drawScreen, games/, core/contract/, kernel tick
  - kind 'cabinet' volumes stay in the list but draw no mesh; the shell silhouette stays inside the volume AABB except the open coin door and side-art decals
  - emissive on exactly 2 materials per cabinet (screen face, marquee face); one-line marquee at cap 0.09 m keeping the fit law (throw below −0.5 em spacing, cap never shrunk); NEXT row keeps its own 0.18 m floor (AD-28 untouched)
  - new colour tokens live in tokens.ts only (hex-outside-tokens scan stays green); sRGB + anisotropy + ACES tone mapping land in main.ts — DW-23 reopen_if fires: exposure bounds and CABINET_LIGHT_INTENSITY are re-derived under the tone curve with the screen the brightest face, then re-pinned
  - budgets: ≤1500 triangles and ≤30 meshes per cabinet; geometries/materials shared across cabinets; per-cabinet textures only for screen/marquee/side-art/overlay; part counts computed from the part list, never typed
  - test laws narrowed, never deleted; 8 new verification tests run in Node against real three.js; full local loop green (typecheck, test, depcheck, lint-bans, registry drift, build); 4 evidence screenshots to implementation-artifacts/evidence/; the task's 9-question acceptance checklist answered yes in the story report
```

**P2 — UX-DR2 and UX-DR6 (epics.md:132, :140): split the marquee cap from the NEXT floor.**

UX-DR2 OLD (clause): `Chakra Petch marquee-title (cap 0.18m, legible ~15m; provisional face — swap candidate Saira Condensed must pass the table)`
UX-DR2 NEW (clause): `Chakra Petch marquee-title (cap 0.09m, ONE line, emissive-lit from the in-body marquee face centred ~1.71m; legible ~8m lit; provisional face — swap candidate Saira Condensed must pass the table)`

UX-DR6 OLD (clause): `NEXT signal at the marquee's authored minimum, legible from across the room`
UX-DR6 NEW (clause): `NEXT signal at its own authored minimum (0.18m cap, independent of the marquee cap), legible from across the room`

Rationale: the marquee shrinks into the cabinet body (top 1.80 m, not 2.12 m) and becomes self-lit; ~15 m legibility at 0.09 m is physically false. AD-28's score-row law (0.18 m NEXT floor) must NOT shrink with it — hence the split. UX-DR5 ("never below the authored cap height") is untouched — it reads against the new authored cap. Legibility consequence recorded: marquee is legible ~8 m lit, not 15 m; the pull ladder's rung-1 glow identity survives because emissive replaces reflected light (SM-C2 guard).

**P3 — Story 3.4, DW-43 bullet (epics.md:579): refresh the part names.**

OLD: `**And** the shell contour repeats per machine: with two or more placements, the cabinet shell contours added in Story 1.10 (marquee box, deck slab, kick plate, screen hood, side wings) extrude per placement and the repetition is testable through the placement seam (DW-43)`

NEW: `**And** the shell repeats per machine: with two or more placements, the cabinet shell added in the Story 2.0 profile rebuild (SIDE_PROFILE/INNER_PROFILE panels, front panel, and the screen/control-panel/marquee/grille/shadow assemblies, each one group per cabinet) repeats per placement and the repetition is testable through the placement seam (DW-43)`

Rationale: the named parts are deleted by the rebuild; the DW-43 law itself is unchanged.

### Deferred-work ledger — deferred-work.md (rows land at the Story 2.0 spawn by the owning burndown/ledger-gate actor)

**P4 — four row movements:**
- `DW-29`: `- 2026-11-26 status=reopened owner=2-0-epic-1-deferred-cleanup by=correct-course note=the owner-review hold (f900038/82270ad) is the smoke-equivalent realism adjudication DW-29's 1-10 clause promised; VERDICT FAIL - shell still reads vending-machine; owner-authored corrective task drives the rebuild; seated in Story 2.0 per owner ruling`
- `DW-23`: `- 2026-11-26 status=routed owner=2-0-epic-1-deferred-cleanup by=correct-course note=reopen_if FIRED - ACES tone mapping lands in main.ts under Story 2.0; exposure bounds 2/0.5 and CABINET_LIGHT_INTENSITY/REACH re-derived under the tone curve and re-pinned`
- `DW-42`: `- 2026-11-26 status=routed owner=2-0-epic-1-deferred-cleanup by=correct-course note=deck slab deleted outright by the profile rebuild; the coin-door top-band overlap closes with the part`
- `DW-43`: note-row only: `2026-11-26 by=correct-course note=law unchanged; part names superseded by the Story 2.0 profile rebuild (3-4 AC bullet reworded to name SIDE_PROFILE/INNER_PROFILE panels + assemblies)`

### UX artifact — DESIGN.md (P5: routed work order to **bmad-ux**; AGENTS.md bars hand-editing)

1. Frontmatter `typography.marquee-title` note + §Typography prose: `Physical signage — cap height 0.18m on the marquee bar; legible to ~15m.` → `Physical signage — cap height 0.09m, ONE line, emissive-lit from within the in-body marquee face (centred ~1.71m); legible ~8m lit. The on-screen NEXT row keeps its own 0.18m floor (UX-DR6 / AD-28).`
2. Frontmatter colors — new cabinet-hardware group (names fixed; hexes are starting values, tunable at smoke): `cabinet-black #161618` (vinyl-textured panels, near-black never pure), `cabinet-molding #0c0c0d` (T-molding edge wall), `cabinet-metal #8a8d91` (coin-door frame, joystick shaft), `button-red #d8342b`, `button-yellow #f2c230`, `button-white #ece8e0`. §Colors gains one line: these are the darkest fills allowed — material identity, consistent with "no pure black fills" (the light-from-a-machine law is untouched).
3. §Shapes: `80s cabinets are boxes, softened only by wear, never by radius. … No pills, no circles-as-surfaces.` → hard corners means flat plywood panels with sharp edges, no fillets and no radius — NOT axis-aligned bricks: the upright reads its side silhouette (toe-kick, sloped control panel, recessed leaning screen opening, marquee overhang); the room envelope stays box-built; "no circles-as-surfaces" bars flat circular UI surfaces, physical era hardware seen round (button caps, joystick ball-top) is exempt.
4. §Components: Marquee becomes a lit marquee face inset in the cabinet top at ~1.71m, cap 0.09m one line, emissive, retainer strips era-true, never below the authored cap height. Cabinet screen: the face self-glows (emissive, color black) — room light no longer washes it; NEXT keeps its own 0.18m minimum.

### Architecture — ARCHITECTURE-SPINE.md (P6: routed work order to **bmad-architecture**)

§Consistency Conventions, row "Room geometry & collision":

OLD (spirit): one AABB volume list is the single source for movement blocking, the occluder set for audio raycasts, **and visual extrusion** — collision/render code never hardcodes geometry.

NEW: the volume list remains the single source for movement blocking, targeting, and the audio/sightline occluder set, and for visual extrusion of **room** volumes (wall, pillar, door, street); `kind: 'cabinet'` volumes are collision/targeting/occlusion data only — never extruded. A Cabinet's visual is authored shell data in core/room (SHELL records + profiled assemblies in a per-cabinet group); its silhouette stays inside the volume AABB except the open coin door and side-art decals. The resolver is code, the volumes are data, and shell data is authored data — same in-place-rewrite law (amended by the 2026-11-26 sprint change, DW-29 reopen).

No AD numbers change; tri/mesh budgets stay out of the spine (its closing clause: the spine does not decide art content).

## 5. Implementation Handoff

**Scope: Moderate → route to Product Owner / Developer coordination, then Developer executes Story 2.0.**

| Recipient | Responsibility |
|---|---|
| This run (correct-course) | On approval: apply P1–P3 to epics.md directly (correct-course is the epics.md owning skill); record the proposal + handoff in the cycle-log at the lead's next beat |
| Story 2.0 spawn (sprint-planning/burndown owner) | Land P4 DW rows; author 2.0's spec carrying the owner task document verbatim as the implementation brief; spawn 2.0 (the story_standby lifts on this approval) |
| bmad-ux | Execute P5 DESIGN.md amendments (work order above) |
| bmad-architecture | Execute P6 spine conventions-row amendment (work order above) |
| Developer | Implement Story 2.0: DW-24 (existing AC) + the cabinet rebuild AC (P1); satisfy the 8 verification tests, the six test-law narrowings, the full local loop (typecheck, test, depcheck, lint-bans, gen-registry drift, build), 4 evidence screenshots, and the 9-question acceptance checklist — any number adjusted for overlap/gap must be listed in the report |

**Success criteria:** the acceptance checklist answers yes to all 9 questions (silhouette reads as an upright from the side; screen recessed; marquee overhangs and glows; controls at waist height sloped; collision/targeting/audio byte-identical; suite green with narrowed-not-deleted laws; budgets met; determinism untouched; screenshots evidence the look). A failed realism smoke at 2.0's close reopens DW-29 again per its standing clause.

**sprint-status.yaml:** unchanged (`2-0` stays `backlog` until spawn; no keys added).
