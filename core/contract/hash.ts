// stateHash() currency (AD-5): canonical serialization -> FNV-1a 64-bit.
// Pure JS on exact primitives (string concat, BigInt arithmetic, UTF-8 via
// TextEncoder) so the browser kernel, Node CI, and tools/replay agree bit
// for bit. Key order is canonicalized by sorted keys, so games need not sort.

/** Deterministic UTF-8 byte list for a string (TextEncoder is spec-exact). */
function utf8Bytes(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

/**
 * Canonical JSON: sorted object keys, array order preserved, numbers via
 * ECMAScript Number::toString (shortest round-trip), strings via JSON escape.
 * Only plain-serializable data is accepted (see toPlain / snapshot rules).
 */
export function canonicalSerialize(value: unknown): string {
  if (value === null) return "null";
  const t = typeof value;
  if (t === "boolean") return value ? "true" : "false";
  if (t === "number") {
    if (!Number.isFinite(value as number)) {
      throw new TypeError("canonicalSerialize: non-finite number in state");
    }
    return (value as number).toString();
  }
  if (t === "string") return JSON.stringify(value);
  if (t === "undefined" || t === "function" || t === "symbol" || t === "bigint") {
    throw new TypeError(`canonicalSerialize: unsupported value of type ${t}`);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalSerialize(item)).join(",")}]`;
  }
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) {
    throw new TypeError("canonicalSerialize: class instances are not plain-serializable");
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  const parts: string[] = [];
  for (const key of keys) {
    const v = obj[key];
    if (v === undefined) {
      // Strict, not JSON-lax: an `undefined` member means the state shape is
      // ambiguous (it would vanish through a JSON round-trip) — reject it.
      throw new TypeError(`canonicalSerialize: object member ${JSON.stringify(key)} is undefined`);
    }
    parts.push(`${JSON.stringify(key)}:${canonicalSerialize(v)}`);
  }
  return `{${parts.join(",")}}`;
}

const FNV_OFFSET = 14695981039346656037n;
const FNV_PRIME = 1099511628211n;
const MASK64 = 0xffffffffffffffffn;

/** FNV-1a over the UTF-8 bytes of `text`, as a 16-digit lowercase hex string. */
export function fnv1a64(text: string): string {
  let h = FNV_OFFSET;
  for (const byte of utf8Bytes(text)) {
    h = ((h ^ BigInt(byte)) * FNV_PRIME) & MASK64;
  }
  return h.toString(16).padStart(16, "0");
}

/** stateHash for a plain-serializable snapshot (AD-5 wrapper-computed value). */
export function stateHashOf(snapshot: unknown): string {
  return fnv1a64(canonicalSerialize(snapshot));
}
