// Story 2.1 (test tier: fake-AudioContext graph rig, the fake-Three
// injection idiom): the manager's graph shape, autoplay law, and end-to-end
// law integration are pinned against a structural fake of the SAME seam the
// browser adapter feeds from a real AudioContext. One graph, one chain per
// Cabinet, HRTF + authored distance model, and the no-flap dwell all ride
// through here; the by-ear claims (does it SOUND right) are browser-tier,
// deferred to the Epic 3 harness — never claimed from this suite.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import type { AttractSound, GameRegistryEntry } from "../contract/wrapper.ts";
import { ENTRY_STREET_VIEW, type EntryPhase, type EntryPose, type EntryState } from "../entry.ts";
import { ENTRY_SPAWN, collisionVolumes } from "../room/collision-volumes.ts";
import { placementGeometry } from "../room/cabinets.ts";
import { EYE_HEIGHT, type PlayerState } from "../player.ts";
import type { Occupancy } from "../patrons/scheduler.ts";
import {
  PANNER_SETUP,
  SMOOTHING_S,
  SPEAKER_HEIGHT_M,
  createAudioManager,
  createSilentGraph,
  createWebAudioGraph,
  type AudioGraph,
  type GraphState,
  type PannerSetup,
  type RawContext,
} from "./manager.ts";
import { ATTRACT_BASE_GAIN, DWELL_TICKS, OCCLUSION_PROFILES, OPEN_PROFILE } from "./mix.ts";

const REPO = path.resolve(import.meta.dirname, "..", "..");
const recipe: AttractSound = JSON.parse(
  readFileSync(path.join(REPO, "games", "moon-patrol", "assets", "attract-sound.json"), "utf8"),
);

// The registry entry's sim factory throws on call: the manager must read
// the recipe as DATA and never instantiate a game (AD-7 asset law).
const registry: GameRegistryEntry[] = [
  {
    id: "moon-patrol",
    createSim: () => {
      throw new Error("the audio manager must never instantiate a game");
    },
    attractSound: recipe,
  },
];

// --- The fake graph (injects the same seam shape the adapter produces) ----

interface FakeParam {
  label: string;
  targets: number[];
}

