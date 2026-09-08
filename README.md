# Lycoris · Settle Kit

An embeddable **USDC checkout SDK**, extracted from an existing agent payment rail.
The merchant names a destination; the host app mounts `SettleProvider` once and
calls `begin({ amountUsdc })` for each purchase. The host supplies its own wallet.

**Start at `/checkout`.** It is a sample merchant storefront, not an operator dashboard.
The agent Demo, Feed and Agents pages are the appendix: Eve pays a weather API through x402.

## Try the embed

```tsx
"use client";

import { SettleProvider, Checkout, type PaymentSigner } from "@settle-kit/react";

export function Store({ getSigner }: { getSigner: () => Promise<PaymentSigner> }) {
  return (
    <SettleProvider config={{
      appName: "Rooftop",
      getSigner,
      destination: {
        targetChain: 84532,
        targetAsset: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
        recipient: "0x1111111111111111111111111111111111111111", // replace with your merchant
      },
    }}>
      <Checkout amountUsdc="12.50" title="Rooftop hoodie" />
    </SettleProvider>
  );
}
```

For custom buttons, call `await begin({ amountUsdc: "12.50" })`, then `pay()` once
state is `awaiting_payment`. A second SKU uses the same Provider.
See the [complete React example](packages/settle-kit/react/README.md).

## What this proves

- `@settle-kit/core`: headless session manager, amount/destination validation,
  USDC balance preflight, transfer submission and receipt confirmation.
- `@settle-kit/react`: Context configuration, hooks backed by `useSyncExternalStore`,
  and an optional default checkout. No wagmi requirement or Zustand dependency.
- `@settle-kit/agents`: paid fetch and AP2 mandate helpers. No React, Eve or app allowlists.

The amount displayed is bound to the amount transferred. `settled` means a successful
receipt, not just a transaction hash. An unavailable receipt keeps the payment in
`settling` with its hash; `retryConfirmation()` checks status without resending.
In-flight payments cannot be reset or replaced by another purchase.

## Honest demo limits

Base Sepolia (`84532`) only. Circle USDC
`0x036CbD53842c5426634e7929541eC2318f3dCF7e`. **USDC → USDC only.**
No cards, KYC, fiat onramp, real DEX, bridge or mainnet support. Buyers need test USDC
and Base Sepolia ETH for gas. No physical item ships from the sample store.

The checkout transaction targets the USDC contract; the merchant is the recipient
inside `transfer(recipient, amount)`. The agent payment separately goes to the
**x402 resource payee**, not the hoodie recipient. ERC-8004 is agent identity, not KYC;
agent `/preclear` checks identity and mandate, not balance.

Sessions are in memory. Keep the page open until confirmation; after a reload,
inspect the wallet/explorer before another payment. Receipt timeouts and replacement
transactions remain unresolved with the original hash; this demo does not reconcile
replacements or recover sessions across reloads. One confirmation is demo evidence,
not a promise of irreversible finality. Balance preflight is not a balance lock.

## Run locally

Bun `1.4.x` only. No npm, pnpm or Yarn installs.

```sh
bun install
bun run --cwd packages/shared build # rail helpers used by the app shell/demo
bun run dev:ui             # /checkout on localhost:3003
bun run dev                # UI + agent + facilitator for the appendix
bun run check-types && bun run check-boundaries && bun run check-tokens && bun test
bun run smoke:settle-kit   # packed SDKs in an independent Next app + browser smoke
```

Copy `.env.example` to `.env.local` under the apps and `packages/db` as applicable.
The merchant recipient is `apps/lycoris`'s `PAY_TO_ADDRESS`. Checkout does not call
the facilitator or agent; those processes and their credentials are for the appendix.
For its wallet/mandate bootstrap, also configure `packages/scripts/.env.local` and run
`bun run lycoris:bootstrap`.

## Independent consumer proof

`bun run smoke:settle-kit` packs core/react into tarballs, installs them outside the
workspace, builds a Next app and exercises two purchases under one Provider in
Chromium. The wallet and receipts are **simulated**. It saves desktop/mobile screenshots
in the printed temporary directory. Install Chromium once with
`bun run --cwd e2e/web e2e:install` if needed.

The packages currently distribute TypeScript source, not a published JS build.
External Next consumers need `transpilePackages: ["@settle-kit/core", "@settle-kit/react"]`,
TypeScript `strict: true`, and target `ES2020` or later. See
[e2e/fixtures/settle-kit-next](e2e/fixtures/settle-kit-next) for the exact fixture.

## Layout

| Path | Role |
| --- | --- |
| `packages/settle-kit/{core,react,agents}` | The SDK packages |
| `apps/lycoris` | Merchant checkout + agent appendix UI, port 3003 |
| `apps/agent` | Eve consumer of `@settle-kit/agents`, port 3002 |
| `apps/facilitator` | x402 verification, identity/mandate gates and USDC settlement |
| `packages/shared`, `packages/db` | Rail helpers and Neon/Drizzle demo database |
| `packages/ui` | Shared shadcn/ui; never installed into an app |
| `e2e/web` | Browser tests |

[Original design](docs/plans/2026-09-07-settle-kit-design.md) ·
[Review follow-up and interview notes](docs/plans/2026-09-08-settle-kit-review-follow-up.md)

The name is a nod to Lycoris Recoil: agents on a mission.
