# ERC-4337 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add ERC-4337 support to Settle Kit and rebuild the public checkout demo on a browser-side smart account, so the demo runs the SDK's real settle path instead of bypassing it.

**Architecture:** Phase 1 proves `PaymentSigner` absorbs a smart account with no public-surface change — the 4337 code lives in `apps/lycoris` and reaches core only through the existing `receiptClient` injection seam. Phase 2 widens `SettleAdapter.id` off the `"usdc"` literal and graduates the receipt client to a subpath export. Design doc: [2026-09-18-erc-4337-design.md](2026-09-18-erc-4337-design.md).

**Tech Stack:** Bun, TypeScript, viem 2.56 (`viem/account-abstraction`, already installed — add no new dependencies), Next.js, Drizzle/Neon, Biome.

**Before you start:** read `AGENTS.md`. Bun only — never npm/pnpm/yarn, never Vitest. Gate before every commit:

```bash
bun run check-types && bun run check-boundaries && bun run check-tokens && bun test
```

---

## Task 1: Rename `TxHash` to `SettlementHash`

The brand symbol is module-local and never exported, so no external code can construct it. The package is unpublished, so `TxHash` is deleted outright rather than kept as an alias — a compatibility shim for zero consumers is ceremony. The rename propagates through the whole type graph; the `txHash` property names stay.

**Files:**
- Modify: `packages/settle-kit/core/src/types.ts:10`
- Modify: `packages/settle-kit/core/src/index.ts:18`
- Test: `packages/settle-kit/type-tests/src/hex-brands.test-d.ts`

**Step 1: Write the failing type assertion**

Append to `packages/settle-kit/type-tests/src/hex-brands.test-d.ts`:

```ts
import type { SettlementHash } from "@settle-kit/core";

declare const settlement: SettlementHash;

// ── The alias is the same type, not a second brand. Both directions must hold,
// ── or every host storing a TxHash breaks on upgrade.
export const aliasIn: SettlementHash = txHash;
export const aliasOut: TxHash = settlement;
// @ts-expect-error a settlement hash must never satisfy an address position
export const settlementAsAddress: HexAddress = settlement;
```

**Step 2: Run it and verify it fails**

```bash
bun run check-types
```

Expected: FAIL — `Module '"@settle-kit/core"' has no exported member 'SettlementHash'`.

**Step 3: Rename the brand**

In `packages/settle-kit/core/src/types.ts`, replace the `TxHash` declaration on line 10 with:

```ts
/** The hash that identifies a settlement: a transaction hash, or a userOpHash under ERC-4337. */
export type SettlementHash = `0x${string}` & { readonly [brand]?: "SettlementHash" };
/** @deprecated Use `SettlementHash`. Identical type; kept so hosts upgrade without edits. */
export type TxHash = SettlementHash;
```

Leave the doc comment above `HexAddress` alone — it still describes the trick correctly.

**Step 4: Export it**

In `packages/settle-kit/core/src/index.ts`, add `SettlementHash,` to the `export type { ... } from "./types"` block, keeping the list alphabetical (it goes after `SettleErrorCode`).

**Step 5: Pin it in the public surface test**

Append to `packages/settle-kit/type-tests/src/public-surface.test-d.ts`:

```ts
// ── SettlementHash is public API. If this import breaks, the rename regressed.
export type PinnedSettlementHash = import("@settle-kit/core").SettlementHash;
```

**Step 6: Verify**

```bash
bun run check-types && bun test
```

Expected: PASS. No other file needs touching — `TxHash` still resolves everywhere.

**Step 7: Commit**

```bash
git add packages/settle-kit/core/src/types.ts packages/settle-kit/core/src/index.ts packages/settle-kit/type-tests/src
git commit -m "refactor(settle-kit): name the settlement hash for what it holds

A userOpHash is not a transaction hash. The brand symbol is module-local,
so aliasing TxHash keeps every host compiling."
```

---

## Task 2: `SettleKitError` gains a docs channel

Own commit, unrelated to 4337. viem is already a dependency of core (`usdc.ts` imports `encodeFunctionData`), so `BaseError` costs nothing new.

**Files:**
- Modify: `packages/settle-kit/core/src/errors.ts`
- Test: `packages/settle-kit/core/src/errors.test.ts` (create)

**Step 1: Write the failing test**

Create `packages/settle-kit/core/src/errors.test.ts`:

```ts
import { describe, expect, test } from "bun:test";
import { SettleKitError, toSettleError } from "./errors";

describe("SettleKitError", () => {
  test("keeps its code and stays an Error", () => {
    const error = new SettleKitError("quote_expired", "Quote expired");
    expect(error.code).toBe("quote_expired");
    expect(error).toBeInstanceOf(Error);
  });

  test("carries a docs path when given one", () => {
    const error = new SettleKitError("wrong_network", "Wrong chain", {
      docsPath: "/docs/errors#wrong-network",
    });
    expect(error.docsPath).toBe("/docs/errors#wrong-network");
  });

  test("round-trips through toSettleError with its code intact", () => {
    const error = new SettleKitError("insufficient_usdc", "Not enough USDC");
    expect(toSettleError(error).code).toBe("insufficient_usdc");
  });

  // BaseError composes `message`, and toSettleError string-matches it to spot a
  // rejected wallet. That detection must survive the rebase.
  test("still detects a rejected wallet from the message", () => {
    expect(toSettleError(new Error("User rejected the request")).code).toBe("wallet_rejected");
  });
});
```

**Step 2: Run it and verify the docs-path test fails**

```bash
bun test packages/settle-kit/core/src/errors.test.ts
```

Expected: FAIL on "carries a docs path" — `docsPath` is undefined.

