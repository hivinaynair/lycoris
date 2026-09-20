import type { Address } from "@settle-kit/core";

/** Decoded x402 payment-required terms. Absent fields were not provided by the server. */
export type ResourceChallenge = {
  scheme?: string | undefined;
  network?: string | undefined;
  maxAmountRequired?: string | undefined;
  resource?: string | undefined;
  description?: string | undefined;
  error?: string | undefined;
};

export type ResourceQuote = {
  amountAtomic: string;
  /** Payee from the challenge, when the server named one. */
  payTo?: Address;
  challenge: ResourceChallenge;
};

export type AgentPaymentResult = {
  httpStatus: number;
  body: unknown;
  txHash?: string | undefined;
  authorizationNonce?: string | undefined;
  /** Challenge error, or an upstream error body. */
  error?: string | undefined;
  basescan?: string | undefined;
  challenge?: ResourceChallenge | undefined;
};

export type PaidFetchScheme = {
  network: string;
  client: unknown;
  x402Version?: number | undefined;
};
