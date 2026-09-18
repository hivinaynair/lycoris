import { describe, expect, test } from "bun:test";
import type { SettlementHash } from "../types";
import { createUserOpReceiptClient } from "./user-op-receipt";

const userOpHash =
  "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as SettlementHash;
const bundleHash =
  "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" as SettlementHash;

/** Shaped like viem's UserOperationReceiptNotFoundError, which is matched by name. */
function notFoundError() {
  const error = new Error(`User Operation receipt with hash "${userOpHash}" could not be found.`);
  error.name = "UserOperationReceiptNotFoundError";
  return error;
}

describe("createUserOpReceiptClient", () => {
  test("reports reverted when the userOp failed inside a bundle that succeeded", async () => {
    const client = createUserOpReceiptClient({
      // The bundle transaction mined fine; only `success` records what the userOp did.
      getUserOperationReceipt: async () => ({
        success: false,
        receipt: { transactionHash: bundleHash },
      }),
    });

    const receipt = await client.waitForTransactionReceipt({
      hash: userOpHash,
      confirmations: 1,
      timeout: 1_000,
    });

    expect(receipt.status).toBe("reverted");
  });

  test("reports success when the userOp succeeded", async () => {
    const client = createUserOpReceiptClient({
      getUserOperationReceipt: async () => ({
        success: true,
        receipt: { transactionHash: bundleHash },
      }),
    });

    const receipt = await client.waitForTransactionReceipt({
      hash: userOpHash,
      confirmations: 1,
      timeout: 1_000,
    });

    expect(receipt.status).toBe("success");
  });

  test("echoes the userOpHash, never the bundle transaction hash", async () => {
    const client = createUserOpReceiptClient({
      getUserOperationReceipt: async () => ({
        success: true,
        receipt: { transactionHash: bundleHash },
      }),
    });

    const receipt = await client.waitForTransactionReceipt({
      hash: userOpHash,
      confirmations: 1,
      timeout: 1_000,
    });

    // confirm() compares this against the hash settle() returned — a userOpHash.
    // Handing back the bundle hash would read as a replaced transaction.
    expect(receipt.transactionHash).toBe(userOpHash);
    expect(receipt.transactionHash).not.toBe(bundleHash);
  });

  test("polls until the receipt appears", async () => {
    let calls = 0;
    const client = createUserOpReceiptClient(
      {
        getUserOperationReceipt: async () => {
          calls += 1;
          if (calls < 3) return null;
          return { success: true, receipt: { transactionHash: bundleHash } };
        },
      },
      { pollMs: 1 },
    );

    const receipt = await client.waitForTransactionReceipt({
      hash: userOpHash,
      confirmations: 1,
      timeout: 1_000,
    });

    expect(calls).toBe(3);
    expect(receipt.status).toBe("success");
  });

  test("polls through viem's not-found error", async () => {
    let calls = 0;
    const client = createUserOpReceiptClient(
      {
        // viem's getUserOperationReceipt throws for a pending op; it never returns null.
        getUserOperationReceipt: async () => {
          calls += 1;
          if (calls < 3) throw notFoundError();
          return { success: true, receipt: { transactionHash: bundleHash } };
        },
      },
      { pollMs: 1 },
    );

    const receipt = await client.waitForTransactionReceipt({
      hash: userOpHash,
      confirmations: 1,
      timeout: 1_000,
    });

    expect(calls).toBe(3);
    expect(receipt.status).toBe("success");
  });

  test("propagates an RPC failure instead of re-diagnosing it as a timeout", async () => {
    let calls = 0;
    const client = createUserOpReceiptClient(
      {
        getUserOperationReceipt: async () => {
          calls += 1;
          throw new Error("bundler unreachable");
        },
      },
      { pollMs: 1 },
    );

    await expect(
      client.waitForTransactionReceipt({
        hash: userOpHash,
        confirmations: 1,
        timeout: 1_000,
      }),
    ).rejects.toThrow(/bundler unreachable/);
    // Surfaced on the first poll, not swallowed until the deadline.
    expect(calls).toBe(1);
  });

  test("throws rather than guessing when the receipt never arrives", async () => {
    const client = createUserOpReceiptClient(
      { getUserOperationReceipt: async () => null },
      { pollMs: 1 },
    );

    await expect(
      client.waitForTransactionReceipt({
        hash: userOpHash,
        confirmations: 1,
        timeout: 5,
      }),
    ).rejects.toThrow(/timed out/i);
  });
});
