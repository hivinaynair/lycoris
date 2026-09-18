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
});
