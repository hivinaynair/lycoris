import { describe, expect, it } from "bun:test";
import { type AttestationSourceRow, projectAttestation } from "./attestation-view";

const v2: AttestationSourceRow = {
  paymentHash: "0xpay",
  payerAddress: "0x1111111111111111111111111111111111111111",
  amountUsdc: 200_000n,
  policyMaxAmountUsdc: 2_000_000n,
  identityStatus: 1,
  decision: 0,
  createdAt: new Date("2026-08-16T12:00:00Z"),
  settlementTx: "0xsettle",
  attestationTx: "0xattest",
  commitment: "0xcccc",
  commitmentSalt: "0xsalt",
  decisionRecord: { decision: 0 },
  rejectionReason: undefined,
};

const v1: AttestationSourceRow = { ...v2, commitment: null, commitmentSalt: null };

describe("projectAttestation", () => {
  it("public V2 row is commitment + time + tx, no payer or amount", () => {
    const row = projectAttestation(v2, "public");
    expect(row).toMatchObject({
      role: "public",
      commitment: "0xcccc",
      legacy: false,
      timestamp: Math.floor(v2.createdAt.getTime() / 1000),
    });
    expect(row).not.toHaveProperty("payer");
    expect(row).not.toHaveProperty("amountUsdc");
    expect(row).not.toHaveProperty("decision");
    expect(row).not.toHaveProperty("commitmentSalt");
  });

  it("public V1 row is flagged legacy and still hides the book", () => {
    const row = projectAttestation(v1, "public");
    expect(row.legacy).toBe(true);
    expect(row.commitment).toBeNull();
    expect(row).not.toHaveProperty("payer");
  });

  it("auditor sees the decision record fields plus salt for verify", () => {
    const row = projectAttestation(v2, "auditor");
    expect(row).toMatchObject({
      role: "auditor",
      paymentHash: "0xpay",
      payer: v2.payerAddress,
      amountUsdc: 200_000n,
      decision: 0,
      identityStatus: 1,
      commitmentSalt: "0xsalt",
    });
    expect(row).not.toHaveProperty("decisionRecord");
    expect(row).not.toHaveProperty("settlementTx");
  });

  it("institution sees salt, paymentHash, settlement tx, and the jsonb record", () => {
    const row = projectAttestation(v2, "institution");
    expect(row).toMatchObject({
      role: "institution",
      paymentHash: "0xpay",
      settlementTx: "0xsettle",
      commitmentSalt: "0xsalt",
      decisionRecord: { decision: 0 },
    });
  });
});
