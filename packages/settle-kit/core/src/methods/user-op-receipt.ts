import type { SettlementHash } from "../types";

export type UserOpReceipt = {
  success: boolean;
  receipt: { transactionHash: SettlementHash };
};

/** The name viem gives the error it throws for an operation that is not yet mined. */
const RECEIPT_NOT_FOUND = "UserOperationReceiptNotFoundError";

export type UserOpReceiptSource = {
  /**
   * Both shapes are accepted for a user operation that has not been mined yet:
   * return `null`, or throw an error named `UserOperationReceiptNotFoundError`.
   * viem's `getUserOperationReceipt` does the latter — it never returns `null` —
   * so a loop that only understood `null` would give up on its first poll.
   * Any other rejection is a real failure and is passed straight through.
   */
  getUserOperationReceipt: (args: { hash: SettlementHash }) => Promise<UserOpReceipt | null>;
};

export type UserOpReceiptClientOptions = {
  pollMs?: number | undefined;
};

const DEFAULT_POLL_MS = 1000;

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
        const userOpReceipt = await pollOnce(source, hash);
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
        // No receipt and no time left. SettleAdapter's contract (core types.ts) reads
        // "Throws mean unknown outcome, never permission to resend" — which is exactly
        // the situation here, so throwing is the correct answer rather than a guess.
        if (remaining <= 0)
          throw new Error(`Timed out waiting for user operation ${hash} after ${timeout}ms`);
        await sleep(Math.min(pollMs, remaining));
      }
    },
  };
}

/**
 * One poll, normalising "not mined yet" to `null`.
 *
 * Only the not-found error means keep waiting. Everything else — a dead bundler, a
 * malformed reply — is rethrown on the spot: swallowing it into the loop would
 * re-diagnose a real failure as a timeout, and a wrong diagnosis is worse than a slow
 * one. Matched by `name` rather than `instanceof` on viem's error class, so this file
 * stays free of a `viem/account-abstraction` import.
 */
async function pollOnce(source: UserOpReceiptSource, hash: SettlementHash) {
  try {
    return await source.getUserOperationReceipt({ hash });
  } catch (error) {
    if (error && typeof error === "object" && "name" in error && error.name === RECEIPT_NOT_FOUND) {
      return null;
    }
    throw error;
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
