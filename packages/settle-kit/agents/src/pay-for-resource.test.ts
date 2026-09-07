import { describe, expect, it } from "bun:test";
import { payForResource } from "./pay-for-resource";

describe("payForResource", () => {
  it("maps a 200 JSON body", async () => {
    const paidFetch = async () =>
      new Response(JSON.stringify({ rain: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    const result = await payForResource({
      url: "https://example.test/weather",
      paidFetch,
    });
    expect(result.httpStatus).toBe(200);
    expect(result.body).toEqual({ rain: true });
    expect(result.paymentRequiredError).toBeUndefined();
  });

  it("maps a 402 JSON error body", async () => {
    const paidFetch = async () =>
      new Response(JSON.stringify({ error: "payment required" }), {
        status: 402,
        headers: { "content-type": "application/json" },
      });
    const result = await payForResource({
      url: "https://example.test/weather",
      paidFetch,
    });
    expect(result.httpStatus).toBe(402);
    expect(result.body).toEqual({ error: "payment required" });
  });

  it("maps a non-JSON error body", async () => {
    const paidFetch = async () =>
      new Response("<html><title>Nope</title></html>", {
        status: 502,
        headers: { "content-type": "text/html" },
      });
    const result = await payForResource({
      url: "https://example.test/weather",
      paidFetch,
    });
    expect(result.httpStatus).toBe(502);
    expect(String((result.body as { error: string }).error)).toContain("Nope");
  });
});
