import {
  MANDATE_EIP712_DOMAIN,
  MANDATE_EIP712_TYPES,
  type SignedMandate,
} from "@repo/shared/mandate";
import type { MandateHeaderValue } from "@repo/shared/mandate-header";
import { isAddress, verifyTypedData } from "viem";

// USDC has 6 decimals — multiply whole-unit amounts by this to get atomic units
export const USDC_ATOMIC_FACTOR = 1_000_000n;

export function mandateMaxAtomic(mandateEntry?: MandateHeaderValue): bigint {
  if (!mandateEntry) return 0n;
  return mandateEntry.mandate.payload.maxAmountUsdc * USDC_ATOMIC_FACTOR;
}

/** The one place an untrusted payload is treated as indexable. */
function record(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object"
    ? (value as Record<string, unknown>)
    : undefined;
}

export function extractAuthNonce(payload: unknown): string | undefined {
  const nonce = record(record(payload)?.authorization)?.nonce;
  return typeof nonce === "string" ? nonce : undefined;
}

export function getPayerAddress(payload: unknown): `0x${string}` | undefined {
  const p = record(payload);
  const from = record(p?.authorization)?.from ?? p?.from;
  // A payload is third-party data: an address-shaped string, or nothing.
  return typeof from === "string" && isAddress(from, { strict: false }) ? from : undefined;
}

// Verifies the delegator's EIP-712 signature over a SignedMandate.
export function verifyMandateSignature(mandate: SignedMandate): Promise<boolean> {
  return verifyTypedData({
    address: mandate.payload.delegator,
    domain: MANDATE_EIP712_DOMAIN,
    types: MANDATE_EIP712_TYPES,
    primaryType: "MandatePayload",
    message: {
      agent: mandate.payload.agent,
      delegator: mandate.payload.delegator,
      maxAmountUsdc: mandate.payload.maxAmountUsdc,
      expiry: mandate.payload.expiry,
      nonce: mandate.payload.nonce,
    },
    signature: mandate.signature,
  });
}
