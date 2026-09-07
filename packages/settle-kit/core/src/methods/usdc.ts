import { encodeFunctionData } from "viem";
import { parseUsdcAmount } from "../amounts.js";
import { SettleKitError } from "../errors.js";
import { DEFAULT_QUOTE_TTL_MS, type HexAddress, type Quote, type SettleAdapter } from "../types.js";

const ERC20_ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "transfer",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
] as const;

export type BalanceClient = {
  readContract: (args: {
    address: HexAddress;
    abi: typeof ERC20_ABI;
    functionName: "balanceOf";
    args: [HexAddress];
  }) => Promise<bigint>;
};

export type UsdcMethodOptions = {
  client?: BalanceClient;
  quoteTtlMs?: number;
  now?: () => number;
  requestId?: () => string;
};

export function createUsdcMethod(options: UsdcMethodOptions = {}): SettleAdapter {
  const quoteTtlMs = options.quoteTtlMs ?? DEFAULT_QUOTE_TTL_MS;
  const now = options.now ?? Date.now;
  const requestId = options.requestId ?? (() => crypto.randomUUID());

  return {
    id: "usdc",
    async quote({ amountUsdc }) {
      const amountAtomic = parseUsdcAmount(amountUsdc);
      const quote: Quote = {
        requestId: requestId(),
        amountUsdc,
        amountAtomic,
        expiresAt: now() + quoteTtlMs,
        method: "usdc",
      };
      return quote;
    },
    async settle({ quote, destination, signer }) {
      if (signer.getChainId) {
        const chainId = await signer.getChainId();
        if (chainId !== destination.targetChain) {
          throw new SettleKitError(
            "wrong_network",
            `Wallet is on chain ${chainId}; destination is ${destination.targetChain}`,
          );
        }
      }

      const required = BigInt(quote.amountAtomic);
      const client = options.client ?? (await importPublicClient(destination.targetChain));
      const balance = await client.readContract({
        address: destination.targetAsset,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [signer.address],
      });

      if (balance < required) {
        throw new SettleKitError(
          "insufficient_usdc",
          `Wallet holds ${balance} atomic USDC; needs ${required}`,
        );
      }

      const data = encodeFunctionData({
        abi: ERC20_ABI,
        functionName: "transfer",
        args: [destination.recipient, required],
      });

      return signer.sendTransaction({
        to: destination.targetAsset,
        data,
      });
    },
  };
}

async function importPublicClient(chainId: number): Promise<BalanceClient> {
  const { createPublicClient, http } = await import("viem");
  const { baseSepolia } = await import("viem/chains");
  if (chainId !== baseSepolia.id) {
    throw new SettleKitError("wrong_network", `No public client for chain ${chainId}`);
  }
  return createPublicClient({
    chain: baseSepolia,
    transport: http(),
  }) as unknown as BalanceClient;
}
