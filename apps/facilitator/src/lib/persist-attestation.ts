import { schema } from "@repo/db";
import type { Decision, DecisionRecord, IdentityStatus } from "@repo/shared/types";
import type { PublishedAttestation } from "./attest.js";
import { getDb } from "./db.js";

export async function persistAttestationRow({
  paymentHash,
  settlementTx = null,
  published,
  payer,
  amountUsdc,
  decisionRecord,
  identityStatus,
  decision,
  authorizationNonce,
}: {
  paymentHash: `0x${string}`;
  settlementTx?: string | null | undefined;
  published?: PublishedAttestation | null | undefined;
  payer: string;
  amountUsdc: bigint;
  decisionRecord: DecisionRecord;
  identityStatus: IdentityStatus;
  decision: Decision;
  authorizationNonce?: string | null | undefined;
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
        decisionRecord,
        identityStatus,
        decision,
        authorizationNonce: authorizationNonce ?? null,
      });
  } catch (err) {
    console.error("[persistAttestationRow] db insert failed:", err);
  }
}
