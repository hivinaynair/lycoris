import { describe, expect, it } from "bun:test";
import { validateQuote } from "./quote-client";
import { BASE_SEPOLIA_USDC_ADDRESS, type Destination } from "./types";

const destination: Destination = {
  targetChain: 84532,
  targetAsset: BASE_SEPOLIA_USDC_ADDRESS,
  recipient: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
};
const body = (extra: Record<string, unknown> = {}) => ({
  requestId: "q",
  amount: "12.50",
  amountAtomic: "12500000",
  expiresAt: Date.now() + 60_000,
  method: "usdc",
  ...extra,
});

describe("validateQuote destination binding", () => {
  it("adopts the destination the server returned", () => {
    expect(validateQuote(body({ destination }), "12.50").destination).toEqual(destination);
  });

  it("accepts a server destination that matches the requested one, ignoring case", () => {
    const shouted = {
      ...destination,
      targetAsset: destination.targetAsset.toLowerCase() as Destination["targetAsset"],
      recipient: `0x${destination.recipient.slice(2).toUpperCase()}` as Destination["recipient"],
    };
    expect(validateQuote(body({ destination: shouted }), "12.50", destination).destination).toEqual(
      shouted,
    );
  });

  it("rejects a server destination that redirects the payment", () => {
    const attacker = {
      ...destination,
      recipient: "0x2222222222222222222222222222222222222222" as const,
    };
    expect(() => validateQuote(body({ destination: attacker }), "12.50", destination)).toThrow(
      /does not match/,
    );
  });

  it("rejects a malformed server destination as external data, not host config", () => {
    const bad = { ...destination, recipient: "0x0000000000000000000000000000000000000000" };
    try {
      validateQuote(body({ destination: bad }), "12.50");
      throw new Error("expected throw");
    } catch (error) {
      expect((error as { code: string }).code).toBe("transfer_failed");
    }
  });

  it("leaves destination undefined when the server omits it", () => {
    expect(validateQuote(body(), "12.50", destination).destination).toBeUndefined();
  });
});

describe("validateQuote method binding", () => {
  it("accepts a smart-account quote and keeps its id", () => {
    const quote = validateQuote(body({ method: "usdc-4337" }), "12.50");
    expect(quote.method).toBe("usdc-4337");
  });

  it("does not rename a quote to the default method", () => {
    expect(
      validateQuote(body({ method: "usdc-4337" }), "12.50", undefined, "usdc-4337").method,
    ).toBe("usdc-4337");
  });

  it("refuses a quote issued by a different method than the one settling it", () => {
    expect(() =>
      validateQuote(body({ method: "usdc" }), "12.50", undefined, "usdc-4337"),
    ).toThrow();
  });

  it("refuses a method id the SDK does not know", () => {
    expect(() => validateQuote(body({ method: "paypal" }), "12.50")).toThrow();
  });
});
