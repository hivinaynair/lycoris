import { encodeAbiParameters, getAddress, isHex, keccak256, toHex } from "viem";

/**
 * Fields bound by the on-chain commitment. Field order is part of the
 * protocol — never reorder.
 *
 * keccak256(abi.encode(paymentHash, payer, amountUsdc, mandateMaxAmountUsdc, identityStatus, decision, rejectionReason, salt))
 *
 * amountUsdc / mandateMaxAmountUsdc are atomic USDC (6 decimals).
 */
export type CommittedRecord = {
  paymentHash: `0x${string}`;
  payer: `0x${string}`;
  amountUsdc: bigint;
  mandateMaxAmountUsdc: bigint;
  identityStatus: number;
  decision: number;
  rejectionReason: string;
};

export function committedRecordFrom(input: {
  paymentHash: string;
  payer: string;
  amountUsdc: bigint;
  mandateMaxAmountUsdc: bigint;
  identityStatus: number;
  decision: number;
  rejectionReason?: string | undefined;
}): CommittedRecord {
  // Throws like the getAddress below it: a commitment must never bind a malformed field.
  if (!isHex(input.paymentHash) || input.paymentHash.length !== 66) {
    throw new Error("paymentHash must be a 32-byte hex value");
  }
  return {
    paymentHash: input.paymentHash,
    payer: getAddress(input.payer),
    amountUsdc: input.amountUsdc,
    mandateMaxAmountUsdc: input.mandateMaxAmountUsdc,
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
      { name: "mandateMaxAmountUsdc", type: "uint256" },
      { name: "identityStatus", type: "uint8" },
      { name: "decision", type: "uint8" },
      { name: "rejectionReason", type: "string" },
      { name: "salt", type: "bytes32" },
    ],
    [
      record.paymentHash,
      getAddress(record.payer),
      record.amountUsdc,
      record.mandateMaxAmountUsdc,
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
