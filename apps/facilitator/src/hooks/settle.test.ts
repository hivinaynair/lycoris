import { afterAll, beforeEach, describe, expect, it, mock, spyOn } from "bun:test";
import type { SignedMandate } from "@repo/shared/mandate";
import { serializeMandateHeader } from "@repo/shared/mandate-header";
import type { AgentProfile } from "@repo/shared/types";
import { Decision } from "@repo/shared/types";
import * as attest from "../lib/attest.js";
import { requestCtx } from "../lib/request-context.js";

// ── Provide DATABASE_URL so getDb() lazy init doesn't throw ────────────────
process.env.DATABASE_URL = "postgresql://fake";
process.env.FACILITATOR_PRIVATE_KEY =
  "0x0000000000000000000000000000000000000000000000000000000000000001";
process.env.ATTESTATION_REGISTRY_ADDRESS = "0x0000000000000000000000000000000000000001";

// ── Mock the DB module before importing settle ──────────────────────────────
const mockInsertValues = mock(async () => {});
const mockInsert = mock(() => ({ values: mockInsertValues }));

const mockSelectLimit = mock(async () => []);
const mockPolicyLimit = mock(async () => [{ policyMaxAmountUsdc: "10" }]);
const mockSelect = mock(() => ({
  from: () => ({ where: () => ({ limit: mockSelectLimit }), limit: mockPolicyLimit }),
}));

mock.module("@repo/db", () => ({
  createDb: () => ({ select: mockSelect, insert: mockInsert }),
  schema: {
    settlementAttestations: { authorizationNonce: "authorization_nonce", decision: "decision" },
    facilitatorConfig: {},
  },
}));

const mockWriteContract = mock(async () => "0xattesttx");
const mockWaitForTransactionReceipt = mock(async () => ({ status: "success" }));
const mockReadContract = mock(async () => 1000000000n); // 1000 USDC — sufficient by default
mock.module("../lib/clients.js", () => ({
  walletClient: { writeContract: mockWriteContract },
  publicClient: {
    waitForTransactionReceipt: mockWaitForTransactionReceipt,
    readContract: mockReadContract,
  },
  account: "0xaccount",
}));

const mockPublishAttestation = spyOn(attest, "publishAttestation").mockImplementation(async () => ({
  attestationTx: "0xattesttx",
  commitment: "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
  salt: "0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
}));
afterAll(() => {
  mockPublishAttestation.mockRestore();
});

const PAYER = "0xe9F97E2F7c6DCB8FCdBCDFBA074334D22a6c3117" as `0x${string}`;
const DELEGATOR = "0xAa870A9C6FEd34B8aC01Da17d675d748f238a420" as `0x${string}`;
const AGENT_ID = 1n;

const VALID_MANDATE: SignedMandate = {
  payload: {
    agent: PAYER,
    delegator: DELEGATOR,
    maxAmountUsdc: 100n,
    expiry: 9999999999n,
    nonce: 0n,
  },
  signature:
    "0x44c8561e7d2102913d710e6602bff7b81a06ab57f81761328d6d60d6d5ec95070cf73e7f3b452afda359fec26af2b7544c4e56c680640156b8a125993e30793b1b",
};

const VALID_PROFILE: AgentProfile = {
  agentId: AGENT_ID,
  wallet: PAYER,
  agentURI: "http://localhost:3000/api/agent/0xe9F97E2F7c6DCB8FCdBCDFBA074334D22a6c3117",
};

const mockVerifyMandateSig = mock(async () => true);
const mockLookupIdentity = mock(async () => VALID_PROFILE);

mock.module("../lib/deps.js", () => ({
  verifyDeps: {
    verifyMandateSignature: mockVerifyMandateSig,
    lookupIdentity: mockLookupIdentity,
    registryAddress: "0x8004A818BFB912233c491871b3d84c89A494BD9e",
    client: {},
  },
}));

mock.module("../env.js", () => ({
  env: { ATTESTATION_REGISTRY_ADDRESS: "0xreg" },
}));

mock.module("@repo/shared/abis", () => ({
  ATTESTATION_REGISTRY_ABI: [],
  BASE_SEPOLIA_USDC_ADDRESS: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  ERC20_BALANCE_ABI: [],
}));
mock.module("drizzle-orm", () => ({
  and: mock((...args: unknown[]) => args),
  eq: mock((a: unknown, b: unknown) => [a, b]),
}));

const { onBeforeSettle, onAfterSettle, onSettleFailure } = await import("./settle.js");

const VALID_MANDATE_JSON = serializeMandateHeader({ agentId: AGENT_ID, mandate: VALID_MANDATE });

const AUTH_NONCE = "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef";
const NETWORK = "eip155:84532" as const;
const SETTLEMENT_TX = "0xsettlementtxhash";

