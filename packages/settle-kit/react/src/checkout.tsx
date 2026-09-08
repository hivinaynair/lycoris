"use client";

import type { Destination, TxHash } from "@settle-kit/core";
import { BASE_SEPOLIA_EXPLORER } from "@settle-kit/core";
import { useContext } from "react";
import { type CheckoutAppearance, resolveAppearance } from "./appearance";
import { CheckoutStatus } from "./checkout-status";
import { styles } from "./checkout-styles";
import { PaymentDetails, PaymentSummary } from "./checkout-summary";
import { SettleContext } from "./context";
import { type CheckoutCallbacks, useCheckout } from "./use-checkout";
import { useCheckoutFocus } from "./use-checkout-focus";

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
};
export type CheckoutProps = CheckoutCallbacks & {
  amountUsdc: string;
  title?: string;
  destination?: Destination;
  className?: string;
  appearance?: CheckoutAppearance;
  transactionUrl?: (hash: TxHash) => string | undefined;
  labels?: Partial<CheckoutLabels>;
  /** Quote and pay from the initial click, without an extra review step. */
  skipReview?: boolean;
};

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
  const amount =
    "quote" in state
      ? (state.quote?.amountUsdc ?? amountUsdc)
      : "amountUsdc" in state
        ? state.amountUsdc
        : amountUsdc;
  const recipient =
    "destination" in state
      ? (state.destination?.recipient ?? (destination ?? config?.destination)?.recipient)
      : (destination ?? config?.destination)?.recipient;
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
    ...labels,
  };
  const heading = checkout.title ?? title;

  async function onBuy() {
    const start = skipReview ? checkout.payNow : checkout.begin;
    await start({ amountUsdc, title, destination });
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
      <PaymentDetails visual={visual} recipient={recipient} />
      <p className={visual.classFor("footer", `sk-footer ${styles.footer}`)}>
        Test USDC only · Base Sepolia
      </p>
    </section>
  );
}
