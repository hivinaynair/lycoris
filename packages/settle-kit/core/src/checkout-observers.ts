import type { CheckoutState, SettleConfig } from "./types";

export function notifyCheckout(
  listeners: Set<() => void>,
  next: CheckoutState,
  config: SettleConfig,
) {
  // Observers cannot interrupt payment bookkeeping or change its outcome.
  for (const listener of listeners) {
    try {
      listener();
    } catch (error) {
      console.error("Settle Kit subscriber failed", error);
    }
  }
  try {
    if (next.status === "settled") config.onSettled?.(next);
    if (next.status === "failed") config.onFailed?.(next);
  } catch (error) {
    console.error("Settle Kit callback failed", error);
  }
}
