import { asAmount, asRecord, asString } from "./decode";
import type { ResourceChallenge } from "./types";

export const BASE_SEPOLIA_CAIP2 = "eip155:84532";

/** x402 v1 used `X-PAYMENT-REQUIRED`; v2 uses `PAYMENT-REQUIRED`. */
export function paymentRequiredHeader(headers: Headers): string | null {
  return headers.get("PAYMENT-REQUIRED") ?? headers.get("X-PAYMENT-REQUIRED");
}

/** Read a decoded PAYMENT-REQUIRED body. Unreadable fields are reported absent, never guessed. */
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
  const envelope = asRecord(paymentPayload);
  const payload = asRecord(envelope?.payload);
  const authorization = asRecord(payload?.authorization);
  return asString(authorization?.nonce);
}
