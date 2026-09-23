import { describe, expect, it } from "bun:test";
import { getDecisionRecord } from "./facilitator";

const payer = "0xaaaa000000000000000000000000000000000000";

describe("getDecisionRecord", () => {
  it("returns the record once the facilitator has it", async () => {
    const record = { agentId: "1", payer, settlementTxHash: "0xabc" };
    const fetchImpl = async () =>
      new Response(JSON.stringify({ decisionRecord: record }), { status: 200 });
    expect(
      await getDecisionRecord(
        { facilitatorUrl: "https://facilitator.test", payer, settlementTxHash: "0xabc" },
        1,
        fetchImpl,
      ),
    ).toEqual(record);
  });

  it("returns undefined when the facilitator has no record yet", async () => {
    const fetchImpl = async () =>
      new Response(JSON.stringify({ decisionRecord: null }), { status: 200 });
    expect(
      await getDecisionRecord(
        { facilitatorUrl: "https://facilitator.test", payer, settlementTxHash: "0xabc" },
        1,
        fetchImpl,
      ),
    ).toBeUndefined();
  });
});
