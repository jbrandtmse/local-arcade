// QA end-to-end app-serve test (AC1, headless half of the "Dev serve" matrix
// row): the shipped Vite config + index.html + core/main.ts entry are served
// over REAL HTTP by a real dev server this test starts, and a production
// build this test runs lands a real static bundle. Pins: the entry script
// resolves through the dev module graph, the Room Black envelope is in the
// served page, and the built bundle contains the hashed entry chunk with the
// three.js renderer wired in. The console-error / render half of the row
// belongs to the lead's browser smoke (spec Manual checks); no browser dep is
// added here. Needs: an explicit dev port on 127.0.0.1 (strictPort: this test
// fails rather than drifting to another port), a temp outDir, and nothing else.
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { build, createServer } from "vite";

const REPO = path.resolve(import.meta.dirname, "..");
const CONFIG = path.join(REPO, "vite.config.ts");
const DEV_PORT = 4639; // named target; strictPort keeps the identity explicit

async function get(url: string): Promise<{ status: number; body: string }> {
  const res = await fetch(url);
  return { status: res.status, body: await res.text() };
}

test("dev serve: index page and main.ts module graph serve over HTTP (Room Black, entry resolves)", async () => {
  const server = await createServer({
    configFile: CONFIG,
    root: REPO,
    logLevel: "error",
    server: { host: "127.0.0.1", port: DEV_PORT, strictPort: true },
  });
  try {
    await server.listen();
    const addr = server.httpServer?.address();
    assert.ok(addr && typeof addr === "object", "dev server has a TCP address");
    assert.equal(addr.port, DEV_PORT, "dev server bound to the explicit target port");

    const page = await get(`http://127.0.0.1:${DEV_PORT}/`);
    assert.equal(page.status, 200);
    assert.ok(page.body.includes('src="/core/main.ts"'), "index.html loads the entry module");
    assert.ok(page.body.includes("#15110e"), "Room Black envelope is in the page");

    const entry = await get(`http://127.0.0.1:${DEV_PORT}/core/main.ts`);
    assert.equal(entry.status, 200, "entry module resolves in the dev graph");
    assert.ok(entry.body.includes("createKernelLoop"), "entry drives the kernel loop");
    assert.ok(entry.body.includes("WebGLRenderer"), "entry constructs the three.js renderer");
    assert.ok(entry.body.includes('"/core/loop.ts"'), "relative imports rewritten to graph URLs");

    const registry = await get(`http://127.0.0.1:${DEV_PORT}/generated/game-registry.ts`);
    assert.equal(registry.status, 200, "generated registry serves through the graph");
    assert.ok(registry.body.includes("gameRegistry"));
  } finally {
    await server.close();
  }
});

test("production build: static bundle with hashed entry chunk and bundled three.js", async () => {
  const outDir = mkdtempSync(path.join(tmpdir(), "arcade-build-"));
  try {
    await build({
      configFile: CONFIG,
      root: REPO,
      logLevel: "error",
      build: { outDir, emptyOutDir: true },
    });

    const html = readFileSync(path.join(outDir, "index.html"), "utf8");
    assert.ok(html.includes("#15110e"), "Room Black envelope survives the build");
    const script = html.match(/<script type="module"[^>]*src="(\/assets\/[^"]+\.js)"/);
    assert.ok(script, "built page references a hashed entry chunk");
    const chunkPath = path.join(outDir, script[1]!.slice(1));
    const chunk = readFileSync(chunkPath, "utf8");

    assert.ok(statSync(chunkPath).size > 300_000, "the three.js engine is bundled into the chunk");
    assert.ok(chunk.includes("setClearColor"), "the Room Black clear-color call is in the bundle");
    assert.match(chunk, /1380622|0x15110e/, "the ROOM_BLACK color value is in the bundle");
  } finally {
    rmSync(outDir, { recursive: true, force: true, maxRetries: 3 });
  }
});
