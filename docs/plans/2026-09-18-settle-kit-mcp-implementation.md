# Settle Kit over MCP Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ship `@settle-kit/mcp`, a local stdio MCP server that lets any MCP client buy x402-gated resources through `@settle-kit/agents`.

**Architecture:** One package under `packages/settle-kit/mcp` exporting `createSettleMcpServer()` plus a stdio bin. Authority (signer, mandate, allowlist) comes from process configuration, never from model arguments. Seven tools, six read-only. Held payments use MRTR to ask a human in-band.

**Tech Stack:** Bun 1.4, TypeScript 5.9, `@modelcontextprotocol/server` 2.0.0 (protocol revision 2026-07-28, modern-only), `@settle-kit/agents`, `viem`, `zod`.

**Design doc:** [2026-09-18-settle-kit-mcp-design.md](2026-09-18-settle-kit-mcp-design.md). Read it first. It records what was cut and why.

---

## Before you start

**The SDK trap.** `@modelcontextprotocol/sdk` is the *v1* line and tops out at protocol
revision `2025-11-25`. It cannot do this job. You want the v2 family:
`@modelcontextprotocol/server@2.0.0`. Pin exact versions — v2 is weeks old and moving.

**The authoritative API reference** is `docs/migration/support-2026-07-28.md` and
`docs/protocol-versions.md` in `modelcontextprotocol/typescript-sdk`. Where a code
snippet in this plan disagrees with those docs, **the docs win** — several signatures
below were inferred from prose examples rather than from typings. Snippets marked
**[verify]** are the ones to check against the real types before you lean on them.

**Conventions.** Bun only (`bun test`, `bunx`). Tests are colocated `*.test.ts` using
`bun:test` (`describe` / `it` / `expect`). Every commit message ends with:

```
Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
```

**Gates before any merge:**

```bash
bun run check-types && bun run check-boundaries && bun run check-tokens && bun test
```

---

## Task 1: Register a fifth SDK package

Five files hardcode the list of Settle Kit packages. All five must learn `mcp` before
anything else compiles or passes boundary checks.

**Files:**
- Modify: `scripts/lib/settle-kit-boundaries.mjs:5-10` (the `allowed` map)
- Modify: `scripts/check-settle-kit.mjs:8`
- Modify: `scripts/build-settle-kit.mjs:5`
- Modify: `scripts/lib/sdk-release.mjs:4`
- Inspect: `scripts/smoke-settle-kit-next.mjs:15`
- Create: `packages/settle-kit/mcp/package.json`
- Create: `packages/settle-kit/mcp/tsconfig.json`
- Create: `packages/settle-kit/mcp/src/index.ts`

**Step 1: Add the allowlist entry**

In `scripts/lib/settle-kit-boundaries.mjs`, add to `allowed`:

```js
mcp: ["@settle-kit/core", "@settle-kit/agents", "@modelcontextprotocol/server", "viem", "zod"],
```

This is the first package permitted to depend on `@settle-kit/agents`.

**Step 2: Add `"mcp"` to the three name lists**

`scripts/check-settle-kit.mjs:8`, `scripts/build-settle-kit.mjs:5`, and
`scripts/lib/sdk-release.mjs:4` each become `["core", "react", "agents", "server", "mcp"]`.

**Step 3: Decide on the smoke list — do not guess**

Read `scripts/smoke-settle-kit-next.mjs`. That script installs packed SDKs into an
independent **Next.js** consumer. `@settle-kit/mcp` is not a Next consumer, so it
probably does *not* belong there. Confirm by reading, then leave it out if that holds.
Write a one-line comment recording the decision.

**Step 4: Create the manifest**

`packages/settle-kit/mcp/package.json`, mirroring `packages/settle-kit/agents/package.json`:

