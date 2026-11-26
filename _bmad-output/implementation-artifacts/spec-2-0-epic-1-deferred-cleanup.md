---
title: 'Story 2.0: Epic 1 deferred cleanup'
type: 'feature'
created: '2026-11-26'
status: 'ready-for-dev'
review_loop_iteration: 0
followup_review_recommended: false
baseline_revision: '95cc286018fa4ddc999a7cfa8a33f52f2471f575'
context:
  - _bmad-output/planning-artifacts/architecture/architecture-local-arcade-2026-11-19/ARCHITECTURE-SPINE.md
  - _bmad-output/planning-artifacts/sprint-change-proposal-2026-11-26.md
  - _bmad-output/implementation-artifacts/deferred-work.md
  - _bmad-output/implementation-artifacts/epic-2-context.md
warnings: ['oversized', 'multiple-goals']
deferred: []
---

<intent-contract>

## Intent

**Problem:** Epic 1's stand-up cabinet shell failed its realism check (DW-29): box-extruded bodies read as blocky toys, and the deck slab sits proud of the coin door by 0.06 m (DW-42). Two deferred Core defects ride alongside: a mouse-look defect at extreme cumulative yaw (DW-24, report-side repro unconfirmed), and exposure-law tests whose pinned bounds encode the pre-tone-mapping renderer (DW-23, reopen condition now fired).

