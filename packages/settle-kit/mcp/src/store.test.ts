import { describe, expect, it } from "bun:test";
import { toMoney } from "./money";
import { createMemoryStore, type PaymentRecord } from "./store";

const record = (overrides: Partial<PaymentRecord> = {}): PaymentRecord => ({
  payId: "pay_abc",
  url: "https://example.test/x",
  amount: toMoney("100000"),
  settled: false,
  status: "failed",
  ...overrides,
});

describe("createMemoryStore", () => {
  it("round-trips a record", async () => {
    const store = createMemoryStore();
    await store.put("pay_abc", record());
    expect(await store.get("pay_abc")).toEqual(record());
  });

  it("returns undefined for an absent key", async () => {
    expect(await createMemoryStore().get("pay_missing")).toBeUndefined();
  });

  it("refuses to overwrite a completed payment", async () => {
    const store = createMemoryStore();
    await store.put("pay_abc", record({ settled: true, status: "settled" }));
    expect(store.put("pay_abc", record({ settled: true, status: "settled" }))).rejects.toThrow(
      /cannot be overwritten/,
    );
  });
});
