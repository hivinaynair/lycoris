import type { PaidFetchScheme } from "@settle-kit/agents";
import {
  type CheckoutState,
  createCheckout,
  createSettleConfig,
  createUsdcMethod,
  type Destination,
  type PaymentSigner,
  type Quote,
  type SettleAdapter,
  type SettleConfig,
} from "@settle-kit/core";
import type { BeginCheckoutInput, CheckoutCallbacks, SettleAppConfig } from "@settle-kit/react";
import type { AgenticPaymentOptions } from "@settle-kit/server/next";

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

// ── SettlementHash is public API. If this import breaks, the rename regressed.
export type PinnedSettlementHash = import("@settle-kit/core").SettlementHash;

// ── A second method is the point of the `methods` array. Until 4337 there was
// ── never one, and the literal `"usdc"` hid that the array could hold only one.
export const smartAccountAdapter: SettleAdapter = {
  id: "usdc-4337",
  quote: async (): Promise<Quote> => ({
    requestId: "q",
    amountUsdc: "0.1",
    amountAtomic: "100000",
    expiresAt: Date.now() + 60_000,
    method: "usdc-4337",
  }),
  settle: async () => "0xabc",
  confirm: async () => "success",
};

// ── Settlement discriminates on which key is present. A branded union could not:
// ── an unbranded hex string satisfies both arms, so nothing narrows.
export function readSettlement(settlement: import("@settle-kit/core").Settlement) {
  return settlement.userOpHash ? `op:${settlement.userOpHash}` : `tx:${settlement.transactionHash}`;
}
export const bothHashes: import("@settle-kit/core").Settlement = {
  transactionHash: "0xaaa",
  // @ts-expect-error a settlement carries one kind of hash, never both
  userOpHash: "0xbbb",
};
