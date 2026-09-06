import { Coins, FileText, LinkIcon, ShieldCheck, Zap } from "lucide-react";

import { settlementFailureStep } from "@/lib/settlement-status";

export type GateState = "idle" | "running" | "approved" | "rejected" | "skipped";

export const settlementGates = [
  { key: "challenge", label: "x402", name: "x402 Challenge", icon: Zap },
  {
    key: "identity",
    label: "ERC-8004",
    name: "ERC-8004 Identity",
    icon: ShieldCheck,
  },
  { key: "mandate", label: "AP2", name: "AP2 Mandate", icon: FileText },
  { key: "settlement", label: "Settlement", name: "Settlement", icon: Coins },
  {
    key: "attestation",
    label: "Attestation",
    name: "Attestation",
    icon: LinkIcon,
  },
] as const;

export const packetStops = [17, 34, 51, 70, 85, 95] as const;

export function gateState(
  index: number,
  activeStep: number,
  approved: boolean,
  running: boolean,
  rejectedReason?: string,
): GateState {
  const step = index + 1;
  const fail = settlementFailureStep(rejectedReason);
  const isFinalFailure = !running && !approved && activeStep > 0;

  if (approved && activeStep >= step) return "approved";
  if (fail > 0) {
    if (step < fail) return "approved";
    if (step === fail) return "rejected";
    return "skipped";
  }
  if (isFinalFailure) {
    if (step < activeStep) return "approved";
    if (step === activeStep) return "rejected";
    return "skipped";
  }
  if (activeStep === step) return "running";
  if (activeStep > step) return "approved";
  return "idle";
}

export function packetPosition(activeStep: number, rejectedReason?: string) {
  const fail = settlementFailureStep(rejectedReason);
  if (fail > 0) return packetStops[fail]!;
  return packetStops[Math.min(Math.max(activeStep, 0), packetStops.length - 1)]!;
}

export function latestAgentReasoning(reasoning?: string) {
  return reasoning?.replace(/\s+/g, " ").trim().slice(-100);
}

export function displayRoute(routeLabel: string) {
  return routeLabel
    .replace("/api/weather/public", "Melbourne public forecast")
    .replace("/api/weather/rooftop-brief", "Melbourne rooftop brief");
}

export function statusTone(agentStatus: string) {
  if (agentStatus === "Trusted" || agentStatus === "approved") {
    return "bg-positive-surface text-positive";
  }
  if (agentStatus === "rejected") return "bg-negative-surface text-negative";
  return "bg-warning-surface text-warning";
}
