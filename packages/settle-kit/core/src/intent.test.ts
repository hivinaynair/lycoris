import { describe, expect, it } from "bun:test";
import { validateIntent } from "./intent";
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

describe("validateIntent destination binding", () => {
  it("adopts the destination the adapter returned", () => {
    expect(validateIntent(body({ destination }), "12.50").destination).toEqual(destination);
  });

  it("accepts an adapter destination that matches the requested one, ignoring case", () => {
    const shouted = {
      ...destination,
      targetAsset: destination.targetAsset.toLowerCase() as Destination["targetAsset"],
      recipient: `0x${destination.recipient.slice(2).toUpperCase()}` as Destination["recipient"],
    };
    expect(
      validateIntent(body({ destination: shouted }), "12.50", destination).destination,
    ).toEqual(shouted);
  });

  it("rejects an adapter destination that redirects the payment", () => {
    const attacker = {
      ...destination,
      recipient: "0x2222222222222222222222222222222222222222" as const,
    };
    expect(() => validateIntent(body({ destination: attacker }), "12.50", destination)).toThrow(
      /does not match/,
    );
  });

  it("rejects a malformed adapter destination as external data, not host config", () => {
    const bad = { ...destination, recipient: "0x0000000000000000000000000000000000000000" };
    try {
      validateIntent(body({ destination: bad }), "12.50");
      throw new Error("expected throw");
    } catch (error) {
      expect((error as { code: string }).code).toBe("transfer_failed");
    }
  });

  it("leaves destination undefined when the adapter omits it", () => {
    expect(validateIntent(body(), "12.50", destination).destination).toBeUndefined();
  });
});

describe("validateIntent method binding", () => {
  it("accepts a smart-account intent and keeps its id", () => {
    const intent = validateIntent(body({ method: "usdc-4337" }), "12.50");
    expect(intent.method).toBe("usdc-4337");
  });

  it("does not rename an intent to the default method", () => {
    expect(
      validateIntent(body({ method: "usdc-4337" }), "12.50", undefined, "usdc-4337").method,
    ).toBe("usdc-4337");
  });

  it("refuses an intent issued by a different method than the one settling it", () => {
    expect(() =>
      validateIntent(body({ method: "usdc" }), "12.50", undefined, "usdc-4337"),
    ).toThrow();
  });

  it("refuses a method id the SDK does not know", () => {
    expect(() => validateIntent(body({ method: "paypal" }), "12.50")).toThrow();
  });
});
