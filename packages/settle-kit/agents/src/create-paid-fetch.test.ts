import { expect, it } from "bun:test";
import { createPaidFetch } from "./create-paid-fetch";
import { payForResource } from "./pay-for-resource";

const scheme = { network: "eip155:84532", client: { scheme: "exact" } };
const signature = (nonce: string) =>
  btoa(JSON.stringify({ x402Version: 2, payload: { authorization: { nonce } } }));
it("preserves Request headers, body, method and signal while adding a mandate", async () => {
  const controller = new AbortController();
  const paid = createPaidFetch({
    scheme,
    getMandateHeader: () => "mandate",
    fetch: async (input) => {
      const request = new Request(input);
      expect(request.headers.get("authorization")).toBe("Bearer host");
      expect(request.headers.get("content-type")).toBe("application/json");
      expect(request.headers.get("x-ap2-mandate")).toBe("mandate");
      expect(request.method).toBe("POST");
      expect(await request.text()).toBe('{"order":1}');
      controller.abort();
      expect(request.signal.aborted).toBe(true);
      return Response.json({ ok: true });
    },
  });
  await paid(
    new Request("https://example.test", {
      method: "POST",
      headers: { authorization: "Bearer host", "content-type": "application/json" },
      body: '{"order":1}',
      signal: controller.signal,
    }),
  );
});

it("honors RequestInit header overrides", async () => {
  const paid = createPaidFetch({
    scheme,
    getMandateHeader: () => "mandate",
    fetch: async (input) => {
      expect(new Request(input).headers.get("authorization")).toBe("replacement");
      return Response.json({});
    },
  });
  await paid(new Request("https://example.test", { headers: { authorization: "original" } }), {
    headers: { authorization: "replacement" },
  });
});

it("isolates metadata between concurrent responses and a later free request", async () => {
  let release!: () => void;
  const gate = new Promise<void>((r) => {
    release = r;
  });
  const paid = createPaidFetch({
    scheme,
    fetch: async (input) => {
      if (new Request(input).url.endsWith("/a")) await gate;
      return Response.json({ ok: true });
    },
  });
  const first = paid("https://example.test/a", {
    headers: { "PAYMENT-SIGNATURE": signature("a") },
  });
  const second = await paid("https://example.test/b", {
    headers: { "PAYMENT-SIGNATURE": signature("b") },
  });
  release();
  const a = await first;
  expect(paid.getPaymentMetadata(a)?.authorizationNonce).toBe("a");
  expect(paid.getPaymentMetadata(second)?.authorizationNonce).toBe("b");
  const free = await payForResource({ url: "https://example.test/free", paidFetch: paid });
  expect(free.authorizationNonce).toBeUndefined();
  expect(free.challenge).toBeUndefined();
});

it("keeps the challenge and authorization together through a real x402 retry", async () => {
  const terms = {
    scheme: "exact",
    network: "eip155:84532",
    amount: "1000",
    asset: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    payTo: "0x1111111111111111111111111111111111111111",
    maxTimeoutSeconds: 60,
    extra: {},
  };
  const challenge = {
    x402Version: 2,
    resource: {
      url: "https://example.test/weather",
      description: "Weather",
      mimeType: "application/json",
    },
    accepts: [terms],
  };
  let attempts = 0;
  const paid = createPaidFetch({
    scheme: {
      network: "eip155:84532",
      client: {
        scheme: "exact",
        findDefaultAsset: () => ({ symbol: "USDC", decimals: 6 }),
        createPaymentPayload: async () => ({
          x402Version: 2,
          payload: { authorization: { nonce: "weather-nonce" } },
        }),
      },
    },
    getMandateHeader: () => "mandate",
    fetch: async (input) => {
      const request = new Request(input);
      expect(request.headers.get("x-ap2-mandate")).toBe("mandate");
      if (++attempts === 1)
        return new Response(null, {
          status: 402,
          headers: { "PAYMENT-REQUIRED": btoa(JSON.stringify(challenge)) },
        });
      expect(request.headers.has("PAYMENT-SIGNATURE")).toBe(true);
      return Response.json({ rain: true });
    },
  });
  const result = await payForResource({ url: "https://example.test/weather", paidFetch: paid });
  expect(attempts).toBe(2);
  expect(result.authorizationNonce).toBe("weather-nonce");
  expect(result.challenge?.resource).toBe("https://example.test/weather");
});
