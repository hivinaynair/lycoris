import type { MandateHeaderValue } from "@repo/shared/mandate-header";
import { Decision, type IdentityStatus } from "@repo/shared/types";
import { recordOutcome } from "./record-outcome.js";
import { buildVerifyRejectionPaymentHash } from "./rejection-payment-hash.js";

/** A rejection has no settlement transaction, so its payment hash is derived from the request. */
export async function recordRejection({
  amountAtomic,
  authorizationNonce,
  identityStatus,
  mandateEntry,
  payer,
  reason,
  resource,
}: {
  amountAtomic: bigint;
  authorizationNonce?: string | undefined;
  identityStatus: IdentityStatus;
  mandateEntry?: MandateHeaderValue | undefined;
  payer: string;
  reason: string;
  resource?: unknown;
}) {
  await recordOutcome({
    payer,
    amountAtomic,
    paymentHash: buildVerifyRejectionPaymentHash({
      amountAtomic,
      authorizationNonce,
      payer,
      reason,
      resource,
    }),
    decision: Decision.Rejected,
    identityStatus,
    mandateEntry,
    authorizationNonce,
    resource,
    rejectionReason: reason,
  });
}
