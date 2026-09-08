import { describe, expect, it } from "bun:test";
import { challengeFromPaymentRequired, extractAuthorizationNonce } from "./x402-decode";

describe("challengeFromPaymentRequired", () => {
  it("reads the fields a well-formed challenge carries", () => {
    expect(
      challengeFromPaymentRequired({
        scheme: "exact",
        network: "eip155:84532",
        maxAmountRequired: "1000",
        resource: { url: "https://example.test/weather" },
        description: "Weather",
      }),
    ).toEqual({
      scheme: "exact",
      network: "eip155:84532",
      maxAmountRequired: "1000",
      resource: "https://example.test/weather",
      description: "Weather",
      error: undefined,
    });
  });

  it("accepts a bare string resource", () => {
    expect(challengeFromPaymentRequired({ resource: "https://example.test/a" }).resource).toBe(
      "https://example.test/a",
    );
  });

  it("normalises a numeric amount rather than dropping it", () => {
    expect(challengeFromPaymentRequired({ maxAmountRequired: 1000 }).maxAmountRequired).toBe(
      "1000",
    );
  });

  it("reports a wrongly-typed field as absent instead of passing it through", () => {
    const challenge = challengeFromPaymentRequired({ scheme: 42, description: { a: 1 } });
    expect(challenge.scheme).toBeUndefined();
    expect(challenge.description).toBeUndefined();
  });

  it("survives a challenge that is not an object at all", () => {
    expect(challengeFromPaymentRequired(null)).toEqual({
      scheme: undefined,
      network: undefined,
      maxAmountRequired: undefined,
      resource: undefined,
      description: undefined,
      error: undefined,
    });
    expect(challengeFromPaymentRequired("nonsense").scheme).toBeUndefined();
  });
});

describe("extractAuthorizationNonce", () => {
  it("reads a nested nonce", () => {
    expect(extractAuthorizationNonce({ payload: { authorization: { nonce: "n1" } } })).toBe("n1");
  });

  it("returns undefined for a missing or wrongly-typed nonce", () => {
    expect(extractAuthorizationNonce({ payload: { authorization: { nonce: 5 } } })).toBeUndefined();
    expect(extractAuthorizationNonce({})).toBeUndefined();
    expect(extractAuthorizationNonce(undefined)).toBeUndefined();
  });
});
