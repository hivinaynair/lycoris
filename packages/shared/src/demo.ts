import { DemoAgentName, type ReportRouteId } from "./types.js";

/** Allowlisted third-party x402 resource on Base Sepolia. Override with EXTERNAL_X402_URL. */
export const DEFAULT_EXTERNAL_X402_URL = "https://www.x402.org/protected";

export const DEMO_SCENARIO_AGENTS = [
  DemoAgentName.AGENT_1,
  DemoAgentName.AGENT_2,
  DemoAgentName.GHOST,
] as const;

export const WEATHER_PRICE_USDC = "0.1";
export const WEATHER_AMOUNT_ATOMIC = "100000";
export const WEATHER_TITLE = "Melbourne weather report";

export const DEMO_REPORT_ROUTES = [
  {
    id: "basic",
    path: "/api/weather/public",
    priceLabel: "0.1 USDC",
    price: "$0.10",
    amountAtomic: WEATHER_AMOUNT_ATOMIC,
    title: WEATHER_TITLE,
    recommendation: "Paid 1 PM rain answer for Melbourne.",
  },
  {
    id: "premium",
    path: "/api/weather/rooftop-brief",
    priceLabel: "0.1 USDC",
    price: "$0.10",
    amountAtomic: WEATHER_AMOUNT_ATOMIC,
    title: "Melbourne rooftop brief",
    recommendation: "Paid rooftop-lunch brief for Melbourne at 1 PM.",
  },
] as const;

export const DEMO_AGENT_ROUTE: Record<DemoAgentName, ReportRouteId> = {
  [DemoAgentName.AGENT_1]: "basic",
  [DemoAgentName.AGENT_2]: "basic",
  [DemoAgentName.AGENT_3]: "basic",
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
