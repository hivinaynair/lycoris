import type { MandateHeaderValue } from "@repo/shared/mandate-header";
import { USDC_ATOMIC_FACTOR } from "./mandate.js";

/** On-chain commitment still encodes a limit; use mandate max (no separate policy gate). */
export function limitSnapshotAtomic(mandateEntry?: MandateHeaderValue): bigint {
  if (!mandateEntry) return 0n;
  return mandateEntry.mandate.payload.maxAmountUsdc * USDC_ATOMIC_FACTOR;
}
