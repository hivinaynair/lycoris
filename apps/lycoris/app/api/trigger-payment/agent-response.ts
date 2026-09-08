import type { Client } from "eve/client";
import { env } from "@/env";
import { buildDoneResult } from "@/features/settlement-pipeline/lib/agent-run";
import { readLivePipelineGate } from "@/features/settlement-pipeline/lib/live-pipeline-gate";
import { createAgentEventHandler } from "./agent-events";
import { createGateProgress } from "./gate-progress";
import type { payerFallback } from "./payer-fallback";
import { createStreamWriter } from "./stream-writer";

type StreamOptions = {
  client: Client;
  savedSession: Parameters<Client["session"]>[0];
  message: string;
  agentName: Parameters<typeof payerFallback>[0];
  targetUrl: string;
  details: Record<string, unknown>;
};

export function createAgentResponse(
  request: Request,
  { client, savedSession, message, agentName, targetUrl, details }: StreamOptions,
) {
  const stream = new ReadableStream({
    async start(controller) {
      const writer = createStreamWriter(controller, request.signal, details);
      const { emit, finish } = writer;

      const progress = createGateProgress(emit, writer.isClosed, (payer, since) =>
        readLivePipelineGate(env.FACILITATOR_URL, payer, since),
      );
      const { flush: flushLiveGates } = progress;
      const poll = setInterval(() => {
        flushLiveGates().catch(() => undefined);
      }, 40);

      const session = client.session(savedSession);
      const signal = AbortSignal.any([request.signal, AbortSignal.timeout(110_000)]);
      const cancel = () => {
        void session.cancel().catch(() => undefined);
      };
      signal.addEventListener("abort", cancel, { once: true });
      const events = createAgentEventHandler({ emit, progress, agentName, targetUrl });
      try {
        const response = await session.send({ message, signal });
        for await (const event of response) await events.handle(event);

        emit({ type: "session", session: session.state });
        if (!events.primary) {
          if (progress.paymentStarted) throw new Error("Payment outcome unavailable");
          emit({ type: "reply" });
          return;
        }
        if (events.primary.payer.startsWith("0x")) progress.payer = events.primary.payer;

        await flushLiveGates();

        const done = await buildDoneResult(events.primary, env.AGENT_URL, env.FACILITATOR_URL);
        await flushLiveGates();

        await progress.fillGaps(done.gates, done.attestationStep);
        finish(done.result);
      } catch {
        // A missing model reply must not hide a payment the tool already completed.
        if (events.primary) {
          try {
            const done = await buildDoneResult(events.primary, env.AGENT_URL, env.FACILITATOR_URL);
            finish(done.result);
          } catch {
            /* Preserve uncertainty below; never claim a failed payment was refunded. */
          }
        }
        emit({
          type: "error",
          text: progress.paymentStarted
            ? "The connection ended before Lycoris could finish. A payment may have been attempted; check the evidence before requesting another report."
            : "Lycoris could not finish its reply. Please try again.",
        });
      } finally {
        signal.removeEventListener("abort", cancel);
        clearInterval(poll);
        writer.close();
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