```json
{
  "name": "@settle-kit/mcp",
  "version": "0.0.1",
  "type": "module",
  "sideEffects": false,
  "bin": { "settle-kit-mcp": "./dist/bin.js" },
  "exports": {
    ".": { "types": "./dist/index.d.ts", "bun": "./src/index.ts", "default": "./dist/index.js" },
    "./package.json": "./package.json"
  },
  "scripts": {
    "check-types": "tsc --noEmit",
    "test": "bun test",
    "build": "bun ../../../scripts/build-settle-kit.mjs mcp",
    "prepack": "bun run build"
  },
  "dependencies": {
    "@modelcontextprotocol/server": "2.0.0",
    "@settle-kit/agents": "workspace:*",
    "@settle-kit/core": "workspace:*",
    "viem": "^2",
    "zod": "^4"
  },
  "devDependencies": {
    "@modelcontextprotocol/client": "2.0.0",
    "@repo/typescript-config": "workspace:*",
    "typescript": "^5"
  },
  "files": ["dist", "src", "!src/**/*.test.ts", "README.md"],
  "description": "An MCP server that buys x402-gated resources.",
  "publishConfig": { "access": "public", "registry": "https://registry.npmjs.org/" }
}
```

Note the exact SDK versions — no carets.

**Step 5: Copy the tsconfig**

`packages/settle-kit/mcp/tsconfig.json` is byte-identical to
`packages/settle-kit/agents/tsconfig.json`.

**Step 6: Stub the entry**

`packages/settle-kit/mcp/src/index.ts`:

```ts
export {};
```

**Step 7: Install and verify the gates pass on an empty package**

```bash
bun install && bun run check-boundaries && bun run check-types
```

Expected: both pass. If `check-boundaries` fails, a name list was missed.

**Step 8: Commit**

```bash
git add scripts packages/settle-kit/mcp package.json bun.lock
git commit -m "$(cat <<'EOF'
chore(mcp): register a fifth settle-kit package

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: The money object

Money crosses the MCP boundary as one object so the model never reconstructs it.

**Files:**
- Create: `packages/settle-kit/mcp/src/money.ts`
- Test: `packages/settle-kit/mcp/src/money.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from "bun:test";
import { toMoney } from "./money";

describe("toMoney", () => {
  it("carries decimal, atomic, currency and display together", () => {
    expect(toMoney("100000")).toEqual({
      decimal: "0.10",
      atomic: "100000",
      currency: "USDC",
      display: "0.10 USDC",
    });
  });

  it("never emits a number", () => {
    const money = toMoney("100000");
    for (const value of Object.values(money)) expect(typeof value).toBe("string");
  });

  it("rejects an amount that is not atomic units", () => {
    expect(() => toMoney("0.1")).toThrow();
  });
});
```

**Step 2: Run it and watch it fail**

```bash
bun test packages/settle-kit/mcp/src/money.test.ts
```

Expected: FAIL, `Cannot find module './money'`.

**Step 3: Implement**

`formatUsdcAmount` is already exported from `@settle-kit/core` — use it rather than
writing decimal maths. Decide deliberately whether `formatUsdcAmount("100000")` returns
`"0.1"` or `"0.10"`; read the function before writing the assertion, and make the test
match the SDK rather than bending the SDK to the test.

**Step 4: Run and watch it pass**

**Step 5: Commit** — `feat(mcp): money crosses the boundary as one object`

---

## Task 3: Derived, prefixed ids

The payment id and the idempotency key are the same string. This is what makes a
re-issued call safe, and 2026-07-28 *requires* clients to re-issue after a broken
stream.

**Files:**
- Create: `packages/settle-kit/mcp/src/ids.ts`
- Test: `packages/settle-kit/mcp/src/ids.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from "bun:test";
import { derivePaymentId } from "./ids";

const event = {
  agent: "0xaaaa000000000000000000000000000000000000",
  resource: "https://example.test/api/weather/public",
  amountAtomic: "100000",
  quoteNonce: "abc123",
};

