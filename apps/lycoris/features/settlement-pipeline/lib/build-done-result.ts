import { BASE_SEPOLIA_EXPLORER } from "@repo/shared/chains";
import { getDecisionRecord } from "@repo/shared/facilitator";
import { gateStepsForResult } from "./gate-steps";
import type { PaidRunOutcome } from "./paid-run-outcome";

function explorerTxUrl(hash: string) {
  return `${BASE_SEPOLIA_EXPLORER}/tx/${hash}`;
}

export async function buildDoneResult(
  outcome: PaidRunOutcome,
  agentUrl: string,
  facilitatorUrl: string,
) {
  const decisionRecord = await getDecisionRecord({
    authorizationNonce: outcome.authorizationNonce,
    facilitatorUrl,
    payer: outcome.payer,
    settlementTxHash: outcome.settlementTxHash,
  });

  let error = outcome.error;
  let httpStatus = outcome.httpStatus;
  if (!error && decisionRecord?.rejectionReason) {
    error = decisionRecord.rejectionReason;
    if (!httpStatus || httpStatus < 400) httpStatus = 402;
  }

  return {
    error,
    gates: gateStepsForResult(error, outcome.settlementTxHash),
    attestationStep: Boolean(!error && decisionRecord?.attestationTxHash),
    result: {
      payer: outcome.payer,
      agentUri: `${agentUrl.replace(/\/+$/, "")}/api/agent/${outcome.payer}`,
      settlementTxHash: outcome.settlementTxHash,
      settlementTxUrl: outcome.settlementTxHash
        ? explorerTxUrl(outcome.settlementTxHash)
        : undefined,
      attestationTxHash: decisionRecord?.attestationTxHash,
      attestationTxUrl: decisionRecord?.attestationTxHash
        ? explorerTxUrl(decisionRecord.attestationTxHash)
        : undefined,
      httpStatus,
      error,
      authorizationNonce: outcome.authorizationNonce,
      rawMandate: outcome.rawMandate,
      x402Challenge: outcome.x402Challenge,
      proofLookupError: decisionRecord ? undefined : "decision_record_not_found",
      decisionProof: decisionRecord,
      body: error ? { error } : outcome.body,
    },
  };
}
