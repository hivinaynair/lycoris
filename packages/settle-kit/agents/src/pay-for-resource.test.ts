import { describe, expect, it } from "bun:test";
import type { PaidFetch } from "./create-paid-fetch";
import { payForResource } from "./pay-for-resource";

function asPaidFetch(fn: () => Promise<Response>): PaidFetch {
  return Object.assign(fn, { getPaymentMetadata: () => undefined });
}

describe("payForResource", () => {
  it("maps a 200 JSON body", async () => {
    const result = await payForResource({
      url: "https://example.test/weather",
      paidFetch: asPaidFetch(
        async () =>
          new Response(JSON.stringify({ rain: true }), {
            status: 200,
            headers: { "content-type": "application/json" },
          }),
      ),
    });
    expect(result.httpStatus).toBe(200);
    expect(result.body).toEqual({ rain: true });
    expect(result.error).toBeUndefined();
  });

  it("maps a 402 JSON error body", async () => {
    const result = await payForResource({
      url: "https://example.test/weather",
      paidFetch: asPaidFetch(
        async () =>
          new Response(JSON.stringify({ error: "payment required" }), {
            status: 402,
            headers: { "content-type": "application/json" },
          }),
      ),
    });
    expect(result.httpStatus).toBe(402);
    expect(result.body).toEqual({ error: "payment required" });
  });

  it("maps a non-JSON error body", async () => {
    const result = await payForResource({
      url: "https://example.test/weather",
      paidFetch: asPaidFetch(
        async () =>
          new Response("<html><title>Nope</title></html>", {
            status: 502,
            headers: { "content-type": "text/html" },
          }),
      ),
    });
    expect(result.httpStatus).toBe(502);
    expect(String((result.body as { error: string }).error)).toContain("Nope");
  });
});

describe("payForResource error", () => {
  const respond = (status: number, body: unknown, contentType = "application/json") =>
    asPaidFetch(
      async () =>
        new Response(typeof body === "string" ? body : JSON.stringify(body), {
          status,
          headers: { "content-type": contentType },
        }),
    );

  it("reports the upstream error body on a failure", async () => {
    const result = await payForResource({
      url: "https://example.test/weather",
      paidFetch: respond(402, { error: "payment required" }),
    });
    expect(result.error).toBe("payment required");
  });

  it("reports the summary of a non-JSON failure", async () => {
    const result = await payForResource({
      url: "https://example.test/weather",
      paidFetch: respond(502, "<html><title>Nope</title></html>", "text/html"),
    });
    expect(result.error).toContain("Nope");
  });

  it("stays undefined on success, even when the body carries an error field", async () => {
    const result = await payForResource({
      url: "https://example.test/weather",
      paidFetch: respond(200, { error: "not a failure" }),
    });
    expect(result.error).toBeUndefined();
  });
});
