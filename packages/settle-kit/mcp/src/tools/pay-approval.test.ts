import { describe, expect, it } from "bun:test";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { createMcpHandler, isInputRequiredResult } from "@modelcontextprotocol/server";
import type { ResourceQuote } from "@settle-kit/agents";
import { serializeMandateHeader, signMandate } from "@settle-kit/agents";
import type { HexAddress } from "@settle-kit/core";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { createSettleMcpServer } from "../create-server";
import type { SettleMcpOptions } from "../options";
import { createMemoryStore } from "../store";

const MERCHANT = "0x9999999999999999999999999999999999999999" as HexAddress;
const RESOURCE = "https://example.test/api/weather/public";

function quote(amountAtomic: string): ResourceQuote {
  return { amountAtomic, payTo: MERCHANT, challenge: { network: "eip155:84532" } };
}

async function mandate(agent: HexAddress) {
  const delegator = privateKeyToAccount(generatePrivateKey());
  const payload = {
    agent,
    delegator: delegator.address,
    payTo: MERCHANT,
    maxAmountUsdc: 1n,
    expiry: 9999999999n,
    nonce: 1n,
  };
  return serializeMandateHeader({
    agentId: 1n,
    mandate: { payload, signature: await signMandate(delegator, payload) },
  });
}

async function connect(options: SettleMcpOptions) {
  const handler = createMcpHandler(() => createSettleMcpServer(options), { legacy: "reject" });
  const client = new Client(
    { name: "settle-kit-test", version: "0.0.1" },
    {
      capabilities: { elicitation: {} },
      versionNegotiation: { mode: { pin: "2026-07-28" } },
    },
  );
  const transport = new StreamableHTTPClientTransport(new URL("http://test.local/mcp"), {
    fetch: (url, init) => handler.fetch(new Request(url, init)),
  });
  await client.connect(transport);
  return { client, close: () => Promise.all([client.close(), handler.close()]) };
}

function heldOptions(input: {
  header: string;
  address: HexAddress;
  quotes: ResourceQuote[];
  ttlSeconds?: number;
}) {
  let payCalls = 0;
  let quoteIndex = 0;
  const store = createMemoryStore();
  const options: SettleMcpOptions = {
    getSigner: async () => ({ address: input.address, client: {} }),
    getMandate: async () => input.header,
    facilitatorUrl: "https://facilitator.test",
    allowlist: [RESOURCE],
    store,
    requestStateKey: crypto.getRandomValues(new Uint8Array(32)),
    ...(input.ttlSeconds ? { requestStateTtlSeconds: input.ttlSeconds } : {}),
    ports: {
      fetch: async (url) => {
        if (String(url).includes("/preclear")) {
          return new Response(JSON.stringify({ ok: false, reason: "held" }), { status: 200 });
        }
        return new Response(JSON.stringify({ decisionRecord: { agentId: "1" } }), { status: 200 });
      },
      quoteResource: async () => input.quotes[Math.min(quoteIndex++, input.quotes.length - 1)],
      createPaidFetch: () => async () => new Response("{}", { status: 200 }),
      payForResource: async () => {
        payCalls += 1;
        return { httpStatus: 200, body: { rain: true }, txHash: "0xsettled" };
      },
    },
  };
  return { options, payCalls: () => payCalls };
}

