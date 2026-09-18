import { describe, expect, test } from "bun:test";
import { createSettleConfig } from "./create-settle-config";
import { createUsdcMethod } from "./methods/usdc";
import type { SettleAdapter } from "./types";

const getSigner = async () => ({
  address: "0x1111111111111111111111111111111111111111" as const,
  sendTransaction: async () => "0xabc" as const,
});

describe("createSettleConfig", () => {
  test("defaults to a single USDC method", () => {
    expect(createSettleConfig({ getSigner }).methods).toHaveLength(1);
  });

  // The bug this test exists for: the type said methods could hold more than
  // one adapter while the validator still demanded exactly one called "usdc",
  // so a smart-account host could not build a config at all.
  test("accepts a smart-account method", () => {
    const method = createUsdcMethod({ id: "usdc-4337" });
    expect(createSettleConfig({ getSigner, methods: [method] }).methods[0]?.id).toBe("usdc-4337");
  });

  test("accepts both methods together", () => {
    const methods = [createUsdcMethod(), createUsdcMethod({ id: "usdc-4337" })];
    expect(createSettleConfig({ getSigner, methods }).methods).toHaveLength(2);
  });

  test("refuses an unknown method id", () => {
    const method = { ...createUsdcMethod(), id: "paypal" } as unknown as SettleAdapter;
    expect(() => createSettleConfig({ getSigner, methods: [method] })).toThrow(/Unknown payment/);
  });

  test("refuses two adapters under one id", () => {
    const methods = [createUsdcMethod(), createUsdcMethod()];
    expect(() => createSettleConfig({ getSigner, methods })).toThrow(/Duplicate/);
  });

  test("refuses an incomplete adapter", () => {
    const method = { id: "usdc", quote: () => {} } as unknown as SettleAdapter;
    expect(() => createSettleConfig({ getSigner, methods: [method] })).toThrow(/needs quote/);
  });

  test("refuses an empty methods array", () => {
    expect(() => createSettleConfig({ getSigner, methods: [] })).toThrow(/at least one/);
  });
});
