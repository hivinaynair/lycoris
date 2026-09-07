export type ResourceChallenge = {
  scheme?: string;
  network?: string;
  maxAmountRequired?: string;
  resource?: string;
  description?: string;
  error?: string;
};

export type ResourceQuote = {
  amountAtomic: string;
  payTo: string;
  challenge: ResourceChallenge;
};

export type AgentPaymentResult = {
  httpStatus: number;
  body: unknown;
  txHash?: string;
  authorizationNonce?: string;
  paymentRequiredError?: string;
  basescan?: string;
  challenge?: ResourceChallenge;
};

export type PaidFetchScheme = {
  network: string;
  client: unknown;
  x402Version?: number;
};
