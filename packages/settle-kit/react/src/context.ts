"use client";

import type { CheckoutManager, Destination, PaymentSigner, SettleAdapter } from "@settle-kit/core";
import { createContext } from "react";

export type SettleAppConfig = {
  appName: string;
  getSigner: () => Promise<PaymentSigner>;
  destination: Destination;
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
  manager: CheckoutManager | null;
  managerRef: { current: CheckoutManager | null };
  title: string | undefined;
  setSession: (manager: CheckoutManager | null, title?: string) => void;
};

export const SettleContext = createContext<SettleContextValue | null>(null);
