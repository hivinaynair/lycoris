import { describe, expect, it } from "bun:test";
import { gateState, packetPosition } from "./settlement-gates";

describe("gateState", () => {
  it("marks earlier gates approved and the current gate running", () => {
    expect(gateState(0, 2, false, true)).toBe("approved");
    expect(gateState(1, 2, false, true)).toBe("running");
    expect(gateState(2, 2, false, true)).toBe("idle");
  });

  it("rejects at the failed step and skips the rest", () => {
    expect(gateState(1, 3, false, false, "identity_not_found")).toBe("rejected");
    expect(gateState(0, 3, false, false, "identity_not_found")).toBe("approved");
    expect(gateState(2, 3, false, false, "identity_not_found")).toBe("skipped");
  });
});

describe("packetPosition", () => {
  it("stops at the failed gate", () => {
    expect(packetPosition(6, "identity_not_found")).toBe(51);
  });
});
