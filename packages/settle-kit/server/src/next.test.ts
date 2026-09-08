import { beforeEach, describe, expect, it } from "bun:test";
import { server } from "@repo/mocks/server";
import { BASE_SEPOLIA_USDC_ADDRESS } from "@settle-kit/core";
import { HttpResponse, http } from "msw";
import { NextRequest, NextResponse } from "next/server";
import { type AgenticPaymentOptions, withAgenticPayment } from "./next";

const network = "eip155:84532";
const payer = "0x2222222222222222222222222222222222222222";
const payTo = "0x1111111111111111111111111111111111111111";
const transaction = `0x${"ab".repeat(32)}`;
const calls: { path: string; mandate: string | null; body: unknown }[] = [];
let mode = "success";
let handlerCalls = 0;

// Exercise the real x402 middleware and client against intercepted facilitator HTTP.
const facilitatorHandler = http.all("http://facilitator.test/*", async ({ request }) => {
  const path = new URL(request.url).pathname;
  const mandate = request.headers.get("X-AP2-Mandate");
  calls.push({ path, mandate, body: request.method === "POST" ? await request.json() : null });
  if (path === "/supported") {
    if (mode === "unavailable")
      return HttpResponse.json({ error: "private upstream detail" }, { status: 500 });
    return HttpResponse.json({
      kinds: [{ x402Version: 2, scheme: "exact", network }],
      extensions: [],
      signers: {},
    });
  }
  // Yield so concurrent requests can overlap between verify and settle.
  await Promise.resolve();
  if (path === "/verify") {
    return HttpResponse.json(
      mode === "denied" || !mandate
        ? { isValid: false, invalidReason: "mandate_amount_exceeded", payer }
        : { isValid: true, payer },
    );
  }
  return HttpResponse.json({
    success: mode !== "settle-failed",
    errorReason: mode === "settle-failed" ? "insufficient_funds" : undefined,
    transaction: mode === "settle-failed" ? "" : transaction,
    network,
    payer,
  });
});
const options: AgenticPaymentOptions = {
  priceUsdc: "0.10",
  network,
  payTo,
  facilitatorUrl: "http://facilitator.test",
};
const resource = async () => {
  handlerCalls++;
  return NextResponse.json({ forecast: "rain" });
};

function request(payment?: unknown, mandate?: string) {
  const headers = new Headers();
  if (payment)
    headers.set("PAYMENT-SIGNATURE", Buffer.from(JSON.stringify(payment)).toString("base64"));
  if (mandate) headers.set("X-AP2-Mandate", mandate);
  return new NextRequest("http://merchant.test/api/weather", { headers });
}

async function quote(handler: ReturnType<typeof withAgenticPayment>) {
  const response = await handler(request());
  expect(response.status).toBe(402);
  const header = response.headers.get("PAYMENT-REQUIRED");
  expect(header).toBeTruthy();
  return JSON.parse(Buffer.from(header ?? "", "base64").toString());
}

function payment(challenge: Awaited<ReturnType<typeof quote>>) {
  return {
    x402Version: 2,
    resource: challenge.resource,
    accepted: challenge.accepts[0],
    payload: { signature: "0xfake", authorization: { from: payer } },
  };
}

beforeEach(() => {
  server.use(facilitatorHandler);
  calls.length = 0;
  handlerCalls = 0;
  mode = "success";
});

