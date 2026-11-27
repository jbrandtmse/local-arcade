// AC6 pinning: the registry generator emits deterministically from the
// provisional list (sorted, byte-identical re-emit), re-exports only sim
// halves, and exits nonzero with a message on invalid entries.
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const GENERATOR = path.resolve(import.meta.dirname, "gen-registry.mjs");

function fixtureRoot(): string {
  // Story 1.10 (DW-5): sim fixtures sit where the law requires,
  // games/<id>/sim/; presentation fixtures stay put on purpose — the
  // untouched presPath is the signal that the law binds simPath only.
  const dir = mkdtempSync(path.join(tmpdir(), "gen-registry-"));
  for (const id of ["beta-game", "alpha"]) {
    mkdirSync(path.join(dir, "games", id, "sim"), { recursive: true });
    mkdirSync(path.join(dir, "sims", id), { recursive: true });
    writeFileSync(
      path.join(dir, "games", id, "sim", "sim.js"),
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
      { id: "beta-game", simPath: "games/beta-game/sim/sim.js", seed: 7 },
      { id: "alpha", simPath: "games/alpha/sim/sim.js" },
    ]),
  );
  runGenerator(dir);
  const first = readFileSync(path.join(dir, "out", "game-registry.ts"), "utf8");
  assert.ok(first.includes('import { createSim as gAlpha } from "../games/alpha/sim/sim.js";'));
  assert.ok(first.includes('import { createSim as gBetaGame } from "../games/beta-game/sim/sim.js";'));
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
      { id: "alpha", simPath: "games/alpha/sim/sim.js", presPath: "sims/alpha/pres.js", controls: { aim: [], buttons: ["fire"], axes: ["move"], vocab: 1 } },
    ]),
  );
  runGenerator(dir);
  const text = readFileSync(path.join(dir, "out", "game-registry.ts"), "utf8");
  assert.ok(text.includes('import { createPresentation as pAlpha } from "../sims/alpha/pres.js";'), "presentation half imported beside the sim half");
  assert.ok(
    text.includes('{ id: "alpha", createSim: gAlpha, createPresentation: pAlpha, controls: {"vocab":1,"axes":["move"],"buttons":["fire"],"aim":[]} },'),
    "entry carries both halves plus the declared vocab in fixed key order (byte-identical re-emits)",
  );

  writeFileSync(path.join(dir, "list.json"), JSON.stringify([{ id: "alpha", simPath: "games/alpha/sim/sim.js", presPath: "sims/alpha/gone.js" }]));
  expectFailure(dir, "presentation source not found");

  writeFileSync(
    path.join(dir, "list.json"),
    JSON.stringify([{ id: "alpha", simPath: "games/alpha/sim/sim.js", controls: { vocab: 1, axes: "move", buttons: [], aim: [] } }]),
  );
  expectFailure(dir, "controls.axes must be an array of strings");

  writeFileSync(
    path.join(dir, "list.json"),
    JSON.stringify([{ id: "alpha", simPath: "games/alpha/sim/sim.js", controls: { vocab: true, axes: [], buttons: [], aim: [] } }]),
  );
  expectFailure(dir, "controls.vocab must be a finite number");

  writeFileSync(
    path.join(dir, "list.json"),
    JSON.stringify([{ id: "alpha", simPath: "games/alpha/sim/sim.js", controls: { vocab: 1, axes: ["move"], buttons: ["fire"], aim: [], butons: ["fire"] } }]),
  );
  expectFailure(dir, "unknown controls field"); // a "butons" typo must not silently drop the buttons leg
});

