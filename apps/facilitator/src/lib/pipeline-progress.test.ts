import { describe, expect, it } from "bun:test";
import {
  GATE_STEP,
  pipelineGateFor,
  reportPipelineGate,
  resetPipelineProgress,
} from "./pipeline-progress";

const PAYER = "0xe9F97E2F7c6DCB8FCdBCDFBA074334D22a6c3117";

describe("pipeline progress", () => {
  it("records the live gate for a payer, monotonically", () => {
    resetPipelineProgress(PAYER);
    reportPipelineGate(PAYER, GATE_STEP.IDENTITY_CHECK);
    expect(pipelineGateFor(PAYER)).toBe(GATE_STEP.IDENTITY_CHECK);

    reportPipelineGate(PAYER, GATE_STEP.MANDATE_CHECK);
    expect(pipelineGateFor(PAYER)).toBe(GATE_STEP.MANDATE_CHECK);

    reportPipelineGate(PAYER, GATE_STEP.IDENTITY_CHECK);
    expect(pipelineGateFor(PAYER)).toBe(GATE_STEP.MANDATE_CHECK);
  });

  it("ignores stale rows from a previous run", () => {
    resetPipelineProgress(PAYER);
    reportPipelineGate(PAYER, GATE_STEP.ATTESTATION);
    const after = Date.now() + 1;
    expect(pipelineGateFor(PAYER, after)).toBe(0);
  });

  it("reset clears progress so a new phase can re-enter x402", () => {
    reportPipelineGate(PAYER, GATE_STEP.MANDATE_CHECK);
    resetPipelineProgress(PAYER);
    expect(pipelineGateFor(PAYER)).toBe(0);
    reportPipelineGate(PAYER, GATE_STEP.PAYMENT_SUBMITTED);
    expect(pipelineGateFor(PAYER)).toBe(GATE_STEP.PAYMENT_SUBMITTED);
  });
});
