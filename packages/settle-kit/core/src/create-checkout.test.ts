import { describe, expect, test } from "bun:test";
import { createCheckout } from "./create-checkout";
import { createUsdcMethod } from "./methods/usdc";
import { BASE_SEPOLIA_CHAIN_ID, BASE_SEPOLIA_USDC_ADDRESS, type SettleAdapter } from "./types";

const getSigner = async () => ({
  address: "0x1111111111111111111111111111111111111111" as const,
  sendTransaction: async () => "0xabc" as const,
});

const destination = {
  targetChain: BASE_SEPOLIA_CHAIN_ID,
  targetAsset: BASE_SEPOLIA_USDC_ADDRESS,
  recipient: "0x1111111111111111111111111111111111111111" as const,
};

function session(methods?: SettleAdapter[]) {
  return createCheckout({
    getSigner,
    destination,
    amountUsdc: "0.10",
    ...(methods ? { methods } : {}),
  });
}

describe("createCheckout config", () => {
  test("defaults to a single USDC method", async () => {
    const checkout = session();
    await checkout.quote();
    const state = checkout.getState();
    expect(state.status).toBe("awaiting_payment");
    if (state.status === "awaiting_payment") expect(state.quote.method).toBe("usdc");
  });

  test("accepts a smart-account method", async () => {
    const checkout = session([createUsdcMethod({ id: "usdc-4337" })]);
    await checkout.quote();
    const state = checkout.getState();
    expect(state.status).toBe("awaiting_payment");
    if (state.status === "awaiting_payment") expect(state.quote.method).toBe("usdc-4337");
  });

  test("refuses a second method", () => {
    const methods = [createUsdcMethod(), createUsdcMethod({ id: "usdc-4337" })];
    expect(() => session(methods)).toThrow(/one payment method/);
  });

  test("refuses an unknown method id", () => {
    const method = { ...createUsdcMethod(), id: "paypal" } as unknown as SettleAdapter;
    expect(() => session([method])).toThrow(/Unknown payment/);
  });

  test("refuses an incomplete adapter", () => {
    const method = { id: "usdc", quote: () => {} } as unknown as SettleAdapter;
    expect(() => session([method])).toThrow(/needs quote/);
  });

  test("refuses an empty methods array", () => {
    expect(() => session([])).toThrow(/at least one/);
  });
});