function createFakeGraph(initialState: GraphState) {
  const state: { value: GraphState } = { value: initialState };
  const params: FakeParam[] = [];
  const connects: string[] = [];
  const labels = { sources: [] as string[], lowpasses: [] as string[], gains: [] as string[], panners: [] as string[], destination: "" };
  const bucket: Record<string, string[]> = { source: labels.sources, lowpass: labels.lowpasses, gain: labels.gains, panner: labels.panners };
  const pannerSetups: PannerSetup[] = [];
  const pannerPositions: Array<{ x: number; y: number; z: number } | null> = [];
  const buffers: Array<{ sampleCount: number; sampleRate: number; writtenLengths: number[] }> = [];
  const sources: Array<{ bufferIndex: number | null; started: number }> = [];
  const listenerMoves: Array<{ x: number; y: number; z: number }> = [];
  let nodeCount = 0;
  let resumeAttempts = 0;
  let resumeBlocks = true;

  function makeNode(kind: string): { fakeLabel: string; connect: (target: { fakeLabel?: string }) => void } {
    const handle = {
      fakeLabel: `${kind}#${nodeCount++}`,
      connect: (target: { fakeLabel?: string }) => {
        connects.push(`${handle.fakeLabel}->${target.fakeLabel ?? "?"}`);
      },
    };
    bucket[kind]?.push(handle.fakeLabel);
    return handle;
  }

  const destination = makeNode("destination");
  labels.destination = destination.fakeLabel;

  const graph: AudioGraph = {
    state: () => state.value,
    resume: () => {
      resumeAttempts += 1;
      if (resumeBlocks) return Promise.reject(new Error("gesture still blocked"));
      state.value = "running";
      return Promise.resolve();
    },
    createBuffer: (sampleCount, sampleRate) => {
      const index = buffers.length;
      buffers.push({ sampleCount, sampleRate, writtenLengths: [] });
      return {
        fakeIndex: index,
        write: (samples: Float32Array) => {
          buffers[index]!.writtenLengths.push(samples.length);
        },
      };
    },
    createLoopSource: (buffer) => {
      const handle = makeNode("source");
      const index = sources.length;
      sources.push({ bufferIndex: (buffer as { fakeIndex?: number }).fakeIndex ?? null, started: 0 });
      return Object.assign(handle, {
        start: () => {
          sources[index]!.started += 1;
        },
      });
    },
    createLowpass: () => {
      const handle = makeNode("lowpass");
      const param: FakeParam = { label: `${handle.fakeLabel}.frequency`, targets: [] };
      params.push(param);
      return Object.assign(handle, { frequency: { setTarget: (v: number) => param.targets.push(v) } });
    },
    createGain: () => {
      const handle = makeNode("gain");
      const param: FakeParam = { label: `${handle.fakeLabel}.gain`, targets: [] };
      params.push(param);
      return Object.assign(handle, { gain: { setTarget: (v: number) => param.targets.push(v) } });
    },
    createPanner: (setup) => {
      const handle = makeNode("panner");
      pannerSetups.push(setup);
      pannerPositions.push(null);
      const slot = pannerPositions.length - 1;
      return Object.assign(handle, {
        setPosition: (x: number, y: number, z: number) => {
          assert.equal(pannerPositions[slot], null, "panner position is set exactly once per chain");
          pannerPositions[slot] = { x, y, z };
        },
      });
    },
    setListenerPosition: (x, y, z) => {
      listenerMoves.push({ x, y, z });
    },
    destination,
  };

  return {
    graph,
    params,
    connects,
    labels,
    pannerSetups,
    pannerPositions,
    buffers,
    sources,
    listenerMoves,
    resumeAttempts: () => resumeAttempts,
    allowResume: () => {
      resumeBlocks = false;
    },
    forceState: (s: GraphState) => {
      state.value = s;
    },
  };
}

// --- The fake kernel wiring ----------------------------------------------

function makeEntry(phase: EntryPhase, bleedFraction: number) {
  const st: EntryState = {
    phase,
    tick: 1,
    framesRendered: 2,
    bleedFraction,
    handleFraction: 0,
    openFraction: 0,
    open: phase === "control",
    timeToPlayableMs: 0,
  };
  let pose: EntryPose = { x: ENTRY_STREET_VIEW.x, y: EYE_HEIGHT, z: ENTRY_STREET_VIEW.z, yaw: 0, pitch: 0 };
  return {
    entry: { pose: () => pose, state: () => st },
    setPhase: (p: EntryPhase) => {
      st.phase = p;
    },
    setBleed: (b: number) => {
      st.bleedFraction = b;
    },
    setPose: (x: number, z: number) => {
      pose = { x, y: EYE_HEIGHT, z, yaw: 0, pitch: 0 };
    },
  };
}

function makeScheduler(occupancy: { value: Occupancy }) {
  return {
    state: () => ({
      tick: 0,
      cabinets: [
        {
          volumeId: "cabinet-B0",
          gameId: "moon-patrol",
          occupancy: occupancy.value,
          runCount: 1,
          lastSeed: 7,
          queue: [],
          rearmTick: 0,
        },
      ],
    }),
  };
}

function makePlayer() {
  const state: PlayerState = { x: ENTRY_SPAWN.x, z: ENTRY_SPAWN.z, yaw: 0, pitch: 0, bobPhase: 0, bobAmp: 0, targetId: null };
  return { player: { state }, state };
}

function build(initialState: GraphState = "running") {
  const rig = createFakeGraph(initialState);
  const entryKit = makeEntry("control", 1);
  const occupancy = { value: "attract" as Occupancy };
  const playerKit = makePlayer();
  const manager = createAudioManager({
    graph: rig.graph,
    registry,
    scheduler: makeScheduler(occupancy),
    player: playerKit.player,
    entry: entryKit.entry,
  });
  return { rig, manager, entryKit, occupancy, playerKit };
}

/** Point on the pillar-1 -> B0 axis, pushed behind the pillar (authored
 * data derived, same construction as occlusion.test.ts). */
