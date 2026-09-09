import { DEMO_AGENT_ROUTE, DEMO_SCENARIO_AGENTS, getDemoReportRoute } from "@repo/shared/demo";
import { Client } from "eve/client";
import { env } from "@/env";
import { demoAgents } from "@/lib/demo-scenarios";
import { createAgentResponse } from "./agent-response";
import { chatRequest } from "./parse-scenario";

export const maxDuration = 120;

const SCENARIO_SLOTS = ["A", "B", "C"] as const;
export async function POST(request: Request) {
  const parsed = chatRequest.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return Response.json(
      { error: "Enter a message of 1–2,000 characters and choose a valid scenario." },
      { status: 400 },
    );
  const { scenarioIndex, message, session: parsedSession } = parsed.data;
  const savedSession = parsedSession
    ? {
        sessionId: parsedSession.sessionId,
        streamIndex: parsedSession.streamIndex,
        ...(parsedSession.continuationToken !== undefined
          ? { continuationToken: parsedSession.continuationToken }
          : {}),
      }
    : undefined;
  const agentName = DEMO_SCENARIO_AGENTS[scenarioIndex]!;
  const route = getDemoReportRoute(DEMO_AGENT_ROUTE[agentName]);
  const targetUrl = `${new URL(request.url).origin}${route.path}`;
  const demoAgent = demoAgents.find((a) => a.id === agentName);
  const slot = SCENARIO_SLOTS[scenarioIndex] ?? "A";

  const sharedSecret = env.LYCORIS_AGENT_SHARED_SECRET?.trim();
  const client = new Client({
    host: env.AGENT_URL,
    preserveCompletedSessions: true,
    headers: { "x-lycoris-agent": agentName },
    ...(sharedSecret ? { auth: { basic: { username: "lycoris", password: sharedSecret } } } : {}),
  });

  return createAgentResponse(request, {
    client,
    savedSession,
    message,
    agentName,
    targetUrl,
    details: {
      slot,
      agentKey: agentName,
      agent: demoAgent,
      route: { id: route.id, path: route.path, price: route.priceLabel },
    },
  });
}
