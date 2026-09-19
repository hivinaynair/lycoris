"use client";
import { BASE_SEPOLIA_EXPLORER } from "@repo/shared/chains";
import type { SettlementHash } from "@settle-kit/core";
import { useCallback, useSyncExternalStore } from "react";
import { readSettlementTx, settlementTxVersion, subscribeSettlementTx } from "./settlement-tx";

/**
 * Where to look up a settlement now that it is a user operation.
 *
 * A userOpHash is not a transaction hash: the bundler puts many operations into one
 * `handleOps` transaction, and only that transaction has a hash Basescan can resolve.
 * Once the receipt has told us which bundle carried the payment we link the real
 * transaction; until then Jiffyscan indexes operations, which is what the buyer has.
 *
 * This is the reason `Checkout` takes `transactionUrl` as a prop rather than
 * hard-coding a chain explorer: the SDK cannot know which kind of hash a host's
 * signer produces.
 */
export function userOpExplorerUrl(hash: SettlementHash) {
  return `https://jiffyscan.xyz/userOpHash/${hash}?network=base-sepolia`;
}

export function settlementExplorerUrl(hash: SettlementHash) {
  const transactionHash = readSettlementTx(hash);
  return transactionHash
    ? `${BASE_SEPOLIA_EXPLORER}/tx/${transactionHash}`
    : userOpExplorerUrl(hash);
}

/**
 * Re-renders the link when the bundle hash arrives, which happens after the status
 * card is already on screen.
 */
export function useSettlementExplorerUrl() {
  const version = useSyncExternalStore(subscribeSettlementTx, settlementTxVersion, () => 0);
  // biome-ignore lint/correctness/useExhaustiveDependencies: version is the subscription
  return useCallback((hash: SettlementHash) => settlementExplorerUrl(hash), [version]);
}
