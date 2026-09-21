import { parseUsdcAmount } from "./amounts.ts";
import { assertDestination } from "./destination.ts";
import { invalidConfig, SettleKitError, toSettleError } from "./errors.ts";
import { validateIntent } from "./intent.ts";
import { createUsdcMethod } from "./methods/usdc.ts";
import { type CheckoutAction, IDLE_STATE, reduce } from "./state.ts";
import {
  type CheckoutManager,
  type CheckoutState,
  type CreateCheckoutInput,
  type Destination,
  type Intent,
  type PaymentSigner,
  SETTLE_METHOD_IDS,
  type SettleAdapter,
  type SettlementHash,
} from "./types.ts";

type ResolvedCheckout = {
  amount: string;
  destination?: Destination | undefined;
  getSigner: () => Promise<PaymentSigner>;
  method: SettleAdapter;
};

type BoundSettling = Extract<CheckoutState, { status: "settling" }> & {
  intent: Intent;
  destination: Destination;
};

function isBoundSettling(state: CheckoutState): state is BoundSettling {
  return (
    state.status === "settling" && state.intent !== undefined && state.destination !== undefined
  );
}

function resolveInput(input: CreateCheckoutInput): ResolvedCheckout {
  if (typeof input.getSigner !== "function") {
    invalidConfig("getSigner is required");
  }
  const destination = input.destination ? assertDestination(input.destination) : undefined;
  const method = input.method ?? createUsdcMethod();
  if (!(SETTLE_METHOD_IDS as readonly string[]).includes(method.id))
    invalidConfig(`Unknown payment method: ${method.id}`);
  if (
    typeof method.prepare !== "function" ||
    typeof method.settle !== "function" ||
    typeof method.confirm !== "function"
  )
    invalidConfig(`Method ${method.id} needs prepare, settle, and confirm`);
  parseUsdcAmount(input.amount);
  return {
    amount: input.amount.trim(),
    ...(destination ? { destination } : {}),
    getSigner: input.getSigner,
    method,
  };
}

function notifyCheckout(listeners: Set<() => void>) {
  for (const listener of listeners) {
    try {
      listener();
    } catch (error) {
      console.error("Settle Kit subscriber failed", error);
    }
  }
}

async function confirmPayment(
  adapter: SettleAdapter,
  current: BoundSettling,
  txHash: SettlementHash,
  setState: (action: CheckoutAction) => void,
) {
  try {
    const result = await adapter.confirm({
      txHash,
      intent: current.intent,
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
 * Call `pay()` to prepare, submit, and wait for a receipt. The manager is
 * in-memory: keep the page open until confirmation.
 */
export function createCheckout(input: CreateCheckoutInput): CheckoutManager {
  const config = resolveInput(input);
  const destination = config.destination;
  const adapter = config.method;
  const amount = config.amount;
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
    notifyCheckout(listeners);
  }

  function checkExpiry(expiresAt: number) {
    if (expiresAt <= Date.now())
      throw new SettleKitError("expired", "Payment expired before it was sent");
  }

  async function prepare() {
    if (state.status !== "idle")
      invalidConfig(`pay() requires idle; current status is ${state.status}`);
    const token = ++generation;
    setState({ type: "SETTLING", amount });
    try {
      const value = await adapter.prepare({ amount, destination });
      if (token !== generation) return;
      const intent = validateIntent(value, amount, destination, adapter.id);
      const settleTo = intent.destination ?? destination;
      if (!settleTo) {
        invalidConfig("destination is required: set it on the checkout or return it from prepare");
      }
      setState({ type: "PREPARE_OK", intent, destination: settleTo });
    } catch (error) {
      if (token !== generation) return;
      setState({ type: "FAILED", error: toSettleError(error) });
      if (error instanceof SettleKitError && error.code === "invalid_config") throw error;
    }
  }

  async function confirm() {
    if (!isBoundSettling(state) || !state.txHash || confirming) {
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
    if (state.status !== "idle")
      invalidConfig(`pay() requires idle; current status is ${state.status}`);
    await prepare();
    const current = getState();
    if (!isBoundSettling(current)) {
      if (current.status === "failed" || current.status === "idle") return;
      invalidConfig(`pay() could not start settlement; current status is ${current.status}`);
    }
    try {
      checkExpiry(current.intent.expiresAt);
      const signer = await config.getSigner();
      checkExpiry(current.intent.expiresAt);
      const txHash = await adapter.settle({
        intent: current.intent,
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
