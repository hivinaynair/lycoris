import type { PaidFetchScheme } from "@settle-kit/agents";
import {
  type CheckoutState,
  createCheckout,
  createUsdcMethod,
  type Destination,
  type PaymentSigner,
  type Quote,
  type SettleAdapter,
} from "@settle-kit/core";
import type { PayInput, SettleAppConfig } from "@settle-kit/react";
import type { AgenticPaymentOptions } from "@settle-kit/server/next";

declare const getSigner: () => Promise<PaymentSigner>;
declare const maybeDestination: Destination | undefined;
declare const maybeString: string | undefined;
declare const maybeNumber: number | undefined;
declare const maybeMethod: SettleAdapter | undefined;

// Option bags accept `T | undefined`. Callers must not need a conditional spread.
export const manager = createCheckout({
  getSigner,
  destination: maybeDestination,
  method: maybeMethod,
  amount: "0.1",
});

export const method = createUsdcMethod({ quoteTtlMs: maybeNumber, now: undefined });

export const appConfig: SettleAppConfig = {
  appName: "Store",
  getSigner,
  destination: maybeDestination,
  method: maybeMethod,
};

export const payInput: PayInput = {
  amount: "0.1",
  destination: maybeDestination,
  title: maybeString,
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
    amount: "0.1",
    amountAtomic: "100000",
    expiresAt: Date.now() + 60_000,
    method: "usdc",
    destination: maybeDestination,
  }),
  settle: async () => "0xabc",
  confirm: async () => "success",
};

// Discriminated statuses: settling has quote+destination; settled has txHash.
export function narrowing(state: CheckoutState) {
  if (state.status === "settling") {
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
    amount: "0.1",
    amountAtomic: "100000",
    expiresAt: Date.now() + 60_000,
    method: "usdc-4337",
  }),
  settle: async () => "0xabc",
  confirm: async () => "success",
};
