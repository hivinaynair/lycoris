import { createPublicClient, http, type PublicClient } from "viem";
import { baseSepolia } from "viem/chains";
import { SettleKitError } from "../errors";

export function getUsdcPublicClient(
  chainId: number,
): Pick<PublicClient, "readContract" | "waitForTransactionReceipt"> {
  if (chainId !== baseSepolia.id) {
    throw new SettleKitError("wrong_network", `No public client for chain ${chainId}`);
  }
  return createPublicClient({ chain: baseSepolia, transport: http() });
}
