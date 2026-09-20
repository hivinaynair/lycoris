import { parseUsdcAmount } from "./amounts.ts";
import { assertDestination } from "./destination.ts";
import { SettleKitError } from "./errors.ts";
import { type Destination, type Quote, SETTLE_METHOD_IDS, type SettleMethodId } from "./types.ts";

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
 * Validate an untrusted quote against the purchase request.
 *
 * Display amount, atomic amount, method, and destination must match. Pass
 * `method` so a quote can only settle through the adapter that issued it.
 */
export function validateQuote(
  value: unknown,
  amount: string,
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
    typeof body.amount !== "string" ||
    typeof body.amountAtomic !== "string" ||
    !/^[1-9]\d*$/.test(body.amountAtomic) ||
    !Number.isSafeInteger(body.expiresAt) ||
    (body.expiresAt ?? 0) <= 0 ||
    !isSettleMethodId(body.method) ||
    (method !== undefined && body.method !== method)
  )
    throw invalid();
  try {
    const expected = parseUsdcAmount(amount);
    if (parseUsdcAmount(body.amount) !== expected || body.amountAtomic !== expected)
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
    amount: body.amount,
    amountAtomic: body.amountAtomic,
    expiresAt: body.expiresAt as number,
    method: body.method,
    ...(destination ? { destination } : {}),
  });
}
