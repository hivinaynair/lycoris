import { describe, expect, test } from "bun:test";
import type { SettlementHash } from "@settle-kit/core";
import { createUserOpReceiptClient } from "./user-op-receipt";

const userOpHash =
  "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as SettlementHash;
const bundleHash =
  "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" as SettlementHash;

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
