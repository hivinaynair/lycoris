import type { SettleError, SettleErrorCode } from "./types";

export class SettleKitError extends Error {
  readonly code: SettleErrorCode;

  constructor(code: SettleErrorCode, message: string) {
    super(message);
    this.name = "SettleKitError";
    this.code = code;
  }
}

export const USER_ERROR_CODES: readonly SettleErrorCode[] = [
  "insufficient_usdc",
  "quote_expired",
  "wallet_rejected",
  "wrong_network",
  "transfer_failed",
];

export function isUserErrorCode(code: string): code is Exclude<SettleErrorCode, "invalid_config"> {
  return (USER_ERROR_CODES as readonly string[]).includes(code);
}

export function toSettleError(
  error: unknown,
  fallback: SettleErrorCode = "transfer_failed",
): SettleError {
  if (error instanceof SettleKitError) {
    return { code: error.code, message: error.message };
  }
  if (error && typeof error === "object" && "code" in error) {
    const code = String((error as { code: unknown }).code);
    const message =
      "message" in error && typeof (error as { message: unknown }).message === "string"
        ? (error as { message: string }).message
        : code;
    if (isUserErrorCode(code) || code === "invalid_config") {
      return { code, message };
    }
  }

  const message = error instanceof Error ? error.message : String(error);
  const lowered = message.toLowerCase();
  if (
    lowered.includes("user rejected") ||
    lowered.includes("user denied") ||
    lowered.includes("rejected the request")
  ) {
    return { code: "wallet_rejected", message };
  }
  return { code: fallback, message };
}

export function invalidConfig(message: string): never {
  throw new SettleKitError("invalid_config", message);
}
