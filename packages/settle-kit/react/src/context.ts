"use client";

import type { CheckoutManager, Destination, PaymentSigner, SettleAdapter } from "@settle-kit/core";
import { createContext } from "react";
import type { CheckoutAppearance } from "./appearance";

export type SettleAppConfig = {
  appName: string;
  getSigner: () => Promise<PaymentSigner>;
  /** Optional default. `begin`/`payNow` input or the quote server may supply it instead. */
  destination?: Destination;
  methods?: SettleAdapter[];
  quoteUrl?: string;
};

export type BeginCheckoutInput = {
  amountUsdc: string;
  destination?: Destination;
  title?: string;
};

export type SettleContextValue = {
  config: SettleAppConfig;
  appearance?: CheckoutAppearance;
  manager: CheckoutManager | null;
  managerRef: { current: CheckoutManager | null };
  title: string | undefined;
  setSession: (manager: CheckoutManager | null, title?: string) => void;
};

export const SettleContext = createContext<SettleContextValue | null>(null);
