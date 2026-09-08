import { parseUsdcAmount } from "./amounts";
import { notifyCheckout } from "./checkout-observers";
import { confirmPayment } from "./confirm-payment";
import { assertDestination } from "./destination";
import { invalidConfig, SettleKitError, toSettleError } from "./errors";
import { fetchQuote, validateQuote } from "./quote-client";
import { type CheckoutAction, IDLE_STATE, reduce } from "./state";
import type {
  CheckoutManager,
  CheckoutState,
  CreateCheckoutInput,
  SettleAdapter,
  SettleConfig,
} from "./types";

export function createCheckout(config: SettleConfig, input: CreateCheckoutInput): CheckoutManager {
  const requested = input.destination ?? config.destination;
  const destination = requested ? assertDestination(requested) : undefined;
  parseUsdcAmount(input.amountUsdc);
  const amountUsdc = input.amountUsdc.trim();
  let state: CheckoutState = IDLE_STATE;
  const listeners = new Set<() => void>();
  let generation = 0;
  let confirming = false;

  function setState(action: CheckoutAction) {
    const next = reduce(state, action);
    if (next === state) return;
    state = next;
    notifyCheckout(listeners, next, config);
  }

  function getAdapter(id: string): SettleAdapter {
    const adapter = config.methods.find((method) => method.id === id);
    if (!adapter) invalidConfig(`Unknown payment method: ${id}`);
    return adapter;
  }

  function checkExpiry(expiresAt: number) {
    if (expiresAt <= Date.now())
      throw new SettleKitError("quote_expired", "Quote expired before payment");
  }

  async function confirm() {
    if (state.status !== "settling" || !state.txHash || confirming) {
      invalidConfig("Confirmation requires a submitted transaction and no active receipt lookup");
    }
    const current = state;
    const txHash = state.txHash;
    confirming = true;
    setState({ type: "CONFIRMING" });
    try {
      await confirmPayment(() => getAdapter(current.quote.method), current, txHash, setState);
    } finally {
      confirming = false;
    }
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
      const adapter = getAdapter(id);
      if (state.status !== "idle")
        invalidConfig(`selectMethod requires idle; current status is ${state.status}`);
      const token = ++generation;
      setState({ type: "QUOTING", amountUsdc });
      try {
        const quoteInput = { amountUsdc, ...(destination ? { destination } : {}) };
        const value = config.quoteUrl
          ? await fetchQuote(config.quoteUrl, { ...quoteInput, method: "usdc" })
          : await adapter.quote(quoteInput);
        if (token !== generation) return;
        const quote = validateQuote(value, amountUsdc, destination);
        const settleTo = quote.destination ?? destination;
        if (!settleTo) {
          invalidConfig(
            "destination is required: set it on the config, pass it to the checkout, or return it from the quote",
          );
        }
        setState({ type: "QUOTE_OK", quote, destination: settleTo });
      } catch (error) {
        if (token !== generation) return;
        setState({ type: "QUOTE_FAILED", error: toSettleError(error) });
        if (error instanceof SettleKitError && error.code === "invalid_config") throw error;
      }
    },
    async pay() {
      if (state.status !== "awaiting_payment")
        invalidConfig(`pay() requires awaiting_payment; current status is ${state.status}`);
      const current = state;
      const adapter = getAdapter(current.quote.method);
      setState({ type: "SETTLING" });
      try {
        checkExpiry(current.quote.expiresAt);
        const signer = await config.getSigner();
        checkExpiry(current.quote.expiresAt);
        const txHash = await adapter.settle({
          quote: current.quote,
          destination: current.destination,
          signer,
        });
        setState({ type: "SUBMITTED", txHash });
      } catch (error) {
        setState({ type: "FAILED", error: toSettleError(error) });
        if (error instanceof SettleKitError && error.code === "invalid_config") throw error;
        return;
      }
      await confirm();
    },
    retryConfirmation: confirm,
    reset() {
      if (state.status === "settling")
        invalidConfig(
          "Cannot reset an in-flight payment. Resolve its receipt before starting another purchase.",
        );
      generation += 1;
      setState({ type: "RESET" });
    },
  };
}
