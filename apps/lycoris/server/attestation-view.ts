import { BASE_SEPOLIA_EXPLORER } from "@repo/shared/chains";
import { mandateMaxAtomicFromDecisionRecord } from "@repo/shared/decision-record";

export type ViewerRole = "public" | "auditor" | "institution";

export const VIEWER_ROLES = ["public", "auditor", "institution"] as const;

export function parseViewerRole(value: string | undefined): ViewerRole {
  if (value === "auditor" || value === "institution") return value;
  return "public";
}

export type AttestationSourceRow = {
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
  rejectionReason?: string | undefined;
};

type Common = {
  commitment: string | null;
  timestamp: number;
  attestationTx: string;
  attestationTxUrl: string;
  legacy: boolean;
};

export type PublicAttestation = Common & { role: "public" };

export type AuditorAttestation = Common & {
  role: "auditor";
  paymentHash: string;
  payer: string;
  amountUsdc: bigint;
  mandateMaxAmountUsdc: bigint;
  identityStatus: number;
  decision: number;
  rejectionReason?: string | undefined;
  commitmentSalt: string | null;
};

export type InstitutionAttestation = Omit<AuditorAttestation, "role"> & {
  role: "institution";
  paymentHash: string;
  settlementTx: string | null;
  settlementTxUrl: string;
  decisionRecord: unknown;
};

export type AttestationView = PublicAttestation | AuditorAttestation | InstitutionAttestation;

function common(row: AttestationSourceRow): Common {
  return {
    commitment: row.commitment,
    timestamp: Math.floor(row.createdAt.getTime() / 1000),
    attestationTx: row.attestationTx ?? "",
    attestationTxUrl: row.attestationTx ? `${BASE_SEPOLIA_EXPLORER}/tx/${row.attestationTx}` : "",
    legacy: !row.commitment,
  };
}

export function projectAttestation(row: AttestationSourceRow, role: ViewerRole): AttestationView {
  const base = common(row);
  if (role === "public") return { role: "public", ...base };

  const auditor: AuditorAttestation = {
    role: "auditor",
    ...base,
    paymentHash: row.paymentHash,
    payer: row.payerAddress,
    amountUsdc: row.amountUsdc,
    mandateMaxAmountUsdc: mandateMaxAtomicFromDecisionRecord(row.decisionRecord),
    identityStatus: row.identityStatus,
    decision: row.decision,
    rejectionReason: row.rejectionReason,
    commitmentSalt: row.commitmentSalt,
  };
  if (role === "auditor") return auditor;

  return {
    ...auditor,
    role: "institution",
    settlementTx: row.settlementTx,
    settlementTxUrl: row.settlementTx ? `${BASE_SEPOLIA_EXPLORER}/tx/${row.settlementTx}` : "",
    decisionRecord: row.decisionRecord,
  };
}