function makePayload(nonce?: string) {
  return {
    resource: "http://localhost:3000/api/premium-risk-report",
    payload: { from: PAYER, authorization: { from: PAYER, nonce } },
    accepted: {
      amount: "10000000",
      network: NETWORK,
      scheme: "exact",
      asset: "usdc",
      payTo: PAYER,
      maxTimeoutSeconds: 60,
    },
  };
}

function makeRequirements(amount = "10000000") {
  return {
    amount,
    network: NETWORK,
    scheme: "exact",
    asset: "usdc",
    payTo: PAYER,
    maxTimeoutSeconds: 60,
  };
}

function withMandateCtx<T>(fn: () => Promise<T>): Promise<T> {
  return requestCtx.run({ mandateJson: VALID_MANDATE_JSON }, fn);
}

beforeEach(() => {
  mockSelect.mockClear();
  mockInsert.mockClear();
  mockInsertValues.mockClear();
  mockSelectLimit.mockClear();
  mockPolicyLimit.mockClear();
  mockWriteContract.mockClear();
  mockPublishAttestation.mockClear();
  mockWaitForTransactionReceipt.mockClear();
  mockReadContract.mockClear();
  mockVerifyMandateSig.mockClear();
  mockLookupIdentity.mockClear();
  mockSelectLimit.mockImplementation(async () => []);
  mockPolicyLimit.mockImplementation(async () => [{ policyMaxAmountUsdc: "10" }]);
  mockPublishAttestation.mockImplementation(async () => ({
    attestationTx: "0xattesttx",
    commitment: "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
    salt: "0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
  }));
  mockWaitForTransactionReceipt.mockImplementation(async () => ({ status: "success" }));
  mockReadContract.mockImplementation(async () => 1000000000n);
  mockVerifyMandateSig.mockImplementation(async () => true);
  mockLookupIdentity.mockImplementation(async () => VALID_PROFILE);
});

describe("onBeforeSettle", () => {
  it("does not abort when amount is within mandate", async () => {
    const result = await withMandateCtx(() =>
      onBeforeSettle({
        paymentPayload: makePayload(AUTH_NONCE) as any,
        requirements: makeRequirements("1000") as any,
      }),
    );
    expect(result).toBeUndefined();
  });

  it("aborts with mandate reason when mandate validation fails (no mandate header)", async () => {
    const result = await onBeforeSettle({
      paymentPayload: makePayload(AUTH_NONCE) as any,
      requirements: makeRequirements("1000") as any,
    });
    expect(result).toEqual({ abort: true, reason: "mandate_missing" });
  });

  it("paymentHash is deterministic for mandate rejection — same inputs produce same value in DB", async () => {
    const ctx = {
      paymentPayload: makePayload(AUTH_NONCE) as any,
      requirements: makeRequirements("200000000") as any, // 200 USDC > $100 mandate
    };
    await withMandateCtx(() => onBeforeSettle(ctx));
    await withMandateCtx(() => onBeforeSettle(ctx));

    expect(mockInsertValues).toHaveBeenCalledTimes(2);
    const [first, second] = mockInsertValues.mock.calls;
    expect(first?.[0].paymentHash).toBe(second?.[0].paymentHash);
  });

  it("aborts with insufficient_funds when wallet balance is below payment amount", async () => {
    mockReadContract.mockImplementationOnce(async () => 500n); // 0.0005 USDC — less than 1000 atomic
    const result = await withMandateCtx(() =>
      onBeforeSettle({
        paymentPayload: makePayload(AUTH_NONCE) as any,
        requirements: makeRequirements("1000") as any,
      }),
    );
    expect(result).toEqual({ abort: true, reason: "insufficient_funds" });
  });

  it("does not abort when wallet balance equals payment amount", async () => {
    mockReadContract.mockImplementationOnce(async () => 1000n); // exactly 1000 atomic
    const result = await withMandateCtx(() =>
      onBeforeSettle({
        paymentPayload: makePayload(AUTH_NONCE) as any,
        requirements: makeRequirements("1000") as any,
      }),
    );
    expect(result).toBeUndefined();
  });
});

