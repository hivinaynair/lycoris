"use client";

import type { ReactNode } from "react";

import { displayRoute, latestAgentReasoning, statusTone } from "../lib/settlement-gates";
import { DesktopSettlementScene } from "./settlement-scene-desktop";
import { MobileSettlementScene, SceneAgentBar } from "./settlement-scene-mobile";

type SettlementSceneProps = {
  agentLabel: string;
  agentStatus?: string;
  agentReasoning?: string;
  amountLabel: string;
  routeLabel: string;
  activeStep: number;
  running: boolean;
  approved: boolean;
  rejectedReason?: string;
  action?: ReactNode;
};

const SCENE_CLASSES = {
  rejected: {
    verticalBar: "bg-gradient-to-b from-destructive to-destructive/20",
    horizontalBar: "shadow-glow-negative bg-gradient-to-r from-destructive to-destructive/20",
    packet: "border-destructive bg-destructive text-background",
    label: "text-background",
  },
  approved: {
    verticalBar: "bg-gradient-to-b from-primary to-primary/20",
    horizontalBar: "shadow-glow-positive bg-gradient-to-r from-primary to-primary/20",
    packet: "border-foreground/15 bg-primary text-foreground",
    label: "text-foreground",
  },
};

export function SettlementScene({
  agentLabel,
  agentStatus = "Trusted",
  agentReasoning,
  amountLabel,
  routeLabel,
  activeStep,
  running,
  approved,
  rejectedReason,
  action,
}: SettlementSceneProps) {
  const rejected = Boolean(rejectedReason) || (!running && !approved && activeStep > 0);
  const sceneClasses = SCENE_CLASSES[rejected ? "rejected" : "approved"];
  const latestReasoning = latestAgentReasoning(agentReasoning);
  const normalizedRoute = displayRoute(routeLabel);
  const tone = statusTone(agentStatus);
  const amountUsdc = `${amountLabel.replace("$", "")} USDC`;

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card text-foreground sm:min-w-[620px]">
      <SceneAgentBar
        agentLabel={agentLabel}
        agentStatus={agentStatus}
        tone={tone}
        meta={`${normalizedRoute} · ${amountUsdc}`}
        action={action}
        className="border-b bg-muted/60 px-4 py-3 sm:hidden"
      />

      <MobileSettlementScene
        agentReasoning={agentReasoning}
        amountLabel={amountLabel}
        activeStep={activeStep}
        running={running}
        approved={approved}
        rejectedReason={rejectedReason}
        verticalBarClass={sceneClasses.verticalBar}
      />

      <div className="hidden items-center gap-3 border-b border-border bg-muted/40 px-5 py-3 sm:flex">
        <div className="size-1.5 shrink-0 rounded-full bg-primary" />
        <span className="shrink-0 font-mono text-[9px] font-bold tracking-[0.2em] text-muted-foreground uppercase">
          x402 Settlement Pipeline
        </span>
        {latestReasoning && (
          <span className="ml-2 min-w-0 truncate font-mono text-[9px] text-muted-foreground">
            {latestReasoning}
          </span>
        )}
        <span className="ml-auto shrink-0 font-mono text-[9px] text-muted-foreground">
          {agentLabel}
        </span>
      </div>

      <DesktopSettlementScene
        agentReasoning={agentReasoning}
        amountLabel={amountLabel}
        activeStep={activeStep}
        running={running}
        approved={approved}
        rejectedReason={rejectedReason}
        packetClass={sceneClasses.packet}
        packetLabelClass={sceneClasses.label}
        horizontalBarClass={sceneClasses.horizontalBar}
      />

      <SceneAgentBar
        agentLabel={agentLabel}
        agentStatus={agentStatus}
        tone={tone}
        meta={`${normalizedRoute} · ${amountUsdc} · Base Sepolia`}
        action={action}
        className="hidden border-t bg-muted/40 px-5 py-4 sm:flex"
      />
    </section>
  );
}
