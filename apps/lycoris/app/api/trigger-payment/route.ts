import { DEMO_AGENT_ROUTE, DEMO_SCENARIO_AGENTS, getDemoReportRoute } from "@repo/shared/demo";
import { GATE_STEP } from "@repo/shared/settlement-errors";
import { Client } from "eve/client";
import { env } from "@/env";
import {
  buildDoneResult,
  demoPrompt,
  outcomeFromEvent,
  type PaidRunOutcome,
} from "@/features/settlement-pipeline/lib/agent-run";
import { readLivePipelineGate } from "@/features/settlement-pipeline/lib/live-pipeline-gate";
import { demoAgents } from "@/lib/demo-scenarios";
import { isMandateFailure } from "@/lib/settlement-status";
import { parseScenarioIndex } from "./parse-scenario";
import { payerFallback } from "./payer-fallback";
import { sseLine } from "./sse";

export const maxDuration = 120;

const SCENARIO_SLOTS = ["A", "B", "C"] as const;
const LIVE_POLL_MS = 40;
const GAP_FILL_MS = 90;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(request: Request) {
  const scenarioIndex = await parseScenarioIndex(request);
  const agentName = DEMO_SCENARIO_AGENTS[scenarioIndex]!;
  const route = getDemoReportRoute(DEMO_AGENT_ROUTE[agentName]);
  const targetUrl = `${new URL(request.url).origin}${route.path}`;
  const demoAgent = demoAgents.find((a) => a.id === agentName);
  const slot = SCENARIO_SLOTS[scenarioIndex] ?? "A";

  const sharedSecret = env.LYCORIS_AGENT_SHARED_SECRET?.trim();
  const client = new Client({
    host: env.AGENT_URL,
    ...(sharedSecret ? { auth: { basic: { username: "lycoris", password: sharedSecret } } } : {}),
  });

  const stream = new ReadableStream({
    async start(controller) {
      const finish = (result: Record<string, unknown>) => {
        const error = result.error;
        controller.enqueue(
          sseLine({
            type: "done",
            result: {
              slot,
              agentKey: agentName,
              agent: demoAgent,
              route: { id: route.id, path: route.path, price: route.priceLabel },
              mandateValid: !isMandateFailure(error),
              ...result,
              body: error ? { error } : result.body,
            },
          }),
        );
      };

      controller.enqueue(sseLine({ type: "gate", step: GATE_STEP.AGENT_RESOLVED }));

      let payer = await payerFallback(agentName);
      const runStartedAt = Date.now();
      let lastGate: number = GATE_STEP.AGENT_RESOLVED;

      /** Forward-only for synthetic gap-fill after the run. */
      const emitGateForward = (gate: number) => {
        if (gate <= lastGate) return;
        lastGate = gate;
        controller.enqueue(sseLine({ type: "gate", step: gate }));
      };

      /**
       * Follow facilitator live progress exactly — including a rewind when verify
       * resets and re-enters x402 after preclear.
       */
      const flushLiveGates = async () => {
        if (!payer.startsWith("0x") || payer === "0x") return;
        const gate = await readLivePipelineGate(env.FACILITATOR_URL, payer, runStartedAt);
        if (gate === 0 || gate === lastGate) return;
        lastGate = gate;
        controller.enqueue(sseLine({ type: "gate", step: gate }));
      };

      const poll = setInterval(() => {
        flushLiveGates().catch(() => undefined);
      }, LIVE_POLL_MS);

      try {
        const response = await client.session().send(demoPrompt(agentName, targetUrl));

        let primary: PaidRunOutcome | undefined;
        for await (const event of response) {
          if (event.type === "message.appended") {
            controller.enqueue(sseLine({ type: "token", text: event.data.messageDelta }));
          } else if (event.type === "action.result" && !primary) {
            const outcome = outcomeFromEvent(event, targetUrl, payer);
            if (outcome) {
              primary = outcome;
              if (outcome.payer.startsWith("0x")) payer = outcome.payer;
              emitGateForward(GATE_STEP.PAYMENT_SUBMITTED);
              await flushLiveGates();
            }
          } else {
            // Keep the rail live while the agent thinks / tools run.
            await flushLiveGates();
          }
        }

        primary ??= {
          payer,
          error: "agent_did_not_attempt_payment",
          httpStatus: 500,
        };
        if (primary.payer.startsWith("0x")) payer = primary.payer;

        await flushLiveGates();

        const done = await buildDoneResult(primary, env.AGENT_URL, env.FACILITATOR_URL);
        await flushLiveGates();

        // Gap-fill any steps the poll missed, with a short beat so the packet moves.
        for (const step of done.gates) {
          if (step <= lastGate) continue;
          emitGateForward(step);
          await sleep(GAP_FILL_MS);
          await flushLiveGates();
        }
        if (done.attestationStep && lastGate < GATE_STEP.ATTESTATION) {
          emitGateForward(GATE_STEP.ATTESTATION);
        }
        finish(done.result);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        finish({ httpStatus: 500, error: message, body: { error: message } });
      } finally {
        clearInterval(poll);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
