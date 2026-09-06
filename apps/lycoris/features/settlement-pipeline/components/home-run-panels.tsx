"use client";

import { Button } from "@repo/ui/components/button";
import { Copy, ExternalLink, MessageSquareText, Wallet } from "lucide-react";
import { shortAddress } from "@/lib/format";
import type { TraceStep } from "@/lib/trace-steps";
import { buildTraceSteps } from "@/lib/trace-steps";
import type { DemoAgent, DemoScenario, TriggerResult } from "../lib/payment-demo";
import { DashboardPanel } from "./dashboard-panel";
import { DecisionLog } from "./decision-log";
import { PacketPanel } from "./packet-panel";

export function HomeRunPanels({
  result,
  loading,
  activeStep,
  selectedAgent,
  selectedScenario,
  amountLabel,
  proofBundle,
  copyState,
  onCopyProof,
  onStepClick,
}: {
  result: TriggerResult | null;
  loading: boolean;
  activeStep: number;
  selectedAgent: DemoAgent;
  selectedScenario: DemoScenario;
  amountLabel: string;
  proofBundle: string;
  copyState: "idle" | "copied";
  onCopyProof: () => void;
  onStepClick: (step: TraceStep) => void;
}) {
  return (
    <section className="grid min-w-0 grid-cols-1 items-stretch gap-6 pb-1 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)_minmax(0,320px)]">
      <DashboardPanel title="Decision log" icon={<MessageSquareText className="size-4" />}>
        <DecisionLog
          result={result}
          running={loading}
          activeStep={activeStep}
          selectedAgent={selectedAgent}
          selectedScenario={selectedScenario}
          traceSteps={buildTraceSteps(result, activeStep)}
          onStepClick={onStepClick}
        />
      </DashboardPanel>

      <DashboardPanel
        title="Proof / evidence"
        icon={<Wallet className="size-4" />}
        action={
          <div className="flex gap-2">
            {result?.settlementTxUrl && (
              <a
                href={result.settlementTxUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-8 items-center gap-2 rounded-none border border-input px-2.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <ExternalLink className="h-4 w-4" />
                Basescan
              </a>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={onCopyProof}
              disabled={!result}
              className="text-muted-foreground"
            >
              <Copy className="h-4 w-4" />
              {copyState === "copied" ? "Copied" : "Copy"}
            </Button>
          </div>
        }
      >
        {result ? (
          <pre className="font-mono text-xs leading-6 break-words whitespace-pre-wrap text-foreground/80">
            {proofBundle}
          </pre>
        ) : (
          <p className="text-sm text-muted-foreground">
            Portable decision evidence appears here after a run.
          </p>
        )}
      </DashboardPanel>

      <DashboardPanel title="Packet" icon={<Wallet className="size-4" />}>
        <PacketPanel
          amount={amountLabel}
          from={result?.payer ? shortAddress(result.payer) : selectedScenario.packetFrom}
          mandate={selectedScenario.mandate}
          completedAt={result?.completedAt}
        />
      </DashboardPanel>
    </section>
  );
}

export function RainAnswer({
  approved,
  result,
}: {
  approved: boolean;
  result: TriggerResult | null;
}) {
  if (!approved || typeof result?.body?.willRainAt1Pm !== "boolean") return null;

  return (
    <p className="text-[13px] leading-normal text-muted-foreground">
      {result.body.recommendation ??
        (result.body.willRainAt1Pm
          ? "Yes — rain is likely in Melbourne at 1 PM."
          : "No — Melbourne looks clear at 1 PM.")}
    </p>
  );
}
