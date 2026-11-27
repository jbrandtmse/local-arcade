// Story 2.1 (AD-7/AD-15): the Core Audio Manager — the ONE supervisor-
// wrapped system that owns the WebAudio graph (the loop runs it after
// patrons/seat). Games supply attract-loop RECIPE data through the
// registry; they never build a node — this module is the only code in the
// repo that names WebAudio node factories (the L0 lint bans every
// AudioContext reference in both plugin halves).
//
// Law path (tick): listener pose -> occlusionIds (occlusion.ts) ->
// mixStep (mix.ts) -> setTarget on each chain's gain + lowpass. The law
// path sees NO time at all: the injected AudioGraph seam hands out param
// handles whose setTarget(value) is stamped at the audio clock inside the
// labelled adapter below (AD-3 exemption, Design Notes item 8 — an audio
// clock, not a wall clock; no Date/performance anywhere in core/audio/).
//
// Autoplay law: the injected context may report "suspended" (browsers
// block un-gestured audio). While suspended the room, the beat, and the
// visuals run untouched, nothing is audible, and NO param is actuated;
// each wired gesture calls requestResume() — one attempt per gesture,
// rejections swallowed, retried by the next gesture, never a timer.

import { EYE_HEIGHT, type PlayerController } from "../player.ts";
import type { EntrySequence } from "../entry.ts";
import type { Occupancy, PatronScheduler } from "../patrons/scheduler.ts";
import { collisionVolumes, type CollisionVolume } from "../room/collision-volumes.ts";
import { cabinetPlacements, placementGeometry, type CabinetPlacement } from "../room/cabinets.ts";
import type { GameRegistryEntry } from "../contract/wrapper.ts";
import { occlusionIds, type RayPoint } from "./occlusion.ts";
import { INITIAL_DWELL, OPEN_PROFILE, mixStep, type DwellState, type MixTarget } from "./mix.ts";
import { renderAttractLoop } from "./synth.ts";

// --- The injected graph seam (scene.ts's structural-injection idiom) -------
// These interfaces name NO host type: the fake rig injects the same shape
// the browser adapter below produces from a real AudioContext. The manager
// law path never reads a clock through this seam.

export interface AudioParamHandle {
  /** Stamp-and-ramp to value; WHEN is the adapter's clock concern. */
  setTarget(value: number): void;
}
export interface AudioNodeHandle {
  connect(target: AudioNodeHandle): void;
}
export interface AudioBufferHandle {
  write(samples: Float32Array): void;
}
export interface AudioSourceHandle extends AudioNodeHandle {
  start(): void;
}
export interface AudioLowpassHandle extends AudioNodeHandle {
  frequency: AudioParamHandle;
}
export interface AudioGainHandle extends AudioNodeHandle {
  gain: AudioParamHandle;
}
export interface AudioPannerHandle extends AudioNodeHandle {
  setPosition(x: number, y: number, z: number): void;
}
export interface PannerSetup {
  panningModel: "HRTF" | "equalpower";
  distanceModel: "linear" | "inverse" | "exponential";
  refDistance: number;
  maxDistance: number;
  rolloffFactor: number;
}
// Mirrors AudioContextState ("interrupted" is the iOS interruption state:
// blocked like suspended, recoverable by a gesture like suspended).
export type GraphState = "suspended" | "running" | "closed" | "interrupted";
export interface AudioGraph {
  state(): GraphState;
  resume(): Promise<void>;
  createBuffer(sampleCount: number, sampleRate: number): AudioBufferHandle;
  createLoopSource(buffer: AudioBufferHandle): AudioSourceHandle;
  createLowpass(): AudioLowpassHandle;
  createGain(): AudioGainHandle;
  createPanner(setup: PannerSetup): AudioPannerHandle;
  /** Move the ONE listener (the visitor's ear) to this tick's listener
   * pose: HRTF and the authored distance model attenuate against THIS
   * point, so the listener carries the positional change (the sources
   * stay fixed at their speakers). */
  setListenerPosition(x: number, y: number, z: number): void;
  readonly destination: AudioNodeHandle;
}

/** Speaker mounting height, metres above the floor — placeholder pending
 * 3.7's authored audio pass: every Cabinet's attract source sits here. */
export const SPEAKER_HEIGHT_M = 1.5;

/** Authored panner law (AC "HRTF + authored distance model") —
 * placeholder numbers pending 3.7; the fake rig pins what the manager
 * hands every panner. */