**Step 3: Rebase on `BaseError`**

In `packages/settle-kit/core/src/errors.ts`, replace the class:

```ts
import { BaseError } from "viem";
import type { SettleError, SettleErrorCode } from "./types";

export class SettleKitError extends BaseError {
  readonly code: SettleErrorCode;

  constructor(code: SettleErrorCode, message: string, options: { docsPath?: string } = {}) {
    super(message, { name: "SettleKitError", ...(options.docsPath ? { docsPath: options.docsPath } : {}) });
    this.code = code;
  }
}
```

Leave `toSettleError`, `isUserErrorCode` and `invalidConfig` unchanged.

**Step 4: Run the whole suite**

```bash
bun test
```

Expected: PASS. If `checkout-safety.test.ts` fails on an exact message string, `BaseError` appended a details block — assert with `toContain` rather than `toBe`, and note it in the commit body.

**Step 5: Check the size delta**

```bash
bun run measure:settle-kit
```

Expected: core's gzip figure moves by a small amount. If it jumps by more than ~1 kB, stop and report before committing.

**Step 6: Commit**

```bash
git add packages/settle-kit/core/src/errors.ts packages/settle-kit/core/src/errors.test.ts
git commit -m "feat(settle-kit): give errors a docs channel

Codes alone cannot point a host at the fix. viem's BaseError is already
in the dependency graph."
```

---

## Task 3: The 4337 receipt client

The correctness core. A userOp can revert inside a bundle whose own transaction succeeded — `receipt.status` would report `success` for an unpaid purchase.

**Files:**
- Create: `apps/lycoris/app/checkout/user-op-receipt.ts`
- Test: `apps/lycoris/app/checkout/user-op-receipt.test.ts`

**Step 1: Write the failing test**

Create `apps/lycoris/app/checkout/user-op-receipt.test.ts`:

```ts
import { describe, expect, test } from "bun:test";
import { createUserOpReceiptClient } from "./user-op-receipt";

const USER_OP = "0xaaaa" as const;
const BUNDLE_TX = "0xbbbb" as const;

describe("createUserOpReceiptClient", () => {
  test("reports reverted when the userOp failed inside a successful bundle", async () => {
    const client = createUserOpReceiptClient({
      getUserOperationReceipt: async () => ({
        success: false,
        receipt: { transactionHash: BUNDLE_TX },
      }),
    });
    const result = await client.waitForTransactionReceipt({
      hash: USER_OP,
      confirmations: 1,
      timeout: 1_000,
    });
    expect(result.status).toBe("reverted");
  });

  test("reports success when the userOp succeeded", async () => {
    const client = createUserOpReceiptClient({
      getUserOperationReceipt: async () => ({
        success: true,
        receipt: { transactionHash: BUNDLE_TX },
      }),
    });
    const result = await client.waitForTransactionReceipt({
      hash: USER_OP,
      confirmations: 1,
      timeout: 1_000,
    });
    expect(result.status).toBe("success");
  });

  // createUsdcMethod's confirm() compares the returned hash against the one
  // settle() produced, and throws "Transaction was replaced" on a mismatch.
  // Returning the bundle's hash would fail every settled purchase.
  test("echoes the userOpHash, never the bundle transaction hash", async () => {
    const client = createUserOpReceiptClient({
      getUserOperationReceipt: async () => ({
        success: true,
        receipt: { transactionHash: BUNDLE_TX },
      }),
    });
    const result = await client.waitForTransactionReceipt({
      hash: USER_OP,
      confirmations: 1,
      timeout: 1_000,
    });
    expect(result.transactionHash).toBe(USER_OP);
  });

  test("polls until the receipt appears", async () => {
    let calls = 0;
    const client = createUserOpReceiptClient(
      {
        getUserOperationReceipt: async () => {
          calls += 1;
          return calls < 3 ? null : { success: true, receipt: { transactionHash: BUNDLE_TX } };
        },
      },
      { pollMs: 1 },
    );
    const result = await client.waitForTransactionReceipt({
      hash: USER_OP,
      confirmations: 1,
      timeout: 1_000,
    });
    expect(calls).toBe(3);
    expect(result.status).toBe("success");
  });

  test("throws rather than guessing when the receipt never arrives", async () => {
    const client = createUserOpReceiptClient(
      { getUserOperationReceipt: async () => null },
      { pollMs: 1 },
    );
    expect(
      client.waitForTransactionReceipt({ hash: USER_OP, confirmations: 1, timeout: 20 }),
    ).rejects.toThrow(/timed out/i);
  });
});
```

**Step 2: Run it and verify it fails**

```bash
bun test apps/lycoris/app/checkout/user-op-receipt.test.ts
```

Expected: FAIL — module not found.

**Step 3: Implement it**

Create `apps/lycoris/app/checkout/user-op-receipt.ts`:

