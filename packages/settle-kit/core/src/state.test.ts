import { describe, expect, it } from "bun:test";
import { createCheckout } from "./create-checkout";
import { IDLE_STATE, reduce } from "./state";
import {
  BASE_SEPOLIA_CHAIN_ID,
  BASE_SEPOLIA_USDC_ADDRESS,
  type Destination,
  type Intent,
  type SettleAdapter,
} from "./types";

const destination: Destination = {
  targetChain: BASE_SEPOLIA_CHAIN_ID,
  targetAsset: BASE_SEPOLIA_USDC_ADDRESS,
  recipient: "0x1111111111111111111111111111111111111111",
};

const intent: Intent = {
  requestId: "q1",
  amount: "12.50",
  amountAtomic: "12500000",
  expiresAt: Date.now() + 60_000,
  method: "usdc",
};

function adapter(overrides: Partial<SettleAdapter> = {}): SettleAdapter {
  return {
    id: "usdc",
    confirm: async () => "success",
    prepare: async () => intent,
    settle: async () => "0xabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabca",
    ...overrides,
  };
}

describe("checkout reducer", () => {
  it("walks idle → settling → settled", () => {
    const settling = reduce(IDLE_STATE, { type: "SETTLING", amount: "12.50" });
    expect(settling.status).toBe("settling");

    const bound = reduce(settling, { type: "PREPARE_OK", intent, destination });
    expect(bound.status).toBe("settling");
    if (bound.status === "settling") {
      expect(bound.intent).toEqual(intent);
      expect(bound.destination).toEqual(destination);
    }

    const settled = reduce(bound, {
      type: "SETTLED",
      txHash: "0xabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabca",
    });
    expect(settled.status).toBe("settled");
    if (settled.status === "settled") {
      expect(settled.txHash.startsWith("0xabc")).toBe(true);
      expect(settled.intent).toEqual(intent);
    }
  });

  it("maps an expired intent to failed without settling", async () => {
    const checkout = createCheckout({
      destination,
      amount: "12.50",
      getSigner: async () => {
        throw new Error("signer should not be requested");
      },
      method: adapter({
        prepare: async () => ({ ...intent, expiresAt: Date.now() - 1 }),
      }),
    });

    await checkout.pay();
    const state = checkout.getState();
    expect(state.status).toBe("failed");
    if (state.status === "failed") {
      expect(state.error.code).toBe("expired");
    }
  });

  it("prepares and pays from idle in one call", async () => {
    const checkout = createCheckout({
      destination,
      amount: "12.50",
      getSigner: async () => ({
        address: "0x2222222222222222222222222222222222222222",
        sendTransaction: async () =>
          "0xabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabca",
      }),
      method: adapter(),
    });

    expect(checkout.getState().status).toBe("idle");
    await checkout.pay();
    expect(checkout.getState().status).toBe("settled");
  });
});
