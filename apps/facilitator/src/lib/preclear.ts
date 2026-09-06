import { GATE_STEP, reportPipelineGate, resetPipelineProgress } from "./pipeline-progress.js";
import { type VerifyDeps, validateMandateForPayment } from "./validate-mandate.js";

export type PreclearInput = {
  amountAtomic: bigint;
  payer: string;
  resource?: string;
};

export type PreclearResult = { ok: true } | { ok: false; reason: string };

export async function evaluatePreclear(
  input: PreclearInput,
  deps: VerifyDeps,
): Promise<PreclearResult> {
  resetPipelineProgress(input.payer);
  reportPipelineGate(input.payer, GATE_STEP.PAYMENT_SUBMITTED);

  const mandateResult = await validateMandateForPayment(
    {
      payer: input.payer,
      amountAtomic: input.amountAtomic,
      resource: input.resource,
    },
    deps,
  );
  if (mandateResult.ok === false) {
    return { ok: false, reason: mandateResult.reason };
  }

  return { ok: true };
}
