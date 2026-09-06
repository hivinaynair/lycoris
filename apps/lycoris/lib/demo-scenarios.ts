import { DEMO_REPORT_ROUTES, type DemoReportRoute, getDemoReportRoute } from "@repo/shared/demo";

export const reportRoutes = DEMO_REPORT_ROUTES;

export const demoAgents = [
  {
    id: "lycoris-agent-1",
    label: "Retail",
    mandateLimit: "$1",
    route: "Public forecast $0.20",
    failsAt: "-",
    outcome: "Approved",
    status: "approved",
    narrative:
      "Happy path: buy the Melbourne 1 PM forecast. Identity, mandate, and settlement all pass.",
  },
  {
    id: "lycoris-agent-2",
    label: "Capped",
    mandateLimit: "$1",
    route: "Rooftop brief $5",
    failsAt: "Mandate ($5 > $1)",
    outcome: "mandate_amount_exceeded",
    status: "rejected",
    narrative: "Authorization failure: the agent is real, but the AP2 mandate is too small.",
  },
  {
    id: "lycoris-agent-ghost",
    label: "Ghost",
    mandateLimit: "none",
    route: "Public forecast $0.20",
    failsAt: "Identity (not in ERC-8004)",
    outcome: "identity_not_found",
    status: "rejected",
    narrative: "Identity failure: no live ERC-8004 agent identity maps to this payer.",
  },
] as const;

export type ReportRouteId = DemoReportRoute["id"];

export function getReportRoute(id: ReportRouteId) {
  return getDemoReportRoute(id);
}
