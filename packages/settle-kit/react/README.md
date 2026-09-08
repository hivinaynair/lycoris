# @settle-kit/react

Mount `SettleProvider` once. A purchase can use `payNow` from a single button, or
`begin` + `pay` for a separate review step; `begin` selects and
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

## Optional default UI

```tsx
import { Checkout } from "@settle-kit/react/ui";
import "@settle-kit/react/styles.css";

<Checkout
  amountUsdc="12.50"
  title="Hoodie"
  className="merchant-checkout"
  labels={{ buy: "Review order", pay: "Confirm payment" }}
  onSettled={(receipt) => console.log(receipt.txHash)}
/>;
```

Render this inside the Provider. Amount is required; there is no implicit purchase price.
Set `skipReview` on `Checkout` to show a single initial Pay button. For custom UI,
call `payNow({ amountUsdc, title })` from a user click. Both paths retain balance,
network, expiry and receipt checks; wallet approval still happens in the wallet.

Optional `destination` overrides the Provider destination for a new purchase.
The Provider `destination` is optional. Marketplaces with a per-resource recipient can
omit it and pass `destination` to `begin`/`payNow`/`Checkout`, or return `destination`
from the `quoteUrl` response so the server stays authoritative.
`labels` supports `buy`, `pay`, `reset`, `newPurchase`, `retryConfirmation`,
`paymentMethod`, `idleDescription`, `reviewDescription`, `pendingWallet`,
`networkFee`, and `recoveryDescription`. Sponsored hosts should override wallet
instructions to describe who pays and how recovery works. This is not a complete
localization API; use your own UI for full copy control.
`className` applies to the outer section. The stylesheet is optional, scoped to
`.sk-checkout`, and has no reset, Tailwind requirement or inline style injection.
Import it once in your host. The headless entry point imports no UI or styles.
It handles amount, recipient, wallet prompts, failures and receipt-status retries.
CSS variables inherit the host theme; no `@repo/ui` dependency.

`begin` optionally overrides destination/title. It rejects while a payment is in
flight. `selectMethod` remains a low-level API; do not call it after `begin` because
USDC is already selected. `useCheckout({ onSettled, onFailed })` attaches callbacks
to sessions started by that hook; all hook consumers observe the same state.
Callbacks use the initiating hook's latest committed props, fire once per terminal
transition, and stop after that hook unmounts. Keep that hook mounted if you need its
callbacks after switching presentation. Unmounting UI does not cancel a payment.
Actions have stable identities across rerenders, including inline configuration and
callback objects. Config changes apply to the next `begin`; an existing session keeps
its original destination and signer configuration.
`canPay` is true in `awaiting_payment`; `isBusy` is true in `quoting` or `settling`,
including unresolved receipt lookup. These are UI conveniences, not permission or
balance checks: `pay()` still validates expiry, network and balance.
`onSettled` means a successful receipt, not submission. Subscriber callbacks should
be lightweight and must not initiate another payment automatically.

## External Next host

Tarballs ship compiled ESM JavaScript and TypeScript declarations. Install React 19
and viem 2. No `transpilePackages` configuration is needed. Both React entry points
preserve `"use client"` for Next.js. Bun uses the included source entry points.
Run package `build` before packing; `prepack` also builds automatically. Within
this workspace, type checks build dependencies first.

Run `bun run smoke:settle-kit` from the repository for an independent, packed-package
Next production build and browser smoke. It uses a simulated wallet, not a live payment.

## Limits

Base Sepolia (`84532`), Circle USDC only. No cards, KYC, fiat onramp, swaps, bridge,
portal iframe or bundled wallet connection library. Buyers need test USDC and gas.
Missing browser wallets get actionable guidance from the Lycoris host adapter.
Sessions are in memory: keep the page open until confirmation. After closing it,
inspect the wallet/explorer before paying again. Replacement transactions require
manual inspection. Strict CSP hosts must permit their RPC endpoint and the host's stylesheet source.


## shadcn merchant recipe

See [MerchantCheckout](../../../../apps/lycoris/app/checkout/merchant-checkout.tsx)
for a complete hook-driven checkout using the host's shadcn Button, Card and Alert.
Copy the component into your merchant app and replace the `@repo/ui/components/*`
imports with your own shadcn component paths. The SDK never imports `@repo/ui`.
Lycoris's appearance switch preserves the same Provider and active session.

Migration from the earlier source-only API: import `Checkout` from
`@settle-kit/react/ui`, explicitly import its stylesheet, and supply `amountUsdc`.
Provider, hook and core type imports stay at `@settle-kit/react`.


## Appearance tokens

The default UI uses a compact rounded card with a fixed USDC / Base Sepolia row,
an amount-bearing pay button, and expandable recipient and fee details.
Customize `--sk-radius`, `--sk-control-radius`, `--sk-surface`, `--sk-border`,
`--sk-foreground`, `--sk-primary`, and `--sk-primary-foreground` on your wrapper
or `className`. Color tokens fall back to the host's shadcn-compatible variables.
The optional CSS does not install fonts or impose a theme on the rest of your app.


## Clerk-inspired appearance API

```tsx
<SettleProvider
  config={config}
  appearance={{
    theme: "inherit",
    variables: {
      colorPrimary: "var(--primary)",
      borderRadius: "20px",
      controlBorderRadius: "12px",
    },
    elements: { primaryButton: "merchant-pay-button" },
  }}
>
  <Checkout amountUsdc="12.50" appearance={{ variables: { borderRadius: "24px" } }} />
</SettleProvider>
```

The default UI has its own styles. `theme` supports `inherit` (host/shadcn CSS variables),
`light`, and `dark`. Provider appearance is merged by variable and element key with
component appearance; component values win. Changing appearance does not reset the
payment. Variables include colors, font family and radii; element overrides accept
class names for card, header, amount, paymentMethod, primaryButton, status, details,
footer and error. The primaryButton slot styles all checkout action buttons.

CSS is in `@layer components.settle-kit`, below Tailwind utilities when the host
declares its standard layer order. Unlayered host CSS also overrides SDK styles.
For predictable ordering, declare `@layer theme, base, components, utilities;`
before your stylesheet imports. No `!important` overrides are necessary.

Appearance variables are applied as inline CSS custom properties. For hosts whose
CSP disallows style attributes, omit `variables` and set the documented CSS custom
properties in a stylesheet using `elements.card` or `className`. Theme attributes
and element classes work without inline styles. This is a smaller API inspired by
[Clerk's appearance model](https://clerk.com/docs/react/guides/customizing-clerk/appearance-prop/overview),
not a dependency on Clerk or its full theme system.

### Styling build

The default checkout is authored with Tailwind CSS 4.3.3. `bun run build` compiles
its `sk:`-prefixed utilities into the exported `styles.css`, without Preflight.
Consumers import that CSS and need no Tailwind installation or source scanning.
The SDK rules sit in `components.settle-kit`, so host utilities and the existing
`appearance.elements` and `appearance.variables` APIs can customize the embed.
