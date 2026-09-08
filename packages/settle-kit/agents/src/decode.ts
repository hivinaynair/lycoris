/**
 * Readers for x402 header payloads. Every field an agent reads off the wire comes from
 * a third-party server, so it is checked here rather than asserted with `as` at the
 * point of use — the same discipline `@settle-kit/core` applies to quotes.
 */

/** The one place an untrusted payload is treated as indexable. */
export function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

export function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

/** Serialized bigints are digit strings. `BigInt("")` is 0n, so an empty value must not reach it. */
export function asBigInt(value: unknown): bigint | undefined {
  const text = asString(value);
  if (text === undefined || !/^\d+$/.test(text)) return undefined;
  try {
    return BigInt(text);
  } catch {
    return undefined;
  }
}

/** Atomic amounts should be digit strings; a JSON number is tolerated and normalised. */
export function asAmount(value: unknown): string | undefined {
  if (typeof value === "string") return /^\d+$/.test(value) ? value : undefined;
  if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) return String(value);
  return undefined;
}
