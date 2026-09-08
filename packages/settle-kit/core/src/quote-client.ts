import { parseUsdcAmount } from "./amounts";
import { SettleKitError } from "./errors";
import type { Destination, Quote } from "./types";

/** Quotes are external data. Bind the display and transfer to the purchase request. */
export function validateQuote(value: unknown, amountUsdc: string): Quote {
  const invalid = () =>
    new SettleKitError("transfer_failed", "Quote does not match the requested USDC amount");
  if (!value || typeof value !== "object") throw invalid();
  const body = value as Partial<Quote>;
  if (
    typeof body.requestId !== "string" ||
    !body.requestId.trim() ||
    typeof body.amountUsdc !== "string" ||
    typeof body.amountAtomic !== "string" ||
    !/^[1-9]\d*$/.test(body.amountAtomic) ||
    !Number.isSafeInteger(body.expiresAt) ||
    (body.expiresAt ?? 0) <= 0 ||
    body.method !== "usdc"
  )
    throw invalid();
  try {
    const expected = parseUsdcAmount(amountUsdc);
    if (parseUsdcAmount(body.amountUsdc) !== expected || body.amountAtomic !== expected)
      throw invalid();
  } catch {
    throw invalid();
  }
  return Object.freeze({
    requestId: body.requestId,
    amountUsdc: body.amountUsdc,
    amountAtomic: body.amountAtomic,
    expiresAt: body.expiresAt as number,
    method: "usdc",
  });
}

export async function fetchQuote(
  quoteUrl: string,
  input: { amountUsdc: string; destination: Destination; method: "usdc" },
): Promise<Quote> {
  const response = await fetch(quoteUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error(`Quote request failed (${response.status})`);
  return validateQuote(await response.json(), input.amountUsdc);
}
