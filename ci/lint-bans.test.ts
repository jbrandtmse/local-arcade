// AC7 pinning: sim-path lint bans fail each banned API fixture naming rule +
// location, pass clean sources, and stay scoped to games/*/sim/**.
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const SCRIPT = path.resolve(import.meta.dirname, "lint-bans.mjs");
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

function fixtureGames(files: Record<string, string>): string {
  const dir = mkdtempSync(path.join(tmpdir(), "lint-bans-"));
  for (const [rel, text] of Object.entries(files)) {
    const full = path.join(dir, rel);
    mkdirSync(path.dirname(full), { recursive: true });
    writeFileSync(full, text);
  }
  return dir;
}

test("every banned API in a sim path goes red, naming rule and location", () => {
  const dir = fixtureGames({
    "games/rand/sim/r.js": "export function createSim() { return Math.random(); }\n",
    "games/time/sim/t.js": "const a = Date.now(); const b = performance.now(); export { a, b };\n",
    "games/trig/sim/m.js": "export const s = Math.sin(1);\nexport const p = Math.pow(2, 8);\n",
  });
  const result = run(dir);
  assert.equal(result.ok, false);
  assert.ok(result.stderr.includes("no-math-random"), "Math.random rule");
  assert.ok(result.stderr.includes("no-date-now"), "Date.now rule");
  assert.ok(result.stderr.includes("no-performance-now"), "performance.now rule");
  assert.ok(result.stderr.includes("no-engine-transcendental (Math.sin"), "Math.sin rule");
  assert.ok(result.stderr.includes("no-engine-transcendental (Math.pow"), "Math.pow rule");
  assert.match(result.stderr, /games[/\\]rand[/\\]sim[/\\]r\.js:1:/); // location cited
  assert.match(result.stderr, /games[/\\]time[/\\]sim[/\\]t\.js:1:/);
});

test("all nine engine transcendentals are banned", () => {
  const dir = fixtureGames({
    "games/trigs/sim/all.js":
      "const x = [Math.sin, Math.cos, Math.tan, Math.asin, Math.acos, Math.atan2, Math.pow, Math.exp, Math.log];\nexport default x;\n",
  });
  const result = run(dir);
  assert.equal(result.ok, false);
  for (const fn of ["sin", "cos", "tan", "asin", "acos", "atan2", "pow", "exp", "log"]) {
    assert.ok(result.stderr.includes(`no-engine-transcendental (Math.${fn}`), `missing ban: ${fn}`);
  }
});

test("clean sim sources pass, and the ban scope is sim-only", () => {
  const dir = fixtureGames({
    "games/clean/sim/ok.js":
      "export function createSim() { return { tick() { const v = 1 + 2 * 3 / 4 - 5; return v < Math.floor(1.5) ? 0 : 1; } }; }\n",
    // presentation half is NOT linted by this sim-path config (L0 full sweep is Epic 3)
    "games/pres/presentation/p.js": "export const r = Math.random();\n",
  });
  const result = run(dir);
  assert.equal(result.ok, true, result.stderr);
  assert.equal(result.stderr, "");
});

// Story 1.10 (DW-1, AC1): the gate binds forms, not spellings — bracket
// access and optional chains hit the same rules; destructuring renames but
// does not launder; bare wall-clock globals alias regardless of member.
test("bracket-access and optional-chain evasions go red naming the same rules", () => {
  const dir = fixtureGames({
    "games/bracket/sim/b.js":
      'const a = Math["random"]; const b = Math["sin"]; const c = Date["now"]; const t = Math[`random`]; export { a, b, c, t };\n',
    "games/optchain/sim/o.js": "const a = Math?.random; const b = Date?.now; export { a, b };\n",
    // the two named forms COMPOSED: optional chain into a subscript
    "games/optbracket/sim/ob.js": 'const a = Math?.["random"]; export { a };\n',
  });
  const result = run(dir);
  assert.equal(result.ok, false);
  assert.ok(result.stderr.includes("no-math-random"), 'Math["random"] / Math?.random / Math[`random`] rule');
  assert.ok(result.stderr.includes("no-engine-transcendental (Math.sin"), 'Math["sin"] rule');
  assert.ok(result.stderr.includes("no-date-now"), "Date[\"now\"] / Date?.now rule");
  assert.match(result.stderr, /games[/\\]bracket[/\\]sim[/\\]b\.js:1:/); // location cited
  assert.match(result.stderr, /games[/\\]optchain[/\\]sim[/\\]o\.js:1:/);
  assert.match(result.stderr, /games[/\\]optbracket[/\\]sim[/\\]ob\.js:1:/);
});

