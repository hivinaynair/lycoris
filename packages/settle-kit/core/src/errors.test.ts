import { describe, expect, test } from "bun:test";
import { SettleKitError, toSettleError } from "./errors";

describe("SettleKitError", () => {
  test("keeps its code and stays an Error", () => {
    const error = new SettleKitError("quote_expired", "Quote expired");
    expect(error.code).toBe("quote_expired");
    expect(error).toBeInstanceOf(Error);
  });

  test("carries a docs path when given one", () => {
    const error = new SettleKitError("wrong_network", "Wrong chain", {
      docsPath: "/docs/errors#wrong-network",
    });
    expect(error.docsPath).toBe("/docs/errors#wrong-network");
  });

  test("round-trips through toSettleError with its code intact", () => {
    const error = new SettleKitError("insufficient_usdc", "Not enough USDC");
    expect(toSettleError(error).code).toBe("insufficient_usdc");
  });

  // BaseError composes `message`, and toSettleError string-matches it to spot a
  // rejected wallet. That detection must survive the rebase.
  test("still detects a rejected wallet from the message", () => {
    expect(toSettleError(new Error("User rejected the request")).code).toBe("wallet_rejected");
  });

  // BaseError appends "Version: viem@x.y.z" to `message`. Hosts render
  // SettleError.message straight to the buyer, so it must stay the copy we wrote.
  test("surfaces the message we wrote, with no version suffix", () => {
    const error = new SettleKitError("quote_expired", "Quote expired");
    expect(toSettleError(error).message).toBe("Quote expired");
  });

  test("never leaks viem's version into a buyer-facing message", () => {
    const error = new SettleKitError("transfer_failed", "The USDC transfer failed.");
    expect(toSettleError(error).message).not.toContain("Version:");
  });

  // BaseError assigns shortMessage verbatim, so an empty message leaves it "".
  // Falling back to `message` beats rendering an empty string at the buyer.
  test("falls back to the composed message when shortMessage is empty", () => {
    const error = new SettleKitError("transfer_failed", "");
    expect(toSettleError(error).message).toBe(error.message);
  });
});
