import { encodeFunctionData } from "viem";
import { parseUsdcAmount } from "../amounts";
import { assertDestination } from "../destination";
import { SettleKitError } from "../errors";
import { validateQuote } from "../quote-client";
import {
  DEFAULT_QUOTE_TTL_MS,
  type HexAddress,
  type Quote,
  type SettleAdapter,
  type TxHash,
} from "../types";

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
    args: readonly [HexAddress];
  }) => Promise<bigint>;
};

export type UsdcMethodOptions = {
  client?: BalanceClient;
  receiptClient?: {
    waitForTransactionReceipt: (args: {
      hash: TxHash;
      confirmations: number;
      timeout: number;
    }) => Promise<{ status: "success" | "reverted"; transactionHash: TxHash }>;
  };
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
      assertDestination(destination);
      validateQuote(quote, quote.amountUsdc);
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
      const request = {
        address: destination.targetAsset,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [signer.address],
      } as const;
      const balance = options.client
        ? await options.client.readContract(request)
        : await (await importPublicClient(destination.targetChain)).readContract(request);

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

      if (quote.expiresAt <= now())
        throw new SettleKitError("quote_expired", "Quote expired before sending the transfer");

      return signer.sendTransaction({
        to: destination.targetAsset,
        data,
      });
    },
    async confirm({ txHash, destination }) {
      const client = options.receiptClient ?? (await importPublicClient(destination.targetChain));
      const receipt = await client.waitForTransactionReceipt({
        hash: txHash,
        confirmations: 1,
        timeout: 60_000,
      });
      // A replaced transaction may have different calldata. Never claim it paid this purchase.
      if (receipt.transactionHash.toLowerCase() !== txHash.toLowerCase())
        throw new Error("Transaction was replaced; inspect the original hash on the explorer");
      return receipt.status;
    },
  };
}

async function importPublicClient(chainId: number) {
  const { createPublicClient, http } = await import("viem");
  const { baseSepolia } = await import("viem/chains");
  if (chainId !== baseSepolia.id) {
    throw new SettleKitError("wrong_network", `No public client for chain ${chainId}`);
  }
  return createPublicClient({
    chain: baseSepolia,
    transport: http(),
  });
}
