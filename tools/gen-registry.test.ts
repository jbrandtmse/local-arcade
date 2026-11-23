// AC6 pinning: the registry generator emits deterministically from the
// provisional list (sorted, byte-identical re-emit), re-exports only sim
// halves, and exits nonzero with a message on invalid entries.
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const GENERATOR = path.resolve(import.meta.dirname, "gen-registry.mjs");

function fixtureRoot(): string {
  const dir = mkdtempSync(path.join(tmpdir(), "gen-registry-"));
  for (const id of ["beta-game", "alpha"]) {
    mkdirSync(path.join(dir, "sims", id), { recursive: true });
    writeFileSync(
      path.join(dir, "sims", id, "sim.js"),
      "export function createSim() { return { tick() {}, events() { return []; }, snapshot() { return {}; } }; }\n",
    );
    writeFileSync(
      path.join(dir, "sims", id, "pres.js"),
      "export function createPresentation() { return { canvas: { width: 0, height: 0, getContext: () => null }, drawFrame() {} }; }\n",
    );
  }
  return dir;
}

function runGenerator(cwd: string, listName = "list.json", outName = "out/game-registry.ts"): string {
  return execFileSync(process.execPath, [GENERATOR, "--cwd", cwd, "--list", listName, "--out", outName], {
    encoding: "utf8",
  });
}

function expectFailure(cwd: string, expected: string): string {
  try {
    runGenerator(cwd);
  } catch (err) {
    const e = err as { status?: number; stderr?: string };
    assert.equal(e.status, 1, "generator must exit nonzero");
    assert.ok(e.stderr.includes(expected), `stderr must cite ${expected}: ${e.stderr}`);
    return e.stderr as string;
  }
  assert.fail("generator should have exited nonzero");
}

test("two fixture entries: sorted deterministic registry re-exporting sim halves", () => {
  const dir = fixtureRoot();
  writeFileSync(
    path.join(dir, "list.json"),
    JSON.stringify([
      { id: "beta-game", simPath: "sims/beta-game/sim.js", seed: 7 },
      { id: "alpha", simPath: "sims/alpha/sim.js" },
    ]),
  );
  runGenerator(dir);
  const first = readFileSync(path.join(dir, "out", "game-registry.ts"), "utf8");
  assert.ok(first.includes('import { createSim as gAlpha } from "../sims/alpha/sim.js";'));
  assert.ok(first.includes('import { createSim as gBetaGame } from "../sims/beta-game/sim.js";'));
  assert.ok(first.indexOf("gAlpha") < first.indexOf("gBetaGame"), "entries sorted by id");
  assert.ok(first.includes('{ id: "alpha", createSim: gAlpha },'));
  assert.ok(first.includes('{ id: "beta-game", seed: 7, createSim: gBetaGame },'));
  assert.ok(!first.includes("createPresentation"), "an entry without presPath emits the sim half only (no presentation binding)");
  assert.ok(!first.includes("controls:"), "an entry without controls emits no vocab");

  runGenerator(dir);
  const second = readFileSync(path.join(dir, "out", "game-registry.ts"), "utf8");
  assert.equal(second, first); // byte-identical across runs
});

