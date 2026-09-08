import type { DecisionProof, RawMandate, X402Challenge } from "@repo/shared/types";
import type { demoAgents } from "@/lib/demo-scenarios";

export const SCENARIOS = [
  {
    agentName: "lycoris-agent-1",
    slot: "A",
    title: "Happy path",
    displayAgent: "lycoris-agent-1",
    packetFrom: "agent wallet pending",
    mandate: "AP2 credential",
  },
  {
    agentName: "lycoris-agent-2",
    slot: "B",
    title: "Mandate exceeded",
    displayAgent: "lycoris-agent-2",
    packetFrom: "agent wallet pending",
    mandate: "AP2 credential",
  },
  {
    agentName: "lycoris-agent-ghost",
    slot: "C",
    title: "Unregistered agent",
    displayAgent: "lycoris-agent-ghost",
    packetFrom: "agent wallet pending",
    mandate: "AP2 credential",
  },
] as const;

export type TriggerResult = {
  slot: string;
  agent: DemoAgent | null;
  route: { id: string; path: string; price: string };
  httpStatus: number;
  agentKey?: string;
  payer?: string;
  agentUri?: string;
  mandateDelegator?: string;
  mandateValid?: boolean;
  authorizationNonce?: string;
  proofLookupError?: string;
  settlementTxHash?: string;
  settlementTxUrl?: string;
  attestationTxHash?: string;
  attestationTxUrl?: string;
  decisionProof?: DecisionProof;
  rawMandate?: RawMandate;
  x402Challenge?: X402Challenge;
  completedAt?: string;
  body?: {
    error?: string;
    willRainAt1Pm?: boolean;
    rainProbabilityPercent?: number;
    temperatureC?: number;
    recommendation?: string;
    objective?: string;
    city?: string;
  };
};

export type DemoScenario = (typeof SCENARIOS)[number];
export type DemoAgent = (typeof demoAgents)[number];

export function scenarioIndexFromSearch(search: string) {
  const requestedScenario = Number(new URLSearchParams(search).get("scenario") ?? 0);
  return Number.isInteger(requestedScenario)
    ? Math.min(Math.max(requestedScenario, 0), SCENARIOS.length - 1)
    : 0;
}

const FALLBACK_ROUTES = {
  premium: { id: "premium", path: "/api/weather/rooftop-brief", price: "$5.00" },
  basic: { id: "basic", path: "/api/weather/public", price: "$0.20" },
} as const;

export function fallbackRouteForAgent(agent: DemoAgent) {
  return FALLBACK_ROUTES[agent.route.startsWith("Rooftop") ? "premium" : "basic"];
}
