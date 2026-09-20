import type { Address, Hex, PaymentSigner, SettlementHash } from "@settle-kit/core";

/**
 * One call inside a user operation.
 *
 * A structural subset of viem's `Call`, so an array of these drops into
 * `bundlerClient.sendUserOperation` without a translation step. viem leaves `value`
 * and `data` optional; both are required here, because the one caller below always
 * has an answer for both and an omitted `value` reads as an oversight in a payments
 * file.
 */
export type UserOperationCall = {
  to: Address;
  value: bigint;
  data: Hex;
};

/**
 * The slice of a 4337 stack this adapter needs: who is paying, on what chain, and
 * something that will submit a user operation for them.
 *
 * Generic over the account so the real wiring keeps its type. viem's
 * `sendUserOperation` demands a full `SmartAccount`, not merely something with an
 * `address`; pinning `account` to the narrow shape here would force a cast at the
 * call site, which is precisely where a mistyped argument would go unnoticed.
 */
export type UserOperationSender<account extends { address: Address } = { address: Address }> = {
  account: account;
  chainId: number;
  sendUserOperation: (args: {
    account: account;
    calls: UserOperationCall[];
  }) => Promise<SettlementHash>;
};

/**
 * Presents a smart account to the SDK as an ordinary `PaymentSigner`.
 *
 * This is the whole ERC-4337 story as far as `@settle-kit/core` is concerned. The
 * SDK asks for an address, a way to send a transaction, and a chain id; it gets all
 * three, and nothing it can see distinguishes this from an EOA. No word of the 4337
 * execution model — user operations, bundlers, the EntryPoint, paymasters — crosses
 * this boundary, which is the claim `PaymentSigner`'s three fields were making.
 *
 * **The hash comes back even when the operation reverts on chain, and a reverted
 * operation is not an error here.** `sendTransaction` resolves as soon as the bundler
 * accepts the operation, exactly as an EOA's resolves once the transaction is
 * broadcast; in both cases the chain has not yet had its say. Deciding the outcome is
 * `confirm()`'s job, and `createUserOpReceiptClient` (`@settle-kit/core/account-abstraction`) does it by
 * reading `UserOperationEvent.success`. So a reverted user operation walks the
 * identical state path as a reverted ERC-20 transfer — `settling` → `confirm()` →
 * `"reverted"` → `failed` — with the hash intact for the buyer to inspect.
 *
 * Throwing on a revert instead would need this signer to wait for the receipt it has
 * no business waiting for, would strand the hash inside an error, and would give
 * 4337 buyers a second failure route that the ERC-20 path does not have. That second
 * route is what a leaked abstraction looks like.
 *
 * A rejection from `sendUserOperation` is a different thing and does propagate: the
 * bundler refused the operation, so there is no hash to confirm and nothing was
 * submitted.
 */
export function toPaymentSigner<account extends { address: Address }>(
  sender: UserOperationSender<account>,
): PaymentSigner {
  return {
    address: sender.account.address,

    // A USDC transfer is one contract call and no ether, so: one call, `value: 0n`.
    // Batching is 4337's headline trick and this deliberately does not use it — the
    // SDK hands over a single `{ to, data }`, and inventing extra calls around it
    // would be the adapter making payment decisions that are not its to make.
    sendTransaction: ({ to, data }) =>
      sender.sendUserOperation({
        account: sender.account,
        calls: [{ to, value: 0n, data }],
      }),

    // Configured, not queried. A smart account has no `eth_chainId` of its own, and
    // the account is deployed per chain anyway — but core's wrong-network check reads
    // this field, and answering it keeps that check alive for 4337 buyers.
    getChainId: async () => sender.chainId,
  };
}
