// Story 1.2 AC1 (FR-1, NFR-8, AD-24): the served page grows nothing but
// the canvas main.ts appends — no modal, onboarding, sign-in, cookie wall,
// HUD, crosshair, waypoint, minimap, tooltip, and no pointer-lock request
// prompt (the drag-look fallback is silent, device-layer only). Headless
// pins: (1) index.html's body carries exactly the module script; (2) the
// browser entry and the input service contain no DOM-surface construction
// at all — the entry's only DOM write is appending renderer.domElement;
// (3) real-runtime evidence (Rule 3 pattern from tools/app-serve.test.ts):
// a real dev server serves the body unchanged and the 1.2 shell modules
// resolve in the graph. The in-browser "DOM grew only a canvas" half of
// the row is the lead's Chrome+Edge smoke (spec Manual checks); no browser
// dep is added here.
import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { createServer } from "vite";

const REPO = path.resolve(import.meta.dirname, "..");
const CONFIG = path.join(REPO, "vite.config.ts");
const DEV_PORT = 4641; // named target, distinct from app-serve's 4639; strictPort pins identity

// Comment-strip + core-tree walk, ONE site in this file (module scope so the
// 1.8 storage scan and the 1.10 camera-law scan REUSE the same site — DW-33
// counts comment-strip sites repo-wide; a fourth independent strip reopens
// it, and per-file isolation is the 1.9-confirmed convention).
const strip = (src: string): string => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
const walk = (dir: string, ext: string): string[] => {
  const files: string[] = [];
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) files.push(...walk(full, ext));
    else if (ent.name.endsWith(ext) && !ent.name.includes(".test.")) files.push(full);
  }
  return files;
};

function bodyInner(html: string): string {
  const m = html.match(/<body>([\s\S]*?)<\/body>/);
  assert.ok(m, "index.html has a <body>");
  return m[1]!;
}

test("index.html body holds only the module script \u2014 no markup for any UI surface", () => {
  const html = readFileSync(path.join(REPO, "index.html"), "utf8");
  const body = bodyInner(html);
  const openingTags = [...body.matchAll(/<([a-zA-Z][a-zA-Z0-9-]*)/g)].map((m) => m[1]);
  assert.deepEqual(openingTags, ["script"]);
  assert.match(body, /<script type="module" src="\/core\/main\.ts"><\/script>/);
});

