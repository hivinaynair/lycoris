import { parseUsdcAmount } from "./amounts";
import { assertDestination } from "./destination";
import { SettleKitError } from "./errors";
import { type Destination, type Quote, SETTLE_METHOD_IDS, type SettleMethodId } from "./types";

function isSettleMethodId(value: unknown): value is SettleMethodId {
  return typeof value === "string" && (SETTLE_METHOD_IDS as readonly string[]).includes(value);
}

function sameDestination(a: Destination, b: Destination): boolean {
  return (
    a.targetChain === b.targetChain &&
    a.targetAsset.toLowerCase() === b.targetAsset.toLowerCase() &&
    a.recipient.toLowerCase() === b.recipient.toLowerCase()
  );
}

function mismatchedQuote(): never {
  throw new SettleKitError("transfer_failed", "Quote does not match the requested USDC amount");
}

/**
 * Quotes are external data. Bind the display and transfer to the purchase request.
 * `method` is the adapter this quote must settle through; a mismatch is rejected,
 * never renamed.
 */
export function validateQuote(
  value: unknown,
  amountUsdc: string,
  requested?: Destination,
  method?: SettleMethodId,
): Quote {
  if (!value || typeof value !== "object") mismatchedQuote();
  const body = value as Partial<Quote>;
  if (typeof body.requestId !== "string" || !body.requestId.trim()) mismatchedQuote();
  if (typeof body.amountUsdc !== "string") mismatchedQuote();
  if (typeof body.amountAtomic !== "string" || !/^[1-9]\d*$/.test(body.amountAtomic)) {
    mismatchedQuote();
  }
  if (!Number.isSafeInteger(body.expiresAt) || (body.expiresAt ?? 0) <= 0) mismatchedQuote();
  if (!isSettleMethodId(body.method)) mismatchedQuote();
  if (method !== undefined && body.method !== method) mismatchedQuote();
  try {
    const expected = parseUsdcAmount(amountUsdc);
    if (parseUsdcAmount(body.amountUsdc) !== expected || body.amountAtomic !== expected) {
      mismatchedQuote();
    }
  } catch {
    mismatchedQuote();
  }
  let destination: Destination | undefined;
  if (body.destination !== undefined) {
    try {
      destination = assertDestination(body.destination);
    } catch {
      throw new SettleKitError(
        "transfer_failed",
        "Quote destination is not a valid Base Sepolia USDC recipient",
      );
    }
    if (requested && !sameDestination(destination, requested)) {
      throw new SettleKitError(
        "transfer_failed",
        "Quote destination does not match the requested recipient",
      );
    }
  }
  const quote: Quote = {
    requestId: body.requestId,
    amountUsdc: body.amountUsdc,
    amountAtomic: body.amountAtomic,
    expiresAt: body.expiresAt as number,
    method: body.method,
  };
  if (destination) quote.destination = destination;
  return Object.freeze(quote);
}

export async function fetchQuote(
  quoteUrl: string,
  input: { amountUsdc: string; destination?: Destination | undefined; method: SettleMethodId },
): Promise<Quote> {
  const response = await fetch(quoteUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error(`Quote request failed (${response.status})`);
  return validateQuote(await response.json(), input.amountUsdc, input.destination, input.method);
}