function behindPillar1(): { x: number; z: number } {
  const b0 = placementGeometry("B0").center;
  const p1 = collisionVolumes.find((v) => v.id === "pillar-1");
  assert.ok(p1 !== undefined);
  const cx = (p1.min.x + p1.max.x) / 2;
  const cz = (p1.min.z + p1.max.z) / 2;
  return { x: cx + (cx - b0.x) * 0.25, z: cz + (cz - b0.z) * 0.25 };
}

// --- Pins ------------------------------------------------------------------

test("one owned chain per Cabinet: fake graph shows one source/lowpass/gain/panner, connected source->lowpass->gain->panner->destination", () => {
  const { rig } = build("suspended");
  const placements = 1; // the authored cabinetPlacements list (B0)
  assert.equal(rig.labels.sources.length, placements);
  assert.equal(rig.labels.lowpasses.length, placements);
  assert.equal(rig.labels.gains.length, placements);
  assert.equal(rig.labels.panners.length, placements);
  assert.deepEqual(rig.connects, [
    `${rig.labels.sources[0]}->${rig.labels.lowpasses[0]}`,
    `${rig.labels.lowpasses[0]}->${rig.labels.gains[0]}`,
    `${rig.labels.gains[0]}->${rig.labels.panners[0]}`,
    `${rig.labels.panners[0]}->${rig.labels.destination}`,
  ]);
});

test("the chain carries the recipe as PCM: one buffer sized to the render, written once, looped source started once even while suspended", () => {
  const { rig } = build("suspended");
  assert.deepEqual(rig.buffers, [{ sampleCount: 35280, sampleRate: 22050, writtenLengths: [35280] }]);
  assert.deepEqual(rig.sources, [{ bufferIndex: 0, started: 1 }]);
});

test("HRTF panner with the authored distance model, positioned once at the Cabinet's authored speaker point", () => {
  const { rig } = build("suspended");
  // The authored law as LITERALS (placeholder pending 3.7): drift in any
  // value reds this pin (mutation: bump SPEAKER_HEIGHT_M or swap the
  // distance model and the whole suite stays green without these lines).
  assert.deepEqual(PANNER_SETUP, { panningModel: "HRTF", distanceModel: "inverse", refDistance: 1.5, maxDistance: 40, rolloffFactor: 1 });
  assert.equal(SPEAKER_HEIGHT_M, 1.5);
  assert.deepEqual(rig.pannerSetups, [PANNER_SETUP]);
  const b0 = placementGeometry("B0").center;
  assert.deepEqual(rig.pannerPositions, [{ x: b0.x, y: SPEAKER_HEIGHT_M, z: b0.z }]);
});

test("the Cabinet with no recipe keeps its full chain but starts no source (silent attract; the debug record says so)", () => {
  const rig = createFakeGraph("suspended");
  const entryKit = makeEntry("control", 1);
  const occupancy = { value: "attract" as Occupancy };
  const playerKit = makePlayer();
  const manager = createAudioManager({
    graph: rig.graph,
    registry: [], // no entry at all for the placed Cabinet (a 2.2 room service shape)
    scheduler: makeScheduler(occupancy),
    player: playerKit.player,
    entry: entryKit.entry,
  });
  assert.deepEqual(rig.sources, [], "no source is started for a recipe-less Cabinet");
  assert.deepEqual(rig.buffers, [], "no buffer is rendered from a missing recipe");
  assert.equal(rig.labels.lowpasses.length, 1);
  assert.equal(rig.labels.gains.length, 1);
  assert.equal(rig.labels.panners.length, 1);
  assert.deepEqual(rig.connects, [
    `${rig.labels.lowpasses[0]}->${rig.labels.gains[0]}`,
    `${rig.labels.gains[0]}->${rig.labels.panners[0]}`,
    `${rig.labels.panners[0]}->${rig.labels.destination}`,
  ], "the room services stay uniform: one chain, only the source leg is absent");
  manager.tick();
  const chain = manager.state().chains[0]!;
  assert.equal(chain.hasRecipe, false, "the debug record carries the truth (mutation: drop the hasRecipe guard and renderAttractLoop(undefined) throws at boot \u2014 red here)");
  assert.equal(chain.gameId, "");
});

