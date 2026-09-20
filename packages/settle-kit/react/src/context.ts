"use client";

import type { CheckoutManager, Destination, PaymentSigner, SettleAdapter } from "@settle-kit/core";
import { createContext } from "react";
import type { CheckoutAppearance } from "./appearance.ts";

export type SettleAppConfig = {
  appName: string;
  getSigner: () => Promise<PaymentSigner>;
  /** Default recipient. `begin` / `payNow` input or the quote server may supply it instead. */
  destination?: Destination | undefined;
  methods?: SettleAdapter[] | undefined;
  quoteUrl?: string | undefined;
};

export type BeginCheckoutInput = {
  amountUsdc: string;
  destination?: Destination | undefined;
  /** Label shown by the default UI for this purchase. */
  title?: string | undefined;
};

export type SettleContextValue = {
  config: SettleAppConfig;
  appearance?: CheckoutAppearance | undefined;
  manager: CheckoutManager | null;
  managerRef: { current: CheckoutManager | null };
  title: string | undefined;
  setSession: (manager: CheckoutManager | null, title?: string) => void;
};

export const SettleContext = createContext<SettleContextValue | null>(null);