export const PANNER_SETUP: PannerSetup = {
  panningModel: "HRTF",
  distanceModel: "inverse",
  refDistance: 1.5,
  maxDistance: 40,
  rolloffFactor: 1,
};

/** setTargetAtTime time-constant, seconds (placeholder): param moves are
 * smoothed so occupancy re-arms and occlusion flips never step-click. */
export const SMOOTHING_S = 0.15;

// --- The browser adapter: the ONLY repo code touching node factories ------
// Raw structural shape (no host interface named); a real AudioContext
// satisfies it as-is, and core/main.ts injects `new AudioContext()` here
// at the single construction site.

export interface RawParam {
  setTargetAtTime(target: number, startTime: number, timeConstant: number): unknown;
  value: number;
}
export interface RawNode {
  connect(destination: RawNode): unknown;
}
export interface RawAudioBuffer {
  getChannelData(channel: number): Float32Array;
}
export interface RawSource extends RawNode {
  buffer: RawAudioBuffer | null;
  loop: boolean;
  start(): void;
}
export interface RawFilter extends RawNode {
  frequency: RawParam;
  type: string;
}
export interface RawGain extends RawNode {
  gain: RawParam;
}
export interface RawPanner extends RawNode {
  positionX: RawParam;
  positionY: RawParam;
  positionZ: RawParam;
  panningModel: string;
  distanceModel: string;
  refDistance: number;
  maxDistance: number;
  rolloffFactor: number;
}
export interface RawParamTriple {
  positionX: RawParam;
  positionY: RawParam;
  positionZ: RawParam;
}
export interface RawContext {
  state: GraphState;
  // The audio clock (AD-3's sanctioned boundary, Design Notes item 8):
  // the sites inside this adapter are the only place WebAudio time
  // enters the graph — every param write is stamped THERE, so the law
  // path never sees time.
  currentTime: number;
  // The one real listener: the ear the panners attenuate against.
  listener: RawParamTriple;
  resume(): Promise<void>;
  destination: RawNode;
  createBuffer(numberOfChannels: number, length: number, sampleRate: number): RawAudioBuffer;
  createBufferSource(): RawSource;
  createBiquadFilter(): RawFilter;
  createGain(): RawGain;
  createPanner(): RawPanner;
}

interface WrappedNode {
  rawNode: RawNode;
}
interface WrappedBuffer {
  rawBuffer: RawAudioBuffer;
}

function rawNodeOf(handle: AudioNodeHandle): RawNode {
  const w = handle as Partial<WrappedNode>;
  if (w.rawNode === undefined) throw new TypeError("audio graph handle did not come from this adapter");
  return w.rawNode;
}

/** Wrap a real (or shadowed) AudioContext into the injected seam. */
export function createWebAudioGraph(ctx: RawContext): AudioGraph {
  const wrapParam = (p: RawParam): AudioParamHandle => ({
    // An audio-clock stamp (labelled above at the RawContext clock field):
    // setTargetAtTime needs a start time; the seam deliberately hides it
    // from the law path. The listener stamp below shares the boundary —
    // the adapter is the story's one labelled clock site.
    setTarget: (value: number) => {
      p.setTargetAtTime(value, ctx.currentTime, SMOOTHING_S);
    },
  });
  const nodeHandle = (rawNode: RawNode): AudioNodeHandle & WrappedNode => ({
    rawNode,
    connect: (target: AudioNodeHandle) => {
      rawNode.connect(rawNodeOf(target));
    },
  });
  return {
    state: () => ctx.state,
    resume: () => ctx.resume(),
    createBuffer: (sampleCount: number, sampleRate: number) => {
      const buffer = ctx.createBuffer(1, sampleCount, sampleRate);
      return {
        rawBuffer: buffer,
        write: (samples: Float32Array) => {
          buffer.getChannelData(0).set(samples);
        },
      } satisfies AudioBufferHandle & WrappedBuffer;
    },
    createLoopSource: (buffer: AudioBufferHandle) => {
      const source = ctx.createBufferSource();
      source.buffer = (buffer as Partial<WrappedBuffer>).rawBuffer ?? null;
      source.loop = true; // the attract source is a forever-loop, not a one-shot
      const handle = nodeHandle(source);
      return Object.assign(handle, { start: () => source.start() }) as AudioSourceHandle & WrappedNode;
    },
    createLowpass: () => {
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      const handle = nodeHandle(filter);
      return Object.assign(handle, { frequency: wrapParam(filter.frequency) }) as AudioLowpassHandle & WrappedNode;
    },
    createGain: () => {
      const gainNode = ctx.createGain();
      const handle = nodeHandle(gainNode);
      return Object.assign(handle, { gain: wrapParam(gainNode.gain) }) as AudioGainHandle & WrappedNode;
    },
    createPanner: (setup: PannerSetup) => {
      const panner = ctx.createPanner();
      panner.panningModel = setup.panningModel;
      panner.distanceModel = setup.distanceModel;
      panner.refDistance = setup.refDistance;
      panner.maxDistance = setup.maxDistance;
      panner.rolloffFactor = setup.rolloffFactor;
      const handle = nodeHandle(panner);
      return Object.assign(handle, {
        setPosition: (x: number, y: number, z: number) => {
          // Panner positions are set ONCE at chain build; the listener
          // moves (the context listener follows the ear), not the sources.
          panner.positionX.value = x;
          panner.positionY.value = y;
          panner.positionZ.value = z;
        },
      }) as AudioPannerHandle & WrappedNode;
    },
    setListenerPosition: (x: number, y: number, z: number) => {
      // The same labelled audio-clock boundary (one read, three writes):
      // the ear moves, the speakers stay put.
      const now = ctx.currentTime;
      ctx.listener.positionX.setTargetAtTime(x, now, SMOOTHING_S);
      ctx.listener.positionY.setTargetAtTime(y, now, SMOOTHING_S);
      ctx.listener.positionZ.setTargetAtTime(z, now, SMOOTHING_S);
    },
    destination: nodeHandle(ctx.destination),
  };
}

