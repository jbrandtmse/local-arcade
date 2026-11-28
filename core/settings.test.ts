// Story 2.4 pure tier: every row of the I/O matrix's persistence/seed/
// resolve half runs against core/settings.ts — schema + defaults +
// arcade.settings.v1 codec + first-visit seed + corrupt-store self-heal +
// port-throw degrade + resolver twins (AC4, AC5, NFR-9). Fake ports are
// hand-built recorders: the seed-port call count and the write count are
// themselves assertions (matrix "persisted only on first change", "return
// visit never re-seeds").
import test from "node:test";
import assert from "node:assert/strict";

import {
  AIM_MULTIPLIER_REFERENCE,
  BOB_PRESET_LOW_DIVISOR,
  DEFAULT_BINDING,
  FOV_DEFAULT,
  FOV_MAX,
  FOV_MIN,
  FOCUS_STRENGTH_DEFAULT,
  MASTER_VOLUME_DEFAULT,
  PRESET_SEED_DEFAULT,
  PRESET_SEED_REDUCED,
  SENSITIVITY_DEFAULT,
  SENSITIVITY_MAX,
  SETTINGS_KEY,
  TEMPO_CALM_EVERY_N,
  aimMultiplier,
  bindingTable,
  bobAmplitude,
  createSettingsService,
  decodeRows,
  defaults,
  encodeRows,
  fov,
  focusStrength,
  masterGain,
  tempoEveryN,
  type SettingsRows,
} from "./settings.ts";
import { FOCUS_DUCK } from "./audio/mix.ts";
import { BOB_AMPLITUDE } from "./player.ts";
import type { StoragePort } from "./storage.ts";

interface FakePort {
  port: StoragePort;
  gets: string[];
  sets: Array<[key: string, value: string]>;
}

function fakePort(stored: Partial<Record<string, string>> = {}, throwOnRead = false, throwOnWrite = false): FakePort {
  const data = new Map(Object.entries(stored));
  const gets: string[] = [];
  const sets: Array<[string, string]> = [];
  const port: StoragePort = {
    getItem: (key) => {
      gets.push(key);
      if (throwOnRead) throw new Error("fake port: getItem throws");
      return data.get(key) ?? null;
    },
    setItem: (key, value) => {
      sets.push([key, value]);
      if (throwOnWrite) throw new Error("fake port: setItem throws");
      data.set(key, value);
    },
  };
  return { port, gets, sets };
}

function spyReduced(value: boolean): { fn: () => boolean; calls: () => number } {
  let n = 0;
  return {
    fn: () => {
      n++;
      return value;
    },
    calls: () => n,
  };
}

// --- matrix: first visit ------------------------------------------------------

test("first visit, reduced motion (port true): preset full -> bob 0; defaults otherwise; NOTHING is written until the first change; the store and the seed port are each consulted once", () => {
  const store = fakePort();
  const reduced = spyReduced(true);
  const s = createSettingsService({ storage: store.port, prefersReducedMotion: reduced.fn });
  const rows = s.rows();
  assert.equal(rows.preset, PRESET_SEED_REDUCED, "OS reduce -> full (UX-DR20 seed law; mutation: drop the seed branch -> red)");
  assert.equal(bobAmplitude(rows), 0, "preset full -> no head-bob");
  assert.equal(rows.sensitivity, SENSITIVITY_DEFAULT);
  assert.equal(rows.masterVolume, MASTER_VOLUME_DEFAULT);
  assert.equal(rows.focusStrength, FOCUS_STRENGTH_DEFAULT);
  assert.equal(rows.fov, FOV_DEFAULT);
  assert.equal(rows.vignette, false);
  assert.equal(rows.calmCabinets, false);
  assert.deepEqual(store.sets, [], "seeded, not persisted (AC4: persisted only on first change)");
  assert.deepEqual(store.gets, [SETTINGS_KEY], "one port read at construction");
  assert.equal(reduced.calls(), 1, "the seed port is consulted exactly once, at the first visit");
  assert.equal(s.state().stored, false);
  assert.equal(s.state().degraded, false);
});

