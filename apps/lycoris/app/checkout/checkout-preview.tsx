"use client";

import { WEATHER_PRICE_USDC, WEATHER_TITLE } from "@repo/shared/demo";
import { useCheckout } from "@settle-kit/react";
import { Checkout } from "@settle-kit/react/ui";
import type { Look } from "./checkout-appearance";
import styles from "./checkout-layouts";
import { MerchantCheckout } from "./merchant-checkout";
import { SponsoredReport } from "./sponsored-report";

export function CheckoutPreview({ look }: { look: Look }) {
  const { state } = useCheckout();
  return (
    <div className={styles.preview}>
      <div className="border-b border-border p-4">
        <p className="font-medium">Base Sepolia</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Real transactions with test USDC. The demo pays; your wallet is never charged.
        </p>
      </div>
      <div className={styles.checkoutBody}>
        {look === "custom" ? (
          <div className="w-full max-w-[400px]">
            <MerchantCheckout amountUsdc={WEATHER_PRICE_USDC} title={WEATHER_TITLE} sponsored />
          </div>
        ) : (
          <Checkout
            skipReview
            amountUsdc={WEATHER_PRICE_USDC}
            title={WEATHER_TITLE}
            labels={{
              buy: `Pay ${WEATHER_PRICE_USDC} USDC`,
              paymentMethod: "Demo wallet",
              idleDescription: "We cover this payment and network fees. Just click Pay.",
              pendingWallet: "Sending your sponsored payment…",
              reviewDescription: "Paid by the demo wallet on Base Sepolia.",
            }}
          />
        )}
      </div>
      {state.status === "settled" && <SponsoredReport key={state.txHash} txHash={state.txHash} />}
    </div>
  );
}
