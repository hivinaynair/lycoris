import { BASE_SEPOLIA_EXPLORER } from "@settle-kit/core";
import { decodePaymentRequiredHeader } from "@x402/core/http";
import type { ResourceQuote } from "./types.js";
import { BASE_SEPOLIA_CAIP2, challengeFromPaymentRequired } from "./x402-decode.js";

export async function quoteResource(
  url: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ResourceQuote | undefined> {
  const response = await fetchImpl(url, { method: "GET" });
  if (response.status !== 402) return undefined;
  const header =
    response.headers.get("PAYMENT-REQUIRED") ?? response.headers.get("X-PAYMENT-REQUIRED");
  if (!header) return undefined;

  const decoded = decodePaymentRequiredHeader(header) as {
    accepts?: Array<{ network?: string; amount?: string; payTo?: string }>;
    scheme?: string;
    network?: string;
    maxAmountRequired?: string;
    resource?: unknown;
    description?: string;
  };

  const terms =
    (decoded.accepts ?? []).find((item) => item.network === BASE_SEPOLIA_CAIP2) ??
    (decoded.network === BASE_SEPOLIA_CAIP2 ? decoded : undefined);
  const amount = terms && "amount" in terms ? terms.amount : decoded.maxAmountRequired;
  const payTo = terms && "payTo" in terms ? terms.payTo : undefined;
  if (!amount) return undefined;

  return {
    amountAtomic: amount,
    payTo: typeof payTo === "string" ? payTo : "",
    challenge: challengeFromPaymentRequired(decoded as Record<string, unknown>),
  };
}

export function explorerUrl(txHash?: string) {
  return txHash ? `${BASE_SEPOLIA_EXPLORER}/tx/${txHash}` : undefined;
}
