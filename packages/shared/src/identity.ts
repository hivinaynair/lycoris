import { isAddress, type PublicClient } from "viem";
import { ERC8004_ABI } from "./abis.js";
import type { AgentProfile } from "./types.js";

export async function lookupIdentity(
  agentId: bigint,
  registryAddress: `0x${string}`,
  client: Pick<PublicClient, "readContract">,
): Promise<AgentProfile | null> {
  try {
    const [agentURI, wallet] = await Promise.all([
      client.readContract({
        address: registryAddress,
        abi: ERC8004_ABI,
        functionName: "tokenURI",
        args: [agentId],
      }),
      client.readContract({
        address: registryAddress,
        abi: ERC8004_ABI,
        functionName: "getAgentWallet",
        args: [agentId],
      }),
    ]);
    if (typeof agentURI !== "string" || !agentURI) return null;
    // The caller decides identity by comparing this wallet to the payer, so a registry
    // that answers with anything but an address is treated as no registration at all.
    if (typeof wallet !== "string" || !isAddress(wallet, { strict: false })) return null;
    return { agentId, wallet, agentURI };
  } catch {
    // treat any registry error (network, wrong address, unregistered token) as not found
    return null;
  }
}
