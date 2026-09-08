import { decodePaymentRequiredHeader, decodePaymentSignatureHeader } from "@x402/core/http";
import { wrapFetchWithPaymentFromConfig } from "@x402/fetch";
import type { PaidFetchScheme, ResourceChallenge } from "./types";
import { challengeFromPaymentRequired, extractAuthorizationNonce } from "./x402-decode";

export type PaidFetchFn = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export type PaidFetch = PaidFetchFn & {
  lastAuthorizationNonce?: string;
  lastChallenge?: ResourceChallenge;
};

export type CreatePaidFetchOptions = {
  scheme: PaidFetchScheme;
  getMandateHeader?: () => string | Promise<string | undefined> | undefined;
  fetch?: PaidFetchFn;
};

export function createPaidFetch(options: CreatePaidFetchOptions): PaidFetch {
  const baseFetch = options.fetch ?? fetch;
  let fetchWithPayment: PaidFetchFn = baseFetch;

  const paid: PaidFetch = async (input, init) => {
    const header = await options.getMandateHeader?.();
    if (!header) return fetchWithPayment(input, init);
    const headers = new Headers(init?.headers);
    headers.set("X-AP2-Mandate", header);
    return fetchWithPayment(input, { ...init, headers });
  };

  const observingFetch: PaidFetchFn = async (input, init) => {
    const request = new Request(input, init);
    const paymentSignature =
      request.headers.get("PAYMENT-SIGNATURE") ?? request.headers.get("X-PAYMENT");
    if (paymentSignature) {
      try {
        paid.lastAuthorizationNonce = extractAuthorizationNonce(
          decodePaymentSignatureHeader(paymentSignature),
        );
      } catch {
        paid.lastAuthorizationNonce = undefined;
      }
    }
    const response = await baseFetch(request);
    if (response.status === 402) {
      const header =
        response.headers.get("PAYMENT-REQUIRED") ?? response.headers.get("X-PAYMENT-REQUIRED");
      if (header) {
        try {
          paid.lastChallenge = challengeFromPaymentRequired(
            decodePaymentRequiredHeader(header) as Record<string, unknown>,
          );
        } catch {
          /* ignore decode errors */
        }
      }
    }
    return response;
  };

  fetchWithPayment = wrapFetchWithPaymentFromConfig(observingFetch as typeof fetch, {
    schemes: [
      {
        network: options.scheme.network as `${string}:${string}`,
        client: options.scheme.client as never,
        x402Version: options.scheme.x402Version,
      },
    ],
  });

  return paid;
}