// Story 1.6 (AC6 gate; AD-11/AD-18 data side): the authored impulse mapping
// is validated at BUILD time (never fetched at runtime — the bundle stays
// sealed) and embedded into the entry as parsed data in fixed (sorted) key
// order. (AC3 is this story's NEXT-lettering pin, not this carrier.)
test("impulsePath: parsed mapping embedded sorted; a bad reaction name, a missing file, and a non-object mapping die loudly", () => {
  const dir = fixtureRoot();
  writeFileSync(path.join(dir, "impulses.json"), JSON.stringify({ gameover: "slam", jump: "jump", hit: "flinch", explode: "flinch" }));
  writeFileSync(
    path.join(dir, "list.json"),
    JSON.stringify([{ id: "alpha", simPath: "games/alpha/sim/sim.js", impulsePath: "impulses.json" }]),
  );
  runGenerator(dir);
  const first = readFileSync(path.join(dir, "out", "game-registry.ts"), "utf8");
  assert.ok(
    first.includes('{ id: "alpha", createSim: gAlpha, impulses: {"explode":"flinch","gameover":"slam","hit":"flinch","jump":"jump"} },'),
    "the entry embeds the parsed mapping, keys sorted (the asset's key order never leaks into bytes)",
  );
  runGenerator(dir);
  assert.equal(readFileSync(path.join(dir, "out", "game-registry.ts"), "utf8"), first, "byte-identical re-emit with a mapping present");

  writeFileSync(path.join(dir, "impulses.json"), JSON.stringify({ jump: "shrug" }));
  expectFailure(dir, "is not a kernel reaction"); // a name outside the reaction library is a build error

  writeFileSync(path.join(dir, "impulses.json"), JSON.stringify({ jump: "jump" }));
  writeFileSync(
    path.join(dir, "list.json"),
    JSON.stringify([{ id: "alpha", simPath: "games/alpha/sim/sim.js", impulsePath: "gone.json" }]),
  );
  expectFailure(dir, "impulse mapping source not found");

  writeFileSync(path.join(dir, "impulses.json"), "[]");
  writeFileSync(
    path.join(dir, "list.json"),
    JSON.stringify([{ id: "alpha", simPath: "games/alpha/sim/sim.js", impulsePath: "impulses.json" }]),
  );
  expectFailure(dir, "impulse mapping must be an object");
});

// Story 2.1 (AD-7/AD-18 data side): the attract-loop RECIPE is the sibling
// asset — validated at BUILD, embedded as parsed data in fixed key order,
// never fetched at runtime. Bad recipes/notes are build errors.
test("attractSoundPath: recipe embedded fixed-key-order; missing file, bad shape, and bad notes die loudly", () => {
  const dir = fixtureRoot();
  const good = {
    sampleRate: 8000,
    loopSeconds: 0.5,
    wave: "square",
    gain: 0.5,
    notes: [
      { start: 0, end: 0.25, freq: 220, amp: 0.5 },
      { start: 0.3, end: 0.5, freq: 440, amp: 0.25 },
    ],
  };
  const entry = (recipePath: string) =>
    JSON.stringify([{ id: "alpha", simPath: "games/alpha/sim/sim.js", attractSoundPath: recipePath }]);
  writeFileSync(path.join(dir, "attract.json"), JSON.stringify({ notes: good.notes, wave: good.wave, gain: good.gain, loopSeconds: good.loopSeconds, sampleRate: good.sampleRate }));
  writeFileSync(path.join(dir, "list.json"), entry("attract.json"));
  runGenerator(dir);
  const first = readFileSync(path.join(dir, "out", "game-registry.ts"), "utf8");
  assert.ok(
    first.includes('attractSound: {"sampleRate":8000,"loopSeconds":0.5,"wave":"square","gain":0.5,"notes":[{"start":0,"end":0.25,"freq":220,"amp":0.5},{"start":0.3,"end":0.5,"freq":440,"amp":0.25}]}'),
    "the entry embeds the parsed recipe, keys in the generator's fixed order (the asset's key order never leaks into bytes)",
  );
  runGenerator(dir);
  assert.equal(readFileSync(path.join(dir, "out", "game-registry.ts"), "utf8"), first, "byte-identical re-emit with a recipe present");

  writeFileSync(path.join(dir, "list.json"), entry("gone.json"));
  expectFailure(dir, "attract sound recipe source not found");

  writeFileSync(path.join(dir, "attract.json"), "[]");
  writeFileSync(path.join(dir, "list.json"), entry("attract.json"));
  expectFailure(dir, "attract sound recipe must be an object");

  writeFileSync(path.join(dir, "attract.json"), JSON.stringify({ ...good, wafe: "square" }));
  expectFailure(dir, "unknown attract sound recipe field");

  writeFileSync(path.join(dir, "attract.json"), JSON.stringify({ ...good, sampleRate: 8000.5 }));
  expectFailure(dir, "sampleRate must be an integer in [8000, 192000]");

  // The browser createBuffer range: a shape-valid but unusable recipe
  // would throw at BOOT (the workbench path) — the build gate owns it.
  writeFileSync(path.join(dir, "attract.json"), JSON.stringify({ ...good, sampleRate: 4000 }));
  expectFailure(dir, "sampleRate must be an integer in [8000, 192000]");

  // A render that rounds to zero samples is the same boot-throw family:
  // law-conforming legs throughout, the ROUNDED length is the empty one.
  writeFileSync(
    path.join(dir, "attract.json"),
    JSON.stringify({ ...good, loopSeconds: 0.00005, notes: [{ start: 0, end: 0.00005, freq: 220, amp: 0.5 }] }),
  );
  expectFailure(dir, "renders an empty buffer");

  writeFileSync(path.join(dir, "attract.json"), JSON.stringify({ ...good, gain: 1.2 }));
  expectFailure(dir, "gain must be a finite number in [0, 1]");

  writeFileSync(path.join(dir, "attract.json"), JSON.stringify({ ...good, notes: [] }));
  expectFailure(dir, "notes must be a non-empty array");

  writeFileSync(path.join(dir, "attract.json"), JSON.stringify({ ...good, notes: [{ start: 0, end: 0.25, freq: 220, amp: 0.5, dur: 0.25 }] }));
  expectFailure(dir, "attract sound note 0: unknown field");

  writeFileSync(path.join(dir, "attract.json"), JSON.stringify({ ...good, notes: [{ start: 0, end: 0.6, freq: 220, amp: 0.5 }] }));
  expectFailure(dir, "exceeds loopSeconds");

  writeFileSync(path.join(dir, "attract.json"), JSON.stringify({ ...good, notes: [{ start: 0, end: 0.25, freq: -1, amp: 0.5 }] }));
  expectFailure(dir, "freq must be positive");

  writeFileSync(path.join(dir, "list.json"), JSON.stringify([{ id: "alpha", simPath: "games/alpha/sim/sim.js", attractSoundPat: "attract.json" }]));
  expectFailure(dir, "unknown field"); // a list-side typo must not silently drop the recipe
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
  writeFileSync(path.join(dir, "list.json"), JSON.stringify([{ id: "Bad Id", simPath: "games/alpha/sim/sim.js" }]));
  expectFailure(dir, "kebab-case");

  writeFileSync(path.join(dir, "list.json"), JSON.stringify([{ id: "gone", simPath: "sims/gone/sim.js" }]));
  expectFailure(dir, "not found");

  writeFileSync(
    path.join(dir, "list.json"),
    JSON.stringify([
      { id: "alpha", simPath: "games/alpha/sim/sim.js" },
      { id: "alpha", simPath: "games/alpha/sim/sim.js" },
    ]),
  );
  expectFailure(dir, "duplicate"); // law-conforming homes so the duplicate leg is what trips

  writeFileSync(path.join(dir, "list.json"), JSON.stringify([{ simPath: "games/alpha/sim/sim.js" }]));
  expectFailure(dir, "kebab-case"); // missing id

  for (const cid of ["a1", "a-1"]) {
    mkdirSync(path.join(dir, "games", cid, "sim"), { recursive: true });
    writeFileSync(
      path.join(dir, "games", cid, "sim", "sim.js"),
      "export function createSim() { return { tick() {}, events() { return []; }, snapshot() { return {}; } }; }\n",
    );
  }
  writeFileSync(
    path.join(dir, "list.json"),
    JSON.stringify([
      { id: "a1", simPath: "games/a1/sim/sim.js" },
      { id: "a-1", simPath: "games/a-1/sim/sim.js" },
    ]),
  );
  expectFailure(dir, "collision"); // a1 and a-1 both map to gA1

  writeFileSync(
    path.join(dir, "list.json"),
    JSON.stringify([{ id: "alpha", simPath: "games/alpha/sim/sim.js", seeds: 7 }]),
  );
  expectFailure(dir, "unknown field"); // a "seeds" typo must not silently drop the seed

  writeFileSync(
    path.join(dir, "list.json"),
    JSON.stringify([{ id: "alpha", simPath: "games/alpha/sim/sim.js", seed: 2.5 }]),
  );
  expectFailure(dir, "seed must be an integer"); // the kernel track() gate rejects non-integer seeds; the build gate must not emit one
});

