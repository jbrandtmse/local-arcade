// AC6 pinning: depcheck passes the real tree and fails a planted Core ->
// games/** import, citing file:line (AD-1); Story 1.5 adds the AD-2 legs —
// a planted core import inside a sim SOURCE fails, while sim tests wiring
// the real wrapper and self-contained sim sources stay green; a planted
// cross-game or engine import inside a PRESENTATION source fails, while
// three + Core + own-game specifiers stay green.
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const SCRIPT = path.resolve(import.meta.dirname, "depcheck.mjs");
const REPO = path.resolve(import.meta.dirname, "..");

function run(rootDir: string): { ok: boolean; stderr: string } {
  try {
    execFileSync(process.execPath, [SCRIPT, "--root", rootDir], { encoding: "utf8" });
    return { ok: true, stderr: "" };
  } catch (err) {
    const e = err as { status?: number; stderr?: string };
    return { ok: false, stderr: e.stderr ?? "" };
  }
}

function fixtureCore(files: Record<string, string>): string {
  const dir = mkdtempSync(path.join(tmpdir(), "depcheck-"));
  for (const [rel, text] of Object.entries(files)) {
    const full = path.join(dir, "core", rel);
    mkdirSync(path.dirname(full), { recursive: true });
    writeFileSync(full, text);
  }
  return dir;
}

test("the real tree has no Core -> games imports (exit 0)", () => {
  execFileSync(process.execPath, [SCRIPT], { cwd: REPO, encoding: "utf8" }); // throws if nonzero
});

test("static import of games/** fails with file:line", () => {
  const dir = fixtureCore({
    "fake.ts": 'import { createSim } from "../games/x/sim/index.js";\nexport const s = createSim;\n',
    "clean.ts": 'import { createRng } from "./contract/rng.ts";\nexport const r = createRng;\n',
  });
  const result = run(dir);
  assert.equal(result.ok, false);
  assert.match(result.stderr, /core[/\\]fake\.ts:1/);
  assert.ok(result.stderr.includes("games/x/sim"));
});

test("dynamic import and require of games/** also fail", () => {
  const dyn = fixtureCore({ "dyn.ts": 'const m = await import("games/y/sim");\nvoid m;\n' });
  assert.equal(run(dyn).ok, false);
  const req = fixtureCore({ "req.ts": 'const g = require("games/z/sim");\nvoid g;\n' });
  const r = run(req);
  assert.equal(r.ok, false);
  assert.ok(r.stderr.includes("games/z/sim"));
});

test("template-literal dynamic import and bare games-specifier imports fail", () => {
  const tpl = fixtureCore({ "tpl.ts": 'const m = await import(`games/t/sim`);\nvoid m;\n' });
  assert.equal(run(tpl).ok, false);
  const bare = fixtureCore({ "bare.ts": 'import { anything } from "../games";\nvoid anything;\n' });
  const r = run(bare);
  assert.equal(r.ok, false);
  assert.ok(r.stderr.includes("../games"));
});

test("a clean core fixture passes", () => {
  const dir = fixtureCore({
    "loop.ts": 'import { createRng } from "./contract/rng.ts";\nexport const r = createRng;\n',
    "sub/deep.ts": "export const x = 1;\n",
  });
  const r = run(dir);
  assert.equal(r.ok, true, r.stderr);
});

function fixtureTree(files: Record<string, string>): string {
  const dir = mkdtempSync(path.join(tmpdir(), "depcheck-"));
  for (const [rel, text] of Object.entries(files)) {
    const full = path.join(dir, rel);
    mkdirSync(path.dirname(full), { recursive: true });
    writeFileSync(full, text);
  }
  return dir;
}

test("a planted core import inside a sim SOURCE fails with file:line (AD-2 purity leg)", () => {
  const dir = fixtureTree({
    "games/x/sim/index.js": 'import { createGameInstance } from "../../../core/contract/index.ts";\nvoid createGameInstance;\n',
    "games/x/sim/world.js": 'export const w = 1;\n',
  });
  const r = run(dir);
  assert.equal(r.ok, false);
  assert.match(r.stderr, /games[/\\]x[/\\]sim[/\\]index\.js:1/);
  assert.match(r.stderr, /sim imports outside its own sim tree/);
});

test("sim tests may wire the real wrapper and sim sources may import their own tree: green (AD-2 leg's exempt + clean paths)", () => {
  const dir = fixtureTree({
    "games/x/sim/index.js": 'import { makeWorld } from "./world.js";\nexport const w = makeWorld;\n',
    "games/x/sim/world.js": "export const w = 1;\n",
    // the matrix demands sim tests drive the sim through the REAL wrapper:
    "games/x/sim/index.test.js": 'import { createGameInstance } from "../../../core/contract/index.ts";\nvoid createGameInstance;\n',
  });
  const r = run(dir);
  assert.equal(r.ok, true, r.stderr);
});

test("a planted cross-game import inside a presentation source fails with file:line (AD-2 presentation leg)", () => {
  const dir = fixtureTree({
    "games/x/presentation/adapter.js": 'import { CFG } from "../../y/sim/config.js";\nvoid CFG;\n',
    "games/y/sim/config.js": "export const CFG = 1;\n",
  });
  const r = run(dir);
  assert.equal(r.ok, false);
  assert.match(r.stderr, /games[/\\]x[/\\]presentation[/\\]adapter\.js:1/);
  assert.match(r.stderr, /presentation imports outside three\/Core\/its own game/);
});

test("a bare non-three engine import inside a presentation source fails (AD-2 presentation leg)", () => {
  const dir = fixtureTree({
    "games/x/presentation/adapter.js": 'import { Phaser } from "phaser";\nvoid Phaser;\n',
  });
  const r = run(dir);
  assert.equal(r.ok, false);
  assert.ok(r.stderr.includes('"phaser"'), r.stderr);
});

test("presentation sources may import three, Core, and their own game halves: green (AD-2 presentation leg's clean paths)", () => {
  const dir = fixtureTree({
    "games/x/presentation/adapter.js":
      'import * as THREE from "three";\nimport { CFG } from "../sim/config.js";\nimport * as S from "./sprites.js";\nimport { math } from "../../../core/contract/index.ts";\nvoid THREE; void CFG; void S; void math;\n',
    "games/x/presentation/sprites.js": "export const S = 1;\n",
    "games/x/sim/config.js": "export const CFG = 1;\n",
    "core/contract/index.ts": "export const math = 1;\n",
    "core/room/tokens.ts": "export const t = 1;\n",
  });
  const r = run(dir);
  assert.equal(r.ok, true, r.stderr);
});
