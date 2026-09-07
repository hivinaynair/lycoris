# @settle-kit/core

Headless USDC checkout engine. No React, DOM, or wagmi.

The merchant names a **destination** (`targetChain`, `targetAsset`, `recipient`). The buyer pays USDC. This package moves it.

```ts
import { createSettleConfig, createCheckout, createUsdcMethod } from "@settle-kit/core";

const config = createSettleConfig({
  destination: { targetChain: 84532, targetAsset: USDC, recipient: MERCHANT },
  getSigner: async () => mySigner,
  methods: [createUsdcMethod()],
});

const checkout = createCheckout(config, { amountUsdc: "12.50" });
checkout.subscribe(() => console.log(checkout.getState().status));
await checkout.selectMethod("usdc");
await checkout.pay();
```

`pay()` reads `balanceOf` **before** `sendTransaction`. Insufficient USDC becomes `failed` with `insufficient_usdc` and no tx.

User failures are data (`insufficient_usdc`, `quote_expired`, `wallet_rejected`, `wrong_network`, `transfer_failed`). Calling `pay()` while `idle` throws `invalid_config`.

v1: Base Sepolia, USDC → USDC only. No cards, no KYC, no ETH stub swap.
