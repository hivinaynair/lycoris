import { BASE_SEPOLIA_CAIP2 } from "@settle-kit/core";
import { asAmount, asRecord, asString } from "./decode.ts";
import type { ResourceChallenge } from "./types.ts";

export { BASE_SEPOLIA_CAIP2 };

/** Read a decoded PAYMENT-REQUIRED body. Unreadable fields are omitted. */
export function challengeFromPaymentRequired(decoded: unknown): ResourceChallenge {
  const body = asRecord(decoded);
  const resource = asRecord(body?.resource);
  return {
    scheme: asString(body?.scheme),
    network: asString(body?.network),
    maxAmountRequired: asAmount(body?.maxAmountRequired),
    resource: resource ? asString(resource.url) : asString(body?.resource),
    description: asString(body?.description),
    error: asString(body?.error),
  };
}

export function extractAuthorizationNonce(paymentPayload: unknown): string | undefined {
  const authorization = asRecord(asRecord(asRecord(paymentPayload)?.payload)?.authorization);
  return asString(authorization?.nonce);
}
