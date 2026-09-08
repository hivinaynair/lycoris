# Settle Kit review follow-up

This refines the September 7 design without expanding its payment scope.

| Improvement | Contract | What I would say in the interview |
| --- | --- | --- |
| Receipt confirmation | `settle` submits; `confirm` verifies; only a successful receipt produces `settled` | A transaction hash proves submission. Success requires confirmation. |
| In-flight session safety | Reset, duplicate pay and another `begin` reject during settlement; unknown receipts retain the hash and retry status only | Starting another purchase cannot orphan an in-flight payment. |
| Amount and expiry binding | Quotes match the requested display/atomic amounts; expiry checked after wallet and balance reads | The amount the buyer approves is the amount encoded in the transfer. |
| Runtime contract | Positive USDC amounts; Base Sepolia Circle USDC only; validated recipient overrides | The implementation enforces the narrow contract I advertise. |
| React embed | `begin` automatically quotes USDC; subsequent `pay` works; two SKUs share one Provider | A merchant's custom button gets the same lifecycle as the default UI. |
| Paid fetch | Preserve Request semantics; metadata is per response across retries/concurrency | The wrapper adds payment without losing the host request. |
| Product presentation | Checkout-first README; buyer-facing storefront; technical details behind disclosure | I extracted an embeddable checkout from an existing payment rail. |
| Package evidence | Parsed import/manifest rules and a packed-package external Next smoke | I verify the integration outside my own app, not just inside the monorepo. |

## Verification commands

```sh
bun run check-types && bun run check-boundaries && bun run check-tokens && bun test
bun run smoke:settle-kit
```

The independent Next fixture uses simulated signing and receipts. A passing build
or browser test does not prove a live on-chain transfer. Tests cover delayed/reverted/
unavailable receipts, reset races, quote mismatches, wallet delays, two React
purchases, preserved Request fields and concurrent metadata.

## Limits retained

USDC → USDC on Base Sepolia, no cards/KYC/onramp/DEX/bridge. In-memory sessions, no
reload recovery. One receipt confirmation; preflight is not a balance lock. Unknown
or replaced transactions retain the original hash and require status/explorer inspection.
Keep the page open until confirmed. This is an interview artifact, not fulfillment
infrastructure. Agent pay still targets its x402 resource payee, separately from the
merchant checkout. ERC-8004 remains agent identity, not KYC.

## Verified on September 8

- Required command chain: types, boundaries, tokens, **131 Bun tests passing**.
- `bun run smoke:settle-kit`: packed core/react installed in a temporary directory
  outside the workspace; Next production build and two browser purchases passed.
- Lycoris Chromium checkout suite: **3 passing** (missing wallet/mobile layout,
  insufficient balance/no send, receipt confirmation/two purchases).
- Desktop/mobile screenshots inspected; the active navigation contrast was corrected.
- Browser payment tests use simulated wallets and RPC receipts. No live transaction,
  deployment or package publication was performed.

Rendering also required declaring Tailwind in `@repo/ui`, which imports its CSS;
that dependency and the one-line lockfile addition are included. The shared rail
package must be built before starting the full demo locally, as noted in the README.
