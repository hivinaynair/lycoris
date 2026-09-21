import { createPublicClient, encodeFunctionData, http } from "viem";
import { baseSepolia } from "viem/chains";
import { parseUsdcAmount } from "../amounts.ts";
import { assertDestination } from "../destination.ts";
import { SettleKitError } from "../errors.ts";
import { validateIntent } from "../intent.ts";
import {
  type Address,
  DEFAULT_INTENT_TTL_MS,
  type Intent,
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
  ttlMs?: number | undefined;
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
  const ttlMs = options.ttlMs ?? DEFAULT_INTENT_TTL_MS;
  const now = options.now ?? Date.now;
  const requestId = options.requestId ?? (() => crypto.randomUUID());

  const id = options.id ?? "usdc";
  return {
    id,
    async prepare({ amount }) {
      const amountAtomic = parseUsdcAmount(amount);
      const intent: Intent = {
        requestId: requestId(),
        amount,
        amountAtomic,
        expiresAt: now() + ttlMs,
        method: id,
      };
      return intent;
    },
    async settle({ intent, destination, signer }) {
      assertDestination(destination);
      validateIntent(intent, intent.amount, destination, id);

      const required = BigInt(intent.amountAtomic);
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

      if (intent.expiresAt <= now())
        throw new SettleKitError("expired", "Payment expired before it was sent");

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
