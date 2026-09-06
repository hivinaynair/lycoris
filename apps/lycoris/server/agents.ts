import { schema } from "@repo/db";
import { ERC8004_REGISTRY_ADDRESS } from "@repo/shared/chains";
import { lookupIdentity } from "@repo/shared/identity";
import { getDb } from "@/lib/db";
import { publicClient } from "@/lib/viem-client";

export type AgentWithMandate = {
  address: string;
  name: string;
  agentId: bigint;
  maxAmountUsdc: bigint | null;
  delegatorAddress: string | null;
  expiry: bigint | null;
  onChainTrusted: boolean;
};

async function getOnChainTrusted(agentId: bigint, address: string): Promise<boolean> {
  try {
    const profile = await lookupIdentity(agentId, ERC8004_REGISTRY_ADDRESS, publicClient);
    if (!profile) return false;
    return profile.wallet.toLowerCase() === address.toLowerCase();
  } catch {
    return false;
  }
}

export async function getAgentsWithMandates(): Promise<AgentWithMandate[]> {
  const rows = await getDb()
    .select({
      address: schema.agents.address,
      name: schema.agents.name,
      agentId: schema.agents.agentId,
    })
    .from(schema.agents);

  const withTrust = await Promise.all(
    rows.map(async (r) => ({
      ...r,
      maxAmountUsdc: null,
      delegatorAddress: null,
      expiry: null,
      onChainTrusted: await getOnChainTrusted(r.agentId, r.address),
    })),
  );

  return withTrust;
}
