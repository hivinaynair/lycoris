import { describe, expect, it } from "bun:test";
import {
  buildDecisionRecord,
  mandateMaxAtomicFromDecisionRecord,
  routeFromResource,
} from "./decision-record.js";
import { Decision, IdentityStatus } from "./types.js";

describe("decision resource evidence", () => {
  it("preserves the x402 v2 resource in the persisted decision", () => {
    const record = buildDecisionRecord({
      amountAtomic: 100_000n,
      decision: Decision.Approved,
      identityStatus: IdentityStatus.Verified,
      resource: {
        url: "https://lycoris.example/api/weather/public?run=123",
        description: "Melbourne weather report",
        mimeType: "application/json",
      },
    });
    expect(record.route).toEqual({ path: "/api/weather/public", price: "0.1 USDC" });
  });

  it("retains legacy and preclear URL strings", () => {
    expect(routeFromResource("https://lycoris.example/api/weather/public", 100_000n)).toEqual({
      path: "/api/weather/public",
      price: "0.1 USDC",
    });
    expect(routeFromResource("/api/weather/rooftop-brief", 100_000n).path).toBe(
      "/api/weather/rooftop-brief",
    );
  });

  it("preserves other resource paths without inventing a known report", () => {
    expect(routeFromResource({ url: "https://merchant.example/data" }, 250_000n)).toEqual({
      path: "/data",
      price: "$0.25",
    });
  });

  it("leaves missing or malformed resource evidence unknown", () => {
    for (const resource of [
      undefined,
      null,
      {},
      { url: 42 },
      { url: "" },
      { url: "http://[" },
      " ",
    ]) {
      expect(routeFromResource(resource, 100_000n).path).toBe("unknown");
    }
  });
});

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
