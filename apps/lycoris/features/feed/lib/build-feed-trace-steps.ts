import { Decision } from "@repo/shared/types";
import { formatUsdc, truncateAddress } from "@/lib/format";
import type { TraceStep } from "@/lib/trace-steps";
import type { AttestationRow } from "@/server/attestations";

type DisclosedRow = Extract<AttestationRow, { role: "auditor" | "institution" }>;

function stepStatusFor(approved: boolean, identityOk: boolean, n: number): TraceStep["status"] {
  if (approved) return "approved";
  if (!identityOk && n === 2) return "rejected";
  if (!identityOk && n > 2) return "skipped";
  if (!approved && n === 3) return "rejected";
  if (!approved && n > 3) return "skipped";
  return "approved";
}

export function buildFeedTraceSteps(row: DisclosedRow): TraceStep[] {
  const approved = row.decision === Decision.Approved;
  const identityOk = row.identityStatus !== 0;
  const amountUsd = formatUsdc(row.amountUsdc);
  const settlementTx = row.role === "institution" ? row.settlementTx : null;
  const settlementTxUrl = row.role === "institution" ? row.settlementTxUrl : "";

  return [
    {
      id: 1,
      label: "402 Challenge",
      status: "approved",
      detail: `$${amountUsd}`,
    },
    {
      id: 2,
      label: "ERC-8004 Identity",
      status: stepStatusFor(approved, identityOk, 2),
      detail: `${truncateAddress(row.payer)} · ${identityOk ? "registered" : "not registered"}`,
    },
    {
      id: 3,
      label: "AP2 Mandate",
      status: stepStatusFor(approved, identityOk, 3),
    },
    {
      id: 4,
      label: "Settlement + Attestation",
      status: approved ? "approved" : "skipped",
      detail: settlementTx ? `${settlementTx.slice(0, 10)}…` : undefined,
      link: settlementTx ? { href: settlementTxUrl, label: "settlement tx" } : undefined,
      attestationLink: row.attestationTx
        ? { href: row.attestationTxUrl, label: "attestation tx" }
        : undefined,
    },
  ];
}
