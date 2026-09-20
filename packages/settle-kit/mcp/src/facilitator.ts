export type { DecisionRecord, PreclearInput, PreclearResult } from "@settle-kit/agents";
export { getDecisionRecord, preclear } from "@settle-kit/agents";

export function failureGateForReason(
  reason?: string,
): "identity" | "mandate" | "settlement" | undefined {
  if (!reason) return undefined;
  if (reason === "identity_not_found") return "identity";
  if (reason === "held" || reason === "approval_required" || reason.startsWith("mandate_")) {
    return "mandate";
  }
  return "settlement";
}

export function isHeldReason(reason: string): boolean {
  return (
    reason === "held" || reason === "approval_required" || reason === "mandate_amount_exceeded"
  );
}
