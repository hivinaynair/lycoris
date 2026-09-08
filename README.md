# Lycoris · Settle Kit

An embeddable **USDC checkout SDK**, extracted from an existing agent payment rail.
The merchant names a destination; the host app mounts `SettleProvider` once and
calls `begin({ amountUsdc })` for each purchase. The host supplies its own wallet.

The checkout makes real Base Sepolia transfers from a dedicated, faucet-funded demo
wallet. Visitors click Pay without signing in, connecting a wallet, or supplying funds.
The report opens automatically after receipt verification. The host enforces a fixed
merchant, 0.1 USDC price, persistent idempotency, and a ten-purchase budget.
See [sponsored checkout setup](docs/sponsored-checkout.md).

**Start at `/checkout` (`/` redirects there).** It is a sample merchant storefront, not an operator dashboard.
The agent `/demo` and Feed pages are the appendix: Lycoris pays a weather API through x402.

See the [shared design system](packages/ui/README.md) for light/dark tokens and
[local walkthrough and bundle measurements](docs/plans/2026-09-08-demo-proof.md).

## Try the embed

```tsx
"use client";

import { SettleProvider, type PaymentSigner } from "@settle-kit/react";
import { Checkout } from "@settle-kit/react/ui";
import "@settle-kit/react/styles.css";

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
      <Checkout amountUsdc="0.1" title="Melbourne weather report" />
    </SettleProvider>
  );
}
```

For custom buttons, call `await begin({ amountUsdc: "0.1" })`, then `pay()` once
state is `awaiting_payment`. A second SKU uses the same Provider.
See the [complete React example](packages/settle-kit/react/README.md).

## What this proves

- `@settle-kit/core`: headless session manager, amount/destination validation,
  USDC balance preflight, transfer submission and receipt confirmation.
- `@settle-kit/react`: Context configuration, hooks backed by `useSyncExternalStore`,
  and an optional default checkout. No wagmi requirement or Zustand dependency.
- `@settle-kit/agents`: paid fetch and AP2 mandate helpers. No React, Eve or app allowlists.
- `@settle-kit/server`: `withAgenticPayment` for paid Next.js APIs, including per-request
  mandate forwarding to the facilitator. See the [server SDK](packages/settle-kit/server/README.md).

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
**same weather merchant** as human checkout. Each buyer makes a separate payment. ERC-8004 is agent identity, not KYC;
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

The packages ship compiled ESM and TypeScript declarations. External Next consumers
need no SDK-specific transpilation configuration. Packages are not published. The [npm release guide](docs/settle-kit-releases.md) explains validation, versioning, and tagged publishing. See
[e2e/fixtures/settle-kit-next](e2e/fixtures/settle-kit-next) for the exact fixture.

## Layout

| Path | Role |
| --- | --- |
| `packages/settle-kit/{core,react,agents,server}` | The SDK packages |
| `apps/lycoris` | Merchant checkout + agent appendix UI, port 3003 |
| `apps/agent` | Lycoris agent, built with Eve and `@settle-kit/agents`, port 3002 |
| `apps/facilitator` | x402 verification, identity/mandate gates and USDC settlement |
| `packages/shared`, `packages/db` | Rail helpers and Neon/Drizzle demo database |
| `packages/ui` | Shared shadcn/ui; never installed into an app |
| `e2e/web` | Browser tests |

[Original design](docs/plans/2026-09-07-settle-kit-design.md) ·
[Review follow-up and interview notes](docs/plans/2026-09-08-settle-kit-review-follow-up.md)

The name is a nod to Lycoris Recoil: agents on a mission.

### Shared weather purchase

Human checkout and Lycoris buy the Melbourne public forecast for **0.1 USDC**
(100000 atomic units), using the same `PAY_TO_ADDRESS`. The React SDK sends a
direct transfer; the agents SDK uses x402. Simulation unlocks labeled sample data.
Wallet checkout requires a free ownership signature after payment; the server checks
the direct transfer, successful receipt, USDC Transfer event, payer signature, and
a 15-minute access window before fetching the same Open-Meteo report. Access retries
within that window do not require another payment. This demo does not persist orders.

The capped agent now has a zero-USDC mandate, so the same 0.1-USDC resource can
demonstrate an authorization failure. Existing credentials must be regenerated with
`bun run lycoris:refresh-mandates` to apply that changed mandate without funding or registering agents. This writes the local credential file; remote agents using `MANDATES_JSON` need their credentials updated separately.

### Chat with Lycoris

`/demo` offers a compact **Get me the report** button. It sends that request to the
Eve agent running Claude Haiku 4.5, then shows only the latest reply. The button is
disabled while a request is running; opening the page does not send a request. The circuit follows paid-tool events
and facilitator progress. Scenario changes start a new conversation; follow-ups
keep Eve's session cursor and can reuse a report already purchased.

The tool buys only Melbourne's next 1 PM forecast. The authenticated UI transport
binds the selected wallet through `x-lycoris-agent`; the agent derives the weather
URL from its configured `APP_URL`. Model arguments cannot choose a different wallet
or destination, and only one payment attempt is allowed per turn. Identity, AP2,
and balance checks still apply. Start UI, Eve, and facilitator with `bun run dev`.

`POST /api/trigger-payment` now requires `{ scenarioIndex, message }` and accepts an
optional Eve session cursor for follow-ups. Its SSE feed includes text, payment
gates, session state, and a terminal reply, payment result, or connection error.
A disconnected turn is never automatically retried.
