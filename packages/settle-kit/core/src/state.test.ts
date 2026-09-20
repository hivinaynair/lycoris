import { describe, expect, it } from "bun:test";
import { createCheckout } from "./create-checkout";
import { IDLE_STATE, reduce } from "./state";
import {
  BASE_SEPOLIA_CHAIN_ID,
  BASE_SEPOLIA_USDC_ADDRESS,
  type Destination,
  type Quote,
  type SettleAdapter,
} from "./types";

const destination: Destination = {
  targetChain: BASE_SEPOLIA_CHAIN_ID,
  targetAsset: BASE_SEPOLIA_USDC_ADDRESS,
  recipient: "0x1111111111111111111111111111111111111111",
};

const quote: Quote = {
  requestId: "q1",
  amountUsdc: "12.50",
  amountAtomic: "12500000",
  expiresAt: Date.now() + 60_000,
  method: "usdc",
};

function adapter(overrides: Partial<SettleAdapter> = {}): SettleAdapter {
  return {
    id: "usdc",
    confirm: async () => "success",
    quote: async () => quote,
    settle: async () => "0xabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabca",
    ...overrides,
  };
}

describe("checkout reducer", () => {
  it("walks idle → quoting → awaiting_payment → settling → settled", () => {
    const quoting = reduce(IDLE_STATE, { type: "QUOTING", amountUsdc: "12.50" });
    expect(quoting.status).toBe("quoting");

    const awaiting = reduce(quoting, { type: "QUOTE_OK", quote, destination });
    expect(awaiting.status).toBe("awaiting_payment");

    const settling = reduce(awaiting, { type: "SETTLING" });
    expect(settling.status).toBe("settling");

    const settled = reduce(settling, {
      type: "SETTLED",
      txHash: "0xabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabca",
    });
    expect(settled.status).toBe("settled");
    if (settled.status === "settled") {
      expect(settled.txHash.startsWith("0xabc")).toBe(true);
    }
  });

  it("maps an expired quote to failed without settling", async () => {
    const checkout = createCheckout({
      destination,
      amountUsdc: "12.50",
      getSigner: async () => {
        throw new Error("signer should not be requested");
      },
      methods: [
        adapter({
          quote: async () => ({ ...quote, expiresAt: Date.now() - 1 }),
        }),
      ],
    });

    await checkout.pay();
    const state = checkout.getState();
    expect(state.status).toBe("failed");
    if (state.status === "failed") {
      expect(state.error.code).toBe("quote_expired");
    }
  });

  it("quotes and pays from idle in one call", async () => {
    const checkout = createCheckout({
      destination,
      amountUsdc: "12.50",
      getSigner: async () => ({
        address: "0x2222222222222222222222222222222222222222",
        sendTransaction: async () =>
          "0xabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabca",
      }),
      methods: [adapter()],
    });

    expect(checkout.getState().status).toBe("idle");
    await checkout.pay();
    expect(checkout.getState().status).toBe("settled");
  });

  it("reaches settled through quote then pay", async () => {
    const checkout = createCheckout({
      destination,
      amountUsdc: "12.50",
      getSigner: async () => ({
        address: "0x2222222222222222222222222222222222222222",
        sendTransaction: async () =>
          "0xabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabca",
      }),
      methods: [adapter()],
    });

    await checkout.quote();
    await checkout.pay();
    const state = checkout.getState();
    expect(state.status).toBe("settled");
  });
});
