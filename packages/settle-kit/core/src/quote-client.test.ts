import { describe, expect, it, mock } from "bun:test";
import { fetchQuote, validateQuote } from "./quote-client";
import { BASE_SEPOLIA_USDC_ADDRESS, type Destination } from "./types";

const destination: Destination = {
  targetChain: 84532,
  targetAsset: BASE_SEPOLIA_USDC_ADDRESS,
  recipient: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
};
const body = (extra: Record<string, unknown> = {}) => ({
  requestId: "q",
  amountUsdc: "12.50",
  amountAtomic: "12500000",
  expiresAt: Date.now() + 60_000,
  method: "usdc",
  ...extra,
});

describe("validateQuote destination binding", () => {
  it("adopts the destination the server returned", () => {
    expect(validateQuote(body({ destination }), "12.50").destination).toEqual(destination);
  });

  it("accepts a server destination that matches the requested one, ignoring case", () => {
    const shouted = {
      ...destination,
      targetAsset: destination.targetAsset.toLowerCase() as Destination["targetAsset"],
      recipient: `0x${destination.recipient.slice(2).toUpperCase()}` as Destination["recipient"],
    };
    expect(
      validateQuote(body({ destination: shouted }), "12.50", destination).destination,
    ).toBeDefined();
  });

  it("rejects a server destination that redirects the payment", () => {
    const attacker = {
      ...destination,
      recipient: "0x2222222222222222222222222222222222222222" as const,
    };
    expect(() => validateQuote(body({ destination: attacker }), "12.50", destination)).toThrow(
      /does not match/,
    );
  });

  it("rejects a malformed server destination as external data, not host config", () => {
    const bad = { ...destination, recipient: "0x0000000000000000000000000000000000000000" };
    try {
      validateQuote(body({ destination: bad }), "12.50");
      throw new Error("expected throw");
    } catch (error) {
      expect((error as { code: string }).code).toBe("transfer_failed");
    }
  });

  it("leaves destination undefined when the server omits it", () => {
    expect(validateQuote(body(), "12.50", destination).destination).toBeUndefined();
  });

  it("omits destination from the request body when the host has none and binds the reply", async () => {
    let sent: Record<string, unknown> = {};
    const fetchMock = mock(async (_url: string, init: { body: string }) => {
      sent = JSON.parse(init.body);
      return { ok: true, json: async () => body({ destination }) } as unknown as Response;
    });
    const original = globalThis.fetch;
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    try {
      const quote = await fetchQuote("https://merchant.test/quote", {
        amountUsdc: "12.50",
        method: "usdc",
      });
      expect("destination" in sent).toBe(false);
      expect(quote.destination).toEqual(destination);
    } finally {
      globalThis.fetch = original;
    }
  });

  it("rejects a reply that redirects a destination the host did request", async () => {
    const attacker = {
      ...destination,
      recipient: "0x2222222222222222222222222222222222222222",
    };
    const original = globalThis.fetch;
    globalThis.fetch = mock(async (_url: string, init: { body: string }) => {
      expect(JSON.parse(init.body).destination).toEqual(destination);
      return { ok: true, json: async () => body({ destination: attacker }) } as unknown as Response;
    }) as unknown as typeof fetch;
    try {
      await expect(
        fetchQuote("https://merchant.test/quote", {
          amountUsdc: "12.50",
          destination,
          method: "usdc",
        }),
      ).rejects.toThrow(/does not match/);
    } finally {
      globalThis.fetch = original;
    }
  });
});
