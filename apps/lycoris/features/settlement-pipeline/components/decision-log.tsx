"use client";

import { cn } from "@repo/ui/lib/utils";
import { CheckCircle2, XCircle, Zap } from "lucide-react";
import { cleanRejectionReason, resultFailureStep } from "@/lib/settlement-status";
import type { TraceStep } from "@/lib/trace-steps";
import type { DemoAgent, DemoScenario, TriggerResult } from "../lib/payment-demo";
import { fallbackRouteForAgent } from "../lib/payment-demo";

function decisionStatus(
  step: number,
  activeStep: number,
  result: TriggerResult | null,
  running: boolean,
) {
  if (running) {
    if (activeStep > step) return "approved";
    if (activeStep === step) return "running";
    return "pending";
  }

  if (!result) return "pending";
  if (result.httpStatus === 200) return "approved";

  const failed = resultFailureStep(result);
  if (step < failed) return "approved";
  if (step === failed) return "rejected";
  return "skipped";
}

export function DecisionLog({
  result,
  running,
  activeStep,
  selectedAgent,
  selectedScenario,
  traceSteps,
  onStepClick,
}: {
  result: TriggerResult | null;
  running: boolean;
  activeStep: number;
  selectedAgent: DemoAgent;
  selectedScenario: DemoScenario;
  traceSteps?: TraceStep[];
  onStepClick?: (step: TraceStep) => void;
}) {
  const rows = decisionRows(result, selectedAgent, selectedScenario);
  const rejectedReason = cleanRejectionReason(result?.body?.error);

  if (!running && !result) {
    return (
      <div className="flex h-full min-h-52 flex-col justify-center rounded-sm border border-dashed border-border px-5 py-8 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Waiting for a run.</p>
        <p className="mt-2 leading-6">
          The settlement checks will appear here as the payment moves through the pipeline.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {rows.map((row) => (
        <DecisionRow
          key={row.label}
          row={row}
          activeStep={activeStep}
          result={result}
          running={running}
          traceSteps={traceSteps}
          onStepClick={onStepClick}
          rejectedReason={rejectedReason}
        />
      ))}
    </div>
  );
}

function decisionRows(
  result: TriggerResult | null,
  selectedAgent: DemoAgent,
  selectedScenario: DemoScenario,
) {
  const route = result?.route ?? fallbackRouteForAgent(selectedAgent);

  const rows = [
    {
      step: 0,
      label: "Agent request",
      detail: `${selectedScenario.displayAgent} requests ${route.path}`,
    },
    {
      step: 1,
      label: "x402 challenge",
      detail: `${route.price} payment requirement received`,
    },
    {
      step: 2,
      label: "Identity",
      detail: result?.agentUri ? `ERC-8004 URI ${result.agentUri}` : selectedAgent.id,
    },
    {
      step: 3,
      label: "Mandate",
      detail:
        result?.mandateValid === false
          ? "AP2 mandate rejected"
          : `Limit ${selectedAgent.mandateLimit}`,
    },
    {
      step: 4,
      label: "Settlement",
      detail: result?.settlementTxHash
        ? `${result.settlementTxHash.slice(0, 10)}...`
        : result && result.httpStatus !== 200
          ? "No settlement transaction created"
          : "Pending",
    },
  ];

  return rows;
}

function DecisionRow({
  row,
  activeStep,
  result,
  running,
  traceSteps,
  onStepClick,
  rejectedReason,
}: {
  row: ReturnType<typeof decisionRows>[number];
  activeStep: number;
  result: TriggerResult | null;
  running: boolean;
  traceSteps?: TraceStep[];
  onStepClick?: (step: TraceStep) => void;
  rejectedReason?: string | null;
}) {
  const status = decisionStatus(row.step, activeStep, result, running);
  const approved = status === "approved";
  const rejected = status === "rejected";
  const runningStep = status === "running";

  const traceStep = traceSteps?.find((s) => s.id === row.step);
  const clickable = !!traceStep?.rawData;

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: row opens gate detail panel
    <div
      className={cn(
        "flex gap-3 rounded-sm border border-transparent px-2 py-1.5 group",
        runningStep && "border-border bg-muted/30",
        status === "skipped" && "opacity-45",
        clickable && "cursor-pointer",
      )}
      onClick={() => clickable && traceStep && onStepClick?.(traceStep)}
      onKeyDown={(event) => {
        if (!clickable || !traceStep) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onStepClick?.(traceStep);
        }
      }}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
    >
      <span className="mt-0.5">
        {approved ? (
          <CheckCircle2 className="size-4 text-success" />
        ) : rejected ? (
          <XCircle className="size-4 text-destructive" />
        ) : runningStep ? (
          <Zap className="size-4 animate-pulse text-foreground" />
        ) : (
          <span className="block size-4 rounded-full border border-border" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1">
          <span
            className={cn(
              "block text-sm font-medium",
              rejected && "text-destructive",
              !approved && !rejected && !runningStep && "text-muted-foreground",
            )}
          >
            {row.label}
          </span>
          {clickable && (
            <span className="text-xs text-muted-foreground/50 group-hover:text-primary transition-colors">
              view ↗
            </span>
          )}
        </span>
        <span className="mt-0.5 block truncate font-mono text-xs text-muted-foreground">
          {rejected && rejectedReason ? rejectedReason : row.detail}
        </span>
      </span>
    </div>
  );
}
