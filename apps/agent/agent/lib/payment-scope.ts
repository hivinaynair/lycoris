import { DEMO_AGENT_ROUTE, DEMO_SCENARIO_AGENTS, getDemoReportRoute } from "@repo/shared/demo";

/** Payment authority comes from the authenticated transport, never model arguments. */
export function paymentScope(agent: unknown, appUrl: string | undefined) {
  const agentName = DEMO_SCENARIO_AGENTS.find((name) => name === agent);
  if (!agentName || !appUrl) throw new Error("payment_scope_missing");
  const url = new URL(getDemoReportRoute(DEMO_AGENT_ROUTE[agentName]).path, appUrl).href;
  return { agentName, url };
}
