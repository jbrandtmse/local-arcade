// QA end-to-end registry test (AC6; AD-1/2/11): the generator's output is
// exercised as a CONSUMABLE artifact, not just text — run as a real CLI call
// over a temp repo, then import()ed and wired through loop + wrapper +
// supervisor exactly as core/main.ts wires the shipped registry. Pins: the
// emitted module loads in Node, carries the declared ids/seeds/factories, and
// drives sims to a run transcript identical to constructing the same sims
// directly — so a lost seed or misbound factory in the template turns this red.
// Needs: os tmpdir only (fixture sims are temp files under the TEMP repo's
// games/ — the simPath law (DW-5) binds the sim half to games/<id>/sim/ and
// these fixtures comply); each test builds its own temp repo and removes it.
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createKernelLoop } from "../core/loop.ts";
import { createGameInstance, type GameInstance, type GameRegistryEntry, type SimEvent } from "../core/contract/index.ts";

const GENERATOR = path.resolve(import.meta.dirname, "gen-registry.mjs");

// Fixture sim sources: plain-JS sims on the injected rng and gated state,
// deterministic and gate-clean (they must also survive ci/lint-bans style rules).
const SIM_SOURCES: Record<string, string> = {
  "games/beta/sim/sim.js": `export function createSim(ctx) {
  const state = ctx.gated({ t: 0, rolls: [] });
  let out = [];
  return {
    tick() {
      state.t += 1;
      if (state.t % 3 === 0) state.rolls.push(ctx.rng.rangeInt(1, 6));
      if (state.t === 20) out.push({ type: "roundBreak", payload: { at: 20, sum: state.rolls.reduce((a, b) => a + b, 0) } });
      if (state.t === 35) out.push({ type: "gameEnded", payload: { at: 35 } });
    },
    events() { const pulled = out; out = []; return pulled; },
    snapshot() { return { t: state.t, rolls: state.rolls, rng: ctx.rng.getState() }; },
  };
}
`,
  "games/alpha-game/sim/sim.js": `export function createSim(ctx) {
  const state = ctx.gated({ t: 0, rolls: [] });
  let out = [];
  return {
    tick() {
      state.t += 1;
      if (state.t % 5 === 0) state.rolls.push(ctx.rng.uniform());
      if (state.t === 30) out.push({ type: "roundBreak", payload: { at: 30, n: state.rolls.length } });
    },
    events() { const pulled = out; out = []; return pulled; },
    snapshot() { return { t: state.t, rolls: state.rolls, rng: ctx.rng.getState() }; },
  };
}
`,
};

const LIST = JSON.stringify([
  { id: "beta", simPath: "games/beta/sim/sim.js", seed: 9 }, // deliberately unsorted
  { id: "alpha-game", simPath: "games/alpha-game/sim/sim.js", seed: 123 },
]);

function tempRepo(): string {
  const dir = mkdtempSync(path.join(tmpdir(), "registry-e2e-"));
  for (const [rel, text] of Object.entries(SIM_SOURCES)) {
    const full = path.join(dir, rel);
    mkdirSync(path.dirname(full), { recursive: true });
    writeFileSync(full, text);
  }
  writeFileSync(path.join(dir, "list.json"), LIST);
  return dir;
}

function generate(dir: string): string {
  return execFileSync(process.execPath, [GENERATOR, "--cwd", dir, "--list", "list.json", "--out", path.join("generated", "game-registry.ts")], {
    encoding: "utf8",
  });
}

