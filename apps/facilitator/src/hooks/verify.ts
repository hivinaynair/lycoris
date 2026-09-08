import { BASE_SEPOLIA_USDC_ADDRESS, ERC20_BALANCE_ABI } from "@repo/shared/abis";
import { IdentityStatus } from "@repo/shared/types";
import type { FacilitatorVerifyContext } from "@x402/core/facilitator";
import { extractAuthNonce, getPayerAddress } from "../lib/mandate.js";
import { GATE_STEP, reportPipelineGate, resetPipelineProgress } from "../lib/pipeline-progress.js";
import { recordRejection } from "../lib/record-rejection.js";
import type { VerifyDeps } from "../lib/validate-mandate.js";
import { validateMandateForPayment } from "../lib/validate-mandate.js";

export async function onBeforeVerify(
  { paymentPayload, requirements }: FacilitatorVerifyContext,
  deps: VerifyDeps,
): Promise<undefined | { abort: true; reason: string }> {
  const payer = getPayerAddress(paymentPayload.payload);
  if (!payer) return;

  // Fresh run marker: UI polls with since=runStartedAt, so reset then enter x402.
  resetPipelineProgress(payer);
  reportPipelineGate(payer, GATE_STEP.PAYMENT_SUBMITTED);

  const paymentAmountAtomic = BigInt(requirements.amount);
  const authorizationNonce = extractAuthNonce(paymentPayload.payload);

  const result = await validateMandateForPayment(
    {
      payer,
      amountAtomic: paymentAmountAtomic,
      authorizationNonce,
      resource: paymentPayload.resource,
    },
    deps,
  );
  if (result.ok === false) return { abort: true, reason: result.reason };

  // Check payer's USDC balance early so insufficient funds are caught at verify, not settle.
  const balance = await deps.client.readContract({
    address: BASE_SEPOLIA_USDC_ADDRESS,
    abi: ERC20_BALANCE_ABI,
    functionName: "balanceOf",
    args: [payer],
    authorizationList: undefined,
  });
  console.log(`[onBeforeVerify] payer=${payer} balance=${balance} required=${paymentAmountAtomic}`);
  if (balance < paymentAmountAtomic) {
    await recordRejection({
      amountAtomic: paymentAmountAtomic,
      authorizationNonce,
      identityStatus: IdentityStatus.Verified,
      mandateEntry: result.mandateEntry,
      payer,
      reason: "insufficient_funds",
      resource: paymentPayload.resource,
    });
    return { abort: true, reason: "insufficient_funds" };
  }
}
