export type { DecisionRecord } from "@settle-kit/agents";
export { getDecisionRecord } from "@settle-kit/agents";

export function failureGateForReason(
  reason?: string,
): "identity" | "mandate" | "settlement" | undefined {
  if (!reason) return undefined;
  if (reason === "identity_not_found") return "identity";
  if (reason.startsWith("mandate_")) return "mandate";
  return "settlement";
}
