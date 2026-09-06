"use client";

import { Button } from "@repo/ui/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/select";
import { cn } from "@repo/ui/lib/utils";
import { demoAgents } from "@/lib/demo-scenarios";
import { SCENARIOS } from "../lib/payment-demo";

export function ScenarioPicker({
  selectedIndex,
  loading,
  onSelect,
}: {
  selectedIndex: number;
  loading: boolean;
  onSelect: (index: number) => void;
}) {
  return (
    <>
      <div className="sm:hidden">
        <Select
          value={String(selectedIndex)}
          onValueChange={(value) => onSelect(Number(value))}
          disabled={loading}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SCENARIOS.map((scenario, index) => {
              const agent = demoAgents.find((a) => a.id === scenario.agentName)!;
              return (
                <SelectItem key={scenario.slot} value={String(index)}>
                  <span className="flex items-center gap-2">
                    <span
                      className={cn(
                        "size-2 shrink-0 rounded-full",
                        agent.status === "approved" ? "bg-success" : "bg-destructive",
                      )}
                    />
                    {scenario.title}
                  </span>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      <div className="hidden w-fit max-w-full flex-wrap items-center gap-1 rounded-xl border border-border bg-card p-1 sm:inline-flex">
        <span className="px-2 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          Scenario
        </span>
        {SCENARIOS.map((scenario, index) => {
          const agent = demoAgents.find((a) => a.id === scenario.agentName)!;
          const selected = index === selectedIndex;
          return (
            <Button
              key={scenario.slot}
              variant="ghost"
              size="sm"
              disabled={loading}
              onClick={() => onSelect(index)}
              className={cn(
                "items-center justify-start gap-2 rounded-md text-left",
                selected
                  ? "bg-secondary font-medium text-foreground"
                  : "bg-transparent text-muted-foreground hover:text-foreground",
                loading && "cursor-not-allowed opacity-55",
              )}
            >
              <span
                className={cn(
                  "size-2 rounded-full bg-muted-foreground",
                  selected && agent.status === "approved" && "bg-success",
                  selected && agent.status !== "approved" && "bg-destructive",
                )}
              />
              {scenario.title}
            </Button>
          );
        })}
      </div>
    </>
  );
}
