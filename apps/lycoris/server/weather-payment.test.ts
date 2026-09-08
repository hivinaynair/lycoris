import { describe, expect, it } from "bun:test";
import { BASE_SEPOLIA_USDC_ADDRESS } from "@settle-kit/core";
import { encodeEventTopics, encodeFunctionData, erc20Abi, type Hex, toHex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { weatherAccessMessage } from "../lib/weather-access-message";
import { verifyWeatherPayment } from "./weather-payment";

const buyer = privateKeyToAccount(`0x${"11".repeat(32)}`);
const other = privateKeyToAccount(`0x${"22".repeat(32)}`);
const merchant = "0x3333333333333333333333333333333333333333";
const hash: Hex = `0x${"ab".repeat(32)}`;
const now = 1800000000000;

describe("weather access proof", () => {
  type Options = {
    amount?: bigint;
    recipient?: Hex;
    token?: Hex;
    status?: string;
    signer?: typeof buyer;
    age?: number;
    logs?: boolean;
    sponsoredPayer?: Hex;
  };
  async function check(options: Options = {}) {
    const signature = await (options.signer ?? buyer).signMessage({
      message: weatherAccessMessage(hash),
    });
    const amount = options.amount ?? 100000n;
    const recipient = options.recipient ?? merchant;
    const token = options.token ?? BASE_SEPOLIA_USDC_ADDRESS;
    const client = {
      getTransaction: async () => ({
        from: buyer.address,
        to: token,
        input: encodeFunctionData({
          abi: erc20Abi,
          functionName: "transfer",
          args: [recipient, amount],
        }),
      }),
      getTransactionReceipt: async () => ({
        status: options.status ?? "success",
        blockHash: hash,
        logs:
          options.logs === false
            ? []
            : [
                {
                  address: token,
                  data: toHex(amount, { size: 32 }),
                  topics: encodeEventTopics({
                    abi: erc20Abi,
                    eventName: "Transfer",
                    args: { from: buyer.address, to: recipient },
                  }),
                },
              ],
      }),
      getBlock: async () => ({ timestamp: BigInt((now - (options.age ?? 0)) / 1000) }),
    } as unknown as Parameters<typeof verifyWeatherPayment>[0];
    return verifyWeatherPayment(
      client,
      {
        txHash: hash,
        recipient: merchant,
        ...(options.sponsoredPayer ? { sponsoredPayer: options.sponsoredPayer } : { signature }),
      },
      now,
    );
  }
  it("accepts a confirmed payment and allows access retry without another transfer", async () => {
    await check();
    await check();
  });
  it("accepts a verified sponsor without a browser signature", async () => {
    await check({ sponsoredPayer: buyer.address });
    await expect(check({ sponsoredPayer: other.address })).rejects.toThrow();
    await expect(check({ sponsoredPayer: buyer.address, amount: 1n })).rejects.toThrow();
    await expect(check({ sponsoredPayer: buyer.address, status: "reverted" })).rejects.toThrow();
  });
  it("rejects underpayment", async () => {
    await expect(check({ amount: 10000n })).rejects.toThrow();
  });
  it("rejects another merchant", async () => {
    await expect(check({ recipient: other.address })).rejects.toThrow();
  });
  it("rejects another token", async () => {
    await expect(check({ token: other.address })).rejects.toThrow();
  });
  it("rejects a reverted payment", async () => {
    await expect(check({ status: "reverted" })).rejects.toThrow();
  });
  it("rejects a receipt without a matching Transfer event", async () => {
    await expect(check({ logs: false })).rejects.toThrow();
  });
  it("rejects someone else's payment hash", async () => {
    await expect(check({ signer: other })).rejects.toThrow("wallet");
  });
  it("rejects expired access", async () => {
    await expect(check({ age: 901000 })).rejects.toThrow("expires");
  });
});
