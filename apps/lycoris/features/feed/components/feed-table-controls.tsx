"use client";

import { Button } from "@repo/ui/components/button";
import { cn } from "@repo/ui/lib/utils";
import { ChevronLeft, ChevronRight, FileText } from "lucide-react";

export type Filter = "all" | "approved" | "rejected";

const filters: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Blocked" },
];

export const PAGE_SIZE = 10;

export function FeedToolbar({
  filter,
  onFilter,
  onExport,
  empty,
}: {
  filter: Filter;
  onFilter: (filter: Filter) => void;
  onExport: () => void;
  empty: boolean;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <div className="flex gap-0.5 rounded-lg border border-border bg-muted/60 p-0.5">
        {filters.map((f) => (
          <Button
            key={f.id}
            variant="ghost"
            size="sm"
            onClick={() => onFilter(f.id)}
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
      <Button variant="outline" size="sm" className="ml-auto" onClick={onExport} disabled={empty}>
        <FileText className="size-4" />
        Export
      </Button>
    </div>
  );
}

export function FeedPagination({
  start,
  count,
  currentPage,
  totalPages,
  onPage,
}: {
  start: number;
  count: number;
  currentPage: number;
  totalPages: number;
  onPage: (page: number) => void;
}) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border pt-4 text-sm text-muted-foreground">
      <span>
        Showing{" "}
        <span className="font-semibold text-foreground">
          {start + 1}-{Math.min(start + PAGE_SIZE, count)}
        </span>{" "}
        of {count}
      </span>
      <div className="ml-auto flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage === 1}
          className="gap-2 text-muted-foreground"
          onClick={() => onPage(currentPage - 1)}
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
            onClick={() => onPage(pageNumber)}
          >
            {pageNumber}
          </Button>
        ))}
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage === totalPages}
          className="gap-2 text-foreground"
          onClick={() => onPage(currentPage + 1)}
        >
          Next
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
