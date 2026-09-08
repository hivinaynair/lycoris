import { WEATHER_AMOUNT_ATOMIC } from "@repo/shared/demo";
import { BASE_SEPOLIA_USDC_ADDRESS } from "@settle-kit/core";
import {
  decodeFunctionData,
  erc20Abi,
  type Hex,
  type Log,
  parseEventLogs,
  verifyMessage,
} from "viem";
import { weatherAccessMessage } from "../lib/weather-access-message";

export class InvalidWeatherPayment extends Error {}

/** Direct checkout transfers only. x402 has its own settlement/access gate. */
export async function verifyWeatherPayment(
  client: {
    getTransaction: (args: { hash: Hex }) => Promise<{ from: Hex; to: Hex | null; input: Hex }>;
    getTransactionReceipt: (args: {
      hash: Hex;
    }) => Promise<{ status: string; blockHash: Hex; logs: Log[] }>;
    getBlock: (args: { blockHash: Hex }) => Promise<{ timestamp: bigint }>;
  },
  input: { txHash: Hex; recipient: Hex } & ({ signature: Hex } | { sponsoredPayer: Hex }),
  now = Date.now(),
) {
  const [tx, receipt] = await Promise.all([
    client.getTransaction({ hash: input.txHash }),
    client.getTransactionReceipt({ hash: input.txHash }),
  ]);
  const reject = () => {
    throw new InvalidWeatherPayment(
      "Payment must be a confirmed 0.1 USDC transfer to this merchant from your wallet.",
    );
  };
  if (
    receipt.status !== "success" ||
    tx.to?.toLowerCase() !== BASE_SEPOLIA_USDC_ADDRESS.toLowerCase()
  )
    return reject();
  const transfer = (() => {
    try {
      return decodeFunctionData({ abi: erc20Abi, data: tx.input });
    } catch {
      return reject();
    }
  })();
  if (
    transfer.functionName !== "transfer" ||
    transfer.args[0].toLowerCase() !== input.recipient.toLowerCase() ||
    transfer.args[1] !== BigInt(WEATHER_AMOUNT_ATOMIC)
  )
    return reject();
  const paid = parseEventLogs({ abi: erc20Abi, eventName: "Transfer", logs: receipt.logs }).some(
    (log) =>
      log.address.toLowerCase() === BASE_SEPOLIA_USDC_ADDRESS.toLowerCase() &&
      log.args.from.toLowerCase() === tx.from.toLowerCase() &&
      log.args.to.toLowerCase() === input.recipient.toLowerCase() &&
      log.args.value === BigInt(WEATHER_AMOUNT_ATOMIC),
  );
  if (!paid) return reject();
  if (
    !("sponsoredPayer" in input
      ? tx.from.toLowerCase() === input.sponsoredPayer.toLowerCase()
      : await verifyMessage({
          address: tx.from,
          message: weatherAccessMessage(input.txHash),
          signature: input.signature,
        }))
  ) {
    throw new InvalidWeatherPayment("Sign with the wallet that made this payment.");
  }
  const block = await client.getBlock({ blockHash: receipt.blockHash });
  const age = now - Number(block.timestamp) * 1000;
  if (age < 0 || age > 15 * 60 * 1000)
    throw new InvalidWeatherPayment("Report access expires 15 minutes after payment confirmation.");
}
