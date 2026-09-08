import { describe, expect, it } from "bun:test";
import { type MandateHeaderValue, parseMandateHeader, serializeMandateHeader } from "./header";

const AGENT = "0x1111111111111111111111111111111111111111" as const;
const DELEGATOR = "0x2222222222222222222222222222222222222222" as const;
const SIGNATURE = `0x${"e".repeat(130)}` as const;

const value: MandateHeaderValue = {
  agentId: 7n,
  mandate: {
    payload: { agent: AGENT, delegator: DELEGATOR, maxAmountUsdc: 100n, expiry: 999n, nonce: 1n },
    signature: SIGNATURE,
  },
};

type Loose = { agentId: unknown; signature: unknown; payload: Record<string, unknown> };

/** Serialize, then swap one field for something a hostile caller might send. */
function tampered(mutate: (body: Loose) => void) {
  const body = JSON.parse(serializeMandateHeader(value)) as Loose;
  mutate(body);
  return JSON.stringify(body);
}

describe("parseMandateHeader", () => {
  it("round-trips a well-formed header", () => {
    expect(parseMandateHeader(serializeMandateHeader(value))).toEqual(value);
  });

  it("rejects a malformed delegator, which is what a verifier checks the signature against", () => {
    expect(
      parseMandateHeader(
        tampered((b) => {
          b.payload.delegator = "not-an-address";
        }),
      ),
    ).toBeUndefined();
    expect(
      parseMandateHeader(
        tampered((b) => {
          delete b.payload.delegator;
        }),
      ),
    ).toBeUndefined();
  });

  it("rejects a malformed agent", () => {
    expect(
      parseMandateHeader(
        tampered((b) => {
          b.payload.agent = "0xshort";
        }),
      ),
    ).toBeUndefined();
  });

  it("rejects a signature that is not hex", () => {
    expect(
      parseMandateHeader(
        tampered((b) => {
          b.signature = "nope";
        }),
      ),
    ).toBeUndefined();
  });

  it("rejects an empty amount instead of reading it as zero", () => {
    // BigInt("") is 0n, so an empty ceiling must be refused rather than silently allowed.
    expect(
      parseMandateHeader(
        tampered((b) => {
          b.payload.maxAmountUsdc = "";
        }),
      ),
    ).toBeUndefined();
  });

  it("rejects non-numeric bigint fields and unparseable JSON", () => {
    expect(
      parseMandateHeader(
        tampered((b) => {
          b.payload.expiry = "soon";
        }),
      ),
    ).toBeUndefined();
    expect(
      parseMandateHeader(
        tampered((b) => {
          b.agentId = -1;
        }),
      ),
    ).toBeUndefined();
    expect(parseMandateHeader("{not json")).toBeUndefined();
    expect(parseMandateHeader("[]")).toBeUndefined();
  });
});
