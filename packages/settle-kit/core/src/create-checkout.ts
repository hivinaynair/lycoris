import { parseUsdcAmount } from "./amounts.ts";
import { assertDestination } from "./destination.ts";
import { invalidConfig, SettleKitError, toSettleError } from "./errors.ts";
import { createUsdcMethod } from "./methods/usdc.ts";
import { fetchQuote, validateQuote } from "./quote-client.ts";
import { type CheckoutAction, IDLE_STATE, reduce } from "./state.ts";
import {
  type CheckoutManager,
  type CheckoutState,
  type CreateCheckoutInput,
  SETTLE_METHOD_IDS,
  type SettleAdapter,
  type SettleConfig,
  type SettlementHash,
} from "./types.ts";

function resolveConfig(input: CreateCheckoutInput): SettleConfig {
  if (typeof input.getSigner !== "function") {
    invalidConfig("getSigner is required");
  }
  const destination = input.destination ? assertDestination(input.destination) : undefined;
  const methods = input.methods ?? [createUsdcMethod()];
  if (methods.length === 0) invalidConfig("Provide at least one payment method");
  if (methods.length > 1) invalidConfig("v1 supports one payment method");
  const method = methods[0];
  if (!method || !(SETTLE_METHOD_IDS as readonly string[]).includes(method.id))
    invalidConfig(`Unknown payment method: ${method?.id}`);
  if (
    typeof method.quote !== "function" ||
    typeof method.settle !== "function" ||
    typeof method.confirm !== "function"
  )
    invalidConfig(`Method ${method.id} needs quote, settle, and confirm`);
  return {
    ...(destination ? { destination } : {}),
    getSigner: input.getSigner,
    methods,
    ...(input.quoteUrl !== undefined ? { quoteUrl: input.quoteUrl } : {}),
    ...(input.onSettled ? { onSettled: input.onSettled } : {}),
    ...(input.onFailed ? { onFailed: input.onFailed } : {}),
  };
}

function requireAdapter(methods: SettleAdapter[]): SettleAdapter {
  const method = methods[0];
  if (!method) invalidConfig("Provide at least one payment method");
  return method;
}

function notifyCheckout(listeners: Set<() => void>, next: CheckoutState, config: SettleConfig) {
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

async function confirmPayment(
  adapter: SettleAdapter,
  current: Extract<CheckoutState, { status: "settling" }>,
  txHash: SettlementHash,
  setState: (action: CheckoutAction) => void,
) {
  try {
    const result = await adapter.confirm({
      txHash,
      quote: current.quote,
      destination: current.destination,
    });
    if (result === "success") setState({ type: "SETTLED", txHash });
    else if (result === "reverted")
      setState({
        type: "FAILED",
        error: {
          code: "transfer_failed",
          message: "The transaction reverted. No USDC was transferred.",
        },
      });
    else throw new Error("Unexpected receipt result");
  } catch {
    setState({
      type: "CONFIRMATION_UNKNOWN",
      error: {
        code: "transfer_failed",
        message:
          "Confirmation is unavailable. Check this transaction again; do not send another payment.",
      },
    });
  }
}

/**
 * Start a checkout session for a USDC amount.
 *
 * Call `quote` to price, then `pay` to submit — or just `pay()` from idle to
 * do both. The manager is in-memory: keep the page open until confirmation.
 */
export function createCheckout(input: CreateCheckoutInput): CheckoutManager {
  const config = resolveConfig(input);
  const destination = config.destination;
  parseUsdcAmount(input.amountUsdc);
  const amountUsdc = input.amountUsdc.trim();
  const adapter = requireAdapter(config.methods);
  let state: CheckoutState = IDLE_STATE;
  const listeners = new Set<() => void>();
  let generation = 0;
  let confirming = false;

  function getState(): CheckoutState {
    return state;
  }

  function setState(action: CheckoutAction) {
    const next = reduce(state, action);
    if (next === state) return;
    state = next;
    notifyCheckout(listeners, next, config);
  }

  function checkExpiry(expiresAt: number) {
    if (expiresAt <= Date.now())
      throw new SettleKitError("quote_expired", "Quote expired before payment");
  }

  async function quote() {
    if (state.status !== "idle")
      invalidConfig(`quote() requires idle; current status is ${state.status}`);
    const token = ++generation;
    setState({ type: "QUOTING", amountUsdc });
    try {
      const value = config.quoteUrl
        ? await fetchQuote(config.quoteUrl, { amountUsdc, destination, method: adapter.id })
        : await adapter.quote({ amountUsdc, destination });
      if (token !== generation) return;
      const quoted = validateQuote(value, amountUsdc, destination, adapter.id);
      const settleTo = quoted.destination ?? destination;
      if (!settleTo) {
        invalidConfig(
          "destination is required: set it on the checkout or return it from the quote",
        );
      }
      setState({ type: "QUOTE_OK", quote: quoted, destination: settleTo });
    } catch (error) {
      if (token !== generation) return;
      setState({ type: "QUOTE_FAILED", error: toSettleError(error) });
      if (error instanceof SettleKitError && error.code === "invalid_config") throw error;
    }
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
      await confirmPayment(adapter, current, txHash, setState);
    } finally {
      confirming = false;
    }
  }

  async function pay() {
    if (state.status === "idle") await quote();
    const current = getState();
    if (current.status !== "awaiting_payment") {
      if (current.status === "failed") return;
      invalidConfig(`pay() requires idle or awaiting_payment; current status is ${current.status}`);
    }
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
  }

  return {
    getState,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    quote,
    pay,
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
