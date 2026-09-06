"use client";

import { Decision } from "@repo/shared/types";
import { Badge } from "@repo/ui/components/badge";
import { Separator } from "@repo/ui/components/separator";
import { SheetHeader, SheetTitle } from "@repo/ui/components/sheet";
import { TracePanel } from "@/components/trace-panel";
import { buildFeedTraceSteps } from "@/features/feed/lib/build-feed-trace-steps";
import { formatUsdc, truncateAddress } from "@/lib/format";
import type { AttestationRow } from "@/server/attestations";
import { CopyHex } from "./copy-hex";
import { VerifyCommitment } from "./verify-commitment";

type DisclosedRow = Extract<AttestationRow, { role: "auditor" | "institution" }>;

export function DisclosedDetailSheet({ row }: { row: DisclosedRow }) {
  const approved = row.decision === Decision.Approved;
  const amountUsd = formatUsdc(row.amountUsdc);
  const steps = buildFeedTraceSteps(row);
  const settlementTx = row.role === "institution" ? row.settlementTx : null;
  const settlementTxUrl = row.role === "institution" ? row.settlementTxUrl : "";

  return (
    <>
      <SheetHeader className="mb-6 p-0 pr-14">
        <SheetTitle className="flex items-center gap-2">
          Transaction
          <Badge variant={approved ? "outline" : "destructive"}>
            {approved ? "approved" : "rejected"}
          </Badge>
        </SheetTitle>
        <p className="font-mono text-sm text-muted-foreground">
          {truncateAddress(row.payer)} · ${amountUsd}
        </p>
      </SheetHeader>

      <TracePanel steps={steps} />

      <Separator className="my-4 -mx-6 w-auto" />

      <VerifyCommitment
        key={row.paymentHash}
        paymentHash={row.paymentHash}
        payer={row.payer}
        amountUsdc={row.amountUsdc}
        policyMaxAmountUsdc={row.policyMaxAmountUsdc}
        identityStatus={row.identityStatus}
        decision={row.decision}
        rejectionReason={row.rejectionReason}
        salt={row.commitmentSalt}
        commitment={row.commitment}
      />

      {row.role === "institution" ? (
        <div className="mt-4 flex flex-col gap-3">
          {row.commitmentSalt ? (
            <CopyHex value={row.commitmentSalt} label="Salt" />
          ) : (
            <p className="text-xs text-muted-foreground">No salt (legacy)</p>
          )}
          <CopyHex value={row.paymentHash} label="paymentHash" />
          {settlementTx && settlementTxUrl ? (
            <a
              href={settlementTxUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-xs text-primary hover:underline"
            >
              settlement tx ↗
            </a>
          ) : null}
          <details className="mt-1">
            <summary className="cursor-pointer text-sm text-muted-foreground">
              decisionRecord
            </summary>
            <pre className="mt-2 overflow-x-auto font-mono text-xs">
              {JSON.stringify(
                row.decisionRecord,
                (_key, value) => (typeof value === "bigint" ? value.toString() : value),
                2,
              )}
            </pre>
          </details>
        </div>
      ) : null}

      <div className="mt-4 flex flex-col gap-2 text-xs text-muted-foreground">
        <p className="italic">
          AP2 mandate verified off-chain. In production, mandates are enforced as a native
          authorization primitive.
        </p>
        {row.attestationTx ? (
          <a
            href={row.attestationTxUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-primary hover:underline"
          >
            attestation tx ↗
          </a>
        ) : null}
      </div>
    </>
  );
}
