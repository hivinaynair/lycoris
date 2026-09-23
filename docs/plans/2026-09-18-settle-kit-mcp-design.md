# Settle Kit over MCP

A local stdio MCP server that turns any MCP-capable client into an agent that
buys x402-gated resources. The package is the deliverable; making somebody's own
Claude pay for the weather report is the proof.

## The claim

`/demo` today is a visitor *watching* a canned Eve agent buy a report. The agent
path is real, but the visitor's relationship to it is spectating. An MCP server
moves the agent into the client the visitor already has: their model calls the
tools, their mandate refuses when it should, and the refusal arrives in their own
conversation.

That is also the strongest available test of the package split. `@settle-kit/agents`
has exactly one consumer today — the Eve app — and a seam with one consumer is an
assertion, not a proof. A second host with a completely different shape (no Eve
runtime, no React, no HTTP server, a process speaking JSON-RPC over stdin) either
drops onto the existing surface or exposes where the surface was really Eve-shaped
all along.

## Scope

**In.** One package, `packages/settle-kit/mcp` → `@settle-kit/mcp`, with a bin.
Stdio transport. Seven tools. Held-payment approval over MRTR. A signer and a
mandate supplied by the process environment.

**Out, deliberately.** No hosted server, no authorization server, no OAuth, no
consent screen, no per-visitor agent provisioning, no abuse controls, no new app.

