import { describe, expect, it } from "bun:test";
import { toMoney } from "./money";

describe("toMoney", () => {
  it("carries decimal, atomic, currency and display together", () => {
    expect(toMoney("100000")).toEqual({
      decimal: "0.10",
      atomic: "100000",
      currency: "USDC",
      display: "0.10 USDC",
    });
  });

  it("never emits a number", () => {
    const money = toMoney("100000");
    for (const value of Object.values(money)) expect(typeof value).toBe("string");
  });

  it("rejects an amount that is not atomic units", () => {
    expect(() => toMoney("0.1")).toThrow();
  });
});
