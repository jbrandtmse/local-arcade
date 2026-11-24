// Vendored from C:/git/moonpatrol HEAD 49c351910af742a86cf97987bc474bb4d7d8da40
// (Story 1.5; owner's own single-author original work). SEAM EDITS ONLY:
//  - createWorld requires opts.math (the injected core/contract math module;
//    AD-4): the two engine-variable Math.sin calls read w.math.sin instead.
//  - Math.hypot -> Math.sqrt(x*x + y*y) (AD-4's sibling rule).
//  - Particles leave the sim (the vendored burst's only Math.random use):
//    burst() pushes a plain {burst,x,y,n,color} fx record; the presentation
//    owns visual particles (Design Notes 6). No particle state here, so the
//    snapshot stays plain without nondeterministic visual noise.
//  - up.hits Set-of-object-refs -> numeric oid array (oid stamped at spawn),
//    so the live shape AND the snapshot are plain (Design Notes 7).
//  - The world rng cursor is exposed via rng.js's added getState/setState.
//  - DW-25 (Story 1.6): respawn()'s ground pad filter spans minefield/crater via x1/x2 (the same fix lands upstream in the working tree; the sha line above still names the vendor base).
// dt-agnostic step() is otherwise unchanged.

// Pure simulation: no DOM / Canvas / Audio imports (unit-testable in Node).
import { CFG, scoreFor } from './config.js';
import { makeRng } from './rng.js';
import { buildCourse } from './course.js';

const GY = CFG.view.GROUND_Y;
const B = CFG.buggy;

export function jumpReach(speed = B.slow) {
  // horizontal distance the buggy covers during one jump at a given speed
  return (2 * B.jumpV / B.grav) * speed;
}

// Seam helper: monotonically increasing object id, stamped onto every
// spawnable that a bullet can hit (up.hits identity without object refs).
function nextOid(w) { return ++w._oidSeq; }

export function createWorld(opts = {}) {
  if (opts.math == null) {
    throw new Error('createWorld: opts.math is required (the kernel injects core/contract math; AD-4)');
  }
  const courseIndex = opts.courseIndex ?? 0;
  const seed = opts.seed ?? 1;
  const course = buildCourse(courseIndex, seed);
  return {
    mode: 'running', // running | dying | gameover | cleared
    t: 0,
    courseIndex, seed, course,
    math: opts.math, // injected harness, NOT game state: excluded from snapshot()
    rng: makeRng((seed ^ 0x5bf03635) + courseIndex * 40503),
    score: opts.score ?? 0,
    lives: opts.lives ?? CFG.startLives,
    fuel: CFG.fuel.max,
    extraLifeIdx: opts.extraLifeIdx ?? 0,
    stage: 0,
    letter: -1,
    nextGate: 0,
    nextEvent: 0,
    segStartT: 0,
    bestTimes: [],
    buggy: {
      x: 40, y: GY, vy: 0, onGround: true,
      speed: B.slow, target: B.slow,
      invuln: 1.0, fireCd: 0,
      fwd: null, up: null,
    },
    craters: course.ground.filter(g => g.type === 'crater').map(c => ({ ...c, scored: false })),
    ground: course.ground.filter(g => g.type !== 'crater').map(g => structuredClone(g)),
    enemies: [], // {kind:'ufo'|'lander'|'hover', ...}
    bombs: [], shells: [],
    fx: [],
    warnings: { saucer: false, mine: false, behind: false },
    banner: null,
    deathReason: null,
    clear: null,
    done: false,
    lowFuelTimer: 0,
    _hoverSeq: 0,
    _oidSeq: 0,
  };
}

// ---------- helpers ----------
const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const buggyBox = (w) => ({ x: w.buggy.x, y: w.buggy.y - B.h, w: B.w, h: B.h });
const groundBox = (o) => ({ x: o.x, y: GY - o.h, w: o.w, h: o.h });

function fx(w, name) { w.fx.push(name); }
function addScore(w, pts) { if (pts) w.score += pts; }
function burst(w, x, y, n, color) {
  // Seam edit: the visual particles (the vendored sim's only Math.random use)
  // are gone — a plain burst request rides the fx list and index.js turns it
  // into a game-local 'burst' event; the presentation draws the particles.
  w.fx.push({ burst: true, x, y, n, color });
}
function banner(w, text) { w.banner = { text, ttl: 3 }; }

