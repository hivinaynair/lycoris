import { decodePaymentRequiredHeader, decodePaymentResponseHeader } from "@x402/core/http";
import type { PaidFetch } from "./create-paid-fetch.ts";
import { asRecord, asString } from "./decode.ts";
import type { AgentPaymentResult } from "./types.ts";
import { challengeFromPaymentRequired } from "./x402-decode.ts";

function summarizeNonJsonResponse(url: string, response: Response, text: string) {
  const summary = text.replace(/\s+/g, " ").trim().slice(0, 240);
  return summary
    ? `Upstream returned ${response.status} ${response.statusText} for ${url}: ${summary}`
    : `Upstream returned ${response.status} ${response.statusText} for ${url}`;
}

function wireError(status: number, body: unknown, challengeError?: string) {
  if (challengeError) return challengeError;
  if (status < 400) return undefined;
  const error = asRecord(body)?.error;
  return error === undefined || error === null ? undefined : String(error);
}

/**
 * Fetch a URL with `paidFetch` and return settlement metadata.
 *
 * Uses response-scoped metadata from `createPaidFetch`.
 */
export async function payForResource(input: {
  url: string;
  paidFetch: PaidFetch;
}): Promise<AgentPaymentResult> {
  const response = await input.paidFetch(input.url);
  const paymentHeader = response.headers.get("PAYMENT-RESPONSE");
  const paymentRequiredHeader =
    response.headers.get("PAYMENT-REQUIRED") ?? response.headers.get("X-PAYMENT-REQUIRED");

  let txHash: string | undefined;
  if (paymentHeader) {
    const decoded = asRecord(decodePaymentResponseHeader(paymentHeader));
    txHash = asString(decoded?.transaction) ?? asString(decoded?.txHash);
  }

  let body: unknown;
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    body = await response.json();
  } else {
    const text = await response.text();
    body = { error: summarizeNonJsonResponse(input.url, response, text) };
  }

  const metadata = input.paidFetch.getPaymentMetadata(response);
  const challenge =
    metadata?.challenge ??
    (paymentRequiredHeader
      ? challengeFromPaymentRequired(decodePaymentRequiredHeader(paymentRequiredHeader))
      : undefined);

  return {
    httpStatus: response.status,
    body,
    txHash,
    authorizationNonce: metadata?.authorizationNonce,
    error: wireError(response.status, body, challenge?.error),
    challenge,
  };
}
