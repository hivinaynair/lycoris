# Writing a `PaymentSigner`

Settle Kit ships no wallet library. It asks the host for three things and stays
out of the way:

```ts
type PaymentSigner = {
  address: HexAddress;
  sendTransaction: (tx: { to: HexAddress; data: Hex }) => Promise<SettlementHash>;
  getChainId?: () => Promise<number>;
};
```

That is the whole contract. `@settle-kit/core` has no `wagmi`, no connector, no
account implementation, and no opinion about how you sign — which means it never
competes with the wallet stack your app already has.

Three adapters follow. Each is about ten lines, and none of them require the SDK
to know anything about the machinery behind them.

## wagmi

```ts
import type { WalletClient } from "viem";
import type { PaymentSigner } from "@settle-kit/core";

export const wagmiSigner = (client: WalletClient): PaymentSigner => ({
  address: client.account.address,
  sendTransaction: (tx) =>
    client.sendTransaction({ ...tx, account: client.account, chain: null }),
  getChainId: () => client.getChainId(),
});
```

Get the `WalletClient` from `useWalletClient()` and pass the result to
`SettleProvider`'s `getSigner`. Settle Kit takes no wagmi dependency of its own,
so there is exactly one wagmi in your tree and it is yours.

## A bare viem wallet client

```ts
import { createWalletClient, custom } from "viem";
import { baseSepolia } from "viem/chains";

const client = createWalletClient({
  chain: baseSepolia,
  transport: custom(window.ethereum),
});

const [address] = await client.requestAddresses();
const signer: PaymentSigner = {
  address,
  sendTransaction: (tx) => client.sendTransaction({ ...tx, account: address, chain: null }),
  getChainId: () => client.getChainId(),
};
```

No connector library at all. Useful when the host already has a provider and does
not want a second abstraction over it.

## A server wallet (Coinbase CDP)

```ts
import { CdpClient } from "@coinbase/cdp-sdk";

export function cdpSigner(address: HexAddress): PaymentSigner {
  const cdp = new CdpClient();
  return {
    address,
    sendTransaction: async ({ to, data }) => {
      const { transactionHash } = await cdp.evm.sendTransaction({
        address,
        network: "base-sepolia",
        transaction: { to, value: 0n, data },
      });
      return transactionHash;
    },
    getChainId: async () => 84532,
  };
}
```

Server-side only — the CDP SDK needs an API secret and has no browser build. Use
it where your own backend is the payer.

## An ERC-4337 smart account

Account abstraction is a **signer**, not a payment method, so it needs no new
package either:

```ts
const signer: PaymentSigner = {
  address: account.address,
  sendTransaction: ({ to, data }) =>
    bundler.sendUserOperation({ account, calls: [{ to, value: 0n, data }] }),
  getChainId: async () => baseSepolia.id,
};
```

Two things are different here, and both matter.

**The hash is a userOpHash, not a transaction hash.** That is why the type is
called `SettlementHash`, and why `Checkout` takes a `transactionUrl` prop — the
SDK cannot know which kind of hash your signer produces, so it does not guess at
an explorer link.

**A user operation can revert inside a transaction that succeeded.** The
EntryPoint catches a failing operation so the rest of the bundle still settles,
which means the bundle's transaction receipt reads `status: "success"` even when
your buyer's transfer reverted. Confirming on that receipt marks unpaid purchases
as paid.

`createUsdcMethod` takes a `receiptClient` for exactly this:

```ts
createUsdcMethod({
  receiptClient: {
    async waitForTransactionReceipt({ hash }) {
      const receipt = await bundler.getUserOperationReceipt({ hash });
      return {
        // UserOperationEvent.success, not the transaction's status.
        status: receipt.success ? "success" : "reverted",
        // Echo the userOpHash back: confirm() compares it against what settle()
        // returned, and the bundle's hash is a different hash by definition.
        transactionHash: hash,
      };
    },
  },
});
```

Get that right and a reverted user operation walks the same path as a reverted
ERC-20 transfer — `settling` → `failed`, hash intact. Get it wrong and the
failure is silent, which is the worst kind in a payment system.

A worked implementation lives in
[`apps/lycoris/app/checkout/user-op-receipt.ts`](../apps/lycoris/app/checkout/user-op-receipt.ts),
including the poll loop viem's throwing not-found error requires.

## What the SDK does with your signer

`settle` checks the chain id if you supplied `getChainId`, reads the payer's USDC
balance before sending anything, and only then calls `sendTransaction`. The hash
you return is handed to `confirm`, which decides `success` or `reverted`.

Throwing from `sendTransaction` means the payment was not submitted. Returning a
hash means it was, and nothing more — settlement is `confirm`'s answer to give.
