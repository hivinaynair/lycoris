import { decodePaymentRequiredHeader, decodePaymentSignatureHeader } from "@x402/core/http";
import { wrapFetchWithPaymentFromConfig } from "@x402/fetch";
import type { PaidFetchScheme, ResourceChallenge } from "./types.ts";
import { challengeFromPaymentRequired, extractAuthorizationNonce } from "./x402-decode.ts";

export type PaidFetchFn = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
export type PaymentMetadata = { authorizationNonce?: string; challenge?: ResourceChallenge };
export type PaidFetch = PaidFetchFn & {
  /** Metadata for this `Response`. Concurrent calls do not share metadata. */
  getPaymentMetadata: (response: Response) => Readonly<PaymentMetadata> | undefined;
};
export type CreatePaidFetchOptions = {
  scheme: PaidFetchScheme;
  getMandateHeader?: () => string | Promise<string | undefined> | undefined;
  fetch?: PaidFetchFn;
};

/**
 * Wrap `fetch` to retry an x402 402 with a payment header.
 *
 * Optionally attaches `X-AP2-Mandate`. Query `getPaymentMetadata(response)` on
 * the returned response — never on a later call.
 */
export function createPaidFetch(options: CreatePaidFetchOptions): PaidFetch {
  const baseFetch = options.fetch ?? fetch;
  const metadataByResponse = new WeakMap<Response, Readonly<PaymentMetadata>>();
  const paid: PaidFetchFn = async (input, init) => {
    const request = new Request(input, init);
    const header = await options.getMandateHeader?.();
    if (header) request.headers.set("X-AP2-Mandate", header);
    const metadata: PaymentMetadata = {};
    const observingFetch: PaidFetchFn = async (retryInput, retryInit) => {
      const retry = new Request(retryInput, retryInit);
      const signature = retry.headers.get("PAYMENT-SIGNATURE") ?? retry.headers.get("X-PAYMENT");
      if (signature) {
        delete metadata.authorizationNonce;
        try {
          const nonce = extractAuthorizationNonce(decodePaymentSignatureHeader(signature));
          if (nonce !== undefined) metadata.authorizationNonce = nonce;
        } catch {
          // Leave nonce unset when the signature header cannot be decoded.
        }
      }
      const response = await baseFetch(retry);
      if (response.status === 402) {
        const required =
          response.headers.get("PAYMENT-REQUIRED") ?? response.headers.get("X-PAYMENT-REQUIRED");
        if (required) {
          delete metadata.challenge;
          try {
            metadata.challenge = challengeFromPaymentRequired(
              decodePaymentRequiredHeader(required),
            );
          } catch {
            // Leave challenge unset when the required header cannot be decoded.
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
          ...(options.scheme.x402Version !== undefined
            ? { x402Version: options.scheme.x402Version }
            : {}),
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
