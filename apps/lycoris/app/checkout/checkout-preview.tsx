"use client";

import { WEATHER_PRICE_USDC, WEATHER_TITLE } from "@repo/shared/demo";
import { BASE_SEPOLIA_EXPLORER } from "@settle-kit/core";
import { useCheckout } from "@settle-kit/react";
import { Checkout } from "@settle-kit/react/ui";
import type { Look } from "./checkout-appearance";
import styles from "./checkout-layouts";
import type { CheckoutRail } from "./checkout-rail";
import { MerchantCheckout } from "./merchant-checkout";
import { PurchasedReport } from "./purchased-report";
import { SETTLE_PHASE_LABEL, useSettlePhase } from "./settle-phase";
import { useSettlementExplorerUrl } from "./user-op-explorer";

export function CheckoutPreview({ look, rail }: { look: Look; rail: CheckoutRail }) {
  const { state } = useCheckout();
  const sponsoredUrl = useSettlementExplorerUrl();
  const phase = useSettlePhase();
  const sponsored = rail === "sponsored";
  return (
    <div className={styles.preview}>
      <div className="border-b border-border p-4">
        <p className="font-medium">Base Sepolia</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {sponsored
            ? "Real transactions with test USDC. The demo pays; your wallet is never charged."
            : "Real transactions with test USDC from your connected wallet. You pay the transfer and gas."}
        </p>
      </div>
      <div
        className={`${styles.checkoutBody} ${look === "brand" ? styles.merchantCard : styles.flushCard}`}
      >
        {look === "custom" ? (
          <div className="w-full max-w-[400px]">
            <MerchantCheckout
              amount={WEATHER_PRICE_USDC}
              title={WEATHER_TITLE}
              sponsored={sponsored}
            />
          </div>
        ) : (
          <Checkout
            amount={WEATHER_PRICE_USDC}
            title={WEATHER_TITLE}
            transactionUrl={
              sponsored ? sponsoredUrl : (hash) => `${BASE_SEPOLIA_EXPLORER}/tx/${hash}`
            }
            copy={
              sponsored
                ? {
                    paymentMethod: "Demo wallet",
                    networkFee: "Paid by the demo in test ETH. Your wallet is never charged.",
                    recoveryDescription:
                      "Your purchase is saved in this browser. If interrupted, return here to check the same payment without sending it again.",
                    idleDescription: "We cover this payment and network fees. Just click Pay.",
                    pendingWallet: phase
                      ? SETTLE_PHASE_LABEL[phase]
                      : "Sending your sponsored payment…",
                  }
                : {
                    paymentMethod: "Coinbase Wallet or injected EOA",
                    networkFee:
                      "Paid separately in test ETH. Your wallet shows the fee before you confirm.",
                    idleDescription:
                      "Connect Coinbase Wallet or another injected wallet with test USDC on Base Sepolia.",
                    pendingWallet: "Continue in your wallet…",
                  }
            }
          />
        )}
      </div>
      {state.status === "settled" && (
        <PurchasedReport key={`${rail}:${state.txHash}`} rail={rail} txHash={state.txHash} />
      )}
    </div>
  );
}
