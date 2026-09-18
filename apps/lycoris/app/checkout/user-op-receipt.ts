import type { SettlementHash } from "@settle-kit/core";

/**
 * A `receiptClient` for `createUsdcMethod` that reads ERC-4337 user operations.
 *
 * Under account abstraction the wallet does not send the transfer itself: it signs a
 * user operation, a bundler packs it alongside other people's operations into one
 * transaction, and the EntryPoint executes each in turn. The EntryPoint catches a
 * failing operation so the rest of the bundle still settles, so the bundle's
 * transaction receipt reads `status: "success"` even when this buyer's transfer
 * reverted. Confirming on the transaction receipt would mark an unpaid purchase paid.
 *
 * The operation's own outcome lives in `UserOperationEvent.success`, which is what
 * `eth_getUserOperationReceipt` returns. That is the only field worth trusting here.
 */

export type UserOpReceipt = {
  success: boolean;
  receipt: { transactionHash: SettlementHash };
};

export type UserOpReceiptSource = {
  getUserOperationReceipt: (args: { hash: SettlementHash }) => Promise<UserOpReceipt | null>;
};

export type UserOpReceiptClientOptions = {
  pollMs?: number | undefined;
};

const DEFAULT_POLL_MS = 1000;

export function createUserOpReceiptClient(
  source: UserOpReceiptSource,
  options: UserOpReceiptClientOptions = {},
) {
  const pollMs = options.pollMs ?? DEFAULT_POLL_MS;

  return {
    // `confirmations` is part of the receiptClient shape but has no meaning here: a
    // userOp has no receipt at all until the bundle it rode in is mined.
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
        const userOpReceipt = await source.getUserOperationReceipt({ hash });
        if (userOpReceipt) {
          return {
            status: userOpReceipt.success ? "success" : "reverted",
            // Echo back the userOpHash, not `userOpReceipt.receipt.transactionHash`.
            // settle() returned a userOpHash, and confirm() rejects any receipt whose
            // hash differs as a replaced transaction. The bundle hash is a different
            // hash by definition — returning it would fail every settled purchase.
            transactionHash: hash,
          };
        }

        const remaining = deadline - Date.now();
        // No receipt and no time left: say so rather than guess at an outcome.
        if (remaining <= 0)
          throw new Error(`Timed out waiting for user operation ${hash} after ${timeout}ms`);
        await sleep(Math.min(pollMs, remaining));
      }
    },
  };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
