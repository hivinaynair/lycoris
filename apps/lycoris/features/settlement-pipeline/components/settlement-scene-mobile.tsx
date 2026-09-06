"use client";

import { cn } from "@repo/ui/lib/utils";
import { motion } from "framer-motion";
import { Bot } from "lucide-react";
import type { ReactNode } from "react";
import { gateState, latestAgentReasoning, settlementGates } from "../lib/settlement-gates";
import { AgentSplineModel } from "./agent-spline-model";
import { MobileStepRow } from "./settlement-gate-ui";

export function SceneAgentBar({
  agentLabel,
  agentStatus,
  tone,
  meta,
  action,
  className,
}: {
  agentLabel: string;
  agentStatus: string;
  tone: string;
  meta: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3 border-border", className)}>
      <div className="grid size-8 shrink-0 place-items-center rounded-sm bg-muted text-muted-foreground sm:size-9">
        <Bot className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          <span className="text-sm font-semibold text-foreground">{agentLabel}</span>
          <span
            className={cn(
              "inline-flex items-center rounded-[2px] px-1.5 py-0.5 text-[10px] font-semibold sm:px-2 sm:text-[11px]",
              tone,
            )}
          >
            {agentStatus}
          </span>
        </div>
        <p className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground sm:mt-1 sm:text-[11px] sm:text-xs">
          {meta}
        </p>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function MobileSettlementScene({
  agentReasoning,
  amountLabel,
  activeStep,
  running,
  approved,
  rejectedReason,
  verticalBarClass,
}: {
  agentReasoning?: string;
  amountLabel: string;
  activeStep: number;
  running: boolean;
  approved: boolean;
  rejectedReason?: string;
  verticalBarClass: string;
}) {
  const latestReasoning = latestAgentReasoning(agentReasoning);

  return (
    <div className="flex flex-col sm:hidden">
      <div className="relative h-44 overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_65%,color-mix(in_srgb,var(--primary)_28%,transparent)_0%,transparent_70%)]" />
        <AgentSplineModel />
        <div className="absolute right-3 bottom-3 left-3 rounded-md border border-border bg-card px-3 py-2">
          <p className="font-mono text-[9px] leading-[1.45] text-muted-foreground">
            {latestReasoning || "I'm ready to make the payment!"}
          </p>
        </div>
      </div>

      <div className="relative">
        <div className="absolute top-[28px] bottom-[28px] left-[38px] w-px bg-border" />
        <motion.div
          className={cn("absolute top-[28px] left-[38px] w-px origin-top", verticalBarClass)}
          initial={false}
          animate={{ scaleY: Math.max(0, (activeStep - 1) / Math.max(settlementGates.length, 1)) }}
          style={{ height: "calc(100% - 56px)" }}
          transition={{ duration: 0.55, ease: [0.2, 0, 0, 1] }}
        />

        {settlementGates.map((gate, index) => (
          <MobileStepRow
            key={gate.key}
            state={gateState(index, activeStep, approved, running, rejectedReason)}
            icon={gate.icon}
            name={gate.name}
            amountLabel={amountLabel}
          />
        ))}
      </div>
    </div>
  );
}