```ts
import type { SettlementHash } from "@settle-kit/core";

export type UserOpReceipt = {
  success: boolean;
  receipt: { transactionHash: SettlementHash };
};

export type UserOpReceiptSource = {
  getUserOperationReceipt: (args: { hash: SettlementHash }) => Promise<UserOpReceipt | null>;
};

/**
 * A `receiptClient` for `createUsdcMethod` that understands user operations.
 *
 * A userOp bundled into a transaction that itself succeeded can still have
 * reverted; the EntryPoint records that in `UserOperationEvent.success`, not in
 * the transaction receipt's status. Reading the transaction status here would
 * mark an unpaid purchase as settled.
 */
export function createUserOpReceiptClient(
  source: UserOpReceiptSource,
  options: { pollMs?: number } = {},
) {
  const pollMs = options.pollMs ?? 1_000;
  return {
    async waitForTransactionReceipt({
      hash,
      timeout,
    }: {
      hash: SettlementHash;
      confirmations: number;
      timeout: number;
    }): Promise<{ status: "success" | "reverted"; transactionHash: SettlementHash }> {
      const deadline = Date.now() + timeout;
      for (;;) {
        const receipt = await source.getUserOperationReceipt({ hash });
        if (receipt) {
          // Echo the userOpHash. confirm() compares this against what settle()
          // returned, and the bundle's hash would never match.
          return { status: receipt.success ? "success" : "reverted", transactionHash: hash };
        }
        if (Date.now() >= deadline)
          throw new Error("Timed out waiting for the user operation receipt");
        await new Promise((resolve) => setTimeout(resolve, pollMs));
      }
    },
  };
}
```

**Step 4: Verify**

```bash
bun test apps/lycoris/app/checkout/user-op-receipt.test.ts
```

Expected: 5 pass.

**Step 5: Commit**

```bash
git add apps/lycoris/app/checkout/user-op-receipt.ts apps/lycoris/app/checkout/user-op-receipt.test.ts
git commit -m "feat(lycoris): read userOp success, not bundle status

A userOp can revert inside a transaction that succeeded. Reading the
transaction receipt would settle an unpaid purchase."
```

---

## Task 4: Burner key persistence

**Files:**
- Create: `apps/lycoris/app/checkout/burner-key.ts`
- Test: `apps/lycoris/app/checkout/burner-key.test.ts`

**Step 1: Write the failing test**

Create `apps/lycoris/app/checkout/burner-key.test.ts`:

```ts
import { describe, expect, test } from "bun:test";
import { BURNER_KEY_STORAGE_KEY, loadOrCreateBurnerKey } from "./burner-key";

function fakeStorage(seed: Record<string, string> = {}) {
  const map = new Map(Object.entries(seed));
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
  };
}

describe("loadOrCreateBurnerKey", () => {
  test("returns the same key on a second call", () => {
    const storage = fakeStorage();
    expect(loadOrCreateBurnerKey(storage)).toBe(loadOrCreateBurnerKey(storage));
  });

  test("generates a 32-byte hex key", () => {
    expect(loadOrCreateBurnerKey(fakeStorage())).toMatch(/^0x[0-9a-f]{64}$/);
  });

  test("replaces a corrupted value rather than throwing", () => {
    const storage = fakeStorage({ [BURNER_KEY_STORAGE_KEY]: "not-a-key" });
    expect(loadOrCreateBurnerKey(storage)).toMatch(/^0x[0-9a-f]{64}$/);
  });

  test("survives storage that throws, without persisting", () => {
    const storage = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };
    expect(loadOrCreateBurnerKey(storage)).toMatch(/^0x[0-9a-f]{64}$/);
  });
});
```

**Step 2: Run it and verify it fails**

```bash
bun test apps/lycoris/app/checkout/burner-key.test.ts
```

Expected: FAIL — module not found.

**Step 3: Implement it**

Create `apps/lycoris/app/checkout/burner-key.ts`:

```ts
import type { Hex } from "viem";
import { generatePrivateKey } from "viem/accounts";

export const BURNER_KEY_STORAGE_KEY = "lycoris-burner-key";

export type KeyStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
};

/**
 * DEMO SCAFFOLDING. Do not copy this into a host application.
 *
 * The key lives in localStorage, so any XSS on this origin can read it. That is
 * acceptable here and only here: it controls 0.1 test USDC on Base Sepolia, and
 * the asset actually worth protecting is the paymaster, which is guarded by the
 * sponsorship policy in /api/paymaster rather than by this key. A stolen key
 * buys an attacker the ability to pay the merchant.
 *
 * A key JavaScript can use is a key XSS can use, so IndexedDB and encryption at
 * rest would be theatre. The real hardening is a credential the page can invoke
 * but never read — `createWebAuthnCredential` with a WebAuthn owner — which is
 * not taken because a biometric prompt is the signup the README promises is not
 * there.
 */
export function loadOrCreateBurnerKey(storage: KeyStorage): Hex {
  try {
    const existing = storage.getItem(BURNER_KEY_STORAGE_KEY);
    if (existing && /^0x[0-9a-f]{64}$/i.test(existing)) return existing as Hex;
  } catch {
    // Private mode, or blocked site data. Fall through to an in-memory key.
  }
  const key = generatePrivateKey();
  try {
    storage.setItem(BURNER_KEY_STORAGE_KEY, key);
  } catch {
    // Unpersisted is survivable: the visitor gets a fresh account next load.
  }
  return key;
}
```

**Step 4: Verify**

```bash
bun test apps/lycoris/app/checkout/burner-key.test.ts
```

Expected: 4 pass.

**Step 5: Commit**

```bash
git add apps/lycoris/app/checkout/burner-key.ts apps/lycoris/app/checkout/burner-key.test.ts
git commit -m "feat(lycoris): persist a burner key for the demo account

Threat model in the file header: the paymaster policy is the boundary,
not this key."
```

---

## Task 5: The smart-account `PaymentSigner`

**Files:**
- Create: `apps/lycoris/app/checkout/burner-signer.ts`
- Test: `apps/lycoris/app/checkout/burner-signer.test.ts`

The signer returns the userOpHash even when the userOp reverts, so a failed 4337 payment walks the same state path as a reverted ERC-20 transfer: `settling` → `confirm()` → `reverted` → `failed` with the hash populated.

**Step 1: Write the failing test**

Create `apps/lycoris/app/checkout/burner-signer.test.ts`:

```ts
import { describe, expect, test } from "bun:test";
import { toPaymentSigner } from "./burner-signer";

const ACCOUNT = "0x1111111111111111111111111111111111111111" as const;
const USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as const;
const USER_OP = "0xaaaa" as const;

describe("toPaymentSigner", () => {
  test("exposes the smart account address", () => {
    const signer = toPaymentSigner({
      account: { address: ACCOUNT },
      chainId: 84532,
      sendUserOperation: async () => USER_OP,
    });
    expect(signer.address).toBe(ACCOUNT);
  });

  test("sends one call and returns the userOpHash", async () => {
    const sent: unknown[] = [];
    const signer = toPaymentSigner({
      account: { address: ACCOUNT },
      chainId: 84532,
      sendUserOperation: async (args) => {
        sent.push(args);
        return USER_OP;
      },
    });
    const hash = await signer.sendTransaction({ to: USDC, data: "0xdeadbeef" });
    expect(hash).toBe(USER_OP);
    expect(sent).toEqual([
      { account: { address: ACCOUNT }, calls: [{ to: USDC, value: 0n, data: "0xdeadbeef" }] },
    ]);
  });

  test("reports the chain so the SDK's network check runs", async () => {
    const signer = toPaymentSigner({
      account: { address: ACCOUNT },
      chainId: 84532,
      sendUserOperation: async () => USER_OP,
    });
    expect(await signer.getChainId?.()).toBe(84532);
  });
});
```

**Step 2: Run it and verify it fails**

```bash
bun test apps/lycoris/app/checkout/burner-signer.test.ts
```

Expected: FAIL — module not found.

**Step 3: Implement it**

Create `apps/lycoris/app/checkout/burner-signer.ts`:

```ts
import type { Hex, HexAddress, PaymentSigner, SettlementHash } from "@settle-kit/core";

export type UserOperationSender = {
  account: { address: HexAddress };
  chainId: number;
  sendUserOperation: (args: {
    account: { address: HexAddress };
    calls: readonly { to: HexAddress; value: bigint; data: Hex }[];
  }) => Promise<SettlementHash>;
};

/**
 * Adapts a smart account to `PaymentSigner` — the SDK's three-method seam.
 *
 * The returned hash is a userOpHash, not a transaction hash, and it comes back
 * even when the userOp reverts. Confirmation is the SDK's job: pairing this
 * with `createUserOpReceiptClient` makes a reverted userOp take the identical
 * state path as a reverted ERC-20 transfer.
 */
export function toPaymentSigner(sender: UserOperationSender): PaymentSigner {
  return {
    address: sender.account.address,
    sendTransaction: ({ to, data }) =>
      sender.sendUserOperation({
        account: sender.account,
        calls: [{ to, value: 0n, data }],
      }),
    getChainId: async () => sender.chainId,
  };
}
```

**Step 4: Verify**

```bash
bun test apps/lycoris/app/checkout/burner-signer.test.ts
```

Expected: 3 pass.

**Step 5: Commit**

```bash
git add apps/lycoris/app/checkout/burner-signer.ts apps/lycoris/app/checkout/burner-signer.test.ts
git commit -m "feat(lycoris): adapt a smart account to PaymentSigner

Three methods, unchanged. The 4337 execution model does not reach core."
```

---

## Task 6: The sponsorship policy

Express the rule as data so the route is reviewable and testable without HTTP. The userOp's `callData` is the account's `execute(address,uint256,bytes)` wrapper — decode that first, then the inner ERC-20 call.

**Files:**
- Create: `apps/lycoris/server/sponsorship-policy.ts`
- Test: `apps/lycoris/server/sponsorship-policy.test.ts`

**Step 1: Write the failing test**

Create `apps/lycoris/server/sponsorship-policy.test.ts`:

```ts
import { WEATHER_AMOUNT_ATOMIC } from "@repo/shared/demo";
import { BASE_SEPOLIA_USDC_ADDRESS } from "@settle-kit/core";
import { describe, expect, test } from "bun:test";
import { encodeFunctionData, erc20Abi } from "viem";
import { ACCOUNT_EXECUTE_ABI, checkSponsorship } from "./sponsorship-policy";

const MERCHANT = "0x2222222222222222222222222222222222222222" as const;
const ATTACKER = "0x3333333333333333333333333333333333333333" as const;
const policy = { asset: BASE_SEPOLIA_USDC_ADDRESS, merchant: MERCHANT, amount: BigInt(WEATHER_AMOUNT_ATOMIC) };

function execute(to: `0x${string}`, inner: `0x${string}`, value = 0n) {
  return encodeFunctionData({
    abi: ACCOUNT_EXECUTE_ABI,
    functionName: "execute",
    args: [to, value, inner],
  });
}
function transfer(to: `0x${string}`, amount: bigint) {
  return encodeFunctionData({ abi: erc20Abi, functionName: "transfer", args: [to, amount] });
}

describe("checkSponsorship", () => {
  test("accepts the exact purchase", () => {
    const callData = execute(BASE_SEPOLIA_USDC_ADDRESS, transfer(MERCHANT, policy.amount));
    expect(checkSponsorship(callData, policy)).toEqual({ ok: true });
  });

  test("rejects a different recipient", () => {
    const callData = execute(BASE_SEPOLIA_USDC_ADDRESS, transfer(ATTACKER, policy.amount));
    expect(checkSponsorship(callData, policy)).toMatchObject({ ok: false });
  });

  test("rejects a different amount", () => {
    const callData = execute(BASE_SEPOLIA_USDC_ADDRESS, transfer(MERCHANT, policy.amount + 1n));
    expect(checkSponsorship(callData, policy)).toMatchObject({ ok: false });
  });

  test("rejects a different token", () => {
    const callData = execute(ATTACKER, transfer(MERCHANT, policy.amount));
    expect(checkSponsorship(callData, policy)).toMatchObject({ ok: false });
  });

  test("rejects a non-transfer call on the right token", () => {
    const approve = encodeFunctionData({
      abi: erc20Abi,
      functionName: "approve",
      args: [ATTACKER, policy.amount],
    });
    expect(checkSponsorship(execute(BASE_SEPOLIA_USDC_ADDRESS, approve), policy)).toMatchObject({
      ok: false,
    });
  });

  test("rejects a call that moves native value", () => {
    const callData = execute(BASE_SEPOLIA_USDC_ADDRESS, transfer(MERCHANT, policy.amount), 1n);
    expect(checkSponsorship(callData, policy)).toMatchObject({ ok: false });
  });

  test("rejects undecodable calldata instead of throwing", () => {
    expect(checkSponsorship("0xdeadbeef", policy)).toMatchObject({ ok: false });
  });
});
```