test("the listener follows the ear on running ticks (the panner law: positional change rides the listener, the speakers stay put); a suspended graph gets no listener writes", () => {
  const { rig, manager, entryKit, playerKit } = build("suspended");
  for (let i = 0; i < 3; i++) manager.tick();
  assert.equal(rig.listenerMoves.length, 0, "suspended: nothing is actuated, the listener included (the autoplay row)");
  rig.allowResume();
  manager.requestResume();
  manager.tick();
  const spawn = { x: playerKit.state.x, z: playerKit.state.z };
  assert.deepEqual(rig.listenerMoves.at(-1), { x: spawn.x, y: EYE_HEIGHT, z: spawn.z }, "in control the ear is the player pose at eye height");
  playerKit.state.x = spawn.x + 2;
  manager.tick();
  assert.deepEqual(rig.listenerMoves.at(-1), { x: spawn.x + 2, y: EYE_HEIGHT, z: spawn.z }, "the ear moved, the write moved: HRTF + the authored distance model attenuate against THIS point (mutation: drop the setListenerPosition call in tick \u2014 red here)");
  entryKit.setPhase("door");
  manager.tick();
  assert.deepEqual(rig.listenerMoves.at(-1), { x: ENTRY_STREET_VIEW.x, y: EYE_HEIGHT, z: ENTRY_STREET_VIEW.z }, "pre-control the entry beat owns the ear (the same handover rule as the ray origin)");
  entryKit.setPhase("workbench");
  manager.tick();
  assert.deepEqual(rig.listenerMoves.at(-1), { x: spawn.x + 2, y: EYE_HEIGHT, z: spawn.z }, "the workbench page keeps the PLAYER ear: entry.pose() freezes at the last street pose there, so an ear that fell back to it would localize the attract from the street while the visitor stands elsewhere (mutation: drop the workbench leg in ear() and every other phase pin stays green \u2014 red here)");
});