// Drive a loop wired from factories, collecting per-frame transcripts like
// core/main.ts + a consumer would: global tick, drained events, wrapper hashes.
async function runWired(
  makeInstances: () => Promise<Array<{ id: string; seed: number; factory: unknown }>>,
  frames = 45,
): Promise<{ tick: number; transcript: unknown[]; eventTotal: number }> {
  let ms = 0;
  const loop = createKernelLoop({ now: () => ms });
  const instances: Array<{ id: string; instance: GameInstance }> = [];
  for (const { id, seed, factory } of await makeInstances()) {
    const instance = createGameInstance(factory as never, seed);
    instances.push({ id, instance });
    loop.addInstance(id, instance);
  }
  const transcript: unknown[] = [];
  let eventTotal = 0;
  for (let f = 0; f < frames; f++) {
    ms += 17;
    loop.step();
    const drained = loop.drainEvents();
    eventTotal += drained.length;
    transcript.push({
      tick: loop.tickCount,
      // Drained order follows instance registration order, which differs
      // between the registry path and the direct path; compare content,
      // not registration order.
      events: drained
        .map((r) => ({ gameId: r.gameId, event: r.event }))
        .sort((a, b) => (a.gameId < b.gameId ? -1 : a.gameId > b.gameId ? 1 : 0)),
      hashes: Object.fromEntries(instances.map(({ id, instance }) => [id, instance.stateHash()])),
    });
  }
  return { tick: loop.tickCount, transcript, eventTotal };
}

test("generated module is importable and wired: identical run to direct construction", async () => {
  const dir = tempRepo();
  try {
    const stdout = generate(dir);
    assert.match(stdout, /gen-registry: 2 entr/, "generator reports two entries on stdout");
    const regPath = path.join(dir, "generated", "game-registry.ts");
    const registryText = readFileSync(regPath, "utf8");
    assert.ok(registryText.indexOf("gAlphaGame") < registryText.indexOf("gBeta"), "emitted bindings sorted by id");

    // The artifact's shape: declared ids, seeds, and callable factories.
    const mod = (await import(pathToFileURL(regPath).href)) as { gameRegistry: GameRegistryEntry[] };
    assert.deepEqual(mod.gameRegistry.map((e) => e.id), ["alpha-game", "beta"]);
    assert.deepEqual(mod.gameRegistry.map((e) => e.seed), [123, 9]);
    for (const entry of mod.gameRegistry) assert.equal(typeof entry.createSim, "function");

    // Registry path: wire exactly as main.ts does (seed ?? 0).
    const viaRegistry = await runWired(async () =>
      mod.gameRegistry.map((e) => ({ id: e.id, seed: e.seed ?? 0, factory: e.createSim })),
    );
    // Control path: import the sim sources directly with the declared seeds.
    const viaDirect = await runWired(async () => {
      const made = [];
      for (const entry of JSON.parse(LIST) as Array<{ id: string; simPath: string; seed: number }>) {
        const simMod = (await import(pathToFileURL(path.resolve(dir, entry.simPath)).href)) as { createSim: unknown };
        made.push({ id: entry.id, seed: entry.seed, factory: simMod.createSim });
      }
      return made;
    });

    assert.ok(viaRegistry.eventTotal >= 3, `transcript carries canonical events, got ${viaRegistry.eventTotal}`);
    assert.equal(viaRegistry.tick, viaDirect.tick);
    assert.deepEqual(viaRegistry.transcript, viaDirect.transcript); // seeds/factories bound verbatim
    const first = viaRegistry.transcript[0] as { hashes: Record<string, string> };
    const last = viaRegistry.transcript[44] as { hashes: Record<string, string> };
    assert.notEqual(first.hashes["alpha-game"], last.hashes["alpha-game"], "sims actually ran");

    // Regeneration is behaviorally deterministic too: a fresh emit + import
    // replays the same transcript.
    generate(dir);
    const mod2 = (await import(`${pathToFileURL(regPath).href}?fresh=2`)) as { gameRegistry: GameRegistryEntry[] };
    const rerun = await runWired(async () =>
      mod2.gameRegistry.map((e) => ({ id: e.id, seed: e.seed ?? 0, factory: e.createSim })),
    );
    assert.deepEqual(rerun.transcript, viaRegistry.transcript, "second generation replays identically");
  } finally {
    rmSync(dir, { recursive: true, force: true, maxRetries: 3 });
  }
});
