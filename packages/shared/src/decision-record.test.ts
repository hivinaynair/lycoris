import { describe, expect, it } from "bun:test";
import { mandateMaxAtomicFromDecisionRecord } from "./decision-record.js";

describe("mandateMaxAtomicFromDecisionRecord", () => {
  it("reads whole-USDC mandate caps as atomic units", () => {
    expect(mandateMaxAtomicFromDecisionRecord({ mandate: { maxAmountUsdc: "1" } })).toBe(
      1_000_000n,
    );
    expect(mandateMaxAtomicFromDecisionRecord({ mandate: { maxAmountUsdc: "2.5" } })).toBe(
      2_500_000n,
    );
  });

  it("returns 0 when the mandate cap is missing", () => {
    expect(mandateMaxAtomicFromDecisionRecord(null)).toBe(0n);
    expect(mandateMaxAtomicFromDecisionRecord({ mandate: { maxAmountUsdc: "unknown" } })).toBe(0n);
  });
});
