// Vendored from C:/git/moonpatrol HEAD 49c351910af742a86cf97987bc474bb4d7d8da40
// (Story 1.5; owner's own single-author original work). Vendored as-is.
// Own derived game-local rng (transient build state; output is plain data) —
// legal per game-authoring section 2.
// Deterministic course generation: (courseIndex, seed) -> complete layout.
// Pure data: no DOM, no randomness outside makeRng(seed). Fully unit-testable.
import { CFG } from './config.js';
import { makeRng } from './rng.js';

export const letterAt = (x) => Math.floor(x / CFG.sectionLen);
export const gateX = (letterIndex) => (letterIndex + 1) * CFG.sectionLen;
export const courseEndX = () => CFG.letters * CFG.sectionLen;

function hash(seed, courseIndex) {
  // cheap deterministic mix so courses differ per index
  let h = (seed ^ 0x9e3779b9) >>> 0;
  h = (Math.imul(h ^ courseIndex, 0x85ebca6b)) >>> 0;
  return h;
}

function extent(item) {
  if (item.type === 'crater') return [item.x1, item.x2];
  if (item.type === 'minefield') return [item.x1, item.x2];
  return [item.x, item.x + item.w];
}

function clearOf(items, x1, x2) {
  const g = CFG.minObstacleGap;
  for (const it of items) {
    const [a, b] = extent(it);
    if (x1 - g < b && a < x2 + g) return false;
  }
  return true;
}

const pickRange = (rng, min, max) => rng.int(min, max);

export function buildCourse(courseIndex, seed) {
  const rng = makeRng(hash(seed, courseIndex));
  const champ = courseIndex > CFG.courses.beginner;
  const mult = champ ? CFG.density.championMult : 1;
  const D = CFG.density;
  const SE = CFG.spawnEventFrom;

  const ground = [];   // craters, rocks, minefields, boulders, tanks
  const events = [];   // aerial/rear spawn triggers: {type, x, ...}

  for (let L = 0; L < CFG.letters; L++) {
    const secStart = L * CFG.sectionLen + 120;   // keep gates clear
    const secEnd = (L + 1) * CFG.sectionLen - 160;

    const place = (w) => {
      const x = rng.range(secStart, secEnd - w);
      return x;
    };

    // --- craters (gaps) ---
    let n = D.crater(L) * mult;
    let count = Math.floor(n) + (rng.chance(n % 1) ? 1 : 0);
    if (count === 0 && L >= 1) count = 1; // never let the course go empty
    for (let i = 0; i < count; i++) {
      const large = L >= D.largeCraterFrom && rng.chance(0.4);
      const [wMin, wMax] = large
        ? [CFG.crater.largeMin, CFG.crater.largeMax]
        : [CFG.crater.smallMin, CFG.crater.smallMax];
      const w = pickRange(rng, wMin, wMax);
      const x1 = place(w);
      const crater = { type: 'crater', x1, x2: x1 + w, width: w, large };
      if (clearOf(ground, x1, x1 + w)) ground.push(crater);

      // space plants live inside craters (shootable bonus; crater stays)
      if (L >= D.plantFrom && crater === ground[ground.length - 1] && rng.chance(0.5)) {
        ground.push({
          type: 'plant', x: x1 + w / 2 - CFG.plant.w / 2, w: CFG.plant.w, h: CFG.plant.h,
          hp: CFG.plant.hp, inCrater: true,
          bonus: rng.pick(CFG.score.plantBonus),
        });
      }
    }

    // --- rocks ---
    n = D.rock(L) * mult;
    count = Math.floor(n) + (rng.chance(n % 1) ? 1 : 0);
    if (count === 0) count = 1; // at least one obstacle per letter from A
    for (let i = 0; i < count; i++) {
      let size = 0; // small
      if (L >= 3 && rng.chance(0.45)) size = 1; // medium
      if (L >= D.doubleRockFrom && rng.chance(0.25)) size = 2; // double
      const s = CFG.rock.sizes[size];
      const x = place(s.w);
      const rock = { type: 'rock', size, x, w: s.w, h: s.h, hp: s.hp };
      if (clearOf(ground, x, x + s.w)) ground.push(rock);
    }

    // --- minefields (start at J) ---
    if (L >= D.mineFrom && rng.chance(0.5 * mult)) {
      const nMines = rng.int(3, 5);
      const step = rng.int(95, 140);
      const x1 = place(nMines * step);
      const field = { type: 'minefield', x1, x2: x1 + nMines * step, mines: [] };
      for (let m = 0; m < nMines; m++) {
        field.mines.push({ type: 'mine', x: x1 + m * step, w: CFG.mine.w, h: CFG.mine.h });
      }
      if (clearOf(ground, x1, field.x2)) ground.push(field);
    }

    // --- rolling boulders (from G) ---
    if (L >= D.boulderFrom && rng.chance(0.45 * mult)) {
      const x = place(CFG.boulder.r * 2);
      const b = { type: 'boulder', x, w: CFG.boulder.r * 2, h: CFG.boulder.r * 2, hp: 1 };
      if (clearOf(ground, x, x + b.w)) ground.push(b);
    }

    // --- tanks (from O) ---
    if (L >= D.tankFrom && rng.chance(0.5 * mult)) {
      const x = place(CFG.tank.w);
      const t = { type: 'tank', x, w: CFG.tank.w, h: CFG.tank.h, hp: CFG.tank.hp };
      if (clearOf(ground, x, x + t.w)) ground.push(t);
    }

    // --- aerial single spawns ---
    if (L >= 1 && rng.chance((0.4 + L * 0.02) * mult)) {
      const nU = rng.int(1, 2);
      for (let i = 0; i < nU; i++) {
        let type = 'bomber';
        const r = rng.next();
        if (L >= SE.craterUfo && r < 0.22) type = 'crater';
        else if (L >= SE.rammer && r < 0.5) type = 'rammer';
        events.push({ type: 'ufo', ufoType: type, x: place(40) });
      }
    }

    // --- UFO formations ---
    if (L >= SE.formation && L % 4 === 0) {
      events.push({ type: 'formation', n: rng.pick([3, 3, 4, 5]), x: place(60) });
    }

    // --- landers (home-port feature requested by user) ---
    if (L >= SE.lander && rng.chance(0.25 + L * 0.025 * mult)) {
      events.push({ type: 'lander', x: place(30) });
    }

    // --- rear attacking vehicle ---
    if (L >= SE.hover && (L % 5 === 0 || (champ && L % 3 === 0))) {
      events.push({ type: 'hover', x: place(40) });
    }
  }

  ground.sort((a, b) => (a.x1 ?? a.x) - (b.x1 ?? b.x));
  events.sort((a, b) => a.x - b.x);

  return {
    courseIndex,
    seed,
    endX: courseEndX(),
    ground,
    events,
    gates: Array.from({ length: CFG.letters }, (_, i) => ({ letter: i, x: gateX(i), major: CFG.majors.includes(i) })),
  };
}
