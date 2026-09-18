"use client";
import { WEATHER_PRICE_USDC } from "@repo/shared/demo";
import {
  BASE_SEPOLIA_USDC_ADDRESS,
  createUsdcMethod,
  type HexAddress,
  type SettleAdapter,
  SettleKitError,
} from "@settle-kit/core";
import { createUserOpReceiptClient } from "@settle-kit/core/account-abstraction";
import { createPublicClient, erc20Abi, http } from "viem";
import { createBundlerClient, toCoinbaseSmartAccount } from "viem/account-abstraction";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { loadOrCreateBurnerKey } from "./burner-key";
import { toPaymentSigner } from "./burner-signer";
import { setSettlePhase } from "./settle-phase";

const storageKey = "lycoris-sponsored-purchase";
type StoredPurchase = { id: string; txHash?: string; confirmed?: boolean };
function readPurchase(): StoredPurchase | undefined {
  try {
    return JSON.parse(localStorage.getItem(storageKey) ?? "null") ?? undefined;
  } catch {
    return undefined;
  }
}
export function sponsoredPurchaseId(txHash: string) {
  return localStorage.getItem(`${storageKey}:${txHash}`);
}

const chain = createPublicClient({ chain: baseSepolia, transport: http() });

/**
 * Bundler and paymaster both live behind our own route.
 *
 * CDP serves them from one endpoint whose path carries the API key, so neither can
 * be called from the browser. `paymaster: true` tells viem to ask the same transport
 * for `pm_*`, which is exactly the shape of an ERC-7677 combined endpoint.
 *
 * `client` is not optional here. Preparing an operation estimates its gas price,
 * and viem sends that `eth_getBlockByNumber` to `bundlerClient.client ?? client` —
 * so without this it lands on our proxy, which refuses everything that is not a
 * bundler or paymaster method. The operation then goes out with no
 * `maxFeePerGas` and CDP rejects it. Chain reads belong on the public RPC; the
 * proxy stays closed.
 */
const bundler = createBundlerClient({
  chain: baseSepolia,
  client: chain,
  transport: http("/api/paymaster"),
  paymaster: true,
});

/** The visitor's own smart account, counterfactual until its first payment deploys it. */
async function burnerAccount() {
  return toCoinbaseSmartAccount({
    client: chain,
    owners: [privateKeyToAccount(loadOrCreateBurnerKey(localStorage))],
    // EntryPoint 0.6, which is what viem pins this account to. Dated next to 0.7,
    // and deliberate: it is Base's canonical account and CDP sponsors it.
    version: "1.1",
  });
}

/**
 * Waits until this browser can see the funding the server already confirmed.
 *
 * The faucet route waits for its own receipt, so the transfer really is mined by
 * the time it answers — but it waited on *its* RPC node, and the SDK's balance
 * preflight reads from whichever node this browser is load-balanced onto. That
 * node can be a block or two behind, which failed the first payment with
 * "insufficient USDC" for money that was already there.
 */
async function waitForFunding(payer: HexAddress, required: bigint) {
  for (let attempt = 0; attempt < 15; attempt++) {
    const balance = await chain.readContract({
      address: BASE_SEPOLIA_USDC_ADDRESS,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [payer],
    });
    if (balance >= required) return;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  // Let the SDK's own preflight raise the shaped `insufficient_usdc` error.
}

export function createSponsoredPayment(recipient: HexAddress) {
  const method = createUsdcMethod({
    // A second method, so `methods` and `selectMethod` finally mean something.
    id: "usdc-4337",
    // Confirmation must read the operation's own outcome. A userOp can revert
    // inside a bundle whose transaction succeeded; the transaction receipt would
    // call that unpaid purchase settled.
    receiptClient: createUserOpReceiptClient({
      getUserOperationReceipt: ({ hash }) =>
        bundler.getUserOperationReceipt({ hash }).then((receipt) =>
          receipt
            ? {
                success: receipt.success,
                receipt: { transactionHash: receipt.receipt.transactionHash },
              }
            : null,
        ),
    }),
  });

  const adapter: SettleAdapter = {
    ...method,
    async quote(input) {
      let purchase = readPurchase();
      if (!purchase || purchase.confirmed) {
        purchase = { id: crypto.randomUUID() };
        localStorage.setItem(storageKey, JSON.stringify(purchase));
      }
      if (input.amountUsdc !== WEATHER_PRICE_USDC || input.destination?.recipient !== recipient)
        throw new SettleKitError("invalid_config", "Only the demo weather report is sponsored.");
      const quote = await method.quote(input);
      return { ...quote, requestId: purchase.id };
    },
    async settle(input) {
      // Fund first, then delegate. The SDK's balance preflight runs inside
      // method.settle and is what proves the funding actually landed — which is
      // why the faucet route waits for its own receipt before answering.
      setSettlePhase("funding");
      try {
        const response = await fetch("/api/checkout/fund", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            purchaseId: input.quote.requestId,
            payer: input.signer.address,
          }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Could not fund the demo account.");
        await waitForFunding(input.signer.address, BigInt(input.quote.amountAtomic));

        setSettlePhase("submitting");
        const userOpHash = await method.settle(input);
        localStorage.setItem(
          storageKey,
          JSON.stringify({ id: input.quote.requestId, txHash: userOpHash }),
        );
        localStorage.setItem(`${storageKey}:${userOpHash}`, input.quote.requestId);
        return userOpHash;
      } finally {
        // Confirmation is its own wait and the SDK already names it.
        setSettlePhase(undefined);
      }
    },
    async confirm(input) {
      const result = await method.confirm(input);
      const purchase = readPurchase();
      if (purchase?.txHash === input.txHash) {
        localStorage.setItem(storageKey, JSON.stringify({ ...purchase, confirmed: true }));
      }
      return result;
    },
  };

  return {
    methods: [adapter],
    getSigner: async () => {
      const account = await burnerAccount();
      return toPaymentSigner({
        account,
        chainId: baseSepolia.id,
        sendUserOperation: (args) => bundler.sendUserOperation(args),
      });
    },
  };
}
