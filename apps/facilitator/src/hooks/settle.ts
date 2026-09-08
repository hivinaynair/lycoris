import { schema } from "@repo/db";
import { BASE_SEPOLIA_USDC_ADDRESS, ERC20_BALANCE_ABI } from "@repo/shared/abis";
import { Decision, IdentityStatus } from "@repo/shared/types";
import type {
  FacilitatorSettleContext,
  FacilitatorSettleFailureContext,
  FacilitatorSettleResultContext,
} from "@x402/core/facilitator";
import type { SettleResponse } from "@x402/core/types";
import { and, eq } from "drizzle-orm";
import { keccak256 } from "viem";
import { publicClient } from "../lib/clients.js";
import { getDb } from "../lib/db.js";
import { verifyDeps } from "../lib/deps.js";
import { extractAuthNonce, getPayerAddress } from "../lib/mandate.js";
import { GATE_STEP, reportPipelineGate } from "../lib/pipeline-progress.js";
import { recordRejection, validateMandateForPayment } from "../lib/validate-mandate.js";
import {
  publishAndRecord,
  SETTLEMENT_RECEIPT_UNCONFIRMED_REASON,
  SETTLEMENT_TX_FAILED_REASON,
  settlementContext,
} from "./settle-helpers.js";

export async function onBeforeSettle({
  paymentPayload,
  requirements,
}: FacilitatorSettleContext): Promise<undefined | { abort: true; reason: string }> {
  const payer = getPayerAddress(paymentPayload.payload);
  if (!payer) return;

  // Payment is now in the settle path — illuminate Settlement immediately.
  reportPipelineGate(payer, GATE_STEP.SETTLEMENT);

  const paymentAmountAtomic = BigInt(requirements.amount);
  const authorizationNonce = extractAuthNonce(paymentPayload.payload);

  const mandateResult = await validateMandateForPayment(
    {
      payer,
      amountAtomic: paymentAmountAtomic,
      authorizationNonce,
      resource: paymentPayload.resource,
    },
    verifyDeps,
  );
  if (mandateResult.ok === false) return { abort: true, reason: mandateResult.reason };

  const balance = await publicClient.readContract({
    address: BASE_SEPOLIA_USDC_ADDRESS,
    abi: ERC20_BALANCE_ABI,
    functionName: "balanceOf",
    args: [payer],
    authorizationList: undefined,
  });
  console.log(`[onBeforeSettle] payer=${payer} balance=${balance} required=${paymentAmountAtomic}`);
  if (balance < paymentAmountAtomic) {
    await recordRejection({
      agentId: mandateResult.mandateEntry.agentId,
      amountAtomic: paymentAmountAtomic,
      authorizationNonce,
      identityStatus: IdentityStatus.Verified,
      mandateEntry: mandateResult.mandateEntry,
      payer,
      reason: "insufficient_funds",
      resource: paymentPayload.resource,
    });
    return { abort: true, reason: "insufficient_funds" };
  }
}

async function recordFailedSettlement(
  paymentPayload: FacilitatorSettleResultContext["paymentPayload"],
  rejectionReason: string,
) {
  const ctx = settlementContext(paymentPayload);
  if (!ctx.payer) return;
  const paymentHash = keccak256(
    `0x${Buffer.from(`failed:${ctx.authorizationNonce ?? ctx.payer}`).toString("hex")}` as `0x${string}`,
  );
  await publishAndRecord({
    ...ctx,
    payer: ctx.payer,
    paymentHash,
    decision: Decision.Rejected,
    rejectionReason,
  });
}

async function recordSuccessfulSettlement(
  paymentPayload: FacilitatorSettleResultContext["paymentPayload"],
  settlementTx: `0x${string}`,
) {
  const ctx = settlementContext(paymentPayload);
  const payer = ctx.payer;
  if (!payer) return;
  reportPipelineGate(payer, GATE_STEP.SETTLEMENT);

  const paymentHash = keccak256(settlementTx);
  const record = (decision: Decision, rejectionReason?: string) =>
    publishAndRecord({
      ...ctx,
      payer,
      paymentHash,
      decision,
      rejectionReason,
      settlementTx,
    });

  let receipt: Awaited<ReturnType<typeof publicClient.waitForTransactionReceipt>>;
  try {
    receipt = await publicClient.waitForTransactionReceipt({ hash: settlementTx });
  } catch (err) {
    console.error("[onAfterSettle] settlement receipt lookup failed:", err);
    await record(Decision.Rejected, SETTLEMENT_RECEIPT_UNCONFIRMED_REASON);
    return;
  }

  if (receipt.status !== "success") {
    await record(Decision.Rejected, SETTLEMENT_TX_FAILED_REASON);
    return;
  }

  const published = await record(Decision.Approved);
  if (published?.attestationTx) {
    console.log("[onAfterSettle] attestation tx:", published.attestationTx);
  }
}

export async function onAfterSettle({
  paymentPayload,
  result,
}: FacilitatorSettleResultContext): Promise<void> {
  if (!result.success) {
    await recordFailedSettlement(paymentPayload, result.errorReason ?? "settlement_rejected");
    return;
  }
  if (!result.transaction) return;
  await recordSuccessfulSettlement(paymentPayload, result.transaction as `0x${string}`);
}

export async function onSettleFailure({
  paymentPayload,
  requirements,
}: FacilitatorSettleFailureContext): Promise<
  undefined | { recovered: true; result: SettleResponse }
> {
  const authorizationNonce = extractAuthNonce(paymentPayload.payload);
  if (!authorizationNonce) return;

  try {
    const existing = await getDb()
      .select()
      .from(schema.settlementAttestations)
      .where(
        and(
          eq(schema.settlementAttestations.authorizationNonce, authorizationNonce),
          eq(schema.settlementAttestations.decision, Decision.Approved),
        ),
      )
      .limit(1);

    if (existing.length > 0 && existing[0]?.settlementTx) {
      console.log("[onSettleFailure] duplicate detected, recovering:", authorizationNonce);
      return {
        recovered: true,
        result: {
          success: true,
          transaction: existing[0]?.settlementTx,
          network: requirements.network,
        },
      };
    }
  } catch (err) {
    console.error("[onSettleFailure] db lookup failed:", err);
  }
}
