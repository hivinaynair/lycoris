import { describe, expect, it } from "bun:test";
import { type MandatePayload, serializeMandateHeader, signMandate } from "@settle-kit/agents";
import type { HexAddress } from "@settle-kit/core";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import type { SettleMcpOptions } from "../options";
import { createMemoryStore } from "../store";
import { getAgentIdentity, getBalance, getMandate } from "./identity";

const MERCHANT = "0x9999999999999999999999999999999999999999" as HexAddress;

async function signedMandate(overrides: Partial<MandatePayload> = {}) {
  const agent = privateKeyToAccount(generatePrivateKey());
  const delegator = privateKeyToAccount(generatePrivateKey());
  const payload: MandatePayload = {
    agent: agent.address,
    delegator: delegator.address,
    payTo: MERCHANT,
    maxAmountUsdc: 1n,
    expiry: BigInt(Math.floor(Date.now() / 1000) + 3600),
    nonce: 7n,
    ...overrides,
  };
  const signature = await signMandate(delegator, payload);
  return {
    agent,
    header: serializeMandateHeader({ agentId: 7n, mandate: { payload, signature } }),
    payload,
  };
}

function options(
  header: string,
  address: HexAddress,
  extras: Partial<SettleMcpOptions["ports"]> = {},
): SettleMcpOptions {
  return {
    getSigner: async () => ({ address, client: {} }),
    getMandate: async () => header,
    facilitatorUrl: "https://facilitator.test",
    allowlist: ["https://example.test/api/weather/public"],
    ports: {
      lookupRegistered: async () => false,
      readUsdcBalance: async () => 100000n,
      ...extras,
    },
  };
}

describe("identity tools", () => {
  it("reports registered: false when the agent has no ERC-8004 entry", async () => {
    const { agent, header } = await signedMandate();
    const result = await getAgentIdentity(options(header, agent.address));
    const body = JSON.parse(result.content[0]?.text ?? "{}") as {
      registered: boolean;
      agentId: string;
      address: string;
    };
    expect(body.registered).toBe(false);
    expect(body.agentId).toStartWith("agt_");
    expect(body.address).toBe(agent.address);
  });

  it("returns a money object for the USDC balance", async () => {
    const { agent, header } = await signedMandate();
    const result = await getBalance(options(header, agent.address));
    const body = JSON.parse(result.content[0]?.text ?? "{}") as {
      balance: { decimal: string; atomic: string; currency: string; display: string };
    };
    expect(body.balance).toEqual({
      decimal: "0.10",
      atomic: "100000",
      currency: "USDC",
      display: "0.10 USDC",
    });
  });

  it("reports an expired mandate rather than throwing", async () => {
    const { agent, header } = await signedMandate({ expiry: 1n });
    const result = await getMandate(
      options(header, agent.address, { now: () => 10 }),
      createMemoryStore(),
    );
    expect(result.isError).toBeUndefined();
    const body = JSON.parse(result.content[0]?.text ?? "{}") as {
      expired: boolean;
      id: string;
      cap: { display: string };
    };
    expect(body.expired).toBe(true);
    expect(body.id).toStartWith("mdt_");
    expect(body.cap.display).toBe("1.00 USDC");
  });
});
