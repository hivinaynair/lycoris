import { WEATHER_AMOUNT_ATOMIC } from "@repo/shared/demo";
import { BASE_SEPOLIA_USDC_ADDRESS } from "@settle-kit/core";
import { erc20Abi, type Hex, type Log, parseEventLogs } from "viem";
import { InvalidWeatherPayment } from "./weather-payment";

export type TransferPaymentReceipt = {
  status: "success" | "reverted";
  to: Hex | null;
  blockHash: Hex;
  logs: Log[];
};

export type TransferPaymentClient = {
  getTransactionReceipt: (args: { hash: Hex }) => Promise<TransferPaymentReceipt | null>;
  getBlock: (args: { blockHash: Hex }) => Promise<{ timestamp: bigint }>;
};

/**
 * Releases the report for a direct EOA transfer.
 *
 * The caller names only the transaction. Merchant, token, and amount come from
 * configuration. The USDC `Transfer` log must show 0.1 USDC to this merchant.
 */
export async function verifyTransferWeatherPayment(
  chain: TransferPaymentClient,
  input: { txHash: Hex; recipient: Hex },
  now = Date.now(),
) {
  const receipt = await chain.getTransactionReceipt({ hash: input.txHash });
  if (!receipt)
    throw new InvalidWeatherPayment("That payment has not been confirmed yet. Try again shortly.");

  const reject = () => {
    throw new InvalidWeatherPayment(
      "Payment must be a confirmed 0.1 USDC transfer to this merchant.",
    );
  };

  if (receipt.status !== "success") return reject();
  if (receipt.to?.toLowerCase() !== BASE_SEPOLIA_USDC_ADDRESS.toLowerCase()) return reject();

  const paid = parseEventLogs({
    abi: erc20Abi,
    eventName: "Transfer",
    logs: receipt.logs,
  }).some(
    (log) =>
      log.address.toLowerCase() === BASE_SEPOLIA_USDC_ADDRESS.toLowerCase() &&
      log.args.to.toLowerCase() === input.recipient.toLowerCase() &&
      log.args.value === BigInt(WEATHER_AMOUNT_ATOMIC),
  );
  if (!paid) return reject();

  const block = await chain.getBlock({ blockHash: receipt.blockHash });
  const age = now - Number(block.timestamp) * 1000;
  if (age < 0 || age > 15 * 60 * 1000)
    throw new InvalidWeatherPayment("Report access expires 15 minutes after payment confirmation.");
}