function kill(w, reason) {
  if (w.mode !== 'running' || w.buggy.invuln > 0) return;
  w.lives -= 1;
  w.mode = 'dying';
  w.deathT = B.respawnDelay;
  w.deathReason = reason;
  fx(w, 'explode');
  burst(w, w.buggy.x + B.w / 2, w.buggy.y - B.h / 2, 26, '#ffb14e');
}

function respawn(w) {
  const b = w.buggy;
  // clear a landing pad around the respawn point (no score for cleared items)
  const padL = b.x - 80, padR = b.x + 240;
  // span predicate (DW-25): minefields and craters carry x1/x2, not x/w —
  // the old o.x + o.w reads NaN for them, and NaN never filters, so a
  // minefield could sit on the respawn pad. Same idiom as createCrater.
  w.ground = w.ground.filter(o => {
    const s = o.type === 'crater' || o.type === 'minefield' ? o.x1 : o.x;
    const e = o.type === 'crater' || o.type === 'minefield' ? o.x2 : o.x + o.w;
    return !(e > padL && s < padR);
  });
  w.craters = w.craters.filter(c => !(c.x2 > padL && c.x1 < padR));
  b.y = GY; b.vy = 0; b.onGround = true;
  b.speed = B.slow; b.target = B.slow;
  b.invuln = B.invuln;
  w.fuel = CFG.fuel.max;
  w.mode = 'running';
}

// ---------- spawning ----------
function spawnUfo(w, ufoType, x, y = null, groupId = null) {
  const u = w.rng;
  const e = {
    kind: 'ufo', type: ufoType,
    oid: nextOid(w),
    x, y: y ?? u.range(CFG.ufo.hoverYMin, CFG.ufo.hoverYMax),
    w: CFG.ufo.w, h: CFG.ufo.h,
    vx: -u.range(CFG.ufo.speedMin, CFG.ufo.speedMax),
    baseY: 0, phase: u.range(0, 6.28),
    bombT: u.range(...CFG.ufo.bombCd),
    diveT: u.range(...CFG.ufo.diveCd), diving: false, diveT2: 0,
    hp: 1, group: groupId, spin: 0,
  };
  e.baseY = e.y;
  w.enemies.push(e);
}

function activateEvent(w, ev) {
  const b = w.buggy;
  switch (ev.type) {
    case 'ufo': spawnUfo(w, ev.ufoType, b.x + w.rng.range(380, 540)); break;
    case 'formation': {
      const gid = ++w._hoverSeq;
      const y = w.rng.range(70, 95);
      const x0 = b.x + 460;
      for (let i = 0; i < ev.n; i++) spawnUfo(w, 'bomber', x0 + i * 72, y - (i % 2) * 10, gid);
      const grp = w.enemies.filter(e => e.group === gid);
      grp.forEach(g => { g.grpRef = { id: gid, n: ev.n, alive: ev.n }; });
      grp.forEach(g => { g.grpRef = grp[0].grpRef; });
      break;
    }
    case 'lander': {
      if (w.enemies.some(e => e.kind === 'lander')) break; // only one lander threat at a time
      w.enemies.push({
        kind: 'lander', oid: nextOid(w),
        x: b.x + CFG.lander.spawnAhead + w.rng.range(-60, 60),
        y: CFG.view.HUD_TOP - CFG.lander.h, w: CFG.lander.w, h: CFG.lander.h,
        hp: CFG.lander.hp, alarmT: 0,
      });
      fx(w, 'alarm');
      break;
    }
    case 'hover': {
      w.enemies.push({
        kind: 'hover', oid: nextOid(w),
        x: b.x - 240, y: GY, w: CFG.hover.w, h: CFG.hover.h,
        state: 'stalk', timer: w.rng.range(...CFG.hover.wait), vx: 0, hp: CFG.hover.hp,
      });
      fx(w, 'warn');
      break;
    }
  }
}

// ---------- damage / kills ----------
function removeGround(w, o) {
  const i = w.ground.indexOf(o);
  if (i >= 0) w.ground.splice(i, 1);
}

