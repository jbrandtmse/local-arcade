// Between-tick write freeze (AD-15). Sim state must be mutated only inside
// the tick window. Plain Object.freeze cannot be undone for the next tick,
// so the harness uses a write-gated Proxy view: reads always pass, but any
// mutating trap (set / defineProperty / deleteProperty / setPrototypeOf)
// throws a TypeError while the gate is closed. State is created through the
// wrapper's ctx.gated() so every reference the sim holds is gate-checked.

export interface TickGate {
  /** Open the mutation window (wrapper opens it only around sim.tick(); AD-15). */
  open(): void;
  /** Close the mutation window. */
  close(): void;
  readonly isOpen: boolean;
}

export function createGate(): TickGate {
  let open = false;
  return {
    open() {
      open = true;
    },
    close() {
      open = false;
    },
    get isOpen() {
      return open;
    },
  };
}

// One Proxy per (target, gate) pair; nested objects are wrapped lazily on read.
const gateViews = new WeakMap<object, WeakMap<TickGate, object>>();

function deny(gate: TickGate, key: string | symbol): never {
  throw new TypeError(
    `sim state mutated outside the tick window (AD-15): write to ${String(key)} while the gate is closed`,
  );
}

export function gateDeep<T extends object>(target: T, gate: TickGate): T {
  let byGate = gateViews.get(target);
  if (!byGate) {
    byGate = new WeakMap();
    gateViews.set(target, byGate);
  }
  const existing = byGate.get(gate);
  if (existing) return existing as T;

  const view = new Proxy(target, {
    get(obj, key, receiver) {
      const value = Reflect.get(obj, key, receiver);
      if (typeof value === "object" && value !== null) {
        return gateDeep(value as object, gate);
      }
      return value;
    },
    set(obj, key, value, receiver) {
      if (!gate.isOpen) deny(gate, key);
      return Reflect.set(obj, key, value, receiver);
    },
    defineProperty(obj, key, desc) {
      if (!gate.isOpen) deny(gate, key);
      return Reflect.defineProperty(obj, key, desc);
    },
    deleteProperty(obj, key) {
      if (!gate.isOpen) deny(gate, key);
      return Reflect.deleteProperty(obj, key);
    },
    setPrototypeOf(obj, proto) {
      if (!gate.isOpen) deny(gate, "prototype");
      return Reflect.setPrototypeOf(obj, proto);
    },
  });
  byGate.set(gate, view);
  return view as T;
}

/**
 * Deep structural clone of a (possibly gated) plain-data tree into fresh
 * plain objects — used by snapshot()/hash paths so they read a stable tree
 * regardless of gate state. Functions/symbols/undefined are rejected: the
 * snapshot contract is plain-serializable data only.
 */
export function toPlain<T>(value: T, path = "$", ancestors: Set<object> = new Set()): T {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new TypeError(`snapshot value at ${path} is not finite (AD-5 plain-serializable contract)`);
    }
    return value;
  }
  if (typeof value !== "object") {
    throw new TypeError(`snapshot value at ${path} is ${typeof value}; plain-serializable data only`);
  }
  // Path-local ancestor set: a cycle trips the guard; a diamond (the same
  // subobject referenced from two sibling branches) still clones twice.
  if (ancestors.has(value as object)) {
    throw new TypeError(`snapshot value at ${path} is cyclic; plain-serializable data only`);
  }
  ancestors.add(value as object);
  try {
    if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        if (!(i in value)) {
          throw new TypeError(`snapshot value at ${path} is a sparse array; plain-serializable data only`);
        }
      }
      return value.map((item, i) => toPlain(item, `${path}[${i}]`, ancestors)) as unknown as T;
    }
    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) {
      throw new TypeError(`snapshot value at ${path} is a class instance; plain-serializable data only`);
    }
    if (Object.getOwnPropertySymbols(value).length > 0) {
      throw new TypeError(`snapshot value at ${path} has symbol keys; plain-serializable data only`);
    }
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value)) {
      out[key] = toPlain((value as Record<string, unknown>)[key], `${path}.${key}`, ancestors);
    }
    return out as unknown as T;
  } finally {
    ancestors.delete(value as object);
  }
}
