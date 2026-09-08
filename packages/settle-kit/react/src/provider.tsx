"use client";

import {
  type CheckoutManager,
  type CheckoutState,
  createCheckout,
  createSettleConfig,
  createUsdcMethod,
  type Destination,
} from "@settle-kit/core";
import { type ReactNode, useMemo, useRef, useState } from "react";
import type { CheckoutAppearance } from "./appearance";
import { type SettleAppConfig, SettleContext } from "./context";

export function SettleProvider({
  config,
  appearance,
  children,
}: {
  config: SettleAppConfig;
  appearance?: CheckoutAppearance;
  children: ReactNode;
}) {
  const managerRef = useRef<CheckoutManager | null>(null);
  const [manager, setManager] = useState<CheckoutManager | null>(null);
  const [title, setTitle] = useState<string | undefined>(undefined);

  const value = useMemo(
    () => ({
      config,
      appearance,
      manager,
      managerRef,
      title,
      setSession(next: CheckoutManager | null, nextTitle?: string) {
        managerRef.current = next;
        setManager(next);
        setTitle(nextTitle);
      },
    }),
    [config, appearance, manager, title],
  );

  return <SettleContext.Provider value={value}>{children}</SettleContext.Provider>;
}

export function startCheckout(
  config: SettleAppConfig,
  input: { amountUsdc: string; destination?: Destination },
  hooks?: {
    onSettled?: (state: Extract<CheckoutState, { status: "settled" }>) => void;
    onFailed?: (state: Extract<CheckoutState, { status: "failed" }>) => void;
  },
) {
  return createCheckout(
    createSettleConfig({
      destination: input.destination ?? config.destination,
      getSigner: config.getSigner,
      methods: config.methods ?? [createUsdcMethod()],
      quoteUrl: config.quoteUrl,
      onSettled: hooks?.onSettled,
      onFailed: hooks?.onFailed,
    }),
    {
      amountUsdc: input.amountUsdc,
      destination: input.destination,
    },
  );
}
