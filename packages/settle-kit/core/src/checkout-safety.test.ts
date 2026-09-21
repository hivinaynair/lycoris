import { describe, expect, it, mock } from "bun:test";
import { createCheckout } from "./create-checkout";
import { validateIntent } from "./intent";
import { createUsdcMethod } from "./methods/usdc";
import {
  BASE_SEPOLIA_USDC_ADDRESS,
  type Intent,
  type PaymentSigner,
  type SettleAdapter,
  type SettlementHash,
} from "./types";

const destination = {
  targetChain: 84532 as const,
  targetAsset: BASE_SEPOLIA_USDC_ADDRESS,
  recipient: "0x1111111111111111111111111111111111111111" as const,
};
const hash = `0x${"ab".repeat(32)}` as SettlementHash;
const makeIntent = (): Intent => ({
  requestId: "q",
  amount: "12.50",
  amountAtomic: "12500000",
  expiresAt: Date.now() + 60000,
  method: "usdc",
});
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}
function fixture(overrides: Partial<SettleAdapter> = {}, getSigner?: () => Promise<PaymentSigner>) {
  const send = mock(async () => hash);
  const signer: PaymentSigner = { address: destination.recipient, sendTransaction: send };
  const settle = mock(async () => hash);
  const confirm = mock(async () => "success" as const);
  const config = {
    destination,
    getSigner: getSigner ?? (async () => signer),
    method: {
      id: "usdc" as const,
      prepare: async () => makeIntent(),
      settle,
      confirm,
      ...overrides,
    },
  };
  return {
    manager: createCheckout({ ...config, amount: "12.50" }),
    config,
    settle,
    confirm,
    send,
    signer,
  };
}

describe("checkout payment safety", () => {
  it("does not settle or call the host before the receipt succeeds", async () => {
    const receipt = deferred<"success">();
    const f = fixture({ confirm: () => receipt.promise });
    const payment = f.manager.pay();
    for (let i = 0; i < 20; i++) {
      const current = f.manager.getState();
      if (current.status === "settling" && current.txHash) break;
      await Promise.resolve();
    }
    expect(f.manager.getState()).toMatchObject({ status: "settling", txHash: hash });
    receipt.resolve("success");
    await payment;
    expect(f.manager.getState().status).toBe("settled");
  });

  it("retains an unknown payment and retries only its receipt", async () => {
    let calls = 0;
    const f = fixture({
      confirm: async () => {
        if (++calls === 1) throw Error("RPC unavailable");
        return "success";
      },
    });
    await f.manager.pay();
    expect(f.manager.getState()).toMatchObject({
      status: "settling",
      txHash: hash,
      confirmationError: { code: "transfer_failed" },
    });
    expect(() => f.manager.reset()).toThrow("Cannot reset");
    await expect(f.manager.pay()).rejects.toMatchObject({ code: "invalid_config" });
    await f.manager.retryConfirmation();
    expect(f.settle).toHaveBeenCalledTimes(1);
  });

  it("keeps a reverted receipt hash and does not claim success", async () => {
    const f = fixture({ confirm: async () => "reverted" });
    await f.manager.pay();
    expect(f.manager.getState()).toMatchObject({
      status: "failed",
      txHash: hash,
      error: { code: "transfer_failed" },
    });
    f.manager.reset();
    expect(f.manager.getState().status).toBe("idle");
  });

  it("rejects reset and duplicate pay while acquiring a signer", async () => {
    const pending = deferred<PaymentSigner>();
    const f = fixture({}, () => pending.promise);
    const payment = f.manager.pay();
    await Promise.resolve();
    await Promise.resolve();
    expect(() => f.manager.reset()).toThrow("Cannot reset");
    await expect(f.manager.pay()).rejects.toMatchObject({ code: "invalid_config" });
    pending.resolve(f.signer);
    await payment;
    expect(f.settle).toHaveBeenCalledTimes(1);
    expect(f.manager.getState().status).toBe("settled");
  });

  it("checks expiry again after wallet acquisition", async () => {
    const intent = makeIntent();
    const f = fixture({ prepare: async () => intent }, async () => {
      clock = intent.expiresAt + 1;
      return { address: destination.recipient, sendTransaction: async () => hash };
    });
    const original = Date.now;
    let clock = original();
    Date.now = () => clock;
    try {
      await f.manager.pay();
      expect(f.settle).not.toHaveBeenCalled();
      expect(f.manager.getState()).toMatchObject({
        status: "failed",
        error: { code: "expired" },
      });
    } finally {
      Date.now = original;
    }
  });

  it("rejects mismatched adapter intents before asking for a signer", async () => {
    const getSigner = mock(async () => {
      throw Error("unused");
    });
    const f = fixture(
      { prepare: async () => ({ ...makeIntent(), amountAtomic: "99000000" }) },
      getSigner,
    );
    await f.manager.pay();
    expect(f.manager.getState()).toMatchObject({ status: "failed" });
    expect(getSigner).not.toHaveBeenCalled();
  });

  it("refuses reset while prepare is still in flight", async () => {
    const pending = deferred<Intent>();
    const f = fixture({ prepare: () => pending.promise });
    const paying = f.manager.pay();
    expect(() => f.manager.reset()).toThrow("Cannot reset");
    pending.resolve(makeIntent());
    await paying;
    expect(f.manager.getState().status).toBe("settled");
  });

  it("validates amounts, token, chain and per-purchase overrides synchronously", () => {
    const f = fixture();
    for (const amount of ["abc", "0", "-1", "1.0000001", "1".repeat(90)]) {
      expect(() => createCheckout({ ...f.config, amount })).toThrow();
    }
    for (const invalid of [
      { ...destination, targetAsset: destination.recipient },
      { ...destination, targetChain: 1 as 84532 },
      { ...destination, recipient: `0x${"0".repeat(40)}` as const },
    ]) {
      expect(() => createCheckout({ ...f.config, amount: "1", destination: invalid })).toThrow();
    }
  });

  it("rejects inconsistent, invalid, or changed intent amounts", () => {
    for (const patch of [
      { amountAtomic: "99000000" },
      { amountAtomic: "0" },
      { amountAtomic: "-1" },
      { amount: "99", amountAtomic: "99000000" },
      { expiresAt: Infinity },
      { expiresAt: NaN },
      { amount: "abc" },
    ]) {
      expect(() => validateIntent({ ...makeIntent(), ...patch }, "12.50")).toThrow();
    }
  });

  it("checks expiry after balance preflight and does not send", async () => {
    const sendTransaction = mock(async () => hash);
    const intent = makeIntent();
    let now = intent.expiresAt - 1;
    const method = createUsdcMethod({
      now: () => now,
      client: {
        readContract: async () => {
          now = intent.expiresAt;
          return 100000000n;
        },
      },
    });
    await expect(
      method.settle({
        intent,
        destination,
        signer: { address: destination.recipient, sendTransaction },
      }),
    ).rejects.toMatchObject({ code: "expired" });
    expect(sendTransaction).not.toHaveBeenCalled();
  });

  it("uses the supplied receipt client and refuses a replacement hash", async () => {
    const waitForTransactionReceipt = mock(async () => ({
      status: "success" as const,
      transactionHash: hash,
    }));
    const method = createUsdcMethod({ receiptClient: { waitForTransactionReceipt } });
    expect(await method.confirm({ txHash: hash, destination, intent: makeIntent() })).toBe(
      "success",
    );
    expect(waitForTransactionReceipt).toHaveBeenCalledWith({
      hash,
      confirmations: 1,
      timeout: 60000,
    });
    waitForTransactionReceipt.mockResolvedValueOnce({
      status: "success",
      transactionHash: "0x1234",
    });
    await expect(
      method.confirm({ txHash: hash, destination, intent: makeIntent() }),
    ).rejects.toThrow("replaced");
  });
});

