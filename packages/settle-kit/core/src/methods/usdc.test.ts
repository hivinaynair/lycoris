import { describe, expect, it } from "bun:test";
import { createCheckout } from "../create-checkout.js";
import { createSettleConfig } from "../create-settle-config.js";
import { SettleKitError } from "../errors.js";
import {
  BASE_SEPOLIA_CHAIN_ID,
  BASE_SEPOLIA_USDC_ADDRESS,
  type Destination,
  type PaymentSigner,
  type Quote,
} from "../types.js";
import { createUsdcMethod } from "./usdc.js";

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

describe("createUsdcMethod", () => {
  it("does not send a transfer when balanceOf is short", async () => {
    let sent = false;
    const signer: PaymentSigner = {
      address: "0x2222222222222222222222222222222222222222",
      sendTransaction: async () => {
        sent = true;
        return "0xabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabca";
      },
    };

    const method = createUsdcMethod({
      client: {
        readContract: async () => 1_000_000n,
      },
    });

    try {
      await method.settle({ quote, destination, signer });
      throw new Error("expected insufficient_usdc");
    } catch (error) {
      expect(error).toBeInstanceOf(SettleKitError);
      expect((error as SettleKitError).code).toBe("insufficient_usdc");
    }
    expect(sent).toBe(false);
  });

  it("sends transfer(recipient, amount) to the USDC contract when funded", async () => {
    let tx: { to: string; data: string } | undefined;
    const signer: PaymentSigner = {
      address: "0x2222222222222222222222222222222222222222",
      sendTransaction: async (request) => {
        tx = request;
        return "0xabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabca";
      },
    };

    const method = createUsdcMethod({
      client: {
        readContract: async () => 50_000_000n,
      },
    });

    const hash = await method.settle({ quote, destination, signer });
    expect(hash.startsWith("0xabc")).toBe(true);
    expect(tx?.to).toBe(BASE_SEPOLIA_USDC_ADDRESS);
    expect(tx?.to).not.toBe(destination.recipient);
    expect(tx?.data).toContain(destination.recipient.slice(2).toLowerCase());
  });

  it("records failed insufficient_usdc on the session without sending a tx", async () => {
    let sent = false;
    const checkout = createCheckout(
      createSettleConfig({
        destination,
        getSigner: async () => ({
          address: "0x2222222222222222222222222222222222222222",
          sendTransaction: async () => {
            sent = true;
            return "0xabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabca";
          },
        }),
        methods: [
          createUsdcMethod({
            client: { readContract: async () => 0n },
          }),
        ],
      }),
      { amountUsdc: "12.50" },
    );

    await checkout.selectMethod("usdc");
    await checkout.pay();
    const state = checkout.getState();
    expect(state.status).toBe("failed");
    if (state.status === "failed") {
      expect(state.error.code).toBe("insufficient_usdc");
    }
    expect(sent).toBe(false);
  });
});
