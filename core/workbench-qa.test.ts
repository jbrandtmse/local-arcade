// Story 1.9 QA (matrix row "Workbench click"): the shipped page passes NO
// reload source — workbench.ts's DEFAULT device wiring, `() => location.
// reload()`, was therefore never executed: the implement suite fired only
// injected sources. This file drives the default headlessly against a
// temporary globalThis.location spy the test itself creates and removes.
// Nothing else in the file touches the host location.
import test from "node:test";
import assert from "node:assert/strict";
import { mountWorkbench, type WorkbenchCanvas, type WorkbenchDoc } from "./workbench.ts";
import type { PaintContext } from "./room/surfaces.ts";

interface RecordedCanvas extends WorkbenchCanvas {
  label: string;
  listeners: { type: string; handler: () => void }[];
}

function recordWorld() {
  const calls: string[] = [];
  const created: RecordedCanvas[] = [];
  let n = 0;
  const doc: WorkbenchDoc = {
    body: {
      appendChild: (node) => {
        calls.push(`append:${(node as RecordedCanvas).label}`);
      },
      removeChild: (node) => {
        calls.push(`remove:${(node as RecordedCanvas).label}`);
      },
    },
    createElement(tag) {
      calls.push(`create:${tag}`);
      n += 1;
      const ctx: PaintContext = {
        fillStyle: "",
        font: "",
        textAlign: "",
        fillRect: () => {},
        fillText: () => {},
        measureText: (text) => ({ width: text.length * 8 }),
      };
      const canvas: RecordedCanvas = {
        label: `canvas${n}`,
        width: 0,
        height: 0,
        listeners: [],
        getContext: (kind) => (kind === "2d" ? ctx : null),
        addEventListener(type, handler) {
          canvas.listeners.push({ type, handler });
        },
      };
      created.push(canvas);
      return canvas;
    },
  };
  return { doc, calls, created };
}

test("the DEFAULT reload wiring: with no injected source, a click on the workbench canvas calls location.reload() — the device wiring the shipped timeout and boot-fault paths actually use (matrix 'Workbench click', AC4)", () => {
  let reloads = 0;
  const host = globalThis as unknown as { location?: unknown };
  const hadLocation = "location" in host;
  const saved = host.location; // undefined under node --test; restored after
  host.location = {
    reload: () => {
      reloads += 1;
    },
  };
  try {
    const w = recordWorld();
    const mount = mountWorkbench({ doc: w.doc, reason: "asset-timeout", removeCanvas: null, width: 800, height: 600 });
    assert.deepEqual(w.calls, ["create:canvas", "append:canvas1"], "the default path keeps the narrow mount law: one create, one append");
    const canvas = w.created[0]!;
    assert.equal(mount.canvas, canvas, "the mount record is the same canvas the body got");
    assert.deepEqual(canvas.listeners.map((l) => l.type), ["click"], "the single click listener is wired even with no injected source");
    canvas.listeners[0]!.handler();
    assert.equal(reloads, 1, "the DEFAULT source is the device layer's location.reload() — the shipped page passes no reload option, so this is the wiring every real workbench page uses");
    canvas.listeners[0]!.handler();
    assert.equal(reloads, 2, "every click reloads (the whole canvas is the affordance; there is no once-guard on it)");
  } finally {
    if (hadLocation) host.location = saved;
    else delete host.location;
    assert.equal("location" in host, hadLocation, "the spy leaves the global exactly as it found it — no own 'location' property lingers for the rest of the process (hermeticity: no leftovers a same-process test could trip on; mutation: restore with host.location = saved and this pin reds)");
  }
});
