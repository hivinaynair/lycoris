import { invalidConfig, toSettleError } from "./errors.js";
import { fetchQuote } from "./quote-client.js";
import { type CheckoutAction, IDLE_STATE, reduce } from "./state.js";
import type {
  CheckoutManager,
  CheckoutState,
  CreateCheckoutInput,
  Destination,
  SettleConfig,
} from "./types.js";

export function createCheckout(config: SettleConfig, input: CreateCheckoutInput): CheckoutManager {
  const destination: Destination = input.destination ?? config.destination;
  const amountUsdc = input.amountUsdc;
  if (!amountUsdc?.trim()) {
    invalidConfig("amountUsdc is required");
  }

  let state: CheckoutState = IDLE_STATE;
  const listeners = new Set<() => void>();
  let generation = 0;

  function notify() {
    for (const listener of listeners) listener();
  }

  function setState(action: CheckoutAction) {
    const next = reduce(state, action);
    if (next === state) return;
    state = next;
    notify();
    if (state.status === "settled") config.onSettled?.(state);
    if (state.status === "failed") config.onFailed?.(state);
  }

  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    async selectMethod(id) {
      const adapter = config.methods.find((method) => method.id === id);
      if (!adapter) {
        invalidConfig(`Unknown payment method: ${id}`);
      }
      if (state.status !== "idle") {
        invalidConfig(`selectMethod requires idle; current status is ${state.status}`);
      }

      const token = ++generation;
      setState({ type: "QUOTING", amountUsdc });
      try {
        const quote = config.quoteUrl
          ? await fetchQuote(config.quoteUrl, { amountUsdc, destination, method: "usdc" })
          : await adapter.quote({ amountUsdc, destination });
        if (token !== generation) return;
        setState({ type: "QUOTE_OK", quote, destination });
      } catch (error) {
        if (token !== generation) return;
        setState({ type: "QUOTE_FAILED", error: toSettleError(error, "transfer_failed") });
      }
    },
    async pay() {
      if (state.status !== "awaiting_payment") {
        invalidConfig(`pay() requires awaiting_payment; current status is ${state.status}`);
      }

      const current = state;
      if (current.quote.expiresAt <= Date.now()) {
        setState({
          type: "FAILED",
          error: { code: "quote_expired", message: "Quote expired before payment" },
        });
        return;
      }

      const adapter = config.methods.find((method) => method.id === current.quote.method);
      if (!adapter) {
        invalidConfig(`Unknown payment method: ${current.quote.method}`);
      }

      const token = ++generation;
      setState({ type: "SETTLING" });
      try {
        const signer = await config.getSigner();
        const txHash = await adapter.settle({
          quote: current.quote,
          destination: current.destination,
          signer,
        });
        if (token !== generation) return;
        setState({ type: "SETTLED", txHash });
      } catch (error) {
        if (token !== generation) return;
        setState({ type: "FAILED", error: toSettleError(error) });
      }
    },
    reset() {
      generation += 1;
      setState({ type: "RESET" });
    },
  };
}
