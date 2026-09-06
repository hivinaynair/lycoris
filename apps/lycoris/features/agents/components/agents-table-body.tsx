"use client";

import { cn } from "@repo/ui/lib/utils";
import { AlertTriangle, Bot } from "lucide-react";
import { truncateAddress } from "@/lib/format";
import type { AgentsTableRow } from "./agents-table-types";

const statusStyles: Record<AgentsTableRow["status"], string> = {
  Trusted: "border-success/25 bg-success/8 text-success",
  "Mandate capped": "border-warning/25 bg-warning/8 text-warning",
  "Expired mandate": "border-warning/25 bg-warning/8 text-warning",
  Unregistered: "border-border bg-muted text-muted-foreground",
};

function StatusPill({ status }: { status: AgentsTableRow["status"] }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold",
        statusStyles[status],
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}

function AgentIcon({ agent }: { agent: AgentsTableRow }) {
  const warning = agent.status === "Expired mandate" || agent.status === "Unregistered";

  return (
    <span
      className={cn(
        "grid size-9 place-items-center rounded-[2px] bg-muted text-muted-foreground",
        warning && "text-destructive",
      )}
    >
      {warning ? <AlertTriangle className="size-4" /> : <Bot className="size-4" />}
    </span>
  );
}

export function AgentsTableBody({ agents }: { agents: AgentsTableRow[] }) {
  return (
    <div className="overflow-x-auto px-3 pt-1">
      <table className="w-full min-w-[960px] border-collapse">
        <thead>
          <tr className="border-b border-border text-left font-mono text-[0.68rem] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
            <th className="px-3 py-4">Agent</th>
            <th className="px-3 py-4">Wallet</th>
            <th className="px-3 py-4">ERC-8004</th>
            <th className="px-3 py-4">Delegator</th>
            <th className="px-3 py-4 text-right">Mandate</th>
            <th className="px-3 py-4">Expiry</th>
            <th className="px-3 py-4">Status</th>
          </tr>
        </thead>
        <tbody>
          {agents.map((agent) => (
            <tr
              key={agent.address}
              className="border-b border-border text-sm transition-colors hover:bg-muted/40"
            >
              <td className="px-3 py-4">
                <div className="flex items-center gap-3">
                  <AgentIcon agent={agent} />
                  <span>
                    <span className="block font-semibold text-foreground">{agent.name}</span>
                    <span className="mt-1 block font-mono text-xs text-muted-foreground">
                      #{agent.agentId}
                    </span>
                  </span>
                </div>
              </td>
              <td className="px-3 py-4 font-mono text-muted-foreground">
                {truncateAddress(agent.address)}
              </td>
              <td className="px-3 py-4 font-mono text-muted-foreground">{agent.erc8004}</td>
              <td className="px-3 py-4 font-mono text-muted-foreground">
                {truncateAddress(agent.delegatorAddress)}
              </td>
              <td className="px-3 py-4 text-right font-mono text-foreground">
                {agent.maxAmountUsdc}
              </td>
              <td
                className={cn(
                  "px-3 py-4 font-mono text-muted-foreground",
                  agent.status === "Expired mandate" && "text-destructive",
                )}
              >
                {agent.expiry}
              </td>
              <td className="px-3 py-4">
                <StatusPill status={agent.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {agents.length === 0 ? (
        <div className="px-3 py-12 text-center text-sm text-muted-foreground">
          No agents match your search.
        </div>
      ) : null}
    </div>
  );
}
