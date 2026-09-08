import { BASE_SEPOLIA_EXPLORER } from "@settle-kit/core";
import { decodePaymentRequiredHeader } from "@x402/core/http";
import { isAddress } from "viem";
import { asAmount, asRecord, asString } from "./decode";
import type { ResourceQuote } from "./types";
import { BASE_SEPOLIA_CAIP2, challengeFromPaymentRequired } from "./x402-decode";

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

  const accepts = Array.isArray(decoded.accepts) ? decoded.accepts.map(asRecord) : [];
  const terms =
    accepts.find((item) => asString(item?.network) === BASE_SEPOLIA_CAIP2) ??
    (asString(decoded.network) === BASE_SEPOLIA_CAIP2 ? decoded : undefined);

  const amount = asAmount(terms?.amount) ?? asAmount(decoded.maxAmountRequired);
  if (!amount) return undefined;

  // A third-party challenge is decoded, not asserted: accept any well-formed address.
  const payTo = asString(terms?.payTo);
  return {
    amountAtomic: amount,
    ...(payTo && isAddress(payTo, { strict: false }) ? { payTo } : {}),
    challenge: challengeFromPaymentRequired(decoded),
  };
}

export function explorerUrl(txHash?: string) {
  return txHash ? `${BASE_SEPOLIA_EXPLORER}/tx/${txHash}` : undefined;
}
