"use client";

import { type CheckoutManager, createCheckout, type Destination } from "@settle-kit/core";
import { type ReactNode, useMemo, useRef, useState } from "react";
import type { CheckoutAppearance } from "./appearance.ts";
import { type SettleAppConfig, SettleContext } from "./context.ts";

/**
 * Provides checkout configuration to `useCheckout` and `Checkout`.
 * Mount once above the purchases that share this config.
 */
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
  input: { amount: string; destination?: Destination | undefined },
) {
  return createCheckout({
    amount: input.amount,
    destination: input.destination ?? config.destination,
    getSigner: config.getSigner,
    method: config.method,
  });
}
