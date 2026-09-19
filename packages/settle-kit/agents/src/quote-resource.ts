import { BASE_SEPOLIA_EXPLORER } from "@settle-kit/core";
import { decodePaymentRequiredHeader } from "@x402/core/http";
import { asAddress, asAmount, asRecord, asString } from "./decode";
import type { ResourceQuote } from "./types";
import {
  BASE_SEPOLIA_CAIP2,
  challengeFromPaymentRequired,
  paymentRequiredHeader,
} from "./x402-decode";

export async function quoteResource(
  url: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ResourceQuote | undefined> {
  const response = await fetchImpl(url, { method: "GET" });
  if (response.status !== 402) return undefined;
  const header = paymentRequiredHeader(response.headers);
  if (!header) return undefined;

  const decoded = asRecord(decodePaymentRequiredHeader(header));
  if (!decoded) return undefined;

  const accepts = Array.isArray(decoded.accepts) ? decoded.accepts : [];
  let terms = accepts.map(asRecord).find((item) => asString(item?.network) === BASE_SEPOLIA_CAIP2);
  if (!terms && asString(decoded.network) === BASE_SEPOLIA_CAIP2) {
    terms = decoded;
  }

  const amount = asAmount(terms?.amount) ?? asAmount(decoded.maxAmountRequired);
  if (!amount) return undefined;

  const payTo = asAddress(terms?.payTo);
  const quote: ResourceQuote = {
    amountAtomic: amount,
    challenge: challengeFromPaymentRequired(decoded),
  };
  if (payTo) quote.payTo = payTo;
  return quote;
}

export function explorerUrl(txHash?: string) {
  return txHash ? `${BASE_SEPOLIA_EXPLORER}/tx/${txHash}` : undefined;
}
