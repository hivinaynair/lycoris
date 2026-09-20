"use client";

import type { Destination, SettlementHash } from "@settle-kit/core";
import { BASE_SEPOLIA_EXPLORER } from "@settle-kit/core";
import { useContext } from "react";
import { type CheckoutAppearance, resolveAppearance } from "./appearance.ts";
import { CheckoutStatus } from "./checkout-status.tsx";
import { styles } from "./checkout-styles.ts";
import { PaymentDetails, PaymentSummary } from "./checkout-summary.tsx";
import { SettleContext } from "./context.ts";
import { type CheckoutCallbacks, useCheckout } from "./use-checkout.ts";
import { useCheckoutFocus } from "./use-checkout-focus.ts";

export type CheckoutLabels = {
  buy: string;
  pay: string;
  retryConfirmation: string;
  reset: string;
  newPurchase: string;
  paymentMethod: string;
  idleDescription: string;
  reviewDescription: string;
  pendingWallet: string;
  networkFee: string;
  recoveryDescription: string;
};
export type CheckoutProps = CheckoutCallbacks & {
  /** Purchase amount as a decimal string, e.g. `"12.50"`. */
  amountUsdc: string;
  title?: string;
  destination?: Destination;
  className?: string;
  appearance?: CheckoutAppearance;
  /** Override the explorer link for a settlement hash. */
  transactionUrl?: (hash: SettlementHash) => string | undefined;
  labels?: Partial<CheckoutLabels>;
  /** Quote and pay from the first click, skipping the review step. */
  skipReview?: boolean;
};

/**
 * Default checkout UI. Render inside `SettleProvider`.
 *
 * Amount is required. Set `skipReview` for a single Pay button.
 */
export function Checkout({
  amountUsdc,
  title = "Pay with USDC",
  destination,
  className,
  appearance,
  transactionUrl = (hash) => `${BASE_SEPOLIA_EXPLORER}/tx/${hash}`,
  labels,
  skipReview = false,
  onSettled,
  onFailed,
}: CheckoutProps) {
  const checkout = useCheckout({ onSettled, onFailed });
  const { card, act } = useCheckoutFocus(checkout.state.status);
  const context = useContext(SettleContext);
  const config = context?.config;
  const visual = resolveAppearance(context?.appearance, appearance);
  const { state } = checkout;
  let amount = amountUsdc;
  if ("quote" in state) {
    amount = state.quote?.amountUsdc ?? amountUsdc;
  } else if ("amountUsdc" in state) {
    amount = state.amountUsdc;
  }
  const sessionRecipient = "destination" in state ? state.destination?.recipient : undefined;
  const configuredRecipient = (destination ?? config?.destination)?.recipient;
  const recipient = sessionRecipient ?? configuredRecipient;
  const copy = {
    buy: skipReview ? `Pay ${amount} USDC` : "Buy",
    pay: `Pay ${amount} USDC`,
    retryConfirmation: "Check payment status",
    reset: "Reset",
    newPurchase: "New purchase",
    paymentMethod: "Wallet payment",
    idleDescription:
      "You’ll need a browser wallet with test USDC and Base Sepolia ETH for network fees.",
    reviewDescription: "Review the recipient in payment details, then confirm in your wallet.",
    pendingWallet: "Continue in your wallet…",
    networkFee: "Paid separately in test ETH. Your wallet shows the fee before you confirm.",
    recoveryDescription:
      "Keep this page open until confirmation. If you close it after submitting, check your wallet before paying again.",
    ...labels,
  };
  const heading = checkout.title ?? title;

  async function onBuy() {
    const input = { amountUsdc, title, destination };
    if (skipReview) {
      await checkout.payNow(input);
    } else {
      await checkout.begin(input);
    }
  }

  return (
    <section
      className={[visual.classFor("card", `sk-checkout ${styles.card}`), className]
        .filter(Boolean)
        .join(" ")}
      data-sk-theme={visual.theme}
      data-state={state.status}
      style={visual.style}
      ref={card}
    >
      <PaymentSummary
        visual={visual}
        appName={config?.appName ?? "Checkout"}
        heading={heading}
        amount={amount}
        paymentMethod={copy.paymentMethod}
      />
      <CheckoutStatus
        checkout={checkout}
        visual={visual}
        copy={copy}
        act={act}
        onBuy={onBuy}
        transactionUrl={transactionUrl}
      />
      <PaymentDetails
        visual={visual}
        recipient={recipient}
        networkFee={copy.networkFee}
        recoveryDescription={copy.recoveryDescription}
      />
      <p className={visual.classFor("footer", `sk-footer ${styles.footer}`)}>
        Test USDC only · Base Sepolia
      </p>
    </section>
  );
}
