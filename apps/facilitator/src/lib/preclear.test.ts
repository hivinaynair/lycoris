import { afterAll, beforeEach, describe, expect, it, mock, spyOn } from "bun:test";
import type { SignedMandate } from "@repo/shared/mandate";
import { serializeMandateHeader } from "@repo/shared/mandate-header";
import type { AgentProfile } from "@repo/shared/types";
import * as attest from "./attest.js";
import { requestCtx } from "./request-context.js";
import type { VerifyDeps } from "./validate-mandate.js";

process.env.DATABASE_URL = "postgresql://fake";
process.env.FACILITATOR_PRIVATE_KEY =
  "0x0000000000000000000000000000000000000000000000000000000000000001";
process.env.ATTESTATION_REGISTRY_ADDRESS = "0x0000000000000000000000000000000000000001";

const mockInsertValues = mock(async () => {});
mock.module("./db.js", () => ({
  getDb: () => ({ insert: () => ({ values: mockInsertValues }) }),
}));

const mockPublishAttestation = spyOn(attest, "publishAttestation").mockImplementation(async () => ({
  attestationTx: "0xattestation",
  commitment: "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
  salt: "0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
}));
afterAll(() => {
  mockPublishAttestation.mockRestore();
});

const { evaluatePreclear } = await import("./preclear.js");

const PAYER = "0xe9F97E2F7c6DCB8FCdBCDFBA074334D22a6c3117" as `0x${string}`;
const DELEGATOR = "0xAa870A9C6FEd34B8aC01Da17d675d748f238a420" as `0x${string}`;
const AGENT_ID = 1n;

const VALID_MANDATE: SignedMandate = {
  payload: {
    agent: PAYER,
    delegator: DELEGATOR,
    maxAmountUsdc: 10n,
    expiry: 9999999999n,
    nonce: 0n,
  },
  signature:
    "0x44c8561e7d2102913d710e6602bff7b81a06ab57f81761328d6d60d6d5ec95070cf73e7f3b452afda359fec26af2b7544c4e56c680640156b8a125993e30793b1b",
};

const VALID_PROFILE: AgentProfile = {
  agentId: AGENT_ID,
  wallet: PAYER,
  agentURI: `http://localhost:3000/api/agent/${PAYER}`,
};

function deps(overrides: Partial<VerifyDeps> = {}): VerifyDeps {
  return {
    verifyMandateSignature: mock(async () => true),
    lookupIdentity: mock(async () => VALID_PROFILE),
    registryAddress: "0x8004A818BFB912233c491871b3d84c89A494BD9e",
    client: { readContract: mock(async () => 1000000000n) } as VerifyDeps["client"],
    ...overrides,
  };
}

function withMandate<T>(fn: () => Promise<T>) {
  return requestCtx.run(
    { mandateJson: serializeMandateHeader({ mandate: VALID_MANDATE, agentId: AGENT_ID }) },
    fn,
  );
}

beforeEach(() => {
  mockInsertValues.mockClear();
  mockPublishAttestation.mockClear();
  mockPublishAttestation.mockImplementation(async () => ({
    attestationTx: "0xattestation",
    commitment: "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
    salt: "0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
  }));
});

describe("evaluatePreclear", () => {
  it("clears a payment within mandate", async () => {
    const result = await withMandate(() =>
      evaluatePreclear(
        {
          payer: PAYER,
          amountAtomic: 200_000n,
          resource: "http://localhost:3000/api/settlement-risk-report",
        },
        deps(),
      ),
    );
    expect(result).toEqual({ ok: true });
    expect(mockInsertValues).not.toHaveBeenCalled();
  });

  it("denies when the mandate header is missing", async () => {
    const result = await evaluatePreclear({ payer: PAYER, amountAtomic: 200_000n }, deps());
    expect(result).toEqual({ ok: false, reason: "mandate_missing" });
  });

  it("denies when identity is missing", async () => {
    const result = await withMandate(() =>
      evaluatePreclear(
        { payer: PAYER, amountAtomic: 200_000n },
        deps({ lookupIdentity: mock(async () => null) }),
      ),
    );
    expect(result).toEqual({ ok: false, reason: "identity_not_found" });
  });
});
