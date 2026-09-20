import type { Address } from "@settle-kit/core";
import { verifyTypedData } from "viem";
import { MANDATE_EIP712_DOMAIN, MANDATE_EIP712_TYPES, type SignedMandate } from "./eip712.ts";

function sameAddress(left: string, right: string) {
  return left.toLowerCase() === right.toLowerCase();
}

export type MandateVerifyResult =
  | { ok: true }
  | {
      ok: false;
      reason: "expired" | "agent_mismatch" | "recipient_mismatch" | "invalid_signature";
    };

/**
 * Verify an AP2 mandate locally: expiry, optional agent/payee binding, and EIP-712 signature.
 */
export async function verifyMandateLocal(
  mandate: SignedMandate,
  opts?: {
    agent?: Address;
    /** Expected payee. When set, a mandate for a different merchant is rejected. */
    payTo?: Address;
    now?: number;
  },
): Promise<MandateVerifyResult> {
  const now = BigInt(opts?.now ?? Math.floor(Date.now() / 1000));
  if (mandate.payload.expiry < now) {
    return { ok: false, reason: "expired" };
  }
  if (opts?.agent && !sameAddress(mandate.payload.agent, opts.agent)) {
    return { ok: false, reason: "agent_mismatch" };
  }
  if (opts?.payTo && !sameAddress(mandate.payload.payTo, opts.payTo)) {
    return { ok: false, reason: "recipient_mismatch" };
  }

  const valid = await verifyTypedData({
    address: mandate.payload.delegator,
    domain: MANDATE_EIP712_DOMAIN,
    types: MANDATE_EIP712_TYPES,
    primaryType: "MandatePayload",
    message: mandate.payload,
    signature: mandate.signature,
  });

  return valid ? { ok: true } : { ok: false, reason: "invalid_signature" };
}
