import type { HexAddress } from "@settle-kit/core";
import { verifyTypedData } from "viem";
import { MANDATE_EIP712_DOMAIN, MANDATE_EIP712_TYPES, type SignedMandate } from "./eip712";

export type MandateVerifyResult =
  | { ok: true }
  | {
      ok: false;
      reason: "expired" | "agent_mismatch" | "recipient_mismatch" | "invalid_signature";
    };

export async function verifyMandateLocal(
  mandate: SignedMandate,
  opts?: {
    agent?: HexAddress;
    /**
     * Who the payment actually pays. Supply it: a mandate names a merchant, and
     * checking the signature without checking the recipient accepts a mandate
     * issued for somebody else's resource.
     */
    payTo?: HexAddress;
    now?: number;
  },
): Promise<MandateVerifyResult> {
  const now = BigInt(opts?.now ?? Math.floor(Date.now() / 1000));
  if (mandate.payload.expiry < now) {
    return { ok: false, reason: "expired" };
  }
  if (opts?.agent && mandate.payload.agent.toLowerCase() !== opts.agent.toLowerCase()) {
    return { ok: false, reason: "agent_mismatch" };
  }
  if (opts?.payTo && mandate.payload.payTo.toLowerCase() !== opts.payTo.toLowerCase()) {
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
