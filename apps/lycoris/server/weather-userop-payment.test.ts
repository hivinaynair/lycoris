import { describe, expect, it } from "bun:test";
import { WEATHER_AMOUNT_ATOMIC } from "@repo/shared/demo";
import { BASE_SEPOLIA_USDC_ADDRESS } from "@settle-kit/core";
import { encodeEventTopics, erc20Abi, type Hex, toHex } from "viem";
import { verifyUserOpWeatherPayment } from "./weather-userop-payment";

const payer: Hex = "0x1111111111111111111111111111111111111111";
const stranger: Hex = "0x4444444444444444444444444444444444444444";
const merchant: Hex = "0x3333333333333333333333333333333333333333";
const userOpHash: Hex = `0x${"ab".repeat(32)}`;
const blockHash: Hex = `0x${"cd".repeat(32)}`;
const now = 1800000000000;

type Options = {
  success?: boolean;
  sender?: Hex;
  from?: Hex;
  to?: Hex;
  amount?: bigint;
  token?: Hex;
  age?: number;
  logs?: boolean;
  missing?: boolean;
};

function check(options: Options = {}) {
  const amount = options.amount ?? BigInt(WEATHER_AMOUNT_ATOMIC);
  const clients = {
    bundler: {
      getUserOperationReceipt: async () =>
        options.missing
          ? null
          : {
              success: options.success ?? true,
              sender: options.sender ?? payer,
              receipt: {
                blockHash,
                logs:
                  options.logs === false
                    ? []
                    : [
                        {
                          address: options.token ?? BASE_SEPOLIA_USDC_ADDRESS,
                          data: toHex(amount, { size: 32 }),
                          topics: encodeEventTopics({
                            abi: erc20Abi,
                            eventName: "Transfer",
                            args: { from: options.from ?? payer, to: options.to ?? merchant },
                          }),
                        },
                      ],
              },
            },
    },
    chain: {
      getBlock: async () => ({ timestamp: BigInt((now - (options.age ?? 0)) / 1000) }),
    },
  } as unknown as Parameters<typeof verifyUserOpWeatherPayment>[0];
  return verifyUserOpWeatherPayment(clients, { userOpHash, payer, recipient: merchant }, now);
}

describe("user operation access proof", () => {
  it("releases the report for a settled operation", async () => {
    await check();
  });

  // The whole reason this file exists: the bundle's transaction succeeds either way.
  it("refuses an operation that reverted inside a successful bundle", async () => {
    await expect(check({ success: false })).rejects.toThrow();
  });

  it("refuses an operation sent by an account this purchase was not funded for", async () => {
    await expect(check({ sender: stranger })).rejects.toThrow();
  });

  it("refuses a transfer that came from someone else inside the same bundle", async () => {
    await expect(check({ from: stranger })).rejects.toThrow();
  });

  it("refuses a transfer to anyone but the merchant", async () => {
    await expect(check({ to: stranger })).rejects.toThrow();
  });

  it("refuses the wrong amount", async () => {
    await expect(check({ amount: 1n })).rejects.toThrow();
  });

  it("refuses a transfer of some other token", async () => {
    await expect(check({ token: stranger })).rejects.toThrow();
  });

  it("refuses a bundle carrying no transfer at all", async () => {
    await expect(check({ logs: false })).rejects.toThrow();
  });

  it("refuses an operation that has not been mined yet", async () => {
    await expect(check({ missing: true })).rejects.toThrow(/not been confirmed/);
  });

  it("expires access fifteen minutes after the payment", async () => {
    await expect(check({ age: 16 * 60 * 1000 })).rejects.toThrow(/expires/);
  });

  it("refuses a block timestamped in the future", async () => {
    await expect(check({ age: -60 * 1000 })).rejects.toThrow(/expires/);
  });
});
