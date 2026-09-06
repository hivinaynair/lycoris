import { DemoAgentName, type ReportRouteId } from "./types.js";

/** Allowlisted third-party x402 resource on Base Sepolia. Override with EXTERNAL_X402_URL. */
export const DEFAULT_EXTERNAL_X402_URL = "https://www.x402.org/protected";

export const DEMO_SCENARIO_AGENTS = [
  DemoAgentName.AGENT_1,
  DemoAgentName.AGENT_2,
  DemoAgentName.GHOST,
] as const;

export const DEMO_REPORT_ROUTES = [
  {
    id: "basic",
    path: "/api/weather/public",
    priceLabel: "$0.20",
    price: "$0.20",
    amountAtomic: "200000",
    title: "Melbourne public forecast",
    recommendation: "Paid 1 PM rain answer for Melbourne.",
  },
  {
    id: "premium",
    path: "/api/weather/rooftop-brief",
    priceLabel: "$5.00",
    price: "$5.00",
    amountAtomic: "5000000",
    title: "Melbourne rooftop brief",
    recommendation: "Paid rooftop-lunch brief for Melbourne at 1 PM.",
  },
] as const;

export const DEMO_AGENT_ROUTE: Record<DemoAgentName, ReportRouteId> = {
  [DemoAgentName.AGENT_1]: "basic",
  [DemoAgentName.AGENT_2]: "premium",
  [DemoAgentName.AGENT_3]: "premium",
  [DemoAgentName.GHOST]: "basic",
};

export type DemoReportRoute = (typeof DEMO_REPORT_ROUTES)[number];

export function getDemoReportRoute(id: ReportRouteId) {
  return DEMO_REPORT_ROUTES.find((route) => route.id === id) ?? DEMO_REPORT_ROUTES[0];
}

export function getDemoReportRouteByPath(path: string) {
  return DEMO_REPORT_ROUTES.find((route) => route.path === path);
}

export type FailureGate = "identity" | "mandate" | "settlement" | "attestation";

export function failureGateForReason(reason?: string): FailureGate | undefined {
  if (!reason) return undefined;
  if (reason === "identity_not_found") return "identity";
  if (reason.startsWith("mandate_")) return "mandate";
  return "settlement";
}