test("first visit, no OS signal (port false): preset low -> bob = half BOB_AMPLITUDE (labelled), everything else default", () => {
  const store = fakePort();
  const reduced = spyReduced(false);
  const s = createSettingsService({ storage: store.port, prefersReducedMotion: reduced.fn });
  assert.equal(s.rows().preset, PRESET_SEED_DEFAULT);
  assert.equal(bobAmplitude(s.rows()), BOB_AMPLITUDE / BOB_PRESET_LOW_DIVISOR);
  assert.deepEqual(store.sets, []);
});

// --- matrix: return visit ------------------------------------------------------

test("return visit: stored rows ride verbatim, the seed port is NEVER consulted again, and the preset row from storage wins over the OS signal", () => {
  const payload = encodeRows({
    ...defaults("off"),
    sensitivity: 20,
    masterVolume: 40,
    focusStrength: 30,
    fov: 90,
    vignette: true,
    calmCabinets: true,
    binding: { forward: "KeyQ", back: "KeyZ", left: "KeyV", right: "KeyX" },
  });
  const store = fakePort({ [SETTINGS_KEY]: payload });
  const reduced = spyReduced(true); // even an OS-reduce signal must not touch a stored visit
  const s = createSettingsService({ storage: store.port, prefersReducedMotion: reduced.fn });
  const rows = s.rows();
  assert.equal(rows.preset, "off");
  assert.equal(reduced.calls(), 0, "return visit never re-seeds (AC4)");
  assert.equal(bobAmplitude(rows), BOB_AMPLITUDE, "preset off keeps 1.2's authored amplitude");
  assert.equal(aimMultiplier(rows), 0.4);
  assert.equal(masterGain(rows), 0.4);
  assert.equal(fov(rows), 90);
  assert.equal(tempoEveryN(rows), TEMPO_CALM_EVERY_N);
  assert.deepEqual(bindingTable(rows), { forward: "KeyQ", back: "KeyZ", left: "KeyV", right: "KeyX" });
  assert.equal(rows.lookSource, "mouse");
  assert.equal(s.state().stored, true);
});

// --- matrix: corrupt store ------------------------------------------------------

test("corrupt store: unparseable JSON self-heals to a first visit WITHOUT writing; unknown keys fall to their defaults; out-of-range numbers CLAMP (not default); wrong types fall to their defaults; zero throws", () => {
  // unparseable -> first visit (seed port consulted, nothing written)
  const a = fakePort({ [SETTINGS_KEY]: "{not json" });
  const sa = createSettingsService({ storage: a.port, prefersReducedMotion: () => true });
  assert.equal(sa.rows().preset, PRESET_SEED_REDUCED, "corrupt payload self-heals to the first-visit seed");
  assert.deepEqual(a.sets, [], "self-heal writes nothing (persist stays on-first-change law)");

  // unknown keys ignored; out-of-range clamped; wrong-typed defaulted
  const messy = JSON.stringify({
    banterVolume: 7, // Epic-3's future row arriving early: ignored
    sensitivity: 150, // out of range high -> clamp
    fov: -5, // out of range low -> clamp
    masterVolume: "loud", // wrong type -> default
    focusStrength: Number.NaN, // not finite -> default
    preset: "extreme", // unknown enum member -> base default (NOT re-seeded: this is a stored payload)
    vignette: "yes", // wrong type -> default
    calmCabinets: 1, // wrong type -> default
    binding: { forward: "!!!" }, // malformed code -> per-field default
  });
  const b = fakePort({ [SETTINGS_KEY]: messy });
  const reducedB = spyReduced(true);
  const sb = createSettingsService({ storage: b.port, prefersReducedMotion: reducedB.fn });
  const rows = sb.rows();
  assert.equal(rows.sensitivity, SENSITIVITY_MAX, "out-of-range CLAMPS (matrix 'clamps applied'); mutation: return default here -> red");
  assert.equal(rows.fov, FOV_MIN);
  assert.equal(rows.masterVolume, MASTER_VOLUME_DEFAULT);
  assert.equal(rows.focusStrength, FOCUS_STRENGTH_DEFAULT);
  assert.equal(rows.preset, PRESET_SEED_DEFAULT, "a corrupt PRESET row on a return visit falls to the base default, never re-seeds");
  assert.equal(reducedB.calls(), 0);
  assert.equal(rows.vignette, false);
  assert.equal(rows.calmCabinets, false);
  assert.deepEqual(bindingTable(rows), { ...DEFAULT_BINDING, forward: "KeyW" });
  assert.equal((rows as unknown as Record<string, unknown>).banterVolume, undefined, "unknown keys never survive the codec");
  assert.deepEqual(b.sets, []);

  // codec-level twins
  assert.equal(decodeRows("{not json"), null);
  assert.equal(decodeRows("null"), null);
  assert.equal(decodeRows("[1,2]"), null);
});

