# @settle-kit/react

Mount `SettleProvider` once. Use `useCheckout` for your own UI, or render
`<Checkout />` from `@settle-kit/react/ui`.

```tsx
"use client";
import { SettleProvider, useCheckout, type PaymentSigner } from "@settle-kit/react";

function BuyButton() {
  const { state, begin, pay, payNow, retryConfirmation } = useCheckout();
  if (state.status === "settling") {
    return state.confirmationError ? (
      <button onClick={() => void retryConfirmation()}>Check payment status</button>
    ) : (
      <p>Continue in your wallet…</p>
    );
  }
  if (state.status === "awaiting_payment") {
    return <button onClick={() => void pay()}>Pay {state.quote.amountUsdc} USDC</button>;
  }
  return (
    <button onClick={() => void payNow({ amountUsdc: "0.10", title: "Weather report" })}>
      Pay 0.10 USDC
    </button>
  );
}

export function Store({ getSigner }: { getSigner: () => Promise<PaymentSigner> }) {
  return (
    <SettleProvider
      config={{
        appName: "Your store",
        getSigner,
        destination: {
          targetChain: 84532,
          targetAsset: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
          recipient: "0x1111111111111111111111111111111111111111",
        },
      }}
    >
      <BuyButton />
    </SettleProvider>
  );
}
```

## Optional default card

```tsx
import { Checkout } from "@settle-kit/react/ui";
import "@settle-kit/react/styles.css";

<Checkout amountUsdc="0.10" title="Weather report" skipReview />;
```

`begin` quotes. `pay` submits. `payNow` does both from one click. `skipReview`
on `<Checkout>` uses `payNow`.

Optional `copy` overrides a few sentences (who pays, recovery). Button labels
stay English. `className` styles the card. `appearance` is `theme` plus CSS
variables — not a slot/theming framework.

`onSettled` means a successful receipt. `retryConfirmation` never resubmits.
Sessions are in memory; keep the page open until confirmation.

Base Sepolia, test USDC only. Peer deps: React 19 and viem 2.