test("the browser adapter maps a shadowed raw context onto the seam: looped source, lowpass type, panner law on the real node, stamped params, copied samples", () => {
  interface ShadowParam {
    value: number;
    calls: Array<[number, number, number]>;
    setTargetAtTime(target: number, start: number, timeConstant: number): ShadowParam;
  }
  const rawParam = (): ShadowParam => {
    const p: ShadowParam = {
      value: 0,
      calls: [],
      setTargetAtTime(target, start, timeConstant) {
        p.calls.push([target, start, timeConstant]);
        return p;
      },
    };
    return p;
  };
  const connects: string[] = [];
  const rawNode = (label: string) => ({
    label,
    connect: (dest: { label?: string }) => {
      connects.push(`${label}->${dest.label ?? "?"}`);
    },
  });
  let started = 0;
  const source = Object.assign(rawNode("source"), { buffer: null, loop: false, start: () => { started += 1; } });
  const chanData = new Float32Array(4);
  let rawBuffer: { getChannelData(channel: number): Float32Array } | null = null;
  const filter = Object.assign(rawNode("filter"), { frequency: rawParam(), type: "bandpass" });
  const gainNode = Object.assign(rawNode("gain"), { gain: rawParam() });
  const panner = Object.assign(rawNode("panner"), {
    positionX: rawParam(), positionY: rawParam(), positionZ: rawParam(),
    panningModel: "equalpower", distanceModel: "linear", refDistance: 0, maxDistance: 0, rolloffFactor: 0,
  });
  const listener = { positionX: rawParam(), positionY: rawParam(), positionZ: rawParam() };
  const ctx: RawContext = {
    state: "running",
    currentTime: 7.5,
    listener,
    resume: () => Promise.resolve(),
    destination: rawNode("destination"),
    createBuffer: (numberOfChannels, length, sampleRate) => {
      assert.deepEqual([numberOfChannels, length, sampleRate], [1, 4, 8000], "mono buffer, the render's length and rate");
      rawBuffer = { getChannelData: () => chanData };
      return rawBuffer;
    },
    createBufferSource: () => source,
    createBiquadFilter: () => filter,
    createGain: () => gainNode,
    createPanner: () => panner,
  };
  const graph = createWebAudioGraph(ctx);
  // The authored smoothing constant as a LITERAL (placeholder pending 3.7):
  // every param glide rides this number; changing it must red here even
  // though every other assertion quotes the symbol (mutation: 0.15 -> 0.2).
  assert.equal(SMOOTHING_S, 0.15);
  const buffer = graph.createBuffer(4, 8000);
  buffer.write(new Float32Array([1, -1, 0.5, -0.5]));
  assert.deepEqual(Array.from(chanData), [1, -1, 0.5, -0.5], "write() copies the rendered samples into channel 0");
  const srcHandle = graph.createLoopSource(buffer);
  assert.equal(source.loop, true, "the attract source is a forever-loop (mutation: flip to false: one pass then silence forever, red here only)");
  assert.equal(source.buffer, rawBuffer, "the source carries the wrapped buffer itself");
  srcHandle.start();
  assert.equal(started, 1, "start() reaches the raw source");
  const lpHandle = graph.createLowpass();
  assert.equal(filter.type, "lowpass", "the adapter SETS the colouration type (the contract spelling, not a node default)");
  lpHandle.frequency.setTarget(1500);
  assert.deepEqual(filter.frequency.calls, [[1500, 7.5, SMOOTHING_S]], "param moves are stamped at the audio clock with the authored smoothing constant (mutation: stamp 0 instead of ctx.currentTime)");
  const gainHandle = graph.createGain();
  gainHandle.gain.setTarget(0.25);
  assert.deepEqual(gainNode.gain.calls, [[0.25, 7.5, SMOOTHING_S]]);
  const pannerHandle = graph.createPanner(PANNER_SETUP);
  assert.deepEqual(
    [panner.panningModel, panner.distanceModel, panner.refDistance, panner.maxDistance, panner.rolloffFactor],
    ["HRTF", "inverse", 1.5, 40, 1],
    "the authored panner law lands on the real node (mutation: drop one assignment: the panner answers with node defaults \u2014 red here)",
  );
  pannerHandle.setPosition(2.5, 1.5, -3);
  assert.deepEqual([panner.positionX.value, panner.positionY.value, panner.positionZ.value], [2.5, 1.5, -3], "the speaker point is written once as values");
  graph.setListenerPosition(1, 1.6, 2);
  assert.deepEqual(
    [listener.positionX.calls, listener.positionY.calls, listener.positionZ.calls],
    [[[1, 7.5, SMOOTHING_S]], [[1.6, 7.5, SMOOTHING_S]], [[2, 7.5, SMOOTHING_S]]],
    "the ear rides the same stamped clock: three writes off one audio-clock read",
  );
  srcHandle.connect(lpHandle);
  gainHandle.connect(pannerHandle);
  pannerHandle.connect(graph.destination);
  assert.deepEqual(connects, ["source->filter", "gain->panner", "panner->destination"], "connect unwraps the raw nodes leg by leg (mutation: break rawNodeOf and the legs stop reaching the raw graph)");
});

test("the silent fallback graph is inert forever: suspended state, no-op handles, and the manager runs over it actuating nothing", async () => {
  const graph = createSilentGraph();
  assert.equal(graph.state(), "suspended");
  const buffer = graph.createBuffer(10, 8000);
  buffer.write(new Float32Array(10));
  const src = graph.createLoopSource(buffer);
  src.start();
  const lp = graph.createLowpass();
  const gainHandle = graph.createGain();
  const panner = graph.createPanner(PANNER_SETUP);
  src.connect(lp);
  lp.connect(gainHandle);
  gainHandle.connect(panner);
  panner.connect(graph.destination);
  lp.frequency.setTarget(1);
  gainHandle.gain.setTarget(1);
  panner.setPosition(0, 0, 0);
  graph.setListenerPosition(0, 0, 0);
  await graph.resume();
  assert.equal(graph.state(), "suspended", "no gesture can resurrect the blocked fallback (mutation: make resume flip to running: the law would actuate on a non-existent graph)");
  const entryKit = makeEntry("control", 1);
  const manager = createAudioManager({
    graph,
    registry,
    scheduler: makeScheduler({ value: "attract" as Occupancy }),
    player: makePlayer().player,
    entry: entryKit.entry,
  });
  manager.tick();
  const dbg = manager.state();
  assert.equal(dbg.graphState, "suspended", "the debug view reports the fallback (mutation: delete the typeof-undefined leg in main.ts and an insecure-origin boot reaches the workbench instead of this silent path \u2014 the glue pin reds there)");
  assert.equal(dbg.chains[0]!.gain, 0.5 * 1, "the law still derives (the silent graph just never actuates it)");
});

