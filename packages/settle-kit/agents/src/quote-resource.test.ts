import { describe, expect, it } from "bun:test";
import { quoteResource } from "./quote-resource";

const terms = {
  scheme: "exact",
  network: "eip155:84532",
  amount: "1000",
  asset: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  maxTimeoutSeconds: 60,
  extra: {},
};

function challenged(accepts: Record<string, unknown>[]) {
  const header = Buffer.from(JSON.stringify({ x402Version: 2, accepts })).toString("base64");
  return async () => new Response(null, { status: 402, headers: { "PAYMENT-REQUIRED": header } });
}

describe("quoteResource payTo", () => {
  it("reports the recipient the challenge named", async () => {
    const payTo = "0x1111111111111111111111111111111111111111";
    const quote = await quoteResource(
      "https://example.test/weather",
      challenged([{ ...terms, payTo }]),
    );
    expect(quote?.payTo).toBe(payTo);
  });

  it("leaves payTo absent when the challenge named no recipient", async () => {
    const quote = await quoteResource("https://example.test/weather", challenged([terms]));
    expect(quote?.amountAtomic).toBe("1000");
    expect(quote?.payTo).toBeUndefined();
  });

  it("leaves payTo absent when the challenge named a malformed recipient", async () => {
    const quote = await quoteResource(
      "https://example.test/weather",
      challenged([{ ...terms, payTo: "not-an-address" }]),
    );
    expect(quote?.payTo).toBeUndefined();
  });
});
