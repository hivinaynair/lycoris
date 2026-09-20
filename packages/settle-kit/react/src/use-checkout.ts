"use client";

import type { CheckoutManager, CheckoutState } from "@settle-kit/core";
import { SettleKitError } from "@settle-kit/core";
import { useCallback, useContext, useLayoutEffect, useRef, useSyncExternalStore } from "react";
import { type BeginCheckoutInput, SettleContext } from "./context.ts";
import { startCheckout } from "./provider.tsx";

const IDLE: CheckoutState = { status: "idle" };

function getIdle() {
  return IDLE;
}

export type UseCheckoutResult = {
  state: CheckoutState;
  /** True in `awaiting_payment`. Not a balance or permission check. */
  canPay: boolean;
  /** True in `quoting` or `settling`. */
  isBusy: boolean;
  title: string | undefined;
  /** Quote the purchase. Does not submit. */
  begin: (input: BeginCheckoutInput) => Promise<void>;
  /** Quote and submit from one click. */
  payNow: (input: BeginCheckoutInput) => Promise<void>;
  /** Low-level quote. `begin` already selects a method. */
  selectMethod: (id: string) => Promise<void>;
  /** Submit the quoted payment. Requires `awaiting_payment`. */
  pay: () => Promise<void>;
  /** Retry receipt lookup only. Never resubmits. */
  retryConfirmation: () => Promise<void>;
  reset: () => void;
};

function requireManager(manager: CheckoutManager | null, verb: string): CheckoutManager {
  if (!manager) {
    throw new SettleKitError("invalid_config", `begin() before ${verb}()`);
  }
  return manager;
}

/** Callbacks attached to sessions started by this `useCheckout` instance. */
export type CheckoutCallbacks = {
  onSettled?: ((state: Extract<CheckoutState, { status: "settled" }>) => void) | undefined;
  onFailed?: ((state: Extract<CheckoutState, { status: "failed" }>) => void) | undefined;
};

/**
 * Subscribe to the current checkout session.
 *
 * Must be used under `SettleProvider`. `begin` quotes; `pay` submits; `payNow`
 * quotes and submits from one click.
 */
export function useCheckout(options?: CheckoutCallbacks): UseCheckoutResult {
  const ctx = useContext(SettleContext);
  if (!ctx) {
    throw new SettleKitError("invalid_config", "useCheckout must be used inside SettleProvider");
  }

  const latest = useRef({ ctx, options });
  useLayoutEffect(() => {
    latest.current = { ctx, options };
    return () => {
      latest.current = { ctx, options: undefined };
    };
  });

  const state = useSyncExternalStore(
    ctx.manager?.subscribe ?? (() => () => undefined),
    ctx.manager?.getState ?? getIdle,
    getIdle,
  );

  const startingPayment = useRef(false);
  const beginSession = useCallback(async (input: BeginCheckoutInput) => {
    const { ctx } = latest.current;
    const manager = startCheckout(ctx.config, input, {
      onSettled: (state) => latest.current.options?.onSettled?.(state),
      onFailed: (state) => latest.current.options?.onFailed?.(state),
    });
    ctx.managerRef.current?.reset();
    ctx.setSession(manager, input.title);
    const [method] = ctx.config.methods ?? [];
    await manager.selectMethod(method?.id ?? "usdc");
    return manager;
  }, []);

  const begin = useCallback(
    async (input: BeginCheckoutInput) => {
      await beginSession(input);
    },
    [beginSession],
  );

  const payNow = useCallback(
    async (input: BeginCheckoutInput) => {
      if (startingPayment.current) return;
      startingPayment.current = true;
      try {
        const manager = await beginSession(input);
        if (
          latest.current.ctx.managerRef.current === manager &&
          manager.getState().status === "awaiting_payment"
        )
          await manager.pay();
      } finally {
        startingPayment.current = false;
      }
    },
    [beginSession],
  );

  const selectMethod = useCallback(async (id: string) => {
    await requireManager(latest.current.ctx.managerRef.current, "selectMethod").selectMethod(id);
  }, []);

  const pay = useCallback(async () => {
    await requireManager(latest.current.ctx.managerRef.current, "pay").pay();
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
    canPay: state.status === "awaiting_payment",
    isBusy: state.status === "quoting" || state.status === "settling",
    state,
    title: ctx.title,
    begin,
    payNow,
    selectMethod,
    pay,
    retryConfirmation,
    reset,
  };
}
