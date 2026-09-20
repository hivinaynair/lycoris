import type { SettlementHash } from "../types.ts";

export type UserOpReceipt = {
  success: boolean;
  receipt: { transactionHash: SettlementHash };
};

const RECEIPT_NOT_FOUND = "UserOperationReceiptNotFoundError";

export type UserOpReceiptSource = {
  /**
   * Return the receipt, or `null` / throw `UserOperationReceiptNotFoundError`
   * while the operation is still pending. Any other rejection is treated as a
   * failure. viem's `getUserOperationReceipt` throws rather than returning `null`.
   */
  getUserOperationReceipt: (args: { hash: SettlementHash }) => Promise<UserOpReceipt | null>;
};

export type UserOpReceiptClientOptions = {
  pollMs?: number | undefined;
};

const DEFAULT_POLL_MS = 1000;

/**
 * A `receiptClient` for `createUsdcMethod` that confirms ERC-4337 user operations.
 *
 * Under account abstraction the wallet signs a user operation; a bundler packs it
 * with other operations into one transaction. The bundle receipt can read
 * `status: "success"` even when this buyer's transfer reverted. Confirm against
 * `UserOperationEvent.success` from `eth_getUserOperationReceipt` instead.
 */
export function createUserOpReceiptClient(
  source: UserOpReceiptSource,
  options: UserOpReceiptClientOptions = {},
) {
  const pollMs = options.pollMs ?? DEFAULT_POLL_MS;

  return {
    async waitForTransactionReceipt({
      hash,
      timeout,
    }: {
      hash: SettlementHash;
      confirmations: number;
      timeout: number;
    }): Promise<{ status: "success" | "reverted"; transactionHash: SettlementHash }> {
      const deadline = Date.now() + timeout;

      for (;;) {
        const userOpReceipt = await pollOnce(source, hash);
        if (userOpReceipt) {
          return {
            status: userOpReceipt.success ? "success" : "reverted",
            // Return the userOpHash settle() submitted. The bundle transaction
            // hash is a different value and would fail replacement checks.
            transactionHash: hash,
          };
        }

        const remaining = deadline - Date.now();
        if (remaining <= 0)
          throw new Error(`Timed out waiting for user operation ${hash} after ${timeout}ms`);
        await sleep(Math.min(pollMs, remaining));
      }
    },
  };
}

async function pollOnce(source: UserOpReceiptSource, hash: SettlementHash) {
  try {
    return await source.getUserOperationReceipt({ hash });
  } catch (error) {
    // Match by name so this module does not import `viem/account-abstraction`.
    if ((error as { name?: string })?.name === RECEIPT_NOT_FOUND) return null;
    throw error;
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