describe("held payments over MRTR", () => {
  it("pays after a held preclear is approved", async () => {
    const agent = privateKeyToAccount(generatePrivateKey());
    const ctx = heldOptions({
      header: await mandate(agent.address),
      address: agent.address,
      quotes: [quote("100000"), quote("100000")],
    });
    const { client, close } = await connect(ctx.options);
    try {
      const held = await client.callTool(
        { name: "pay_for_resource", arguments: { url: RESOURCE } },
        { allowInputRequired: true },
      );
      expect(isInputRequiredResult(held)).toBe(true);
      if (!isInputRequiredResult(held)) return;
      const paid = await client.callTool({
        name: "pay_for_resource",
        arguments: { url: RESOURCE },
        requestState: held.requestState,
        inputResponses: {
          approval: { action: "accept", content: { approved: true } },
        },
      });
      expect(paid.isError).toBeUndefined();
      expect(ctx.payCalls()).toBe(1);
      expect(JSON.stringify(paid.structuredContent)).toContain("pay_");
    } finally {
      await close();
    }
  });

  it("does not pay when the human declines", async () => {
    const agent = privateKeyToAccount(generatePrivateKey());
    const ctx = heldOptions({
      header: await mandate(agent.address),
      address: agent.address,
      quotes: [quote("100000"), quote("100000")],
    });
    const { client, close } = await connect(ctx.options);
    try {
      const held = await client.callTool(
        { name: "pay_for_resource", arguments: { url: RESOURCE } },
        { allowInputRequired: true },
      );
      if (!isInputRequiredResult(held)) throw new Error("expected input_required");
      const result = await client.callTool({
        name: "pay_for_resource",
        arguments: { url: RESOURCE },
        requestState: held.requestState,
        inputResponses: { approval: { action: "accept", content: { approved: false } } },
      });
      expect(result.isError).toBe(true);
      expect(JSON.stringify(result.structuredContent)).toContain("approval_declined");
      expect(ctx.payCalls()).toBe(0);
    } finally {
      await close();
    }
  });

  it("rejects a tampered requestState before the handler runs", async () => {
    const agent = privateKeyToAccount(generatePrivateKey());
    const ctx = heldOptions({
      header: await mandate(agent.address),
      address: agent.address,
      quotes: [quote("100000")],
    });
    const { client, close } = await connect(ctx.options);
    try {
      const held = await client.callTool(
        { name: "pay_for_resource", arguments: { url: RESOURCE } },
        { allowInputRequired: true },
      );
      if (!isInputRequiredResult(held) || !held.requestState)
        throw new Error("expected sealed state");
      const tampered = `${held.requestState.slice(0, -6)}aaaaaa`;
      expect(
        client.callTool({
          name: "pay_for_resource",
          arguments: { url: RESOURCE },
          requestState: tampered,
          inputResponses: { approval: { action: "accept", content: { approved: true } } },
        }),
      ).rejects.toThrow();
      expect(ctx.payCalls()).toBe(0);
    } finally {
      await close();
    }
  });

  it("rejects expired requestState", async () => {
    const agent = privateKeyToAccount(generatePrivateKey());
    const ctx = heldOptions({
      header: await mandate(agent.address),
      address: agent.address,
      quotes: [quote("100000")],
      ttlSeconds: 1,
    });
    const { client, close } = await connect(ctx.options);
    try {
      const held = await client.callTool(
        { name: "pay_for_resource", arguments: { url: RESOURCE } },
        { allowInputRequired: true },
      );
      if (!isInputRequiredResult(held)) throw new Error("expected input_required");
      await Bun.sleep(2500);
      expect(
        client.callTool({
          name: "pay_for_resource",
          arguments: { url: RESOURCE },
          requestState: held.requestState,
          inputResponses: { approval: { action: "accept", content: { approved: true } } },
        }),
      ).rejects.toThrow();
      expect(ctx.payCalls()).toBe(0);
    } finally {
      await close();
    }
  });

  it("refuses and re-asks when the quote moves across the approval round", async () => {
    const agent = privateKeyToAccount(generatePrivateKey());
    const ctx = heldOptions({
      header: await mandate(agent.address),
      address: agent.address,
      quotes: [quote("100000"), quote("150000")],
    });
    const { client, close } = await connect(ctx.options);
    try {
      const held = await client.callTool(
        { name: "pay_for_resource", arguments: { url: RESOURCE } },
        { allowInputRequired: true },
      );
      if (!isInputRequiredResult(held)) throw new Error("expected input_required");
      const again = await client.callTool(
        {
          name: "pay_for_resource",
          arguments: { url: RESOURCE },
          requestState: held.requestState,
          inputResponses: { approval: { action: "accept", content: { approved: true } } },
        },
        { allowInputRequired: true },
      );
      expect(isInputRequiredResult(again)).toBe(true);
      expect(ctx.payCalls()).toBe(0);
    } finally {
      await close();
    }
  });
});
