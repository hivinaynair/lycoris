import type { HexAddress } from "@settle-kit/core";
import { BASE_SEPOLIA_USDC_ADDRESS } from "@settle-kit/core";
import { PageFrame } from "@/components/page-chrome";
import { env } from "@/env";
import { CheckoutShop } from "./checkout-shop";

export default function CheckoutPage() {
  return (
    <PageFrame className="pt-8 sm:pt-10">
      <CheckoutShop recipient={env.PAY_TO_ADDRESS as HexAddress} />
      <a className="text-sm underline underline-offset-4" href="/demo">
        Let an agent buy the same report →
      </a>
      <details className="max-w-2xl text-sm text-muted-foreground">
        <summary className="cursor-pointer">Developer details and demo limits</summary>
        <div className="mt-3 space-y-3">
          <p>
            Circle USDC <span className="break-all font-mono">{BASE_SEPOLIA_USDC_ADDRESS}</span> on
            Base Sepolia (84532). USDC → USDC only. No cards, KYC, fiat onramp, DEX or bridge.
          </p>
          <p>
            The transaction targets the USDC contract. The merchant recipient is encoded in
            transfer(recipient, amount). The SDK checks balance before sending and waits for a
            successful receipt before confirming payment.
          </p>
          <p>
            Sponsored checkout and the agent buy the same Melbourne weather report for 0.1 USDC,
            paid to the same merchant. Each purchase is a separate transfer. ERC-8004 is agent
            identity, not KYC; preclear checks mandate and identity, not balance.
          </p>
          <p>
            The demo pays from a dedicated test wallet with a total budget of 10 purchases. Payment
            IDs are saved in this browser so retries reuse the same transfer. No personal wallet is
            connected.
          </p>
        </div>
      </details>
    </PageFrame>
  );
}
