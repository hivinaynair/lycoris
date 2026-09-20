"use client";

import type { CheckoutState, Destination, SettlementHash } from "@settle-kit/core";
import { BASE_SEPOLIA_EXPLORER } from "@settle-kit/core";
import { useContext } from "react";
import { type CheckoutAppearance, resolveAppearance } from "./appearance.ts";
import { styles } from "./checkout-styles.ts";
import { SettleContext } from "./context.ts";
import { useCheckout } from "./use-checkout.ts";

const ERROR_COPY: Record<string, string> = {
  insufficient_usdc: "Not enough USDC to complete this payment.",
  quote_expired: "The quote expired. Start again.",
  wallet_rejected: "The wallet rejected the transfer.",
  wallet_unavailable: "Open this checkout in a browser with a wallet extension, then try again.",
  wrong_network: "Switch the wallet to Base Sepolia.",
  transfer_failed: "The USDC transfer failed.",
};

export type CheckoutCopy = {
  idleDescription?: string;
  pendingWallet?: string;
  paymentMethod?: string;
  networkFee?: string;
  recoveryDescription?: string;
};

export type CheckoutProps = {
  /** Purchase amount as a decimal string, e.g. `"12.50"`. */
  amount: string;
  title?: string;
  destination?: Destination;
  className?: string;
  appearance?: CheckoutAppearance;
  /** Override the explorer link for a settlement hash. */
  transactionUrl?: (hash: SettlementHash) => string | undefined;
  /** Host-specific sentences. Button labels stay fixed English. */
  copy?: CheckoutCopy;
};

/**
 * Default checkout card. Render inside `SettleProvider`.
 *
 * One Pay button quotes and submits.
 */
export function Checkout({
  amount: amountProp,
  title = "Pay with USDC",
  destination,
  className,
  appearance,
  transactionUrl = (hash) => `${BASE_SEPOLIA_EXPLORER}/tx/${hash}`,
  copy,
}: CheckoutProps) {
  const checkout = useCheckout();
  const context = useContext(SettleContext);
  const config = context?.config;
  const visual = resolveAppearance(context?.appearance, appearance);
  const { state } = checkout;
  const amount =
    "quote" in state
      ? (state.quote?.amount ?? amountProp)
      : state.status === "quoting"
        ? state.amount
        : amountProp;
  const recipient =
    "destination" in state
      ? (state.destination?.recipient ?? (destination ?? config?.destination)?.recipient)
      : (destination ?? config?.destination)?.recipient;
  const text = {
    idleDescription:
      "You’ll need a browser wallet with test USDC and Base Sepolia ETH for network fees.",
    pendingWallet: "Continue in your wallet…",
    paymentMethod: "Wallet payment",
    networkFee: "Paid separately in test ETH. Your wallet shows the fee before you confirm.",
    recoveryDescription:
      "Keep this page open until confirmation. If you close it after submitting, check your wallet before paying again.",
    ...copy,
  };
  const heading = checkout.title ?? title;
  const cardClass = [`sk-checkout ${styles.card}`, className].filter(Boolean).join(" ");
  const buttonClass = `sk-button ${styles.button}`;

  return (
    <section
      className={cardClass}
      data-sk-theme={visual.theme}
      data-state={state.status}
      style={visual.style}
    >
      <header className={`sk-header ${styles.header}`}>
        <p className={`sk-merchant ${styles.merchant}`}>{config?.appName ?? "Checkout"}</p>
        <h2>{heading}</h2>
        <span className={`sk-badge ${styles.badge}`}>Test payment</span>
      </header>
      <div className="sk-total">
        <span className={`sk-caption ${styles.caption}`}>Order total</span>
        <p className={`sk-amount ${styles.amount}`}>
          {amount} <span>USDC</span>
        </p>
      </div>
      <div className={`sk-method ${styles.method}`}>
        <span className={`sk-token ${styles.token}`} aria-hidden="true">
          $
        </span>
        <div>
          <strong>USDC</strong>
          <p>Base Sepolia</p>
        </div>
        <span className={`sk-method-note ${styles.methodNote}`}>{text.paymentMethod}</span>
      </div>
      <CheckoutStatus
        state={state}
        checkout={checkout}
        text={text}
        amount={amount}
        onPay={() => checkout.pay({ amount: amountProp, title, destination })}
        transactionUrl={transactionUrl}
        buttonClass={buttonClass}
      />
      <details className={`sk-details ${styles.details}`}>
        <summary>Payment details</summary>
        <dl>
          <dt>Recipient</dt>
          <dd className={`sk-recipient ${styles.recipient}`}>{recipient}</dd>
          <dt>Network</dt>
          <dd>Base Sepolia · 84532</dd>
          <dt>Network fee</dt>
          <dd>{text.networkFee}</dd>
        </dl>
        <p>{text.recoveryDescription}</p>
      </details>
      <p className={`sk-footer ${styles.footer}`}>Test USDC only · Base Sepolia</p>
    </section>
  );
}

