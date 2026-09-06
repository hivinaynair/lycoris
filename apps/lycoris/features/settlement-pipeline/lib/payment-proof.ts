import { cleanRejectionReason } from "@/lib/settlement-status";
import type { DemoAgent, TriggerResult } from "./payment-demo";
import { fallbackRouteForAgent } from "./payment-demo";

export function buildProofBundle(result: TriggerResult | null, selectedAgent: DemoAgent) {
  const agent = result?.agent ?? selectedAgent;
  const route = result?.route ?? fallbackRouteForAgent(selectedAgent);

  if (result?.decisionProof) {
    return JSON.stringify(
      {
        ...result.decisionProof,
        settlementTxUrl: result.settlementTxUrl ?? null,
        attestationTxUrl: result.attestationTxUrl ?? null,
      },
      null,
      2,
    );
  }

  return JSON.stringify(
    {
      agentName: agent.id,
      payer: result?.payer ?? "pending run",
      agentURI: result?.agentUri ?? "pending run",
      route: route.path,
      amount: route.price,
      mandateLimit: agent.mandateLimit,
      mandateDelegator: result?.mandateDelegator ?? "pending run",
      mandateValid: result?.mandateValid ?? null,
      rejectionReason: cleanRejectionReason(result?.body?.error),
      forecast:
        result?.body?.willRainAt1Pm === undefined
          ? null
          : {
              willRainAt1Pm: result.body.willRainAt1Pm,
              rainProbabilityPercent: result.body.rainProbabilityPercent ?? null,
            },
      settlementTxHash: result?.settlementTxHash ?? null,
      settlementTxUrl: result?.settlementTxUrl ?? null,
      attestationTxHash: result?.attestationTxHash ?? null,
      attestationTxUrl: result?.attestationTxUrl ?? null,
    },
    null,
    2,
  );
}