test("core/main.ts builds no DOM surface: the only DOM write is the renderer's canvas append", () => {
  const src = readFileSync(path.join(REPO, "core", "main.ts"), "utf8");
  // Nothing text-bearing or overlay-shaped may appear in the browser entry
  // (diegetic integrity, AD-24/UX-DR18).
  for (const banned of ["createElement", "innerHTML", "insertAdjacentHTML", "document.write", "textContent", "prompt(", "alert(", "confirm("]) {
    assert.ok(!src.includes(banned), `core/main.ts must not use ${banned}`);
  }
  const appends = src.match(/appendChild\(/g) ?? [];
  assert.equal(appends.length, 1, "exactly one DOM append in the entry");
  assert.ok(src.includes("document.body.appendChild(renderer.domElement)"), "it is the canvas append");
});

test("core/input/index.ts is DOM-free: device capture never paints a prompt or overlay", () => {
  const src = readFileSync(path.join(REPO, "core", "input", "index.ts"), "utf8");
  for (const banned of ["document.", "window.", "localStorage", "navigator.", "createElement", "style."]) {
    assert.ok(!src.includes(banned), `input service must not touch ${banned}`);
  }
});

// Story 1.3: the whole authored-room layer (data + scene builder + canvas
// painters) must be DOM-free the same way the input service is — the room
// grows meshes and injected-canvas textures, never markup (AD-24: the
// Welcome Flyer is a texture-mapped surface, not a DOM overlay).
test("core/room modules are DOM-free: room data, scene builder, and painters never touch the DOM", () => {
  const roomDir = path.join(REPO, "core", "room");
  const sources = readdirSync(roomDir).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"));
  assert.ok(sources.length >= 6, "the authored-room modules exist to scan");
  for (const file of sources) {
    const src = readFileSync(path.join(roomDir, file), "utf8");
    for (const banned of ["document.", "window.", "localStorage", "navigator.", "createElement", "style."]) {
      assert.ok(!src.includes(banned), `core/room/${file} must not touch ${banned}`);
    }
  }
});

// Story 1.9: the entry sequence is kernel law — DOM-free exactly like the
// input service (it poses and gates; the CALLER renders). The workbench is
// the ONE core module allowed to touch an element (AD-24's sanctioned
// outside-fiction panel), and its allowance is pinned NARROWLY: exactly one
// createElement (only ever a "canvas"), one append, one remove, one
// listener — the whole mount law — and nothing markup-shaped beyond that.
// (Behavioural halves — remove-first, reload wiring, painted copy — live in
// core/workbench.test.ts; the core/room scan covers room/door.ts via the
// existing room-module loop automatically.)
test("1.9 entry.ts is DOM-free; workbench.ts's DOM surface is exactly the narrow mount law (AD-24)", () => {
  const entry = readFileSync(path.join(REPO, "core", "entry.ts"), "utf8");
  for (const banned of ["document.", "window.", "localStorage", "navigator.", "createElement", "style."]) {
    assert.ok(!entry.includes(banned), `core/entry.ts must not touch ${banned}`);
  }
  const wb = readFileSync(path.join(REPO, "core", "workbench.ts"), "utf8");
  // Call sites are pinned by their dotted call form (the injected-doc
  // interface declarations name the methods without a receiver dot).
  assert.equal((wb.match(/\.createElement\(/g) ?? []).length, 1, "exactly one createElement call in core/workbench.ts (the only element-creating module; the per-module createElement bans in this scan cover the rest of the core tree)");
  assert.ok(wb.includes('createElement("canvas")'), "and it creates only ever a canvas");
  assert.equal((wb.match(/\.body\.appendChild\(/g) ?? []).length, 1, "exactly one append call");
  assert.equal((wb.match(/\.body\.removeChild\(/g) ?? []).length, 1, "exactly one remove call");
  assert.equal((wb.match(/\.addEventListener\(/g) ?? []).length, 1, "exactly one listener call (the Reload wiring)");
  for (const banned of ["document.", "window.", "innerHTML", "textContent", "insertAdjacentHTML", "document.write", "querySelector", "style.", "localStorage"]) {
    assert.ok(!wb.includes(banned), `core/workbench.ts must not use ${banned} — the panel is PAINTED onto its canvas, never marked up`);
  }
});

// Story 1.5: the game's presentation half is DOM-free like the room painters
// — the kernel hands it a canvas (injected makeCanvas), it never grows one,
// and it never reaches for any other browser surface (AD-2/AD-11). The scan
// covers EVERY presentation source file, not just the entry adapter: a
// second presentation module (sprites.js) is equally inside the ban.
test("the game presentation half is DOM-free: every presentation source paints on the kernel's injected canvas only", () => {
  const presDir = path.join(REPO, "games", "moon-patrol", "presentation");
  const sources = readdirSync(presDir).filter((f) => f.endsWith(".js") && !f.endsWith(".test.js"));
  assert.deepEqual(sources, ["adapter.js", "sprites.js"], "the presentation half's non-test sources are exactly adapter + sprites (a new presentation file enters this scan)");
  for (const file of sources) {
    const src = readFileSync(path.join(presDir, file), "utf8");
    for (const banned of ["document.", "window.", "localStorage", "navigator.", "createElement", "style."]) {
      assert.ok(!src.includes(banned), `games/moon-patrol/presentation/${file} must not touch ${banned}`);
    }
  }
});

// Story 1.8 (AD-16): the device store has ONE owner in core — core/storage.ts
// — and no games source names storage, identity, or the table at all (the
// sim never sees it; the score zone reaches the game cabinet only through
// the presentation-side zone records the glue composes). Scans read CODE
// (comments stripped) so a module can document a ban it enforces without
// tripping the scan.
test("1.8 single storage owner: only core/storage.ts touches the device store, and no games source names storage/identity at all (AD-16)", () => {
  const coreSources = walk(path.join(REPO, "core"), ".ts");
  assert.ok(coreSources.length >= 10, "the core tree exists to scan (a moved/deleted module would silently shrink this scan)");
  const owners = coreSources
    .filter((f) => strip(readFileSync(f, "utf8")).includes("localStorage"))
    .map((f) => path.relative(REPO, f).replace(/\\/g, "/"));
  assert.deepEqual(owners, ["core/storage.ts"], "core/storage.ts is the ONLY core module that touches the device store — the glue, room, input, seat, scheduler, and contract stay store-blind");

  const gamesSources = walk(path.join(REPO, "games"), ".js");
  assert.equal(gamesSources.length, 9, "the games tree has exactly 9 non-test sources to scan (the provenance test counts all 15 .js files) — a new game file automatically enters this ban list");
  for (const file of gamesSources) {
    const src = strip(readFileSync(file, "utf8"));
    for (const banned of ["localStorage", "arcade.visitor", "arcade.pb", "visitorId", "rowsFor", "storage."]) {
      assert.ok(!src.includes(banned), `games/${path.relative(path.join(REPO, "games"), file)} must not name ${banned} — the table never reaches the game halves (AD-16)`);
    }
  }
});

// Story 1.10 (DW-11, AD-24): the IN-VIEW half of the no-UI law — the camera
// is never a content host. Source-text tier (Epic 1's recorded verification
// arrangement for the main glue; the executed-host tier is the 3-2/3-15
// browser harness, DW-12/DW-15 re-owned at the burn-down gate): the camera
// references surviving in core/main.ts code ride an allowlist — the six
// forms 1.9 shipped PLUS 2.3's two read-only haze pose reads (the glow ramp
// MEASURES the camera pose the frame just wrote from player state; reading
// a pose is not hosting content — the host forms stay banned and the
// statement-level allowlist still reddens any new FORM), checked per
// `;`-delimited statement so an allowed
// line smuggles no second use — every `camera.add`/`camera.attach` FORM
// (chain, subscript, dotted prefix) appears nowhere in
// core non-test code, and the pose/room modules (core/room/*.ts, entry.ts,
// player.ts) stay camera-blind. A planted `camera.add(crosshairMesh)` in
// main.ts reds the allowlist leg (and the ban leg); a `camera` name added
// to a pose module's code reds the camera-blind leg; a plain `scene.add`
// stays green — the room may grow meshes, the camera may not.
test("the camera never hosts content: main.ts camera refs ride the allowlist, camera.add/attach appear nowhere in core non-test code, and pose/room modules stay camera-blind (DW-11, AD-24)", () => {
  const cameraRef = /(^|[^\w$])camera(?![\w$])/;
  const allowForms: Array<[string, RegExp]> = [
    ["construction", /^const camera = new THREE\.PerspectiveCamera\(/],
    ["rotation.order", /^camera\.rotation\.order = "YXZ"$/],
    ["pose sets", /^camera\.(position|rotation)\.set\(/],
    ["aspect", /^camera\.aspect = /],
    ["updateProjectionMatrix", /^camera\.updateProjectionMatrix\(\)$/],
    ["render(scene, camera)", /renderer\.render\(scene, camera\)$/],
    // 2.3 (AC1): the haze law measures distance FROM the camera pose this
    // frame wrote from player tick state. A READ, per statement — no
    // content may ever hang off the camera (the host-form ban below holds),
    // and the pose/room modules stay camera-blind (the third leg): the
    // camera's pose enters the law here, at the glue, nowhere else.
    ["pose reads (2.3 haze)", /^const d[xz] = camera\.position\.[xz] - rig\.center\.[xz]$/],
  ];
  const counts: Record<string, number> = {};
  // Segment-level: every `;`-delimited statement that names the camera
  // must stand on its own as one of the six forms — a second camera use
  // smuggled onto an allowed line (`camera.aspect = 1; camera.add(m)`)
  // is its own segment and gets no pass.
  for (const raw of strip(readFileSync(path.join(REPO, "core", "main.ts"), "utf8")).split("\n")) {
    if (!cameraRef.test(raw)) continue;
    for (const seg of raw.split(";")) {
      const stmt = seg.trim();
      if (!cameraRef.test(stmt)) continue;
      const hit = allowForms.find(([, re]) => re.test(stmt));
      assert.ok(hit, `core/main.ts camera statement is not on the allowlist: "${stmt}" — the camera never hosts content (AD-24)`);
      counts[hit[0]] = (counts[hit[0]] ?? 0) + 1;
    }
  }
  assert.deepEqual(
    counts,
    { construction: 1, "rotation.order": 1, "pose sets": 4, aspect: 1, updateProjectionMatrix: 1, "render(scene, camera)": 1, "pose reads (2.3 haze)": 2 },
    "the six surviving 1.9 camera forms plus 2.3's two READ-ONLY haze pose reads are ALL the camera ever does in the glue — no new FORM may join silently (host forms stay banned in the leg below)",
  );

  // The host-call FORMS, not the two spellings: dot, optional chain, and
  // string/template subscript, each also reached through a dotted prefix
  // (`ctx.camera.add(...)`).
  const camHost = /(^|[^\w$])camera\s*(?:\?\.|\.)\s*(?:add|attach)\s*\(|(^|[^\w$])camera\s*\[\s*['"`](?:add|attach)['"`]\s*\]/g;
  for (const file of walk(path.join(REPO, "core"), ".ts")) {
    const src = strip(readFileSync(file, "utf8"));
    const bad = src.match(camHost);
    assert.ok(!bad, `${path.relative(REPO, file)} must not host content on the camera (${bad?.[0]}) — a camera-parented mesh would ride the view (AD-24)`);
  }

  // Recursive (like the camHost walk above): a room module placed in a
  // subdirectory must not escape the camera-blind law.
  const blind: string[] = walk(path.join(REPO, "core", "room"), ".ts");
  blind.push(path.join(REPO, "core", "entry.ts"), path.join(REPO, "core", "player.ts"));
  for (const file of blind) {
    assert.ok(!cameraRef.test(strip(readFileSync(file, "utf8"))), `${path.relative(REPO, file)} must stay camera-blind — pose and room data never name the camera (DW-11)`);
  }
});

// Story 1.5 honesty scans (AC1/AC5 Verification pins): every file under the
// games tree that came from the vendored source carries the provenance sha
// in its header; the authored seams carry the PROVISIONAL marker so the
// provisional wrap (AD-14) is visible at every entry point, not only in the
// spec. sim/index.js is the authored sim adapter (not vendored), so the sha
// leg exempts it and counts the rest exactly.
test("vendored files carry the provenance sha; the provisional seams carry PROVISIONAL (AC1/AC5 scans)", () => {
  const VENDORED_SHA = "49c351910af742a86cf97987bc474bb4d7d8da40";
  const gamesDir = path.join(REPO, "games");
  const walk = (dir: string): string[] => {
    const files: string[] = [];
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) files.push(...walk(full));
      else if (ent.name.endsWith(".js")) files.push(full);
    }
    return files;
  };
  const all = walk(gamesDir);
  // Story 1.6: sim/autoplay.js (the autoplay AI) and its test join the
  // authored set — the impulse-mapping asset is .json and never enters the
  // .js walk at all (its provenance is the authored act itself).
  assert.equal(all.length, 15, "the games tree is exactly the 10 vendored files + the 5 authored files");
  // The authored files (no vendored code inside) are exempt from the sha leg;
  // everything else in the tree is vendored and MUST carry provenance.
  const authored = new Set([
    path.join("moon-patrol", "sim", "index.js"), // authored sim adapter, cites provenance via the wrapped files
    path.join("moon-patrol", "sim", "index.test.js"), // authored test of that adapter
    path.join("moon-patrol", "sim", "autoplay.js"), // 1.6: authored autoplay AI (lint-bans scans it, zero exemptions)
    path.join("moon-patrol", "sim", "autoplay.test.js"), // authored test of the autoplay path
    path.join("moon-patrol", "presentation", "adapter.test.js"), // authored test of the presentation half
  ]);
  let provenanced = 0;
  for (const file of all) {
    const rel = path.relative(gamesDir, file);
    if (authored.has(rel)) continue;
    const src = readFileSync(file, "utf8");
    assert.ok(src.includes(VENDORED_SHA), `${path.relative(REPO, file)} must carry the vendoring provenance sha (AC1)`);
    provenanced += 1;
  }
  assert.equal(provenanced, 10, "exactly the ten vendored files carry the sha — a new games file without provenance is loud");
  for (const seam of [
    path.join("games", "moon-patrol", "sim", "index.js"),
    path.join("games", "moon-patrol", "presentation", "adapter.js"),
    path.join("core", "contract", "wrapper.ts"),
  ]) {
    assert.ok(readFileSync(path.join(REPO, seam), "utf8").includes("PROVISIONAL"), `${seam} carries the PROVISIONAL marker (AD-14 provisional wrap is visible at the code, not just the spec)`);
  }
});

test("dev serve (real HTTP): the served body is unchanged, the 1.2 shell modules resolve", async () => {
  const server = await createServer({
    configFile: CONFIG,
    root: REPO,
    logLevel: "error",
    server: { host: "127.0.0.1", port: DEV_PORT, strictPort: true },
  });
  try {
    await server.listen();
    const page = await fetch(`http://127.0.0.1:${DEV_PORT}/`);
    assert.equal(page.status, 200);
    const html = await page.text();
    const tags = [...bodyInner(html).matchAll(/<([a-zA-Z][a-zA-Z0-9-]*)/g)].map((m) => m[1]);
    assert.deepEqual(tags, ["script"], "served DOM grows nothing beyond the entry script");

    for (const moduleUrl of [
      "/core/main.ts",
      "/core/containment.ts",
      "/core/player.ts",
      "/core/input/index.ts",
      "/core/room/collision-volumes.ts",
      "/core/room/cabinets.ts",
      "/core/room/slot-config.ts",
      "/core/room/zones.ts",
      "/core/room/signage.ts",
      "/core/room/tokens.ts",
      "/core/room/scene.ts",
      "/core/room/surfaces.ts",
      "/core/seat.ts",
      "/core/patrons/scheduler.ts",
      "/core/patrons/presenter.ts",
      "/core/storage.ts",
      "/core/entry.ts",
      "/core/workbench.ts",
      "/core/room/door.ts",
      "/generated/game-registry.ts",
      "/games/moon-patrol/presentation/adapter.js",
    ]) {
      const res = await fetch(`http://127.0.0.1:${DEV_PORT}${moduleUrl}`);
      assert.equal(res.status, 200, `${moduleUrl} resolves in the dev graph`);
    }
    const entry = await (await fetch(`http://127.0.0.1:${DEV_PORT}/core/main.ts`)).text();
    assert.ok(entry.includes("createInputService"), "the entry wires the input service");
    assert.ok(entry.includes("createPlayerController"), "the entry wires the player controller");
    assert.ok(entry.includes("addSystem"), "the player runs as a kernel system in the tick");
  } finally {
    await server.close();
  }
});
