import { GATE_STEP } from "@repo/shared/settlement-errors";

type Progress = { gate: number; at: number };

const progress = new Map<string, Progress>();

/** Advance (or refresh) the live gate for a payer. Never moves backwards. */
export function reportPipelineGate(payer: string, gate: number) {
  if (!payer.startsWith("0x")) return;
  const key = payer.toLowerCase();
  const current = progress.get(key);
  if (current && gate < current.gate) return;
  progress.set(key, { gate, at: Date.now() });
}

export function pipelineGateFor(payer: string, sinceMs = 0) {
  const row = progress.get(payer.toLowerCase());
  if (!row) return 0;
  if (row.at < sinceMs) return 0;
  return row.gate;
}

export function resetPipelineProgress(payer: string) {
  if (!payer.startsWith("0x")) return;
  progress.delete(payer.toLowerCase());
}

export { GATE_STEP };
