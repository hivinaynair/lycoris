import { SPONSORED_CHECKOUT_BUDGET } from "@repo/shared/demo";
import type { Address } from "@settle-kit/core";
import { BASE_SEPOLIA_USDC_ADDRESS } from "@settle-kit/core";
import Link from "next/link";
import { PageFrame } from "@/components/page-chrome";
import { env } from "@/env";
import { CheckoutShop } from "./checkout-shop";

export default function CheckoutPage() {
  return (
    <PageFrame className="pt-8 sm:pt-10">
      <CheckoutShop recipient={env.PAY_TO_ADDRESS as Address} />
      <Link className="text-sm underline underline-offset-4" href="/demo">
        Let an agent buy the same report →
      </Link>
      <details className="max-w-2xl text-sm text-muted-foreground">
        <summary className="cursor-pointer">Developer details and demo limits</summary>
        <div className="mt-3 space-y-3">
          <p>
            Circle USDC <span className="break-all font-mono">{BASE_SEPOLIA_USDC_ADDRESS}</span> on
            Base Sepolia (84532). USDC → USDC only. No cards, KYC, fiat onramp, DEX or bridge.
          </p>
          <p>
            A server faucet funds a browser-owned smart account. The account transfers 0.1 test USDC
            to the merchant, with gas sponsored by a paymaster. The SDK checks balance before
            sending and confirms the user operation’s own outcome, not just the bundle transaction.
          </p>
          <p>
            Sponsored checkout and the agent buy the same Melbourne weather report for 0.1 USDC,
            paid to the same merchant. Each purchase is a separate transfer. ERC-8004 is agent
            identity, not KYC; preclear checks mandate and identity, not balance.
          </p>
          <p>
            The faucet has a total budget of {SPONSORED_CHECKOUT_BUDGET} funded purchases (5 test
            USDC), enforced by database reservations. The gas sponsor has separate provider limits.
            Purchase IDs and submitted hashes are saved in this browser for retries. No personal
            wallet is connected.
          </p>
        </div>
      </details>
    </PageFrame>
  );
}