// Story 1.10 (DW-5, AC2; AD-1/AD-2/AD-13): the sim half's location is a
// build-step law — a wrong home or a `..` relocation dies naming the law,
// and nothing is emitted.
test("simPath law: a wrong home and a '..' traversal fail nonzero naming the law", () => {
  const dir = fixtureRoot();
  writeFileSync(path.join(dir, "sims", "alpha", "loose-sim.js"), "export function createSim() { return { tick() {}, events() { return []; }, snapshot() { return {}; } }; }\n");
  writeFileSync(path.join(dir, "list.json"), JSON.stringify([{ id: "alpha", simPath: "sims/alpha/loose-sim.js" }]));
  expectFailure(dir, "must resolve strictly under games/alpha/sim/");

  // the '..' collapses lexically at resolve time (games/core/evil.js) —
  // the file exists where the normalized path lands, and the law still
  // names the sim home, proving the relocation cannot smuggle a sim in
  mkdirSync(path.join(dir, "games", "core"), { recursive: true });
  writeFileSync(path.join(dir, "games", "core", "evil.js"), "export const evil = 1;\n");
  writeFileSync(
    path.join(dir, "list.json"),
    JSON.stringify([{ id: "moon-patrol", simPath: "games/moon-patrol/../core/evil.js" }]),
  );
  expectFailure(dir, "must resolve strictly under games/moon-patrol/sim/"); // the relative check normalizes; .. is dead
  assert.ok(!existsSync(path.join(dir, "out", "game-registry.ts")), "a failing entry emits nothing");
});

