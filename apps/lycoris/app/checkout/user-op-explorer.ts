import type { SettlementHash } from "@settle-kit/core";

/**
 * Where to look up a settlement now that it is a user operation.
 *
 * Basescan indexes transactions, and a userOpHash is not one — its `/tx/` route
 * resolves nothing. Jiffyscan indexes operations, which is what the buyer actually
 * has. This is the reason `Checkout` takes `transactionUrl` as a prop rather than
 * hard-coding a chain explorer: the SDK cannot know which kind of hash a host's
 * signer produces.
 */
export function userOpExplorerUrl(hash: SettlementHash) {
  return `https://jiffyscan.xyz/userOpHash/${hash}?network=base-sepolia`;
}
