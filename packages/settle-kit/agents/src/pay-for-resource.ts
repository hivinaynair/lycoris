import { decodePaymentRequiredHeader, decodePaymentResponseHeader } from "@x402/core/http";
import type { PaidFetch, PaidFetchFn } from "./create-paid-fetch";
import { asRecord, asString } from "./decode";
import { explorerUrl } from "./quote-resource";
import type { AgentPaymentResult } from "./types";
import { challengeFromPaymentRequired, paymentRequiredHeader } from "./x402-decode";

function summarizeNonJsonResponse(url: string, response: Response, text: string) {
  const contentType = response.headers.get("content-type") ?? "unknown content type";
  const status = `${response.status} ${response.statusText}`;
  const looksLikeHtml =
    contentType.includes("text/html") ||
    /^\s*<!doctype html/i.test(text) ||
    /^\s*<html/i.test(text);

  if (looksLikeHtml) {
    const title = text
      .match(/<title[^>]*>(.*?)<\/title>/is)?.[1]
      ?.replace(/\s+/g, " ")
      .trim();
    if (title) return `Upstream returned HTML for ${url} (${status}): ${title}`;
    return `Upstream returned HTML for ${url} (${status})`;
  }

  const summary = text.replace(/\s+/g, " ").trim();
  if (summary) {
    return `Upstream returned ${status} for ${url}: ${summary.slice(0, 240)}`;
  }
  return `Upstream returned ${contentType} for ${url} (${status})`;
}

/** The error this exchange reported, from the challenge or the upstream body. */
function wireError(status: number, body: unknown, challengeError?: string) {
  if (challengeError) return challengeError;
  if (status < 400) return undefined;
  const error = asRecord(body)?.error;
  if (error === undefined || error === null) return undefined;
  return String(error);
}

export async function payForResource(input: {
  url: string;
  paidFetch: PaidFetch | PaidFetchFn;
}): Promise<AgentPaymentResult> {
  const response = await input.paidFetch(input.url);
  const paymentHeader = response.headers.get("PAYMENT-RESPONSE");
  const requiredHeader = paymentRequiredHeader(response.headers);

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

  const metadata =
    "getPaymentMetadata" in input.paidFetch
      ? input.paidFetch.getPaymentMetadata(response)
      : undefined;
  let challenge = metadata?.challenge;
  if (challenge === undefined && requiredHeader) {
    challenge = challengeFromPaymentRequired(decodePaymentRequiredHeader(requiredHeader));
  }

  return {
    httpStatus: response.status,
    body,
    txHash,
    authorizationNonce: metadata?.authorizationNonce,
    error: wireError(response.status, body, challenge?.error),
    basescan: explorerUrl(txHash),
    challenge,
  };
}
