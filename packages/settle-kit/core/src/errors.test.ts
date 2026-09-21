import { describe, expect, test } from "bun:test";
import { SettleKitError, toSettleError } from "./errors";

describe("SettleKitError", () => {
  test("keeps its code and stays an Error", () => {
    const error = new SettleKitError("expired", "Payment expired");
    expect(error.code).toBe("expired");
    expect(error).toBeInstanceOf(Error);
  });

  test("round-trips through toSettleError with its code intact", () => {
    const error = new SettleKitError("insufficient_usdc", "Not enough USDC");
    expect(toSettleError(error).code).toBe("insufficient_usdc");
  });

  test("still detects a rejected wallet from the message", () => {
    expect(toSettleError(new Error("User rejected the request")).code).toBe("wallet_rejected");
  });

  test("surfaces the constructor message, with no version suffix", () => {
    const error = new SettleKitError("expired", "Payment expired");
    expect(toSettleError(error).message).toBe("Payment expired");
  });

  test("never leaks viem's version into a buyer-facing message", () => {
    const error = new SettleKitError("transfer_failed", "The USDC transfer failed.");
    expect(toSettleError(error).message).not.toContain("Version:");
  });

  test("falls back to the composed message when shortMessage is empty", () => {
    const error = new SettleKitError("transfer_failed", "");
    expect(toSettleError(error).message).toBe(error.message);
  });
});
