"use client";

import type { resolveAppearance } from "./appearance";
import { styles } from "./checkout-styles";

type Visual = ReturnType<typeof resolveAppearance>;

export function PaymentSummary({
  visual,
  appName,
  heading,
  amount,
  paymentMethod,
}: {
  visual: Visual;
  appName: string;
  heading: string;
  amount: string;
  paymentMethod: string;
}) {
  return (
    <>
      <header className={visual.classFor("header", `sk-header ${styles.header}`)}>
        <p className={`sk-merchant ${styles.merchant}`}>{appName}</p>
        <h2>{heading}</h2>
        <span className={`sk-badge ${styles.badge}`}>Test payment</span>
      </header>
      <div className="sk-total">
        <span className={`sk-caption ${styles.caption}`}>Order total</span>
        <p className={visual.classFor("amount", `sk-amount ${styles.amount}`)}>
          {amount} <span>USDC</span>
        </p>
      </div>
      <div className={visual.classFor("paymentMethod", `sk-method ${styles.method}`)}>
        <span className={`sk-token ${styles.token}`} aria-hidden="true">
          $
        </span>
        <div>
          <strong>USDC</strong>
          <p>Base Sepolia</p>
        </div>
        <span className={`sk-method-note ${styles.methodNote}`}>{paymentMethod}</span>
      </div>
    </>
  );
}

export function PaymentDetails({
  visual,
  recipient,
  networkFee,
  recoveryDescription,
}: {
  visual: Visual;
  recipient?: string;
  networkFee: string;
  recoveryDescription: string;
}) {
  return (
    <details className={visual.classFor("details", `sk-details ${styles.details}`)}>
      <summary>Payment details</summary>
      <dl>
        <dt>Recipient</dt>
        <dd className={`sk-recipient ${styles.recipient}`}>{recipient}</dd>
        <dt>Network</dt>
        <dd>Base Sepolia · 84532</dd>
        <dt>Network fee</dt>
        <dd>{networkFee}</dd>
      </dl>
      <p>{recoveryDescription}</p>
    </details>
  );
}
