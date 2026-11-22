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
      "/core/room/slot-config.ts",
      "/core/room/zones.ts",
      "/core/room/signage.ts",
      "/core/room/tokens.ts",
      "/core/room/scene.ts",
      "/core/room/surfaces.ts",
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
