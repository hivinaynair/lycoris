import { keccak256 } from "viem";

export function buildVerifyRejectionPaymentHash({
  amountAtomic,
  authorizationNonce,
  payer,
  reason,
  resource,
}: {
  amountAtomic: bigint;
  authorizationNonce?: string;
  payer: string;
  reason: string;
  resource?: unknown;
}) {
  const hashSeed = authorizationNonce
    ? `${payer}-${amountAtomic}-${authorizationNonce}-${reason}`
    : `${payer}-${amountAtomic}-${reason}-${String(resource ?? "")}`;
  return keccak256(new TextEncoder().encode(hashSeed) as unknown as `0x${string}`);
}
