import { ATTESTATION_REGISTRY_ABI } from "@repo/shared/abis";
import { buildCommitment, committedRecordFrom, randomSalt } from "@repo/shared/commitment";
import type { Decision, IdentityStatus } from "@repo/shared/types";

export type PublishedAttestation = {
  attestationTx: string;
  commitment: `0x${string}`;
  salt: `0x${string}`;
};

export async function publishAttestation({
  amountUsdc,
  decision,
  identityStatus,
  payer,
  paymentHash,
  policyMaxAmountUsdc,
  rejectionReason,
}: {
  amountUsdc: bigint;
  decision: Decision;
  identityStatus: IdentityStatus;
  payer: string;
  paymentHash: `0x${string}`;
  policyMaxAmountUsdc: bigint;
  rejectionReason?: string;
}): Promise<PublishedAttestation | null> {
  const salt = randomSalt();
  const commitment = buildCommitment(
    committedRecordFrom({
      paymentHash,
      payer,
      amountUsdc,
      policyMaxAmountUsdc,
      identityStatus,
      decision,
      rejectionReason,
    }),
    salt,
  );
  try {
    const { account, walletClient } = await import("./clients.js");
    const { env } = await import("../env.js");
    const { reportPipelineGate, GATE_STEP } = await import("./pipeline-progress.js");
    reportPipelineGate(payer, GATE_STEP.ATTESTATION);
    const attestationTx = await walletClient.writeContract({
      address: env.ATTESTATION_REGISTRY_ADDRESS,
      abi: ATTESTATION_REGISTRY_ABI,
      functionName: "attest",
      args: [commitment],
      chain: null,
      account,
    });
    return { attestationTx, commitment, salt };
  } catch (err) {
    console.error("[publishAttestation] failed:", err);
    return null;
  }
}
