"use client";

import { Decision } from "@repo/shared/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/components/table";
import { parseAsInteger, useQueryState } from "nuqs";
import { useEffect, useState } from "react";
import type { ViewerRole } from "@/server/attestation-view";
import type { AttestationRow } from "@/server/attestations";
import { buildFeedCsv, downloadCsv, isDisclosed } from "../lib/feed-csv";
import { DetailSheet } from "./detail-sheet";
import { FeedPagination, FeedToolbar, type Filter, PAGE_SIZE } from "./feed-table-controls";
import { DisclosedFeedRow, PublicFeedRow } from "./feed-table-rows";

type FeedTableProps = {
  rows: AttestationRow[];
  agentNames?: Record<string, string>;
  role: ViewerRole;
};

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

  function updateFilter(nextFilter: Filter) {
    setFilter(nextFilter);
    void setPage(1);
  }

  function updatePage(nextPage: number) {
    void setPage(Math.min(Math.max(nextPage, 1), totalPages));
  }

  return (
    <>
      {!publicView && (
        <FeedToolbar
          filter={filter}
          onFilter={updateFilter}
          onExport={() =>
            downloadCsv(`lycoris-feed-${filter}.csv`, buildFeedCsv(filtered, role, agentNames))
          }
          empty={filtered.length === 0}
        />
      )}

      <FeedRows
        rows={pagedRows}
        publicView={publicView}
        agentNames={agentNames}
        onSelect={setSelected}
      />

      {filtered.length > 0 && (
        <FeedPagination
          start={start}
          count={filtered.length}
          currentPage={currentPage}
          totalPages={totalPages}
          onPage={updatePage}
        />
      )}

      <DetailSheet open={selected !== null} onClose={() => setSelected(null)} row={selected} />
    </>
  );
}

function FeedRows({
  rows,
  publicView,
  agentNames,
  onSelect,
}: {
  rows: AttestationRow[];
  publicView: boolean;
  agentNames: Record<string, string>;
  onSelect: (row: AttestationRow) => void;
}) {
  const colSpan = publicView ? 3 : 6;
  return (
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
          {rows.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={colSpan}
                className="py-8 text-center text-sm text-muted-foreground"
              >
                No transactions yet — run a demo to generate one.
              </TableCell>
            </TableRow>
          )}
          {rows.map((row, index) =>
            publicView || row.role === "public" ? (
              <PublicFeedRow key={row.attestationTx} row={row} index={index} onSelect={onSelect} />
            ) : (
              <DisclosedFeedRow
                key={row.paymentHash}
                row={row}
                index={index}
                agentName={agentNames[row.payer.toLowerCase()]}
                onSelect={onSelect}
              />
            ),
          )}
        </TableBody>
      </Table>
    </div>
  );
}
