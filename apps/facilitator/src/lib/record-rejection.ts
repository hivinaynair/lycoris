import { buildDecisionRecord } from "@repo/shared/decision-record";
import type { MandateHeaderValue } from "@repo/shared/mandate-header";
import { Decision, type IdentityStatus } from "@repo/shared/types";
import { publishAttestation } from "./attest.js";
import { mandateMaxAtomic } from "./mandate.js";
import { persistAttestationRow } from "./persist-attestation.js";
import { buildVerifyRejectionPaymentHash } from "./rejection-payment-hash.js";

export async function recordRejection({
  agentId,
  amountAtomic,
  authorizationNonce,
  identityStatus,
  mandateEntry,
  payer,
  reason,
  resource,
}: {
  agentId?: bigint | undefined;
  amountAtomic: bigint;
  authorizationNonce?: string | undefined;
  identityStatus: IdentityStatus;
  mandateEntry?: MandateHeaderValue | undefined;
  payer: string;
  reason: string;
  resource?: unknown;
}) {
  const paymentHash = buildVerifyRejectionPaymentHash({
    amountAtomic,
    authorizationNonce,
    payer,
    reason,
    resource,
  });
  const published = await publishAttestation({
    amountUsdc: amountAtomic,
    decision: Decision.Rejected,
    identityStatus,
    payer,
    paymentHash,
    mandateMaxAmountUsdc: mandateMaxAtomic(mandateEntry),
    rejectionReason: reason,
  });
  const decisionRecord = buildDecisionRecord({
    agentId,
    amountAtomic,
    decision: Decision.Rejected,
    identityStatus,
    mandate: mandateEntry?.mandate,
    payer,
    paymentHash,
    authorizationNonce,
    resource,
    rejectionReason: reason,
    attestationTxHash: published?.attestationTx ?? null,
  });
  await persistAttestationRow({
    paymentHash,
    published,
    payer,
    amountUsdc: amountAtomic,
    decisionRecord,
    identityStatus,
    decision: Decision.Rejected,
    authorizationNonce,
  });
}
