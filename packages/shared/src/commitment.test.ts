import { describe, expect, it } from "bun:test";
import {
  buildCommitment,
  type CommittedRecord,
  committedRecordFrom,
  randomSalt,
  verifyCommitment,
} from "./commitment.js";

const FIXTURE_SALT = "0x1111111111111111111111111111111111111111111111111111111111111111" as const;

const record: CommittedRecord = committedRecordFrom({
  paymentHash: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  payer: "0x1111111111111111111111111111111111111111",
  amountUsdc: 200_000n,
  policyMaxAmountUsdc: 2_000_000n,
  identityStatus: 1,
  decision: 0,
});

describe("commitment", () => {
  it("is deterministic for the same record and salt", () => {
    expect(buildCommitment(record, FIXTURE_SALT)).toBe(buildCommitment(record, FIXTURE_SALT));
  });

  it("differs when the salt differs", () => {
    expect(buildCommitment(record, randomSalt())).not.toBe(buildCommitment(record, randomSalt()));
  });

  it.each([
    [
      "paymentHash",
      {
        ...record,
        paymentHash:
          "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" as `0x${string}`,
      },
    ],
    [
      "payer",
      {
        ...record,
        payer: "0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed" as `0x${string}`,
      },
    ],
    ["amountUsdc", { ...record, amountUsdc: 5_000_000n }],
    ["policyMaxAmountUsdc", { ...record, policyMaxAmountUsdc: 1n }],
    ["identityStatus", { ...record, identityStatus: 0 }],
    ["decision", { ...record, decision: 1 }],
    ["rejectionReason", { ...record, rejectionReason: "denied" }],
  ] as const)("differs when bound field %s changes", (_field, tampered) => {
    expect(buildCommitment(tampered, FIXTURE_SALT)).not.toBe(buildCommitment(record, FIXTURE_SALT));
  });

  it("is stable under payer checksum vs lowercase", () => {
    const checksummedPayer = "0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed" as `0x${string}`;
    const lowerPayer = checksummedPayer.toLowerCase() as `0x${string}`;
    expect(checksummedPayer).not.toBe(lowerPayer);

    const checksummed = { ...record, payer: checksummedPayer };
    const lower = { ...record, payer: lowerPayer };
    expect(buildCommitment(checksummed, FIXTURE_SALT)).toBe(buildCommitment(lower, FIXTURE_SALT));
  });

  it("verifies a matching record and rejects a tampered one", () => {
    const salt = randomSalt();
    const commitment = buildCommitment(record, salt);
    expect(verifyCommitment(record, salt, commitment)).toBe(true);
    expect(verifyCommitment({ ...record, decision: 1 }, salt, commitment)).toBe(false);
  });

  it("produces a 32-byte hex salt", () => {
    expect(randomSalt()).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it("matches a frozen abi.encode fixture", () => {
    expect(buildCommitment(record, FIXTURE_SALT)).toBe(
      "0x6d7ce4dbdba812203a4dd684c84a3171e2a43023b31a6c2c69aa3dfc4dfcda8e",
    );
  });
});
