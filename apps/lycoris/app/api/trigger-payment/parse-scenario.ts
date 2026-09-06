import { DEMO_SCENARIO_AGENTS } from "@repo/shared/demo";

export async function parseScenarioIndex(request: Request) {
  let scenarioIndex = 0;
  try {
    const body = (await request.json()) as { scenarioIndex?: unknown };
    if (typeof body.scenarioIndex === "number" && Number.isInteger(body.scenarioIndex)) {
      scenarioIndex = Math.min(Math.max(body.scenarioIndex, 0), DEMO_SCENARIO_AGENTS.length - 1);
    }
  } catch {
    /* no body */
  }
  return scenarioIndex;
}
