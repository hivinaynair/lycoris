"use client";

import { cn } from "@repo/ui/lib/utils";
import { motion } from "framer-motion";
import { gateState, packetPosition, packetStops, settlementGates } from "../lib/settlement-gates";
import { AgentActor } from "./settlement-actor";
import { GateModule } from "./settlement-gate-ui";

export function DesktopSettlementScene({
  agentReasoning,
  amountLabel,
  activeStep,
  running,
  approved,
  rejectedReason,
  packetClass,
  packetLabelClass,
  horizontalBarClass,
}: {
  agentReasoning?: string;
  amountLabel: string;
  activeStep: number;
  running: boolean;
  approved: boolean;
  rejectedReason?: string;
  packetClass: string;
  packetLabelClass: string;
  horizontalBarClass: string;
}) {
  const packetLeft = packetPosition(activeStep, rejectedReason);
  const railStart = packetStops[1]!;
  const railEnd = packetStops[packetStops.length - 1]!;
  const railProgress = (packetLeft - railStart) / (railEnd - railStart);

  return (
    <div className="relative hidden h-56 overflow-hidden px-6 sm:block">
      <motion.div
        className="absolute top-[112px] z-20 -translate-x-1/2 -translate-y-1/2"
        initial={false}
        animate={{ left: `${packetLeft}%` }}
        transition={{ duration: 0.35, ease: [0.2, 0, 0, 1] }}
      >
        <div
          className={cn("rounded-[3px] border px-3 py-2 text-center backdrop-blur-md", packetClass)}
        >
          <p className={cn("font-mono text-[8px] font-bold uppercase", packetLabelClass)}>
            Payment
          </p>
          <p className="mt-0.5 font-mono text-xs font-semibold">{amountLabel}</p>
        </div>
      </motion.div>
      <div className="relative z-10 flex h-full w-full">
        <AgentActor reasoning={agentReasoning} />
        <div className="flex min-w-0 flex-1">
          <div className="w-10 shrink-0" aria-hidden />
          <div className="relative flex min-w-0 flex-1">
            <div className="pointer-events-none absolute top-[112px] right-[calc(100%/12)] left-[calc(100%/12)] h-px bg-border" />
            <motion.div
              className={cn(
                "pointer-events-none absolute top-[112px] left-[calc(100%/12)] h-px",
                horizontalBarClass,
              )}
              initial={false}
              animate={{
                width: `${Math.max(0, railProgress) * (100 - 100 / 6)}%`,
              }}
              transition={{ duration: 0.3, ease: [0.2, 0, 0, 1] }}
            />
            {settlementGates.map((gate, index) => (
              <GateModule
                key={gate.key}
                state={gateState(index, activeStep, approved, running, rejectedReason)}
                icon={gate.icon}
                label={gate.label}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
