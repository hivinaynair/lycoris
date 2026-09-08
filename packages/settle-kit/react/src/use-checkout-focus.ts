"use client";

import type { CheckoutState } from "@settle-kit/core";
import { useEffect, useRef } from "react";

export function useCheckoutFocus(status: CheckoutState["status"]) {
  const card = useRef<HTMLElement>(null);
  const focusNext = useRef(false);
  function act(action: () => void | Promise<void>) {
    focusNext.current = true;
    void action();
  }
  useEffect(() => {
    if (!focusNext.current || !["awaiting_payment", "settled", "failed"].includes(status)) return;
    focusNext.current = false;
    if (document.activeElement !== document.body && !card.current?.contains(document.activeElement))
      return;
    card.current?.querySelector<HTMLButtonElement>("button")?.focus();
  }, [status]);
  return { card, act };
}
