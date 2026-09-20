import { BASE_SEPOLIA_CAIP2 } from "@settle-kit/core";
import { decodePaymentRequiredHeader } from "@x402/core/http";
import { asAddress, asAmount, asRecord, asString } from "./decode.ts";
import type { ResourceQuote } from "./types.ts";
import { challengeFromPaymentRequired } from "./x402-decode.ts";

/**
 * Discover x402 terms for a URL without paying.
 *
 * Returns `undefined` when the resource is not gated (no 402).
 */
export async function quoteResource(
  url: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ResourceQuote | undefined> {
  const response = await fetchImpl(url, { method: "GET" });
  if (response.status !== 402) return undefined;
  const header =
    response.headers.get("PAYMENT-REQUIRED") ?? response.headers.get("X-PAYMENT-REQUIRED");
  if (!header) return undefined;

  const decoded = asRecord(decodePaymentRequiredHeader(header));
  if (!decoded) return undefined;

  const accepts: unknown[] = Array.isArray(decoded.accepts) ? decoded.accepts : [];
  const terms =
    accepts.map(asRecord).find((item) => asString(item?.network) === BASE_SEPOLIA_CAIP2) ??
    (asString(decoded.network) === BASE_SEPOLIA_CAIP2 ? decoded : undefined);

  const amount = asAmount(terms?.amount) ?? asAmount(decoded.maxAmountRequired);
  if (!amount) return undefined;

  const payTo = asAddress(terms?.payTo);
  return {
    amountAtomic: amount,
    ...(payTo ? { payTo } : {}),
    challenge: challengeFromPaymentRequired(decoded),
  };
}
