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
  assert.equal(all.length, 13, "the games tree is exactly the 10 vendored files + the 3 authored files");
  // The authored files (no vendored code inside) are exempt from the sha leg;
  // everything else in the tree is vendored and MUST carry provenance.
  const authored = new Set([
    path.join("moon-patrol", "sim", "index.js"), // authored sim adapter, cites provenance via the wrapped files
    path.join("moon-patrol", "sim", "index.test.js"), // authored test of that adapter
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