// Story 1.5: the presentation half and the declared control vocab travel the
// same deterministic path as the sim half.
test("presPath + controls emit; the vocab keys are fixed-order regardless of list order; bad legs die loudly", () => {
  const dir = fixtureRoot();
  writeFileSync(
    path.join(dir, "list.json"),
    JSON.stringify([
      { id: "alpha", simPath: "sims/alpha/sim.js", presPath: "sims/alpha/pres.js", controls: { aim: [], buttons: ["fire"], axes: ["move"], vocab: 1 } },
    ]),
  );
  runGenerator(dir);
  const text = readFileSync(path.join(dir, "out", "game-registry.ts"), "utf8");
  assert.ok(text.includes('import { createPresentation as pAlpha } from "../sims/alpha/pres.js";'), "presentation half imported beside the sim half");
  assert.ok(
    text.includes('{ id: "alpha", createSim: gAlpha, createPresentation: pAlpha, controls: {"vocab":1,"axes":["move"],"buttons":["fire"],"aim":[]} },'),
    "entry carries both halves plus the declared vocab in fixed key order (byte-identical re-emits)",
  );

  writeFileSync(path.join(dir, "list.json"), JSON.stringify([{ id: "alpha", simPath: "sims/alpha/sim.js", presPath: "sims/alpha/gone.js" }]));
  expectFailure(dir, "presentation source not found");

  writeFileSync(
    path.join(dir, "list.json"),
    JSON.stringify([{ id: "alpha", simPath: "sims/alpha/sim.js", controls: { vocab: 1, axes: "move", buttons: [], aim: [] } }]),
  );
  expectFailure(dir, "controls.axes must be an array of strings");

  writeFileSync(
    path.join(dir, "list.json"),
    JSON.stringify([{ id: "alpha", simPath: "sims/alpha/sim.js", controls: { vocab: true, axes: [], buttons: [], aim: [] } }]),
  );
  expectFailure(dir, "controls.vocab must be a finite number");

  writeFileSync(
    path.join(dir, "list.json"),
    JSON.stringify([{ id: "alpha", simPath: "sims/alpha/sim.js", controls: { vocab: 1, axes: ["move"], buttons: ["fire"], aim: [], butons: ["fire"] } }]),
  );
  expectFailure(dir, "unknown controls field"); // a "butons" typo must not silently drop the buttons leg
});

test("empty provisional list emits an empty registry", () => {
  const dir = fixtureRoot();
  writeFileSync(path.join(dir, "list.json"), "[]");
  runGenerator(dir);
  const text = readFileSync(path.join(dir, "out", "game-registry.ts"), "utf8");
  assert.ok(text.includes("export const gameRegistry: GameRegistryEntry[] = ["));
  assert.equal(text.match(/import \{ createSim/g), null);
});

test("invalid entries fail nonzero with a message", () => {
  const dir = fixtureRoot();
  writeFileSync(path.join(dir, "list.json"), JSON.stringify([{ id: "Bad Id", simPath: "sims/alpha/sim.js" }]));
  expectFailure(dir, "kebab-case");

  writeFileSync(path.join(dir, "list.json"), JSON.stringify([{ id: "gone", simPath: "sims/gone/sim.js" }]));
  expectFailure(dir, "not found");

  writeFileSync(
    path.join(dir, "list.json"),
    JSON.stringify([
      { id: "alpha", simPath: "sims/alpha/sim.js" },
      { id: "alpha", simPath: "sims/beta-game/sim.js" },
    ]),
  );
  expectFailure(dir, "duplicate");

  writeFileSync(path.join(dir, "list.json"), JSON.stringify([{ simPath: "sims/alpha/sim.js" }]));
  expectFailure(dir, "kebab-case"); // missing id

  writeFileSync(
    path.join(dir, "list.json"),
    JSON.stringify([
      { id: "a1", simPath: "sims/alpha/sim.js" },
      { id: "a-1", simPath: "sims/beta-game/sim.js" },
    ]),
  );
  expectFailure(dir, "collision"); // a1 and a-1 both map to gA1

  writeFileSync(
    path.join(dir, "list.json"),
    JSON.stringify([{ id: "alpha", simPath: "sims/alpha/sim.js", seeds: 7 }]),
  );
  expectFailure(dir, "unknown field"); // a "seeds" typo must not silently drop the seed
});

test("the repo's own list regenerates the committed registry byte-identically", () => {
  const repo = path.resolve(import.meta.dirname, "..");
  const committedPath = path.join(repo, "generated", "game-registry.ts");
  const before = readFileSync(committedPath, "utf8");
  const out = execFileSync(process.execPath, [GENERATOR], { cwd: repo, encoding: "utf8" });
  assert.ok(out.includes("gen-registry:"));
  let after: string;
  try {
    after = readFileSync(committedPath, "utf8");
  } catch {
    writeFileSync(committedPath, before);
    assert.fail("generated/game-registry.ts missing after regeneration");
    return;
  }
  if (after !== before) {
    writeFileSync(committedPath, before); // leave the tree as found; the pin still fails
    assert.fail("registry regeneration is not byte-identical to the committed module");
  }
});