**Step 2: Run it and verify it fails**

```bash
bun test apps/lycoris/server/sponsorship-policy.test.ts
```

Expected: FAIL — module not found.

**Step 3: Implement it**

Create `apps/lycoris/server/sponsorship-policy.ts`:

```ts
import type { HexAddress } from "@settle-kit/core";
import { decodeFunctionData, erc20Abi, type Hex } from "viem";

/** Coinbase Smart Wallet's single-call entry point. */
export const ACCOUNT_EXECUTE_ABI = [
  {
    name: "execute",
    type: "function",
    stateMutability: "payable",
    inputs: [
      { name: "target", type: "address" },
      { name: "value", type: "uint256" },
      { name: "data", type: "bytes" },
    ],
    outputs: [],
  },
] as const;

export type SponsorshipPolicy = {
  asset: HexAddress;
  merchant: HexAddress;
  amount: bigint;
};

export type SponsorshipResult = { ok: true } | { ok: false; reason: string };

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

/**
 * The paymaster's security boundary, stated as data rather than buried in a
 * route handler. Anything this does not explicitly permit is refused, so a
 * stolen burner key only ever buys the attacker the ability to pay the merchant.
 */
export function checkSponsorship(callData: Hex, policy: SponsorshipPolicy): SponsorshipResult {
  let target: HexAddress;
  let value: bigint;
  let inner: Hex;
  try {
    const outer = decodeFunctionData({ abi: ACCOUNT_EXECUTE_ABI, data: callData });
    [target, value, inner] = outer.args;
  } catch {
    return { ok: false, reason: "calldata is not a single account execute" };
  }

  if (value !== 0n) return { ok: false, reason: "sponsored calls must not move native value" };
  if (!same(target, policy.asset)) return { ok: false, reason: "target is not the sponsored asset" };

  try {
    const call = decodeFunctionData({ abi: erc20Abi, data: inner });
    if (call.functionName !== "transfer")
      return { ok: false, reason: `only transfer is sponsored, not ${call.functionName}` };
    const [to, amount] = call.args;
    if (!same(to, policy.merchant)) return { ok: false, reason: "recipient is not the merchant" };
    if (amount !== policy.amount) return { ok: false, reason: "amount is not the purchase price" };
  } catch {
    return { ok: false, reason: "inner call is not an ERC-20 call" };
  }

  return { ok: true };
}
```

**Step 4: Verify**

```bash
bun test apps/lycoris/server/sponsorship-policy.test.ts
```

Expected: 7 pass.

**Step 5: Commit**

```bash
git add apps/lycoris/server/sponsorship-policy.ts apps/lycoris/server/sponsorship-policy.test.ts
git commit -m "feat(lycoris): state the paymaster's rule as data

Default deny. A stolen burner key buys the ability to pay the merchant."
```

---

## Task 7: Database migration

A purchase is now two on-chain events. One column cannot name both.

**Files:**
- Modify: `packages/scripts/sponsored-checkout.sql`
- Create: `packages/scripts/sponsored-checkout-4337.sql`

**Step 1: Write the migration**

Create `packages/scripts/sponsored-checkout-4337.sql`:

```sql
-- A sponsored purchase is now two on-chain events: the faucet transfer that
-- funds the burner, and the user operation that pays the merchant. One column
-- cannot name both.
ALTER TABLE sponsored_checkout_payments
  RENAME COLUMN tx_hash TO funding_tx_hash;

ALTER TABLE sponsored_checkout_payments
  ADD COLUMN IF NOT EXISTS user_op_hash text,
  ADD COLUMN IF NOT EXISTS payer text;
```

**Step 2: Update the base schema to match**

In `packages/scripts/sponsored-checkout.sql`, change the `CREATE TABLE` body so a fresh database matches a migrated one:

```sql
CREATE TABLE IF NOT EXISTS sponsored_checkout_payments (
  id uuid PRIMARY KEY,
  sponsor text NOT NULL,
  recipient text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  funding_tx_hash text,
  user_op_hash text,
  payer text
);
```

Leave `reserve_sponsored_checkout` untouched. It reserves budget, not a transaction, and its advisory lock and never-free-a-failed-slot behaviour are still exactly right.

**Step 3: Update the readers**

In `apps/lycoris/server/sponsored-checkout.ts`, change the `Purchase` type's `tx_hash` field to `funding_tx_hash`, and rename every `purchase.tx_hash` / `previous.tx_hash` read to match. The `UPDATE ... SET tx_hash = ...` statement becomes `SET funding_tx_hash = ...`.

