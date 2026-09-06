export enum DemoAgentName {
  AGENT_1 = "lycoris-agent-1",
  AGENT_2 = "lycoris-agent-2",
  AGENT_3 = "lycoris-agent-3",
  GHOST = "lycoris-agent-ghost",
}

export type ReportRouteId = "basic" | "premium";

// The compliance decision as the facilitator records it off chain. AttestationRegistryV2 publishes
// only a commitment, so these values never reach the event — they live in the decision record.
export enum IdentityStatus {
  NotFound = 0,
  Verified = 1,
  Flagged = 2,
}

export enum Decision {
  Approved = 0,
  Rejected = 1,
}

export type AgentProfile = {
  agentId: bigint;
  wallet: `0x${string}`;
  agentURI: string;
};

export type MandatePayload = {
  agent: `0x${string}`;
  delegator: `0x${string}`;
  maxAmountUsdc: bigint;
  expiry: bigint;
  nonce: bigint;
};

export type SignedMandate = {
  payload: MandatePayload;
  signature: `0x${string}`;
};

export type DecisionProof = {
  agentId: string;
  payer?: string;
  paymentHash?: string;
  authorizationNonce?: string;
  route: { path: string; price: string };
  mandate: {
    source: "x-ap2-mandate-header";
    delegator: string;
    maxAmountUsdc: string;
    valid: boolean;
  };
  policy: {
    maxAmountUsdc: string;
    decision: "approved" | "rejected";
  };
  failureGate?: "identity" | "mandate" | "settlement" | "attestation";
  rejectionReason?: string;
  settlementTxHash?: string;
  attestationTxHash?: string;
};

export type DecisionRecord = DecisionProof & {
  amountUsdc: string;
  identityStatus: IdentityStatus;
};

export type RawMandate = {
  agentId: string;
  domain: { name: string; version: string; chainId: number };
  types: { MandatePayload: Array<{ name: string; type: string }> };
  payload: {
    agent: string;
    delegator: string;
    maxAmountUsdc: string;
    expiry: string;
    nonce: string;
  };
  signature: string;
};

export type X402Challenge = {
  scheme?: string;
  network?: string;
  maxAmountRequired?: string;
  resource?: string;
  description?: string;
  error?: string;
};