// QA (Story 1.10, DW-5 gap): the law's empty-relative leg. A simPath that
// names the games/<id>/sim/ DIRECTORY itself passes existsSync, and the
// relative path is empty — the generator must die on the law, not emit an
// import of a directory.
test("simPath law: naming the games/<id>/sim/ directory itself dies naming the law and emits nothing", () => {
  const dir = fixtureRoot();
  writeFileSync(path.join(dir, "list.json"), JSON.stringify([{ id: "alpha", simPath: "games/alpha/sim" }]));
  expectFailure(dir, "must resolve strictly under games/alpha/sim/");
  assert.ok(!existsSync(path.join(dir, "out", "game-registry.ts")), "a directory-as-simPath entry emits nothing");
});

// QA (Story 2.1, AC7 gap): the SHIPPED bundle carries the attract loop.
// The AC claims "the recipe is embedded"; every other attract pin reads
// the asset file directly, and the regeneration test only proves committed
// == regenerated - a pipeline that consistently stops carrying the recipe
// (list leg dropped, regenerated, committed together) keeps the whole
// pre-QA suite green while the shipped bundle goes silent. This pin walks
// the whole chain: authored asset -> provisional list -> the embed's
// parsed content, so the sealed build's attract loop has a suite leg.
test("the shipped registry embeds the authored attract recipe end to end (asset -> list -> committed module)", () => {
  const repo = path.resolve(import.meta.dirname, "..");
  const list = JSON.parse(readFileSync(path.join(repo, "tools", "registry-list.json"), "utf8")) as Array<Record<string, unknown>>;
  const entry = list.find((e) => e.id === "moon-patrol");
  assert.ok(entry, "the provisional list carries the moon-patrol entry");
  assert.equal(entry.attractSoundPath, "games/moon-patrol/assets/attract-sound.json", "the entry names the authored asset: the recipe's only path into the bundle (AD-11/AD-18)");
  const assetPath = path.resolve(repo, entry.attractSoundPath as string);
  assert.ok(existsSync(assetPath), "the named asset exists");
  const authored = JSON.parse(readFileSync(assetPath, "utf8")) as { sampleRate: number; loopSeconds: number; wave: string; gain: number; notes: Array<Record<string, number>> };
  execFileSync(process.execPath, [GENERATOR], { cwd: repo, encoding: "utf8" }); // byte-identical regeneration (the existing pin proves it)
  const text = readFileSync(path.join(repo, "generated", "game-registry.ts"), "utf8");
  const embed = text.match(/attractSound: (\{.*?\}) },/);
  assert.ok(embed, "the committed module embeds attractSound (mutation: drop attractSoundPath from tools/registry-list.json AND regenerate - the embed vanishes, every other test stays green, red lands here)");
  assert.deepEqual(
    JSON.parse(embed[1]!),
    {
      sampleRate: authored.sampleRate,
      loopSeconds: authored.loopSeconds,
      wave: authored.wave,
      gain: authored.gain,
      notes: authored.notes.map((n) => ({ start: n.start, end: n.end, freq: n.freq, amp: n.amp })),
    },
    "the embedded recipe equals the authored asset: no drift between the bundle and the game's own data",
  );
});

// QA (Story 2.1, matrix row "Malformed attract recipe" gap): the AC pins
// the FAILURE TEXT's substrings; nothing pinned that the message is
// ENTRY-INDEXED - the idiom that says WHICH entry reddens the build. A
// generator that dropped the "entry <i> (<id>): " prefix sailed every
// substring pin green.
test("malformed attract recipes fail naming the entry index and id (the entry-indexed message law)", () => {
  const dir = fixtureRoot();
  writeFileSync(path.join(dir, "attract.json"), "[]");
  writeFileSync(
    path.join(dir, "list.json"),
    JSON.stringify([
      { id: "alpha", simPath: "games/alpha/sim/sim.js" },
      { id: "beta-game", simPath: "games/beta-game/sim/sim.js", attractSoundPath: "attract.json" },
    ]),
  );
  try {
    runGenerator(dir);
  } catch (err) {
    const e = err as { status?: number; stderr?: string };
    assert.equal(e.status, 1, "generator must exit nonzero");
    assert.match(
      e.stderr as string,
      /entry 1 \(beta-game\): attract sound recipe must be an object/,
      "the failure names the entry's list position AND its id (index 1, not a hardcoded entry 0)",
    );
    return;
  }
  assert.fail("generator should have exited nonzero");
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
