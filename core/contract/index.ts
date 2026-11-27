// core/contract public surface — the harness shared by the kernel, ci/, and
// tools/ (AD-2). Import from here; never reach into individual game modules.

export { createRng, type Rng } from "./rng.ts";
export * as math from "./math.ts";
export { createGate, gateDeep, toPlain, type TickGate } from "./freeze.ts";
export { canonicalSerialize, fnv1a64, stateHashOf } from "./hash.ts";
export {
  createGameInstance,
  type AttractSound,
  type AttractSoundNote,
  type GameCanvasLike,
  type GameControls,
  type GameInstance,
  type GameRegistryEntry,
  type InstanceMode,
  type PresentationFactory,
  type PresentationHooks,
  type SimContext,
  type SimEvent,
  type SimFactory,
  type SimHooks,
  type TickInput,
} from "./wrapper.ts";
