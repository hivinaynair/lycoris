import { parseUsdcAmount } from "./amounts.js";
import type { Destination, Quote } from "./types.js";

export async function fetchQuote(
  quoteUrl: string,
  input: { amountUsdc: string; destination: Destination; method: "usdc" },
): Promise<Quote> {
  const response = await fetch(quoteUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error(`Quote request failed (${response.status})`);
  }
  const body = (await response.json()) as Partial<Quote>;
  if (
    typeof body.requestId !== "string" ||
    typeof body.amountUsdc !== "string" ||
    typeof body.amountAtomic !== "string" ||
    typeof body.expiresAt !== "number" ||
    body.method !== "usdc"
  ) {
    throw new Error("Quote response is missing required fields");
  }
  parseUsdcAmount(body.amountUsdc);
  return {
    requestId: body.requestId,
    amountUsdc: body.amountUsdc,
    amountAtomic: body.amountAtomic,
    expiresAt: body.expiresAt,
    method: "usdc",
  };
}
