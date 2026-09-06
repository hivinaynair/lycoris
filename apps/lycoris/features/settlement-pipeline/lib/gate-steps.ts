import { GATE_STEP, settlementFailureGate } from "@repo/shared/settlement-errors";

/**
 * Fallback gate numbers after x402Fetch resolves, if the live facilitator
 * progress feed did not already emit them.
 */
export function gateStepsForResult(
  responseError: string | undefined,
  settlementTxHash: string | undefined,
): number[] {
  if (!responseError && settlementTxHash) {
    return [GATE_STEP.IDENTITY_CHECK, GATE_STEP.MANDATE_CHECK, GATE_STEP.SETTLEMENT];
  }
  const failGate = settlementFailureGate(responseError);
  if (failGate === 0) return [];
  return Array.from({ length: failGate - 1 }, (_, i) => i + GATE_STEP.IDENTITY_CHECK);
}
