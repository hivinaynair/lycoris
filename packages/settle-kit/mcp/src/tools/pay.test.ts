import { describe, expect, it } from "bun:test";
import type { AgentPaymentResult, ResourceQuote } from "@settle-kit/agents";
import { serializeMandateHeader, signMandate } from "@settle-kit/agents";
import type { Address } from "@settle-kit/core";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import type { SettleMcpOptions } from "../options";
import { createMemoryStore } from "../store";
import { payForResourceTool } from "./pay";

const MERCHANT = "0x9999999999999999999999999999999999999999" as Address;
const OTHER = "0x8888888888888888888888888888888888888888" as Address;
const URL = "https://example.test/api/weather/public";
const ELSEWHERE = "https://elsewhere.test/x";

const quote: ResourceQuote = {
  amountAtomic: "100000",
  payTo: MERCHANT,
  challenge: { network: "eip155:84532" },
};

async function mandate(agent: Address, payTo: Address = MERCHANT) {
  const delegator = privateKeyToAccount(generatePrivateKey());
  const payload = {
    agent,
    delegator: delegator.address,
    payTo,
    maxAmountUsdc: 1n,
    expiry: 9999999999n,
    nonce: 1n,
  };
  return serializeMandateHeader({
    agentId: 1n,
    mandate: { payload, signature: await signMandate(delegator, payload) },
  });
}

function harness(input: {
  header: string;
  address: Address;
  allowlist?: string[];
  quote?: ResourceQuote;
  pay?: AgentPaymentResult;
  facilitator?: typeof fetch;
}) {
  let payCalls = 0;
  let facilitatorCalls = 0;
  const store = createMemoryStore();
  const options: SettleMcpOptions = {
    getSigner: async () => ({ address: input.address, client: {} }),
    getMandate: async () => input.header,
    facilitatorUrl: "https://facilitator.test",
    allowlist: input.allowlist ?? [URL],
    ports: {
      fetch: async (url, init) => {
        facilitatorCalls += 1;
        if (String(url).includes("decision-records")) {
          return new Response(JSON.stringify({ decisionRecord: { agentId: "1" } }), {
            status: 200,
          });
        }
        if (input.facilitator) return input.facilitator(url, init);
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      },
      quoteResource: async () => input.quote ?? quote,
      createPaidFetch: () => async () => new Response("{}", { status: 200 }),
      payForResource: async () => {
        payCalls += 1;
        return (
          input.pay ?? {
            httpStatus: 200,
            body: { rain: true },
            txHash: "0xsettled",
          }
        );
      },
    },
  };
  return {
    options,
    store,
    payCalls: () => payCalls,
    facilitatorCalls: () => facilitatorCalls,
  };
}

describe("pay_for_resource", () => {
  it("submits once for the same business event and returns the same pay_ id", async () => {
    const agent = privateKeyToAccount(generatePrivateKey());
    const ctx = harness({ header: await mandate(agent.address), address: agent.address });
    const first = await payForResourceTool(URL, ctx.options, ctx.store);
    const second = await payForResourceTool(URL, ctx.options, ctx.store);
    expect(ctx.payCalls()).toBe(1);
    const a = JSON.parse(first.content[0]?.text ?? "{}") as { payId: string; settled: boolean };
    const b = JSON.parse(second.content[0]?.text ?? "{}") as { payId: string };
    expect(a.payId).toStartWith("pay_");
    expect(a.payId).toBe(b.payId);
    expect(a.settled).toBe(true);
  });

  it("refuses a URL the mandate does not name, without submitting", async () => {
    const agent = privateKeyToAccount(generatePrivateKey());
    const ctx = harness({
      header: await mandate(agent.address, OTHER),
      address: agent.address,
    });
    const result = await payForResourceTool(URL, ctx.options, ctx.store);
    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain("mandate_recipient_mismatch");
    expect(ctx.payCalls()).toBe(0);
  });

  it("refuses a URL outside the allowlist without a facilitator call", async () => {
    const agent = privateKeyToAccount(generatePrivateKey());
    const ctx = harness({
      header: await mandate(agent.address),
      address: agent.address,
      allowlist: [URL],
    });
    const result = await payForResourceTool(ELSEWHERE, ctx.options, ctx.store);
    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain("not_allowlisted");
    expect(ctx.facilitatorCalls()).toBe(0);
    expect(ctx.payCalls()).toBe(0);
  });

  it("returns settled: false with the hash retained when settlement fails", async () => {
    const agent = privateKeyToAccount(generatePrivateKey());
    const ctx = harness({
      header: await mandate(agent.address),
      address: agent.address,
      pay: {
        httpStatus: 402,
        body: { error: "settlement_failed" },
        txHash: "0xfailed",
        error: "settlement_failed",
      },
    });
    const result = await payForResourceTool(URL, ctx.options, ctx.store);
    const body = JSON.parse(result.content[0]?.text ?? "{}") as {
      settled: boolean;
      settlementHash: string;
    };
    expect(body.settled).toBe(false);
    expect(body.settlementHash).toBe("0xfailed");
  });
});
