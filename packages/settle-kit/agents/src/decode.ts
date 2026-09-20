import type { Address } from "@settle-kit/core";
import { isAddress } from "viem";

/** Narrow an untrusted value to a record, or `undefined`. */
export function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

export function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

const DIGITS = /^\d+$/;

/** Digit strings only. Empty string must not become `0n`. */
export function asBigInt(value: unknown): bigint | undefined {
  const text = asString(value);
  return text !== undefined && DIGITS.test(text) ? BigInt(text) : undefined;
}

/** Atomic amounts as digit strings. A JSON number is accepted and normalized. */
export function asAmount(value: unknown): string | undefined {
  if (typeof value === "string") return DIGITS.test(value) ? value : undefined;
  if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) return String(value);
  return undefined;
}

/** Accept un-checksummed addresses; only the 20-byte hex shape is required. */
export function asAddress(value: unknown): Address | undefined {
  const text = asString(value);
  return text !== undefined && isAddress(text, { strict: false }) ? text : undefined;
}