function hitGroundObj(w, o) {
  o.hp -= 1;
  const cx = o.x + o.w / 2, cy = GY - o.h / 2;
  if (o.hp > 0) {
    if (o.type === 'rock' && o.size === 2) {
      // double rock becomes half-destroyed
      o.size = 1; o.w = CFG.rock.sizes[1].w; o.h = CFG.rock.sizes[1].h; o.half = true;
      o.x = cx - o.w / 2;
      addScore(w, scoreFor(w.courseIndex, 'rockBigHit'));
      fx(w, 'hit');
      burst(w, cx, cy, 6, '#b7b2a6');
    } else {
      fx(w, 'hit');
    }
    return;
  }
  switch (o.type) {
    case 'rock':
      if (o.half) addScore(w, scoreFor(w.courseIndex, 'rockBigKill'));
      else addScore(w, scoreFor(w.courseIndex, o.size === 1 ? 'rockMedium' : 'rockSmall'));
      break;
    case 'boulder': addScore(w, scoreFor(w.courseIndex, 'boulder')); break;
    case 'tank': addScore(w, scoreFor(w.courseIndex, 'tank')); break;
    case 'plant':
      addScore(w, scoreFor(w.courseIndex, 'plant'));
      addScore(w, o.bonus ?? 0);
      break;
  }
  fx(w, 'explode');
  burst(w, cx, cy, 12, '#c9c2b4');
  removeGround(w, o);
}

function killEnemy(w, e) {
  const i = w.enemies.indexOf(e);
  if (i >= 0) w.enemies.splice(i, 1);
  burst(w, e.x, e.y, 14, '#7ee0a3');
  fx(w, 'explode');
  if (e.kind === 'ufo') {
    addScore(w, scoreFor(w.courseIndex, e.type === 'crater' ? 'craterUfo' : 'ufo'));
    if (e.grpRef) {
      e.grpRef.alive -= 1;
      if (e.grpRef.alive === 0) {
        addScore(w, CFG.score.formation[e.grpRef.n - 3]);
        banner(w, `FORMATION +${CFG.score.formation[e.grpRef.n - 3]}`);
      }
    }
  } else if (e.kind === 'lander') {
    addScore(w, scoreFor(w.courseIndex, 'lander'));
  } else if (e.kind === 'hover') {
    addScore(w, w.rng.pick(CFG.score.rearCar));
    banner(w, 'REAR CAR DESTROYED');
  }
}

function createCrater(w, cx) {
  const hw = CFG.craterMakerBomb.halfWidth;
  const c = { type: 'crater', x1: cx - hw, x2: cx + hw, width: hw * 2, large: true, scored: false };
  // refuse if too close to other ground hazards
  for (const g of [...w.ground, ...w.craters]) {
    const a = g.type === 'crater' || g.type === 'minefield' ? g.x1 : g.x;
    const b = g.type === 'crater' || g.type === 'minefield' ? g.x2 : g.x + g.w;
    if (c.x1 - 150 < b && a < c.x2 + 150) return;
  }
  w.craters.push(c);
  w.craters.sort((p, q) => p.x1 - q.x1);
  fx(w, 'explode');
  burst(w, cx, GY, 10, '#d8d2c4');
}