These were designed and then cut. The reasoning is in [Rejected](#rejected); read
it before proposing any of them back, because each was cut for a specific reason
rather than for size.

**Deferred.** A demo credential minted on the site (see
[Stage 5](#stage-5--minted-demo-credential-gated)), gated on a funding decision
that has nothing to do with MCP.

## Protocol target, and the trap

Target revision is **2026-07-28**, modern-only. No legacy era served.

There is one trap here and a fresh agent will walk into it. **`@modelcontextprotocol/sdk`
is the wrong package.** That is the v1 line; `1.30.0` has
`LATEST_PROTOCOL_VERSION = '2025-11-25'` and cannot speak 2026-07-28 at all. The
current SDK is a v2 family of scoped packages published 2026-07-27:

| Package | Version | Use |
| --- | --- | --- |
| `@modelcontextprotocol/server` | `2.0.0` | the server; `./stdio` subpath is our transport |
| `@modelcontextprotocol/core` | `2.0.0` | shared Zod schemas (transitive) |
| `@modelcontextprotocol/client` | `2.0.0` | tests only |
| `@modelcontextprotocol/conformance` | `0.1.16` | protocol conformance harness |
| `@modelcontextprotocol/server-legacy` | `2.0.0` | **not used** — the escape hatch if a client turns out to be legacy-only |

Pin all of them exactly. The v2 line is six weeks old and moved on 2026-09-17;
there is an open issue on era-negotiation probing (`[v2] Era-negotiation probe
drops spec-conformant server/discover responses`). Expect churn and do not float
a caret.

Nothing in v2 puts 2026-era bytes on the wire by default — serving the revision
is an explicit opt-in. The authoritative guide is
`docs/migration/support-2026-07-28.md` in `modelcontextprotocol/typescript-sdk`.
Read it before writing transport code; it is more current than this document.

### What 2026-07-28 changes, and why we care

Four removals shape this design. They are not incidental:

1. **Protocol sessions are gone.** No `initialize` handshake, no `Mcp-Session-Id`.
   Cross-call state is server-minted handles passed as ordinary tool arguments.
   Every request carries its protocol version and client capabilities in `_meta`.
   `server/discover` is a MUST.
2. **Server→client requests are gone.** No `elicitation/create`, no
   `sampling/createMessage` pushed from the server. Input is obtained *in band*
   via [MRTR](#the-payment-flow).
3. **SSE resumability is gone.** A broken response stream loses the in-flight
   request and the client MUST re-issue it with a **new request id**. For a tool
   that spends money this is a double-pay hazard written into the transport, and
   it is why [idempotency](#idempotency-is-forced) is mandatory rather than nice.
4. **Roots, Sampling and Logging are deprecated.** Do not add support. Log to
   `stderr`.

Also renumbered: `HeaderMismatch` → `-32020`, `MissingRequiredClientCapability` →
`-32021`, `UnsupportedProtocolVersion` → `-32022`, and resource-not-found moved
from `-32002` to `-32602`.

### Risk, recorded

Modern-only means a client that does not negotiate the 2026 era cannot connect.
v2 clients default to the *legacy* handshake; modern is opt-in on the client side
too, via `ClientOptions.versionNegotiation` (`{ mode: 'auto' }` probes
`server/discover`; `{ pin: '2026-07-28' }` refuses to fall back).

**We have not verified which era any shipping client negotiates.** This was a
deliberate decision to proceed without that fact. Over stdio it is recoverable —
the developer controls the config and sees a clear connect failure — which is
precisely why the stdio package goes first and the hosted server does not. If a
client that matters turns out to be legacy-only, `@modelcontextprotocol/server-legacy`
serves the 2025 era alongside, and the migration guide is explicit that an
`inputRequired(...)` handler needs no branching: the legacy shim serves it to
2025-era connections as real server→client requests.

## Placement

```
packages/settle-kit/mcp/
  src/
    index.ts          createSettleMcpServer()
    bin.ts            stdio entry
    tools/            one file per tool
    facilitator.ts    decision record over HTTP
    ids.ts            prefixed + derived ids
    money.ts          the money object
    store.ts          payment idempotency
```

One export, transport-agnostic:

```ts
createSettleMcpServer({
  getSigner,        // () => Promise<PaymentSigner-ish> — the x402 scheme's client
  getMandate,       // () => Promise<string>  — serialized X-AP2-Mandate header
  facilitatorUrl,   // string
  allowlist,        // string[] — resource URLs this process may pay
  store,            // optional idempotency port; in-memory default
})
```

`bin.ts` reads configuration from the environment, builds the factory, and
attaches `@modelcontextprotocol/server/stdio`. Dependencies are
`@modelcontextprotocol/server` and `@settle-kit/agents`. Nothing else.

### Rejected placements

**Not `apps/lycoris`.** Lycoris is the merchant — it serves `/api/weather/*`. An
agent living inside the merchant app is an agent paying itself, which destroys
the thing being demonstrated.

**Not `apps/facilitator`.** The facilitator is the merchant-side verifier.
Putting the payer in the same process collapses agent → facilitator → merchant
into one box.

**Not a new app.** That was the hosted design. It is cut.

## Authority model

**Authority comes from the process configuration, never from model arguments.**
This is [payment-scope.ts](../../apps/agent/agent/lib/payment-scope.ts)
generalised. That file's comment — *"Payment authority comes from the
authenticated transport, never model arguments"* — is the invariant this package
must preserve under a protocol whose entire premise is that a model supplies
arguments.

The resolution: the model chooses **whether** to spend. It cannot choose the
wallet, the mandate, the limit, or the merchant.

`pay_for_resource` **does** accept a `url`, and the mandate refuses anything it
does not name. Keeping the argument is deliberate — since `fc2f1bd` the mandate
binds the merchant it authorizes, so a rogue URL is refused by the facilitator
with a decision record rather than by a silent argument validator. "Ask your model
to pay a different site and watch the gate refuse, with evidence" is a better
demonstration than a 400.

The `allowlist` is a second, local check in front of that. Defence in depth, and
it keeps a misconfigured process from making pointless facilitator calls.

### Idempotency is forced

Payment ids are **derived, not random**:

```
pay_<hmac(agent, resource, amountAtomic, quoteNonce)>
```

The payment id and the idempotency key are the same string. A re-issued
`pay_for_resource` — which the transport now *requires* a client to send with a
fresh request id after a broken stream — recomputes the same id, finds the
completed payment, and returns it verbatim instead of buying the report twice.

Prefixed ids throughout, per the same reasoning: `agt_`, `mdt_`, `qte_`, `pay_`.
Opaque UUIDs are unreadable to a model and to a log.

The default store is in-memory and therefore per-process. Say so in the README —
the SDK already tells the truth about `@settle-kit/core` sessions living in
memory, and this is the same honesty. The `store` port exists for hosts that need
more.

## Tool contracts

Money is **one object**, never a loose number:

```ts
{ decimal: "0.10", atomic: "100000", currency: "USDC", display: "0.10 USDC" }
```

The model copies `atomic` when a tool needs it and speaks `display` to a human.
`parseUsdcAmount` already enforces this discipline inside the SDK; this stops it
leaking at the boundary. Never emit a JSON number for money.

| Tool | Returns |
| --- | --- |
| `get_agent_identity` | payer address, `agt_`, ERC-8004 registry id, whether registered |
| `get_mandate` | `mdt_`, delegator, cap, expiry, bound merchant, spent, remaining |
| `get_balance` | USDC balance as a money object |
| `quote_resource(url)` | x402 terms only — what does this cost? |
| `pay_for_resource(url)` | the money tool; see below |
| `get_payment_status(pay_id)` | status, settlement hash, explorer link |
| `get_decision_record(pay_id)` | facilitator evidence, failing gate |

`quote_resource` is terms only, which keeps it read-only. Permission is not a
buyer call: the facilitator enforces identity, mandate, and balance on verify
and settle. Six of the seven tools are read-only by design.

Reuse from `@settle-kit/agents`: `quoteResource`, `createPaidFetch`,
`payForResource`, `serializeMandateHeader`, `verifyMandateLocal`.

### Cache fields

2026-07-28 requires `ttlMs` and `cacheScope` on cacheable results — `tools/list`,
`prompts/list`, `resources/list`, `resources/read`, `resources/templates/list`.
**Not on `tools/call` results.** The SDK emits both fields automatically when
serving the revision, defaulting to `ttlMs: 0` and `cacheScope: 'private'`, which
is the conservative policy we want. Leave the defaults alone; the only candidate
for a real hint is `tools/list`, via `ServerOptions.cacheHints`.

Also: return tools from `tools/list` in a deterministic order. The spec asks for
it, and it improves prompt-cache hit rates downstream.

## The payment flow

1. Resolve the configured agent. Misconfigured process → fail at startup, not at
   the first payment.
2. `quoteResource(url)` → terms. Not x402-gated → an `isError` result naming
   that, not a throw.
3. Derive `pay_`. A completed payment under that id → return it verbatim. This is
   the re-issue path and it is load-bearing.
4. `payForResource({ url, paidFetch })`. The facilitator verifies and settles.
   A bad mandate, identity, or balance fails on that path and comes back on the
   decision record, not from a buyer permission call.
5. Poll the decision record → return settled, hash, explorer link, and evidence.

There is no buyer permission round. A hold that only existed to ask “is this
allowed?” before spend is the same check verify and settle already run, and it
could say yes and then fail. The grant is the mandate. The rail enforces it.

### `requestState` is untrusted input

It round-trips through the client, so it comes back as attacker-controlled bytes.
Seal it:

```ts
const stateCodec = createRequestStateCodec<PayPhase>({ key, ttlSeconds, bind });
// ServerOptions: { requestState: { verify: stateCodec.verify } }
const state = ctx.mcpReq.requestState<PayPhase>();
```

`createRequestStateCodec` HMAC-SHA256-seals a JSON payload; it is **signed, not
encrypted**, so the client can decode it — never put a secret in there. Bind it
to the principal and the originating method and parameters, give it a short TTL,
and reject failed verification (the seam answers `-32602` above the tool funnel).

Model the phases as a discriminated union and switch on the phase. `inputResponses`
are **per round** and replace rather than accumulate, so anything learned in an
earlier round must be threaded through `requestState` itself.

`pay_for_resource` does not mint request state. A future human hold on the
money path would seal that state this way, with a process-local key.

## Boundary consequence

`check-boundaries` will not let `@settle-kit/mcp` reach into `@repo/shared`, and
it should not. Decision-record polling lives in `@settle-kit/agents` and the
Eve tool reads it after a payment. The buyer does not call a permission endpoint.

The package polls decision records in `facilitator.ts` against that HTTP contract,
taking `facilitatorUrl` from the factory. Mandate helpers are already exported
from `@settle-kit/agents` and come free.

Do not "fix" this by loosening the boundary. The duplication is the price of the
package being installable outside this repo, which is the entire point.

## Errors

Anything an agent could recover from is an `isError` tool result with a
structured payload naming the gate. Models recover from content, not from
JSON-RPC codes. Protocol errors stay reserved for malformed params,
`requestState` verification failure, and version mismatch.

Mirror the existing error-code discipline: `SettleError.code` is a fixed union so
a host can branch rather than parse messages, and the README's "whose problem"
column is the right instinct to carry across. A gate refusal is the buyer's
problem; a missing mandate at startup is the integrator's.

Never log the mandate, the signer key, or CDP credentials. Addresses and
settlement hashes are public on-chain and fine to log.

## Configuration

Environment, read in `bin.ts`, validated at startup:

| Variable | Meaning |
| --- | --- |
| `SETTLE_MCP_MANDATE` | serialized `X-AP2-Mandate` header value |
| `SETTLE_MCP_FACILITATOR_URL` | facilitator base URL |
| `SETTLE_MCP_ALLOWLIST` | comma-separated resource URLs |
| CDP credentials *or* a private key | whichever backs the x402 scheme's client |

Fail loudly and specifically at startup. A payments process that boots
half-configured and discovers it at the first payment is the worst possible
failure ordering.

## Distribution blocker, recorded

**`bunx @settle-kit/mcp` does not work, because nothing is published.** Today the
client config a user would need reads:

```json
{ "command": "bun", "args": ["/absolute/path/to/lycoris/packages/settle-kit/mcp/dist/bin.js"] }
```

which works for the author and nobody else. This package's value is *gated on*
the distribution fix, not independent of it — the same absolute-path friction the
README already carries for the other packages.

Until an npm release happens, this is a repo-local demo. Treat publishing as a
sibling task, not a follow-up. See [docs/settle-kit-releases.md](../settle-kit-releases.md);
it still needs scope ownership, credentials, and a license decision.

## Testing

`@modelcontextprotocol/conformance` against the server, which turns the era
question from an assumption into a test. Beyond that, unit tests for the four
things that can lose money:

1. **Mandate refusal** — a URL the mandate does not name is refused, and the
   refusal names the gate.
2. **Idempotent replay** — the same business event re-issued with a fresh request
   id returns the original payment and submits nothing.
3. **`requestState` tampering** — a mutated or expired seal is rejected before
   the handler runs.
4. **Quote drift** — a price that moves across an approval round refuses instead
   of paying the new amount.

Everything here runs without hosting, which means it runs in CI. That is a
property the hosted design did not have.

Repo gates as usual: `bun run check-types && bun run check-boundaries &&
bun run check-tokens && bun test`.

## Staging

### Stage 1 — read-only tools
Package skeleton, stdio transport, BYO signer and mandate.
`get_agent_identity`, `get_mandate`, `get_balance`, `quote_resource`. No money
moves. Conformance green.

### Stage 2 — `pay_for_resource`
Derived ids, the idempotency store, `get_payment_status`,
`get_decision_record`. Money moves on Base Sepolia.

### Stage 3 — held payments
`requestState` codec, MRTR approval round, quote-drift refusal.

### Stage 4 — docs
README package table, `llms.txt`, a per-client config snippet, and the
compatibility note about the 2026 era.

### Stage 5 — minted demo credential (gated)
A `POST` on the site that provisions a CDP account, an ERC-8004 registration and
a capped mandate, and returns a copy-paste config block. **Blocked on a funding
decision**: the sponsor is capped at 1 USDC total, which is roughly three
visitors. Do not start this until that cap has an answer.

## Costs, stated

Real testnet transactions on Base Sepolia. Each payment is USDC out of the
configured agent's wallet plus facilitator-paid gas. Stage 5 adds two on-chain
transactions per credential minted.

## Rejected

**A hosted MCP server at `lycoris.vinaynair.dev/mcp`.** Designed in full, then
cut. It required an OAuth 2.1 authorization server written from scratch — no
official package provides one; `@modelcontextprotocol/server` exports only `.`,
`./stdio`, `./_shims` and two validators — plus a consent screen, per-visitor
on-chain provisioning, and abuse controls. The most expensive component was the
least interesting one: nobody admires this repo for its authorization server, and
shipping a shaky one in a project about payments is worse than shipping none. It
also bet the flagship demo on an unverified assumption about which protocol era
clients negotiate. Revisit when the stdio package has demonstrated that people
connect at all.

**The mandate as an OAuth consent screen.** The best idea in the hosted design —
approving a scoped, expiring, merchant-bound spend authority *is* what an OAuth
consent screen does, and rendering an AP2 mandate there makes the analogy
literal. It dies with the AS. Worth reviving if a hosted server is ever
justified.

**Dual-era serving.** `server-legacy` makes it cheap, but every money path would
have two code paths to hide a bug in. Modern-only until a client forces the
issue.

**Session-carried identity.** Not merely unwise under 2026-07-28 — unimplementable.
Protocol sessions do not exist.

## Future work

- **`@modelcontextprotocol/ext-apps`** renders interactive UI inside the client.
  A mandate, a quote, or a settlement receipt as a component rather than a wall
  of JSON is the natural next move once the tools are stable.
- **Velocity limits in the mandate** — per-day and per-month caps alongside the
  per-transaction maximum, which is what makes `held` a routine outcome rather
  than an edge case, and what makes the approval round earn its complexity.
- **Tasks extension** (`io.modelcontextprotocol/tasks`) for slow settlement:
  return a task handle and let the client poll `tasks/get` instead of blocking.

## Provenance

Shaped 2026-09-18 from a comparison against Natural (`natural.com`), an agentic
payments platform whose distribution model is a skill an agent installs. Three
conventions are taken directly: money as a single object with `decimal` /
`currency` / `display`; prefixed resource ids; and re-reading a request to reject
an amount mismatch before submitting a payment a human approved.

Protocol facts verified against `modelcontextprotocol/modelcontextprotocol`
(`schema/`), the 2026-07-28 changelog and client-registration pages, the npm
registry, and `docs/migration/support-2026-07-28.md` in the TypeScript SDK.
Where this document and that guide disagree, the guide is right — it moves.
