import { parseUsdcAmount } from "./amounts";
import { assertDestination } from "./destination";
import { SettleKitError } from "./errors";
import { type Destination, type Quote, SETTLE_METHOD_IDS, type SettleMethodId } from "./types";

const isSettleMethodId = (value: unknown): value is SettleMethodId =>
  typeof value === "string" && (SETTLE_METHOD_IDS as readonly string[]).includes(value);

function sameDestination(a: Destination, b: Destination): boolean {
  return (
    a.targetChain === b.targetChain &&
    a.targetAsset.toLowerCase() === b.targetAsset.toLowerCase() &&
    a.recipient.toLowerCase() === b.recipient.toLowerCase()
  );
}

/**
 * Quotes are external data. Bind the display and transfer to the purchase request.
 *
 * `method` is the adapter the quote is being validated *for*. It used to be
 * pinned to the literal `"usdc"` here, which rejected every quote a
 * smart-account adapter produced — and, because the returned quote was rebuilt
 * with that same literal, silently renamed the ones it let through. Pass the
 * adapter's own id so a quote can only ever settle through the method that
 * issued it.
 */
export function validateQuote(
  value: unknown,
  amountUsdc: string,
  requested?: Destination,
  method?: SettleMethodId,
): Quote {
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
    !isSettleMethodId(body.method) ||
    (method !== undefined && body.method !== method)
  )
    throw invalid();
  try {
    const expected = parseUsdcAmount(amountUsdc);
    if (parseUsdcAmount(body.amountUsdc) !== expected || body.amountAtomic !== expected)
      throw invalid();
  } catch {
    throw invalid();
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
  return Object.freeze({
    requestId: body.requestId,
    amountUsdc: body.amountUsdc,
    amountAtomic: body.amountAtomic,
    expiresAt: body.expiresAt as number,
    method: body.method,
    ...(destination ? { destination } : {}),
  });
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