// --- matrix: port throws --------------------------------------------------------

test("port throws (no localStorage): defaults stand, the session overlay serves its own writes, degraded is labelled, and nothing throws — zero faults by construction", () => {
  const store = fakePort({}, true, true); // throws on read AND write
  const s = createSettingsService({ storage: store.port, prefersReducedMotion: () => true });
  assert.equal(s.rows().preset, PRESET_SEED_REDUCED, "a throwing store reads as a first visit");
  assert.equal(s.state().degraded, true, "labelled device condition, not a room fault (storage.ts idiom)");
  s.commit({ fov: 80 }); // must not throw
  assert.equal(fov(s.rows()), 80, "the memory overlay serves the write back (matrix 'Port throws')");
  assert.equal(s.state().stored, true, "the session knows it committed even when the port refused");
});

// --- matrix: slider commit + seed persistence ------------------------------------

test("commit: values persist immediately under arcade.settings.v1 through the port, a first-visit seed becomes stored on the FIRST change only, and an out-of-range partial is clamped before the write", () => {
  const store = fakePort();
  const s = createSettingsService({ storage: store.port, prefersReducedMotion: () => false });
  assert.deepEqual(store.sets, [], "nothing persisted before any change");
  s.commit({ sensitivity: 150, fov: 80 });
  assert.equal(store.sets.length, 1, "one write per commit");
  assert.equal(store.sets[0]![0], SETTINGS_KEY);
  const persisted = decodeRows(store.sets[0]![1]!)!;
  assert.equal(persisted.sensitivity, SENSITIVITY_MAX, "the partial is clamped BEFORE it is stored");
  assert.equal(persisted.fov, 80);
  assert.equal(persisted.preset, PRESET_SEED_DEFAULT, "the seed rows persist WITH the first change");
  assert.equal(s.state().stored, true);
  // a later commit round-trips through the same key
  s.commit({ masterVolume: 25 });
  assert.equal(decodeRows(store.sets[1]![1]!)!.masterVolume, 25);
  assert.equal(decodeRows(store.sets[1]![1]!)!.fov, 80, "commits merge, not replace");
});

// Review law (product default, recorded in the Auto Run Result): a movement
// code belongs to at most ONE verb — the panel's own capture UI can only
// offer distinct codes, and a hand-authored corrupt store still merges
// (decodeRows stays per-key); the guard is on the COMMIT path only.

test("commit rejects a binding collision: one code claimed by two verbs is IGNORED — rows keep the standing table, nothing is written — while KeyE/arrow codes as movement verbs stay allowed (visitor double-duty)", () => {
  const store = fakePort();
  const s = createSettingsService({ storage: store.port, prefersReducedMotion: () => false });
  s.commit({ fov: 80 });
  const sets0 = store.sets.length;
  const binding0 = JSON.stringify(s.rows().binding);
  s.commit({ binding: { forward: "KeyQ", back: "KeyQ", left: "KeyA", right: "KeyD" } });
  assert.equal(JSON.stringify(s.rows().binding), binding0, "the colliding commit is ignored (mutation: delete the collision guard -> red here)");
  assert.equal(store.sets.length, sets0, "a rejected commit writes NOTHING to the port");
  assert.equal(s.rows().fov, 80, "the rejected partial carries no other row through");
  // Arrow codes and KeyE may serve movement as long as the four stay distinct:
  // Interact stays KeyE inside the input service (the panel never tables it).
  s.commit({ binding: { forward: "ArrowUp", back: "KeyE", left: "KeyA", right: "KeyD" } });
  assert.deepEqual(bindingTable(s.rows()), { forward: "ArrowUp", back: "KeyE", left: "KeyA", right: "KeyD" }, "distinct codes accepted, arrows/E included");
  // A corrupt STORE with an accidental duplicate still loads (per-key decode):
  const dupStore = fakePort({ [SETTINGS_KEY]: encodeRows({ ...defaults(), binding: { forward: "KeyW", back: "KeyW", left: "KeyA", right: "KeyD" } }) });
  const loaded = createSettingsService({ storage: dupStore.port });
  assert.deepEqual(bindingTable(loaded.rows()), { forward: "KeyW", back: "KeyW", left: "KeyA", right: "KeyD" }, "the guard is COMMIT-side only — a stored payload still decodes per key (self-heal posture unchanged)");
});

