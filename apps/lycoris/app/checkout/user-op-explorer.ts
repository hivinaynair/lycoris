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
 * transaction. Until then there is no link: a userOpHash in an explorer's `/tx/`
 * route resolves nothing.
 *
 * This is the reason `Checkout` takes `transactionUrl` as a prop rather than
 * hard-coding a chain explorer: the SDK cannot know which kind of hash a host's
 * signer produces.
 */
export function settlementExplorerUrl(hash: SettlementHash) {
  const transactionHash = readSettlementTx(hash);
  // No link rather than a userOp link: the bundle usually lands seconds after the
  // confirmation card appears, and `transactionUrl` returning undefined is how the
  // SDK is told there is nothing to link yet.
  return transactionHash ? `${BASE_SEPOLIA_EXPLORER}/tx/${transactionHash}` : undefined;
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