/** The blocked-audio fallback graph: an insecure origin (plain http)
 * has no AudioContext global at all, and a real construction can throw
 * (hardware, policy). Either way the room must survive with the sound
 * simply absent (AD-15 posture, the autoplay matrix row's law) — every
 * handle is inert and the state never leaves "suspended", so the law
 * path actuates nothing and no gesture can resurrect this graph. */
export function createSilentGraph(): AudioGraph {
  const noopParam: AudioParamHandle = { setTarget: () => {} };
  const noopNode: AudioNodeHandle = { connect: () => {} };
  return {
    state: () => "suspended",
    resume: () => Promise.resolve(),
    createBuffer: () => ({ write: () => {} }),
    createLoopSource: () => ({ connect: () => {}, start: () => {} }),
    createLowpass: () => ({ connect: () => {}, frequency: noopParam }),
    createGain: () => ({ connect: () => {}, gain: noopParam }),
    createPanner: () => ({ connect: () => {}, setPosition: () => {} }),
    setListenerPosition: () => {},
    destination: noopNode,
  };
}

// --- The manager -----------------------------------------------------------

export interface AudioManagerOptions {
  graph: AudioGraph;
  registry: readonly GameRegistryEntry[];
  /** The occupancy source: the scheduler's plain-data cabinet view. */
  scheduler: Pick<PatronScheduler, "state">;
  player: Pick<PlayerController, "state">;
  /** Pre-control the entry beat owns the ear; from control on, the
   * player does (same handover rule the presenter follows). */
  entry: Pick<EntrySequence, "pose" | "state">;
  placements?: readonly CabinetPlacement[];
  volumes?: readonly CollisionVolume[];
}

interface Chain {
  volumeId: string;
  gameId: string;
  hasRecipe: boolean;
  /** The panner-fixed source point (authored speaker position). */
  speaker: RayPoint;
  gainNode: AudioGainHandle;
  lowpassNode: AudioLowpassHandle;
  dwell: DwellState;
  target: MixTarget;
  lastOccluderIds: string[];
  lastOccupancy: Occupancy;
}

export interface ChainDebug {
  volumeId: string;
  gameId: string;
  hasRecipe: boolean;
  occupancy: Occupancy;
  occluderIds: string[];
  appliedId: string;
  gain: number;
  lowpassHz: number;
}

export interface AudioManagerDebug {
  graphState: GraphState;
  chains: ChainDebug[];
}

export interface AudioManager {
  /** The loop system body (registered after patrons/seat, AD-15). */
  tick(): void;
  /** One resume attempt per wired gesture while suspended. */
  requestResume(): void;
  /** Plain-data debug view (the arcadeDebug.audio record). */
  state(): AudioManagerDebug;
}

