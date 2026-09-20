import type { CheckoutState, Destination, Quote, SettleError, SettlementHash } from "./types.ts";

export const IDLE_STATE: CheckoutState = { status: "idle" };

export type CheckoutAction =
  | { type: "QUOTING"; amountUsdc: string }
  | { type: "QUOTE_OK"; quote: Quote; destination: Destination }
  | { type: "QUOTE_FAILED"; error: SettleError }
  | { type: "SETTLING" }
  | { type: "SUBMITTED"; txHash: SettlementHash }
  | { type: "CONFIRMING" }
  | { type: "CONFIRMATION_UNKNOWN"; error: SettleError }
  | { type: "SETTLED"; txHash: SettlementHash }
  | { type: "FAILED"; error: SettleError }
  | { type: "RESET" };

export function reduce(state: CheckoutState, action: CheckoutAction): CheckoutState {
  switch (action.type) {
    case "RESET":
      if (state.status === "settling") return state;
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
    case "SUBMITTED":
      if (state.status !== "settling") return state;
      return { ...state, txHash: action.txHash };
    case "CONFIRMING": {
      if (state.status !== "settling") return state;
      const { confirmationError: _cleared, ...confirming } = state;
      return confirming;
    }
    case "CONFIRMATION_UNKNOWN":
      if (state.status !== "settling" || !state.txHash) return state;
      return { ...state, confirmationError: action.error };
    case "FAILED": {
      if (
        state.status !== "quoting" &&
        state.status !== "awaiting_payment" &&
        state.status !== "settling"
      ) {
        return state;
      }
      if (state.status === "quoting") {
        return { status: "failed", error: action.error };
      }
      const failed: Extract<CheckoutState, { status: "failed" }> = {
        status: "failed",
        error: action.error,
        quote: state.quote,
        destination: state.destination,
      };
      if ("txHash" in state && state.txHash) failed.txHash = state.txHash;
      return failed;
    }
    default:
      return state;
  }
}
