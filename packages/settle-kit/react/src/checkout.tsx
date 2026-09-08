"use client";

import type { Destination, TxHash } from "@settle-kit/core";
import { BASE_SEPOLIA_EXPLORER } from "@settle-kit/core";
import { useContext, useEffect, useRef } from "react";
import { type CheckoutAppearance, resolveAppearance } from "./appearance";
import { SettleContext } from "./context";
import { type CheckoutCallbacks, useCheckout } from "./use-checkout";

const ERROR_COPY: Record<string, string> = {
  insufficient_usdc: "Not enough USDC to complete this payment.",
  quote_expired: "The quote expired. Start again.",
  wallet_rejected: "The wallet rejected the transfer.",
  wallet_unavailable: "Open this checkout in a browser with a wallet extension, then try again.",
  wrong_network: "Switch the wallet to Base Sepolia.",
  transfer_failed: "The USDC transfer failed.",
};

export type CheckoutLabels = {
  buy: string;
  pay: string;
  retryConfirmation: string;
  reset: string;
  newPurchase: string;
};
export type CheckoutProps = CheckoutCallbacks & {
  amountUsdc: string;
  title?: string;
  destination?: Destination;
  className?: string;
  appearance?: CheckoutAppearance;
  transactionUrl?: (hash: TxHash) => string | undefined;
  labels?: Partial<CheckoutLabels>;
};

export function Checkout({
  amountUsdc,
  title = "Pay with USDC",
  destination,
  className,
  appearance,
  transactionUrl = (hash) => `${BASE_SEPOLIA_EXPLORER}/tx/${hash}`,
  labels,
  onSettled,
  onFailed,
}: CheckoutProps) {
  const checkout = useCheckout({ onSettled, onFailed });
  const card = useRef<HTMLElement>(null);
  const focusNext = useRef(false);
  function act(action: () => void | Promise<void>) {
    focusNext.current = true;
    void action();
  }
  useEffect(() => {
    if (
      !focusNext.current ||
      !["awaiting_payment", "settled", "failed"].includes(checkout.state.status)
    )
      return;
    focusNext.current = false;
    if (document.activeElement !== document.body && !card.current?.contains(document.activeElement))
      return;
    card.current?.querySelector<HTMLButtonElement>("button")?.focus();
  }, [checkout.state.status]);
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
    buy: "Buy",
    pay: `Pay ${amount} USDC`,
    retryConfirmation: "Check payment status",
    reset: "Reset",
    newPurchase: "New purchase",
    ...labels,
  };
  const heading = checkout.title ?? title;

  async function onBuy() {
    await checkout.begin({ amountUsdc, title, destination });
  }

  return (
    <section
      className={[visual.classFor("card", "sk-checkout"), className].filter(Boolean).join(" ")}
      data-sk-theme={visual.theme}
      data-state={state.status}
      style={visual.style}
      ref={card}
    >
      <header className={visual.classFor("header", "sk-header")}>
        <p className="sk-merchant">{config?.appName ?? "Checkout"}</p>
        <h2>{heading}</h2>
        <span className="sk-badge">Test payment</span>
      </header>
      <div className="sk-total">
        <span className="sk-caption">Order total</span>
        <p className={visual.classFor("amount", "sk-amount")}>
          {amount} <span>USDC</span>
        </p>
      </div>
      <div className={visual.classFor("paymentMethod", "sk-method")}>
        <span className="sk-token" aria-hidden="true">
          $
        </span>
        <div>
          <strong>USDC</strong>
          <p>Base Sepolia</p>
        </div>
        <span className="sk-method-note">Wallet payment</span>
      </div>
      {state.status === "idle" ? (
        <>
          <p>You’ll need a browser wallet with test USDC and Base Sepolia ETH for network fees.</p>
          <button
            className={visual.classFor("primaryButton", "sk-button")}
            type="button"
            onClick={() => act(onBuy)}
          >
            {copy.buy}
          </button>
        </>
      ) : null}
      {state.status === "quoting" ? <p>Locking {state.amountUsdc} USDC…</p> : null}
      {state.status === "awaiting_payment" ? (
        <>
          <p>Review the recipient in payment details, then confirm in your wallet.</p>
          <button
            className={visual.classFor("primaryButton", "sk-button")}
            type="button"
            onClick={() => act(checkout.pay)}
          >
            {copy.pay}
          </button>
        </>
      ) : null}
      {state.status === "settling" ? (
        <div className={visual.classFor("status", "sk-status")} role="status">
          <span className="sk-status-icon" aria-hidden="true">
            …
          </span>
          <p>
            {state.txHash
              ? "Payment submitted. Waiting for confirmation…"
              : "Continue in your wallet…"}
          </p>
          {state.txHash && transactionUrl(state.txHash) ? (
            <a href={transactionUrl(state.txHash)} target="_blank" rel="noreferrer">
              View transaction
            </a>
          ) : null}
          {state.confirmationError ? (
            <>
              <p className={visual.classFor("error", "sk-error")} role="alert">
                {state.confirmationError.message}
              </p>
              <button
                className={visual.classFor("primaryButton", "sk-button")}
                type="button"
                onClick={() => act(checkout.retryConfirmation)}
              >
                {copy.retryConfirmation}
              </button>
            </>
          ) : null}
        </div>
      ) : null}
      {state.status === "settled" ? (
        <div className={visual.classFor("status", "sk-status sk-complete")} role="status">
          <span className="sk-status-icon" aria-hidden="true">
            ✓
          </span>
          <p>Payment confirmed: {state.quote.amountUsdc} USDC.</p>
          {transactionUrl(state.txHash) && (
            <a href={transactionUrl(state.txHash)} target="_blank" rel="noreferrer">
              View on Basescan
            </a>
          )}
          <button
            className={visual.classFor("primaryButton", "sk-button")}
            type="button"
            onClick={() => act(checkout.reset)}
          >
            {copy.newPurchase}
          </button>
        </div>
      ) : null}
      {state.status === "failed" ? (
        <>
          <p className={visual.classFor("error", "sk-error")} role="alert">
            {ERROR_COPY[state.error.code] ?? state.error.message}
          </p>
          {state.txHash && transactionUrl(state.txHash) ? (
            <a href={transactionUrl(state.txHash)} target="_blank" rel="noreferrer">
              View failed transaction
            </a>
          ) : null}
          <button
            className={visual.classFor("primaryButton", "sk-button")}
            type="button"
            onClick={() => act(checkout.reset)}
          >
            {copy.reset}
          </button>
        </>
      ) : null}
      <details className={visual.classFor("details", "sk-details")}>
        <summary>Payment details</summary>
        <dl>
          <dt>Recipient</dt>
          <dd className="sk-recipient">{recipient}</dd>
          <dt>Network</dt>
          <dd>Base Sepolia · 84532</dd>
          <dt>Network fee</dt>
          <dd>Paid separately in test ETH. Your wallet shows the fee before you confirm.</dd>
        </dl>
        <p>
          Keep this page open until confirmation. If you close it after submitting, check your
          wallet before paying again.
        </p>
      </details>
      <p className={visual.classFor("footer", "sk-footer")}>Test USDC only · Base Sepolia</p>
    </section>
  );
}
