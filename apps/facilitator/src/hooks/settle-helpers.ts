import { parseMandateHeader } from "@repo/shared/mandate-header";
import { type Decision, IdentityStatus } from "@repo/shared/types";
import type { FacilitatorSettleResultContext } from "@x402/core/facilitator";
import { publishAttestation } from "../lib/attest.js";
import { limitSnapshotAtomic } from "../lib/limit-snapshot.js";
import { extractAuthNonce, getPayerAddress } from "../lib/mandate.js";
import { recordSettledPayment } from "../lib/persist-attestation.js";
import { requestCtx } from "../lib/request-context.js";

export const SETTLEMENT_TX_FAILED_REASON = "settlement_transaction_failed";
export const SETTLEMENT_RECEIPT_UNCONFIRMED_REASON = "settlement_receipt_unconfirmed";

export function settlementContext(
  paymentPayload: FacilitatorSettleResultContext["paymentPayload"],
) {
  const payer = getPayerAddress(paymentPayload.payload);
  const { mandateJson } = requestCtx.get();
  const mandateEntry = mandateJson ? parseMandateHeader(mandateJson) : undefined;
  return {
    payer,
    authorizationNonce: extractAuthNonce(paymentPayload.payload) ?? null,
    amountUsdc: BigInt(paymentPayload.accepted.amount),
    mandateEntry,
    identityStatus: mandateEntry ? IdentityStatus.Verified : IdentityStatus.NotFound,
    resource: paymentPayload.resource,
    policyMaxAtomic: limitSnapshotAtomic(mandateEntry),
  };
}

export async function publishAndRecord(args: {
  payer: string;
  amountUsdc: bigint;
  paymentHash: `0x${string}`;
  policyMaxAtomic: bigint;
  identityStatus: IdentityStatus;
  decision: Decision;
  authorizationNonce: string | null;
  mandateEntry?: ReturnType<typeof parseMandateHeader>;
  resource?: unknown;
  rejectionReason?: string;
  settlementTx?: `0x${string}` | null;
}) {
  const published = await publishAttestation({
    amountUsdc: args.amountUsdc,
    decision: args.decision,
    identityStatus: args.identityStatus,
    payer: args.payer,
    paymentHash: args.paymentHash,
    policyMaxAmountUsdc: args.policyMaxAtomic,
    rejectionReason: args.rejectionReason,
  });
  await recordSettledPayment({
    paymentHash: args.paymentHash,
    settlementTx: args.settlementTx ?? null,
    published,
    payer: args.payer,
    amountUsdc: args.amountUsdc,
    policyMaxAtomic: args.policyMaxAtomic,
    identityStatus: args.identityStatus,
    decision: args.decision,
    authorizationNonce: args.authorizationNonce,
    mandateEntry: args.mandateEntry,
    resource: args.resource,
    rejectionReason: args.rejectionReason,
  });
  return published;
}
