import { describe, expect, it } from "bun:test";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { createMcpHandler } from "@modelcontextprotocol/server";
import { serializeMandateHeader, signMandate } from "@settle-kit/agents";
import type { Address } from "@settle-kit/core";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { createSettleMcpServer } from "./create-server";
import type { SettleMcpOptions } from "./options";

/**
 * Protocol pin: stdio, 2026-07-28 only. Legacy `initialize` is rejected.
 */

const RESOURCE = "https://example.test/api/weather/public";
const MERCHANT = "0x9999999999999999999999999999999999999999" as Address;

async function testOptions(): Promise<SettleMcpOptions> {
  const agent = privateKeyToAccount(generatePrivateKey());
  const delegator = privateKeyToAccount(generatePrivateKey());
  const payload = {
    agent: agent.address,
    delegator: delegator.address,
    payTo: MERCHANT,
    maxAmountUsdc: 1n,
    expiry: 9999999999n,
    nonce: 1n,
  };
  const header = serializeMandateHeader({
    agentId: 1n,
    mandate: { payload, signature: await signMandate(delegator, payload) },
  });
  return {
    getSigner: async () => ({ address: agent.address, client: {} }),
    getMandate: async () => header,
    facilitatorUrl: "https://facilitator.test",
    allowlist: [RESOURCE],
    ports: {
      lookupRegistered: async () => false,
      readUsdcBalance: async () => 100000n,
      quoteResource: async () => undefined,
      fetch: async () => new Response(JSON.stringify({ ok: true }), { status: 200 }),
    },
  };
}

describe("protocol era", () => {
  it("connects when the client pins 2026-07-28 and reports modern", async () => {
    const options = await testOptions();
    const handler = createMcpHandler(() => createSettleMcpServer(options), {
      legacy: "reject",
    });
    const client = new Client(
      { name: "era-pin", version: "1.0.0" },
      { versionNegotiation: { mode: { pin: "2026-07-28" } } },
    );
    const transport = new StreamableHTTPClientTransport(new URL("http://test.local/mcp"), {
      fetch: (url, init) => handler.fetch(new Request(url, init)),
    });
    await client.connect(transport);
    expect(client.getProtocolEra()).toBe("modern");
    const listed = await client.listTools();
    expect(listed.tools.map((tool) => tool.name)).toEqual([
      "get_agent_identity",
      "get_mandate",
      "get_balance",
      "quote_resource",
      "pay_for_resource",
      "get_payment_status",
      "get_decision_record",
    ]);
    await client.close();
    await handler.close();
  });

  it("rejects a default-mode (legacy) client", async () => {
    const options = await testOptions();
    const handler = createMcpHandler(() => createSettleMcpServer(options), {
      legacy: "reject",
    });
    const client = new Client({ name: "era-legacy", version: "1.0.0" });
    const transport = new StreamableHTTPClientTransport(new URL("http://test.local/mcp"), {
      fetch: (url, init) => handler.fetch(new Request(url, init)),
    });
    expect(client.connect(transport)).rejects.toThrow();
    await handler.close();
  });
});

describe("stdio bin era", () => {
  const privateKey = generatePrivateKey();
  const env = {
    ...process.env,
    SETTLE_MCP_MANDATE: "pending",
    SETTLE_MCP_FACILITATOR_URL: "https://facilitator.test",
    SETTLE_MCP_ALLOWLIST: RESOURCE,
    SETTLE_MCP_PRIVATE_KEY: privateKey,
  };

  it("the bin names a missing variable and exits", async () => {
    const proc = Bun.spawn(["bun", "packages/settle-kit/mcp/src/bin.ts"], {
      stderr: "pipe",
      stdout: "pipe",
      env: Object.fromEntries(
        Object.entries(process.env).filter(([key]) => key !== "SETTLE_MCP_MANDATE"),
      ),
    });
    const stderr = await new Response(proc.stderr).text();
    expect(await proc.exited).not.toBe(0);
    expect(stderr).toContain("SETTLE_MCP_MANDATE");
  });

  it("a pinned modern client connects over stdio", async () => {
    const agent = privateKeyToAccount(privateKey);
    const delegator = privateKeyToAccount(generatePrivateKey());
    const payload = {
      agent: agent.address,
      delegator: delegator.address,
      payTo: MERCHANT,
      maxAmountUsdc: 1n,
      expiry: 9999999999n,
      nonce: 1n,
    };
    env.SETTLE_MCP_MANDATE = serializeMandateHeader({
      agentId: 1n,
      mandate: { payload, signature: await signMandate(delegator, payload) },
    });

    const client = new Client(
      { name: "stdio-pin", version: "1.0.0" },
      { versionNegotiation: { mode: { pin: "2026-07-28" } } },
    );
    const transport = new StdioClientTransport({
      command: "bun",
      args: ["packages/settle-kit/mcp/src/bin.ts"],
      env,
      stderr: "pipe",
    });
    await client.connect(transport);
    expect(client.getProtocolEra()).toBe("modern");
    await client.close();
  });
});
