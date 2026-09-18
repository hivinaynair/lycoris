import { BASE_SEPOLIA_USDC_ADDRESS, type HexAddress } from "@settle-kit/core";
import { createPublicClient, http } from "viem";
import { baseSepolia } from "viem/chains";
import { ERC8004_REGISTRY, type SettleMcpOptions } from "./options";

const USDC_BALANCE_ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
] as const;

const ERC8004_ABI = [
  {
    name: "tokenURI",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "agentId", type: "uint256" }],
    outputs: [{ type: "string" }],
  },
  {
    name: "getAgentWallet",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "agentId", type: "uint256" }],
    outputs: [{ type: "address" }],
  },
] as const;

function publicClient(rpcUrl?: string) {
  return createPublicClient({
    chain: baseSepolia,
    transport: http(rpcUrl),
  });
}

export async function readUsdcBalance(
  address: HexAddress,
  options: Pick<SettleMcpOptions, "rpcUrl">,
): Promise<bigint> {
  return publicClient(options.rpcUrl).readContract({
    address: BASE_SEPOLIA_USDC_ADDRESS,
    abi: USDC_BALANCE_ABI,
    functionName: "balanceOf",
    args: [address],
  });
}

export async function lookupRegistered(
  input: { agentId: bigint; address: HexAddress },
  options: Pick<SettleMcpOptions, "rpcUrl" | "registryAddress">,
): Promise<boolean> {
  const client = publicClient(options.rpcUrl);
  const registry = options.registryAddress ?? ERC8004_REGISTRY;
  try {
    const [uri, wallet] = await Promise.all([
      client.readContract({
        address: registry,
        abi: ERC8004_ABI,
        functionName: "tokenURI",
        args: [input.agentId],
      }),
      client.readContract({
        address: registry,
        abi: ERC8004_ABI,
        functionName: "getAgentWallet",
        args: [input.agentId],
      }),
    ]);
    if (typeof uri !== "string" || !uri) return false;
    return typeof wallet === "string" && wallet.toLowerCase() === input.address.toLowerCase();
  } catch {
    return false;
  }
}
