"use client";

import { Decision } from "@repo/shared/types";

import { Badge } from "@repo/ui/components/badge";
import { TableCell, TableRow } from "@repo/ui/components/table";
import { CheckCircle2, ChevronRight, X } from "lucide-react";
import { formatUsdc } from "@/lib/format";
import type { AttestationRow } from "@/server/attestations";

export function truncateHex(hex: string, head = 10, tail = 6): string {
  if (!hex) return "—";
  if (hex.length <= head + tail + 1) return hex;
  return `${hex.slice(0, head)}…${hex.slice(-tail)}`;
}

export function rowKey(row: AttestationRow, index: number): string {
  if (row.role === "public") {
    return `${row.attestationTx || row.commitment || row.timestamp}-${index}`;
  }
  return row.paymentHash;
}

function TimeCell({ timestamp }: { timestamp: number }) {
  const timeStr = new Date(timestamp * 1000).toLocaleString(undefined, {
    dateStyle: "short",
    timeStyle: "short",
  });
  return (
    <TableCell className="font-mono text-xs whitespace-nowrap text-muted-foreground">
      {timeStr}
    </TableCell>
  );
}

export function PublicFeedRow({
  row,
  index,
  onSelect,
}: {
  row: AttestationRow;
  index: number;
  onSelect: (row: AttestationRow) => void;
}) {
  return (
    <TableRow key={rowKey(row, index)} className="cursor-pointer" onClick={() => onSelect(row)}>
      <TimeCell timestamp={row.timestamp} />
      <TableCell className="font-mono text-xs">
        <span className="inline-flex flex-wrap items-center gap-2">
          {row.commitment ? truncateHex(row.commitment) : "—"}
          {row.legacy ? (
            <Badge variant="outline" className="text-muted-foreground">
              legacy plaintext
            </Badge>
          ) : null}
        </span>
      </TableCell>
      <TableCell>
        {row.attestationTxUrl ? (
          <a
            href={row.attestationTxUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(event) => event.stopPropagation()}
            className="font-mono text-xs text-primary hover:underline"
          >
            {truncateHex(row.attestationTx, 8, 4)} ↗
          </a>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
    </TableRow>
  );
}

export function DisclosedFeedRow({
  row,
  index,
  agentName,
  onSelect,
}: {
  row: Extract<AttestationRow, { role: "auditor" | "institution" }>;
  index: number;
  agentName?: string;
  onSelect: (row: AttestationRow) => void;
}) {
  const approved = row.decision === Decision.Approved;

  return (
    <TableRow key={rowKey(row, index)} className="cursor-pointer" onClick={() => onSelect(row)}>
      <TimeCell timestamp={row.timestamp} />
      <TableCell className="text-xs font-medium">
        {agentName ?? <span className="text-muted-foreground">unknown</span>}
      </TableCell>
      <TableCell className="text-right font-mono text-xs">${formatUsdc(row.amountUsdc)}</TableCell>
      <TableCell className="hidden text-center sm:table-cell">
        {row.identityStatus !== 0 ? (
          <CheckCircle2 className="mx-auto size-4 text-success" />
        ) : (
          <X className="mx-auto size-4 text-destructive" />
        )}
      </TableCell>
      <TableCell>
        <Badge
          variant={approved ? "secondary" : "destructive"}
          className={approved ? "text-success" : undefined}
        >
          <span className="size-1.5 rounded-full bg-current" />
          {approved ? "Approved" : "Blocked"}
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        <ChevronRight className="ml-auto size-4 text-muted-foreground" />
      </TableCell>
    </TableRow>
  );
}
