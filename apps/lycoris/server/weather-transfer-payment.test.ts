import { describe, expect, it } from "bun:test";
import { WEATHER_AMOUNT_ATOMIC } from "@repo/shared/demo";
import { BASE_SEPOLIA_USDC_ADDRESS } from "@settle-kit/core";
import { encodeEventTopics, erc20Abi, type Hex, toHex } from "viem";
import { verifyTransferWeatherPayment } from "./weather-transfer-payment";

const payer: Hex = "0x1111111111111111111111111111111111111111";
const stranger: Hex = "0x4444444444444444444444444444444444444444";
const merchant: Hex = "0x3333333333333333333333333333333333333333";
const txHash: Hex = `0x${"ab".repeat(32)}`;
const blockHash: Hex = `0x${"cd".repeat(32)}`;
const now = 1800000000000;

type Options = {
  status?: "success" | "reverted";
  to?: Hex | null;
  recipient?: Hex;
  amount?: bigint;
  token?: Hex;
  age?: number;
  logs?: boolean;
  missing?: boolean;
};

function check(options: Options = {}) {
  const amount = options.amount ?? BigInt(WEATHER_AMOUNT_ATOMIC);
  const chain = {
    getTransactionReceipt: async () =>
      options.missing
        ? null
        : {
            status: options.status ?? "success",
            to: options.to === undefined ? BASE_SEPOLIA_USDC_ADDRESS : options.to,
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
                        args: { from: payer, to: options.recipient ?? merchant },
                      }),
                    },
                  ],
          },
    getBlock: async () => ({ timestamp: BigInt((now - (options.age ?? 0)) / 1000) }),
  };
  return verifyTransferWeatherPayment(chain, { txHash, recipient: merchant }, now);
}

describe("EOA transfer access proof", () => {
  it("releases the report for a settled USDC transfer", async () => {
    await check();
  });

  it("refuses a reverted transaction", async () => {
    await expect(check({ status: "reverted" })).rejects.toThrow();
  });

  it("refuses a transaction that did not call USDC", async () => {
    await expect(check({ to: stranger })).rejects.toThrow();
  });

  it("refuses a transfer to anyone but the merchant", async () => {
    await expect(check({ recipient: stranger })).rejects.toThrow();
  });

  it("refuses the wrong amount", async () => {
    await expect(check({ amount: 1n })).rejects.toThrow();
  });

  it("refuses a transfer of some other token", async () => {
    await expect(check({ token: stranger })).rejects.toThrow();
  });

  it("refuses a transaction carrying no transfer at all", async () => {
    await expect(check({ logs: false })).rejects.toThrow();
  });

  it("refuses a transaction that has not been mined yet", async () => {
    await expect(check({ missing: true })).rejects.toThrow(/not been confirmed/);
  });

  it("expires access fifteen minutes after the payment", async () => {
    await expect(check({ age: 16 * 60 * 1000 })).rejects.toThrow(/expires/);
  });
});
