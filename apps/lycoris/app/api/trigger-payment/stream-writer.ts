import { isMandateFailure } from "@/lib/settlement-status";
import { sseLine } from "./sse";

export function createStreamWriter(
  controller: ReadableStreamDefaultController<Uint8Array>,
  signal: AbortSignal,
  details: Record<string, unknown>,
) {
  let closed = false;
  const emit = (event: unknown) => {
    if (closed || signal.aborted) return;
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
        ...details,
        mandateValid: !isMandateFailure(error),
        ...result,
        body: error ? { error } : result.body,
      },
    });
  };

  return {
    emit,
    finish,
    isClosed: () => closed,
    close() {
      if (!closed) {
        closed = true;
        controller.close();
      }
    },
  };
}
