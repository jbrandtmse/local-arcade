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

test("the repo tree (no games yet) passes", () => {
  execFileSync(process.execPath, [SCRIPT], { cwd: REPO, encoding: "utf8" }); // exit 0
});
