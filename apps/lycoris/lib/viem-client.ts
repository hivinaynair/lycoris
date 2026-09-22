import { createPublicClient, http, type PublicClient } from "viem";
import { baseSepolia } from "viem/chains";

export const publicClient: Pick<PublicClient, "readContract" | "getTransactionReceipt"> =
  createPublicClient({
    chain: baseSepolia,
    transport: http("https://sepolia.base.org"),
  });
