"use client";

import type { CheckoutState } from "@settle-kit/core";
import { useEffect, useRef } from "react";

function restoresFocus(status: CheckoutState["status"]) {
  return status === "awaiting_payment" || status === "settled" || status === "failed";
}

export function useCheckoutFocus(status: CheckoutState["status"]) {
  const card = useRef<HTMLElement>(null);
  const focusNext = useRef(false);
  function act(action: () => void | Promise<void>) {
    focusNext.current = true;
    void action();
  }
  useEffect(() => {
    if (!focusNext.current || !restoresFocus(status)) return;
    focusNext.current = false;
    const active = document.activeElement;
    const leftTheCard = active !== document.body && !card.current?.contains(active);
    if (leftTheCard) return;
    card.current?.querySelector<HTMLButtonElement>("button")?.focus();
  }, [status]);
  return { card, act };
}
