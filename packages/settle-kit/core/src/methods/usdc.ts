import { createPublicClient, encodeFunctionData, http } from "viem";
import { baseSepolia } from "viem/chains";
import { parseUsdcAmount } from "../amounts.ts";
import { assertDestination } from "../destination.ts";
import { SettleKitError } from "../errors.ts";
import { validateQuote } from "../quote-client.ts";
import {
  type Address,
  DEFAULT_QUOTE_TTL_MS,
  type Quote,
  type SettleAdapter,
  type SettleMethodId,
  type SettlementHash,
} from "../types.ts";

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
    address: Address;
    abi: typeof ERC20_ABI;
    functionName: "balanceOf";
    args: readonly [Address];
  }) => Promise<bigint>;
};

export type UsdcMethodOptions = {
  client?: BalanceClient | undefined;
  receiptClient?:
    | {
        waitForTransactionReceipt: (args: {
          hash: SettlementHash;
          confirmations: number;
          timeout: number;
        }) => Promise<{ status: "success" | "reverted"; transactionHash: SettlementHash }>;
      }
    | undefined;
  quoteTtlMs?: number | undefined;
  now?: (() => number) | undefined;
  requestId?: (() => string) | undefined;
  /** Adapter id. Defaults to `"usdc"`. Pass `"usdc-4337"` with a `receiptClient`. */
  id?: SettleMethodId | undefined;
};

/**
 * USDC transfer adapter for EOA or ERC-4337 wallets.
 *
 * Pass `receiptClient` from `createUserOpReceiptClient` when the signer submits
 * a user operation rather than a transaction.
 */
export function createUsdcMethod(options: UsdcMethodOptions = {}): SettleAdapter {
  const quoteTtlMs = options.quoteTtlMs ?? DEFAULT_QUOTE_TTL_MS;
  const now = options.now ?? Date.now;
  const requestId = options.requestId ?? (() => crypto.randomUUID());

  const id = options.id ?? "usdc";
  return {
    id,
    async quote({ amount }) {
      const amountAtomic = parseUsdcAmount(amount);
      const quote: Quote = {
        requestId: requestId(),
        amount,
        amountAtomic,
        expiresAt: now() + quoteTtlMs,
        method: id,
      };
      return quote;
    },
    async settle({ quote, destination, signer }) {
      assertDestination(destination);
      validateQuote(quote, quote.amount, destination, id);

      const required = BigInt(quote.amountAtomic);
      const request = {
        address: destination.targetAsset,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [signer.address],
      } as const;
      const balance = options.client
        ? await options.client.readContract(request)
        : await getUsdcPublicClient(destination.targetChain).readContract(request);

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
      const client = options.receiptClient ?? getUsdcPublicClient(destination.targetChain);
      const receipt = await client.waitForTransactionReceipt({
        hash: txHash,
        confirmations: 1,
        timeout: 60_000,
      });
      if (receipt.transactionHash.toLowerCase() !== txHash.toLowerCase())
        throw new Error("Transaction was replaced; inspect the original hash on the explorer");
      return receipt.status;
    },
  };
}

function getUsdcPublicClient(chainId: number) {
  if (chainId !== baseSepolia.id) {
    throw new SettleKitError("wrong_network", `No public client for chain ${chainId}`);
  }
  return createPublicClient({ chain: baseSepolia, transport: http() });
}
