"use client";

import type { CheckoutManager, CheckoutState } from "@settle-kit/core";
import { SettleKitError } from "@settle-kit/core";
import { useCallback, useContext, useLayoutEffect, useRef, useSyncExternalStore } from "react";
import { type PayInput, SettleContext } from "./context.ts";
import { startCheckout } from "./provider.tsx";

const IDLE: CheckoutState = { status: "idle" };

function getIdle() {
  return IDLE;
}

export type UseCheckoutResult = {
  state: CheckoutState;
  title: string | undefined;
  /** Quote and submit from one click. */
  pay: (input: PayInput) => Promise<void>;
  /** Retry receipt lookup only. Never resubmits. */
  retryConfirmation: () => Promise<void>;
  reset: () => void;
};

function requireManager(manager: CheckoutManager | null, verb: string): CheckoutManager {
  if (!manager) {
    throw new SettleKitError("invalid_config", `pay() before ${verb}()`);
  }
  return manager;
}

/**
 * Subscribe to the current checkout session.
 *
 * Must be used under `SettleProvider`. `pay({ amount })` quotes and submits.
 */
export function useCheckout(): UseCheckoutResult {
  const ctx = useContext(SettleContext);
  if (!ctx) {
    throw new SettleKitError("invalid_config", "useCheckout must be used inside SettleProvider");
  }

  const latest = useRef({ ctx });
  useLayoutEffect(() => {
    latest.current = { ctx };
  });

  const state = useSyncExternalStore(
    ctx.manager?.subscribe ?? (() => () => undefined),
    ctx.manager?.getState ?? getIdle,
    getIdle,
  );

  const startingPayment = useRef(false);

  const pay = useCallback(async (input: PayInput) => {
    if (startingPayment.current) return;
    startingPayment.current = true;
    try {
      const { ctx } = latest.current;
      const manager = startCheckout(ctx.config, input);
      ctx.managerRef.current?.reset();
      ctx.setSession(manager, input.title);
      await manager.pay();
    } finally {
      startingPayment.current = false;
    }
  }, []);

  const reset = useCallback(() => {
    const { ctx } = latest.current;
    ctx.managerRef.current?.reset();
    ctx.setSession(null);
  }, []);

  const retryConfirmation = useCallback(async () => {
    await requireManager(
      latest.current.ctx.managerRef.current,
      "retryConfirmation",
    ).retryConfirmation();
  }, []);

  return {
    state,
    title: ctx.title,
    pay,
    retryConfirmation,
    reset,
  };
}
