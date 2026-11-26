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