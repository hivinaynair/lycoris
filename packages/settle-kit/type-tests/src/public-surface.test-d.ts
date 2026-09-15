import type { PaidFetchScheme } from "@settle-kit/agents";
import {
  type CheckoutManager,
  type CheckoutState,
  createCheckout,
  createSettleConfig,
  createUsdcMethod,
  type Destination,
  type PaymentSigner,
  type Quote,
  type SettleAdapter,
  type SettleConfig,
  type SettleErrorCode,
  type TxHash,
} from "@settle-kit/core";
import type { BeginCheckoutInput, CheckoutCallbacks, SettleAppConfig } from "@settle-kit/react";
import type { AgenticPaymentOptions } from "@settle-kit/server/next";
import type { Equal, Expect } from "./type-assertions";

declare const getSigner: () => Promise<PaymentSigner>;
declare const maybeDestination: Destination | undefined;
declare const maybeString: string | undefined;
declare const maybeNumber: number | undefined;
declare const maybeMethods: SettleAdapter[] | undefined;

// ── A host builds option bags out of optional data. None of these may force the
// ── caller into a conditional spread just to satisfy exactOptionalPropertyTypes.
export const config = createSettleConfig({
  getSigner,
  destination: maybeDestination,
  quoteUrl: maybeString,
  methods: maybeMethods,
});

export const manager = createCheckout(config, {
  amountUsdc: "0.1",
  destination: maybeDestination,
});

export const method = createUsdcMethod({ quoteTtlMs: maybeNumber, now: undefined });

export const appConfig: SettleAppConfig = {
  appName: "Store",
  getSigner,
  destination: maybeDestination,
  quoteUrl: maybeString,
  methods: maybeMethods,
};

export const beginInput: BeginCheckoutInput = {
  amountUsdc: "0.1",
  destination: maybeDestination,
  title: maybeString,
};

export const callbacks: CheckoutCallbacks = {
  onSettled: undefined,
  onFailed: undefined,
};

export const scheme: PaidFetchScheme = {
  network: "eip155:84532",
  client: {},
  x402Version: maybeNumber,
};

export const agenticOptions: AgenticPaymentOptions = {
  priceUsdc: "0.1",
  network: "eip155:84532",
  payTo: "0x1111111111111111111111111111111111111111",
  facilitatorUrl: "https://facilitator.example",
  description: maybeString,
};

// ── A host writing a custom adapter PRODUCES a Quote, and may or may not have a
// ── server-supplied destination to forward.
export const adapter: SettleAdapter = {
  id: "usdc",
  quote: async (): Promise<Quote> => ({
    requestId: "q",
    amountUsdc: "0.1",
    amountAtomic: "100000",
    expiresAt: Date.now() + 60_000,
    method: "usdc",
    destination: maybeDestination,
  }),
  settle: async () => "0xabc",
  confirm: async () => "success",
};

// ── SettleConfig is the normalized STORED form, not an option bag. Building it by
// ── hand skips the validation createSettleConfig performs, so it stays strict on
// ── purpose. If this ever stops erroring, that decision was reverted by accident.
// @ts-expect-error construct a SettleConfig through createSettleConfig, not by hand
export const handBuilt: SettleConfig = { getSigner, methods: [], destination: maybeDestination };

// ── What each status guarantees, so a consumer's branch never null-checks.
export function narrowing(state: CheckoutState) {
  if (state.status === "awaiting_payment") {
    const bound: { quote: Quote; destination: Destination } = state;
    return bound;
  }
  if (state.status === "settled") {
    const hash: `0x${string}` = state.txHash;
    return hash;
  }
  return undefined;
}

// ── Everything above is an assignability check, which cannot catch a public type
// ── widening or collapsing to `any`. The rest of this file is identity, and is
// ── deliberately limited to the surfaces a consumer branches on. See
// ── `type-assertions.ts` for why the two kinds are not interchangeable.

// ── Adding a status is a breaking change for anyone with an exhaustive switch.
// ── It should cost a line here, so it is never accidental.
export type _Statuses = Expect<
  Equal<
    CheckoutState["status"],
    "idle" | "quoting" | "awaiting_payment" | "settling" | "settled" | "failed"
  >
>;

// ── Same argument, for the code a consumer maps to a user-facing sentence.
export type _ErrorCodes = Expect<
  Equal<
    SettleErrorCode,
    | "insufficient_usdc"
    | "quote_expired"
    | "wallet_rejected"
    | "wallet_unavailable"
    | "wrong_network"
    | "transfer_failed"
    | "invalid_config"
  >
>;

// ── The guarantee the narrowing test above relies on, stated exactly: in this
// ── state both fields are present and neither is optional. An assignment would
// ── still pass if `quote` gained `| undefined`.
export type _AwaitingPayment = Expect<
  Equal<
    Extract<CheckoutState, { status: "awaiting_payment" }>,
    { status: "awaiting_payment"; quote: Quote; destination: Destination }
  >
>;

// ── A settled checkout always has a hash, and it stays branded through
// ── declaration emit. If this became `string`, `0x${string}` or `any`, the
// ── brand tests would still pass and consumers would silently lose the
// ── guarantee that a hash cannot land in a payee position.
export type _SettledHash = Expect<
  Equal<Extract<CheckoutState, { status: "settled" }>["txHash"], TxHash>
>;

// ── Third parties implement this. Adding a required member breaks every
// ── existing adapter, so it is worth a deliberate edit.
export type _AdapterSurface = Expect<
  Equal<keyof SettleAdapter, "id" | "quote" | "settle" | "confirm">
>;

// ── The object a host holds for the life of a checkout. Removing a member here
// ── breaks call sites that no type test would otherwise visit.
export type _ManagerSurface = Expect<
  Equal<
    keyof CheckoutManager,
    "getState" | "subscribe" | "selectMethod" | "pay" | "retryConfirmation" | "reset"
  >
>;

// ── The signer is the one interface a host must satisfy to use the SDK at all.
// ── It is also the narrowest part of the design: `{ to, data }` is EVM calldata
// ── and does not survive a UTXO or instruction-based chain. Pinning the shape
// ── keeps that limitation explicit rather than letting it drift.
export type _SignerSurface = Expect<
  Equal<keyof PaymentSigner, "address" | "sendTransaction" | "getChainId">
>;
