import type { HexAddress } from "@settle-kit/core";

/** A decoded x402 challenge. Absent and undefined mean the same thing: the server did not say. */
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
  /** Absent when the challenge named no recipient. */
  payTo?: HexAddress;
  challenge: ResourceChallenge;
};

export type AgentPaymentResult = {
  httpStatus: number;
  body: unknown;
  txHash?: string | undefined;
  authorizationNonce?: string | undefined;
  /** The challenge error, else an upstream error body. Read this instead of re-deriving. */
  error?: string | undefined;
  basescan?: string | undefined;
  challenge?: ResourceChallenge | undefined;
};

export type PaidFetchScheme = {
  network: string;
  client: unknown;
  x402Version?: number;
};
