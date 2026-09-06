import { Decision } from "@repo/shared/types";
import { formatUsdc } from "@/lib/format";
import type { ViewerRole } from "@/server/attestation-view";
import type { AttestationRow } from "@/server/attestations";

export function isDisclosed(
  row: AttestationRow,
): row is Extract<AttestationRow, { role: "auditor" | "institution" }> {
  return row.role === "auditor" || row.role === "institution";
}

export function buildFeedCsv(
  rows: AttestationRow[],
  role: ViewerRole,
  agentNames: Record<string, string>,
) {
  const escapeCsv = (value: string) => `"${value.replaceAll('"', '""')}"`;
  const header =
    role === "institution"
      ? [
          "time",
          "agent",
          "payer",
          "amount_usdc",
          "identity",
          "decision",
          "settlement_tx",
          "attestation_tx",
        ]
      : ["time", "agent", "payer", "amount_usdc", "identity", "decision", "attestation_tx"];

  const lines = rows.filter(isDisclosed).map((row) => {
    const approved = row.decision === Decision.Approved;
    const agentName = agentNames[row.payer.toLowerCase()] ?? "unknown";
    const cells = [
      new Date(row.timestamp * 1000).toISOString(),
      agentName,
      row.payer,
      formatUsdc(row.amountUsdc),
      row.identityStatus !== 0 ? "verified" : "unknown",
      approved ? "approved" : "blocked",
    ];
    if (row.role === "institution") cells.push(row.settlementTx ?? "");
    cells.push(row.attestationTx);
    return cells.map((value) => escapeCsv(String(value))).join(",");
  });

  return [header.join(","), ...lines].join("\n");
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
