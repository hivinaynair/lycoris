"use client";

import type { CheckoutManager, CheckoutState } from "@settle-kit/core";
import { SettleKitError } from "@settle-kit/core";
import { useCallback, useContext, useLayoutEffect, useRef, useSyncExternalStore } from "react";
import { type BeginCheckoutInput, SettleContext } from "./context";
import { startCheckout } from "./provider";

const IDLE: CheckoutState = { status: "idle" };

function getIdle() {
  return IDLE;
}

export type UseCheckoutResult = {
  state: CheckoutState;
  canPay: boolean;
  isBusy: boolean;
  title: string | undefined;
  begin: (input: BeginCheckoutInput) => Promise<void>;
  selectMethod: (id: string) => Promise<void>;
  pay: () => Promise<void>;
  retryConfirmation: () => Promise<void>;
  reset: () => void;
};

function requireManager(manager: CheckoutManager | null, verb: string): CheckoutManager {
  if (!manager) {
    throw new SettleKitError("invalid_config", `begin() before ${verb}()`);
  }
  return manager;
}

export type CheckoutCallbacks = {
  onSettled?: (state: Extract<CheckoutState, { status: "settled" }>) => void;
  onFailed?: (state: Extract<CheckoutState, { status: "failed" }>) => void;
};

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

  const begin = useCallback(async (input: BeginCheckoutInput) => {
    const { ctx } = latest.current;
    const manager = startCheckout(ctx.config, input, {
      onSettled: (state) => latest.current.options?.onSettled?.(state),
      onFailed: (state) => latest.current.options?.onFailed?.(state),
    });
    ctx.managerRef.current?.reset();
    ctx.setSession(manager, input.title);
    await manager.selectMethod("usdc");
  }, []);

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
    selectMethod,
    pay,
    retryConfirmation,
    reset,
  };
}
