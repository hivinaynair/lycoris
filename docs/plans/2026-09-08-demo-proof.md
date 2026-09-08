**Weather resource update:** Both paths now buy Melbourne weather for 0.1 USDC. The earlier recorded video predates this resource change; rerun `bun run record:walkthrough` for a current recording. Human report access uses server-verified payment plus a wallet ownership signature.

# Local interview preview

Run `bun run dev:ui` and open http://localhost:3003/checkout. Deployment is intentionally
pending: Vinay requested local preview only.

## 90-second walkthrough

`bun run record:walkthrough` creates `test-results/lycoris-walkthrough.webm`.
This is a silent screen recording; the following is its narration guide.

- **0–10s:** “Lycoris is an embeddable USDC checkout. The playground lets you try the
  real SDK lifecycle without a wallet or moving funds.”
- **10–24s:** “The app shares light and dark design tokens. Merchants can inherit
  their app's theme or override appearance without changing payment state.”
- **24–40s:** “A Provider takes the destination and a host-owned signer. Checkout
  handles review, balance checking, submission, and receipt confirmation.”
- **40–50s:** “Insufficient USDC fails before sending a transaction. Errors are
  typed state that the host can render.”
- **50–68s:** “Submission is not settlement. If confirmation is delayed, retry
  checks the existing hash. It never sends a second payment.”
- **68–80s:** “You can use the styled Checkout, customize its appearance, or build
  entirely with the headless hook and your own components.”
- **80–90s:** “This version supports USDC on Base Sepolia only. The agent x402 demo
  is a separate consumer of the shared core, with its own resource payee.”

## Bundle measurement

`bun run measure:settle-kit` measures compiled ESM with esbuild minification and
splitting. React/ReactDOM are external; viem is included. Gzip is summed per file,
including lazy chunks. This is SDK cost, not full Next.js page cost or a latency test.

Measured September 8, 2026:

| Entry | Entry gzip | All chunks gzip |
| --- | ---: | ---: |
| Core | 3,025 B | 99,235 B |
| React hook | 3,668 B | 99,878 B |
| Styled UI | 5,446 B | 101,656 B |

CSS adds 1,295 B gzip. No agent SDK/x402 code appears in these consumer graphs.
Lazy RPC imports are limited to the used client and Base Sepolia chain, rather than
loading the entire chain registry. Rerun for current numbers; entry size alone is
not the full cost of completing a payment.

## Verification

Latest local run: all required checks passed, 136 unit tests passed, and 9 browser
tests passed. The recording-only test is skipped in normal test runs. The packed
Next.js production smoke passed with two purchases and no browser errors.

- Required repository checks: types, boundaries, tokens, Bun tests.
- Browser suite: simulated success/rejection/insufficient/delayed outcomes,
  wallet adapter checks, appearance continuity, theme persistence, keyboard
  focus, 390px overflow, and automated axe accessibility checks.
- Packed-package smoke: a separate Next app installs built SDK tarballs without
  monorepo transpilation configuration and completes simulated purchases.

Automated accessibility checks supplement manual light/dark and mobile inspection;
they do not establish complete accessibility conformance. No real funds are used
in these browser checks, and no public deployment is claimed.