it("maps wallet rejection to data without invoking the transfer adapter", async () => {
  const f = fixture({}, async () => {
    throw { code: 4001, message: "Request declined" };
  });
  await f.manager.pay();
  expect(f.manager.getState()).toMatchObject({
    status: "failed",
    error: { code: "wallet_rejected" },
  });
  expect(f.settle).not.toHaveBeenCalled();
});

describe("destination resolution", () => {
  const withoutDestination = (intent: Partial<Intent> = {}) => ({
    getSigner: async () => ({
      address: destination.recipient,
      sendTransaction: async () => hash,
    }),
    method: {
      id: "usdc" as const,
      prepare: async () => ({ ...makeIntent(), ...intent }),
      settle: async () => hash,
      confirm: async () => "success" as const,
    },
    amount: "12.50",
  });

  it("pays the destination prepare returned when the app configured none", async () => {
    const manager = createCheckout(withoutDestination({ destination }));
    await manager.pay();
    expect(manager.getState()).toMatchObject({ status: "settled", destination });
  });

  it("fails prepare when no destination resolves at all", async () => {
    const manager = createCheckout(withoutDestination());
    await expect(manager.pay()).rejects.toThrow(/destination is required/);
    expect(manager.getState()).toMatchObject({
      status: "failed",
      error: { code: "invalid_config" },
    });
  });

  it("still rejects a malformed destination when the session is created", () => {
    expect(() =>
      createCheckout({
        ...withoutDestination(),
        destination: { ...destination, recipient: "0xnope" as never },
      }),
    ).toThrow(/recipient/);
  });

  it("uses the destination passed to createCheckout", async () => {
    const perCheckout = {
      ...destination,
      recipient: "0x3333333333333333333333333333333333333333" as const,
    };
    const f = fixture();
    const manager = createCheckout({ ...f.config, amount: "12.50", destination: perCheckout });
    await manager.pay();
    expect(manager.getState()).toMatchObject({
      status: "settled",
      destination: perCheckout,
    });
  });

  it("refuses to settle an intent bound to a different recipient", async () => {
    const method = createUsdcMethod({ client: { readContract: async () => 100000000n } });
    const intent = { ...makeIntent(), destination };
    const other = {
      ...destination,
      recipient: "0x4444444444444444444444444444444444444444" as const,
    };
    const sendTransaction = mock(async () => hash);
    await expect(
      method.settle({
        intent,
        destination: other,
        signer: { address: other.recipient, sendTransaction },
      }),
    ).rejects.toMatchObject({ code: "transfer_failed" });
    expect(sendTransaction).not.toHaveBeenCalled();
  });
});