test("autoplay-blocked context: ticks actuate no params; each gesture attempts exactly one resume; a rejected resume survives silently", () => {
  const { rig, manager } = build("suspended");
  // Chain-build writes (silent start) are the only entries so far.
  const gainParam = rig.params.find((p) => p.label.endsWith(".gain"));
  const freqParam = rig.params.find((p) => p.label.endsWith(".frequency"));
  assert.ok(gainParam !== undefined && freqParam !== undefined);
  assert.deepEqual(gainParam.targets, [0]);
  assert.deepEqual(freqParam.targets, [OPEN_PROFILE.lowpassHz]);

  for (let i = 0; i < 5; i++) manager.tick();
  assert.deepEqual(gainParam.targets, [0], "nothing is actuated while suspended");
  assert.deepEqual(freqParam.targets, [OPEN_PROFILE.lowpassHz]);

  manager.requestResume();
  manager.requestResume();
  assert.equal(rig.resumeAttempts(), 2, "one attempt per gesture, retried by the next");
  for (let i = 0; i < 5; i++) manager.tick();
  assert.deepEqual(gainParam.targets, [0], "still blocked: still silent");

  rig.allowResume();
  manager.requestResume();
  assert.equal(rig.resumeAttempts(), 3);
  manager.tick();
  assert.equal(gainParam.targets.length, 2, "running at last: the law actuates");
  manager.requestResume();
  assert.equal(rig.resumeAttempts(), 3, "a running context gets no further resume attempts");
});

test("interrupted and closed states hold the autoplay posture: interrupted is silent but gesture-recoverable, closed is terminal (the GraphState mirror's iOS/closed legs)", () => {
  const { rig, manager } = build("suspended");
  const gainParam = rig.params.find((p) => p.label.endsWith(".gain"))!;
  rig.allowResume();
  manager.requestResume();
  manager.tick();
  assert.equal(gainParam.targets.length, 2, "running: the chain-build write plus one actuation");
  rig.forceState("interrupted");
  for (let i = 0; i < 5; i++) manager.tick();
  assert.equal(gainParam.targets.length, 2, "interrupted blocks actuation exactly like suspended (mutation: silent = state() === \"suspended\" \u2014 the interrupted ticks actuate, red here)");
  manager.requestResume();
  assert.equal(rig.resumeAttempts(), 2, "interrupted is recoverable: the gesture still attempts resume (mutation: add interrupted to requestResume's terminal early-return \u2014 red here)");
  manager.tick();
  assert.equal(gainParam.targets.length, 3, "the gesture resurrected the graph: the law actuates again");
  rig.forceState("closed");
  manager.tick();
  assert.equal(gainParam.targets.length, 3, "closed blocks actuation too");
  manager.requestResume();
  assert.equal(rig.resumeAttempts(), 2, "closed is terminal: no resume attempt against a dead graph (mutation: drop the closed early-return \u2014 red here)");
});

