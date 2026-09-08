import { CdpClient } from "@coinbase/cdp-sdk";
import { createDb } from "@repo/db";
import { WEATHER_AMOUNT_ATOMIC } from "@repo/shared/demo";
import { BASE_SEPOLIA_USDC_ADDRESS } from "@settle-kit/core";
import { sql } from "drizzle-orm";
import type { PublicClient, Transport } from "viem";
import { createPublicClient, encodeFunctionData, erc20Abi, type Hex, http } from "viem";
import { baseSepolia } from "viem/chains";
import { env } from "@/env";

export const sponsorChain: PublicClient<Transport, typeof baseSepolia> = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});
type Purchase = {
  id: string;
  sponsor: Hex;
  recipient: Hex;
  created_at: string;
  tx_hash: Hex | null;
};

function configuration() {
  if (
    !env.SPONSORED_WALLET_ADDRESS ||
    !env.CDP_API_KEY_ID ||
    !env.CDP_API_KEY_SECRET ||
    !env.CDP_WALLET_SECRET
  )
    throw new Error("Sponsored checkout is not configured.");
  return { address: env.SPONSORED_WALLET_ADDRESS as Hex, recipient: env.PAY_TO_ADDRESS as Hex };
}

export async function getSponsoredPurchase(id: string): Promise<Purchase | undefined> {
  const result = await createDb().execute(
    sql`SELECT * FROM sponsored_checkout_payments WHERE id = ${id}::uuid`,
  );
  return result.rows[0] as Purchase | undefined;
}

export async function paySponsored(id: string) {
  const { address, recipient } = configuration();
  const db = createDb();
  const previous = await getSponsoredPurchase(id);
  if (previous && (previous.sponsor !== address || previous.recipient !== recipient))
    throw new Error("Purchase configuration changed.");
  if (previous?.tx_hash) return { txHash: previous.tx_hash };
  if (!previous) {
    const balance = await sponsorChain.readContract({
      address: BASE_SEPOLIA_USDC_ADDRESS,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [address],
    });
    if (balance < BigInt(WEATHER_AMOUNT_ATOMIC))
      throw new Error("The demo wallet needs more test USDC.");
  }
  const reservation = await db.execute(
    sql`SELECT * FROM reserve_sponsored_checkout(${id}::uuid, ${address}, ${recipient})`,
  );
  const purchase = reservation.rows[0] as Purchase;
  // Never replay an uncertain submission outside the provider's idempotency window.
  if (Date.now() - new Date(purchase.created_at).getTime() > 60 * 60 * 1000)
    throw new Error("This purchase needs operator review. Do not start another payment.");
  if (purchase.tx_hash) return { txHash: purchase.tx_hash };
  const cdp = new CdpClient({
    ...(env.CDP_API_KEY_ID ? { apiKeyId: env.CDP_API_KEY_ID } : {}),
    ...(env.CDP_API_KEY_SECRET ? { apiKeySecret: env.CDP_API_KEY_SECRET } : {}),
    ...(env.CDP_WALLET_SECRET ? { walletSecret: env.CDP_WALLET_SECRET } : {}),
  });
  const { transactionHash } = await cdp.evm.sendTransaction({
    address,
    network: "base-sepolia",
    idempotencyKey: id,
    transaction: {
      to: BASE_SEPOLIA_USDC_ADDRESS,
      value: 0n,
      data: encodeFunctionData({
        abi: erc20Abi,
        functionName: "transfer",
        args: [recipient, BigInt(WEATHER_AMOUNT_ATOMIC)],
      }),
    },
  });
  await db.execute(
    sql`UPDATE sponsored_checkout_payments SET tx_hash = ${transactionHash} WHERE id = ${id}::uuid`,
  );
  return { txHash: transactionHash };
}