In `packages/scripts/check-sponsored-budget.ts`, no change is needed — it only reads `sponsor`.

**Step 4: Verify types still build**

```bash
bun run check-types && bun test
```

Expected: PASS.

**Step 5: Commit**

```bash
git add packages/scripts/sponsored-checkout.sql packages/scripts/sponsored-checkout-4337.sql apps/lycoris/server/sponsored-checkout.ts
git commit -m "feat(db): name both hashes a sponsored purchase produces"
```

---

## Task 8: The faucet route

Reuses `reserve_sponsored_checkout` for its cap and idempotency. Waits for its own receipt — the balance preflight reads stale otherwise.

**Files:**
- Modify: `apps/lycoris/server/sponsored-checkout.ts`
- Create: `apps/lycoris/app/api/checkout/fund/route.ts`

**Step 1: Rename the existing sponsor call to a faucet**

In `apps/lycoris/server/sponsored-checkout.ts`, change `paySponsored(id)` to `fundBurner(id: string, payer: Hex)`. Three edits inside it:

- the `transfer` args become `[payer, BigInt(WEATHER_AMOUNT_ATOMIC)]` instead of `[recipient, ...]`
- after `cdp.evm.sendTransaction`, wait before returning:

```ts
await sponsorChain.waitForTransactionReceipt({ hash: transactionHash, confirmations: 1 });
```

- persist the payer alongside the hash:

```ts
await db.execute(
  sql`UPDATE sponsored_checkout_payments
      SET funding_tx_hash = ${transactionHash}, payer = ${payer}
      WHERE id = ${id}::uuid`,
);
```

Keep the one-hour operator-review guard and the configuration-changed check exactly as they are.

**Step 2: Add the route**

Create `apps/lycoris/app/api/checkout/fund/route.ts`, modelled on the existing `sponsored/route.ts`:

```ts
import { fundBurner } from "@/server/sponsored-checkout";
import { readSponsoredRequest } from "@/server/sponsored-request";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: { purchaseId: string; payer: string };
  try {
    body = await request.clone().json();
  } catch {
    return Response.json({ error: "Invalid checkout request." }, { status: 400 });
  }
  let id: string;
  try {
    id = await readSponsoredRequest(request);
  } catch {
    return Response.json({ error: "Invalid checkout request." }, { status: 400 });
  }
  if (!/^0x[0-9a-fA-F]{40}$/.test(body.payer ?? ""))
    return Response.json({ error: "Invalid checkout request." }, { status: 400 });
  try {
    return Response.json(await fundBurner(id, body.payer as `0x${string}`), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Funding failed", error instanceof Error ? error.message : "unknown");
    return Response.json(
      {
        error:
          "The sponsored demo is unavailable. Retry this purchase; you will not be charged twice.",
      },
      { status: 503 },
    );
  }
}
```

**Step 3: Delete the old route**

```bash
git rm -r apps/lycoris/app/api/checkout/sponsored
```

**Step 4: Verify**

```bash
bun run check-types && bun test
```

Expected: PASS. Fix any import of the removed route or of `paySponsored`; `apps/lycoris/server/sponsored-request.test.ts` and `weather-payment.test.ts` are the likely callers.

**Step 5: Commit**

```bash
git add -A apps/lycoris/app/api/checkout apps/lycoris/server
git commit -m "feat(lycoris): fund the burner instead of paying for it

The sponsor becomes what it always was: a faucet. It waits for its own
receipt so the SDK's balance preflight reads a settled balance."
```

---

## Task 8b: Teach the access gate about user operations

**Missed in the first draft of this plan.** Without it Tasks 7–9 leave the demo
unable to serve the report the visitor just paid for.

`verifyWeatherPayment` in `apps/lycoris/server/weather-payment.ts` is what
releases the weather report, and every check in it assumes the payment is a
top-level EOA transaction whose calldata decodes to `transfer(merchant, amount)`:

- `tx.to` must be the USDC contract — under 4337 it is the EntryPoint
- `decodeFunctionData(tx.input)` must yield `transfer` — it yields `handleOps`
- `tx.from` must equal the payer — it is the bundler

A userOpHash is not a transaction hash, so `getTransaction` cannot even resolve
it. This fails **closed** — access denied rather than wrongly granted — but the
demo is broken either way.

What survives: the ERC-20 `Transfer` event is still emitted inside the bundle
with the right `from`, `to` and `value`. Verification moves from *calldata* to
*logs*.

**Files:**
- Modify: `apps/lycoris/server/weather-payment.ts`
- Modify: `apps/lycoris/server/weather-payment.test.ts` (103 lines today)
- Modify: `apps/lycoris/app/api/weather/sponsored/route.ts`

**Step 1: Write the failing tests.** Extend `weather-payment.test.ts` with a
userOp case: a bundle transaction sent by a bundler EOA, `to` the EntryPoint,
whose receipt logs contain a USDC `Transfer` from the burner to the merchant for
`WEATHER_AMOUNT_ATOMIC`. Assert it verifies. Then assert each tampered variant
rejects — wrong recipient, wrong amount, a `from` that is not the recorded
payer, and a reverted userOp inside a successful bundle.

**Step 2: Add the userOp branch.** Keep the existing EOA path exactly as it is —
the `/checkout` wallet route still uses it and it is still correct there. Add a
third member to the input union alongside `signature` and `sponsoredPayer`,
carrying the recorded `payer` (the burner address from the `payer` column Task 7
adds) and the bundle transaction hash.

For that branch, drop the `tx.to` and `decodeFunctionData` checks — they are
meaningless against `handleOps` — and verify entirely from the receipt logs:
a `Transfer` on the USDC contract, `from` the recorded payer, `to` the merchant,
`value` exactly `WEATHER_AMOUNT_ATOMIC`. Keep the 15-minute freshness check
against the bundle's block; that logic is unchanged.

