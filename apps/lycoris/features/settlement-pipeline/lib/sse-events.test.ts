import { describe, expect, it } from "bun:test";
import { takeSseEvents } from "./sse-events";

describe("takeSseEvents", () => {
  it("parses complete data lines and keeps a partial line in the buffer", () => {
    const first = takeSseEvents("", 'data: {"type":"gate","step":2}\n\ndata: {"type":"tok');
    expect(first.events).toEqual([{ type: "gate", step: 2 }]);
    expect(first.buffer).toBe('data: {"type":"tok');

    const second = takeSseEvents(first.buffer, 'en","text":"hello"}\n');
    expect(second.events).toEqual([{ type: "token", text: "hello" }]);
    expect(second.buffer).toBe("");
  });

  it("flushes a final data line that has no trailing newline", () => {
    const { events, buffer } = takeSseEvents(
      "",
      'data: {"type":"done","result":{"httpStatus":200}}',
      true,
    );
    expect(buffer).toBe("");
    expect(events).toEqual([{ type: "done", result: { httpStatus: 200 } as never }]);
  });
});
