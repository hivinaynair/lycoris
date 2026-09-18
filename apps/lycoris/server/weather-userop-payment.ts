import { WEATHER_AMOUNT_ATOMIC } from "@repo/shared/demo";
import { BASE_SEPOLIA_USDC_ADDRESS } from "@settle-kit/core";
import { erc20Abi, type Hex, type Log, parseEventLogs } from "viem";
import { InvalidWeatherPayment } from "./weather-payment";

/** What `eth_getUserOperationReceipt` gives us, narrowed to what this check reads. */
export type UserOpPaymentReceipt = {
  success: boolean;
  sender: Hex;
  receipt: { blockHash: Hex; logs: Log[] };
};

export type UserOpPaymentClients = {
  bundler: {
    getUserOperationReceipt: (args: { hash: Hex }) => Promise<UserOpPaymentReceipt | null>;
  };
  chain: { getBlock: (args: { blockHash: Hex }) => Promise<{ timestamp: bigint }> };
};

/**
 * Releases the report for a payment made by a smart account.
 *
 * `verifyWeatherPayment` cannot do this job. Every check it makes reads the
 * transaction: `to` must be the USDC contract, and the calldata must decode to a
 * `transfer`. Under ERC-4337 the transaction belongs to the bundler, `to` is the
 * EntryPoint, and the calldata is `handleOps` carrying other people's operations
 * as well as this one. None of those checks can be made to mean anything here.
 *
 * So verification moves from calldata to **logs**, which are unchanged: the USDC
 * `Transfer` is emitted inside the bundle with the right `from`, `to` and `value`
 * regardless of who submitted it.
 *
 * Two bindings keep that honest. The operation's `sender` must be the burner this
 * purchase was funded for — recorded server-side at funding time, never supplied by
 * the caller — and the log's `from` must be that same address. A caller who names
 * someone else's operation gets nothing, because the address it has to match is one
 * we wrote down ourselves.
 */
export async function verifyUserOpWeatherPayment(
  clients: UserOpPaymentClients,
  input: { userOpHash: Hex; payer: Hex; recipient: Hex },
  now = Date.now(),
) {
  const receipt = await clients.bundler.getUserOperationReceipt({ hash: input.userOpHash });
  if (!receipt)
    throw new InvalidWeatherPayment("That payment has not been confirmed yet. Try again shortly.");

  const reject = () => {
    throw new InvalidWeatherPayment(
      "Payment must be a confirmed 0.1 USDC transfer to this merchant from your demo account.",
    );
  };

  // The bundle's transaction can succeed while this operation reverted. The
  // EntryPoint records that here, and nowhere else.
  if (!receipt.success) return reject();
  if (receipt.sender.toLowerCase() !== input.payer.toLowerCase()) return reject();

  const paid = parseEventLogs({
    abi: erc20Abi,
    eventName: "Transfer",
    logs: receipt.receipt.logs,
  }).some(
    (log) =>
      log.address.toLowerCase() === BASE_SEPOLIA_USDC_ADDRESS.toLowerCase() &&
      log.args.from.toLowerCase() === input.payer.toLowerCase() &&
      log.args.to.toLowerCase() === input.recipient.toLowerCase() &&
      log.args.value === BigInt(WEATHER_AMOUNT_ATOMIC),
  );
  if (!paid) return reject();

  const block = await clients.chain.getBlock({ blockHash: receipt.receipt.blockHash });
  const age = now - Number(block.timestamp) * 1000;
  if (age < 0 || age > 15 * 60 * 1000)
    throw new InvalidWeatherPayment("Report access expires 15 minutes after payment confirmation.");
}
