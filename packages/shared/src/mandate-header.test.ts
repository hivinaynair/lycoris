import { describe, expect, it } from "bun:test";
import {
  type MandateHeaderValue,
  parseMandateHeader,
  parseSerializedMandateHeader,
  serializeMandateHeader,
  toSerializedMandateHeader,
} from "./mandate-header";

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
function tampered(mutate: (body: Loose) => void): Loose {
  const body = JSON.parse(serializeMandateHeader(value)) as Loose;
  mutate(body);
  return body;
}

describe("mandate header round trip", () => {
  it("survives the object form", () => {
    expect(parseSerializedMandateHeader(toSerializedMandateHeader(value))).toEqual(value);
  });

  it("survives the string form", () => {
    expect(parseMandateHeader(serializeMandateHeader(value))).toEqual(value);
  });
});

describe("parseSerializedMandateHeader rejects", () => {
  it("a malformed delegator, which is what a verifier checks the signature against", () => {
    expect(
      parseSerializedMandateHeader(
        tampered((b) => {
          b.payload.delegator = "not-an-address";
        }),
      ),
    ).toBeUndefined();
  });

  it("a malformed agent", () => {
    expect(
      parseSerializedMandateHeader(
        tampered((b) => {
          b.payload.agent = "0xshort";
        }),
      ),
    ).toBeUndefined();
  });

  it("a signature that is not hex", () => {
    expect(
      parseSerializedMandateHeader(
        tampered((b) => {
          b.signature = "nope";
        }),
      ),
    ).toBeUndefined();
  });

  it("an empty amount instead of reading it as zero", () => {
    // BigInt("") is 0n, so an empty spending ceiling must be refused, not silently allowed.
    expect(
      parseSerializedMandateHeader(
        tampered((b) => {
          b.payload.maxAmountUsdc = "";
        }),
      ),
    ).toBeUndefined();
  });

  it("a negative or non-numeric bigint field", () => {
    expect(
      parseSerializedMandateHeader(
        tampered((b) => {
          b.payload.expiry = "-1";
        }),
      ),
    ).toBeUndefined();
    expect(
      parseSerializedMandateHeader(
        tampered((b) => {
          b.agentId = 7;
        }),
      ),
    ).toBeUndefined();
  });

  it("values that are not an object at all", () => {
    for (const raw of [null, undefined, "string", 42, []]) {
      expect(parseSerializedMandateHeader(raw)).toBeUndefined();
    }
  });
});

describe("parseMandateHeader", () => {
  it("returns undefined for unparseable JSON", () => {
    expect(parseMandateHeader("{not json")).toBeUndefined();
    expect(parseMandateHeader("[]")).toBeUndefined();
  });
});
