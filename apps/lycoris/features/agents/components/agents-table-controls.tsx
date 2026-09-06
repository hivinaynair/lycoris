"use client";

import { Input } from "@repo/ui/components/input";
import { Search } from "lucide-react";

export function AgentsTableToolbar({
  query,
  count,
  onQueryChange,
}: {
  query: string;
  count: number;
  onQueryChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <label
        htmlFor="agents-search"
        className="flex h-10 w-full items-center gap-3 rounded-none border border-input bg-background px-4 text-sm text-muted-foreground transition-colors focus-within:border-ring focus-within:ring-1 focus-within:ring-ring/50 sm:max-w-[280px]"
      >
        <Search className="size-4 shrink-0" />
        <Input
          id="agents-search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search name, wallet, ERC-8004 id..."
          className="h-auto min-w-0 flex-1 border-0 bg-transparent p-0 text-foreground placeholder:text-muted-foreground"
        />
      </label>
      <span className="ml-auto font-mono text-sm text-muted-foreground">
        {count} agent{count === 1 ? "" : "s"}
      </span>
    </div>
  );
}
