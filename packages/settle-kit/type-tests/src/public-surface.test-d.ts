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

// Option bags accept `T | undefined`. Callers must not need a conditional spread.
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

// Custom adapters may omit `destination` on the produced quote.
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

// SettleConfig is the validated result of createSettleConfig, not an option bag.
// @ts-expect-error construct a SettleConfig through createSettleConfig, not by hand
export const handBuilt: SettleConfig = { getSigner, methods: [], destination: maybeDestination };

// Discriminated statuses: awaiting_payment has quote+destination; settled has txHash.
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

export type PinnedAddress = import("@settle-kit/core").Address;
export type PinnedSettlementHash = import("@settle-kit/core").SettlementHash;

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

// Settlement is exclusive: transactionHash or userOpHash, never both.
export function readSettlement(settlement: import("@settle-kit/core").Settlement) {
  return settlement.userOpHash ? `op:${settlement.userOpHash}` : `tx:${settlement.transactionHash}`;
}
export const bothHashes: import("@settle-kit/core").Settlement = {
  transactionHash: "0xaaa",
  // @ts-expect-error a settlement carries one kind of hash, never both
  userOpHash: "0xbbb",
};
