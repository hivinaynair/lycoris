"use client";

import { BASE_SEPOLIA_EXPLORER } from "@settle-kit/core";
import { useCheckout } from "./use-checkout";

const ERROR_COPY: Record<string, string> = {
  insufficient_usdc: "Not enough USDC to complete this payment.",
  quote_expired: "The quote expired. Start again.",
  wallet_rejected: "The wallet rejected the transfer.",
  wrong_network: "Switch the wallet to Base Sepolia.",
  transfer_failed: "The USDC transfer failed.",
};

export function Checkout({
  amountUsdc = "12.50",
  title = "Pay with USDC",
}: {
  amountUsdc?: string;
  title?: string;
}) {
  const checkout = useCheckout();
  const { state } = checkout;
  const heading = checkout.title ?? title;

  async function onBuy() {
    await checkout.begin({ amountUsdc, title: heading });
    await checkout.selectMethod("usdc");
  }

  return (
    <section className="sk-checkout" aria-live="polite">
      <style href="settle-kit-checkout" precedence="default">{`
        .sk-checkout {
          display: grid;
          gap: 12px;
          padding: 20px;
          border: 1px solid var(--border, #e4e4e7);
          background: var(--card, #fff);
          color: var(--foreground, #18181b);
        }
        .sk-checkout h2 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
        }
        .sk-checkout p,
        .sk-checkout a {
          margin: 0;
          font-size: 13px;
          color: var(--muted-foreground, #71717a);
        }
        .sk-checkout button {
          justify-self: start;
          border: 0;
          padding: 8px 14px;
          font: inherit;
          font-size: 13px;
          cursor: pointer;
          background: var(--primary, #18181b);
          color: var(--primary-foreground, #fafafa);
        }
        .sk-checkout button:disabled {
          opacity: 0.55;
          cursor: default;
        }
        .sk-checkout .sk-error {
          color: var(--destructive, #b91c1c);
        }
      `}</style>
      <h2>{heading}</h2>
      {state.status === "idle" ? (
        <>
          <p>{amountUsdc} USDC on Base Sepolia</p>
          <button type="button" onClick={() => void onBuy()}>
            Buy
          </button>
        </>
      ) : null}
      {state.status === "quoting" ? <p>Locking {state.amountUsdc} USDC…</p> : null}
      {state.status === "awaiting_payment" ? (
        <>
          <p>Pay {state.quote.amountUsdc} USDC to the merchant destination.</p>
          <button type="button" onClick={() => void checkout.pay()}>
            Pay USDC
          </button>
        </>
      ) : null}
      {state.status === "settling" ? <p>Waiting for the transfer…</p> : null}
      {state.status === "settled" ? (
        <>
          <p>Settled {state.quote.amountUsdc} USDC.</p>
          <a href={`${BASE_SEPOLIA_EXPLORER}/tx/${state.txHash}`} target="_blank" rel="noreferrer">
            View on Basescan
          </a>
          <button type="button" onClick={checkout.reset}>
            New purchase
          </button>
        </>
      ) : null}
      {state.status === "failed" ? (
        <>
          <p className="sk-error">{ERROR_COPY[state.error.code] ?? state.error.message}</p>
          <button type="button" onClick={checkout.reset}>
            Reset
          </button>
        </>
      ) : null}
    </section>
  );
}