**Approach:** Rebuild the Cabinet presentation exactly to the owner task brief -- reproduced byte-for-byte as the Implementation Brief below, the binding core of this story -- moving cabinet visuals to authored shell data in `core/room` (profiled extrusions and boxes assembled in a per-cabinet local-frame group; cabinet-kind volumes never drawn), while fixing DW-24 in the player look law (reproduce-first with literal expected values) and re-deriving then re-pinning the exposure law under the new ACES tone mapping (measure, don't guess).

## Boundaries & Constraints

**Always:**
- The brief's Do-NOT-change list binds: cabinetAABB/collisionVolumes, the 0.60x0.60 footprint, SHELL.body, screen.width 0.44/height 0.52, paintScreen/repaintScreen/compositeScreen/drawScreen, coinDoorPose/toggleCoinDoor/SHELL.coinDoor/SHELL.coinSlot, cabinetPlacements, the attract phase law, games/, core/contract math, the kernel tick. No wall-clock, no Math.random, no per-frame animation in the builder.
- Only the brief's five allowed contract changes are available (non-box geometry for cabinets, no mesh for kind 'cabinet' volumes, emissive on exactly 2 materials, one-line 0.09 m marquee, six new tokens in tokens.ts only).
- AD-3 fixed-60Hz determinism; AD-4 transcendentals only through the contract math module; AD-1 import direction; AD-28's NEXT-row 0.18 m floor survives as its own cap constant.
- The spine's "Room geometry & collision" conventions row as amended 2026-11-26 (commit a945506) is the binding convention for the rebuild.
- The six test-law NARROWINGS in the sprint change proposal are narrowings, never deletions -- each narrowed law keeps a test in the same file.
- Test expected values are literals, never re-derived from the subject's constants.
- The screen face stays the brightest face; both cabinet lights stay.

**Never:**
- New npm packages, downloaded models or 3D assets, react-three-fiber or any game framework.
- Edits to core/contract math, the kernel tick, games/ sims, or hand-edits to generated/.
- Hand-editing planning artifacts under `_bmad-output/`, hand-appending `_bmad-output/implementation-artifacts/deferred-work.md`, or touching any `sprint-status.yaml` (the tracker is lead-owned; the planning-artifacts stray is never committed or deleted).
- git commit or git push anywhere in this story -- the plan stage leaves everything uncommitted for the lead's validation gate.
- Re-pinning a test by loosening its law beyond the six enumerated narrowings.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Extreme cumulative yaw (DW-24) | continuous mouse dx driving cumulative yaw beyond one full turn (target magnitude beyond 8 pi rad), pitch holding its +/-85 deg clamp | yaw stays in the canonical range after each step; the camera view basis matches the unwrapped orientation within float tolerance; the floor never replaces the ceiling at any magnitude | No error -- a law fix; reproduction status is reported honestly (see Design Notes) |
| Marquee title too wide for one line | a title whose longest word cannot fit the one-line 0.09 m cap even at the -0.5 em spacing floor | fitLine throws (the throw law survives; its stacking form becomes the one-line form) | Existing throw path |
| Cabinet-kind volume at scene build | a collisionVolumes entry with kind 'cabinet' | the volume is still present in the data (collision/targeting/occlusion intact); zero meshes drawn for it; room volumes stay box-extruded | n/a |
| Local-frame containment | world bbox of every child of a cabinet group | within the brief's x -0.302..0.302 local band, with exceptions only for the open coin door and side-art decals per the brief's verification list | Test failure |
| Exposure re-derivation (DW-23) | ACESFilmicToneMapping at toneMappingExposure 1.0 active in the renderer entry | new literal bounds plus new CABINET_LIGHT_INTENSITY/CABINET_LIGHT_REACH literals, each with the measured derivation recorded (measured against three 0.187.0's tone curve, not guessed) | n/a -- values measured before pinning |
| Fresh-environment ordering | every added or changed test on a clean environment, run in either order | all pass | n/a |

</intent-contract>

## Code Map

- `core/room/cabinets.ts` -- SHELL part records (deck/kick/hood/sidePanels at :77-80 are deleted; marquee re-authored), SHELL_PART_MESHES (:89, becomes computed), closedYaw (:256, currently private -- the brief requires it exported), cap constants (:320 MARQUEE_CAP_M splits; new SCREEN_NEXT_CAP_M), light/illuminance constants (:349-350, :378-379), coin-door law (untouched).
- `core/room/scene.ts` -- the rebuild site. `Three` seam interface (:94-107), volume-extrusion loop (:250-257, cabinet kind must be skipped), cabinet loop (:375-517, replaced by the brief's group + assemblies), the two point lights, exported AMBIENT/DOOR_GLOW constants (untouched).
- `core/main.ts` -- renderer construction (ACES + exposure land here), camera.rotation.order "YXZ" (:120) and frame rotation.set (:456, untouched), the real Three adapter (:127-137, gains new seam methods), repaintScreen/compositeScreen cap arguments (:562, :595 -> SCREEN_NEXT_CAP_M).
- `core/room/tokens.ts` -- only home for the six new cabinet-hardware tokens (brief's hexes); hex-scan guard lives in scene.test.ts.
- `core/room/surfaces.ts` -- paintMarquee (:400s) + fitLine + titleLines: one-line law under contract change 4; NEW paintSideArt/paintControlOverlay/paintContactShadow painters land here; paintScreen/repaintScreen/compositeScreen/drawScreen stay byte-identical.
- `core/player.ts` -- DW-24 fix site: look law at :187-191 (yaw accumulates unwrapped today), MOUSE_SENSITIVITY/PITCH_LIMIT.
- `core/seat.ts` -- playPoseFor (:129-138) derives the seated pitch from SHELL.screen.centerY; it follows the 1.28 re-author automatically. Never hardcode the pose.
- `core/contract/math.ts` -- quadrant-reduced sin/cos; header law "keep angles wrapped". Never edited; the DW-24 fix must use plain arithmetic.
- `core/room/scene.test.ts` -- the fake Three (:101-167) and all the law scans: emissive scan (:385-391), geometry scan (:393-401), mesh-count formula + no-wall-clock scan (:403-422), standoff pin (:430-432), exposure law (:449-479), DW-29 contour law (:578-657), IS-value pins (:672-707), hex-token guard (:796-822).
- `core/room/cabinets.test.ts` -- SHELL_PART_MESHES pin (:81), cap-constant pin (:268-269), paintMarquee throw tests (:272-299), NEXT-at-cap pins (:302+), visitSession walk (:545-598) with play-pose x/z pins (:577), twin-run determinism (:600-610).
- `core/player.test.ts` -- look-accumulation pin at :97-98 ("yaw += exactly 1 rad"); DW-24 reproduction test lands here.
- `core/seat.test.ts` -- pitch derivation at :233 re-derives from the constant and follows 1.28 automatically (verify, don't hand-pin).
- `core/patrons/scheduler.test.ts` -- :566 pins MARQUEE_CAP_M as the NEXT minimum; moves to SCREEN_NEXT_CAP_M.
- `core/main-glue.test.ts` -- source pins of main.ts (camera order, rotation.set, seam mapping list :117-125, clear color); gains the new seam mappings and renderer posture pins.
- `core/room/cabinets-qa.test.ts`, `core/room/scene-qa.test.ts` -- fake-Three rigs that must speak every new seam method.
- `ci/lint-bans.mjs` -- scans only `games/<game-id>/sim/**`; core/ is not banned (context only, untouched).
- `_bmad-output/implementation-artifacts/evidence/` -- where the brief's four screenshots land.
- `_bmad-output/implementation-artifacts/deferred-work.md` -- DW-23/24/29/42 entries (read via ledger tooling; append-only, never hand-edited).

## Implementation Brief

The section below, up to the next heading, is the owner's cabinet-rebuild task brief reproduced **byte-for-byte** from `_bmad-output/planning-artifacts/sprint-change-proposal-2026-11-26-owner-task.md` (15,484 bytes; no rewording, reordering, or renumbering). It is the binding core of the rebuild: its numbers, lists, meshes, painters, budgets, tests, and acceptance questions are used as given and never re-derived.

# Task: rebuild the stand-up cabinet shell so it looks like a real 1980s arcade cabinet

## Why
The current cabinet is a 0.60 x 0.60 x 1.80 m brick with thin boxes stuck on its
front. Real upright cabinets are made of flat plywood panels, but they have a
distinctive SIDE SILHOUETTE: a toe-kick at the floor, a control panel that slopes
toward the player at waist height, a screen that is recessed between the side
panels and leans back, and a lit marquee that overhangs the screen at the top.
Your job is to build that shape. This is a geometry and materials task only.

"Hard corners" in DESIGN.md means flat panels with sharp edges and no rounded
fillets. It does NOT mean every part must be an axis-aligned cuboid.

## Do NOT change (these must stay byte-identical)
- `cabinetAABB`, `collisionVolumes`, the 0.60 x 0.60 m footprint, `SHELL.body`.
  Collision, targeting and audio occlusion keep using the plain box.
- `SHELL.screen.width` (0.44) and `SHELL.screen.height` (0.52).
- `paintScreen`, `repaintScreen`, `compositeScreen`, `drawScreen` in
  `core/room/surfaces.ts`.
- `coinDoorPose`, `toggleCoinDoor`, `SHELL.coinDoor`, `SHELL.coinSlot`.
- `cabinetPlacements`, the attract phase law, anything under `games/`,
  anything in `core/contract/`, the kernel tick.
- No wall-clock, no `Math.random`, no per-frame animation added to the builder.
- No downloaded models, no image files, no new npm packages. Everything is
  built in code from three.js primitives and canvas-painted textures.

## Contract changes this task is allowed to make
1. Cabinet visuals may use `ExtrudeGeometry`, `CylinderGeometry` and
   `SphereGeometry` in addition to `BoxGeometry`. The room (walls, pillars,
   floor, ceiling, door) stays box-only.
2. The scene loop must stop drawing a mesh for collision volumes whose
   `kind === "cabinet"`. The volume stays in the list; it just is not rendered.
3. `emissive` is allowed on exactly two materials per cabinet: the screen face
   and the marquee face. Nowhere else.
4. Marquee lettering becomes ONE line at 0.09 m cap height (see section 6).
5. New colour tokens are added to `core/room/tokens.ts` (see section 5). No
   hex literal may appear anywhere else.

Update the tests that pin the old rules so they pin the new rules instead.
Never delete a test just to make the suite green; narrow it. Examples:
- "BoxGeometry only" becomes "room meshes are boxes; non-box geometry appears
  only inside cabinet groups".
- "zero emissive anywhere" becomes "emissive appears only on screen-face and
  marquee-face materials".
- "one mesh per volume" becomes "one mesh per NON-cabinet volume".
- The mesh-count pin stays a formula derived from data, never a typed number.

## 1. Coordinate frame
Build every cabinet inside its own group, in a LOCAL frame:
- origin = centre of the footprint, on the floor
- +Y = up
- +Z = the direction the cabinet faces (toward the player)
- X = across the cabinet's width, from -0.30 to +0.30

Then place the group once:
- `group.position.set(center.x, 0, center.z)` from `placementGeometry(slotId)`
- `group.rotation.y = closedYaw(facing)` (export the existing `closedYaw`
  from `cabinets.ts`)

Add to the `Three` seam in `scene.ts`, and to the real adapter in
`core/main.ts`, and to every headless fake in the test files:
- `group()` returning an object with `position`, `rotation` and `add(child)`
- `extrudeGeometry(points, depth)` where `points` is an array of `{x, y}`;
  implement with `new THREE.Shape(...)` and
  `new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false })`
- `cylinderGeometry(radiusTop, radiusBottom, height, radialSegments)`
- `sphereGeometry(radius, widthSegments, heightSegments)`
- `mesh(geometry, material)` must also accept an ARRAY of materials
- `standardMaterial` params gain `emissiveMap`, `emissiveIntensity`,
  `metalness`

The coin door and coin slot are the ONE exception: keep them as world-space
meshes posed by `coinDoorPose` exactly as today. They are not children of the
group. The new front panel is designed so they still sit correctly.

## 2. The two profiles (authored data, put them in `cabinets.ts`)
Each point is (z, y) in metres in the local frame: z is depth (front is
positive), y is height. List them in this order; each polygon closes back to
its first point.

SIDE_PROFILE (the plywood side panel outline):

| # | z | y | what it is |
|---|------|------|------------|
| 0 | -0.30 | 0.00 | back, floor |
| 1 | 0.24 | 0.00 | toe-kick, floor |
| 2 | 0.24 | 0.10 | top of toe-kick recess |
| 3 | 0.30 | 0.10 | front panel starts |
| 4 | 0.30 | 0.90 | front lip of control panel |
| 5 | 0.12 | 0.97 | rear of control panel |
| 6 | 0.02 | 1.57 | top of screen opening |
| 7 | 0.26 | 1.63 | marquee overhang, bottom front |
| 8 | 0.26 | 1.80 | marquee, top front |
| 9 | -0.18 | 1.80 | top, toward the back |
| 10 | -0.30 | 1.66 | back top chamfer |

INNER_PROFILE (the solid core between the two side panels; it sits slightly
behind the side panel edges so the sides stand proud and the screen is
recessed):

| # | z | y | what it is |
|---|------|------|------------|
| 0 | -0.29 | 0.00 | back, floor |
| 1 | 0.23 | 0.00 | kick board, floor |
| 2 | 0.23 | 0.10 | top of kick board |
| 3 | 0.28 | 0.10 | front panel starts |
| 4 | 0.28 | 0.895 | front lip of control panel |
| 5 | 0.115 | 0.965 | rear of control panel |
| 6 | 0.06 | 0.99 | bottom of screen recess |
| 7 | -0.04 | 1.57 | top of screen recess |
| 8 | 0.25 | 1.63 | speaker panel meets marquee |
| 9 | 0.25 | 1.795 | marquee, top front |
| 10 | -0.18 | 1.795 | top |
| 11 | -0.29 | 1.66 | back top chamfer |

## 3. Structural meshes
A Shape is drawn in the XY plane and extruded along +Z. To turn a profile
into a panel that runs front-to-back, map profile z to shape x and profile y
to shape y, then set `mesh.rotation.y = -Math.PI / 2`. After that rotation the
shape's x axis points along local +Z and the extrusion runs from the mesh's
x position toward NEGATIVE x.

| Mesh | Geometry | Extrude depth | mesh.position.x | Occupies x |
|---|---|---|---|---|
| Left side panel | SIDE_PROFILE | 0.019 | -0.281 | -0.300 to -0.281 |
| Right side panel | SIDE_PROFILE | 0.019 | 0.300 | 0.281 to 0.300 |
| Core | INNER_PROFILE | 0.562 | 0.281 | -0.281 to 0.281 |

ExtrudeGeometry has two material groups: index 0 is the flat cap faces,
index 1 is the edge walls. Use a material array:
- Side panels: `[sideColourMat, moldingMat]`. The black edge wall is the
  T-molding that every real cabinet has around its side panels.
- Core: `[cabinetBlackMat, cabinetBlackMat]`.

Front panel: one box 0.562 wide x 0.80 high x 0.02 deep, centre at
(x 0, y 0.50, z 0.29). Its front face is at z = 0.30, which is the plane
`coinDoorPose` already mounts the coin door on. Material: cabinet black.

## 4. Detail assemblies
Each is a child group of the cabinet group, so tilt is one rotation.

### 4a. Screen assembly
- Sub-group position (x 0, y 1.28, z 0.01). `rotation.x = -0.1707`
  (about 9.8 degrees). CHECK: the top edge of the screen must be FURTHER BACK
  (smaller z) than the bottom edge. If it leans toward the player, flip the
  sign.
- Bezel: box 0.562 x 0.585 x 0.004 at sub-group local z = 0.002. Glossy black
  (roughness 0.25). This is the glass and black surround.
- Screen face: box 0.44 x 0.52 x 0.003 at local z = 0.0055, centred. This
  carries the existing live screen canvas texture. Its handle must still be
  pushed to `screens` exactly as now.
- Update `SHELL.screen.centerY` to 1.28 and `SHELL.bezel` to match. The seat
  camera in `core/seat.ts` reads `SHELL.screen.centerY`; let it follow.

### 4b. Control panel assembly
- Sub-group position (x 0, y 0.9375, z 0.2075). `rotation.x = +0.3709`
  (about 21 degrees). CHECK: the FRONT edge of the panel must be LOWER than
  the rear edge. If not, flip the sign.
- Overlay: box 0.562 x 0.003 x 0.19 at local y = 0.0015. Carries a painted
  canvas texture (section 5).
- Joystick, at local x = -0.13, z = 0:
  - dust washer: cylinder radius 0.022, height 0.002, 16 segments, black
  - shaft: cylinder radius 0.005, height 0.055, 8 segments, light grey,
    centre at local y = 0.03
  - ball top: sphere radius 0.017, 12 x 8 segments, red, centre at local
    y = 0.065
- Two play buttons, at local x = +0.07 and +0.13, z = 0: each is a cylinder
  radius 0.014, height 0.008, 16 segments, with a black ring cylinder radius
  0.018, height 0.003 under it. One red, one yellow.
- One start button at local x = 0.0, z = -0.06: cylinder radius 0.010,
  height 0.006, white.

### 4c. Marquee assembly
- Marquee face: box 0.562 x 0.15 x 0.005, centre (x 0, y 1.7125, z 0.2525).
  Carries the marquee canvas texture.
- Two retainer strips: boxes 0.562 x 0.010 x 0.008, black, centres at
  y = 1.6325 and y = 1.7925, z = 0.254.
- Update `SHELL.marquee` to width 0.56, height 0.15, centerY 1.7125. The old
  marquee stood above the body at up to 2.12 m; the new one is inside the
  1.80 m body.

### 4d. Speaker grille
Under the marquee, on the sloping underside between INNER_PROFILE points 7
and 8: three thin black boxes 0.20 x 0.004 x 0.012 spaced 0.03 apart,
parented to a sub-group tilted to that slope. Purely decorative.

### 4e. Coin door frame
Around the existing coin door (0.26 x 0.30 at y 0.58): a dark grey frame box
0.30 x 0.34 x 0.004 at z = 0.302, behind the door. Add a lit coin-reject
button: box 0.03 x 0.04 x 0.004 on the frame beside the slot, red.

### 4f. Contact shadow
One flat box 0.80 x 0.002 x 0.80 at y = 0.022, centred on the cabinet, with a
canvas texture that is a soft black radial gradient fading to fully
transparent at the edge (`transparent: true`, `depthWrite: false`). This
grounds the cabinet on the carpet.

### Remove
Delete the old `deck`, `kick`, `hood` and `sidePanels` parts and their SHELL
records. Set `SHELL_PART_MESHES` to the new count, computed from the list of
parts, not typed by hand.

## 5. Materials, textures, renderer
Add these tokens to `tokens.ts` (names fixed, hexes are starting values):
- `CABINET_BLACK = 0x161618` (textured vinyl panels)
- `CABINET_MOLDING = 0x0c0c0d` (T-molding edge)
- `CABINET_METAL = 0x8a8d91` (coin door frame, joystick shaft)
- `BUTTON_RED = 0xd8342b`, `BUTTON_YELLOW = 0xf2c230`, `BUTTON_WHITE = 0xece8e0`

Material settings:
- Side panel colour: the placement's `hue` darkened to about 35% brightness,
  roughness 0.7.
- Vinyl: `CABINET_BLACK`, roughness 0.8.
- Bezel: `CABINET_BLACK`, roughness 0.25.
- Metal parts: `CABINET_METAL`, roughness 0.4, metalness 0.3. Do not go above
  0.3; there is no environment map and higher metalness renders black.
- Buttons and ball top: roughness 0.35.
- SCREEN FACE: `color: 0x000000`, `emissive: FACE_TINT`,
  `emissiveMap: screenTexture`, `emissiveIntensity: 1.0`, roughness 0.3.
  The screen now glows by itself and room lights no longer wash it out.
- MARQUEE FACE: same pattern with the marquee texture,
  `emissiveIntensity: 1.2`.

Painted textures (new painters in `surfaces.ts`, same injected-canvas pattern
as the existing ones, colours passed in as token CSS):
- `paintSideArt`: a 0.50 x 0.70 m panel. Fill with the dark side colour, then
  draw bold ORIGINAL abstract shapes in the placement's `hue` and
  `marqueeHue`: three diagonal stripes of different widths and one large
  simple shape. Do not copy artwork from any real cabinet. Mount one on the
  outside of each side panel as a box 0.002 thick, centre y = 0.50,
  z = -0.02, at x = -0.301 and x = +0.301.
- `paintControlOverlay`: 0.562 x 0.19 m. Dark ground, a thin border line in
  `marqueeHue`, and a small ring around each control position.
- `paintContactShadow`: the radial gradient from 4f.

Renderer fixes in `core/main.ts`:
- Every `CanvasTexture` gets `texture.colorSpace = THREE.SRGBColorSpace`.
  Right now none do, which is why colours look washed out.
- Every `CanvasTexture` gets
  `texture.anisotropy = renderer.capabilities.getMaxAnisotropy()`.
- `renderer.toneMapping = THREE.ACESFilmicToneMapping`,
  `renderer.toneMappingExposure = 1.0`.

After these changes the lighting will look different. Re-tune
`CABINET_LIGHT_INTENSITY` by eye so the cabinet front is readable but the
screen is clearly the brightest thing on the machine. Keep both point lights.

## 6. Marquee lettering (contract change 4)
- Set the marquee cap height to 0.09 m and paint the title on ONE line.
- Keep the existing fit law: measure, tighten letter-spacing down to the
  existing floor, and throw loudly if the title still does not fit. Never
  shrink the cap below 0.09 m.
- Leave the 0.18 m cap for the on-screen NEXT row untouched; it uses the same
  constant today, so split it into two constants first:
  `MARQUEE_CAP_M = 0.09` and `SCREEN_NEXT_CAP_M = 0.18`.

## 7. Budgets
- At most 1,500 triangles and 30 meshes per cabinet.
- Create each geometry and each non-textured material ONCE and reuse it for
  every cabinet. Only the screen, marquee, side art and overlay textures are
  per-cabinet.

## 8. How to verify (you cannot see the result, so test it)
Write these tests with real three.js geometry in Node; `computeBoundingBox`
works without a browser.
1. Every cabinet mesh's bounding box, in the local frame, is inside
   x -0.302..0.302, y 0..1.80, z -0.30..0.30. The coin door when open and
   the side art decals are the only allowed exceptions.
2. The side panel bounding box is exactly 0.019 wide in x, 0.60 deep in z,
   1.80 high in y. This proves the extrusion rotation is right.
3. Screen assembly: transform the screen face's top-centre and bottom-centre
   points to the local frame; top z < bottom z.
4. Control panel: front-edge y < rear-edge y.
5. The screen face centre is at least 0.04 m behind the side panel edge at
   the same height. This proves the screen is recessed.
6. Exactly two materials per cabinet carry `emissive`.
7. No mesh is created for a `kind === "cabinet"` collision volume, and the
   volume is still present in `collisionVolumes` with its old bounds.
8. Triangle count per cabinet is at most 1,500.

Then run the full loop: `npm run typecheck`, `npm test`,
`node ci/depcheck.mjs`, `node ci/lint-bans.mjs`,
`node tools/gen-registry.mjs && git diff --exit-code -- generated/`,
`npm run build`.

Then run `npm run dev` and save four screenshots to `evidence/`:
front at 2 m, three-quarter view at 2 m, pure side view at 2 m, and from the
front door at 11 m.

## 9. Acceptance checklist (answer each one yes or no in your report)
- From the side, is the outline clearly NOT a rectangle? Can you see the
  toe-kick notch, the sloped control panel, the leaning screen opening and
  the marquee overhang?
- Is the screen set back between the side panels, with the side panels
  visibly standing in front of it?
- Is there a joystick with a ball top and at least two round buttons on a
  sloped panel at about waist height (0.90 to 0.97 m)?
- Is the marquee a wide, short strip at the very top, about 0.15 m tall, with
  the title on one line?
- Are the screen and the marquee the two brightest surfaces on the cabinet in
  a dark room?
- Do the side panels have a black edge all the way round and artwork on the
  outside?
- Does the coin door still open and close on E, hinged where it was?
- Does the game still play on the screen when seated?
- Is the walk-into collision the same as before?

If any answer is no, fix it before reporting done. If a number in this
document makes two parts overlap or leaves a visible gap, adjust that number
by the smallest amount that fixes it and list the change in your report.

## Tasks & Acceptance

**Execution:**
- `core/player.ts` -- DW-24: wrap yaw into a canonical range at every look step using plain arithmetic on multiples of `math.PI * 2` (no new transcendentals; pitch clamp untouched) -- keeps |yaw| bounded so the "keep angles wrapped" contract-math law and the renderer Euler can never meet a huge angle.
- `core/player.test.ts` -- write the DW-24 reproduction test FIRST (cumulative yaw driven well beyond one full turn, pitch pinned at its clamp, expected values as literals), and run it before touching the fix; narrow the :97-98 accumulation pin to accumulation-modulo-wrap -- reproduce-before-fix per the ledger's "repro unconfirmed", and the proposal's enumerated narrowing.
- `core/room/cabinets.ts` -- export `closedYaw`; delete the SHELL deck/kick/hood/sidePanels parts; re-author SHELL.marquee to the brief's numbers (0.56 x 0.15, centerY 1.7125); compute SHELL_PART_MESHES from the part list; split the caps: MARQUEE_CAP_M = 0.09 (one line) and a new SCREEN_NEXT_CAP_M = 0.18 (AD-28 floor) -- brief parts/marquee/cap-split; closes DW-42 with the deck slab's deletion.
- `core/room/tokens.ts` -- add the six cabinet-hardware tokens at the brief's hexes -- tokens.ts is their only home (the hex-scan guard pins that).
- `core/room/scene.ts` -- replace the cabinet loop with the brief's per-cabinet local-frame group (position/rotation per brief step 1), the structural-mesh table, assemblies 4a-4f, the contact shadow, and the brief's shared-geometry/material rules; skip kind 'cabinet' volumes in the volume-extrusion loop; emissive on exactly 2 materials; stay inside the brief's mesh/triangle budgets; extend the `Three` seam for every new primitive -- the rebuild core (DW-29) under the spine's amended conventions row.
- `core/room/surfaces.ts` -- change ONLY paintMarquee/fitLine (one-line law under the 0.09 cap) and add paintSideArt/paintControlOverlay/paintContactShadow; paintScreen/repaintScreen/compositeScreen/drawScreen stay byte-identical -- brief contract change 4 plus its do-not-touch list.
- `core/main.ts` -- renderer posture: ACESFilmicToneMapping, toneMappingExposure 1.0, SRGBColorSpace on CanvasTextures, anisotropy; the real Three adapter gains the new seam methods; repaintScreen/compositeScreen call sites pass SCREEN_NEXT_CAP_M; retune CABINET_LIGHT_INTENSITY by eye per the brief AFTER the tone mapping lands, keeping both lights -- DW-23 substrate and the brief's renderer fixes.
- `core/room/scene.test.ts` -- apply the proposal's six narrowings in place: emissive scan 0 -> exactly 2; geometry scan allows cabinet profile/group assembly through the seam while room volumes stay box-built; drop the 0.06-proud deck contour law (its part is deleted -- DW-42); re-pin the exposure law at the new measured literals (DW-23); update the mesh-count formula to the new shell; hex-token floor 22 -> 28; and update the marquee centerY 1.87 pin to 1.7125. Extend the fake Three with group/child support so the brief's world-bbox and tilt checks can run.
- `core/room/cabinets.test.ts` -- re-derive the seat-pose pins at screen centerY 1.28 (the play-pose x/z pins are centerY-independent and stay), update the SHELL_PART_MESHES and cap-constant pins to the split, and add the brief's local-frame verification tests that ride this fake (bbox containment with the open-coin-door/side-art exceptions, side-panel bbox exactly 0.019 x 1.80 x 0.60, screen-tilt and control-panel-tilt ordering, screen set back >= 0.04 m, exactly-2-emissive, no mesh for cabinet-kind volumes with the volume still present, <= 1500 triangles).
- `core/main-glue.test.ts` -- extend the fake Three and the seam-mapping source pins (:117-125) with the new methods, plus renderer-posture pins (tone mapping, exposure) -- every headless fake must speak the extended seam; the glue tests are the renderer-posture tripwire.
- `core/room/cabinets-qa.test.ts`, `core/room/scene-qa.test.ts` -- extend their fake Threes with the same new seam methods -- the brief's "every headless fake" requirement.
- `core/seat.test.ts`, `core/patrons/scheduler.test.ts` -- verify the automatic follows: the seated pitch re-derives from SHELL.screen.centerY at 1.28 (about atan2(-0.32, 0.80); seat.test.ts:233 derives it from the constant, never hand-pin it), and scheduler.test.ts:566's NEXT-minimum pin moves to SCREEN_NEXT_CAP_M -- the proposal's seat-pose consequence.
- `_bmad-output/implementation-artifacts/evidence/` -- capture the brief's four screenshots (front 2 m, three-quarter 2 m, pure side 2 m, from the front door at 11 m) -- the brief's final verification step; review against its acceptance checklist.

**Ledger inbox (Rule 17):**
- DW-29 -- addressed by the rebuild tasks above (scene.ts, cabinets.ts, surfaces.ts, tokens.ts, evidence screenshots).
- DW-42 -- addressed; closes with the deck slab's deletion (nothing left proud of the coin door; the no-cabinet-part assertion covers it).
- DW-24 -- addressed by the player.ts wrap law plus the literal-value reproduction test; if the reproduction does not fail pre-fix at repo level, say so honestly in the report (see Design Notes).
- DW-23 -- addressed by the measure-then-re-pin task on scene.test.ts plus the main.ts retune; the derivation is recorded per Design Notes.
- `deferred-work.md` is never hand-edited by this story -- the ledger is append-only through the lead's tooling at story completion.

**Acceptance Criteria:**
- Given the rebuilt shell, when the brief's eight verification tests run, then each passes at the brief's literal numbers, including the open-coin-door and side-art containment exceptions.
- Given mouse-look, when cumulative yaw exceeds one full turn at the pitch clamp, then yaw holds the canonical range, the view basis never flips the floor and ceiling, and pitch stays clamped at +/-85 degrees (the DW-24 test is green).
- Given ACESFilmicToneMapping at exposure 1.0, then the exposure tests pin the newly MEASURED bound and light literals (DW-23), the derivation is recorded in the completion report, both cabinet lights remain, and the screen face stays the brightest face.
- Given the proposal's six narrowed test laws, then each narrowed law still has a passing test in the same file -- nothing was deleted.
- Given the full loop (`typecheck`, `test`, `depcheck`, `lint-bans`, registry-drift) then all are green, and `npm run build` once is green.
- Given the completion report, then the brief's nine acceptance questions are each answered and every overlap adjustment is listed with its smallest-number justification.
- Given a fresh environment, then every added or changed test passes, in either order.

## Spec Change Log

## Review Triage Log

## Design Notes

**Governing AD ids (Rule 6):** AD-1 (import direction: all rebuild code stays inside `core/room/` + `core/main.ts`; `depcheck` must stay clean), AD-3 (fixed-60Hz determinism: no wall-clock, no Math.random, no per-frame animation in the builder -- the existing scene.ts source scan keeps policing this), AD-4 (transcendentals only via the contract math module; the DW-24 wrap is plain arithmetic and honors math.ts's "keep angles wrapped" law), AD-11 (registry untouched: no game added, renamed, or rewired; the drift command must stay clean), AD-28 (the NEXT row's own 0.18 m floor survives verbatim as SCREEN_NEXT_CAP_M; the marquee cap becomes a separate 0.09 m law per sprint-change UX-DR2/UX-DR6). The spine's "Room geometry & collision" conventions row (amended 2026-11-26 by commit a945506) is the binding convention for the rebuild: cabinet-kind volumes are collision/targeting/occlusion data and are never extruded; Cabinet visuals are authored shell data in per-cabinet groups inside the volume AABB except the open coin door and side-art decals. P6 added no AD ids and deliberately left mesh/triangle budgets out of the spine -- those bind through the brief and its tests.

**Spine divergence: resolved.** An earlier planning pass flagged this conventions row as stale against the owner-approved change. The P6 bmad-architecture work order landed mid-plan (a945506; booked by 9759efe) and amended the row in place, so the spine and the brief now agree and the row governs normally. No spine edit is owed by this story.

**DW-24 (extreme-yaw floor flip).** The ledger records the owner's browser report with repo-level reproduction unconfirmed; Epic 1's smokes only reached cumulative yaw around 2.5 rad. Investigation at baseline could not produce the flip at repo level: the shipped camera uses rotation.order "YXZ" with rotation.set(pitch, yaw, 0), three keeps the view's up-vector constant under any yaw magnitude in that order, and the contract-math quadrant reduction is exact at these magnitudes. The browser-side mechanism therefore stays a labelled inference (residual risk: the defect may have been report-time-only, or lives in a path this suite does not exercise). The law fix ships regardless: wrap yaw into the canonical range every step, e.g.

```
const TWO_PI = math.PI * 2;
yaw = yaw - TWO_PI * Math.floor((yaw + math.PI) / TWO_PI); // plain arithmetic, AD-4-safe
```

The reproduction test is written first, its expected values are literals (never re-derived from MOUSE_SENSITIVITY, PITCH_LIMIT, or the wrap constant), and its pre-fix run outcome is recorded honestly: fail = reproduced, pass = not reproduced at repo level and the test pins the law against the reported symptom.

**DW-23 (exposure law under ACES).** The current law (scene.test.ts:449-479) encodes three decay=2 point lights with NoToneMapping, where a light's own contribution is INTENSITY / d^2 -- that is why the bounds pin 2 (near, at the authored standoff) and 0.5 (far, at REACH). With ACESFilmicToneMapping at exposure 1.0 those numbers no longer describe what a visitor sees, and the reopen condition has fired. Re-derivation method, measure-don't-guess: (1) with the tone mapping landed, evaluate three 0.187.0's ACES tone curve numerically in node (the module is importable headless) over the illuminance range the two lights produce at the marquee standoff and at the reach distance; (2) choose new CABINET_LIGHT_INTENSITY / CABINET_LIGHT_REACH and new bound literals so the screen face remains the brightest face, the 0.09 m one-line marquee stays legible at ~8 m lit (UX-DR2), and the 0.18 m NEXT floor is unaffected; (3) apply the brief's by-eye retune only after this, keeping both lights, and if geometry overlaps force adjustments, take the smallest numbers and list them. Record the measured pre/post curve values and chosen literals in the completion report; pin them as IS values in scene.test.ts. Anything inferred rather than measured gets labelled as such.

**plan: decisions recorded (unattended-run policy).**
- Baseline: recorded at clean-tree start (95cc286, the stage write-ahead itself). The lead's P5/P5b/P6 commits (40eba71..9759efe) landed mid-plan; they touch only `_bmad-output/` planning docs, so the Code Map and pins above hold at the branch tip.
- Epic context cache: the lead booked a cache invalidation (051c17c) that emptied the working-tree `epic-2-context.md`. Per the dispatch ("reuse, do not recompile") the committed HEAD content was read read-only; its Technical Decisions and Cross-Story rows for Story 2.0 already match the post-P5/P6 planning state, so nothing needed recompiling for this story.
- SHELL_PART_MESHES becomes computed from the part list (brief requirement); tests pin the computed export, not a hand-typed count.
- `closedYaw` is exported from cabinets.ts and imported by scene.ts -- never duplicated.
- New primitives reach scene.ts only through the extended `Three` seam; the four fake rigs (scene.test.ts, main-glue.test.ts, cabinets-qa.test.ts, scene-qa.test.ts) learn the same method set, and scene.test.ts's fake gains group/child support so the brief's world-bbox and tilt checks can compute.
- `multiple-goals` warning: the three DW dispositions ride one story by the lead's dispatch and the proposal (clean-footing goal). Only DW-23 couples to the rebuild (the tone-mapping substrate); DW-24 is an independent Core fix.

**Falsifiability (mutation lines).** Removing the yaw wrap fails the DW-24 test; setting a side-panel depth to 0.020 fails the bbox-containment test; adding a third emissive material fails the emissive-count test; removing the cabinet-kind skip fails the no-mesh-for-cabinet-volume test; leaving the old exposure literals while ACES is live fails the exposure test. Each narrowed law's replacement test must exist for the narrowing to count.

**Integration seams (Rules 1-2).** Consumes: nothing new -- the story edits existing seams. Consumed-by: Story 2.3 authors light spill against this story's renderer posture (ACES + the re-pinned exposure literals + the two emissive faces + split caps); any later tone-mapping or exposure change must re-derive the DW-23 law. Stories 2.1/2.2 ride the cabinet AABB volume data and the attract law, which this story never touches. Sibling laws are extended, not copied: the new painters extend the surfaces.ts paint* family, and the fake Threes extend the shared fake pattern in place.

**X.0 triage table (epic-gates 6c; lead-appended at spec validation).**

| Item | Source | Disposition |
|---|---|---|
| DW-24 | Epic 1 ledger (owner browser report, repo-level repro unconfirmed) | own:2-0 — planned in Tasks (player.ts wrap law + literal-value reproduction test) |
| DW-29 | Epic 1 ledger; owner realism FAIL adjudicated at the owner-review hold (its 1-10 reopen_if fired via correct-course) | own:2-0 — the byte-embedded owner brief + rebuild tasks |
| DW-23 | Epic 1 ledger, routed to 2-0 by P4 (ACES AC re-derivation clause) | own:2-0 — measure-then-re-pin task, derivation recorded |
| DW-42 | Epic 1 ledger, routed to 2-0 by P4 (deck slab vs coin door overlap) | own:2-0 — closes with the deck slab's deletion |
| DW-8 / DW-25 / DW-39 | ledger `decision-pending`, owner-only questions parked at inbox U-3/U-4/U-5 | skipped — owner-only, no story work until answered; this spec cites none |
| epic-1-retro-item-1 (falsifiable-pin convention into `_bmad/custom/skill-rules.md`) | Epic 1 retro action item, owner | excluded — `_bmad/` files are owner-only (U6 escalate category); the convention is already applied in-story by the plan's literal-value laws |
| epic-1-retro-item-2 (raise API_TIMEOUT_MS / inference-server slots) | Epic 1 retro action item, owner | excluded — launch environment is owner-side |
| epic-1-retro-item-3 (tracker no-touch clause in every spawn prompt) | Epic 1 retro action item, lead | lead-standing — in practice since Epic 1; closes at the Epic 2 retro review |

## Verification

**Commands:**
- `npm run typecheck` (loop) -- expected: clean.
- `npm test` (loop) -- expected: all tests green, including every new and narrowed one; if a single foreground call runs long, split by test file (`node --test <file>...` or `--test-name-pattern`) but land all files green in the session.
- `node ci/depcheck.mjs` (loop) -- expected: AD-1 import direction clean.
- `node ci/lint-bans.mjs` (loop) -- expected: clean (games/sim bans untouched).
- `node tools/gen-registry.mjs && git diff --exit-code -- generated/` (loop) -- expected: no registry drift.
- `npm run build` (once, at story end) -- expected: clean static bundle.

`Shared surfaces:` scene.test.ts's fake Three and the three other fake rigs; the SHELL part list read by cabinets.ts, scene.ts and both cabinet test files; the cap constants read by main.ts, surfaces.ts and scheduler.test.ts; the exposure literals read by scene.test.ts. These surfaces are edited in the same change set -- no loop command can pass against a partial edit. Hermeticity: every test added or changed passes on a fresh environment, in either order; no test reads the evidence screenshots, the dev server, or test execution order.

**Manual checks:**
- Review the four evidence screenshots against the brief's nine acceptance questions and answer each honestly in the completion report; list any overlap adjustment with its smallest-number rationale.
- Capture the screenshots from your own dev server on a fresh port or from the built bundle -- never touch the lead's running :5173 instance, and restart nothing on it.

## Auto Run Result

Status: ready-for-dev
Blocking condition: none
