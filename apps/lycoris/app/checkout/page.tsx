import type { HexAddress } from "@settle-kit/core";
import { BASE_SEPOLIA_USDC_ADDRESS } from "@settle-kit/core";
import { PageFrame, PageHead } from "@/components/page-chrome";
import { env } from "@/env";
import { CheckoutShop } from "./checkout-shop";

export default function CheckoutPage() {
  return (
    <PageFrame>
      <PageHead
        eyebrow="Settle Kit"
        title="Pay the merchant in USDC"
        question="Base Sepolia only. USDC → USDC. No cards, no KYC. ERC-8004 is agent identity, not a human check. An agent paying a 402 resource is a different package — see Demo."
      />
      <CheckoutShop recipient={env.PAY_TO_ADDRESS as HexAddress} />
      <p className="max-w-2xl text-sm text-muted-foreground">
        Destination asset is Circle USDC{" "}
        <span className="font-mono">{BASE_SEPOLIA_USDC_ADDRESS}</span>. Insufficient balance fails
        before the wallet is asked to send a doomed transfer.
      </p>
    </PageFrame>
  );
}