describe("withAgenticPayment", () => {
  it("challenges an unpaid request with exact USDC terms without executing the resource", async () => {
    const challenge = await quote(withAgenticPayment(resource, options));
    expect(challenge.accepts[0]).toMatchObject({
      amount: "100000",
      asset: BASE_SEPOLIA_USDC_ADDRESS,
      payTo,
      network,
    });
    expect(handlerCalls).toBe(0);
    expect(calls.map((call) => call.path)).toEqual(["/supported"]);
  });

  it("forwards the mandate for verification and settlement, then returns the resource and receipt", async () => {
    const handler = withAgenticPayment(resource, options);
    const signed = payment(await quote(handler));
    const response = await handler(request(signed, "mandate-a"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ forecast: "rain" });
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    const receipt = JSON.parse(
      Buffer.from(response.headers.get("PAYMENT-RESPONSE") ?? "", "base64").toString(),
    );
    expect(receipt).toMatchObject({ success: true, transaction });
    expect(
      calls
        .filter((call) => call.path !== "/supported")
        .map(({ path, mandate }) => ({ path, mandate })),
    ).toEqual([
      { path: "/verify", mandate: "mandate-a" },
      { path: "/settle", mandate: "mandate-a" },
    ]);
    expect(calls.find((call) => call.path === "/verify")?.body).toMatchObject({
      paymentPayload: signed,
    });
    expect(handlerCalls).toBe(1);
  });

  for (const denial of ["denied", "missing-mandate"]) {
    it(`does not execute or settle when the facilitator rejects ${denial}`, async () => {
      const handler = withAgenticPayment(resource, options);
      const signed = payment(await quote(handler));
      mode = denial;
      const response = await handler(request(signed, denial === "denied" ? "capped" : undefined));
      expect(response.status).toBe(402);
      expect(handlerCalls).toBe(0);
      expect(calls.some((call) => call.path === "/settle")).toBe(false);
    });
  }

  it("withholds the prepared resource if settlement fails", async () => {
    const handler = withAgenticPayment(resource, options);
    const signed = payment(await quote(handler));
    mode = "settle-failed";
    const response = await handler(request(signed, "mandate-a"));
    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(await response.text()).not.toContain('"forecast"');
    expect(handlerCalls).toBe(1);
  });

  it("does not settle a failed resource handler", async () => {
    const handler = withAgenticPayment(
      async () => new Response("weather unavailable", { status: 503 }),
      options,
    );
    const signed = payment(await quote(handler));
    const response = await handler(request(signed, "mandate-a"));
    expect(response.status).toBe(503);
    expect(calls.some((call) => call.path === "/settle")).toBe(false);
  });

  it("keeps concurrent buyers' mandates separate and out of capability requests", async () => {
    const handler = withAgenticPayment(resource, options);
    const signed = payment(await quote(handler));
    const responses = await Promise.all(
      ["buyer-a", "buyer-b"].map((mandate) => handler(request(signed, mandate))),
    );
    expect(responses.map((response) => response.status)).toEqual([200, 200]);
    for (const path of ["/verify", "/settle"]) {
      expect(
        calls
          .filter((call) => call.path === path)
          .map((call) => call.mandate)
          .sort(),
      ).toEqual(["buyer-a", "buyer-b"]);
    }
    expect(
      calls.filter((call) => call.path === "/supported").every((call) => call.mandate === null),
    ).toBe(true);
  });

  it("fails closed when the facilitator cannot initialize", async () => {
    mode = "unavailable";
    const response = await withAgenticPayment(resource, options)(request());
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "agentic_payment_request_failed" });
    expect(handlerCalls).toBe(0);
  });

  it("preserves Next route params", async () => {
    const handler = withAgenticPayment(
      async (_request, context: { params: Promise<{ city: string }> }) =>
        Response.json(await context.params),
      options,
    );
    const context = { params: Promise.resolve({ city: "Melbourne" }) };
    const challengeResponse = await handler(request(), context);
    const challenge = JSON.parse(
      Buffer.from(challengeResponse.headers.get("PAYMENT-REQUIRED") ?? "", "base64").toString(),
    );
    const response = await handler(request(payment(challenge), "mandate-a"), context);
    expect(await response.json()).toEqual({ city: "Melbourne" });
  });

  it("rejects invalid amount, network, recipient, and facilitator configuration", () => {
    for (const override of [
      { priceUsdc: "0" },
      { priceUsdc: "0.0000001" },
      { priceUsdc: "$0.10" },
      { network: "eip155:1" },
      { payTo: "invalid" },
      { payTo: `0x${"0".repeat(40)}` },
      { facilitatorUrl: "file:///tmp/facilitator" },
    ]) {
      expect(() =>
        withAgenticPayment(resource, { ...options, ...override } as AgenticPaymentOptions),
      ).toThrow();
    }
  });
});
