import { schema } from "@repo/db";
import { Decision } from "@repo/shared/types";
import { desc } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { publicClient } from "@/lib/viem-client";
import {
  type AttestationView,
  type AuditorAttestation,
  type InstitutionAttestation,
  type PublicAttestation,
  parseViewerRole,
  projectAttestation,
  type ViewerRole,
} from "./attestation-view";

export type { AttestationView as AttestationRow, ViewerRole };
export { parseViewerRole };

type AttestationDbRow = {
  paymentHash: string;
  payerAddress: string;
  amountUsdc: bigint;
  identityStatus: number;
  decision: number;
  createdAt: Date;
  settlementTx: string | null;
  attestationTx: string | null;
  commitment: string | null;
  commitmentSalt: string | null;
  decisionRecord: unknown;
};

async function decisionWithReceiptStatus(row: AttestationDbRow) {
  if (row.decision !== Decision.Approved || !row.settlementTx) return row.decision;
  try {
    const receipt = await publicClient.getTransactionReceipt({
      hash: row.settlementTx as `0x${string}`,
    });
    return receipt.status === "success" ? row.decision : Decision.Rejected;
  } catch {
    return row.decision;
  }
}

function rejectionReasonFromRecord(record: unknown): string | undefined {
  if (
    record &&
    typeof record === "object" &&
    "rejectionReason" in record &&
    typeof record.rejectionReason === "string"
  ) {
    return record.rejectionReason;
  }
  return undefined;
}

export async function getAttestations(role: "public"): Promise<PublicAttestation[]>;
export async function getAttestations(role: "auditor"): Promise<AuditorAttestation[]>;
export async function getAttestations(role: "institution"): Promise<InstitutionAttestation[]>;
export async function getAttestations(role?: ViewerRole): Promise<AttestationView[]>;
export async function getAttestations(role: ViewerRole = "public"): Promise<AttestationView[]> {
  const db = getDb();
  const rows = await db
    .select({
      paymentHash: schema.settlementAttestations.paymentHash,
      payerAddress: schema.settlementAttestations.payerAddress,
      amountUsdc: schema.settlementAttestations.amountUsdc,
      identityStatus: schema.settlementAttestations.identityStatus,
      decision: schema.settlementAttestations.decision,
      createdAt: schema.settlementAttestations.createdAt,
      settlementTx: schema.settlementAttestations.settlementTx,
      attestationTx: schema.settlementAttestations.attestationTx,
      commitment: schema.settlementAttestations.commitment,
      commitmentSalt: schema.settlementAttestations.commitmentSalt,
      decisionRecord: schema.settlementAttestations.decisionRecord,
    })
    .from(schema.settlementAttestations)
    .orderBy(desc(schema.settlementAttestations.createdAt))
    .limit(50);

  return Promise.all(
    rows.map(async (row) =>
      projectAttestation(
        {
          ...row,
          decision: await decisionWithReceiptStatus(row),
          rejectionReason: rejectionReasonFromRecord(row.decisionRecord),
        },
        role,
      ),
    ),
  );
}