// --- matrix: reset -----------------------------------------------------------------

test("reset: the stored key is cleared (the write is the empty marker — the port has no removeItem), the effective rows are the first-visit seed immediately, and the seed port is re-consulted", () => {
  const payload = encodeRows({ ...defaults("off"), masterVolume: 10 });
  const store = fakePort({ [SETTINGS_KEY]: payload });
  const reduced = spyReduced(true);
  const s = createSettingsService({ storage: store.port, prefersReducedMotion: reduced.fn });
  assert.equal(reduced.calls(), 0);
  assert.equal(masterGain(s.rows()), 0.1);
  s.reset();
  assert.deepEqual(store.sets, [[SETTINGS_KEY, ""]], "cleared by writing the empty marker under the SAME key");
  assert.equal(s.rows().preset, PRESET_SEED_REDUCED, "effective values = first-visit seed immediately");
  assert.equal(masterGain(s.rows()), 1, "every scalar back to shipped behaviour");
  assert.equal(reduced.calls(), 1, "the OS signal still stands after reset");
  assert.equal(s.state().stored, false, "reset leaves the visit 'unstored': the next change re-persists");
});

// --- resolvers: defaults equal shipped behaviour (literal identities) ---------------

test("resolver twins at DEFAULT rows: master gain 1.0, focus strength 1 -> mix factor exactly FOCUS_DUCK, FOV 60, aim multiplier 1.0, tempo every 1 tick, and the preset ladder off/low/full = authored token / half / zero", () => {
  const d = defaults();
  assert.equal(masterGain(d), 1, "100 -> gain 1.0 byte-identical to 2.1's shipped chain");
  assert.equal(focusStrength(d), 1);
  assert.equal(1 - focusStrength(d) * (1 - FOCUS_DUCK), FOCUS_DUCK, "strength 1 reproduces FOCUS_DUCK EXACTLY (2.2 pins byte-preserved)");
  assert.equal(fov(d), 60);
  assert.equal(aimMultiplier(d), 1, "50/50 = 1.0x — the shipped MOUSE_SENSITIVITY law (matrix defaults-equal-shipped row)");
  assert.equal(AIM_MULTIPLIER_REFERENCE, 50);
  assert.equal(tempoEveryN(d), 1, "calm off: every tick — today's byte-identical cadence");
  assert.deepEqual(bindingTable(d), { forward: "KeyW", back: "KeyS", left: "KeyA", right: "KeyD" });
  assert.equal(bobAmplitude(defaults("off")), BOB_AMPLITUDE, "off preset keeps 1.2's authored token literally");
  assert.equal(bobAmplitude(defaults("low")), BOB_AMPLITUDE / BOB_PRESET_LOW_DIVISOR);
  assert.equal(bobAmplitude(defaults("full")), 0);
  // clamped ranges land on the labelled homes
  assert.equal(masterGain({ ...d, masterVolume: 45 }), 0.45);
  assert.equal(masterGain({ ...d, masterVolume: 0 }), 0);
  assert.equal(aimMultiplier({ ...d, sensitivity: SENSITIVITY_MAX }), 2);
  assert.equal(aimMultiplier({ ...d, sensitivity: 0 }), 0, "sensitivity 0 freezes look (the multiplier is a straight line)");
  assert.equal(FOV_MAX, 110);
  const rows: SettingsRows = { ...d };
  assert.equal(bobAmplitude(rows), bobAmplitude(defaults(PRESET_SEED_DEFAULT)));
});
