import { encodeAbiParameters, getAddress, keccak256, toHex } from "viem";

/**
 * Fields bound by the on-chain commitment. Field order is part of the
 * protocol — never reorder.
 *
 * keccak256(abi.encode(paymentHash, payer, amountUsdc, policyMaxAmountUsdc, identityStatus, decision, rejectionReason, salt))
 *
 * amountUsdc / policyMaxAmountUsdc are atomic USDC (6 decimals), matching
 * settlementAttestations, not the formatted strings on DecisionRecord.
 */
export type CommittedRecord = {
  paymentHash: `0x${string}`;
  payer: `0x${string}`;
  amountUsdc: bigint;
  policyMaxAmountUsdc: bigint;
  identityStatus: number;
  decision: number;
  rejectionReason: string;
};

export function committedRecordFrom(input: {
  paymentHash: string;
  payer: string;
  amountUsdc: bigint;
  policyMaxAmountUsdc: bigint;
  identityStatus: number;
  decision: number;
  rejectionReason?: string;
}): CommittedRecord {
  return {
    paymentHash: input.paymentHash as `0x${string}`,
    payer: getAddress(input.payer),
    amountUsdc: input.amountUsdc,
    policyMaxAmountUsdc: input.policyMaxAmountUsdc,
    identityStatus: input.identityStatus,
    decision: input.decision,
    rejectionReason: input.rejectionReason ?? "",
  };
}

export function randomSalt(): `0x${string}` {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return toHex(bytes);
}

function preimage(record: CommittedRecord, salt: `0x${string}`): `0x${string}` {
  return encodeAbiParameters(
    [
      { name: "paymentHash", type: "bytes32" },
      { name: "payer", type: "address" },
      { name: "amountUsdc", type: "uint256" },
      { name: "policyMaxAmountUsdc", type: "uint256" },
      { name: "identityStatus", type: "uint8" },
      { name: "decision", type: "uint8" },
      { name: "rejectionReason", type: "string" },
      { name: "salt", type: "bytes32" },
    ],
    [
      record.paymentHash,
      getAddress(record.payer),
      record.amountUsdc,
      record.policyMaxAmountUsdc,
      record.identityStatus,
      record.decision,
      record.rejectionReason,
      salt,
    ],
  );
}

export function buildCommitment(record: CommittedRecord, salt: `0x${string}`): `0x${string}` {
  return keccak256(preimage(record, salt));
}

export function verifyCommitment(
  record: CommittedRecord,
  salt: `0x${string}`,
  commitment: string,
): boolean {
  return buildCommitment(record, salt).toLowerCase() === commitment.toLowerCase();
}