function CheckoutStatus({
  state,
  checkout,
  text,
  amount,
  onPay,
  transactionUrl,
  buttonClass,
}: {
  state: CheckoutState;
  checkout: ReturnType<typeof useCheckout>;
  text: Required<CheckoutCopy>;
  amount: string;
  onPay: () => Promise<void>;
  transactionUrl: (hash: SettlementHash) => string | undefined;
  buttonClass: string;
}) {
  if (state.status === "idle") {
    return (
      <>
        <p>{text.idleDescription}</p>
        <button className={buttonClass} type="button" onClick={() => void onPay()}>
          {`Pay ${amount} USDC`}
        </button>
      </>
    );
  }
  if (state.status === "quoting") {
    return <p>Locking {state.amount} USDC…</p>;
  }
  if (state.status === "settling") {
    return (
      <div className={`sk-status ${styles.status}`} role="status">
        <span className={`sk-status-icon ${styles.statusIcon}`} aria-hidden="true">
          …
        </span>
        <p>{state.txHash ? "Payment submitted. Waiting for confirmation…" : text.pendingWallet}</p>
        {state.txHash && transactionUrl(state.txHash) ? (
          <a href={transactionUrl(state.txHash)} target="_blank" rel="noreferrer">
            View transaction
          </a>
        ) : null}
        {state.confirmationError ? (
          <>
            <p className={`sk-error ${styles.error}`} role="alert">
              {state.confirmationError.message}
            </p>
            <button
              className={buttonClass}
              type="button"
              onClick={() => void checkout.retryConfirmation()}
            >
              Check payment status
            </button>
          </>
        ) : null}
      </div>
    );
  }
  if (state.status === "settled") {
    return (
      <div className={`sk-status sk-complete ${styles.status} ${styles.complete}`} role="status">
        <span className={`sk-status-icon ${styles.statusIcon}`} aria-hidden="true">
          ✓
        </span>
        <p>Payment confirmed: {state.quote.amount} USDC.</p>
        {transactionUrl(state.txHash) && (
          <a href={transactionUrl(state.txHash)} target="_blank" rel="noreferrer">
            View transaction
          </a>
        )}
        <button className={buttonClass} type="button" onClick={checkout.reset}>
          New purchase
        </button>
      </div>
    );
  }
  return (
    <>
      <p className={`sk-error ${styles.error}`} role="alert">
        {ERROR_COPY[state.error.code] ?? state.error.message}
      </p>
      {state.txHash && transactionUrl(state.txHash) ? (
        <a href={transactionUrl(state.txHash)} target="_blank" rel="noreferrer">
          View failed transaction
        </a>
      ) : null}
      <button className={buttonClass} type="button" onClick={checkout.reset}>
        Reset
      </button>
    </>
  );
}
