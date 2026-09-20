# @settle-kit/mcp

A local **stdio** MCP server that buys x402-gated resources through
`@settle-kit/agents`. The model chooses whether to spend. It cannot choose the
wallet, the mandate, the limit, or the merchant — those come from the process
environment.

Protocol revision **2026-07-28**, modern-only. A client that does not negotiate
that era cannot connect.

## bunx @settle-kit/mcp does not work yet

Nothing is published. The config a user needs today is:

```json
{
  "mcpServers": {
    "settle-kit": {
      "command": "bun",
      "args": ["/absolute/path/to/lycoris/packages/settle-kit/mcp/dist/bin.js"]
    }
  }
}
```

That works for the repo author and nobody else. Treat publishing as a sibling
task, not a follow-up. See [docs/settle-kit-releases.md](../../../docs/settle-kit-releases.md).

Build the bin first:

```sh
bun install --frozen-lockfile
bun run --cwd packages/settle-kit/mcp build
```

## The client must negotiate 2026-07-28

v2 MCP clients default to the 2025-era `initialize` handshake. This server
refuses that (`legacy: "reject"`). Opt in:

```ts
import { Client } from "@modelcontextprotocol/client";

const client = new Client(
  { name: "your-client", version: "1.0.0" },
  { versionNegotiation: { mode: "auto" } },
);
```

`mode: "auto"` probes `server/discover` and falls back to legacy against a
2025-only server. `{ pin: "2026-07-28" }` refuses to fall back. A default-mode
client is rejected here on purpose — that decision is a test, not a comment.

Do not add `@modelcontextprotocol/sdk`. That is the v1 line; it cannot speak
2026-07-28.

## Configuration

Read at startup. A missing key throws, naming the key. A payments process that
boots half-configured and discovers it at the first payment is the worst
possible failure ordering.

| Variable | Meaning |
| --- | --- |
| `SETTLE_MCP_MANDATE` | serialized `X-AP2-Mandate` header value |
| `SETTLE_MCP_FACILITATOR_URL` | facilitator base URL |
| `SETTLE_MCP_ALLOWLIST` | comma-separated resource URLs this process may pay |
| `SETTLE_MCP_PRIVATE_KEY` | hex private key for the x402 signer |
| `CDP_API_KEY_ID`, `CDP_API_KEY_SECRET`, `CDP_WALLET_SECRET`, `SETTLE_MCP_CDP_ACCOUNT` | alternative to the private key |
| `SETTLE_MCP_RPC_URL` | optional Base Sepolia RPC for balance and ERC-8004 lookup |

Authority comes from this configuration, never from model arguments. The model
may pass a `url` to `pay_for_resource`; the mandate and the allowlist refuse
anything they do not name.

## Tools

Six of the seven are read-only. Money is one object, never a JSON number:

```json
{ "decimal": "0.10", "atomic": "100000", "currency": "USDC", "display": "0.10 USDC" }
```

| Tool | Returns |
| --- | --- |
| `get_agent_identity` | payer address, ERC-8004 registry id, whether registered |
| `get_mandate` | delegator, cap, expiry, bound merchant |
| `get_balance` | USDC balance as a money object |
| `quote_resource(url)` | x402 terms **and a preclear verdict** |
| `pay_for_resource(url)` | derived `pay_` id, settlement hash, explorer link |
| `get_payment_status(pay_id)` | status, hash, explorer link |
| `get_decision_record(pay_id)` | facilitator evidence, failing gate |

`pay_for_resource` is idempotent by derivation: the payment id is
`pay_<sha256(agent, resource, amount, quoteNonce)>`. A client that re-issues
the call after a broken stream (which 2026-07-28 requires, with a new request
id) gets the original payment back instead of buying twice.

A held preclear asks a human in-band via MRTR (`input_required`). Approving
`0.10` and then seeing a different quote refuses and re-asks; it does not pay
the new number.

## In-memory store

The default idempotency store is per-process. A restart forgets completed
payments. Hosts that need more can pass `store` to `createSettleMcpServer()`.

## Embed the factory

```ts
import { createSettleMcpServer } from "@settle-kit/mcp";
import { serveStdio } from "@modelcontextprotocol/server/stdio";

serveStdio(
  () =>
    createSettleMcpServer({
      getSigner,
      getMandate,
      facilitatorUrl,
      allowlist,
    }),
  { legacy: "reject" },
);
```

Base Sepolia and test USDC only. Experimental; not published to npm.
