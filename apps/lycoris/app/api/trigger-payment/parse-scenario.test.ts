import { describe, expect, it } from "bun:test";
import { chatRequest } from "./parse-scenario";

describe("agent chat request", () => {
  it("requires an actual message; the old run-button payload cannot start a payment", () => {
    for (const message of [undefined, "", "   ", "a".repeat(2001), 4]) {
      expect(chatRequest.safeParse({ scenarioIndex: 0, message }).success).toBe(false);
    }
  });
  it("rejects invalid scenarios instead of silently picking a funded wallet", () => {
    for (const scenarioIndex of [-1, 3, 0.5, "0", undefined]) {
      expect(chatRequest.safeParse({ scenarioIndex, message: "Weather please" }).success).toBe(
        false,
      );
    }
  });
  it("accepts a bounded conversation cursor and trims messages", () => {
    const session = {
      sessionId: "conversation-1",
      continuationToken: "opaque-token",
      streamIndex: 20,
    };
    expect(chatRequest.parse({ scenarioIndex: 2, message: " Hello ", session })).toEqual({
      scenarioIndex: 2,
      message: "Hello",
      session,
    });
    expect(
      chatRequest.safeParse({
        scenarioIndex: 0,
        message: "Hello",
        session: { ...session, streamIndex: -1 },
      }).success,
    ).toBe(false);
  });
});
