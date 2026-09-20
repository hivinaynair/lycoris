import type { CheckoutState, SettleConfig } from "./types.ts";

export function notifyCheckout(
  listeners: Set<() => void>,
  next: CheckoutState,
  config: SettleConfig,
) {
  // Isolate observer failures so they cannot change payment outcome.
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
