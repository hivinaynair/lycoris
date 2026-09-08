import { decodePaymentRequiredHeader, decodePaymentResponseHeader } from "@x402/core/http";
import type { PaidFetch, PaidFetchFn } from "./create-paid-fetch";
import { explorerUrl } from "./quote-resource";
import type { AgentPaymentResult } from "./types";

function summarizeNonJsonResponse(url: string, response: Response, text: string) {
  const contentType = response.headers.get("content-type") ?? "unknown content type";
  const title = text
    .match(/<title[^>]*>(.*?)<\/title>/is)?.[1]
    ?.replace(/\s+/g, " ")
    .trim();

  if (
    contentType.includes("text/html") ||
    /^\s*<!doctype html/i.test(text) ||
    /^\s*<html/i.test(text)
  ) {
    return title
      ? `Upstream returned HTML for ${url} (${response.status} ${response.statusText}): ${title}`
      : `Upstream returned HTML for ${url} (${response.status} ${response.statusText})`;
  }

  const summary = text.replace(/\s+/g, " ").trim();
  return summary
    ? `Upstream returned ${response.status} ${response.statusText} for ${url}: ${summary.slice(0, 240)}`
    : `Upstream returned ${contentType} for ${url} (${response.status} ${response.statusText})`;
}

/** The error this exchange reported, from the challenge or the upstream body. */
function wireError(status: number, body: unknown, paymentRequiredError?: string) {
  if (paymentRequiredError) return paymentRequiredError;
  if (status < 400 || !body || typeof body !== "object" || !("error" in body)) return undefined;
  return body.error === undefined || body.error === null ? undefined : String(body.error);
}

export async function payForResource(input: {
  url: string;
  paidFetch: PaidFetch | PaidFetchFn;
}): Promise<AgentPaymentResult> {
  const response = await input.paidFetch(input.url);
  const paymentHeader = response.headers.get("PAYMENT-RESPONSE");
  const paymentRequiredHeader =
    response.headers.get("PAYMENT-REQUIRED") ?? response.headers.get("X-PAYMENT-REQUIRED");

  let txHash: string | undefined;
  let paymentRequiredError: string | undefined;
  if (paymentHeader) {
    const decoded = decodePaymentResponseHeader(paymentHeader) as Record<string, unknown>;
    txHash = (decoded.transaction as string | undefined) ?? (decoded.txHash as string | undefined);
  }
  if (paymentRequiredHeader) {
    const decoded = decodePaymentRequiredHeader(paymentRequiredHeader);
    paymentRequiredError = decoded.error;
  }

  let body: unknown;
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    body = await response.json();
  } else {
    const text = await response.text();
    body = { error: summarizeNonJsonResponse(input.url, response, text) };
  }

  const metadata =
    "getPaymentMetadata" in input.paidFetch
      ? input.paidFetch.getPaymentMetadata(response)
      : undefined;

  return {
    httpStatus: response.status,
    body,
    txHash,
    authorizationNonce: metadata?.authorizationNonce,
    error: wireError(response.status, body, paymentRequiredError),
    paymentRequiredError,
    basescan: explorerUrl(txHash),
    challenge: metadata?.challenge,
  };
}
