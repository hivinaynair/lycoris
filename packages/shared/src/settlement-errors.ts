export const GATE_STEP = {
  AGENT_RESOLVED: 0,
  PAYMENT_SUBMITTED: 1,
  IDENTITY_CHECK: 2,
  MANDATE_CHECK: 3,
  SETTLEMENT: 4,
  ATTESTATION: 5,
} as const;

export const MANDATE_FAILURES = new Set([
  "mandate_missing",
  "mandate_invalid",
  "mandate_signature_invalid",
  "mandate_expired",
  "mandate_amount_exceeded",
  "mandate_insufficient_balance",
]);

export function isMandateFailure(error: unknown): boolean {
  return typeof error === "string" && (MANDATE_FAILURES.has(error) || error.startsWith("mandate_"));
}

/**
 * Returns the terminal gate step for a known facilitator rejection reason.
 * Gate numbering matches the settlement pipeline UI.
 * Returns 0 for unknown errors or no error.
 */
export function settlementFailureGate(error?: string | null): number {
  if (error === "insufficient_funds") return GATE_STEP.PAYMENT_SUBMITTED;
  if (error === "identity_not_found") return GATE_STEP.IDENTITY_CHECK;
  if (isMandateFailure(error)) return GATE_STEP.MANDATE_CHECK;
  if (
    error &&
    (error.startsWith("invalid_exact_evm_") ||
      error === "settlement_transaction_failed" ||
      error === "settlement_receipt_unconfirmed" ||
      error === "settlement_rejected")
  )
    return GATE_STEP.SETTLEMENT;
  return 0;
}
