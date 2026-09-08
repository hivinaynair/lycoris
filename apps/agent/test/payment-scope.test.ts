import { describe, expect, it } from "bun:test";
import { DEMO_SCENARIO_AGENTS } from "@repo/shared/demo";
import { paymentScope } from "../agent/lib/payment-scope";

describe("chat payment authority", () => {
  it("binds each scenario to its own wallet and the configured weather endpoint", () => {
    for (const name of DEMO_SCENARIO_AGENTS) {
      expect(paymentScope(name, "https://demo.example")).toEqual({
        agentName: name,
        url: "https://demo.example/api/weather/public",
      });
    }
  });
  it("rejects missing scope, arbitrary wallets, and model-shaped scope objects", () => {
    for (const input of [
      undefined,
      null,
      "other-wallet",
      { agentName: DEMO_SCENARIO_AGENTS[0], url: "https://evil.example" },
    ]) {
      expect(() => paymentScope(input, "https://demo.example")).toThrow("payment_scope_missing");
    }
    expect(() => paymentScope(DEMO_SCENARIO_AGENTS[0], undefined)).toThrow();
  });
});
