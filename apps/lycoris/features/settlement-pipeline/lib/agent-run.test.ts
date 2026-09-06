import { describe, expect, it } from "bun:test";
import type { HandleMessageStreamEvent } from "eve/client";
import { outcomeFromEvent } from "./agent-run";

const TARGET = "http://localhost:3000/api/weather/public";
const PAYER = "0xbf43c2e070becf6f5eac23787813c9ad8747be46";

function actionResult(
  result: unknown,
  extra?: {
    status?: "completed" | "failed" | "rejected";
    error?: { code: string; message: string };
  },
) {
  return {
    type: "action.result",
    data: {
      result,
      sequence: 0,
      stepIndex: 0,
      status: extra?.status ?? "completed",
      turnId: "t1",
      ...(extra?.error ? { error: extra.error } : {}),
    },
  } as Extract<HandleMessageStreamEvent, { type: "action.result" }>;
}

describe("outcomeFromEvent", () => {
  it("reads Eve toolName, not the legacy name field", () => {
    const outcome = outcomeFromEvent(
      actionResult({
        callId: "1",
        kind: "tool-result",
        toolName: "fetch_paid_resource",
        output: {
          url: TARGET,
          payer: PAYER,
          status: 200,
          txHash: "0xabc",
          body: { willRainAt1Pm: false },
        },
      }),
      TARGET,
      "0x",
    );

    expect(outcome?.httpStatus).toBe(200);
    expect(outcome?.settlementTxHash).toBe("0xabc");
    expect(outcome?.payer).toBe(PAYER);
  });

  it("captures an approval denial reason", () => {
    const outcome = outcomeFromEvent(
      actionResult(
        {
          callId: "1",
          kind: "tool-result",
          toolName: "fetch_paid_resource",
          output: { type: "denied", reason: "mandate_missing" },
        },
        { status: "rejected" },
      ),
      TARGET,
      PAYER,
    );

    expect(outcome?.error).toBe("mandate_missing");
    expect(outcome?.httpStatus).toBe(402);
  });

  it("ignores other tools", () => {
    expect(
      outcomeFromEvent(
        actionResult({
          callId: "1",
          kind: "tool-result",
          toolName: "read_file",
          output: { ok: true },
        }),
        TARGET,
        PAYER,
      ),
    ).toBeUndefined();
  });
});
