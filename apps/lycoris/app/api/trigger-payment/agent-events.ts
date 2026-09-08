import { GATE_STEP } from "@repo/shared/settlement-errors";
import type { HandleMessageStreamEvent } from "eve/client";
import {
  outcomeFromEvent,
  type PaidRunOutcome,
} from "@/features/settlement-pipeline/lib/agent-run";
import type { createGateProgress } from "./gate-progress";
import { payerFallback } from "./payer-fallback";

export function createAgentEventHandler({
  emit,
  progress,
  agentName,
  targetUrl,
}: {
  emit: (event: unknown) => void;
  progress: ReturnType<typeof createGateProgress>;
  agentName: Parameters<typeof payerFallback>[0];
  targetUrl: string;
}) {
  let lastTextStep: number | undefined;
  const { forward: emitGateForward, flush: flushLiveGates } = progress;
  const events = {
    primary: undefined as PaidRunOutcome | undefined,
    async handle(event: HandleMessageStreamEvent) {
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
        progress.paymentStarted = true;
        emitGateForward(GATE_STEP.PAYMENT_SUBMITTED);
        progress.payer = await payerFallback(agentName).catch(() => "0x");
      } else if (
        event.type === "turn.failed" ||
        event.type === "session.failed" ||
        event.type === "turn.cancelled"
      ) {
        throw new Error("Agent turn did not finish");
      } else if (event.type === "action.result" && !events.primary) {
        const outcome = outcomeFromEvent(event, targetUrl, progress.payer);
        if (outcome) {
          events.primary = outcome;
          if (outcome.payer.startsWith("0x")) progress.payer = outcome.payer;
          emitGateForward(GATE_STEP.PAYMENT_SUBMITTED);
          await flushLiveGates();
        }
      } else {
        // Keep the rail live while the agent thinks / tools run.
        await flushLiveGates();
      }
    },
  };
  return events;
}
