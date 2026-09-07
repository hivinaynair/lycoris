import type { CheckoutState, Destination, Quote, SettleError, TxHash } from "./types.js";

export const IDLE_STATE: CheckoutState = { status: "idle" };

export type CheckoutAction =
  | { type: "QUOTING"; amountUsdc: string }
  | { type: "QUOTE_OK"; quote: Quote; destination: Destination }
  | { type: "QUOTE_FAILED"; error: SettleError }
  | { type: "SETTLING" }
  | { type: "SETTLED"; txHash: TxHash }
  | { type: "FAILED"; error: SettleError }
  | { type: "RESET" };

export function reduce(state: CheckoutState, action: CheckoutAction): CheckoutState {
  switch (action.type) {
    case "RESET":
      return IDLE_STATE;
    case "QUOTING":
      if (state.status !== "idle") return state;
      return { status: "quoting", amountUsdc: action.amountUsdc };
    case "QUOTE_OK":
      if (state.status !== "quoting") return state;
      return {
        status: "awaiting_payment",
        quote: action.quote,
        destination: action.destination,
      };
    case "QUOTE_FAILED":
      if (state.status !== "quoting") return state;
      return { status: "failed", error: action.error };
    case "SETTLING":
      if (state.status !== "awaiting_payment") return state;
      return { status: "settling", quote: state.quote, destination: state.destination };
    case "SETTLED":
      if (state.status !== "settling") return state;
      return {
        status: "settled",
        quote: state.quote,
        destination: state.destination,
        txHash: action.txHash,
      };
    case "FAILED":
      if (
        state.status !== "quoting" &&
        state.status !== "awaiting_payment" &&
        state.status !== "settling"
      ) {
        return state;
      }
      return {
        status: "failed",
        error: action.error,
        quote: "quote" in state ? state.quote : undefined,
        destination: "destination" in state ? state.destination : undefined,
      };
    default:
      return state;
  }
}
