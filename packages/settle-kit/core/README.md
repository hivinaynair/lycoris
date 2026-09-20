# @settle-kit/core

Headless USDC checkout. No React, DOM, wagmi, or x402.

```ts
import { createCheckout, BASE_SEPOLIA_USDC_ADDRESS, type PaymentSigner } from "@settle-kit/core";

export function checkoutFor(getSigner: () => Promise<PaymentSigner>) {
  return createCheckout({
    amountUsdc: "0.10",
    getSigner,
    destination: {
      targetChain: 84532,
      targetAsset: BASE_SEPOLIA_USDC_ADDRESS,
      recipient: "0x1111111111111111111111111111111111111111",
    },
  });
}

const checkout = checkoutFor(getSigner);
checkout.subscribe(() => console.log(checkout.getState()));
await checkout.pay(); // quotes, then submits, then waits for a receipt
```

`PaymentSigner` is two fields: `address` and `sendTransaction({ to, data })`.
The transaction `to` is Circle USDC; the merchant is inside `transfer`
calldata. The host puts the wallet on Base Sepolia.

Call `quote()` if you want a review step, then `pay()`. `pay()` from idle does
both.

## What the session guarantees

- `settled` and `onSettled` wait for a successful receipt, not just a submitted hash.
- A reverted receipt becomes `failed`. A receipt timeout stays `settling`;
  `retryConfirmation()` looks up the same hash and never sends again.
- Reset and a second `pay()` are refused while `settling`.
- Buyer-facing errors live on state: `insufficient_usdc`, `quote_expired`,
  `wallet_rejected`, `wrong_network`, `transfer_failed`.

Wrap `createUsdcMethod()` when the host needs extra work (funding, tracking).
Pass `receiptClient` from `createUserOpReceiptClient` when the signer returns a
userOpHash instead of a transaction hash.

v1 is Base Sepolia and Circle test USDC only. Sessions are in memory — keep the
page open until confirmation.
