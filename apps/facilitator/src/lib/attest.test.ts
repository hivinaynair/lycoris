import { beforeEach, describe, expect, it, mock } from "bun:test";
import { committedRecordFrom, verifyCommitment } from "@repo/shared/commitment";
import { Decision, IdentityStatus } from "@repo/shared/types";

process.env.DATABASE_URL = "postgresql://fake";
process.env.FACILITATOR_PRIVATE_KEY =
  "0x0000000000000000000000000000000000000000000000000000000000000001";
process.env.ATTESTATION_REGISTRY_ADDRESS = "0x0000000000000000000000000000000000000001";

const captured: { args?: unknown[] } = {};
const mockWriteContract = mock(async ({ args }: { args: unknown[] }) => {
  captured.args = args;
  return "0xattesttx";
});

mock.module("./clients.js", () => ({
  account: "0xaccount",
  walletClient: { writeContract: mockWriteContract },
}));

mock.module("../env.js", () => ({
  env: { ATTESTATION_REGISTRY_ADDRESS: "0x0000000000000000000000000000000000000001" },
}));

const { publishAttestation } = await import("./attest.js");

const input = {
  amountUsdc: 200_000n,
  decision: Decision.Approved,
  identityStatus: IdentityStatus.Verified,
  payer: "0x1111111111111111111111111111111111111111",
  paymentHash: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as const,
  mandateMaxAmountUsdc: 2_000_000n,
};

describe("publishAttestation", () => {
  beforeEach(() => {
    captured.args = undefined;
    mockWriteContract.mockClear();
  });

  it("returns a tx hash plus a verifying commitment/salt pair", async () => {
    const published = await publishAttestation(input);
    expect(published).not.toBeNull();
    expect(published?.attestationTx).toBe("0xattesttx");
    expect(published?.salt).toMatch(/^0x[0-9a-f]{64}$/);
    expect(
      verifyCommitment(committedRecordFrom(input), published?.salt, published?.commitment),
    ).toBe(true);
    expect(captured.args).toEqual([published?.commitment]);
  });

  it("uses a fresh salt on every call", async () => {
    const a = await publishAttestation(input);
    const b = await publishAttestation(input);
    expect(a?.salt).not.toBe(b?.salt);
    expect(a?.commitment).not.toBe(b?.commitment);
  });

  it("returns null when the chain write throws", async () => {
    mockWriteContract.mockRejectedValueOnce(new Error("rpc down"));
    expect(await publishAttestation(input)).toBeNull();
  });
});
