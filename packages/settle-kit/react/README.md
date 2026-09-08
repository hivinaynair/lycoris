# @settle-kit/react

Mount `SettleProvider` once. Each purchase is `begin` + `pay`; `begin` selects and
quotes USDC automatically. Config lives in Context; the core manager owns session
state, subscribed through `useSyncExternalStore`. No required wagmi or Zustand.

## Complete custom-button embed

```tsx
"use client";
import { SettleProvider, useCheckout, type PaymentSigner } from "@settle-kit/react";

function BuyButton() {
  const { state, begin, pay, retryConfirmation } = useCheckout();
  if (state.status === "settling") {
    return state.confirmationError
      ? <button onClick={() => void retryConfirmation()}>Check payment status</button>
      : <p>Continue in your wallet, then wait for confirmation…</p>;
  }
  if (state.status === "awaiting_payment") {
    return <button onClick={() => void pay()}>Pay {state.quote.amountUsdc} USDC</button>;
  }
  return <>
    {state.status === "failed" && <p role="alert">{state.error.message}</p>}
    {state.status === "settled" && <p>Payment confirmed: {state.txHash}</p>}
    <button disabled={state.status === "quoting"} onClick={() => void begin({ amountUsdc: "12.50", title: "Hoodie" })}>Buy hoodie</button>
    <button disabled={state.status === "quoting"} onClick={() => void begin({ amountUsdc: "4.00", title: "Patch" })}>Buy patch</button>
  </>;
}

export function Store({ getSigner }: { getSigner: () => Promise<PaymentSigner> }) {
  return <SettleProvider config={{
    appName: "Rooftop",
    getSigner,
    destination: {
      targetChain: 84532,
      targetAsset: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
      recipient: "0x1111111111111111111111111111111111111111", // your merchant
    },
  }}><BuyButton /></SettleProvider>;
}
```

Or render `<Checkout amountUsdc="12.50" title="Hoodie" />` inside the Provider.
It handles amount, recipient, wallet prompts, failures and receipt-status retries.
CSS variables inherit the host theme; no `@repo/ui` dependency.

`begin` optionally overrides destination/title. It rejects while a payment is in
flight. `selectMethod` remains a low-level API; do not call it after `begin` because
USDC is already selected. `useCheckout({ onSettled, onFailed })` attaches callbacks
to sessions started by that hook; all hook consumers observe the same state.
`onSettled` means a successful receipt, not submission. Subscriber callbacks should
be lightweight and must not initiate another payment automatically.

## External Next host

The v0.0.1 tarballs ship TypeScript source. Install React 19 and viem 2, use
TypeScript `strict: true` and `target: "ES2020"` or newer, and add:

```ts
export default { transpilePackages: ["@settle-kit/core", "@settle-kit/react"] };
```

Run `bun run smoke:settle-kit` from the repository for an independent, packed-package
Next production build and browser smoke. It uses a simulated wallet, not a live payment.

## Limits

Base Sepolia (`84532`), Circle USDC only. No cards, KYC, fiat onramp, swaps, bridge,
portal iframe or bundled wallet connection library. Buyers need test USDC and gas.
Missing browser wallets get actionable guidance from the Lycoris host adapter.
Sessions are in memory: keep the page open until confirmation. After closing it,
inspect the wallet/explorer before paying again. Replacement transactions require
manual inspection. Strict CSP hosts must permit their RPC endpoint and the default
component's inline styles, or render their own UI.