test("destructured globals go red; renaming the binding does not launder the source name", () => {
  const dir = fixtureGames({
    "games/destructure/sim/d.js":
      "const { random } = Math;\nconst { random: r } = Math;\nconst { now: t } = Date;\nexport { random, r, t };\n",
  });
  const result = run(dir);
  assert.equal(result.ok, false);
  assert.ok(result.stderr.includes("no-math-random"), "{ random } = Math and { random: r } = Math");
  assert.ok(result.stderr.includes("no-date-now"), "{ now: t } = Date");
  assert.match(result.stderr, /games[/\\]destructure[/\\]sim[/\\]d\.js:/);
});

test("wall-clock forms go red: new Date(), bare Date(), aliased Date, bare performance, division operands", () => {
  const dir = fixtureGames({
    "games/wallclock/sim/w.js":
      "const a = new Date(); const b = Date(); const d = Date; const p = performance; const scale = 60000 / Date; const inv = performance / 2; export { a, b, d, p, scale, inv };\n",
  });
  const result = run(dir);
  assert.equal(result.ok, false);
  assert.ok(result.stderr.includes("no-date-use"), "no-date-use rule");
  assert.ok(result.stderr.includes("no-performance-use"), "no-performance-use rule");
  assert.match(result.stderr, /games[/\\]wallclock[/\\]sim[/\\]w\.js:1:/);
});

// Story 1.10 (DW-1) review hardening: the value receivers (globalThis/
// window) must not launder wall-clock access — dotted, bracket, and
// destructure-member spellings of Date/performance all reach the gate.
test("wall-clock reached through globalThis/window members goes red (dotted, bracket, destructure)", () => {
  const dir = fixtureGames({
    "games/globalclock/sim/g.js":
      'const d = globalThis.Date; const p = window.performance; const e = globalThis["Date"]; const { random } = window.Math; export { d, p, e, random };\n',
  });
  const result = run(dir);
  assert.equal(result.ok, false);
  assert.ok(result.stderr.includes("no-date-use"), 'globalThis.Date and globalThis["Date"]');
  assert.ok(result.stderr.includes("no-performance-use"), "window.performance");
  assert.ok(result.stderr.includes("no-math-random"), "{ random } = window.Math");
  assert.match(result.stderr, /games[/\\]globalclock[/\\]sim[/\\]g\.js:1:/);
});

test("sanctioned forms stay green: Math-as-value, Math.floor, regex literals and comments", () => {
  const dir = fixtureGames({
    // mirrors games/moon-patrol/sim/helpers.js: the vendored world is handed
    // globalThis.Math as a VALUE (the sanctioned form); regex literals whose
    // text names banned APIs and comment prose must never match.
    "games/sanctioned/sim/s.js": [
      "// the vendored world requires opts.math; tests hand it the host Math as a value;",
      "// comments naming Math.random, Date.now and new Date() are trivia, never hits",
      "export function createWorld(opts = {}) { return { math: globalThis.Math, ...opts }; }",
      "export const f = Math.floor(1.5);",
      // mirrors games/moon-patrol/sim/autoplay.test.js:70 exactly — pattern
      // text naming banned APIs is regex text, never a reference
      'export const banned = [/Math\\s*\\.\\s*random/, /Date\\s*\\.\\s*now|new\\s+Date/];',
      // sanctioned Math-as-value also reached through the receivers, and unescaped
      // dotted regex bodies (masked by scanTokens, not by escape spacing)
      "const m = globalThis.Math; const fl = Math.floor(m.LN2); const { Math } = globalThis;",
      "export const re1 = /Date.now/; export const re2 = /Math.random/g;",
    ].join("\n") + "\n",
  });
  const result = run(dir);
  assert.equal(result.ok, true, result.stderr);
  assert.equal(result.stderr, "");
});

test("the repo tree (no games yet) passes", () => {
  execFileSync(process.execPath, [SCRIPT], { cwd: REPO, encoding: "utf8" }); // exit 0
});
