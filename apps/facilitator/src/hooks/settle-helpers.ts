import { parseMandateHeader } from "@repo/shared/mandate-header";
import { IdentityStatus } from "@repo/shared/types";
import type { FacilitatorSettleResultContext } from "@x402/core/facilitator";
import { extractAuthNonce, getPayerAddress } from "../lib/mandate.js";
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
  };
}