describe("derivePaymentId", () => {
  it("is stable for the same business event", () => {
    expect(derivePaymentId(event)).toBe(derivePaymentId({ ...event }));
  });

  it("changes when the amount changes", () => {
    expect(derivePaymentId({ ...event, amountAtomic: "200000" })).not.toBe(derivePaymentId(event));
  });

  it("changes when the resource changes", () => {
    expect(derivePaymentId({ ...event, resource: "https://elsewhere.test/x" })).not.toBe(
      derivePaymentId(event),
    );
  });

  it("is prefixed", () => {
    expect(derivePaymentId(event)).toStartWith("pay_");
  });
});
```

**Step 2: Run it and watch it fail**

**Step 3: Implement** with `node:crypto` `createHash("sha256")` over the four fields
joined by a separator that cannot appear in a URL or an address (`" "`), truncated
to 32 hex chars, prefixed `pay_`.

**Step 4: Run and watch it pass**

**Step 5: Commit** — `feat(mcp): payment ids are derived, not random`

---

## Task 4: The facilitator port

`check-boundaries` forbids reaching into `@repo/shared`, so preclear and decision-record
polling are reimplemented here against the same HTTP contract. **This duplication is
deliberate** — it is the price of the package being installable outside this repo. Do
not "fix" it by loosening the boundary.

Read these two files first as the reference implementation:
- `apps/agent/agent/lib/preclear.ts`
- `packages/shared/src/facilitator.ts`

**Files:**
- Create: `packages/settle-kit/mcp/src/facilitator.ts`
- Test: `packages/settle-kit/mcp/src/facilitator.test.ts`

**Step 1: Write the failing tests**

Follow the fetch-injection style already used in
`packages/settle-kit/agents/src/quote-resource.test.ts` — pass a fake `fetch` rather
than mocking globals.

```ts
import { describe, expect, it } from "bun:test";
import { preclear } from "./facilitator";

const ok = async () => new Response(JSON.stringify({ ok: true }), { status: 200 });
const refused = async () =>
  new Response(JSON.stringify({ ok: false, reason: "mandate_expired" }), { status: 200 });
const down = async () => {
  throw new Error("ECONNREFUSED");
};

const input = {
  facilitatorUrl: "https://facilitator.test",
  amountAtomic: "100000",
  mandateHeader: "header",
  payer: "0xaaaa000000000000000000000000000000000000",
  resource: "https://example.test/x",
};

describe("preclear", () => {
  it("passes a permitted payment", async () => {
    expect(await preclear(input, ok)).toEqual({ ok: true });
  });

  it("reports the gate that refused", async () => {
    expect(await preclear(input, refused)).toEqual({ ok: false, reason: "mandate_expired" });
  });

  it("treats an unreachable facilitator as a refusal, not a crash", async () => {
    expect(await preclear(input, down)).toEqual({ ok: false, reason: "facilitator_unreachable" });
  });
});
```

That last case matters: a payments tool that throws on a network blip is a tool that
reports "error" where it should report "I could not confirm you are allowed."

**Step 2: Run and watch them fail**

**Step 3: Implement** `preclear` and `getDecisionRecord`, sending the mandate as the
`X-AP2-Mandate` header exactly as `apps/agent/agent/lib/preclear.ts` does. Keep the
retry loop for decision records.

**Step 4: Run and watch them pass**

**Step 5: Commit** — `feat(mcp): a facilitator port inside the package boundary`

---

## Task 5: The server factory and a modern-only stdio bin

**Files:**
- Create: `packages/settle-kit/mcp/src/create-server.ts`
- Create: `packages/settle-kit/mcp/src/bin.ts`
- Modify: `packages/settle-kit/mcp/src/index.ts`

**Step 1: Write the factory** **[verify]**

```ts
import { McpServer } from "@modelcontextprotocol/server";

