import type { lookupIdentity } from "@repo/shared/identity";
import type { MandateHeaderValue } from "@repo/shared/mandate-header";
import { parseMandateHeader } from "@repo/shared/mandate-header";
import { IdentityStatus } from "@repo/shared/types";
import type { PublicClient } from "viem";
import { USDC_ATOMIC_FACTOR, type verifyMandateSignature } from "./mandate.js";
import { GATE_STEP, reportPipelineGate } from "./pipeline-progress.js";
import { recordRejection } from "./record-rejection.js";
import { requestCtx } from "./request-context.js";

export type VerifyDeps = {
  verifyMandateSignature: typeof verifyMandateSignature;
  lookupIdentity: typeof lookupIdentity;
  registryAddress: `0x${string}`;
  client: Pick<PublicClient, "readContract">;
};

export type ValidateMandateResult =
  | { ok: true; mandateEntry: MandateHeaderValue }
  | { ok: false; abort: true; reason: string };

export async function validateMandateForPayment(
  {
    payer,
    amountAtomic,
    authorizationNonce,
    resource,
    payTo,
  }: {
    payer: string;
    amountAtomic: bigint;
    authorizationNonce?: string | undefined;
    resource?: unknown;
    /**
     * Who this payment actually pays. Supplied by verify and settle, never by the buyer.
     */
    payTo?: string | undefined;
  },
  deps: VerifyDeps,
): Promise<ValidateMandateResult> {
  const { mandateJson } = requestCtx.get();
  const mandateEntry = mandateJson ? parseMandateHeader(mandateJson) : undefined;

  const reject = async (
    reason: string,
    identityStatus: IdentityStatus,
    mandateEntry?: MandateHeaderValue | undefined,
  ): Promise<ValidateMandateResult> => {
    await recordRejection({
      amountAtomic,
      authorizationNonce,
      identityStatus,
      payer,
      reason,
      resource,
      mandateEntry,
    });
    return { ok: false, abort: true, reason };
  };

  // Enter AP2 gate: header present + signature binds payer.
  reportPipelineGate(payer, GATE_STEP.MANDATE_CHECK);
  if (!mandateEntry) {
    return reject("mandate_missing", IdentityStatus.NotFound);
  }

  const { mandate, agentId } = mandateEntry;
  const isValidSig = await deps.verifyMandateSignature(mandate);
  if (!isValidSig || mandate.payload.agent.toLowerCase() !== payer.toLowerCase()) {
    return reject("mandate_invalid", IdentityStatus.NotFound, mandateEntry);
  }

  // Enter ERC-8004 gate: on-chain identity must match the payer wallet.
  reportPipelineGate(payer, GATE_STEP.IDENTITY_CHECK);
  const profile = await deps.lookupIdentity(agentId, deps.registryAddress, deps.client);
  if (!profile || profile.wallet.toLowerCase() !== payer.toLowerCase()) {
    return reject("identity_not_found", IdentityStatus.NotFound, mandateEntry);
  }

  // Back on AP2 for expiry + spend ceiling.
  reportPipelineGate(payer, GATE_STEP.MANDATE_CHECK);
  if (mandate.payload.expiry < BigInt(Math.floor(Date.now() / 1000))) {
    return reject("mandate_expired", IdentityStatus.Verified, mandateEntry);
  }

  const mandateMaxAtomic = mandate.payload.maxAmountUsdc * USDC_ATOMIC_FACTOR;
  if (amountAtomic > mandateMaxAtomic) {
    return reject("mandate_amount_exceeded", IdentityStatus.Verified, mandateEntry);
  }

  // A mandate authorizes spending to one merchant. Without this the delegator's
  // signature would say "up to N until T" and nothing about to whom, so a mandate
  // issued for one resource would be equally valid at any other.
  if (payTo && mandate.payload.payTo.toLowerCase() !== payTo.toLowerCase()) {
    return reject("mandate_recipient_mismatch", IdentityStatus.Verified, mandateEntry);
  }

  return { ok: true, mandateEntry };
}
