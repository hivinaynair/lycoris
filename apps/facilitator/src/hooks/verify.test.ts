import { afterAll, describe, expect, it, mock, spyOn } from "bun:test";
import type { SignedMandate } from "@repo/shared/mandate";
import { serializeMandateHeader } from "@repo/shared/mandate-header";
import type { AgentProfile } from "@repo/shared/types";
import type { FacilitatorVerifyContext } from "@x402/core/facilitator";
import type { PublicClient } from "viem";
import * as attest from "../lib/attest.js";
import { requestCtx } from "../lib/request-context.js";

const mockPublishAttestation = spyOn(attest, "publishAttestation").mockImplementation(async () => ({
  attestationTx: "0xattestation",
  commitment: "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
  salt: "0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
}));
afterAll(() => {
  mockPublishAttestation.mockRestore();
});

const { buildVerifyRejectionPaymentHash } = await import("../lib/rejection-payment-hash.js");
const { onBeforeVerify } = await import("./verify.js");

import type { VerifyDeps } from "../lib/validate-mandate.js";

const MERCHANT = "0x9999999999999999999999999999999999999999" as const;

const PAYER = "0xe9F97E2F7c6DCB8FCdBCDFBA074334D22a6c3117" as `0x${string}`;
const DELEGATOR = "0xAa870A9C6FEd34B8aC01Da17d675d748f238a420" as `0x${string}`;
const REGISTRY = "0x8004A818BFB912233c491871b3d84c89A494BD9e" as `0x${string}`;
const AGENT_ID = 1n;