test("law end-to-end + dwell: line-of-sound from the spawn reads base gain; a pillar applies only after DWELL_TICKS", () => {
  const { rig, manager, playerKit } = build("running");
  const gainParam = rig.params.find((p) => p.label.endsWith(".gain"))!;
  const freqParam = rig.params.find((p) => p.label.endsWith(".frequency"))!;

  manager.tick();
  const first = manager.state().chains[0];
  assert.deepEqual(first.occluderIds, [], "the spawn->B0 ray is clear");
  assert.equal(first.gain, ATTRACT_BASE_GAIN);

  playerKit.state.x = behindPillar1().x;
  playerKit.state.z = behindPillar1().z;
  for (let i = 0; i < DWELL_TICKS - 1; i++) manager.tick();
  assert.equal(manager.state().chains[0]!.appliedId, "", "29 pillar samples have not applied");
  assert.equal(gainParam.targets.at(-1), ATTRACT_BASE_GAIN);

  manager.tick(); // the DWELL-th consecutive sample flips it
  assert.equal(manager.state().chains[0]!.appliedId, "pillar-1");
  assert.equal(gainParam.targets.at(-1), ATTRACT_BASE_GAIN * OCCLUSION_PROFILES.pillar.gain);
  assert.equal(freqParam.targets.at(-1), OCCLUSION_PROFILES.pillar.lowpassHz);
});

test("occupancy through the manager: seated ducks the gain to zero law-only (no start/stop churn); a busy cabinet keeps sounding", () => {
  const { rig, manager, occupancy } = build("running");
  const gainParam = rig.params.find((p) => p.label.endsWith(".gain"))!;
  const freqParam = rig.params.find((p) => p.label.endsWith(".frequency"))!;

  occupancy.value = "visitor-seated";
  manager.tick();
  assert.equal(gainParam.targets.at(-1), 0);
  assert.equal(freqParam.targets.at(-1), OPEN_PROFILE.lowpassHz, "gate is gain-only: colour stays open");
  assert.deepEqual(rig.sources, [{ bufferIndex: 0, started: 1 }], "the looping source is never started/stopped by occupancy");

  occupancy.value = "patron-autoplay";
  manager.tick();
  assert.equal(gainParam.targets.at(-1), ATTRACT_BASE_GAIN, "the busy cabinet's attract keeps sounding");
});

test("street listener during the door beat: door-front occlusion + bleed swell compose to the door profile's number", () => {
  const { manager, entryKit } = build("running");
  entryKit.setPhase("door");
  entryKit.setBleed(0.5);
  for (let i = 0; i < DWELL_TICKS; i++) manager.tick();
  const chain = manager.state().chains[0]!;
  assert.deepEqual(chain.occluderIds, ["door-front"]);
  assert.equal(chain.appliedId, "door-front");
  assert.equal(chain.gain, ATTRACT_BASE_GAIN * OCCLUSION_PROFILES.door.gain * 0.5, "base x door x bleed");
  assert.equal(chain.lowpassHz, OCCLUSION_PROFILES.door.lowpassHz);
});

test("determinism twin: two identical rigs over a scripted listener walk record identical param sequences", () => {
  const a = build("running");
  const b = build("running");
  for (let tick = 0; tick < 60; tick++) {
    const spot = tick < 30 ? { x: ENTRY_SPAWN.x, z: ENTRY_SPAWN.z } : behindPillar1();
    for (const kit of [a, b]) {
      kit.playerKit.state.x = spot.x;
      kit.playerKit.state.z = spot.z;
      kit.manager.tick();
    }
  }
  const sequences = (kit: typeof a) => kit.rig.params.map((p) => [p.label, p.targets.slice()] as const);
  assert.deepEqual(sequences(a), sequences(b));
  assert.deepEqual(a.rig.connects, b.rig.connects);
});

