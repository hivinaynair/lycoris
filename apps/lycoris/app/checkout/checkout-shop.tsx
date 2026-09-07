"use client";

import {
  BASE_SEPOLIA_CHAIN_ID,
  BASE_SEPOLIA_USDC_ADDRESS,
  type Destination,
  type HexAddress,
} from "@settle-kit/core";
import { Checkout, SettleProvider } from "@settle-kit/react";
import { getBrowserSigner } from "@/lib/get-browser-signer";

const SKU = {
  title: "Rooftop hoodie",
  amountUsdc: "12.50",
};

export function CheckoutShop({ recipient }: { recipient: HexAddress }) {
  const destination: Destination = {
    targetChain: BASE_SEPOLIA_CHAIN_ID,
    targetAsset: BASE_SEPOLIA_USDC_ADDRESS,
    recipient,
  };

  return (
    <SettleProvider
      config={{
        appName: "Lycoris Rooftop",
        destination,
        getSigner: getBrowserSigner,
        quoteUrl: "/api/settle-kit/quote",
      }}
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)]">
        <article className="border border-border bg-card p-6">
          <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">SKU</p>
          <h2 className="mt-2 font-heading text-2xl tracking-tight">{SKU.title}</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {SKU.amountUsdc} USDC. The merchant named Base Sepolia, Circle USDC, and this recipient.
            Checkout transfers to the USDC contract; the recipient is inside{" "}
            <code className="font-mono text-xs">transfer</code>.
          </p>
          <p className="mt-4 break-all font-mono text-xs text-muted-foreground">{recipient}</p>
        </article>
        <Checkout amountUsdc={SKU.amountUsdc} title={`Buy ${SKU.title}`} />
      </div>
    </SettleProvider>
  );
}
