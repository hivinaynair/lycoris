"use client";

import { Sheet, SheetContent } from "@repo/ui/components/sheet";
import type { AttestationRow } from "@/server/attestations";
import { PublicDetailSheet } from "./detail-sheet-public";
import { DisclosedDetailSheet } from "./disclosed-detail-sheet";

type DetailSheetProps = {
  open: boolean;
  onClose: () => void;
  row: AttestationRow | null;
};

export function DetailSheet({ open, onClose, row }: DetailSheetProps) {
  if (!row) return null;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full overflow-y-auto p-6 sm:max-w-md">
        {row.role === "public" ? (
          <PublicDetailSheet row={row} />
        ) : (
          <DisclosedDetailSheet row={row} />
        )}
      </SheetContent>
    </Sheet>
  );
}