Binding to the recorded `payer` is what stops a visitor claiming someone else's
payment: the burner address is written to the purchase row at funding time, so
the log's `from` must match the row, not merely be *some* address.

**Step 3: Update the route.** `weather/sponsored/route.ts` reads
`purchase.tx_hash`; after Task 7 that column is `funding_tx_hash` and means the
faucet transfer, which is the wrong transfer to verify. It must gate on the
payment instead — the bundle that carried `user_op_hash` — and pass
`purchase.payer`.

**Step 4: Verify** the full gate, then commit:

```bash
git add apps/lycoris/server/weather-payment.ts apps/lycoris/server/weather-payment.test.ts apps/lycoris/app/api/weather/sponsored/route.ts
git commit -m "fix(lycoris): verify payment from logs, not calldata"
```

---

## Task 9: Wire the demo to the SDK's real path

The task that deletes the throwing stub.

**Files:**
- Modify: `apps/lycoris/app/checkout/sponsored-payment.ts`
- Modify: `apps/lycoris/app/checkout/merchant-checkout.tsx:72`

**Step 1: Rebuild the payment factory**

Rewrite `createSponsoredPayment` in `apps/lycoris/app/checkout/sponsored-payment.ts`. Keep the existing `localStorage` purchase-id bookkeeping and the `quote` override unchanged. Replace the `settle` override and the `getSigner` stub:

```ts
import { createBundlerClient } from "viem/account-abstraction";
import { toCoinbaseSmartAccount } from "viem/account-abstraction";
import { privateKeyToAccount } from "viem/accounts";
import { createPublicClient, http } from "viem";
import { baseSepolia } from "viem/chains";
import { loadOrCreateBurnerKey } from "./burner-key";
import { toPaymentSigner } from "./burner-signer";
import { createUserOpReceiptClient } from "./user-op-receipt";

const chain = createPublicClient({ chain: baseSepolia, transport: http() });

async function burnerAccount() {
  const owner = privateKeyToAccount(loadOrCreateBurnerKey(localStorage));
  // EntryPoint 0.6. Dated, and deliberate: this is Base's canonical account and
  // what the CDP bundler and paymaster are built around.
  return toCoinbaseSmartAccount({ client: chain, owners: [owner], version: "1.1" });
}
```

Then, inside `createSponsoredPayment`, build the bundler client once and hand `createUsdcMethod` the 4337 receipt client:

```ts
const bundler = createBundlerClient({
  chain: baseSepolia,
  transport: http("/api/bundler"),
  paymaster: { getPaymasterData: (userOp) => postJson("/api/paymaster", userOp) },
});
const method = createUsdcMethod({
  receiptClient: createUserOpReceiptClient({
    getUserOperationReceipt: (args) =>
      bundler.getUserOperationReceipt({ hash: args.hash }).then((r) => r ?? null),
  }),
});
```

The `settle` override now funds first and then delegates, so the SDK's preflight verifies the funding landed:

```ts
async settle(input) {
  const response = await fetch("/api/checkout/fund", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ purchaseId: input.quote.requestId, payer: input.signer.address }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? "Could not fund the demo account.");
  return method.settle(input);
}
```

And `getSigner` returns a real signer:

```ts
getSigner: async () => {
  const account = await burnerAccount();
  return toPaymentSigner({
    account,
    chainId: baseSepolia.id,
    sendUserOperation: (args) => bundler.sendUserOperation(args),
  });
},
```

Delete the old `settle` override body and the stub whose `sendTransaction` threw.

**Step 2: Use the explorer escape hatch**

In `apps/lycoris/app/checkout/merchant-checkout.tsx:72`, the hardcoded `` `${BASE_SEPOLIA_EXPLORER}/tx/${txHash}` `` must become a userOp-aware URL. `checkout.tsx:45` already exposes `transactionUrl` as a prop — pass it from the host rather than hardcoding here, and point it at a userOp explorer path.

**Step 3: Verify the whole gate**

```bash
bun run check-types && bun run check-boundaries && bun run check-tokens && bun test
```

Expected: PASS.

**Step 4: Run it**

```bash
bun run dev:ui
```

Open `http://localhost:3003/checkout` and click Pay. Expect three legible steps — funding, deploying, paying — then a settled report. If the userOp reverts, expect `failed` **with** a hash, not a bare error.

**Step 5: Commit**

```bash
git add apps/lycoris/app/checkout
git commit -m "feat(lycoris): pay from a real smart account

Deletes the signer whose sendTransaction threw and whose address was the
merchant. The demo now runs the SDK's settle, preflight and confirm."
```

---

## Task 10: Keep account abstraction out of core's bundle

**Files:**
- Modify: `scripts/measure-settle-kit.mjs:38-40`

**Step 1: Add the assertion**

Beside the existing `includesAgentSdk` computation, add:

```js
includesAccountAbstraction: Object.keys(result.metafile.inputs).some((file) =>
  file.includes("viem/account-abstraction") || file.includes("_esm/account-abstraction"),
),
```

and beside the existing throw:

```js
if (measurements[name].includesAccountAbstraction)
  throw new Error("Account abstraction leaked into checkout");
```

**Step 2: Verify**

```bash
bun run measure:settle-kit
```

Expected: PASS. A failure here means 4337 code reached `packages/` — that is the boundary this whole plan is built to hold.

**Step 3: Commit**

```bash
git add scripts/measure-settle-kit.mjs
git commit -m "test(settle-kit): assert 4337 never reaches core's bundle"
```

