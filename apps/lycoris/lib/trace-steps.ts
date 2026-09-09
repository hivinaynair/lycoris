import { BASE_SEPOLIA_EXPLORER } from "@repo/shared/chains";
import type { RawMandate, X402Challenge } from "@repo/shared/types";
import { settlementFailureStep } from "@/lib/settlement-status";

export type StepStatus = "pending" | "running" | "approved" | "rejected" | "skipped";

export type GateRawData =
  | { gate: "agent"; address: string; uri: string; capabilities: string[] }
  | { gate: "x402"; challenge: X402Challenge }
  | {
      gate: "erc8004";
      address: string;
      agentId?: string | undefined;
      identityStatus?: number | undefined;
    }
  | { gate: "ap2"; mandate: RawMandate }
  | { gate: "settlement"; txHash: string; txUrl: string }
  | { gate: "attestation"; txHash: string; txUrl: string };

export type TraceStep = {
  id: number;
  label: string;
  status: StepStatus;
  detail?: string | undefined;
  link?: { href: string; label: string } | undefined;
  attestationLink?: { href: string; label: string } | undefined;
  rawData?: GateRawData | undefined;
};

export type TraceRunResult = {
  httpStatus: number;
  route: { path: string; price: string };
  agent: { id: string; mandateLimit: string } | null;
  payer?: string;
  agentUri?: string;
  rawMandate?: RawMandate;
  x402Challenge?: X402Challenge;
  decisionProof?: {
    agentId?: string;
    mandate?: { delegator: string; maxAmountUsdc: string; valid?: boolean };
    identityStatus?: number;
  };
  settlementTxHash?: string;
  settlementTxUrl?: string;
  attestationTxHash?: string;
  attestationTxUrl?: string;
  body?: { error?: string };
} | null;

function animatingSteps(animStep: number): TraceStep[] {
  function animStatus(id: number): StepStatus {
    if (animStep > id) return "approved";
    if (animStep === id) return "running";
    return "pending";
  }

  return [
    { id: 0, label: "Agent", status: animStep > 0 ? "approved" : "pending" },
    { id: 1, label: "x402", status: animStatus(1) },
    { id: 2, label: "ERC-8004", status: animStatus(2) },
    { id: 3, label: "AP2", status: animStatus(3) },
    { id: 4, label: "Settlement", status: animStatus(4) },
    {
      id: 5,
      label: "Attestation",
      status: animStep === 5 ? "running" : "pending",
    },
  ];
}

function explorerTx(hash: string, url?: string) {
  return url ?? `${BASE_SEPOLIA_EXPLORER}/tx/${hash}`;
}

export function buildTraceSteps(result: TraceRunResult, animStep: number): TraceStep[] {
  if (!result) return animatingSteps(animStep);

  const error = result.body?.error;
  const ok = result.httpStatus === 200;
  const failStep = ok ? 0 : settlementFailureStep(error) || 4;

  function stepStatus(n: number): StepStatus {
    if (ok) return "approved";
    if (n < failStep) return "approved";
    if (n === failStep) return "rejected";
    return "skipped";
  }

  return [
    {
      id: 0,
      label: "Agent",
      status: "approved",
      detail: result.agent ? result.agent.id : undefined,
      rawData: result.payer
        ? {
            gate: "agent",
            address: result.payer,
            uri: result.agentUri ?? "",
            capabilities: ["payment", "settlement"],
          }
        : undefined,
    },
    {
      id: 1,
      label: "402",
      status: stepStatus(1),
      detail: `${result.route.path} · ${result.route.price}`,
      rawData: result.x402Challenge ? { gate: "x402", challenge: result.x402Challenge } : undefined,
    },
    {
      id: 2,
      label: "ERC-8004",
      status: stepStatus(2),
      detail: result.agent
        ? `${result.agent.id} · ${failStep === 2 ? "not registered" : "registered"}`
        : undefined,
      rawData: result.payer
        ? {
            gate: "erc8004",
            address: result.payer,
            agentId: result.decisionProof?.agentId,
            identityStatus:
              result.decisionProof?.identityStatus ?? (stepStatus(2) === "approved" ? 1 : 0),
          }
        : undefined,
    },
    {
      id: 3,
      label: "AP2",
      status: stepStatus(3),
      detail: result.agent ? `limit ${result.agent.mandateLimit}` : undefined,
      rawData: result.rawMandate ? { gate: "ap2", mandate: result.rawMandate } : undefined,
    },
    settlementStep(result, ok),
    attestationStep(result, ok),
  ];
}

function settlementStep(result: NonNullable<TraceRunResult>, ok: boolean): TraceStep {
  const txShort = result.settlementTxHash ? `${result.settlementTxHash.slice(0, 10)}…` : undefined;
  return {
    id: 4,
    label: "Settlement",
    status: ok ? "approved" : "skipped",
    detail: txShort,
    link: result.settlementTxHash
      ? {
          href: explorerTx(result.settlementTxHash, result.settlementTxUrl),
          label: "settlement tx",
        }
      : undefined,
    rawData: result.settlementTxHash
      ? {
          gate: "settlement",
          txHash: result.settlementTxHash,
          txUrl: explorerTx(result.settlementTxHash, result.settlementTxUrl),
        }
      : undefined,
  };
}

function attestationStep(result: NonNullable<TraceRunResult>, ok: boolean): TraceStep {
  return {
    id: 5,
    label: "Attestation",
    status: result.attestationTxHash || ok ? "approved" : "skipped",
    detail: result.attestationTxHash ? `${result.attestationTxHash.slice(0, 10)}…` : undefined,
    attestationLink: result.attestationTxHash
      ? {
          href: explorerTx(result.attestationTxHash, result.attestationTxUrl),
          label: "attestation tx",
        }
      : undefined,
    rawData: result.attestationTxHash
      ? {
          gate: "attestation",
          txHash: result.attestationTxHash,
          txUrl: explorerTx(result.attestationTxHash, result.attestationTxUrl),
        }
      : undefined,
  };
}
