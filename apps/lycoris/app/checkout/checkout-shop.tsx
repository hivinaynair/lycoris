"use client";

import {
  BASE_SEPOLIA_CHAIN_ID,
  BASE_SEPOLIA_USDC_ADDRESS,
  type Destination,
  type HexAddress,
} from "@settle-kit/core";
import { SettleProvider } from "@settle-kit/react";
import "@settle-kit/react/styles.css";
import { CloudSun } from "lucide-react";
import { useMemo, useState } from "react";
import { appearances, type Look } from "./checkout-appearance";
import { CheckoutControls } from "./checkout-controls";
import { CheckoutEmbed } from "./checkout-embed";
import styles from "./checkout-layouts";
import { CheckoutPreview } from "./checkout-preview";
import { createSponsoredPayment } from "./sponsored-payment";

export function CheckoutShop({ recipient }: { recipient: HexAddress }) {
  const [look, setLook] = useState<Look>("default");
  const sponsored = useMemo(() => createSponsoredPayment(recipient), [recipient]);
  const destination: Destination = {
    targetChain: BASE_SEPOLIA_CHAIN_ID,
    targetAsset: BASE_SEPOLIA_USDC_ADDRESS,
    recipient,
  };
  return (
    <SettleProvider
      appearance={appearances[look]}
      config={{
        appName: "Melbourne weather",
        destination,
        ...sponsored,
      }}
    >
      <Playground look={look} setLook={setLook} />
    </SettleProvider>
  );
}
function Playground({ look, setLook }: { look: Look; setLook: (look: Look) => void }) {
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
            Try a real Base Sepolia payment to unlock Melbourne’s weather report. We cover the test
            funds and fees. No wallet connection or sign-in.
          </p>
        </section>
        <CheckoutPreview look={look} />
      </div>
      <CheckoutControls look={look} setLook={setLook} />
      <CheckoutEmbed look={look} />
    </div>
  );
}
