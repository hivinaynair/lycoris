import { describe, expect, it } from "bun:test";
import type { ResourceQuote } from "@settle-kit/agents";
import { serializeMandateHeader, signMandate } from "@settle-kit/agents";
import type { Address } from "@settle-kit/core";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import type { SettleMcpOptions } from "../options";
import { quoteResourceTool } from "./quote";

const MERCHANT = "0x9999999999999999999999999999999999999999" as Address;
const URL = "https://example.test/api/weather/public";

const quote: ResourceQuote = {
  amountAtomic: "100000",
  payTo: MERCHANT,
  challenge: { network: "eip155:84532", maxAmountRequired: "100000" },
};

async function headerFor(agent: Address) {
  const delegator = privateKeyToAccount(generatePrivateKey());
  const payload = {
    agent,
    delegator: delegator.address,
    payTo: MERCHANT,
    maxAmountUsdc: 1n,
    expiry: 9999999999n,
    nonce: 1n,
  };
  const signature = await signMandate(delegator, payload);
  return serializeMandateHeader({ agentId: 1n, mandate: { payload, signature } });
}

function options(input: {
  header: string;
  address: Address;
  allowlist?: string[];
  quote?: ResourceQuote | undefined;
  facilitator?: typeof fetch;
}): SettleMcpOptions {
  let facilitatorCalls = 0;
  const facilitator: typeof fetch = async (url, init) => {
    facilitatorCalls += 1;
    if (input.facilitator) return input.facilitator(url, init);
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  };
  const config: SettleMcpOptions = {
    getSigner: async () => ({ address: input.address, client: {} }),
    getMandate: async () => input.header,
    facilitatorUrl: "https://facilitator.test",
    allowlist: input.allowlist ?? [URL],
    ports: {
      fetch: facilitator,
      quoteResource: async () => input.quote,
    },
  };
  return Object.assign(config, { facilitatorCalls: () => facilitatorCalls });
}

describe("quote_resource", () => {
  it("returns an isError result for a non-x402 URL, without throwing", async () => {
    const agent = privateKeyToAccount(generatePrivateKey());
    const result = await quoteResourceTool(
      URL,
      options({ header: await headerFor(agent.address), address: agent.address, quote: undefined }),
    );
    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain("not_x402");
  });

  it("refuses a URL outside the allowlist before any facilitator call", async () => {
    const agent = privateKeyToAccount(generatePrivateKey());
    const cfg = options({
      header: await headerFor(agent.address),
      address: agent.address,
      quote,
      allowlist: ["https://elsewhere.test/x"],
    });
    const result = await quoteResourceTool(URL, cfg);
    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain("not_allowlisted");
    expect((cfg as unknown as { facilitatorCalls: () => number }).facilitatorCalls()).toBe(0);
  });

  it("returns x402 terms as money and does not ask the facilitator", async () => {
    const agent = privateKeyToAccount(generatePrivateKey());
    const cfg = options({ header: await headerFor(agent.address), address: agent.address, quote });
    const result = await quoteResourceTool(URL, cfg);
    expect(result.isError).toBeUndefined();
    const body = JSON.parse(result.content[0]?.text ?? "{}") as {
      amount: { display: string; atomic: string; currency: string };
      preclear?: unknown;
    };
    expect(body.amount).toEqual({
      decimal: "0.10",
      atomic: "100000",
      currency: "USDC",
      display: "0.10 USDC",
    });
    expect(body.preclear).toBeUndefined();
    expect((cfg as unknown as { facilitatorCalls: () => number }).facilitatorCalls()).toBe(0);
  });
});