describe("onAfterSettle", () => {
  it("inserts approved record with authorizationNonce", async () => {
    await withMandateCtx(() =>
      onAfterSettle({
        paymentPayload: makePayload(AUTH_NONCE) as any,
        result: { success: true, transaction: SETTLEMENT_TX, network: NETWORK },
      }),
    );
    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        settlementTx: SETTLEMENT_TX,
        authorizationNonce: AUTH_NONCE,
        decision: Decision.Approved,
        decisionRecord: expect.objectContaining({
          payer: PAYER,
          settlementTxHash: SETTLEMENT_TX,
        }),
        policyMaxAmountUsdc: 100_000_000n, // mandate max $100 in atomic USDC
        commitment: expect.stringMatching(/^0x/),
        commitmentSalt: expect.stringMatching(/^0x/),
      }),
    );
  });

  it("still inserts DB record if attestation write fails", async () => {
    mockPublishAttestation.mockResolvedValueOnce(null);
    await onAfterSettle({
      paymentPayload: makePayload(AUTH_NONCE) as any,
      result: { success: true, transaction: SETTLEMENT_TX, network: NETWORK },
    });
    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        attestationTx: null,
        commitment: null,
        commitmentSalt: null,
        decision: Decision.Approved,
      }),
    );
  });

  it("stores a rejected record when result is not successful", async () => {
    await onAfterSettle({
      paymentPayload: makePayload(AUTH_NONCE) as any,
      result: {
        success: false,
        transaction: "",
        network: NETWORK,
        errorReason: "insufficient_funds",
      },
    });
    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        attestationTx: "0xattesttx",
        authorizationNonce: AUTH_NONCE,
        decision: Decision.Rejected,
        decisionRecord: expect.objectContaining({
          payer: PAYER,
          rejectionReason: "insufficient_funds",
        }),
        commitment: expect.stringMatching(/^0x/),
        commitmentSalt: expect.stringMatching(/^0x/),
      }),
    );
  });

  it("stores rejected record when settlement receipt failed", async () => {
    mockWaitForTransactionReceipt.mockImplementationOnce(async () => ({ status: "reverted" }));

    await onAfterSettle({
      paymentPayload: makePayload(AUTH_NONCE) as any,
      result: { success: true, transaction: SETTLEMENT_TX, network: NETWORK },
    });

    expect(mockPublishAttestation).toHaveBeenCalled();
    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        settlementTx: SETTLEMENT_TX,
        attestationTx: "0xattesttx",
        authorizationNonce: AUTH_NONCE,
        decision: Decision.Rejected,
        decisionRecord: expect.objectContaining({
          payer: PAYER,
          rejectionReason: "settlement_transaction_failed",
          settlementTxHash: SETTLEMENT_TX,
        }),
        commitment: expect.stringMatching(/^0x/),
        commitmentSalt: expect.stringMatching(/^0x/),
      }),
    );
  });

  it("stores rejected record when settlement receipt cannot be confirmed", async () => {
    mockWaitForTransactionReceipt.mockRejectedValueOnce(new Error("receipt unavailable"));

    await onAfterSettle({
      paymentPayload: makePayload(AUTH_NONCE) as any,
      result: { success: true, transaction: SETTLEMENT_TX, network: NETWORK },
    });

    expect(mockPublishAttestation).toHaveBeenCalled();
    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        settlementTx: SETTLEMENT_TX,
        attestationTx: "0xattesttx",
        authorizationNonce: AUTH_NONCE,
        decision: Decision.Rejected,
        decisionRecord: expect.objectContaining({
          payer: PAYER,
          rejectionReason: "settlement_receipt_unconfirmed",
          settlementTxHash: SETTLEMENT_TX,
        }),
        commitment: expect.stringMatching(/^0x/),
        commitmentSalt: expect.stringMatching(/^0x/),
      }),
    );
  });
});

describe("onSettleFailure", () => {
  it("returns void when auth nonce is missing from payload", async () => {
    const result = await onSettleFailure({
      paymentPayload: makePayload(undefined) as any,
      requirements: makeRequirements() as any,
      error: new Error("nonce used"),
    });
    expect(result).toBeUndefined();
  });

  it("returns void when no matching approved record in DB", async () => {
    const result = await onSettleFailure({
      paymentPayload: makePayload(AUTH_NONCE) as any,
      requirements: makeRequirements() as any,
      error: new Error("nonce used"),
    });
    expect(result).toBeUndefined();
  });

  it("recovers with cached txHash when approved record exists", async () => {
    mockSelectLimit.mockImplementationOnce(async () => [
      { settlementTx: SETTLEMENT_TX, decision: Decision.Approved },
    ]);

    const result = await onSettleFailure({
      paymentPayload: makePayload(AUTH_NONCE) as any,
      requirements: makeRequirements() as any,
      error: new Error("nonce used"),
    });

    expect(result).toEqual({
      recovered: true,
      result: { success: true, transaction: SETTLEMENT_TX, network: NETWORK },
    });
  });

  it("returns void when approved record exists but settlementTx is null", async () => {
    mockSelectLimit.mockImplementationOnce(async () => [
      { settlementTx: null, decision: Decision.Approved },
    ]);

    const result = await onSettleFailure({
      paymentPayload: makePayload(AUTH_NONCE) as any,
      requirements: makeRequirements() as any,
      error: new Error("nonce used"),
    });
    expect(result).toBeUndefined();
  });
});
