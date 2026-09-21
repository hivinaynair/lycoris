import type { CheckoutState, Destination, Intent, SettleError, SettlementHash } from "./types.ts";

export const IDLE_STATE: CheckoutState = { status: "idle" };

export type CheckoutAction =
  | { type: "SETTLING"; amount: string }
  | { type: "PREPARE_OK"; intent: Intent; destination: Destination }
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
    case "SETTLING":
      if (state.status !== "idle") return state;
      return { status: "settling", amount: action.amount };
    case "PREPARE_OK":
      if (state.status !== "settling" || state.intent || state.txHash) return state;
      return {
        ...state,
        intent: action.intent,
        destination: action.destination,
      };
    case "SETTLED":
      if (state.status !== "settling" || !state.intent || !state.destination) return state;
      return {
        status: "settled",
        intent: state.intent,
        destination: state.destination,
        txHash: action.txHash,
      };
    case "SUBMITTED":
      if (state.status !== "settling" || !state.intent) return state;
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
      if (state.status !== "settling") return state;
      if (!state.intent || !state.destination) {
        return { status: "failed", error: action.error };
      }
      const failed: Extract<CheckoutState, { status: "failed" }> = {
        status: "failed",
        error: action.error,
        intent: state.intent,
        destination: state.destination,
      };
      if (state.txHash) failed.txHash = state.txHash;
      return failed;
    }
    default:
      return state;
  }
}
