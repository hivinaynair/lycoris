import { schema } from "@repo/db";
import { buildDecisionRecord } from "@repo/shared/decision-record";
import type { MandateHeaderValue } from "@repo/shared/mandate-header";
import type { Decision, DecisionRecord, IdentityStatus } from "@repo/shared/types";
import type { PublishedAttestation } from "./attest.js";
import { getDb } from "./db.js";

export async function persistAttestationRow({
  paymentHash,
  settlementTx = null,
  published,
  payer,
  amountUsdc,
  policyMaxAmountUsdc,
  decisionRecord,
  identityStatus,
  decision,
  authorizationNonce,
}: {
  paymentHash: `0x${string}`;
  settlementTx?: string | null;
  published?: PublishedAttestation | null;
  payer: string;
  amountUsdc: bigint;
  policyMaxAmountUsdc: bigint;
  decisionRecord: DecisionRecord;
  identityStatus: IdentityStatus;
  decision: Decision;
  authorizationNonce?: string | null;
}) {
  try {
    await getDb()
      .insert(schema.settlementAttestations)
      .values({
        paymentHash,
        settlementTx,
        attestationTx: published?.attestationTx ?? null,
        commitment: published?.commitment ?? null,
        commitmentSalt: published?.salt ?? null,
        payerAddress: payer,
        amountUsdc,
        policyMaxAmountUsdc,
        decisionRecord,
        identityStatus,
        decision,
        authorizationNonce: authorizationNonce ?? null,
      });
  } catch (err) {
    console.error("[persistAttestationRow] db insert failed:", err);
  }
}

export async function recordSettledPayment({
  paymentHash,
  settlementTx = null,
  published,
  payer,
  amountUsdc,
  policyMaxAtomic,
  identityStatus,
  decision,
  authorizationNonce,
  mandateEntry,
  resource,
  rejectionReason,
}: {
  paymentHash: `0x${string}`;
  settlementTx?: string | null;
  published?: PublishedAttestation | null;
  payer: string;
  amountUsdc: bigint;
  policyMaxAtomic: bigint;
  identityStatus: IdentityStatus;
  decision: Decision;
  authorizationNonce?: string | null;
  mandateEntry?: MandateHeaderValue;
  resource?: unknown;
  rejectionReason?: string;
}) {
  await persistAttestationRow({
    paymentHash,
    settlementTx,
    published,
    payer,
    amountUsdc,
    policyMaxAmountUsdc: policyMaxAtomic,
    decisionRecord: buildDecisionRecord({
      agentId: mandateEntry?.agentId,
      amountAtomic: amountUsdc,
      decision,
      identityStatus,
      mandate: mandateEntry?.mandate,
      payer,
      paymentHash,
      authorizationNonce,
      policyMaxAtomic,
      resource,
      rejectionReason,
      settlementTxHash: settlementTx ?? undefined,
      attestationTxHash: published?.attestationTx ?? null,
    }),
    identityStatus,
    decision,
    authorizationNonce,
  });
}
