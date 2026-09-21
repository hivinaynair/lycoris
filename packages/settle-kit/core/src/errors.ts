import { BaseError } from "viem";
import type { SettleError, SettleErrorCode } from "./types.ts";

/** Typed error thrown by Settle Kit. `code` is stable; `message` is buyer-facing copy. */
export class SettleKitError extends BaseError {
  readonly code: SettleErrorCode;

  constructor(code: SettleErrorCode, message: string) {
    super(message, { name: "SettleKitError" });
    this.code = code;
  }
}

export const USER_ERROR_CODES: readonly SettleErrorCode[] = [
  "insufficient_usdc",
  "expired",
  "wallet_rejected",
  "wallet_unavailable",
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
    // Prefer shortMessage so viem's version suffix is not shown to the buyer.
    return { code: error.code, message: error.shortMessage || error.message };
  }
  if (error && typeof error === "object" && "code" in error) {
    const { code: rawCode, message: rawMessage } = error as {
      code: unknown;
      message?: unknown;
    };
    const code = String(rawCode);
    if (code === "4001") return { code: "wallet_rejected", message: "Wallet request declined." };
    const message = typeof rawMessage === "string" ? rawMessage : code;
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
