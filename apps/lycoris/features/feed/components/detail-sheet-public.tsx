"use client";

import { Badge } from "@repo/ui/components/badge";
import { SheetHeader, SheetTitle } from "@repo/ui/components/sheet";
import type { AttestationRow } from "@/server/attestations";
import { CopyHex } from "./copy-hex";

const SCOPE_BOUNDARY =
  "The USDC transfer is still public — this hides the compliance book, not the payment.";

export function PublicDetailSheet({ row }: { row: Extract<AttestationRow, { role: "public" }> }) {
  const timeStr = new Date(row.timestamp * 1000).toLocaleString(undefined, {
    dateStyle: "short",
    timeStyle: "short",
  });

  return (
    <>
      <SheetHeader className="mb-6 p-0 pr-14">
        <SheetTitle className="flex items-center gap-2">
          Commitment
          {row.legacy ? (
            <Badge variant="outline" className="text-muted-foreground">
              legacy plaintext
            </Badge>
          ) : null}
        </SheetTitle>
        <p className="font-mono text-sm text-muted-foreground">{timeStr}</p>
      </SheetHeader>

      {row.commitment ? (
        <CopyHex value={row.commitment} label="Commitment" />
      ) : (
        <p className="font-mono text-xs text-muted-foreground">No commitment</p>
      )}

      {row.legacy ? (
        <p className="mt-4 text-sm text-destructive">
          This row predates V2 and was published in plaintext.
        </p>
      ) : null}

      <p className="mt-4 text-sm text-muted-foreground">{SCOPE_BOUNDARY}</p>

      {row.attestationTxUrl ? (
        <a
          href={row.attestationTxUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 font-mono text-xs text-primary hover:underline"
        >
          attestation tx ↗
        </a>
      ) : null}
    </>
  );
}
