export type PreclearResult = { ok: true } | { ok: false; reason: string };

export type PreclearInput = {
  facilitatorUrl: string;
  amountAtomic: string;
  mandateHeader: string;
  payer: string;
  resource: string;
};

export type DecisionRecord = {
  agentId?: string;
  payer?: string;
  settlementTxHash?: string;
  authorizationNonce?: string;
  rejectionReason?: string;
  failureGate?: "identity" | "mandate" | "settlement" | "attestation";
  amountUsdc?: string;
  identityStatus?: number;
  [key: string]: unknown;
};

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

export async function preclear(
  input: PreclearInput,
  fetchImpl: typeof fetch = fetch,
): Promise<PreclearResult> {
  const baseUrl = input.facilitatorUrl.replace(/\/+$/, "");
  const response = await fetchImpl(`${baseUrl}/preclear`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "X-AP2-Mandate": input.mandateHeader,
    },
    body: JSON.stringify({
      payer: input.payer,
      amountAtomic: input.amountAtomic,
      resource: input.resource,
    }),
  }).catch(() => undefined);

  if (!response?.ok) return { ok: false, reason: "facilitator_unreachable" };

  const body = (await response.json().catch(() => undefined)) as PreclearResult | undefined;
  if (!body || typeof body !== "object" || !("ok" in body)) {
    return { ok: false, reason: "facilitator_unreachable" };
  }
  return body;
}

export async function getDecisionRecord(
  input: {
    facilitatorUrl: string;
    authorizationNonce?: string | undefined;
    payer: string;
    settlementTxHash?: string | undefined;
  },
  retries = 5,
  fetchImpl: typeof fetch = fetch,
): Promise<DecisionRecord | undefined> {
  const baseUrl = input.facilitatorUrl.replace(/\/+$/, "");
  if (!baseUrl) return undefined;

  let path: string;
  if (input.settlementTxHash) {
    path = `/decision-records/by-settlement/${input.settlementTxHash}`;
  } else if (input.authorizationNonce) {
    path = `/decision-records/by-auth-nonce/${encodeURIComponent(input.authorizationNonce)}`;
  } else {
    path = `/decision-records/latest?payer=${encodeURIComponent(input.payer.toLowerCase())}`;
  }

  for (let i = 0; i < retries; i++) {
    const response = await fetchImpl(`${baseUrl}${path}`).catch(() => undefined);
    if (response?.ok) {
      const body = (await response.json().catch(() => undefined)) as
        | { decisionRecord?: DecisionRecord | null }
        | undefined;
      if (body?.decisionRecord) return body.decisionRecord;
    }
    if (i < retries - 1) await new Promise((r) => setTimeout(r, 800));
  }
  return undefined;
}
