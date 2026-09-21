import { describe, expect, test } from "bun:test";
import { createCheckout } from "./create-checkout";
import { createUsdcMethod } from "./methods/usdc";
import {
  BASE_SEPOLIA_CHAIN_ID,
  BASE_SEPOLIA_USDC_ADDRESS,
  type Destination,
  type SettleAdapter,
  type SettlementHash,
} from "./types";

const hash = "0xabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabca" as SettlementHash;

const getSigner = async () => ({
  address: "0x1111111111111111111111111111111111111111" as const,
  sendTransaction: async () => hash,
});

const destination: Destination = {
  targetChain: BASE_SEPOLIA_CHAIN_ID,
  targetAsset: BASE_SEPOLIA_USDC_ADDRESS,
  recipient: "0x1111111111111111111111111111111111111111",
};

function mockMethod(id: SettleAdapter["id"] = "usdc"): SettleAdapter {
  return {
    id,
    prepare: async ({ amount }) => ({
      requestId: "q",
      amount,
      amountAtomic: "100000",
      expiresAt: Date.now() + 60_000,
      method: id,
    }),
    settle: async () => hash,
    confirm: async () => "success",
  };
}

function session(method?: SettleAdapter) {
  return createCheckout({
    getSigner,
    destination,
    amount: "0.10",
    ...(method ? { method } : {}),
  });
}

describe("createCheckout config", () => {
  test("defaults to a single USDC method", async () => {
    const checkout = session(mockMethod());
    await checkout.pay();
    const state = checkout.getState();
    expect(state.status).toBe("settled");
    if (state.status === "settled") expect(state.intent.method).toBe("usdc");
  });

  test("accepts a smart-account method", async () => {
    const checkout = session(mockMethod("usdc-4337"));
    await checkout.pay();
    const state = checkout.getState();
    expect(state.status).toBe("settled");
    if (state.status === "settled") expect(state.intent.method).toBe("usdc-4337");
  });

  test("refuses an unknown method id", () => {
    const method = { ...createUsdcMethod(), id: "paypal" } as unknown as SettleAdapter;
    expect(() => session(method)).toThrow(/Unknown payment/);
  });

  test("refuses an incomplete adapter", () => {
    const method = { id: "usdc", prepare: () => {} } as unknown as SettleAdapter;
    expect(() => session(method)).toThrow(/needs prepare/);
  });
});
