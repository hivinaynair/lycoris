# Lycoris walkthrough and evidence

Updated September 20, 2026 for sponsored smart-account checkout and the guided tour.
The older simulation-only recording and its timing are superseded.

## A 90-second overview

Open `/walkthrough`, then follow its four steps. The guide stays visible only while
`tour=1` is present. It navigates between steps; it does not imply a payment succeeded
or automatically spend funds. Live network and agent waits can exceed 90 seconds.

| Time | Screen | Explain |
| --- | --- | --- |
| 0–12s | Tour | One paid API, purchased by a person or an agent. Testnet scope. |
| 12–25s | Checkout | No signup or personal wallet. Faucet-funded smart account and sponsored gas. |
| 25–38s | Confirmed report | Operation confirmed, report delivered, transaction available to inspect. |
| 38–55s | Agent purchase | HTTP 402, host-controlled authority, permission checks, settlement. |
| 55–70s | Spending refusal | The mandate cannot cover the price; no settlement transaction. |
| 70–82s | Decision feed | Inspect actual recorded attempts and available commitments. Roles are demo views. |
| 82–90s | Case study | Architecture, implementation ownership, difficult decisions, and limits. |

## Narrated screen overview

The website’s `/walkthrough/overview.mp4` is an **edited overview of captured screens**,
with synthetic narration and WebVTT captions. It is not a continuous recording or a
latency benchmark. Its payment-result screens must come from actual observed runs;
do not create success screens or hashes for the video. The committed media lives in
`apps/lycoris/public/walkthrough/`. The engineering write-up is
[the case study](../case-study.md).

## Automated checkout recording

`RECORD_WALKTHROUGH=1 bun run --cwd e2e/web e2e tests/walkthrough.spec.ts --workers=1` is a separate, silent checkout-only browser fixture.
It mocks funding, bundler, paymaster, chain, and report calls and must not be presented
as live settlement evidence. It writes `test-results/lycoris-walkthrough.webm`.
The current fixture installs its payment mocks before visiting the page and preserves
the video handle before closing the context.

## Validation boundaries

- Repository checks: `bun run check-types`, `bun run check-boundaries`,
  `bun run check-tokens`, `bun test`, and `git diff --check`.
- A mocked checkout does not validate a live provider.
- Browser review: the four tour destinations, scenario selection when navigating
  between agent steps, exit behavior, light/dark appearance, and mobile overflow.
- Sponsor configuration: `bun --env-file=apps/lycoris/.env.local scripts/demo/check-sponsored-config.ts` checks the configured
  database cap and smart-account columns without changing data. It does not prove
  the deployed app has the same environment or that the paymaster has capacity.
- Live evidence: actual testnet checkout and agent runs, evaluated separately from
  local tests. Historical decision rows are not rewritten by the resource parser fix.

The reviewed implementation uses a browser-owned smart account, a server faucet,
and a paymaster. Report delivery checks the operation and its USDC transfer; it does
not ask the visitor for a report-ownership signature. Core receipt retry checks the
submitted hash rather than sending another payment. Complete durable reconciliation
and production finality are outside this demo.