// QA (Story 2.1 gap): AD-23's consumption law + the 2.0 continuity line.
// Every other rig above feeds the manager fresh per-call objects, so a
// manager that wrote back into kernel state or the authored volume list
// was invisible. This pin hands STABLE state objects, snapshots them,
// runs ticks across the occlusion/actuation paths, and proves the manager
// left every input byte-identical (occupancy, player pose, entry state,
// the recipe, and collisionVolumes - the list is read, never edited).
test("the manager mutates no kernel state (AD-23: occupancy is scheduler-owned; the volume list and every input stay read-only)", () => {
  const stableScheduler = {
    state: () => ({
      tick: 0,
      cabinets: [
        { volumeId: "cabinet-B0", gameId: "moon-patrol", occupancy: "patron-autoplay" as Occupancy, runCount: 1, lastSeed: 7, queue: [], rearmTick: 0 },
      ],
    }),
  };
  const rig = createFakeGraph("running");
  const entryKit = makeEntry("control", 1);
  const playerKit = makePlayer();
  const manager = createAudioManager({
    graph: rig.graph,
    registry,
    scheduler: stableScheduler,
    player: playerKit.player,
    entry: entryKit.entry,
  });
  // Park the listener behind pillar-1 so the ticks exercise the raycast,
  // the dwell, the profile apply, and the param actuation - every path
  // where a stray write-back could live. The last write before the
  // snapshot is the RIG's; from here on only the manager runs.
  const spot = behindPillar1();
  playerKit.state.x = spot.x;
  playerKit.state.z = spot.z;
  const before = {
    scheduler: JSON.stringify(stableScheduler.state()),
    player: JSON.stringify(playerKit.state),
    entryState: JSON.stringify(entryKit.entry.state()),
    entryPose: JSON.stringify(entryKit.entry.pose()),
    volumes: JSON.stringify(collisionVolumes),
    recipe: JSON.stringify(registry[0]!.attractSound),
  };
  for (let i = 0; i < DWELL_TICKS + 5; i++) manager.tick();
  assert.equal(JSON.stringify(stableScheduler.state()), before.scheduler, "occupancy is scheduler-owned: the manager reads state() and writes nothing back (AD-23)");
  assert.equal(JSON.stringify(playerKit.state), before.player, "the listener pose is player-owned: the manager never touches it");
  assert.equal(JSON.stringify(entryKit.entry.state()), before.entryState, "the beat state is entry-owned");
  assert.equal(JSON.stringify(entryKit.entry.pose()), before.entryPose, "the beat pose is entry-owned");
  assert.equal(JSON.stringify(collisionVolumes), before.volumes, "the authored volume list is read, never edited (the 2.0 continuity line)");
  assert.equal(JSON.stringify(registry[0]!.attractSound), before.recipe, "the registry recipe is data: the synth renders it, nothing writes into it");
});

test("AD-3: no wall-clock identifiers in core/audio; the audio clock stays confined to the labelled adapter", () => {
  // READDIR, not a hand-list: a hand-picked four files would silently stop
  // covering the scan the moment a fifth lands under core/audio/ (Story
  // 2.2's focus-mix does). The pin enumerates the live source set and
  // pins it non-empty; new sources join the wall-clock scan for free.
  const files = readdirSync(path.join(REPO, "core", "audio"))
    .filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"))
    .sort();
  assert.ok(files.includes("manager.ts") && files.length >= 4, "the enumeration sees the real sources");
  for (const file of files) {
    const src = readFileSync(path.join(REPO, "core", "audio", file), "utf8")
      .replace(/\/\/[^\n]*/g, "")
      .replace(/\/\*[\s\S]*?\*\//g, "");
    for (const banned of [/\bDate\b/, /\bperformance\b/, /Math\.random/]) {
      assert.ok(!banned.test(src), `${file} carries no wall-clock identifier ${String(banned)}`);
    }
    for (const host of [/AudioContext/, /webkitAudioContext/, /OfflineAudioContext/, /\bdocument\b/, /\bwindow\b/]) {
      assert.ok(!host.test(src), `${file} names no host interface/DOM surface ${String(host)}`);
    }
    const clockReads = src.match(/currentTime/g) ?? [];
    if (file === "manager.ts") {
      // Exactly the labelled adapter trio: the RawContext clock field, the
      // param-wrapper stamp, and the listener stamp. Anywhere else (or a
      // fourth read) would widen the clock's reach past the one boundary
      // Design Notes item 8 labels.
      assert.equal(clockReads.length, 3, `${file}: the audio clock appears only at its three labelled adapter sites`);
    } else {
      assert.equal(clockReads.length, 0, `${file}: the law path never sees time`);
    }
  }
});