---

## Checkpoint: phase 1 is done

Stop here and confirm before starting Task 11. Phase 1's claim is that the public surface absorbed a new execution model with only a rename. Verify it:

```bash
git diff --stat main -- packages/settle-kit/
```

Expected: `types.ts`, `index.ts`, `errors.ts` and the type-tests. Nothing else in `packages/` should have moved.

---

## Task 11: Phase 2 — widen the method surface

`SettleAdapter.id` is typed `"usdc"`, so `methods: SettleAdapter[]` can only ever hold one element. 4337 is the first real second method. The commit message matters here: the surface changes because correctness demanded it.

**Files:**
- Modify: `packages/settle-kit/core/src/types.ts`
- Create: `packages/settle-kit/core/src/methods/user-op-receipt.ts` (moved from `apps/lycoris`)
- Modify: `packages/settle-kit/core/package.json` (subpath export)
- Test: `packages/settle-kit/type-tests/src/public-surface.test-d.ts`

**Step 1: Write the failing type assertion**

Append to `public-surface.test-d.ts`:

```ts
// ── A second method is the point of the methods array. Until 4337 there was
// ── never a second one, and the literal type hid that.
export const smartAccountAdapter: SettleAdapter = {
  id: "usdc-4337",
  quote: async (): Promise<Quote> => ({
    requestId: "q",
    amountUsdc: "0.1",
    amountAtomic: "100000",
    expiresAt: Date.now() + 60_000,
    method: "usdc-4337",
  }),
  settle: async () => "0xabc",
  confirm: async () => "success",
};
```

**Step 2: Run it and verify it fails**

```bash
bun run check-types
```

Expected: FAIL — `Type '"usdc-4337"' is not assignable to type '"usdc"'`.

**Step 3: Widen the types**

In `types.ts`:

```ts
export type SettleMethodId = "usdc" | "usdc-4337";
```

Change `SettleAdapter.id` to `SettleMethodId` and `Quote.method` to `SettleMethodId`. Export `SettleMethodId` from `index.ts`.

Add the settlement shape, using mutual exclusion rather than a branded union — an optional phantom brand cannot discriminate, but `?: never` can:

```ts
export type Settlement =
  | { transactionHash: SettlementHash; userOpHash?: never }
  | { userOpHash: SettlementHash; transactionHash?: never };
```

**Step 4: Move the receipt client into core**

```bash
git mv apps/lycoris/app/checkout/user-op-receipt.ts packages/settle-kit/core/src/methods/user-op-receipt.ts
git mv apps/lycoris/app/checkout/user-op-receipt.test.ts packages/settle-kit/core/src/methods/user-op-receipt.test.ts
```

Fix the import in both files to `../types`. Add the subpath export to `packages/settle-kit/core/package.json`:

```json
"./account-abstraction": {
  "types": "./dist/account-abstraction.d.ts",
  "bun": "./src/methods/user-op-receipt.ts",
  "default": "./dist/account-abstraction.js"
}
```

Add the entry to `scripts/build-settle-kit.mjs` alongside the existing core entry, and update `apps/lycoris/app/checkout/sponsored-payment.ts` to import from `@settle-kit/core/account-abstraction`.

**Step 5: Verify the boundary still holds**

```bash
bun run check-types && bun test && bun run measure:settle-kit && bun run check-boundaries
```

Expected: PASS, including the Task 10 assertion — the subpath must not pull account-abstraction code into the main entry.

**Step 6: Commit**

```bash
git add -A packages/settle-kit apps/lycoris scripts/build-settle-kit.mjs
git commit -m "feat(settle-kit)!: widen the method surface for a second method

SettleAdapter.id was the literal \"usdc\", so methods[] and selectMethod()
could never mean anything. Confirming a userOp needs a second adapter, and
that is what forced this — not the feature.

Settlement uses ?: never rather than a branded union: the brands are
optional phantom properties, so a union of them narrows nothing."
```

---

## Task 12: Docs

**Files:**
- Create: `docs/writing-a-payment-signer.md`
- Create: `apps/lycoris/app/llms.txt/route.ts`
- Modify: `README.md`

**Step 1: The authoring page**

`docs/writing-a-payment-signer.md` — three worked adapters, one short section each: wagmi, a bare viem `walletClient`, and the CDP server wallet. Lead with the interface, all three fields, then the adapters. Each is roughly ten lines. This page is the SDK's thesis and it currently does not exist.

**Step 2: Machine-readable docs**

`apps/lycoris/app/llms.txt/route.ts` serving `text/plain`: a title, a one-line description, and a linked index of the docs routes. For a repo whose subject is agentic payments, docs an agent can read is the argument made twice.

**Step 3: README**

Add the smart-account path to the "Choose a package" table's surrounding prose, and link the authoring page from the wallet-integration section.

**Step 4: Verify and commit**

```bash
bun run check-types && bun test && bun run check-tokens
git add docs README.md apps/lycoris/app/llms.txt
git commit -m "docs: how to write a PaymentSigner, and llms.txt"
```

---

## Open verifications

Neither blocks Task 1, both block the demo working end to end. Resolve before Task 9.

1. **CDP paymaster on EntryPoint 0.6 for Coinbase Smart Wallet.** If unsupported, the account choice reopens and `toSoladySmartAccount` (EntryPoint 0.7) is the fallback — Tasks 5, 6 and 9 change, Tasks 1–4 do not.
2. **The ERC-1271 finding.** Base Sepolia USDC's implementation has no `1626ba7e` in its bytecode, which is why the agent path stays on an EOA. Confirm with a live call from a deployed contract wallet before the design doc's claim is load-bearing.
