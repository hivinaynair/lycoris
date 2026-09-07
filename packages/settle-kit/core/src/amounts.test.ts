import { describe, expect, it } from "bun:test";
import { formatUsdcAmount, parseUsdcAmount } from "./amounts.js";
import { SettleKitError } from "./errors.js";

describe("USDC amounts", () => {
  it("parses 12.50 to atomic units", () => {
    expect(parseUsdcAmount("12.50")).toBe("12500000");
  });

  it("formats atomic units as 12.50", () => {
    expect(formatUsdcAmount("12500000")).toBe("12.50");
  });

  it("rejects zero and invalid strings", () => {
    expect(() => parseUsdcAmount("0")).toThrow(SettleKitError);
    expect(() => parseUsdcAmount("abc")).toThrow(SettleKitError);
  });
});
