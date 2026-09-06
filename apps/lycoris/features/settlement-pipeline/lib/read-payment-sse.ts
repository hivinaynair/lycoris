import { type PaymentSseEvent, takeSseEvents } from "./sse-events";

/** Consume a fetch SSE body and invoke `onEvent` for each parsed event. */
export async function readPaymentSse(
  body: ReadableStream<Uint8Array>,
  onEvent: (event: PaymentSseEvent) => void,
) {
  const reader = body.getReader();
  const dec = new TextDecoder();
  let buffer = "";

  const apply = (chunk: string, flush = false) => {
    const next = takeSseEvents(buffer, chunk, flush);
    buffer = next.buffer;
    for (const event of next.events) onEvent(event);
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      apply(dec.decode(), true);
      break;
    }
    apply(dec.decode(value, { stream: true }));
  }
}