export function createAudioManager(opts: AudioManagerOptions): AudioManager {
  const { graph } = opts;
  const placements = opts.placements ?? cabinetPlacements;
  const volumes = opts.volumes ?? collisionVolumes;
  const chains: Chain[] = [];

  for (const placement of placements) {
    const game = placement.gameId === undefined ? undefined : opts.registry.find((e) => e.id === placement.gameId);
    const geom = placementGeometry(placement.slotId);
    const speaker: RayPoint = { x: geom.center.x, y: SPEAKER_HEIGHT_M, z: geom.center.z };

    // One owned chain per placed Cabinet (AD-7): looping source -> lowpass
    // -> gain -> panner -> destination. A cabinet with no recipe keeps its
    // chain (the room services stay uniform) but starts no source — that
    // Cabinet's attract is simply silent.
    const lowpassNode = graph.createLowpass();
    const gainNode = graph.createGain();
    const panner = graph.createPanner(PANNER_SETUP);
    panner.setPosition(speaker.x, speaker.y, speaker.z);

    let hasRecipe = false;
    if (game?.attractSound !== undefined) {
      hasRecipe = true;
      const samples = renderAttractLoop(game.attractSound);
      const buffer = graph.createBuffer(samples.length, game.attractSound.sampleRate);
      buffer.write(samples);
      const source = graph.createLoopSource(buffer);
      // start() while suspended is legal: context time is frozen, nothing
      // is audible until a gesture runs the context — the loop is the
      // forever-law, gain (not start/stop) carries every state change.
      source.start();
      source.connect(lowpassNode);
    }
    lowpassNode.connect(gainNode);
    gainNode.connect(panner);
    panner.connect(graph.destination);

    gainNode.gain.setTarget(0);
    lowpassNode.frequency.setTarget(OPEN_PROFILE.lowpassHz);

    chains.push({
      volumeId: placement.volumeId,
      gameId: game?.id ?? "",
      hasRecipe,
      speaker,
      gainNode,
      lowpassNode,
      dwell: INITIAL_DWELL,
      target: { gain: 0, lowpassHz: OPEN_PROFILE.lowpassHz },
      lastOccluderIds: [],
      lastOccupancy: "attract",
    });
  }

  /** Whose ear the ray starts from, this tick. */
  function ear(): RayPoint {
    const entryState = opts.entry.state();
    if (entryState.phase === "control" || entryState.phase === "workbench") {
      const p = opts.player.state;
      return { x: p.x, y: EYE_HEIGHT, z: p.z };
    }
    const pose = opts.entry.pose();
    return { x: pose.x, y: pose.y, z: pose.z };
  }

  function tick(): void {
    const entryState = opts.entry.state();
    const listener = ear();
    const occupancies = new Map<string, Occupancy>(
      opts.scheduler.state().cabinets.map((c) => [c.volumeId, c.occupancy]),
    );
    const silent = graph.state() !== "running";
    if (!silent) graph.setListenerPosition(listener.x, listener.y, listener.z);
    for (const chain of chains) {
      const ids = occlusionIds(listener, chain.speaker, volumes);
      const occupancy = occupancies.get(chain.volumeId) ?? "attract";
      const step = mixStep({ entry: entryState, occupancy, sampleIds: ids, dwell: chain.dwell, volumes });
      chain.dwell = step.dwell;
      chain.target = step.target;
      chain.lastOccluderIds = ids;
      chain.lastOccupancy = occupancy;
      if (silent) continue;
      chain.gainNode.gain.setTarget(step.target.gain);
      chain.lowpassNode.frequency.setTarget(step.target.lowpassHz);
    }
  }

  function requestResume(): void {
    if (graph.state() === "running" || graph.state() === "closed") return;
    // One attempt per gesture; a still-blocked resume rejects (or stays
    // suspended) — swallowed here, retried by the NEXT wired gesture. No
    // timer, no retry storm (the gesture glue in core/main.ts is the
    // only driver).
    void Promise.resolve(graph.resume()).catch(() => {});
  }

  function state(): AudioManagerDebug {
    return {
      graphState: graph.state(),
      chains: chains.map((c) => ({
        volumeId: c.volumeId,
        gameId: c.gameId,
        hasRecipe: c.hasRecipe,
        occupancy: c.lastOccupancy,
        occluderIds: c.lastOccluderIds,
        appliedId: c.dwell.appliedId,
        gain: c.target.gain,
        lowpassHz: c.target.lowpassHz,
      })),
    };
  }

  return { tick, requestResume, state };
}
