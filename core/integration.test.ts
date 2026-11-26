// Rule 1 integration: the first consumer is the kernel tick-site. A fixture
// sim wrapped by the contract harness is registered on the loop; a control
// press drives it to emit the canonical `roundBreak` event (AD-6), which
// reaches the consumer's event queue verbatim; the queue is empty otherwise
// (I/O matrix row "Integration"). Each test builds its own kernel+sim so the
// file passes in any test order (Shared surfaces standing criterion).
import test from "node:test";
import assert from "node:assert/strict";
import { createKernelLoop } from "./loop.ts";
import { createGameInstance, type SimEvent } from "./contract/index.ts";

interface FireButton {
  down: boolean;
  pressed: boolean;
}

function harness() {
  let wall = 0;
  const loop = createKernelLoop({ now: () => wall });
  const input = { controls: { fire: { down: false, pressed: false } as FireButton } };
  const sim = createGameInstance((ctx) => {
    const state = ctx.gated({ pressed: 0 });
    let out: SimEvent[] = [];
    return {
      tick(_dt, tickInput) {
        const fire = tickInput.controls["fire"] as FireButton;
        if (fire.pressed) {
          state.pressed += 1;
          out.push({ type: "roundBreak", payload: { at: state.pressed, score: 100 } });
        }
      },
      events() {
        const pulled = out;
        out = [];
        return pulled;
      },
      snapshot: () => ({ pressed: state.pressed }),
    };
  }, 2026);
  loop.addInstance("fixture", sim, input);
  return { loop, input, advance: (ms: number) => { wall += ms; } };
}

test("idle ticks: consumer event queue stays empty", () => {
  const h = harness();
  for (let i = 0; i < 3; i++) {
    h.advance(17); // one tick per frame with the integer-ms fake clock
    h.loop.step();
  }
  assert.deepEqual(h.loop.drainEvents(), []);
});

test("button press: canonical roundBreak reaches the consumer queue verbatim", () => {
  const h = harness();
  (h.input.controls.fire as FireButton).pressed = true;
  h.advance(17);
  h.loop.step();
  (h.input.controls.fire as FireButton).pressed = false;

  const records = h.loop.drainEvents();
  assert.equal(records.length, 1);
  const record = records[0]!;
  assert.equal(record.gameId, "fixture");
  assert.equal(record.tick, h.loop.tickCount); // the press tick, from the harness's own clock
  assert.equal(record.event.type, "roundBreak"); // canonical reserved type (AD-6)
  assert.deepEqual(record.event.payload, { at: 1, score: 100 }); // verbatim plain data
  assert.deepEqual(JSON.parse(JSON.stringify(record.event)), record.event);

  h.advance(17);
  h.loop.step();
  assert.deepEqual(h.loop.drainEvents(), []); // empty again once the press is gone
});
