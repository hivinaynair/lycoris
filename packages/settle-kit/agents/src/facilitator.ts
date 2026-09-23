export type DecisionRecord = {
  agentId?: string;
  payer?: string;
  settlementTxHash?: string;
  authorizationNonce?: string;
  rejectionReason?: string;
  failureGate?: "identity" | "mandate" | "settlement" | "attestation";
  amountUsdc?: string;
  identityStatus?: number;
  attestationTxHash?: string;
  [key: string]: unknown;
};

/** Poll the facilitator for the decision record that follows a settlement. */
export async function getDecisionRecord(
  input: {
    facilitatorUrl: string | undefined;
    authorizationNonce?: string | undefined;
    payer: string;
    settlementTxHash?: string | undefined;
  },
  retries = 5,
  fetchImpl: typeof fetch = fetch,
): Promise<DecisionRecord | undefined> {
  const baseUrl = input.facilitatorUrl?.replace(/\/+$/, "");
  if (!baseUrl) return undefined;

  for (let i = 0; i < retries; i++) {
    const path = input.settlementTxHash
      ? `/decision-records/by-settlement/${input.settlementTxHash}`
      : input.authorizationNonce
        ? `/decision-records/by-auth-nonce/${encodeURIComponent(input.authorizationNonce)}`
        : `/decision-records/latest?payer=${encodeURIComponent(input.payer.toLowerCase())}`;
    const response = await fetchImpl(`${baseUrl}${path}`).catch(() => undefined);
    const body = response?.ok
      ? ((await response.json().catch(() => undefined)) as
          | { decisionRecord?: DecisionRecord | null }
          | undefined)
      : undefined;
    if (body?.decisionRecord) return body.decisionRecord;
    if (i < retries - 1) await new Promise((r) => setTimeout(r, 800));
  }
  return undefined;
}
