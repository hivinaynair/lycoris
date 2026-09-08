import { DEMO_AGENT_ROUTE, DEMO_SCENARIO_AGENTS, getDemoReportRoute } from "@repo/shared/demo";
import { GATE_STEP } from "@repo/shared/settlement-errors";
import { Client } from "eve/client";
import { env } from "@/env";
import {
  buildDoneResult,
  outcomeFromEvent,
  type PaidRunOutcome,
} from "@/features/settlement-pipeline/lib/agent-run";
import { readLivePipelineGate } from "@/features/settlement-pipeline/lib/live-pipeline-gate";
import { demoAgents } from "@/lib/demo-scenarios";
import { isMandateFailure } from "@/lib/settlement-status";
import { chatRequest } from "./parse-scenario";
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
  const parsed = chatRequest.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return Response.json(
      { error: "Enter a message of 1–2,000 characters and choose a valid scenario." },
      { status: 400 },
    );
  const { scenarioIndex, message, session: savedSession } = parsed.data;
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

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      const emit = (event: unknown) => {
        if (closed || request.signal.aborted) return;
        try {
          controller.enqueue(sseLine(event));
        } catch {
          closed = true;
        }
      };
      const finish = (result: Record<string, unknown>) => {
        const error = result.error;
        emit({
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
        });
      };

      let payer = "0x";
      let paymentStarted = false;
      let polling = false;
      const runStartedAt = Date.now();
      let lastGate: number = GATE_STEP.AGENT_RESOLVED;

      /** Forward-only for synthetic gap-fill after the run. */
      const emitGateForward = (gate: number) => {
        if (gate <= lastGate) return;
        lastGate = gate;
        emit({ type: "gate", step: gate });
      };

      /**
       * Follow facilitator live progress exactly — including a rewind when verify
       * resets and re-enters x402 after preclear.
       */
      const flushLiveGates = async () => {
        if (!paymentStarted || polling || closed || payer === "0x") return;
        polling = true;
        try {
          const gate = await readLivePipelineGate(env.FACILITATOR_URL, payer, runStartedAt);
          if (gate === 0 || gate === lastGate) return;
          lastGate = gate;
          emit({ type: "gate", step: gate });
        } finally {
          polling = false;
        }
      };

      const poll = setInterval(() => {
        flushLiveGates().catch(() => undefined);
      }, LIVE_POLL_MS);

      const session = client.session(savedSession);
      const signal = AbortSignal.any([request.signal, AbortSignal.timeout(110_000)]);
      const cancel = () => {
        void session.cancel().catch(() => undefined);
      };
      signal.addEventListener("abort", cancel, { once: true });
      let primary: PaidRunOutcome | undefined;
      let lastTextStep: number | undefined;
      try {
        const response = await session.send({ message, signal });
        for await (const event of response) {
          if (event.type === "message.appended") {
            if (lastTextStep !== undefined && lastTextStep !== event.data.stepIndex)
              emit({ type: "token", text: "\n\n" });
            lastTextStep = event.data.stepIndex;
            emit({ type: "token", text: event.data.messageDelta });
          } else if (
            event.type === "actions.requested" &&
            event.data.actions.some(
              (action) => action.kind === "tool-call" && action.toolName === "fetch_paid_resource",
            )
          ) {
            paymentStarted = true;
            emitGateForward(GATE_STEP.PAYMENT_SUBMITTED);
            payer = await payerFallback(agentName).catch(() => "0x");
          } else if (
            event.type === "turn.failed" ||
            event.type === "session.failed" ||
            event.type === "turn.cancelled"
          ) {
            throw new Error("Agent turn did not finish");
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

        emit({ type: "session", session: session.state });
        if (!primary) {
          if (paymentStarted) throw new Error("Payment outcome unavailable");
          emit({ type: "reply" });
          return;
        }
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
      } catch {
        // A missing model reply must not hide a payment the tool already completed.
        if (primary) {
          try {
            const done = await buildDoneResult(primary, env.AGENT_URL, env.FACILITATOR_URL);
            finish(done.result);
          } catch {
            /* Preserve uncertainty below; never claim a failed payment was refunded. */
          }
        }
        emit({
          type: "error",
          text: paymentStarted
            ? "The connection ended before Lycoris could finish. A payment may have been attempted; check the evidence before requesting another report."
            : "Lycoris could not finish its reply. Please try again.",
        });
      } finally {
        signal.removeEventListener("abort", cancel);
        clearInterval(poll);
        if (!closed) {
          closed = true;
          controller.close();
        }
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
