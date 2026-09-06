"use client";

import { Decision } from "@repo/shared/types";
import { Button } from "@repo/ui/components/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/components/table";
import { cn } from "@repo/ui/lib/utils";
import { ChevronLeft, ChevronRight, FileText } from "lucide-react";
import { parseAsInteger, useQueryState } from "nuqs";
import { useEffect, useState } from "react";
import type { ViewerRole } from "@/server/attestation-view";
import type { AttestationRow } from "@/server/attestations";
import { buildFeedCsv, downloadCsv, isDisclosed } from "../lib/feed-csv";
import { DetailSheet } from "./detail-sheet";
import { DisclosedFeedRow, PublicFeedRow } from "./feed-table-rows";

type FeedTableProps = {
  rows: AttestationRow[];
  agentNames?: Record<string, string>;
  role: ViewerRole;
};

type Filter = "all" | "approved" | "rejected";

const filters: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Blocked" },
];

const PAGE_SIZE = 10;

export function FeedTable({ rows, agentNames = {}, role }: FeedTableProps) {
  const [filter, setFilter] = useState<Filter>("all");
  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));
  const [selected, setSelected] = useState<AttestationRow | null>(null);

  useEffect(() => {
    setSelected(null);
    if (role === "public") setFilter("all");
  }, [role]);

  const filtered = rows.filter((r) => {
    if (role === "public" || !isDisclosed(r)) return true;
    if (filter === "approved") return r.decision === Decision.Approved;
    if (filter === "rejected") return r.decision !== Decision.Approved;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(Math.max(page, 1), totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const pagedRows = filtered.slice(start, start + PAGE_SIZE);
  const publicView = role === "public";
  const colSpan = publicView ? 3 : 6;

  function updateFilter(nextFilter: Filter) {
    setFilter(nextFilter);
    void setPage(1);
  }

  function updatePage(nextPage: number) {
    void setPage(Math.min(Math.max(nextPage, 1), totalPages));
  }

  return (
    <>
      {!publicView ? (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="flex gap-0.5 rounded-lg border border-border bg-muted/60 p-0.5">
            {filters.map((f) => (
              <Button
                key={f.id}
                variant="ghost"
                size="sm"
                onClick={() => updateFilter(f.id)}
                className={cn(
                  "h-auto rounded-[2px] px-3 py-1.5 text-[12.5px] font-medium",
                  filter === f.id
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {f.label}
              </Button>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="ml-auto"
            onClick={() =>
              downloadCsv(`lycoris-feed-${filter}.csv`, buildFeedCsv(filtered, role, agentNames))
            }
            disabled={filtered.length === 0}
          >
            <FileText className="size-4" />
            Export
          </Button>
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              {publicView ? (
                <>
                  <TableHead>Commitment</TableHead>
                  <TableHead>Attestation</TableHead>
                </>
              ) : (
                <>
                  <TableHead>Agent</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="hidden text-center sm:table-cell">Identity</TableHead>
                  <TableHead>Decision</TableHead>
                  <TableHead className="text-right">Proof</TableHead>
                </>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={colSpan}
                  className="py-8 text-center text-sm text-muted-foreground"
                >
                  No transactions yet — run a demo to generate one.
                </TableCell>
              </TableRow>
            )}
            {pagedRows.map((row, index) =>
              publicView || row.role === "public" ? (
                <PublicFeedRow
                  key={row.attestationTx}
                  row={row}
                  index={index}
                  onSelect={setSelected}
                />
              ) : (
                <DisclosedFeedRow
                  key={row.paymentHash}
                  row={row}
                  index={index}
                  agentName={agentNames[row.payer.toLowerCase()]}
                  onSelect={setSelected}
                />
              ),
            )}
          </TableBody>
        </Table>
      </div>

      {filtered.length > 0 ? (
        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border pt-4 text-sm text-muted-foreground">
          <span>
            Showing{" "}
            <span className="font-semibold text-foreground">
              {start + 1}-{Math.min(start + PAGE_SIZE, filtered.length)}
            </span>{" "}
            of {filtered.length}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              className="gap-2 text-muted-foreground"
              onClick={() => updatePage(currentPage - 1)}
            >
              <ChevronLeft className="size-4" />
              Prev
            </Button>
            {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
              <Button
                key={pageNumber}
                variant={pageNumber === currentPage ? "default" : "outline"}
                size="sm"
                className={cn(
                  "min-w-10 px-3 font-mono",
                  pageNumber === currentPage
                    ? "bg-foreground text-background hover:bg-foreground/90"
                    : "text-muted-foreground",
                )}
                onClick={() => updatePage(pageNumber)}
              >
                {pageNumber}
              </Button>
            ))}
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              className="gap-2 text-foreground"
              onClick={() => updatePage(currentPage + 1)}
            >
              Next
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      ) : null}

      <DetailSheet open={selected !== null} onClose={() => setSelected(null)} row={selected} />
    </>
  );
}
