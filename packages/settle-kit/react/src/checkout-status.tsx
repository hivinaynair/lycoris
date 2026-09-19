"use client";

import type { CheckoutState, SettlementHash } from "@settle-kit/core";
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
  transactionUrl: (hash: SettlementHash) => string | undefined;
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

function PrimaryButton({
  visual,
  onClick,
  children,
}: {
  visual: StatusProps["visual"];
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      className={visual.classFor("primaryButton", `sk-button ${styles.button}`)}
      type="button"
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function TransactionLink({
  hash,
  transactionUrl,
  label,
}: {
  hash: SettlementHash | undefined;
  transactionUrl: StatusProps["transactionUrl"];
  label: string;
}) {
  const href = hash ? transactionUrl(hash) : undefined;
  if (!href) return null;
  return (
    <a href={href} target="_blank" rel="noreferrer">
      {label}
    </a>
  );
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
      <PrimaryButton visual={visual} onClick={() => act(onBuy)}>
        {copy.buy}
      </PrimaryButton>
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
      <PrimaryButton visual={visual} onClick={() => act(checkout.pay)}>
        {copy.pay}
      </PrimaryButton>
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
      <TransactionLink
        hash={state.txHash}
        transactionUrl={transactionUrl}
        label="View transaction"
      />
      {state.confirmationError ? (
        <>
          <p className={visual.classFor("error", `sk-error ${styles.error}`)} role="alert">
            {state.confirmationError.message}
          </p>
          <PrimaryButton visual={visual} onClick={() => act(checkout.retryConfirmation)}>
            {copy.retryConfirmation}
          </PrimaryButton>
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
      <TransactionLink
        hash={state.txHash}
        transactionUrl={transactionUrl}
        label="View transaction"
      />
      <PrimaryButton visual={visual} onClick={() => act(checkout.reset)}>
        {copy.newPurchase}
      </PrimaryButton>
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
      <TransactionLink
        hash={state.txHash}
        transactionUrl={transactionUrl}
        label="View failed transaction"
      />
      <PrimaryButton visual={visual} onClick={() => act(checkout.reset)}>
        {copy.reset}
      </PrimaryButton>
    </>
  );
}
