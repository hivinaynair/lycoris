# @settle-kit/react

React embed for `@settle-kit/core`. Mount `SettleProvider` once. Each purchase is `begin` + `pay`. No required wagmi peer — pass `getSigner` from the host wallet.

```tsx
import { SettleProvider, Checkout, useCheckout } from "@settle-kit/react";

<SettleProvider config={{ appName: "Rooftop", getSigner, destination }}>
  <Checkout />
</SettleProvider>
```

Config lives in React Context. Session status lives in the core manager. `useCheckout` subscribes with `useSyncExternalStore`. A second SKU is another `begin(...)`, not a remount.

Default `<Checkout />` uses CSS variables (`--foreground`, `--primary`, `--border`) so it inherits the host theme. It does not import `@repo/ui`.

Known limits: Base Sepolia, USDC only, no cards, no KYC, no portal iframe. If you serve this from a strict CSP, allow the USDC RPC and `https://sepolia.basescan.org` for the receipt link.
