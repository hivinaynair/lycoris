# @settle-kit/core

Headless USDC checkout engine. No React, DOM, wagmi, x402 or app dependencies.

```ts
import { createSettleConfig, createCheckout, BASE_SEPOLIA_USDC_ADDRESS, type PaymentSigner } from "@settle-kit/core";

export function checkoutFor(getSigner: () => Promise<PaymentSigner>) {
  const config = createSettleConfig({
    destination: {
      targetChain: 84532,
      targetAsset: BASE_SEPOLIA_USDC_ADDRESS,
      recipient: "0x1111111111111111111111111111111111111111", // your merchant
    },
    getSigner,
  });
  return createCheckout(config, { amountUsdc: "12.50" });
}

// Host supplies its signer, then:
// const checkout = checkoutFor(getSigner);
// checkout.subscribe(() => console.log(checkout.getState()));
// await checkout.selectMethod("usdc");
// await checkout.pay();
```

`PaymentSigner` provides `address`, `sendTransaction({ to, data })`, and optional
`getChainId`. The host must send on Base Sepolia; provide `getChainId` for the SDK's
network preflight. A viem wallet adapter should also bind chain/account when sending.
The transaction's `to` is Circle USDC, with the merchant inside `transfer` calldata.

## Contract

- Session creation validates positive six-decimal USDC amounts and any destination it
  is given. The effective destination is the per-purchase override, then the config
  default, then the one the quote returns; if none resolves, the quote fails with
  `invalid_config`.
- A quote may carry its own `destination`. It is validated as external data, and when
  the host also asked for a recipient the two must match, or the quote fails with
  `transfer_failed`. Prefer this when the recipient belongs to the resource: the server
  then decides where funds go, and a tampered client cannot redirect them.
- Server and adapter quotes must match the purchase amount in both displayed and
  atomic units. Quote amounts are JSON-safe strings; accepted quotes are frozen.
- `pay()` checks expiry before/after wallet acquisition. The USDC adapter checks
  `balanceOf` before sending and checks expiry again after that read.
- `settling` covers wallet interaction and receipt lookup. After submission it
  includes `txHash`; `settled` and `onSettled` require a successful receipt.
- A reverted receipt becomes `failed/transfer_failed` with its hash. A receipt timeout
  stays `settling` with `confirmationError`; `retryConfirmation()` retries only the
  receipt. It never calls `sendTransaction` again.
- Reset, duplicate pay and session replacement are illegal during settlement.
- User problems are state data: `insufficient_usdc`, `quote_expired`, `wallet_rejected`,
  `wallet_unavailable`, `wrong_network`, `transfer_failed`.

Custom USDC adapters implement `quote`, `settle` (submission → hash), and `confirm`
(receipt → `success` or `reverted`; throw for unknown outcome). `createUsdcMethod`
accepts a balance `client`, `receiptClient`, `now`, `quoteTtlMs` and `requestId` for
host RPC integration and deterministic tests. Both clients must use Base Sepolia.
Do not return `success` from a custom adapter without checking the receipt.

Default receipt lookup waits for one confirmation for up to 60 seconds. Replacement
hashes stay unresolved for manual explorer inspection; they are not claimed as payment.
Sessions are in memory, with no reload recovery. Keep the page open until confirmation.
Balance preflight is not a lock, and one confirmation is not irreversible finality.

v1: Base Sepolia (`84532`), Circle USDC
`0x036CbD53842c5426634e7929541eC2318f3dCF7e` only. No cards, KYC, onramp, swaps or bridges.
Distribution: compiled ESM and declarations; install peer `viem`. Bun also has a source entry point.
Run `bun run build` before packing (also run by `prepack`).