export type SettleMcpOptions = {
  getSigner: () => Promise<unknown>;
  getMandate: () => Promise<string>;
  facilitatorUrl: string;
  allowlist: string[];
  store?: PaymentStore;
};

export function createSettleMcpServer(options: SettleMcpOptions): McpServer {
  const server = new McpServer({ name: "settle-kit", version: "0.0.1" });
  // tools registered in later tasks
  return server;
}
```

Check the real `McpServer` constructor signature and whether `ServerOptions` is a second
argument — Task 11 needs to pass `{ requestState: { verify } }` there.

**Step 2: Write the bin, modern-only**

```ts
#!/usr/bin/env bun
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { createSettleMcpServer } from "./create-server";
import { readConfig } from "./config";

const config = readConfig(process.env); // throws, loudly, with the missing key named

await serveStdio(() => createSettleMcpServer(config), { legacy: "reject" });
```

`legacy: "reject"` is the modern-only knob — it refuses 2025-era openings. That is the
decision from the design doc, made concrete in one option.

**Step 3: Write `config.ts` and fail loudly at startup**

Read `SETTLE_MCP_MANDATE`, `SETTLE_MCP_FACILITATOR_URL`, `SETTLE_MCP_ALLOWLIST`, and the
signer credentials. A missing key throws **at startup, naming the key**. A payments
process that boots half-configured and discovers it at the first payment is the worst
possible failure ordering.

**Step 4: Verify it starts and answers**

```bash
bun packages/settle-kit/mcp/src/bin.ts
```

With no config, expect an immediate, specific error naming the missing variable. With
config, expect it to sit waiting on stdin.

**Step 5: Commit** — `feat(mcp): a modern-only stdio server`

---

## Task 6: The three identity tools

`get_agent_identity`, `get_mandate`, `get_balance`. All read-only. No money moves in
this task.

**Files:**
- Create: `packages/settle-kit/mcp/src/tools/identity.ts`
- Test: `packages/settle-kit/mcp/src/tools/identity.test.ts`

**Notes:**
- `get_mandate` decodes the configured header. `@settle-kit/agents` exports
  `verifyMandateLocal` and `serializeMandateHeader` — use them; do not re-implement
  EIP-712 decoding.
- `get_balance` reads USDC `balanceOf` with viem. You cannot import
  `@repo/shared/abis`, so inline the one-function ABI fragment.
- Every amount goes through `toMoney`.
- Return `mdt_` / `agt_` prefixed ids.

**Step 1: Write failing tests** for: a mandate past its expiry reports expired rather
than throwing; balance returns a money object; identity reports `registered: false`
when the agent has no ERC-8004 entry.

**Step 2–4:** fail, implement, pass.

**Step 5: Commit** — `feat(mcp): identity, mandate and balance tools`

---

## Task 7: `quote_resource`

This is the tool that makes "start read-only" real: x402 terms **and** a preclear
verdict, so the model can ask *may I* before it spends.

**Files:**
- Create: `packages/settle-kit/mcp/src/tools/quote.ts`
- Test: `packages/settle-kit/mcp/src/tools/quote.test.ts`

**Step 1: Write the failing tests**

1. A non-x402 URL returns an `isError` result naming that — **not** a throw.
2. A URL outside `allowlist` is refused locally, before any facilitator call.
3. A quoted resource returns terms plus the preclear verdict.
4. The amount in the result is a money object.

**Step 2–4:** fail, implement (`quoteResource` from `@settle-kit/agents`, then
`preclear`), pass.

**Step 5: Commit** — `feat(mcp): quote_resource carries a preclear verdict`

---

## Task 8: The idempotency store

**Files:**
- Create: `packages/settle-kit/mcp/src/store.ts`
- Test: `packages/settle-kit/mcp/src/store.test.ts`

A `PaymentStore` port — `get(payId)` / `put(payId, record)` — with an in-memory default.
In-memory means per-process, which means a restart forgets. Say so in the README; the
SDK already tells the truth about core sessions living in memory.

**Step 1: Write failing tests** for round-trip, absent key, and overwrite refusal (a
completed payment is never overwritten).

**Step 2–4:** fail, implement, pass.

**Step 5: Commit** — `feat(mcp): an idempotency store port`

---

## Task 9: `pay_for_resource`

The money tool. Read the design doc's flow section before writing it.

**Files:**
- Create: `packages/settle-kit/mcp/src/tools/pay.ts`
- Test: `packages/settle-kit/mcp/src/tools/pay.test.ts`

**Step 1: Write the failing tests — these four are the ones that can lose money**

1. **Idempotent replay.** Calling twice with the same business event submits **once** and
   returns the same `pay_` both times. Assert on a call counter in the injected fake,
   not just on the return value.
2. **Mandate refusal.** A URL the mandate does not name is refused, the result names the
   gate, and **no payment is submitted**.
3. **Allowlist refusal.** Refused locally, no facilitator call.
4. **Settlement failure.** A failed settlement returns `settled: false` with the hash
   retained — mirroring the SDK's existing rule that a hash is not success.

**Step 2: Run and watch all four fail**

**Step 3: Implement the flow**

Quote → derive `pay_` → store hit returns verbatim → preclear → `createPaidFetch` +
`payForResource` → poll the decision record → persist → return.

Reference implementation to mirror, including its ordering:
`apps/agent/agent/tools/fetch_paid_resource.ts`. Note how it preclears in the approval
gate *before* the signer is ever touched — keep that property.

**Step 4: Run and watch them pass**

**Step 5: Commit** — `feat(mcp): pay_for_resource, idempotent by derivation`

---

## Task 10: The two evidence tools

`get_payment_status` and `get_decision_record`, both keyed by `pay_`.

**Files:**
- Create: `packages/settle-kit/mcp/src/tools/evidence.ts`
- Test: `packages/settle-kit/mcp/src/tools/evidence.test.ts`

An unknown `pay_` returns a clean "not found" result, not a throw. Include the explorer
link; `BASE_SEPOLIA_EXPLORER` is exported from `@settle-kit/core`.

**Step 5: Commit** — `feat(mcp): payment status and decision record tools`

---

## Task 11: Held payments over MRTR

The hardest task. Read `docs/migration/support-2026-07-28.md` §"Multi-round-trip
requests" and §"Replacing per-session state: `requestState`" **before** writing code.

**Files:**
- Create: `packages/settle-kit/mcp/src/state.ts`
- Modify: `packages/settle-kit/mcp/src/tools/pay.ts`
- Modify: `packages/settle-kit/mcp/src/create-server.ts`
- Test: `packages/settle-kit/mcp/src/tools/pay-approval.test.ts`

**Step 1: Wire the codec** **[verify]**

```ts
import { createRequestStateCodec } from "@modelcontextprotocol/server";

