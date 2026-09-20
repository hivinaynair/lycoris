import { describe, expect, it } from "bun:test";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import type { MandatePayload } from "./eip712";
import { signMandate } from "./sign";
import { verifyMandateLocal } from "./verify";

const MERCHANT = "0x9999999999999999999999999999999999999999" as const;

function payload(overrides: Partial<MandatePayload> = {}): MandatePayload {
  return {
    agent: "0x1111111111111111111111111111111111111111",
    delegator: "0x2222222222222222222222222222222222222222",
    payTo: MERCHANT,
    maxAmountUsdc: 12_500_000n,
    expiry: BigInt(Math.floor(Date.now() / 1000) + 3600),
    nonce: 1n,
    ...overrides,
  };
}

describe("verifyMandateLocal", () => {
  it("rejects an expired mandate", async () => {
    const result = await verifyMandateLocal(
      {
        payload: payload({ expiry: 1n }),
        signature: `0x${"ab".repeat(65)}`,
      },
      { now: 10 },
    );
    expect(result).toEqual({ ok: false, reason: "expired" });
  });

  it("rejects an agent mismatch", async () => {
    const result = await verifyMandateLocal(
      {
        payload: payload(),
        signature: `0x${"ab".repeat(65)}`,
      },
      { agent: "0x3333333333333333333333333333333333333333" },
    );
    expect(result).toEqual({ ok: false, reason: "agent_mismatch" });
  });

  it("accepts a signature that binds the delegator", async () => {
    const account = privateKeyToAccount(generatePrivateKey());
    const next = payload({
      delegator: account.address,
      payTo: MERCHANT,
      agent: account.address,
    });
    const signature = await signMandate(account, next);
    const result = await verifyMandateLocal(
      { payload: next, signature },
      { agent: account.address },
    );
    expect(result).toEqual({ ok: true });
  });
});

describe("verifyMandateLocal recipient binding", () => {
  async function signed() {
    const account = privateKeyToAccount(generatePrivateKey());
    const next = payload({ delegator: account.address, payTo: MERCHANT, agent: account.address });
    return { payload: next, signature: await signMandate(account, next) };
  }

  it("rejects a mandate issued for a different merchant", async () => {
    expect(
      await verifyMandateLocal(await signed(), {
        payTo: "0x8888888888888888888888888888888888888888",
      }),
    ).toEqual({ ok: false, reason: "recipient_mismatch" });
  });

  it("accepts the merchant the mandate names", async () => {
    expect(await verifyMandateLocal(await signed(), { payTo: MERCHANT })).toEqual({ ok: true });
  });
});
