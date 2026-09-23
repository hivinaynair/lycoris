import { describe, expect, it } from "bun:test";
import { getDecisionRecord } from "./facilitator";

describe("getDecisionRecord", () => {
  it("returns the record once the facilitator has it", async () => {
    const record = {
      agentId: "1",
      payer: "0xaaaa000000000000000000000000000000000000",
      settlementTxHash: "0xabc",
    };
    const fetchImpl = async () =>
      new Response(JSON.stringify({ decisionRecord: record }), { status: 200 });
    expect(
      await getDecisionRecord(
        {
          facilitatorUrl: "https://facilitator.test",
          payer: record.payer,
          settlementTxHash: "0xabc",
        },
        1,
        fetchImpl,
      ),
    ).toEqual(record);
  });
});
