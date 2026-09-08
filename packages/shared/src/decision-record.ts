import { DEMO_REPORT_ROUTES, failureGateForReason } from "./demo.js";
import { Decision, type DecisionRecord, type IdentityStatus, type SignedMandate } from "./types.js";

export function formatUsdcAtomic(amount: bigint) {
  const whole = amount / 1_000_000n;
  const fraction = amount % 1_000_000n;
  if (fraction === 0n) return whole.toString();
  return `${whole}.${fraction.toString().padStart(6, "0").replace(/0+$/, "")}`;
}

export function routeFromResource(resource: unknown, amountAtomic: bigint) {
  let path: string | undefined;
  if (typeof resource === "string") {
    try {
      path = new URL(resource, "http://local.invalid").pathname;
    } catch {
      path = undefined;
    }
  }
  const known = path ? DEMO_REPORT_ROUTES.find((route) => route.path === path) : undefined;
  return {
    path: known?.path ?? path ?? "unknown",
    price: known?.priceLabel ?? `$${formatUsdcAtomic(amountAtomic)}`,
  };
}

export function buildDecisionRecord({
  agentId,
  amountAtomic,
  decision,
  identityStatus,
  mandate,
  payer,
  paymentHash,
  resource,
  rejectionReason,
  settlementTxHash,
  attestationTxHash,
  authorizationNonce,
}: {
  agentId?: bigint | string;
  amountAtomic: bigint;
  decision: Decision;
  identityStatus: IdentityStatus;
  mandate?: SignedMandate;
  payer?: string;
  paymentHash?: string;
  resource?: unknown;
  rejectionReason?: string;
  settlementTxHash?: string;
  attestationTxHash?: string | null;
  authorizationNonce?: string | null;
}): DecisionRecord {
  const rejected = decision === Decision.Rejected;
  return {
    agentId: agentId?.toString() ?? "unknown",
    payer,
    paymentHash,
    authorizationNonce: authorizationNonce ?? undefined,
    route: routeFromResource(resource, amountAtomic),
    amountUsdc: formatUsdcAtomic(amountAtomic),
    mandate: {
      source: "x-ap2-mandate-header",
      delegator: mandate?.payload.delegator ?? "unknown",
      maxAmountUsdc: mandate?.payload.maxAmountUsdc.toString() ?? "unknown",
      valid: !rejectionReason?.startsWith("mandate_"),
    },
    identityStatus,
    failureGate: rejected ? failureGateForReason(rejectionReason) : undefined,
    rejectionReason,
    settlementTxHash,
    attestationTxHash: attestationTxHash ?? undefined,
  };
}

/** Whole-USDC mandate cap from a stored decision record, as atomic USDC. */
export function mandateMaxAtomicFromDecisionRecord(record: unknown): bigint {
  if (!record || typeof record !== "object" || !("mandate" in record)) return 0n;
  const mandate = record.mandate;
  if (!mandate || typeof mandate !== "object" || !("maxAmountUsdc" in mandate)) return 0n;
  const raw = mandate.maxAmountUsdc;
  if (typeof raw !== "string" || raw === "unknown") return 0n;
  const match = /^(0|[1-9]\d*)(?:\.(\d{1,6}))?$/.exec(raw.trim());
  if (!match) return 0n;
  const fraction = (match[2] ?? "").padEnd(6, "0");
  return BigInt(match[1] ?? "0") * 1_000_000n + BigInt(fraction);
}
