import { describe, expect, it } from "bun:test";
import { toMoney } from "../money";
import { createMemoryStore } from "../store";
import { getDecisionRecordTool, getPaymentStatus } from "./evidence";

describe("evidence tools", () => {
  it("returns a clean not-found result for an unknown pay_", async () => {
    const store = createMemoryStore();
    const status = await getPaymentStatus("pay_missing", store);
    const record = await getDecisionRecordTool("pay_missing", store);
    expect(status.isError).toBe(true);
    expect(record.isError).toBe(true);
    expect(status.content[0]?.text).toContain("payment_not_found");
  });

  it("returns status, explorer link and the decision record", async () => {
    const store = createMemoryStore();
    await store.put("pay_abc", {
      payId: "pay_abc",
      url: "https://example.test/x",
      amount: toMoney("100000"),
      settled: true,
      status: "settled",
      settlementHash: "0xabc",
      explorer: "https://sepolia.basescan.org/tx/0xabc",
      decisionRecord: { failureGate: "mandate", rejectionReason: undefined },
    });
    const status = await getPaymentStatus("pay_abc", store);
    const body = JSON.parse(status.content[0]?.text ?? "{}") as {
      explorer: string;
      settlementHash: string;
    };
    expect(body.explorer).toBe("https://sepolia.basescan.org/tx/0xabc");
    expect(body.settlementHash).toBe("0xabc");
  });
});
