"use client";

import { Badge } from "@repo/ui/components/badge";
import { cn } from "@repo/ui/lib/utils";
import { CheckCircle, Circle, Loader2, XCircle } from "lucide-react";
import type { StepStatus, TraceStep } from "@/lib/trace-steps";

export type { GateRawData, TraceStep } from "@/lib/trace-steps";
export { buildTraceSteps } from "@/lib/trace-steps";

type TracePanelProps = {
  steps: TraceStep[];
  onStepClick?: ((step: TraceStep) => void) | undefined;
};

function StepIcon({ status }: { status: StepStatus }) {
  if (status === "approved") {
    return <CheckCircle className="h-4 w-4 shrink-0 text-primary" />;
  }
  if (status === "rejected") {
    return <XCircle className="h-4 w-4 shrink-0 text-destructive" />;
  }
  if (status === "running") {
    return <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />;
  }
  return <Circle className="h-4 w-4 shrink-0 text-muted-foreground/40" />;
}

export function TracePanel({ steps, onStepClick }: TracePanelProps) {
  return (
    <div className="flex flex-col gap-0">
      {steps.map((step, i) => (
        <TraceRow
          key={step.id}
          step={step}
          last={i === steps.length - 1}
          onStepClick={onStepClick}
        />
      ))}
    </div>
  );
}

function TraceRow({
  step,
  last,
  onStepClick,
}: {
  step: TraceStep;
  last: boolean;
  onStepClick?: ((step: TraceStep) => void) | undefined;
}) {
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: row opens detail; nested explorer links stay as anchors
    <div
      className={cn("flex gap-3", step.rawData && "group cursor-pointer")}
      onClick={() => step.rawData && onStepClick?.(step)}
      onKeyDown={(event) => {
        if (!step.rawData) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onStepClick?.(step);
        }
      }}
      role={step.rawData ? "button" : undefined}
      tabIndex={step.rawData ? 0 : undefined}
    >
      <div className="flex flex-col items-center">
        <div className="mt-1">
          <StepIcon status={step.status} />
        </div>
        {!last && (
          <div
            className={cn(
              "my-1 min-h-[20px] w-px flex-1",
              step.status === "skipped" ? "bg-border/30" : "bg-border",
            )}
          />
        )}
      </div>

      <div className={cn("min-w-0 pb-4", step.status === "skipped" && "opacity-40")}>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "text-sm font-medium",
              step.status === "rejected" && "text-destructive",
              step.status === "approved" && "text-foreground",
              (step.status === "pending" || step.status === "skipped") && "text-muted-foreground",
            )}
          >
            {step.label}
          </span>
          {step.rawData && (
            <span className="ml-1 text-xs text-muted-foreground/50 transition-colors group-hover:text-primary">
              view ↗
            </span>
          )}
          {step.status === "rejected" && (
            <Badge variant="destructive" className="py-0 text-xs">
              rejected
            </Badge>
          )}
          {step.status === "approved" && (
            <Badge variant="outline" className="border-primary/30 py-0 text-xs text-primary">
              approved
            </Badge>
          )}
        </div>
        {step.detail && (
          <p className="mt-0.5 font-mono text-xs text-muted-foreground">{step.detail}</p>
        )}
        <div className="mt-0.5 flex gap-3">
          {step.link && (
            <a
              href={step.link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-xs text-primary hover:underline"
            >
              {step.link.label} ↗
            </a>
          )}
          {step.attestationLink && (
            <a
              href={step.attestationLink.href}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-xs text-primary hover:underline"
            >
              {step.attestationLink.label} ↗
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