export type PayPhase =
  | { step: "awaiting-approval"; payId: string; url: string; amountAtomic: string; quoteNonce: string };

export const stateCodec = createRequestStateCodec<PayPhase>({
  key: crypto.getRandomValues(new Uint8Array(32)), // process-local; no second instance to share with
  ttlSeconds: 300,
});
```

Pass `stateCodec.verify` as `ServerOptions.requestState.verify` on the `McpServer`, so
the seam verifies before your handler runs.

**`requestState` is untrusted input.** It round-trips through the client and comes back
as attacker-controlled bytes. It is **signed, not encrypted** — the client can decode
it — so never put a secret inside. Bind it to the originating parameters.

**Step 2: Write the failing tests**

1. **Held → approved → paid.** A held preclear returns `input_required`; the retry
   carrying an approval completes the payment.
2. **Held → declined → not paid.** Assert nothing was submitted.
3. **Tampered state.** A mutated seal is rejected before the handler runs.
4. **Expired state.** Past `ttlSeconds`, rejected.
5. **Quote drift.** If the price changed between the hold and the approval, the tool
   **refuses and re-asks** rather than paying the new number.

Test 5 is the point of the whole task. A human who approved `0.10` must never fund
`0.15`. This is the same rule Natural applies before fulfilling a payment request:
re-read, reject any mismatch, *then* submit.

**Step 3: Run and watch all five fail**

**Step 4: Implement**

```ts
return inputRequired({
  inputRequests: { approval: inputRequired.elicit({ /* schema */ }) },
  requestState: await stateCodec.mint({ step: "awaiting-approval", payId, url, amountAtomic, quoteNonce }),
});
```

On re-entry read `ctx.mcpReq.requestState<PayPhase>()` and
`acceptedContent(ctx.mcpReq.inputResponses, "approval")`, then **re-quote and compare
against the sealed `quoteNonce`** before paying.

`inputResponses` are per-round and replace rather than accumulate — anything learned in
an earlier round must travel inside `requestState`.

**Step 5: Run and watch them pass**

**Step 6: Commit** — `feat(mcp): held payments ask a human in band`

---

## Task 12: Conformance

This is where the era assumption stops being an assumption.

**Files:**
- Create: `packages/settle-kit/mcp/src/conformance.test.ts`
- Modify: `packages/settle-kit/mcp/package.json` (devDependency)

**Step 1: Add `@modelcontextprotocol/conformance@0.1.16`**

**Step 2: Run the harness against the built bin**

Read its README for invocation — it is a young package and this plan does not guess at
its CLI.

**Step 3: Add one client-side test** using `@modelcontextprotocol/client` with
`versionNegotiation: { mode: { pin: "2026-07-28" } }`, asserting `connect()` succeeds and
`getProtocolEra()` is `"modern"`.

Then add its mirror: a **default-mode** client (legacy) asserting it is **rejected**.
That test documents the modern-only decision as executable behaviour rather than prose,
and it is the test that will fail the day someone flips `legacy: "reject"` off.

**Step 4: Commit** — `test(mcp): conformance and an era assertion`

---

## Task 13: Docs

**Files:**
- Create: `packages/settle-kit/mcp/README.md`
- Modify: `README.md` (the "Choose a package" and "Integration paths" tables)
- Modify: `apps/lycoris/app/llms.txt/route.ts` (the packages list)
- Modify: `AGENTS.md` (the Settle Kit package list)

**Must say, plainly:**

- **`bunx @settle-kit/mcp` does not work yet**, because nothing is published. Give the
  real config a user needs today:

  ```json
  { "command": "bun", "args": ["/absolute/path/to/lycoris/packages/settle-kit/mcp/dist/bin.js"] }
  ```

  and say that it works for the repo author and nobody else. The README already tells
  the truth about tarball installs and sponsor budgets; hold that line here.

- **The client must negotiate the 2026-07-28 era.** A default-mode client is refused.
  Show `versionNegotiation: { mode: "auto" }`.

- The in-memory store is per-process and forgets on restart.

**Commit** — `docs(mcp): the package, and what it cannot do yet`

---

## Definition of done

- [ ] `bun run check-types && bun run check-boundaries && bun run check-tokens && bun test` passes
- [ ] `bun run pack:settle-kit` produces an `mcp` tarball
- [ ] A real client connects, calls `get_balance`, and buys the Melbourne report on Base Sepolia
- [ ] The four money-losing tests from Tasks 9 and 11 pass
- [ ] README states the distribution blocker without softening it

## Not in this plan

**Stage 5, the minted demo credential**, is deliberately excluded. It is blocked on a
funding decision: the sponsor is capped at 1 USDC total, roughly three visitors. Do not
start it until that cap has an answer.

The hosted server, OAuth, and per-visitor provisioning were designed and cut. See
[the design doc's Rejected section](2026-09-18-settle-kit-mcp-design.md#rejected) before
proposing any of them back.
