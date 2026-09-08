import { GATE_STEP } from "@repo/shared/settlement-errors";

/** Live polling may rewind; synthetic gap-filling only moves forward. */
export function createGateProgress(
  emit: (event: { type: "gate"; step: number }) => void,
  isClosed: () => boolean,
  readGate: (payer: string, since: number) => Promise<number>,
) {
  const runStartedAt = Date.now();
  let polling = false;
  const progress = {
    payer: "0x",
    paymentStarted: false,
    lastGate: GATE_STEP.AGENT_RESOLVED as number,
    forward(gate: number) {
      if (gate <= progress.lastGate) return;
      progress.lastGate = gate;
      emit({ type: "gate", step: gate });
    },
    async flush() {
      if (!progress.paymentStarted || polling || isClosed() || progress.payer === "0x") return;
      polling = true;
      try {
        const gate = await readGate(progress.payer, runStartedAt);
        if (gate === 0 || gate === progress.lastGate) return;
        progress.lastGate = gate;
        emit({ type: "gate", step: gate });
      } finally {
        polling = false;
      }
    },
    async fillGaps(gates: number[], attestationStep: boolean) {
      for (const step of gates) {
        if (step <= progress.lastGate) continue;
        progress.forward(step);
        await new Promise((resolve) => setTimeout(resolve, 90));
        await progress.flush();
      }
      if (attestationStep && progress.lastGate < GATE_STEP.ATTESTATION)
        progress.forward(GATE_STEP.ATTESTATION);
    },
  };
  return progress;
}
