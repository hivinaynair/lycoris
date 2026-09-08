import { describe, expect, it, mock } from "bun:test";
import { createCheckout } from "./create-checkout";
import { createSettleConfig } from "./create-settle-config";
import { createUsdcMethod } from "./methods/usdc";
import { validateQuote } from "./quote-client";
import {
  BASE_SEPOLIA_USDC_ADDRESS,
  type PaymentSigner,
  type Quote,
  type SettleAdapter,
  type TxHash,
} from "./types";

const destination = {
  targetChain: 84532 as const,
  targetAsset: BASE_SEPOLIA_USDC_ADDRESS,
  recipient: "0x1111111111111111111111111111111111111111" as const,
};
const hash: TxHash = `0x${"ab".repeat(32)}`;
const makeQuote = (): Quote => ({
  requestId: "q",
  amountUsdc: "12.50",
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
  const onSettled = mock(() => {});
  const settle = mock(async () => hash);
  const confirm = mock(async () => "success" as const);
  const config = createSettleConfig({
    destination,
    getSigner: getSigner ?? (async () => signer),
    methods: [{ id: "usdc", quote: async () => makeQuote(), settle, confirm, ...overrides }],
    onSettled,
  });
  return {
    manager: createCheckout(config, { amountUsdc: "12.50" }),
    config,
    settle,
    confirm,
    onSettled,
    send,
    signer,
  };
}

describe("checkout payment safety", () => {
  it("does not settle or call the host before the receipt succeeds", async () => {
    const receipt = deferred<"success">();
    const f = fixture({ confirm: () => receipt.promise });
    await f.manager.selectMethod("usdc");
    const payment = f.manager.pay();
    await Promise.resolve();
    await Promise.resolve();
    expect(f.manager.getState()).toMatchObject({ status: "settling", txHash: hash });
    expect(f.onSettled).not.toHaveBeenCalled();
    receipt.resolve("success");
    await payment;
    expect(f.manager.getState().status).toBe("settled");
    expect(f.onSettled).toHaveBeenCalledTimes(1);
  });

  it("retains an unknown payment and retries only its receipt", async () => {
    let calls = 0;
    const f = fixture({
      confirm: async () => {
        if (++calls === 1) throw Error("RPC unavailable");
        return "success";
      },
    });
    await f.manager.selectMethod("usdc");
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
    expect(f.onSettled).toHaveBeenCalledTimes(1);
  });

  it("keeps a reverted receipt hash and does not claim success", async () => {
    const f = fixture({ confirm: async () => "reverted" });
    await f.manager.selectMethod("usdc");
    await f.manager.pay();
    expect(f.manager.getState()).toMatchObject({
      status: "failed",
      txHash: hash,
      error: { code: "transfer_failed" },
    });
    expect(f.onSettled).not.toHaveBeenCalled();
    f.manager.reset();
    expect(f.manager.getState().status).toBe("idle");
  });

  it("rejects reset and duplicate pay while acquiring a signer", async () => {
    const pending = deferred<PaymentSigner>();
    const f = fixture({}, () => pending.promise);
    await f.manager.selectMethod("usdc");
    const payment = f.manager.pay();
    expect(() => f.manager.reset()).toThrow("Cannot reset");
    await expect(f.manager.pay()).rejects.toMatchObject({ code: "invalid_config" });
    pending.resolve(f.signer);
    await payment;
    expect(f.settle).toHaveBeenCalledTimes(1);
    expect(f.manager.getState().status).toBe("settled");
  });

  it("checks expiry again after wallet acquisition", async () => {
    const quote = makeQuote();
    const f = fixture({ quote: async () => quote }, async () => {
      // The accepted quote is frozen; use a controllable clock for the delayed wallet.
      clock = quote.expiresAt + 1;
      return { address: destination.recipient, sendTransaction: async () => hash };
    });
    const original = Date.now;
    let clock = original();
    Date.now = () => clock;
    try {
      await f.manager.selectMethod("usdc");
      await f.manager.pay();
      expect(f.settle).not.toHaveBeenCalled();
      expect(f.manager.getState()).toMatchObject({
        status: "failed",
        error: { code: "quote_expired" },
      });
    } finally {
      Date.now = original;
    }
  });

  it("rejects mismatched adapter quotes before asking for a signer", async () => {
    const getSigner = mock(async () => {
      throw Error("unused");
    });
    const f = fixture(
      { quote: async () => ({ ...makeQuote(), amountAtomic: "99000000" }) },
      getSigner,
    );
    await f.manager.selectMethod("usdc");
    expect(f.manager.getState()).toMatchObject({ status: "failed" });
    expect(getSigner).not.toHaveBeenCalled();
  });

  it("ignores a quote response from a reset session", async () => {
    const pending = deferred<Quote>();
    const f = fixture({ quote: () => pending.promise });
    const selecting = f.manager.selectMethod("usdc");
    f.manager.reset();
    pending.resolve(makeQuote());
    await selecting;
    expect(f.manager.getState().status).toBe("idle");
  });

  it("validates amounts, token, chain and per-purchase overrides synchronously", () => {
    const f = fixture();
    for (const amountUsdc of ["abc", "0", "-1", "1.0000001", "1".repeat(90)]) {
      expect(() => createCheckout(f.config, { amountUsdc })).toThrow();
    }
    for (const invalid of [
      { ...destination, targetAsset: destination.recipient },
      { ...destination, targetChain: 1 as 84532 },
      { ...destination, recipient: `0x${"0".repeat(40)}` as const },
    ]) {
      expect(() => createSettleConfig({ ...f.config, destination: invalid })).toThrow();
      expect(() => createCheckout(f.config, { amountUsdc: "1", destination: invalid })).toThrow();
    }
  });

  it("rejects inconsistent, invalid, or changed quote amounts", () => {
    for (const patch of [
      { amountAtomic: "99000000" },
      { amountAtomic: "0" },
      { amountAtomic: "-1" },
      { amountUsdc: "99", amountAtomic: "99000000" },
      { expiresAt: Infinity },
      { expiresAt: NaN },
      { amountUsdc: "abc" },
    ]) {
      expect(() => validateQuote({ ...makeQuote(), ...patch }, "12.50")).toThrow();
    }
  });

  it("checks expiry after balance preflight and does not send", async () => {
    const sendTransaction = mock(async () => hash);
    const quote = makeQuote();
    let now = quote.expiresAt - 1;
    const method = createUsdcMethod({
      now: () => now,
      client: {
        readContract: async () => {
          now = quote.expiresAt;
          return 100000000n;
        },
      },
    });
    await expect(
      method.settle({
        quote,
        destination,
        signer: { address: destination.recipient, sendTransaction },
      }),
    ).rejects.toMatchObject({ code: "quote_expired" });
    expect(sendTransaction).not.toHaveBeenCalled();
  });

  it("uses the supplied receipt client and refuses a replacement hash", async () => {
    const waitForTransactionReceipt = mock(async () => ({
      status: "success" as const,
      transactionHash: hash,
    }));
    const method = createUsdcMethod({ receiptClient: { waitForTransactionReceipt } });
    expect(await method.confirm({ txHash: hash, destination, quote: makeQuote() })).toBe("success");
    expect(waitForTransactionReceipt).toHaveBeenCalledWith({
      hash,
      confirmations: 1,
      timeout: 60000,
    });
    waitForTransactionReceipt.mockResolvedValueOnce({
      status: "success",
      transactionHash: "0x1234",
    });
    await expect(method.confirm({ txHash: hash, destination, quote: makeQuote() })).rejects.toThrow(
      "replaced",
    );
  });
});

it("maps wallet rejection to data without invoking the transfer adapter", async () => {
  const f = fixture({}, async () => {
    throw { code: 4001, message: "Request declined" };
  });
  await f.manager.selectMethod("usdc");
  await f.manager.pay();
  expect(f.manager.getState()).toMatchObject({
    status: "failed",
    error: { code: "wallet_rejected" },
  });
  expect(f.settle).not.toHaveBeenCalled();
});

it("rejects a wrong-network signer before balance or send", async () => {
  const readContract = mock(async () => 100000000n);
  const sendTransaction = mock(async () => hash);
  const method = createUsdcMethod({ client: { readContract } });
  await expect(
    method.settle({
      quote: makeQuote(),
      destination,
      signer: { address: destination.recipient, getChainId: async () => 1, sendTransaction },
    }),
  ).rejects.toMatchObject({ code: "wrong_network" });
  expect(readContract).not.toHaveBeenCalled();
  expect(sendTransaction).not.toHaveBeenCalled();
});

describe("destination resolution", () => {
  const withoutDestination = (quote: Partial<Quote> = {}) =>
    createSettleConfig({
      getSigner: async () => ({
        address: destination.recipient,
        sendTransaction: async () => hash,
      }),
      methods: [
        {
          id: "usdc",
          quote: async () => ({ ...makeQuote(), ...quote }),
          settle: async () => hash,
          confirm: async () => "success" as const,
        },
      ],
    });

  it("pays the destination the quote returned when the app configured none", async () => {
    const manager = createCheckout(withoutDestination({ destination }), { amountUsdc: "12.50" });
    await manager.selectMethod("usdc");
    expect(manager.getState()).toMatchObject({ status: "awaiting_payment", destination });
  });

  it("fails the quote when no destination resolves at all", async () => {
    const manager = createCheckout(withoutDestination(), { amountUsdc: "12.50" });
    await expect(manager.selectMethod("usdc")).rejects.toThrow(/destination is required/);
    expect(manager.getState()).toMatchObject({
      status: "failed",
      error: { code: "invalid_config" },
    });
  });

  it("still rejects a malformed app destination when the session is created", () => {
    expect(() =>
      createCheckout(withoutDestination(), {
        amountUsdc: "12.50",
        destination: { ...destination, recipient: "0xnope" as never },
      }),
    ).toThrow(/recipient/);
  });

  it("prefers the per-checkout destination over the app default", async () => {
    const perCheckout = {
      ...destination,
      recipient: "0x3333333333333333333333333333333333333333" as const,
    };
    const f = fixture();
    const manager = createCheckout(f.config, { amountUsdc: "12.50", destination: perCheckout });
    await manager.selectMethod("usdc");
    expect(manager.getState()).toMatchObject({
      status: "awaiting_payment",
      destination: perCheckout,
    });
  });

  it("refuses to settle a quote bound to a different recipient", async () => {
    const method = createUsdcMethod({ client: { readContract: async () => 100000000n } });
    const quote = { ...makeQuote(), destination };
    const other = {
      ...destination,
      recipient: "0x4444444444444444444444444444444444444444" as const,
    };
    const sendTransaction = mock(async () => hash);
    await expect(
      method.settle({
        quote,
        destination: other,
        signer: { address: other.recipient, sendTransaction },
      }),
    ).rejects.toMatchObject({ code: "transfer_failed" });
    expect(sendTransaction).not.toHaveBeenCalled();
  });
});
