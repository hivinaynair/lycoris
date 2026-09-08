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
  amountUsdc: "12.50",
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
    expect(
      validateQuote(body({ destination: shouted }), "12.50", destination).destination,
    ).toBeDefined();
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
