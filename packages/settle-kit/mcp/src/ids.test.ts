import { describe, expect, it } from "bun:test";
import { derivePaymentId } from "./ids";

const event = {
  agent: "0xaaaa000000000000000000000000000000000000",
  resource: "https://example.test/api/weather/public",
  amountAtomic: "100000",
  quoteNonce: "abc123",
};

describe("derivePaymentId", () => {
  it("is stable for the same business event", () => {
    expect(derivePaymentId(event)).toBe(derivePaymentId({ ...event }));
  });

  it("changes when the amount changes", () => {
    expect(derivePaymentId({ ...event, amountAtomic: "200000" })).not.toBe(derivePaymentId(event));
  });

  it("changes when the resource changes", () => {
    expect(derivePaymentId({ ...event, resource: "https://elsewhere.test/x" })).not.toBe(
      derivePaymentId(event),
    );
  });

  it("is prefixed", () => {
    expect(derivePaymentId(event)).toStartWith("pay_");
  });
});
