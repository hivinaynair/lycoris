import { decodePaymentRequiredHeader, decodePaymentSignatureHeader } from "@x402/core/http";
import { wrapFetchWithPaymentFromConfig } from "@x402/fetch";
import type { PaidFetchScheme, ResourceChallenge } from "./types";
import { challengeFromPaymentRequired, extractAuthorizationNonce } from "./x402-decode";

export type PaidFetchFn = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
export type PaymentMetadata = { authorizationNonce?: string; challenge?: ResourceChallenge };
export type PaidFetch = PaidFetchFn & {
  /** Metadata belongs to this response, never to the most recent call. */
  getPaymentMetadata: (response: Response) => Readonly<PaymentMetadata> | undefined;
};
export type CreatePaidFetchOptions = {
  scheme: PaidFetchScheme;
  getMandateHeader?: () => string | Promise<string | undefined> | undefined;
  fetch?: PaidFetchFn;
};

export function createPaidFetch(options: CreatePaidFetchOptions): PaidFetch {
  const baseFetch = options.fetch ?? fetch;
  const metadataByResponse = new WeakMap<Response, Readonly<PaymentMetadata>>();
  const paid: PaidFetchFn = async (input, init) => {
    const request = new Request(input, init);
    const header = await options.getMandateHeader?.();
    if (header) request.headers.set("X-AP2-Mandate", header);
    const metadata: PaymentMetadata = {};
    // One observer per call keeps challenge/signature data isolated during retries and concurrency.
    const observingFetch: PaidFetchFn = async (retryInput, retryInit) => {
      const retry = new Request(retryInput, retryInit);
      const signature = retry.headers.get("PAYMENT-SIGNATURE") ?? retry.headers.get("X-PAYMENT");
      if (signature) {
        try {
          metadata.authorizationNonce = extractAuthorizationNonce(
            decodePaymentSignatureHeader(signature),
          );
        } catch {
          metadata.authorizationNonce = undefined;
        }
      }
      const response = await baseFetch(retry);
      if (response.status === 402) {
        const required =
          response.headers.get("PAYMENT-REQUIRED") ?? response.headers.get("X-PAYMENT-REQUIRED");
        if (required) {
          try {
            metadata.challenge = challengeFromPaymentRequired(
              decodePaymentRequiredHeader(required) as Record<string, unknown>,
            );
          } catch {
            metadata.challenge = undefined;
          }
        }
      }
      return response;
    };
    const wrapped = wrapFetchWithPaymentFromConfig(observingFetch as typeof fetch, {
      schemes: [
        {
          network: options.scheme.network as `${string}:${string}`,
          client: options.scheme.client as never,
          x402Version: options.scheme.x402Version,
        },
      ],
    });
    const response = await wrapped(request);
    metadataByResponse.set(response, Object.freeze(metadata));
    return response;
  };
  return Object.assign(paid, {
    getPaymentMetadata: (response: Response) => metadataByResponse.get(response),
  });
}
