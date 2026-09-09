import { afterAll, beforeEach, describe, expect, it, spyOn } from "bun:test";
import type { SignedMandate } from "@repo/shared/mandate";
import { Decision, IdentityStatus } from "@repo/shared/types";
import * as attest from "./attest.js";
import * as persist from "./persist-attestation.js";
import { recordOutcome } from "./record-outcome.js";

process.env.DATABASE_URL = "postgresql://fake";

// Spy on the two collaborators rather than the database: recordOutcome's contract is
// what it hands the persistence layer, not how Drizzle writes it.
const publishAttestation = spyOn(attest, "publishAttestation");
const persistAttestationRow = spyOn(persist, "persistAttestationRow").mockImplementation(
  async () => {},
);

// Spies mutate the shared module namespace for the whole test process; without this
// every file that runs later would see the mock instead of the real implementation.
afterAll(() => {
  publishAttestation.mockRestore();
  persistAttestationRow.mockRestore();
});

const PUBLISHED = {
  attestationTx: "0xattesttx",
  commitment: `0x${"c".repeat(64)}`,
  salt: `0x${"d".repeat(64)}`,
} as const;

const PAYER = "0x1111111111111111111111111111111111111111";
const PAYMENT_HASH = `0x${"a".repeat(64)}` as const;
const SETTLEMENT_TX = `0x${"b".repeat(64)}`;

const mandate: SignedMandate = {
  payload: {
    agent: PAYER as `0x${string}`,
    delegator: "0x2222222222222222222222222222222222222222",
    maxAmountUsdc: 100n,
    expiry: 9_999_999_999n,
    nonce: 1n,
  },
  signature: `0x${"e".repeat(130)}`,
};
const mandateEntry = { agentId: 7n, mandate };

const base = {
  payer: PAYER,
  amountAtomic: 100_000n,
  paymentHash: PAYMENT_HASH,
  identityStatus: IdentityStatus.Verified,
};

const row = () => persistAttestationRow.mock.calls[0]?.[0] as Record<string, unknown>;
const publishArgs = () => publishAttestation.mock.calls[0]?.[0] as Record<string, unknown>;

beforeEach(() => {
  persistAttestationRow.mockClear();
  publishAttestation.mockClear();
  publishAttestation.mockImplementation(async () => PUBLISHED);
});

describe("recordOutcome", () => {
  it("persists a settlement row that carries the transaction", async () => {
    await recordOutcome({
      ...base,
      decision: Decision.Approved,
      mandateEntry,
      authorizationNonce: "nonce-1",
      settlementTx: SETTLEMENT_TX,
    });

    expect(row()).toMatchObject({
      settlementTx: SETTLEMENT_TX,
      decision: Decision.Approved,
      authorizationNonce: "nonce-1",
      published: PUBLISHED,
    });
    expect(row().decisionRecord).toMatchObject({
      agentId: "7",
      settlementTxHash: SETTLEMENT_TX,
      attestationTxHash: "0xattesttx",
    });
  });

  it("persists a rejection with no transaction and a reason", async () => {
    await recordOutcome({
      ...base,
      decision: Decision.Rejected,
      mandateEntry,
      rejectionReason: "mandate_amount_exceeded",
    });

    expect(row()).toMatchObject({ settlementTx: null, decision: Decision.Rejected });
    const record = row().decisionRecord as Record<string, unknown>;
    expect(record).toMatchObject({ rejectionReason: "mandate_amount_exceeded" });
    expect(record.settlementTxHash).toBeUndefined();
  });

  it("derives the mandate ceiling from the entry, so no caller can disagree with it", async () => {
    await recordOutcome({ ...base, decision: Decision.Approved, mandateEntry });
    // 100 whole USDC * 1e6
    expect(publishArgs()).toMatchObject({ mandateMaxAmountUsdc: 100_000_000n });
  });

  it("treats a missing mandate as a zero ceiling and an unknown agent", async () => {
    await recordOutcome({
      ...base,
      decision: Decision.Rejected,
      rejectionReason: "mandate_missing",
    });

    expect(publishArgs()).toMatchObject({ mandateMaxAmountUsdc: 0n });
    expect(row().decisionRecord).toMatchObject({ agentId: "unknown" });
  });

  it("still persists the decision when the attestation could not be published", async () => {
    publishAttestation.mockImplementation(async () => null);
    await recordOutcome({ ...base, decision: Decision.Approved, mandateEntry });

    expect(row()).toMatchObject({ published: null });
    expect(row().decisionRecord).toMatchObject({ agentId: "7", attestationTxHash: undefined });
  });
});
