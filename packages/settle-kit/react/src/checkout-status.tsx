"use client";

import type { CheckoutState, TxHash } from "@settle-kit/core";
import type { resolveAppearance } from "./appearance";
import type { CheckoutLabels } from "./checkout";
import { styles } from "./checkout-styles";
import type { useCheckout } from "./use-checkout";

const ERROR_COPY: Record<string, string> = {
  insufficient_usdc: "Not enough USDC to complete this payment.",
  quote_expired: "The quote expired. Start again.",
  wallet_rejected: "The wallet rejected the transfer.",
  wallet_unavailable: "Open this checkout in a browser with a wallet extension, then try again.",
  wrong_network: "Switch the wallet to Base Sepolia.",
  transfer_failed: "The USDC transfer failed.",
};

type StatusProps = {
  checkout: ReturnType<typeof useCheckout>;
  visual: ReturnType<typeof resolveAppearance>;
  copy: CheckoutLabels;
  act: (action: () => void | Promise<void>) => void;
  onBuy: () => Promise<void>;
  transactionUrl: (hash: TxHash) => string | undefined;
};

export function CheckoutStatus(props: StatusProps) {
  const { state } = props.checkout;
  switch (state.status) {
    case "idle":
      return <IdleCheckout {...props} state={state} />;
    case "quoting":
      return <QuotingCheckout {...props} state={state} />;
    case "awaiting_payment":
      return <ReviewCheckout {...props} state={state} />;
    case "settling":
      return <PendingCheckout {...props} state={state} />;
    case "settled":
      return <SettledCheckout {...props} state={state} />;
    case "failed":
      return <FailedCheckout {...props} state={state} />;
  }
}

function IdleCheckout({
  visual,
  copy,
  act,
  onBuy,
}: StatusProps & { state: Extract<CheckoutState, { status: "idle" }> }) {
  return (
    <>
      <p>{copy.idleDescription}</p>
      <button
        className={visual.classFor("primaryButton", `sk-button ${styles.button}`)}
        type="button"
        onClick={() => act(onBuy)}
      >
        {copy.buy}
      </button>
    </>
  );
}

function QuotingCheckout({
  state,
}: StatusProps & { state: Extract<CheckoutState, { status: "quoting" }> }) {
  return <p>Locking {state.amountUsdc} USDC…</p>;
}

function ReviewCheckout({
  checkout,
  visual,
  copy,
  act,
}: StatusProps & { state: Extract<CheckoutState, { status: "awaiting_payment" }> }) {
  return (
    <>
      <p>{copy.reviewDescription}</p>
      <button
        className={visual.classFor("primaryButton", `sk-button ${styles.button}`)}
        type="button"
        onClick={() => act(checkout.pay)}
      >
        {copy.pay}
      </button>
    </>
  );
}

function PendingCheckout({
  state,
  checkout,
  visual,
  copy,
  act,
  transactionUrl,
}: StatusProps & { state: Extract<CheckoutState, { status: "settling" }> }) {
  return (
    <div className={visual.classFor("status", `sk-status ${styles.status}`)} role="status">
      <span className={`sk-status-icon ${styles.statusIcon}`} aria-hidden="true">
        …
      </span>
      <p>{state.txHash ? "Payment submitted. Waiting for confirmation…" : copy.pendingWallet}</p>
      {state.txHash && transactionUrl(state.txHash) ? (
        <a href={transactionUrl(state.txHash)} target="_blank" rel="noreferrer">
          View transaction
        </a>
      ) : null}
      {state.confirmationError ? (
        <>
          <p className={visual.classFor("error", `sk-error ${styles.error}`)} role="alert">
            {state.confirmationError.message}
          </p>
          <button
            className={visual.classFor("primaryButton", `sk-button ${styles.button}`)}
            type="button"
            onClick={() => act(checkout.retryConfirmation)}
          >
            {copy.retryConfirmation}
          </button>
        </>
      ) : null}
    </div>
  );
}

function SettledCheckout({
  state,
  checkout,
  visual,
  copy,
  act,
  transactionUrl,
}: StatusProps & { state: Extract<CheckoutState, { status: "settled" }> }) {
  return (
    <div
      className={visual.classFor(
        "status",
        `sk-status sk-complete ${styles.status} ${styles.complete}`,
      )}
      role="status"
    >
      <span className={`sk-status-icon ${styles.statusIcon}`} aria-hidden="true">
        ✓
      </span>
      <p>Payment confirmed: {state.quote.amountUsdc} USDC.</p>
      {transactionUrl(state.txHash) && (
        <a href={transactionUrl(state.txHash)} target="_blank" rel="noreferrer">
          View on Basescan
        </a>
      )}
      <button
        className={visual.classFor("primaryButton", `sk-button ${styles.button}`)}
        type="button"
        onClick={() => act(checkout.reset)}
      >
        {copy.newPurchase}
      </button>
    </div>
  );
}

function FailedCheckout({
  state,
  checkout,
  visual,
  copy,
  act,
  transactionUrl,
}: StatusProps & { state: Extract<CheckoutState, { status: "failed" }> }) {
  return (
    <>
      <p className={visual.classFor("error", `sk-error ${styles.error}`)} role="alert">
        {ERROR_COPY[state.error.code] ?? state.error.message}
      </p>
      {state.txHash && transactionUrl(state.txHash) ? (
        <a href={transactionUrl(state.txHash)} target="_blank" rel="noreferrer">
          View failed transaction
        </a>
      ) : null}
      <button
        className={visual.classFor("primaryButton", `sk-button ${styles.button}`)}
        type="button"
        onClick={() => act(checkout.reset)}
      >
        {copy.reset}
      </button>
    </>
  );
}
