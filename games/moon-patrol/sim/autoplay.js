// Moon Patrol autoplay AI — Story 1.6 (AD-23: the Patron driving a busy
// cabinet). Authored (provenance-exempt like sim/index.js). Given the LIVE
// world it synthesizes step()'s boolean inputs {left, right, jump, fire};
// sim/index.js calls it once per vendored substep in mode 'autoplay'.
//
// Determinism law: pure comparisons over world state — no rng read, no wall
// clock, no Math transcendental/random (ci/lint-bans.mjs scans this file
// with zero exemptions; jumpReach() is a rational expression in world.js).
//
// Policy (the 1.5 landing-safety planner re-expressed per substep): never
// reverse (left only brakes), hop when an obstacle enters the launch window
// and the landing zone at current speed is clear, brake when the zone is
// not clear, and fire — with one exception: while a lander is alive, firing
// waits for the narrow alignment window (its touchdown ends the run; the
// pause also clears the missile pipeline so the volley that lands is the
// aligned one).

import { CFG } from './config.js';
import { jumpReach } from './world.js';

const B = CFG.buggy;

// Is the jump landing zone at `speed` free of holes, hazards, and hovers?
// (Same overlap law the 1.5 pinned planner test proves out; tolerance 8px
// on crater rims, mine hitbox inset like the collision law.)
function landingSafe(w, speed) {
  const la = w.buggy.x + jumpReach(speed);
  const lb = la + B.w;
  for (const c of w.craters) {
    const ov = Math.min(lb, c.x2) - Math.max(la, c.x1);
    if (ov > 8) return false;
  }
  for (const o of w.ground) {
    if (o.type === 'plant' || o.type === 'crater') continue;
    if (o.type === 'minefield') {
      for (const m of o.mines) if (lb > m.x + 3 && la < m.x + m.w - 3) return false;
      continue;
    }
    if (lb > o.x && la < o.x + o.w) return false;
  }
  for (const e of w.enemies) {
    if (e.kind === 'hover' && lb > e.x - e.w / 2 && la < e.x + e.w / 2) return false;
  }
  return true;
}

export function autoplayInput(w) {
  const front = w.buggy.x + B.w;
  const center = w.buggy.x + B.w / 2;
  const r = jumpReach(w.buggy.speed);
  let jump = false;
  let brake = false;

  // air phase: brake unless the landing zone at current speed is clear
  if (!w.buggy.onGround) {
    return { left: !landingSafe(w, w.buggy.speed), right: false, jump: false, fire: firing(w, center) };
  }

  const hover = w.enemies.find((e) => e.kind === 'hover');
  if (hover) {
    if (hover.x > front && hover.x - front < r * 0.45) jump = true;
    else if (hover.x < front && hover.x > w.buggy.x - 40) jump = true;
  }
  for (const bo of w.bombs) {
    if (bo.x > front && bo.x - front < r * 0.55) jump = true;
  }
  for (const s of w.shells) {
    if (s.x > front && s.x - front < 90) jump = true;
  }
  for (const c of w.craters) {
    if (c.x1 > front && c.x1 - front < r * 0.45) jump = true;
  }
  for (const o of w.ground) {
    if (o.type === 'minefield') {
      for (const m of o.mines) {
        if (m.x > front && m.x - front < r * 0.42) jump = true;
      }
      continue;
    }
    if (o.type === 'plant' || o.type === 'crater') continue;
    if (o.x + o.w >= front && o.x - front < r * 0.42) jump = true;
  }

  if (jump && !landingSafe(w, w.buggy.speed)) {
    // launch zone unsafe: hold the hop unless contact is imminent anyway
    const imminent = w.craters.some((c) => c.x1 <= front + 12 && c.x2 > front) ||
      w.ground.some((o) => o.type !== 'plant' && o.type !== 'crater' && o.type !== 'minefield' &&
        o.x + o.w > front && o.x <= front + 12);
    if (!imminent) jump = false;
    brake = true;
  }

  return { left: brake, right: !brake, jump, fire: firing(w, center) };
}

// firing law: hold fire except while a lander lives — then only inside the
// narrow alignment window (the pipeline-clear trick the 1.5 clear pin uses).
function firing(w, center) {
  const lander = w.enemies.find((e) => e.kind === 'lander');
  if (lander) return Math.abs(lander.x - center) <= 12;
  return true;
}
