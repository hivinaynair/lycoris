# @settle-kit/react

Mount `SettleProvider` once. Use `useCheckout` for your own UI, or render
`<Checkout />` from `@settle-kit/react/ui`.

```tsx
"use client";
import { SettleProvider, useCheckout, type PaymentSigner } from "@settle-kit/react";

function BuyButton() {
  const { state, pay, retryConfirmation } = useCheckout();
  if (state.status === "settling") {
    return state.confirmationError ? (
      <button onClick={() => void retryConfirmation()}>Check payment status</button>
    ) : (
      <p>Continue in your wallet…</p>
    );
  }
  if (state.status === "settled") {
    return <p>Paid {state.intent.amount} USDC</p>;
  }
  return (
    <button onClick={() => void pay({ amount: "0.10", title: "Weather report" })}>
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

Optional default card:

```tsx
import { Checkout } from "@settle-kit/react/ui";
import "@settle-kit/react/styles.css";

<Checkout amount="0.10" title="Weather report" />;
```

`pay({ amount })` prepares, submits, and waits for a receipt. `retryConfirmation` looks up the same hash
and never sends again.
