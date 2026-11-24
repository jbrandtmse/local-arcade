// Story 1.6 QA (AC4/AC5): the roundBreak half of the scheduler's
// canonical-break law. Every executed break in the rig suites drains a
// natural gameEnded (the sim's gameover pair); the sim's OTHER canonical
// end event — level clear -> roundBreak — reaches the same arbitration
// only through this file. Two pins: at a roundBreak a PRESENT waiting
// Visitor takes over through the SeatHandover interface (claim honoured,
// queue cleared, no extra autoplay run consumed, figure lifts off, the
// taken chair is not reclaimed), and with the claimant ABSENT the busy
// machine re-offers THAT same break on the next derived seed while the
// wait persists — "every break re-offers" must hold on both break kinds.
//
// Tier, labelled honest: the scheduler against its documented injected
// seam (SeatHandover — records at this seam are plain data; the seat's
// real sit/stand law is pinned in seat.test.ts, and the real-rig legs of
// both laws run the gameEnded kind in scheduler.test.ts). Real scheduler,
// real presenter, real placements (busy B0), real player, real wrapper
// instance.
import test from "node:test";
import assert from "node:assert/strict";
import type { EventRecord } from "../loop.ts";
import { createGameInstance } from "../contract/index.ts";
import { TARGET_REACH, createPlayerController, type PlayerController } from "../player.ts";
import { placementGeometry } from "../room/cabinets.ts";
import { ENTRY_SPAWN, collisionVolumes } from "../room/collision-volumes.ts";
import { gameRegistry } from "../../generated/game-registry.ts";
import { createFigurePresenter, type FigurePresenter } from "./presenter.ts";
import {
  ATTRACT_DWELL_TICKS,
  createPatronScheduler,
  derivedSeed,
  type PatronScheduler,
  type SeatHandover,
} from "./scheduler.ts";

const ENTRY = gameRegistry.find((e) => e.id === "moon-patrol")!;
const IMPULSES = ENTRY.impulses!;

function breakRec(tick: number, type: "roundBreak"): EventRecord {
  return { gameId: ENTRY.id, tick, event: { type, payload: {} } };
}

// The seat's one-chair contract, mirrored at the injected seam: a taken
// chair blocks a second takeOver, and seatedAt reports exactly the volume
// handed over (what the real seat does after its sit law ran).
function arbRig() {
  const player = createPlayerController(collisionVolumes, ENTRY_SPAWN);
  const presenter: FigurePresenter = createFigurePresenter();
  const taken: string[] = [];
  let seatedVolume: string | null = null;
  const seat: SeatHandover = {
    takeOver(volumeId) {
      if (seatedVolume !== null) return false;
      seatedVolume = volumeId;
      taken.push(volumeId);
      return true;
    },
    seatedAt(volumeId) {
      return seatedVolume === volumeId;
    },
  };
  const instance = createGameInstance(ENTRY.createSim, ENTRY.seed ?? 0);
  const sched: PatronScheduler = createPatronScheduler({ seat, player, presenter });
  sched.track({
    volumeId: "cabinet-B0",
    gameId: ENTRY.id,
    instance,
    seed: ENTRY.seed!,
    impulses: IMPULSES,
  });
  const b0 = () => sched.state().cabinets.find((c) => c.volumeId === "cabinet-B0")!;
  return { player, presenter, sched, instance, taken, b0 };
}

function distToFront(player: PlayerController): number {
  const f = placementGeometry("B0").front;
  const s = player.state;
  return Math.sqrt((s.x - f.x) ** 2 + (s.z - f.z) ** 2);
}

test("roundBreak handover: a PRESENT waiting Visitor takes over at a level-clear break through the SeatHandover seam (queue cleared, no extra run consumed, figure lifts off, the taken chair is not reclaimed)", () => {
  const r = arbRig();
  r.sched.dispatch([], ATTRACT_DWELL_TICKS); // the authored dwell closes: autoplay run 1 launched
  assert.equal(r.b0().occupancy, "patron-autoplay", "the Patron owns the machine before the break");
  assert.equal(r.b0().runCount, 1);

  r.sched.toggleWait("cabinet-B0");
  assert.equal(r.b0().queue.length, 1, "the Visitor's claim is in the queue");

  const g = placementGeometry("B0");
  r.player.teleport({ x: g.front.x + g.facing.x * 0.5, z: g.front.z + g.facing.z * 0.5, yaw: 0, pitch: 0 });
  assert.ok(distToFront(r.player) <= TARGET_REACH, "the claimant stands inside the presence radius");

  r.sched.dispatch([breakRec(ATTRACT_DWELL_TICKS + 1, "roundBreak")], ATTRACT_DWELL_TICKS + 1);
  assert.deepEqual(r.taken, ["cabinet-B0"], "the roundBreak break arbitrates: the present claim is honoured through the seat seam");
  assert.equal(r.b0().occupancy, "visitor-seated", "occupancy flips exactly as on a gameEnded break");
  assert.deepEqual(r.b0().queue, [], "claims are cleaned up on handover");
  assert.equal(r.b0().runCount, 1, "the handover consumed no extra autoplay run");
  assert.equal(r.sched.figureActive("cabinet-B0"), false, "the figure lifts off for the Visitor at a clear break too");

  r.sched.dispatch([], ATTRACT_DWELL_TICKS + 2);
  assert.equal(r.b0().occupancy, "visitor-seated", "the Patron never reclaims the taken chair (seatedAt gates the launch law)");
});

test("roundBreak re-offer: with the claimant absent the machine restarts autoplay at THAT same level-clear break on the next derived seed, and the wait persists across the break", () => {
  const r = arbRig(); // the player stays at ENTRY_SPAWN
  r.sched.dispatch([], ATTRACT_DWELL_TICKS);
  const seed0 = r.b0().lastSeed;
  assert.equal(seed0, derivedSeed(ENTRY.seed!, 0));

  r.sched.toggleWait("cabinet-B0");
  assert.ok(distToFront(r.player) > TARGET_REACH, "the claimant is outside the presence radius");

  r.sched.dispatch([breakRec(ATTRACT_DWELL_TICKS + 1, "roundBreak")], ATTRACT_DWELL_TICKS + 1);
  assert.deepEqual(r.taken, [], "no handover while absent");
  assert.equal(r.b0().occupancy, "patron-autoplay", "busy never withholds: the clear break re-offers as autoplay");
  assert.equal(r.b0().runCount, 2, "the same-break restart ran");
  assert.equal(r.b0().lastSeed, derivedSeed(ENTRY.seed!, 1), "run N+1 takes the next derived seed");
  assert.notEqual(r.b0().lastSeed, seed0, "and it differs from run N");
  assert.equal(r.b0().queue.length, 1, "the absent claim persists (until un-waited or honored)");
  assert.equal(r.sched.figureActive("cabinet-B0"), true, "the Patron (run 2) stands again");
});
