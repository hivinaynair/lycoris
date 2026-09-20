"use client";

import {
  type Address,
  BASE_SEPOLIA_CHAIN_ID,
  BASE_SEPOLIA_USDC_ADDRESS,
  type Destination,
} from "@settle-kit/core";
import { SettleProvider, useCheckout } from "@settle-kit/react";
import "@settle-kit/react/styles.css";
import { CloudSun } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { appearances, type Look } from "./checkout-appearance";
import { CheckoutControls } from "./checkout-controls";
import { CheckoutEmbed } from "./checkout-embed";
import styles from "./checkout-layouts";
import { CheckoutPreview } from "./checkout-preview";
import type { CheckoutRail } from "./checkout-rail";
import { createWalletPayment } from "./eoa-payment";
import { createSponsoredPayment } from "./sponsored-payment";

export function CheckoutShop({ recipient }: { recipient: Address }) {
  const [look, setLook] = useState<Look>("default");
  const [rail, setRail] = useState<CheckoutRail>("sponsored");
  const sponsored = useMemo(() => createSponsoredPayment(recipient), [recipient]);
  const wallet = useMemo(() => createWalletPayment(), []);
  const destination: Destination = {
    targetChain: BASE_SEPOLIA_CHAIN_ID,
    targetAsset: BASE_SEPOLIA_USDC_ADDRESS,
    recipient,
  };
  const payment = rail === "sponsored" ? sponsored : wallet;
  return (
    <SettleProvider
      appearance={appearances[look]}
      config={{
        appName: "Melbourne weather",
        destination,
        ...payment,
      }}
    >
      <RailSession rail={rail} />
      <Playground look={look} setLook={setLook} rail={rail} setRail={setRail} />
    </SettleProvider>
  );
}
function RailSession({ rail }: { rail: CheckoutRail }) {
  const { reset, state } = useCheckout();
  const previous = useRef(rail);
  useEffect(() => {
    if (previous.current === rail) return;
    previous.current = rail;
    if (state.status !== "idle" && state.status !== "settling") reset();
  }, [rail, reset, state.status]);
  return null;
}

function Playground({
  look,
  setLook,
  rail,
  setRail,
}: {
  look: Look;
  setLook: (look: Look) => void;
  rail: CheckoutRail;
  setRail: (rail: CheckoutRail) => void;
}) {
  return (
    <div
      className={`demo-type text-body text-foreground [&_button]:text-small [&_select]:text-small [&_.text-sm]:text-small [&_.sk-checkout_p:not(.sk-amount)]:text-small [&_.sk-checkout_a]:text-small [&_.sk-checkout_dd]:text-small [&_.sk-checkout_dt]:text-small [&_.sk-caption]:text-small [&_.sk-checkout_summary]:text-small [&_.sk-checkout_h2]:text-body [&_.sk-merchant]:text-body [&_.sk-badge]:text-meta ${styles.root}`}
    >
      <div className={styles.layout}>
        <section className={styles.story} aria-labelledby="checkout-heading">
          <p className="text-meta uppercase tracking-[0.12em] text-muted-foreground">
            Settle Kit / Checkout demo
          </p>
          <div className={styles.weatherArt} aria-hidden="true">
            <CloudSun strokeWidth={0.8} />
          </div>
          <h1 id="checkout-heading">
            Pay in USDC.
            <br />
            Stay in the app.
          </h1>
          <p className={styles.storyDescription}>
            {rail === "sponsored"
              ? "Try a real Base Sepolia payment to unlock Melbourne’s weather report. We cover the test funds and fees. No wallet connection or sign-in."
              : "Pay 0.1 test USDC from Coinbase Wallet or another injected EOA. You cover the transfer and Base Sepolia gas."}
          </p>
        </section>
        <CheckoutPreview look={look} rail={rail} />
      </div>
      <CheckoutControls look={look} setLook={setLook} rail={rail} setRail={setRail} />
      <CheckoutEmbed look={look} rail={rail} />
    </div>
  );
}