// ---------- main step ----------
export function step(w, dt, input = {}) {
  if (w.mode === 'gameover') return;
  if (w.mode === 'cleared') {
    w.clear.ttl -= dt;
    if (w.clear.ttl <= 0) w.done = true;
    return;
  }
  if (w.mode === 'dying') {
    w.deathT = (w.deathT ?? 0) - dt;
    if (w.deathT <= 0) {
      if (w.lives <= 0) { w.mode = 'gameover'; fx(w, 'gameover'); }
      else respawn(w);
    }
    return;
  }

  w.t += dt;
  const b = w.buggy;

  // ----- buggy controls -----
  b.target = input.right ? CFG.buggy.fast : input.left ? CFG.buggy.slow : b.target;
  b.speed = Math.max(CFG.buggy.slow, b.speed + Math.sign(b.target - b.speed) *
    Math.min(Math.abs(b.target - b.speed), B.accel * dt));
  b.x += b.speed * dt;
  if (b.invuln > 0) b.invuln -= dt;
  b.fireCd -= dt;

  if (input.jump && b.onGround) {
    b.vy = -B.jumpV; b.onGround = false; fx(w, 'jump');
  }
  if (!b.onGround) {
    b.vy += B.grav * dt;
    b.y += b.vy * dt;
    if (b.y >= GY) { b.y = GY; b.vy = 0; b.onGround = true; fx(w, 'land'); }
  }

  // ----- fuel -----
  const sp = (b.speed - B.slow) / (B.fast - B.slow);
  w.fuel -= (CFG.fuel.drainSlow + (CFG.fuel.drainFast - CFG.fuel.drainSlow) * sp) * dt;
  w.lowFuelTimer -= dt;
  if (w.fuel <= 0) { w.fuel = 0; kill(w, 'fuel'); }
  else if (w.fuel < 20 && w.lowFuelTimer <= 0) { w.lowFuelTimer = 1; fx(w, 'lowfuel'); }

  // ----- events / spawns -----
  while (w.nextEvent < w.course.events.length && w.course.events[w.nextEvent].x <= b.x + 260) {
    activateEvent(w, w.course.events[w.nextEvent]);
    w.nextEvent++;
  }

  // ----- enemies -----
  for (const e of [...w.enemies]) {
    if (e.kind === 'ufo') {
      e.x += e.vx * dt;
      e.phase += dt;
      e.spin += dt * (e.type === 'crater' ? 9 : 2);
      if (e.type === 'rammer' && !e.diving) {
        e.y = e.baseY + w.math.sin(e.phase * 2) * 10;
        e.diveT -= dt;
        if (e.diveT <= 0 && Math.abs(e.x - b.x) < 260) {
          e.diving = true; e.diveT2 = 1.6;
        }
      } else if (e.kind === 'ufo' && e.type === 'rammer' && e.diving) {
        const tx = b.x + B.w / 2, ty = b.y - B.h / 2;
        const dx = tx - e.x, dy = ty - e.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        const sp2 = 170;
        e.x += (dx / d) * sp2 * dt; e.y += (dy / d) * sp2 * dt;
        e.diveT2 -= dt;
        if (e.diveT2 <= 0) { e.diving = false; e.baseY = Math.min(e.baseY, GY - 60); e.diveT = w.rng.range(...CFG.ufo.diveCd); }
      } else {
        e.y = e.baseY + w.math.sin(e.phase * 1.5) * 6;
        e.bombT -= dt;
        if (e.bombT <= 0) {
          e.bombT = w.rng.range(...CFG.ufo.bombCd);
          w.bombs.push({ oid: nextOid(w), x: e.x, y: e.y + e.h, vy: CFG.ufo.bombFallV, r: 4, crater: e.type === 'crater' });
        }
      }
      if (e.x < b.x - 420) { w.enemies.splice(w.enemies.indexOf(e), 1); continue; }
      if (e.diving && overlap({ x: e.x - e.w / 2, y: e.y - e.h / 2, w: e.w, h: e.h }, buggyBox(w))) {
        killEnemy(w, e); kill(w, 'rammer');
      }
    } else if (e.kind === 'lander') {
      // never slide behind the camera unseen; stays visible while descending
      e.x = Math.max(e.x, b.x - 220);
      e.y += CFG.lander.sink * dt;
      if (e.y + e.h / 2 >= GY) {
        // home-port rule: a lander that touches down ends the game
        fx(w, 'touchdown');
        burst(w, e.x, GY - 8, 20, '#ffd27e');
        w.enemies.splice(w.enemies.indexOf(e), 1);
        w.lives = 0;
        kill(w, 'lander');
        if (w.mode !== 'dying') { w.mode = 'gameover'; fx(w, 'gameover'); }
      }
    } else if (e.kind === 'hover') {
      if (e.state === 'stalk') {
        e.timer -= dt;
        e.x = Math.min(e.x + (b.speed * 0.9) * dt, b.x - 150);
        if (e.timer <= 0) { e.state = 'charge'; fx(w, 'warn'); }
      } else if (e.state === 'charge') {
        e.x += CFG.hover.chargeV * dt;
        const hb = { x: e.x - e.w / 2, y: GY - e.h, w: e.w, h: e.h };
        if (overlap(hb, buggyBox(w))) kill(w, 'hover');
        // after sweeping past the buggy it parks ahead, shootable (arcade: "jump it, then shoot it")
        if (e.x > b.x + 140) e.state = 'idle';
      } else { // idle, parked ahead: shootable
        const hb = { x: e.x - e.w / 2, y: GY - e.h, w: e.w, h: e.h };
        if (overlap(hb, buggyBox(w))) kill(w, 'hover');
      }
      if (e.x < b.x - 500) w.enemies.splice(w.enemies.indexOf(e), 1);
    }
  }

  // ----- ground hazards: tanks fire, boulders roll -----
  for (const o of w.ground) {
    if (o.type === 'tank') {
      if (Math.abs(o.x - b.x) < CFG.tank.range && o.x > b.x) {
        o.shellT = (o.shellT ?? w.rng.range(0.5, CFG.tank.shellCd)) - dt;
        if (o.shellT <= 0) {
          o.shellT = CFG.tank.shellCd;
          w.shells.push({ x: o.x, y: GY - o.h + 4, w: 10, h: 4, vx: -CFG.tank.shellV });
          fx(w, 'fire');
        }
      }
    } else if (o.type === 'boulder' && Math.abs(o.x - b.x) < CFG.boulder.aggro) {
      o.x -= CFG.boulder.rollV * dt;
    }
  }

  // ----- bullets -----
  if (b.fwd) {
    b.fwd.x += CFG.bullets.fwdV * dt; b.fwd.ttl -= dt;
    if (b.fwd.ttl <= 0) b.fwd = null;
  }
  if (b.up) {
    b.up.y -= CFG.bullets.upV * dt;
    if (b.up.y < CFG.view.HUD_TOP - 8) b.up = null;
  }
  if (input.fire && b.fireCd <= 0 && !b.up) {
    b.fwd = { x: b.x + B.w, y: GY - 12, w: 10, h: 4, ttl: CFG.bullets.fwdTtl };
    b.up = { x: b.x + B.w / 2, y: b.y - B.h - 4, w: 4, h: 8 };
    b.fireCd = CFG.buggy.fireCd;
    fx(w, 'fire');
  }

  // forward bullet hits
  if (b.fwd) {
    for (const o of [...w.ground, ...w.enemies.filter(e => e.kind === 'hover')]) {
      if (o.type === 'minefield') continue; // mines are not shootable
      const box = o.kind === 'hover'
        ? { x: o.x - o.w / 2, y: GY - o.h, w: o.w, h: o.h }
        : (o.type === 'plant'
          ? { x: o.x, y: GY + 16 - o.h, w: o.w, h: o.h }
          : groundBox(o));
      if (overlap(b.fwd, box)) {
        b.fwd = null;
        if (o.kind === 'hover') killEnemy(w, o); else hitGroundObj(w, o);
        break;
      }
    }
  }
  // up bullet hits (pierces through a stack of aerial targets)
  if (b.up) {
    if (!b.up.hits) b.up.hits = [];
    const targets = [...w.enemies.filter(e => e.kind !== 'hover'), ...w.bombs];
    for (const t of targets) {
      if (b.up.hits.includes(t.oid)) continue;
      const box = t.kind
        ? { x: t.x - t.w / 2, y: t.y - t.h / 2, w: t.w, h: t.h }
        : { x: t.x - 4, y: t.y, w: 8, h: 10 };
      if (overlap(b.up, box)) {
        b.up.hits.push(t.oid);
        if (t.kind) killEnemy(w, t);
        else {
          w.bombs.splice(w.bombs.indexOf(t), 1);
          burst(w, t.x, t.y, 6, '#ffd27e');
          fx(w, 'hit');
        }
      }
    }
  }

  // ----- bombs fall -----
  for (const bo of [...w.bombs]) {
    bo.y += bo.vy * dt;
    if (bo.y + bo.r >= GY) {
      w.bombs.splice(w.bombs.indexOf(bo), 1);
      if (bo.crater) createCrater(w, bo.x);
      else { burst(w, bo.x, GY - 4, 10, '#ffd27e'); fx(w, 'explode'); }
    } else if (overlap({ x: bo.x - bo.r, y: bo.y, w: bo.r * 2, h: bo.r * 2 }, buggyBox(w))) {
      w.bombs.splice(w.bombs.indexOf(bo), 1);
      kill(w, 'bomb');
    }
  }
  // shells
  for (const s of [...w.shells]) {
    s.x += s.vx * dt;
    if (s.x < b.x - 400) { w.shells.splice(w.shells.indexOf(s), 1); continue; }
    if (overlap(s, buggyBox(w))) { w.shells.splice(w.shells.indexOf(s), 1); kill(w, 'shell'); }
  }

  // ----- buggy vs ground -----
  if (b.invuln <= 0 && w.mode === 'running') {
    const bb = buggyBox(w);
    for (const c of w.craters) {
      if (b.onGround) {
        const ov = Math.min(b.x + B.w, c.x2) - Math.max(b.x, c.x1);
        if (ov > B.fallOverlap) { kill(w, 'crater'); break; }
      }
    }
    if (w.mode === 'running') {
      for (const o of w.ground) {
        if (o.type === 'plant') continue; // sits in crater; crater itself is the killer
        if (o.type === 'minefield') {
          // mines only kill a grounded (or landing) buggy; clipping a mine top
          // mid-jump is survivable
          if (!b.onGround) continue;
          let hit = false;
          for (const m of o.mines) {
            // slightly inset hitbox: landing just past a mine's edge is survivable
            if (overlap(bb, { x: m.x + 3, y: GY - m.h, w: m.w - 6, h: m.h })) { hit = true; break; }
          }
          if (hit) { kill(w, 'mine'); break; }
          continue;
        }
        if (overlap(bb, groundBox(o))) { kill(w, o.type); break; }
      }
    }
  }

  // ----- crater pass-through scoring, half-rock passed scoring -----
  for (const c of w.craters) {
    if (!c.scored && c.x2 < b.x - B.w) {
      c.scored = true;
      addScore(w, scoreFor(w.courseIndex, c.large ? 'craterLarge' : 'craterSmall', 0));
    }
  }
  for (const o of w.ground) {
    if (o.type === 'rock' && o.half && !o.passScored && o.x + o.w < b.x - B.w) {
      o.passScored = true;
      addScore(w, scoreFor(w.courseIndex, 'rockHalfPassed'));
    }
  }

  // ----- checkpoints -----
  const gates = w.course.gates;
  while (w.nextGate < gates.length && b.x >= gates[w.nextGate].x) {
    const g = gates[w.nextGate];
    w.nextGate++;
    w.letter = g.letter;
    if (g.major) {
      const elapsed = w.t - w.segStartT;
      const better = CFG.avgTime - Math.floor(elapsed);
      w.bestTimes.push({ letter: g.letter, time: elapsed });
      let msg = `${'EJOTZ'[CFG.majors.indexOf(g.letter)]} CHECKPOINT`;
      if (better > 0) {
        const bonus = CFG.score.segmentBase[w.courseIndex > 0 ? 1 : 0] + CFG.score.perSecondBetter * better;
        addScore(w, bonus);
        msg += `  BONUS +${bonus}`;
        fx(w, 'bonus');
      } else fx(w, 'checkpoint');
      w.segStartT = w.t;
      w.stage++;
      w.fuel = CFG.fuel.max;
      banner(w, msg);
    } else {
      w.fuel = Math.min(CFG.fuel.max, w.fuel + CFG.fuel.minorRefill);
      fx(w, 'checkpoint');
    }
  }

  // ----- course finished -----
  if (b.x >= w.course.endX && w.mode === 'running') {
    const better = Math.max(0, CFG.courseAvgTime - Math.floor(w.t));
    const bonus = CFG.score.courseBonus + CFG.score.perSecondBetter * better;
    addScore(w, bonus);
    w.clear = { bonus, time: w.t, ttl: 4.5 };
    w.mode = 'cleared';
    fx(w, 'clear');
  }

  // ----- warning lights (deterministic lookahead) -----
  const wa = w.warnings;
  wa.saucer = w.enemies.some(e => (e.kind === 'ufo' || e.kind === 'lander') && e.x > b.x - 50 && e.x < b.x + CFG.warn.saucer) ||
    w.course.events.some(ev => (ev.type === 'ufo' || ev.type === 'formation' || ev.type === 'lander') &&
      ev.x > b.x && ev.x < b.x + CFG.warn.saucer && w.course.events.indexOf(ev) >= w.nextEvent);
  wa.mine = w.ground.some(o => o.type === 'minefield' && o.x1 > b.x - 20 && o.x1 < b.x + CFG.warn.mine);
  wa.behind = w.enemies.some(e => e.kind === 'hover' && e.state !== 'idle') ||
    w.course.events.some((ev, i) => ev.type === 'hover' && i >= w.nextEvent && ev.x > b.x && ev.x < b.x + CFG.warn.behind);

  // ----- extra lives -----
  while (w.extraLifeIdx < CFG.extraLives.length && w.score >= CFG.extraLives[w.extraLifeIdx]) {
    w.extraLifeIdx++;
    w.lives++;
    banner(w, 'EXTRA LIFE');
    fx(w, 'extralife');
  }

  // ----- banner -----
  if (w.banner) { w.banner.ttl -= dt; if (w.banner.ttl <= 0) w.banner = null; }
}

export function drainFx(w) {
  const f = w.fx;
  w.fx = [];
  return f;
}
