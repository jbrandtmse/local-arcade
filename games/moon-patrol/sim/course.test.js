// Vendored from C:/git/moonpatrol HEAD 49c351910af742a86cf97987bc474bb4d7d8da40
// (Story 1.5 port; provenance line in the world.js header). SEAM EDIT ONLY:
// import paths point at this sim folder. The course data invariants and the
// generation determinism pins ride along so the vendored data stays honest.

import test from 'node:test';
import assert from 'node:assert/strict';
import { CFG } from './config.js';
import { buildCourse, gateX, courseEndX } from './course.js';

const letterOf = (x) => Math.floor(x / CFG.sectionLen);

for (const seed of [42, 7, 123456]) {
  test(`course invariants (seed ${seed})`, () => {
    const c = buildCourse(0, seed);
    assert.equal(c.endX, courseEndX());
    assert.equal(c.gates.length, 26);
    assert.deepEqual(c.gates.filter(g => g.major).map(g => g.letter), CFG.majors);
    assert.equal(c.gates[4].x, gateX(4));

    let prevEnd = -Infinity;
    for (const g of c.ground) {
      if (g.type === 'plant') continue; // plants live inside craters
      const [a, b] = g.type === 'crater' || g.type === 'minefield' ? [g.x1, g.x2] : [g.x, g.x + g.w];
      assert.ok(a >= prevEnd + CFG.minObstacleGap, `spacing violated at ${a} (prev end ${prevEnd})`);
      prevEnd = b;
      assert.ok(a >= 0 && b <= courseEndX(), 'inside course bounds');
    }

    for (const g of c.ground) {
      const originX = g.x1 ?? g.x;
      if (g.type === 'crater') {
        assert.ok(g.width >= CFG.crater.smallMin && g.width <= CFG.crater.largeMax);
        if (g.large) assert.ok(letterOf(originX) >= CFG.density.largeCraterFrom, 'large crater too early');
      }
      if (g.type === 'minefield') assert.ok(letterOf(originX) >= CFG.density.mineFrom, 'mines before J');
      if (g.type === 'tank') assert.ok(letterOf(originX) >= CFG.density.tankFrom, 'tank too early');
      if (g.type === 'plant') assert.ok(letterOf(originX) >= CFG.density.plantFrom, 'plant too early');
    }

    let pe = -Infinity;
    for (const ev of c.events) { assert.ok(ev.x >= pe); pe = ev.x; }
    assert.ok(c.ground.some(g => g.type === 'crater'), 'course has craters');
    assert.ok(c.ground.length > 40, 'course has content');
    assert.ok(c.events.length > 10, 'course has aerial events');

    // no letter section is empty of ground hazards
    for (let i = 0; i < 26; i++) {
      const inSection = c.ground.filter(g => letterOf(g.x1 ?? g.x) === i);
      assert.ok(inSection.length >= 1, `letter ${String.fromCharCode(65 + i)} has no hazards`);
    }
  });
}

test('deterministic generation', () => {
  assert.deepEqual(buildCourse(0, 99), buildCourse(0, 99));
  assert.notDeepEqual(buildCourse(0, 99), buildCourse(0, 100));
  assert.notDeepEqual(buildCourse(0, 99), buildCourse(1, 99));
});

test('champion course is denser', () => {
  const count = (c) => c.ground.filter(g => g.type !== 'plant').length + c.events.length;
  assert.ok(count(buildCourse(1, 42)) > count(buildCourse(0, 42)));
});

test('every letter section has reachable checkpoints', () => {
  const c = buildCourse(0, 3);
  for (let i = 0; i < 26; i++) assert.equal(c.gates[i].x, (i + 1) * CFG.sectionLen);
});
