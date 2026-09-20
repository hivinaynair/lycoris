/**
 * Docs an agent can read.
 *
 * This repository's subject is agents paying for resources, so serving its own
 * documentation in a form an agent can consume is the argument made twice. The
 * paid routes below advertise their own terms: an agent that finds this file
 * knows what a 402 from us means and how to satisfy it.
 */
const body = `# Lycoris · Settle Kit

> USDC payments for people and agents, on Base Sepolia with test USDC.
> A TypeScript SDK for checkout, paid agent requests, and payment-protected APIs.

## Packages

- @settle-kit/core: headless checkout sessions, USDC balance preflight, transfer submission, receipt confirmation. No React, DOM, wagmi or x402.
- @settle-kit/react: SettleProvider, useCheckout, and an optional checkout UI. React 19 and viem 2.
- @settle-kit/agents: x402 paid fetch and AP2 mandate helpers.
- @settle-kit/server: a Next.js paid-route wrapper.
- @settle-kit/mcp: a local stdio MCP server that buys x402-gated resources. Modern-only (2026-07-28). bunx @settle-kit/mcp does not work yet; nothing is published.

## Paying for a resource here

Paid endpoints answer 402 with an x402 challenge naming the scheme, network,
amount and recipient. Settlement is USDC on Base Sepolia (chain 84532), token
0x036CbD53842c5426634e7929541eC2318f3dCF7e. The agent path signs an EIP-3009
authorization; a facilitator verifies it, submits it, and pays the gas.

Agent identity is an ERC-8004 registry entry. Spend authority is an EIP-712 AP2
mandate carried in the X-AP2-Mandate header, naming the agent, its delegator, a
maximum amount and an expiry. A request without a mandate is refused before any
payment is attempted.

## Docs

- /walkthrough: guided checkout, agent purchase, refusal, and evidence tour
- /case-study: engineering decisions, ownership, validation, and production limits
- /docs: SDK reference, React, wallet, agent and server examples
- /checkout: a working checkout, sponsored, no wallet required
- /demo: an agent buying the same resource over x402
- /feed: public payment commitments and disclosed decision evidence

## Writing a signer

The SDK ships no wallet library. A host implements three fields — address,
sendTransaction, getChainId — and keeps its own wallet stack. ERC-4337 smart
accounts satisfy the same interface; the hash they return is a userOpHash, and
confirmation must read UserOperationEvent.success rather than the bundle
transaction's status.

See docs/writing-a-payment-signer.md in the repository.

## Scope

Base Sepolia and test USDC only. No mainnet, cards, fiat onramps, swaps or
bridges. Experimental; not published to npm.
`;

export async function GET() {
  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
