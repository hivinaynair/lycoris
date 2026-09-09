import { keccak256, toBytes } from "viem";

export function buildVerifyRejectionPaymentHash({
  amountAtomic,
  authorizationNonce,
  payer,
  reason,
  resource,
}: {
  amountAtomic: bigint;
  authorizationNonce?: string | undefined;
  payer: string;
  reason: string;
  resource?: unknown;
}) {
  const hashSeed = authorizationNonce
    ? `${payer}-${amountAtomic}-${authorizationNonce}-${reason}`
    : `${payer}-${amountAtomic}-${reason}-${String(resource ?? "")}`;
  return keccak256(toBytes(hashSeed));
}
