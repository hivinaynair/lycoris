import { buildDecisionRecord } from "@repo/shared/decision-record";
import type { MandateHeaderValue } from "@repo/shared/mandate-header";
import type { Decision, IdentityStatus } from "@repo/shared/types";
import { type PublishedAttestation, publishAttestation } from "./attest.js";
import { mandateMaxAtomic } from "./mandate.js";
import { persistAttestationRow } from "./persist-attestation.js";

export type PaymentOutcome = {
  payer: string;
  amountAtomic: bigint;
  paymentHash: `0x${string}`;
  decision: Decision;
  identityStatus: IdentityStatus;
  mandateEntry?: MandateHeaderValue | undefined;
  authorizationNonce?: string | null | undefined;
  resource?: unknown;
  rejectionReason?: string | undefined;
  /** Set only once funds moved. Absent for every rejection. */
  settlementTx?: string | null | undefined;
};

/**
 * The one path from a decided payment to durable evidence: publish the attestation,
 * build the decision record, persist the row. A rejection and a settlement differ
 * only in what they pass in, so neither owns a copy of these three steps.
 *
 * Returns the published attestation, or null when publishing failed — the row is
 * still written, so a decision is never lost because the chain was unreachable.
 */
export async function recordOutcome(outcome: PaymentOutcome): Promise<PublishedAttestation | null> {
  const {
    payer,
    amountAtomic,
    paymentHash,
    decision,
    identityStatus,
    mandateEntry,
    authorizationNonce,
    resource,
    rejectionReason,
    settlementTx = null,
  } = outcome;

  const published = await publishAttestation({
    amountUsdc: amountAtomic,
    decision,
    identityStatus,
    payer,
    paymentHash,
    mandateMaxAmountUsdc: mandateMaxAtomic(mandateEntry),
    rejectionReason,
  });

  await persistAttestationRow({
    paymentHash,
    settlementTx,
    published,
    payer,
    amountUsdc: amountAtomic,
    decisionRecord: buildDecisionRecord({
      agentId: mandateEntry?.agentId,
      amountAtomic,
      decision,
      identityStatus,
      mandate: mandateEntry?.mandate,
      payer,
      paymentHash,
      authorizationNonce,
      resource,
      rejectionReason,
      settlementTxHash: settlementTx ?? undefined,
      attestationTxHash: published?.attestationTx ?? null,
    }),
    identityStatus,
    decision,
    authorizationNonce,
  });

  return published;
}