const VALID_MANDATE: SignedMandate = {
  payload: {
    agent: PAYER,
    delegator: DELEGATOR,
    payTo: MERCHANT,
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

const DEFAULT_AMOUNT_ATOMIC = "10000";
const AUTH_NONCE = "0xabc123";

function makeCtx(amountAtomic = DEFAULT_AMOUNT_ATOMIC): FacilitatorVerifyContext {
  return {
    paymentPayload: {
      resource: "http://localhost:3000/api/settlement-risk-report",
      payload: { from: PAYER, authorization: { nonce: AUTH_NONCE } },
      accepted: { amount: amountAtomic },
    },
    requirements: { amount: amountAtomic, payTo: MERCHANT },
  } as FacilitatorVerifyContext;
}

function mockReadContractClient(balance: bigint): Pick<PublicClient, "readContract"> {
  return {
    readContract: mock(async () => balance),
  } as Pick<PublicClient, "readContract">;
}

function happyDeps(overrides: Partial<VerifyDeps> = {}): VerifyDeps {
  return {
    verifyMandateSignature: mock(async () => true),
    lookupIdentity: mock(async () => VALID_PROFILE),
    registryAddress: REGISTRY,
    client: mockReadContractClient(1000000000n),
    ...overrides,
  };
}

function withMandateHeader<T>(
  fn: () => Promise<T>,
  mandate: SignedMandate = VALID_MANDATE,
  agentId = AGENT_ID,
) {
  return requestCtx.run(
    {
      mandateJson: serializeMandateHeader({ mandate, agentId }),
    },
    fn,
  );
}

describe("onBeforeVerify", () => {
  it("builds deterministic rejection hashes from authorization nonce", () => {
    const input = {
      amountAtomic: 200000n,
      authorizationNonce: AUTH_NONCE,
      payer: PAYER,
      reason: "identity_not_found",
      resource: "http://localhost:3000/api/settlement-risk-report",
    };
    expect(buildVerifyRejectionPaymentHash(input)).toBe(buildVerifyRejectionPaymentHash(input));
    expect(buildVerifyRejectionPaymentHash(input)).not.toBe(
      buildVerifyRejectionPaymentHash({ ...input, reason: "mandate_amount_exceeded" }),
    );
  });

  it("aborts when mandate header is missing", async () => {
    const result = await onBeforeVerify(makeCtx(), happyDeps());
    expect(result).toEqual({ abort: true, reason: "mandate_missing" });
  });

  it("aborts when mandate signature is invalid", async () => {
    const result = await withMandateHeader(() =>
      onBeforeVerify(
        makeCtx(),
        happyDeps({
          verifyMandateSignature: mock(async () => false),
        }),
      ),
    );
    expect(result).toEqual({ abort: true, reason: "mandate_invalid" });
  });

  it("aborts when mandate is expired", async () => {
    const expired: SignedMandate = {
      ...VALID_MANDATE,
      payload: { ...VALID_MANDATE.payload, expiry: 1n },
    };
    const result = await withMandateHeader(() => onBeforeVerify(makeCtx(), happyDeps()), expired);
    expect(result).toEqual({ abort: true, reason: "mandate_expired" });
  });

  it("aborts when payment amount exceeds mandate maxAmountUsdc", async () => {
    const result = await withMandateHeader(() => onBeforeVerify(makeCtx("101000000"), happyDeps()));
    expect(result).toEqual({ abort: true, reason: "mandate_amount_exceeded" });
  });

  // A mandate says how much and until when. Without a recipient bound into the
  // signature it never says to whom, so one issued for this resource would be
  // just as valid at a resource the delegator never agreed to pay.
  it("aborts when the payment goes to a merchant the mandate did not authorize", async () => {
    const ctx = makeCtx();
    ctx.requirements.payTo = "0x8888888888888888888888888888888888888888";
    const result = await withMandateHeader(() => onBeforeVerify(ctx, happyDeps()));
    expect(result).toEqual({ abort: true, reason: "mandate_recipient_mismatch" });
  });

  it("accepts the merchant the mandate names, in any casing", async () => {
    const ctx = makeCtx();
    ctx.requirements.payTo = MERCHANT.toUpperCase().replace("0X", "0x");
    const result = await withMandateHeader(() => onBeforeVerify(ctx, happyDeps()));
    expect(result).toBeUndefined();
  });

  it("aborts when agent not found in ERC-8004 (lookup returns null)", async () => {
    const result = await withMandateHeader(() =>
      onBeforeVerify(
        makeCtx(),
        happyDeps({
          lookupIdentity: mock(async () => null),
        }),
      ),
    );
    expect(result).toEqual({ abort: true, reason: "identity_not_found" });
  });

  it("checks ERC-8004 identity before amount for the zero-limit ghost mandate", async () => {
    const ghostMandate: SignedMandate = {
      ...VALID_MANDATE,
      payload: { ...VALID_MANDATE.payload, maxAmountUsdc: 0n, nonce: 0n },
    };
    const result = await withMandateHeader(
      () =>
        onBeforeVerify(
          makeCtx("200000"),
          happyDeps({
            lookupIdentity: mock(async () => null),
          }),
        ),
      ghostMandate,
      0n,
    );
    expect(result).toEqual({ abort: true, reason: "identity_not_found" });
  });

  it("aborts when ERC-8004 wallet does not match payer", async () => {
    const wrongWallet = "0x0000000000000000000000000000000000000001" as `0x${string}`;
    const result = await withMandateHeader(() =>
      onBeforeVerify(
        makeCtx(),
        happyDeps({
          lookupIdentity: mock(async () => ({ ...VALID_PROFILE, wallet: wrongWallet })),
        }),
      ),
    );
    expect(result).toEqual({ abort: true, reason: "identity_not_found" });
  });

  it("aborts with insufficient_funds when wallet balance is below payment amount", async () => {
    const result = await withMandateHeader(() =>
      onBeforeVerify(
        makeCtx("10000"),
        happyDeps({
          client: mockReadContractClient(9999n),
        }),
      ),
    );
    expect(result).toEqual({ abort: true, reason: "insufficient_funds" });
  });

  it("returns undefined when all checks pass", async () => {
    const result = await withMandateHeader(() => onBeforeVerify(makeCtx(), happyDeps()));
    expect(result).toBeUndefined();
  });
});
