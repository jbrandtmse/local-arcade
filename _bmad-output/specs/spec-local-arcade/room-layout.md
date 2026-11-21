# Room Layout — fixed architecture

The canonical floor plan is the single copy at `../../planning-artifacts/ux-designs/ux-local-arcade-2026-11-20/imports/arcade-floor-plan.html` (a SPEC companion; the brainstorm-folder copy is traceability-only and superseded). The plan is valid for **room architecture only** — its year ruler, SHRINE, and FEATURED POD labels were superseded on 2026-11-19. The numeric values in this file are the contract values: where the plan and this file disagree, this file wins.

```text
 BACK OF ROOM
 +----------------------------------------------------------+
 |  PINBALL CORNER          wall slots — oldest         |   |
 |  (Hall of Models row,     ^  ^  ^  ...  ^  ^  ^        | W O R K S H O P
 |   back-left, violet)      occluder pillars             | (back-right, door
 |                             |            |             |  open, repo-fed)
 |  aisles ≥1.20m   fill: back → front, alternating L/R   |
 |                                            CASUAL ALLEY|
 |                                            (kept clean,|
 |  newest machine lands adjacent to the                   |
 |  UNFILLED STRETCH near the door = the roadmap           |
 |                                            SNACK BAR   |
 |                                            (front-right|
 |                                             orange)    |
 +----------------------[FRONT DOOR]----------------------+
                 street side: sound spills out
```

- **Front door** bottom-center; the street-door view is the load beat (sound spilling out, door opens when the room is ready).
- **Wall Slot walls:** pre-declared, evenly spaced (slot pitch ~1.40m; stand-up footprint ~0.60m; eye height 1.60m). Room interior ~19m × 12.5m — deliberately too big to take in at once.
- **Two occluder pillars** break sightlines on purpose. One occluder collider set serves both sound and sight: what blocks the ear blocks the eye (light gets authored spill — see DESIGN.md · Elevation & Depth).
- **Zones are fixed architecture**, never placed by the Layout System: Pinball Corner back-left (its own EM→today mini-timeline is era flavor, kept), Workshop back-right, Snack Bar front-right, Casual Alley mid-right (kept-clean empty in v1). Zone hues are authored lighting/material identity (violet/orange/steel/green, roadmap amber) — never UI chrome.
- **Growth grammar (fill-rule home):** registrations fill back→front, alternating left/right wall. The fill scan walks the pre-declared slots in order and takes the first unfilled-or-reclaimed slot — a slot returned by `removed` is indistinguishable from an unfilled slot to the fill function — so the newest machine always sits adjacent to the lowest-index unfilled stretch near the door. Machines never move; empty slots read in the same visual language as filled ones. When one wall's slots exhaust first, that side of the alternation is skipped. If no remaining deterministic placement passes the ≥1.20m aisle lint, Registration refuses — the room never enters lint-red. With an empty slot pool, Registration fails L0 with a deterministic "room full" refusal until a room-growth epic declares new slots.
- **Zone-bound path:** `presentationOnly` pinball Manifests bind to pre-declared Pinball Corner Zone slots and are exempt from the back→front Wall Slot fill — still deterministic.
- Aisles never narrower than 1.20m (aisle-nav lint); every Cabinet's marquee or attract screen visible from ≥2 positions on the circulation loop (sightline lint, UX-authored).
