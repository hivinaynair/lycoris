import type { TriggerResult } from "./payment-demo";

export type ChatSession = { sessionId?: string; continuationToken?: string; streamIndex: number };

export type PaymentSseEvent =
  | { type: "reply" }
  | { type: "session"; session: ChatSession }
  | { type: "error"; text: string }
  | { type: "token"; text: string }
  | { type: "gate"; step: number }
  | { type: "done"; result: TriggerResult };

function parseSseEvent(line: string): PaymentSseEvent | undefined {
  if (!line.startsWith("data: ")) return undefined;
  try {
    const event = JSON.parse(line.slice(6)) as {
      type?: string;
      session?: ChatSession;
      text?: string;
      step?: number;
      result?: TriggerResult;
    };
    if (event.type === "reply") return { type: "reply" };
    if (event.type === "session" && event.session && Number.isInteger(event.session.streamIndex))
      return { type: "session", session: event.session };
    if (event.type === "error" && typeof event.text === "string")
      return { type: "error", text: event.text };
    if (event.type === "token" && event.text) {
      return { type: "token", text: event.text };
    }
    if (event.type === "gate" && typeof event.step === "number") {
      return { type: "gate", step: event.step };
    }
    if (event.type === "done" && event.result) {
      return { type: "done", result: event.result };
    }
  } catch {
    /* malformed line */
  }
  return undefined;
}

export function takeSseEvents(buffer: string, chunk: string, flush = false) {
  const next = buffer + chunk;
  const lines = next.split("\n");
  const rest = flush ? "" : (lines.pop() ?? "");
  if (flush && lines[lines.length - 1] === "") lines.pop();

  const events: PaymentSseEvent[] = [];
  for (const line of lines) {
    const event = parseSseEvent(line);
    if (event) events.push(event);
  }
  return { buffer: rest, events };
}
