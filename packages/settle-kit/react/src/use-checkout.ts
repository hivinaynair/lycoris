"use client";

import type { CheckoutManager, CheckoutState } from "@settle-kit/core";
import { SettleKitError } from "@settle-kit/core";
import { useCallback, useContext, useSyncExternalStore } from "react";
import { type BeginCheckoutInput, SettleContext } from "./context";
import { startCheckout } from "./provider";

const IDLE: CheckoutState = { status: "idle" };

function getIdle() {
  return IDLE;
}

export type UseCheckoutResult = {
  state: CheckoutState;
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

export function useCheckout(options?: {
  onSettled?: (state: Extract<CheckoutState, { status: "settled" }>) => void;
  onFailed?: (state: Extract<CheckoutState, { status: "failed" }>) => void;
}): UseCheckoutResult {
  const ctx = useContext(SettleContext);
  if (!ctx) {
    throw new SettleKitError("invalid_config", "useCheckout must be used inside SettleProvider");
  }

  const state = useSyncExternalStore(
    ctx.manager?.subscribe ?? (() => () => undefined),
    ctx.manager?.getState ?? getIdle,
    getIdle,
  );

  const begin = useCallback(
    async (input: BeginCheckoutInput) => {
      const manager = startCheckout(ctx.config, input, options);
      ctx.managerRef.current?.reset();
      ctx.setSession(manager, input.title);
      await manager.selectMethod("usdc");
    },
    [ctx, options],
  );

  const selectMethod = useCallback(
    async (id: string) => {
      await requireManager(ctx.managerRef.current, "selectMethod").selectMethod(id);
    },
    [ctx.managerRef],
  );

  const pay = useCallback(async () => {
    await requireManager(ctx.managerRef.current, "pay").pay();
  }, [ctx.managerRef]);

  const reset = useCallback(() => {
    ctx.managerRef.current?.reset();
    ctx.setSession(null);
  }, [ctx]);

  const retryConfirmation = useCallback(async () => {
    await requireManager(ctx.managerRef.current, "retryConfirmation").retryConfirmation();
  }, [ctx.managerRef]);

  return { state, title: ctx.title, begin, selectMethod, pay, retryConfirmation, reset };
}
