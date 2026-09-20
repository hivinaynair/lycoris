import { describe, expect, it } from "bun:test";
import { getDecisionRecord, preclear } from "./facilitator";

const ok = async () => new Response(JSON.stringify({ ok: true }), { status: 200 });
const refused = async () =>
  new Response(JSON.stringify({ ok: false, reason: "mandate_expired" }), { status: 200 });
const down = async () => {
  throw new Error("ECONNREFUSED");
};

const input = {
  facilitatorUrl: "https://facilitator.test",
  amountAtomic: "100000",
  mandateHeader: "header",
  payer: "0xaaaa000000000000000000000000000000000000",
  resource: "https://example.test/x",
};

describe("preclear", () => {
  it("passes a permitted payment", async () => {
    expect(await preclear(input, ok)).toEqual({ ok: true });
  });

  it("reports the gate that refused", async () => {
    expect(await preclear(input, refused)).toEqual({ ok: false, reason: "mandate_expired" });
  });

  it("treats an unreachable facilitator as a refusal, not a crash", async () => {
    expect(await preclear(input, down)).toEqual({ ok: false, reason: "facilitator_unreachable" });
  });
});

describe("getDecisionRecord", () => {
  it("returns the record once the facilitator has it", async () => {
    const record = { agentId: "1", payer: input.payer, settlementTxHash: "0xabc" };
    const fetchImpl = async () =>
      new Response(JSON.stringify({ decisionRecord: record }), { status: 200 });
    expect(
      await getDecisionRecord(
        { facilitatorUrl: input.facilitatorUrl, payer: input.payer, settlementTxHash: "0xabc" },
        1,
        fetchImpl,
      ),
    ).toEqual(record);
  });
});
